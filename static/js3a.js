function showDivisionChoice(){state.session=null;save();applyTheme('dark');$('#mainApp').classList.add('hidden');$('#loginRoot').classList.remove('hidden');$('#loginRoot').innerHTML=`<div class="loginwrap"><div class="loginbox"><div style="display:grid;place-items:center;margin-bottom:15px"><div class="logoMark"><span>K</span></div></div><div style="text-align:center;margin-bottom:20px"><h2 style="margin:0 0 6px;font-size:22px">هلدینگ کاشانی</h2><div class="muted">مجموعه خود را برای ورود انتخاب کنید.</div></div><div class="choice"><button onclick="showLogin('academy')"><strong>🎓 آکادمی کاشانی</strong><span>پنل کارکنان و مدیران آکادمی</span></button><button onclick="showLogin('marshall')"><strong>🧭 تیم مارشال</strong><span>پنل کوچینگ، استراتژی و تبلیغات مارشال</span></button></div><div class="card" style="margin-top:14px"><div class="muted">نسخه متصل به سرور مرکزی — اطلاعات بین کاربران به‌صورت مشترک ذخیره می‌شود.</div></div></div></div>`}
function showLogin(div){const demos=div==='academy'?[['ceo','مدیرعامل'],['internal','مدیر داخلی'],['salesmanager','مدیر فروش'],['sabtenam','ادمین ثبت‌نام'],['adminpv','ادمین PV'],['callcenter','فروشنده تلفنی'],['supportcampaign','پشتیبان کمپین'],['supportartiler','پشتیبان آرتیلر']]:[['marshallmanager','مدیر مارشال'],['coach','کوچ منیجر'],['strategy','استراتژی‌نویس'],['marshallads','ادمین تبلیغات']];const demoBtns=demos.map(([un,label])=>`<button type="button" class="demoLogin" onclick="quickLogin('${un}','${div}')"><strong>${label}</strong><small>${un} / Beta@1405</small></button>`).join('');$('#loginRoot').innerHTML=`<div class="loginwrap"><div class="loginbox"><button class="chip" onclick="showDivisionChoice()">← بازگشت</button><div style="text-align:center;margin:16px 0"><div style="display:grid;place-items:center;margin-bottom:10px"><div class="logoMark"><span>${div==='academy'?'A':'M'}</span></div></div><h2 style="margin:0">${divisionNames[div]}</h2><div class="muted">نام کاربری و رمز اختصاصی خود را وارد کنید.</div></div><div class="card"><div class="field"><label>نام کاربری</label><input id="loginUser" autocomplete="username" placeholder="مثلاً ${div==='academy'?'ceo':'marshallmanager'}"></div><div class="field"><label>رمز عبور</label><input id="loginPass" type="password" autocomplete="current-password" placeholder="رمز عبور"></div><button class="btn" id="loginBtn" onclick="doLogin('${div}')">ورود به پنل من</button></div><div class="card"><div class="title" style="margin-bottom:4px">حساب‌های آماده تست داخلی</div><div class="muted" style="margin-bottom:10px">برای تست اولیه می‌توانید از حساب‌های زیر استفاده کنید.</div><div class="demoGrid">${demoBtns}</div></div><div class="info"><b>تست داخلی:</b> رمز حساب‌های آماده <b>Beta@1405</b> است. مدیر می‌تواند نیروی جدید با نام کاربری و رمز اختصاصی بسازد.</div></div></div>`}function quickLogin(username,div){$('#loginUser').value=username;$('#loginPass').value='Beta@1405';doLogin(div)}
async function doLogin(div){
  const username=$('#loginUser').value.trim(),password=$('#loginPass').value;
  if(!username||!password)return toast('نام کاربری و رمز را کامل کنید');
  const btn=$('#loginBtn');if(btn){btn.disabled=true;btn.textContent='در حال ورود...'}
  try{
    const d=await api('/api/auth/login',{method:'POST',body:JSON.stringify({username,password,business_unit:div})});
    apiToken=d.token;localStorage.setItem(TOKEN_KEY,apiToken);
    let a=allUsers().find(x=>x.username===username&&x.division===div);
    if(!a&&d.user){a={id:'custom_server_'+d.user.id,division:d.user.business_unit,role:d.user.role,name:d.user.full_name,username:d.user.username};state.customUsers.push(a)}
    if(!a)throw new Error('profile_not_found');
    state.session={userId:a.id,division:div,username:a.username};
    localStorage.setItem(SESSION_KEY,JSON.stringify(state.session));
    await loadRemoteState();
    let mapped=allUsers().find(x=>x.username===username&&x.division===div)||a;
    state.session={userId:mapped.id,division:div,username};
    localStorage.setItem(SESSION_KEY,JSON.stringify(state.session));
    mountApp();
  }catch(e){
    if(e.status===401)toast('نام کاربری یا رمز عبور درست نیست');else toast('اتصال به سرور برقرار نشد');
  }finally{if(btn){btn.disabled=false;btn.textContent='ورود به پنل من'}}
}
function navFeedback(n){
  if(!n)return;
  n.classList.remove('nav-pulse');
  void n.offsetWidth;
  n.classList.add('nav-pulse');
  setTimeout(()=>n.classList.remove('nav-pulse'),460)
}
function renderPage(name){
  const valid=['home','daily','reports','rewards','more'];
  const target=valid.includes(name)?name:'home';
  $$('.nav').forEach(n=>{
    const active=n.dataset.page===target;
    n.classList.toggle('active',active);
    if(active)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');
  });
  try{
    if(target==='home')home();
    else if(target==='daily')daily();
    else if(target==='reports')reports();
    else if(target==='rewards')rewards();
    else more();
  }catch(err){
    console.error('Navigation render error:',target,err);
    if(target==='home') emergencyHome(err);
    else {
      try{
        $$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.page==='home'));
        home();
      }catch(homeErr){ emergencyHome(homeErr); }
    }
  }
  try{window.scrollTo({top:0,behavior:'auto'})}catch(_){try{window.scrollTo(0,0)}catch(__){}}
}
function page(name){renderPage(name)}
function bindBottomNavigation(){
  $$('.nav').forEach(n=>{
    n.type='button';
    n.onclick=(ev)=>{
      ev.preventDefault();
      const dest=n.dataset.page||'home';
      renderPage(dest);
      navFeedback(n);
    };
  });
}
function mountApp(){
  const u=user();
  if(!u)return showDivisionChoice();
  applyTheme();
  $('#loginRoot').classList.add('hidden');
  $('#mainApp').classList.remove('hidden');
  $('#appTitle').textContent='هلدینگ کاشانی';
  $('#appSub').textContent=`${divisionNames[u.division]} · ${roleNames[u.role]}`;
  $('#avatar').innerHTML=avatarSvg(u.id,'avatarSm');$('#avatar').style.background='transparent';$('#avatar').style.padding='0';$('#avatar').onclick=openAvatarCustomizer;$('#avatar').title='ویرایش کاراکتر';
  $$('.nav').forEach(n=>n.classList.remove('hidden'));
  bindBottomNavigation();
  const bn=document.querySelector('.bottom');if(bn)bn.style.gridTemplateColumns='repeat(5,1fr)';
  const dailyLabel=document.querySelector('.nav[data-page="daily"] .navLabel');
  if(dailyLabel)dailyLabel.textContent=u.role==='ceo'?'مدیریت':'ثبت روزانه';
  renderPage('home')
}
function clockIn(){const u=user(),a=att(u.id);if(a.in)return toast('ورود امروز قبلاً ثبت شده');const t=new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});state.attendance[reportKey(u.id)]={...a,in:t};save();home();toast('ورود ثبت شد')}
function clockOut(){const u=user(),a=att(u.id);if(!a.in)return toast('اول ورود را ثبت کن');if(a.out)return toast('خروج امروز قبلاً ثبت شده');const t=new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});state.attendance[reportKey(u.id)]={...a,out:t};save();home();toast('خروج ثبت شد')}
function attendanceCard(u){const a=att(u.id);return `<div class="card"><div class="row between"><h3 class="title" style="margin:0">ورود و خروج امروز</h3><span class="tag">${faDate()}</span></div><div class="grid2" style="margin-top:12px"><div class="metric"><span>ورود</span><b>${a.in||'—'}</b></div><div class="metric"><span>خروج</span><b>${a.out||'—'}</b></div></div><div class="grid2" style="margin-top:10px"><button class="btn ${a.in?'alt':''}" onclick="clockIn()">ثبت ورود</button><button class="btn ${!a.in||a.out?'alt':''}" onclick="clockOut()">ثبت خروج</button></div></div>`}
function accessibleUsers(u){if(u.role==='ceo'||u.role==='internal_manager')return allUsers().filter(x=>x.division===u.division&&x.role!=='ceo');if(u.role==='sales_manager')return allUsers().filter(x=>x.division==='academy'&&salesTeamRoles.includes(x.role));if(u.role==='marshall_manager')return allUsers().filter(x=>x.division==='marshall'&&x.id!==u.id);return []}
function taskCoins(uid){return taskCoinsAsOf(uid,nowKey())}
function taskCoinsAsOf(uid,date){const mk=pMonthKey(date);return state.tasks.filter(t=>t.assigneeId===uid&&t.done&&t.doneAt&&pMonthKey(t.doneAt.slice(0,10))===mk&&t.doneAt.slice(0,10)<=date).reduce((s,t)=>s+Number(t.awardedCoin!=null?t.awardedCoin:(t.onTime===false?0:t.coin||0)),0)}
