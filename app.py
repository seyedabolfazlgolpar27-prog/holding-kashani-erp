import os,sqlite3,json,secrets,datetime
from functools import wraps
from flask import Flask,request,jsonify,g,Response
from werkzeug.security import generate_password_hash,check_password_hash

app=Flask(__name__)
DATA_DIR=os.getenv('DATA_DIR','/tmp/kashani-data'); os.makedirs(DATA_DIR,exist_ok=True)
DB=os.getenv('DB_PATH',os.path.join(DATA_DIR,'beta.db'))
MANAGER={'ceo','internal_manager','sales_manager','marshall_manager'}
USERS=[('ceo','مدیرعامل','academy','ceo'),('internal','مدیر داخلی','academy','internal_manager'),('sales','مدیر فروش','academy','sales_manager'),('register','ادمین ثبت‌نام','academy','registration_admin'),('pv','ادمین PV','academy','pv_admin'),('call','فروشنده تلفنی','academy','call_center'),('support','پشتیبان','academy','support'),('accounting','حسابدار','academy','accountant'),('marketing','مدیر مارکتینگ','academy','marketing_manager'),('product','مدیر محصول','academy','product_manager')]

def db():
 c=sqlite3.connect(DB); c.row_factory=sqlite3.Row; c.execute('PRAGMA foreign_keys=ON'); return c

def init():
 c=db(); c.executescript('''
 CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT UNIQUE,password_hash TEXT,full_name TEXT,business_unit TEXT,role TEXT,active INTEGER DEFAULT 1);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY,user_id INTEGER,report_date TEXT,metrics TEXT,note TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,report_date));
 CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY,title TEXT,details TEXT,assigned_to INTEGER,assigned_by INTEGER,due_at TEXT,reward INTEGER DEFAULT 0,status TEXT DEFAULT 'open',completed_at TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS score_events(id INTEGER PRIMARY KEY,user_id INTEGER,points INTEGER,category TEXT,note TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 ''')
 if c.execute('SELECT COUNT(*) n FROM users').fetchone()['n']==0:
  for u,n,b,r in USERS:c.execute('INSERT INTO users(username,password_hash,full_name,business_unit,role) VALUES(?,?,?,?,?)',(u,generate_password_hash('Beta@1405'),n,b,r))
 c.commit();c.close()

def auth(f):
 @wraps(f)
 def w(*a,**k):
  h=request.headers.get('Authorization',''); t=h[7:] if h.startswith('Bearer ') else ''
  c=db(); u=c.execute('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND u.active=1',(t,)).fetchone(); c.close()
  if not u:return jsonify(error='unauthorized'),401
  g.user=dict(u); return f(*a,**k)
 return w

def manager(f):
 @wraps(f)
 @auth
 def w(*a,**k):
  if g.user['role'] not in MANAGER:return jsonify(error='forbidden'),403
  return f(*a,**k)
 return w

def visible(me,target):
 if me['role'] in {'ceo','internal_manager'}:return True
 if me['business_unit']!=target['business_unit']:return False
 if me['role']=='sales_manager':return target['role'] in {'sales_manager','registration_admin','pv_admin','installment_admin','consultation_admin','people_page_admin','crm','call_center'}
 if me['role']=='marshall_manager':return target['business_unit']=='marshall'
 return me['id']==target['id']

@app.get('/health')
def health():return {'ok':True,'service':'holding-kashani-beta'}

@app.post('/api/auth/login')
def login():
 d=request.get_json(silent=True) or {}; c=db(); u=c.execute('SELECT * FROM users WHERE username=? AND active=1',((d.get('username') or '').strip(),)).fetchone()
 if not u or not check_password_hash(u['password_hash'],d.get('password') or '') or (d.get('business_unit') and u['business_unit']!=d['business_unit']):c.close();return jsonify(error='invalid_credentials'),401
 t=secrets.token_urlsafe(32); c.execute('INSERT INTO sessions(token,user_id) VALUES(?,?)',(t,u['id']));c.commit();o=dict(u);o.pop('password_hash');c.close();return {'token':t,'user':o}

@app.get('/api/me')
@auth
def me():o=dict(g.user);o.pop('password_hash',None);return o

@app.get('/api/users')
@manager
def users():
 c=db();rows=c.execute('SELECT id,username,full_name,business_unit,role,active FROM users ORDER BY business_unit,full_name').fetchall();c.close();return {'users':[dict(x) for x in rows if visible(g.user,dict(x))]}

@app.post('/api/users')
@manager
def add_user():
 if g.user['role'] not in {'ceo','internal_manager'}:return jsonify(error='forbidden'),403
 d=request.get_json(silent=True) or {}; req=['username','password','full_name','business_unit','role']
 if any(not d.get(k) for k in req):return jsonify(error='missing_fields'),400
 c=db()
 try:c.execute('INSERT INTO users(username,password_hash,full_name,business_unit,role) VALUES(?,?,?,?,?)',(d['username'],generate_password_hash(d['password']),d['full_name'],d['business_unit'],d['role']));c.commit()
 except sqlite3.IntegrityError:c.close();return jsonify(error='username_exists'),409
 c.close();return {'ok':True},201

