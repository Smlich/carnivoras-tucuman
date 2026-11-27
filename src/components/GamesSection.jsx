import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSiteContent } from '../context/SiteContentContext';
import { fetchUnlockedGames } from '../services/games-api';

const SSR_ORIGIN_FALLBACK = 'https://carnivorastucuman.netlify.app';

function getCurrentOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : SSR_ORIGIN_FALLBACK;
}

function resolveGameSrc(game, { role, isAdmin, playerName }) {
  const targetUrl = isAdmin && game.adminEmbedUrl ? game.adminEmbedUrl : game.embedUrl;
  if (!targetUrl) return null;

  try {
    const resolved = new URL(targetUrl, getCurrentOrigin());
    resolved.searchParams.set('role', role || 'player');
    resolved.searchParams.set('isAdmin', isAdmin ? '1' : '0');
    if (playerName) resolved.searchParams.set('player', playerName);
    if (isAdmin && game.adminProps && Object.keys(game.adminProps).length > 0) {
      resolved.searchParams.set('adminProps', JSON.stringify(game.adminProps));
    }
    return resolved.toString();
  } catch {
    return targetUrl;
  }
}

function GameCard({ game, locked, isPlaying, isAdmin, playerName, role, onTogglePlay }) {
  const iframeRef = useRef(null);
  const currentOrigin = getCurrentOrigin();
  const iframeSrc = !locked ? resolveGameSrc(game, { role, isAdmin, playerName }) : null;
  const isPlayable = Boolean(iframeSrc) && (game.status === 'playable' || isAdmin);
  const isDedicatedLauncher = Boolean(iframeSrc) && (() => {
    try {
      const parsed = new URL(iframeSrc, currentOrigin);
      return parsed.origin === currentOrigin && parsed.pathname.startsWith('/jugar-');
    } catch {
      return false;
    }
  })();
  const launchHref = isDedicatedLauncher ? new URL(iframeSrc, currentOrigin).pathname : iframeSrc;
  const statusLabel = game.status === 'playable'
    ? 'Disponible'
    : game.status === 'admin-only'
      ? 'Solo administrador'
      : 'Próximamente';

  let resolvedOrigin = currentOrigin;
  if (iframeSrc) {
    try {
      resolvedOrigin = new URL(iframeSrc, currentOrigin).origin;
    } catch {
      resolvedOrigin = currentOrigin;
    }
  }
  const isSameOriginFrame = resolvedOrigin === currentOrigin;

  const sendPlayerContext = useCallback(() => {
    const frameWindow = iframeRef.current?.contentWindow;
    if (!frameWindow || !iframeSrc) return;
    const targetOrigin = isSameOriginFrame ? '*' : resolvedOrigin;

    frameWindow.postMessage({
      type: 'CARNIVORAS_PLAYER_CONTEXT',
      version: 1,
      role: isAdmin ? 'admin' : 'player',
      isAdmin: Boolean(isAdmin),
      playerName: playerName || 'Jugador',
      gameSlug: game.slug,
      adminProps: isAdmin ? (game.adminProps ?? {}) : {},
    }, targetOrigin);
  }, [game.adminProps, game.slug, iframeSrc, isAdmin, isSameOriginFrame, playerName, resolvedOrigin]);

  useEffect(() => {
    if (!isPlaying || !iframeSrc) return undefined;

    function handleMessage(event) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!isSameOriginFrame && event.origin !== resolvedOrigin) return;
      if (event.data?.type === 'CARNIVORAS_REQUEST_CONTEXT') {
        sendPlayerContext();
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isPlaying, iframeSrc, isSameOriginFrame, resolvedOrigin, sendPlayerContext]);

  return (
    <article className={'game-card' + (locked ? ' is-locked' : '') + (isAdmin ? ' is-admin-view' : '')}>
      <div className="game-card__header">
        <span className="game-card__badge">{game.badge}</span>
        <div className="game-card__badges-right">
          {isAdmin && <span className="game-card__admin-tag">Modo Administrador</span>}
          <span className="game-card__status">{statusLabel}</span>
        </div>
      </div>
      <h3>{game.title}</h3>
      <p>{game.description}</p>
      <p className="game-card__platform">Creado en {game.platform}</p>

      {isAdmin && (
        <details className="game-card__admin-props">
          <summary>Propiedades del modo Administrador</summary>
          <p>
            Se envían automáticamente al juego por URL (<code>role=admin&amp;isAdmin=1</code>) y por <code>postMessage</code> (<code>CARNIVORAS_PLAYER_CONTEXT</code>).
          </p>
          <pre>{JSON.stringify(game.adminProps ?? {}, null, 2)}</pre>
          <a className="game-card__admin-link" href="/admin.html">Editar propiedades en /admin.html →</a>
        </details>
      )}

      {!locked && isPlayable && isDedicatedLauncher && (
        <a className="button button--dark" href={launchHref}>
          {isAdmin ? 'Jugar con Modo Admin' : 'Jugar ahora'} <span aria-hidden="true">↗</span>
        </a>
      )}

      {!locked && isPlayable && !isDedicatedLauncher && (
        <button className="button button--dark" type="button" aria-expanded={isPlaying} onClick={() => onTogglePlay(game.slug)}>
          {isPlaying ? 'Cerrar juego' : (isAdmin && game.status !== 'playable' ? 'Probar vista Admin ahora' : 'Jugar ahora')}
        </button>
      )}

      {!locked && !isPlayable && isAdmin && (
        <p className="game-card__admin-hint">
          Cargá la URL exportada de Google AI Studio (<code>embedUrl</code> o <code>adminEmbedUrl</code>) desde <a href="/admin.html">el panel Admin</a> para probarlo acá en vivo.
        </p>
      )}

      {!locked && isPlayable && !isDedicatedLauncher && isPlaying && (
        <div className="game-card__stage" style={{ aspectRatio: game.aspectRatio }}>
          <iframe
            ref={iframeRef}
            title={game.title}
            src={iframeSrc}
            sandbox={isSameOriginFrame ? 'allow-scripts allow-pointer-lock' : 'allow-scripts allow-same-origin allow-pointer-lock'}
            allow="fullscreen"
            allowFullScreen
            loading="lazy"
            onLoad={sendPlayerContext}
          />
        </div>
      )}
    </article>
  );
}

