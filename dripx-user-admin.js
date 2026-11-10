(()=>{'use strict';
if(window.__DRIPX_USER_ADMIN_INSTALLED)return;
window.__DRIPX_USER_ADMIN_INSTALLED=true;
const db=window.DRIPX_SUPABASE_CLIENT;
if(!db)return;
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const toast=m=>{const n=$('#toast');if(n){n.textContent=m;n.classList.add('show');setTimeout(()=>n.classList.remove('show'),3200);}};
const roleLabel=role=>({customer:'Cliente',user:'Cliente',support:'Soporte',moderator:'Moderador',admin:'Administrador'})[String(role||'').toLowerCase()]||'Cliente';
let rows=[],products=[],loading=false;
function isAdmin(){return window.DRIPX_IS_ADMIN===true&&String(location.hash||'').toLowerCase().startsWith('#admin');}
function isUsers(){
 const h=String(location.hash||'').toLowerCase();
 if(/^#admin\/(?:usuarios|users)(?:$|[/?])/.test(h))return true;
 try{return window.DRIPX_ADMIN_USERS_TAB_ACTIVE===true||sessionStorage.getItem('dripx.admin.tab')==='usuarios';}catch{return window.DRIPX_ADMIN_USERS_TAB_ACTIVE===true;}
}
function host(){
 let h=$('#dx-user-admin');
 if(!h){h=document.createElement('section');h.id='dx-user-admin';h.className='dxua-shell';$('#app')?.append(h);}
 return h;
}
async function verifyAdmin(){
 const s=await db.auth.getSession();if(s.error)throw s.error;
 if(!s.data?.session?.user?.id)throw new Error('Sesión de Discord no disponible. Vuelve a iniciar sesión.');
 const a=await db.rpc('dripx_is_admin');if(a.error)throw a.error;
 if(a.data!==true)throw new Error('Tu cuenta no tiene permisos administrativos.');
}
async function load(force=false){
 if(loading||!isAdmin()||!isUsers())return;
 loading=true;const root=host();
 root.innerHTML='<div class="dxua-loading"><span class="dxua-loading-mark">DX</span><div><strong>Sincronizando usuarios</strong><small>Consultando cuentas, roles y productos en Supabase…</small></div></div>';
 try{
  await verifyAdmin();
  const [u,p]=await Promise.all([
   db.rpc('dripx_admin_list_users'),
   db.from('dripx_products').select('id,title,status,product_type,file_path').eq('status','published').eq('product_type','resource').not('file_path','is',null).order('title')
  ]);
  if(u.error)throw u.error;if(p.error)throw p.error;
  if(!isAdmin()||!isUsers())return;
  rows=(u.data||[]).map(user=>({...user,role:String(user.role||'customer')}));
  products=p.data||[];
  window.__DRIPX_ADMIN_USER_CACHE=rows;
  render();
 }catch(error){
  const h=$('#dx-user-admin');
  if(h)h.innerHTML='<div class="dxua-error"><b>No se pudieron cargar los usuarios</b><p>'+esc(error.message||'Error consultando Supabase')+'</p><button type="button" data-dxua-reload>↻ Reintentar</button></div>';
  console.error('[DRIPX users]',error);
 }finally{loading=false;}
}
function render(){
 const root=host(),query=String(root.querySelector('[data-dxua-search]')?.value||''),filter=root.querySelector('[data-dxua-filter]')?.value||'all';
 const active=rows.filter(u=>u.active===true).length,suspended=rows.length-active,admins=rows.filter(u=>u.role==='admin').length;
 const filtered=rows.filter(u=>{
  const q=norm([u.display_name,u.discord_id,u.email,u.role].join(' '));
  return (!query||q.includes(norm(query)))&&(filter==='all'||(filter==='active'&&u.active===true)||(filter==='suspended'&&u.active!==true)||(filter==='admin'&&u.role==='admin'));
 });
 const list=filtered.map(u=>{
  const name=u.display_name||'Usuario Discord',role=String(u.role||'customer'),protectedAdmin=role==='admin';
  return '<article class="dxua-row" data-user="'+esc(u.user_id)+'">'+
   '<img class="dxua-avatar" src="'+esc(u.avatar_url||'/assets/logo.svg')+'" alt="" loading="lazy" decoding="async" onerror="this.src=\'/assets/logo.svg\'">'+
   '<div class="dxua-identity"><strong>'+esc(name)+'</strong><small>'+esc(u.discord_id||'Discord ID no disponible')+(u.email?' · '+esc(u.email):'')+'</small></div>'+
   '<span class="dxua-role dxua-role-'+esc(role)+'">'+esc(roleLabel(role))+'</span>'+
   '<span class="dxua-state '+(u.active?'is-active':'is-suspended')+'"><i></i>'+(u.active?'Activo':'Suspendido')+'</span>'+
   '<div class="dxua-actions"><button type="button" class="dxua-more" aria-label="Opciones de '+esc(name)+'" aria-haspopup="menu" aria-expanded="false" data-dxua-menu="'+esc(u.user_id)+'"><span></span><span></span><span></span></button>'+
   '<div class="dxua-menu" role="menu" data-dxua-menu-panel="'+esc(u.user_id)+'" hidden>'+
   '<button type="button" role="menuitem" data-dxua-action="role" data-user-id="'+esc(u.user_id)+'" '+(protectedAdmin?'disabled title="Rol protegido"':'')+'>♙ Editar rol</button>'+
   '<button type="button" role="menuitem" data-dxua-action="grant" data-user-id="'+esc(u.user_id)+'">＋ Dar producto</button>'+
   '<button type="button" role="menuitem" data-dxua-action="revoke" data-user-id="'+esc(u.user_id)+'">− Quitar producto</button>'+
   '<button type="button" role="menuitem" data-dxua-action="suspend" data-user-id="'+esc(u.user_id)+'" '+(protectedAdmin?'disabled title="Cuenta protegida"':'')+'>'+(u.active?'⊘ Suspender':'✓ Reactivar')+'</button>'+
   '<button type="button" role="menuitem" data-dxua-action="logs" data-user-id="'+esc(u.user_id)+'">▤ Registros</button>'+
   '</div></div></article>';
 }).join('');
 root.innerHTML='<header class="dxua-head"><div><span class="dxua-kicker">CONTROL DE ACCESO / DISCORD</span><h2>Usuarios</h2><p>Cuentas reales vinculadas a Discord · roles, accesos y actividad administrativa.</p></div><button type="button" data-dxua-reload class="dxua-refresh">↻ Actualizar</button></header>'+
 '<div class="dxua-stats">'+
  '<article><small>Registrados</small><strong>'+rows.length+'</strong><span>Total de cuentas</span></article>'+
  '<article><small>Activos</small><strong>'+active+'</strong><span>Acceso habilitado</span></article>'+
  '<article><small>Suspendidos</small><strong>'+suspended+'</strong><span>Acceso restringido</span></article>'+
  '<article><small>Administradores</small><strong>'+admins+'</strong><span>Roles protegidos</span></article>'+
 '</div>'+
 '<div class="dxua-tools"><label class="dxua-search"><span>⌕</span><input data-dxua-search type="search" placeholder="Buscar por nombre, correo o Discord ID" value="'+esc(query)+'"></label><select data-dxua-filter aria-label="Filtrar usuarios"><option value="all">Todos los usuarios</option><option value="active" '+(filter==='active'?'selected':'')+'>Activos</option><option value="suspended" '+(filter==='suspended'?'selected':'')+'>Suspendidos</option><option value="admin" '+(filter==='admin'?'selected':'')+'>Administradores</option></select><span>'+filtered.length+' de '+rows.length+'</span></div>'+
 '<div class="dxua-list-head"><span>CUENTA / IDENTIDAD</span><span>ROL</span><span>ESTADO</span><span>ACCIONES</span></div>'+
 '<div class="dxua-list">'+(list||'<div class="dxua-empty">No hay usuarios que coincidan con los filtros.</div>')+'</div>'+
 '<div class="dxua-modal-wrap" data-dxua-modal hidden><section class="dxua-modal" role="dialog" aria-modal="true"><header><div><small>DRIP X / GESTIÓN DE USUARIO</small><h3 data-dxua-title>Administrar usuario</h3></div><button type="button" data-dxua-close aria-label="Cerrar">×</button></header><div data-dxua-body></div></section></div>';
 const search=root.querySelector('[data-dxua-search]');search?.addEventListener('input',e=>{
  const value=e.target.value,position=e.target.selectionStart;render();
  const next=root.querySelector('[data-dxua-search]');if(next){next.focus();try{next.setSelectionRange(position,position);}catch{}}
 });
 root.querySelector('[data-dxua-filter]')?.addEventListener('change',()=>render());
}
function modal(title,html){
 const w=$('#dx-user-admin [data-dxua-modal]');if(!w)throw new Error('No se encontró el panel de usuarios.');
 w.hidden=false;w.querySelector('[data-dxua-title]').textContent=title;w.querySelector('[data-dxua-body]').innerHTML=html;
}
const user=id=>rows.find(x=>String(x.user_id)===String(id));
function closeMenus(except){
 document.querySelectorAll('#dx-user-admin [data-dxua-menu-panel]').forEach(menu=>{
  if(menu===except)return;
  menu.hidden=true;
  const button=$('#dx-user-admin [data-dxua-menu="'+CSS.escape(menu.dataset.dxuaMenuPanel)+'"]');
  button?.setAttribute('aria-expanded','false');
 });
}
document.addEventListener('click',async e=>{
 const rootNode=e.target.closest('#dx-user-admin');
 const reload=e.target.closest('#dx-user-admin [data-dxua-reload]');
 if(reload){e.preventDefault();await load(true);return;}
 const close=e.target.closest('#dx-user-admin [data-dxua-close]');
 if(close){$('#dx-user-admin [data-dxua-modal]').hidden=true;return;}
 const menuButton=e.target.closest('#dx-user-admin [data-dxua-menu]');
 if(menuButton){
  e.preventDefault();const id=menuButton.dataset.dxuaMenu,panel=$('#dx-user-admin [data-dxua-menu-panel="'+CSS.escape(id)+'"]');
  const opening=!!panel?.hidden;closeMenus(panel||null);
  if(panel){panel.hidden=!opening;menuButton.setAttribute('aria-expanded',String(opening));}
  return;
 }
 if(!rootNode||!e.target.closest('.dxua-menu'))closeMenus(null);
 const action=e.target.closest('#dx-user-admin [data-dxua-action]');
 if(!action)return;
 e.preventDefault();e.stopImmediatePropagation();
 const id=action.dataset.userId,u=user(id);if(!u)return;
 closeMenus(null);
 const kind=action.dataset.dxuaAction;
 if(kind==='role'){
  if(u.role==='admin'){toast('Los roles de administrador están protegidos.');return;}
  modal('Editar rol','<p>Selecciona el rol de <b>'+esc(u.display_name||'este usuario')+'</b>.</p><label class="dxua-field">Rol<select data-dxua-role><option value="customer" '+(u.role==='customer'?'selected':'')+'>Cliente</option><option value="support" '+(u.role==='support'?'selected':'')+'>Soporte</option><option value="moderator" '+(u.role==='moderator'?'selected':'')+'>Moderador</option></select></label><button type="button" class="dxua-primary" data-dxua-save-role="'+esc(id)+'">Guardar rol</button>');
 }else if(kind==='grant'||kind==='revoke'){
  const result=await db.from('dripx_entitlements').select('product_id,active').eq('user_id',id).eq('active',true);
  if(result.error){toast(result.error.message||'No se pudieron consultar los accesos.');return;}
  const owned=new Set((result.data||[]).map(x=>String(x.product_id)));
  const choices=products.filter(p=>kind==='grant'?!owned.has(String(p.id)):owned.has(String(p.id)));
  modal(kind==='grant'?'Dar producto':'Quitar producto',choices.length
   ?'<p>'+esc(u.display_name||'Usuario')+' · '+choices.length+' productos '+(kind==='grant'?'disponibles':'asignados')+'</p><label class="dxua-field">Producto<select data-dxua-product>'+choices.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.title)+'</option>').join('')+'</select></label><p class="dxua-note">'+(kind==='grant'?'La asignación habilita la descarga directa cuando el producto está publicado y tiene ZIP.':'Solo revoca accesos directos; los recursos heredados de planes se administran desde Planes.')+'</p><button type="button" class="dxua-primary" data-dxua-save-product="'+esc(id)+'" data-kind="'+kind+'">'+(kind==='grant'?'Conceder acceso':'Revocar acceso')+'</button>'
   :'<p>No hay productos '+(kind==='grant'?'publicados y disponibles para asignar':'asignados directamente a esta cuenta')+'.</p>');
 }else if(kind==='suspend'){
  if(u.role==='admin'){toast('No se puede suspender una cuenta administradora desde este panel.');return;}
  modal(u.active?'Suspender usuario':'Reactivar usuario','<p>'+(u.active?'El usuario perderá el acceso a las funciones protegidas de la tienda.':'Se restaurará el acceso del usuario.')+'</p><label class="dxua-field">Motivo (opcional)<textarea data-dxua-reason maxlength="500" placeholder="Motivo administrativo…"></textarea></label><button type="button" class="dxua-danger" data-dxua-suspend="'+esc(id)+'" data-suspended="'+(u.active?'true':'false')+'">'+(u.active?'Confirmar suspensión':'Reactivar cuenta')+'</button>');
 }else if(kind==='logs'){
  modal('Registros · '+(u.display_name||'Usuario'),'<div class="dxua-loading">Consultando auditoría en Supabase…</div>');
  try{
   const result=await db.rpc('dripx_admin_get_user_audit',{p_user_id:id});if(result.error)throw result.error;
   const logs=result.data||[];
   modal('Registros · '+(u.display_name||'Usuario'),logs.length?'<div class="dxua-audit">'+logs.map(x=>'<article><strong>'+esc(x.action)+'</strong><small>'+new Date(x.created_at).toLocaleString('es-DO')+'</small><pre>'+esc(JSON.stringify(x.details||{},null,2))+'</pre></article>').join('')+'</div>':'<p>Este usuario todavía no tiene acciones administrativas registradas.</p>');
  }catch(error){modal('Error de registros','<p>'+esc(error.message||'No se pudo cargar la auditoría.')+'</p>');}
 }
},true);
document.addEventListener('click',async e=>{
 const role=e.target.closest('[data-dxua-save-role]'),grant=e.target.closest('[data-dxua-save-product]'),suspend=e.target.closest('[data-dxua-suspend]');
 try{
  if(role){
   role.disabled=true;const result=await db.rpc('dripx_admin_set_user_role',{p_user_id:role.dataset.dxuaSaveRole,p_role:$('#dx-user-admin [data-dxua-role]').value});
   if(result.error)throw result.error;toast('Rol actualizado y registrado.');$('#dx-user-admin [data-dxua-modal]').hidden=true;await load(true);
  }
  if(grant){
   grant.disabled=true;const product=$('#dx-user-admin [data-dxua-product]')?.value;if(!product)throw new Error('Selecciona un producto.');
   const result=await db.rpc(grant.dataset.kind==='grant'?'dripx_admin_grant_user_product':'dripx_admin_revoke_user_product',
    grant.dataset.kind==='grant'?{p_user_id:grant.dataset.dxuaSaveProduct,p_product_id:product}:{p_user_id:grant.dataset.dxuaSaveProduct,p_product_id:product,p_reason:'Revocado desde administración'});
   if(result.error)throw result.error;toast(grant.dataset.kind==='grant'?'Producto asignado.':'Producto revocado.');$('#dx-user-admin [data-dxua-modal]').hidden=true;await load(true);
  }
  if(suspend){
   suspend.disabled=true;const result=await db.rpc('dripx_admin_set_user_suspension',{p_user_id:suspend.dataset.dxuaSuspend,p_suspended:suspend.dataset.suspended==='true',p_reason:$('#dx-user-admin [data-dxua-reason]')?.value||null});
   if(result.error)throw result.error;toast('Estado del usuario actualizado.');$('#dx-user-admin [data-dxua-modal]').hidden=true;await load(true);
  }
 }catch(error){toast(error.message||'La operación no pudo completarse.');if(role)role.disabled=false;if(grant)grant.disabled=false;if(suspend)suspend.disabled=false;}
},false);
function sync(){
 if(!isAdmin()||!isUsers()){$('#dx-user-admin')?.remove();return;}
 if(!$('#dx-user-admin')&&!loading)void load();
}
document.addEventListener('click',e=>{
 const n=e.target.closest('#app a,#app button,#app [role="tab"]');if(!n||n.closest('#dx-user-admin'))return;
 const label=[n.textContent,n.getAttribute('data-admin-tab'),n.getAttribute('data-tab'),n.getAttribute('aria-label'),n.getAttribute('href')].join(' ').toLowerCase();
 if(/usuarios|users/.test(label)){window.DRIPX_ADMIN_USERS_TAB_ACTIVE=true;try{sessionStorage.setItem('dripx.admin.tab','usuarios');}catch{}setTimeout(sync,80);}
 else if(/productos|planes|pedidos|tickets|resenas|ajustes|configuracion|panel|inicio/.test(label)){window.DRIPX_ADMIN_USERS_TAB_ACTIVE=false;setTimeout(sync,80);}
});
window.addEventListener('hashchange',()=>setTimeout(sync,100));
window.addEventListener('dripx:admin-route',()=>setTimeout(sync,0));
const observer=new MutationObserver(()=>{if(isAdmin()&&isUsers()&&!$('#dx-user-admin')&&!loading)void load();});
const start=()=>{const app=$('#app');if(app)observer.observe(app,{childList:true,subtree:true});sync();};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();