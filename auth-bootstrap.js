(() => {
  'use strict';
  const LOCK = 'dripx:discord-oauth:pending';
  const cleanCallback = () => history.replaceState(null, '', location.pathname + (location.hash || '#inicio'));
  const clearLock = () => { try { localStorage.removeItem(LOCK); } catch (_) {} };
  const originalCreate = window.supabase?.createClient;
  const CONFIG = window.DRIPX_CONFIG || {};
  const SUPABASE_URL = String(CONFIG.supabaseUrl || '');
  const SUPABASE_KEY = String(CONFIG.supabaseKey || CONFIG.publishableKey || '');
  const nativeFetch = window.fetch.bind(window);
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const parseBody = value => {
    if (typeof value !== 'string') return {};
    try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' ? parsed : {}; } catch (_) { return {}; }
  };

  async function couponBannerBase64(coupon) {
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('canvas_unavailable');
    const bg=ctx.createLinearGradient(0,0,1200,630);bg.addColorStop(0,'#050b13');bg.addColorStop(.55,'#0b1725');bg.addColorStop(1,'#07111d');ctx.fillStyle=bg;ctx.fillRect(0,0,1200,630);
    const glow=ctx.createRadialGradient(920,130,20,920,130,540);glow.addColorStop(0,'rgba(0,199,255,.22)');glow.addColorStop(1,'rgba(0,199,255,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,1200,630);
    ctx.save();ctx.strokeStyle='rgba(0,199,255,.16)';ctx.lineWidth=1;
    for(let x=30;x<1200;x+=42){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,630);ctx.stroke();}
    for(let y=30;y<630;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1200,y);ctx.stroke();}
    ctx.restore();ctx.save();ctx.lineWidth=3;ctx.strokeStyle='rgba(0,199,255,.65)';ctx.setLineDash([14,9]);ctx.roundRect(38,38,1124,554,30);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(0,199,255,.08)';ctx.beginPath();ctx.roundRect(62,62,1076,506,24);ctx.fill();ctx.restore();
    const logo=new Image();logo.crossOrigin='anonymous';const loaded=new Promise(resolve=>{logo.onload=()=>resolve(true);logo.onerror=()=>resolve(false);});logo.src=location.origin+'/assets/dripx-logo.webp';if(!logo.complete)await loaded;
    if(logo.naturalWidth){const ratio=Math.min(116/logo.naturalWidth,78/logo.naturalHeight);ctx.drawImage(logo,86,82,logo.naturalWidth*ratio,logo.naturalHeight*ratio);}
    ctx.fillStyle='#eaf8ff';ctx.textAlign='left';ctx.font='800 36px Arial,sans-serif';ctx.fillText('DRIP X SHOP',218,132);
    ctx.fillStyle='#00c7ff';ctx.font='700 18px Arial,sans-serif';ctx.letterSpacing='5px';ctx.fillText('CUPÓN EXCLUSIVO',220,164);ctx.letterSpacing='0px';
    ctx.textAlign='center';ctx.fillStyle='rgba(224,245,255,.88)';ctx.font='700 24px Arial,sans-serif';ctx.fillText('BENEFICIO ESPECIAL',600,255);
    const type=String(coupon?.discount_type||'').toLowerCase(),value=Number(coupon?.discount_value||0),percent=['percent','percentage','percent_off'].includes(type);
    const amount=(percent?value.toLocaleString('es-DO',{maximumFractionDigits:2})+'%':'$'+value.toLocaleString('en-US',{maximumFractionDigits:2}))+' OFF';
    ctx.save();ctx.shadowColor='rgba(0,199,255,.65)';ctx.shadowBlur=38;ctx.fillStyle='#f4fbff';ctx.font='900 142px Impact,Arial Black,sans-serif';ctx.textAlign='center';ctx.fillText(amount,600,425,990);ctx.restore();
    const hasExpiry=!!coupon?.expires_at,date=new Date(coupon?.expires_at||coupon?.created_at||new Date().toISOString());
    const label=Number.isNaN(date.getTime())?'FECHA NO DISPONIBLE':(hasExpiry?'VÁLIDO HASTA · ':'FECHA DEL CUPÓN · ')+date.toLocaleDateString('es-DO',{day:'2-digit',month:'long',year:'numeric',timeZone:'America/Santo_Domingo'}).toUpperCase();
    ctx.fillStyle='#9ddcf0';ctx.font='700 26px Arial,sans-serif';ctx.textAlign='center';ctx.fillText(label,600,510,980);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error('coupon_image_failed')),'image/png'));
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
    return String(data).split(',')[1]||'';
  }
  const sendLog = async (token, event, details = {}) => {
    if (!token || !SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      await nativeFetch(SUPABASE_URL + '/functions/v1/dripx-discord-logs', {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, authorization: 'Bearer ' + token, 'content-type': 'application/json' },
        body: JSON.stringify({ event, details }),
        signal: AbortSignal.timeout(event === 'coupon_created' ? 16000 : 7000)
      });
    } catch (error) { console.warn('[DRIPX] Discord log delivery failed:', error?.message || error); }
  };
  if (!window.__dripxLogFetchInstalled && SUPABASE_URL) {
    window.__dripxLogFetchInstalled = true;
    window.fetch = async (input, init = {}) => {
      let requestUrl = '', method = String(init.method || '').toUpperCase(), token = '';
      try {
        requestUrl = typeof input === 'string' ? input : input.url;
        if (!method) method = String(input.method || 'GET').toUpperCase();
        const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
        token = String(headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      } catch (_) {}
      let url;
      try { url = new URL(requestUrl, location.href); } catch (_) {}
      if (url?.origin === SUPABASE_URL && url.pathname === '/auth/v1/logout' && token) {
        await sendLog(token, 'logout');
      }
      if (url?.origin === SUPABASE_URL && url.pathname.startsWith('/rest/v1/tickets') && method === 'DELETE' && token) {
        const rawTicketId = String(url.searchParams.get('id') || '');
        const ticketId = rawTicketId.startsWith('eq.') ? rawTicketId.slice(3) : rawTicketId;
        if (UUID_RE.test(ticketId)) await sendLog(token, 'ticket_deleted', { ticket_id: ticketId });
      }
      const response = await nativeFetch(input, init);
      if (!response.ok || url?.origin !== SUPABASE_URL) return response;
      if (url.pathname === '/auth/v1/token') {
        if (url.searchParams.get('grant_type') === 'pkce') {
          try { const data = await response.clone().json(); if (data?.access_token) void sendLog(data.access_token, 'login'); } catch (_) {}
        }
        return response;
      }
      if (!token || !url.pathname.startsWith('/rest/v1/') && !url.pathname.startsWith('/functions/v1/')) return response;
      const path = url.pathname.startsWith('/rest/v1/') ? url.pathname.slice('/rest/v1/'.length) : url.pathname.slice(1);
      const body = parseBody(init.body);
      const first = Array.isArray(body) ? (body[0] || {}) : body;
      const idFromQuery = String(url.searchParams.get('id') || '').replace(/^eq\./, '');
      const uuidOrEmpty = value => UUID_RE.test(String(value || '')) ? String(value) : '';
      const fire = (event, details) => { if (event) void sendLog(token, event, details); };
      if (path === 'rpc/dripx_create_order') {
        try {
          const orderId = uuidOrEmpty(await response.clone().json());
          if (orderId) fire('order_created', { order_id: orderId });
        } catch (_) {}
      } else if (path === 'rpc/dripx_admin_approve_order') {
        const orderId = uuidOrEmpty(first.p_order_id);
        if (orderId) fire('payment_approved', { order_id: orderId });
      } else if (path === 'rpc/dripx_admin_reject_order') {
        const orderId = uuidOrEmpty(first.p_order_id);
        if (orderId) fire('payment_rejected', { order_id: orderId });
      } else if (path === 'tickets' && method === 'POST') {
        try { const row = await response.clone().json(); const ticket = Array.isArray(row) ? row[0] : row; const ticketId = uuidOrEmpty(ticket?.id); if (ticketId) fire('ticket_created', { ticket_id: ticketId }); } catch (_) {}
      } else if (path === 'ticket_messages' && method === 'POST') {
        const ticketId = uuidOrEmpty(first.ticket_id);
        if (ticketId) fire('ticket_message', { ticket_id: ticketId });
      } else if (path === 'payment_proofs' && method === 'POST') {
        const orderId = uuidOrEmpty(first.order_id);
        if (orderId) fire('payment_proof', { order_id: orderId });
      } else if (path === 'dripx_orders' && method === 'PATCH' && first.payment_proof_path) {
        const orderId = uuidOrEmpty(idFromQuery);
        if (orderId) fire('payment_proof', { order_id: orderId });
      } else if ((path === 'discount_coupons' || path === 'coupon_codes') && method === 'POST') {
        try {
          const inserted = await response.clone().json();
          const coupon = Array.isArray(inserted) ? inserted[0] : inserted;
          const couponId = uuidOrEmpty(coupon?.id);
          if (couponId) {
            const image_png_base64 = await couponBannerBase64(coupon);
            fire('coupon_created', { coupon_id: couponId, coupon_table: path, image_png_base64 });
          }
        } catch (error) { console.warn('[DRIPX] No se pudo generar la imagen del cupón:', error?.message || error); }
      } else if (path === 'dripx_products' && method === 'PATCH' && first.status === 'published') {
        const productId = uuidOrEmpty(idFromQuery);
        if (productId) fire('resource_created', { product_id: productId });
      } else if (path === 'functions/v1/dripx-lua-compiler' && method === 'POST') {
        fire('resource_compiled', {});
      }
      return response;
    };
  }
  // Both the app and the visual enhancements create a Supabase client. Share one
  // OAuth code-exchange promise so the PKCE verifier is consumed only once.
  let callbackExchange = null;
  let callbackCode = null;
  if (typeof originalCreate !== 'function') return;
  window.supabase.createClient = (url, key, options = {}) => {
    const client = originalCreate.call(window.supabase, url, key, {
      ...options,
      auth: {
        ...(options.auth || {}),
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: window.localStorage
      }
    });
    const auth = client.auth;
    const originalGetSession = auth.getSession.bind(auth);
    const originalSignIn = auth.signInWithOAuth.bind(auth);
    auth.getSession = async (...args) => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const oauthError = params.get('error_description') || params.get('error');
      if (oauthError) {
        clearLock();
        cleanCallback();
        console.warn('Discord OAuth callback:', oauthError);
      } else if (code) {
        if (!callbackExchange || callbackCode !== code) {
          callbackCode = code;
          callbackExchange = auth.exchangeCodeForSession(code).then(({ data, error }) => {
            if (error) throw error;
            if (!data?.session?.user) throw new Error('Supabase no devolvió una sesión válida.');
            clearLock();
            cleanCallback();
            return data;
          }).catch(error => {
            clearLock();
            cleanCallback();
            console.error('No se pudo intercambiar el código OAuth:', error);
            return null;
          });
        }
        await callbackExchange;
      }
      return originalGetSession(...args);
    };
    auth.signInWithOAuth = async (...args) => {
      let current = null;
      try { current = JSON.parse(localStorage.getItem(LOCK) || 'null'); } catch (_) {}
      if (current?.expiresAt > Date.now()) {
        return { data: { provider: 'discord', url: null }, error: new Error('Ya existe un inicio de sesión de Discord en curso.') };
      }
      try { localStorage.setItem(LOCK, JSON.stringify({ startedAt: Date.now(), expiresAt: Date.now() + 300000 })); } catch (_) {}
      try {
        const result = await originalSignIn(...args);
        if (result.error) clearLock();
        return result;
      } catch (error) {
        clearLock();
        throw error;
      }
    };
    return client;
  };
})();