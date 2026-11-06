import { readFile } from 'node:fs/promises';

export async function patchApp(source) {
  let app = source;
  const D = '$' + '{';
  const once = (oldText, newText, label, all = false) => {
    const count = app.split(oldText).length - 1;
    if (!count) {
      console.log('DRIPX patch: ' + label + ' (already applied or source layout differs)');
      return;
    }
    if (!all && count !== 1) throw new Error('DRIPX source patch failed: ' + label + ' (found ' + count + ')');
    app = all ? app.split(oldText).join(newText) : app.replace(oldText, newText);
    console.log('DRIPX patch: ' + label + ' (' + count + ')');
  };

  once("function updateUserUI(){const logged=!!state.user;", "function updateUserUI(){window.DRIPX_IS_ADMIN=!!state.isAdmin;const logged=!!state.user;", 'publish verified admin state to UI layer');

  once("Number(p.price_usd)>0?money(p.price_usd):'Consultar'", "Number(p.price_usd)>0?money(p.price_usd):'Gratis'", 'catalogue free price');
  once("Number(p.price_usd)>0?money(p.price_usd):'Consultar precio'", "Number(p.price_usd)>0?money(p.price_usd):'Gratis'", 'detail free price');

  const pId = D + 'p.id}';
  const disabled = D + "Number(p.price_usd)<=0?'disabled':''}";
  const oldCardLabel = D + "p.product_type==='plan'?'✦ Elegir plan':'🛒 Agregar'}";
  const oldCard = '<button class="btn primary" data-add="' + pId + '" ' + disabled + '>' + oldCardLabel + '</button>';
  const tick = String.fromCharCode(96);
  const freeCard = '<button class="btn primary" data-claim-free="' + pId + '">Obtener gratis</button>';
  const paidCard = '<button class="btn primary" data-add="' + pId + '">' + D + "p.product_type==='plan'?'Elegir plan':'Agregar'" + '}</button>';
  once(oldCard, D + 'Number(p.price_usd)===0?' + tick + freeCard + tick + ':' + tick + paidCard + tick + '}', 'catalogue free action');

  const oldDetailLabel = D + "p.product_type==='plan'?'✦ Elegir plan':'🛒 Agregar al carrito'}";
  const oldDetail = '<button class="btn primary full" data-add="' + pId + '" ' + disabled + '>' + oldDetailLabel + '</button>';
  const freeDetail = '<button class="btn primary full" data-claim-free="' + pId + '">Obtener gratis</button>';
  const paidDetail = '<button class="btn primary full" data-add="' + pId + '">' + D + "p.product_type==='plan'?'Elegir plan':'Agregar al carrito'" + '}</button>';
  once(oldDetail, D + 'Number(p.price_usd)===0?' + tick + freeDetail + tick + ':' + tick + paidDetail + tick + '}', 'detail free action');

  once("if(!title||!Number.isFinite(price)||price<=0)throw new Error('Revisa el nombre y el precio del producto.');",
       "if(!title||!Number.isFinite(price)||price<0)throw new Error('Revisa el nombre y el precio del producto.');", 'admin create zero price');
  once("!Number.isFinite(changes.price_usd)||changes.price_usd<=0",
       "!Number.isFinite(changes.price_usd)||changes.price_usd<0", 'admin edit zero price');
  once('name="price_usd" type="number" min="0.01" step="0.01"',
       'name="price_usd" type="number" min="0" step="0.01"', 'zero price inputs', true);

  const oldFreeDetail = "p.product_type==='plan'?'El plan se activa en tu cuenta cuando administración confirma el pago.':'Una vez verificado el pago, administración habilita la descarga segura en Mi cuenta > Licencia.'";
  const newFreeDetail = "Number(p.price_usd)===0?'Este producto es gratuito. Al obtenerlo, aparecerá en Mi cuenta > Productos.':(p.product_type==='plan'?'El plan se activa en tu cuenta cuando administración confirma el pago.':'Una vez verificado el pago, administración habilita los recursos en Mi cuenta > Productos.')";
  if (app.includes(oldFreeDetail)) once(oldFreeDetail, newFreeDetail, 'free product detail text');
  else console.warn('DRIPX patch: free product detail text source differs; keeping the source copy.');

  once("if(b.hasAttribute('data-add')){const id=b.dataset.add;",
       "if(b.hasAttribute('data-claim-free')){const id=b.dataset.claimFree;if(!state.user){toast('Inicia sesión con Discord para obtener este producto gratis.');await db.auth.signInWithOAuth({provider:'discord',options:{redirectTo:location.origin+'/#producto/'+id}});return;}const {data:{session},error:sessionError}=await db.auth.getSession();if(sessionError)throw sessionError;if(!session?.access_token)throw new Error('Tu sesión de Discord expiró. Vuelve a iniciar sesión.');const config=window.DRIPX_CONFIG||{};const membershipResponse=await fetch(String(config.supabaseUrl)+'/functions/v1/dripx-discord-membership',{method:'POST',headers:{apikey:config.supabaseKey||config.publishableKey,authorization:'Bearer '+session.access_token,'content-type':'application/json'},body:'{}'});const membership=await membershipResponse.json().catch(()=>({}));if(!membershipResponse.ok||membership.member!==true)throw new Error(membership.message||'No se pudo verificar tu acceso al servidor oficial de Discord.');const result=await call(db.rpc('dripx_claim_free_product',{p_product_id:id}));if(!result?.ok)throw new Error('No se pudo confirmar la entrega del producto.');toast(result?.already_owned?'Este producto ya estaba en tu cuenta.':'Producto gratuito añadido a tu cuenta.');window.__DRIPX_CATALOG_OWNERSHIP_REFRESH=true;window.dispatchEvent(new CustomEvent('dripx:ownership-changed'));location.hash='#productos';return;}if(b.hasAttribute('data-add')){const id=b.dataset.add;",
       'free claim RPC');

  const profileOld = "}else{const lic=await call(db.rpc('customer_get_or_issue_account_license'));";
  const profileNew = profileOld;
  if (app.includes(profileOld)) once(profileOld, profileNew, 'profile entitlements tab'); else console.warn('DRIPX patch: profile entitlements already implemented or source layout differs; keeping original profile renderer.');

  const tabInvoices = D + "tab==='facturas'?'active':''}";
  const tabLicense = D + "tab==='licencia'?'active':''}";
  const tabProducts = D + "tab==='productos'?'active':''}";
  const oldTabs = '<button class="tab ' + tabInvoices + '" data-profile-tab="facturas">▤ Facturas</button><button class="tab ' + tabLicense + '" data-profile-tab="licencia">🔑 Licencia</button>';
  const newTabs = oldTabs;
  if (app.includes(oldTabs)) once(oldTabs, newTabs, 'profile products tab'); else console.warn('DRIPX patch: profile products tab already present or source layout differs; skipping optional tab injection.');

  once("await call(db.storage.from('product-files').upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'}));",
       "await window.DRIPX_UPLOAD_FILE('product-files',path,file,pct=>{const status=document.querySelector('#product-zip-upload-state');if(status)status.textContent='Subiendo ZIP protegido… '+Math.round(pct)+'%';});",
       'resumable product ZIP');

  const oldAdmin = D + "esc(p.category)} · " + D + "esc(p.status)}" + D + "p.product_type==='plan'?' · Plan '+esc(p.plan_code):''}";
  const newAdmin = D + "esc(p.category)} · " + D + "esc(p.status)}" + D + "p.product_type==='plan'?' · Plan '+esc(p.plan_code):(p.file_path?' · ZIP guardado':' · ZIP pendiente')}";
  once(oldAdmin, newAdmin, 'admin ZIP status');

  const zipReader = (await readFile('dripx-zip-reader.txt', 'utf8')).trimEnd() + '\n';
  const zipStart = app.indexOf('  async function loadZipForProtection(file){');
  const zipEnd = app.indexOf('  function makeLicenseGuard()', zipStart);
  if (zipStart < 0 || zipEnd < 0) throw new Error('DRIPX source patch failed: ZIP reader boundaries');
  app = app.slice(0, zipStart) + zipReader + app.slice(zipEnd);
  console.log('DRIPX patch: full ZIP inventory reader with root-folder normalization');

  once("const tabs=['pedidos','tickets','resenas','productos','proteccion','categorias','usuarios','ajustes'];",
       "const tabs=['pedidos','tickets','resenas','productos','categorias','usuarios','ajustes'];",
       'remove standalone Protection tab');
  once("proteccion:'🛡️ Protección',", "", 'remove Protection tab label');

  const protectionPanelStart = app.indexOf("    if(tab==='proteccion'){");
  if (protectionPanelStart >= 0) {
    const categoriesPanelStart = app.indexOf("    if(tab==='categorias'){", protectionPanelStart);
    if (categoriesPanelStart < 0) throw new Error('DRIPX patch failed: Protection panel end');
    app = app.slice(0, protectionPanelStart) + app.slice(categoriesPanelStart);
  }
  const protectionBindingStart = app.indexOf("if(tab==='proteccion'){$('#resource-zip')");
  if (protectionBindingStart >= 0) {
    const protectionBindingEnd = app.indexOf("\n  }\n  async function validateProtectedResourceZip(file){", protectionBindingStart);
    if (protectionBindingEnd < 0) throw new Error('DRIPX patch failed: Protection tab binding end');
    app = app.slice(0, protectionBindingStart) + app.slice(protectionBindingEnd);
  }

  const oldUploadNotice = '<div class="notice">Para entregar un resource con licencia DRIPX, primero usa <b>Protección ZIP</b>, compila los Lua seleccionados y sube aquí el ZIP final con los archivos .luac y su meta.xml actualizado. La tienda insertará la clave personal al descargar.</div>';
  const newUploadNotice = '';
  once(oldUploadNotice, newUploadNotice, 'integrate protection inside product form');


  const validatorStart = app.indexOf("  async function validateProtectedResourceZip(file){");
  const addStart = app.indexOf("  async function addProduct(form){", validatorStart);
  if (validatorStart < 0 || addStart < 0) throw new Error('DRIPX patch failed: validator boundaries');
  app = app.slice(0, validatorStart) + "  async function validateProtectedResourceZip(file){\n    if(!window.JSZip)throw new Error('No se pudo cargar el validador ZIP.');\n    if(!file||!file.size)throw new Error('Selecciona un ZIP válido.');\n    const zip=await JSZip.loadAsync(file,{checkCRC32:true});\n    const entries=Object.values(zip.files).filter(entry=>!entry.dir&&!entry.name.startsWith('__MACOSX/')&&!entry.name.endsWith('/.DS_Store'));\n    if(!entries.length)throw new Error('El ZIP está vacío.');\n    const seen=new Set();let expanded=0;\n    for(const entry of entries){\n      const original=String(entry.unsafeOriginalName||entry.name);\n      if(original!==entry.name||!original||original.startsWith('/')||original.includes('\\\\')||original.length>1024||/[\\u0000-\\u001f\\u007f]/.test(original)||original.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('El ZIP contiene una ruta insegura.');\n      const key=original.normalize('NFC').toLowerCase();\n      if(seen.has(key))throw new Error('El ZIP contiene nombres duplicados.');\n      seen.add(key);\n      const size=Number(entry._data?.uncompressedSize||0);\n      if(!Number.isSafeInteger(size)||size<0)throw new Error('El ZIP declara un tamaño inválido.');\n      expanded+=size;if(!Number.isSafeInteger(expanded))throw new Error('El tamaño descomprimido no es válido.');\n      const rawMode=entry.unixPermissions,mode=typeof rawMode==='string'&&/^[0-7]{5,6}$/.test(rawMode)?parseInt(rawMode,8):Number(rawMode||0);\n      if((mode&0o170000)===0o120000)throw new Error('No se permiten enlaces simbólicos.');\n    }\n    const byBase=name=>entries.filter(entry=>entry.name.split('/').pop()?.toLowerCase()===name.toLowerCase());\n    const metaEntries=byBase('meta.xml'),licenseEntries=byBase('dripx_license.lua'),sharedEntries=byBase('dripx_guard_shared.lua');\n    if(metaEntries.length!==1||licenseEntries.length!==1||sharedEntries.length!==1)throw new Error('El ZIP necesita un único meta.xml, dripx_license.lua y dripx_guard_shared.lua.');\n    if(metaEntries[0].name!=='meta.xml'||licenseEntries[0].name!=='dripx_license.lua'||sharedEntries[0].name!=='dripx_guard_shared.lua')throw new Error('Los archivos del guardián DRIPX deben estar en la raíz del resource.');\n    const template=await licenseEntries[0].async('string'),shared=await sharedEntries[0].async('string'),meta=await metaEntries[0].async('string');\n    const token=template.match(/local DRIPX_SHARED_GUARD_EXPECTED = \"([a-f0-9]{48})\"/);\n    if(!token||!template.includes('DRIPX_PRODUCT_ID_PLACEHOLDER')||!template.includes('DRIPX_LICENSE_KEY_PLACEHOLDER')||!template.includes('DRIPX_ACL_ACCOUNT_PLACEHOLDER')||!template.includes('dripx:license:ready')||!template.includes('triggerEvent'))throw new Error('La plantilla de licencia DRIPX está incompleta o no libera la ejecución protegida.');\n    if(!shared.includes('DRIPX_SHARED_LICENSE_GUARD = \"'+token[1]+'\"'))throw new Error('El guardián compartido no coincide con la plantilla de licencia.');\n    const xml=new DOMParser().parseFromString(meta,'application/xml');\n    if(xml.querySelector('parsererror')||xml.documentElement?.tagName.toLowerCase()!=='meta')throw new Error('meta.xml no es un XML válido de MTA:SA.');\n    const available=new Set(entries.map(entry=>entry.name)),scripts=[...xml.querySelectorAll('script')].map(node=>({src:String(node.getAttribute('src')||'').replace(/^\\.\\//,''),type:(node.getAttribute('type')||'server').toLowerCase()}));\n    if(!scripts.length)throw new Error('meta.xml no declara scripts para este resource.');\n    const refs=new Set();let compiled=0,serverCompiled=0;\n    for(const script of scripts){\n      const src=script.src;\n      if(!src||src.startsWith('/')||src.includes('\\\\')||/[\\u0000-\\u001f\\u007f]/.test(src)||src.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('meta.xml contiene una ruta insegura.');\n      const ref=src.normalize('NFC').toLowerCase();if(refs.has(ref))throw new Error('meta.xml contiene scripts duplicados.');refs.add(ref);\n      if(!available.has(src))throw new Error('meta.xml referencia un archivo inexistente: '+src);\n      const lower=src.toLowerCase(),parts=lower.split('/'),base=parts.pop()||'',config=parts.some(part=>['config','configs','settings','shared','language','languages','locale','locales'].includes(part))||/^(config|settings|shared|language|locale)([._-].*)?\\.lua$/i.test(base),licenseSource=base==='dripx_license.lua';\n      if((script.type==='server'||script.type==='client')&&lower.endsWith('.lua')&&!config&&!licenseSource)throw new Error('Queda Lua fuente sin compilar: '+src);\n      if((script.type==='server'||script.type==='client')&&lower.endsWith('.luac')){\n        const entry=zip.file(src);if(!entry)throw new Error('No se encontró '+src+'.');\n        const bytes=await entry.async('uint8array');\n        if(bytes.length<4||bytes[0]!==0x1c||bytes[1]!==0x4d||bytes[2]!==0x76||bytes[3]!==0x62)throw new Error('Bytecode MTA no válido: '+src);\n        compiled++;if(script.type==='server')serverCompiled++;\n      }\n    }\n    const sharedIndex=scripts.findIndex(x=>x.src==='dripx_guard_shared.lua'&&x.type==='shared');\n    const licenseIndex=scripts.findIndex(x=>x.src==='dripx_license.lua'&&x.type==='server');\n    if(sharedIndex<0||licenseIndex<0||sharedIndex>=licenseIndex)throw new Error('meta.xml debe cargar el guardián shared antes del módulo de licencia server-side.');\n    if(!compiled||!serverCompiled)throw new Error('El ZIP debe incluir al menos un Lua de servidor compilado en bytecode MTA.');\n    if(byBase('dripx_license_guard.lua').length||byBase('DRIPX_MANIFEST.json').length)throw new Error('El ZIP mezcla el protector antiguo. Vuelve a subir el ZIP original.');\n    return {fileCount:entries.length,compiledCount:compiled,serverCompiledCount:serverCompiled,expandedBytes:expanded};\n  }\n" + "\n" + "  async function verifyResourceProductBeforePublish(productId){\n    const {data:{session},error}=await db.auth.getSession();if(error)throw error;\n    if(!session?.access_token)throw new Error('Tu sesión administrativa ha caducado.');\n    const response=await fetch(String(C.supabaseUrl)+'/functions/v1/dripx-validate-product-upload',{\n      method:'POST',\n      headers:{apikey:C.supabaseKey||C.publishableKey,authorization:'Bearer '+session.access_token,'content-type':'application/json'},\n      body:JSON.stringify({product_id:productId}),\n      signal:AbortSignal.timeout(60000)\n    });\n    const result=await response.json().catch(()=>({}));\n    if(!response.ok||result.valid!==true)throw new Error(result.message||result.error||'Supabase no pudo verificar el ZIP protegido. El producto permanecerá sin publicar.');\n    return result;\n  }\n" + "\n" + app.slice(addStart);

  const newAddStart = app.indexOf("  async function addProduct(form){");
  const checkoutStart = app.indexOf("\n\n  async function checkout(){", newAddStart);
  if (newAddStart < 0 || checkoutStart < 0) throw new Error('DRIPX patch failed: product save boundaries');
  app = app.slice(0, newAddStart) + "  async function addProduct(form){\n    const fd=new FormData(form),type=String(fd.get('product_type')||'resource');\n    const title=String(fd.get('title')||'').trim(),description=String(fd.get('description')||'').trim();\n    const price=Number(fd.get('price_usd')),file=fd.get('file'),image=fd.get('image'),video=fd.get('video');\n    if(!['resource','plan'].includes(type))throw new Error('Tipo de producto no válido.');\n    if(!title||!description||!Number.isFinite(price)||price<0)throw new Error('Revisa el nombre, la descripción y el precio del producto.');\n    if(type==='resource'){\n      const input=form.querySelector('input[name=\"file\"]'),processed=window.__DRIPX_PROCESSED_PRODUCT_ZIP;\n      if(!file||!file.size||!input||input.dataset.dripxZipReady!=='true'||!processed||processed.name!==file.name||!/-DRIPX-protegido\\.zip$/i.test(file.name))throw new Error('El ZIP no ha terminado el proceso automático de protección. Selecciona el ZIP original y espera a que esté listo.');\n      if(!/\\.zip$/i.test(file.name))throw new Error('Los resources MTA:SA deben subirse en formato ZIP.');\n      await validateProtectedResourceZip(file);\n    }\n    const planCode=String(fd.get('plan_code')||'').trim().toLowerCase();\n    if(type==='plan'&&!/^[a-z0-9_-]{2,40}$/.test(planCode))throw new Error('Indica un código válido para el plan.');\n    const imageUrl=String(fd.get('image_url')||'').trim(),videoUrl=String(fd.get('video_url')||'').trim();\n    if(imageUrl&&!/^https:\\/\\//i.test(imageUrl))throw new Error('El enlace de imagen debe usar HTTPS.');\n    if(videoUrl&&!/^https:\\/\\//i.test(videoUrl))throw new Error('El enlace de vídeo debe usar HTTPS.');\n    const row={\n      title,description,price_usd:price,category:String(fd.get('category')||'Planes'),\n      status:'draft',protection_enabled:type==='resource',featured:fd.has('featured'),is_featured:fd.has('featured'),product_type:type,\n      plan_code:type==='plan'?planCode:null,billing_period:type==='plan'?String(fd.get('billing_period')):null,\n      features:type==='plan'?String(fd.get('features')||'').split('\\n').map(value=>value.trim()).filter(Boolean):[],\n      image_url:imageUrl||null,video_url:videoUrl||null\n    };\n    const product=await call(db.from('dripx_products').insert(row).select().single());\n    const uploaded=[];\n    try{\n      if(image?.size){\n        if(image.size>8*1024*1024)throw new Error('La imagen supera el límite de 8 MB.');\n        const ext=String(image.name||'').split('.').pop().toLowerCase();\n        const mime=image.type||({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif'}[ext]||'');\n        if(!/^image\\/(jpeg|png|webp|gif|avif)$/.test(mime))throw new Error('Formato de imagen no permitido.');\n        const path='products/'+product.id+'/'+crypto.randomUUID()+'.'+ext;\n        const upload=await db.storage.from('product-images').upload(path,image,{upsert:false,contentType:mime});\n        if(upload.error)throw upload.error;\n        uploaded.push(['product-images',path]);\n        await call(db.from('dripx_products').update({image_path:path,image_url:null}).eq('id',product.id));\n      }\n      if(video?.size){\n        if(video.size>50*1024*1024)throw new Error('El vídeo supera el límite de 50 MB.');\n        const ext=String(video.name||'').split('.').pop().toLowerCase();\n        const mime=video.type||({mp4:'video/mp4',webm:'video/webm',ogg:'video/ogg',ogv:'video/ogg'}[ext]||'');\n        if(!/^video\\/(mp4|webm|ogg)$/.test(mime))throw new Error('Formato de vídeo no permitido.');\n        const path='products/'+product.id+'/'+crypto.randomUUID()+'.'+ext;\n        const upload=await db.storage.from('product-videos').upload(path,video,{upsert:false,contentType:mime});\n        if(upload.error)throw upload.error;\n        uploaded.push(['product-videos',path]);\n        await call(db.from('dripx_products').update({video_path:path,video_url:null}).eq('id',product.id));\n      }\n      if(type==='resource'){\n        const path='products/'+product.id+'/'+crypto.randomUUID()+'.zip';\n        await window.DRIPX_UPLOAD_FILE('product-files',path,file,pct=>{\n          const status=document.querySelector('#product-zip-upload-state');\n          if(status)status.textContent='Subiendo ZIP protegido a almacenamiento privado… '+Math.round(pct)+'%';\n        });\n        uploaded.push(['product-files',path]);\n        await call(db.from('dripx_products').update({file_path:path}).eq('id',product.id));\n        await verifyResourceProductBeforePublish(product.id);\n      }\n      await call(db.from('dripx_products').update({status:'published',updated_at:new Date().toISOString()}).eq('id',product.id));\n    }catch(error){\n      for(const [bucket,path] of uploaded){\n        try{await db.storage.from(bucket).remove([path]);}\n        catch(cleanupError){console.warn('No se pudo limpiar un archivo incompleto:',bucket,path,cleanupError);}\n      }\n      try{await call(db.from('dripx_products').delete().eq('id',product.id));}\n      catch(cleanupError){console.warn('No se pudo limpiar el borrador incompleto:',cleanupError);}\n      throw error;\n    }\n    const status=document.querySelector('#product-zip-upload-state');\n    if(status&&type==='resource')status.textContent='Protección verificada por Supabase. Producto publicado correctamente.';\n    toast('Producto guardado y publicado.');\n    await Promise.all([loadProducts(),loadCategories()]);\n    await renderAdmin();\n  }\n" + app.slice(checkoutStart);

  once("if(status==='published'&&prod.product_type==='resource'&&!prod.file_path)throw new Error('No se puede publicar un producto sin archivo descargable.');",
       "if(status==='published'&&prod.product_type==='resource'){if(!prod.file_path)throw new Error('No se puede publicar un resource sin ZIP.');await verifyResourceProductBeforePublish(b.dataset.toggleProduct);}",
       'verify resource before manual publishing');


  const guardInjectionMarker = "build.zip.file('dripx_license.lua',licenseLua);";
  once(guardInjectionMarker, guardInjectionMarker + "\n    build.licenseInjected=true;", 'mark modern license guard injected');
  const pipelineStart = app.indexOf("  async function protectZip(){");
  const pipelineEnd = app.indexOf("  async function renderAdmin(){", pipelineStart);
  if (pipelineStart < 0 || pipelineEnd < 0) throw new Error('DRIPX patch failed: legacy ZIP pipeline boundaries');
  const modernPipeline = "  async function protectZip(){\n    const b=state.zipBuild;\n    if(!b||!b.zip)throw new Error('Selecciona el ZIP original dentro del formulario del producto.');\n    if(b.protected)throw new Error('Este ZIP ya fue protegido. Selecciona un ZIP original nuevo.');\n    const serverFiles=(b.server||[]).map(item=>item.name);\n    if(!serverFiles.length)throw new Error('El resource debe declarar al menos un script Lua type=\"server\" para validar su licencia.');\n    const working=await JSZip.loadAsync(await b.zip.generateAsync({type:'uint8array'}));\n    for(const name of serverFiles){\n      const entry=working.file(name);\n      if(!entry)throw new Error('No se encontró el script de servidor '+name+'.');\n      const source=await entry.async('string');\n      if(source.includes('DRIPX_LICENSE_GATED_PAYLOAD'))throw new Error(name+' ya contiene una envoltura DRIPX. Selecciona el ZIP original.');\n      const wrapped='-- DRIP X SHOP: este script solo se ejecuta después de validar la licencia DRIPX.\\n'\n        +'local DRIPX_LICENSE_GATED_PAYLOAD = function(...)\\n'\n        +source+'\\n'\n        +'end\\n'\n        +'addEventHandler(\"dripx:license:ready\", resourceRoot, function(...) DRIPX_LICENSE_GATED_PAYLOAD(...) end, true, \"high\")\\n';\n      working.file(name,wrapped);\n    }\n    b.zip=working;\n    b.protected=true;\n    b.compiled=false;\n    b.licenseInjected=false;\n    const protect=document.querySelector('#zip-protect'),compile=document.querySelector('#zip-compile'),download=document.querySelector('#zip-download');\n    if(protect)protect.disabled=true;\n    if(compile)compile.disabled=false;\n    if(download)download.disabled=true;\n    const status=document.querySelector('#zip-status');\n    if(status)status.textContent='Protección de ejecución aplicada a '+serverFiles.length+' scripts de servidor. La compilación automática comenzará ahora.';\n    return {protectedServerFiles:serverFiles.length};\n  }\n  async function compileZip(){\n    const b=state.zipBuild;\n    if(!b?.protected)throw new Error('Primero ejecuta la protección automática del resource.');\n    if(b.compiled)throw new Error('Este ZIP ya está compilado.');\n    const {data:{session},error:sessionError}=await db.auth.getSession();\n    if(sessionError)throw sessionError;\n    if(!session?.access_token)throw new Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');\n    const selected=[...new Set((b.compileTargets||[]).map(item=>item.name))];\n    if(!selected.length)throw new Error('El resource no contiene Lua compilables después de excluir configuración y type=\"shared\".');\n    const working=await JSZip.loadAsync(await b.zip.generateAsync({type:'uint8array'}));\n    let meta=await working.file(b.metaName).async('string');\n    for(let i=0;i<selected.length;i++){\n      const name=selected[i],entry=working.file(name);\n      if(!entry)throw new Error('No se encontró '+name+' para compilar.');\n      const source=await entry.async('string');\n      const status=document.querySelector('#zip-status');\n      if(status)status.textContent='Compilando automáticamente '+(i+1)+'/'+selected.length+': '+name;\n      const response=await fetch(String(C.supabaseUrl)+'/functions/v1/dripx-lua-compiler',{\n        method:'POST',\n        headers:{apikey:C.supabaseKey||C.publishableKey,authorization:'Bearer '+session.access_token,'content-type':'application/json'},\n        body:JSON.stringify({filename:name,source})\n      });\n      const result=await response.json().catch(()=>({}));\n      if(!response.ok||!result.compiled_base64)throw new Error('No se pudo compilar '+name+': '+(result.error||response.status));\n      const expected=name.replace(/\\.lua$/i,'.luac');\n      if(result.filename!==expected)throw new Error('El compilador devolvió un nombre inesperado para '+name+'.');\n      const bytes=Uint8Array.from(atob(result.compiled_base64),char=>char.charCodeAt(0));\n      if(bytes.length<4||bytes.length>8*1024*1024||bytes[0]!==0x1c||bytes[1]!==0x4d||bytes[2]!==0x76||bytes[3]!==0x62)throw new Error('La compilación de '+name+' no tiene una firma bytecode MTA válida.');\n      working.file(expected,bytes);\n      working.remove(name);\n      const originalSrc=b.scriptSrcByFile?.get(name)||name;\n      const escaped=originalSrc.split('').map(ch=>'.^$*+?()[]{}|\\\\/'.includes(ch)?'\\\\'+ch:ch).join('');\n      const refPattern=new RegExp('(<script\\\\b[^>]*src=[\"\\\\']?)'+escaped+'([\"\\\\'][^>]*>)','i');\n      if(!refPattern.test(meta))throw new Error('meta.xml no contiene una referencia al script '+originalSrc+'.');\n      const outputSrc=originalSrc.replace(/\\.lua$/i,'.luac');\n      meta=meta.replace(refPattern,'$1'+outputSrc+'$2');\n    }\n    const xmlCheck=new DOMParser().parseFromString(meta,'application/xml');\n    if(xmlCheck.querySelector('parsererror'))throw new Error('meta.xml quedó inválido después de compilar.');\n    working.file(b.metaName,meta);\n    b.zip=working;b.metaText=meta;b.compiled=true;\n    const protect=document.querySelector('#zip-protect'),compile=document.querySelector('#zip-compile'),download=document.querySelector('#zip-download');\n    if(protect)protect.disabled=true;\n    if(compile)compile.disabled=true;\n    if(download)download.disabled=false;\n    const status=document.querySelector('#zip-status');\n    if(status)status.textContent='Compilación MTA verificada: '+selected.length+' scripts convertidos a .luac. meta.xml actualizado.';\n    return {compiledCount:selected.length};\n  }\n  async function downloadProtectedZip(){\n    const b=state.zipBuild;\n    if(!b?.protected||!b.compiled||!b.licenseInjected)throw new Error('Completa protección, compilación e inyección del guardián DRIPX.');\n    const blob=await b.zip.generateAsync({type:'blob',mimeType:'application/zip',compression:'DEFLATE',compressionOptions:{level:6}});\n    if(!blob||!blob.size)throw new Error('El ZIP protegido final está vacío.');\n    const url=URL.createObjectURL(blob),anchor=document.createElement('a');\n    anchor.href=url;anchor.download='DRIPX-resource-protegido.zip';anchor.style.display='none';\n    document.body.append(anchor);anchor.click();anchor.remove();\n    setTimeout(()=>URL.revokeObjectURL(url),30000);\n    return {bytes:blob.size};\n  }\n  window.DRIPX_PRODUCT_PROTECTION_ACTIONS={protect:protectZip,compile:compileZip,download:downloadProtectedZip};\n";
  app = app.slice(0, pipelineStart) + modernPipeline + "\n" + app.slice(pipelineEnd);


  once("if((script.type==='server'||script.type==='client')&&lower.endsWith('.lua')&&!config)throw new Error('Queda Lua fuente sin compilar: '+src);",
       "if((script.type==='server'||script.type==='client')&&lower.endsWith('.lua')&&!config&&src!=='dripx_license.lua')throw new Error('Queda Lua fuente sin compilar: '+src);",
       'allow only the license template to remain Lua source');


  once("const originalSrc=b.scriptSrcByFile?.get(name)||name;","const originalSrc=b.scriptSrcByFile?.get(name);",'skip meta rewrite for unreferenced Lua');
  const compileBlockStart = app.indexOf("      const refPattern=new RegExp(", app.indexOf("  async function compileZip(){"));
  const compileBlockEnd = compileBlockStart >= 0 ? app.indexOf("\n      meta=meta.replace(refPattern,", compileBlockStart) : -1;
  if (compileBlockStart < 0 || compileBlockEnd < 0) throw new Error('DRIPX patch failed: compiler meta reference block');
  const compileBlockEndLine = app.indexOf("\n", compileBlockEnd + 1);
  const safeMetaRewrite = [
    "      if(b.scriptSrcByFile?.has(name)){",
    "        const refAt=meta.indexOf(originalSrc);",
    "        const tagStart=meta.lastIndexOf('<script',refAt);",
    "        const tagEnd=meta.indexOf('>',refAt);",
    "        if(refAt<0||tagStart<0||tagEnd<refAt)throw new Error('meta.xml no contiene una etiqueta script para '+originalSrc+'.');",
    "        const outputSrc=originalSrc.replace(/\\.lua$/i,'.luac');",
    "        meta=meta.slice(0,refAt)+outputSrc+meta.slice(refAt+originalSrc.length);",
    "      }"
  ].join('\n');
  app = app.slice(0, compileBlockStart) + safeMetaRewrite + app.slice(compileBlockEndLine + 1);


  const protectionRequired = [
    "window.DRIPX_PRODUCT_PROTECTION_ACTIONS",
    "window.DRIPX_UPLOAD_FILE",
    "async function verifyResourceProductBeforePublish(productId)",
    "async function validateProtectedResourceZip(file)",
    "El ZIP no ha terminado el proceso automático de protección"
  ];
  const missingProtection = protectionRequired.filter(fragment => !app.includes(fragment));
  if (missingProtection.length) {
    throw new Error('DRIPX protection upload pipeline is incomplete: ' + missingProtection.join(', '));
  }
  if (app.includes("if(tab==='proteccion'){") || app.includes("proteccion:'🛡️ Protección'")) {
    throw new Error('DRIPX patch failed: standalone Protection administration category is still present.');
  }

  return app;
}
