(()=>{'use strict';
if(window.__DRIPX_ADMIN_SHELL_INSTALLED)return;
window.__DRIPX_ADMIN_SHELL_INSTALLED=true;
const APP='#app',ROOT_ID='dx-admin-shell';
const ROUTES=[
 {id:'resumen',label:'Resumen',group:'GENERAL',icon:'grid',title:'Resumen'},
 {id:'pedidos',label:'Pedidos',group:'VENTAS',icon:'receipt',title:'Pedidos'},
 {id:'tickets',label:'Tickets',group:'VENTAS',icon:'ticket',title:'Tickets'},
 {id:'productos',label:'Productos',group:'CATÁLOGO',icon:'package',title:'Productos'},
 {id:'planes',label:'Planes',group:'CATÁLOGO',icon:'layers',title:'Planes'},
 {id:'categorias',label:'Categorías',group:'CATÁLOGO',icon:'tags',title:'Categorías'},
 {id:'usuarios',label:'Usuarios',group:'COMUNIDAD',icon:'users',title:'Usuarios'},
 {id:'resenas',label:'Reseñas',group:'COMUNIDAD',icon:'star',title:'Reseñas'},
 {id:'logs',label:'Logs',group:'SISTEMA',icon:'activity',title:'Logs de Discord'},
 {id:'ajustes',label:'Ajustes',group:'SISTEMA',icon:'settings',title:'Ajustes generales'}
];
const $=(selector,root=document)=>root.querySelector(selector);
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const iconPaths={
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 receipt:'<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M8 8h8M8 12h8M8 16h4"/>',
 ticket:'<path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6V5Z"/><path d="M13 7v2m0 3v2m0 3v1"/>',
 package:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
 tags:'<path d="M20 13 13 20a2 2 0 0 1-3 0L3 13V4h9l8 8a2 2 0 0 1 0 1Z"/><circle cx="8" cy="8" r="1.3"/>',
 users:'<path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.5"/><path d="M17 11a3.2 3.2 0 0 0 0-6.2M20 20v-1.5a3.5 3.5 0 0 0-2.3-3.3"/>',
 star:'<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
 activity:'<path d="M3 12h4l2.2-6 4.5 12 2.1-6H21"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 2Z"/>',
 search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
 shield:'<path d="M12 3 20 6v5.5c0 5-3.4 8-8 9.5-4.6-1.5-8-4.5-8-9.5V6l8-3Z"/><path d="m8.5 12 2.3 2.3 4.8-5"/>',
 chevron:'<path d="m8 10 4 4 4-4"/>'
};
function svg(name){return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'+(iconPaths[name]||iconPaths.grid)+'</svg>';}
function routeFromLocation(){
 const hash=String(location.hash||'').toLowerCase();
 if(!hash.startsWith('#admin'))return null;
 const match=hash.match(/^#admin\/([^/?]+)/);
 if(match){const value=norm(decodeURIComponent(match[1]));const aliases={reviews:'resenas',resenas:'resenas',categories:'categorias',category:'categorias',users:'usuarios',user:'usuarios',support:'tickets',ticket:'tickets',products:'productos',product:'productos',plans:'planes',plan:'planes',orders:'pedidos',order:'pedidos',settings:'ajustes',config:'ajustes',logs:'logs',inicio:'resumen',panel:'resumen'};const route=aliases[value]||value;return ROUTES.some(item=>item.id===route)?route:'resumen';}
 let saved='';try{saved=sessionStorage.getItem('dripx.admin.tab')||'';}catch{}
 return ROUTES.some(item=>item.id===saved)?saved:'resumen';
}
function setFlags(route){
 const products=['productos','planes'].includes(route);
 window.DRIPX_ADMIN_PRODUCTS_TAB_ACTIVE=products;
 window.DRIPX_ADMIN_CATALOG_MODE=route==='planes'?'planes':route==='productos'?'productos':'';
 window.DRIPX_ADMIN_USERS_TAB_ACTIVE=route==='usuarios';
 window.DRIPX_ADMIN_TICKETS_TAB_ACTIVE=route==='tickets';
 window.__DRIPX_ADMIN_CATEGORIES_TAB_ACTIVE=route==='categorias';
 window.__DRIPX_CATEGORY_TAB_ACTIVE=route==='categorias';
 window.DRIPX_ADMIN_LOGS_TAB_ACTIVE=route==='logs';
 try{if(route==='resumen')sessionStorage.removeItem('dripx.admin.tab');else sessionStorage.setItem('dripx.admin.tab',route);}catch{}
}
function findLegacyControl(route){
 const matchers={
  pedidos:/pedidos|orders/i,tickets:/tickets|soporte/i,productos:/productos|products/i,
  categorias:/categorias|categories/i,usuarios:/usuarios|users/i,resenas:/resenas|reviews/i,ajustes:/ajustes|configuracion|settings/i
 };
 const matcher=matchers[route];if(!matcher)return null;
 const controls=[...document.querySelectorAll('#app a,#app button,#app [role="tab"],#app [data-admin-tab],#app [data-admin-route]')];
 return controls.find(node=>{
  if(node.closest('#dx-admin-shell')||node.closest('[hidden]'))return false;
  const value=[node.textContent,node.getAttribute('data-admin-tab'),node.getAttribute('data-admin-route'),node.getAttribute('data-tab'),node.getAttribute('aria-label'),node.getAttribute('href')].filter(Boolean).join(' ');
  return matcher.test(norm(value));
 })||null;
}
function bootstrapLegacyProductEditor(){
 if($('#product-form'))return true;
 const legacy=findLegacyControl('productos');
 if(!legacy)return false;
 const last=Number(legacy.dataset.dxasProductBootstrapAt||0);
 if(Date.now()-last<1200)return false;
 legacy.dataset.dxasProductBootstrapAt=String(Date.now());
 legacy.click();
 return true;
}
window.DRIPX_ADMIN_BOOTSTRAP_PRODUCTS_FORM=bootstrapLegacyProductEditor;
function mount(){
 let shell=$(ROOT_ID);if(shell)return shell;
 shell=document.createElement('section');shell.id=ROOT_ID;shell.className='dxas-shell';
 const groups=['GENERAL','VENTAS','CATÁLOGO','COMUNIDAD','SISTEMA'];
 shell.innerHTML='<aside class="dxas-sidebar"><div class="dxas-brand"><span class="dxas-mark">DX</span><span class="dxas-brand-copy"><strong>DRIP X SHOP</strong><small>ADMINISTRACIÓN</small></span><button type="button" class="dxas-mobile-close" data-dxas-mobile-close aria-label="Cerrar navegación">×</button></div><div class="dxas-sidebar-rule"></div><nav class="dxas-nav" aria-label="Navegación de administración">'+groups.map(group=>'<section class="dxas-nav-group"><h2>'+group+'</h2>'+ROUTES.filter(item=>item.group===group).map(item=>'<button type="button" class="dxas-nav-item" data-dxas-route="'+item.id+'"><span class="dxas-nav-icon">'+svg(item.icon)+'</span><span>'+item.label+'</span><span class="dxas-nav-active"></span></button>').join('')+'</section>').join('')+'</nav><div class="dxas-sidebar-footer"><span class="dxas-secure-dot"></span><span>Sesión administrativa</span><span class="dxas-secure-state">PROTEGIDA</span></div></aside><header class="dxas-topbar"><button type="button" class="dxas-mobile-menu" data-dxas-mobile-open aria-label="Abrir navegación">☰</button><div class="dxas-crumb"><span>DRIP X SHOP</span><i>/</i><span>ADMINISTRACIÓN</span><i>/</i><strong data-dxas-current>RESUMEN</strong></div><div class="dxas-top-actions"><span class="dxas-session-pill"><span></span> Conectado</span><div class="dxas-account"><span class="dxas-avatar" data-dxas-avatar>DX</span><span class="dxas-account-copy"><strong data-dxas-name>Administrador</strong><small>Discord · cuenta autorizada</small></span></div><button type="button" class="dxas-store-link" data-dxas-store>↗ <span>Ver tienda</span></button></div></header><div class="dxas-mobile-backdrop" data-dxas-mobile-close></div>';
 document.body.append(shell);
 return shell;
}
function updateIdentity(){
 const target=$('[data-dxas-name]'),avatar=$('[data-dxas-avatar]');
 const user=window.DRIPX_SUPABASE_CLIENT?.auth?.getUser;
 if(!user||!target||target.dataset.loaded==='1')return;
 target.dataset.loaded='1';
 window.DRIPX_SUPABASE_CLIENT.auth.getUser().then(({data,error})=>{
  if(error||!data?.user)return;
  const meta=data.user.user_metadata||{};
  target.textContent=meta.global_name||meta.full_name||meta.name||'Administrador';
  const source=meta.avatar_url||meta.picture;
  if(source&&avatar){avatar.innerHTML='<img src="'+esc(source)+'" alt="">';}
 }).catch(()=>{});
}
function setLegacyContent(route){const app=$(APP);if(app)app.dataset.dxasRoute=route;}
function renderShellState(route){
 const shell=mount(),current=ROUTES.find(item=>item.id===route)||ROUTES[0];
 document.body.classList.add('dxas-active');
 shell.dataset.route=route;
 const app=$(APP);if(app){app.classList.add('dxas-app');setLegacyContent(route);}
 shell.querySelectorAll('[data-dxas-route]').forEach(button=>{
  const active=button.dataset.dxasRoute===route;
  button.classList.toggle('is-active',active);button.setAttribute('aria-current',active?'page':'false');
 });
 const crumb=$('[data-dxas-current]',shell);if(crumb)crumb.textContent=current.title.toUpperCase();
 shell.querySelectorAll('.dxas-mobile-backdrop').forEach(node=>node.hidden=true);
 updateIdentity();
}
let syncTimer=0;
function sync(){
 clearTimeout(syncTimer);
 syncTimer=setTimeout(()=>{
  const route=routeFromLocation(),admin=route!==null&&window.DRIPX_IS_ADMIN===true;
  if(!admin){
   document.body.classList.remove('dxas-active');
   document.querySelector('#'+ROOT_ID)?.remove();
   const app=$(APP);if(app){app.classList.remove('dxas-app');delete app.dataset.dxasRoute;}
   return;
  }
  setFlags(route);renderShellState(route);
  window.dispatchEvent(new CustomEvent('dripx:admin-route',{detail:{route}}));
  if(route==='productos'){
   bootstrapLegacyProductEditor();
   window.dispatchEvent(new CustomEvent('dripx:admin-products-view'));
  }
  if(route==='logs')setTimeout(()=>window.dispatchEvent(new CustomEvent('dripx:admin-logs-view')),0);
 },60);
}
function navigate(route){
 if(!ROUTES.some(item=>item.id===route))return;
 setFlags(route);
 const hash=route==='resumen'?'#admin':'#admin/'+route;
 if(location.hash!==hash)location.hash=hash;else sync();
 const shell=mount();shell.querySelectorAll('[data-dxas-route]').forEach(button=>button.classList.toggle('is-active',button.dataset.dxasRoute===route));
}
window.DRIPX_ADMIN_NAVIGATE=navigate;
document.addEventListener('click',event=>{
 const nav=event.target.closest('#dx-admin-shell [data-dxas-route]');
 if(nav){event.preventDefault();navigate(nav.dataset.dxasRoute);return;}
 if(event.target.closest('[data-dxas-store]')){window.open(location.origin+'/#inicio','_self');return;}
 if(event.target.closest('[data-dxas-mobile-open]')){$('#dx-admin-shell')?.classList.add('is-mobile-open');return;}
 if(event.target.closest('[data-dxas-mobile-close]')){$('#dx-admin-shell')?.classList.remove('is-mobile-open');return;}
},true);
window.addEventListener('hashchange',sync);
window.addEventListener('dripx:admin-ready',sync);
const observe=()=>{const app=$(APP);if(app)new MutationObserver(()=>sync()).observe(app,{childList:true,subtree:false});};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{observe();sync();},{once:true});
else{observe();sync();}
setTimeout(sync,250);
setTimeout(sync,900);
})();