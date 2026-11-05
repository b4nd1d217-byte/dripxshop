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
      if(!parent.closest('button,a,label,.pill,.tab,.eyebrow,.social-icon,.leader-rank,.protection-mini,.section-head,.page-head,.notice,.catalog-trigger,.catalog-option,.profile-menu-item,.status,.back,.close,.icon-btn,.total,.stat,.placeholder,.product-video-teaser,.product-bottom,.cart-line,.empty'))return NodeFilter.FILTER_REJECT;
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
    document.querySelectorAll('img[src="/assets/logo.svg"],img[src^="/assets/logo.svg"],img.hero-logo').forEach(img=>{
      img.decoding='async';img.loading='eager';img.alt='DRIP X SHOP';
    });
    document.querySelectorAll('link[rel="icon"]').forEach(link=>{link.href=src;});
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
    if(admin!==true)throw new Error('Solo administración puede guardar ZIPs en el área de protección.');
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
          headers:{authorization:'Bearer '+session.access_token,apikey:C.supabaseKey,'x-upsert':'false'},
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

  async function scanZip(file){
    if(!window.JSZip)throw new Error('No se pudo cargar JSZip. Recarga la página.');
    if(!file||!file.size)throw new Error('Selecciona un archivo ZIP.');
    if(!/\.zip$/i.test(file.name||''))throw new Error('El archivo del producto debe ser un ZIP.');
    if(file.size>100*1024*1024)throw new Error('El ZIP supera el límite de 100 MB.');
    const zip=await JSZip.loadAsync(file,{checkCRC32:true});
    const entries=Object.values(zip.files).filter(entry=>!entry.dir&&!entry.name.startsWith('__MACOSX/')&&!entry.name.endsWith('/.DS_Store'));
    if(!entries.length)throw new Error('El ZIP está vacío.');
    if(entries.length>3000)throw new Error('El ZIP supera el límite de 3.000 archivos.');
    if(entries.some(entry=>entry.name.startsWith('/')||entry.name.includes('\\')||entry.name.split('/').some(part=>!part||part==='.'||part==='..')))throw new Error('El ZIP contiene rutas inseguras.');
    const expanded=entries.reduce((sum,entry)=>sum+Number(entry._data?.uncompressedSize||0),0);
    if(expanded>200*1024*1024)throw new Error('El ZIP descomprimido supera el límite de 200 MB.');
    let meta=entries.find(entry=>entry.name.toLowerCase()==='meta.xml'),rootPrefix='';
    if(!meta){
      const nested=entries.filter(entry=>entry.name.toLowerCase().endsWith('/meta.xml'));
      if(nested.length===1){
        rootPrefix=nested[0].name.slice(0,nested[0].name.lastIndexOf('/')+1);
        if(!entries.every(entry=>entry.name.startsWith(rootPrefix)))throw new Error('El ZIP mezcla archivos de varios resources. Sube un único resource MTA:SA.');
      }else if(nested.length>1){
        throw new Error('El ZIP contiene varios meta.xml. Sube un único resource MTA:SA.');
      }
    }
    const scriptMap=new Map();
    if(meta||rootPrefix){
      const metaEntry=meta||entries.find(entry=>entry.name.toLowerCase()===rootPrefix.toLowerCase()+'meta.xml');
      if(metaEntry){
        const xml=new DOMParser().parseFromString(await metaEntry.async('string'),'application/xml');
        if(xml.querySelector('parsererror')||xml.documentElement?.tagName.toLowerCase()!=='meta')throw new Error('meta.xml no contiene un XML válido de MTA:SA.');
        for(const node of xml.querySelectorAll('script')){
          const path=String(node.getAttribute('src')||'').split(String.fromCharCode(92)).join('/').replace(/^\.\//,'');
          if(path)scriptMap.set(path,(node.getAttribute('type')||'server').toLowerCase());
        }
      }
    }
    const files=entries.map(entry=>{
      const path=entry.name,lower=path.toLowerCase(),ext=lower.split('.').pop();
      const relative=rootPrefix&&path.startsWith(rootPrefix)?path.slice(rootPrefix.length):path;
      const script=scriptMap.get(relative),lua=lower.endsWith('.lua');
      const config=/(^|\/)(config|settings|shared|language|locale)[^/]*\.(lua|xml|json|ini|cfg|conf|ya?ml)$/i.test(path)||['xml','json','ini','cfg','conf','yaml','yml'].includes(ext);
      const server=lua&&script==='server'&&!config,clientSide=lua&&script==='client'&&!config,shared=lua&&script==='shared';
      const shader=['fx','hlsl','glsl'].includes(ext);
      return {path,bytes:Number(entry._data?.uncompressedSize||0),kind:server?'server_lua':(clientSide?'client_lua':(shared?'shared_lua':(config?'config':(lua?'lua_other':(shader?'shader':'file')))))};
    });
    return {zip,entries,files,expanded,metaPath:meta?.name||(rootPrefix+'meta.xml'),rootPrefix,
      server:files.filter(entry=>entry.kind==='server_lua'),client:files.filter(entry=>entry.kind==='client_lua'),
      luaCount:files.filter(entry=>entry.path.toLowerCase().endsWith('.lua')).length};
  }

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
      if(!engine){engine=document.createElement('section');engine.className='dx-product-engine';engine.innerHTML='<div class="dx-engine-heading"><strong>Protección integrada del producto</strong><small>DRIP X SHOP analizará y protegerá el resource antes de guardarlo. El ZIP original no se publicará.</small></div>';node.append(engine);}
      const ids=['zip-analysis','zip-file-list','zip-protect','zip-compile','zip-download','zip-status'];
      for(const id of ids){const item=document.getElementById(id);if(item&&!engine.contains(item))engine.append(item);}
      const ready=ids.every(id=>!!engine.querySelector('#'+id));
      if(!ready)throw new Error('El motor de protección no está disponible en el formulario de producto. No se permitirá publicar el ZIP original.');
      if(typeof window.DRIPX_LOAD_ZIP!=='function')throw new Error('El motor de protección no está cargado. Recarga la página.');
      await window.DRIPX_LOAD_ZIP(file);
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
      if(!captured&&object instanceof Blob&&object.size>0){
        captured=true;
        try{
          const source=input.files?.[0],sourceName=source?.name||'resource.zip',name=(sourceName.toLowerCase().endsWith('.zip')?sourceName.slice(0,-4):sourceName)+'-DRIPX-protegido.zip';
          const processed=new File([object],name,{type:'application/zip',lastModified:Date.now()});
          const transfer=new DataTransfer();transfer.items.add(processed);input.files=transfer.files;
          setProductZipStatus('ZIP protegido listo. Al guardar el producto se subirá este archivo final a product-files.','success');
          window.__DRIPX_PROCESSED_PRODUCT_ZIP={name,bytes:processed.size,at:Date.now()};
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
      const status=document.createElement('div');status.id='product-zip-upload-state';status.className='dx-upload-state';
      node.insertAdjacentElement('afterend',status);
    }
    node.dataset.state='processing';
    node.innerHTML='<div class="dx-preview-loading">1/4 · Validando ZIP y leyendo meta.xml…</div>';
    setProductZipStatus('Preparando el resource para protección automática…','processing');
    try{
      await getAdminSession();
      const result=await scanZip(file);
      if(input.dataset.dripxZipRun!==runId)return;
      const rows=result.files.slice(0,180).map(item=>{
        const compile=item.kind==='server_lua'||item.kind==='client_lua';
        const label=item.kind==='server_lua'?'Lua servidor':item.kind==='client_lua'?'Lua cliente':item.kind==='shared_lua'||item.kind==='config'?'Configuración / shared':'Archivo conservado';
        const glyph=compile?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5"/></svg>';
        return '<div class="dx-upload-file '+(compile?'is-compile':'')+'"><span class="dx-upload-file-icon">'+glyph+'</span><span class="dx-upload-file-name">'+escapeHtml(item.path)+'</span><small>'+label+' · '+formatBytes(item.bytes)+'</small></div>';
      }).join('');
      node.innerHTML='<div class="dx-preview-summary"><strong>'+escapeHtml(file.name)+'</strong><span>'+formatBytes(file.size)+' · '+result.files.length+' archivos · '+result.server.length+' server · '+result.client.length+' client</span><b class="warn">ZIP original — protección pendiente</b></div><div class="dx-preview-grid"><span>'+result.server.length+' Lua server</span><span>'+result.client.length+' Lua client</span><span>'+result.files.filter(x=>x.kind==='config'||x.kind==='shared_lua').length+' config/shared</span><span>'+formatBytes(result.expanded)+' extraídos</span></div><div class="dx-preview-files">'+rows+'</div><div class="dx-upload-state dx-auto-progress"><span class="dx-auto-step is-active">01 · Validar</span><span class="dx-auto-step">02 · Proteger</span><span class="dx-auto-step">03 · Compilar</span><span class="dx-auto-step">04 · Preparar subida</span></div>';
      const engine=await mountProductZipPipeline(node,input,file);
      if(input.dataset.dripxZipRun!==runId)return;
      const protect=engine.querySelector('#zip-protect'),compile=engine.querySelector('#zip-compile'),download=engine.querySelector('#zip-download');
      if(!protect||!compile||!download)throw new Error('Faltan controles del motor de protección.');
      if(result.server.length===0)throw new Error('El ZIP no contiene scripts Lua de servidor declarados en meta.xml. No se puede aplicar la licencia DRIPX.');
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
      setProductZipStatus('04/4 · Generando el ZIP protegido final para el producto…','processing');
      node.querySelectorAll('.dx-auto-step')[2]?.classList.add('is-done');
      node.querySelectorAll('.dx-auto-step')[3]?.classList.add('is-active');
      armCompiledZipCapture(input);
      download.click();
      await waitForZipState(()=>!!window.__DRIPX_PROCESSED_PRODUCT_ZIP&&input.files?.[0]?.name===window.__DRIPX_PROCESSED_PRODUCT_ZIP.name,'generación del ZIP protegido');
      if(input.dataset.dripxZipRun!==runId)return;
      const protectedFile=input.files?.[0];
      if(!protectedFile||protectedFile.size===0||!/-DRIPX-protegido\.zip$/i.test(protectedFile.name))throw new Error('El ZIP protegido no se adjuntó al formulario. Selecciona el ZIP y repite la protección.');
      input.dataset.dripxZipReady='true';
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
    const tabs=document.querySelector('.profile-tabs');
    if(!tabs||tabs.querySelector('[data-dripx-owned-products],[data-profile-tab="productos"]'))return;
    const button=document.createElement('button');
    button.type='button';button.className='tab';button.dataset.dripxOwnedProducts='true';button.textContent='Productos';
    const license=tabs.querySelector('[data-profile-tab="licencia"]');
    tabs.insertBefore(button,license||null);
  }
  async function renderOwnedProducts(){
    const host=document.querySelector('.profile-content');
    if(!host||!client)throw new Error('No se encontró el panel de usuario.');
    const {data:{session},error:sessionError}=await client.auth.getSession();
    if(sessionError)throw sessionError;
    if(!session?.user?.id)throw new Error('Inicia sesión con Discord para consultar tus productos.');
    const {data,error}=await client.from('dripx_entitlements')
      .select('id,product_id,granted_at,dripx_products(id,title,description,product_type,file_path,price_usd)')
      .eq('user_id',session.user.id).eq('active',true).order('granted_at',{ascending:false});
    if(error)throw error;
    const optin=host.querySelector('.leaderboard-optin')?.cloneNode(true);
    const cards=(data||[]).map(row=>{
      const p=Array.isArray(row.dripx_products)?row.dripx_products[0]:row.dripx_products;
      if(!p)return '';
      const downloadable=p.product_type==='resource'&&!!p.file_path;
      return '<article class="order-card"><header><div><strong>'+escapeHtml(p.title||'Producto')+'</strong><br><small class="muted">'+(Number(p.price_usd)===0?'Acceso gratuito':'Acceso habilitado')+' · '+(row.granted_at?new Date(row.granted_at).toLocaleDateString('es-DO'):'')+'</small></div><span class="status approved">Activo</span></header><p class="muted">'+escapeHtml(p.description||'')+'</p>'+(downloadable?'<div class="order-actions"><button type="button" class="btn primary" data-download="'+escapeHtml(p.id)+'">Descargar</button></div>':'<small class="muted">Plan o acceso activo en tu cuenta.</small>')+'</article>';
    }).filter(Boolean).join('');
    host.innerHTML=(cards||'<div class="empty">Todavía no tienes productos habilitados. Los productos gratuitos que obtengas y las compras aprobadas aparecerán aquí.</div>');
    if(optin)host.append(optin);
    document.querySelectorAll('.profile-tabs .tab').forEach(x=>x.classList.toggle('active',x.hasAttribute('data-dripx-owned-products')));
    ensureButtonIcons(host);
  }
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-dripx-owned-products]');
    if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    try{await renderOwnedProducts();}catch(error){console.error('[DRIPX] Products panel:',error);toast(error.message||'No se pudieron cargar tus productos.');}
  },true);

  function hideTopCategoryStrip(root=document){
    const scope=root.querySelector?.('#app')||root;
    // Hide only decorative/top-level category strips. Never hide the actual
    // category filter, its dropdown, or the category controls in admin forms.
    const selectors=['.category-tabs','.category-pills','.category-strip','.categories-strip','.categories-bar','.top-categories','[data-categories-strip]'];
    scope.querySelectorAll?.(selectors.join(',')).forEach(el=>{
      if(el.closest('#product-form,.admin-products,.category-manager,[data-admin-category],.admin-category-list'))return;
      if(el.matches('.category-filter,.category-filters,[data-category-filter]'))return;
      el.setAttribute('data-dripx-hidden-category-strip','true');
      el.style.setProperty('display','none','important');
      el.setAttribute('aria-hidden','true');
    });
  }
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

  let adminOverviewPromise=null;
  let adminOverviewAt=0;
  function isAdminRoute(){return /^#admin(?:$|[/?])/i.test(location.hash||'')||String(location.hash||'').toLowerCase().startsWith('#admin');}
  function markAdminView(){
    const app=document.querySelector('#app');if(!app)return;
    const active=isAdminRoute();
    app.classList.toggle('dx-admin-view',active);
    if(!active)document.querySelector('#dx-admin-overview')?.remove();
    else refreshAdminOverview(false);
  }
  async function refreshAdminOverview(force=false){
    const app=document.querySelector('#app');
    if(!app||!isAdminRoute()||!client)return;
    let panel=document.querySelector('#dx-admin-overview');
    if(!panel){
      panel=document.createElement('section');panel.id='dx-admin-overview';panel.className='dx-admin-overview';
      app.prepend(panel);
    }
    if(adminOverviewPromise)return adminOverviewPromise;
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
      panel.innerHTML='<div class="dx-admin-overview-head"><div><span class="dx-admin-kicker">CENTRO DE CONTROL</span><strong>Resumen operativo</strong><small>Indicadores consultados directamente desde Supabase</small></div><div class="dx-admin-overview-tools"><span class="dx-admin-sync">Actualizado '+new Date().toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})+'</span><button type="button" class="dx-admin-refresh" data-dx-admin-refresh>'+iconMarkup('arrow')+' Actualizar</button></div></div><div class="dx-admin-overview-grid">'+metrics.map(metric=>'<article class="dx-admin-metric"><div class="dx-admin-metric-top"><span class="dx-admin-metric-icon">'+iconMarkup(metric.icon)+'</span><span>'+escapeHtml(metric.label)+'</span></div><strong>'+metric.value+'</strong><small>'+escapeHtml(metric.detail)+'</small></article>').join('')+'</div>';
      panel.dataset.loaded='true';adminOverviewAt=Date.now();
    })();
    try{await adminOverviewPromise;}catch(error){
      panel=document.querySelector('#dx-admin-overview');
      if(panel)panel.innerHTML='<div class="dx-admin-overview-head"><div><span class="dx-admin-kicker">CENTRO DE CONTROL</span><strong>Resumen operativo</strong><small>No se pudo sincronizar el panel</small></div><button type="button" class="dx-admin-refresh" data-dx-admin-refresh>Reintentar</button></div><p class="dx-admin-error">'+escapeHtml(error.message||'Error al consultar los datos administrativos.')+'</p>';
      console.warn('[DRIPX] Admin overview:',error);
    }finally{adminOverviewPromise=null;}
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-dx-admin-refresh]');
    if(!button)return;
    event.preventDefault();event.stopPropagation();refreshAdminOverview(true);
  },true);
  window.addEventListener('hashchange',()=>{markAdminView();syncCategoryOptions(true);});

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
    replaceIcons();ensureButtonIcons();applyBrandLogo();hideTopCategoryStrip();applyPlanCardSkin();markAdminView();syncCategoryOptions(false);clearLegacyZipStaging();
    if(document.querySelector('.profile-tabs'))ensureOwnedProductsTab();
  });
  function boot(){
    replaceIcons();ensureButtonIcons();applyBrandLogo();installImageFallback();hideTopCategoryStrip();applyPlanCardSkin();installProductZipProtectionGuard();clearLegacyZipStaging();
    if(document.querySelector('.profile-tabs'))ensureOwnedProductsTab();
    syncCategoryOptions(true);markAdminView();
    cssObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
