function allUsers(){return [...baseUsers,...state.customUsers]}
function courseByName(name){return state.courseCatalog.find(c=>c.name===name)}
function coursePrice(name){return Number(courseByName(name)?.price||0)}
function activeCourseCatalog(){return state.courseCatalog.filter(c=>c.active!==false)}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));queueRemoteSave()}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1800)}
function user(){return allUsers().find(x=>x.id===state.session?.userId)}
function reportKey(uid,date=nowKey()){return uid+'|'+date}
function getReport(uid,date=nowKey()){return state.reports[reportKey(uid,date)]||{}}
function setReport(uid,date,obj){state.reports[reportKey(uid,date)]={...obj};save()}
function inMonth(date,ref=nowKey()){return date.slice(0,7)===ref.slice(0,7)}
function weekStart(dateStr=nowKey()){const d=new Date(dateStr+'T12:00:00'),day=d.getDay(),diff=(day+1)%7;d.setDate(d.getDate()-diff);return nowKeyFromDate(d)}
function inWeek(date,ref=nowKey()){const s=new Date(weekStart(ref)+'T00:00:00'),e=new Date(s);e.setDate(e.getDate()+7);const x=new Date(date+'T12:00:00');return x>=s&&x<e}
function matchPeriod(date,mode){return mode==='day'?date===nowKey():mode==='week'?inWeek(date):inMonth(date)}
function listReports(uid,mode='month'){return Object.entries(state.reports).filter(([k])=>k.startsWith(uid+'|')).map(([k,v])=>({date:k.split('|')[1],...v})).filter(r=>matchPeriod(r.date,mode)).sort((a,b)=>a.date.localeCompare(b.date))}
function roleFields(role){return schemas[role]||[]}
function agg(uid,mode='month'){const rows=listReports(uid,mode),out={days:rows.length};for(const [key,,type] of roleFields(allUsers().find(x=>x.id===uid)?.role)){if(type==='number'||type==='money')out[key]=rows.reduce((s,r)=>s+Number(r[key]||0),0)}return out}
function att(uid,date=nowKey()){return state.attendance[reportKey(uid,date)]||{in:'',out:''}}
function officialRegs(mode='month',filter=null){return state.registrations.filter(r=>matchPeriod(r.date,mode)&&(filter?filter(r):true))}
function salesSummary(mode='month',filter=null){const r=officialRegs(mode,filter);return{count:r.length,amount:r.reduce((s,x)=>s+Number(x.amount||0),0),first:r.filter(x=>x.buyerType==='اول').length,repeat:r.filter(x=>x.buyerType==='مجدد').length}}
function personalFinalSales(uid,mode='month'){return salesSummary(mode,r=>r.sellerId===uid)}
function registrationAdminSales(uid,mode='month'){return salesSummary(mode,r=>r.createdBy===uid)}
function roleIds(roles){return allUsers().filter(x=>x.division==='academy'&&roles.includes(x.role)).map(x=>x.id)}
function officialTeamSales(roles,mode='month'){const ids=new Set(roleIds(roles));return salesSummary(mode,r=>ids.has(r.sellerId))}
function consultationTeamSummary(mode='month'){
  const users=allUsers().filter(x=>x.division==='academy'&&consultationRoles.includes(x.role));
  return users.reduce((o,u)=>{const a=agg(u.id,mode);o.count+=Number(a.consult_reg||0);o.amount+=Number(a.consult_amount||0);o.pv+=Number(a.pv_received||0);return o},{count:0,amount:0,pv:0});
}
function courseBreakdown(mode='month',filter=null){const m={};for(const r of officialRegs(mode,filter)){m[r.course]=m[r.course]||{count:0,amount:0};m[r.course].count++;m[r.course].amount+=Number(r.amount||0)}return Object.entries(m).sort((a,b)=>b[1].amount-a[1].amount)}
function formatVal(type,v){return type==='money'?money(v):fmt(v)}
function numericFields(role){return roleFields(role).filter(x=>x[2]==='number'||x[2]==='money')}
function primaryField(role){return numericFields(role)[0]}
function modal(title,body){$('#modal').className='modal';$('#modal').innerHTML=`<div class="sheet"><div class="sheethead"><strong>${title}</strong><button class="x" onclick="closeModal()">×</button></div>${body}</div>`}
function closeModal(){$('#modal').className='hidden';$('#modal').innerHTML=''}
function currentTheme(){const u=user();return (u&&state.userThemes[u.id])||'dark'}

