/* Holding Kashani V18.3 loader — avatar module intentionally excluded */
(async function(){
  try{
    const parts=[];
    const order=[1,3,4,5,6,7,8];
    for(const i of order){
      const n=String(i).padStart(2,'0');
      const r=await fetch(`/static/v18.parts/${n}.txt?v=18.3`,{cache:'no-store'});
      if(!r.ok) throw new Error('V18 part '+n+' HTTP '+r.status);
      parts.push(await r.text());
    }
    (0,eval)(parts.join('\n'));
  }catch(e){
    console.error('V18.3 load failed',e);
    if(typeof toast==='function') toast('خطا در بارگذاری نسخه جدید؛ برنامه را کامل ببند و دوباره باز کن');
  }
})();