@app.post('/api/reports')
@auth
def report_save():
 d=request.get_json(silent=True) or {};day=d.get('report_date') or datetime.date.today().isoformat();c=db();c.execute('INSERT INTO reports(user_id,report_date,metrics,note) VALUES(?,?,?,?) ON CONFLICT(user_id,report_date) DO UPDATE SET metrics=excluded.metrics,note=excluded.note',(g.user['id'],day,json.dumps(d.get('metrics') or {},ensure_ascii=False),d.get('note') or ''));c.commit();c.close();return {'ok':True}

@app.get('/api/reports')
@auth
def report_list():
 uid=int(request.args.get('user_id',g.user['id']));c=db();t=c.execute('SELECT * FROM users WHERE id=?',(uid,)).fetchone()
 if not t or not visible(g.user,dict(t)):c.close();return jsonify(error='forbidden'),403
 rows=c.execute('SELECT * FROM reports WHERE user_id=? ORDER BY report_date DESC LIMIT 90',(uid,)).fetchall();c.close();out=[]
 for r in rows:o=dict(r);o['metrics']=json.loads(o['metrics'] or '{}');out.append(o)
 return {'reports':out}

@app.get('/api/tasks')
@auth
def tasks():
 c=db()
 if g.user['role'] in {'ceo','internal_manager'}:rows=c.execute('SELECT * FROM tasks ORDER BY created_at DESC').fetchall()
 else:rows=c.execute('SELECT * FROM tasks WHERE assigned_to=? OR assigned_by=? ORDER BY created_at DESC',(g.user['id'],g.user['id'])).fetchall()
 c.close();return {'tasks':[dict(x) for x in rows]}

@app.post('/api/tasks')
@manager
def task_add():
 d=request.get_json(silent=True) or {};c=db();t=c.execute('SELECT * FROM users WHERE id=?',(d.get('assigned_to'),)).fetchone()
 if not t or not visible(g.user,dict(t)):c.close();return jsonify(error='forbidden'),403
 c.execute('INSERT INTO tasks(title,details,assigned_to,assigned_by,due_at,reward) VALUES(?,?,?,?,?,?)',(d.get('title','وظیفه'),d.get('details',''),t['id'],g.user['id'],d.get('due_at'),int(d.get('reward',0))));c.commit();c.close();return {'ok':True},201

@app.post('/api/tasks/<int:tid>/complete')
@auth
def task_done(tid):
 c=db();t=c.execute('SELECT * FROM tasks WHERE id=?',(tid,)).fetchone()
 if not t or t['assigned_to']!=g.user['id']:c.close();return jsonify(error='forbidden'),403
 now=datetime.datetime.utcnow().isoformat()+'Z';award=t['reward'] if (not t['due_at'] or now<=t['due_at']) else 0;c.execute("UPDATE tasks SET status='completed',completed_at=? WHERE id=?",(now,tid))
 if award:c.execute('INSERT INTO score_events(user_id,points,category,note) VALUES(?,?,?,?)',(g.user['id'],award,'task','Task completed'))
 c.commit();c.close();return {'ok':True,'awarded':award}

@app.get('/api/leaderboard')
@auth
def leaderboard():
 month=request.args.get('month') or datetime.date.today().strftime('%Y-%m');c=db();params=[month+'%'];q='SELECT u.id,u.full_name,u.role,u.business_unit,COALESCE(SUM(s.points),0) score FROM users u LEFT JOIN score_events s ON s.user_id=u.id AND s.created_at LIKE ? WHERE u.active=1'
 if g.user['role'] not in {'ceo','internal_manager'}:q+=' AND u.business_unit=?';params.append(g.user['business_unit'])
 q+=' GROUP BY u.id ORDER BY score DESC,u.full_name';rows=c.execute(q,params).fetchall();c.close();return {'month':month,'ranking':[dict(x) for x in rows]}

