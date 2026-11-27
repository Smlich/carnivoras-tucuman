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
  const {
    isStaticPreview,
    isLoading,
    isAdminLoading,
    enabled,
    providers,
    user,
    isAdmin,
    signInWithProvider,
    signInWithEmail,
    registerWithEmail,
  } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const [emailMode, setEmailMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
    const facebookAvailable = !isStaticPreview && enabled && providers.includes('facebook');
    const emailAvailable = !isStaticPreview && enabled && providers.includes('email');
    const anyAuthAvailable = googleAvailable || facebookAvailable || emailAvailable;

    return (
      <main className="min-h-dvh grid place-items-center bg-[#08101C] text-slate-100 p-6">
        <section className="w-full max-w-md rounded-2xl border-2 border-lime-300/30 bg-[#0d1a2c] p-7 text-center shadow-2xl space-y-4">
          <p className="text-xs font-mono uppercase tracking-widest text-lime-300">Zona de juegos gratis</p>
          <h1 className="text-2xl font-display font-extrabold text-white">Dionaea Strike</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Iniciá sesión con tu cuenta o creá una gratis con tu correo para jugar desde cualquier dispositivo.
          </p>
          {anyAuthAvailable ? (
            <div className="space-y-3 text-left">
              {googleAvailable && (
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
                  {signingIn ? 'Conectando con Google…' : 'Continuar con Google'}
                </button>
              )}
              {facebookAvailable && (
                <button
                  type="button"
                  disabled={signingIn}
                  onClick={() => {
                    setAuthError('');
                    setSigningIn(true);
                    signInWithProvider('facebook', '/jugar-dionaea.html').catch(() => {
                      setAuthError('No pudimos conectar con Facebook. Probá nuevamente.');
                      setSigningIn(false);
                    });
                  }}
                  className="w-full rounded-xl bg-[#1877F2] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#166fe5] cursor-pointer disabled:opacity-60"
                >
                  Continuar con Facebook
                </button>
              )}
              {emailAvailable && (
                <div className="pt-2 border-t border-slate-700/70 space-y-3">
                  <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Acceso con correo">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={emailMode === 'login'}
                      onClick={() => {
                        setEmailMode('login');
                        setAuthError('');
                      }}
                      className={`rounded-lg px-3 py-2 text-xs font-bold cursor-pointer ${
                        emailMode === 'login'
                          ? 'bg-lime-300/20 text-lime-200 border border-lime-300/60'
                          : 'bg-slate-900/60 text-slate-300 border border-slate-700'
                      }`}
                    >
                      Ingresar
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={emailMode === 'register'}
                      onClick={() => {
                        setEmailMode('register');
                        setAuthError('');
                      }}
                      className={`rounded-lg px-3 py-2 text-xs font-bold cursor-pointer ${
                        emailMode === 'register'
                          ? 'bg-lime-300/20 text-lime-200 border border-lime-300/60'
                          : 'bg-slate-900/60 text-slate-300 border border-slate-700'
                      }`}
                    >
                      Crear cuenta
                    </button>
                  </div>
                  <form
                    className="space-y-2.5"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      setAuthError('');
                      setSigningIn(true);
                      try {
                        if (emailMode === 'register') {
                          await registerWithEmail({ name, email, password });
                        } else {
                          await signInWithEmail({ email, password });
                        }
                      } catch (error) {
                        setAuthError(error?.message || 'No pudimos completar el ingreso.');
                        setSigningIn(false);
                      }
                    }}
                  >
                    {emailMode === 'register' && (
                      <input
                        type="text"
                        name="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Tu nombre"
                        aria-label="Tu nombre"
                        autoComplete="name"
                        minLength={2}
                        maxLength={80}
                        required
                        disabled={signingIn}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400"
                      />
                    )}
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="tu@correo.com"
                      aria-label="Correo electrónico"
                      autoComplete="email"
                      maxLength={160}
                      required
                      disabled={signingIn}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400"
                    />
                    <input
                      type="password"
                      name="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={emailMode === 'register' ? 'Contraseña (mín. 8 caracteres)' : 'Tu contraseña'}
                      aria-label="Contraseña"
                      autoComplete={emailMode === 'register' ? 'new-password' : 'current-password'}
                      minLength={emailMode === 'register' ? 8 : 1}
                      maxLength={200}
                      required
                      disabled={signingIn}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={signingIn}
                      className="w-full rounded-xl border border-lime-300/60 bg-slate-900 px-5 py-2.5 text-sm font-bold text-lime-200 hover:bg-slate-800 cursor-pointer disabled:opacity-60"
                    >
                      {emailMode === 'register' ? 'Crear cuenta gratis y jugar' : 'Entrar con correo'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              El acceso está temporalmente deshabilitado en este entorno.
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
