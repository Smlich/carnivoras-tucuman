import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const isStaticPreview = import.meta.env.VITE_STATIC_PREVIEW === 'true';

const fallbackValue = {
  isStaticPreview,
  isLoading: false,
  isAdminLoading: false,
  enabled: false,
  providers: [],
  user: null,
  session: null,
  admin: null,
  isAdmin: false,
  adminConfigured: false,
  adminGoogleAllowed: false,
  adminStorageMode: 'static',
  refreshSession: async () => null,
  refreshAdminSession: async () => null,
};

const AuthContext = createContext(fallbackValue);

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

async function fetchAdminSession(signal) {
  const response = await fetch('/api/admin/auth/session', {
    cache: 'no-store',
    credentials: 'include',
    signal,
  });
  if (!response.ok) return null;

  const payload = await response.json().catch(() => null);
  return payload?.data ?? null;
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState({ isLoading: !isStaticPreview, enabled: false, providers: [] });
  const [session, setSession] = useState(null);
  const [adminState, setAdminState] = useState({
    isAdminLoading: !isStaticPreview,
    admin: null,
    adminConfigured: false,
    adminGoogleAllowed: false,
    adminStorageMode: isStaticPreview ? 'static' : 'unknown',
  });
  const enabledRef = useRef(false);

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
        const adminData = await fetchAdminSession(controller.signal);
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
          enabledRef.current = enabled;

          let currentSession = null;
          if (enabled) {
            try {
              currentSession = await fetchSession(controller.signal);
            } catch (error) {
              if (error.name === 'AbortError') return;
            }
          }

          if (!isActive) return;
          setSession(currentSession);
          setStatus({ isLoading: false, enabled, providers });
          return;
        } catch (error) {
          if (!isActive || error.name === 'AbortError') return;
          if (attempt === 3) {
            setStatus({ isLoading: false, enabled: false, providers: [] });
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
  }, [applyAdminSession]);

  const refreshAdminSession = useCallback(async () => {
    if (isStaticPreview) return null;
    try {
      const adminData = await fetchAdminSession();
      applyAdminSession(adminData);
      return adminData;
    } catch {
      applyAdminSession(null);
      return null;
    }
  }, [applyAdminSession]);

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

  const value = useMemo(() => ({
    isStaticPreview,
    isLoading: status.isLoading,
    isAdminLoading: adminState.isAdminLoading,
    enabled: status.enabled,
    providers: status.providers,
    user: session?.user ?? null,
    session,
    admin: adminState.admin,
    isAdmin: Boolean(adminState.admin),
    adminConfigured: adminState.adminConfigured,
    adminGoogleAllowed: adminState.adminGoogleAllowed,
    adminStorageMode: adminState.adminStorageMode,
    refreshSession,
    refreshAdminSession,
  }), [adminState, refreshAdminSession, refreshSession, session, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
