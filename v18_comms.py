from flask import request,jsonify,g
from v18_common import db,auth,manager,can_unit,notify

def register(app):
 @app.get('/api/v18/announcements')
 @auth
 def announcements():
  c=db();rows=c.execute("SELECT a.*,u.full_name author FROM announcements a JOIN users u ON u.id=a.created_by WHERE a.business_unit=? AND (a.expires_at IS NULL OR date(a.expires_at)>=date('now')) ORDER BY a.id DESC LIMIT 50",(g.user['business_unit'],)).fetchall();c.close();return {'announcements':[dict(x) for x in rows]}

 @app.post('/api/v18/announcements')
 @manager
 def add_announcement():
  d=request.get_json(silent=True) or {};title=(d.get('title') or '').strip();body=(d.get('body') or '').strip();unit=d.get('business_unit') or g.user['business_unit']
  if not title or not body:return jsonify(error='missing_fields'),400
  if not can_unit(unit):return jsonify(error='forbidden'),403
  c=db();cur=c.execute('INSERT INTO announcements(business_unit,title,body,audience,created_by,expires_at) VALUES(?,?,?,?,?,?)',(unit,title,body,d.get('audience') or 'all',g.user['id'],d.get('expires_at')));aid=cur.lastrowid;ids=[r['id'] for r in c.execute('SELECT id FROM users WHERE active=1 AND business_unit=?',(unit,)).fetchall()];notify(c,ids,title,body,'announcement',str(aid));c.commit();c.close();return {'ok':True,'id':aid},201

 @app.get('/api/v18/notifications')
 @auth
 def notifications():
  c=db();rows=c.execute('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 100',(g.user['id'],)).fetchall();c.close();return {'notifications':[dict(x) for x in rows]}

 @app.post('/api/v18/notifications/read')
 @auth
 def notif_read():
  d=request.get_json(silent=True) or {};ids=d.get('ids') or [];c=db()
  if ids:
   q=','.join('?' for _ in ids);c.execute(f'UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE user_id=? AND id IN ({q})',(g.user['id'],*ids))
  else:c.execute('UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE user_id=?',(g.user['id'],))
  c.commit();c.close();return {'ok':True}

 @app.post('/api/v18/notifications/task')
 @auth
 def task_notif():
  if g.user['role'] not in {'internal_manager','ceo','sales_manager','marshall_manager'}:return jsonify(error='forbidden'),403
  d=request.get_json(silent=True) or {};uid=d.get('user_id')
  if not uid:return jsonify(error='missing_user'),400
  c=db();t=c.execute('SELECT id,active FROM users WHERE id=?',(int(uid),)).fetchone()
  if not t or not t['active']:c.close();return jsonify(error='not_found'),404
  notify(c,[uid],(d.get('title') or 'وظیفه جدید').strip(),(d.get('body') or '').strip(),'task',d.get('ref_key'));c.commit();c.close();return {'ok':True}

 @app.get('/api/v18/groups')
 @auth
 def groups():
  c=db()
  if g.user['role']=='internal_manager':rows=c.execute('SELECT g.*,u.full_name creator FROM chat_groups g JOIN users u ON u.id=g.created_by WHERE g.archived=0 ORDER BY g.id DESC').fetchall()
  else:rows=c.execute('SELECT g.*,u.full_name creator FROM chat_groups g JOIN chat_members m ON m.group_id=g.id JOIN users u ON u.id=g.created_by WHERE g.archived=0 AND m.user_id=? ORDER BY g.id DESC',(g.user['id'],)).fetchall()
  out=[]
  for r in rows:
   x=dict(r);x['members']=[dict(z) for z in c.execute('SELECT u.id,u.full_name,u.role,u.active FROM chat_members m JOIN users u ON u.id=m.user_id WHERE m.group_id=? ORDER BY u.full_name',(r['id'],)).fetchall()];out.append(x)
  c.close();return {'groups':out}

 @app.post('/api/v18/groups')
 @manager
 def add_group():
  d=request.get_json(silent=True) or {};name=(d.get('name') or '').strip();unit=d.get('business_unit') or g.user['business_unit'];members={int(x) for x in d.get('member_ids',[]) if str(x).isdigit()}
  if not name:return jsonify(error='missing_name'),400
  if not can_unit(unit):return jsonify(error='forbidden'),403
  c=db();cur=c.execute('INSERT INTO chat_groups(business_unit,name,created_by) VALUES(?,?,?)',(unit,name,g.user['id']));gid=cur.lastrowid;valid={r['id'] for r in c.execute('SELECT id FROM users WHERE active=1 AND business_unit=?',(unit,)).fetchall()};members=(members&valid)|{g.user['id']}
  for uid in members:c.execute('INSERT OR IGNORE INTO chat_members(group_id,user_id) VALUES(?,?)',(gid,uid))
  c.commit();c.close();return {'ok':True,'id':gid},201

 @app.get('/api/v18/groups/<int:gid>/messages')
 @auth
 def messages(gid):
  c=db();mem=c.execute('SELECT 1 FROM chat_members WHERE group_id=? AND user_id=?',(gid,g.user['id'])).fetchone()
  if not mem and g.user['role']!='internal_manager':c.close();return jsonify(error='forbidden'),403
  rows=c.execute('SELECT m.id,m.body,m.created_at,m.user_id,u.full_name FROM chat_messages m JOIN users u ON u.id=m.user_id WHERE m.group_id=? ORDER BY m.id DESC LIMIT 150',(gid,)).fetchall();c.close();return {'messages':[dict(x) for x in reversed(rows)]}

 @app.post('/api/v18/groups/<int:gid>/messages')
 @auth
 def add_message(gid):
  d=request.get_json(silent=True) or {};body=(d.get('body') or '').strip()
  if not body:return jsonify(error='empty'),400
  c=db();mem=c.execute('SELECT 1 FROM chat_members WHERE group_id=? AND user_id=?',(gid,g.user['id'])).fetchone()
  if not mem and g.user['role']!='internal_manager':c.close();return jsonify(error='forbidden'),403
  cur=c.execute('INSERT INTO chat_messages(group_id,user_id,body) VALUES(?,?,?)',(gid,g.user['id'],body));mid=cur.lastrowid;ids=[r['user_id'] for r in c.execute('SELECT user_id FROM chat_members WHERE group_id=? AND user_id<>?',(gid,g.user['id'])).fetchall()];grp=c.execute('SELECT name FROM chat_groups WHERE id=?',(gid,)).fetchone();notify(c,ids,'پیام جدید در '+(grp['name'] if grp else 'گروه'),body[:160],'chat',str(gid));c.commit();c.close();return {'ok':True,'id':mid},201
