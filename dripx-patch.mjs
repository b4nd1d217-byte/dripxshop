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
  app = app.slice(0, validatorStart) + "  async function validateProtectedResourceZip(file){\n    const b=state.zipBuild,zip=b?.zip;\n    if(!b||!zip||!b.protected||!b.compiled||!b.licenseInjected)throw new Error('El proceso ZIP no está completo.');\n    if(!file||!file.size||Number(b.finalBlobSize)!==Number(file.size))throw new Error('El ZIP final no coincide con el archivo protegido generado.');\n    const entries=Object.values(zip.files||{}).filter(e=>!e.dir);\n    if(!entries.length)throw new Error('El ZIP está vacío.');\n    const seen=new Set();let expanded=0;\n    for(const e of entries){\n      const n=String(e.name||'');\n      if(!n||n.startsWith('/')||n.includes(String.fromCharCode(92))||n.length>1024||/[\\u0000-\\u001f\\u007f]/.test(n)||n.split('/').some(x=>!x||x==='.'||x==='..'))throw new Error('Ruta insegura: '+n);\n      const k=n.normalize('NFC').toLowerCase();if(seen.has(k))throw new Error('Nombre duplicado: '+n);seen.add(k);\n      const z=Number(e._data?.uncompressedSize??e._data?.length??0);if(!Number.isSafeInteger(z)||z<0)throw new Error('Tamaño inválido: '+n);expanded+=z;\n      if(!Number.isSafeInteger(expanded))throw new Error('Tamaño expandido inválido.');\n    }\n    const metaFile=zip.file('meta.xml');if(!metaFile)throw new Error('Se requiere meta.xml en la raíz.');\n    const meta=await metaFile.async('string'),xml=new DOMParser().parseFromString(meta,'application/xml');\n    if(xml.querySelector('parsererror')||xml.documentElement?.tagName.toLowerCase()!=='meta')throw new Error('meta.xml no es válido.');\n    const id=meta.match(/DRIPX_PRODUCT_ID:[ ]*([0-9a-f-]{36})/i);\n    if(!id||id[1].toLowerCase()!==String(b.productId).toLowerCase())throw new Error('El ID del producto no coincide con el ZIP.');\n    const scripts=[...xml.querySelectorAll('script')].map(n=>({src:String(n.getAttribute('src')||'').replace(/^\\\\.\\\\//,''),type:(n.getAttribute('type')||'server').toLowerCase()}));\n    let shared=0,compiled=0,server=0;\n    for(const s of scripts){\n      if(!s.src||!zip.file(s.src))throw new Error('Archivo inexistente en meta.xml: '+s.src);\n      if(s.type==='shared'&&s.src.toLowerCase().endsWith('.lua')){\n        shared++;const source=await zip.file(s.src).async('string');\n        if(source.split('DRIPX_LICENSE_KEY_PLACEHOLDER').length!==2)throw new Error('La clave debe aparecer una sola vez en el shared.');\n      }\n      if((s.type==='server'||s.type==='client')&&s.src.toLowerCase().endsWith('.lua')&&!/(^|\\/)(config|settings|shared|language|locale)[^/]*\\.lua$/i.test(s.src))throw new Error('Lua sin compilar: '+s.src);\n      if((s.type==='server'||s.type==='client')&&s.src.toLowerCase().endsWith('.luac')){\n        const bytes=await zip.file(s.src).async('uint8array');\n        if(bytes.length<4||bytes[0]!==0x1c||bytes[1]!==0x4d||bytes[2]!==0x76||bytes[3]!==0x62)throw new Error('Bytecode MTA inválido: '+s.src);\n        compiled++;if(s.type==='server')server++;\n      }\n    }\n    if(shared!==1)throw new Error('Se requiere exactamente un archivo shared para la licencia.');\n    if(entries.some(e=>['dripx_license.lua','dripx_guard_shared.lua'].includes(e.name.split('/').pop().toLowerCase())))throw new Error('El ZIP conserva módulos antiguos.');\n    if(!compiled||!server)throw new Error('Faltan scripts server compilados.');\n    return {fileCount:entries.length,compiledCount:compiled,serverCompiledCount:server,expandedBytes:expanded,productId:id[1]};\n  }" + "\n" + app.slice(addStart);
  const addStart = app.indexOf("  async function addProduct(form){", validatorStart);
  if (validatorStart < 0 || addStart < 0) throw new Error('DRIPX patch failed: validator boundaries');
  app = app.slice(0, validatorStart) + "  async function validateProtectedResourceZip(file){\n    if(!window.JSZip)throw new Error('No se pudo cargar el validador ZIP.');\n    if(!file||!file.size)throw new Error('Selecciona un ZIP válido.');\n    const zip=await JSZip.loadAsync(file,{checkCRC32:true}),entries=Object.values(zip.files).filter(e=>!e.dir&&!e.name.startsWith('__MACOSX/')&&!e.name.endsWith('/.DS_Store'));\n    if(!entries.length)throw new Error('El ZIP está vacío.');\n    const seen=new Set();let expanded=0;\n    for(const e of entries){const n=String(e.unsafeOriginalName||e.name);if(n!==e.name||!n||n.startsWith('/')||n.includes(String.fromCharCode(92))||n.length>1024||/[\\u0000-\\u001f\\u007f]/.test(n)||n.split('/').some(x=>!x||x==='.'||x==='..'))throw new Error('Ruta insegura.');const k=n.normalize('NFC').toLowerCase();if(seen.has(k))throw new Error('Nombres duplicados.');seen.add(k);const z=Number(e._data?.uncompressedSize||0);if(!Number.isSafeInteger(z)||z<0)throw new Error('Tamaño inválido.');expanded+=z;if(!Number.isSafeInteger(expanded))throw new Error('Tamaño expandido inválido.');const m=typeof e.unixPermissions==='string'?parseInt(e.unixPermissions,8):Number(e.unixPermissions||0);if((m&0o170000)===0o120000)throw new Error('No se permiten enlaces simbólicos.');}\n    const metas=entries.filter(e=>e.name==='meta.xml');if(metas.length!==1)throw new Error('Se requiere un único meta.xml en la raíz.');\n    const meta=await metas[0].async('string'),xml=new DOMParser().parseFromString(meta,'application/xml');if(xml.querySelector('parsererror')||xml.documentElement?.tagName.toLowerCase()!=='meta')throw new Error('meta.xml no es válido.');\n    const id=meta.match(/DRIPX_PRODUCT_ID:[ ]*([0-9a-f-]{36})/i);if(!id)throw new Error('Falta el ID DRIPX.');\n    const scripts=[...xml.querySelectorAll('script')].map(n=>({src:String(n.getAttribute('src')||'').replace(/^\\.\\//,''),type:(n.getAttribute('type')||'server').toLowerCase()}));let shared=0,compiled=0,server=0;\n    for(const s of scripts){if(!s.src||!zip.file(s.src))throw new Error('Archivo inexistente: '+s.src);if(s.type==='shared'&&s.src.toLowerCase().endsWith('.lua')){shared++;if(!(await zip.file(s.src).async('string')).includes('DRIPX_LICENSE_KEY_PLACEHOLDER'))throw new Error('Falta la clave en shared.');}if((s.type==='server'||s.type==='client')&&s.src.toLowerCase().endsWith('.lua')&&!/(^|\\/)(config|settings|shared|language|locale)[^/]*\\.lua$/i.test(s.src))throw new Error('Lua sin compilar: '+s.src);if((s.type==='server'||s.type==='client')&&s.src.toLowerCase().endsWith('.luac')){const b=await zip.file(s.src).async('uint8array');if(b.length<4||b[0]!==0x1c||b[1]!==0x4d||b[2]!==0x76||b[3]!==0x62)throw new Error('Bytecode MTA inválido: '+s.src);compiled++;if(s.type==='server')server++;}}\n    if(shared!==1)throw new Error('Se requiere un único shared con la clave.');\n    if(entries.some(e=>e.name.toLowerCase().endsWith('dripx_license.lua')||e.name.toLowerCase().endsWith('dripx_guard_shared.lua')))throw new Error('El ZIP conserva módulos antiguos.');\n    if(!compiled||!server)throw new Error('Faltan scripts server compilados.');\n    return {fileCount:entries.length,compiledCount:compiled,serverCompiledCount:server,expandedBytes:expanded,productId:id[1]};\n  }\n" + "\n" + "  async function verifyResourceProductBeforePublish(productId){\n    const {data:{session},error}=await db.auth.getSession();if(error)throw error;\n    if(!session?.access_token)throw new Error('Tu sesión administrativa ha caducado.');\n    const response=await fetch(String(C.supabaseUrl)+'/functions/v1/dripx-validate-product-upload',{\n      method:'POST',\n      headers:{apikey:C.supabaseKey||C.publishableKey,authorization:'Bearer '+session.access_token,'content-type':'application/json'},\n      body:JSON.stringify({product_id:productId}),\n      signal:AbortSignal.timeout(60000)\n    });\n    const result=await response.json().catch(()=>({}));\n    if(!response.ok||result.valid!==true)throw new Error(result.message||result.error||'Supabase no pudo verificar el ZIP protegido. El producto permanecerá sin publicar.');\n    return result;\n  }\n" + "\n" + app.slice(addStart);

  const newAddStart = app.indexOf("  async function addProduct(form){");
  const checkoutStart = app.indexOf("\n\n  async function checkout(){", newAddStart);
  if (newAddStart < 0 || checkoutStart < 0) throw new Error('DRIPX patch failed: product save boundaries');
  app = app.slice(0, newAddStart) + "  async function addProduct(form){\n    const fd=new FormData(form),type=String(fd.get('product_type')||'resource');\n    const title=String(fd.get('title')||'').trim(),description=String(fd.get('description')||'').trim();\n    const price=Number(fd.get('price_usd')),file=fd.get('file'),image=fd.get('image'),video=fd.get('video');\n    if(!['resource','plan'].includes(type))throw new Error('Tipo de producto no válido.');\n    if(!title||!description||!Number.isFinite(price)||price<0)throw new Error('Revisa el nombre, la descripción y el precio del producto.');\n    if(type==='resource'){\n      const input=form.querySelector('input[name=\"file\"]'),processed=window.__DRIPX_PROCESSED_PRODUCT_ZIP;\n      if(!file||!file.size||!input||input.dataset.dripxZipReady!=='true'||!processed||processed.name!==file.name||!processed.productId||!/-DRIPX-protegido\\.zip$/i.test(file.name))throw new Error('El ZIP no ha terminado el proceso automático de protección. Selecciona el ZIP original y espera a que esté listo.');\n      if(!/\\.zip$/i.test(file.name))throw new Error('Los resources MTA:SA deben subirse en formato ZIP.');\n      await validateProtectedResourceZip(file);\n    }\n    const planCode=String(fd.get('plan_code')||'').trim().toLowerCase();\n    if(type==='plan'&&!/^[a-z0-9_-]{2,40}$/.test(planCode))throw new Error('Indica un código válido para el plan.');\n    const imageUrl=String(fd.get('image_url')||'').trim(),videoUrl=String(fd.get('video_url')||'').trim();\n    if(imageUrl&&!/^https:\\/\\//i.test(imageUrl))throw new Error('El enlace de imagen debe usar HTTPS.');\n    if(videoUrl&&!/^https:\\/\\//i.test(videoUrl))throw new Error('El enlace de vídeo debe usar HTTPS.');\n    const row={\n      ...(type==='resource'?{id:window.__DRIPX_PROCESSED_PRODUCT_ZIP?.productId}:{}),\n      title,description,price_usd:price,category:String(fd.get('category')||'Planes'),\n      status:'draft',protection_enabled:type==='resource',featured:fd.has('featured'),is_featured:fd.has('featured'),product_type:type,\n      plan_code:type==='plan'?planCode:null,billing_period:type==='plan'?String(fd.get('billing_period')):null,\n      features:type==='plan'?String(fd.get('features')||'').split('\\n').map(value=>value.trim()).filter(Boolean):[],\n      image_url:imageUrl||null,video_url:videoUrl||null\n    };\n    let existing=null;\n    if(type==='resource'&&row.id){\n      existing=await call(db.from('dripx_products').select('id,file_path,image_path,video_path').eq('id',row.id).maybeSingle());\n    }\n    const product=existing\n      ? await call(db.from('dripx_products').update(row).eq('id',row.id).select().single())\n      : await call(db.from('dripx_products').insert(row).select().single());\n    window.__DRIPX_DRAFT_PRODUCT_ID=product.id;\n    const uploaded=[];\n    try{\n      if(image?.size){\n        if(image.size>8*1024*1024)throw new Error('La imagen supera el límite de 8 MB.');\n        const ext=String(image.name||'').split('.').pop().toLowerCase();\n        const mime=image.type||({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif'}[ext]||'');\n        if(!/^image\\/(jpeg|png|webp|gif|avif)$/.test(mime))throw new Error('Formato de imagen no permitido.');\n        const path='products/'+product.id+'/'+crypto.randomUUID()+'.'+ext;\n        const upload=await db.storage.from('product-images').upload(path,image,{upsert:false,contentType:mime});\n        if(upload.error)throw upload.error;\n        uploaded.push(['product-images',path]);\n        await call(db.from('dripx_products').update({image_path:path,image_url:null}).eq('id',product.id));\n      }\n      if(video?.size){\n        if(video.size>50*1024*1024)throw new Error('El vídeo supera el límite de 50 MB.');\n        const ext=String(video.name||'').split('.').pop().toLowerCase();\n        const mime=video.type||({mp4:'video/mp4',webm:'video/webm',ogg:'video/ogg',ogv:'video/ogg'}[ext]||'');\n        if(!/^video\\/(mp4|webm|ogg)$/.test(mime))throw new Error('Formato de vídeo no permitido.');\n        const path='products/'+product.id+'/'+crypto.randomUUID()+'.'+ext;\n        const upload=await db.storage.from('product-videos').upload(path,video,{upsert:false,contentType:mime});\n        if(upload.error)throw upload.error;\n        uploaded.push(['product-videos',path]);\n        await call(db.from('dripx_products').update({video_path:path,video_url:null}).eq('id',product.id));\n      }\n      if(type==='resource'){\n        const path='products/'+product.id+'/resource.zip';\n        await window.DRIPX_UPLOAD_FILE('product-files',path,file,pct=>{\n          const status=document.querySelector('#product-zip-upload-state');\n          if(status)status.textContent='Subiendo ZIP protegido a almacenamiento privado… '+Math.round(pct)+'%';\n        });\n        uploaded.push(['product-files',path]);\n        await call(db.from('dripx_products').update({file_path:path}).eq('id',product.id));\n        await verifyResourceProductBeforePublish(product.id);\n      }\n      await call(db.from('dripx_products').update({status:'published',updated_at:new Date().toISOString()}).eq('id',product.id));\n    }catch(error){\n      try{\n        await call(db.from('dripx_products').update({status:'draft',updated_at:new Date().toISOString()}).eq('id',product.id));\n      }catch(persistError){\n        console.error('[DRIPX] No se pudo actualizar el estado del borrador; se conservaron los datos existentes:',persistError);\n      }\n      window.__DRIPX_DRAFT_PRODUCT_ID=product.id;\n      console.error('[DRIPX] Fallo de publicación; el borrador y los archivos guardados se conservaron para reintentar.',{productId:product.id,error});\n      throw new Error((error?.message||'Error al guardar el producto.')+' El borrador se conservó; corrige el problema y vuelve a intentarlo sin volver a cargar los datos.');\n    }\n    const status=document.querySelector('#product-zip-upload-state');\n    if(status&&type==='resource')status.textContent='Protección verificada por Supabase. Producto publicado correctamente.';\n    window.__DRIPX_DRAFT_PRODUCT_ID=null;\n    toast('Producto guardado y publicado.');\n    await Promise.all([loadProducts(),loadCategories()]);\n    await renderAdmin();\n  }\n" + app.slice(checkoutStart);

  once("if(status==='published'&&prod.product_type==='resource'&&!prod.file_path)throw new Error('No se puede publicar un producto sin archivo descargable.');",
       "if(status==='published'&&prod.product_type==='resource'){if(!prod.file_path)throw new Error('No se puede publicar un resource sin ZIP.');await verifyResourceProductBeforePublish(b.dataset.toggleProduct);}",
       'verify resource before manual publishing');


  const pipelineStart = app.indexOf("  async function protectZip(){");
  const pipelineEnd = app.indexOf("  async function renderAdmin(){", pipelineStart);
  if (pipelineStart < 0 || pipelineEnd < 0) throw new Error('DRIPX patch failed: legacy ZIP pipeline boundaries');
  const modernPipeline = String.raw`  async function protectZip(){
    const b=state.zipBuild;
    if(!b?.zip)throw new Error('Selecciona el ZIP original.');
    if(b.protected)throw new Error('Este ZIP ya fue protegido.');
    if(!b.shared?.length)throw new Error('Se requiere un archivo Lua existente declarado como shared.');
    if(b.shared.length!==1)throw new Error('El resource debe tener exactamente un archivo shared para alojar la clave.');
    if(!b.server?.length)throw new Error('Se requiere al menos un script de servidor para validar la licencia.');
    const working=b.zip,productId=b.productId||crypto.randomUUID(),nl=String.fromCharCode(10);
    const shared=b.shared[0].name,sharedFile=working.file(shared);
    if(!sharedFile)throw new Error('No se encuentra el archivo shared: '+shared);
    const sharedText=await sharedFile.async('string');
    if(sharedText.includes('DRIPX_LICENSE_KEY_PLACEHOLDER'))throw new Error('El ZIP ya contiene un marcador de licencia.');
    const serverNames=b.server.map(x=>x.name),clientNames=b.client.map(x=>x.name);
    const serverPayloads=[],clientPayloads=[];
    for(let i=0;i<serverNames.length;i++){
      const name=serverNames[i],file=working.file(name);
      if(!file)throw new Error('Falta el script de servidor: '+name);
      const source=await file.async('string');
      if(source.includes('DRIPX_LICENSE_GATED_PAYLOAD'))throw new Error('Script ya protegido: '+name);
      const prefix=i===0?'addEvent("dripx:license:ready",false)'+nl:'';
      serverPayloads.push({name,source:prefix+'local DRIPX_LICENSE_GATED_PAYLOAD=function(...)'+nl+source+nl+'end'+nl+'addEventHandler("dripx:license:ready",resourceRoot,function(...) DRIPX_LICENSE_GATED_PAYLOAD(...) end,true,"high")'+nl});
    }
    for(const name of clientNames){
      const file=working.file(name);if(!file)throw new Error('Falta el script de cliente: '+name);
      const source=await file.async('string');
      if(source.includes('DRIPX_LICENSE_GATED_PAYLOAD'))throw new Error('Script ya protegido: '+name);
      clientPayloads.push({name,source:'if not DRIPX_CLIENT_LICENSE_EVENT_REGISTERED then addEvent("dripx:license:clientReady",true) DRIPX_CLIENT_LICENSE_EVENT_REGISTERED=true end'+nl+'local DRIPX_LICENSE_GATED_PAYLOAD=function(...)'+nl+source+nl+'end'+nl+'addEventHandler("dripx:license:clientReady",resourceRoot,function(...) DRIPX_LICENSE_GATED_PAYLOAD(...) if not DRIPX_CLIENT_START_REPLAYED then DRIPX_CLIENT_START_REPLAYED=true setTimer(function() triggerEvent("onClientResourceStart",resourceRoot,getThisResource()) end,50,1) end end)'+nl});
    }
    const metaFile=working.file(b.metaName);if(!metaFile)throw new Error('No se encuentra meta.xml.');
    let meta=await metaFile.async('string');
    if(/DRIPX_PRODUCT_ID:/i.test(meta))throw new Error('meta.xml ya contiene un ID DRIPX.');
    const close=meta.lastIndexOf('</meta>');if(close<0)throw new Error('meta.xml no tiene cierre válido.');
    const runtime=['-- DRIPX license bootstrap','local DRIPX_PRODUCT_ID="'+productId+'"','local DRIPX_API="https://tlhbxhfszoxgfewuofof.supabase.co/functions/v1/dripx-license"','local DRIPX_VALIDATED=false','local DRIPX_STOPPING=false','local DRIPX_BOOTSTRAP_STARTED=false','local DRIPX_CLIENT_READY={}','local DRIPX_TIMER','local dripxValidate',
      'local function dripxStop() if DRIPX_STOPPING then return end DRIPX_STOPPING=true if isTimer(DRIPX_TIMER) then killTimer(DRIPX_TIMER) end setTimer(function() stopResource(getThisResource()) end,500,1) end',
      'local function dripxInstall() if type(hash)~="function" then return nil end return hash("sha1",string.lower(tostring(DRIPX_LICENSE_KEY or "")).."|"..tostring(getServerPort())) end',
      'local function dripxSchedule() if isTimer(DRIPX_TIMER) then killTimer(DRIPX_TIMER) end DRIPX_TIMER=setTimer(function() if dripxValidate then dripxValidate(DRIPX_VALIDATED and "validate" or "activate") end end,60000,1) end',
      'dripxValidate=function(action) if DRIPX_STOPPING then return end local key=tostring(DRIPX_LICENSE_KEY or "") local install=dripxInstall() if key=="" or key=="DRIPX_LICENSE_KEY_PLACEHOLDER" or not install then dripxStop() return end local data={license_key=key,product_id=DRIPX_PRODUCT_ID,resource_name=getResourceName(getThisResource()),installation_id=install,server_port=getServerPort(),server_name=getServerName()} fetchRemote(DRIPX_API.."/"..action,{method="POST",headers={["Content-Type"]="application/json"},postData=toJSON(data)},function(body,info) if DRIPX_STOPPING then return end info=type(info)=="table" and info or {} local code=tonumber(info.statusCode) or 0 local result=type(body)=="string" and fromJSON(body) or nil if info.success==true and code==200 and type(result)=="table" and result.valid==true then if not DRIPX_VALIDATED then DRIPX_VALIDATED=true triggerEvent("dripx:license:ready",resourceRoot) triggerEvent("onResourceStart",resourceRoot,getThisResource()) for _,player in ipairs(getElementsByType("player")) do if isElement(player) and not DRIPX_CLIENT_READY[player] then DRIPX_CLIENT_READY[player]=true triggerClientEvent(player,"dripx:license:clientReady",resourceRoot) end end end dripxSchedule() elseif code>=400 and code<500 then dripxStop() else dripxSchedule() end end) end',
      'addEventHandler("onResourceStart",resourceRoot,function() if DRIPX_BOOTSTRAP_STARTED then return end DRIPX_BOOTSTRAP_STARTED=true dripxValidate("activate") end)',
      'addEventHandler("onPlayerResourceStart",root,function(resource) if resource==getThisResource() and not DRIPX_CLIENT_READY[source] then DRIPX_CLIENT_READY[source]=true triggerClientEvent(source,"dripx:license:clientReady",resourceRoot) end end)',
      'addEventHandler("onPlayerQuit",root,function() DRIPX_CLIENT_READY[source]=nil end)',
      'addEventHandler("onResourceStop",resourceRoot,function() if isTimer(DRIPX_TIMER) then killTimer(DRIPX_TIMER) end end)'].join(nl);
    working.file(shared,sharedText+nl+'-- DRIP X SHOP license binding'+nl+'DRIPX_LICENSE_KEY = "DRIPX_LICENSE_KEY_PLACEHOLDER"'+nl);
    for(const item of serverPayloads)working.file(item.name,item.source);
    for(const item of clientPayloads)working.file(item.name,item.source);
    const first=serverPayloads[0];
    working.file(first.name,first.source+nl+runtime+nl);
    meta=meta.slice(0,close)+'<!-- DRIPX_PRODUCT_ID: '+productId+' -->'+nl+meta.slice(close);
    working.file(b.metaName,meta);
    b.zip=working;b.productId=productId;b.protected=true;b.compiled=false;b.compiledFiles=[];b.licenseInjected=true;b.finalBlobSize=0;
    const protect=document.querySelector('#zip-protect'),compile=document.querySelector('#zip-compile'),download=document.querySelector('#zip-download');
    if(protect)protect.disabled=true;if(compile)compile.disabled=false;if(download)download.disabled=true;
    const status=document.querySelector('#zip-status');if(status)status.textContent='Protección integrada · '+serverNames.length+' scripts de servidor · '+clientNames.length+' de cliente.';
    return {productId,protectedServerFiles:serverNames.length,protectedClientFiles:clientNames.length};
  }
  async function compileZip(){
    const b=state.zipBuild;
    if(!b?.protected)throw new Error('Primero protege el resource.');
    if(b.compiled)throw new Error('Este ZIP ya está compilado.');
    const selected=[...new Set((b.compileTargets||[]).map(x=>x.name))];
    if(!selected.length)throw new Error('No hay scripts client/server declarados que deban compilarse.');
    const getToken=async(forceRefresh=false)=>{
      const current=await db.auth.getSession();
      if(current.error)throw current.error;
      const session=current.data?.session;
      const exp=Number(session?.expires_at||0)*1000;
      if(!forceRefresh&&session?.access_token&&(!exp||exp>Date.now()+90000))return session.access_token;
      const refreshed=await db.auth.refreshSession();
      if(refreshed.error||!refreshed.data?.session?.access_token)throw new Error('La sesión administrativa expiró. Inicia sesión de nuevo; el ZIP protegido permanece guardado.');
      return refreshed.data.session.access_token;
    };
    let token=await getToken(false);
    const working=b.zip;
    let meta=await working.file(b.metaName).async('string');
    const completed=new Set(b.compiledFiles||[]);
    const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    for(let i=0;i<selected.length;i++){
      const name=selected[i];
      if(completed.has(name))continue;
      const sourceFile=working.file(name);
      if(!sourceFile)throw new Error('No se encuentra el script pendiente de compilación: '+name);
      const source=await sourceFile.async('string');
      if(!source.trim())throw new Error('El script está vacío y no puede compilarse: '+name);
      if(source.charCodeAt(0)===0x1b)throw new Error('El archivo ya parece estar compilado: '+name);
      const status=document.querySelector('#zip-status');
      if(status)status.textContent='Compilando '+(completed.size+1)+'/'+selected.length+' · '+name;
      let response,result;
      for(let attempt=0;attempt<2;attempt++){
        if(attempt===1){token=await getToken(true);await delay(350);}
        response=await fetch(String(C.supabaseUrl).replace(/\/+$/,'')+'/functions/v1/dripx-lua-compiler',{
          method:'POST',
          headers:{apikey:C.supabaseKey||C.publishableKey,authorization:'Bearer '+token,'content-type':'application/json'},
          body:JSON.stringify({filename:name,source}),
          signal:AbortSignal.timeout(90000)
        });
        result=await response.json().catch(()=>({error:'Respuesta no válida del compilador.'}));
        if(response.status===401&&attempt===0)continue;
        break;
      }
      if(!response?.ok||!result?.compiled_base64){
        const reason=String(result?.detail||result?.error||('HTTP '+(response?.status||'desconocido')));
        console.error('[DRIPX][COMPILER]',{file:name,status:response?.status,error:reason,sourceBytes:new TextEncoder().encode(source).length});
        throw new Error('No se pudo compilar '+name+' ('+(response?.status||'sin respuesta')+'): '+reason+'. El avance anterior se conservó; puedes reintentar.');
      }
      let bytes;
      try{bytes=Uint8Array.from(atob(result.compiled_base64),c=>c.charCodeAt(0));}
      catch{throw new Error('El compilador devolvió datos dañados para '+name+'.');}
      if(bytes.length<4||bytes[0]!==0x1c||bytes[1]!==0x4d||bytes[2]!==0x76||bytes[3]!==0x62)throw new Error('La salida no es bytecode MTA válido: '+name);
      const output=name.slice(0,-4)+'.luac';
      const original=b.scriptSrcByFile?.get(name);
      if(!original)throw new Error('No existe una referencia meta.xml para el script '+name+'.');
      const at=meta.indexOf(original);
      if(at<0)throw new Error('meta.xml ya no contiene la referencia original de '+name+'.');
      const compiledPath=original.slice(0,-4)+'.luac';
      const nextMeta=meta.slice(0,at)+compiledPath+meta.slice(at+original.length);
      if(working.file(output))throw new Error('Ya existe el destino compilado '+output+'. No se sobrescribió ningún archivo.');
      working.file(output,bytes);
      working.remove(name);
      meta=nextMeta;
      working.file(b.metaName,meta);
      completed.add(name);
      b.zip=working;
      b.metaText=meta;
      b.compiledFiles=[...completed];
      if(status)status.textContent='Compilado '+completed.size+'/'+selected.length+' · '+name;
    }
    if(completed.size!==selected.length)throw new Error('La compilación quedó incompleta. Se conservó el avance realizado.');
    if(new DOMParser().parseFromString(meta,'application/xml').querySelector('parsererror'))throw new Error('meta.xml inválido tras compilar.');
    b.zip=working;b.metaText=meta;b.compiledFiles=[...completed];b.compiled=true;
    const protect=document.querySelector('#zip-protect'),compile=document.querySelector('#zip-compile'),download=document.querySelector('#zip-download');
    if(protect)protect.disabled=true;if(compile)compile.disabled=true;if(download)download.disabled=false;
    const st=document.querySelector('#zip-status');if(st)st.textContent='Compilación MTA completada · '+completed.size+' scripts verificados.';
    return {compiledCount:completed.size};
  }
  async function downloadProtectedZip(){
    const b=state.zipBuild;if(!b?.protected||!b.compiled||!b.licenseInjected)throw new Error('Completa protección y compilación.');
    const blob=await b.zip.generateAsync({type:'blob',mimeType:'application/zip',compression:'DEFLATE',compressionOptions:{level:6}});if(!blob?.size)throw new Error('ZIP final vacío.');b.finalBlobSize=blob.size;
    window.__DRIPX_PENDING_PRODUCT_ID=b.productId;
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='DRIPX-resource-protegido.zip';a.style.display='none';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);return {bytes:blob.size};
  }
  async function resumeZip(){
    const b=state.zipBuild;
    if(!b?.zip)throw new Error('No hay un proceso ZIP que pueda reanudarse.');
    if(!b.protected)await protectZip();
    if(!b.compiled)await compileZip();
    if(!b.licenseInjected&&typeof window.DRIPX_INJECT_LICENSE_GUARD==='function')await window.DRIPX_INJECT_LICENSE_GUARD();
    if(!b.licenseInjected)throw new Error('No se pudo confirmar la integración de licencia.');
    return downloadProtectedZip();
  }
  window.DRIPX_PRODUCT_PROTECTION_ACTIONS={protect:protectZip,compile:compileZip,download:downloadProtectedZip,resume:resumeZip};`;

  app = app.slice(0, pipelineStart) + modernPipeline + "\n" + app.slice(pipelineEnd);


  const protectionRequired = [
    'DRIPX_LICENSE_KEY_PLACEHOLDER', 'DRIPX_PRODUCT_ID:', 'dripx:license:clientReady',
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
