import os, sqlite3, json, secrets, threading
from functools import wraps
from flask import Flask, request, jsonify, g, send_file
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__)
DATA_DIR = os.getenv('DATA_DIR', '/tmp/kashani-data')
os.makedirs(DATA_DIR, exist_ok=True)
DB = os.getenv('DB_PATH', os.path.join(DATA_DIR, 'holding.db'))
STATE_LOCK = threading.RLock()

MANAGER = {'ceo', 'internal_manager', 'sales_manager', 'marshall_manager'}
CREATE_USER_ROLES = {'ceo', 'internal_manager'}
BOOTSTRAP_USERNAME = 'internal'
LEGACY_DEMO_USERNAMES = {
    'ceo','salesmanager','hesabdar','sabtenam','adminpv','adminpage','aghsat','moshavere',
    'supportcore','supportcampaign','supportartiler','supportstrategy','supportai','supportmoney',
    'callcenter','marketing','product','content','site','hr','rnd','crm','marshallads','strategy',
    'coach','marshallmanager','sales','register','pv','call','support','accounting'
}


def db():
    c = sqlite3.connect(DB, timeout=30)
    c.row_factory = sqlite3.Row
    c.execute('PRAGMA foreign_keys=ON')
    c.execute('PRAGMA journal_mode=WAL')
    c.execute('PRAGMA busy_timeout=5000')
    return c


def init():
    c = db()
    c.executescript('''
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      business_unit TEXT NOT NULL CHECK(business_unit IN ('academy','marshall')),
      role TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions(
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS app_state(
      business_unit TEXT PRIMARY KEY,
      payload TEXT NOT NULL DEFAULT '{}',
      revision INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY,user_id INTEGER,report_date TEXT,metrics TEXT,note TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,report_date));
    CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY,title TEXT,details TEXT,assigned_to INTEGER,assigned_by INTEGER,due_at TEXT,reward INTEGER DEFAULT 0,status TEXT DEFAULT 'open',completed_at TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS score_events(id INTEGER PRIMARY KEY,user_id INTEGER,points INTEGER,category TEXT,note TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    ''')

    bootstrap_password = (os.getenv('INITIAL_INTERNAL_PASSWORD') or '').strip()
    row = c.execute('SELECT id FROM users WHERE username=?', (BOOTSTRAP_USERNAME,)).fetchone()
    if row is None:
        # Production deploy script always supplies INITIAL_INTERNAL_PASSWORD.
        # This fallback is only for local development and should be replaced immediately.
        password = bootstrap_password or secrets.token_urlsafe(18)
        c.execute(
            'INSERT INTO users(username,password_hash,full_name,business_unit,role,active) VALUES(?,?,?,?,?,1)',
            (BOOTSTRAP_USERNAME, generate_password_hash(password), 'مدیر داخلی', 'academy', 'internal_manager')
        )
    else:
        if bootstrap_password:
            c.execute('UPDATE users SET password_hash=? WHERE username=?',
                      (generate_password_hash(bootstrap_password), BOOTSTRAP_USERNAME))
        c.execute("UPDATE users SET full_name='مدیر داخلی',business_unit='academy',role='internal_manager',active=1 WHERE username=?",
                  (BOOTSTRAP_USERNAME,))

    # Disable every old shared beta/demo account. They can later be re-created by the
    # internal manager with a private password from inside the app.
    if LEGACY_DEMO_USERNAMES:
        q = ','.join('?' for _ in LEGACY_DEMO_USERNAMES)
        c.execute(f'UPDATE users SET active=0 WHERE username IN ({q})', tuple(LEGACY_DEMO_USERNAMES))
        c.execute('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE active=0)')

    for unit in ('academy','marshall'):
        c.execute("INSERT OR IGNORE INTO app_state(business_unit,payload,revision) VALUES(?,?,0)", (unit, '{}'))
    c.commit(); c.close()


def auth(f):
    @wraps(f)
    def w(*a, **k):
        h = request.headers.get('Authorization','')
        token = h[7:] if h.startswith('Bearer ') else ''
        c = db()
        u = c.execute('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND u.active=1', (token,)).fetchone()
        c.close()
        if not u:
            return jsonify(error='unauthorized'), 401
        g.user = dict(u)
        g.token = token
        return f(*a, **k)
    return w


def manager(f):
    @wraps(f)
    @auth
    def w(*a, **k):
        if g.user['role'] not in MANAGER:
            return jsonify(error='forbidden'), 403
        return f(*a, **k)
    return w


