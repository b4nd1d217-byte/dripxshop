(()=>{'use strict';
if(window.__DRIPX_PRODUCT_CREATOR_READY)return;
window.__DRIPX_PRODUCT_CREATOR_READY=true;
const ROOT='#dx-catalog-admin';
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isNamedZipBlob=value=>!!value&&typeof value==='object'&&typeof value.name==='string'&&Number.isFinite(Number(value.size))&&Number(value.size)>0&&typeof value.slice==='function'&&typeof value.arrayBuffer==='function';
let mountedForm=null,categoryPromise=null,observer=null;
const toast=message=>{const n=$('#toast');if(n){n.textContent=message;n.classList.add('show');setTimeout(()=>n.classList.remove('show'),3800);}};
function active(){
 const hash=String(location.hash||'').toLowerCase();
 if(/^#admin\/planes(?:$|[/?])/.test(hash)||window.DRIPX_ADMIN_CATALOG_MODE==='planes')return false;
 return !!$(ROOT+' #dxcm-product-form-host');
}
function control(form,name,tag,attrs){
 let node=form.querySelector('[name="'+name+'"]');
 if(node&&node.tagName.toLowerCase()!==tag){
  if(name==='store_category'){const oldValue=node.value||'';node.remove();node=document.createElement('select');node.name=name;node.dataset.dxpcOwned='true';node.dataset.dxpcInitialValue=oldValue;}
  else if(name==='category'||name==='product_type'){
   const oldValue=node.value||'';
   node.remove();
   node=document.createElement('input');
   node.type='hidden';
   node.value=oldValue;
   node.name=name;
   node.dataset.dxpcOwned='true';
  }
  else {node.remove();node=null;}
 }
 if(!node){node=document.createElement(tag);node.name=name;node.dataset.dxpcOwned='true';}
 Object.entries(attrs||{}).forEach(([k,v])=>{if(k==='value'){if(node.value===''||node.dataset.dxpcOwned==='true')node.value=String(v);}else if(k in node)node[k]=v;else node.setAttribute(k,String(v));});
 node.name=name;
 return node;
}
function removeDuplicates(form,name,keep){
 form.querySelectorAll('[name="'+name+'"]').forEach(node=>{if(node!==keep)node.remove();});
}
function label(title,hint,node,cls){
 const box=document.createElement('label');box.className='dxpc-field'+(cls?' '+cls:'');
 const head=document.createElement('span');head.className='dxpc-label';head.textContent=title;box.append(head);
 if(hint){const small=document.createElement('small');small.className='dxpc-hint';small.textContent=hint;box.append(small);}
 box.append(node);return box;
}
function option(value,text){const o=document.createElement('option');o.value=value;o.textContent=text;return o;}
async function loadCategories(select){
 if(categoryPromise)return categoryPromise.then(rows=>applyCategories(select,rows));
 const db=window.DRIPX_SUPABASE_CLIENT;
 if(!db)throw new Error('No se detectó la sesión administrativa de Supabase.');
 categoryPromise=(async()=>{
  const result=await db.from('dripx_categories').select('name,slug,active,sort_order').eq('active',true).order('sort_order',{ascending:true}).order('name',{ascending:true}).limit(100);
  if(result.error)throw result.error;
  const rows=(result.data||[]).filter(x=>String(x.slug||'').trim()&&String(x.name||'').trim()&&!['planes','productos'].includes(String(x.slug).toLowerCase()));
  if(!rows.length)throw new Error('No hay categorías activas. Crea o activa una categoría desde Administración → Ajustes.');
  return rows;
 })().catch(error=>{categoryPromise=null;throw error;});
 const rows=await categoryPromise;applyCategories(select,rows);
}
function applyCategories(select,rows){
 const old=String(select.dataset.dxpcInitialValue||select.value||'');
 select.replaceChildren(option('','Selecciona una categoría'));
 rows.forEach(row=>select.append(option(String(row.slug),String(row.name))));
 const next=rows.some(x=>String(x.slug)===old)?old:(rows[0]?.slug||'');
 select.value=next;delete select.dataset.dxpcInitialValue;
 select.dispatchEvent(new Event('change',{bubbles:true}));
}
function makeStep(index,title,detail){
 return '<button type="button" class="dxpc-step" data-dxpc-go="'+index+'" aria-current="'+(index===0?'step':'false')+'"><span>0'+(index+1)+'</span><i><b>'+title+'</b><small>'+detail+'</small></i></button>';
}
function mount(form){
 if(!form||form.dataset.dxpcReady==='true'||!active())return;
 const host=$(ROOT+' #dxcm-product-form-host');if(!host||!host.contains(form))return;
 const names=['title','description','price_usd','image_url','video_url','image','video','file','store_category','category','product_type','featured'];
 const fields={};
 fields.title=control(form,'title','input',{type:'text',placeholder:'Ej. Sistema avanzado de trabajos',maxLength:120,autocomplete:'off'});
 fields.description=control(form,'description','textarea',{placeholder:'Explica qué hace el recurso, qué incluye y qué necesita el servidor.'});
 fields.price_usd=control(form,'price_usd','input',{type:'number',min:'0',step:'0.01',inputMode:'decimal',placeholder:'0.00'});
 fields.image_url=control(form,'image_url','input',{type:'url',placeholder:'https://...'});
 fields.video_url=control(form,'video_url','input',{type:'url',placeholder:'https://youtube.com/... o enlace MP4'});
 fields.image=control(form,'image','input',{type:'file',accept:'image/jpeg,image/png,image/webp,image/gif,image/avif'});
 fields.video=control(form,'video','input',{type:'file',accept:'video/mp4,video/webm,video/ogg'});
 fields.file=control(form,'file','input',{type:'file',accept:'.zip,application/zip'});
 fields.store_category=control(form,'store_category','select',{});
 fields.category=control(form,'category','input',{type:'hidden',value:'Productos'});
 fields.product_type=control(form,'product_type','input',{type:'hidden',value:'resource'});
 fields.featured=control(form,'featured','input',{type:'checkbox'});
 names.forEach(name=>removeDuplicates(form,name,fields[name]));
 fields.title.type='text';fields.title.required=true;
 fields.description.required=true;
 fields.price_usd.type='number';fields.price_usd.min='0';fields.price_usd.step='0.01';fields.price_usd.required=true;
 fields.file.type='file';fields.file.accept='.zip,application/zip';fields.file.required=false;
 fields.image.type='file';fields.image.accept='image/jpeg,image/png,image/webp,image/gif,image/avif';
 fields.video.type='file';fields.video.accept='video/mp4,video/webm,video/ogg';
 fields.category.type='hidden';fields.category.value='Productos';
 fields.product_type.type='hidden';fields.product_type.value='resource';
 fields.featured.type='checkbox';
 form.noValidate=true;form.replaceChildren();form.classList.add('dxpc-form');
 form.innerHTML=[
 '<div class="dxpc-shell">',
 '<header class="dxpc-head"><div><span class="dxpc-eyebrow">DRIP X SHOP / CENTRO DE PUBLICACIÓN</span><h2>Crear producto</h2><p>Configura la ficha, prepara el recurso MTA:SA y publica únicamente el paquete protegido y validado.</p></div><span class="dxpc-mark"><b>DX</b><small>PRODUCT ENGINE</small></span></header>',
 '<nav class="dxpc-steps" aria-label="Pasos de creación">'+makeStep(0,'Información','Datos del recurso')+makeStep(1,'Presentación','Imagen y vídeo')+makeStep(2,'Protección','ZIP y publicación')+'</nav>',
 '<section class="dxpc-panel" data-dxpc-panel="0"><div class="dxpc-panel-title"><span>01 / DATOS PRINCIPALES</span><h3>Define tu producto</h3><p>Estos datos se guardarán en la ficha que verán los compradores.</p></div><div class="dxpc-grid dxpc-grid-main"><div data-dxpc-slot="title"></div><div data-dxpc-slot="price"></div><div data-dxpc-slot="category"></div><div data-dxpc-slot="description"></div></div><div class="dxpc-inline-note"><span>i</span><p>Los precios se guardan en USD. Para publicar un recurso gratuito utiliza 0.00.</p></div><div class="dxpc-panel-actions"><span></span><button type="button" class="dxpc-primary" data-dxpc-next>Continuar a presentación <b>→</b></button></div></section>',
 '<section class="dxpc-panel" data-dxpc-panel="1" hidden><div class="dxpc-panel-title"><span>02 / CONTENIDO VISUAL</span><h3>Presenta el recurso</h3><p>La imagen y el vídeo son opcionales. Puedes usar enlaces HTTPS o subir archivos.</p></div><div class="dxpc-media-grid"><article class="dxpc-media-card"><div class="dxpc-card-head"><span class="dxpc-icon">▧</span><div><b>Imagen del producto</b><small>JPG, PNG, WEBP, GIF o AVIF · máximo 8 MB</small></div></div><div data-dxpc-slot="image-url"></div><div class="dxpc-or">O SUBE UNA IMAGEN</div><div data-dxpc-slot="image-file"></div><p class="dxpc-file-name" data-dxpc-file-name="image">Sin imagen seleccionada</p></article><article class="dxpc-media-card"><div class="dxpc-card-head"><span class="dxpc-icon">▶</span><div><b>Vídeo de demostración</b><small>YouTube o MP4 por HTTPS · archivo hasta 50 MB</small></div></div><div data-dxpc-slot="video-url"></div><div class="dxpc-or">O SUBE UN VÍDEO</div><div data-dxpc-slot="video-file"></div><p class="dxpc-file-name" data-dxpc-file-name="video">Sin vídeo seleccionado</p></article></div><div class="dxpc-featured-row"><div><b>Destacar en la tienda</b><small>Da mayor visibilidad al recurso en el catálogo.</small></div><label class="dxpc-switch"><input type="checkbox" data-dxpc-featured><span></span></label></div><div class="dxpc-panel-actions"><button type="button" class="dxpc-ghost" data-dxpc-prev>← Volver</button><button type="button" class="dxpc-primary" data-dxpc-next>Continuar a protección <b>→</b></button></div></section>',
 '<section class="dxpc-panel" data-dxpc-panel="2" hidden><div class="dxpc-panel-title"><span>03 / RECURSO MTA:SA</span><h3>Inspecciona y protege el ZIP</h3><p>Selecciona el resource original. El motor revisa su estructura, conserva shared y shaders y prepara los Lua que deben compilarse.</p></div><div class="dxpc-resource-card"><div class="dxpc-resource-top"><span class="dxpc-resource-glyph">ZIP</span><div><b>Archivo original del resource</b><small>ZIP · máximo 50 MB comprimido</small></div><span class="dxpc-required">OBLIGATORIO</span></div><div id="resource-file-field" class="dxpc-zip-input"></div><p class="dxpc-file-name" data-dxpc-file-name="zip">Selecciona un archivo .zip para comenzar.</p><div id="product-zip-preview" class="dxpc-zip-preview" hidden></div></div><div id="product-zip-upload-state" class="dxpc-live-status" role="status" aria-live="polite" data-state="info">Aún no se ha seleccionado un ZIP. El producto no podrá publicarse hasta completar la protección.</div><div class="dxpc-publish-summary"><div><span>Tipo</span><b>Resource MTA:SA</b></div><div><span>Categoría</span><b>Productos descargables</b></div><div><span>Protección</span><b data-dxpc-protection-state>Pendiente</b></div></div><div class="dxpc-final-actions"><button type="button" class="dxpc-ghost" data-dxpc-prev>← Volver</button><button type="button" class="dxpc-publish" data-dxpc-publish disabled>Publicar producto protegido <b>→</b></button></div><p class="dxpc-final-hint">No se publica el ZIP original. Si falla la protección o la verificación del servidor, el producto queda como borrador.</p></section>',
 '<div class="dxpc-hidden-fields" data-dxpc-hidden></div><button type="submit" data-dxpc-submit-proxy class="dxpc-submit-proxy" tabindex="-1" aria-hidden="true">Guardar producto</button>',
 '</div>'
 ].join('');
 const put=(slot,node)=>{const target=$('[data-dxpc-slot="'+slot+'"]',form);if(target&&node)target.append(node);};
 put('title',label('Nombre del producto','Hasta 120 caracteres.',fields.title));
 put('price',label('Precio (USD)','Usa 0.00 para un producto gratuito.',fields.price_usd));
 put('category',label('Categoría de la tienda','Se administra desde Administración → Ajustes.',fields.store_category));
 put('description',label('Descripción','Describe las funciones y los requisitos.',fields.description,'dxpc-field-wide'));
 put('image-url',label('Enlace de imagen', 'Debe comenzar con HTTPS.',fields.image_url));
 put('image-file',label('Archivo de imagen','',fields.image));
 put('video-url',label('Enlace de vídeo','YouTube o MP4 con HTTPS.',fields.video_url));
 put('video-file',label('Archivo de vídeo','',fields.video));
 const zipWrap=$('#resource-file-field',form);zipWrap.append(fields.file);
 $('#resource-file-field',form).dataset.dxpcNative='true';
 const hidden=$('[data-dxpc-hidden]',form);
 hidden.append(fields.category,fields.product_type,fields.featured);
 const existingStatus=$('#product-zip-upload-state',form);
 if(!existingStatus)form.querySelector('[data-dxpc-hidden]').insertAdjacentHTML('beforeend','');
 fields.file.required=false;
 if(fields.title.value)fields.title.value=String(fields.title.value);
 const oldImage=fields.image_url.value||'';if(oldImage)fields.image_url.value=oldImage;
 const status=$('#product-zip-upload-state',form);
 const featuredToggle=$('[data-dxpc-featured]',form);featuredToggle.checked=fields.featured.checked;featuredToggle.addEventListener('change',()=>{fields.featured.checked=featuredToggle.checked;});
 form.dataset.dxpcReady='true';mountedForm=form;
 const publish=$('[data-dxpc-publish]',form);
 const setStep=index=>{
  const next=Math.max(0,Math.min(2,index));
  form.dataset.dxpcStep=String(next);
  form.querySelectorAll('[data-dxpc-panel]').forEach(panel=>panel.hidden=Number(panel.dataset.dxpcPanel)!==next);
  form.querySelectorAll('[data-dxpc-go]').forEach(button=>{const active=Number(button.dataset.dxpcGo)===next;button.setAttribute('aria-current',active?'step':'false');button.classList.toggle('is-active',active);});
 };
 const sync=()=>{
  const successMessage=String(status?.textContent||'');
  if(publish.dataset.busy==='true'&&status?.dataset.state==='success'&&/producto guardado y publicado correctamente/i.test(successMessage)&&publish.dataset.completed!=='true'){
   publish.dataset.busy='false';
   publish.dataset.completed='true';
   publish.textContent='Publicar producto protegido →';
   fields.title.value='';
   fields.description.value='';
   fields.price_usd.value='0.00';
   fields.image_url.value='';
   fields.video_url.value='';
   fields.image.value='';
   fields.video.value='';
   fields.file.value='';
   fields.file.dataset.dripxZipReady='false';
   delete fields.file.dataset.dripxZipRun;
   fields.featured.checked=false;
   featuredToggle.checked=false;
   const preview=form.querySelector('#product-zip-preview');
   if(preview){preview.hidden=true;preview.replaceChildren();}
   status.textContent='Producto publicado correctamente. Puedes comenzar otro resource.';
   status.dataset.state='success';
   setStep(0);
  }
  const selected=fields.file.files?.[0];
  const staged=window.__DRIPX_PROCESSED_PRODUCT_FILE;
  const packaged=window.__DRIPX_PROCESSED_PRODUCT_ZIP;
  const ready=!!(selected&&fields.file.dataset.dripxZipReady==='true'&&isNamedZipBlob(staged)&&staged.size>0&&packaged&&packaged.name===staged.name&&packaged.productId===window.__DRIPX_PENDING_PRODUCT_ID&&form.dataset.dripxZipProcessing!=='true');
  publish.disabled=!ready;
  if(publish.dataset.busy==='true'&&status?.dataset.state==='error'){
   publish.dataset.busy='false';
   publish.textContent='Publicar producto protegido →';
  }
  if(publish.dataset.busy==='true')publish.disabled=true;
  const pstate=$('[data-dxpc-protection-state]',form);
  if(pstate)pstate.textContent=ready?'Listo para guardar':'Pendiente';
  const imageFile=fields.image.files?.[0],videoFile=fields.video.files?.[0];
  $('[data-dxpc-file-name="image"]',form).textContent=imageFile?imageFile.name+' · '+(imageFile.size/1048576).toFixed(2)+' MB':'Sin imagen seleccionada';
  $('[data-dxpc-file-name="video"]',form).textContent=videoFile?videoFile.name+' · '+(videoFile.size/1048576).toFixed(2)+' MB':'Sin vídeo seleccionado';
  $('[data-dxpc-file-name="zip"]',form).textContent=selected?selected.name+' · '+(selected.size/1048576).toFixed(2)+' MB':'Selecciona un archivo .zip para comenzar.';
  if(status&&status.dataset.state==='success'&&ready)status.dataset.state='success';
 };
 const validateDetails=()=>{
  if(!fields.title.value.trim()||fields.title.value.trim().length<3){toast('Escribe un nombre de producto de al menos 3 caracteres.');fields.title.focus();return false;}
  if(!fields.description.value.trim()||fields.description.value.trim().length<8){toast('Añade una descripción de al menos 8 caracteres.');fields.description.focus();return false;}
  const price=Number(fields.price_usd.value);
  if(!Number.isFinite(price)||price<0){toast('El precio debe ser un número igual o mayor que cero.');fields.price_usd.focus();return false;}
  if(!fields.store_category.value){toast('Selecciona una categoría de tienda activa.');fields.store_category.focus();return false;}
  fields.category.value='Productos';fields.product_type.value='resource';
  return true;
 };
 const validateMedia=()=>{
  const imageUrl=String(fields.image_url.value||'').trim(),videoUrl=String(fields.video_url.value||'').trim();
  if(imageUrl&&!/^https:\/\//i.test(imageUrl)){toast('La imagen debe utilizar un enlace HTTPS.');fields.image_url.focus();return false;}
  if(videoUrl&&!/^https:\/\//i.test(videoUrl)){toast('El vídeo debe utilizar un enlace HTTPS.');fields.video_url.focus();return false;}
  const img=fields.image.files?.[0],vid=fields.video.files?.[0];
  if(img&&(img.size>8*1024*1024||!/^image\/(jpeg|png|webp|gif|avif)$/.test(img.type||''))){toast('La imagen debe ser JPG, PNG, WEBP, GIF o AVIF y pesar como máximo 8 MB.');return false;}
  if(vid&&(vid.size>50*1024*1024||!/^video\/(mp4|webm|ogg)$/.test(vid.type||''))){toast('El vídeo debe ser MP4, WEBM u OGG y pesar como máximo 50 MB.');return false;}
  if(img)fields.image_url.value='';if(imageUrl&&!img)fields.image.value='';
  if(vid)fields.video_url.value='';if(videoUrl&&!vid)fields.video.value='';
  return true;
 };
 form.addEventListener('input',sync,true);form.addEventListener('change',sync,true);
 fields.image.addEventListener('change',()=>{if(fields.image.files?.length)fields.image_url.value='';sync();});
 fields.image_url.addEventListener('input',()=>{if(fields.image_url.value.trim())fields.image.value='';});
 fields.video.addEventListener('change',()=>{if(fields.video.files?.length)fields.video_url.value='';sync();});
 fields.video_url.addEventListener('input',()=>{if(fields.video_url.value.trim())fields.video.value='';});
 form.addEventListener('click',event=>{
  const go=event.target.closest('[data-dxpc-go]');if(go){setStep(Number(go.dataset.dxpcGo));return;}
  if(event.target.closest('[data-dxpc-next]')){const step=Number(form.dataset.dxpcStep||0);if(step===0&&!validateDetails())return;if(step===1&&!validateMedia())return;setStep(step+1);return;}
  if(event.target.closest('[data-dxpc-prev]')){setStep(Number(form.dataset.dxpcStep||0)-1);return;}
  if(event.target.closest('[data-dxpc-publish]')){event.preventDefault();void publishProduct();}
 },true);
 async function publishProduct(){
  if(publish.dataset.busy==='true')return;
  if(!validateDetails()||!validateMedia()){setStep(0);return;}
  const original=fields.file.files?.[0];
  if(!original||!String(original.name||'').toLowerCase().endsWith('.zip')||!original.size){toast('Selecciona el ZIP original del resource.');setStep(2);fields.file.click();return;}
  if(original.size>50_000_000){toast('El ZIP supera el límite de 50 MB de Supabase Free.');setStep(2);return;}
  if(fields.file.dataset.dripxZipReady!=='true'||!(isNamedZipBlob(window.__DRIPX_PROCESSED_PRODUCT_FILE))){toast('Primero pulsa Trabajar en el inspector ZIP y espera a que termine la protección y compilación.');setStep(2);return;}
  publish.dataset.busy='true';publish.dataset.completed='false';publish.disabled=true;publish.textContent='Enviando al servidor…';
  try{
   fields.category.value='Productos';fields.product_type.value='resource';
   const submitter=$('[data-dxpc-submit-proxy]',form);
   if(typeof form.requestSubmit==='function')form.requestSubmit(submitter);
   else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  }catch(error){publish.dataset.busy='false';publish.disabled=false;publish.textContent='Publicar producto protegido →';toast(error.message||'No se pudo iniciar el guardado.');}
 }
 const observe=new MutationObserver(sync);
 if(status)observe.observe(status,{subtree:true,childList:true,characterData:true,attributes:true});
 observe.observe(fields.file,{attributes:true,attributeFilter:['data-dripx-zip-ready']});
 observe.observe(form,{attributes:true,attributeFilter:['data-dripx-zip-processing','aria-busy']});
 form.addEventListener('submit',()=>{publish.dataset.busy='true';publish.disabled=true;},true);
 window.addEventListener('dripx:product-save-finished',()=>{publish.dataset.busy='false';publish.textContent='Publicar producto protegido →';sync();});
 window.addEventListener('dripx:catalog-updated',()=>{publish.dataset.busy='false';publish.textContent='Publicar producto protegido →';sync();});
 setStep(0);sync();
 void loadCategories(fields.store_category).catch(error=>{toast(error.message||'No se pudieron cargar categorías.');if(status){status.textContent='ERROR DE CATEGORÍAS: '+(error.message||'');status.dataset.state='error';}publish.disabled=true;});
 console.info('[DRIPX] New product creator mounted with live legacy persistence and protected ZIP pipeline.');
}
function scan(){
 if(!active())return;
 const form=$('#dxcm-product-form-host #product-form');
 if(form&&form!==mountedForm&&form.dataset.dxpcReady!=='true')mount(form);
}
function start(){
 scan();
 if(observer)return;
 const root=$('#app')||document.body;
 observer=new MutationObserver(()=>{scan();});
 observer.observe(root,{childList:true,subtree:true});
}
document.addEventListener('DOMContentLoaded',start,{once:true});
window.addEventListener('dripx:admin-modules-ready',start);
window.addEventListener('dripx:admin-route',start);
window.addEventListener('hashchange',()=>setTimeout(start,160));
if(document.readyState!=='loading')start();
})();