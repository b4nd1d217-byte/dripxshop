(() => {
'use strict';
const C=window.DRIPX_CONFIG||{},lib=window.supabase;let db=null;
try{if(lib?.createClient&&C.supabaseUrl&&C.supabaseKey)db=lib.createClient(C.supabaseUrl,C.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});}catch(e){console.error('[DRIPX] review client',e);}
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const starSvg=()=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93L12 2.8Z"/></svg>';
const stars=value=>{const n=Math.max(0,Math.min(5,Number(value)||0));return '<span class="dx-review-stars" aria-label="'+n+' de 5 estrellas">'+[1,2,3,4,5].map(i=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93L12 2.8Z" fill="'+(i<=n?'currentColor':'none')+'"/></svg>').join('')+'</span>';};
const date=v=>v?new Date(v).toLocaleDateString('es-DO',{year:'numeric',month:'short',day:'2-digit'}):'—';
const notify=message=>{let n=$('#dx-review-toast');if(!n){n=document.createElement('div');n.id='dx-review-toast';n.className='dx-review-toast';document.body.append(n);}n.textContent=message;n.classList.add('is-visible');clearTimeout(n._timer);n._timer=setTimeout(()=>n.classList.remove('is-visible'),3600);};
let productBusy=false,adminBusy=false;
let ratingMap={},ratingLoadedAt=0,ratingPromise=null;
async function syncCatalogRatings(force=false){
 if(!db)return;
 if(ratingPromise)return ratingPromise;
 if(!force&&Date.now()-ratingLoadedAt<30000)return;
 ratingPromise=(async()=>{
  const {data,error}=await db.from('dripx_reviews').select('product_id,rating').eq('published',true);
  if(error)throw error;
  const map={};
  for(const row of data||[]){const id=String(row.product_id);(map[id]??=[]).push(Number(row.rating)||0);}
  ratingMap=map;ratingLoadedAt=Date.now();
  $$('#app [data-add],#app [data-claim-free]').forEach(button=>{
   const id=String(button.dataset.add||button.dataset.claimFree||'');
   if(!id)return;
   const card=button.closest('.product-card,[data-product-id],article,.product')||button.parentElement?.parentElement;
   if(!card)return;
   const scores=ratingMap[id]||[],avg=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:0;
   let node=card.querySelector(':scope > .dx-catalog-rating');
   if(!node){node=document.createElement('div');node.className='dx-catalog-rating';const anchor=card.querySelector('.product-bottom,.product-actions,.product-footer')||button.parentElement||button;anchor.insertAdjacentElement('beforebegin',node);}
   const key=scores.length+':'+avg.toFixed(2);
   if(node.dataset.ratingKey!==key){node.innerHTML=stars(avg)+'<span>'+(scores.length?avg.toFixed(1)+' · '+scores.length+' '+(scores.length===1?'reseña':'reseñas'):'Sin reseñas')+'</span>';node.dataset.ratingKey=key;}
  });
 })().finally(()=>{ratingPromise=null;});
 return ratingPromise;
}

function productRoute(){return location.hash.match(/^#producto\/([0-9a-f-]{36})(?:[/?#]|$)/i)?.[1]||'';}
async function renderProductReviews(){
 if(!db)return;const id=productRoute(),app=$('#app');if(!id||!app){$('#dx-product-reviews')?.remove();return;}
 if(productBusy)return;let root=$('#dx-product-reviews');if(root?.dataset.productId===id&&root.dataset.ready==='true')return;
 productBusy=true;
 try{
  if(!root||root.dataset.productId!==id){root?.remove();root=document.createElement('section');root.id='dx-product-reviews';root.className='dx-product-reviews';root.dataset.productId=id;app.append(root);}
  root.dataset.ready='false';root.innerHTML='<div class="dx-reviews-loading">Cargando opiniones verificadas…</div>';
  const [{data:{session}},{data:product,error:pe},{data:reviews,error:re}]=await Promise.all([
   db.auth.getSession(),db.from('dripx_products').select('id,title').eq('id',id).maybeSingle(),
   db.from('dripx_reviews').select('id,user_id,rating,body,public_name,published,created_at,updated_at').eq('product_id',id).eq('published',true).order('created_at',{ascending:false})
  ]);
  if(pe)throw pe;if(re)throw re;if(!product){root.remove();return;}
  let mine=null,owned=null;
  if(session?.user?.id){
   const [mr,er]=await Promise.all([
    db.from('dripx_reviews').select('id,rating,body,public_name,published,created_at,updated_at').eq('product_id',id).eq('user_id',session.user.id).maybeSingle(),
    db.from('dripx_entitlements').select('order_id').eq('product_id',id).eq('user_id',session.user.id).eq('active',true).maybeSingle()
   ]);
   if(mr.error)throw mr.error;if(er.error)throw er.error;mine=mr.data;owned=er.data;
  }
  const visible=[...(mine?.published?[mine]:[]),...(reviews||[]).filter(r=>r.user_id!==session?.user?.id)];
  const avg=visible.length?visible.reduce((s,r)=>s+Number(r.rating||0),0)/visible.length:0;
  const list=visible.length?visible.map(r=>'<article class="dx-review-card"><div class="dx-review-card-head">'+stars(r.rating)+'<time>'+date(r.created_at)+'</time></div><p>'+esc(r.body)+'</p><small>'+(r.user_id===session?.user?.id?'Tu valoración':(r.public_name?'Cliente de DRIP X SHOP':'Comprador verificado'))+'</small></article>').join(''):'<div class="dx-review-empty"><span class="dx-review-empty-icon">'+starSvg()+'</span><strong>Aún no hay opiniones</strong><p>Comparte tu experiencia con este producto cuando lo tengas en tu cuenta.</p></div>';
  const form=owned?'<form class="dx-review-editor" data-dx-review-form data-product-id="'+esc(id)+'" data-review-id="'+esc(mine?.id||'')+'" data-order-id="'+esc(owned.order_id||'')+'"><div class="dx-review-editor-title"><div><span class="dx-review-kicker">TU EXPERIENCIA</span><h3>'+(mine?'Editar tu valoración':'Valora este producto')+'</h3></div><span class="dx-rating-number" data-dx-rating-label>'+Number(mine?.rating||0)+'/5</span></div><div class="dx-star-picker" data-dx-star-picker data-rating="'+Number(mine?.rating||0)+'">'+[1,2,3,4,5].map(n=>'<button type="button" data-dx-star="'+n+'" aria-label="'+n+' estrellas" class="'+(n<=Number(mine?.rating||0)?'is-selected':'')+'">'+starSvg()+'</button>').join('')+'</div><label class="dx-review-comment">Tu comentario<textarea name="body" rows="4" minlength="10" maxlength="700" required placeholder="Cuéntanos cómo fue tu experiencia…">'+esc(mine?.body||'')+'</textarea></label><label class="dx-review-name"><input type="checkbox" name="public_name" '+(mine?.public_name?'checked':'')+'> Mostrar mi nombre público</label><button type="submit" class="dx-review-submit">'+starSvg()+(mine?'Guardar cambios':'Publicar valoración')+'</button></form>':(session?.user?.id?'<div class="dx-review-gate">Para valorar este producto, primero debes tenerlo habilitado en tu cuenta.</div>':'<div class="dx-review-gate">Inicia sesión con Discord y obtén este producto para publicar una valoración.</div>');
  root.innerHTML='<header class="dx-review-section-head"><div><span class="dx-review-kicker">COMUNIDAD DRIP X</span><h2>Valoraciones del producto</h2><p>Opiniones de clientes con acceso confirmado.</p></div><div class="dx-review-summary">'+stars(avg)+'<strong>'+avg.toFixed(1)+'</strong><small>'+visible.length+' '+(visible.length===1?'valoración':'valoraciones')+'</small></div></header><div class="dx-review-columns"><div class="dx-review-feed">'+list+'</div><aside class="dx-review-compose">'+form+'</aside></div>';
  root.dataset.ready='true';
 }catch(err){console.error('[DRIPX] product reviews',err);if(root){root.innerHTML='<div class="dx-review-empty">No se pudieron cargar las valoraciones. Recarga la página para intentarlo de nuevo.</div>';root.dataset.ready='true';} }
 finally{productBusy=false;}
}
async function renderAdminReviews(){
 if(!db||!/^#admin(?:\/|$)/i.test(location.hash)){$('#dx-admin-review-center')?.remove();return;}
 if($('#dx-admin-review-center')?.dataset.ready==='true')return;
 if(adminBusy)return;adminBusy=true;
 try{
  const {data:isAdmin,error:authErr}=await db.rpc('dripx_is_admin');if(authErr||isAdmin!==true){$('#dx-admin-review-center')?.remove();return;}
  const app=$('#app');if(!app)return;
  let panel=$('#dx-admin-review-center');if(!panel){panel=document.createElement('section');panel.id='dx-admin-review-center';panel.className='dx-admin-review-center';app.append(panel);}
  panel.dataset.ready='false';panel.innerHTML='<div class="dx-reviews-loading">Cargando valoraciones…</div>';
  const {data:rows,error}=await db.from('dripx_reviews').select('id,product_id,user_id,rating,body,published,created_at,dripx_products(title)').order('created_at',{ascending:false});if(error)throw error;
  panel.innerHTML='<header><div><span class="dx-review-kicker">MODERACIÓN</span><h2>Valoraciones</h2><p>Revisa y elimina comentarios de productos.</p></div><span class="dx-admin-review-total">'+(rows||[]).length+' registros</span></header>'+
   ((rows||[]).length?'<div class="dx-admin-review-list">'+rows.map(r=>{const p=Array.isArray(r.dripx_products)?r.dripx_products[0]:r.dripx_products;return '<article><div class="dx-admin-review-main"><strong>'+esc(p?.title||'Producto')+'</strong>'+stars(r.rating)+'</div><p>'+esc(r.body)+'</p><small>Usuario '+esc(String(r.user_id).slice(0,8))+' · '+date(r.created_at)+'</small><button type="button" data-dx-delete-review="'+esc(r.id)+'">'+trashSvg()+'Eliminar</button></article>';}).join('')+'</div>':'<div class="dx-review-empty">No hay valoraciones registradas todavía.</div>');
  panel.dataset.ready='true';
 }catch(err){console.error('[DRIPX] admin reviews',err);const p=$('#dx-admin-review-center');if(p){p.innerHTML='<div class="dx-review-empty">No se pudo cargar el centro de moderación.</div>';p.dataset.ready='true';}}
 finally{adminBusy=false;}
}
function trashSvg(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m4 4v7m6-7v7"/></svg>';}
document.addEventListener('click',async e=>{
 const star=e.target.closest('[data-dx-star]');if(star){const picker=star.closest('[data-dx-star-picker]'),v=Number(star.dataset.dxStar);picker.dataset.rating=String(v);$$('[data-dx-star]',picker).forEach(b=>b.classList.toggle('is-selected',Number(b.dataset.dxStar)<=v));const label=picker.closest('form')?.querySelector('[data-dx-rating-label]');if(label)label.textContent=v+'/5';}
 const del=e.target.closest('[data-dx-delete-review]');if(del){e.preventDefault();del.disabled=true;try{const {error}=await db.from('dripx_reviews').delete().eq('id',del.dataset.dxDeleteReview);if(error)throw error;notify('Valoración eliminada.');const p=$('#dx-admin-review-center');if(p)p.dataset.ready='false';await renderAdminReviews();}catch(err){notify(err.message||'No se pudo eliminar.');}finally{if(del.isConnected)del.disabled=false;}}
});
document.addEventListener('submit',async e=>{
 const form=e.target.closest('[data-dx-review-form]');if(!form)return;e.preventDefault();
 const rating=Number($('[data-dx-star-picker]',form)?.dataset.rating||0),body=$('textarea[name="body"]',form)?.value?.trim()||'';
 if(rating<1||rating>5){notify('Selecciona de una a cinco estrellas.');return;}if(body.length<10||body.length>700){notify('La opinión debe tener entre 10 y 700 caracteres.');return;}
 const {data:{session},error:se}=await db.auth.getSession();if(se)throw se;if(!session?.user?.id){notify('Inicia sesión con Discord para valorar.');return;}
 const record={product_id:form.dataset.productId,user_id:session.user.id,rating,body,public_name:$('input[name="public_name"]',form)?.checked===true,published:true,order_id:form.dataset.orderId||null};
 const id=form.dataset.reviewId;const result=id
  ? await db.from('dripx_reviews').update(record).eq('id',id).select('id').single()
  : await db.from('dripx_reviews').insert(record).select('id').single();
 if(result.error){notify(result.error.message||'No se pudo guardar la valoración.');return;}
 const savedId=result.data?.id||id;
 if(savedId){
  const {error:logError}=await db.functions.invoke('dripx-discord-logs',{body:{event:id?'review_updated':'review_created',details:{review_id:savedId}}});
  if(logError)console.warn('[DRIPX] review log was not delivered:',logError.message||'unknown');
 }
 notify(id?'Valoración actualizada.':'Valoración publicada.');const p=$('#dx-product-reviews');if(p)p.dataset.ready='false';await renderProductReviews();
});
let timer=0;
function schedule(){clearTimeout(timer);timer=setTimeout(()=>{renderProductReviews();renderAdminReviews();syncCatalogRatings(false).catch(err=>console.warn('[DRIPX] catalog ratings',err));},180);}
window.addEventListener('hashchange',schedule);
function boot(){const app=$('#app');if(app){const observer=new MutationObserver(()=>{if(/^#(?:inicio|productos)(?:$|[/?])/i.test(location.hash)||/^#producto\/[0-9a-f-]{36}/i.test(location.hash)||/^#admin(?:\/|$)/i.test(location.hash))schedule();});observer.observe(app,{childList:true,subtree:true});}schedule();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();