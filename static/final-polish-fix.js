/* small safety/UX fixes layered after final-polish.js */
(function(){
  const prevLoad=loadRemoteState;
  loadRemoteState=async function(){
    const ok=await prevLoad();
    try{
      const me=await api('/api/me');
      let self=allUsers().find(x=>x.username===me.username&&x.division===me.business_unit);
      if(!self){
        self={id:'custom_server_'+me.id,serverId:me.id,division:me.business_unit,role:me.role,name:me.full_name,username:me.username};
        state.customUsers=Array.isArray(state.customUsers)?state.customUsers:[];
        state.customUsers.push(self);
        localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      }
    }catch(_){}
    return ok;
  };
  const prevRefresh=refreshAvatarBuilder;
  refreshAvatarBuilder=function(){
    prevRefresh();
    if(!window._avatarDraft)return;
    $$('.avatarOpt').forEach(b=>{
      const oc=b.getAttribute('onclick')||'';
      const m=oc.match(/setAvatarFeature\('([^']+)',(\d+)\)/);
      if(m)b.classList.toggle('active',Number(window._avatarDraft[m[1]])===Number(m[2]));
    });
    $$('.colorDot').forEach(b=>{
      const oc=b.getAttribute('onclick')||'';
      const m=oc.match(/setAvatarFeature\('([^']+)','([^']+)'\)/);
      if(m)b.classList.toggle('active',String(window._avatarDraft[m[1]]||'').toLowerCase()===m[2].toLowerCase());
    });
    const gender=$('#av_gender');if(gender)gender.value=window._avatarDraft.gender;
    const mouth=$('#av_mouth');if(mouth)mouth.value=String(window._avatarDraft.mouth);
  };
})();