export default function GamesSection({ showHeading = true }) {
  const {
    isStaticPreview,
    isLoading,
    isAdminLoading,
    enabled,
    providers,
    user,
    isAdmin,
    hasAdminAccess,
    adminModeEnabled,
    toggleAdminMode,
    admin,
    signInWithProvider,
    signInWithEmail,
    registerWithEmail,
  } = useAuth();
  const { gamesPreview } = useSiteContent();
  const [unlocked, setUnlocked] = useState({ status: 'idle', games: [], playerName: '', role: 'player', isAdmin: false });
  const [playingSlug, setPlayingSlug] = useState(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [emailMode, setEmailMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const googleAvailable = enabled && providers.includes('google');
  const facebookAvailable = enabled && providers.includes('facebook');
  const emailAvailable = enabled && providers.includes('email');
  const anyAuthAvailable = googleAvailable || facebookAvailable || emailAvailable;
  const viewerKey = hasAdminAccess ? 'admin:' + (admin?.email || '') : (user?.id ?? user?.email ?? null);

  useEffect(() => {
    if (!viewerKey) {
      setUnlocked({ status: 'idle', games: [], playerName: '', role: 'player', isAdmin: false });
      setPlayingSlug(null);
      return undefined;
    }

    const controller = new AbortController();
    setUnlocked({ status: 'loading', games: [], playerName: '', role: 'player', isAdmin: false });

    fetchUnlockedGames({ signal: controller.signal })
      .then((result) => setUnlocked({ status: 'ready', ...result }))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setUnlocked({ status: 'error', games: [], playerName: '', role: 'player', isAdmin: false });
        }
      });

    return () => controller.abort();
  }, [viewerKey]);

  async function handleProviderSignIn(provider) {
    setSignInError('');
    setIsSigningIn(true);

    try {
      await signInWithProvider(provider, '/juegos.html');
    } catch {
      setSignInError(`No pudimos iniciar sesión con ${provider === 'facebook' ? 'Facebook' : 'Google'}. Volvé a intentarlo.`);
      setIsSigningIn(false);
    }
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();
    setSignInError('');
    setIsSigningIn(true);

    try {
      if (emailMode === 'register') {
        await registerWithEmail({ name, email, password });
      } else {
        await signInWithEmail({ email, password });
      }
    } catch (error) {
      setSignInError(error?.message || 'No pudimos completar el ingreso con correo.');
      setIsSigningIn(false);
    }
  }

  function togglePlay(slug) {
    setPlayingSlug((current) => (current === slug ? null : slug));
  }

  let content;

  if (!viewerKey && (isLoading || isAdminLoading)) {
    content = <p className="games-section__note" role="status">Comprobando tu acceso…</p>;
  } else if (viewerKey) {
    if (unlocked.status === 'error') {
      content = <p className="games-section__error" role="alert">No pudimos cargar los juegos. Recargá la página para volver a intentarlo.</p>;
    } else if (unlocked.status !== 'ready') {
      content = <p className="games-section__note" role="status">Cargando tus juegos…</p>;
    } else {
      const effectiveIsAdmin = Boolean(isAdmin && unlocked.isAdmin);
      const visibleGames = effectiveIsAdmin
        ? unlocked.games
        : unlocked.games.filter((game) => game.status !== 'admin-only');

      content = (
        <>
          <div className="games-admin-bar">
            <p className={'games-section__welcome' + (effectiveIsAdmin ? ' is-admin' : '')} role="status">
              {effectiveIsAdmin
                ? `Modo Administrador activo (${unlocked.playerName}): los juegos reciben role=admin, isAdmin=true y tus propiedades configuradas.`
                : `¡Hola, ${unlocked.playerName}! Estos son tus juegos gratis.`}
            </p>
            {hasAdminAccess && (
              <button
                type="button"
                role="switch"
                aria-checked={adminModeEnabled}
                className={'games-admin-toggle' + (adminModeEnabled ? ' is-on' : ' is-off')}
                onClick={toggleAdminMode}
              >
                <span className="admin-mode-toggle__dot" aria-hidden="true" />
                <span>{adminModeEnabled ? 'Modo Admin: ON' : 'Modo Admin: OFF'}</span>
              </button>
            )}
          </div>
          <div className="games-section__grid">
            {visibleGames.map((game) => (
              <GameCard
                key={game.id || game.slug}
                game={game}
                locked={false}
                isAdmin={effectiveIsAdmin}
                playerName={unlocked.playerName}
                role={effectiveIsAdmin ? 'admin' : 'player'}
                isPlaying={playingSlug === game.slug}
                onTogglePlay={togglePlay}
              />
            ))}
          </div>
        </>
      );
    }
  } else if (isStaticPreview || !anyAuthAvailable) {
    content = (
      <>
        <div className="games-section__grid">
          {gamesPreview.map((game) => <GameCard key={game.id || game.slug} game={game} locked />)}
        </div>
        <div className="games-section__cta">
          <p className="games-section__note">
            Los juegos son gratuitos para clientes registrados. Muy pronto habilitaremos el ingreso para desbloquear esta sección.
          </p>
        </div>
      </>
    );
  } else {
    content = (
      <>
        <div className="games-section__grid">
          {gamesPreview.map((game) => <GameCard key={game.id || game.slug} game={game} locked />)}
        </div>
        <div className="games-section__cta">
          <div className="games-auth-panel">
            <p>Iniciá sesión con tu cuenta o creá una gratis con tu correo para desbloquear los juegos.</p>
            {(googleAvailable || facebookAvailable) && (
              <div className="games-auth-panel__providers">
                {googleAvailable && (
                  <button className="button button--dark" type="button" onClick={() => handleProviderSignIn('google')} disabled={isSigningIn}>
                    {isSigningIn ? 'Conectando…' : 'Continuar con Google'}
                  </button>
                )}
                {facebookAvailable && (
                  <button className="button button--ghost" type="button" onClick={() => handleProviderSignIn('facebook')} disabled={isSigningIn}>
                    Continuar con Facebook
                  </button>
                )}
              </div>
            )}
            {emailAvailable && (
              <div className="games-auth-email">
                <div className="games-auth-tabs" role="tablist" aria-label="Acceso con correo para juegos">
                  <button
                    className={`games-auth-tab${emailMode === 'login' ? ' is-active' : ''}`}
                    type="button"
                    role="tab"
                    aria-selected={emailMode === 'login'}
                    onClick={() => {
                      setEmailMode('login');
                      setSignInError('');
                    }}
                    disabled={isSigningIn}
                  >
                    Ingresar con correo
                  </button>
                  <button
                    className={`games-auth-tab${emailMode === 'register' ? ' is-active' : ''}`}
                    type="button"
                    role="tab"
                    aria-selected={emailMode === 'register'}
                    onClick={() => {
                      setEmailMode('register');
                      setSignInError('');
                    }}
                    disabled={isSigningIn}
                  >
                    Crear cuenta gratis
                  </button>
                </div>
                <form className="games-auth-form" onSubmit={handleEmailSubmit}>
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
                      disabled={isSigningIn}
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
                    disabled={isSigningIn}
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
                    disabled={isSigningIn}
                  />
                  <button className="button button--primary" type="submit" disabled={isSigningIn}>
                    {emailMode === 'register' ? 'Crear cuenta y entrar' : 'Entrar a jugar'}
                  </button>
                </form>
              </div>
            )}
            {signInError && <p className="games-section__error" role="alert">{signInError}</p>}
          </div>
        </div>
      </>
    );
  }

  return (
    <section className="games-section section-pad" id="juegos" aria-labelledby={showHeading ? 'games-title' : undefined} aria-label={showHeading ? undefined : 'Zona de juegos gratis'}>
      <div className="page-shell">
        {showHeading ? (
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow__line" /> Zona de juegos gratis</p>
              <h2 id="games-title">Jugá mientras <em>tus plantas crecen.</em></h2>
            </div>
            <p className="section-heading__aside">Un regalo para quienes inician sesión con su cuenta: juegos gratuitos creados por nosotros.</p>
          </div>
        ) : (
          <h2 className="visually-hidden">Juegos disponibles</h2>
        )}
        {content}
      </div>
    </section>
  );
}