def merge_state(old, new):
    if not isinstance(old, dict): old = {}
    if not isinstance(new, dict): return old
    out = dict(old)
    id_lists = {'registrations','campaigns','tasks','ideas','suggestions','requests','courseCatalog','customUsers'}
    dict_fields = {'attendance','reports','wallets','bonus','monthlyFinance','userThemes','coinUsage','avatars'}
    for key, val in new.items():
        if key == 'session':
            continue
        if key in id_lists and isinstance(val, list):
            prior = out.get(key, []) if isinstance(out.get(key), list) else []
            merged, order = {}, []
            for item in prior + val:
                if isinstance(item, dict) and item.get('id') is not None:
                    ident = str(item['id'])
                    if ident not in merged: order.append(ident)
                    merged[ident] = item
                else:
                    ident = '__raw__' + json.dumps(item, ensure_ascii=False, sort_keys=True)
                    if ident not in merged: order.append(ident)
                    merged[ident] = item
            out[key] = [merged[i] for i in order]
        elif key in dict_fields and isinstance(val, dict):
            prior = out.get(key, {}) if isinstance(out.get(key), dict) else {}
            out[key] = {**prior, **val}
        elif key == 'rewards' and isinstance(val, list):
            out[key] = val
        else:
            out[key] = val
    return out


@app.get('/health')
def health():
    return {'ok': True, 'service': 'holding-kashani', 'version': '2.2-final-test'}


@app.post('/api/auth/login')
def login():
    d = request.get_json(silent=True) or {}
    username = (d.get('username') or '').strip()
    password = d.get('password') or ''
    unit = d.get('business_unit')
    c = db()
    u = c.execute('SELECT * FROM users WHERE username=? AND active=1', (username,)).fetchone()
    if not u or not check_password_hash(u['password_hash'], password) or (unit and u['business_unit'] != unit):
        c.close(); return jsonify(error='invalid_credentials'), 401
    token = secrets.token_urlsafe(40)
    c.execute('INSERT INTO sessions(token,user_id) VALUES(?,?)', (token, u['id']))
    c.execute("DELETE FROM sessions WHERE user_id=? AND token NOT IN (SELECT token FROM sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 4)", (u['id'],u['id']))
    c.commit()
    o = dict(u); o.pop('password_hash', None)
    c.close()
    return {'token': token, 'user': o}


@app.post('/api/auth/logout')
@auth
def logout_api():
    c=db(); c.execute('DELETE FROM sessions WHERE token=?',(g.token,)); c.commit(); c.close()
    return {'ok':True}


@app.get('/api/me')
@auth
def me():
    o = dict(g.user); o.pop('password_hash', None); return o


@app.get('/api/app-state')
@auth
def get_app_state():
    c = db(); row = c.execute('SELECT payload,revision,updated_at FROM app_state WHERE business_unit=?', (g.user['business_unit'],)).fetchone(); c.close()
    try: payload = json.loads(row['payload']) if row else {}
    except Exception: payload = {}
    payload.pop('session', None)
    return {'state': payload, 'revision': int(row['revision'] if row else 0), 'updated_at': row['updated_at'] if row else None}


@app.put('/api/app-state')
@auth
def put_app_state():
    d = request.get_json(silent=True) or {}
    incoming = d.get('state')
    if not isinstance(incoming, dict): return jsonify(error='invalid_state'), 400
    incoming.pop('session', None)
    with STATE_LOCK:
        c = db()
        row = c.execute('SELECT payload,revision FROM app_state WHERE business_unit=?', (g.user['business_unit'],)).fetchone()
        try: old = json.loads(row['payload']) if row else {}
        except Exception: old = {}
        merged = merge_state(old, incoming)
        revision = int(row['revision'] if row else 0) + 1
        encoded = json.dumps(merged, ensure_ascii=False, separators=(',',':'))
        c.execute('INSERT INTO app_state(business_unit,payload,revision,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(business_unit) DO UPDATE SET payload=excluded.payload,revision=excluded.revision,updated_at=CURRENT_TIMESTAMP', (g.user['business_unit'],encoded,revision))
        c.commit(); c.close()
    return {'ok':True,'revision':revision}


