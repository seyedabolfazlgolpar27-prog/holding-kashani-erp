/* Holding Kashani V18 loader */
(async function(){
  try{
    const parts=[];
    for(let i=1;i<=7;i++){
      const n=String(i).padStart(2,'0');
      const r=await fetch(`/static/v18.parts/${n}.txt?v=18.1`,{cache:'no-store'});
      if(!r.ok) throw new Error('V18 part '+n+' HTTP '+r.status);
      parts.push(await r.text());
    }
    (0,eval)(parts.join('\n'));
  }catch(e){
    console.error('V18 load failed',e);
  }
})();
