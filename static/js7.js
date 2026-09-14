function seed(){if(state._seeded)return;const today=new Date();for(const u of baseUsers){for(let i=0;i<14;i++){const d=new Date(today);d.setDate(d.getDate()-i);if(d.getDay()===5)continue;const date=nowKeyFromDate(d),vals={desc:'گزارش نمونه تست'};for(const [k,,type,opts] of roleFields(u.role)){if(type==='select'){vals[k]=(opts||[])[i%(opts||[]).length]||'';continue}let base=(type==='money')?((i%4)+1)*2500000:((i*3+k.length)%13)+3;if(k==='old_data')base=180+(i*17)%120;if(k==='pv_received')base=35+(i*7)%45;if(k==='messages_sent')base=48+(i*6)%55;if(k==='calls_total')base=45+(i*5)%30;if(k==='calls_success')base=22+(i*3)%20;if(k==='calls_failed')base=14+(i*2)%15;if(k==='consult_reg')base=2+(i%5);if(k==='consult_amount')base=(2+(i%5))*1200000;vals[k]=base}state.reports[reportKey(u.id,date)]=vals;state.attendance[reportKey(u.id,date)]={in:'09:0'+(i%7),out:'17:1'+(i%8)}}}
state.campaigns=[{id:'c1',name:'کمپین شهریور ۱',start:nowKeyFromDate(new Date(today.getFullYear(),today.getMonth(),2)),end:nowKeyFromDate(new Date(today.getFullYear(),today.getMonth(),6)),salesCount:50,salesAmount:500000000,desc:'کمپین تست'},{id:'c2',name:'کمپین شهریور ۲',start:nowKeyFromDate(new Date(today.getFullYear(),today.getMonth(),10)),end:nowKeyFromDate(new Date(today.getFullYear(),today.getMonth(),14)),salesCount:34,salesAmount:310000000,desc:'کمپین تست دوم'}];
const sellers=['u_pv','u_page','u_call',''];for(let i=0;i<24;i++){const d=new Date(today);d.setDate(d.getDate()-(i%13));state.registrations.push({id:'r'+i,date:nowKeyFromDate(d),createdBy:'u_reg',course:courses[i%courses.length],amount:5000000+(i%5)*2500000,buyerType:i%3?'اول':'مجدد',sellerId:sellers[i%4],campaignId:'',desc:'ثبت‌نام نهایی تست'})}
state.tasks=[{id:'t1',creatorId:'u_salesm',assigneeId:'u_call',title:'پیگیری ۲۰ لید گرم',desc:'تا پایان امروز وضعیت لیدها مشخص شود.',due:nowKey(),coin:3,done:false,createdAt:new Date().toISOString()},{id:'t2',creatorId:'u_salesm',assigneeId:'u_pv',title:'پیگیری پیام‌های بدون پاسخ',desc:'تمام PVهای باز امروز تعیین تکلیف شوند.',due:nowKey(),coin:2,done:false,createdAt:new Date().toISOString()}];state.wallets={u_pv:168,u_call:142,u_reg:205};state.monthlyFinance[pMonthKey()]={profit:185000000,notes:'عدد نمونه نسخه تست؛ در نسخه واقعی حسابدار بعد از بستن ماه ثبت می‌کند.'};state._seeded=true;save()}
async function boot(){
  const saved=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
  if(apiToken&&saved){
    try{
      const me=await api('/api/me');
      let a=allUsers().find(x=>x.username===me.username&&x.division===me.business_unit);
      if(!a){a={id:'custom_server_'+me.id,division:me.business_unit,role:me.role,name:me.full_name,username:me.username};state.customUsers.push(a)}
      state.session={userId:a.id,division:a.division,username:a.username};
      await loadRemoteState();
      a=allUsers().find(x=>x.username===me.username&&x.division===me.business_unit)||a;
      state.session={userId:a.id,division:a.division,username:a.username};
      mountApp();return
    }catch(_){apiToken='';localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(SESSION_KEY)}
  }
  showDivisionChoice()
}
boot();
