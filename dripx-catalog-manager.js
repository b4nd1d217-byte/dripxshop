(()=>{'use strict';
const db=window.DRIPX_SUPABASE_CLIENT;
window.__DRIPX_CATALOG_MANAGER_ACTIVE=true;
if(!db)return;
const ROOT='#dx-catalog-admin';
let products=[],mappings=[],categories=[],busy=false,loading=false;
let managedProductForm=null,productFormOrigin=null,manualExit=false;
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notify=message=>{const t=$('#toast');if(t){t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3400);}};
const normalize=v=>String(v||'').trim().toLowerCase();
const timed=(promise,ms,message)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(message)),ms);Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
function activeCatalogMode(){
 const hash=String(location.hash||'').toLowerCase();
 let tab='';try{tab=sessionStorage.getItem('dripx.admin.tab')||'';}catch{}
 if(/^#admin\/planes(?:$|[/?])/.test(hash)||tab==='planes'||window.DRIPX_ADMIN_CATALOG_MODE==='planes')return 'planes';
 return 'productos';
}
function activeView(){
 if(manualExit&&window.DRIPX_ADMIN_PRODUCTS_TAB_ACTIVE!==true)return false;
 if(window.DRIPX_ADMIN_PRODUCTS_TAB_ACTIVE===true)manualExit=false;
 const hash=String(location.hash||'').toLowerCase();
 let tab='';try{tab=sessionStorage.getItem('dripx.admin.tab')||'';}catch{}
 const tracked=window.DRIPX_ADMIN_PRODUCTS_TAB_ACTIVE===true||tab==='productos'||tab==='planes';
 const explicit=/^#admin(?:\/(?:productos|planes))(?:$|[/?])/.test(hash);
 const activeNav=[...document.querySelectorAll('#app button.active,#app a.active,#app [role="tab"][aria-selected="true"],#app [aria-current="page"]')].some(n=>!n.closest('[hidden]')&&!n.closest(ROOT)&&/productos|planes/.test([n.textContent,n.getAttribute('data-admin-tab'),n.getAttribute('data-tab'),n.getAttribute('aria-label'),n.getAttribute('href')].join(' ').toLowerCase()));
 return hash.startsWith('#admin')&&(tracked||explicit||activeNav);
}
function rememberProductForm(form){
 if(!form)return;
 if(!managedProductForm){managedProductForm=form;productFormOrigin={parent:form.parentNode,next:form.nextSibling};}
 else if(form!==managedProductForm)form.remove();
}
function mountProductForm(){
 const slot=$(ROOT+' #dxcm-product-form-host');if(!slot)return;
 const found=$('#product-form');if(found&&!found.closest(ROOT))rememberProductForm(found);
 const missing=$(ROOT+' [data-dxcm-form-missing]');
 if(!managedProductForm){if(missing)missing.hidden=false;return;}
 if(managedProductForm.parentNode!==slot)slot.append(managedProductForm);
 managedProductForm.hidden=false;managedProductForm.classList.remove('hidden');managedProductForm.removeAttribute('aria-hidden');
 managedProductForm.dataset.dxcmManaged='true';
 if(missing)missing.hidden=true;
}
function takeOverLegacySurface(){
 const app=$('#app');if(!app)return;
 const candidate=$('#product-form');if(candidate&&!candidate.closest(ROOT))rememberProductForm(candidate);
 for(const child of Array.from(app.children)){
  if(child.id===ROOT)continue;
  if(!child.hasAttribute('data-dxcm-legacy-hidden')){
   child.setAttribute('data-dxcm-legacy-hidden','1');
   child.setAttribute('data-dxcm-prev-hidden',child.hidden?'1':'0');
   child.setAttribute('data-dxcm-prev-aria',child.hasAttribute('aria-hidden')?child.getAttribute('aria-hidden'):'__none__');
  }
  child.hidden=true;child.setAttribute('aria-hidden','true');
 }
 mountProductForm();
}
function restoreLegacySurface(){
 const form=managedProductForm,origin=productFormOrigin;
 if(form&&form.closest(ROOT)){
  if(origin&&origin.parent&&origin.parent.isConnected){
   if(origin.next&&origin.next.parentNode===origin.parent)origin.parent.insertBefore(form,origin.next);
   else origin.parent.append(form);
  }else form.remove();
 }
 document.querySelectorAll('#app [data-dxcm-legacy-hidden="1"]').forEach(node=>{
  node.hidden=node.getAttribute('data-dxcm-prev-hidden')==='1';
  const aria=node.getAttribute('data-dxcm-prev-aria');
  if(aria==='__none__')node.removeAttribute('aria-hidden');else if(aria!==null)node.setAttribute('aria-hidden',aria);
  node.removeAttribute('data-dxcm-legacy-hidden');node.removeAttribute('data-dxcm-prev-hidden');node.removeAttribute('data-dxcm-prev-aria');
 });
}
function planProducts(){return products.filter(p=>p.product_type==='plan'&&p.category==='Planes');}
function resourceProducts(){return products.filter(p=>p.product_type==='resource'&&p.category==='Productos');}
function selectedResources(planId){return mappings.filter(m=>String(m.plan_product_id)===String(planId)).map(m=>String(m.resource_product_id));}
function imageFor(p){const source=p.image_url||p.catalogImageUrl||'';return source&&/^https:\/\//i.test(source)?'<img src="'+esc(source)+'" alt="" loading="lazy">':'<span class="dxcm-art">'+(p.product_type==='plan'?'✦':'▣')+'</span>';}
function money(n){return '$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function row(p){
 const isPlan=p.product_type==='plan',hidden=p.status==='archived',draft=p.status==='draft',linked=isPlan?selectedResources(p.id).length:0;
 const categoryLabel=categories.find(category=>String(category.slug)===String(p.store_category))?.name||p.store_category||'Sin categoría';
 const info=isPlan?(esc(p.billing_period||'Periodo sin configurar')+' · '+linked+' productos incluidos'):(esc(categoryLabel)+' · '+(p.file_path?'ZIP listo · MTA:SA':'ZIP pendiente · No publicable'));
 return '<article class="dxcm-row" data-item-id="'+esc(p.id)+'" data-item-type="'+(isPlan?'plan':'resource')+'">'+
  '<div class="dxcm-thumb">'+imageFor(p)+'</div><div class="dxcm-main"><div class="dxcm-title-line"><strong>'+esc(p.title)+'</strong><span class="dxcm-status '+(hidden?'is-hidden':draft?'is-draft':'is-live')+'">'+(hidden?'Oculto':draft?'Borrador':'Publicado')+'</span></div>'+
  '<p>'+esc(p.tagline||p.description||'Sin descripción')+'</p><small>'+info+'</small></div>'+
  '<div class="dxcm-price">'+money(p.price_usd)+'<small>USD</small></div>'+
  '<div class="dxcm-menu-wrap"><button type="button" class="dxcm-more" data-dxcm-menu="'+esc(p.id)+'" aria-label="Opciones de '+esc(p.title)+'">···</button>'+
  '<div class="dxcm-menu" data-dxcm-menu-panel="'+esc(p.id)+'" hidden>'+
   '<button type="button" data-dxcm-action="sales" data-id="'+esc(p.id)+'">▤ Ver compras y ventas</button>'+
   '<button type="button" data-dxcm-action="buyers" data-id="'+esc(p.id)+'">♙ Usuarios con acceso</button>'+
   (isPlan?'':'<button type="button" data-dxcm-action="inspect-zip" data-id="'+esc(p.id)+'" '+(!p.file_path?'disabled':'')+'>▣ Gestionar ZIP · Leer archivos</button>')+
   '<button type="button" data-dxcm-action="status" data-id="'+esc(p.id)+'" data-next="'+(p.status==='published'?'archived':'published')+'">'+(p.status==='published'?'◉ Ocultar':'✓ Publicar')+'</button>'+
   '<button type="button" data-dxcm-action="edit" data-id="'+esc(p.id)+'">✎ Editar configuración</button>'+
   '<button type="button" class="is-danger" data-dxcm-action="delete" data-id="'+esc(p.id)+'">⌫ Eliminar / retirar</button>'+
  '</div></div></article>';
}
function render(){
 let host=$(ROOT);if(!host)return;
 const mode=activeCatalogMode();
 const plans=planProducts().sort((a,b)=>a.sort_order-b.sort_order||a.title.localeCompare(b.title));
 const resources=resourceProducts().sort((a,b)=>a.sort_order-b.sort_order||a.title.localeCompare(b.title));
 const currentForm=$('#product-form');if(currentForm&&!currentForm.closest(ROOT))rememberProductForm(currentForm);
 if(mode==='planes'&&managedProductForm&&managedProductForm.closest(ROOT)){
  const form=managedProductForm,origin=productFormOrigin;
  if(origin&&origin.parent&&origin.parent.isConnected){
   if(origin.next&&origin.next.parentNode===origin.parent)origin.parent.insertBefore(form,origin.next);
   else origin.parent.append(form);
  }else form.remove();
  form.hidden=false;form.classList.remove('hidden');form.removeAttribute('aria-hidden');delete form.dataset.dxcmManaged;
 }
 const header='<header class="dxcm-heading"><div><span class="dxcm-kicker">DRIP X SHOP · ADMINISTRACIÓN</span><h2>'+(mode==='planes'?'Planes de acceso':'Productos descargables')+'</h2><p>'+(mode==='planes'?'Configura duración, precio y recursos incluidos. Los planes agrupan productos publicados y nunca reciben archivos ZIP.':'Publica recursos MTA:SA. Inspecciona, protege y compila los ZIP antes de habilitar su descarga.')+'</p></div><div class="dxcm-heading-actions"><button type="button" class="dxcm-return" data-dxcm-back>← Volver al resumen</button></div><div class="dxcm-totals">'+(mode==='planes'?'<div><b>'+plans.length+'</b><span>Planes</span></div>':'<div><b>'+resources.length+'</b><span>Productos</span></div>')+'</div></header>';
 const productsView='<section class="dxcm-create-product"><header><div><span class="dxcm-section-mark">PUBLICACIÓN DE RECURSOS</span><h3>Crear o publicar producto</h3><p>El formulario conserva el flujo de inspección, protección y compilación. Los archivos shared y de configuración se mantienen intactos.</p></div></header><div id="dxcm-product-form-host"></div><div class="dxcm-form-missing" data-dxcm-form-missing hidden><strong>El formulario no se ha podido recuperar todavía.</strong><p>La aplicación está reconstruyendo el editor de Productos. Vuelve a intentar sincronizar el panel.</p><button type="button" data-dxcm-reload>↻ Reintentar</button></div></section>'+
 '<section class="dxcm-section"><header><div><span class="dxcm-section-mark">INVENTARIO / MTA:SA</span><h3>Productos descargables</h3><p>Recursos independientes dentro de la categoría Productos.</p></div><div class="dxcm-section-menu-wrap"><button type="button" class="dxcm-section-more" data-dxcm-section-menu="products" aria-label="Opciones de Productos">···</button><div class="dxcm-section-menu" data-dxcm-section-menu-panel="products" hidden><button type="button" data-dxcm-section-action="create-product">＋ Crear producto</button></div></div></header>'+
 (resources.length?'<div class="dxcm-list">'+resources.map(row).join('')+'</div>':'<div class="dxcm-empty"><span>▣</span><strong>Aún no hay productos descargables</strong><p>Crea tu primer recurso desde el formulario y completa la inspección y protección ZIP antes de publicarlo.</p></div>')+'</section>';
 const plansView='<section class="dxcm-section"><header><div><span class="dxcm-section-mark">ACCESO / MEMBRESÍAS</span><h3>Planes</h3><p>Precio, duración, presentación y productos incluidos. Un plan nunca almacena ni recibe archivos ZIP.</p></div><div class="dxcm-section-menu-wrap"><button type="button" class="dxcm-section-more" data-dxcm-section-menu="plans" aria-label="Opciones de Planes">···</button><div class="dxcm-section-menu" data-dxcm-section-menu-panel="plans" hidden><button type="button" data-dxcm-section-action="create-plan">＋ Crear plan</button></div></div></header>'+
 (plans.length?'<div class="dxcm-list">'+plans.map(row).join('')+'</div>':'<div class="dxcm-empty"><span>✦</span><strong>No hay planes creados</strong><p>Crea un plan y selecciona únicamente productos descargables ya publicados con ZIP disponible.</p><button type="button" data-dxcm-section-action="create-plan">＋ Crear primer plan</button></div>')+'</section>';
 const footnote='<div class="dxcm-footnote"><span>i</span><p>Los cambios usan permisos administrativos de Supabase. Los productos ocultos conservan historial y asignaciones existentes.</p></div>';
 const modal='<div class="dxcm-backdrop" data-dxcm-modal hidden><section class="dxcm-modal" role="dialog" aria-modal="true" aria-labelledby="dxcm-modal-title"><header><div><small>CONFIGURACIÓN DEL CATÁLOGO</small><h3 id="dxcm-modal-title">Editar elemento</h3></div><button type="button" data-dxcm-close aria-label="Cerrar">×</button></header><div data-dxcm-body></div></section></div>';
 host.innerHTML=header+(mode==='planes'?plansView:productsView)+footnote+modal;
 host.dataset.view=mode;
 if(mode==='productos')mountProductForm();
}
async function load(){
 if(loading||!activeView())return;loading=true;
 const shell=$(ROOT);if(shell)shell.dataset.loaded='loading';
 try{
  const {data:session,error:sessionError}=await timed(db.auth.getSession(),8000,'La sesión de Supabase no respondió. Pulsa Reintentar.');
  if(sessionError)throw sessionError;
  if(!session?.session?.user?.id)throw new Error('Inicia sesión con Discord para administrar el catálogo.');
  const admin=await timed(db.rpc('dripx_is_admin'),8000,'La comprobación de permisos tardó demasiado.');
  if(admin.error)throw admin.error;if(admin.data!==true)throw new Error('Tu cuenta no tiene permisos de administración.');
  const [p,m,categoryResult]=await timed(Promise.all([
   db.from('dripx_products').select('id,title,description,price_usd,category,store_category,status,product_type,plan_code,billing_period,features,tagline,image_url,image_path,video_url,video_path,file_path,protection_enabled,sort_order').order('sort_order').order('created_at',{ascending:false}).limit(300),
   db.from('dripx_plan_resources').select('plan_product_id,resource_product_id').limit(1500),
   db.from('dripx_categories').select('name,slug,active,sort_order').eq('active',true).order('sort_order',{ascending:true}).limit(100)
  ]),16000,'El catálogo tardó demasiado en responder. Pulsa Reintentar.');
  if(p.error)throw p.error;if(m.error)throw m.error;if(categoryResult.error)throw categoryResult.error;
  products=p.data||[];mappings=m.data||[];categories=categoryResult.data||[];
  const thumbnails=products.filter(item=>!item.image_url&&item.image_path).slice(0,24);
  await Promise.all(thumbnails.map(async item=>{
   try{
    const signed=await timed(db.storage.from('product-images').createSignedUrl(item.image_path,900),5000,'image_timeout');
    if(!signed.error)item.catalogImageUrl=signed.data?.signedUrl||null;
   }catch(error){console.warn('[DRIPX] Miniatura omitida:',item.id,error?.message||error);}
  }));
  products=products.filter(p=>(p.product_type==='plan'&&p.category==='Planes')||(p.product_type==='resource'&&p.category==='Productos'));
  if(!activeView())return;
  render();const panel=$(ROOT);if(panel)panel.dataset.loaded='1';
 }catch(e){const panel=$(ROOT);if(panel){panel.dataset.loaded='error';panel.innerHTML='<div class="dxcm-error"><strong>No se pudo sincronizar el catálogo</strong><p>'+esc(e.message||'Error de Supabase')+'</p><button type="button" data-dxcm-reload>↻ Reintentar</button></div>';}console.error('[DRIPX catalog manager]',e);}
 finally{loading=false;}
}
function modalOpen(item,creating=false){
 const backdrop=$(ROOT+' [data-dxcm-modal]'),body=$(ROOT+' [data-dxcm-body]'),title=$(ROOT+' #dxcm-modal-title');
 if(!backdrop||!body||!title)throw new Error('No se encontró el editor.');
 const isPlan=item.product_type==='plan';
 const assigned=new Set(selectedResources(item.id));
 const options=resourceProducts().filter(r=>r.status==='published'&&!!r.file_path).map(r=>
  '<label class="dxcm-resource-choice"><input type="checkbox" name="resource_ids" value="'+esc(r.id)+'" '+(assigned.has(String(r.id))?'checked':'')+'><span class="dxcm-resource-icon">'+((r.image_url||r.catalogImageUrl)&&/^https:\/\//i.test(r.image_url||r.catalogImageUrl)?'<img src="'+esc(r.image_url||r.catalogImageUrl)+'" alt="">':'▣')+'</span><span class="dxcm-resource-copy"><strong>'+esc(r.title)+'</strong><small>Producto publicado · ZIP disponible</small></span><i>'+(assigned.has(String(r.id))?'Incluido':'Disponible')+'</i></label>'
 ).join('');
 const duration=['monthly','yearly','lifetime'].map(v=>'<option value="'+v+'" '+(String(item.billing_period||'monthly')===v?'selected':'')+'>'+(v==='monthly'?'Mensual · 30 días aprox.':v==='yearly'?'Anual · 1 año':'Permanente · sin vencimiento')+'</option>').join('');
 const categoryOptions=categories.filter(c=>!['planes','productos'].includes(String(c.slug||'').toLowerCase())).map(c=>'<option value="'+esc(c.slug)+'" '+(String(item.store_category||'scripts-mta')===String(c.slug)?'selected':'')+'>'+esc(c.name)+'</option>').join('');
 body.innerHTML='<form class="dxcm-edit-form" data-dxcm-form '+(creating?'data-dxcm-create-plan="true"':'data-item-id="'+esc(item.id)+'"')+' data-item-type="'+(isPlan?'plan':'resource')+'">'+
  '<div class="dxcm-form-grid"><label class="wide">Nombre<input name="title" maxlength="100" required value="'+esc(item.title)+'"></label>'+
  '<label>Precio (USD)<input name="price_usd" type="number" min="0" max="100000" step="0.01" required value="'+esc(item.price_usd)+'"></label>'+
  '<label>Imagen URL (HTTPS)<input name="image_url" type="url" placeholder="https://…" value="'+esc(item.image_url||'')+'"></label>'+
  '<label class="wide">Frase corta<input name="tagline" maxlength="180" value="'+esc(item.tagline||'')+'" placeholder="Resumen breve para la tarjeta"></label>'+
  '<label class="wide">Descripción<textarea name="description" rows="4" maxlength="8000">'+esc(item.description||'')+'</textarea></label>'+
  (isPlan?'<label>Código del plan<input name="plan_code" maxlength="40" pattern="[a-z0-9_-]{2,40}" required value="'+esc(item.plan_code||'')+'"></label><label>Duración<select name="billing_period">'+duration+'</select></label><label class="wide">Características<textarea name="features" rows="4" placeholder="Una característica por línea">'+esc((Array.isArray(item.features)?item.features:[]).join('\n'))+'</textarea></label>':'<label>Categoría del producto<select name="store_category" required>'+categoryOptions+'</select></label><label>Vídeo URL (HTTPS)<input name="video_url" type="url" placeholder="https://…" value="'+esc(item.video_url||'')+'"></label><div class="dxcm-fixed-category"><small>TIPO INTERNO</small><strong>Producto descargable · ZIP</strong><span>Este recurso permanece separado de los planes.</span></div>')+
  '</div>'+
  (isPlan?'<div class="dxcm-assign"><header><div><small>CONTENIDO DEL PLAN</small><h4>Productos incluidos</h4><p>Selecciona productos ya creados y publicados. Aquí no se suben ZIP ni se crean productos nuevos.</p></div><span>'+options.length+'</span></header>'+
   (options?'<div class="dxcm-resource-list">'+options+'</div>':'<div class="dxcm-empty compact"><strong>No hay productos listos para asignar</strong><p>Primero crea y publica los ZIP desde Productos.</p><a href="#admin/productos" data-dxcm-close>Volver al formulario de Productos</a></div>')+'</div>':'<div class="dxcm-product-note"><span>▣</span><div><strong>Archivo descargable</strong><p>El ZIP se gestiona desde el formulario de Productos; esta edición no reemplaza ni modifica el archivo almacenado.</p></div></div>')+
  '<footer><span data-dxcm-save-status>Los cambios se guardan directamente en Supabase.</span><button type="button" class="dxcm-cancel" data-dxcm-close>Cancelar</button><button type="submit" class="dxcm-save">Guardar cambios <span>→</span></button></footer></form>';
 title.textContent=creating?'Crear plan · sin ZIP':(isPlan?'Editar plan · ':'Editar producto · ')+item.title;
 backdrop.hidden=false;
}
async function inspectZip(item){
 if(!item?.file_path)throw new Error('Este producto no tiene un ZIP almacenado.');
 if(typeof window.DRIPX_INSPECT_ZIP!=='function')throw new Error('El inspector ZIP no está disponible. Recarga la página y vuelve a intentarlo.');
 const signed=await db.storage.from('product-files').createSignedUrl(item.file_path,120);
 if(signed.error)throw signed.error;
 const response=await fetch(signed.data.signedUrl);
 if(!response.ok)throw new Error('No se pudo recuperar el ZIP privado ('+response.status+').');
 const blob=await response.blob();
 if(!blob.size||blob.size>50*1024*1024)throw new Error('El ZIP está vacío o supera el límite de inspección de 50 MB.');
 const file=new File([blob],(String(item.title||'resource').replace(/[^a-z0-9_-]+/gi,'_')||'resource')+'.zip',{type:'application/zip'});
 const scan=await window.DRIPX_INSPECT_ZIP(file);
 if(!scan||!Array.isArray(scan.files))throw new Error('El inspector no devolvió un inventario válido.');
 const body=$(ROOT+' [data-dxcm-body]'),title=$(ROOT+' #dxcm-modal-title'),backdrop=$(ROOT+' [data-dxcm-modal]');
 if(!body||!title||!backdrop)throw new Error('No se encontró el panel de gestión ZIP.');
 const rows=scan.files.map(file=>'<div class="dxcm-zip-file"><strong>'+esc(file.path||file.name||'Archivo')+'</strong><small>'+esc(file.kind||file.type||'Archivo')+' · '+Number(file.bytes||file.size||0).toLocaleString('es-DO')+' bytes</small></div>').join('');
 body.innerHTML='<div class="dxcm-zip-manager"><div class="dxcm-zip-summary"><strong>'+esc(item.title)+'</strong><span>'+scan.files.length+' archivos detectados</span><span>'+(scan.server?.length||0)+' server · '+(scan.client?.length||0)+' client</span></div><p>Inventario del ZIP privado. Los archivos se leen sin ejecutarse.</p><div class="dxcm-zip-files">'+(rows||'<p>El ZIP no contiene archivos.</p>')+'</div><footer><span>ZIP original conservado en Supabase Storage.</span><button type="button" class="dxcm-cancel" data-dxcm-close>Cerrar</button><button type="button" class="dxcm-save" data-dxcm-replace-zip data-id="'+esc(item.id)+'">Reemplazar ZIP <span>→</span></button></footer></div>';
 title.textContent='Gestión del ZIP · '+item.title;
 backdrop.hidden=false;
}
async function showProductBuyers(item){
 const result=await db.rpc('dripx_admin_get_product_buyers',{p_product_id:item.id});if(result.error)throw result.error;
 const rows=result.data||[];
 const w=$(ROOT+' [data-dxcm-modal]'),body=$(ROOT+' [data-dxcm-body]'),title=$(ROOT+' #dxcm-modal-title');
 if(!w||!body||!title)throw new Error('No se encontró el mini panel.');
 const list=rows.map(user=>'<article class="dxcm-sale-row"><div><strong>'+esc(user.display_name||'Usuario')+'</strong><small>'+esc(user.discord_id||user.user_id)+'</small></div><span>'+esc(user.access_source||'Acceso')+'</span><b>'+(user.expires_at?'Vence '+new Date(user.expires_at).toLocaleDateString('es-DO'):'Permanente')+'</b></article>').join('');
 body.innerHTML='<div class="dxcm-sales">'+(list||'<div class="dxcm-empty compact">Todavía no hay usuarios con acceso a este producto.</div>')+'</div>';
 title.textContent='Usuarios con acceso · '+item.title;w.hidden=false;
}
async function showProductSales(item){
 const items=await db.from('dripx_order_items').select('order_id').eq('product_id',item.id).limit(100);if(items.error)throw items.error;
 const ids=[...new Set((items.data||[]).map(x=>x.order_id).filter(Boolean))];
 const orders=ids.length?await db.from('dripx_orders').select('id,user_id,total,status,created_at').in('id',ids).order('created_at',{ascending:false}):{data:[],error:null};if(orders.error)throw orders.error;
 const uids=[...new Set((orders.data||[]).map(x=>x.user_id).filter(Boolean))];
 const profiles=uids.length?await db.from('dripx_profiles').select('user_id,display_name,discord_id').in('user_id',uids):{data:[],error:null};if(profiles.error)throw profiles.error;
 const users=new Map((profiles.data||[]).map(x=>[String(x.user_id),x]));
 const rows=(orders.data||[]).map(o=>{const u=users.get(String(o.user_id))||{};return '<article class="dxcm-sale-row"><div><strong>'+esc(u.display_name||'Usuario Discord')+'</strong><small>'+esc(u.discord_id||'')+' · '+new Date(o.created_at).toLocaleString('es-DO')+'</small></div><span>'+esc(o.status)+'</span><b>'+money(o.total)+' USD</b></article>';}).join('');
 const w=$(ROOT+' [data-dxcm-modal]'),body=$(ROOT+' [data-dxcm-body]'),title=$(ROOT+' #dxcm-modal-title');if(!w||!body||!title)throw new Error('No se encontró el mini panel.');
 body.innerHTML='<div class="dxcm-sales"><div class="dxcm-sales-summary"><strong>'+ids.length+'</strong><span>pedidos vinculados</span><strong>'+money((orders.data||[]).reduce((n,o)=>n+Number(o.total||0),0))+'</strong><span>total registrado · USD</span></div>'+(rows||'<div class="dxcm-empty compact">Todavía no hay compras registradas para este elemento.</div>')+'</div>';
 title.textContent='Compras y ventas · '+item.title;w.hidden=false;
}
async function deleteCatalogItem(item,button){
 if(!item)return;if(!confirm('¿Eliminar o retirar "'+item.title+'"? Si conserva compras, licencias, archivos o asignaciones, se archivará para conservar el historial.'))return;
 if(button)button.disabled=true;
 try{
  const {data,error}=await db.rpc('dripx_admin_delete_catalog_product',{p_product_id:item.id});
  if(error)throw error;if(data?.ok!==true)throw new Error('Supabase no confirmó la operación.');
  notify(data.archived?'Elemento retirado del catálogo; historial, compras y accesos conservados.':'Elemento eliminado.');
  const p=$(ROOT);if(p)p.dataset.loaded='0';await load();
 }catch(error){notify(error.message||'No se pudo eliminar el elemento.');if(button)button.disabled=false;}
}
async function setStatus(id,status,button){
 if(busy)return;busy=true;if(button)button.disabled=true;
 try{const {error}=await db.rpc('dripx_admin_set_catalog_status',{p_product_id:id,p_status:status});if(error)throw error;
  notify(status==='published'?'Elemento publicado correctamente.':status==='archived'?'Elemento ocultado del catálogo.':'Elemento guardado como borrador.');
  await load();
 }catch(e){notify(e.message||'No se pudo cambiar el estado.');}
 finally{busy=false;if(button)button.disabled=false;}
}
async function saveForm(form){
 if(busy)return;busy=true;
 const button=form.querySelector('button[type="submit"]'),status=form.querySelector('[data-dxcm-save-status]');if(button)button.disabled=true;
 try{
  const fd=new FormData(form),id=form.dataset.itemId,type=form.dataset.itemType;
  const title=String(fd.get('title')||'').trim(),description=String(fd.get('description')||''),price=Number(fd.get('price_usd'));
  const imageUrl=String(fd.get('image_url')||'').trim();
  const currentItem=products.find(p=>String(p.id)===String(id));
  if(!title||!Number.isFinite(price)||price<0)throw new Error('Comprueba el nombre y el precio.');
  if(imageUrl&&!/^https:\/\//i.test(imageUrl))throw new Error('La imagen debe usar HTTPS.');
  const resourceIds=type==='plan'?fd.getAll('resource_ids').map(String):[];
  const features=type==='plan'?String(fd.get('features')||'').split('\n').map(x=>x.trim()).filter(Boolean):[];
  if(type==='plan'&&features.length>30)throw new Error('El plan admite hasta 30 características.');
  if(status)status.textContent='Guardando cambios y verificando asignaciones…';
  if(type==='plan'&&form.dataset.dxcmCreatePlan==='true'){
   if(status)status.textContent='Creando el plan y guardando su lista de productos…';
   const result=await db.rpc('dripx_admin_create_plan',{
    p_title:title,p_description:description,p_price_usd:price,p_tagline:String(fd.get('tagline')||''),
    p_image_url:imageUrl||null,p_plan_code:String(fd.get('plan_code')||'').trim().toLowerCase(),
    p_billing_period:String(fd.get('billing_period')||'monthly'),p_features:features,p_resource_product_ids:resourceIds
   });
   if(result.error)throw result.error;
   notify('Plan creado como borrador. Ya puedes publicarlo desde sus tres puntos.');
   $(ROOT+' [data-dxcm-modal]').hidden=true;await load();return;
  }
  const result=await db.rpc('dripx_admin_update_catalog_item',{
   p_product_id:id,p_title:title,p_description:description,p_price_usd:price,
   p_tagline:String(fd.get('tagline')||''),p_image_url:imageUrl||null,
   p_plan_code:type==='plan'?String(fd.get('plan_code')||'').trim().toLowerCase():null,
   p_billing_period:type==='plan'?String(fd.get('billing_period')||'monthly'):null,
   p_features:features,p_resource_product_ids:resourceIds
  });
  if(result.error)throw result.error;
  if(type==='resource'){
   const details=await db.rpc('dripx_admin_update_product_details',{
    p_product_id:id,p_store_category:String(fd.get('store_category')||currentItem?.store_category||'scripts-mta'),
    p_image_url:imageUrl||null,p_video_url:String(fd.get('video_url')||'').trim()||null,
    p_image_path:imageUrl?null:(currentItem?.image_path||null),
    p_video_path:String(fd.get('video_url')||'').trim()?null:(currentItem?.video_path||null)
   });
   if(details.error)throw details.error;
  }
  notify(type==='plan'?'Plan actualizado y productos sincronizados.':'Producto actualizado.');
  $(ROOT+' [data-dxcm-modal]').hidden=true;await load();
 }catch(e){if(status)status.textContent=e.message||'No se pudieron guardar los cambios.';notify(e.message||'No se pudieron guardar los cambios.');}
 finally{busy=false;if(button)button.disabled=false;}
}
document.addEventListener('click',async e=>{
 const replaceZip=e.target.closest('[data-dxcm-replace-zip]');
 if(replaceZip){
  e.preventDefault();e.stopImmediatePropagation();
  const item=products.find(p=>String(p.id)===String(replaceZip.dataset.id)),form=$('#product-form');
  if(!item||!form){notify('No se encontró el producto o el formulario de carga.');return;}
  window.__DRIPX_REPLACE_PRODUCT_ID=item.id;
  const set=(name,value)=>{const input=form.querySelector('[name="'+name+'"]');if(input){input.value=value??'';input.dispatchEvent(new Event('change',{bubbles:true}));}};
  const type=form.querySelector('[name="product_type"]');if(type){type.value='resource';type.dispatchEvent(new Event('change',{bubbles:true}));}
  set('title',item.title);set('description',item.description);set('price_usd',item.price_usd);set('category','Productos');set('image_url',item.image_url);set('video_url',item.video_url);set('store_category',item.store_category||'scripts-mta');
  const zipInput=form.querySelector('input[name="file"]');if(zipInput)zipInput.value='';
  const modal=$(ROOT+' [data-dxcm-modal]');if(modal)modal.hidden=true;
  form.scrollIntoView({behavior:'smooth',block:'center'});
  form.querySelector('input[name="file"]')?.focus({preventScroll:true});
  notify('Modo reemplazo activado. Selecciona el ZIP nuevo, pulsa Trabajar y guarda para actualizar este mismo producto sin cambiar su ID ni sus licencias.');
  return;
 }
 const reload=e.target.closest('[data-dxcm-reload]');if(reload){e.preventDefault();const panel=$(ROOT);if(panel)panel.dataset.loaded='0';await load();return;}
 const close=e.target.closest('[data-dxcm-close]');if(close){const m=$(ROOT+' [data-dxcm-modal]');if(m)m.hidden=true;return;}
 const more=e.target.closest('[data-dxcm-menu]');if(more){e.preventDefault();e.stopImmediatePropagation();const id=more.dataset.dxcmMenu;document.querySelectorAll('.dxcm-menu').forEach(m=>m.hidden=true);const panel=$('[data-dxcm-menu-panel="'+CSS.escape(id)+'"]');if(panel)panel.hidden=false;return;}
 const sectionMenu=e.target.closest('[data-dxcm-section-menu]');if(sectionMenu){e.preventDefault();e.stopImmediatePropagation();const id=sectionMenu.dataset.dxcmSectionMenu;document.querySelectorAll('.dxcm-section-menu').forEach(m=>m.hidden=true);const menu=$('[data-dxcm-section-menu-panel="'+CSS.escape(id)+'"]');if(menu)menu.hidden=false;return;}
 const sectionAction=e.target.closest('[data-dxcm-section-action]');if(sectionAction){e.preventDefault();e.stopImmediatePropagation();document.querySelectorAll('.dxcm-section-menu').forEach(m=>m.hidden=true);if(sectionAction.dataset.dxcmSectionAction==='create-plan'){modalOpen({id:'',product_type:'plan',title:'',description:'',price_usd:'0.00',tagline:'',image_url:'',plan_code:'',billing_period:'monthly',features:[]},true);return;}if(sectionAction.dataset.dxcmSectionAction==='create-product'){window.__DRIPX_REPLACE_PRODUCT_ID=null;const form=$('#product-form');if(!form){notify('No se encontró el formulario de creación de Productos.');return;}const type=form.querySelector('select[name="product_type"]');if(type){type.value='resource';type.dispatchEvent(new Event('change',{bubbles:true}));}const category=form.querySelector('select[name="category"],select[id*="categor" i]');if(category){const opt=[...category.options].find(o=>normalize(o.value)==='productos');if(opt)category.value=opt.value;}form.scrollIntoView({behavior:'smooth',block:'center'});form.querySelector('[name="title"]')?.focus({preventScroll:true});return;}}
 const action=e.target.closest('[data-dxcm-action]');if(action){e.preventDefault();e.stopImmediatePropagation();document.querySelectorAll('.dxcm-menu').forEach(m=>m.hidden=true);
  if(action.dataset.dxcmAction==='sales'){const item=products.find(p=>String(p.id)===String(action.dataset.id));if(item){try{await showProductSales(item);}catch(error){notify(error.message||'No se pudo consultar el historial.');}}return;}
  if(action.dataset.dxcmAction==='buyers'){const item=products.find(p=>String(p.id)===String(action.dataset.id));if(item){try{await showProductBuyers(item);}catch(error){notify(error.message||'No se pudieron consultar los accesos.');}}return;}
  if(action.dataset.dxcmAction==='delete'){const item=products.find(p=>String(p.id)===String(action.dataset.id));await deleteCatalogItem(item,action);return;}
  if(action.dataset.dxcmAction==='inspect-zip'){const item=products.find(p=>String(p.id)===String(action.dataset.id));if(item){try{await inspectZip(item);}catch(error){notify(error.message||'No se pudo inspeccionar el ZIP.');}}return;}
  if(action.dataset.dxcmAction==='status'){const item=products.find(p=>String(p.id)===String(action.dataset.id));const next=action.dataset.next;
   if(next==='archived'&&!confirm('¿Ocultar "'+(item?.title||'este elemento')+'" del catálogo público? Los registros y accesos existentes se conservarán.'))return;
   await setStatus(action.dataset.id,next,action);
  }else{const item=products.find(p=>String(p.id)===String(action.dataset.id));if(item)modalOpen(item);}return;
 }
 if(e.target.matches('[data-dxcm-modal]'))e.target.hidden=true;
},true);
document.addEventListener('change',e=>{
 const choice=e.target.closest('.dxcm-resource-choice input');if(!choice)return;
 const row=choice.closest('.dxcm-resource-choice'),label=row?.querySelector('i');if(label)label.textContent=choice.checked?'Incluido':'Disponible';
 const count=$(ROOT+' .dxcm-assign header>span');if(count){const checked=$(ROOT+' .dxcm-resource-list')?.querySelectorAll('input:checked').length||0;count.textContent=String(checked);}
},true);
document.addEventListener('submit',async e=>{
 const form=e.target.closest('[data-dxcm-form]');if(!form)return;e.preventDefault();e.stopImmediatePropagation();await saveForm(form);
},true);
document.addEventListener('click',e=>{
 if(!e.target.closest('.dxcm-menu-wrap'))document.querySelectorAll('.dxcm-menu').forEach(m=>m.hidden=true);
 if(!e.target.closest('.dxcm-section-menu-wrap'))document.querySelectorAll('.dxcm-section-menu').forEach(m=>m.hidden=true);
},false);
function ensure(){
 let existing=$(ROOT);
 if(!activeView()){restoreLegacySurface();existing?.remove();document.querySelector('#dx-plan-resource-manager')?.remove();return;}
 const desiredMode=activeCatalogMode();
 if(existing&&existing.dataset.loaded==='1'&&existing.dataset.view!==desiredMode){render();}
 if(!existing){
  document.querySelector('#dx-plan-resource-manager')?.remove();
  existing=document.createElement('section');existing.id='dx-catalog-admin';existing.className='dxcm-shell';existing.dataset.loaded='0';
  existing.innerHTML='<div class="dxcm-loading"><span class="dxcm-loading-mark">DX</span><strong>Preparando el catálogo administrativo</strong><p>Verificando permisos y sincronizando el catálogo…</p></div>';
  const app=$('#app');if(app)app.prepend(existing);
 }
 takeOverLegacySurface();
 if(existing&&['','0'].includes(existing.dataset.loaded||'')&&!loading)load();
}
document.addEventListener('click',e=>{
 const back=e.target.closest('[data-dxcm-back]');
 if(back){
  e.preventDefault();e.stopImmediatePropagation();manualExit=true;window.DRIPX_ADMIN_PRODUCTS_TAB_ACTIVE=false;
  try{sessionStorage.removeItem('dripx.admin.tab');}catch{}
  if(typeof window.DRIPX_ADMIN_NAVIGATE==='function'){window.DRIPX_ADMIN_NAVIGATE('resumen');return;}
  restoreLegacySurface();
  const controls=[...document.querySelectorAll('#app a,#app button,#app [role="tab"]')].filter(n=>!n.closest(ROOT)&&!n.closest('[hidden]'));
  const nav=controls.find(n=>/^(panel|inicio|resumen|dashboard)$/i.test(String(n.textContent||'').trim()))||controls.find(n=>/pedidos/i.test(String(n.textContent||'').trim()));
  if(nav)nav.click();else{const root=$(ROOT);if(root)root.remove();if(location.hash!=='#admin')location.hash='#admin';}
  setTimeout(()=>{restoreLegacySurface();const root=$(ROOT);if(root)root.remove();},80);
  return;
 }
 const retry=e.target.closest('[data-dxcm-reload],[data-dxcm-recover-form]');
 if(retry){e.preventDefault();const panel=$(ROOT);if(panel)panel.dataset.loaded='0';loading=false;ensure();if(!loading)load();return;}
 const nav=e.target.closest('#app button,#app a,#app [role="tab"]');
 if(!nav||nav.closest(ROOT))return;
 const label=[nav.textContent,nav.getAttribute('data-admin-tab'),nav.getAttribute('data-tab'),nav.getAttribute('aria-label'),nav.getAttribute('href')].join(' ').toLowerCase();
 if(/productos|planes/.test(label)){manualExit=false;window.DRIPX_ADMIN_PRODUCTS_TAB_ACTIVE=true;window.DRIPX_ADMIN_CATALOG_MODE=/planes/.test(label)?'planes':'productos';try{sessionStorage.setItem('dripx.admin.tab',window.DRIPX_ADMIN_CATALOG_MODE);}catch{}setTimeout(ensure,120);}
 else if(/pedidos|tickets|resenas|usuarios|ajustes|configuracion|panel|inicio/.test(label)){window.DRIPX_ADMIN_PRODUCTS_TAB_ACTIVE=false;setTimeout(ensure,80);}
},true);
window.addEventListener('hashchange',()=>setTimeout(ensure,120));
const observer=new MutationObserver(()=>{
 if(activeView()){if(!$(ROOT))ensure();else takeOverLegacySurface();}
 else if($(ROOT))ensure();
});
const start=()=>{const app=$('#app');if(app)observer.observe(app,{childList:true,subtree:true});ensure();};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();