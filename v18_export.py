import io,zipfile,json,re
from xml.sax.saxutils import escape
from flask import request,jsonify,g,send_file
from v18_common import db,manager,can_unit,get_state,employee_rows

def cell(ref,v):
 if v is None:v=''
 if isinstance(v,(int,float)) and not isinstance(v,bool):return f'<c r="{ref}"><v>{v}</v></c>'
 return f'<c r="{ref}" t="inlineStr"><is><t>{escape(str(v))}</t></is></c>'
def col(n):
 s=''
 while n:n,r=divmod(n-1,26);s=chr(65+r)+s
 return s
def sheet(rows):
 a=['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>']
 for ri,row in enumerate(rows,1):a.append(f'<row r="{ri}">'+''.join(cell(f'{col(ci)}{ri}',v) for ci,v in enumerate(row,1))+'</row>')
 a.append('</sheetData></worksheet>');return ''.join(a)
def workbook(sheets):
 b=io.BytesIO();names=[re.sub(r'[\\/*?:\[\]]','-',n)[:31] for n,_ in sheets]
 with zipfile.ZipFile(b,'w',zipfile.ZIP_DEFLATED) as z:
  z.writestr('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(1,len(sheets)+1))+'</Types>')
  z.writestr('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
  z.writestr('xl/workbook.xml','<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+''.join(f'<sheet name="{escape(n)}" sheetId="{i}" r:id="rId{i}"/>' for i,n in enumerate(names,1))+'</sheets></workbook>')
  z.writestr('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+''.join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1,len(sheets)+1))+'</Relationships>')
  for i,(_,rows) in enumerate(sheets,1):z.writestr(f'xl/worksheets/sheet{i}.xml',sheet(rows))
 b.seek(0);return b
def inside(ds,frm,to):return (not frm or ds>=frm) and (not to or ds<=to)

def register(app):
 @app.get('/api/v18/export.xlsx')
 @manager
 def export_xlsx_v18():
  unit=request.args.get('business_unit') or g.user['business_unit'];frm=request.args.get('from','');to=request.args.get('to','')
  if not can_unit(unit):return jsonify(error='forbidden'),403
  p=get_state(unit);c=db();emps=employee_rows(c,'WHERE u.business_unit=?',(unit,));anns=[dict(x) for x in c.execute('SELECT id,title,body,audience,created_at FROM announcements WHERE business_unit=? ORDER BY id',(unit,)).fetchall()];groups=[dict(x) for x in c.execute('SELECT id,name,created_at FROM chat_groups WHERE business_unit=? ORDER BY id',(unit,)).fetchall()];c.close()
  er=[['ID','نام','نام کاربری','سمت','وضعیت','شروع همکاری','تاریخ آرشیو','علت','سابقه روز']]+[[x['id'],x['full_name'],x['username'],x['role'],'فعال' if x['active'] else 'آرشیو',x['first_start'] or '',x['archived_at'] or '',x['archive_reason'] or '',int(x['tenure_days'] or 0)] for x in emps]
  rr=[['شناسه نیرو در اپ','تاریخ','شاخص','مقدار']]
  for key,metrics in (p.get('reports',{}) or {}).items():
   if '|' not in str(key):continue
   uid,ds=str(key).split('|',1)
   if inside(ds,frm,to):
    for k,v in (metrics or {}).items():rr.append([uid,ds,k,json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else v])
  sr=[['تاریخ','دوره','مبلغ','نوع خریدار','فروشنده','ثبت‌کننده','توضیح']]
  for r in p.get('registrations',[]) or []:
   ds=str(r.get('date',''))
   if inside(ds,frm,to):sr.append([ds,r.get('course',''),r.get('amount',0),r.get('buyerType',''),r.get('sellerId',''),r.get('createdBy',''),r.get('desc','')])
  tr=[['عنوان','مسئول','ایجادکننده','مهلت','سکه','انجام شده','تاریخ ایجاد']]
  for t in p.get('tasks',[]) or []:
   ds=t.get('due') or str(t.get('createdAt',''))[:10]
   if inside(ds,frm,to):tr.append([t.get('title',''),t.get('assigneeId',''),t.get('creatorId',''),t.get('due',''),t.get('coin',0),'بله' if t.get('done') else 'خیر',t.get('createdAt','')])
  cr=[['نام کمپین','شروع','پایان','تعداد فروش','مبلغ فروش','توضیح']]+[[x.get('name',''),x.get('start',''),x.get('end',''),x.get('salesCount',0),x.get('salesAmount',0),x.get('desc','')] for x in (p.get('campaigns',[]) or []) if inside(str(x.get('start','')),frm,to) or inside(str(x.get('end','')),frm,to)]
  fr=[['ماه شمسی','سود خالص','یادداشت']]+[[k,(v or {}).get('profit',''),(v or {}).get('notes','')] for k,v in sorted((p.get('monthlyFinance',{}) or {}).items())]
  ar=[['ID','عنوان','متن','مخاطب','تاریخ']]+[[x['id'],x['title'],x['body'],x['audience'],x['created_at']] for x in anns if inside(str(x['created_at'])[:10],frm,to)]
  gr=[['ID گروه','نام گروه','تاریخ ساخت']]+[[x['id'],x['name'],x['created_at']] for x in groups]
  out=workbook([('نیروها',er),('گزارش روزانه',rr),('فروش',sr),('وظایف',tr),('کمپین‌ها',cr),('مالی',fr),('پیام مدیریت',ar),('گروه‌ها',gr)])
  return send_file(out,as_attachment=True,download_name=f'Holding-Kashani-{unit}-{frm or "all"}-{to or "all"}.xlsx',mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
