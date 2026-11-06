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
    const {data:{session},error}=await client.auth.getSession();if(error)throw error;
    if(!session?.user?.id||!session.access_token)throw new Error('Tu sesión expiró. Inicia sesión con Discord de nuevo.');
    const {data:admin,error:adminError}=await client.rpc('dripx_is_admin');if(adminError)throw adminError;
    if(admin!==true)throw new Error('Solo administración puede proteger recursos desde Productos.');
    return session;
  }
  function tusUpload(bucket,path,file,onProgress){
    return new Promise(async(resolve,reject)=>{
      try{
        if(!window.tus?.Upload)throw new Error('No se pudo cargar el módulo de subida reanudable. Recarga la página.');
        if(!projectRef)throw new Error('Configuración de Supabase inválida.');
        const {data:{session},error}=await client.auth.getSession();if(error)throw error;
        if(!session?.access_token)throw new Error('La sesión expiró antes de comenzar la subida.');
        const upload=new window.tus.Upload(file,{
          endpoint:'https://'+projectRef+'.storage.supabase.co/storage/v1/upload/resumable',
          retryDelays:[0,3000,5000,10000,20000],
          headers:{authorization:'Bearer '+session.access_token,apikey:C.supabaseKey||C.publishableKey,'x-upsert':'false'},
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
  function mountProductZipPipeline(node,input,file){
    return (async()=>{
      let engine=node.querySelector('.dx-product-engine');
      if(!engine){
        engine=document.createElement('section');
        engine.className='dx-product-engine';
        engine.setAttribute('data-dripx-engine','embedded');
        engine.innerHTML='';
        engine.hidden=true;
        engine.setAttribute('aria-hidden','true');
        node.append(engine);
      }
      const ensure=(id,tag,cls,label)=>{
        let el=engine.querySelector('[id="'+id+'"]')||document.getElementById(id);
        if(el&&!engine.contains(el))engine.append(el);
        if(!el){
          el=document.createElement(tag);el.id=id;
          if(cls)el.className=cls;
          if(tag==='button'){el.type='button';el.textContent=label||'';}
          engine.append(el);
        }
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
      if(typeof window.DRIPX_LOAD_ZIP!=='function')throw new Error('El motor DRIPX no está cargado. Recarga la página.');
      const loaded=await window.DRIPX_LOAD_ZIP(file);
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

  function armCompiledZipCapture(input){
    if(!input)return;
    const native=URL.createObjectURL.bind(URL);
    let captured=false;
    const nativeAnchorClick=HTMLAnchorElement.prototype.click;
    URL.createObjectURL=function(object){
      const url=native(object);
      if(!captured&&object instanceof Blob&&object.size>0&&/zip/i.test(String(object.type||''))){
        captured=true;
        try{
          const source=input.files?.[0],sourceName=source?.name||'resource.zip',name=(sourceName.toLowerCase().endsWith('.zip')?sourceName.slice(0,-4):sourceName)+'-DRIPX-protegido.zip';
          const processed=new File([object],name,{type:'application/zip',lastModified:Date.now()});
          const transfer=new DataTransfer();transfer.items.add(processed);input.files=transfer.files;
          setProductZipStatus('ZIP protegido listo. Al guardar el producto se subirá este archivo final a product-files.','success');
          window.__DRIPX_PROCESSED_PRODUCT_ZIP={name,bytes:processed.size,productId:window.__DRIPX_PENDING_PRODUCT_ID||'',resourceName:window.__DRIPX_RESOURCE_NAME||'',at:Date.now()};
          URL.createObjectURL=native;
        }catch(error){console.warn('[DRIPX] No se pudo adjuntar el ZIP protegido al producto:',error);}
      }
      return url;
    };
    HTMLAnchorElement.prototype.click=function(){
      if(this.download&&String(this.href||'').startsWith('blob:')){
        HTMLAnchorElement.prototype.click=nativeAnchorClick;
        return;
      }
      return nativeAnchorClick.call(this);
    };
    window.setTimeout(()=>{
      if(URL.createObjectURL!==native)URL.createObjectURL=native;
      if(HTMLAnchorElement.prototype.click!==nativeAnchorClick)HTMLAnchorElement.prototype.click=nativeAnchorClick;
    },480000);
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
          source_bytes:file.size,protected_bytes:protectedFile.size
        }}),
        signal:AbortSignal.timeout(15000)
      });
      const payload=await response.clone().json().catch(()=>({}));
      if(!response.ok||payload.sent!==true)console.warn('[DRIPX] Discord resource-protected embed was not delivered:',response.status,payload.reason||payload.error||payload.stage||'unknown');
    }catch(error){console.warn('[DRIPX] Discord protection log failed:',error?.message||error);}
  }

  async function previewProductZip(file){
    const input=document.querySelector('#product-form input[name="file"]');
    const form=input?.closest('#product-form');
    if(!input||!form)return;
    const runId=String(Date.now())+'-'+Math.random().toString(36).slice(2);
    input.dataset.dripxZipRun=runId;
    input.dataset.dripxZipReady='false';
    window.__DRIPX_PROCESSED_PRODUCT_ZIP=null;
    lockProductSubmit(form,true);
    let node=document.querySelector('#product-zip-preview');
    if(!node){
      node=document.createElement('div');node.id='product-zip-preview';node.className='dx-product-zip-preview';
      const anchor=input.closest('label')||input.parentElement||input;
      anchor.insertAdjacentElement('afterend',node);
      const status=document.createElement('div');status.id='product-zip-upload-state';status.className='dx-upload-state';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
      node.insertAdjacentElement('afterend',status);
    }
    node.dataset.state='processing';
    node.innerHTML='<div class="dx-preview-loading">1/4 · Validando ZIP y leyendo meta.xml…</div>';
    setProductZipStatus('Preparando el resource para protección automática…','processing');
    try{
      await getAdminSession();
      const engine=await mountProductZipPipeline(node,input,file);
      if(input.dataset.dripxZipRun!==runId)return;
      const result=window.DRIPX_ZIP_SCAN_RESULT;
      if(!result||result.file!==file||!Array.isArray(result.files))throw new Error('El lector no devolvió un inventario válido.');
      const rows=result.files.map(item=>{
        const compile=['server_lua','client_lua','lua_other'].includes(item.kind);
        const label=item.kind==='server_lua'?'Lua servidor':item.kind==='client_lua'?'Lua cliente':item.kind==='lua_other'?'Lua adicional':item.kind==='shared_lua'||item.kind==='config'?'Configuración / shared':'Archivo conservado';
        const glyph=compile?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5"/></svg>';
        return '<div class="dx-upload-file '+(compile?'is-compile':'')+'"><span class="dx-upload-file-icon">'+glyph+'</span><span class="dx-upload-file-name">'+escapeHtml(item.path)+'</span><small>'+label+' · '+formatBytes(item.bytes)+'</small></div>';
      }).join('');
      node.innerHTML='<div class="dx-preview-summary"><strong>'+escapeHtml(file.name)+'</strong><span>'+formatBytes(file.size)+' · '+result.files.length+' archivos · '+result.server.length+' server · '+result.client.length+' client</span><b class="warn">Protección en proceso</b></div><div class="dx-preview-grid"><span>'+result.server.length+' Lua server</span><span>'+result.client.length+' Lua client</span><span>'+result.files.filter(x=>x.kind==='config'||x.kind==='shared_lua').length+' config/shared</span><span>'+formatBytes(result.expanded)+' descomprimidos</span></div><div class="dx-preview-files">'+rows+'</div><div class="dx-upload-state dx-auto-progress"><span class="dx-auto-step is-active">Analizar</span><span class="dx-auto-step">Proteger</span><span class="dx-auto-step">Compilar</span><span class="dx-auto-step">Preparar ZIP</span></div>';
      node.append(engine);
      if(input.dataset.dripxZipRun!==runId)return;
      const protect=engine.querySelector('#zip-protect'),compile=engine.querySelector('#zip-compile'),download=engine.querySelector('#zip-download');
      if(!protect||!compile||!download)throw new Error('Faltan controles del motor de protección.');
      const compilableLua=result.files.filter(item=>item.path.toLowerCase().endsWith('.lua')&&!['config','shared_lua'].includes(item.kind));
      if(!compilableLua.length)throw new Error('El ZIP no contiene archivos Lua compilables. Los config y type="shared" se conservan sin compilar.');
      setProductZipStatus('02/4 · Protegiendo el resource y preparando la validación DRIPX…','processing');
      node.querySelectorAll('.dx-auto-step')[1]?.classList.add('is-active');
      if(protect.disabled)throw new Error('El motor no habilitó la protección. Revisa meta.xml y los scripts Lua.');
      protect.click();
      await waitForZipState(()=>!compile.disabled,'protección del resource');
      if(input.dataset.dripxZipRun!==runId)return;
      setProductZipStatus('03/4 · Compilando automáticamente los Lua seleccionados…','processing');
      node.querySelectorAll('.dx-auto-step')[1]?.classList.add('is-done');
      node.querySelectorAll('.dx-auto-step')[2]?.classList.add('is-active');
      if(compile.disabled)throw new Error('La protección no terminó; el ZIP no se puede compilar.');
      compile.click();
      await waitForZipState(()=>!download.disabled,'compilación de los scripts Lua');
      if(input.dataset.dripxZipRun!==runId)return;
      if(typeof window.DRIPX_INJECT_LICENSE_GUARD!=='function')throw new Error('El módulo de licencia MTA no está integrado en el motor de protección. Recarga la página e inténtalo de nuevo.');
      await window.DRIPX_INJECT_LICENSE_GUARD();
      setProductZipStatus('04/4 · Inyectando la licencia y el guardián compartido…','processing');
      node.querySelectorAll('.dx-auto-step')[2]?.classList.add('is-done');
      node.querySelectorAll('.dx-auto-step')[3]?.classList.add('is-active');
      armCompiledZipCapture(input);
      download.click();
      await waitForZipState(()=>!!window.__DRIPX_PROCESSED_PRODUCT_ZIP&&input.files?.[0]?.name===window.__DRIPX_PROCESSED_PRODUCT_ZIP.name,'generación del ZIP protegido');
      if(input.dataset.dripxZipRun!==runId)return;
      const protectedFile=input.files?.[0];
      if(!protectedFile||protectedFile.size===0||!/-DRIPX-protegido\.zip$/i.test(protectedFile.name))throw new Error('El ZIP protegido no se adjuntó al formulario. Selecciona el ZIP y repite la protección.');
      input.dataset.dripxZipReady='true';
      delete input.dataset.dripxResourceName;
      window.__DRIPX_RESOURCE_NAME='';
      node.dataset.state='success';
      node.querySelectorAll('.dx-auto-step')[3]?.classList.add('is-done');
      const summary=node.querySelector('.dx-preview-summary b');
      if(summary){summary.className='ok';summary.textContent='Protección DRIPX completada';}
      const fileName=node.querySelector('.dx-preview-summary strong');
      if(fileName)fileName.textContent=protectedFile.name;
      setProductZipStatus('Protección completada. Al pulsar Guardar/Publicar se subirá únicamente este ZIP protegido junto con el producto.','success');
      void sendProtectedProductLog(file,result,protectedFile);
      lockProductSubmit(form,false);
      toast('ZIP protegido y adjuntado al producto. Ya puedes guardarlo o publicarlo.');
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }catch(error){
      if(input.dataset.dripxZipRun!==runId)return;
      input.dataset.dripxZipReady='false';
      node.dataset.state='error';
      setProductZipStatus('No se pudo completar la protección. El ZIP original no se publicará: '+(error.message||'Error desconocido'),'error');
      const steps=node.querySelectorAll('.dx-auto-step');steps.forEach(step=>step.classList.remove('is-active'));
      console.error('[DRIPX] Automatic product ZIP protection:',error);
      toast(error.message||'Falló la protección del ZIP.');
      lockProductSubmit(form,false);
    }
  }

  document.addEventListener('change',event=>{
    if(event.target?.matches('#product-form input[name="file"]')){
      const input=event.target,file=input.files?.[0];
      if(!file)return;
      if(input.dataset.dripxZipReady==='true'&&String(file.name||'').toLowerCase().endsWith('-dripx-protegido.zip'))return;
      previewProductZip(file);
    }
  });
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
    if(maps.error)throw maps.error;
    const directRows=entitlements.filter(row=>orderApproved(row.order_id));
    const directIds=new Set(directRows.map(x=>String(x.product_id))),planSources=new Map();
    for(const m of maps.data||[]){const plan=activePlans.find(p=>String(p.product_id)===String(m.plan_product_id));if(!plan)continue;const id=String(m.resource_product_id);if(!planSources.has(id))planSources.set(id,[]);planSources.get(id).push(plan);}
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
      const count=(maps.data||[]).filter(m=>String(m.plan_product_id)===String(plan.product_id)).length;
      const inv=order?.status==='approved'?'<button type="button" class="btn secondary" data-dx-invoice="'+escapeHtml(order.id)+'">'+iconMarkup('file')+' Factura</button>':'<button type="button" class="btn secondary" disabled>'+iconMarkup('file')+' Factura pendiente</button>';
      return '<article class="order-card dx-owned-plan"><header><div><strong>'+escapeHtml(p?.title||plan.plan_code||'Plan')+'</strong><br><small class="muted">Plan adquirido · '+(plan.expires_at?'hasta '+new Date(plan.expires_at).toLocaleDateString('es-DO'):'sin vencimiento')+'</small></div><span class="status '+(active?'approved':'muted')+'">'+(active?'Activo':'Finalizado')+'</span></header><p class="muted">'+escapeHtml(p?.description||'Acceso temporal a recursos seleccionados de la tienda.')+'</p><small class="dx-owned-access">'+count+' recursos incluidos · '+(active?'se revocan al vencer':'acceso no vigente')+'</small><div class="order-actions">'+inv+'</div></article>';
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
      return /categor/i.test(meta);
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
        const source=inProductForm?allNames:activeNames;
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

  function isAdminProductsRoute(){
    return /^#admin\/productos(?:$|[/?])/i.test(String(location.hash||''));
  }
  let planResourceTimer=0,planResourceLoading=false;
  function schedulePlanResourceManager(){
    clearTimeout(planResourceTimer);
    if(window.DRIPX_IS_ADMIN!==true){document.querySelector('#dx-plan-resource-manager')?.remove();return;}
    planResourceTimer=setTimeout(()=>{void renderPlanResourceManager();},150);
  }
  async function renderPlanResourceManager(){
    let panel=document.querySelector('#dx-plan-resource-manager');
    if(!isAdminProductsRoute()||!client||window.DRIPX_IS_ADMIN!==true){panel?.remove();return;}
    if(planResourceLoading||panel?.dataset.loaded==='1')return;
    planResourceLoading=true;
    try{
      await getAdminSession();
      const [productsResult,mappingsResult]=await Promise.all([
        client.from('dripx_products').select('id,title,product_type,status,plan_code,billing_period,protection_enabled,file_path').order('created_at',{ascending:false}),
        client.from('dripx_plan_resources').select('plan_product_id,resource_product_id')
      ]);
      if(productsResult.error)throw productsResult.error;
      if(mappingsResult.error)throw mappingsResult.error;
      const products=productsResult.data||[];
      const plans=products.filter(p=>p.product_type==='plan');
      const resources=products.filter(p=>p.product_type==='resource'&&p.status==='published'&&p.protection_enabled===true&&!!p.file_path);
      const mapped=new Set((mappingsResult.data||[]).map(row=>String(row.plan_product_id)+'::'+String(row.resource_product_id)));
      const app=document.querySelector('#app');if(!app)return;
      panel=document.querySelector('#dx-plan-resource-manager');
      if(!panel){panel=document.createElement('section');panel.id='dx-plan-resource-manager';panel.className='dx-plan-resource-manager';}
      const planMarkup=plans.map(plan=>
        '<article class="dx-plan-resource-card" data-dx-plan-card="'+escapeHtml(plan.id)+'">'+
          '<header><div><strong>'+escapeHtml(plan.title||plan.plan_code||'Plan')+'</strong><small>'+escapeHtml(plan.plan_code||'')+' · '+escapeHtml(plan.billing_period||'periodo no especificado')+'</small></div>'+
          '<button type="button" class="btn primary" data-dx-plan-save="'+escapeHtml(plan.id)+'">Guardar</button></header>'+
          (resources.length
            ? '<div class="dx-plan-resource-options">'+resources.map(resource=>
                '<label><input type="checkbox" data-dx-plan-resource="'+escapeHtml(resource.id)+'" '+(mapped.has(String(plan.id)+'::'+String(resource.id))?'checked':'')+'><span>'+escapeHtml(resource.title)+'</span></label>'
              ).join('')+'</div>'
            : '<p class="muted">No hay resources publicados con ZIP protegido. Primero crea un producto de tipo Resource y publica su ZIP desde esta misma sección.</p>')+
          '<p class="dx-plan-resource-status" data-dx-plan-status role="status"></p></article>'
      ).join('');
      panel.innerHTML='<header class="dx-plan-resource-manager-head"><div><span class="dx-admin-kicker">ACCESOS TEMPORALES</span><h2>Recursos incluidos en cada plan</h2><p>Marca los resources protegidos que incluye cada plan. El sistema comprobará la compra y su vencimiento en cada descarga y validación MTA.</p></div></header>'+
        (planMarkup||'<p class="muted">Todavía no hay productos de tipo Plan para configurar.</p>');
      panel.dataset.loaded='1';
      if(!panel.isConnected)app.append(panel);
    }catch(error){
      panel=document.querySelector('#dx-plan-resource-manager');
      if(!panel){const app=document.querySelector('#app');if(!app)return;panel=document.createElement('section');panel.id='dx-plan-resource-manager';panel.className='dx-plan-resource-manager';app.append(panel);}
      panel.dataset.loaded='1';
      panel.innerHTML='<p class="dx-admin-error">'+escapeHtml(error.message||'No se pudieron cargar los recursos de los planes.')+'</p>';
    }finally{planResourceLoading=false;}
  }
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
  window.addEventListener('hashchange',()=>{hideTopCategoryStrip();syncRouteBackButton();markAdminView();syncCategoryOptions(true);syncCatalogOwnership(true);removeStandaloneProtectionAdminEntry();schedulePlanResourceManager();});

  function installProductZipProtectionGuard(){
    if(document.documentElement.dataset.dripxZipGuard==='1')return;
    document.documentElement.dataset.dripxZipGuard='1';
    document.addEventListener('submit',event=>{
      const form=event.target;
      if(!form||form.id!=='product-form')return;
      const input=form.querySelector('input[name="file"]');
      const file=input?.files?.[0];
      if(!file)return;
      if(!String(file.name||'').toLowerCase().endsWith('.zip')){
        event.preventDefault();event.stopImmediatePropagation();toast('El archivo del producto debe ser un ZIP.');return;
      }
      const processed=window.__DRIPX_PROCESSED_PRODUCT_ZIP;
      if(form.dataset.dripxZipProcessing==='true'||input.dataset.dripxZipReady!=='true'||!processed||processed.name!==file.name||!String(file.name||'').toLowerCase().endsWith('-dripx-protegido.zip')){
        event.preventDefault();event.stopImmediatePropagation();
        const message='No se publicó el producto: vuelve a seleccionar el ZIP y deja que DRIP X SHOP termine la protección automática.';
        if(typeof toast==='function')toast(message);else console.warn('[DRIPX]',message);
      }
    },true);
  }
  const cssObserver=new MutationObserver(()=>{
    replaceIcons();ensureButtonIcons();applyBrandLogo();hideTopCategoryStrip();removeDuplicateBackAndAdminLabels();syncRouteBackButton();removeStandaloneProtectionAdminEntry();applyPlanCardSkin();markAdminView();syncCategoryOptions(false);syncCatalogOwnership(false);clearLegacyZipStaging();
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

  function boot(){
    replaceIcons();ensureButtonIcons();applyBrandLogo();installImageFallback();hideTopCategoryStrip();removeDuplicateBackAndAdminLabels();syncRouteBackButton();removeStandaloneProtectionAdminEntry();applyPlanCardSkin();installProductZipProtectionGuard();clearLegacyZipStaging();syncCatalogOwnership(true);
    if(document.querySelector('.profile-tabs'))ensureOwnedProductsTab();
    syncCategoryOptions(true);markAdminView();installPlanResourceManagerObserver();
    cssObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
