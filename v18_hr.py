from datetime import date
from flask import request,jsonify,g
from werkzeug.security import generate_password_hash
from v18_common import db,auth,manager,can_unit,get_state,state_uid,employee_rows

def register(app):
 @app.get('/api/v18/users')
 @manager
 def v18_users():
  c=db();r=g.user['role']
  if r=='internal_manager':rows=employee_rows(c)
  elif r=='ceo':rows=employee_rows(c,'WHERE u.business_unit=?',(g.user['business_unit'],))
  elif r=='marshall_manager':rows=employee_rows(c,"WHERE u.business_unit='marshall'")
  else:rows=employee_rows(c,"WHERE u.business_unit='academy' AND u.role IN ('sales_manager','registration_admin','admin_pv_main','admin_page','admin_installment','admin_consult','callcenter')")
  c.close();return {'users':rows}

 @app.post('/api/v18/users')
 @auth
 def v18_add_user():
  if g.user['role'] not in {'internal_manager','ceo'}:return jsonify(error='forbidden'),403
  d=request.get_json(silent=True) or {};req=['username','password','full_name','business_unit','role']
  if any(not d.get(k) for k in req):return jsonify(error='missing_fields'),400
  unit=d['business_unit'];username=d['username'].strip()
  if not can_unit(unit):return jsonify(error='wrong_business_unit'),403
  if len(username)<3 or len(d['password'])<6:return jsonify(error='weak_credentials'),400
  c=db()
  if c.execute('SELECT 1 FROM users WHERE username=?',(username,)).fetchone():c.close();return jsonify(error='username_reserved_for_history'),409
  cur=c.execute('INSERT INTO users(username,password_hash,full_name,business_unit,role,active) VALUES(?,?,?,?,?,1)',(username,generate_password_hash(d['password']),d['full_name'].strip(),unit,d['role']));uid=cur.lastrowid;c.execute('INSERT INTO employment_periods(user_id,start_date) VALUES(?,?)',(uid,date.today().isoformat()));c.commit();c.close();return {'ok':True,'id':uid},201

 @app.patch('/api/v18/users/<int:uid>')
 @auth
 def v18_update_user(uid):
  if g.user['role']!='internal_manager':return jsonify(error='forbidden'),403
  d=request.get_json(silent=True) or {};c=db();u=c.execute('SELECT * FROM users WHERE id=?',(uid,)).fetchone()
  if not u:c.close();return jsonify(error='not_found'),404
  if u['username']=='internal' and d.get('active') is False:c.close();return jsonify(error='cannot_deactivate_self'),400
  fields=[];vals=[]
  if d.get('password'):
   if len(d['password'])<6:c.close();return jsonify(error='weak_credentials'),400
   fields.append('password_hash=?');vals.append(generate_password_hash(d['password']))
  if d.get('full_name'):fields.append('full_name=?');vals.append(d['full_name'].strip())
  if d.get('role'):fields.append('role=?');vals.append(d['role'])
  if isinstance(d.get('active'),bool):
   active=1 if d['active'] else 0;fields.append('active=?');vals.append(active)
   if not active:
    reason=(d.get('reason') or 'پایان همکاری').strip();fields+=['archived_at=CURRENT_TIMESTAMP','archive_reason=?'];vals.append(reason);c.execute('UPDATE employment_periods SET end_date=?,reason=? WHERE user_id=? AND end_date IS NULL',(date.today().isoformat(),reason,uid));c.execute('DELETE FROM sessions WHERE user_id=?',(uid,))
   elif not u['active']:
    fields+=['archived_at=NULL','archive_reason=NULL'];c.execute('INSERT INTO employment_periods(user_id,start_date) VALUES(?,?)',(uid,date.today().isoformat()))
  if fields:vals.append(uid);c.execute('UPDATE users SET '+','.join(fields)+' WHERE id=?',vals)
  c.commit();c.close();return {'ok':True}

 @app.get('/api/v18/users/<int:uid>/history')
 @manager
 def v18_user_history(uid):
  c=db();u=c.execute('SELECT id,username,full_name,business_unit,role,active,created_at,archived_at,archive_reason FROM users WHERE id=?',(uid,)).fetchone()
  if not u:c.close();return jsonify(error='not_found'),404
  periods=[dict(x) for x in c.execute('SELECT id,start_date,end_date,reason FROM employment_periods WHERE user_id=? ORDER BY start_date',(uid,)).fetchall()];tenure=c.execute("SELECT COALESCE(SUM(julianday(COALESCE(end_date,date('now')))-julianday(start_date)+1),0)d FROM employment_periods WHERE user_id=?",(uid,)).fetchone()['d'];c.close();p=get_state(u['business_unit']);key=state_uid(p,uid,u['username']);reports=[]
  for k,v in (p.get('reports',{}) or {}).items():
   if str(k).startswith(key+'|'):reports.append({'date':str(k).split('|',1)[1],'metrics':v})
  reports.sort(key=lambda x:x['date']);return {'user':dict(u),'periods':periods,'tenure_days':int(tenure or 0),'state_user_id':key,'reports':reports[-500:]}
