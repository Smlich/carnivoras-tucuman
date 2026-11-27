import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ADMIN_MODE_STORAGE_KEY,
  readAdminModePreference,
  resolveEffectiveAdminMode,
  writeAdminModePreference,
} from '../utils/admin-mode.js';

const isStaticPreview = import.meta.env.VITE_STATIC_PREVIEW === 'true';
const isServer = typeof window === 'undefined';

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
  hasAdminAccess: false,
  adminModeEnabled: true,
  isAdmin: false,
  adminConfigured: false,
  adminGoogleAllowed: false,
  adminStorageMode: 'static',
  refreshSession: async () => null,
  refreshAdminSession: async () => null,
  setAdminModeEnabled: () => {},
  toggleAdminMode: () => {},
  signInWithProvider: async () => {},
  signInWithEmail: async () => null,
  registerWithEmail: async () => null,
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
  const [status, setStatus] = useState(() => (
    isServer
      ? { isLoading: false, enabled: true, providers: ['google'], authFlow: 'redirect' }
      : { isLoading: !isStaticPreview, enabled: false, providers: [], authFlow: 'better-auth' }
  ));
  const [session, setSession] = useState(null);
  const [adminState, setAdminState] = useState({
    isAdminLoading: !isStaticPreview && !isServer,
    admin: null,
    adminConfigured: false,
    adminGoogleAllowed: false,
    adminStorageMode: isStaticPreview ? 'static' : 'unknown',
  });
  const [adminModeEnabled, setAdminModeEnabledState] = useState(() => (
    isServer ? true : readAdminModePreference(window.localStorage)
  ));
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
      if (provider !== 'google' && provider !== 'facebook') {
        throw new Error('Proveedor no disponible.');
      }
      window.location.assign(`/api/auth/${provider}/start?returnTo=${encodeURIComponent(safeReturnTo)}`);
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

  const submitEmailAuth = useCallback(async (endpoint, payload) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error?.message || 'No pudimos completar la operación.';
      throw new Error(message);
    }
    const nextSession = data?.user
      ? { user: data.user, session: data.session ?? null }
      : await fetchSession();
    setSession(nextSession);
    await refreshAdminSession();
    return nextSession;
  }, [refreshAdminSession]);

  const signInWithEmail = useCallback(
    async ({ email, password }) => submitEmailAuth('/api/auth/login', { email, password }),
    [submitEmailAuth],
  );

  const registerWithEmail = useCallback(
    async ({ name, email, password }) => submitEmailAuth('/api/auth/register', { name, email, password }),
    [submitEmailAuth],
  );

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

  useEffect(() => {
    if (isServer || isStaticPreview) return undefined;

    function handleStorageChange(event) {
      if (event.key === ADMIN_MODE_STORAGE_KEY || event.key === null) {
        setAdminModeEnabledState(readAdminModePreference(window.localStorage));
      }
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const hasAdminAccess = Boolean(adminState.admin);

  const setAdminModeEnabled = useCallback((nextValue) => {
    if (!hasAdminAccess) return;
    const normalized = Boolean(nextValue);
    if (!isServer) writeAdminModePreference(normalized, window.localStorage);
    setAdminModeEnabledState(normalized);
  }, [hasAdminAccess]);

  const toggleAdminMode = useCallback(() => {
    if (!hasAdminAccess) return;
    setAdminModeEnabledState((prev) => {
      const next = !prev;
      if (!isServer) writeAdminModePreference(next, window.localStorage);
      return next;
    });
  }, [hasAdminAccess]);

  const effectiveIsAdmin = resolveEffectiveAdminMode({ hasAdminAccess, adminModeEnabled });

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
    hasAdminAccess,
    adminModeEnabled,
    isAdmin: effectiveIsAdmin,
    adminConfigured: adminState.adminConfigured,
    adminGoogleAllowed: adminState.adminGoogleAllowed,
    adminStorageMode: adminState.adminStorageMode,
    refreshSession,
    refreshAdminSession,
    setAdminModeEnabled,
    toggleAdminMode,
    signInWithProvider,
    signInWithEmail,
    registerWithEmail,
    signOut,
  }), [
    adminModeEnabled,
    adminState,
    effectiveIsAdmin,
    hasAdminAccess,
    refreshAdminSession,
    refreshSession,
    registerWithEmail,
    session,
    setAdminModeEnabled,
    signInWithEmail,
    signInWithProvider,
    signOut,
    status,
    toggleAdminMode,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
