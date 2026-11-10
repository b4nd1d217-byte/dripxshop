(()=>{'use strict';
if(window.__DRIPX_USER_ADMIN_ACTIONS_INSTALLED)return;
window.__DRIPX_USER_ADMIN_ACTIONS_INSTALLED=true;
const db=window.DRIPX_SUPABASE_CLIENT;if(!db)return;
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=m=>{const t=$('#toast');if(t){t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3200);}};
async function admin(){
 const s=await db.auth.getSession();if(s.error)throw s.error;
 if(!s.data?.session?.user?.id)throw new Error('Sesión administrativa no disponible.');
 const a=await db.rpc('dripx_is_admin');if(a.error)throw a.error;
 if(a.data!==true)throw new Error('Solo administración puede gestionar usuarios.');
}
function users(){return Array.isArray(window.__DRIPX_ADMIN_USER_CACHE)?window.__DRIPX_ADMIN_USER_CACHE:[];}
function install(){
 const root=$('#dx-user-admin');if(!root)return;
 root.querySelectorAll('.dxua-menu[data-dxua-menu-panel]').forEach(menu=>{
  const id=menu.dataset.dxuaMenuPanel;
  if(!menu.querySelector('[data-dxua-extra-action="details"]')){
   const b=document.createElement('button');b.type='button';b.dataset.dxuaExtraAction='details';b.dataset.userId=id;b.textContent='▤ Compras y productos';menu.append(b);
  }
  if(!menu.querySelector('[data-dxua-extra-action="transfer"]')){
   const b=document.createElement('button');b.type='button';b.dataset.dxuaExtraAction='transfer';b.dataset.userId=id;b.textContent='⇄ Transferir producto';menu.append(b);
  }
 });
}
function modal(title,html){
 const root=$('#dx-user-admin'),w=root?.querySelector('[data-dxua-modal]'),t=w?.querySelector('[data-dxua-title]'),b=w?.querySelector('[data-dxua-body]');
 if(!w||!t||!b)throw new Error('No se encontró el panel de usuarios.');
 t.textContent=title;b.innerHTML=html;w.hidden=false;
}
async function getUser(id){
 await admin();
 let u=users().find(x=>String(x.user_id)===String(id));
 if(!u){const result=await db.rpc('dripx_admin_list_users');if(result.error)throw result.error;u=(result.data||[]).find(x=>String(x.user_id)===String(id));}
 if(!u)throw new Error('Usuario no encontrado.');
 return u;
}
async function details(id){
 const u=await getUser(id);
 modal('Compras y productos · '+(u.display_name||'Usuario'),'<div class="dxua-loading">Consultando historial y accesos en Supabase…</div>');
 const [access,plans,orders]=await Promise.all([
  db.rpc('dripx_admin_get_user_products',{p_user_id:id}),
  db.from('dripx_user_plans').select('product_id,plan_code,active,expires_at,admin_transferred').eq('user_id',id).order('created_at',{ascending:false}).limit(100),
  db.from('dripx_orders').select('id,total,status,created_at,payment_proof_uploaded_at').eq('user_id',id).order('created_at',{ascending:false}).limit(100)
 ]);
 for(const result of [access,plans,orders])if(result.error)throw result.error;
 const direct=(access.data||[]).filter(x=>x.access_source==='direct');
 const viaPlan=(access.data||[]).filter(x=>x.access_source==='plan');
 const productRows=direct.map(x=>'<article class="dxua-extra-row"><strong>'+esc(x.title||'Producto')+'</strong><small>'+esc(x.status||'Acceso directo')+' · '+esc(x.product_type||'resource')+'</small></article>').join('');
 const planRows=viaPlan.map(x=>'<article class="dxua-extra-row"><strong>'+esc(x.title||'Producto incluido')+'</strong><small>Incluido por plan'+(x.expires_at?' · vence '+new Date(x.expires_at).toLocaleString('es-DO'):'')+'</small></article>').join('');
 const membershipRows=(plans.data||[]).map(x=>'<article class="dxua-extra-row"><strong>Plan '+esc(x.plan_code||'')+'</strong><small>'+(x.active?'Activo':'Inactivo')+(x.expires_at?' · vence '+new Date(x.expires_at).toLocaleString('es-DO'):'')+(x.admin_transferred?' · Transferido':'')+'</small></article>').join('');
 const orderRows=(orders.data||[]).map(x=>'<article class="dxua-extra-order"><strong>Pedido '+esc(String(x.id).slice(0,8).toUpperCase())+' · $'+Number(x.total||0).toFixed(2)+' USD</strong><span>'+esc(x.status)+' · '+new Date(x.created_at).toLocaleString('es-DO')+'</span><small>'+(x.payment_proof_uploaded_at?'Comprobante recibido':'Sin comprobante cargado')+'</small></article>').join('');
 modal('Compras y productos · '+(u.display_name||'Usuario'),
 '<div class="dxua-extra-history"><div class="dxua-extra-summary"><span><b>'+direct.length+'</b> productos directos</span><span><b>'+viaPlan.length+'</b> recursos por plan</span><span><b>'+(orders.data||[]).length+'</b> pedidos</span></div>'+
 '<h4>Productos directos</h4>'+(productRows||'<p>Sin productos directos.</p>')+
 '<h4>Productos incluidos por planes</h4>'+(planRows||'<p>Sin recursos de planes activos.</p>')+
 '<h4>Planes registrados</h4>'+(membershipRows||'<p>Sin planes registrados.</p>')+
 '<h4>Historial de compras</h4>'+(orderRows||'<p>Sin pedidos registrados.</p>')+'</div>');
}
async function transfer(id){
 const u=await getUser(id);
 const [ent,products,people]=await Promise.all([
  db.from('dripx_entitlements').select('product_id').eq('user_id',id).eq('active',true),
  db.from('dripx_products').select('id,title,product_type,status').eq('product_type','resource').order('title'),
  db.rpc('dripx_admin_list_users')
 ]);
 for(const result of [ent,products,people])if(result.error)throw result.error;
 const owned=new Set((ent.data||[]).map(x=>String(x.product_id)));
 const choices=(products.data||[]).filter(x=>owned.has(String(x.id)));
 const targets=(people.data||[]).filter(x=>x.active&&String(x.user_id)!==String(id));
 modal('Transferir producto · '+(u.display_name||'Usuario'),
 choices.length&&targets.length
 ?'<p>La transferencia mueve el acceso directo y su licencia asociada al nuevo propietario. El historial del pedido original se conserva.</p>'+
 '<label class="dxua-field">Producto<select data-dxua-extra-product>'+choices.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.title)+'</option>').join('')+'</select></label>'+
 '<label class="dxua-field">Nuevo propietario<select data-dxua-extra-target><option value="">Selecciona un usuario</option>'+targets.map(x=>'<option value="'+esc(x.user_id)+'">'+esc(x.display_name)+(x.discord_id?' · '+esc(x.discord_id):'')+'</option>').join('')+'</select></label>'+
 '<button type="button" class="dxua-primary" data-dxua-extra-transfer="'+esc(id)+'">Confirmar transferencia</button>'
 :'<p>'+(choices.length?'No hay otros usuarios activos para recibir este producto.':'Este usuario no tiene productos directos activos para transferir. Los recursos heredados de planes se gestionan desde Planes.')+'</p>');
}
document.addEventListener('click',async event=>{
 const action=event.target.closest('#dx-user-admin [data-dxua-extra-action]');
 if(action){
  event.preventDefault();event.stopImmediatePropagation();
  document.querySelectorAll('#dx-user-admin .dxua-menu').forEach(x=>x.hidden=true);
  try{
   if(action.dataset.dxuaExtraAction==='details')await details(action.dataset.userId);
   else await transfer(action.dataset.userId);
  }catch(error){toast(error.message||'No se pudo completar la operación.');}
  return;
 }
 const confirm=event.target.closest('#dx-user-admin [data-dxua-extra-transfer]');
 if(confirm){
  event.preventDefault();event.stopImmediatePropagation();confirm.disabled=true;
  try{
   await admin();
   const product=$('#dx-user-admin [data-dxua-extra-product]')?.value,target=$('#dx-user-admin [data-dxua-extra-target]')?.value;
   if(!product||!target)throw new Error('Selecciona producto y destinatario.');
   const result=await db.rpc('dripx_admin_transfer_user_product',{p_from_user_id:confirm.dataset.dxuaExtraTransfer,p_to_user_id:target,p_product_id:product});
   if(result.error)throw result.error;
   if(result.data?.ok!==true)throw new Error('Supabase no confirmó la transferencia.');
   toast('Producto transferido correctamente; historial y licencias sincronizados.');
   $('#dx-user-admin [data-dxua-modal]').hidden=true;
   $('#dx-user-admin [data-dxua-reload]')?.click();
  }catch(error){toast(error.message||'No se pudo transferir el producto.');confirm.disabled=false;}
 }
},true);
let observer=null;
function start(){
 const app=$('#app');
 if(app&&!observer){observer=new MutationObserver(install);observer.observe(app,{childList:true,subtree:true});}
 install();
}
window.addEventListener('dripx:admin-users-view',install);
window.addEventListener('dripx:admin-route',event=>{if(event.detail?.route==='usuarios')install();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();