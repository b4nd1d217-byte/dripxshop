(()=>{'use strict';
if(window.__DRIPX_ADMIN_EXTRA_INSTALLED)return;
window.__DRIPX_ADMIN_EXTRA_INSTALLED=true;
const db=window.DRIPX_SUPABASE_CLIENT;if(!db)return;
const ROOT='#dx-admin-extra',handled=new Set(['resumen','pedidos','categorias','ajustes']);
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const date=v=>v?new Date(v).toLocaleString('es-DO',{dateStyle:'medium',timeStyle:'short'}):'—';
const money=v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' USD';
const toast=m=>{const t=$('#toast');if(t){t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3600);}};
const state={route:'',busy:false,orders:[],items:[],profiles:new Map(),categories:[],catalog:[],settings:[]};
function currentRoute(){
 const h=String(location.hash||'').toLowerCase(),m=h.match(/^#admin\/([^/?#]+)/);
 if(!m)return h.startsWith('#admin')?'resumen':'';
 const key=norm(decodeURIComponent(m[1]));
 return ({categories:'categorias',category:'categorias',orders:'pedidos',order:'pedidos',settings:'ajustes',config:'ajustes',dashboard:'resumen',inicio:'resumen',panel:'resumen'})[key]||key;
}
function host(){let h=$(ROOT);if(!h){h=document.createElement('section');h.id=ROOT.slice(1);h.className='dxae-shell';$('#app')?.prepend(h);}return h;}
async function admin(){
 const s=await db.auth.getSession();if(s.error)throw s.error;
 if(!s.data?.session?.user?.id)throw new Error('La sesión de Discord no está disponible. Inicia sesión nuevamente.');
 const a=await db.rpc('dripx_is_admin');if(a.error)throw a.error;
 if(a.data!==true)throw new Error('Tu cuenta no tiene permisos administrativos.');
 return s.data.session.user;
}
function loading(title,detail){
 const h=host();h.innerHTML='<div class="dxae-loading"><span class="dxae-mark">DX</span><div><strong>'+esc(title)+'</strong><p>'+esc(detail||'Consultando datos reales de Supabase…')+'</p></div><span class="dxae-spinner"></span></div>';
}
function errorPage(title,error){
 const h=host();h.innerHTML='<div class="dxae-error"><span class="dxae-kicker">DRIP X SHOP / ADMINISTRACIÓN</span><h2>'+esc(title)+'</h2><p>'+esc(error?.message||String(error))+'</p><button type="button" class="dxae-primary" data-dxae-reload>↻ Reintentar</button></div>';console.error('[DRIPX admin extra]',error);
}
function heading(kicker,title,description,actions){
 return '<header class="dxae-head"><div><span class="dxae-kicker">'+esc(kicker)+'</span><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></div><div class="dxae-head-actions">'+(actions||'')+'</div></header>';
}
function stat(label,value,detail,icon){
 return '<article class="dxae-stat"><span class="dxae-stat-icon">'+esc(icon||'•')+'</span><div><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong><span>'+esc(detail||'Consulta real')+'</span></div></article>';
}
function btn(label,action,kind,attrs){
 return '<button type="button" class="dxae-'+(kind||'secondary')+'" data-dxae-'+action+' '+(attrs||'')+'>'+label+'</button>';
}
function modal(title,html){
 const h=host();let m=h.querySelector('[data-dxae-modal]');
 if(!m){m=document.createElement('div');m.className='dxae-modal-wrap';m.dataset.dxaeModal='';m.hidden=true;m.innerHTML='<section class="dxae-modal" role="dialog" aria-modal="true"><header><div><small>DRIP X SHOP / ADMINISTRACIÓN</small><h2 data-dxae-modal-title></h2></div><button type="button" data-dxae-close aria-label="Cerrar">×</button></header><div data-dxae-modal-body></div></section>';h.append(m);}
 m.querySelector('[data-dxae-modal-title]').textContent=title;m.querySelector('[data-dxae-modal-body]').innerHTML=html;m.hidden=false;
}
function closeModal(){const m=$(ROOT+' [data-dxae-modal]');if(m)m.hidden=true;}
function statusLabel(s){return ({pending:'Pendiente',approved:'Aprobado',rejected:'Rechazado',cancelled:'Cancelado'})[s]||s||'Desconocido';}
async function loadOverview(){
 loading('Resumen administrativo','Consultando usuarios, catálogo, ventas, tickets y reseñas.');
 const qs=await Promise.all([
  db.from('dripx_profiles').select('user_id',{count:'exact',head:true}),
  db.from('dripx_products').select('id',{count:'exact',head:true}),
  db.from('dripx_products').select('id',{count:'exact',head:true}).eq('status','published'),
  db.from('dripx_orders').select('id,total,status,user_id,created_at',{count:'exact'}).order('created_at',{ascending:false}).limit(8),
  db.from('tickets').select('id',{count:'exact',head:true}).in('status',['open','in_progress']),
  db.from('dripx_reviews').select('id',{count:'exact',head:true})
 ]);
 const labels=['Usuarios','Productos','Publicados','Pedidos','Tickets','Reseñas'];
 for(let i=0;i<qs.length;i++)if(qs[i].error)throw new Error(labels[i]+': '+qs[i].error.message);
 const [u,p,pub,o,t,r]=qs,orders=o.data||[],uids=[...new Set(orders.map(x=>x.user_id).filter(Boolean))];
 const profiles=uids.length?await db.from('dripx_profiles').select('user_id,display_name,discord_id').in('user_id',uids):{data:[],error:null};
 if(profiles.error)throw profiles.error;
 const names=new Map((profiles.data||[]).map(x=>[String(x.user_id),x]));
 const approved=orders.filter(x=>x.status==='approved');
 const recent=orders.map(x=>{const person=names.get(String(x.user_id))||{};return '<article class="dxae-order-row"><span class="dxae-order-avatar">'+esc((person.display_name||person.discord_id||'U').slice(0,1).toUpperCase())+'</span><div class="dxae-order-main"><strong>Pedido '+esc(String(x.id).slice(0,8).toUpperCase())+'</strong><small>'+esc(person.display_name||person.discord_id||'Usuario')+' · '+date(x.created_at)+'</small></div><span class="dxae-status is-'+esc(x.status)+'">'+esc(statusLabel(x.status))+'</span><b>'+money(x.total)+'</b></article>';}).join('');
 if(currentRoute()!=='resumen')return;
 const h=host();
 h.innerHTML=heading('CENTRO DE CONTROL','Resumen general','Indicadores y actividad obtenidos directamente de Supabase.',btn('↻ Actualizar','reload','secondary')+'<span class="dxae-live"><i></i> Conectado</span>')+
 '<div class="dxae-stats">'+stat('Usuarios',u.count??0,'Perfiles Discord','♙')+stat('Productos',p.count??0,'Recursos y planes','▣')+stat('Publicados',pub.count??0,'En la tienda','✓')+stat('Pedidos',o.count??0,'Registros totales','▤')+stat('Tickets abiertos',t.count??0,'Abiertos o en proceso','⌁')+stat('Reseñas',r.count??0,'Opiniones guardadas','☆')+'</div>'+
 '<div class="dxae-overview-grid"><section class="dxae-card"><header><div><small>VENTAS APROBADAS · ÚLTIMOS 8 PEDIDOS</small><h2>'+money(approved.reduce((n,x)=>n+Number(x.total||0),0))+'</h2></div><span class="dxae-card-icon">↗</span></header><p>Total de los pedidos aprobados dentro de la consulta reciente; no es un acumulado histórico global.</p>'+btn('Administrar pedidos','go-orders','primary')+'</section><section class="dxae-card"><header><div><small>ACTIVIDAD</small><h2>Pedidos recientes</h2></div><span class="dxae-card-icon">◷</span></header><div class="dxae-order-list">'+(recent||'<div class="dxae-empty">Todavía no hay pedidos.</div>')+'</div>'+btn('Ver todos los pedidos','go-orders','secondary')+'</section></div><p class="dxae-footnote">Los valores se calculan desde tablas reales. No se insertan registros de demostración.</p>';
}
async function loadOrders(){
 loading('Pedidos','Leyendo pedidos, artículos, clientes y adjuntos.');
 const result=await db.from('dripx_orders').select('id,user_id,total,status,customer_note,admin_note,created_at,approved_at,payment_proof_path,payment_proof_mime,payment_proof_uploaded_at').order('created_at',{ascending:false}).limit(250);
 if(result.error)throw result.error;
 const rows=result.data||[],ids=rows.map(x=>x.id),users=[...new Set(rows.map(x=>x.user_id).filter(Boolean))];
 const [items,profiles]=await Promise.all([
  ids.length?db.from('dripx_order_items').select('id,order_id,product_id,product_title,unit_price').in('order_id',ids):{data:[],error:null},
  users.length?db.from('dripx_profiles').select('user_id,discord_id,display_name,avatar_url').in('user_id',users):{data:[],error:null}
 ]);
 if(items.error)throw items.error;if(profiles.error)throw profiles.error;
 if(currentRoute()!=='pedidos')return;
 state.orders=rows;state.items=items.data||[];state.profiles=new Map((profiles.data||[]).map(x=>[String(x.user_id),x]));
 renderOrders();
}
function renderOrders(){
 const h=host(),q=norm($(ROOT+' [data-dxae-search]')?.value||''),filter=$(ROOT+' [data-dxae-status]')?.value||'all';
 const rows=state.orders.filter(o=>{
  const person=state.profiles.get(String(o.user_id))||{},names=state.items.filter(x=>x.order_id===o.id).map(x=>x.product_title).join(' ');
  return (filter==='all'||o.status===filter)&&(!q||norm([o.id,person.display_name,person.discord_id,names,o.status].join(' ')).includes(q));
 });
 const pending=state.orders.filter(x=>x.status==='pending').length,approved=state.orders.filter(x=>x.status==='approved').length,rejected=state.orders.filter(x=>x.status==='rejected').length;
 const body=rows.map(o=>{
  const person=state.profiles.get(String(o.user_id))||{},items=state.items.filter(x=>x.order_id===o.id),pending=o.status==='pending';
  return '<article class="dxae-table-row"><div><strong>#'+esc(String(o.id).slice(0,8).toUpperCase())+'</strong><small>'+esc(person.display_name||'Usuario Discord')+'</small><small>'+esc(person.discord_id||'ID no disponible')+'</small></div><div class="dxae-item-stack">'+(items.length?items.map(x=>'<span>'+esc(x.product_title)+' · '+money(x.unit_price)+'</span>').join(''):'<span>Sin líneas guardadas</span>')+'</div><div><strong>'+date(o.created_at)+'</strong><small>'+(o.payment_proof_path?'Comprobante adjunto':'Sin comprobante')+'</small></div><div><span class="dxae-status is-'+esc(o.status)+'">'+esc(statusLabel(o.status))+'</span></div><b>'+money(o.total)+'</b><div class="dxae-row-actions">'+btn('Ver','open-order','secondary','data-id="'+esc(o.id)+'"')+(pending?btn('Aprobar','approve-order','primary','data-id="'+esc(o.id)+'"')+btn('Rechazar','reject-order','danger','data-id="'+esc(o.id)+'"'):'')+'</div></article>';
 }).join('');
 h.innerHTML=heading('VENTAS / CONTROL DE PEDIDOS','Pedidos','Consulta detalles y comprobantes. Aprobar concede los accesos mediante la función segura de Supabase.',btn('↻ Actualizar','reload'))+
 '<div class="dxae-stats dxae-stats-compact">'+stat('Pendientes',pending,'Por revisar','◷')+stat('Aprobados',approved,'Accesos concedidos','✓')+stat('Rechazados',rejected,'No concedidos','×')+'</div>'+
 '<div class="dxae-toolbar"><label class="dxae-search">⌕ <input type="search" data-dxae-search placeholder="Buscar pedido, producto o usuario" value="'+esc(q)+'"></label><select data-dxae-status><option value="all">Todos los estados</option><option value="pending" '+(filter==='pending'?'selected':'')+'>Pendientes</option><option value="approved" '+(filter==='approved'?'selected':'')+'>Aprobados</option><option value="rejected" '+(filter==='rejected'?'selected':'')+'>Rechazados</option><option value="cancelled" '+(filter==='cancelled'?'selected':'')+'>Cancelados</option></select><span>'+rows.length+' resultados</span></div>'+
 '<div class="dxae-order-table"><div class="dxae-table-head"><span>PEDIDO / CLIENTE</span><span>ARTÍCULOS</span><span>FECHA</span><span>ESTADO</span><span>TOTAL</span><span>ACCIONES</span></div>'+(body||'<div class="dxae-empty">No hay pedidos para este filtro.</div>')+'</div>';
}
async function showOrder(id){
 const o=state.orders.find(x=>String(x.id)===String(id));if(!o)return;
 const p=state.profiles.get(String(o.user_id))||{},items=state.items.filter(x=>x.order_id===o.id);
 const itemHtml=items.length?items.map(x=>'<div><span>'+esc(x.product_title)+'</span><b>'+money(x.unit_price)+'</b></div>').join(''):'<p>Este pedido no tiene líneas de artículos.</p>';
 const proof=o.payment_proof_path?'<div class="dxae-loading-inline" data-dxae-proof-slot>Generando enlace privado temporal…</div>':'<div class="dxae-empty compact">No se adjuntó comprobante.</div>';
 modal('Pedido '+String(o.id).slice(0,8).toUpperCase(),'<div class="dxae-order-detail"><div class="dxae-detail-grid"><div><small>CLIENTE</small><b>'+esc(p.display_name||'Usuario Discord')+'</b></div><div><small>DISCORD ID</small><b>'+esc(p.discord_id||'No disponible')+'</b></div><div><small>ESTADO</small><b>'+esc(statusLabel(o.status))+'</b></div><div><small>TOTAL</small><b>'+money(o.total)+'</b></div><div><small>CREADO</small><b>'+date(o.created_at)+'</b></div><div><small>APROBADO</small><b>'+date(o.approved_at)+'</b></div></div><h3>Artículos</h3><div class="dxae-detail-items">'+itemHtml+'</div><h3>Notas</h3><p><b>Cliente:</b> '+esc(o.customer_note||'Sin nota')+'</p><p><b>Administración:</b> '+esc(o.admin_note||'Sin nota')+'</p><h3>Comprobante privado</h3>'+proof+'</div>');
 if(o.payment_proof_path){
  const signed=await db.storage.from('payment-proofs').createSignedUrl(o.payment_proof_path,180);
  const slot=$(ROOT+' [data-dxae-proof-slot]');
  if(slot)slot.innerHTML=signed.error?'<p class="dxae-inline-error">'+esc(signed.error.message)+'</p>':'<a class="dxae-proof-link" href="'+esc(signed.data.signedUrl)+'" target="_blank" rel="noopener noreferrer">Abrir comprobante ↗</a><small>'+esc(o.payment_proof_mime||'Archivo')+' · '+date(o.payment_proof_uploaded_at)+' · enlace temporal</small>';
 }
}
function orderAction(id,kind){
 const o=state.orders.find(x=>String(x.id)===String(id));if(!o||o.status!=='pending')return;
 const yes=kind==='approve';
 modal(yes?'Aprobar pedido':'Rechazar pedido','<form data-dxae-order-form data-id="'+esc(id)+'" data-kind="'+kind+'"><p>'+(yes?'Supabase aprobará el pedido y concederá los accesos de todos sus artículos.':'El pedido será rechazado y no se concederán accesos.')+'</p><label class="dxae-field">Nota administrativa<textarea name="note" maxlength="500" placeholder="Nota opcional para el historial"></textarea></label><div class="dxae-modal-actions"><button type="button" class="dxae-secondary" data-dxae-close>Cancelar</button><button type="submit" class="dxae-'+(yes?'primary':'danger')+'">'+(yes?'Confirmar aprobación':'Confirmar rechazo')+'</button></div></form>');
}
async function submitOrder(form){
 const id=form.dataset.id,kind=form.dataset.kind,note=String(new FormData(form).get('note')||'').trim(),submit=form.querySelector('[type="submit"]');
 if(submit)submit.disabled=true;
 try{
  await admin();
  const result=await db.rpc(kind==='approve'?'dripx_admin_approve_order':'dripx_admin_reject_order',{p_order_id:id,p_note:note});
  if(result.error)throw result.error;
  closeModal();toast(kind==='approve'?'Pedido aprobado; Supabase concedió los accesos.':'Pedido rechazado.');
  await loadOrders();
 }catch(e){toast(e.message||'No se pudo procesar el pedido.');if(submit)submit.disabled=false;}
}
async function loadCategories(){
 loading('Categorías','Consultando las categorías y sus productos relacionados.');
 const [c,p]=await Promise.all([
  db.from('dripx_categories').select('id,name,slug,active,sort_order,icon,created_at').order('sort_order',{ascending:true}).order('name'),
  db.from('dripx_products').select('id,title,category,store_category,product_type,status')
 ]);
 if(c.error)throw c.error;if(p.error)throw p.error;
 if(currentRoute()!=='categorias')return;
 state.categories=c.data||[];state.catalog=p.data||[];renderCategories();
}
function countCategory(c){
 return state.catalog.filter(p=>String(p.store_category||'').toLowerCase()===String(c.slug).toLowerCase()||String(p.category||'').toLowerCase()===String(c.name).toLowerCase()).length;
}
function renderCategories(){
 const active=state.categories.filter(c=>c.active).length,h=host();
 h.innerHTML=heading('CATÁLOGO / TAXONOMÍA','Categorías','Gestiona los registros de dripx_categories que alimentan los selectores del catálogo.',btn('+ Nueva categoría','new-category','primary')+btn('↻ Actualizar','reload'))+
 '<div class="dxae-stats dxae-stats-compact">'+stat('Categorías',state.categories.length,'Registros reales','▦')+stat('Activas',active,'Disponibles','✓')+stat('Elementos',state.catalog.length,'Productos y planes','▣')+'</div><div class="dxae-category-grid">'+
 (state.categories.length?state.categories.map(c=>{
  const n=countCategory(c),system=['planes','productos'].includes(String(c.slug).toLowerCase());
  return '<article class="dxae-category-card"><div class="dxae-category-top"><span class="dxae-category-icon">'+esc(c.icon||'▦')+'</span><span class="dxae-status '+(c.active?'is-approved':'is-muted')+'">'+(c.active?'Activa':'Inactiva')+'</span></div><h3>'+esc(c.name)+'</h3><small class="dxae-category-slug">/'+esc(c.slug)+'</small><div class="dxae-category-meta"><b>'+n+'</b><span>elementos vinculados</span><span>Orden '+Number(c.sort_order||0)+'</span></div><div class="dxae-category-actions">'+btn('Editar','edit-category','secondary','data-id="'+esc(c.id)+'"')+btn(c.active?'Desactivar':'Activar','toggle-category','secondary','data-id="'+esc(c.id)+'" data-active="'+(c.active?'true':'false')+'"')+btn('Eliminar','delete-category','danger','data-id="'+esc(c.id)+'" '+((n||system)?'disabled title="Categoría protegida o vinculada"':''))+'</div>'+(system?'<p class="dxae-category-hint">Categoría base protegida.</p>':'')+'</article>';
 }).join(''):'<div class="dxae-empty">No hay categorías guardadas. Crea una nueva para añadir opciones al catálogo.</div>')+'</div><p class="dxae-footnote">La base de datos bloquea la eliminación de categorías vinculadas, el apagado de categorías con productos publicados y los cambios de slug que rompan referencias.</p>';
}
function slugify(v){return norm(v).replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);}
function categoryForm(c){
 const id=c?.id||'',n=c?countCategory(c):0,locked=!!c&&n>0;
 modal(c?'Editar categoría':'Nueva categoría','<form data-dxae-category-form data-id="'+esc(id)+'"><div class="dxae-form-grid"><label>Nombre<input name="name" minlength="2" maxlength="40" required value="'+esc(c?.name||'')+'" placeholder="Nombre visible"></label><label>Slug<input name="slug" minlength="2" maxlength="40" pattern="[a-z0-9][a-z0-9_-]{1,39}" required value="'+esc(c?.slug||'')+'" '+(locked?'readonly':'')+'><small>'+(locked?'No editable porque existen elementos vinculados.':'Identificador interno único.')+'</small></label><label>Icono<input name="icon" maxlength="24" required value="'+esc(c?.icon||'▦')+'"></label><label>Orden<input name="sort_order" type="number" min="0" max="9999" step="1" value="'+esc(c?.sort_order??((state.categories.length+1)*10))+'"></label></div><div class="dxae-modal-actions"><button type="button" class="dxae-secondary" data-dxae-close>Cancelar</button><button type="submit" class="dxae-primary">'+(c?'Guardar cambios':'Crear categoría')+'</button></div></form>');
}
async function saveCategory(form){
 const d=new FormData(form),name=String(d.get('name')||'').trim(),slug=String(d.get('slug')||'').trim().toLowerCase(),icon=String(d.get('icon')||'').trim(),sort=Number(d.get('sort_order')||0),id=form.dataset.id||'';
 if(name.length<2||name.length>40)throw new Error('El nombre debe tener entre 2 y 40 caracteres.');
 if(!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(slug))throw new Error('El slug no cumple el formato requerido.');
 if(!icon||icon.length>24)throw new Error('El icono debe contener entre 1 y 24 caracteres.');
 if(!Number.isInteger(sort)||sort<0||sort>9999)throw new Error('El orden debe ser un entero entre 0 y 9999.');
 const old=state.categories.find(x=>String(x.id)===String(id));
 if(old&&countCategory(old)>0&&old.slug!==slug)throw new Error('No cambies el slug mientras existan elementos asociados.');
 const payload={name,slug,icon,sort_order:sort};
 const saved=id?await db.from('dripx_categories').update(payload).eq('id',id).select('id').single():await db.from('dripx_categories').insert(payload).select('id').single();
 if(saved.error)throw saved.error;
 closeModal();toast(id?'Categoría actualizada.':'Categoría creada.');await loadCategories();
}
async function toggleCategory(id,active){
 const c=state.categories.find(x=>String(x.id)===String(id));if(!c)return;
 if(active&&state.catalog.some(p=>p.status==='published'&&String(p.category||'').toLowerCase()===String(c.name).toLowerCase()))throw new Error('No se puede desactivar una categoría con productos publicados.');
 const r=await db.from('dripx_categories').update({active:!active}).eq('id',id).select('id').single();
 if(r.error)throw r.error;toast(active?'Categoría desactivada.':'Categoría activada.');await loadCategories();
}
async function deleteCategory(id){
 const c=state.categories.find(x=>String(x.id)===String(id));if(!c)return;
 if(['planes','productos'].includes(String(c.slug).toLowerCase()))throw new Error('Esta categoría base está protegida.');
 if(countCategory(c)>0)throw new Error('No se puede eliminar una categoría con productos asociados.');
 if(!confirm('¿Eliminar definitivamente la categoría '+c.name+'?'))return;
 const r=await db.from('dripx_categories').delete().eq('id',id).select('id').maybeSingle();
 if(r.error)throw r.error;if(!r.data?.id)throw new Error('Supabase no confirmó la eliminación.');
 toast('Categoría eliminada.');await loadCategories();
}
async function loadSettings(){
 loading('Ajustes generales','Leyendo los valores persistidos en dripx_settings.');
 const r=await db.from('dripx_settings').select('key,value,updated_at,updated_by').order('key');
 if(r.error)throw r.error;if(currentRoute()!=='ajustes')return;state.settings=r.data||[];renderSettings();
}
function renderSettings(){
 const invite=state.settings.find(x=>x.key==='discord_invite')||{value:''},h=host();
 h.innerHTML=heading('SISTEMA / CONFIGURACIÓN','Ajustes generales','Edita los ajustes que ya están persistidos. Los logs Discord tienen su sección propia.',btn('↻ Actualizar','reload'))+
 '<section class="dxae-settings-card"><div class="dxae-settings-title"><span class="dxae-card-icon">◎</span><div><small>COMUNIDAD / DISCORD</small><h2>Enlace de invitación</h2><p>Enlace que utiliza la tienda para enviar visitantes a tu comunidad.</p></div></div><form data-dxae-setting-form><label class="dxae-field">URL de invitación<input name="discord_invite" type="url" maxlength="500" required value="'+esc(invite.value||'')+'" placeholder="https://discord.gg/…"></label><button type="submit" class="dxae-primary">Guardar configuración</button><small>Actualizado: '+date(invite.updated_at)+'</small></form></section><section class="dxae-settings-card"><div class="dxae-settings-title"><span class="dxae-card-icon">⌘</span><div><small>VALORES PERSISTIDOS</small><h2>Configuraciones almacenadas</h2><p>Claves existentes en la base de datos.</p></div></div><div class="dxae-settings-list">'+(state.settings.length?state.settings.map(s=>'<article><b>'+esc(s.key)+'</b><span>'+esc(s.key==='discord_invite'?'Invitación de Discord':s.value)+'</span><small>'+date(s.updated_at)+'</small></article>').join(''):'<div class="dxae-empty">No hay otras configuraciones guardadas.</div>')+'</div></section>';
}
async function saveSettings(form){
 const value=String(new FormData(form).get('discord_invite')||'').trim();
 if(!/^https:\/\/(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+\/?$/i.test(value))throw new Error('Introduce una invitación de Discord válida.');
 const user=await admin();
 const r=await db.from('dripx_settings').upsert({key:'discord_invite',value,updated_at:new Date().toISOString(),updated_by:user.id},{onConflict:'key'}).select('key').single();
 if(r.error)throw r.error;toast('Ajustes guardados.');await loadSettings();
}
async function loadRoute(route,force){
 if(!handled.has(route)||state.busy&&!force)return;
 if(!force&&state.route===route&&$(ROOT)?.dataset.loaded==='1')return;
 state.busy=true;state.route=route;
 try{
  await admin();
  if(route==='resumen')await loadOverview();
  if(route==='pedidos')await loadOrders();
  if(route==='categorias')await loadCategories();
  if(route==='ajustes')await loadSettings();
  const h=$(ROOT);if(h)h.dataset.loaded='1';
 }catch(e){errorPage('No se pudo cargar '+route,e);}
 finally{state.busy=false;if(currentRoute()!==route){state.route='';setTimeout(sync,0);}}
}
function sync(){
 const route=currentRoute();
 if(window.DRIPX_IS_ADMIN!==true||!handled.has(route)){if($(ROOT))$(ROOT).remove();state.route='';return;}
 host();void loadRoute(route,false);
}
document.addEventListener('click',async e=>{
 const n=e.target.closest(ROOT+' [data-dxae-reload]');if(n){e.preventDefault();state.route='';await loadRoute(currentRoute(),true);return;}
 if(e.target.closest(ROOT+' [data-dxae-close]')){closeModal();return;}
 if(e.target.closest(ROOT+' [data-dxae-go-orders]')){window.DRIPX_ADMIN_NAVIGATE?.('pedidos');return;}
 const create=e.target.closest(ROOT+' [data-dxae-new-category]');if(create){categoryForm(null);return;}
 const edit=e.target.closest(ROOT+' [data-dxae-edit-category]');if(edit){const c=state.categories.find(x=>String(x.id)===String(edit.dataset.id));if(c)categoryForm(c);return;}
 const toggle=e.target.closest(ROOT+' [data-dxae-toggle-category]');if(toggle){toggle.disabled=true;try{await toggleCategory(toggle.dataset.id,toggle.dataset.active==='true');}catch(err){toast(err.message||'No se pudo actualizar.');}finally{toggle.disabled=false;}return;}
 const del=e.target.closest(ROOT+' [data-dxae-delete-category]');if(del){del.disabled=true;try{await deleteCategory(del.dataset.id);}catch(err){toast(err.message||'No se pudo eliminar.');}finally{del.disabled=false;}return;}
 const open=e.target.closest(ROOT+' [data-dxae-open-order]');if(open){try{await showOrder(open.dataset.id);}catch(err){toast(err.message||'No se pudo abrir el pedido.');}return;}
 const approve=e.target.closest(ROOT+' [data-dxae-approve-order]');if(approve){orderAction(approve.dataset.id,'approve');return;}
 const reject=e.target.closest(ROOT+' [data-dxae-reject-order]');if(reject){orderAction(reject.dataset.id,'reject');return;}
},true);
document.addEventListener('input',e=>{
 if(e.target.matches(ROOT+' [data-dxae-search]')){
  const position=e.target.selectionStart;renderOrders();
  const input=$(ROOT+' [data-dxae-search]');if(input){input.focus();try{input.setSelectionRange(position,position);}catch{}}
  return;
 }
 if(e.target.matches(ROOT+' [data-dxae-category-form] [name="name"]')){
  const slug=e.target.closest('form').querySelector('[name="slug"]');
  if(slug&&!slug.readOnly&&!slug.dataset.edited)slug.value=slugify(e.target.value);
 }
 if(e.target.matches(ROOT+' [data-dxae-category-form] [name="slug"]'))e.target.dataset.edited='true';
});
document.addEventListener('change',e=>{if(e.target.matches(ROOT+' [data-dxae-status]'))renderOrders();});
document.addEventListener('submit',async e=>{
 const c=e.target.closest(ROOT+' [data-dxae-category-form]'),o=e.target.closest(ROOT+' [data-dxae-order-form]'),s=e.target.closest(ROOT+' [data-dxae-setting-form]');
 const f=c||o||s;if(!f)return;e.preventDefault();
 const b=f.querySelector('[type="submit"]');if(b)b.disabled=true;
 try{if(c)await saveCategory(f);else if(o)await submitOrder(f);else await saveSettings(f);}
 catch(err){toast(err.message||'No se pudo guardar.');if(b)b.disabled=false;}
},true);
window.addEventListener('hashchange',()=>setTimeout(sync,80));
window.addEventListener('dripx:admin-ready',()=>setTimeout(sync,80));
window.addEventListener('dripx:admin-route',sync);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
setTimeout(sync,300);setTimeout(sync,1000);
})();