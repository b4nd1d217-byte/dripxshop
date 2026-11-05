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

  once("p.product_type==='plan'?'El plan se activa en tu cuenta cuando administración confirma el pago.':'Una vez verificado el pago, administración habilita la descarga segura en tu cuenta.'",
       "Number(p.price_usd)===0?'Este producto es gratuito. Al obtenerlo, se habilita en Mi cuenta > Productos.':(p.product_type==='plan'?'El plan se activa en tu cuenta cuando administración confirma el pago.':'Una vez verificado el pago, administración habilita la descarga segura en tu cuenta.')",
       'free product detail text');

  once("if(b.hasAttribute('data-add')){const id=b.dataset.add;",
       "if(b.hasAttribute('data-claim-free')){const id=b.dataset.claimFree;if(!state.user){toast('Inicia sesión con Discord para obtener este producto gratis.');await db.auth.signInWithOAuth({provider:'discord',options:{redirectTo:location.origin+'/#producto/'+id}});return;}const result=await call(db.rpc('dripx_claim_free_product',{p_product_id:id}));if(!result?.ok)throw new Error('No se pudo confirmar la entrega del producto.');toast(result?.already_owned?'Este producto ya estaba en tu cuenta.':'Producto gratuito añadido a tu cuenta.');window.__DRIPX_CATALOG_OWNERSHIP_REFRESH=true;window.dispatchEvent(new CustomEvent('dripx:ownership-changed'));location.hash='#productos';return;}if(b.hasAttribute('data-add')){const id=b.dataset.add;",
       'free claim RPC');

  const profileOld = "}else{const lic=await call(db.rpc('customer_get_or_issue_account_license'));";
  const profileNew = "}else if(tab==='productos'){const rows=await call(db.from('dripx_entitlements').select('id,product_id,granted_at,dripx_products(id,title,description,product_type,file_path,price_usd)').eq('user_id',state.user.id).eq('active',true).order('granted_at',{ascending:false}));content=rows.length?rows.map(e=>{const p=e.dripx_products||{};return '<article class=\"order-card\"><header><div><strong>'+esc(p.title||'Producto')+'</strong><br><small class=\"muted\">'+(Number(p.price_usd)===0?'Acceso gratuito':'Acceso habilitado')+' · '+new Date(e.granted_at).toLocaleDateString('es-DO')+'</small></div><span class=\"status approved\">Activo</span></header>'+(p.file_path?'<div class=\"order-actions\"><button class=\"btn primary\" data-download=\"'+esc(p.id)+'\">Descargar resource</button></div>':'<small class=\"muted\">Plan o acceso activo en tu cuenta.</small>')+'</article>';}).join(''):'<div class=\"empty\">Todavía no tienes productos habilitados.</div>';}else{const lic=await call(db.rpc('customer_get_or_issue_account_license'));";
  if (app.includes(profileOld)) once(profileOld, profileNew, 'profile entitlements tab'); else console.warn('DRIPX patch: profile entitlements already implemented or source layout differs; keeping original profile renderer.');

  const tabInvoices = D + "tab==='facturas'?'active':''}";
  const tabLicense = D + "tab==='licencia'?'active':''}";
  const tabProducts = D + "tab==='productos'?'active':''}";
  const oldTabs = '<button class="tab ' + tabInvoices + '" data-profile-tab="facturas">▤ Facturas</button><button class="tab ' + tabLicense + '" data-profile-tab="licencia">🔑 Licencia</button>';
  const newTabs = '<button class="tab ' + tabInvoices + '" data-profile-tab="facturas">▤ Facturas</button><button class="tab ' + tabProducts + '" data-profile-tab="productos">Productos</button><button class="tab ' + tabLicense + '" data-profile-tab="licencia">🔑 Licencia</button>';
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
  return app;
}
