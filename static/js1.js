const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>Number(n||0).toLocaleString('fa-IR');
const money=n=>`${fmt(n)} تومان`;
const nowKey=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const nowKeyFromDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const faDate=(iso=nowKey())=>new Intl.DateTimeFormat('fa-IR',{year:'numeric',month:'long',day:'numeric'}).format(new Date(iso+'T12:00:00'));
const initialCourses=['دوره خزانه','دوره سلاطین کانال','دوره‌ی جنرال فروش','دوره ایزی‌مانی','دوره هوش مصنوعی پرو','دوره هوش مصنوعی پلاس','دوره PV مارکتینگ','دوره سفیر فروش','دوره مذاکره‌گر برنده','دوره فروش در بحران','دوره کمپین فروش','دوره آرتیلر','دوره استراتژی فروش','وبینار تبلیغات','وبینار تولید محتوا','وبینار مزیت رقابتی','وبینار کمال‌گرایی','وبینار خلاقیت'];
const courses=[...initialCourses];
const products=[...courses,'ماشین پولساز'];
const adChannels=['دینج','ایتا','پیامک','سایت','بله','اینستاگرام','تلگرام'];
const divisionNames={academy:'آکادمی کاشانی',marshall:'تیم مارشال'};
const roleNames={
accountant:'حسابدار',registration_admin:'ادمین ثبت‌نام',admin_pv_main:'ادمین PV کانال اصلی',admin_installment:'ادمین پیگیری اقساط',admin_consult:'ادمین مشاوره',admin_page:'ادمین پیج افراد',support_core:'پشتیبان سلاطین / دوره‌ی جنرال فروش / PV مارکتینگ',support_campaign:'پشتیبان کمپین',support_artiler:'پشتیبان آرتیلر',support_strategy:'پشتیبان دوره استراتژی فروش',support_ai:'پشتیبان دوره هوش مصنوعی',support_money:'پشتیبان دوره ماشین پولساز',sales_manager:'مدیر فروش',marketing_manager:'مدیر مارکتینگ',product_manager:'مدیر محصول',callcenter:'فروشنده تلفنی / کال‌سنتر',content_graphics:'تیم تولید محتوا و گرافیک',site_team:'تیم سایت',hr_manager:'مدیر منابع انسانی (HR)',rnd:'تیم تحقیقات و توسعه',crm:'مسئول CRM',internal_manager:'مدیر داخلی',ceo:'مدیرعامل',marshall_ads:'ادمین تبلیغات مارشال',marshall_strategy:'استراتژی‌نویس مارشال',marshall_coach:'کوچ منیجر',marshall_manager:'مدیر مارشال'};
const schemas={
accountant:[['sales_checked','تعداد فروش‌های بررسی/ثبت‌شده','number'],['incoming_amount','مبلغ ورودی ثبت‌شده','money'],['outgoing_amount','مبلغ خروجی ثبت‌شده','money'],['receipts_checked','فیش/تراکنش بررسی‌شده','number'],['settlements','تسویه‌های انجام‌شده','number'],['open_finance','موارد مالی باز','number']],
registration_admin:[['pv_received','تعداد PV روزانه','number']],
admin_pv_main:[['pv_received','پیام/PV دریافتی','number'],['messages_sent','پیام ارسال‌شده','number'],['followups','پیگیری روزانه','number'],['first_contacts','پیام‌دهنده‌های بار اول','number'],['personal_sales_count','فروش شخصی اعلامی - تعداد','number'],['personal_sales_amount','فروش شخصی اعلامی - مبلغ','money']],
admin_page:[['pv_received','پیام/PV دریافتی','number'],['messages_sent','پیام ارسال‌شده','number'],['followups','پیگیری روزانه','number'],['first_contacts','پیام‌دهنده‌های بار اول','number'],['personal_sales_count','فروش شخصی اعلامی - تعداد','number'],['personal_sales_amount','فروش شخصی اعلامی - مبلغ','money']],
admin_installment:[['receipts','تعداد فیش‌های دریافتی','number'],['installment_followups','تعداد پیگیری اقساط','number'],['resolved_installments','پرونده‌های تعیین‌تکلیف‌شده','number'],['overdue_cases','پرونده‌های معوق باز','number']],
admin_consult:[['pv_received','تعداد PV مشاوره','number'],['messages_sent','پیام ارسال‌شده','number'],['consult_reg','ثبت‌نام مشاوره','number'],['consult_amount','مبلغ مشاوره','money'],['first_clients','مراجع جدید','number']],
support_core:[['pv_received','تعداد PV روزانه','number'],['banners','بنرهای آنالیزشده','number'],['channels','کانال‌های آنالیزشده','number'],['first_contacts','پیام‌دهنده‌های بار اول','number']],
support_campaign:[['pv_received','تعداد پیام / PV روزانه','number'],['campaigns_analyzed','کمپین‌های آنالیزشده','number'],['campaigns_queue','کمپین‌های در صف آنالیز','number']],
support_artiler:[['pv_received','تعداد پیام / PV روزانه','number'],['interactions','تعداد تعامل با مخاطب در روز','number'],['calls_total','تعداد تماس با مخاطب','number']],
support_strategy:[['pv_received','تعداد PV روزانه','number'],['exercises_received','تعداد تمرین‌های دریافت‌شده','number'],['people_reviewed','تعداد افراد بررسی‌شده','number'],['advanced_next_stage','تعداد افراد رفته به مرحله بعد','number'],['final_stage','تعداد افراد رسیده به مرحله نهایی','number']],
support_ai:[['messages_received','تعداد پیام‌های ورودی کل روز','number'],['messages_answered','تعداد پیام‌های پاسخ‌داده‌شده','number']],
support_money:[['messages_received','تعداد پیام‌های ورودی','number'],['exercises_solved','تعداد افرادی که تمرین را حل کردند','number']],
callcenter:[['followups','پیگیری‌ها','number'],['calls_total','کل تماس‌ها','number'],['calls_success','تماس موفق','number'],['calls_failed','تماس ناموفق','number'],['personal_sales_count','فروش شخصی اعلامی - تعداد','number'],['personal_sales_amount','فروش شخصی اعلامی - مبلغ','money']],
sales_manager:[['daily_reports_done','بررسی گزارش‌های روزانه انجام شد؟','select',['بله','خیر']],['daily_reports_reviewed','تعداد نفرات بررسی‌شده','number'],['followup_actions_done','اقدام روی برنامه‌های پیگیری انجام شد؟','select',['بله','خیر']],['followup_people','تعداد نفرات پیگیری‌شده','number'],['tomorrow_priorities_announced','اولویت‌های تیم برای فردا اعلام شد؟','select',['بله','خیر']],['tomorrow_priorities_people','اولویت فردا برای چند نفر اعلام شد؟','number'],['improvement_plan_done','موضوع یا برنامه جدید برای بهبود فروش تعریف شد؟','select',['بله','خیر']],['improvement_people','برنامه بهبود برای چند نفر تعریف شد؟','number'],['improvement_method','شرح برنامه / نحوه اجرای بهبود فروش','text'],['team_meetings','تعداد جلسات برگزارشده','number'],['new_actions_count','تعداد اقدامات جدید تعریف‌شده','number'],['new_actions_people','اقدامات جدید برای چند نفر تعریف شد؟','number']],
marketing_manager:[['ad_spend','هزینه تبلیغات','money'],['ad_channel','کانال اصلی تبلیغات','select',adChannels],['leads','تعداد لید','number'],['campaign_actions','اقدامات کمپینی','number'],['marketing_tasks','کارهای مارکتینگ انجام‌شده','number']],
product_manager:[['product_name','محصول مورد تغییر','select',products],['product_tasks','کارهای محصول انجام‌شده','number'],['product_changes','تغییرات اعمال‌شده','number'],['issues_resolved','مشکلات حل‌شده','number'],['feedback_reviewed','بازخوردهای بررسی‌شده','number']],
content_graphics:[['new_orders','سفارش جدید ثبت‌شده','number'],['content_items','محتواهای تولیدشده','number'],['designs','طرح/گرافیک تحویل‌شده','number'],['videos','ویدئوهای آماده‌شده','number'],['published','محتوای منتشرشده','number'],['revisions','اصلاحات انجام‌شده','number']],
site_team:[['site_updates','به‌روزرسانی سایت','number'],['pages_created','صفحه/لندینگ ساخته‌شده','number'],['bugs_fixed','باگ‌های رفع‌شده','number'],['tickets_done','تیکت‌های انجام‌شده','number'],['uploads','محتوای بارگذاری‌شده','number']],
hr_manager:[['hires','استخدام نهایی','number'],['terminations','قطع همکاری','number'],['interviews','مصاحبه انجام‌شده','number'],['hiring_forms','فرم استخدام بررسی‌شده','number'],['hr_cases','پرونده/درخواست منابع انسانی','number']],
rnd:[['researches','تحقیقات انجام‌شده','number'],['analyses','تحلیل‌ها','number'],['tests','تست/آزمایش انجام‌شده','number'],['ideas','ایده/پیشنهاد تحقیقاتی','number']],
crm:[['old_data','دیتای قبلی واردشده','number'],['deals_reviewed','معامله بررسی‌شده','number'],['deals_approved','معامله تأییدشده','number'],['campaign_deals','معامله کمپینی تأییدشده','number']],
internal_manager:[['requests_reviewed','درخواست‌های بررسی‌شده','number'],['issues_resolved','مسائل سازمانی حل‌شده','number'],['team_reviews','بررسی تیم‌ها','number'],['decisions','تصمیم/پیگیری مدیریتی','number']],
ceo:[],
marshall_ads:[['ads_count','تبلیغات اجراشده','number'],['ad_spend','هزینه تبلیغات','money'],['leads','ورودی/لید','number'],['channels','کانال‌های استفاده‌شده','number'],['clients','مشتری‌های فعال امروز','number']],
marshall_strategy:[['strategies','استراتژی‌های کارشده','number'],['delivered','استراتژی تحویل‌شده','number'],['revisions','اصلاحات','number'],['clients','مشتری‌های کارشده','number']],
marshall_coach:[['sessions','جلسات برگزارشده','number'],['client_tasks','کارهای مشتری انجام‌شده','number'],['campaigns','کمپین‌های مدیریت‌شده','number'],['clients','مشتری‌های فعال امروز','number']],
marshall_manager:[['team_reviews','بررسی عملکرد تیم','number'],['client_reviews','بررسی مشتریان','number'],['approvals','تأییدها','number'],['issues_resolved','مسائل حل‌شده','number']]
};
const baseUsers=[
{id:'u_acc',division:'academy',role:'accountant',name:'مریم حسابدار',username:'hesabdar',password:'1234'},
{id:'u_reg',division:'academy',role:'registration_admin',name:'سارا ثبت‌نام',username:'sabtenam',password:'1234'},
{id:'u_pv',division:'academy',role:'admin_pv_main',name:'نگار ادمین PV',username:'adminpv',password:'1234'},
{id:'u_page',division:'academy',role:'admin_page',name:'هانیه ادمین پیج',username:'adminpage',password:'1234'},
{id:'u_inst',division:'academy',role:'admin_installment',name:'رها پیگیری اقساط',username:'aghsat',password:'1234'},
{id:'u_cons',division:'academy',role:'admin_consult',name:'نازنین مشاوره',username:'moshavere',password:'1234'},
{id:'u_sup1',division:'academy',role:'support_core',name:'آرزو پشتیبان سلاطین',username:'supportcore',password:'1234'},
{id:'u_sup2',division:'academy',role:'support_campaign',name:'پشتیبان کمپین',username:'supportcampaign',password:'1234'},
{id:'u_sup_art',division:'academy',role:'support_artiler',name:'پشتیبان آرتیلر',username:'supportartiler',password:'1234'},
{id:'u_sup3',division:'academy',role:'support_strategy',name:'پشتیبان استراتژی فروش',username:'supportstrategy',password:'1234'},
{id:'u_sup4',division:'academy',role:'support_ai',name:'پشتیبان هوش مصنوعی',username:'supportai',password:'1234'},
{id:'u_sup5',division:'academy',role:'support_money',name:'پشتیبان ماشین پولساز',username:'supportmoney',password:'1234'},
{id:'u_call',division:'academy',role:'callcenter',name:'علی کال‌سنتر',username:'callcenter',password:'1234'},
{id:'u_salesm',division:'academy',role:'sales_manager',name:'رضا مدیر فروش',username:'salesmanager',password:'1234'},
{id:'u_mark',division:'academy',role:'marketing_manager',name:'نیلوفر مارکتینگ',username:'marketing',password:'1234'},
{id:'u_prod',division:'academy',role:'product_manager',name:'سام مدیر محصول',username:'product',password:'1234'},
{id:'u_cont',division:'academy',role:'content_graphics',name:'تیم محتوا و گرافیک',username:'content',password:'1234'},
{id:'u_site',division:'academy',role:'site_team',name:'تیم سایت',username:'site',password:'1234'},
{id:'u_hr',division:'academy',role:'hr_manager',name:'مدیر منابع انسانی',username:'hr',password:'1234'},
{id:'u_rnd',division:'academy',role:'rnd',name:'تیم R&D',username:'rnd',password:'1234'},
{id:'u_crm',division:'academy',role:'crm',name:'مسئول CRM',username:'crm',password:'1234'},
{id:'u_internal',division:'academy',role:'internal_manager',name:'مدیر داخلی',username:'internal',password:'1234'},
{id:'u_ceo',division:'academy',role:'ceo',name:'مدیرعامل',username:'ceo',password:'1234'},
{id:'m_ads',division:'marshall',role:'marshall_ads',name:'ادمین تبلیغات مارشال',username:'marshallads',password:'1234'},
{id:'m_str',division:'marshall',role:'marshall_strategy',name:'استراتژی‌نویس مارشال',username:'strategy',password:'1234'},
{id:'m_coach',division:'marshall',role:'marshall_coach',name:'کوچ منیجر',username:'coach',password:'1234'},
{id:'m_mgr',division:'marshall',role:'marshall_manager',name:'مدیر مارشال',username:'marshallmanager',password:'1234'}
];
const adminRoles=['admin_pv_main','admin_page','admin_consult','admin_installment','registration_admin'];
const salesTeamRoles=[...adminRoles,'callcenter'];
const financialRoles=['ceo','sales_manager','accountant','internal_manager'];
const settingsRoles=['ceo','internal_manager'];
const adminSalesRoles=['admin_pv_main','admin_page'];
const phoneSalesRoles=['callcenter'];
const consultationRoles=['admin_consult'];
const defaultState={session:null,attendance:{},reports:{},registrations:[],campaigns:[],tasks:[],ideas:[],suggestions:[],requests:[],rewards:[['هدیه کوچک',50],['اعتبار خرید',100],['کتاب',120],['دوره آموزشی',180],['نیم‌روز مرخصی تشویقی',200],['جایزه ویژه',300]],wallets:{},bonus:{},courseCatalog:initialCourses.map((name,i)=>({id:'course_'+(i+1),name,price:0,active:true})),customUsers:[],monthlyFinance:{},userThemes:{},coinUsage:{},avatars:{}};
const STORAGE_KEY='holding_mobile_server_cache_v1';
const TOKEN_KEY='holding_kashani_api_token';
const SESSION_KEY='holding_kashani_session';
let apiToken=localStorage.getItem(TOKEN_KEY)||'';
let state=JSON.parse(JSON.stringify(defaultState));
let remoteSaveTimer=null;
let remoteLoaded=false;
function api(path,opts={}){
  opts={...opts};
  opts.headers={...(opts.headers||{}),'Content-Type':'application/json',...(apiToken?{Authorization:'Bearer '+apiToken}:{})};
  return fetch(path,opts).then(async r=>{let d={};try{d=await r.json()}catch(_){d={}};if(!r.ok){const e=new Error(d.error||('HTTP '+r.status));e.status=r.status;throw e}return d})
}
function mergeState(base,remote){
  const out=JSON.parse(JSON.stringify(base));
  if(!remote||typeof remote!=='object')return out;
  for(const [k,v] of Object.entries(remote)){
    if(k==='session')continue;
    if(v&&typeof v==='object'&&!Array.isArray(v)&&out[k]&&typeof out[k]==='object'&&!Array.isArray(out[k]))out[k]={...out[k],...v};
    else out[k]=v;
  }
  return out
}
async function loadRemoteState(){
  if(!apiToken)return false;
  const d=await api('/api/app-state');
  const session=state.session;
  state=mergeState(defaultState,d.state||{});
  state.session=session;
  remoteLoaded=true;
  syncCatalogArrays();
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  return true
}
function queueRemoteSave(){
  if(!apiToken||!remoteLoaded)return;
  clearTimeout(remoteSaveTimer);
  remoteSaveTimer=setTimeout(()=>{
    const payload=JSON.parse(JSON.stringify(state));delete payload.session;
    api('/api/app-state',{method:'PUT',body:JSON.stringify({state:payload})}).catch(()=>toast('ذخیره روی سرور انجام نشد؛ دوباره تلاش کنید'))
  },260)
}
if(!Array.isArray(state.courseCatalog))state.courseCatalog=initialCourses.map((name,i)=>({id:'course_'+(i+1),name,price:0,active:true}));
if(!Array.isArray(state.customUsers))state.customUsers=[];
if(!state.monthlyFinance||typeof state.monthlyFinance!=='object')state.monthlyFinance={};
if(!state.userThemes||typeof state.userThemes!=='object')state.userThemes={};
if(!state.coinUsage||typeof state.coinUsage!=='object')state.coinUsage={};

