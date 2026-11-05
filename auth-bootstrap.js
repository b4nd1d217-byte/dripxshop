(() => {
  'use strict';
  const LOCK = 'dripx:discord-oauth:pending';
  const cleanCallback = () => history.replaceState(null, '', location.pathname + (location.hash || '#inicio'));
  const clearLock = () => { try { localStorage.removeItem(LOCK); } catch (_) {} };
  const originalCreate = window.supabase?.createClient;
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