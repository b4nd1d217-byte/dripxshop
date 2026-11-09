(()=>{'use strict';
const C=window.DRIPX_CONFIG||{},db=window.DRIPX_SUPABASE_CLIENT;
if(!db)return;
const $=(s,r=document)=>r.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let rows=[],products=[],selected=null,loading=false;
const isAdmin=()=>location.hash.toLowerCase().startsWith('#admin')&&window.DRIPX_IS_ADMIN===true;
const isUsers=()=>{const h=location.hash.toLowerCase();if(/usuarios|users/.test(h))return true;try{if(window.DRIPX_ADMIN_USERS_TAB_ACTIVE===true||sessionStorage.getItem('dripx.admin.tab')==='usuarios')return true;}catch{}const nodes=[...document.querySelectorAll('#app .active,#app [aria-selected="true"],#app [aria-current="page"]')];return nodes.some(n=>/usuarios|users/.test([n.textContent,n.getAttribute('data-admin-tab'),n.getAttribute('data-tab'),n.getAttribute('aria-label')].join(' ').toLowerCase()));};
const toast=m=>{const n=$('#toast');if(n){n.textContent=m;n.classList.add('show');setTimeout(()=>n.classList.remove('show'),3200);}};
const avatar=u=>u.avatar_url||'';
async function load(force=false){
 if(loading)return;loading=true;
 const host=$('#dx-user-admin');if(host)host.innerHTML='<div class="dxua-loading">Consultando usuarios y permisos en Supabase…</div>';
 try{
  const s=await db.auth.getSession();if(s.error)throw s.error;if(!s.data.session?.user?.id)throw new Error('Sesión administrativa no disponible.');
  const a=await db.rpc('dripx_is_admin');if(a.error)throw a.error;if(a.data!==true)throw new Error('Tu cuenta no tiene permisos administrativos.');
  const [u,p]=await Promise.all([db.rpc('dripx_admin_list_users'),db.from('dripx_products').select('id,title,status,product_type,file_path').eq('status','published').eq('product_type','resource').not('file_path','is',null).order('title')]);
  if(u.error)throw u.error;if(p.error)throw p.error;
  rows=u.data||[];products=p.data||[];render();
 }catch(e){const h=$('#dx-user-admin');if(h)h.innerHTML='<div class="dxua-error"><b>No se pudo cargar el administrador</b><p>'+esc(e.message||'Error consultando Supabase')+'</p><button data-dxua-reload>Reintentar</button></div>';console.error('[DRIPX users]',e);}
 finally{loading=false;}
}
function render(){
 let host=$('#dx-user-admin');if(!host){host=document.createElement('section');host.id='dx-user-admin';host.className='dxua-shell';$('#app')?.append(host);}
 const query=String(host.querySelector('[data-dxua-search]')?.value||'').toLowerCase();
 const filtered=rows.filter(u=>[u.display_name,u.discord_id,u.email,u.role].join(' ').toLowerCase().includes(query));
 host.innerHTML='<header class="dxua-head"><div><span class="dxua-kicker">CONTROL DE ACCESO</span><h2>Usuarios</h2><p>Perfiles reales vinculados a Discord · '+rows.length+' cuentas registradas</p></div><button data-dxua-reload class="dxua-refresh">↻ Actualizar</button></header><div class="dxua-tools"><label class="dxua-search">⌕ <input data-dxua-search placeholder="Buscar por nombre o Discord ID" value="'+esc(query)+'"></label><span>'+filtered.length+' resultados</span></div><div class="dxua-list">'+(filtered.length?filtered.map(u=>'<article class="dxua-row" data-user="'+esc(u.user_id)+'"><img class="dxua-avatar" src="'+esc(avatar(u))+'" alt="" loading="lazy" onerror="this.src=\'/assets/logo.svg\'"><div class="dxua-identity"><strong>'+esc(u.display_name||'Usuario Discord')+'</strong><small>'+esc(u.discord_id||'Discord ID no disponible')+'</small></div><span class="dxua-role">'+esc(u.role||'user')+'</span><span class="dxua-state '+(u.active?'is-active':'is-suspended')+'">'+(u.active?'Activo':'Suspendido')+'</span><div class="dxua-actions"><button aria-label="Opciones de '+esc(u.display_name)+'" data-dxua-menu="'+esc(u.user_id)+'">···</button><div class="dxua-menu" data-dxua-menu-panel="'+esc(u.user_id)+'" hidden><button data-dxua-action="role" data-user-id="'+esc(u.user_id)+'">Editar rol</button><button data-dxua-action="grant" data-user-id="'+esc(u.user_id)+'">Dar producto</button><button data-dxua-action="revoke" data-user-id="'+esc(u.user_id)+'">Quitar producto</button><button data-dxua-action="suspend" data-user-id="'+esc(u.user_id)+'">'+(u.active?'Suspender':'Reactivar')+'</button><button data-dxua-action="logs" data-user-id="'+esc(u.user_id)+'">Registros</button></div></div></article>').join(''):'<div class="dxua-empty">No hay usuarios que coincidan con la búsqueda.</div>')+'</div><div class="dxua-modal-wrap" data-dxua-modal hidden><section class="dxua-modal" role="dialog" aria-modal="true"><header><div><small>DRIP X · GESTIÓN DE USUARIO</small><h3 data-dxua-title>Administrar usuario</h3></div><button data-dxua-close aria-label="Cerrar">×</button></header><div data-dxua-body></div></section></div>';
 host.querySelector('[data-dxua-search]').addEventListener('input',e=>{const v=e.target.value;render();const n=host.querySelector('[data-dxua-search]');n.focus();n.setSelectionRange(v.length,v.length);});
}
function modal(title,html){const w=$('#dx-user-admin [data-dxua-modal]');w.hidden=false;w.querySelector('[data-dxua-title]').textContent=title;w.querySelector('[data-dxua-body]').innerHTML=html;}
const user=id=>rows.find(x=>String(x.user_id)===String(id));
document.addEventListener('click',async e=>{
 const reload=e.target.closest('[data-dxua-reload]');if(reload){e.preventDefault();await load(true);return;}
 const close=e.target.closest('[data-dxua-close]');if(close){$('#dx-user-admin [data-dxua-modal]').hidden=true;return;}
 const menu=e.target.closest('[data-dxua-menu]');if(menu){e.preventDefault();const id=menu.dataset.dxuaMenu;document.querySelectorAll('.dxua-menu').forEach(x=>x.hidden=true);const m=$('[data-dxua-menu-panel="'+CSS.escape(id)+'"]');if(m)m.hidden=false;return;}
 const action=e.target.closest('[data-dxua-action]');if(!action)return;
 e.preventDefault();e.stopImmediatePropagation();const id=action.dataset.userId,u=user(id);if(!u)return;
 document.querySelectorAll('.dxua-menu').forEach(x=>x.hidden=true);
 const kind=action.dataset.dxuaAction;
 if(kind==='role'){
  if(u.role==='admin'){toast('Los roles de administrador están protegidos.');return;}
  modal('Editar rol','<p>Selecciona el rol que tendrá <b>'+esc(u.display_name)+'</b>.</p><select data-dxua-role><option value="user" '+(u.role==='user'?'selected':'')+'>Usuario</option><option value="support" '+(u.role==='support'?'selected':'')+'>Soporte</option><option value="moderator" '+(u.role==='moderator'?'selected':'')+'>Moderador</option></select><button class="dxua-primary" data-dxua-save-role="'+esc(id)+'">Guardar rol</button>');
 }else if(kind==='grant'||kind==='revoke'){
  const {data,error}=await db.from('dripx_entitlements').select('product_id,active').eq('user_id',id).eq('active',true);if(error){toast(error.message);return;}
  const owned=new Set((data||[]).map(x=>String(x.product_id)));
  const list=products.filter(p=>kind==='grant'?!owned.has(String(p.id)):owned.has(String(p.id)));
  modal(kind==='grant'?'Dar producto':'Quitar producto',list.length?'<p>'+esc(u.display_name)+' · '+list.length+' productos disponibles</p><select data-dxua-product>'+list.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.title)+'</option>').join('')+'</select><p class="dxua-note">'+(kind==='grant'?'La asignación habilita la descarga directa.':'Solo revoca asignaciones directas; los accesos heredados de planes se gestionan desde Planes.')+'</p><button class="dxua-primary" data-dxua-save-product="'+esc(id)+'" data-kind="'+kind+'">'+(kind==='grant'?'Conceder acceso':'Revocar acceso')+'</button>':'<p>No hay productos '+(kind==='grant'?'disponibles para asignar':'asignados directamente')+' a este usuario.</p>');
 }else if(kind==='suspend'){
  if(u.role==='admin'){toast('No se puede suspender una cuenta administradora desde este panel.');return;}
  modal(u.active?'Suspender usuario':'Reactivar usuario','<p>'+(u.active?'El usuario perderá el acceso a las funciones de la tienda mientras esté suspendido.':'Se restaurará el acceso del usuario.')+'</p><label class="dxua-field">Motivo (opcional)<textarea data-dxua-reason maxlength="500" placeholder="Motivo administrativo…"></textarea></label><button class="dxua-danger" data-dxua-suspend="'+esc(id)+'" data-suspended="'+(u.active?'true':'false')+'">'+(u.active?'Confirmar suspensión':'Reactivar cuenta')+'</button>');
 }else if(kind==='logs'){
  modal('Registros de '+u.display_name,'<div class="dxua-loading">Consultando historial…</div>');
  const b=await db.rpc('dripx_admin_get_user_audit',{p_user_id:id});if(b.error){modal('Error de registros','<p>'+esc(b.error.message)+'</p>');return;}
  modal('Registros de '+u.display_name,(b.data||[]).length?'<div class="dxua-audit">'+b.data.map(x=>'<article><strong>'+esc(x.action)+'</strong><small>'+new Date(x.created_at).toLocaleString('es-DO')+'</small><pre>'+esc(JSON.stringify(x.details||{},null,2))+'</pre></article>').join('')+'</div>':'<p>Este usuario todavía no tiene acciones administrativas registradas.</p>');
 }
},true);
document.addEventListener('click',async e=>{
 const role=e.target.closest('[data-dxua-save-role]');const grant=e.target.closest('[data-dxua-save-product]');const suspend=e.target.closest('[data-dxua-suspend]');
 try{
  if(role){role.disabled=true;const {error}=await db.rpc('dripx_admin_set_user_role',{p_user_id:role.dataset.dxuaSaveRole,p_role:$('#dx-user-admin [data-dxua-role]').value});if(error)throw error;toast('Rol actualizado.');$('#dx-user-admin [data-dxua-modal]').hidden=true;await load(true);}
  if(grant){grant.disabled=true;const product=$('#dx-user-admin [data-dxua-product]').value;const rpc=grant.dataset.kind==='grant'?'dripx_admin_grant_user_product':'dripx_admin_revoke_user_product';const args=grant.dataset.kind==='grant'?{p_user_id:grant.dataset.dxuaSaveProduct,p_product_id:product}:{p_user_id:grant.dataset.dxuaSaveProduct,p_product_id:product,p_reason:'Revocado desde administración'};const {error}=await db.rpc(rpc,args);if(error)throw error;toast(grant.dataset.kind==='grant'?'Producto asignado.':'Producto revocado.');$('#dx-user-admin [data-dxua-modal]').hidden=true;}
  if(suspend){suspend.disabled=true;const {error}=await db.rpc('dripx_admin_set_user_suspension',{p_user_id:suspend.dataset.dxuaSuspend,p_suspended:suspend.dataset.suspended==='true',p_reason:$('#dx-user-admin [data-dxua-reason]')?.value||null});if(error)throw error;toast('Estado del usuario actualizado.');$('#dx-user-admin [data-dxua-modal]').hidden=true;await load(true);}
 }catch(err){toast(err.message||'La operación no pudo completarse.');if(role)role.disabled=false;if(grant)grant.disabled=false;if(suspend)suspend.disabled=false;}
},false);
function sync(){if(!isAdmin()||!isUsers()){$('#dx-user-admin')?.remove();return;}if(!$('#dx-user-admin'))load();}
document.addEventListener('click',e=>{const n=e.target.closest('#app a,#app button,#app [role="tab"]');if(!n||n.closest('#dx-user-admin'))return;const label=[n.textContent,n.getAttribute('data-admin-tab'),n.getAttribute('data-tab'),n.getAttribute('aria-label'),n.getAttribute('href')].join(' ').toLowerCase();if(/usuarios|users/.test(label)){window.DRIPX_ADMIN_USERS_TAB_ACTIVE=true;try{sessionStorage.setItem('dripx.admin.tab','usuarios');}catch{}setTimeout(sync,80);}else if(/productos|planes|pedidos|tickets|resenas|ajustes|configuracion|panel|inicio/.test(label)){window.DRIPX_ADMIN_USERS_TAB_ACTIVE=false;setTimeout(sync,80);}});
window.addEventListener('hashchange',()=>setTimeout(sync,100));
const ob=new MutationObserver(()=>{if(isAdmin()&&isUsers()&&!$('#dx-user-admin'))load();});const start=()=>{if($('#app'))ob.observe($('#app'),{childList:true,subtree:true});sync();};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();