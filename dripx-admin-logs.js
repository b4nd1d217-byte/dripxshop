(()=>{'use strict';
if(window.__DRIPX_ADMIN_LOGS_INSTALLED)return;
window.__DRIPX_ADMIN_LOGS_INSTALLED=true;
const db=window.DRIPX_SUPABASE_CLIENT;if(!db)return;
const ROOT='#dx-admin-logs',ALLOWED=new Set(['store','security','sales_public','sales_private','reviews','coupons','support','licenses']);
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').trim().toLowerCase();
const state={rows:[],loading:false,saving:new Set(),testing:new Set(),error:''};
const timeout=(promise,ms,label)=>new Promise((resolve,reject)=>{const id=setTimeout(()=>reject(new Error(label)),ms);Promise.resolve(promise).then(v=>{clearTimeout(id);resolve(v);},e=>{clearTimeout(id);reject(e);});});
const categories=[
 ['store','Tienda','Nuevos productos gratuitos, publicaciones, archivos y cambios del catálogo','▦'],
 ['security','Seguridad','Inicio de sesión, acciones administrativas y alertas de seguridad','◈'],
 ['sales_public','Ventas públicas','Ventas confirmadas y anuncios de compras','＄'],
 ['sales_private','Ventas privadas','Pedidos, pagos y comprobantes visibles para el equipo','＄'],
 ['reviews','Reseñas','Reseñas verificadas, ediciones y moderación','☆'],
 ['coupons','Cupones','Creación y actividad de cupones','%'],
 ['support','Soporte','Tickets, mensajes y acciones de soporte','◷'],
 ['licenses','Licencias','Activaciones, validaciones y errores de licencia','⚿']
];
const categoryMap=new Map(categories.map(item=>[item[0],item]));
function active(){return window.DRIPX_IS_ADMIN===true&&String(location.hash||'').toLowerCase().startsWith('#admin')&&(window.DRIPX_ADMIN_LOGS_TAB_ACTIVE===true||norm(location.hash.split('/')[1])==='logs'||sessionStorageSafe()==='logs');}
function sessionStorageSafe(){try{return sessionStorage.getItem('dripx.admin.tab')||'';}catch{return '';}}
function toast(message){const t=$('#toast');if(t){t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3600);}}
function host(){
 let h=$(ROOT);if(!h){h=document.createElement('section');h.id=ROOT.slice(1);h.className='dxlg-shell';$('#app')?.prepend(h);}
 return h;
}
async function adminSession(){
 const s=await timeout(db.auth.getSession(),8000,'La sesión de Discord tardó demasiado.');
 if(s.error)throw s.error;
 if(!s.data.session?.user?.id)throw new Error('Inicia sesión con Discord para administrar los registros.');
 const a=await timeout(db.rpc('dripx_is_admin'),8000,'No se pudo confirmar el permiso administrativo.');
 if(a.error)throw a.error;if(a.data!==true)throw new Error('Tu cuenta no tiene permisos de administración.');
 return s.data.session;
}
async function load(force=false){
 if(state.loading||(!force&&!active()))return;
 state.loading=true;const h=host();h.dataset.loaded='loading';
 try{
  await adminSession();
  const result=await timeout(db.rpc('dripx_admin_get_discord_log_settings'),12000,'La configuración de Discord tardó demasiado.');
  if(result.error)throw result.error;
  const returned=Array.isArray(result.data)?result.data:[];
  state.rows=categories.map(([category,label,description,icon])=>{
   const row=returned.find(item=>item.category===category);
   return {category,label:row?.label||label,description:row?.description||description,icon,enabled:row?.enabled===true,webhook_url:String(row?.webhook_url||''),updated_at:row?.updated_at||null};
  });
  state.error='';render();const panel=$(ROOT);if(panel)panel.dataset.loaded='1';
 }catch(error){
  state.error=error.message||'No se pudo consultar la configuración.';
  h.innerHTML='<div class="dxlg-error"><span class="dxlg-kicker">DRIP X SHOP · SISTEMA</span><h2>Logs de Discord</h2><p>'+esc(state.error)+'</p><button type="button" data-dxlg-reload>↻ Reintentar</button></div>';
  console.error('[DRIPX admin logs]',error);
 }finally{state.loading=false;}
}
function savedState(row){return row.webhook_url?'Webhook guardado · URL oculta':'Webhook sin configurar';}
function render(){
 if(!active())return;
 const h=host();
 h.innerHTML='<header class="dxlg-head"><div><span class="dxlg-kicker">SISTEMA / INTEGRACIONES</span><h2>Logs de Discord</h2><p>Configura un destino independiente para cada categoría. Las URLs de los webhooks se mantienen ocultas y solo se consultan mediante permisos administrativos.</p></div><button type="button" class="dxlg-refresh" data-dxlg-reload>↻ Actualizar</button></header><div class="dxlg-notice"><span>✓</span><div><strong>Registro y entrega por categoría</strong><small>Los eventos se enrutan desde el servidor. Los canales públicos y privados de ventas permanecen separados.</small></div><span class="dxlg-notice-state">CONFIGURACIÓN SEGURA</span></div><div class="dxlg-grid"><section class="dxlg-list"><header><div><h3>Destinos configurados</h3><p>Una URL de webhook distinta por categoría.</p></div><span class="dxlg-count">'+state.rows.filter(r=>r.enabled&&r.webhook_url).length+' / '+state.rows.length+' ACTIVOS</span></header><div class="dxlg-rows">'+state.rows.map(row=>'<article class="dxlg-row" data-category="'+row.category+'"><div class="dxlg-row-head"><span class="dxlg-icon">'+esc(row.icon)+'</span><div class="dxlg-row-copy"><strong>'+esc(row.label)+'</strong><small>'+esc(row.description)+'</small></div><label class="dxlg-toggle"><input type="checkbox" data-dxlg-enabled '+(row.enabled?'checked':'')+'><span></span><em>'+(row.enabled?'ACTIVO':'PAUSADO')+'</em></label></div><div class="dxlg-row-status"><span class="dxlg-state-dot '+(row.enabled&&row.webhook_url?'is-active':'')+'"></span><span>'+savedState(row)+'</span><span class="dxlg-updated">'+(row.updated_at?'Actualizado '+new Date(row.updated_at).toLocaleDateString('es-DO'):'Sin guardar')+'</span></div><div class="dxlg-row-fields"><label class="dxlg-secret-field"><span>URL DE WEBHOOK</span><input type="password" data-dxlg-webhook autocomplete="new-password" spellcheck="false" placeholder="'+(row.webhook_url?'Introduce una URL nueva para reemplazarla':'https://discord.com/api/webhooks/…')+'"><small>No se muestra el valor guardado. Déjalo vacío para conservarlo.</small></label><div class="dxlg-row-actions"><label class="dxlg-clear"><input type="checkbox" data-dxlg-clear> Eliminar webhook guardado</label><button type="button" class="dxlg-test" data-dxlg-test="'+row.category+'" '+(!row.enabled||!row.webhook_url?'disabled':'')+'>◉ Probar canal</button><button type="button" class="dxlg-save" data-dxlg-save="'+row.category+'">Guardar</button></div></div><p class="dxlg-row-message" data-dxlg-message role="status"></p></article>').join('')+'</div></section><aside class="dxlg-preview"><span class="dxlg-kicker">MENSAJE DE PRUEBA</span><h3>Embed de DRIP X</h3><p>Envía una prueba auténtica al webhook guardado. El resultado se muestra después de recibir respuesta de Discord.</p><div class="dxlg-embed"><div class="dxlg-embed-brand"><span>DX</span><div><strong>DRIP X SHOP</strong><small>LOG · '+(categories[0][1].toUpperCase())+'</small></div></div><h4>Conexión de Discord</h4><p>Este mensaje confirma que el webhook de la categoría seleccionada acepta embeds.</p><div class="dxlg-embed-footer">DRIP X SHOP · SISTEMA DE REGISTROS</div></div><div class="dxlg-preview-status" data-dxlg-global-status>Selecciona una categoría y pulsa “Probar canal”.</div><div class="dxlg-preview-tip"><strong>Protección</strong><small>Las direcciones completas de los webhooks nunca se escriben en el documento ni se incluyen en mensajes de registro.</small></div></aside></div>';
}
function showMessage(row,message,kind){
 const node=row?.querySelector('[data-dxlg-message]');if(node){node.textContent=message;node.className='dxlg-row-message '+(kind||'');}
}
async function save(category,button){
 const rowNode=$('.dxlg-row[data-category="'+CSS.escape(category)+'"]'),row=state.rows.find(x=>x.category===category);
 if(!rowNode||!row||state.saving.has(category))return;
 const input=rowNode.querySelector('[data-dxlg-webhook]'),enabled=rowNode.querySelector('[data-dxlg-enabled]').checked,clear=rowNode.querySelector('[data-dxlg-clear]').checked;
 const newUrl=String(input.value||'').trim();
 if(newUrl&&!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+$/i.test(newUrl)){
  showMessage(rowNode,'Introduce una URL válida de webhook de Discord.','is-error');input.focus();return;
 }
 const webhook=clear?null:(newUrl||row.webhook_url||null);
 if(enabled&&!webhook){showMessage(rowNode,'Configura una URL antes de activar esta categoría.','is-error');return;}
 if(webhook&&state.rows.some(other=>other.category!==category&&other.webhook_url.toLowerCase()===webhook.toLowerCase())){
  showMessage(rowNode,'Cada categoría necesita un canal de Discord diferente.','is-error');return;
 }
 state.saving.add(category);if(button)button.disabled=true;showMessage(rowNode,'Guardando la configuración…','');
 try{
  await adminSession();
  const result=await timeout(db.rpc('dripx_admin_save_discord_log_setting',{p_category:category,p_enabled:enabled,p_webhook_url:webhook}),12000,'No se pudo guardar la configuración.');
  if(result.error)throw result.error;
  if(result.data!==true)throw new Error('Supabase no confirmó el cambio.');
  row.enabled=enabled;row.webhook_url=webhook||'';row.updated_at=new Date().toISOString();
  toast('Destino de Discord actualizado.');
  await load(true);
 }catch(error){showMessage(rowNode,error.message||'No se pudo guardar.','is-error');}
 finally{state.saving.delete(category);if(button)button.disabled=false;}
}
async function test(category,button){
 const rowNode=$('.dxlg-row[data-category="'+CSS.escape(category)+'"]'),row=state.rows.find(x=>x.category===category);
 if(!rowNode||!row||state.testing.has(category))return;
 if(!row.enabled||!row.webhook_url){showMessage(rowNode,'Guarda y activa un webhook antes de probarlo.','is-error');return;}
 state.testing.add(category);if(button)button.disabled=true;
 const status=$('[data-dxlg-global-status]');if(status)status.textContent='Enviando embed de prueba…';
 showMessage(rowNode,'Enviando una prueba real a Discord…','');
 try{
  await adminSession();
  const result=await timeout(db.functions.invoke('dripx-discord-logs',{body:{event:'test_embed',details:{category}}}),16000,'Discord no respondió a tiempo.');
  if(result.error)throw result.error;
  const data=result.data||{};
  if(data.sent!==true)throw new Error(data.reason==='not_configured'?'El servidor no reconoce un webhook activo para este canal.':data.reason||'Discord no confirmó el envío.');
  showMessage(rowNode,'✓ Embed enviado y confirmado por Discord.','is-success');
  if(status)status.textContent='Prueba confirmada · '+row.label+' · '+new Date().toLocaleTimeString('es-DO');
 }catch(error){
  showMessage(rowNode,error.message||'No se pudo completar la prueba.','is-error');
  if(status)status.textContent='La prueba no se confirmó. Revisa el webhook y los registros de la función.';
 }finally{state.testing.delete(category);if(button)button.disabled=false;}
}
document.addEventListener('click',event=>{
 const reload=event.target.closest('[data-dxlg-reload]');if(reload){event.preventDefault();void load(true);return;}
 const saveButton=event.target.closest('[data-dxlg-save]');if(saveButton){event.preventDefault();void save(saveButton.dataset.dxlgSave,saveButton);return;}
 const testButton=event.target.closest('[data-dxlg-test]');if(testButton){event.preventDefault();void test(testButton.dataset.dxlgTest,testButton);return;}
},true);
document.addEventListener('change',event=>{
 const row=event.target.closest('.dxlg-row');if(!row)return;
 if(event.target.matches('[data-dxlg-enabled]')){
  const value=event.target.checked;const label=row.querySelector('.dxlg-toggle em');if(label)label.textContent=value?'ACTIVO':'PAUSADO';
  const testButton=row.querySelector('[data-dxlg-test]');if(testButton)testButton.disabled=!value||!state.rows.find(x=>x.category===row.dataset.category)?.webhook_url;
 }
 if(event.target.matches('[data-dxlg-clear]')){
  const input=row.querySelector('[data-dxlg-webhook]');if(input){input.disabled=event.target.checked;if(event.target.checked)input.value='';}
 }
});
function sync(){
 if(!active()){$(ROOT)?.remove();return;}
 if(!$(ROOT)||$(ROOT).dataset.loaded!=='1')void load();
}
window.addEventListener('hashchange',()=>setTimeout(sync,100));
window.addEventListener('dripx:admin-logs-view',()=>void load());
const observer=new MutationObserver(()=>{if(active()&&!$(ROOT))void load();});
const start=()=>{const app=$('#app');if(app)observer.observe(app,{childList:true,subtree:true});sync();};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();