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
  const sendLog = async (token, event, details = {}) => {
    if (!token || !SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      await nativeFetch(SUPABASE_URL + '/functions/v1/dripx-discord-logs', {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, authorization: 'Bearer ' + token, 'content-type': 'application/json' },
        body: JSON.stringify({ event, details }),
        signal: AbortSignal.timeout(7000)
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
        const ticketId = String(url.searchParams.get('id') || '').replace(/^eq\\./, '');
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
      if (path === 'rpc/dripx_claim_free_product') {
        const productId = uuidOrEmpty(first.p_product_id);
        try { const result = await response.clone().json(); if (productId && result?.ok && !result?.already_owned) fire('free_product_claimed', { product_id: productId }); } catch (_) {}
      } else if (path === 'rpc/dripx_create_order') {
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