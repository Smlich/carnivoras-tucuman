import { StrictMode, Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../games/dionaea-strike/dionaea.css';
import { AuthProvider, useAuth } from '../context/AuthContext';

const CarnivoraShmupGame = lazy(() =>
  import('../games/dionaea-strike/dionaea-embed').then((module) => ({
    default: module.CarnivoraShmupGame,
  })),
);

function GameAccessGate({ children }) {
  const { isStaticPreview, isLoading, isAdminLoading, enabled, providers, user, isAdmin, signInWithProvider } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');

  if (isLoading || isAdminLoading) {
    return (
      <main className="min-h-dvh grid place-items-center bg-[#08101C] text-slate-100 p-6 text-center">
        <div className="space-y-3 max-w-md">
          <p className="text-sm font-mono uppercase tracking-widest text-lime-300">Carnívoras Tucumán</p>
          <h1 className="text-2xl font-display font-extrabold">Comprobando tu acceso…</h1>
        </div>
      </main>
    );
  }

  const hasAccess = Boolean(user || isAdmin);
  if (!hasAccess) {
    const googleAvailable = !isStaticPreview && enabled && providers.includes('google');
    return (
      <main className="min-h-dvh grid place-items-center bg-[#08101C] text-slate-100 p-6">
        <section className="w-full max-w-md rounded-2xl border-2 border-lime-300/30 bg-[#0d1a2c] p-7 text-center shadow-2xl space-y-4">
          <p className="text-xs font-mono uppercase tracking-widest text-lime-300">Zona de juegos gratis</p>
          <h1 className="text-2xl font-display font-extrabold text-white">Dionaea Strike</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Iniciá sesión con tu cuenta de Google para jugar gratis desde cualquier dispositivo.
          </p>
          {googleAvailable ? (
            <button
              type="button"
              disabled={signingIn}
              onClick={() => {
                setAuthError('');
                setSigningIn(true);
                signInWithProvider('google', '/jugar-dionaea.html').catch(() => {
                  setAuthError('No pudimos conectar con Google. Probá nuevamente.');
                  setSigningIn(false);
                });
              }}
              className="w-full rounded-xl bg-[#b7f43e] px-5 py-3 text-sm font-extrabold text-[#051610] hover:bg-[#c8f451] cursor-pointer disabled:opacity-60"
            >
              {signingIn ? 'Conectando con Google…' : 'Iniciar sesión con Google para jugar'}
            </button>
          ) : (
            <p className="text-xs text-slate-400">
              El acceso con Google está temporalmente deshabilitado en este entorno.
            </p>
          )}
          {authError && <p className="text-xs font-semibold text-rose-300">{authError}</p>}
          <div className="pt-2">
            <a href="/juegos.html" className="text-xs font-semibold text-lime-300 underline hover:text-lime-200">
              ← Volver a Carnívoras Tucumán
            </a>
          </div>
        </section>
      </main>
    );
  }

  return children;
}

function DionaeaPlayerWorkspace() {
  const { isAdmin } = useAuth();
  const [serverConfig, setServerConfig] = useState(undefined);
  const [serverIsAdmin, setServerIsAdmin] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const effectiveIsAdmin = Boolean(isAdmin || serverIsAdmin);

  useEffect(() => {
    let active = true;
    fetch('/api/games/dionaea-strike/config', {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload) return;
        if (payload.data) {
          setServerConfig(payload.data);
        }
        if (payload.meta && typeof payload.meta.isAdmin === 'boolean') {
          setServerIsAdmin(payload.meta.isAdmin);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleAdminConfigSave = useCallback(async (nextConfig) => {
    if (!effectiveIsAdmin) return;
    setSaveNotice('Guardando configuración en el servidor…');
    try {
      const response = await fetch('/api/admin/games/dionaea-strike/config', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Request': '1',
        },
        body: JSON.stringify(nextConfig),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'No se pudo guardar la configuración en el servidor.');
      }
      if (payload?.data) setServerConfig(payload.data);
      setSaveNotice('Configuración guardada para todos los jugadores.');
    } catch (error) {
      setSaveNotice(error.message || 'Error al guardar configuración en el servidor.');
    } finally {
      window.setTimeout(() => setSaveNotice(''), 4000);
    }
  }, [effectiveIsAdmin]);

  const handleScoreSubmit = useCallback((result) => {
    fetch('/api/games/dionaea-strike/scores', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    }).catch(() => {});
  }, []);

  return (
    <div className="relative w-full h-dvh overflow-hidden">
      <a
        href="/juegos.html"
        className="fixed left-3 bottom-3 z-40 inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#0B1422]/88 px-3 py-1.5 text-xs font-bold text-slate-200 shadow-lg backdrop-blur hover:border-lime-400/60 hover:text-white"
      >
        ← Volver a la tienda
      </a>

      {saveNotice && (
        <div
          role="status"
          className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-xl border border-lime-400/40 bg-[#0B1422]/95 px-4 py-2 text-xs font-bold text-lime-300 shadow-xl"
        >
          {saveNotice}
        </div>
      )}

      <Suspense
        fallback={(
          <main className="min-h-dvh grid place-items-center bg-[#08101C] text-slate-100 p-6 text-center">
            <div className="space-y-2">
              <p className="text-xs font-mono uppercase tracking-widest text-lime-300">Carnívoras Tucumán</p>
              <p className="text-lg font-display font-bold">Cargando Dionaea Strike…</p>
            </div>
          </main>
        )}
      >
        <CarnivoraShmupGame
          isAdmin={effectiveIsAdmin}
          initialConfig={serverConfig}
          onConfigChange={effectiveIsAdmin ? handleAdminConfigSave : undefined}
          onScoreSubmit={handleScoreSubmit}
          assetBasePath="/"
        />
      </Suspense>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <GameAccessGate>
        <DionaeaPlayerWorkspace />
      </GameAccessGate>
    </AuthProvider>
  </StrictMode>,
);
