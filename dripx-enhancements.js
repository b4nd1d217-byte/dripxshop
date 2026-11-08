(() => {
  'use strict';
  const C = window.DRIPX_CONFIG || {};
  const supabaseLib = window.supabase;
  const projectRef = String(C.supabaseUrl || '').match(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/i)?.[1];
  let client = null;
  try {
    if (supabaseLib?.createClient && C.supabaseUrl && C.supabaseKey) {
      client = supabaseLib.createClient(C.supabaseUrl, C.supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
    }
  } catch (error) { console.error('[DRIPX] Enhancement client:', error); }

  const ICON_PATHS = {
    cart:'<circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M1 1h4l2.7 13.2a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L23 6H6"/>',
    package:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5"/>',
    trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/>',
    medal:'<circle cx="12" cy="8" r="5"/><path d="m8.5 12-2 9 5.5-3 5.5 3-2-9"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    sparkles:'<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z"/>',
    key:'<circle cx="8" cy="15" r="5"/><path d="m11.5 11.5 9-9 2 2-2 2 2 2-3 3-2-2-3 3"/>',
    save:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
    plug:'<path d="M12 22v-5M9 8V2m6 6V2M7 8h10v4a5 5 0 0 1-10 0V8Z"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1 0 2Z"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
    folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    filter:'<path d="M4 6h16M7 12h10m-7 6h4"/>',
    sort:'<path d="m8 7 4-4 4 4M12 3v18m-4-4 4 4 4-4"/>',
    clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    close:'<path d="m18 6-12 12M6 6l12 12"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    minus:'<path d="M5 12h14"/>',
    pause:'<path d="M8 5v14M16 5v14"/>',
    play:'<path d="m8 5 12 7-12 7V5Z"/>',
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v5M12 8h.01"/>',
    chevron:'<path d="m9 18 6-6-6-6"/>',
    back:'<path d="M19 12H5m7 7-7-7 7-7"/>',
    arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    star:'<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.7l6.2-.9L12 3Z"/>',
    ticket:'<path d="M3 7a2 2 0 0 0 0 4v6h18v-6a2 2 0 0 1 0-4V5H3Z"/><path d="M13 5v2m0 3v2m0 3v2"/>',
    chat:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
    wallet:'<path d="M4 5h15a2 2 0 0 1 2 2v12H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M2 9h19M16 14h5"/>',
    lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m4 4v7m6-7v7"/>',
    edit:'<path d="m4 16-.8 4.8L8 20l11.8-11.8a2.1 2.1 0 0 0-3-3L4 18"/><path d="m14.5 6.5 3 3"/>',
    video:'<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-3v10l-4-3"/>',
    code:'<path d="m8 8-4 4 4 4m8-8 4 4-4 4m-2-10-4 12"/>',
    document:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    discord:'<path d="M7.2 7.1a16.5 16.5 0 0 1 9.6 0l1.3 2.1a13.2 13.2 0 0 1 2 7.3 14.8 14.8 0 0 1-5.1 2.6l-1.1-1.8a10 10 0 0 0 2.1-.9M8.1 16.4a10 10 0 0 0 2.1.9l-1.1 1.8A14.8 14.8 0 0 1 4 16.5a13.2 13.2 0 0 1 2-7.3l1.2-2.1Z"/><path d="M9 13h.01M15 13h.01M8.7 13a.3.3 0 1 0 .6 0 .3.3 0 0 0-.6 0ZM14.7 13a.3.3 0 1 0 .6 0 .3.3 0 0 0-.6 0Z"/>'
  };
  const TOKEN_ICON = {
    '🛒':'cart','🛍':'cart','📦':'package','🏆':'trophy','🥇':'medal','🥈':'medal','🥉':'medal','🔑':'key','💾':'save','🛡':'shield','🧩':'code','🌐':'globe','🔌':'plug','🔐':'lock','⚙':'settings','👥':'users','▤':'document','▣':'package','◉':'user','↩':'back','↗':'arrow','↪':'arrow','➜':'arrow','×':'close','→':'arrow','⌕':'search','☷':'filter','＄':'wallet','↕':'sort','◷':'clock','✕':'close','✓':'check','＋':'plus','−':'minus','⏸':'pause','▶':'play','⬇':'download','⌂':'home','▦':'grid','ⓘ':'info','⌄':'chevron','✦':'sparkles','✧':'sparkles','★':'star','☆':'star','📄':'file','📁':'folder','🔍':'search','💬':'chat','🎫':'ticket','💳':'wallet','🧾':'document','👤':'user','🔒':'lock','📝':'edit','🛠':'settings','🗑':'trash','◇':'sparkles'
  };
  const ICON_TOKENS = Object.keys(TOKEN_ICON).sort((a,b)=>b.length-a.length).join('|');
  const ICON_RE = new RegExp('(?:'+ICON_TOKENS+')|\\p{Extended_Pictographic}','gu');
  function iconMarkup(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">'+(ICON_PATHS[name]||ICON_PATHS.sparkles)+'</svg>';
  }
  function replaceIcons(root=document) {
    const nodes=[];
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
      if(!node.nodeValue||!ICON_RE.test(node.nodeValue))return NodeFilter.FILTER_REJECT;
      ICON_RE.lastIndex=0;
      const parent=node.parentElement;
      if(!parent||parent.closest('script,style,textarea,code,pre,.dx-svg-icon'))return NodeFilter.FILTER_REJECT;
      if(!parent.closest('button,a,label,.pill,.tab,.eyebrow,.social-icon,.leader-rank,.leaderboard-optin,.protection-mini,.section-head,.page-head,.notice,.catalog-trigger,.catalog-option,.profile-menu-item,.status,.back,.close,.icon-btn,.total,.stat,.placeholder,.product-video-teaser,.product-bottom,.cart-line,.empty'))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      const value=node.nodeValue;ICON_RE.lastIndex=0;
      if(!ICON_RE.test(value)){ICON_RE.lastIndex=0;continue;}ICON_RE.lastIndex=0;
      const frag=document.createDocumentFragment();let cursor=0;let match;
      while((match=ICON_RE.exec(value))){
        if(match.index>cursor)frag.append(document.createTextNode(value.slice(cursor,match.index)));
        const span=document.createElement('span');span.className='dx-svg-icon';span.setAttribute('aria-hidden','true');span.innerHTML=iconMarkup(TOKEN_ICON[match[0]]);
        frag.append(span);cursor=match.index+match[0].length;
      }
      if(cursor<value.length)frag.append(document.createTextNode(value.slice(cursor)));
      node.parentNode?.replaceChild(frag,node);
    }
  }
  function ensureButtonIcons(root=document){
    root.querySelectorAll('button').forEach(button=>{
      if(button.querySelector('.dx-svg-icon'))return;
      const label=(button.getAttribute('aria-label')||button.getAttribute('title')||button.textContent||'').toLowerCase();
      let name='sparkles';
      if(/descarg|download|bajar/.test(label))name='download';
      else if(/subir|upload|adjuntar|archivo|zip/.test(label))name='upload';
      else if(/eliminar|borrar|quitar/.test(label))name='trash';
      else if(/editar|modificar/.test(label))name='edit';
      else if(/cerrar|cancelar|salir/.test(label))name='close';
      else if(/volver|regresar|atr[aá]s/.test(label))name='back';
      else if(/buscar|search/.test(label))name='search';
      else if(/filtr/.test(label))name='filter';
      else if(/ticket|soporte|mensaje/.test(label))name='ticket';
      else if(/factura|pedido|orden/.test(label))name='document';
      else if(/licencia|clave|key/.test(label))name='key';
      else if(/usuario|perfil|cuenta/.test(label))name='user';
      else if(/admin|ajuste|config/.test(label))name='settings';
      else if(/compr|carrito|obtener|gratis|producto|plan|publicar|crear|guardar|añadir|agregar/.test(label))name='package';
      else if(/discord/.test(label))name='discord';
      else if(/login|iniciar sesi[oó]n|acceder/.test(label))name='user';
      const span=document.createElement('span');span.className='dx-svg-icon';span.setAttribute('aria-hidden','true');span.innerHTML=iconMarkup(name);button.prepend(span);
    });
  }
  function applyBrandLogo(){
    const src='/assets/logo.svg';
    const favicon=src+'?v=20261105-24';
    document.querySelectorAll('img[src="/assets/logo.svg"],img[src^="/assets/logo.svg"],img.hero-logo').forEach(img=>{
      img.decoding='async';img.loading='eager';img.alt='DRIP X SHOP';
    });
    let links=Array.from(document.querySelectorAll('link[rel~="icon"]'));
    if(!links.length){
      const link=document.createElement('link');
      link.rel='icon';
      document.head.append(link);
      links=[link];
    }
    links.forEach(link=>{link.type='image/svg+xml';link.href=favicon;});
  }

  function installImageFallback(){
    if(document.documentElement.dataset.dripxImageFallback==='1')return;
    document.documentElement.dataset.dripxImageFallback='1';
    document.addEventListener('error',event=>{
      const img=event.target;
      if(!(img instanceof HTMLImageElement)||img.id==='user-avatar'||img.dataset.dripxFallback==='1')return;
      if(!img.closest('#app,.brand,.hero'))return;
      img.dataset.dripxFallback='1';
      img.src='/assets/logo.svg';
      img.alt='DRIP X SHOP';
    },true);
  }
  function formatBytes(value){const n=Number(value)||0;return n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(2)+' MB';}
  function toast(message){const node=document.querySelector('#toast');if(node){node.textContent=message;node.classList.add('show');setTimeout(()=>node.classList.remove('show'),3600);}}
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function clearLegacyZipStaging(){
    document.querySelector('#dripx-staging-panel')?.remove();
    document.querySelector('#dripx-recent-zips')?.remove();
    const legacy=document.querySelector('#resource-zip');
    if(legacy&&!legacy.closest('#product-form')){
      const wrap=legacy.closest('label')||legacy.parentElement;
      if(wrap){wrap.hidden=true;wrap.setAttribute('aria-hidden','true');wrap.dataset.dripxLegacyZipHidden='true';}
    }
  }
  async function getAdminSession(){
    if(!client)throw new Error('No se pudo iniciar el cliente de Supabase.');
    const current=await client.auth.getSession();if(current.error)throw current.error;
    let session=current.data?.session||null;
    const expires=Number(session?.expires_at||0)*1000;
    if(!session?.access_token||!session.user?.id||(expires&&expires<Date.now()+90000)){
      const refreshed=await client.auth.refreshSession();if(refreshed.error)throw refreshed.error;
      session=refreshed.data?.session||null;
    }
    if(!session?.user?.id||!session.access_token)throw new Error('Tu sesión expiró. Inicia sesión con Discord de nuevo; el ZIP seleccionado se conservará.');
    const {data:admin,error:adminError}=await client.rpc('dripx_is_admin');if(adminError)throw adminError;
    if(admin!==true){
      window.__DRIPX_ADMIN_SESSION_VERIFIED=false;
      window.__DRIPX_ADMIN_VERIFIED_USER_ID='';
      throw new Error('Solo administración puede proteger recursos desde Productos.');
    }
    window.__DRIPX_ADMIN_SESSION_VERIFIED=true;
    window.__DRIPX_ADMIN_VERIFIED_USER_ID=String(session.user.id);
    return session;
  }
  function tusUpload(bucket,path,file,onProgress){
    return new Promise(async(resolve,reject)=>{
      try{
        if(!window.tus?.Upload)throw new Error('No se pudo cargar el módulo de subida reanudable. Recarga la página.');
        if(!projectRef)throw new Error('Configuración de Supabase inválida.');
        if(!client)throw new Error('No se pudo iniciar el cliente de Supabase.');
        if(bucket==='product-files'&&Number(file?.size)>50_000_000)throw new Error('Tu proyecto usa Supabase Free: cada ZIP puede pesar como máximo 50 MB. Para subir 100 MB o más se necesita Supabase Pro y ajustar el límite del bucket.');
        const current=await client.auth.getSession();if(current.error)throw current.error;
        let session=current.data?.session||null;
        const expires=Number(session?.expires_at||0)*1000;
        if(!session?.access_token||(expires&&expires<Date.now()+90000)){
          const refreshed=await client.auth.refreshSession();
          if(refreshed.error)throw refreshed.error;
          session=refreshed.data?.session||null;
        }
        if(!session?.access_token)throw new Error('La sesión expiró antes de comenzar la subida. Vuelve a iniciar sesión; el ZIP sigue seleccionado.');
        const upload=new window.tus.Upload(file,{
          endpoint:'https://'+projectRef+'.storage.supabase.co/storage/v1/upload/resumable',
          retryDelays:[0,3000,5000,10000,20000],
          headers:{authorization:'Bearer '+session.access_token,apikey:C.supabaseKey||C.publishableKey,'x-upsert':'true'},
          metadata:{bucketName:bucket,objectName:path,contentType:'application/zip',cacheControl:'3600'},
          chunkSize:6*1024*1024,uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,
          fingerprint:async(f)=>[bucket,path,f.name,f.size,f.lastModified].join('-'),
          onError:error=>reject(new Error('No se pudo guardar el ZIP: '+(error?.message||String(error)))),
          onProgress:(sent,total)=>onProgress?.(total?sent/total*100:0),
          onSuccess:()=>{onProgress?.(100);resolve({path});}
        });
        const previous=await upload.findPreviousUploads();if(previous.length)upload.resumeFromPreviousUpload(previous[0]);upload.start();
      }catch(error){reject(error);}
    });
  }
  window.DRIPX_UPLOAD_FILE=async(bucket,path,file,onProgress)=>{
    const result=await tusUpload(bucket,path,file,onProgress);
    if(bucket==='product-files'){
      const status=document.querySelector('#product-zip-upload-state');
      if(status)status.textContent='ZIP protegido subido y guardado correctamente en Supabase.';
      const preview=document.querySelector('#product-zip-preview');
      if(preview)preview.dataset.dripxUploadComplete='true';
    }
    return result;
  };

  function setProductZipStatus(text,state='info'){
    const status=document.querySelector('#product-zip-upload-state');
    if(status){status.textContent=text;status.dataset.state=state;}
    const preview=document.querySelector('#product-zip-preview');
    if(preview)preview.dataset.state=state;
  }
  function lockProductSubmit(form,locked){
    if(!form)return;
    form.dataset.dripxZipProcessing=locked?'true':'false';
    form.setAttribute('aria-busy',locked?'true':'false');
    form.querySelectorAll('button[type="submit"],input[type="submit"]').forEach(button=>{
      if(locked){
        if(!button.hasAttribute('data-dripx-prev-disabled'))button.dataset.dripxPrevDisabled=button.disabled?'1':'0';
        button.disabled=true;
      }else{
        if(button.dataset.dripxPrevDisabled==='0')button.disabled=false;
        delete button.dataset.dripxPrevDisabled;
      }
    });
  }
  function waitForZipState(test,description,timeoutMs=480000){
    return new Promise((resolve,reject)=>{
      const root=document.querySelector('.dx-product-engine')||document.querySelector('#product-form')||document.body;
      let finished=false;
      const cleanup=()=>{observer.disconnect();clearInterval(timer);clearTimeout(timeout);};
      const finish=(error)=>{if(finished)return;finished=true;cleanup();error?reject(error):resolve();};
      const check=()=>{
        if(finished)return;
        try{if(test()){finish();return;}}catch(error){finish(error);return;}
        const status=document.querySelector('#zip-status')?.textContent?.trim()||'';
        if(/(error de compilaci[oó]n|no se pudo compilar|compilaci[oó]n fallida|protecci[oó]n fallida|error:)/i.test(status)){
          finish(new Error(status));
        }
      };
      const observer=new MutationObserver(check);
      observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','class']});
      const timer=setInterval(check,250);
      const timeout=setTimeout(()=>finish(new Error('Tiempo agotado durante '+description+'. Revisa el estado del ZIP y vuelve a intentarlo.')),timeoutMs);
      check();
    });
  }
  function ensureLiveProductZipPreview(inputHint,runId){
    const hinted=inputHint?.matches?.('input[type="file"]')?inputHint:null;
    const form=document.getElementById('product-form')||hinted?.closest?.('#product-form');
    const input=hinted&&hinted.closest('#product-form')?hinted:(form?.querySelector('#resource-file-field input[type="file"]')||form?.querySelector('input[name="file"]'));
    if(!form||!input||!input.isConnected||!form.contains(input))return null;
    const activeRun=String(input.dataset.dripxZipRun||'');
    if(activeRun&&runId&&activeRun!==runId)return null;
    if(runId)input.dataset.dripxZipRun=runId;
    let node=form.querySelector('#product-zip-preview');
    const anchor=form.querySelector('#resource-file-field')||input.closest('label')||input.parentElement||form;
    if(!node){
      node=document.createElement('section');
      node.id='product-zip-preview';
      node.className='dx-product-zip-preview';
    }
    // Keep the preview outside the collapsible file-field wrapper so admin
    // form changes cannot hide it or detach it with the native input label.
    if(anchor?.parentElement&&node.previousElementSibling!==anchor)anchor.insertAdjacentElement('afterend',node);
    else if(!form.contains(node))form.append(node);
    if(!node.isConnected||!form.contains(node))form.append(node);
    node.hidden=false;
    node.classList.remove('hidden');
    node.removeAttribute('aria-hidden');
    node.setAttribute('aria-live','polite');
    let status=form.querySelector('#product-zip-upload-state');
    if(!status){
      status=document.createElement('div');
      status.id='product-zip-upload-state';
      status.className='dx-upload-state';
      status.setAttribute('role','status');
      status.setAttribute('aria-live','polite');
    }
    if(node.nextElementSibling!==status)node.insertAdjacentElement('afterend',status);
    status.hidden=false;
    status.classList.remove('hidden');
    return {form,input,node,status};
  }

  function mountProductZipPipeline(node,input,file){
    return (async()=>{
      const runId=String(input?.dataset?.dripxZipRun||'');
      let live=ensureLiveProductZipPreview(input,runId);
      if(live){input=live.input;node=live.node;}
      if(!node?.isConnected)throw new Error('El formulario de Productos se actualizó. Vuelve a seleccionar el ZIP para continuar.');
      let engine=node.querySelector('.dx-product-engine');
      if(!engine){
        engine=document.createElement('section');
        engine.className='dx-product-engine';
        engine.setAttribute('data-dripx-engine','embedded');
        engine.hidden=true;
        engine.setAttribute('aria-hidden','true');
        node.append(engine);
      }
      const resolveLiveEngine=()=>{
        const current=ensureLiveProductZipPreview(input,runId);
        if(!current)return engine?.isConnected?engine:null;
        let currentEngine=current.node.querySelector('.dx-product-engine');
        if(!currentEngine){
          currentEngine=document.createElement('section');
          currentEngine.className='dx-product-engine';
          currentEngine.setAttribute('data-dripx-engine','embedded');
          currentEngine.hidden=true;
          currentEngine.setAttribute('aria-hidden','true');
          current.node.append(currentEngine);
        }
        return currentEngine.isConnected?currentEngine:null;
      };
      if(typeof window.DRIPX_LOAD_ZIP!=='function')throw new Error('El motor DRIPX no está cargado. Recarga la página.');
      const loaded=await window.DRIPX_LOAD_ZIP(file,resolveLiveEngine);
      engine=resolveLiveEngine()||engine;
      if(!engine?.isConnected)throw new Error('El panel del lector ZIP se desconectó durante el análisis. Vuelve a seleccionar el archivo.');
      const ensure=(id,tag,cls,label)=>{
        let el=engine.querySelector('[id="'+id+'"]');
        if(!el){
          el=document.createElement(tag);el.id=id;
          engine.append(el);
        }
        if(cls)cls.split(/\s+/).filter(Boolean).forEach(name=>el.classList.add(name));
        if(tag==='button'){el.type='button';if(label&&!el.textContent.trim())el.textContent=label;}
        return el;
      };
      ensure('zip-analysis','div','zip-analysis');
      ensure('zip-file-list','div','zip-file-list');
      ensure('zip-status','p','zip-status');
      const protect=ensure('zip-protect','button','btn primary dx-engine-action','01 · Proteger Lua');
      const compile=ensure('zip-compile','button','btn secondary dx-engine-action','02 · Compilar Lua');
      const download=ensure('zip-download','button','btn primary dx-engine-action','03 · Generar ZIP protegido');
      protect.setAttribute('aria-label','Proteger scripts Lua con el motor DRIPX');
      compile.setAttribute('aria-label','Compilar scripts Lua seleccionados');
      download.setAttribute('aria-label','Generar el ZIP final protegido');
      if(!loaded||loaded.file!==file||!Array.isArray(loaded.files)||!loaded.files.length)throw new Error('El inventario ZIP no se pudo completar.');
      const actions=window.DRIPX_PRODUCT_PROTECTION_ACTIONS;
      if(!actions||typeof actions.protect!=='function'||typeof actions.compile!=='function'||typeof actions.download!=='function')throw new Error('El motor de protección no está conectado al formulario de Productos. Recarga la página.');
      if(engine.dataset.dripxActionsBound!=='true'){
        const bindAction=(button,action,step)=>{
          button.addEventListener('click',async event=>{
            event.preventDefault();
            if(button.disabled)return;
            button.disabled=true;
            const status=engine.querySelector('#zip-status');
            if(status)status.textContent=step;
            try{
              await action();
            }catch(error){
              if(status)status.textContent='Error: '+(error?.message||'Falló el proceso DRIPX.');
              if(button===protect){protect.disabled=false;compile.disabled=true;download.disabled=true;}
              else if(button===compile){compile.disabled=false;download.disabled=true;}
              else if(button===download){download.disabled=false;}
              console.error('[DRIPX] Embedded product protection action:',error);
              toast(error?.message||'Falló la protección del ZIP.');
            }
          });
        };
        bindAction(protect,actions.protect,'Protegiendo automáticamente los scripts de servidor…');
        bindAction(compile,actions.compile,'Compilando automáticamente los scripts Lua…');
        bindAction(download,actions.download,'Generando el ZIP protegido para el producto…');
        engine.dataset.dripxActionsBound='true';
      }
      if(!engine.querySelector('#zip-analysis')||!engine.querySelector('#zip-file-list'))throw new Error('El lector ZIP del motor no pudo inicializar el inventario del resource.');
      return engine;
    })();
  }

  async function sendProtectedProductLog(file,result,protectedFile){
    if(!client||!C.supabaseUrl||!(C.supabaseKey||C.publishableKey))return;
    try{
      const {data:{session},error}=await client.auth.getSession();if(error)throw error;
      if(!session?.access_token)return;
      const response=await fetch(String(C.supabaseUrl)+'/functions/v1/dripx-discord-logs',{
        method:'POST',
        headers:{apikey:C.supabaseKey||C.publishableKey,authorization:'Bearer '+session.access_token,'content-type':'application/json'},
        body:JSON.stringify({event:'resource_protected',details:{
          filename:protectedFile.name,source_filename:file.name,file_count:result.files.length,
          server_lua_count:result.server.length,client_lua_count:result.client.length,
          shared_lua_count:result.files.filter(item=>item.kind==='shared_lua').length,
          source_bytes:file.size,protected_bytes:protectedFile.size
        }}),
        signal:AbortSignal.timeout(15000)
      });
      const payload=await response.clone().json().catch(()=>({}));
      if(!response.ok||payload.sent!==true)console.warn('[DRIPX] Discord resource-protected embed was not delivered:',response.status,payload.reason||payload.error||payload.stage||'unknown');
    }catch(error){console.warn('[DRIPX] Discord protection log failed:',error?.message||error);}
  }

  function createProtectionDialog(file){
    document.querySelector('#dx-protection-dialog')?.remove();
    const overlay=document.createElement('div');
    overlay.id='dx-protection-dialog';
    overlay.className='dx-protection-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','dx-protection-title');
    overlay.innerHTML='<section class="dx-protection-dialog"><header><div><span class="dx-protection-kicker">DRIP X SHOP · MTA:SA</span><h2 id="dx-protection-title">Protección del resource</h2><p class="dx-protection-filename">'+escapeHtml(file.name)+'</p></div><span class="dx-protection-shield" aria-hidden="true">✓</span></header><div class="dx-protection-progress"><span class="dx-protection-progress-fill"></span></div><ol class="dx-protection-steps"><li data-step="0"><span>01</span><div><strong>Validar ZIP</strong><small>Integridad, estructura y meta.xml</small></div><b>En espera</b></li><li data-step="1"><span>02</span><div><strong>Proteger resource</strong><small>Integración del guardián y puente de licencia</small></div><b>En espera</b></li><li data-step="2"><span>03</span><div><strong>Compilar Lua</strong><small>Bytecode MTA para server y client</small></div><b>En espera</b></li><li data-step="3"><span>04</span><div><strong>Verificar y preparar ZIP</strong><small>Comprobación final y selección del resultado</small></div><b>En espera</b></li></ol><p class="dx-protection-message" role="status" aria-live="polite">Preparando el proceso…</p><div class="dx-protection-error" hidden></div><footer><button type="button" class="dx-protection-close" disabled>Cerrar</button><button type="button" class="dx-protection-finish" hidden>Finalizar</button><button type="button" class="dx-protection-retry" hidden>Reintentar</button></footer></section>';
    document.body.append(overlay);
    const rows=[...overlay.querySelectorAll('[data-step]')];
    const message=overlay.querySelector('.dx-protection-message');
    const error=overlay.querySelector('.dx-protection-error');
    const close=()=>overlay.remove();
    overlay.querySelector('.dx-protection-close').addEventListener('click',close);
    overlay.querySelector('.dx-protection-finish').addEventListener('click',close);
    const update=(index,label,detail)=>{
      rows.forEach((row,i)=>{
        row.dataset.state=i<index?'done':i===index?'active':'pending';
        row.querySelector('b').textContent=i<index?'Completado':i===index?'En proceso':'En espera';
      });
      overlay.querySelector('.dx-protection-progress-fill').style.width=(Math.max(0,Math.min(4,index))/4*100)+'%';
      message.textContent=detail||label;
      overlay.querySelector('.dx-protection-close').disabled=true;
    };
    const succeed=()=>{
      rows.forEach(row=>{row.dataset.state='done';row.querySelector('b').textContent='Completado';});
      overlay.querySelector('.dx-protection-progress-fill').style.width='100%';
      message.textContent='ÉXITO: el ZIP protegido está verificado y seleccionado en el formulario.';
      message.dataset.state='success';
      overlay.querySelector('.dx-protection-close').disabled=false;
      overlay.querySelector('.dx-protection-finish').hidden=false;
    };
    const fail=(reason)=>{
      message.textContent='La protección no se completó. El ZIP original no se publicará.';
      message.dataset.state='error';
      error.hidden=false;error.textContent=String(reason||'Error desconocido');
      overlay.querySelector('.dx-protection-close').disabled=false;
      overlay.querySelector('.dx-protection-retry').hidden=false;
    };
    const onRetry=callback=>{
      const button=overlay.querySelector('.dx-protection-retry');
      button.addEventListener('click',async()=>{
        button.disabled=true;button.hidden=true;error.hidden=true;
        await callback();
        button.disabled=false;
      });
    };
    return {overlay,update,succeed,fail,onRetry,close};
  }

  function renderProductZipSelection(input,file){
    const selectionRun='selection-'+Date.now()+'-'+Math.random().toString(36).slice(2);
    input.dataset.dripxZipRun=selectionRun;
    input.dataset.dripxZipReady='false';
    window.__DRIPX_SELECTED_PRODUCT_ZIP_FILE=file;
    window.__DRIPX_SELECTED_PRODUCT_ZIP_META={name:file.name,size:file.size,lastModified:file.lastModified||0,selectedAt:Date.now()};
    window.__DRIPX_PROCESSED_PRODUCT_ZIP=null;
    window.__DRIPX_PROCESSED_PRODUCT_FILE=null;
    window.__DRIPX_PENDING_PRODUCT_ID=null;
    const live=ensureLiveProductZipPreview(input,selectionRun);
    if(!live)throw new Error('No se encontró el formulario activo para mostrar el ZIP. Abre Administración → Productos y vuelve a seleccionar el archivo.');
    const {form,node,status}=live;
    node.dataset.state='scanning';
    node.hidden=false;
    node.classList.remove('hidden');
    node.innerHTML='<div class="dx-zip-inspector">'+
      '<div class="dx-zip-inspector-head"><span class="dx-zip-selection-icon" aria-hidden="true">ZIP</span><div><span class="dx-zip-inspector-kicker">DRIP X · INSPECTOR ZIP</span><strong class="dx-zip-selection-name">'+escapeHtml(file.name)+'</strong><small>'+formatBytes(file.size)+' · Archivo original</small></div><span class="dx-zip-inspector-state">LEYENDO</span></div>'+
      '<div class="dx-zip-inspector-loading"><span class="dx-zip-inspector-spinner"></span><span>Abriendo el ZIP y leyendo todos sus archivos. No se está ejecutando el compilador.</span></div>'+
    '</div>';
    if(status){status.dataset.state='processing';status.textContent='Abriendo '+file.name+' y generando el inventario. La compilación no es necesaria para guardar el archivo.';}
    // Selecting a readable ZIP never locks the Save Product action.
    lockProductSubmit(form,false);
    let busy=false,needsResume=false;
    const showFailure=error=>{
      if(input.dataset.dripxZipRun!==selectionRun)return;
      input.dataset.dripxZipReady='false';
      node.dataset.state='error';
      node.innerHTML='<div class="dx-zip-inspector"><div class="dx-zip-inspector-head"><strong>No se pudo abrir este ZIP</strong><span class="dx-zip-inspector-state is-error">ERROR DE LECTURA</span></div><p class="dx-zip-inspector-error">'+escapeHtml(error?.message||'El archivo ZIP está dañado o usa una estructura no compatible.')+'</p><p class="dx-zip-inspector-note">Este error corresponde a la integridad o formato del archivo comprimido, no a la ausencia de meta.xml, shaders o código compilable.</p></div>';
      if(status){status.dataset.state='error';status.textContent='No se pudo leer el ZIP: '+(error?.message||'error desconocido.');}
      console.error('[DRIPX] ZIP inventory could not open archive:',error);
    };
    const bindProtectionButton=button=>{
      button.addEventListener('click',async()=>{
        if(busy)return;
        if(window.__DRIPX_SELECTED_PRODUCT_ZIP_FILE!==file){toast('El ZIP seleccionado cambió. Selecciónalo de nuevo.');return;}
        busy=true;
        button.disabled=true;
        button.textContent=needsResume?'Reanudando trabajo…':'Trabajando · protegiendo y compilando…';
        lockProductSubmit(form,true);
        const dialog=createProtectionDialog(file);
        let outcome;
        try{outcome=await previewProductZip(file,dialog,needsResume);}
        catch(error){outcome={ok:false,error};}
        if(outcome?.ok){
          needsResume=false;
          busy=false;
          button.textContent='ZIP protegido · listo para guardar';
          button.disabled=true;
          const active=ensureLiveProductZipPreview(document.querySelector('#product-form input[name="file"]'),null);
          const activeStatus=active?.status||status||document.querySelector('#product-zip-upload-state');
          if(activeStatus){activeStatus.dataset.state='success';activeStatus.textContent='Protección avanzada completada. Al guardar se subirá el ZIP protegido; si no usas esta opción, se subirá el ZIP original.';}
          lockProductSubmit(form,false);
          dialog.succeed();
          toast('Protección avanzada completada. Ya puedes guardar el producto.');
        }else{
          needsResume=!!window.__DRIPX_PROTECTION_JOB?.started;
          busy=false;
          button.disabled=false;
          button.textContent=needsResume?'Reintentar / reanudar protección':'Reintentar protección (opcional)';
          lockProductSubmit(form,false);
          dialog.fail(outcome?.error?.message||'No se pudo completar la protección.');
          dialog.onRetry(async()=>{dialog.close();button.click();});
          if(status){status.dataset.state='warning';status.textContent='La protección opcional no se completó. Puedes guardar y publicar el ZIP original sin modificarlo.';}
        }
      });
    };
    void (async()=>{
      const scan=await window.DRIPX_INSPECT_ZIP(file);
      if(input.dataset.dripxZipRun!==selectionRun||window.__DRIPX_SELECTED_PRODUCT_ZIP_FILE!==file)return;
      input.dataset.dripxZipReady='true';
      const rows=scan.files.map(item=>{
        const labels={meta:'META.XML',shader:'SHADER',lua:'LUA FUENTE',compiled_lua:'LUA COMPILADO',config:'CONFIGURACIÓN',file:'ARCHIVO'};
        const label=labels[item.kind]||'ARCHIVO';
        return '<div class="dx-zip-inspect-row dx-zip-kind-'+escapeHtml(item.kind)+'"><span class="dx-zip-inspect-file-icon">'+(item.kind==='meta'?'M':item.kind==='shader'?'FX':item.kind==='lua'||item.kind==='compiled_lua'?'L':'F')+'</span><span class="dx-zip-inspect-file-name" title="'+escapeHtml(item.path)+'">'+escapeHtml(item.path)+'</span><span class="dx-zip-inspect-file-kind">'+label+'</span><span class="dx-zip-inspect-file-size">'+formatBytes(item.bytes)+'</span></div>';
      }).join('');
      const warnings=scan.warnings.map(item=>'<div class="dx-zip-inspect-warning"><span aria-hidden="true">!</span><div><strong>'+escapeHtml(item.code==='META_XML_MISSING'?'Falta meta.xml':item.code==='SHADER_FILES_MISSING'?'No hay shaders':item.code==='META_XML_INVALID'?'meta.xml no válido':'Aviso del ZIP')+'</strong><p>'+escapeHtml(item.message)+'</p></div></div>').join('');
      const c=scan.counts;
      node.dataset.state='inspected';
      node.innerHTML='<div class="dx-zip-inspector">'+
        '<div class="dx-zip-inspector-head"><span class="dx-zip-selection-icon" aria-hidden="true">ZIP</span><div class="dx-zip-inspector-title"><span class="dx-zip-inspector-kicker">DRIP X · INSPECTOR ZIP</span><strong class="dx-zip-selection-name">'+escapeHtml(file.name)+'</strong><small>'+formatBytes(file.size)+' · '+formatBytes(scan.expanded)+' descomprimidos</small></div><span class="dx-zip-inspector-state is-ready">ABIERTO</span></div>'+
        '<div class="dx-zip-inspector-stats"><div><strong>'+c.total+'</strong><small>ARCHIVOS</small></div><div><strong>'+c.lua+'</strong><small>LUA</small></div><div><strong>'+c.shaders+'</strong><small>SHADERS</small></div><div><strong>'+c.meta+'</strong><small>META.XML</small></div></div>'+
        (warnings?'<div class="dx-zip-inspector-warnings">'+warnings+'</div>':'<div class="dx-zip-inspector-clean">ZIP legible. Se muestran todos los archivos. No se requiere compilación para publicar.</div>')+
        '<div class="dx-zip-inspector-files-head"><strong>Contenido completo del ZIP</strong><span>'+scan.files.length+' elementos</span></div>'+
        '<div class="dx-zip-inspector-files">'+(rows||'<div class="dx-zip-inspector-empty">El ZIP está vacío. No hay archivos que mostrar.</div>')+'</div>'+
        '<div class="dx-zip-inspector-actions"><button type="button" class="dx-zip-start" data-dripx-start-protection>Trabajar · Proteger y compilar Lua</button><p>Al pulsar Trabajar se inyecta la validación de licencia, se conserva el shared como shared y se compilan los Lua no-shared. La publicación solo continúa si el ZIP protegido supera las verificaciones.</p></div>'+
      '</div>';
      node.querySelectorAll('.dx-zip-inspector-file-name').forEach(el=>{el.setAttribute('title',el.textContent||'');});
      bindProtectionButton(node.querySelector('[data-dripx-start-protection]'));
      if(status){status.dataset.state=scan.warnings.length?'warning':'success';status.textContent='ZIP abierto: '+scan.files.length+' archivos. '+scan.warnings.length+' avisos. Ya puedes guardar el ZIP original sin pasar por el compilador.';}
      console.info('[DRIPX] Original ZIP inventory completed',{name:file.name,count:scan.files.length,warnings:scan.warnings.map(x=>x.code)});
      lockProductSubmit(form,false);
    })().catch(showFailure);
    return live;
  }

  async function previewProductZip(file,dialog,resume=false){
    let input=document.querySelector('#product-form input[name="file"]');
    let form=input?.closest('#product-form');
    const runId=String(Date.now())+'-'+Math.random().toString(36).slice(2);
    const update=(step,label,detail)=>{dialog?.update(step,label,detail);setProductZipStatus(label,'processing');};
    try{
      if(!input||!form)throw new Error('El formulario de Productos ya no está disponible. Vuelve a abrirlo y selecciona el ZIP.');
      if(window.__DRIPX_SELECTED_PRODUCT_ZIP_FILE!==file)throw new Error('El archivo seleccionado cambió. Selecciona el ZIP actual e inicia el proceso otra vez.');
      input.dataset.dripxZipRun=runId;
      input.dataset.dripxZipReady='false';
      window.__DRIPX_PROCESSED_PRODUCT_ZIP=null;
      window.__DRIPX_PROCESSED_PRODUCT_FILE=null;
      lockProductSubmit(form,true);
      update(0,'Validando ZIP y leyendo meta.xml…','Comprobando integridad, estructura y archivos del resource.');
      await getAdminSession();
      let live=ensureLiveProductZipPreview(input,runId);
      if(!live)throw new Error('El formulario cambió mientras se validaba el ZIP. Vuelve a seleccionarlo.');
      input=live.input;form=live.form;
      const engine=await mountProductZipPipeline(live.node,input,file);
      live=ensureLiveProductZipPreview(input,runId);
      if(!live)throw new Error('No se pudo conservar la selección del ZIP.');
      input=live.input;form=live.form;
      const result=window.DRIPX_ZIP_SCAN_RESULT;
      if(!result||result.file!==file||!Array.isArray(result.files))throw new Error('El lector no devolvió un inventario válido.');
      const rows=result.files.map(item=>{
        const compile=['server_lua','client_lua','lua_other'].includes(item.kind);
        const label=item.kind==='server_lua'?'Lua servidor':item.kind==='client_lua'?'Lua cliente':item.kind==='shared_lua'?'Lua shared':item.kind==='config'?'Configuración':item.kind==='lua_other'?'Lua adicional':'Archivo conservado';
        const glyph=compile?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5"/></svg>';
        return '<div class="dx-upload-file '+(compile?'is-compile':'')+'"><span class="dx-upload-file-icon">'+glyph+'</span><span class="dx-upload-file-name">'+escapeHtml(item.path)+'</span><small>'+label+' · '+formatBytes(item.bytes)+'</small></div>';
      }).join('');
      const node=live.node;
      node.dataset.state='processing';
      node.innerHTML='<div class="dx-preview-summary"><strong>'+escapeHtml(file.name)+'</strong><span>'+formatBytes(file.size)+' · '+result.files.length+' archivos · '+result.server.length+' server · '+result.client.length+' client</span><b class="warn">Protección en proceso</b></div><div class="dx-preview-grid"><span>'+result.server.length+' Lua server</span><span>'+result.client.length+' Lua client</span><span>'+result.files.filter(x=>x.kind==='config'||x.kind==='shared_lua').length+' config/shared</span><span>'+formatBytes(result.expanded)+' descomprimidos</span></div><div class="dx-preview-files">'+rows+'</div>';
      node.append(engine);
      const actions=window.DRIPX_PRODUCT_PROTECTION_ACTIONS;
      if(!actions||typeof actions.protect!=='function'||typeof actions.compile!=='function'||typeof actions.download!=='function'||typeof actions.resume!=='function')throw new Error('El motor DRIPX no está conectado al formulario de Productos.');
      const scan=result.files.filter(item=>['server_lua','client_lua'].includes(item.kind)).length;
      const undeclaredLua=result.files.filter(item=>item.kind==='lua_other'&&/\.lua$/i.test(String(item.path||'')));
      if(undeclaredLua.length)throw new Error('Hay '+undeclaredLua.length+' archivos Lua que no están declarados en meta.xml: '+undeclaredLua.slice(0,8).map(item=>item.path).join(', ')+'. Decláralos como server, client o shared antes de proteger; no se compilan archivos sin clasificación.');
      if(resume&&window.__DRIPX_PROTECTION_JOB?.started){
        update(1,'Reanudando trabajo de protección…','Continuando desde el último paso que el motor dejó completado.');
        await actions.resume();
      }else{
        window.__DRIPX_PROTECTION_JOB={id:crypto.randomUUID(),file,started:true,status:'processing',step:'protect'};
        update(1,'Protegiendo resource…','Integrando el guardián privado de servidor; los shared originales no se modifican.');
        const protectedResult=await actions.protect();
        if(!protectedResult?.productId||protectedResult.serverLicenseTemplate!=='dripx_server_license.lua'||protectedResult.sharedFilesPreserved!==true)throw new Error('El motor no confirmó el guardián genérico o la conservación de los shared originales.');
        window.__DRIPX_PROTECTION_JOB.step='compile';
        update(2,'Compilando scripts Lua…','Compilando todos los Lua no-shared a bytecode MTA.');
        const compiledResult=await actions.compile();
        const expectedCompiled=scan+1;
        if(Number(compiledResult?.compiledCount)!==expectedCompiled)throw new Error('La compilación no confirmó los '+scan+' Lua declarados y el guardián DRIPX ('+Number(compiledResult?.compiledCount||0)+'/'+expectedCompiled+').');
        window.__DRIPX_PROTECTION_JOB.step='package';
        update(3,'Guardando paquete genérico…','El guardián DRIPX ya quedó compilado una sola vez en este ZIP. La Key no se incrusta al descargar.');
        await actions.download();
      }
      update(3,'Verificando ZIP final…','Comprobando el archivo generado y su asociación con el formulario.');
      const protectedFile=window.__DRIPX_PROCESSED_PRODUCT_FILE;
      const packaged=window.__DRIPX_PROCESSED_PRODUCT_ZIP;
      if(!(protectedFile instanceof File)||!packaged||protectedFile.size===0||protectedFile.name!==packaged.name||!/-DRIPX-protegido\\.zip$/i.test(protectedFile.name))throw new Error('El ZIP protegido no quedó vinculado al formulario. No se habilitó la publicación.');
      if(input.dataset.dripxZipRun!==runId)throw new Error('La selección cambió durante el procesamiento. El resultado no se asociará a otro producto.');
      input.dataset.dripxZipReady='true';
      window.__DRIPX_PROTECTION_JOB.status='succeeded';
      window.__DRIPX_PROTECTION_JOB.step='completed';
      node.dataset.state='success';
      const summary=node.querySelector('.dx-preview-summary b');
      if(summary){summary.className='ok';summary.textContent='Protección DRIPX completada';}
      const fileName=node.querySelector('.dx-preview-summary strong');
      if(fileName)fileName.textContent=protectedFile.name;
      setProductZipStatus('ÉXITO: '+protectedFile.name+' · '+formatBytes(protectedFile.size)+' · seleccionado para guardar.','success');
      void sendProtectedProductLog(file,result,protectedFile);
      lockProductSubmit(form,false);
      return {ok:true,file:protectedFile,sourceFile:file,result};
    }catch(error){
      if(input?.dataset?.dripxZipRun!==runId)return {ok:false,error};
      input.dataset.dripxZipReady='false';
      if(window.__DRIPX_PROTECTION_JOB)window.__DRIPX_PROTECTION_JOB.status='failed';
      const current=ensureLiveProductZipPreview(input,runId);
      if(current){current.node.dataset.state='error';}
      setProductZipStatus('ERROR: no se publicó el ZIP original. '+(error?.message||'Error desconocido.'),'error');
      console.error('[DRIPX] Protection workflow:',error);
      lockProductSubmit(form,false);
      return {ok:false,error};
    }
  }

  function handleProductZipSelection(event){
    const input=event.target;
    if(!input?.matches?.('input[type="file"]'))return;
    const form=input.closest('#product-form');
    if(!form)return;
    const accept=String(input.getAttribute('accept')||'').toLowerCase();
    const isProductZip=input.name==='file'||!!input.closest('#resource-file-field')||accept.includes('.zip')||accept.includes('application/zip');
    if(!isProductZip)return;
    const file=input.files?.[0];
    if(!file)return;
    if(window.__DRIPX_LAST_SELECTED_ZIP_INPUT===input&&window.__DRIPX_SELECTED_PRODUCT_ZIP_FILE===file)return;
    window.__DRIPX_LAST_SELECTED_ZIP_INPUT=input;
    if(!/\.zip$/i.test(String(file.name||''))){
      window.__DRIPX_SELECTED_PRODUCT_ZIP_FILE=null;
      window.__DRIPX_SELECTED_PRODUCT_ZIP_META=null;
      window.__DRIPX_PROCESSED_PRODUCT_ZIP=null;
      window.__DRIPX_PROCESSED_PRODUCT_FILE=null;
      input.dataset.dripxZipReady='false';
      let bad=ensureLiveProductZipPreview(input,null);
      if(bad){
        bad.node.dataset.state='error';
        bad.node.innerHTML='<div class="dx-zip-selection-card"><strong>Formato no válido</strong><p class="dx-zip-selection-hint">Selecciona un archivo con extensión .zip.</p></div>';
        bad.status.dataset.state='error';bad.status.textContent='El archivo seleccionado no termina en .zip.';
      }
      lockProductSubmit(form,true);
      toast('El archivo del producto debe ser un ZIP.');
      return;
    }
    window.__DRIPX_SELECTED_PRODUCT_ZIP_FILE=file;
    window.__DRIPX_PROCESSED_PRODUCT_ZIP=null;
    window.__DRIPX_PROCESSED_PRODUCT_FILE=null;
    window.__DRIPX_PENDING_PRODUCT_ID=null;
    input.dataset.dripxZipReady='false';
    lockProductSubmit(form,true);
    try{
      renderProductZipSelection(input,file);
      console.info('[DRIPX] ZIP seleccionado y mini panel montado',{name:file.name,size:file.size});
    }catch(error){
      console.error('[DRIPX] No se pudo montar el mini panel ZIP:',error);
      const host=form.querySelector('#resource-file-field')||form;
      let fallback=form.querySelector('#product-zip-preview');
      if(!fallback){fallback=document.createElement('section');fallback.id='product-zip-preview';fallback.className='dx-product-zip-preview';host.insertAdjacentElement('afterend',fallback);}
      fallback.hidden=false;fallback.classList.remove('hidden');fallback.dataset.state='error';
      fallback.innerHTML='<div class="dx-zip-selection-card"><strong>ZIP detectado · Panel recuperado</strong><small>'+escapeHtml(file.name)+' · '+formatBytes(file.size)+'</small><p class="dx-zip-selection-hint">'+escapeHtml(error?.message||'Error al montar el panel.')+'</p><button type="button" class="dx-zip-start" data-dripx-start-protection>Reintentar montaje</button></div>';
      fallback.querySelector('[data-dripx-start-protection]')?.addEventListener('click',()=>{try{renderProductZipSelection(input,file);}catch(retryError){toast(retryError?.message||'No se pudo recuperar el panel ZIP.');}});
    }
  }
  // Capture-phase delegation survives dynamic admin form replacement and
  // third-party listeners that stop bubbling. Keep input as a mobile fallback.
  document.addEventListener('change',handleProductZipSelection,true);
  document.addEventListener('input',handleProductZipSelection,true);
  window.__DRIPX_ZIP_SELECTION_BRIDGE_READY=true;

  function ensureOwnedProductsTab(){
    const tabs=document.querySelector('.profile-tabs');if(!tabs)return;
    let button=tabs.querySelector('[data-dripx-owned-products]');
    if(!button){button=document.createElement('button');button.type='button';button.className='tab';button.dataset.profileTab='productos';button.dataset.dripxOwnedProducts='';button.innerHTML=iconMarkup('package')+' Productos';tabs.append(button);}
    button.setAttribute('aria-label','Ver productos y recursos autorizados');
  }
  async function renderOwnedProducts(){
    const host=document.querySelector('.profile-content');if(!host||!client)throw new Error('No se encontró el panel de usuario.');
    const {data:{session},error:sessionError}=await client.auth.getSession();if(sessionError)throw sessionError;
    if(!session?.user?.id)throw new Error('Inicia sesión con Discord para consultar tus productos.');
    const userId=session.user.id,now=Date.now();
    const [entRes,planRes,ordersRes,itemsRes]=await Promise.all([
      client.from('dripx_entitlements').select('id,product_id,order_id,granted_at,active').eq('user_id',userId).eq('active',true).order('granted_at',{ascending:false}),
      client.from('dripx_user_plans').select('id,product_id,plan_code,order_id,starts_at,expires_at,active,dripx_products(id,title,description,features)').eq('user_id',userId).order('starts_at',{ascending:false}),
      client.from('dripx_orders').select('id,status,total,created_at,approved_at').eq('user_id',userId).order('created_at',{ascending:false}),
      client.from('dripx_order_items').select('order_id,product_id,product_title,unit_price')
    ]);
    for(const result of [entRes,planRes,ordersRes,itemsRes])if(result.error)throw result.error;
    const entitlements=entRes.data||[],allPlans=planRes.data||[];
    const orders=ordersRes.data||[],items=itemsRes.data||[];
    window.DRIPX_SET_INVOICE_DATA?.(orders,items);
    const orderMap=new Map(orders.map(x=>[String(x.id),x]));
    const approvedOrderIds=new Set(orders.filter(order=>order.status==='approved').map(order=>String(order.id)));
    const orderApproved=orderId=>!orderId||approvedOrderIds.has(String(orderId));
    const activePlans=allPlans.filter(plan=>plan.active===true&&(!plan.expires_at||new Date(plan.expires_at).getTime()>now)&&orderApproved(plan.order_id));
    const maps=activePlans.length?await client.from('dripx_plan_resources').select('plan_product_id,resource_product_id').in('plan_product_id',[...new Set(activePlans.map(p=>p.product_id))]):{data:[],error:null};
    const userPlanMaps=activePlans.length?await client.from('dripx_user_plan_resources').select('user_plan_id,resource_product_id').in('user_plan_id',activePlans.map(p=>p.id)):{data:[],error:null};
    if(maps.error)throw maps.error;if(userPlanMaps.error)throw userPlanMaps.error;
    const directRows=entitlements.filter(row=>orderApproved(row.order_id));
    const directIds=new Set(directRows.map(x=>String(x.product_id))),planSources=new Map();
    for(const m of maps.data||[]){const plan=activePlans.find(p=>String(p.product_id)===String(m.plan_product_id));if(!plan)continue;const id=String(m.resource_product_id);if(!planSources.has(id))planSources.set(id,[]);planSources.get(id).push(plan);}
    for(const m of userPlanMaps.data||[]){const plan=activePlans.find(p=>String(p.id)===String(m.user_plan_id));if(!plan)continue;const id=String(m.resource_product_id);if(!planSources.has(id))planSources.set(id,[]);planSources.get(id).push(plan);}
    const ids=[...new Set([...directIds,...planSources.keys()])];
    const productRes=ids.length?await client.from('dripx_products').select('id,title,description,product_type,file_path,price_usd,resource_name,image_url,version,status').in('id',ids).eq('status','published').eq('product_type','resource'):{data:[],error:null};
    if(productRes.error)throw productRes.error;
    const directMap=new Map(directRows.map(x=>[String(x.product_id),x]));
    const resources=(productRes.data||[]).map(p=>{
      const direct=directMap.get(String(p.id)),sources=planSources.get(String(p.id))||[];
      const order=direct?.order_id?orderMap.get(String(direct.order_id)):null;
      const invoice=order?.status==='approved'?'<button type="button" class="btn secondary" data-dx-invoice="'+escapeHtml(order.id)+'">'+iconMarkup('file')+' Factura</button>':'';
      const until=sources.map(x=>x.expires_at).filter(Boolean).sort().at(-1);
      const access=direct?'<small class="dx-owned-access">Compra individual · acceso permanente</small>':'<small class="dx-owned-access">Incluido en '+escapeHtml(sources.map(x=>{const p=Array.isArray(x.dripx_products)?x.dripx_products[0]:x.dripx_products;return p?.title||x.plan_code||'plan';}).join(', '))+' · hasta '+escapeHtml(until?new Date(until).toLocaleDateString('es-DO'):'sin vencimiento')+'</small>';
      return '<article class="order-card dx-owned-product"><header><div><strong>'+escapeHtml(p.title||'Resource')+'</strong><br><small class="muted">RESOURCE MTA:SA</small></div><span class="status approved">Autorizado</span></header><p class="muted">'+escapeHtml(p.description||'')+'</p>'+access+'<div class="order-actions"><button type="button" class="btn primary" '+(p.file_path?'data-download="'+escapeHtml(p.id)+'"':'disabled')+'>'+iconMarkup('download')+(p.file_path?' Descargar ZIP':'ZIP no disponible')+'</button>'+invoice+'</div></article>';
    }).join('');
    const planCards=allPlans.map(plan=>{
      const p=Array.isArray(plan.dripx_products)?plan.dripx_products[0]:plan.dripx_products,order=plan.order_id?orderMap.get(String(plan.order_id)):null;
      const active=plan.active===true&&(!plan.expires_at||new Date(plan.expires_at).getTime()>now)&&orderApproved(plan.order_id);
      const count=(maps.data||[]).filter(m=>String(m.plan_product_id)===String(plan.product_id)).length+(userPlanMaps.data||[]).filter(m=>String(m.user_plan_id)===String(plan.id)).length;
      const inv=order?.status==='approved'?'<button type="button" class="btn secondary" data-dx-invoice="'+escapeHtml(order.id)+'">'+iconMarkup('file')+' Factura</button>':'<button type="button" class="btn secondary" disabled>'+iconMarkup('file')+' Factura pendiente</button>';
      const canRenew=active&&!!plan.expires_at&&new Date(plan.expires_at).getTime()<=now+24*60*60*1000;
      const renew=canRenew?'<button type="button" class="btn primary" data-dx-renew-plan="'+escapeHtml(plan.id)+'">↻ Renovar por ticket</button>':'';
      return '<article class="order-card dx-owned-plan" data-dripx-plan-id="'+escapeHtml(plan.id)+'" data-dripx-plan-expires="'+escapeHtml(plan.expires_at||'')+'"><header><div><strong>'+escapeHtml(p?.title||plan.plan_code||'Plan')+'</strong><br><small class="muted">Plan adquirido · '+(plan.expires_at?'hasta '+new Date(plan.expires_at).toLocaleDateString('es-DO'):'sin vencimiento')+'</small></div><span class="status '+(active?'approved':'muted')+'">'+(active?'Activo':'Finalizado')+'</span></header><p class="muted">'+escapeHtml(p?.description||'Acceso temporal a recursos seleccionados de la tienda.')+'</p><small class="dx-owned-access">'+count+' recursos incluidos · '+(active?'se revocan al vencer':'acceso no vigente')+'</small><div class="order-actions">'+inv+renew+'</div></article>';
    }).join('');
    const purchaseHistory=orders.map(order=>{
      const lines=items.filter(item=>String(item.order_id)===String(order.id));
      const approved=order.status==='approved';
      const invoice=approved?'<button type="button" class="btn secondary" data-dx-invoice="'+escapeHtml(order.id)+'">'+iconMarkup('file')+' Factura</button>':'<button type="button" class="btn secondary" disabled>'+iconMarkup('file')+' Factura al aprobarse</button>';
      return '<article class="order-card dx-owned-order"><header><div><strong>Pedido '+escapeHtml(String(order.id).slice(0,8).toUpperCase())+'</strong><br><small class="muted">'+(order.created_at?new Date(order.created_at).toLocaleDateString('es-DO'):'')+'</small></div><span class="status '+(approved?'approved':'')+'">'+escapeHtml(order.status||'pendiente')+'</span></header><p class="muted">'+(lines.length?lines.map(line=>escapeHtml(line.product_title||'Producto')).join(' · '):'Compra digital DRIP X SHOP')+' · '+new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(order.total)||0)+'</p><div class="order-actions">'+invoice+'</div></article>';
    }).join('');
    const optin=host.querySelector('.leaderboard-optin')?.cloneNode(true);
    host.innerHTML='<section class="dx-owned-products-view"><header class="dx-library-heading"><div><span class="dx-eyebrow">BIBLIOTECA PERSONAL</span><h2>Productos autorizados</h2><p>Compras individuales y recursos incluidos en tus planes vigentes.</p></div><span>'+((productRes.data||[]).length)+' recursos</span></header>'+(planCards?'<section class="dx-owned-plan-list"><h3>Tus planes</h3>'+planCards+'</section>':'')+(resources?'<section class="dx-owned-resource-list"><h3>Recursos disponibles</h3><div class="dx-owned-resource-grid">'+resources+'</div></section>':'<div class="empty">No tienes recursos autorizados ahora mismo. Tus compras y los recursos de planes activos aparecerán aquí.</div>')+(purchaseHistory?'<section class="dx-owned-order-history"><h3>Historial de compras</h3>'+purchaseHistory+'</section>':'')+'</section>';
    if(optin)host.append(optin);ensureOwnedProductsTab();
    document.querySelectorAll('.profile-tabs .tab').forEach(x=>x.classList.toggle('active',x.hasAttribute('data-dripx-owned-products')));
    ensureButtonIcons(host);
  }
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-dripx-owned-products],[data-profile-tab="productos"]');if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    try{await renderOwnedProducts();}catch(error){console.error('[DRIPX] Products panel:',error);toast(error.message||'No se pudieron cargar tus productos.');}
  },true);
  function hideTopCategoryStrip(root=document){
    const scope=root.querySelector?.('#app')||root;
    const hash=String(location.hash||'#inicio').toLowerCase();
    const selectors=['.category-tabs','.category-pills','.category-strip','.categories-strip','.categories-bar','.top-categories','.category-navigation','.category-nav','.home-category-nav','.home-categories','.category-menu','.category-links','[data-categories-strip]','[data-category-navigation]','[data-home-categories]','nav[aria-label*="categor" i]'];
    scope.querySelectorAll?.(selectors.join(',')).forEach(el=>{
      if(el.closest('#product-form,.admin-products,.category-manager,[data-admin-category],.admin-category-list'))return;
      if(el.matches('.category-filter,.category-filters,[data-category-filter]'))return;
      const active=el.querySelector('.active,[aria-current="page"],[aria-pressed="true"],[data-active="true"],.selected');
      const activeLabel=String(active?.textContent||active?.getAttribute('aria-label')||'').trim().toLowerCase();
      const hasSpecificCategory=!!active&&!/^(todas?|todos|todo|all|inicio|categor[ií]as?)$/.test(activeLabel);
      const isHome=(hash===''||hash==='#inicio')&&!hasSpecificCategory;
      if(isHome){
        if(el.dataset.dripxHiddenCategoryStrip==='true'){
          el.style.removeProperty('display');
          el.removeAttribute('aria-hidden');
          delete el.dataset.dripxHiddenCategoryStrip;
        }
        return;
      }
      el.setAttribute('data-dripx-hidden-category-strip','true');
      el.style.setProperty('display','none','important');
      el.setAttribute('aria-hidden','true');
    });
  }
  function removeDuplicateBackAndAdminLabels(root=document){
    const scope=root.querySelector?.('#app')||root;
    scope.querySelectorAll?.('button,a,[role="button"],h1,h2,h3,h4,.eyebrow,.page-title,.admin-title').forEach(el=>{
      if(el.id==='dripx-route-back')return;
      const label=(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      if(el.matches('button,a,[role="button"]')&&/^volver a (la )?categor[ií]as?$/.test(label)){el.remove();return;}
      if(el.matches('h1,h2,h3,h4,.eyebrow,.page-title,.admin-title')&&/^(panel admin|panel de administraci[oó]n|panel administrativo)$/.test(label))el.remove();
    });
  }
  function syncRouteBackButton(){
    const app=document.querySelector('#app');
    if(!app)return;
    const hash=String(location.hash||'#inicio').toLowerCase();
    let target='',label='';
    if(/^#producto\//.test(hash)){
      target='#productos';label='Volver';
    }
    let button=document.querySelector('#dripx-route-back');
    if(!target){button?.remove();return;}
    if(!button){
      button=document.createElement('button');
      button.id='dripx-route-back';
      button.type='button';
      button.className='dx-route-back';
      button.setAttribute('data-dripx-route-back','');
      app.prepend(button);
    }
    if(button.dataset.target!==target||button.textContent.trim()!==label){
      button.dataset.target=target;
      button.innerHTML=iconMarkup('back')+'<span>'+label+'</span>';
    }
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-dripx-route-back]');
    if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    location.hash=button.dataset.target||'#inicio';
  },true);
  function applyPlanCardSkin(root=document){
    const scope=root.querySelector?.('#app')||root;
    scope.querySelectorAll?.('[data-product-type="plan"],.plan-card,.product-card[data-type="plan"]').forEach(card=>{if(!card.closest('#product-form,.admin-products'))card.setAttribute('data-dripx-plan-art','true');});
  }

  let categorySyncPromise=null;
  let categorySyncAt=0;
  async function syncCategoryOptions(force=false){
    if(!client||categorySyncPromise||(!force&&Date.now()-categorySyncAt<45000))return categorySyncPromise;
    const selects=Array.from(document.querySelectorAll('#app select')).filter(select=>{
      const meta=[select.id,select.name,select.className,select.getAttribute('aria-label'),select.getAttribute('data-filter')].join(' ');
      return /categor/i.test(meta)&&select.name!=='store_category';
    });
    if(!selects.length)return;
    categorySyncPromise=(async()=>{
      const [{data:rows,error:categoryError},{data:products,error:productError}]=await Promise.all([
        client.from('dripx_categories').select('name,active,sort_order').order('sort_order',{ascending:true}),
        client.from('dripx_products').select('category').eq('status','published')
      ]);
      if(categoryError)throw categoryError;
      if(productError)throw productError;
      const allNames=[...new Set((rows||[]).map(row=>String(row.name||'').trim()).filter(Boolean))];
      const activeNames=[...new Set([
        ...(rows||[]).filter(row=>row.active).map(row=>String(row.name||'').trim()),
        ...(products||[]).map(row=>String(row.category||'').trim())
      ].filter(Boolean))];
      for(const select of selects){
        if(!select.isConnected||select.multiple)continue;
        const inProductForm=!!select.closest('#product-form');
        // Productos is an internal resource category: it belongs in the admin product form,
        // never in the plans-only public storefront filters.
        const source=inProductForm?activeNames:activeNames.filter(name=>String(name).trim().toLowerCase()==='planes');
        const current=select.value;
        const first=select.options[0];
        const firstText=String(first?.textContent||'').trim();
        const keepFirst=!!first&&(first.value===''||/^(todas?|todos|selecciona|seleccionar|elige|categor[ií]a)$/i.test(firstText));
        const values=[...(keepFirst?[first.value]:[]),...source];
        if(inProductForm&&current&&!values.includes(current))values.push(current);
        const currentValues=Array.from(select.options).map(option=>option.value);
        if(currentValues.length===values.length&&currentValues.every((value,index)=>value===values[index]))continue;
        select.replaceChildren();
        if(keepFirst)select.append(first.cloneNode(true));
        for(const name of source){
          const option=document.createElement('option');
          option.value=name;option.textContent=name;
          select.append(option);
        }
        if(inProductForm&&current&&!source.includes(current)){
          const option=document.createElement('option');option.value=current;option.textContent=current;select.append(option);
        }
        if(current&&Array.from(select.options).some(option=>option.value===current))select.value=current;
      }
      categorySyncAt=Date.now();
    })();
    try{await categorySyncPromise;}catch(error){console.warn('[DRIPX] No se pudieron sincronizar las categorías:',error);}
    finally{categorySyncPromise=null;}
  }


  async function ensureProductStoreCategoryField(){
    const form=document.querySelector('#product-form');if(!form||!client||form.dataset.dripxStoreCategoryReady==='1')return;
    const internal=form.querySelector('select[name="category"]');if(!internal)return;
    const internalLabel=internal.closest('label')||internal.parentElement;
    if(internalLabel){internal.value='Productos';internalLabel.style.display='none';}
    let field=form.querySelector('[data-dx-store-category-field]');
    if(!field){field=document.createElement('label');field.className='dx-product-store-category-field';field.dataset.dxStoreCategoryField='1';field.innerHTML='<span>Categoría del producto</span><select name="store_category" required></select><small>Categoría visible en la tienda. El tipo interno seguirá siendo Producto descargable.</small>';(internalLabel?.parentElement||form).insertBefore(field,internalLabel?.nextSibling||null);}
    try{
      const {data,error}=await client.from('dripx_categories').select('name,slug,active,sort_order').eq('active',true).order('sort_order',{ascending:true});if(error)throw error;
      const select=field.querySelector('select[name="store_category"]'),previous=select.value||'scripts-mta';
      const rows=(data||[]).filter(row=>row.slug&&!['planes','productos'].includes(String(row.slug).toLowerCase()));
      select.replaceChildren();rows.forEach(row=>{const option=document.createElement('option');option.value=row.slug;option.textContent=row.name;select.append(option);});
      if(rows.some(row=>row.slug===previous))select.value=previous;else if(rows.length)select.value=rows[0].slug;
      if(!rows.length)throw new Error('No hay categorías activas para productos.');
    }catch(error){console.warn('[DRIPX] Categoría de producto:',error);const select=field.querySelector('select');if(select&&!select.options.length){const option=document.createElement('option');option.value='scripts-mta';option.textContent='Scripts MTA';select.append(option);}form.dataset.dripxStoreCategoryReady='1';}
  }

  const DRIPX_CATEGORY_ICONS=['package','code-2','shield-check','layers-3','star','box','gamepad-2','wrench','zap','file-code-2'];
  let categoryManagerLoading=false;
  let categoryManagerTimer=0;
  function categorySlug(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
      .replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
  }
  function categoryText(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  }
  function setCategoryTabActive(active){
    window.__DRIPX_CATEGORY_TAB_ACTIVE=!!active;
    try{
      if(active)window.sessionStorage?.setItem('dripx.admin.tab','categorias');
      else window.sessionStorage?.removeItem('dripx.admin.tab');
    }catch{}
  }
  function categoryViewActive(){
    // La administración de categorías queda deshabilitada: el catálogo opera únicamente con Planes.
    return false;
  }
  function categoryIconMarkup(value){
    const key=String(value||'package').toLowerCase();
    const aliases={'code-2':'code','shield-check':'shield','layers-3':'grid','gamepad-2':'gamepad','file-code-2':'file'};
    return iconMarkup(aliases[key]||key);
  }
  function installCategoryManagerStyles(){
    if(document.querySelector('#dx-category-manager-style'))return;
    const style=document.createElement('style');style.id='dx-category-manager-style';
    style.textContent=[
      '#dx-category-manager{margin:18px 0 24px;padding:clamp(16px,2.5vw,24px);border:1px solid rgba(120,145,170,.18);border-radius:18px;background:linear-gradient(145deg,rgba(15,24,36,.98),rgba(9,15,24,.98));color:#eaf2fa;box-shadow:0 16px 42px rgba(0,0,0,.18)}',
      '#dx-category-manager *{box-sizing:border-box}',
      '#dx-category-manager .dx-cat-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:18px}',
      '#dx-category-manager .dx-cat-kicker{display:block;color:#00c7ff;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:7px}',
      '#dx-category-manager h2{margin:0;color:#f6fbff;font-size:clamp(19px,2.2vw,25px);font-weight:750;letter-spacing:-.025em}',
      '#dx-category-manager .dx-cat-sub{margin:7px 0 0;color:#91a4b8;font-size:13px;line-height:1.55;max-width:640px}',
      '#dx-category-manager .dx-cat-layout{display:grid;grid-template-columns:minmax(260px,.85fr) minmax(0,1.4fr);gap:14px;align-items:start}',
      '#dx-category-manager .dx-cat-formbox,#dx-category-manager .dx-cat-listbox{border:1px solid rgba(130,155,180,.15);border-radius:14px;background:rgba(255,255,255,.025);padding:15px;min-width:0}',
      '#dx-category-manager .dx-cat-section-title{margin:0 0 13px;color:#dce8f3;font-size:13px;font-weight:750}',
      '#dx-category-manager .dx-cat-fields{display:grid;grid-template-columns:1fr 1fr;gap:11px}',
      '#dx-category-manager .dx-cat-field{display:grid;gap:6px;min-width:0}',
      '#dx-category-manager .dx-cat-field.full{grid-column:1/-1}',
      '#dx-category-manager .dx-cat-field label{font-size:11px;font-weight:700;color:#aebfd0}',
      '#dx-category-manager .dx-cat-field input,#dx-category-manager .dx-cat-field select{width:100%;min-width:0;height:40px;border:1px solid rgba(145,170,195,.22);border-radius:9px;background:#0b1420;color:#edf6ff;padding:0 11px;font:inherit;font-size:13px;outline:none}',
      '#dx-category-manager .dx-cat-field input:focus,#dx-category-manager .dx-cat-field select:focus{border-color:#00c7ff;box-shadow:0 0 0 3px rgba(0,199,255,.12)}',
      '#dx-category-manager .dx-cat-check{display:flex;align-items:center;gap:9px;color:#c5d3df;font-size:12px;min-height:40px}',
      '#dx-category-manager .dx-cat-check input{accent-color:#00c7ff;width:16px;height:16px}',
      '#dx-category-manager .dx-cat-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}',
      '#dx-category-manager button{cursor:pointer;font:inherit}',
      '#dx-category-manager .dx-cat-btn{min-height:38px;padding:0 12px;border:1px solid rgba(135,160,185,.22);border-radius:9px;background:#142233;color:#dceaf6;font-size:12px;font-weight:750;display:inline-flex;align-items:center;justify-content:center;gap:7px}',
      '#dx-category-manager .dx-cat-btn.primary{background:#00aeda;border-color:#00c7ff;color:#06131b}',
      '#dx-category-manager .dx-cat-btn.danger{color:#ffb3b3;border-color:rgba(255,110,110,.3);background:rgba(115,26,35,.18)}',
      '#dx-category-manager .dx-cat-btn:disabled{opacity:.5;cursor:not-allowed}',
      '#dx-category-manager .dx-cat-list{display:grid;gap:8px}',
      '#dx-category-manager .dx-cat-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid rgba(135,160,185,.13);border-radius:11px;background:rgba(7,13,21,.55)}',
      '#dx-category-manager .dx-cat-identity{display:flex;align-items:center;gap:11px;min-width:0}',
      '#dx-category-manager .dx-cat-icon{width:36px;height:36px;flex:0 0 36px;display:grid;place-items:center;border-radius:10px;background:rgba(0,199,255,.1);color:#57d8ff}',
      '#dx-category-manager .dx-cat-icon svg{width:18px;height:18px}',
      '#dx-category-manager .dx-cat-name{display:block;color:#f1f7fc;font-size:13px;font-weight:750;overflow-wrap:anywhere}',
      '#dx-category-manager .dx-cat-meta{display:block;margin-top:4px;color:#8195a9;font-size:10px}',
      '#dx-category-manager .dx-cat-tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px}',
      '#dx-category-manager .dx-cat-tag{padding:3px 7px;border-radius:20px;background:rgba(130,155,180,.1);color:#aebed0;font-size:10px}',
      '#dx-category-manager .dx-cat-tag.active{background:rgba(46,190,130,.12);color:#83e2b6}',
      '#dx-category-manager .dx-cat-tag.inactive{background:rgba(240,165,70,.12);color:#ffd08c}',
      '#dx-category-manager .dx-cat-row-actions{display:flex;gap:6px;flex:0 0 auto;flex-wrap:wrap;justify-content:flex-end}',
      '#dx-category-manager .dx-cat-icon-btn{width:34px;height:34px;border:1px solid rgba(135,160,185,.2);border-radius:8px;background:#132131;color:#d3e0ec;display:grid;place-items:center}',
      '#dx-category-manager .dx-cat-icon-btn svg{width:15px;height:15px}',
      '#dx-category-manager .dx-cat-status{min-height:18px;margin:11px 0 0;color:#93a8bb;font-size:12px;line-height:1.5}',
      '#dx-category-manager .dx-cat-status.error{color:#ff9b9b}',
      '#dx-category-manager .dx-cat-status.success{color:#82e1b3}',
      '#dx-category-manager .dx-cat-empty{padding:22px 12px;text-align:center;color:#90a4b8;font-size:12px;border:1px dashed rgba(140,165,190,.2);border-radius:10px}',
      '@media(max-width:760px){#dx-category-manager .dx-cat-layout{grid-template-columns:1fr}#dx-category-manager .dx-cat-row{align-items:flex-start}#dx-category-manager .dx-cat-row-actions{max-width:120px}}',
      '@media(max-width:430px){#dx-category-manager .dx-cat-fields{grid-template-columns:1fr}#dx-category-manager .dx-cat-field.full{grid-column:auto}#dx-category-manager .dx-cat-row{flex-wrap:wrap}#dx-category-manager .dx-cat-row-actions{max-width:none;width:100%;justify-content:flex-start}}'
    ].join('\n');
    document.head.append(style);
  }
  function setLegacyCategoryManagerHidden(hidden){
    const app=document.querySelector('#app');if(!app)return;
    app.querySelectorAll('.category-manager,.admin-category-list,[data-admin-category]').forEach(el=>{
      if(el.id==='dx-category-manager'||el.closest('#dx-category-manager'))return;
      if(hidden){if(!el.dataset.dxLegacyCategoryWasHidden)el.dataset.dxLegacyCategoryWasHidden=el.hidden?'1':'0';el.hidden=true;}
      else if(el.dataset.dxLegacyCategoryWasHidden!==undefined){el.hidden=el.dataset.dxLegacyCategoryWasHidden==='1';delete el.dataset.dxLegacyCategoryWasHidden;}
    });
  }
  function categoryPanel(){
    const app=document.querySelector('#app');if(!app)return null;
    let panel=document.querySelector('#dx-category-manager');
    if(!panel){panel=document.createElement('section');panel.id='dx-category-manager';panel.className='dx-category-manager';}
    const overview=document.querySelector('#dx-admin-overview');
    if(!panel.isConnected){
      if(overview?.parentElement)overview.after(panel);
      else app.prepend(panel);
    }
    return panel;
  }
  function categoryStatus(message,state){
    const node=document.querySelector('#dx-category-status');if(!node)return;
    node.textContent=String(message||'');node.className='dx-cat-status'+(state?' '+state:'');
  }
  function categoryFormReset(){
    const form=document.querySelector('#dx-category-form');if(!form)return;
    form.reset();
    form.querySelector('[name="id"]').value='';
    form.querySelector('[name="slug"]').dataset.manual='';
    form.querySelector('[name="active"]').checked=true;
    form.querySelector('[name="sort_order"]').value='100';
    const title=document.querySelector('#dx-category-form-title');if(title)title.textContent='Crear categoría';
    const save=document.querySelector('#dx-category-save');if(save)save.innerHTML=iconMarkup('plus')+' Crear categoría';
    categoryStatus('Los cambios se guardan directamente en Supabase.','');
  }
  async function renderCategoryManager(force=false){
    let panel=document.querySelector('#dx-category-manager');
    if(!categoryViewActive()){
      panel?.remove();setLegacyCategoryManagerHidden(false);return;
    }
    if(!client)return;
    if(categoryManagerLoading||(!force&&(panel?.dataset.loaded==='1'||panel?.dataset.loaded==='error')))return;
    if(window.__DRIPX_CATEGORY_ADMIN_DENIED===true&&!force)return;
    categoryManagerLoading=true;
    installCategoryManagerStyles();
    panel=categoryPanel();if(!panel){categoryManagerLoading=false;return;}
    panel.dataset.loaded='loading';
    panel.innerHTML='<div class="dx-cat-head"><div><span class="dx-cat-kicker">CATÁLOGO / ADMINISTRACIÓN</span><h2>Gestión de categorías</h2><p class="dx-cat-sub">Crea, organiza, edita, activa o desactiva categorías. Los productos asociados se conservan al cambiar un nombre.</p></div><button type="button" class="dx-cat-btn" data-dx-category-refresh>'+iconMarkup('arrow')+' Actualizar</button></div><div class="dx-cat-empty">Cargando categorías desde Supabase…</div>';
    setLegacyCategoryManagerHidden(true);
    try{
      await getAdminSession();
      const [catResult,productResult]=await Promise.all([
        client.from('dripx_categories').select('id,name,slug,active,sort_order,icon').order('sort_order',{ascending:true}).order('name',{ascending:true}),
        client.from('dripx_products').select('id,category,status')
      ]);
      if(catResult.error)throw catResult.error;
      if(productResult.error)throw productResult.error;
      const categories=catResult.data||[],products=productResult.data||[];
      panel=categoryPanel();
      if(!panel)throw new Error('La vista administrativa se actualizó; vuelve a intentar abrir Categorías.');
      const norm=value=>categoryText(value);
      const rows=categories.map(category=>{
        const linked=products.filter(product=>norm(product.category)===norm(category.name));
        const published=linked.filter(product=>String(product.status).toLowerCase()==='published').length;
        const icon=DRIPX_CATEGORY_ICONS.includes(category.icon)?category.icon:'package';
        const state=category.active?'Activa':'Inactiva';
        return '<article class="dx-cat-row" data-dx-category-row="'+escapeHtml(category.id)+'" data-name="'+escapeHtml(category.name)+'" data-slug="'+escapeHtml(category.slug)+'" data-icon="'+escapeHtml(icon)+'" data-order="'+Number(category.sort_order||100)+'" data-active="'+(category.active?'true':'false')+'" data-count="'+linked.length+'" data-published="'+published+'">'+
          '<div class="dx-cat-identity"><span class="dx-cat-icon">'+categoryIconMarkup(icon)+'</span><div><strong class="dx-cat-name">'+escapeHtml(category.name)+'</strong><span class="dx-cat-meta">'+escapeHtml(category.slug)+' · Orden '+Number(category.sort_order||100)+'</span><div class="dx-cat-tags"><span class="dx-cat-tag '+(category.active?'active':'inactive')+'">'+state+'</span><span class="dx-cat-tag">'+linked.length+' producto(s)</span></div></div></div>'+
          '<div class="dx-cat-row-actions"><button type="button" class="dx-cat-icon-btn" title="Editar" aria-label="Editar categoría" data-dx-category-action="edit" data-id="'+escapeHtml(category.id)+'">'+iconMarkup('edit')+'</button>'+
          '<button type="button" class="dx-cat-icon-btn" title="'+(category.active?'Desactivar':'Activar')+'" aria-label="'+(category.active?'Desactivar':'Activar')+' categoría" data-dx-category-action="toggle" data-id="'+escapeHtml(category.id)+'">'+iconMarkup(category.active?'pause':'check')+'</button>'+
          '<button type="button" class="dx-cat-icon-btn" title="Eliminar" aria-label="Eliminar categoría" data-dx-category-action="delete" data-id="'+escapeHtml(category.id)+'" '+(linked.length?'disabled':'')+'>'+iconMarkup('trash')+'</button></div></article>';
      }).join('');
      panel.innerHTML=
        '<div class="dx-cat-head"><div><span class="dx-cat-kicker">CATÁLOGO / ADMINISTRACIÓN</span><h2>Gestión de categorías</h2><p class="dx-cat-sub">Controla el nombre, slug, icono, orden y visibilidad. La base de datos protege las categorías vinculadas a productos.</p></div><button type="button" class="dx-cat-btn" data-dx-category-refresh>'+iconMarkup('arrow')+' Actualizar</button></div>'+
        '<div class="dx-cat-layout"><section class="dx-cat-formbox"><h3 class="dx-cat-section-title" id="dx-category-form-title">Crear categoría</h3>'+
          '<form id="dx-category-form"><input type="hidden" name="id" value=""><div class="dx-cat-fields">'+
          '<div class="dx-cat-field full"><label for="dx-category-name">Nombre</label><input id="dx-category-name" name="name" maxlength="40" minlength="2" required placeholder="Ej. Recursos MTA"></div>'+
          '<div class="dx-cat-field full"><label for="dx-category-slug">Identificador (slug)</label><input id="dx-category-slug" name="slug" maxlength="40" minlength="2" pattern="[a-z0-9][a-z0-9_-]{1,39}" required placeholder="recursos-mta"></div>'+
          '<div class="dx-cat-field"><label for="dx-category-icon">Icono</label><input id="dx-category-icon" name="icon" list="dx-category-icon-options" maxlength="48" value="package" required><datalist id="dx-category-icon-options">'+DRIPX_CATEGORY_ICONS.map(icon=>'<option value="'+icon+'">').join('')+'</datalist></div>'+
          '<div class="dx-cat-field"><label for="dx-category-order">Orden</label><input id="dx-category-order" name="sort_order" type="number" min="1" max="999" step="1" value="100" required></div>'+
          '<div class="dx-cat-field full"><label class="dx-cat-check"><input type="checkbox" name="active" checked> Categoría visible en la tienda</label></div>'+
          '</div><div class="dx-cat-actions"><button class="dx-cat-btn primary" id="dx-category-save" type="submit">'+iconMarkup('plus')+' Crear categoría</button><button class="dx-cat-btn" id="dx-category-cancel" type="button" data-dx-category-action="cancel">Limpiar</button></div><p class="dx-cat-status" id="dx-category-status" role="status">Los cambios se guardan directamente en Supabase.</p></form></section>'+
          '<section class="dx-cat-listbox"><h3 class="dx-cat-section-title">Categorías registradas <span class="dx-cat-tag">'+categories.length+'</span></h3><div class="dx-cat-list">'+(rows||'<div class="dx-cat-empty">Todavía no hay categorías. Crea la primera desde el formulario.</div>')+'</div></section></div>';
      panel.dataset.loaded='1';
      panel.dataset.loadedAt=String(Date.now());
    }catch(error){
      const message=String(error?.message||'No se pudieron cargar las categorías.');
      if(/Solo administración/i.test(message)){
        window.__DRIPX_CATEGORY_ADMIN_DENIED=true;
        window.__DRIPX_ADMIN_SESSION_VERIFIED=false;
        window.__DRIPX_ADMIN_VERIFIED_USER_ID='';
        panel=categoryPanel();
        if(panel){
          panel.dataset.loaded='error';
          panel.innerHTML='<div class="dx-cat-head"><div><span class="dx-cat-kicker">CATÁLOGO / ADMINISTRACIÓN</span><h2>Gestión de categorías</h2></div><button type="button" class="dx-cat-btn" data-dx-category-refresh>'+iconMarkup('refresh')+' Volver a comprobar</button></div><p class="dx-cat-status error">Esta cuenta no tiene permisos administrativos para gestionar categorías. Comprueba tu acceso de Discord y vuelve a intentarlo.</p>';
        }
      }else{
        panel=document.querySelector('#dx-category-manager');
        if(panel){
          panel.dataset.loaded='error';
          panel.innerHTML='<div class="dx-cat-head"><div><span class="dx-cat-kicker">CATÁLOGO / ADMINISTRACIÓN</span><h2>Gestión de categorías</h2></div><button type="button" class="dx-cat-btn" data-dx-category-refresh>'+iconMarkup('refresh')+' Reintentar</button></div><p class="dx-cat-status error">'+escapeHtml(message)+'</p>';
        }
      }
    }finally{categoryManagerLoading=false;}
  }
  function scheduleCategoryManager(force=false){
    if(!categoryViewActive()){
      clearTimeout(categoryManagerTimer);categoryManagerTimer=0;
      document.querySelector('#dx-category-manager')?.remove();setLegacyCategoryManagerHidden(false);return;
    }
    if(!client||window.__DRIPX_CATEGORY_ADMIN_DENIED===true)return;
    const currentPanel=document.querySelector('#dx-category-manager');
    if(!force&&(currentPanel?.dataset.loaded==='1'||currentPanel?.dataset.loaded==='error'))return;
    if(categoryManagerTimer&&!force)return;
    if(force){clearTimeout(categoryManagerTimer);categoryManagerTimer=0;}
    categoryManagerTimer=setTimeout(()=>{
      categoryManagerTimer=0;
      void renderCategoryManager(force);
    },100);
  }
  async function saveCategoryForm(form){
    const button=form.querySelector('#dx-category-save');
    const id=String(form.elements.id.value||'').trim();
    const name=String(form.elements.name.value||'').trim();
    const slug=String(form.elements.slug.value||'').trim().toLowerCase();
    const icon=String(form.elements.icon.value||'package').trim().toLowerCase();
    const sortOrder=Number(form.elements.sort_order.value);
    const active=!!form.elements.active.checked;
    if(name.length<2||name.length>40)throw new Error('El nombre debe tener entre 2 y 40 caracteres.');
    if(!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(slug))throw new Error('El slug debe tener 2–40 caracteres y comenzar con letra o número.');
    if(!/^[a-z0-9-]{2,48}$/.test(icon))throw new Error('El icono solo puede contener letras, números y guiones.');
    if(!Number.isInteger(sortOrder)||sortOrder<1||sortOrder>999)throw new Error('El orden debe ser un número entero entre 1 y 999.');
    if(!button)throw new Error('No se encontró el botón de guardado.');
    button.disabled=true;categoryStatus(id?'Guardando cambios…':'Creando categoría…','');
    try{
      await getAdminSession();
      const payload={name,slug,icon,sort_order:sortOrder,active};
      const result=id
        ? await client.from('dripx_categories').update(payload).eq('id',id).select('id').single()
        : await client.from('dripx_categories').insert(payload).select('id').single();
      if(result.error)throw result.error;
      categorySyncAt=0;
      await syncCategoryOptions(true);
      categoryManagerLoading=false;
      await renderCategoryManager(true);
      await refreshAdminOverview(true);
      toast(id?'Categoría actualizada.':'Categoría creada.');
    }finally{button.disabled=false;}
  }
  async function handleCategoryAction(button){
    const action=button.dataset.dxCategoryAction||'';
    if(action==='cancel'){categoryFormReset();return;}
    if(action==='edit'){
      const row=button.closest('[data-dx-category-row]');if(!row)return;
      const form=document.querySelector('#dx-category-form');if(!form)return;
      form.elements.id.value=row.dataset.dxCategoryRow||'';
      form.elements.name.value=row.dataset.name||'';
      form.elements.slug.value=row.dataset.slug||'';
      form.elements.slug.dataset.manual='true';
      form.elements.icon.value=row.dataset.icon||'package';
      form.elements.sort_order.value=row.dataset.order||'100';
      form.elements.active.checked=row.dataset.active==='true';
      const title=document.querySelector('#dx-category-form-title');if(title)title.textContent='Editar categoría';
      const save=document.querySelector('#dx-category-save');if(save)save.innerHTML=iconMarkup('save')+' Guardar cambios';
      categoryStatus('Al cambiar el nombre, Supabase actualizará las referencias de sus productos.','');
      form.scrollIntoView({behavior:'smooth',block:'start'});return;
    }
    const id=String(button.dataset.id||'').trim();
    const row=document.querySelector('[data-dx-category-row="'+CSS.escape(id)+'"]');
    if(!row||!id)return;
    button.disabled=true;
    try{
      await getAdminSession();
      if(action==='toggle'){
        const active=row.dataset.active!=='true';
        if(!active&&Number(row.dataset.published||0)>0)throw new Error('No se puede desactivar: esta categoría tiene productos publicados. Archívalos o muévelos primero.');
        const result=await client.from('dripx_categories').update({active}).eq('id',id);
        if(result.error)throw result.error;
        categorySyncAt=0;await syncCategoryOptions(true);categoryManagerLoading=false;await renderCategoryManager(true);await refreshAdminOverview(true);
        toast(active?'Categoría activada.':'Categoría desactivada.');return;
      }
      if(action==='delete'){
        const count=Number(row.dataset.count||0);
        if(count>0)throw new Error('No se puede eliminar: todavía hay productos asociados. Cambia sus categorías primero.');
        const name=row.dataset.name||'esta categoría';
        if(!window.confirm('¿Eliminar definitivamente la categoría "'+name+'"? Esta acción no se puede deshacer.'))return;
        const result=await client.from('dripx_categories').delete().eq('id',id);
        if(result.error)throw result.error;
        categorySyncAt=0;await syncCategoryOptions(true);categoryManagerLoading=false;await renderCategoryManager(true);await refreshAdminOverview(true);
        toast('Categoría eliminada.');return;
      }
    }catch(error){categoryStatus(error?.message||'No se pudo completar la acción.','error');toast(error?.message||'Error de categorías.');}
    finally{button.disabled=false;}
  }
  document.addEventListener('input',event=>{
    if(event.target?.id==='dx-category-name'){
      const form=event.target.closest('#dx-category-form'),slug=form?.elements.slug;
      if(slug&&!slug.dataset.manual)slug.value=categorySlug(event.target.value);
    }
    if(event.target?.id==='dx-category-slug')event.target.dataset.manual='true';
  },true);
  document.addEventListener('submit',async event=>{
    const form=event.target;if(!form||form.id!=='dx-category-form')return;
    event.preventDefault();event.stopImmediatePropagation();
    try{await saveCategoryForm(form);}catch(error){categoryStatus(error?.message||'No se pudo guardar la categoría.','error');toast(error?.message||'No se pudo guardar la categoría.');}
  },true);
  document.addEventListener('click',async event=>{
    const refresh=event.target.closest('[data-dx-category-refresh]');
    if(refresh){event.preventDefault();event.stopImmediatePropagation();categoryManagerLoading=false;await renderCategoryManager(true);return;}
    const action=event.target.closest('[data-dx-category-action]');
    if(action){event.preventDefault();event.stopImmediatePropagation();await handleCategoryAction(action);}
  },true);
  function isAdminNavigationControl(control){
    if(!control)return false;
    if(control.matches('[data-admin-tab],[data-admin-route],[role="tab"],[data-tab],[data-route]'))return true;
    return !!control.closest('nav,[role="navigation"],[role="tablist"],aside,.admin-sidebar,.admin-nav,.admin-menu,.admin-tabs,.admin-nav-item,.admin-menu-item,.admin-tab-item,.admin-section-link,[data-admin-item],[data-admin-navigation],[data-admin-menu],#admin-nav,#admin-menu,.admin-dashboard-nav,.admin-sections,.sidebar-nav,.sidebar,.sidebar-item,.nav-item,.menu-item');
  }
  function syncCategoryRouteFromHash(){
    const hash=String(location.hash||'').toLowerCase();
    const categoryRoute=/^#admin\/(?:categorias?|categories?)(?:$|[/?])/.test(hash)
      ||/(?:[?&])tab=(?:categorias?|categories?)(?:&|$)/.test(hash);
    if(categoryRoute){
      setCategoryTabActive(true);
    }else if(!/^#admin\/?$/.test(hash)){
      // Keep the selected admin subview while the router normalizes to #admin.
      // A different route clears it; a real admin-tab click also clears it.
      setCategoryTabActive(false);
    }
  }
  document.addEventListener('click',event=>{
    const control=event.target.closest('#app button,#app a,#app [role="tab"]');
    if(!control||control.closest('#dx-category-manager')||!isAdminRoute()||!isAdminNavigationControl(control))return;
    const label=categoryText(control.getAttribute('data-admin-tab')||control.getAttribute('data-admin-route')||control.getAttribute('data-tab')||control.getAttribute('data-route')||control.getAttribute('aria-label')||control.textContent||control.getAttribute('href'));
    if(/categorias?|categories?/.test(label)){
      setCategoryTabActive(true);window.__DRIPX_CATEGORY_ADMIN_DENIED=false;scheduleCategoryManager(true);
    }else if(/productos?|pedidos|tickets|resenas|usuarios|ajustes|configuracion|panel|inicio/.test(label)){
      setCategoryTabActive(false);
      clearTimeout(categoryManagerTimer);categoryManagerTimer=0;
      document.querySelector('#dx-category-manager')?.remove();setLegacyCategoryManagerHidden(false);
    }
  },true);
  let categoryAuthSubscriptionInstalled=false;
  function installCategoryAuthLifecycle(){
    if(!client||categoryAuthSubscriptionInstalled||typeof client.auth?.onAuthStateChange!=='function')return;
    categoryAuthSubscriptionInstalled=true;
    client.auth.onAuthStateChange((event,session)=>{
      const verifiedUser=String(window.__DRIPX_ADMIN_VERIFIED_USER_ID||'');
      const nextUser=String(session?.user?.id||'');
      if(event==='SIGNED_OUT'||(verifiedUser&&nextUser&&verifiedUser!==nextUser)){
        window.__DRIPX_CATEGORY_ADMIN_DENIED=event==='SIGNED_OUT';
        window.__DRIPX_ADMIN_SESSION_VERIFIED=false;
        window.__DRIPX_ADMIN_VERIFIED_USER_ID='';
        setCategoryTabActive(false);
        clearTimeout(categoryManagerTimer);categoryManagerTimer=0;
        document.querySelector('#dx-category-manager')?.remove();
        setLegacyCategoryManagerHidden(false);
      }else if(event==='SIGNED_IN'&&nextUser){
        window.__DRIPX_CATEGORY_ADMIN_DENIED=false;
        window.__DRIPX_ADMIN_SESSION_VERIFIED=false;
        window.__DRIPX_ADMIN_VERIFIED_USER_ID='';
        if(categoryViewActive())scheduleCategoryManager(true);
      }
    });
  }
  function syncCategoryManagerVisibility(){
    if(!categoryViewActive()){
      clearTimeout(categoryManagerTimer);categoryManagerTimer=0;
      document.querySelector('#dx-category-manager')?.remove();setLegacyCategoryManagerHidden(false);return;
    }
    if(window.__DRIPX_CATEGORY_ADMIN_DENIED===true)return;
    scheduleCategoryManager(false);
  }

  function adminProductsTabIsActive(){
    if(/^#admin\/productos(?:$|[/?])/i.test(String(location.hash||'')))return true;
    if(!isAdminRoute())return false;
    if(window.__DRIPX_ADMIN_PRODUCTS_TAB_ACTIVE===true)return true;
    try{if(window.sessionStorage?.getItem('dripx.admin.tab')==='productos')return true;}catch{}
    const nodes=[...document.querySelectorAll('#app button.active,#app a.active,#app button.is-active,#app a.is-active,#app [role="tab"][aria-selected="true"],#app [data-admin-tab].active,#app [data-tab].active,#app a[aria-current="page"]')];
    return nodes.some(node=>/productos?|planes/i.test([node.getAttribute('data-admin-tab'),node.getAttribute('data-tab'),node.getAttribute('aria-label'),node.textContent].filter(Boolean).join(' ')));
  }
  function isAdminProductsRoute(){
    return /^#admin\/productos(?:$|[/?])/i.test(String(location.hash||''))||(isAdminRoute()&&adminProductsTabIsActive());
  }
  function installAdminProductsTabTracker(){
    if(window.__DRIPX_ADMIN_PRODUCTS_TAB_TRACKER)return;
    window.__DRIPX_ADMIN_PRODUCTS_TAB_TRACKER=true;
    const setActive=(active)=>{
      window.__DRIPX_ADMIN_PRODUCTS_TAB_ACTIVE=!!active;
      try{if(active)window.sessionStorage?.setItem('dripx.admin.tab','productos');else window.sessionStorage?.removeItem('dripx.admin.tab');}catch{}
      if(active){schedulePlanResourceManager();scheduleUserPlanManager();}
      else{document.querySelector('#dx-plan-resource-manager')?.remove();document.querySelector('#dx-user-plan-manager')?.remove();}
    };
    document.addEventListener('click',event=>{
      if(!isAdminRoute())return;
      const control=event.target.closest('#app button,#app a,#app [role="tab"]');
      if(!control||control.closest('#dx-plan-resource-manager,#dx-user-plan-manager'))return;
      const label=[control.getAttribute('data-admin-tab'),control.getAttribute('data-admin-route'),control.getAttribute('data-tab'),control.getAttribute('data-route'),control.getAttribute('aria-label'),control.textContent,control.getAttribute('href')].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      if(/productos?|planes/.test(label))setActive(true);
      else if(/pedidos|tickets|resenas|usuarios|ajustes|configuracion|panel|inicio/.test(label))setActive(false);
    },true);
    window.addEventListener('hashchange',()=>{
      if(!/^#admin\/?$/i.test(String(location.hash||''))&&!/^#admin\/(?:productos|planes)(?:$|[/?])/i.test(String(location.hash||'')))setActive(false);
    });
    if(/^#admin\/(?:productos|planes)(?:$|[/?])/i.test(String(location.hash||'')))setActive(true);
    else if(/^#admin\/?$/i.test(String(location.hash||''))&&adminProductsTabIsActive())setActive(true);
  }
  let planResourceTimer=0,planResourceLoading=false;
  function schedulePlanResourceManager(){
    clearTimeout(planResourceTimer);
    if(window.DRIPX_IS_ADMIN!==true){document.querySelector('#dx-plan-resource-manager')?.remove();return;}
    planResourceTimer=setTimeout(()=>{void renderPlanResourceManager();},150);
  }
  async function renderPlanResourceManager(){
    let panel=document.querySelector('#dx-plan-resource-manager');
    if(window.__DRIPX_CATALOG_MANAGER_ACTIVE){panel?.remove();return;}
    if(!isAdminProductsRoute()||!client||window.DRIPX_IS_ADMIN!==true){panel?.remove();return;}
    if(planResourceLoading||panel?.dataset.loaded==='1')return;
    planResourceLoading=true;
    try{
      await getAdminSession();
      const [productsResult,mappingsResult]=await Promise.all([
        client.from('dripx_products').select('id,title,product_type,status,category,plan_code,billing_period,protection_enabled,file_path,image_url').order('created_at',{ascending:false}),
        client.from('dripx_plan_resources').select('plan_product_id,resource_product_id')
      ]);
      if(productsResult.error)throw productsResult.error;
      if(mappingsResult.error)throw mappingsResult.error;
      const products=productsResult.data||[];
      const plans=products.filter(p=>p.product_type==='plan');
      // Only already-published, downloadable resources created in the Productos category
      // can be assigned. This manager never creates a product or uploads a ZIP.
      const resources=products.filter(p=>p.product_type==='resource'&&p.status==='published'&&!!p.file_path&&String(p.category||'').trim().toLowerCase()==='productos');
      const mapped=new Set((mappingsResult.data||[]).map(row=>String(row.plan_product_id)+'::'+String(row.resource_product_id)));
      const publishedPlans=plans.filter(p=>p.status==='published').length;
      const assignedTotal=plans.reduce((sum,plan)=>sum+resources.filter(r=>mapped.has(String(plan.id)+'::'+String(r.id))).length,0);
      const app=document.querySelector('#app');if(!app)return;
      panel=document.querySelector('#dx-plan-resource-manager');
      if(!panel){panel=document.createElement('section');panel.id='dx-plan-resource-manager';panel.className='dx-plan-resource-manager';}
      const planMarkup=plans.map((plan,index)=>{
        const assigned=resources.filter(resource=>mapped.has(String(plan.id)+'::'+String(resource.id))).length;
        const image=/^https:\/\//i.test(String(plan.image_url||''))?'<img src="'+escapeHtml(plan.image_url)+'" alt="" loading="lazy">':'<span class="dx-plan-config-art">✦</span>';
        const options=resources.length
          ?'<div class="dx-plan-resource-options">'+resources.map(resource=>{
             const selected=mapped.has(String(plan.id)+'::'+String(resource.id));
             const resourceImage=/^https:\/\//i.test(String(resource.image_url||''))?'<img src="'+escapeHtml(resource.image_url)+'" alt="" loading="lazy">':'<span class="dx-plan-resource-mini-art">▣</span>';
             return '<label class="dx-plan-resource-item" data-resource-label="'+escapeHtml(String(resource.title||'').toLowerCase())+'">'+
               '<input type="checkbox" data-dx-plan-resource="'+escapeHtml(resource.id)+'" '+(selected?'checked':'')+'>'+
               resourceImage+'<span><strong>'+escapeHtml(resource.title||'Producto descargable')+'</strong><small>ZIP publicado · categoría Productos</small></span><i>'+(selected?'Incluido':'Disponible')+'</i></label>';
           }).join('')+'</div>'
          :'<div class="dx-plan-resource-empty"><span class="dx-plan-resource-empty-icon">▣</span><strong>Aún no hay productos descargables</strong><p>Primero crea y publica los recursos en <b>Administración → Productos</b>, usando la categoría <b>Productos</b>. Después aparecerán aquí para asignarlos.</p><a href="#admin/productos">Ir a Productos <span>↗</span></a></div>';
        return '<article class="dx-plan-config-card" data-dx-plan-card="'+escapeHtml(plan.id)+'">'+
          '<header class="dx-plan-config-head"><div class="dx-plan-config-identity">'+image+'<div><small>PLAN '+String(index+1).padStart(2,'0')+' · '+escapeHtml(plan.plan_code||'SIN CÓDIGO')+'</small><h3>'+escapeHtml(plan.title||'Plan sin nombre')+'</h3><p>'+escapeHtml(plan.billing_period||'Periodo por configurar')+' · '+(plan.status==='published'?'Publicado':'Borrador / archivado')+'</p></div></div>'+
          '<span class="dx-plan-published '+(plan.status==='published'?'is-live':'is-draft')+'">'+(plan.status==='published'?'Publicado':'No publicado')+'</span></header>'+
          '<div class="dx-plan-config-stats"><div><small>RECURSOS INCLUIDOS</small><strong data-dx-plan-count>'+assigned+'</strong><span>de '+resources.length+' disponibles</span></div><div><small>ACCESO</small><strong>Temporal</strong><span>según vigencia del plan</span></div><div><small>ARCHIVOS DEL PLAN</small><strong>Ninguno</strong><span>los ZIP pertenecen al producto</span></div></div>'+
          '<div class="dx-plan-assign-head"><div><span>CONTENIDO DEL PLAN</span><h4>Productos incluidos</h4><p>Marca los productos existentes que recibirá el comprador al activar este plan.</p></div>'+
          (resources.length?'<label class="dx-plan-assign-search">⌕ <input type="search" data-dx-plan-search placeholder="Buscar producto…"></label>':'')+'</div>'+
          options+
          '<footer class="dx-plan-assign-footer"><span data-dx-plan-status role="status">Los cambios no se aplican hasta guardar.</span><button type="button" class="btn primary" data-dx-plan-save="'+escapeHtml(plan.id)+'">Guardar asignación <span>→</span></button></footer>'+
        '</article>';
      }).join('');
      panel.innerHTML='<div class="dx-plan-control-hero"><div class="dx-plan-control-brand"><span class="dx-plan-control-icon">✦</span><div><span class="dx-admin-kicker">DRIP X · ACCESOS Y SUSCRIPCIONES</span><h2>Configuración de planes</h2><p>Define qué productos descargables recibe cada plan. Este panel solo vincula recursos existentes: no crea productos ni acepta archivos ZIP.</p></div></div><div class="dx-plan-control-metrics"><div><strong>'+plans.length+'</strong><span>Planes</span></div><div><strong>'+publishedPlans+'</strong><span>Publicados</span></div><div><strong>'+resources.length+'</strong><span>Productos disponibles</span></div><div><strong>'+assignedTotal+'</strong><span>Asignaciones</span></div></div></div>'+
        '<div class="dx-plan-workflow-note"><span>01</span><div><strong>Crea tus productos aparte</strong><p>Ve a Administración → Productos, selecciona “Producto descargable” y categoría “Productos”. Sube su ZIP, revisa el contenido y publícalo.</p></div><span class="dx-plan-workflow-arrow">→</span><a href="#admin/productos">Abrir Productos</a></div>'+
        '<div class="dx-plan-config-list">'+(planMarkup||'<div class="dx-plan-no-plans"><span>✦</span><h3>No hay planes para configurar</h3><p>Crea primero un plan de acceso. Los planes no llevan ZIP; solo definen precio, duración y los productos incluidos.</p><a href="#admin/productos">Abrir administración de productos</a></div>')+'</div>';
      panel.dataset.loaded='1';
      if(!panel.isConnected)app.append(panel);
    }catch(error){
      panel=document.querySelector('#dx-plan-resource-manager');
      if(!panel){const app=document.querySelector('#app');if(!app)return;panel=document.createElement('section');panel.id='dx-plan-resource-manager';panel.className='dx-plan-resource-manager';app.append(panel);}
      panel.dataset.loaded='error';
      panel.innerHTML='<div class="dx-plan-config-error"><strong>No se pudo cargar la configuración</strong><p>'+escapeHtml(error.message||'Error consultando los planes y productos.')+'</p><button type="button" data-dx-plan-retry>Reintentar</button></div>';
    }finally{planResourceLoading=false;}
  }
  document.addEventListener('input',event=>{
    const search=event.target.closest('[data-dx-plan-search]');if(!search)return;
    const card=search.closest('[data-dx-plan-card]'),query=String(search.value||'').trim().toLowerCase();
    card?.querySelectorAll('[data-resource-label]').forEach(row=>{row.hidden=!!query&&!String(row.dataset.resourceLabel||'').includes(query);});
  },true);
  document.addEventListener('change',event=>{
    const checkbox=event.target.closest('[data-dx-plan-resource]');if(!checkbox)return;
    const card=checkbox.closest('[data-dx-plan-card]');if(!card)return;
    const count=card.querySelectorAll('[data-dx-plan-resource]:checked').length;
    const node=card.querySelector('[data-dx-plan-count]');if(node)node.textContent=String(count);
    const label=checkbox.closest('label');const state=label?.querySelector('i');if(state)state.textContent=checkbox.checked?'Incluido':'Disponible';
    const status=card.querySelector('[data-dx-plan-status]');if(status)status.textContent='Hay cambios sin guardar.';
  },true);
  document.addEventListener('click',event=>{
    const retry=event.target.closest('[data-dx-plan-retry]');if(retry){event.preventDefault();const p=document.querySelector('#dx-plan-resource-manager');if(p)p.dataset.loaded='0';renderPlanResourceManager();return;}
  },true);
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-dx-plan-save]');
    if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    const card=button.closest('[data-dx-plan-card]');
    const status=card?.querySelector('[data-dx-plan-status]');
    const ids=[...(card?.querySelectorAll('[data-dx-plan-resource]:checked')||[])].map(input=>input.dataset.dxPlanResource).filter(Boolean);
    button.disabled=true;if(status)status.textContent='Guardando recursos del plan…';
    try{
      await getAdminSession();
      const {error}=await client.rpc('dripx_admin_save_plan_resources',{
        p_plan_product_id:button.dataset.dxPlanSave,
        p_resource_product_ids:ids
      });
      if(error)throw error;
      if(status)status.textContent='Guardado. Los accesos se desactivan cuando vence el plan.';
      toast('Recursos del plan guardados.');
    }catch(error){
      if(status)status.textContent='No se guardó: '+(error.message||'error desconocido');
      toast(error.message||'No se pudieron guardar los recursos.');
    }finally{button.disabled=false;}
  },true);
  function installPlanResourceManagerObserver(){
    const app=document.querySelector('#app');if(!app||app.dataset.dxPlanResourceObserver==='1')return;
    app.dataset.dxPlanResourceObserver='1';
    const observer=new MutationObserver(()=>{
      if(window.__DRIPX_CATALOG_MANAGER_ACTIVE){document.querySelector('#dx-plan-resource-manager')?.remove();return;}
      if(isAdminProductsRoute()&&window.DRIPX_IS_ADMIN===true){
        const panel=document.querySelector('#dx-plan-resource-manager');
        if(!panel||panel.dataset.loaded!=='1')schedulePlanResourceManager();
      }else document.querySelector('#dx-plan-resource-manager')?.remove();
    });
    observer.observe(app,{childList:true,subtree:true});
    schedulePlanResourceManager();
  }

  let adminOverviewPromise=null;
  let adminOverviewAt=0;
  function isAdminRoute(){return /^#admin(?:$|[/?])/i.test(location.hash||'')||String(location.hash||'').toLowerCase().startsWith('#admin');}
  function markAdminView(){
    const app=document.querySelector('#app');if(!app)return;
    const active=isAdminRoute();
    app.classList.toggle('dx-admin-view',active);
    if(!active||window.DRIPX_IS_ADMIN!==true)document.querySelector('#dx-admin-overview')?.remove();
    else refreshAdminOverview(false);
  }
  async function refreshAdminOverview(force=false){
    const app=document.querySelector('#app');
    if(!app||!isAdminRoute()||!client||window.DRIPX_IS_ADMIN!==true){
      document.querySelector('#dx-admin-overview')?.remove();
      return;
    }
    let panel=document.querySelector('#dx-admin-overview');
    if(!panel){
      panel=document.createElement('section');panel.id='dx-admin-overview';panel.className='dx-admin-overview';
      app.prepend(panel);
    }
    if(adminOverviewPromise)return adminOverviewPromise.catch(()=>{});
    if(!force&&panel.dataset.loaded==='true'&&Date.now()-adminOverviewAt<60000)return;
    panel.innerHTML='<div class="dx-admin-overview-head"><div><span class="dx-admin-kicker">CENTRO DE CONTROL</span><strong>Resumen operativo</strong><small>Datos en vivo de tu tienda</small></div><button type="button" class="dx-admin-refresh" data-dx-admin-refresh>Actualizar</button></div><div class="dx-admin-loading">Sincronizando información de administración…</div>';
    adminOverviewPromise=(async()=>{
      const session=await getAdminSession();
      if(!session?.user?.id)throw new Error('La sesión administrativa no está disponible.');
      const [products,categories,orders,tickets,users]=await Promise.all([
        client.from('dripx_products').select('status'),
        client.from('dripx_categories').select('name,active'),
        client.from('dripx_orders').select('status'),
        client.from('tickets').select('status'),
        client.from('dripx_profiles').select('user_id',{count:'exact',head:true})
      ]);
      for(const result of [products,categories,orders,tickets,users])if(result.error)throw result.error;
      const productRows=products.data||[],categoryRows=categories.data||[],orderRows=orders.data||[],ticketRows=tickets.data||[];
      const count=(rows,statuses)=>rows.filter(row=>statuses.includes(String(row.status||'').toLowerCase())).length;
      const published=count(productRows,['published']);
      const drafts=count(productRows,['draft']);
      const pendingOrders=count(orderRows,['pending','pending_review','awaiting_payment','awaiting_review','submitted','under_review','waiting_proof']);
      const openTickets=ticketRows.filter(row=>!['closed','resolved','cancelled','canceled','archived'].includes(String(row.status||'').toLowerCase())).length;
      const activeCategories=categoryRows.filter(row=>row.active).length;
      const totalUsers=Number(users.count)||0;
      const metrics=[
        {icon:'package',label:'Productos publicados',value:published,detail:drafts+' en borrador'},
        {icon:'wallet',label:'Pedidos por revisar',value:pendingOrders,detail:orderRows.length+' pedidos registrados'},
        {icon:'ticket',label:'Tickets abiertos',value:openTickets,detail:ticketRows.length+' tickets registrados'},
        {icon:'users',label:'Usuarios registrados',value:totalUsers,detail:'Perfiles de la tienda'},
        {icon:'grid',label:'Categorías activas',value:activeCategories,detail:categoryRows.length+' configuradas'},
        {icon:'file',label:'Inventario total',value:productRows.length,detail:count(productRows,['archived'])+' archivados'}
      ];
      panel=document.querySelector('#dx-admin-overview');
      if(!panel||!isAdminRoute())return;
      panel.innerHTML='<div class="dx-admin-overview-head"><div><span class="dx-admin-kicker">CENTRO DE CONTROL</span><strong>Resumen operativo</strong><small>Indicadores consultados directamente desde Supabase</small></div><div class="dx-admin-overview-tools"><span class="dx-admin-sync">Actualizado '+new Date().toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})+'</span><button type="button" class="dx-admin-refresh" data-dx-admin-refresh>'+iconMarkup('arrow')+' Actualizar</button></div></div><div class="dx-admin-overview-grid">'+metrics.map(metric=>'<article class="dx-admin-metric"><div class="dx-admin-metric-top"><span class="dx-admin-metric-icon">'+iconMarkup(metric.icon)+'</span><span>'+escapeHtml(metric.label)+'</span></div><strong>'+metric.value+'</strong><small>'+escapeHtml(metric.detail)+'</small></article>').join('')+'</div><section class="dx-admin-log-test"><div class="dx-admin-log-copy"><strong>Diagnóstico de Discord</strong><small>Envía un embed real al canal seleccionado y confirma la respuesta del webhook.</small></div><div class="dx-admin-log-actions"><div class="dx-admin-log-picker"><button type="button" class="dx-admin-log-select" data-dx-log-toggle aria-expanded="false"><span data-dx-log-current>Seguridad</span>'+iconMarkup('chevron')+'</button><input type="hidden" data-dx-log-category value="security"><div class="dx-admin-log-menu" data-dx-log-menu hidden><button type="button" data-dx-log-option="security">Seguridad</button><button type="button" data-dx-log-option="sales_public">Ventas públicas</button><button type="button" data-dx-log-option="sales_private">Ventas privadas</button><button type="button" data-dx-log-option="reviews">Reseñas</button><button type="button" data-dx-log-option="coupons">Cupones</button><button type="button" data-dx-log-option="store">Tienda</button><button type="button" data-dx-log-option="support">Soporte</button><button type="button" data-dx-log-option="licenses">Licencias</button></div></div><button type="button" class="dx-admin-log-send" data-dx-test-discord>'+iconMarkup('discord')+' Probar embed</button></div><p class="dx-admin-log-status" data-dx-log-test-status role="status">Sin pruebas recientes.</p></section>';
      panel.dataset.loaded='true';adminOverviewAt=Date.now();
    })();
    try{await adminOverviewPromise;}catch(error){
      panel=document.querySelector('#dx-admin-overview');
      if(panel){
        panel.dataset.loaded='true';
        adminOverviewAt=Date.now();
        panel.innerHTML='<div class="dx-admin-overview-head"><div><span class="dx-admin-kicker">CENTRO DE CONTROL</span><strong>Resumen operativo</strong><small>No se pudo sincronizar el panel</small></div><button type="button" class="dx-admin-refresh" data-dx-admin-refresh>Reintentar</button></div><p class="dx-admin-error">'+escapeHtml(error.message||'Error al consultar los datos administrativos.')+'</p>';
      }
      console.warn('[DRIPX] Admin overview:',error);
    }finally{adminOverviewPromise=null;}
  }
  document.addEventListener('click',async event=>{
    const toggle=event.target.closest('[data-dx-log-toggle]');
    if(toggle){
      event.preventDefault();event.stopImmediatePropagation();
      const menu=toggle.closest('.dx-admin-log-picker')?.querySelector('[data-dx-log-menu]');
      const open=!!menu?.hidden;
      if(menu)menu.hidden=!open;
      toggle.setAttribute('aria-expanded',String(open));
      return;
    }
    const option=event.target.closest('[data-dx-log-option]');
    if(option){
      event.preventDefault();event.stopImmediatePropagation();
      const picker=option.closest('.dx-admin-log-picker');
      const hidden=picker?.querySelector('[data-dx-log-category]');
      const toggleButton=picker?.querySelector('[data-dx-log-toggle]');
      const menu=picker?.querySelector('[data-dx-log-menu]');
      if(hidden)hidden.value=option.dataset.dxLogOption||'security';
      const current=toggleButton?.querySelector('[data-dx-log-current]');
      if(current)current.textContent=option.textContent||'Seguridad';
      if(menu)menu.hidden=true;
      toggleButton?.setAttribute('aria-expanded','false');
      return;
    }
    const testButton=event.target.closest('[data-dx-test-discord]');
    if(testButton){
      event.preventDefault();event.stopImmediatePropagation();
      if(testButton.disabled)return;
      const status=document.querySelector('[data-dx-log-test-status]');
      const category=document.querySelector('[data-dx-log-category]')?.value||'security';
      testButton.disabled=true;
      if(status)status.textContent='Enviando prueba y esperando confirmación de Discord…';
      try{
        const session=await getAdminSession();
        if(!session?.user?.id)throw new Error('La sesión administrativa no está disponible.');
        const response=await client.functions.invoke('dripx-discord-logs',{body:{event:'test_embed',details:{category}}});
        if(response.error){
          let detail='';
          try{detail=await response.error.context?.clone?.().text?.()||'';}catch(_){}
          throw new Error(detail||response.error.message||'No se pudo contactar el servicio de logs.');
        }
        if(!response.data?.sent)throw new Error(response.data?.reason||response.data?.error||'Discord no confirmó el embed.');
        if(status)status.textContent='Confirmado: Discord aceptó el embed en la categoría '+category+'.';
        toast('Embed de prueba enviado y confirmado por Discord.');
      }catch(error){
        const message=error?.message||'Error de conexión con Discord.';
        if(status)status.textContent='No enviado: '+message;
        console.error('[DRIPX] Discord test embed:',error);
        toast('No se pudo confirmar el embed: '+message);
      }finally{testButton.disabled=false;}
      return;
    }
    const refresh=event.target.closest('[data-dx-admin-refresh]');
    if(refresh){
      event.preventDefault();event.stopImmediatePropagation();refreshAdminOverview(true);
      return;
    }
    if(!event.target.closest('.dx-admin-log-picker')){
      document.querySelectorAll('[data-dx-log-menu]').forEach(menu=>menu.hidden=true);
      document.querySelectorAll('[data-dx-log-toggle]').forEach(button=>button.setAttribute('aria-expanded','false'));
    }
  },true);
  window.addEventListener('hashchange',()=>{syncCategoryRouteFromHash();hideTopCategoryStrip();syncRouteBackButton();markAdminView();syncCategoryOptions(true);syncCatalogOwnership(true);removeStandaloneProtectionAdminEntry();schedulePlanResourceManager();syncCategoryManagerVisibility();});

  function installProductZipProtectionGuard(){
    if(document.documentElement.dataset.dripxZipGuard==='1')return;
    document.documentElement.dataset.dripxZipGuard='1';
    document.addEventListener('submit',event=>{
      const form=event.target;
      if(!form||form.id!=='product-form')return;
      const input=form.querySelector('input[name="file"]');
      const original=input?.files?.[0];
      if(!original)return;
      if(!String(original.name||'').toLowerCase().endsWith('.zip')){
        event.preventDefault();event.stopImmediatePropagation();toast('El archivo del producto debe ser un ZIP.');return;
      }
      const staged=window.__DRIPX_PROCESSED_PRODUCT_FILE;
      const processed=window.__DRIPX_PROCESSED_PRODUCT_ZIP;
      if(form.dataset.dripxZipProcessing==='true'||input.dataset.dripxZipReady!=='true'||!(staged instanceof File)||!staged.size||!processed||processed.name!==staged.name||processed.productId!==window.__DRIPX_PENDING_PRODUCT_ID||!String(staged.name||'').toLowerCase().endsWith('-dripx-protegido.zip')){
        event.preventDefault();event.stopImmediatePropagation();
        const message='No se publicó el producto: vuelve a seleccionar el ZIP y deja que DRIP X SHOP termine la protección automática.';
        if(typeof toast==='function')toast(message);else console.warn('[DRIPX]',message);
      }
    },true);
  }
  const cssObserver=new MutationObserver(()=>{
    replaceIcons();ensureButtonIcons();installDescriptionToolbar();applyBrandLogo();hideTopCategoryStrip();removeDuplicateBackAndAdminLabels();syncRouteBackButton();removeStandaloneProtectionAdminEntry();applyPlanCardSkin();markAdminView();syncCategoryOptions(false);void ensureProductStoreCategoryField();syncCatalogOwnership(false);clearLegacyZipStaging();installCategoryAuthLifecycle();syncCategoryManagerVisibility();
    if(document.querySelector('.profile-tabs'))ensureOwnedProductsTab();
  });
  function removeStandaloneProtectionAdminEntry(root=document){
    const app=root.querySelector?.('#app')||root;
    const candidates=app.querySelectorAll?.('a,button,[role="tab"],[data-admin-route],[data-admin-tab]')||[];
    const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s\n]+/g,' ').trim().toLowerCase();
    candidates.forEach(el=>{
      if(el.closest('#product-form,.dx-product-engine,.product-card,.category-filter,.category-manager,.admin-products'))return;
      const label=normalize(el.getAttribute('aria-label')||el.textContent||el.dataset.adminRoute||el.dataset.adminTab||'');
      const route=normalize(el.dataset.adminRoute||el.dataset.adminTab||el.getAttribute('href')||'');
      const protectionEntry=/(^|\b)(proteger|proteccion|protection|zip protection|construir zip|compilar zip)(\b|$)/.test(label)||/(^|[#/._-])(proteger|proteccion|protection|construir-zip|proteger-zip)([#/._-]|$)/.test(route);
      if(!protectionEntry)return;
      const adminShell=el.closest('.admin-sidebar,.admin-nav,.admin-menu,.admin-tabs,[data-admin-navigation],[data-admin-menu],#admin-nav,#admin-menu,.admin-dashboard-nav,.admin-sections,[class*="admin-"],[id*="admin-"]');
      const isAdminContext=!!adminShell||!!el.closest('#admin,[data-admin-route],[data-admin-tab]');
      if(!isAdminContext)return;
      const item=el.closest('li,.admin-nav-item,.admin-menu-item,.admin-tab-item,.admin-section-link,[data-admin-item],.sidebar-item,.nav-item,.menu-item')||el;
      item.remove();
    });
    const currentRoute=normalize(location.hash||'');
    if(currentRoute.startsWith('#admin/')&&/(proteger|proteccion|protection|construir-zip|proteger-zip|compilar-zip)/.test(currentRoute))location.hash='#admin/productos';
  }
  let catalogOwnershipPromise=null,catalogOwnershipAt=0,catalogOwnershipUser='';
  async function syncCatalogOwnership(force=false){
    if(!client)return;
    try{
      const {data:{session},error:sessionError}=await client.auth.getSession();
      if(sessionError)throw sessionError;
      const userId=session?.user?.id||'';
      if(!userId){
        document.querySelectorAll('#app [data-dripx-owned]').forEach(button=>{
          button.disabled=button.dataset.dripxOriginalDisabled==='1';
          if(button.dataset.dripxOriginalHtml)button.innerHTML=button.dataset.dripxOriginalHtml;
          if(button.dataset.dripxOriginalTitle)button.title=button.dataset.dripxOriginalTitle;else button.removeAttribute('title');
          if(button.dataset.dripxOriginalAria)button.setAttribute('aria-label',button.dataset.dripxOriginalAria);else button.removeAttribute('aria-label');
          ['dripxOwned','dripxOriginalHtml','dripxOriginalDisabled','dripxOriginalTitle','dripxOriginalAria'].forEach(key=>delete button.dataset[key]);
        });
        catalogOwnershipUser='';catalogOwnershipAt=0;return;
      }
      if(catalogOwnershipPromise)return catalogOwnershipPromise;
      if(!force&&catalogOwnershipUser===userId&&Date.now()-catalogOwnershipAt<30000)return;
      catalogOwnershipPromise=(async()=>{
        const {data:rows,error}=await client.from('dripx_entitlements').select('product_id').eq('user_id',userId).eq('active',true);
        if(error)throw error;
        const owned=new Set((rows||[]).map(row=>String(row.product_id)));
        document.querySelectorAll('#app [data-add],#app [data-claim-free]').forEach(button=>{
          const id=String(button.dataset.add||button.dataset.claimFree||'');
          if(!id)return;
          if(button.dataset.dripxOriginalHtml===undefined)button.dataset.dripxOriginalHtml=button.innerHTML;
          if(button.dataset.dripxOriginalDisabled===undefined)button.dataset.dripxOriginalDisabled=button.disabled?'1':'0';
          if(button.dataset.dripxOriginalTitle===undefined)button.dataset.dripxOriginalTitle=button.getAttribute('title')||'';
          if(button.dataset.dripxOriginalAria===undefined)button.dataset.dripxOriginalAria=button.getAttribute('aria-label')||'';
          const has=owned.has(id);
          button.dataset.dripxOwned=has?'true':'false';
          button.disabled=has||button.dataset.dripxOriginalDisabled==='1';
          if(has){
            button.innerHTML=iconMarkup('check')+'<span>Ya lo tienes</span>';
            button.title='Este producto ya está habilitado en tu cuenta';
            button.setAttribute('aria-label','Ya tienes este producto');
          }else{
            button.innerHTML=button.dataset.dripxOriginalHtml;
            if(button.dataset.dripxOriginalTitle)button.title=button.dataset.dripxOriginalTitle;else button.removeAttribute('title');
            if(button.dataset.dripxOriginalAria)button.setAttribute('aria-label',button.dataset.dripxOriginalAria);else button.removeAttribute('aria-label');
          }
        });
        catalogOwnershipUser=userId;catalogOwnershipAt=Date.now();
      })();
      await catalogOwnershipPromise;
    }catch(error){console.warn('[DRIPX] Catalog ownership sync:',error?.message||error);}
    finally{catalogOwnershipPromise=null;}
  }
  window.DRIPX_SYNC_CATALOG_OWNERSHIP=syncCatalogOwnership;
  window.addEventListener('dripx:ownership-changed',()=>{void syncCatalogOwnership(true);});
  async function downloadOwnedProduct(productId,button){
    if(!client||!productId)throw new Error('Producto no válido.');
    const {data:{session},error}=await client.auth.getSession();if(error)throw error;
    if(!session?.access_token)throw new Error('Inicia sesión con Discord para descargar.');
    if(button){button.disabled=true;button.dataset.dripxLoading='true';}
    try{
      const response=await fetch(String(C.supabaseUrl)+'/functions/v1/dripx-license/download',{
        method:'POST',
        headers:{apikey:C.supabaseKey||C.publishableKey,authorization:'Bearer '+session.access_token,'content-type':'application/json'},
        body:JSON.stringify({product_id:productId}),
        signal:AbortSignal.timeout(60000)
      });
      if(!response.ok){
        let detail={};try{detail=await response.clone().json();}catch(_){}
        throw new Error(detail.message||detail.reason||detail.error||'No se pudo preparar la descarga protegida.');
      }
      const blob=await response.blob();
      if(!blob.size)throw new Error('El ZIP recibido está vacío.');
      const disposition=response.headers.get('content-disposition')||'';
      const match=disposition.match(/filename="?([^";]+)"?/i);
      const filename=match?.[1]||('DRIPX-'+productId.slice(0,8)+'.zip');
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.style.display='none';
      document.body.append(anchor);anchor.click();anchor.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),30000);
      toast('Descarga personalizada y licencia MTA incluidas.');
    }finally{
      if(button){button.disabled=false;delete button.dataset.dripxLoading;}
    }
  }
  window.DRIPX_DOWNLOAD_OWNED_PRODUCT=downloadOwnedProduct;

  document.addEventListener('click',async event=>{
    const copy=event.target.closest('[data-dripx-copy-license]');
    if(copy){
      event.preventDefault();event.stopImmediatePropagation();
      try{await navigator.clipboard.writeText(copy.dataset.dripxCopyLicense||'');toast('Licencia copiada.');}
      catch(_){toast('No se pudo copiar automáticamente; selecciona la clave para copiarla.');}
      return;
    }
    const save=event.target.closest('[data-dripx-save-license]');
    if(save){
      event.preventDefault();event.stopImmediatePropagation();
      const id=save.dataset.dripxSaveLicense;
      const ip=document.querySelector('[data-dripx-ip="'+id+'"]')?.value?.trim()||'';
      const port=Number(document.querySelector('[data-dripx-port="'+id+'"]')?.value||0);
      if(!ip||!Number.isInteger(port)||port<1||port>65535){toast('Introduce una IP pública y un puerto válido.');return;}
      save.disabled=true;
      try{
        const {error}=await client.rpc('dripx_save_license_binding',{p_license_id:id,p_server_ip:ip,p_server_port:port});
        if(error)throw error;
        toast('Servidor vinculado a esta licencia.');
        await renderOwnedProducts();
      }catch(error){toast(error.message||'No se pudo guardar el servidor.');}
      finally{save.disabled=false;}
      return;
    }
    const download=event.target.closest('.profile-content [data-download]');
    if(download){
      event.preventDefault();event.stopImmediatePropagation();
      const productId=String(download.dataset.download||'');
      try{await downloadOwnedProduct(productId,download);}catch(error){toast(error.message||'No se pudo descargar el producto.');}
      return;
    }
    const owned=event.target.closest('#app [data-dripx-owned="true"]');
    if(owned){event.preventDefault();event.stopImmediatePropagation();toast('Este producto ya está habilitado en Mi cuenta > Productos.');}
  },true);

  function installDescriptionToolbar(){
    const form=document.querySelector('#product-form');
    const field=form?.querySelector('[name="description"]');
    if(!field||field.dataset.dripxDescriptionEditor==='1')return;
    field.dataset.dripxDescriptionEditor='1';
    const wrap=document.createElement('div');wrap.className='dx-description-editor';
    const toolbar=document.createElement('div');toolbar.className='dx-description-tools';toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Insertar símbolos en la descripción');
    const controls=[
      ['check','✓ ','Insertar punto destacado'],
      ['star','★ ','Insertar característica'],
      ['info','ⓘ ','Insertar nota'],
      ['arrow','→ ','Insertar paso'],
      ['plus','• ','Insertar viñeta']
    ];
    for(const [icon,value,label] of controls){
      const button=document.createElement('button');button.type='button';button.className='dx-description-tool';button.title=label;button.setAttribute('aria-label',label);button.innerHTML=iconMarkup(icon);
      button.addEventListener('click',()=>{
        const start=Number.isInteger(field.selectionStart)?field.selectionStart:field.value.length;
        const end=Number.isInteger(field.selectionEnd)?field.selectionEnd:start;
        field.setRangeText(value,start,end,'end');field.focus();field.dispatchEvent(new Event('input',{bubbles:true}));
      });
      toolbar.append(button);
    }
    const parent=field.parentElement;if(!parent)return;
    parent.insertBefore(wrap,field);wrap.append(toolbar,field);
    field.classList.add('dx-description-input');
  }

  let userPlanManagerTimer=0,userPlanManagerBusy=false;
  const userPlanCache=new Map();
  function userPlanRemaining(expiry,active){
    if(!active)return 'Retirado';if(!expiry)return 'Sin vencimiento';
    const ms=new Date(expiry).getTime()-Date.now();if(!Number.isFinite(ms)||ms<=0)return 'Vencido';
    const total=Math.floor(ms/60000),days=Math.floor(total/1440),hours=Math.floor((total%1440)/60),mins=total%60;
    const clock='h'+hours+':'+String(mins).padStart(2,'0');return days?'d'+days+' '+clock:clock;
  }
  function updateUserPlanClocks(){document.querySelectorAll('[data-dx-up-clock]').forEach(n=>n.textContent=userPlanRemaining(n.dataset.expiresAt,n.dataset.active==='true'));}
  function scheduleUserPlanManager(){clearTimeout(userPlanManagerTimer);if(!isAdminProductsRoute()||window.DRIPX_IS_ADMIN!==true){document.querySelector('#dx-user-plan-manager')?.remove();return;}userPlanManagerTimer=setTimeout(()=>renderUserPlanManager(),180);}
  async function renderUserPlanManager(force=false){
    let panel=document.querySelector('#dx-user-plan-manager');
    if(!isAdminProductsRoute()||!client||window.DRIPX_IS_ADMIN!==true){panel?.remove();return;}
    if(userPlanManagerBusy||panel?.dataset.loaded==='1'&&!force)return;userPlanManagerBusy=true;
    try{
      await getAdminSession();
      const pr=await client.from('dripx_user_plans').select('id,user_id,product_id,plan_code,order_id,starts_at,expires_at,active,admin_transferred').order('created_at',{ascending:false});
      if(pr.error)throw pr.error;const plans=pr.data||[],uids=[...new Set(plans.map(x=>x.user_id))],pids=[...new Set(plans.map(x=>x.product_id))];
      const [ur,pp,rr,mr]=await Promise.all([
        client.from('dripx_profiles').select('user_id,display_name,discord_id,avatar_url,active').eq('active',true).order('display_name',{ascending:true}),
        pids.length?client.from('dripx_products').select('id,title').in('id',pids):{data:[],error:null},
        client.from('dripx_products').select('id,title,file_path,product_type,status').eq('product_type','resource').eq('status','published').not('file_path','is',null).order('title'),
        plans.length?client.from('dripx_user_plan_resources').select('user_plan_id,resource_product_id').in('user_plan_id',plans.map(x=>x.id)):{data:[],error:null}
      ]);
      for(const x of [ur,pp,rr,mr])if(x.error)throw x.error;
      const users=new Map((ur.data||[]).map(x=>[String(x.user_id),x])),products=new Map((pp.data||[]).map(x=>[String(x.id),x]));
      const individual=new Map();for(const x of mr.data||[]){if(!individual.has(String(x.user_plan_id)))individual.set(String(x.user_plan_id),[]);individual.get(String(x.user_plan_id)).push(String(x.resource_product_id));}
      window.__DRIPX_USER_PLAN_PROFILES=ur.data||[];window.__DRIPX_USER_PLAN_RESOURCES=rr.data||[];userPlanCache.clear();
      for(const p of plans)userPlanCache.set(String(p.id),{...p,profile:users.get(String(p.user_id))||{},product:products.get(String(p.product_id))||{},individualIds:individual.get(String(p.id))||[]});
      const rows=plans.map(p=>{
        const u=users.get(String(p.user_id))||{},product=products.get(String(p.product_id))||{},active=p.active===true&&(!p.expires_at||new Date(p.expires_at).getTime()>Date.now());
        const avatar=u.avatar_url?'<img src="'+escapeHtml(u.avatar_url)+'" alt="">':'<span class="dx-up-avatar-fallback">'+escapeHtml((u.display_name||'U').slice(0,1).toUpperCase())+'</span>';
        return '<article class="dx-up-row"><div class="dx-up-user">'+avatar+'<div><strong>'+escapeHtml(u.display_name||'Usuario')+'</strong><small>'+escapeHtml(u.discord_id||'Cuenta Discord')+'</small></div></div><div class="dx-up-plan"><strong>'+escapeHtml(product.title||p.plan_code||'Plan')+'</strong><small>'+escapeHtml(p.plan_code||'')+(p.admin_transferred?' · Transferido':'')+'</small></div><div class="dx-up-time"><strong class="dx-up-clock '+(active?'is-active':'is-inactive')+'" data-dx-up-clock data-expires-at="'+escapeHtml(p.expires_at||'')+'" data-active="'+String(p.active===true)+'">'+escapeHtml(userPlanRemaining(p.expires_at,p.active===true))+'</strong><small>'+(active?'Tiempo restante':'Estado')+'</small></div><div class="dx-up-actions"><button type="button" class="dx-up-more" data-dx-up-menu="'+escapeHtml(p.id)+'" aria-label="Más opciones">···</button><div class="dx-up-menu" data-dx-up-menu-panel="'+escapeHtml(p.id)+'" hidden><button type="button" data-dx-up-action="edit" data-plan-id="'+escapeHtml(p.id)+'">✎ Editar</button><button type="button" data-dx-up-action="transfer" data-plan-id="'+escapeHtml(p.id)+'">⇄ Transferir</button><button type="button" class="is-danger" data-dx-up-action="remove" data-plan-id="'+escapeHtml(p.id)+'">⌫ Remover</button></div></div></article>';
      }).join('');
      const app=document.querySelector('#app');if(!app)return;
      panel=document.querySelector('#dx-user-plan-manager')||document.createElement('section');panel.id='dx-user-plan-manager';panel.className='dx-user-plan-manager';
      panel.innerHTML='<header class="dx-up-head"><div><span class="dx-admin-kicker">SUSCRIPCIONES / CONTROL</span><h2>Usuarios con planes obtenidos</h2><p>Cuenta regresiva en vivo. Edita accesos, agrega tiempo o transfiere sin salir de Productos.</p></div><button type="button" class="dx-up-refresh" data-dx-up-refresh>↻ Actualizar</button></header><div class="dx-up-summary"><span><b>'+plans.length+'</b> registros</span><span><b>'+plans.filter(p=>p.active&&(!p.expires_at||new Date(p.expires_at).getTime()>Date.now())).length+'</b> vigentes</span></div>'+(rows?'<div class="dx-up-list">'+rows+'</div>':'<div class="dx-up-empty">Todavía no hay usuarios con planes registrados.</div>')+'<div class="dx-up-modal-backdrop" data-dx-up-modal hidden><section class="dx-up-modal" role="dialog" aria-modal="true"><header><div><small>GESTIÓN DE PLAN</small><h3 data-dx-up-title>Administrar plan</h3></div><button type="button" data-dx-up-close aria-label="Cerrar">×</button></header><div data-dx-up-body></div></section></div>';
      panel.dataset.loaded='1';if(!panel.isConnected)app.append(panel);updateUserPlanClocks();
    }catch(err){panel=document.querySelector('#dx-user-plan-manager')||document.createElement('section');panel.id='dx-user-plan-manager';panel.className='dx-user-plan-manager';panel.dataset.loaded='error';panel.innerHTML='<p class="dx-up-error">'+escapeHtml(err.message||'No se pudieron cargar los planes.')+'</p><button type="button" data-dx-up-refresh>↻ Reintentar</button>';if(!panel.isConnected)document.querySelector('#app')?.append(panel);}
    finally{userPlanManagerBusy=false;}
  }
  function upModal(){const p=document.querySelector('#dx-user-plan-manager');return {back:p?.querySelector('[data-dx-up-modal]'),body:p?.querySelector('[data-dx-up-body]'),title:p?.querySelector('[data-dx-up-title]')};}
  function closeUpModal(){const m=upModal();if(m.back)m.back.hidden=true;document.querySelectorAll('.dx-up-menu').forEach(x=>x.hidden=true);}
  function openUpModal(id,kind){
    const p=userPlanCache.get(String(id));if(!p)throw new Error('No se encontró el plan.');const m=upModal();if(!m.back||!m.body)throw new Error('No se encontró la ventana.');
    const title=p.product.title||p.plan_code||'Plan',name=p.profile.display_name||'usuario';
    if(kind==='remove')m.body.innerHTML='<p>¿Seguro que deseas remover <b>'+escapeHtml(title)+'</b> de <b>'+escapeHtml(name)+'</b>? Sus accesos temporales serán revocados.</p><div class="dx-up-modal-actions"><button data-dx-up-close class="dx-up-secondary">Cancelar</button><button data-dx-up-remove="'+escapeHtml(id)+'" class="dx-up-danger">Remover</button></div>';
    else if(kind==='transfer'){const targets=(window.__DRIPX_USER_PLAN_PROFILES||[]).filter(x=>x.active&&String(x.user_id)!==String(p.user_id));m.body.innerHTML='<p>El destinatario recibirá el mismo plan y la misma fecha de vencimiento; no se reinicia el contador.</p><label>Usuario de destino<select data-dx-up-target><option value="">Selecciona usuario</option>'+targets.map(x=>'<option value="'+escapeHtml(x.user_id)+'">'+escapeHtml(x.display_name||'Usuario')+(x.discord_id?' · '+escapeHtml(x.discord_id):'')+'</option>').join('')+'</select></label><div class="dx-up-modal-actions"><button data-dx-up-close class="dx-up-secondary">Cancelar</button><button data-dx-up-transfer="'+escapeHtml(id)+'" class="dx-up-primary">Transferir</button></div>';}
    else {const selected=new Set(p.individualIds||[]),items=window.__DRIPX_USER_PLAN_RESOURCES||[];m.body.innerHTML='<p>Recursos adicionales solo para este usuario. Los accesos generales del plan no se modifican.</p><div class="dx-up-resource-list">'+(items.length?items.map(x=>'<label><input type="checkbox" data-dx-up-resource="'+escapeHtml(x.id)+'" '+(selected.has(String(x.id))?'checked':'')+'><span>'+escapeHtml(x.title)+'</span></label>').join(''):'<p>No hay recursos internos publicados con ZIP.</p>')+'</div><div class="dx-up-modal-actions"><button data-dx-up-close class="dx-up-secondary">Cancelar</button><button data-dx-up-save="'+escapeHtml(id)+'" class="dx-up-primary">Guardar productos</button></div><div class="dx-up-time-form"><h4>Agregar tiempo</h4><div><input type="number" min="1" max="31536000" value="30" data-dx-up-amount><select data-dx-up-unit><option value="days">Días</option><option value="hours">Horas</option><option value="seconds">Segundos</option></select><button data-dx-up-add-time="'+escapeHtml(id)+'" class="dx-up-primary">Aceptar</button></div><small>Se suma al vencimiento actual o desde ahora si ya venció.</small></div>';}
    m.title.textContent=kind==='remove'?'Confirmar retirada':kind==='transfer'?'Transferir plan':'Editar plan · '+name;m.back.hidden=false;
  }
  async function reloadUp(){const p=document.querySelector('#dx-user-plan-manager');if(p)p.dataset.loaded='0';await renderUserPlanManager(true);}
  document.addEventListener('click',async ev=>{
    const menu=ev.target.closest('[data-dx-up-menu]');if(menu){ev.preventDefault();ev.stopImmediatePropagation();const id=menu.dataset.dxUpMenu;const target=[...document.querySelectorAll('[data-dx-up-menu-panel]')].find(x=>x.dataset.dxUpMenuPanel===id);document.querySelectorAll('.dx-up-menu').forEach(x=>x.hidden=true);if(target)target.hidden=false;return;}
    const action=ev.target.closest('[data-dx-up-action]');if(action){ev.preventDefault();ev.stopImmediatePropagation();openUpModal(action.dataset.planId,action.dataset.dxUpAction);return;}
    if(ev.target.closest('[data-dx-up-close]')){ev.preventDefault();closeUpModal();return;}
    if(ev.target.closest('[data-dx-up-refresh]')){ev.preventDefault();await reloadUp();return;}
    const save=ev.target.closest('[data-dx-up-save]');if(save){ev.preventDefault();save.disabled=true;try{await getAdminSession();const ids=[...document.querySelectorAll('[data-dx-up-resource]:checked')].map(x=>x.dataset.dxUpResource);const {error}=await client.rpc('dripx_admin_set_user_plan_resources',{p_user_plan_id:save.dataset.dxUpSave,p_resource_product_ids:ids});if(error)throw error;toast('Productos guardados para este usuario.');await reloadUp();closeUpModal();}catch(err){toast(err.message||'No se pudieron guardar.');save.disabled=false;}return;}
    const time=ev.target.closest('[data-dx-up-add-time]');if(time){ev.preventDefault();time.disabled=true;try{await getAdminSession();const amount=Number(document.querySelector('[data-dx-up-amount]')?.value),unit=document.querySelector('[data-dx-up-unit]')?.value;if(!Number.isInteger(amount)||amount<1)throw new Error('Indica una cantidad válida.');const {data,error}=await client.rpc('dripx_admin_add_user_plan_time',{p_user_plan_id:time.dataset.dxUpAddTime,p_amount:amount,p_unit:unit});if(error)throw error;toast('Tiempo agregado · vence '+new Date(data).toLocaleString('es-DO'));await reloadUp();closeUpModal();}catch(err){toast(err.message||'No se pudo agregar tiempo.');time.disabled=false;}return;}
    const transfer=ev.target.closest('[data-dx-up-transfer]');if(transfer){ev.preventDefault();transfer.disabled=true;try{await getAdminSession();const target=document.querySelector('[data-dx-up-target]')?.value;if(!target)throw new Error('Selecciona un usuario.');const {error}=await client.rpc('dripx_admin_transfer_user_plan',{p_user_plan_id:transfer.dataset.dxUpTransfer,p_target_user_id:target});if(error)throw error;toast('Plan transferido conservando el vencimiento.');await reloadUp();closeUpModal();}catch(err){toast(err.message||'No se pudo transferir.');transfer.disabled=false;}return;}
    const remove=ev.target.closest('[data-dx-up-remove]');if(remove){ev.preventDefault();remove.disabled=true;try{await getAdminSession();const {error}=await client.rpc('dripx_admin_remove_user_plan',{p_user_plan_id:remove.dataset.dxUpRemove});if(error)throw error;toast('Plan removido y accesos revocados.');await reloadUp();closeUpModal();}catch(err){toast(err.message||'No se pudo remover.');remove.disabled=false;}}
  },true);
  document.addEventListener('click',async ev=>{const b=ev.target.closest('[data-dx-renew-plan]');if(!b)return;ev.preventDefault();ev.stopImmediatePropagation();b.disabled=true;try{const {data,error}=await client.rpc('customer_request_plan_renewal',{p_user_plan_id:b.dataset.dxRenewPlan});if(error)throw error;toast(data?.message||'Solicitud de renovación creada.');await renderOwnedProducts();}catch(err){toast(err.message||'No se pudo renovar.');b.disabled=false;}},true);
  function installUserPlanManagerObserver(){if(window.__DRIPX_USER_PLAN_MANAGER_OBSERVER)return;const root=document.querySelector('#app');if(!root)return;const ob=new MutationObserver(()=>scheduleUserPlanManager());ob.observe(root,{childList:true,subtree:true});window.__DRIPX_USER_PLAN_MANAGER_OBSERVER=ob;if(!window.__DRIPX_PLAN_CLOCK_TIMER)window.__DRIPX_PLAN_CLOCK_TIMER=setInterval(updateUserPlanClocks,1000);scheduleUserPlanManager();}

  function productFieldWrapper(control){
    if(!control)return null;
    return control.closest('label,.form-group,.form-field,.field,.form-row,.input-group')||control.parentElement;
  }
  function syncProductTypeLayout(form){
    if(!form||form.id!=='product-form')return;
    const type=form.querySelector('select[name="product_type"]');
    if(!type)return;
    const isPlan=String(type.value||'plan')==='plan';
    const category=form.querySelector('select[name="category"],select[id*="categor" i]');
    const file=form.querySelector('input[name="file"],#resource-zip');
    const fileWrap=productFieldWrapper(file);
    if(fileWrap){
      fileWrap.hidden=isPlan;
      fileWrap.setAttribute('aria-hidden',String(isPlan));
      fileWrap.classList.toggle('dx-product-field-hidden',isPlan);
    }
    form.querySelectorAll('.dx-product-engine,.dx-product-zip-preview,.dx-staging-panel,#product-zip-preview,#product-zip-upload-state,#zip-status,#zip-file-list,#zip-protect,#zip-compile,#zip-download,.dx-upload-progress').forEach(node=>{
      node.hidden=isPlan;
      node.setAttribute('aria-hidden',String(isPlan));
    });
    ['plan_code','billing_period','features'].forEach(name=>{
      const control=form.querySelector('[name="'+name+'"]');
      const wrap=productFieldWrapper(control);
      if(wrap){wrap.hidden=!isPlan;wrap.setAttribute('aria-hidden',String(!isPlan));}
    });
    if(category){
      category.classList.add('dx-product-category-select');
      const wanted=isPlan?'Planes':'Productos';
      const option=Array.from(category.options).find(item=>String(item.value||'').trim().toLowerCase()===wanted.toLowerCase());
      if(option&&category.value!==option.value)category.value=option.value;
    }
    const hint=form.querySelector('[data-dx-product-type-hint]')||document.createElement('div');
    hint.dataset.dxProductTypeHint='';
    hint.className='dx-product-type-guidance '+(isPlan?'is-plan':'is-resource');
    hint.innerHTML=isPlan
      ?'<span>✦</span><div><strong>Plan de acceso · sin archivos</strong><small>Configura el precio, la duración y las características. Los ZIP no pertenecen al plan; se vinculan desde Configuración de planes.</small></div>'
      :'<span>▣</span><div><strong>Producto descargable · categoría Productos</strong><small>Este recurso se crea aquí, con su ZIP y su imagen. Una vez publicado aparecerá en el configurador para incluirlo en los planes.</small></div>';
    if(!hint.isConnected){
      const parent=type.closest('label,.form-group,.form-field,.field,.form-row')||type.parentElement;
      parent?.insertAdjacentElement('afterend',hint);
    }
    Array.from(type.options).forEach(option=>{
      if(option.value==='plan')option.textContent='Plan de acceso · sin ZIP';
      if(option.value==='resource')option.textContent='Producto descargable · ZIP';
    });
    if(isPlan&&file){
      if(file.value)file.value='';
      window.__DRIPX_PROCESSED_PRODUCT_FILE=null;
      window.__DRIPX_PROCESSED_PRODUCT_ZIP=null;
      window.__DRIPX_PENDING_PRODUCT_ID=null;
      const status=form.querySelector('#product-zip-upload-state');
      if(status)status.textContent='Los planes no almacenan ZIP. Los recursos se administran como productos independientes.';
    }
    form.dataset.dripxProductTypeLayout='1';
  }
  function installProductTypeLayout(){
    const sync=()=>{const form=document.querySelector('#product-form');if(form)syncProductTypeLayout(form);};
    document.addEventListener('change',event=>{
      if(event.target.matches('#product-form select[name="product_type"]'))syncProductTypeLayout(event.target.closest('#product-form'));
    },true);
    const root=document.querySelector('#app');
    if(root&&!root.dataset.dxProductTypeObserver){
      root.dataset.dxProductTypeObserver='1';
      const observer=new MutationObserver(()=>sync());
      observer.observe(root,{childList:true,subtree:true});
    }
    sync();
  }

  function boot(){
    replaceIcons();ensureButtonIcons();installDescriptionToolbar();applyBrandLogo();installImageFallback();hideTopCategoryStrip();removeDuplicateBackAndAdminLabels();syncRouteBackButton();removeStandaloneProtectionAdminEntry();applyPlanCardSkin();installProductZipProtectionGuard();clearLegacyZipStaging();syncCatalogOwnership(true);
    if(document.querySelector('.profile-tabs'))ensureOwnedProductsTab();
    syncCategoryOptions(true);installProductTypeLayout();markAdminView();installAdminProductsTabTracker();installPlanResourceManagerObserver();installUserPlanManagerObserver();installCategoryAuthLifecycle();syncCategoryRouteFromHash();syncCategoryManagerVisibility();
    cssObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
