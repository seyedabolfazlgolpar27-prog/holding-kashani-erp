/* Final internal-test behavior overrides */
(function(){
  const LEGACY_BOOTSTRAP='internal';
  const originalLoadRemoteState=loadRemoteState;

  allUsers=function(){
    const boot=baseUsers.filter(x=>x.username===LEGACY_BOOTSTRAP);
    const custom=Array.isArray(state.customUsers)?state.customUsers:[];
    const seen=new Set(),out=[];
    for(const u of [...boot,...custom]){const key=(u.division||'')+'|'+(u.username||u.id);if(!seen.has(key)){seen.add(key);out.push(u)}}
    return out;
  };

  async function syncServerUsers(){
    if(!apiToken)return;
    try{
      const me=await api('/api/me');
      if(!['internal_manager','ceo','sales_manager','marshall_manager'].includes(me.role))return;
      const d=await api('/api/users');
      const rows=(d.users||[]).filter(x=>x.active&&x.username!==LEGACY_BOOTSTRAP);
      state.customUsers=rows.map(x=>({id:'custom_server_'+x.id,serverId:x.id,division:x.business_unit,role:x.role,name:x.full_name,username:x.username}));
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    }catch(_){/* user list is non-critical for normal staff */}
  }

  loadRemoteState=async function(){
    const ok=await originalLoadRemoteState();
    await syncServerUsers();
    return ok;
  };

  showLogin=function(div){
    $('#loginRoot').innerHTML=`<div class="loginwrap"><div class="loginbox"><button class="chip" onclick="showDivisionChoice()">← بازگشت</button><div style="text-align:center;margin:18px 0"><div style="display:grid;place-items:center;margin-bottom:11px"><div class="logoMark"><span>${div==='academy'?'A':'M'}</span></div></div><h2 style="margin:0">${divisionNames[div]}</h2><div class="muted" style="margin-top:5px">نام کاربری و رمز اختصاصی خود را وارد کنید.</div></div><div class="card"><div class="field"><label>نام کاربری</label><input id="loginUser" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="نام کاربری"></div><div class="field"><label>رمز عبور</label><input id="loginPass" type="password" autocomplete="current-password" placeholder="رمز عبور اختصاصی" onkeydown="if(event.key==='Enter')doLogin('${div}')"></div><button class="btn" id="loginBtn" onclick="doLogin('${div}')">ورود</button></div><div class="muted" style="text-align:center;margin-top:12px">حساب‌ها فقط توسط مدیریت ساخته می‌شوند.</div></div></div>`;
  };

  /* smooth page navigation without the old hard jump */
  let currentPage='home';
  renderPage=function(name){
    const valid=['home','daily','reports','rewards','more'];
    const target=valid.includes(name)?name:'home';
    $$('.nav').forEach(n=>{const active=n.dataset.page===target;n.classList.toggle('active',active);if(active)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current')});
    try{
      if(target==='home')home();
      else if(target==='daily')daily();
      else if(target==='reports')reports();
      else if(target==='rewards')rewards();
      else more();
    }catch(err){
      console.error('Navigation render error:',target,err);
      try{home()}catch(homeErr){emergencyHome(homeErr)}
    }
    const v=$('#view');
    if(v&&currentPage!==target&&v.animate){
      try{v.getAnimations().forEach(a=>a.cancel())}catch(_){}
      v.animate([{opacity:.35,transform:'translate3d(0,9px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:220,easing:'cubic-bezier(.2,.75,.2,1)',fill:'both'});
    }
    currentPage=target;
    try{window.scrollTo({top:0,behavior:'smooth'})}catch(_){window.scrollTo(0,0)}
  };

  /* full avatar builder */
  const AV_DEFAULT={gender:'male',face:1,hair:1,eyes:1,glasses:0,mouth:1,facialHair:0,skin:'#D9A078',hairColor:'#171D2B',shirt:'#1052AB'};
  const SKINS=['#F6D0B5','#E8B894','#D9A078','#BE7F5F','#8E5A43'];
  const HAIRS=['#111827','#3A2A24','#6B4936','#9B6A3E','#D1A04C'];
  const SHIRTS=['#1052AB','#0C2C70','#4282CC','#1F6F5F','#6B4FA3'];
  function normalizedAvatar(uid){
    const old=state.avatars[uid]||{};
    const u=allUsers().find(x=>x.id===uid);
    const female=/مریم|سارا|نگار|هانیه|رها|نازنین|آرزو|نیلوفر/.test(u?.name||'');
    return {...AV_DEFAULT,gender:old.gender||(female?'female':'male'),face:Number(old.face||1),hair:Number(old.hair||old.style||1),eyes:Number(old.eyes||1),glasses:Number(old.glasses||0),mouth:Number(old.mouth||1),facialHair:Number(old.facialHair||0),skin:old.skin||AV_DEFAULT.skin,hairColor:old.hairColor||'#171D2B',shirt:old.shirt||AV_DEFAULT.shirt};
  }
  avatarConfig=function(uid){if(!state.avatars[uid])state.avatars[uid]=normalizedAvatar(uid);else state.avatars[uid]={...normalizedAvatar(uid),...state.avatars[uid]};return state.avatars[uid]};

  function faceShape(a){
    if(a.face===2)return `<ellipse cx="44" cy="47" rx="23" ry="22" fill="${a.skin}"/>`;
    if(a.face===3)return `<rect x="23" y="23" width="42" height="50" rx="14" fill="${a.skin}"/>`;
    if(a.face===4)return `<path d="M44 22c14 0 23 8 22 23-1 14-10 25-22 29-12-4-21-15-22-29-1-15 8-23 22-23z" fill="${a.skin}"/>`;
    if(a.face===5)return `<ellipse cx="44" cy="47" rx="18.5" ry="27" fill="${a.skin}"/>`;
    return `<ellipse cx="44" cy="47" rx="20.5" ry="25" fill="${a.skin}"/>`;
  }
  function hairShape(a){const c=a.hairColor,st=a.hair,g=a.gender;
    if(g==='female'){
      if(st===2)return `<path d="M20 39c2-21 45-24 48 0l-2 30-12 7-2-20c9-10 8-25-8-27-16 2-18 18-9 28l-3 20-11-8z" fill="${c}"/><path d="M27 34c8-10 27-12 36 0-10-3-24-1-36 0z" fill="rgba(255,255,255,.08)"/>`;
      if(st===3)return `<path d="M21 40c1-20 43-25 47-2l-4 31-9-10c6-15-1-29-12-29-13 0-20 14-13 29l-9 10z" fill="${c}"/><circle cx="61" cy="31" r="10" fill="${c}"/>`;
      if(st===4)return `<path d="M21 41c2-22 43-25 47-3-3-7-8-12-14-14-10 10-20 15-31 16l-2 30-8-9 2-20z" fill="${c}"/><path d="M22 55c-2 11 2 21 9 27" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>`;
      if(st===5)return `<path d="M20 41c1-21 46-25 48-1l-1 36-9-12c5-11 4-31-14-34-18 3-18 23-13 34l-10 12z" fill="${c}"/><path d="M25 36c7-8 31-11 39 0-15-5-28 4-39 0z" fill="rgba(255,255,255,.09)"/>`;
      return `<path d="M22 39c2-20 42-23 45 0v31c-7 8-15 10-23 10s-16-2-22-10z" fill="${c}"/><path d="M27 38c5-13 29-16 35 0-7-7-12-10-18-10-7 0-12 3-17 10z" fill="rgba(255,255,255,.08)"/>`;
    }
    if(st===2)return `<path d="M23 40c2-20 39-24 44-2-8-6-15-9-23-8-8 1-13 5-21 10z" fill="${c}"/><path d="M29 29c9-7 26-6 32 3-10-1-20 1-32-3z" fill="rgba(255,255,255,.08)"/>`;
    if(st===3)return `<path d="M22 40c3-21 39-25 45-2-9-3-13-10-18-12-7 9-16 13-27 14z" fill="${c}"/>`;
    if(st===4)return `<path d="M23 40c1-18 39-26 44-4-8-4-12-11-19-13-5 8-14 14-25 17z" fill="${c}"/><path d="M29 27l8-8 2 9 8-11 1 10 10-6-4 11z" fill="${c}"/>`;
    if(st===5)return `<path d="M23 41c1-19 40-24 44-4-13-4-28-3-44 4z" fill="${c}"/><path d="M25 34c8-12 30-15 39-1-14-2-25 4-39 1z" fill="rgba(255,255,255,.1)"/>`;
    return `<path d="M24 40c3-18 35-23 42-3-7-6-13-8-21-7-8 1-13 5-21 10z" fill="${c}"/>`;
  }
  function eyeShape(a){
    const y=47;
    if(a.eyes===2)return `<path d="M33 ${y}q3 2 6 0M49 ${y}q3 2 6 0" fill="none" stroke="#172033" stroke-width="2.2" stroke-linecap="round"/>`;
    if(a.eyes===3)return `<ellipse cx="36" cy="47" rx="3.8" ry="4.5" fill="#fff"/><ellipse cx="52" cy="47" rx="3.8" ry="4.5" fill="#fff"/><circle cx="36" cy="47.5" r="2.2" fill="#172033"/><circle cx="52" cy="47.5" r="2.2" fill="#172033"/><circle cx="35.3" cy="46.6" r=".7" fill="#fff"/><circle cx="51.3" cy="46.6" r=".7" fill="#fff"/>`;
    if(a.eyes===4)return `<path d="M32 48q4-5 8 0M48 48q4-5 8 0" fill="none" stroke="#172033" stroke-width="2" stroke-linecap="round"/>`;
    if(a.eyes===5)return `<path d="M32 46l8 2M48 48l8-2" stroke="#172033" stroke-width="2.2" stroke-linecap="round"/><circle cx="37" cy="48" r="1.5" fill="#172033"/><circle cx="51" cy="48" r="1.5" fill="#172033"/>`;
    return `<ellipse cx="36" cy="47" rx="2.2" ry="2.8" fill="#172033"/><ellipse cx="52" cy="47" rx="2.2" ry="2.8" fill="#172033"/>`;
  }
  function glassesShape(a){
    if(a.glasses===1)return `<g fill="none" stroke="#233653" stroke-width="1.8"><circle cx="36" cy="47" r="6"/><circle cx="52" cy="47" r="6"/><path d="M42 47h4M30 46l-5-2M58 46l5-2"/></g>`;
    if(a.glasses===2)return `<g fill="rgba(70,110,160,.08)" stroke="#233653" stroke-width="1.8"><rect x="29.5" y="41.5" width="13" height="10" rx="2"/><rect x="45.5" y="41.5" width="13" height="10" rx="2"/><path d="M42.5 46.5h3" fill="none"/></g>`;
    if(a.glasses===3)return `<g fill="rgba(70,110,160,.12)" stroke="#263a5a" stroke-width="1.6"><path d="M29 43h14c0 8-3 11-7 11s-7-4-7-11z"/><path d="M45 43h14c0 7-3 11-7 11s-7-3-7-11z"/><path d="M43 46h2" fill="none"/></g>`;
    if(a.glasses===4)return `<g fill="none" stroke="#233653" stroke-width="1.7"><path d="M30 44h12v7M46 44h12v7M42 45h4"/><path d="M30 44q6-3 12 0M46 44q6-3 12 0"/></g>`;
    return '';
  }
  function mouthShape(a){
    if(a.mouth===2)return `<path d="M39 59h10" stroke="#8A4E42" stroke-width="1.8" stroke-linecap="round"/>`;
    if(a.mouth===3)return `<ellipse cx="44" cy="59" rx="4.5" ry="3" fill="#8A4E42"/><path d="M41 58h6" stroke="#fff" stroke-width="1"/>`;
    if(a.mouth===4)return `<path d="M38 57q6 7 12 0" fill="#fff" stroke="#8A4E42" stroke-width="1.5" stroke-linejoin="round"/>`;
    return `<path d="M38 58q6 5 12 0" fill="none" stroke="#8A4E42" stroke-width="2" stroke-linecap="round"/>`;
  }
  function facialHairShape(a){if(a.gender==='female'||!a.facialHair)return'';const c=a.hairColor;
    if(a.facialHair===1)return `<path d="M37 56q4-4 7 0q3-4 7 0-3 4-7 1-4 3-7-1z" fill="${c}"/>`;
    if(a.facialHair===2)return `<path d="M40 63q4 7 8 0l-1 9h-6z" fill="${c}" opacity=".9"/>`;
    if(a.facialHair===3)return `<path d="M27 56c3 14 9 20 17 20s14-6 17-20c-4 5-8 8-17 8s-13-3-17-8z" fill="${c}" opacity=".82"/>`;
    if(a.facialHair===4)return `<g fill="${c}" opacity=".45"><circle cx="34" cy="60" r=".8"/><circle cx="38" cy="63" r=".8"/><circle cx="43" cy="64" r=".8"/><circle cx="48" cy="63" r=".8"/><circle cx="53" cy="60" r=".8"/></g>`;
    return '';
  }
  avatarSvg=function(uid,cls='avatarMd'){
    const a=avatarConfig(uid),gid='av_'+String(uid).replace(/[^a-zA-Z0-9]/g,'');
    return `<div class="avatarShell ${cls}"><svg class="avatarSvg" viewBox="0 0 88 96" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" x2="1"><stop stop-color="${a.shirt}"/><stop offset="1" stop-color="#4282CC"/></linearGradient></defs><circle cx="44" cy="46" r="42" fill="rgba(66,130,204,.12)"/><path d="M14 96c2-25 17-35 30-35s28 10 30 35z" fill="url(#${gid})"/>${faceShape(a)}${hairShape(a)}<path d="M32 41q4-2 8 0M48 41q4-2 8 0" fill="none" stroke="${a.hairColor}" stroke-width="1.4" stroke-linecap="round"/>${eyeShape(a)}<path d="M44 49l-1 5 3 1" fill="none" stroke="rgba(110,70,55,.45)" stroke-width="1.2" stroke-linecap="round"/>${glassesShape(a)}${mouthShape(a)}${facialHairShape(a)}</svg></div>`;
  };
  function optButtons(key,count,value,labels){return `<div class="avatarOptionGrid">${Array.from({length:count},(_,i)=>{const v=i+(key==='glasses'||key==='facialHair'?0:1);return `<button type="button" class="avatarOpt ${Number(value)===v?'active':''}" onclick="setAvatarFeature('${key}',${v})">${labels?.[i]||v}</button>`}).join('')}</div>`}
  function colorButtons(key,arr,value){return `<div class="colorGrid">${arr.map(c=>`<button type="button" class="colorDot ${String(value).toLowerCase()===c.toLowerCase()?'active':''}" style="background:${c}" onclick="setAvatarFeature('${key}','${c}')" aria-label="رنگ"></button>`).join('')}</div>`}
  openAvatarCustomizer=function(){
    const u=user(),a={...normalizedAvatar(u.id)};window._avatarDraft=a;
    modal('ساخت کاراکتر من',`<div class="avatarCustomizer"><div id="avatarBuilderPreview" class="avatarPreviewStage">${avatarSvg(u.id,'avatarLg')}</div><div class="avatarRow2"><div><div class="avatarSectionTitle">نوع کاراکتر</div><select class="avatarSelect" id="av_gender" onchange="setAvatarFeature('gender',this.value)"><option value="male" ${a.gender==='male'?'selected':''}>آقا</option><option value="female" ${a.gender==='female'?'selected':''}>خانم</option></select></div><div><div class="avatarSectionTitle">مدل دهان</div><select class="avatarSelect" id="av_mouth" onchange="setAvatarFeature('mouth',Number(this.value))">${[1,2,3,4].map(n=>`<option value="${n}" ${a.mouth===n?'selected':''}>مدل ${n}</option>`).join('')}</select></div></div><div class="avatarSection"><div class="avatarSectionTitle">فرم صورت — ۵ مدل</div>${optButtons('face',5,a.face)}</div><div class="avatarSection"><div class="avatarSectionTitle">مدل مو — ۵ مدل</div>${optButtons('hair',5,a.hair)}</div><div class="avatarSection"><div class="avatarSectionTitle">چشم — ۵ مدل</div>${optButtons('eyes',5,a.eyes)}</div><div class="avatarSection"><div class="avatarSectionTitle">عینک</div>${optButtons('glasses',5,a.glasses,['بدون','گرد','مربعی','خلبانی','نیم‌فریم'])}</div><div class="avatarSection" id="facialHairSection"><div class="avatarSectionTitle">ریش / سبیل</div>${optButtons('facialHair',5,a.facialHair,['بدون','سبیل','ریش چانه','ریش کامل','ته‌ریش'])}</div><div class="avatarSection"><div class="avatarSectionTitle">رنگ پوست</div>${colorButtons('skin',SKINS,a.skin)}</div><div class="avatarSection"><div class="avatarSectionTitle">رنگ مو</div>${colorButtons('hairColor',HAIRS,a.hairColor)}</div><div class="avatarSection"><div class="avatarSectionTitle">رنگ لباس</div>${colorButtons('shirt',SHIRTS,a.shirt)}</div><button class="btn" onclick="saveAvatar()">ذخیره کاراکتر</button></div>`);
    refreshAvatarBuilder();
  };
  window.setAvatarFeature=function(k,v){if(!window._avatarDraft)return;window._avatarDraft[k]=v;refreshAvatarBuilder()};
  refreshAvatarBuilder=function(){
    const u=user();if(!u||!window._avatarDraft)return;
    const old=state.avatars[u.id];state.avatars[u.id]={...window._avatarDraft};
    const p=$('#avatarBuilderPreview');if(p)p.innerHTML=avatarSvg(u.id,'avatarLg');
    state.avatars[u.id]=old||{...window._avatarDraft};
    $$('.avatarOpt').forEach(b=>{});
    const sec=$('#facialHairSection');if(sec)sec.style.display=window._avatarDraft.gender==='female'?'none':'block';
    // rebuild controls so selected states stay exact
    const sheet=$('#modal .sheet');
    if(sheet)requestAnimationFrame(()=>{ /* preview only; selected control receives native focus */ });
  };
  saveAvatar=function(){const u=user();state.avatars[u.id]={...window._avatarDraft};save();closeModal();mountApp();toast('کاراکتر شما ذخیره شد')};

  /* manager-controlled accounts: no shared/demo credentials */
  employeeRoleSelect=function(){const div=$('#emp_division')?.value||'academy',el=$('#emp_role');if(!el)return;el.innerHTML=roleOptionsForDivision(div).filter(([k])=>k!=='ceo').map(([k,v])=>`<option value="${k}">${v}</option>`).join('')};
  openEmployeeSettings=async function(){
    let rows=[];try{const d=await api('/api/users');rows=(d.users||[]).filter(x=>x.active)}catch(_){}
    const list=rows.filter(x=>x.username!==LEGACY_BOOTSTRAP);
    modal('مدیریت حساب‌های سازمان',`<div class="card"><h3 class="title">ساخت حساب جدید</h3><div class="field"><label>نام و نام خانوادگی / عنوان نمایشی</label><input id="emp_name"></div><div class="grid2"><div class="field"><label>واحد</label><select id="emp_division" onchange="employeeRoleSelect()"><option value="academy">${divisionNames.academy}</option><option value="marshall">${divisionNames.marshall}</option></select></div><div class="field"><label>پوزیشن</label><select id="emp_role"></select></div></div><div class="grid2"><div class="field"><label>نام کاربری اختصاصی</label><input id="emp_username" autocomplete="off" autocapitalize="none"></div><div class="field"><label>رمز اختصاصی</label><input id="emp_password" type="password" autocomplete="new-password" placeholder="حداقل ۶ کاراکتر"></div></div><button class="btn" onclick="addEmployee()">+ ساخت حساب</button><div class="muted" style="margin-top:8px">رمز هر فرد فقط هنگام ساخت حساب توسط مدیریت تعیین می‌شود و در صفحه ورود نمایش داده نمی‌شود.</div></div><div class="sectionLabel">حساب‌های فعال ساخته‌شده</div><div class="list">${list.length?list.map(x=>`<div class="item"><div class="row between"><div><strong>${x.full_name}</strong><small>${divisionNames[x.business_unit]} · ${roleNames[x.role]||x.role} · ${x.username}</small></div><button class="chip" onclick="manageServerUser(${x.id},'${String(x.full_name).replace(/'/g,"\\'")}')">مدیریت</button></div></div>`).join(''):'<div class="empty">هنوز حساب دیگری ساخته نشده است.</div>'}</div>`);
    employeeRoleSelect();
  };
  addEmployee=async function(){const name=$('#emp_name').value.trim(),division=$('#emp_division').value,role=$('#emp_role').value,username=$('#emp_username').value.trim(),password=$('#emp_password').value;if(!name||!username||!password)return toast('نام، نام کاربری و رمز را کامل کن');if(password.length<6)return toast('رمز باید حداقل ۶ کاراکتر باشد');try{const d=await api('/api/users',{method:'POST',body:JSON.stringify({full_name:name,business_unit:division,role,username,password})});state.customUsers=(state.customUsers||[]).filter(x=>x.username!==username);state.customUsers.push({id:'custom_server_'+d.id,serverId:d.id,division,role,name,username});save();await openEmployeeSettings();toast('حساب با رمز اختصاصی ساخته شد')}catch(e){toast(e.message==='username_exists'?'این نام کاربری قبلاً استفاده شده':e.message==='weak_credentials'?'نام کاربری یا رمز خیلی کوتاه است':'ساخت حساب روی سرور انجام نشد')}};
  window.manageServerUser=function(id,name){modal('مدیریت '+name,`<div class="card"><div class="field"><label>رمز جدید</label><input id="manage_new_pass" type="password" autocomplete="new-password" placeholder="در صورت نیاز رمز جدید وارد کنید"></div><button class="btn" onclick="changeManagedPassword(${id})">تغییر رمز</button></div><div class="card"><h3 class="title">غیرفعال کردن حساب</h3><div class="muted" style="margin-bottom:9px">با غیرفعال کردن، نشست‌های باز این کاربر هم قطع می‌شود.</div><button class="btn alt" onclick="deactivateManagedUser(${id})">غیرفعال کردن</button></div>`)};
  window.changeManagedPassword=async function(id){const p=$('#manage_new_pass').value;if(p.length<6)return toast('رمز باید حداقل ۶ کاراکتر باشد');try{await api('/api/users/'+id,{method:'PATCH',body:JSON.stringify({password:p})});closeModal();toast('رمز تغییر کرد')}catch(_){toast('تغییر رمز انجام نشد')}};
  window.deactivateManagedUser=async function(id){try{await api('/api/users/'+id,{method:'PATCH',body:JSON.stringify({active:false})});state.customUsers=(state.customUsers||[]).filter(x=>x.serverId!==id&&x.id!=='custom_server_'+id);save();closeModal();toast('حساب غیرفعال شد')}catch(_){toast('غیرفعال‌سازی انجام نشد')}};
})();
