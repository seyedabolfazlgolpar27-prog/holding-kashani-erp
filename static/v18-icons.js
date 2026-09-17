/* Exact bottom navigation artwork from the approved V17 HTML preview. */
(async function(){
  const names=['home','daily','reports','rewards','more'];
  try{
    const vals=await Promise.all(names.map(async n=>{
      const r=await fetch(`/static/icons-v17/${n}.webp.b64?v=18.1`,{cache:'force-cache'});
      if(!r.ok) throw new Error(n+' icon '+r.status);
      return (await r.text()).trim();
    }));
    const icons=Object.fromEntries(names.map((n,i)=>[n,'data:image/webp;base64,'+vals[i]]));
    window.HK_V18_ICONS=icons;
    window.applyV18Icons=function(){
      document.querySelectorAll('.nav').forEach(n=>{
        const img=n.querySelector('.navIcon'),src=icons[n.dataset.page];
        if(img&&src){img.src=src;img.setAttribute('data-dark',src);img.setAttribute('data-light',src)}
      });
    };
    window.applyV18Icons();
    new MutationObserver(()=>window.applyV18Icons()).observe(document.querySelector('.bottom')||document.body,{childList:true,subtree:true});
  }catch(e){console.error('V18 icon load failed',e)}
})();