@app.get('/api/users')
@manager
def users():
    c=db()
    if g.user['role'] == 'internal_manager':
        rows=c.execute('SELECT id,username,full_name,business_unit,role,active FROM users ORDER BY business_unit,full_name').fetchall()
    elif g.user['role'] == 'ceo':
        rows=c.execute('SELECT id,username,full_name,business_unit,role,active FROM users WHERE business_unit=? ORDER BY full_name',(g.user['business_unit'],)).fetchall()
    elif g.user['role']=='marshall_manager':
        rows=c.execute("SELECT id,username,full_name,business_unit,role,active FROM users WHERE business_unit='marshall' ORDER BY full_name").fetchall()
    else:
        rows=c.execute("SELECT id,username,full_name,business_unit,role,active FROM users WHERE business_unit='academy' AND role IN ('sales_manager','registration_admin','admin_pv_main','admin_page','admin_installment','admin_consult','callcenter') ORDER BY full_name").fetchall()
    c.close(); return {'users':[dict(x) for x in rows]}


@app.post('/api/users')
@auth
def add_user():
    if g.user['role'] not in CREATE_USER_ROLES: return jsonify(error='forbidden'),403
    d=request.get_json(silent=True) or {}
    required=['username','password','full_name','business_unit','role']
    if any(not d.get(k) for k in required): return jsonify(error='missing_fields'),400
    if d['business_unit'] not in {'academy','marshall'}: return jsonify(error='wrong_business_unit'),400
    if g.user['role'] != 'internal_manager' and d['business_unit'] != g.user['business_unit']:
        return jsonify(error='wrong_business_unit'),403
    username=d['username'].strip()
    if len(username) < 3 or len(d['password']) < 6: return jsonify(error='weak_credentials'),400
    c=db()
    existing=c.execute('SELECT id,active FROM users WHERE username=?',(username,)).fetchone()
    if existing:
        if int(existing['active']) == 1:
            c.close(); return jsonify(error='username_exists'),409
        c.execute('UPDATE users SET password_hash=?,full_name=?,business_unit=?,role=?,active=1 WHERE id=?',
                  (generate_password_hash(d['password']),d['full_name'].strip(),d['business_unit'],d['role'],existing['id']))
        uid=existing['id']; c.commit(); c.close(); return {'ok':True,'id':uid,'reactivated':True},201
    cur=c.execute('INSERT INTO users(username,password_hash,full_name,business_unit,role,active) VALUES(?,?,?,?,?,1)',
                  (username,generate_password_hash(d['password']),d['full_name'].strip(),d['business_unit'],d['role']))
    uid=cur.lastrowid; c.commit(); c.close(); return {'ok':True,'id':uid},201


@app.patch('/api/users/<int:user_id>')
@auth
def update_user(user_id):
    if g.user['role'] != 'internal_manager': return jsonify(error='forbidden'),403
    d=request.get_json(silent=True) or {}
    c=db(); target=c.execute('SELECT * FROM users WHERE id=?',(user_id,)).fetchone()
    if not target: c.close(); return jsonify(error='not_found'),404
    if target['username'] == BOOTSTRAP_USERNAME and d.get('active') is False:
        c.close(); return jsonify(error='cannot_deactivate_self'),400
    fields=[]; vals=[]
    if d.get('full_name'):
        fields.append('full_name=?'); vals.append(d['full_name'].strip())
    if d.get('business_unit') in {'academy','marshall'}:
        fields.append('business_unit=?'); vals.append(d['business_unit'])
    if d.get('role'):
        fields.append('role=?'); vals.append(d['role'])
    if isinstance(d.get('active'), bool):
        fields.append('active=?'); vals.append(1 if d['active'] else 0)
    if d.get('password'):
        if len(d['password']) < 6: c.close(); return jsonify(error='weak_credentials'),400
        fields.append('password_hash=?'); vals.append(generate_password_hash(d['password']))
    if fields:
        vals.append(user_id); c.execute('UPDATE users SET '+','.join(fields)+' WHERE id=?',vals)
        if isinstance(d.get('active'), bool) and not d['active']:
            c.execute('DELETE FROM sessions WHERE user_id=?',(user_id,))
        c.commit()
    c.close(); return {'ok':True}


@app.get('/')
def home():
    path=os.path.join(BASE_DIR,'frontend','index.html')
    return send_file(path, mimetype='text/html; charset=utf-8', max_age=0)


@app.after_request
def no_cache(resp):
    if request.path == '/' or request.path.startswith('/api/'):
        resp.headers['Cache-Control']='no-store, no-cache, must-revalidate, max-age=0'
        resp.headers['Pragma']='no-cache'
    return resp


init()
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT','8080')))