HTML='''<!doctype html><html lang=fa dir=rtl><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>هلدینگ کاشانی</title><style>*{box-sizing:border-box}body{margin:0;background:#04040F;color:#fff;font-family:Tahoma}button,input,textarea{font:inherit}.c{max-width:850px;margin:auto;padding:16px}.card{background:#04072B;border:1px solid #0C2C70;border-radius:20px;padding:18px;margin:12px 0}.hide{display:none}.row{display:flex;gap:8px}.row>*{flex:1}input,textarea,button{width:100%;padding:12px;border:1px solid #0C2C70;border-radius:12px;background:#08133a;color:#fff;margin:5px 0}.p,.on{background:#1052AB}.nav{display:flex;gap:6px;overflow:auto}.nav button{min-width:120px}.item{padding:10px;border-bottom:1px solid #173973}.score{color:#FF7F03;font-weight:bold}</style><div class=c><div id=l class=card><h1>هلدینگ کاشانی</h1><div class=row><button class=unit data-u=academy>آکادمی کاشانی</button><button class=unit data-u=marshall>تیم مارشال</button></div><input id=u placeholder="نام کاربری"><input id=p type=password placeholder="رمز عبور"><button class=p id=go>ورود</button><small id=e></small></div><div id=x class=hide><div class=card><b id=n></b><div id=r></div></div><div class=nav><button data-t=h>امروز من</button><button data-t=rep>گزارش روزانه</button><button data-t=tsk>وظایف</button><button data-t=rnk>رتبه‌بندی</button><button data-t=adm>مدیریت</button></div><div id=h class=tab card><h2>امروز من</h2><p>نسخه Beta چندکاربره هلدینگ کاشانی</p><div>امتیاز ماه: <b class=score id=sc>0</b></div></div><div id=rep class="tab card hide"><h2>گزارش روزانه</h2><input id=d type=date><textarea id=m rows=7 placeholder='KPI به شکل JSON، مثال: {"calls":20}'></textarea><textarea id=no rows=4 placeholder=توضیحات></textarea><button class=p id=save>ثبت گزارش</button><div id=msg></div></div><div id=tsk class="tab card hide"><h2>وظایف</h2><div id=tl></div></div><div id=rnk class="tab card hide"><h2>رتبه‌بندی</h2><div id=rl></div></div><div id=adm class="tab card hide"><h2>کاربران</h2><div id=ul></div></div></div></div><script>let T=localStorage.t,U=null,B='academy';const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];async function A(p,o={}){o.headers={...(o.headers||{}),'Content-Type':'application/json',...(T?{Authorization:'Bearer '+T}:{})};let r=await fetch(p,o),d=await r.json();if(!r.ok)throw Error(d.error);return d}qa('.unit').forEach(b=>b.onclick=()=>{B=b.dataset.u;qa('.unit').forEach(z=>z.classList.remove('on'));b.classList.add('on')});q('#go').onclick=async()=>{try{let d=await A('/api/auth/login',{method:'POST',body:JSON.stringify({username:q('#u').value,password:q('#p').value,business_unit:B})});T=d.token;U=d.user;localStorage.t=T;show()}catch(e){q('#e').textContent='ورود ناموفق'}};qa('.nav button').forEach(b=>b.onclick=()=>{qa('.tab').forEach(z=>z.classList.add('hide'));q('#'+b.dataset.t).classList.remove('hide');if(b.dataset.t==='tsk')tasks();if(b.dataset.t==='rnk')rank();if(b.dataset.t==='adm')users()});q('#d').value=new Date().toISOString().slice(0,10);q('#save').onclick=async()=>{try{await A('/api/reports',{method:'POST',body:JSON.stringify({report_date:q('#d').value,metrics:q('#m').value?JSON.parse(q('#m').value):{},note:q('#no').value})});q('#msg').textContent='ثبت شد ✅'}catch(e){q('#msg').textContent='خطا'}};async function tasks(){let d=await A('/api/tasks');q('#tl').innerHTML=d.tasks.map(t=>'<div class=item><b>'+t.title+'</b><div>'+t.status+' | '+t.reward+' امتیاز</div>'+(t.assigned_to===U.id&&t.status==='open'?'<button onclick="done('+t.id+')">انجام شد</button>':'')+'</div>').join('')||'وظیفه‌ای نیست'}async function done(id){await A('/api/tasks/'+id+'/complete',{method:'POST'});tasks();rank()}async function rank(){let d=await A('/api/leaderboard');q('#rl').innerHTML=d.ranking.map((x,i)=>'<div class=item>'+(i+1)+'. '+x.full_name+' <span class=score>'+x.score+'</span></div>').join('');let me=d.ranking.find(x=>x.id===U.id);q('#sc').textContent=me?me.score:0}async function users(){try{let d=await A('/api/users');q('#ul').innerHTML=d.users.map(x=>'<div class=item>'+x.full_name+' — '+x.role+' — '+x.business_unit+'</div>').join('')}catch(e){q('#ul').textContent='دسترسی ندارید'}}async function show(){if(!U)U=await A('/api/me');q('#l').classList.add('hide');q('#x').classList.remove('hide');q('#n').textContent=U.full_name;q('#r').textContent=U.role+' • '+U.business_unit;rank();tasks()}if(T)show().catch(()=>{localStorage.removeItem('t');T=null})</script>'''

@app.get('/')
def home():return Response(HTML,mimetype='text/html')

init()
if __name__=='__main__':app.run(host='0.0.0.0',port=int(os.getenv('PORT','8080')))
