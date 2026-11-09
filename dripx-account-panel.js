(() => {
'use strict';
const C=window.DRIPX_CONFIG||{},lib=window.supabase;
let db=null;
try{if(lib?.createClient&&C.supabaseUrl&&C.supabaseKey)db=lib.createClient(C.supabaseUrl,C.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});}catch(e){console.error('[DRIPX] account panel',e);}
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',key:'<circle cx="8" cy="15" r="5"/><path d="m11.5 11.5 9-9 2 2-2 2 2 2-3 3-2-2-3 3"/>',copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',save:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',package:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/>',lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',spark:'<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/>'};
const icon=n=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[n]||paths.spark)+'</svg>';
const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v)||0);
const date=v=>v?new Date(v).toLocaleDateString('es-DO',{year:'numeric',month:'short',day:'2-digit'}):'—';
let invoiceCache={orders:{},items:[]};
const toast=message=>{let n=$('#dx-account-toast');if(!n){n=document.createElement('div');n.id='dx-account-toast';n.className='dx-account-toast';document.body.append(n);}n.textContent=message;n.classList.add('is-visible');clearTimeout(n._timer);n._timer=setTimeout(()=>n.classList.remove('is-visible'),3500);};
function clearProductsTab(){
 const tabs=$('.profile-tabs');if(!tabs)return;
 let button=$('[data-dripx-owned-products]',tabs);
 if(!button){button=document.createElement('button');button.type='button';button.className='tab';button.dataset.profileTab='productos';button.dataset.dripxOwnedProducts='';button.innerHTML=icon('package')+' Productos';tabs.append(button);}
 button.setAttribute('aria-label','Ver productos y recursos autorizados');
}
window.DRIPX_SET_INVOICE_DATA=(orders,items)=>{invoiceCache={orders:Object.fromEntries((orders||[]).map(order=>[String(order.id),order])),items:items||[]};};
async function renderLicense(){
 const host=$('.profile-content');if(!host||!db)return;clearProductsTab();
 const {data:{session},error:sErr}=await db.auth.getSession();
 if(sErr)throw sErr;if(!session?.user?.id)throw new Error('Inicia sesión con Discord para consultar tu licencia.');
 const [lr,er,or]=await Promise.all([
  db.rpc('customer_get_or_issue_account_license'),
  db.from('dripx_entitlements').select('id,product_id,order_id,granted_at,dripx_products(id,title,description,product_type,file_path,price_usd,resource_name,image_url,version)').eq('user_id',session.user.id).eq('active',true).order('granted_at',{ascending:false}),
  db.from('dripx_orders').select('id,status,total,created_at,approved_at').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(100)
 ]);
 if(lr.error)throw lr.error;if(er.error)throw er.error;if(or.error)throw or.error;
 const lic=Array.isArray(lr.data)?lr.data[0]:lr.data;
 if(!lic?.license_key)throw new Error('No se pudo obtener la licencia permanente.');
 const rows=er.data||[],orders=or.data||[];
 const ids=[...new Set(orders.map(order=>String(order.id)))];
 let items=[];
 if(ids.length){
  const {data:i,error}=await db.from('dripx_order_items').select('order_id,product_id,product_title,unit_price').in('order_id',ids);
  if(error)throw error;items=i||[];
 }
 invoiceCache={orders:Object.fromEntries(orders.map(o=>[String(o.id),o])),items};
 const activeProducts=new Map(rows.map(r=>{
  const p=Array.isArray(r.dripx_products)?r.dripx_products[0]:r.dripx_products;
  return [String(r.product_id),p||null];
 }).filter(([,p])=>!!p));
 const cards=rows.map(r=>{
  const p=Array.isArray(r.dripx_products)?r.dripx_products[0]:r.dripx_products;if(!p)return '';
  const img=/^https?:\/\//i.test(String(p.image_url||''))?'<img src="'+esc(p.image_url)+'" alt="" loading="lazy">':'<span class="dx-license-art-fallback">'+icon('package')+'</span>';
  const o=r.order_id?invoiceCache.orders[String(r.order_id)]:null;
  const dl=p.product_type==='resource'&&!!p.file_path,inv=!!o&&String(o.status).toLowerCase()==='approved';
  return '<article class="dx-license-product"><div class="dx-license-product-art">'+img+'<span>'+(dl?'RESOURCE':'ACCESO')+'</span></div><div class="dx-license-product-copy"><div class="dx-license-product-overline"><span>DRIP X · DIGITAL</span><time>'+date(r.granted_at)+'</time></div><h3>'+esc(p.title||'Producto')+'</h3><p>'+esc(p.description||'Acceso habilitado en tu cuenta.')+'</p>'+(p.resource_name?'<small class="dx-resource-label">Resource · '+esc(p.resource_name)+'</small>':'')+'<div class="dx-license-actions"><button type="button" class="dx-primary-action" '+(dl?'data-download="'+esc(p.id)+'"':'disabled')+'>'+icon('download')+(dl?'Descargar ZIP':'Sin ZIP')+'</button><button type="button" class="dx-secondary-action" '+(inv?'data-dx-invoice="'+esc(r.order_id)+'"':'disabled')+'>'+icon('file')+'Factura</button></div></div></article>';
 }).filter(Boolean).join('');
 const purchaseCards=orders.map(order=>{
  const approved=String(order.status)==='approved';
  const statusLabels={approved:'Pago aprobado',pending:'En verificación',rejected:'Pago rechazado',cancelled:'Cancelado'};
  const orderItems=items.filter(item=>String(item.order_id)===String(order.id));
  const itemHtml=orderItems.map(item=>{
   const productId=String(item.product_id||''),entitled=activeProducts.get(productId);
   const canDownload=approved&&entitled?.product_type==='resource'&&!!entitled.file_path;
   const download=canDownload?'<button type="button" class="dx-history-action primary" data-download="'+esc(productId)+'">'+icon('download')+'Descargar ZIP</button>':(approved?'<span class="dx-history-muted">Acceso en activación</span>':'<span class="dx-history-muted">'+esc(statusLabels[order.status]||order.status)+'</span>');
   const review=approved?'<button type="button" class="dx-history-action" data-dx-review-product="'+esc(productId)+'">'+icon('spark')+'Valorar</button>':'';
   return '<article class="dx-purchase-line"><div class="dx-purchase-line-copy"><strong>'+esc(item.product_title||'Producto digital')+'</strong><small>'+money(item.unit_price)+'</small></div><div class="dx-purchase-line-actions">'+download+review+'</div></article>';
  }).join('');
  const statusClass=approved?'approved':String(order.status)==='pending'?'pending':'closed';
  const invoice=approved?'<button type="button" class="dx-history-action" data-dx-invoice="'+esc(order.id)+'">'+icon('file')+'Factura</button>':'';
  return '<article class="dx-purchase-order"><header><div><small>PEDIDO · '+esc(String(order.id).slice(0,8).toUpperCase())+'</small><time>'+date(order.created_at)+'</time></div><span class="dx-purchase-status '+statusClass+'">'+esc(statusLabels[order.status]||order.status)+'</span></header><div class="dx-purchase-lines">'+(itemHtml||'<p class="dx-history-muted">Este pedido no tiene líneas de producto disponibles.</p>')+'</div><footer><strong>Total · '+money(order.total)+'</strong>'+invoice+'</footer></article>';
 }).join('');
 const purchaseHistory='<section class="dx-purchase-history"><div class="dx-library-heading"><div><span class="dx-eyebrow">ACTIVIDAD DE CUENTA</span><h3>Historial de compras</h3></div><span>'+orders.length+' '+(orders.length===1?'pedido':'pedidos')+'</span></div>'+(purchaseCards?'<div class="dx-purchase-orders">'+purchaseCards+'</div>':'<div class="dx-purchase-empty">Aún no tienes pedidos registrados. Tus compras aparecerán aquí con su estado y descarga cuando se aprueben.</div>')+'<p class="dx-purchase-footnote">'+icon('lock')+' Las descargas requieren un acceso activo y usan un enlace privado temporal de 60 segundos.</p></section>';
 const resource=rows.map(r=>Array.isArray(r.dripx_products)?r.dripx_products[0]?.resource_name:r.dripx_products?.resource_name).find(Boolean)||'resource';
 host.innerHTML='<section class="dx-license-center"><header class="dx-license-banner"><div><span class="dx-eyebrow">CENTRO DE LICENCIAS</span><h2>Tu licencia permanente</h2><p>Una sola clave identifica tu cuenta. Cada resource comprueba por separado que tienes acceso al producto.</p></div><span class="dx-license-banner-icon">'+icon('shield')+'</span></header><section class="dx-account-key-card"><div class="dx-card-heading"><div><span class="dx-eyebrow">IDENTIDAD DRIPX</span><h3>Licencia de cuenta</h3></div><span class="dx-state-pill">'+icon('spark')+' PERMANENTE</span></div><div class="dx-account-key"><div><small>CLAVE PERSONAL</small><strong>'+esc(lic.license_key)+'</strong></div><button type="button" data-dripx-copy-license="'+esc(lic.license_key)+'">'+icon('copy')+'Copiar clave</button></div><div class="dx-account-settings"><label>IP pública del servidor<input data-dx-ip value="'+esc(lic.server_ip||'')+'" placeholder="203.0.113.10"></label><label>Puerto MTA<input data-dx-port type="number" min="1" max="65535" value="'+esc(lic.server_port||'')+'" placeholder="22003"></label><label class="dx-acl-name">Nombre exacto de tu cuenta MTA (opcional)<input data-dx-acl value="'+esc(lic.authorized_account_name||'')+'" maxlength="64" placeholder="NombreDeCuenta"></label><button type="button" class="dx-primary-action dx-save-binding" data-dx-save-binding>'+icon('save')+'Guardar servidor</button></div><div class="dx-acl-guide"><strong>'+icon('lock')+' Permiso ACL requerido</strong><p>El resource solo iniciará si su objeto <code>resource.'+esc(resource)+'</code> o la cuenta MTA configurada pertenece al grupo <code>Admin</code>.</p><p>Agrega uno de estos objetos dentro del grupo Admin en <code>mods/deathmatch/acl.xml</code>:</p><pre>&lt;object name="resource.'+esc(resource)+'" /&gt;\n&lt;!-- o la cuenta MTA: --&gt;\n&lt;object name="user.NombreDeCuenta" /&gt;</pre></div><p class="dx-binding-note">La IP y el puerto se comparan con el origen real de cada petición de MTA. Al guardar otro servidor, se revoca la activación anterior; el servidor nuevo podrá activarse en su siguiente inicio. Un resource que ya esté ejecutándose se bloqueará al recibir su próxima comprobación online.</p></section><div class="dx-library-heading"><div><span class="dx-eyebrow">BIBLIOTECA PERSONAL</span><h3>Productos habilitados</h3></div><span>'+rows.length+' '+(rows.length===1?'producto':'productos')+'</span></div>'+(cards?'<div class="dx-license-grid">'+cards+'</div>':'<div class="dx-license-empty">'+icon('package')+'<strong>Tu biblioteca está vacía</strong><p>Los productos que compres o reclames aparecerán aquí con su descarga y factura cuando corresponda.</p><a href="#productos">Explorar productos</a></div>')+purchaseHistory+'</section>';
 $$('.profile-tabs .tab').forEach(b=>b.classList.toggle('active',b.dataset.profileTab==='licencia'||/licencia/i.test(b.textContent||'')));
}
function showInvoice(id){
 const o=invoiceCache.orders[String(id)];if(!o)throw new Error('No existe un comprobante de compra para este producto.');const items=invoiceCache.items.filter(i=>String(i.order_id)===String(id));
 const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Comprobante DRIP X SHOP</title><style>*{box-sizing:border-box}body{margin:0;background:#eef3f8;color:#122033;font:14px/1.55 Arial,sans-serif}.sheet{max-width:760px;margin:38px auto;background:white;padding:44px;border:1px solid #dce5ee}.top{display:flex;justify-content:space-between;align-items:center}.brand{font-size:24px;font-weight:900;letter-spacing:.12em}.brand b{color:#00a2cf}.pill{border:1px solid #b4dce9;border-radius:30px;padding:6px 11px;color:#007d9f;font-size:10px;font-weight:800}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:22px 0}.meta div{border:1px solid #e6edf3;padding:12px;border-radius:8px}.meta small{display:block;color:#748496}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:13px;border-bottom:1px solid #e6edf3}td:last-child,th:last-child{text-align:right}.total{text-align:right;margin-top:22px;font-size:20px;font-weight:bold}.foot{margin-top:42px;border-top:1px solid #e6edf3;padding-top:16px;color:#748496;font-size:11px}.print{margin-top:24px;border:0;border-radius:8px;background:#007fa8;color:white;padding:12px 18px;font-weight:bold}@media print{body{background:white}.sheet{margin:0;max-width:none;border:0;padding:20px}.print{display:none}}@media(max-width:600px){.sheet{margin:0;padding:22px}.meta{grid-template-columns:1fr}}</style></head><body><main class="sheet"><div class="top"><div><div class="brand">DRIP <b>X</b> SHOP</div><div>Comprobante de compra digital</div></div><span class="pill">PAGO CONFIRMADO</span></div><h1>Factura / recibo</h1><div class="meta"><div><small>Número</small><strong>DX-'+esc(String(o.id).replace(/-/g,'').slice(0,10).toUpperCase())+'</strong></div><div><small>Fecha</small><strong>'+date(o.approved_at||o.created_at)+'</strong></div><div><small>Pedido</small><strong>'+esc(o.id)+'</strong></div><div><small>Estado</small><strong>Confirmado</strong></div></div><table><thead><tr><th>Producto</th><th>Importe</th></tr></thead><tbody>'+(items.length?items.map(i=>'<tr><td>'+esc(i.product_title||'Producto digital')+'</td><td>'+money(i.unit_price)+'</td></tr>').join(''):'<tr><td>Compra digital DRIP X SHOP</td><td>'+money(o.total)+'</td></tr>')+'</tbody></table><div class="total">Total · '+money(o.total)+'</div><div class="foot">DRIP X SHOP · Recursos digitales MTA:SA.<br>Comprobante interno de compra. No sustituye una factura fiscal.</div><button class="print" onclick="window.print()">Imprimir / Guardar PDF</button></main></body></html>';
 const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),w=window.open(url,'_blank');if(!w){URL.revokeObjectURL(url);throw new Error('Permite ventanas emergentes para abrir la factura.');}setTimeout(()=>URL.revokeObjectURL(url),60000);
}
document.addEventListener('click',e=>{
 if(e.target.closest('.profile-tabs [data-profile-tab="licencia"]')){clearProductsTab();setTimeout(()=>renderLicense().catch(err=>toast(err.message||'No se pudo cargar el panel de licencia.')),120);}
 const save=e.target.closest('[data-dx-save-binding]');
 if(save){e.preventDefault();e.stopImmediatePropagation();const ip=$('[data-dx-ip]')?.value?.trim()||'',port=Number($('[data-dx-port]')?.value||0),acl=$('[data-dx-acl]')?.value?.trim()||null;if(!ip||!Number.isInteger(port)||port<1||port>65535){toast('Introduce una IP pública y un puerto MTA válido.');return;}save.disabled=true;db.rpc('dripx_save_account_license_binding',{p_server_ip:ip,p_server_port:port,p_admin_account_name:acl}).then(({error})=>{if(error)throw error;toast('IP, puerto y nombre ACL guardados.');return renderLicense();}).catch(err=>toast(err.message||'No se pudo guardar.')).finally(()=>{if(save.isConnected)save.disabled=false;});}
 const review=e.target.closest('[data-dx-review-product]');if(review){e.preventDefault();e.stopImmediatePropagation();const id=String(review.dataset.dxReviewProduct||'');if(/^[0-9a-f-]{36}$/i.test(id))location.hash='#producto/'+id;return;}
 const inv=e.target.closest('[data-dx-invoice]');if(inv){e.preventDefault();e.stopImmediatePropagation();try{showInvoice(inv.dataset.dxInvoice);}catch(err){toast(err.message);}}
},true);
function boot(){clearProductsTab();if($('.profile-tabs [data-profile-tab="licencia"].active'))renderLicense().catch(err=>toast(err.message||'No se pudo cargar la licencia.'));const obs=new MutationObserver(()=>clearProductsTab());if($('#app'))obs.observe($('#app'),{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();