function avatarConfig(uid){
  const base={gender:'male',style:1,skin:'#D9A078',shirt:'#1052AB'};
  if(!state.avatars[uid]){
    const u=allUsers().find(x=>x.id===uid);
    const female=/مریم|سارا|نگار|هانیه|رها|نازنین|آرزو|نیلوفر/.test(u?.name||'');
    state.avatars[uid]={...base,gender:female?'female':'male',style:(Math.abs(hashStr(uid))%3)+1,skin:['#F2C6A8','#D9A078','#A96F50'][Math.abs(hashStr(uid+'s'))%3],shirt:['#1052AB','#0C2C70','#4282CC'][Math.abs(hashStr(uid+'c'))%3]};
  }
  return state.avatars[uid];
}
function hashStr(v){let h=0;for(const c of String(v))h=((h<<5)-h)+c.charCodeAt(0)|0;return h}
function avatarSvg(uid,cls='avatarMd'){
  const a=avatarConfig(uid),female=a.gender==='female',skin=a.skin||'#D9A078',shirt=a.shirt||'#1052AB',st=Number(a.style||1);
  const hair=female?
    (st===1?`<path d="M23 37c1-18 39-21 42 0v31c-7 8-13 10-21 10S29 76 23 69z" fill="#171D2B"/><path d="M27 40c3-15 32-17 35 0-6-8-11-11-18-11S32 33 27 40z" fill="#26334A"/>`:
     st===2?`<path d="M20 38c4-20 42-22 46 1v24c-6 7-11 10-16 12l-2-15c10-9 12-25-4-29-15 1-21 10-20 23l-2 19c-5-6-4-25-2-35z" fill="#2B1B19"/>`:
     `<path d="M22 40c2-18 42-24 45 0l-2 27-10-8c7-13 0-29-12-29-13 0-20 13-13 29l-9 9z" fill="#3B2B26"/><circle cx="58" cy="31" r="9" fill="#3B2B26"/>`)
    :(st===1?`<path d="M25 40c3-17 34-22 40-3-5-7-10-9-18-8-9 1-13 6-22 11z" fill="#1B2232"/><path d="M27 36c4-11 30-17 36-3-12-4-24 0-36 3z" fill="#2B364F"/>`:
      st===2?`<path d="M24 39c2-18 37-23 42-2-8-5-15-8-22-7-8 1-12 4-20 9z" fill="#37251D"/><path d="M28 31c8-8 26-8 32 1-9-1-18 2-32-1z" fill="#5A3828"/>`:
      `<path d="M23 41c1-18 39-25 44-3-9-4-15-9-22-7-10 2-12 6-22 10z" fill="#111827"/><path d="M30 29c12-6 25-4 31 5-12-5-21-3-31-5z" fill="#334155"/>`);
  return `<div class="avatarShell ${cls}"><svg class="avatarSvg" viewBox="0 0 88 96" aria-hidden="true"><defs><linearGradient id="g_${uid.replace(/[^a-zA-Z0-9]/g,'')}" x1="0" x2="1"><stop stop-color="${shirt}"/><stop offset="1" stop-color="#4282CC"/></linearGradient></defs><circle cx="44" cy="46" r="42" fill="rgba(66,130,204,.12)"/><path d="M16 94c2-23 16-33 28-33s27 10 29 33z" fill="url(#g_${uid.replace(/[^a-zA-Z0-9]/g,'')})"/><ellipse cx="44" cy="45" rx="20" ry="24" fill="${skin}"/>${hair}<ellipse cx="36" cy="46" rx="2" ry="2.5" fill="#101828"/><ellipse cx="52" cy="46" rx="2" ry="2.5" fill="#101828"/><path d="M38 57c4 3 8 3 12 0" fill="none" stroke="#8A4E42" stroke-width="2" stroke-linecap="round"/>${female?'<path d="M32 41c2-2 5-2 8-1M48 40c3-1 6-1 8 1" stroke="#352623" stroke-width="1.5" stroke-linecap="round"/>':'<path d="M32 40h8M48 40h8" stroke="#293548" stroke-width="1.5" stroke-linecap="round"/>'}</svg></div>`
}
function openAvatarCustomizer(){
  const u=user(),a=avatarConfig(u.id);window._avatarDraft={...a};
  modal('ساخت کاراکتر من',`<div id="avatarBuilderPreview" style="display:grid;place-items:center;margin:4px 0 14px">${avatarSvg(u.id,'avatarLg')}</div><div class="field"><label>کاراکتر</label><select id="av_gender" onchange="refreshAvatarBuilder()"><option value="male" ${a.gender==='male'?'selected':''}>آقا</option><option value="female" ${a.gender==='female'?'selected':''}>خانم</option></select></div><div class="field"><label>مدل مو</label><div class="avatarChoices">${[1,2,3].map(n=>`<button type="button" class="avatarChoice ${a.style===n?'active':''}" data-style="${n}" onclick="pickAvatarStyle(${n})"><b>مدل ${n}</b></button>`).join('')}</div></div><div class="field"><label>رنگ پوست</label><div class="swatches">${['#F2C6A8','#D9A078','#A96F50'].map(c=>`<button type="button" class="swatch" style="background:${c}" onclick="pickAvatarColor('skin','${c}')"></button>`).join('')}</div></div><div class="field"><label>رنگ لباس</label><div class="swatches">${['#1052AB','#0C2C70','#4282CC','#1F6F5F','#6B4FA3'].map(c=>`<button type="button" class="swatch" style="background:${c}" onclick="pickAvatarColor('shirt','${c}')"></button>`).join('')}</div></div><button class="btn" onclick="saveAvatar()">ذخیره کاراکتر</button>`);refreshAvatarBuilder()
}
function pickAvatarStyle(n){window._avatarDraft.style=n;refreshAvatarBuilder()}
function pickAvatarColor(k,c){window._avatarDraft[k]=c;refreshAvatarBuilder()}
function refreshAvatarBuilder(){
  const u=user();if(!u)return;const g=document.querySelector('#av_gender');if(g)window._avatarDraft.gender=g.value;
  const old=state.avatars[u.id];state.avatars[u.id]={...window._avatarDraft};
  const p=document.querySelector('#avatarBuilderPreview');if(p)p.innerHTML=avatarSvg(u.id,'avatarLg');
  state.avatars[u.id]=old||{...window._avatarDraft};
  document.querySelectorAll('.avatarChoice').forEach(b=>b.classList.toggle('active',Number(b.dataset.style)===Number(window._avatarDraft.style)));
}
function saveAvatar(){const u=user();state.avatars[u.id]={...window._avatarDraft};save();closeModal();mountApp();toast('کاراکتر شما ذخیره شد')}
function applyTheme(mode=currentTheme()){document.documentElement.setAttribute('data-theme',mode);const meta=document.querySelector('meta[name=theme-color]');if(meta)meta.setAttribute('content',mode==='light'?'#EEF4FB':'#04040F');document.querySelectorAll('.navIcon').forEach(img=>{const dark=img.getAttribute('data-dark')||img.getAttribute('src');if(!img.getAttribute('data-dark'))img.setAttribute('data-dark',dark);const light=img.getAttribute('data-light')||dark.replace(/\.webp$/,'-light.webp');img.src=mode==='light'?light:dark})}
function toggleTheme(){const u=user();if(!u)return;state.userThemes[u.id]=currentTheme()==='dark'?'light':'dark';save();applyTheme();more();toast(state.userThemes[u.id]==='light'?'حالت روشن فعال شد':'حالت تیره فعال شد')}
function themeCard(){const light=currentTheme()==='light';return `<div class="card"><h3 class="title">ظاهر اپلیکیشن</h3><div class="themeSwitch"><div><strong>${light?'حالت روشن':'حالت تیره'}</strong><div class="muted">تنظیم برای همین حساب ذخیره می‌شود.</div></div><button class="themeToggle ${light?'light':''}" onclick="toggleTheme()" aria-label="تغییر حالت روشن و تیره"><i></i></button></div></div>`}
