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
    document:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>'
  };
  const TOKEN_ICON = {
    '🛒':'cart','🛍':'cart','📦':'package','🏆':'trophy','🥇':'medal','🥈':'medal','🥉':'medal','🔑':'key','💾':'save','🛡':'shield','🧩':'code','🌐':'globe','🔌':'plug','🔐':'lock','⚙':'settings','👥':'users','▤':'document','▣':'package','◉':'user','↩':'back','↗':'arrow','→':'arrow','⌕':'search','☷':'filter','＄':'wallet','↕':'sort','◷':'clock','✕':'close','✓':'check','＋':'plus','−':'minus','⏸':'pause','▶':'play','⬇':'download','⌂':'home','▦':'grid','ⓘ':'info','⌄':'chevron','✦':'sparkles','✧':'sparkles','★':'star','☆':'star','📄':'file','📁':'folder','🔍':'search','💬':'chat','🎫':'ticket','💳':'wallet','🧾':'document','👤':'user','🔒':'lock','📝':'edit','🛠':'settings','🗑':'trash','◇':'sparkles'
  };
  const ICON_TOKENS = Object.keys(TOKEN_ICON).sort((a,b)=>b.length-a.length).join('|');
  const ICON_RE = new RegExp('(?:'+ICON_TOKENS+')|\\p{Extended_Pictographic}','gu');
  function iconMarkup(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">'+(ICON_PATHS[name]||ICON_PATHS.sparkles)+'</svg>';
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
      else if(/discord|login|iniciar sesi[oó]n|acceder/.test(label))name='user';
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

  function formatBytes(value){const n=Number(value)||0;return n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(2)+' MB';}
  function toast(message){const node=document.querySelector('#toast');if(node){node.textContent=message;node.classList.add('show');setTimeout(()=>node.classList.remove('show'),3600);}}
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function ensureStagePanel(){
    const analysis=document.querySelector('#zip-analysis');
    if(!analysis||document.querySelector('#dripx-staging-panel'))return;
    const panel=document.createElement('section');panel.id='dripx-staging-panel';panel.className='dx-staging-panel';
    panel.innerHTML='<div class="dx-staging-head"><div><strong>ZIPs guardados de forma privada</strong><small>Los archivos permanecen en Supabase y puedes recuperarlos después de recargar.</small></div><span class="dx-storage-pill">100 MB máx.</span></div><div id="dripx-staging-progress" class="dx-upload-progress" hidden><div class="dx-progress-track"><span id="dripx-staging-bar"></span></div><div id="dripx-staging-status">Preparando ZIP…</div></div><div id="dripx-staging-inventory" class="dx-staging-inventory"></div><div id="dripx-recent-zips" class="dx-recent-zips">Consultando ZIPs guardados…</div>';
    analysis.insertAdjacentElement('afterend',panel);
    loadRecentZips().catch(e=>{const out=document.querySelector('#dripx-recent-zips');if(out)out.textContent='No se pudo consultar el historial: '+(e.message||'Error');});
  }
  function setProgress(panelId,pct,message){
    const panel=document.getElementById(panelId);if(!panel)return;panel.hidden=false;
    const bar=panel.querySelector('.dx-progress-track span');if(bar)bar.style.width=Math.max(0,Math.min(100,pct))+'%';
    const status=panel.querySelector('[id$="status"]');if(status)status.textContent=message||('Subiendo '+Math.round(pct)+'%');
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
  window.DRIPX_UPLOAD_FILE=(bucket,path,file,onProgress)=>tusUpload(bucket,path,file,onProgress);

  async function scanZip(file){
    if(!window.JSZip)throw new Error('No se pudo cargar JSZip. Recarga la página.');
    if(!file||!file.size)throw new Error('Selecciona un archivo ZIP.');
    if(file.size>100*1024*1024)throw new Error('El ZIP supera el límite de 100 MB.');
    const zip=await JSZip.loadAsync(file,{checkCRC32:true});
    const entries=Object.values(zip.files).filter(x=>!x.dir&&!x.name.startsWith('__MACOSX/')&&!x.name.endsWith('/.DS_Store'));
    if(!entries.length)throw new Error('El ZIP está vacío.');
    if(entries.length>3000)throw new Error('El ZIP supera el límite de 3.000 archivos.');
    if(entries.some(x=>x.name.startsWith('/')||x.name.includes('\\')||x.name.split('/').some(part=>!part||part==='.'||part==='..')))throw new Error('El ZIP contiene rutas inseguras.');
    const expanded=entries.reduce((sum,x)=>sum+Number(x._data?.uncompressedSize||0),0);
    if(expanded>200*1024*1024)throw new Error('El ZIP descomprimido supera el límite de 200 MB.');
    let meta=entries.find(x=>x.name.toLowerCase()==='meta.xml');let rootPrefix='';
    if(!meta){
      const nested=entries.filter(x=>x.name.toLowerCase().endsWith('/meta.xml'));
      if(nested.length===1){rootPrefix=nested[0].name.slice(0,nested[0].name.lastIndexOf('/')+1);if(!entries.every(x=>x.name.startsWith(rootPrefix)))rootPrefix='';else meta=nested[0];}
    }
    const scriptMap=new Map();
    if(meta){
      const xml=new DOMParser().parseFromString(await meta.async('string'),'application/xml');
      if(!xml.querySelector('parsererror'))for(const node of xml.querySelectorAll('script')){
        const src=String(node.getAttribute('src')||'').split(String.fromCharCode(92)).join('/').replace(/^\.\//,'');
        if(src)scriptMap.set(src,(node.getAttribute('type')||'server').toLowerCase());
      }
    }
    const files=entries.map(entry=>{
      const path=entry.name,lower=path.toLowerCase(),ext=lower.split('.').pop(),script=scriptMap.get(rootPrefix?path.slice(rootPrefix.length):path);
      const isLua=lower.endsWith('.lua'),isConfig=/(^|\/)(config|settings|shared|language|locale)[^/]*\.(lua|xml|json|ini|cfg|conf|ya?ml)$/i.test(path)||['xml','json','ini','cfg','conf','yaml','yml'].includes(ext);
      const isServer=isLua&&script!=='client'&&script!=='shared'&&script!==undefined&&!isConfig;
      const isShader=['fx','hlsl','glsl'].includes(ext);
      return {path,bytes:Number(entry._data?.uncompressedSize||0),kind:isServer?'server_lua':(isConfig?'config':(isLua?'lua_other':(isShader?'shader':'file'))),script_type:script||null};
    });
    const server=files.filter(x=>x.kind==='server_lua').map(x=>rootPrefix?x.path.slice(rootPrefix.length):x.path);
    return {zip,entries,files,expanded,metaPath:meta?.name||null,rootPrefix,server,luaCount:files.filter(x=>x.path.toLowerCase().endsWith('.lua')).length};
  }
  async function loadRecentZips(){
    const host=document.querySelector('#dripx-recent-zips');if(!host||!client)return;
    try{
      const session=await getAdminSession();
      const {data,error}=await client.from('dripx_resource_staging').select('id,source_path,source_filename,source_bytes,expanded_bytes,file_count,lua_count,server_lua_count,status,created_at').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(10);
      if(error)throw error;
      host.innerHTML='<div class="dx-recent-title">Últimos ZIPs procesados</div>'+(data?.length?data.map(row=>'<div class="dx-recent-row"><div class="dx-recent-main"><strong>'+escapeHtml(row.source_filename)+'</strong><small>'+formatBytes(row.source_bytes)+' · '+Number(row.file_count)+' archivos · '+Number(row.lua_count)+' Lua · '+Number(row.server_lua_count)+' de servidor · '+new Date(row.created_at).toLocaleString('es-DO')+'</small></div><span class="dx-status">'+escapeHtml(row.status)+'</span><div class="dx-recent-actions"><button type="button" class="btn subtle" data-restore-stage="'+row.id+'">Abrir ZIP</button><button type="button" class="btn subtle" data-delete-stage="'+row.id+'" aria-label="Eliminar ZIP">Eliminar</button></div></div>').join(''):'<div class="dx-empty">Todavía no hay ZIPs guardados.</div>');
    }catch(error){host.textContent='No se pudo cargar el historial de ZIPs: '+(error.message||'Error');}
  }
  async function persistStagingZip(file){
    const panel=document.querySelector('#dripx-staging-panel');if(!panel)return;
    const progress=panel.querySelector('#dripx-staging-progress'),inventory=panel.querySelector('#dripx-staging-inventory');
    try{
      const session=await getAdminSession();const scan=await scanZip(file);
      inventory.innerHTML='<div class="dx-inventory-stats"><span>'+scan.files.length+' archivos</span><span>'+scan.luaCount+' Lua</span><span>'+scan.server.length+' Lua de servidor</span><span>'+formatBytes(scan.expanded)+' descomprimidos</span></div><div class="dx-inventory-note">Inventario completo leído y preparado para restauración.</div>';
      setProgress('dripx-staging-progress',1,'Subiendo archivo ZIP a almacenamiento privado…');
      const path=session.user.id+'/'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID()+'.zip';
      await tusUpload('dripx-resource-staging',path,file,pct=>setProgress('dripx-staging-progress',pct,'Guardando ZIP… '+Math.round(pct)+'%'));
      const payload={user_id:session.user.id,source_path:path,source_filename:file.name,source_bytes:file.size,expanded_bytes:scan.expanded,file_count:scan.files.length,lua_count:scan.luaCount,server_lua_count:scan.server.length,meta_path:scan.metaPath,root_prefix:scan.rootPrefix,files:scan.files,selected_lua:scan.server,status:'uploaded',updated_at:new Date().toISOString()};
      const {data,error}=await client.from('dripx_resource_staging').insert(payload).select('id').single();
      if(error){await client.storage.from('dripx-resource-staging').remove([path]);throw error;}
      progress.hidden=false;setProgress('dripx-staging-progress',100,'ZIP guardado correctamente. Referencia: '+data.id);
      toast('ZIP guardado de forma privada y su inventario quedó registrado.');await loadRecentZips();
    }catch(error){
      if(progress){progress.hidden=false;setProgress('dripx-staging-progress',0,'No se pudo guardar el ZIP: '+(error.message||'Error'));}
      toast(error.message||'No se pudo guardar el ZIP.');console.error('[DRIPX] Staging ZIP:',error);
    }
  }
  async function previewProductZip(file){
    let node=document.querySelector('#product-zip-preview');const input=document.querySelector('#product-form input[name="file"]');if(!input)return;
    if(!node){node=document.createElement('div');node.id='product-zip-preview';node.className='dx-product-zip-preview';input.closest('label')?.insertAdjacentElement('afterend',node);const status=document.createElement('div');status.id='product-zip-upload-state';status.className='dx-upload-state';status.textContent='ZIP listo para validación y subida privada.';node.insertAdjacentElement('afterend',status);}
    const uploadStatus=document.querySelector('#product-zip-upload-state');if(uploadStatus)uploadStatus.textContent='ZIP leído. Se mostrará el progreso al guardar el producto.';
    node.textContent='Leyendo todos los archivos del ZIP…';
    try{
      const result=await scanZip(file),protectedZip=!!result.zip.file('DRIPX_MANIFEST.json');
      node.innerHTML='<div class="dx-preview-summary"><strong>'+escapeHtml(file.name)+'</strong><span>'+formatBytes(file.size)+' · '+result.files.length+' archivos · '+result.luaCount+' Lua</span><b class="'+(protectedZip?'ok':'warn')+'">'+(protectedZip?'Manifiesto DRIPX detectado':'Falta el manifiesto DRIPX de protección')+'</b></div><div class="dx-preview-files">'+result.files.slice(0,250).map(x=>'<div><span>'+escapeHtml(x.path)+'</span><small>'+escapeHtml(x.kind.replace('_',' '))+' · '+formatBytes(x.bytes)+'</small></div>').join('')+'</div>'+(result.files.length>250?'<small>Se muestran 250 de '+result.files.length+' archivos; todos quedaron leídos.</small>':'');
    }catch(error){node.textContent='No se pudo leer el ZIP: '+(error.message||'archivo inválido');}
  }
  document.addEventListener('change',event=>{
    if(event.target?.id==='resource-zip'&&event.target.files?.[0]){ensureStagePanel();persistStagingZip(event.target.files[0]);}
    if(event.target?.matches('#product-form input[name="file"]')&&event.target.files?.[0])previewProductZip(event.target.files[0]);
  });
  document.addEventListener('click',async event=>{
    const restore=event.target.closest('[data-restore-stage]'),remove=event.target.closest('[data-delete-stage]');
    if(restore){
      event.preventDefault();event.stopImmediatePropagation();
      try{
        const session=await getAdminSession();
        const {data:row,error}=await client.from('dripx_resource_staging').select('source_path,source_filename').eq('id',restore.dataset.restoreStage).eq('user_id',session.user.id).single();if(error)throw error;
        const {data:blob,error:downloadError}=await client.storage.from('dripx-resource-staging').download(row.source_path);if(downloadError)throw downloadError;
        const file=new File([blob],row.source_filename,{type:'application/zip'});
        if(typeof window.DRIPX_LOAD_ZIP!=='function')throw new Error('El lector ZIP aún no está listo. Cambia a la pestaña Protección y reintenta.');
        await window.DRIPX_LOAD_ZIP(file);toast('ZIP restaurado desde el almacenamiento privado.');
        document.querySelector('#zip-analysis')?.scrollIntoView({behavior:'smooth',block:'center'});
      }catch(error){toast(error.message||'No se pudo restaurar el ZIP.');}
      return;
    }
    if(remove){
      event.preventDefault();event.stopImmediatePropagation();
      if(!confirm('¿Eliminar este ZIP temporal del almacenamiento privado?'))return;
      try{
        const session=await getAdminSession();
        const {data:row,error}=await client.from('dripx_resource_staging').select('id,source_path').eq('id',remove.dataset.deleteStage).eq('user_id',session.user.id).single();if(error)throw error;
        const {error:storageError}=await client.storage.from('dripx-resource-staging').remove([row.source_path]);if(storageError)throw storageError;
        const {error:deleteError}=await client.from('dripx_resource_staging').delete().eq('id',row.id);if(deleteError)throw deleteError;
        await loadRecentZips();toast('ZIP temporal eliminado.');
      }catch(error){toast(error.message||'No se pudo eliminar el ZIP.');}
      return;
    }
  },true);

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

  const cssObserver=new MutationObserver(()=>{
    replaceIcons();ensureButtonIcons();applyBrandLogo();
    if(document.querySelector('#resource-zip'))ensureStagePanel();
    if(document.querySelector('.profile-tabs'))ensureOwnedProductsTab();
  });
  function boot(){
    replaceIcons();ensureButtonIcons();applyBrandLogo();
    if(document.querySelector('.profile-tabs'))ensureOwnedProductsTab();
    cssObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
