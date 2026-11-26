import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const isStaticPreview = import.meta.env.VITE_STATIC_PREVIEW === 'true';

const fallbackValue = {
  isStaticPreview,
  isLoading: false,
  enabled: false,
  providers: [],
  user: null,
  session: null,
  refreshSession: async () => null,
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

// Consulta una sola vez el estado de acceso y la sesión, sin descargar el cliente de Better Auth.
export function AuthProvider({ children }) {
  const [status, setStatus] = useState({ isLoading: !isStaticPreview, enabled: false, providers: [] });
  const [session, setSession] = useState(null);
  const enabledRef = useRef(false);

  useEffect(() => {
    if (isStaticPreview) return undefined;

    const controller = new AbortController();
    let isActive = true;
    let retryTimer;

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

    return () => {
      isActive = false;
      controller.abort();
      window.clearTimeout(retryTimer);
    };
  }, []);

  const refreshSession = useCallback(async () => {
    if (!enabledRef.current) return null;

    try {
      const currentSession = await fetchSession();
      setSession(currentSession);
      return currentSession;
    } catch {
      setSession(null);
      return null;
    }
  }, []);

  const value = useMemo(() => ({
    isStaticPreview,
    isLoading: status.isLoading,
    enabled: status.enabled,
    providers: status.providers,
    user: session?.user ?? null,
    session,
    refreshSession,
  }), [refreshSession, session, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
