const academyTeamDefs=[
{id:'admins',name:'تیم ادمینی',division:'academy',roles:['admin_pv_main','admin_page'],sales:'seller'},
{id:'consult',name:'تیم ادمین مشاوره',division:'academy',roles:['admin_consult'],consult:true},
{id:'registration',name:'گزارش ادمین ثبت‌نام',division:'academy',roles:['registration_admin'],registration:true,kind:'role'},
{id:'installment',name:'تیم پیگیری اقساط',division:'academy',roles:['admin_installment']},
{id:'callcenter',name:'تیم فروش تلفنی / کال‌سنتر',division:'academy',roles:['callcenter'],sales:'seller'},
{id:'support',name:'گزارش کل پشتیبانی',division:'academy',roles:['support_core','support_campaign','support_artiler','support_strategy','support_ai','support_money']},
{id:'accounting',name:'حسابداری',division:'academy',roles:['accountant']},
{id:'sales_management',name:'مدیریت فروش',division:'academy',roles:['sales_manager']},
{id:'marketing',name:'تیم مارکتینگ',division:'academy',roles:['marketing_manager']},
{id:'product',name:'تیم محصول',division:'academy',roles:['product_manager']},
{id:'content',name:'تیم تولید محتوا و گرافیک',division:'academy',roles:['content_graphics']},
{id:'site',name:'تیم سایت',division:'academy',roles:['site_team']},
{id:'hr',name:'منابع انسانی',division:'academy',roles:['hr_manager']},
{id:'rnd',name:'تحقیقات و توسعه',division:'academy',roles:['rnd']},
{id:'crm',name:'تیم CRM',division:'academy',roles:['crm']},
{id:'internal',name:'مدیریت داخلی',division:'academy',roles:['internal_manager']}
];
const marshallTeamDefs=[
{id:'marshall_ads',name:'تیم تبلیغات مارشال',division:'marshall',roles:['marshall_ads']},
{id:'marshall_strategy',name:'تیم استراتژی مارشال',division:'marshall',roles:['marshall_strategy']},
{id:'marshall_coach',name:'تیم کوچ منیجرها',division:'marshall',roles:['marshall_coach']},
{id:'marshall_management',name:'مدیریت مارشال',division:'marshall',roles:['marshall_manager']}
];
function toLatinDigits(v){return String(v).replace(/[۰-۹]/g,ch=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(ch))}
function persianParts(dateStr=nowKey()){const d=new Date(dateStr+'T12:00:00'),parts=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d),o={};for(const p of parts)if(p.type!=='literal')o[p.type]=toLatinDigits(p.value);return o}
function pMonthKey(dateStr=nowKey()){const p=persianParts(dateStr);return `${p.year}-${String(p.month).padStart(2,'0')}`}
function pMonthLabel(key){const [y,m]=key.split('-').map(Number),names=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];return `${names[m-1]||m} ${new Intl.NumberFormat('fa-IR',{useGrouping:false}).format(y)}`}
function monthOptions(n=14){const out=[],seen=new Set(),d=new Date();for(let i=0;i<470&&out.length<n;i++){const x=new Date(d);x.setDate(d.getDate()-i);const k=pMonthKey(nowKeyFromDate(x));if(!seen.has(k)){seen.add(k);out.push(k)}}return out}
function matchPMonth(date,key){return pMonthKey(date)===key}
function monthlyRows(uid,key){return Object.entries(state.reports).filter(([k])=>k.startsWith(uid+'|')).map(([k,v])=>({date:k.split('|')[1],...v})).filter(r=>matchPMonth(r.date,key)).sort((a,b)=>a.date.localeCompare(b.date))}
