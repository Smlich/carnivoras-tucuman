import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const isStaticPreview = import.meta.env.VITE_STATIC_PREVIEW === 'true';

const fallbackValue = {
  isStaticPreview,
  isLoading: false,
  isAdminLoading: false,
  enabled: false,
  providers: [],
  authFlow: 'better-auth',
  user: null,
  session: null,
  admin: null,
  isAdmin: false,
  adminConfigured: false,
  adminGoogleAllowed: false,
  adminStorageMode: 'static',
  refreshSession: async () => null,
  refreshAdminSession: async () => null,
  signInWithProvider: async () => {},
  signOut: async () => {},
};

const AuthContext = createContext(fallbackValue);

function normalizeReturnPath(targetPath) {
  if (typeof targetPath === 'string' && targetPath.startsWith('/') && !targetPath.startsWith('//')) {
    return targetPath;
  }
  const current = `${window.location.pathname || '/'}${window.location.search || ''}`;
  return current.startsWith('/') && !current.startsWith('//') ? current : '/';
}

async function fetchSession(signal) {
  const response = await fetch('/api/auth/get-session', {
    cache: 'no-store',
    credentials: 'include',
    signal,
  });
  if (!response.ok) return null;

  const payload = await response.json().catch(() => null);
  return payload?.user ? payload : null;
}

async function fetchAdminSession(signal, includeAdminMeta = false) {
  const url = includeAdminMeta ? '/api/admin/auth/session?meta=1' : '/api/admin/auth/session';
  const response = await fetch(url, {
    cache: 'no-store',
    credentials: 'include',
    signal,
  });
  if (!response.ok) return null;

  const payload = await response.json().catch(() => null);
  return payload?.data ?? null;
}

export function AuthProvider({ children, includeAdminMeta = false }) {
  const [status, setStatus] = useState({
    isLoading: !isStaticPreview,
    enabled: false,
    providers: [],
    authFlow: 'better-auth',
  });
  const [session, setSession] = useState(null);
  const [adminState, setAdminState] = useState({
    isAdminLoading: !isStaticPreview,
    admin: null,
    adminConfigured: false,
    adminGoogleAllowed: false,
    adminStorageMode: isStaticPreview ? 'static' : 'unknown',
  });
  const enabledRef = useRef(false);
  const authFlowRef = useRef('better-auth');

  const applyAdminSession = useCallback((adminData) => {
    setAdminState({
      isAdminLoading: false,
      admin: adminData?.authenticated ? adminData.user : null,
      adminConfigured: Boolean(adminData?.configured),
      adminGoogleAllowed: Boolean(adminData?.googleAllowed),
      adminStorageMode: adminData?.storageMode || 'unknown',
    });
  }, []);

  useEffect(() => {
    if (isStaticPreview) return undefined;

    const controller = new AbortController();
    let isActive = true;
    let retryTimer;

    async function loadAdmin() {
      try {
        const adminData = await fetchAdminSession(controller.signal, includeAdminMeta);
        if (isActive) applyAdminSession(adminData);
      } catch (error) {
        if (isActive && error.name !== 'AbortError') {
          applyAdminSession(null);
        }
      }
    }

    async function loadAuth() {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          const response = await fetch('/api/auth/status', { cache: 'no-store', signal: controller.signal });
          if (!response.ok) throw new Error('No se pudo consultar el inicio de sesión.');
          const result = await response.json();
          if (!isActive) return;

          const enabled = Boolean(result.enabled);
          const providers = enabled && Array.isArray(result.providers) ? result.providers : [];
          const authFlow = result.authFlow === 'redirect' ? 'redirect' : 'better-auth';
          enabledRef.current = enabled;
          authFlowRef.current = authFlow;

          let currentSession = null;
          if (enabled) {
            if ('session' in result) {
              currentSession = result.session?.user ? result.session : null;
            } else {
              try {
                currentSession = await fetchSession(controller.signal);
              } catch (error) {
                if (error.name === 'AbortError') return;
              }
            }
          }

          if (!isActive) return;
          setSession(currentSession);
          setStatus({ isLoading: false, enabled, providers, authFlow });
          return;
        } catch (error) {
          if (!isActive || error.name === 'AbortError') return;
          if (attempt === 3) {
            setStatus({ isLoading: false, enabled: false, providers: [], authFlow: 'better-auth' });
            return;
          }
          await new Promise((resolve) => {
            retryTimer = window.setTimeout(resolve, 400 * (attempt + 1));
          });
        }
      }
    }

    loadAuth();
    loadAdmin();

    return () => {
      isActive = false;
      controller.abort();
      window.clearTimeout(retryTimer);
    };
  }, [applyAdminSession, includeAdminMeta]);

  const refreshAdminSession = useCallback(async () => {
    if (isStaticPreview) return null;
    try {
      const adminData = await fetchAdminSession(undefined, includeAdminMeta);
      applyAdminSession(adminData);
      return adminData;
    } catch {
      applyAdminSession(null);
      return null;
    }
  }, [applyAdminSession, includeAdminMeta]);

  const refreshSession = useCallback(async () => {
    let currentSession = null;
    if (enabledRef.current) {
      try {
        currentSession = await fetchSession();
        setSession(currentSession);
      } catch {
        setSession(null);
      }
    }
    await refreshAdminSession();
    return currentSession;
  }, [refreshAdminSession]);

  const signInWithProvider = useCallback(async (provider = 'google', returnTo) => {
    const safeReturnTo = normalizeReturnPath(returnTo);

    if (authFlowRef.current === 'redirect') {
      if (provider !== 'google') {
        throw new Error('Proveedor no disponible.');
      }
      window.location.assign('/api/auth/google/start?returnTo=' + encodeURIComponent(safeReturnTo));
      return;
    }

    const { authClient } = await import('../services/auth-client');
    const result = await authClient.signIn.social({
      provider,
      callbackURL: window.location.origin + safeReturnTo,
    });
    if (result?.error) {
      throw new Error('Inicio de sesión rechazado.');
    }
  }, []);

  const signOut = useCallback(async () => {
    if (authFlowRef.current === 'redirect') {
      const response = await fetch('/api/auth/sign-out', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!response.ok) {
        throw new Error('No pudimos cerrar la sesión.');
      }
      setSession(null);
      await refreshAdminSession();
      return;
    }

    const { authClient } = await import('../services/auth-client');
    const result = await authClient.signOut();
    if (result?.error) {
      throw new Error('Cierre de sesión rechazado.');
    }
    await refreshSession();
  }, [refreshAdminSession, refreshSession]);

  const value = useMemo(() => ({
    isStaticPreview,
    isLoading: status.isLoading,
    isAdminLoading: adminState.isAdminLoading,
    enabled: status.enabled,
    providers: status.providers,
    authFlow: status.authFlow,
    user: session?.user ?? null,
    session,
    admin: adminState.admin,
    isAdmin: Boolean(adminState.admin),
    adminConfigured: adminState.adminConfigured,
    adminGoogleAllowed: adminState.adminGoogleAllowed,
    adminStorageMode: adminState.adminStorageMode,
    refreshSession,
    refreshAdminSession,
    signInWithProvider,
    signOut,
  }), [adminState, refreshAdminSession, refreshSession, session, signInWithProvider, signOut, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
