import { readFile } from 'node:fs/promises';

export async function patchApp(source) {
  let app = source;
  const D = '$' + '{';
  const once = (oldText, newText, label, all = false) => {
    const count = app.split(oldText).length - 1;
    if (!count) throw new Error('DRIPX source patch failed: ' + label + ' (not found)');
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
  const categoriesPanelStart = protectionPanelStart >= 0 ? app.indexOf("    if(tab==='categorias'){", protectionPanelStart) : -1;
  if (protectionPanelStart < 0 || categoriesPanelStart < 0) throw new Error('DRIPX patch failed: Protection panel boundaries');
  app = app.slice(0, protectionPanelStart) + app.slice(categoriesPanelStart);

  const protectionBindingStart = app.indexOf("if(tab==='proteccion'){$('#resource-zip')");
  const protectionBindingEnd = protectionBindingStart >= 0 ? app.indexOf("\n  }\n  async function validateProtectedResourceZip(file){", protectionBindingStart) : -1;
  if (protectionBindingStart < 0 || protectionBindingEnd < 0) throw new Error('DRIPX patch failed: Protection tab bindings');
  app = app.slice(0, protectionBindingStart) + app.slice(protectionBindingEnd);

  const oldUploadNotice = '<div class="notice">Para entregar un resource con licencia DRIPX, primero usa <b>Protección ZIP</b>, compila los Lua seleccionados y sube aquí el ZIP final con los archivos .luac y su meta.xml actualizado. La tienda insertará la clave personal al descargar.</div>';
  const newUploadNotice = '<div class="dx-product-protection-intro"><strong>Protección automática DRIPX</strong><p>Selecciona el ZIP original del resource. La tienda analizará meta.xml, protegerá los scripts de servidor, compilará automáticamente los Lua compatibles e incorporará el guardián de licencia. Los archivos de configuración y type="shared" se conservarán sin exponer claves.</p><small>Solo se publicará después de verificar el ZIP en Supabase.</small></div>';
  once(oldUploadNotice, newUploadNotice, 'integrate protection inside product form');

  return app;
}