for(const k of ['registrations','campaigns','tasks','ideas','suggestions','requests','rewards','courseCatalog','customUsers']){
  if(!Array.isArray(state[k])) state[k]=JSON.parse(JSON.stringify(defaultState[k]||[]));
}
for(const k of ['attendance','reports','wallets','bonus','monthlyFinance','userThemes','coinUsage','avatars']){
  if(!state[k]||typeof state[k]!=='object'||Array.isArray(state[k])) state[k]=JSON.parse(JSON.stringify(defaultState[k]||{}));
}
if(!state.rewards.length) state.rewards=JSON.parse(JSON.stringify(defaultState.rewards));

function syncCatalogArrays(){
  const names=state.courseCatalog.filter(c=>c.active!==false).map(c=>c.name);
  courses.splice(0,courses.length,...names);
  products.splice(0,products.length,...names,'ماشین پولساز');
}
syncCatalogArrays();
for(const c of state.campaigns||[]){
  if(c.salesCount==null||c.salesAmount==null){
    const rr=(state.registrations||[]).filter(r=>r.campaignId===c.id);
    c.salesCount=c.salesCount==null?rr.length:Number(c.salesCount||0);
    c.salesAmount=c.salesAmount==null?rr.reduce((n,r)=>n+Number(r.amount||0),0):Number(c.salesAmount||0);
  }
}
