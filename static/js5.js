function trendMonthOptions(){return monthOptions(18).sort()}
function trendKeys(from,to){const keys=trendMonthOptions();return keys.filter(k=>(!from||k>=from)&&(!to||k<=to))}
function teamById(id){return [...academyTeamDefs,...marshallTeamDefs].find(x=>x.id===id)}
function trendMetricPriority(def){
  if(def.id==='admins'||def.id==='callcenter')return ['official_sales_count','official_sales_amount'];
  if(def.id==='consult')return ['consult_reg','consult_amount','pv_received'];
  if(def.id==='registration')return ['reg_count','reg_amount','first_buy','repeat_buy'];
  if(def.id==='accounting')return ['incoming_amount','outgoing_amount','receipts_checked','settlements'];
  if(def.id==='marketing')return ['ad_spend','leads'];
  if(def.id==='marshall_ads')return ['ad_spend','ads_count'];
  return [];
}
function trendMetrics(def,keys){
  const pool=new Map();
  for(const key of keys){for(const m of teamMetrics(def,key)){if(!pool.has(m.key))pool.set(m.key,{key:m.key,label:m.label,type:m.type})}}
  const priority=trendMetricPriority(def),out=[];
  for(const k of priority){if(pool.has(k)){out.push(pool.get(k));pool.delete(k)}}
  for(const m of pool.values()){if(out.length>=4)break;out.push(m)}
  return out.slice(0,4)
}
function trendRow(def,key,metrics){const m=new Map(teamMetrics(def,key).map(x=>[x.key,x]));return{key,values:metrics.map(x=>Number(m.get(x.key)?.value||0))}}
function trendMainMetric(metrics){return metrics.find(x=>x.key.includes('amount')||x.key==='incoming_amount'||x.key==='ad_spend')||metrics[0]}
function shortMonthLabel(key){const [,m]=key.split('-').map(Number),n=['فرو','ارد','خرد','تیر','مرد','شهر','مهر','آبا','آذر','دی','بهم','اسف'];return n[m-1]||m}
function multiMonthTeamReport(print=false){
  const u=user(),defs=teamDefsForUser(u);if(!defs.length)return'';
  const options=trendMonthOptions();if(!options.length)return'';
  const defaultTeam=defs.find(d=>d.id==='callcenter')||defs[0];
  const selectedDef=defs.find(d=>d.id===state.selectedTrendTeam)||defaultTeam;
  const to=(state.selectedTrendTo&&options.includes(state.selectedTrendTo))?state.selectedTrendTo:options[options.length-1];
  const toIdx=options.indexOf(to),defaultFrom=options[Math.max(0,toIdx-5)];
  const from=(state.selectedTrendFrom&&options.includes(state.selectedTrendFrom)&&state.selectedTrendFrom<=to)?state.selectedTrendFrom:defaultFrom;
  const keys=trendKeys(from,to),metrics=trendMetrics(selectedDef,keys),rows=keys.map(k=>trendRow(selectedDef,k,metrics));
  const main=trendMainMetric(metrics),mainIndex=Math.max(0,metrics.findIndex(x=>x.key===main?.key)),vals=rows.map(r=>r.values[mainIndex]||0),mx=Math.max(...vals,1);
  if(print){
    return `<div class="printSection printTrend"><h2>گزارش مقایسه چندماهه - ${selectedDef.name}</h2><div style="font-size:8px;color:#6b7280;margin-bottom:8px">از ${pMonthLabel(from)} تا ${pMonthLabel(to)}</div><table class="printTable"><thead><tr><th>ماه</th>${metrics.map(m=>`<th>${m.label}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr><td>${pMonthLabel(r.key)}</td>${r.values.map((v,i)=>`<td>${formatVal(metrics[i].type,v)}</td>`).join('')}</tr>`).join('')}</tbody></table>${main?`<h3 style="font-size:10px;color:#1052AB;margin:10px 0 2px">روند ${main.label}</h3><div class="printTrendChart">${rows.map((r,i)=>`<div class="printTrendCol"><b>${main.type==='money'?fmt(Math.round(vals[i]/1000000))+'M':fmt(vals[i])}</b><div class="printTrendBar" style="height:${Math.max(3,(vals[i]/mx)*100)}%"></div><span>${shortMonthLabel(r.key)}</span></div>`).join('')}</div>`:''}</div>`;
  }
  const optsDesc=[...options].reverse();
  return `<div class="trendPanel"><div class="row between"><div><h3 class="title" style="margin:0">گزارش مقایسه ماه‌ها</h3><div class="muted">هر تیم را ماه‌به‌ماه مقایسه کن؛ مثال: فروردین، اردیبهشت، خرداد و ...</div></div><span class="tag">چندماهه</span></div><div class="trendControls"><div><label>تیم</label><select onchange="setTrendTeam(this.value)">${defs.map(d=>`<option value="${d.id}" ${d.id===selectedDef.id?'selected':''}>${d.name}</option>`).join('')}</select></div><div><label>از ماه</label><select onchange="setTrendFrom(this.value)">${optsDesc.map(k=>`<option value="${k}" ${k===from?'selected':''}>${pMonthLabel(k)}</option>`).join('')}</select></div><div><label>تا ماه</label><select onchange="setTrendTo(this.value)">${optsDesc.map(k=>`<option value="${k}" ${k===to?'selected':''}>${pMonthLabel(k)}</option>`).join('')}</select></div></div><div class="tableWrap" style="margin-top:12px"><table class="trendTable"><thead><tr><th>ماه</th>${metrics.map(m=>`<th>${m.label}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr><td>${pMonthLabel(r.key)}</td>${r.values.map((v,i)=>`<td>${formatVal(metrics[i].type,v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${main?`<div class="row between" style="margin-top:14px"><strong style="color:#8FC6FF;font-size:11px">روند ${main.label}</strong><button class="chip" onclick="exportTrendPDF()">PDF مقایسه</button></div><div class="trendBars">${rows.map((r,i)=>`<div class="trendBarCol"><b>${main.type==='money'?fmt(Math.round(vals[i]/1000000))+'M':fmt(vals[i])}</b><div class="trendBar" style="height:${Math.max(3,(vals[i]/mx)*100)}%"></div><span>${shortMonthLabel(r.key)}</span></div>`).join('')}</div>`:''}</div>`;
}
function setTrendTeam(v){state.selectedTrendTeam=v;save();renderReports('month')}
function setTrendFrom(v){state.selectedTrendFrom=v;if(state.selectedTrendTo&&v>state.selectedTrendTo)state.selectedTrendTo=v;save();renderReports('month')}
function setTrendTo(v){state.selectedTrendTo=v;if(state.selectedTrendFrom&&v<state.selectedTrendFrom)state.selectedTrendFrom=v;save();renderReports('month')}
function exportTrendPDF(){
  const root=$('#printRoot');root.classList.remove('hidden');root.innerHTML=`<div class="printPage"><div class="printHeader"><h1>گزارش مقایسه چندماهه ${divisionNames[user()?.division]||'هلدینگ کاشانی'}</h1><p>تاریخ تهیه: ${faDate()}</p></div>${multiMonthTeamReport(true)}<div class="printFoot">این گزارش مقایسه‌ای از داده‌های ماهانه ثبت‌شده در اپلیکیشن هلدینگ کاشانی تهیه شده است.</div></div>`;
  const clean=()=>{root.classList.add('hidden');root.innerHTML='';window.removeEventListener('afterprint',clean)};window.addEventListener('afterprint',clean);setTimeout(()=>window.print(),180)
}
function datesForPMonth(key,max=9){const out=[];for(let i=0;i<430&&out.length<max;i++){const d=new Date();d.setDate(d.getDate()-i);const ds=nowKeyFromDate(d);if(pMonthKey(ds)===key&&d.getDay()!==5)out.push(ds)}return out.reverse()}
function ensureHistorySeedV8(){
  if(state._historySeededV8)return;
  const keys=monthOptions(7);
  keys.forEach((key,ki)=>{
    const dates=datesForPMonth(key,9); if(!dates.length)return;
    for(const u of baseUsers){if(u.role==='ceo')continue;dates.forEach((date,di)=>{
      const rk=reportKey(u.id,date);if(state.reports[rk])return;const vals={desc:'داده نمونه تاریخی V14'};
      for(const [k,,type,opts] of roleFields(u.role)){
        if(type==='select'){vals[k]=(opts||[])[(di+ki)%(opts||[]).length]||'';continue}
        let base=(type==='money')?((di%4)+1)*(1900000+ki*180000):((di*3+k.length+ki*2)%13)+4;
        if(k==='old_data')base=150+ki*35+(di*19)%110;
        if(k==='pv_received')base=28+ki*6+(di*7)%38;
        if(k==='messages_sent')base=42+ki*7+(di*6)%45;
        if(k==='calls_total')base=38+ki*8+(di*5)%30;
        if(k==='calls_success')base=18+ki*3+(di*3)%18;
        if(k==='calls_failed')base=11+(di*2)%14;
        if(k==='consult_reg')base=1+ki%3+(di%4);
        if(k==='consult_amount')base=(1+ki%3+(di%4))*(950000+ki*90000);
        if(k==='incoming_amount')base=(10+ki*3+di)*3500000;
        if(k==='outgoing_amount')base=(4+ki+di%4)*1900000;
        if(k==='ad_spend')base=(3+ki+di%3)*1200000;
        vals[k]=base;
      }
      state.reports[rk]=vals;state.attendance[rk]={in:'09:0'+(di%7),out:'17:1'+(di%8)};
    })}
    const sellers=['u_pv','u_page','u_call',''];
    const n=16+ki*3;
    for(let i=0;i<n;i++){
      const date=dates[i%dates.length],id=`hist_${key}_${i}`;
      if(state.registrations.some(r=>r.id===id))continue;
      state.registrations.push({id,date,createdBy:'u_reg',course:courses[(i+ki)%courses.length],amount:4500000+ki*700000+(i%5)*1800000,buyerType:i%3?'اول':'مجدد',sellerId:sellers[i%4],campaignId:'',desc:'ثبت‌نام نمونه تاریخی'});
    }
    if(!state.monthlyFinance[key])state.monthlyFinance[key]={profit:115000000+ki*24000000,notes:'عدد نمونه تاریخی برای تست گزارش چندماهه.'};
  });
  state._historySeededV8=true;save();
}
