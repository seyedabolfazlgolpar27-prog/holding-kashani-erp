import os, sqlite3, json
from functools import wraps
from datetime import date
from flask import request, jsonify, g
from werkzeug.security import generate_password_hash

DATA_DIR=os.getenv('DATA_DIR','/tmp/kashani-data'); DB=os.getenv('DB_PATH',os.path.join(DATA_DIR,'holding.db'))
MANAGERS={'ceo','internal_manager','sales_manager','marshall_manager'}

def db():
    c=sqlite3.connect(DB,timeout=30);c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON');c.execute('PRAGMA journal_mode=WAL');c.execute('PRAGMA busy_timeout=5000');return c

def ensure_schema():
    c=db();c.executescript('''
    CREATE TABLE IF NOT EXISTS employment_periods(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL,start_date TEXT NOT NULL,end_date TEXT,reason TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS announcements(id INTEGER PRIMARY KEY,business_unit TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,audience TEXT NOT NULL DEFAULT 'all',created_by INTEGER NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP,expires_at TEXT,FOREIGN KEY(created_by) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,kind TEXT NOT NULL DEFAULT 'general',ref_key TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,read_at TEXT,FOREIGN KEY(user_id) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS chat_groups(id INTEGER PRIMARY KEY,business_unit TEXT NOT NULL,name TEXT NOT NULL,created_by INTEGER NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP,archived INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(created_by) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS chat_members(group_id INTEGER NOT NULL,user_id INTEGER NOT NULL,joined_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(group_id,user_id),FOREIGN KEY(group_id) REFERENCES chat_groups(id),FOREIGN KEY(user_id) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS chat_messages(id INTEGER PRIMARY KEY,group_id INTEGER NOT NULL,user_id INTEGER NOT NULL,body TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(group_id) REFERENCES chat_groups(id),FOREIGN KEY(user_id) REFERENCES users(id));
    ''')
    cols={r['name'] for r in c.execute('PRAGMA table_info(users)').fetchall()}
    if 'archived_at' not in cols:c.execute('ALTER TABLE users ADD COLUMN archived_at TEXT')
    if 'archive_reason' not in cols:c.execute('ALTER TABLE users ADD COLUMN archive_reason TEXT')
    for u in c.execute('SELECT id,active,date(created_at) d FROM users').fetchall():
        if not c.execute('SELECT 1 FROM employment_periods WHERE user_id=? LIMIT 1',(u['id'],)).fetchone():
            c.execute('INSERT INTO employment_periods(user_id,start_date,end_date) VALUES(?,?,?)',(u['id'],u['d'] or date.today().isoformat(),None if u['active'] else date.today().isoformat()))
        if u['active'] and not c.execute('SELECT 1 FROM employment_periods WHERE user_id=? AND end_date IS NULL',(u['id'],)).fetchone():c.execute('INSERT INTO employment_periods(user_id,start_date) VALUES(?,?)',(u['id'],date.today().isoformat()))
    c.commit();c.close()

def auth(f):
    @wraps(f)
    def w(*a,**k):
        h=request.headers.get('Authorization','');token=h[7:] if h.startswith('Bearer ') else '';c=db();u=c.execute('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND u.active=1',(token,)).fetchone();c.close()
        if not u:return jsonify(error='unauthorized'),401
        g.user=dict(u);return f(*a,**k)
    return w

def manager(f):
    @wraps(f)
    @auth
    def w(*a,**k):
        if g.user['role'] not in MANAGERS:return jsonify(error='forbidden'),403
        return f(*a,**k)
    return w

def can_unit(unit):
    r=g.user['role']
    if r=='internal_manager':return unit in {'academy','marshall'}
    if r=='ceo':return unit==g.user['business_unit']
    if r=='marshall_manager':return unit=='marshall'
    if r=='sales_manager':return unit=='academy'
    return False

def get_state(unit):
    c=db();r=c.execute('SELECT payload FROM app_state WHERE business_unit=?',(unit,)).fetchone();c.close()
    try:return json.loads(r['payload']) if r else {}
    except Exception:return {}

def state_uid(payload,server_id,username=''):
    for x in payload.get('customUsers',[]) or []:
        if str(x.get('serverId',''))==str(server_id) or (username and x.get('username')==username):return str(x.get('id') or f'custom_server_{server_id}')
    return 'u_internal' if username=='internal' else f'custom_server_{server_id}'

def employee_rows(c,where='',args=()):
    q='''SELECT u.id,u.username,u.full_name,u.business_unit,u.role,u.active,u.created_at,u.archived_at,u.archive_reason,
    COALESCE((SELECT MIN(start_date) FROM employment_periods p WHERE p.user_id=u.id),date(u.created_at)) first_start,
    COALESCE((SELECT SUM(julianday(COALESCE(end_date,date('now')))-julianday(start_date)+1) FROM employment_periods p WHERE p.user_id=u.id),0) tenure_days
    FROM users u '''+where+' ORDER BY u.active DESC,u.business_unit,u.full_name'
    return [dict(x) for x in c.execute(q,args).fetchall()]

def notify(c,ids,title,body,kind='general',ref_key=None):
    for uid in set(int(x) for x in ids if x):c.execute('INSERT INTO notifications(user_id,title,body,kind,ref_key) VALUES(?,?,?,?,?)',(uid,title,body,kind,ref_key))
