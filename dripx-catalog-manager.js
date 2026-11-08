(()=>{'use strict';
const db=window.DRIPX_SUPABASE_CLIENT;
window.__DRIPX_CATALOG_MANAGER_ACTIVE=true;
if(!db)return;
const ROOT='#dx-catalog-admin';
let products=[],mappings=[],categories=[],busy=false,loading=false;
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notify=message=>{const t=$('#toast');if(t){t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3400);}};
const normalize=v=>String(v||'').trim().toLowerCase();
function activeView(){
 if(window.DRIPX_IS_ADMIN!==true)return false;
 const hash=String(location.hash||'').toLowerCase();
 let tab='';try{tab=sessionStorage.getItem('dripx.admin.tab')||'';}catch{}
 return hash.startsWith('#admin')&&(tab==='productos'||/#admin\/(?:productos|planes)(?:$|[/?])/.test(hash));
}
function planProducts(){return products.filter(p=>p.product_type==='plan'&&p.category==='Planes');}
function resourceProducts(){return products.filter(p=>p.product_type==='resource'&&p.category==='Productos');}
function selectedResources(planId){return mappings.filter(m=>String(m.plan_product_id)===String(planId)).map(m=>String(m.resource_product_id));}
function imageFor(p){const source=p.image_url||p.catalogImageUrl||'';return source&&/^https:\/\//i.test(source)?'<img src="'+esc(source)+'" alt="" loading="lazy">':'<span class="dxcm-art">'+(p.product_type==='plan'?'✦':'▣')+'</span>';}
function money(n){return '$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function row(p){
 const isPlan=p.product_type==='plan',hidden=p.status==='archived',draft=p.status==='draft',linked=isPlan?selectedResources(p.id).length:0;
 const info=isPlan?(esc(p.billing_period||'Periodo sin configurar')+' · '+linked+' productos incluidos'):(p.file_path?'ZIP listo · Descarga MTA:SA':'ZIP pendiente · No publicable');
 return '<article class="dxcm-row" data-item-id="'+esc(p.id)+'" data-item-type="'+(isPlan?'plan':'resource')+'">'+
  '<div class="dxcm-thumb">'+imageFor(p)+'</div><div class="dxcm-main"><div class="dxcm-title-line"><strong>'+esc(p.title)+'</strong><span class="dxcm-status '+(hidden?'is-hidden':draft?'is-draft':'is-live')+'">'+(hidden?'Oculto':draft?'Borrador':'Publicado')+'</span></div>'+
  '<p>'+esc(p.tagline||p.description||'Sin descripción')+'</p><small>'+info+'</small></div>'+
  '<div class="dxcm-price">'+money(p.price_usd)+'<small>USD</small></div>'+
  '<div class="dxcm-menu-wrap"><button type="button" class="dxcm-more" data-dxcm-menu="'+esc(p.id)+'" aria-label="Opciones de '+esc(p.title)+'">···</button>'+
  '<div class="dxcm-menu" data-dxcm-menu-panel="'+esc(p.id)+'" hidden>'+
   (isPlan?'':'<button type="button" data-dxcm-action="inspect-zip" data-id="'+esc(p.id)+'" '+(!p.file_path?'disabled':'')+'>▣ Gestionar ZIP · Leer archivos</button>')+
   '<button type="button" data-dxcm-action="status" data-id="'+esc(p.id)+'" data-next="'+(p.status==='published'?'archived':'published')+'">'+(p.status==='published'?'◉ Ocultar':'✓ Publicar')+'</button>'+
   '<button type="button" data-dxcm-action="edit" data-id="'+esc(p.id)+'">✎ Editar configuración</button>'+
  '</div></div></article>';
}
function render(){
 let host=$(ROOT);if(!host)return;
 const plans=planProducts().sort((a,b)=>a.sort_order-b.sort_order||a.title.localeCompare(b.title));
 const resources=resourceProducts().sort((a,b)=>a.sort_order-b.sort_order||a.title.localeCompare(b.title));
 host.innerHTML='<header class="dxcm-heading"><div><span class="dxcm-kicker">DRIP X SHOP · CATÁLOGO ADMINISTRATIVO</span><h2>Planes y productos</h2><p>Administra la publicación desde el menú de cada elemento. Los recursos se crean aparte y después se incluyen en los planes.</p></div><div class="dxcm-totals"><div><b>'+plans.length+'</b><span>Planes</span></div><div><b>'+resources.length+'</b><span>Productos</span></div></div></header>'+
 '<section class="dxcm-section"><header><div><span class="dxcm-section-mark">01 / ACCESO</span><h3>Planes</h3><p>Precio, duración, presentación y productos incluidos. Un plan nunca almacena ZIP.</p></div><div class="dxcm-section-menu-wrap"><button type="button" class="dxcm-section-more" data-dxcm-section-menu="plans" aria-label="Opciones de Planes">···</button><div class="dxcm-section-menu" data-dxcm-section-menu-panel="plans" hidden><button type="button" data-dxcm-section-action="create-plan">＋ Crear plan</button></div></div></header>'+
 (plans.length?'<div class="dxcm-list">'+plans.map(row).join('')+'</div>':'<div class="dxcm-empty"><span>✦</span><strong>No hay planes creados</strong><p>Usa el formulario de creación superior y selecciona “Plan de acceso · sin ZIP”.</p></div>')+'</section>'+
 '<section class="dxcm-section"><header><div><span class="dxcm-section-mark">02 / INVENTARIO</span><h3>Productos descargables</h3><p>Los recursos se crean aquí como productos independientes, dentro de la categoría Productos.</p></div><div class="dxcm-section-menu-wrap"><button type="button" class="dxcm-section-more" data-dxcm-section-menu="products" aria-label="Opciones de Productos">···</button><div class="dxcm-section-menu" data-dxcm-section-menu-panel="products" hidden><button type="button" data-dxcm-section-action="create-product">＋ Crear producto</button></div></div></header>'+
 (resources.length?'<div class="dxcm-list">'+resources.map(row).join('')+'</div>':'<div class="dxcm-empty"><span>▣</span><strong>Aún no hay productos descargables</strong><p>Crea uno desde el formulario superior, selecciona “Producto descargable · ZIP” y categoría “Productos”.</p></div>')+'</section>'+
 '<div class="dxcm-footnote"><span>i</span><p>Las acciones de publicación, ocultación, edición y asignación se guardan en Supabase y dejan registro administrativo. Los productos ocultos no aparecen en el catálogo público.</p></div>'+
 '<div class="dxcm-backdrop" data-dxcm-modal hidden><section class="dxcm-modal" role="dialog" aria-modal="true" aria-labelledby="dxcm-modal-title"><header><div><small>CONFIGURACIÓN DEL CATÁLOGO</small><h3 id="dxcm-modal-title">Editar elemento</h3></div><button type="button" data-dxcm-close aria-label="Cerrar">×</button></header><div data-dxcm-body></div></section></div>';
}
async function load(){
 if(loading||!activeView())return;loading=true;
 try{
  const {data:session,error:sessionError}=await db.auth.getSession();if(sessionError)throw sessionError;
  if(!session?.session?.user?.id)throw new Error('Inicia sesión con Discord para administrar el catálogo.');
  const admin=await db.rpc('dripx_is_admin');if(admin.error)throw admin.error;if(admin.data!==true)throw new Error('Tu cuenta no tiene permisos de administración.');
  const [p,m,categoryResult]=await Promise.all([
   db.from('dripx_products').select('id,title,description,price_usd,category,store_category,status,product_type,plan_code,billing_period,features,tagline,image_url,image_path,video_url,video_path,file_path,protection_enabled,sort_order').order('sort_order').order('created_at',{ascending:false}),
   db.from('dripx_plan_resources').select('plan_product_id,resource_product_id'),
   db.from('dripx_categories').select('name,slug,active,sort_order').eq('active',true).order('sort_order',{ascending:true})
  ]);
  if(p.error)throw p.error;if(m.error)throw m.error;if(categoryResult.error)throw categoryResult.error;
  products=p.data||[];mappings=m.data||[];categories=categoryResult.data||[];
  await Promise.all(products.map(async item=>{
   if(item.image_url||!item.image_path)return;
   try{const signed=await db.storage.from('product-images').createSignedUrl(item.image_path,3600);if(!signed.error)item.catalogImageUrl=signed.data?.signedUrl||null;}
   catch(error){console.warn('[DRIPX] No se pudo cargar la miniatura:',item.id,error?.message||error);}
  }));
  // Keep internal items strictly separated; other legacy categories do not leak into these lists.
  products=products.filter(p=>(p.product_type==='plan'&&p.category==='Planes')||(p.product_type==='resource'&&p.category==='Productos'));
  render();
 }catch(e){const host=$(ROOT);if(host)host.innerHTML='<div class="dxcm-error"><strong>No se pudo sincronizar el catálogo</strong><p>'+esc(e.message||'Error de Supabase')+'</p><button type="button" data-dxcm-reload>Reintentar</button></div>';console.error('[DRIPX catalog manager]',e);}
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
 body.innerHTML='<form class="dxcm-edit-form" data-dxcm-form '+(creating?'data-dxcm-create-plan="true"':'data-item-id="'+esc(item.id)+'"')+' data-item-type="'+(isPlan?'plan':'resource')+'">'+
  '<div class="dxcm-form-grid"><label class="wide">Nombre<input name="title" maxlength="100" required value="'+esc(item.title)+'"></label>'+
  '<label>Precio (USD)<input name="price_usd" type="number" min="0" max="100000" step="0.01" required value="'+esc(item.price_usd)+'"></label>'+
  '<label>Imagen URL (HTTPS)<input name="image_url" type="url" placeholder="https://…" value="'+esc(item.image_url||'')+'"></label>'+
  '<label class="wide">Frase corta<input name="tagline" maxlength="180" value="'+esc(item.tagline||'')+'" placeholder="Resumen breve para la tarjeta"></label>'+
  '<label class="wide">Descripción<textarea name="description" rows="4" maxlength="8000">'+esc(item.description||'')+'</textarea></label>'+
  (isPlan?'<label>Código del plan<input name="plan_code" maxlength="40" pattern="[a-z0-9_-]{2,40}" required value="'+esc(item.plan_code||'')+'"></label><label>Duración<select name="billing_period">'+duration+'</select></label><label class="wide">Características<textarea name="features" rows="4" placeholder="Una característica por línea">'+esc((Array.isArray(item.features)?item.features:[]).join('\n'))+'</textarea></label>':'<div class="dxcm-fixed-category"><small>CATEGORÍA</small><strong>Productos</strong><span>Este recurso se mantiene separado de los planes.</span></div>')+
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
 body.innerHTML='<div class="dxcm-zip-manager"><div class="dxcm-zip-summary"><strong>'+esc(item.title)+'</strong><span>'+scan.files.length+' archivos detectados</span><span>'+(scan.server?.length||0)+' server · '+(scan.client?.length||0)+' client</span></div><p>Inventario del ZIP privado. Los archivos se leen sin ejecutarse.</p><div class="dxcm-zip-files">'+(rows||'<p>El ZIP no contiene archivos.</p>')+'</div><footer><span>ZIP original conservado en Supabase Storage.</span><button type="button" class="dxcm-cancel" data-dxcm-close>Cerrar</button></footer></div>';
 title.textContent='Gestión del ZIP · '+item.title;
 backdrop.hidden=false;
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
  notify(type==='plan'?'Plan actualizado y productos sincronizados.':'Producto actualizado.');
  $(ROOT+' [data-dxcm-modal]').hidden=true;await load();
 }catch(e){if(status)status.textContent=e.message||'No se pudieron guardar los cambios.';notify(e.message||'No se pudieron guardar los cambios.');}
 finally{busy=false;if(button)button.disabled=false;}
}
document.addEventListener('click',async e=>{
 const reload=e.target.closest('[data-dxcm-reload]');if(reload){e.preventDefault();await load();return;}
 const close=e.target.closest('[data-dxcm-close]');if(close){const m=$(ROOT+' [data-dxcm-modal]');if(m)m.hidden=true;return;}
 const more=e.target.closest('[data-dxcm-menu]');if(more){e.preventDefault();e.stopImmediatePropagation();const id=more.dataset.dxcmMenu;document.querySelectorAll('.dxcm-menu').forEach(m=>m.hidden=true);const panel=$('[data-dxcm-menu-panel="'+CSS.escape(id)+'"]');if(panel)panel.hidden=false;return;}
 const sectionMenu=e.target.closest('[data-dxcm-section-menu]');if(sectionMenu){e.preventDefault();e.stopImmediatePropagation();const id=sectionMenu.dataset.dxcmSectionMenu;document.querySelectorAll('.dxcm-section-menu').forEach(m=>m.hidden=true);const menu=$('[data-dxcm-section-menu-panel="'+CSS.escape(id)+'"]');if(menu)menu.hidden=false;return;}
 const sectionAction=e.target.closest('[data-dxcm-section-action]');if(sectionAction){e.preventDefault();e.stopImmediatePropagation();document.querySelectorAll('.dxcm-section-menu').forEach(m=>m.hidden=true);if(sectionAction.dataset.dxcmSectionAction==='create-plan'){modalOpen({id:'',product_type:'plan',title:'',description:'',price_usd:'0.00',tagline:'',image_url:'',plan_code:'',billing_period:'monthly',features:[]},true);return;}if(sectionAction.dataset.dxcmSectionAction==='create-product'){const form=$('#product-form');if(!form){notify('No se encontró el formulario de creación de Productos.');return;}const type=form.querySelector('select[name="product_type"]');if(type){type.value='resource';type.dispatchEvent(new Event('change',{bubbles:true}));}const category=form.querySelector('select[name="category"],select[id*="categor" i]');if(category){const opt=[...category.options].find(o=>normalize(o.value)==='productos');if(opt)category.value=opt.value;}form.scrollIntoView({behavior:'smooth',block:'center'});form.querySelector('[name="title"]')?.focus({preventScroll:true});return;}}
 const action=e.target.closest('[data-dxcm-action]');if(action){e.preventDefault();e.stopImmediatePropagation();document.querySelectorAll('.dxcm-menu').forEach(m=>m.hidden=true);
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
 const existing=$(ROOT);
 if(!activeView()){existing?.remove();document.querySelector('#dx-plan-resource-manager')?.remove();return;}
 if(!existing){
  document.querySelector('#dx-plan-resource-manager')?.remove();
  const host=document.createElement('section');host.id='dx-catalog-admin';host.className='dxcm-shell';
  const app=$('#app');if(app)app.prepend(host);
  load();
 }
}
document.addEventListener('click',e=>{
 const nav=e.target.closest('#app button,#app a,#app [role="tab"]');if(!nav)return;
 const label=[nav.textContent,nav.getAttribute('data-admin-tab'),nav.getAttribute('data-tab'),nav.getAttribute('aria-label'),nav.getAttribute('href')].join(' ').toLowerCase();
 if(/productos|planes/.test(label))setTimeout(ensure,120);
},true);
window.addEventListener('hashchange',()=>setTimeout(ensure,120));
const observer=new MutationObserver(()=>{if(activeView()&&!$(ROOT))ensure();});
const start=()=>{const app=$('#app');if(app)observer.observe(app,{childList:true,subtree:true});ensure();};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();