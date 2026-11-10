(()=>{'use strict';
const styles=[
 ['/dripx-user-admin.css?v=20261110-users-02','dripx-admin-users-css'],
 ['/dripx-catalog-manager.css?v=20261110-catalog-02','dripx-admin-catalog-css'],
 ['/dripx-ticket-admin.css?v=20261110-tickets-02','dripx-admin-tickets-css'],
 ['/dripx-admin-logs.css?v=20261110-logs-02','dripx-admin-logs-css'],
 ['/dripx-admin-extra.css?v=20261110-extra-02','dripx-admin-extra-css'],
 ['/dripx-admin-shell.css?v=20261110-shell-03','dripx-admin-shell-css']
];
const scripts=[
 ['/dripx-user-admin.js?v=20261110-users-02','dripx-admin-users-js'],
 ['/dripx-user-admin-actions.js?v=20261110-user-actions-02','dripx-admin-user-actions-js'],
 ['/dripx-catalog-manager.js?v=20261110-catalog-02','dripx-admin-catalog-js'],
 ['/dripx-ticket-admin.js?v=20261110-tickets-02','dripx-admin-tickets-js'],
 ['/dripx-admin-logs.js?v=20261110-logs-02','dripx-admin-logs-js'],
 ['/dripx-admin-extra.js?v=20261110-extra-02','dripx-admin-extra-js'],
 ['/dripx-admin-shell.js?v=20261110-shell-03','dripx-admin-shell-js']
];
let inflight=null;
const isAdminRoute=()=>/^#admin(?:$|[/?])/i.test(String(location.hash||''));
function loadStyle(src,id){
 const existing=document.getElementById(id);
 if(existing)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const link=document.createElement('link');link.rel='stylesheet';link.href=src;link.id=id;
  link.onload=resolve;link.onerror=()=>{link.remove();reject(new Error('No se pudo cargar el estilo '+src));};
  document.head.append(link);
 });
}
function loadScript(src,id){
 if(document.getElementById(id))return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=src;script.id=id;script.async=false;
  script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('No se pudo cargar el módulo '+src));};
  document.head.append(script);
 });
}
async function ensureAdminModules(){
 if(!isAdmin()){window.__DRIPX_ADMIN_SHELL_ENABLED=false;return;}
 window.__DRIPX_ADMIN_SHELL_ENABLED=true;
 if(window.__DRIPX_ADMIN_MODULES_READY===true)return;
 if(inflight)return inflight;
 inflight=(async()=>{
  await Promise.all(styles.map(([src,id])=>loadStyle(src,id)));
  for(const [src,id] of scripts)await loadScript(src,id);
  window.__DRIPX_ADMIN_MODULES_READY=true;
  window.dispatchEvent(new CustomEvent('dripx:admin-modules-ready'));
 })();
 try{await inflight;}
 catch(error){
  inflight=null;console.error('[DRIPX admin loader]',error);
  const toast=document.querySelector('#toast');
  if(toast){toast.textContent='No se pudo cargar una parte de Administración. Comprueba tu conexión y vuelve a abrir el panel.';toast.classList.add('show');}
 }
}
window.DRIPX_LOAD_ADMIN_MODULES=ensureAdminModules;
window.addEventListener('hashchange',ensureAdminModules);
if(isAdminRoute())void ensureAdminModules();
})();