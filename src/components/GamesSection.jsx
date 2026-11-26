import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSiteContent } from '../context/SiteContentContext';
import { fetchUnlockedGames } from '../services/games-api';

function resolveGameSrc(game, { role, isAdmin, playerName }) {
  const targetUrl = isAdmin && game.adminEmbedUrl ? game.adminEmbedUrl : game.embedUrl;
  if (!targetUrl) return null;

  try {
    const resolved = new URL(targetUrl, window.location.origin);
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
  const iframeSrc = !locked ? resolveGameSrc(game, { role, isAdmin, playerName }) : null;
  const isPlayable = Boolean(iframeSrc) && (game.status === 'playable' || isAdmin);
  const statusLabel = game.status === 'playable'
    ? 'Disponible'
    : game.status === 'admin-only'
      ? 'Solo administrador'
      : 'Próximamente';

  let resolvedOrigin = window.location.origin;
  if (iframeSrc) {
    try {
      resolvedOrigin = new URL(iframeSrc, window.location.origin).origin;
    } catch {
      resolvedOrigin = window.location.origin;
    }
  }
  const isSameOriginFrame = resolvedOrigin === window.location.origin;

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

      {!locked && isPlayable && (
        <button className="button button--dark" type="button" aria-expanded={isPlaying} onClick={() => onTogglePlay(game.slug)}>
          {isPlaying ? 'Cerrar juego' : (isAdmin && game.status !== 'playable' ? 'Probar vista Admin ahora' : 'Jugar ahora')}
        </button>
      )}

      {!locked && !isPlayable && isAdmin && (
        <p className="game-card__admin-hint">
          Cargá la URL exportada de Google AI Studio (<code>embedUrl</code> o <code>adminEmbedUrl</code>) desde <a href="/admin.html">el panel Admin</a> para probarlo acá en vivo.
        </p>
      )}

      {!locked && isPlayable && isPlaying && (
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
  const { isStaticPreview, isLoading, isAdminLoading, enabled, providers, user, isAdmin, admin, signInWithProvider } = useAuth();
  const { gamesPreview } = useSiteContent();
  const [unlocked, setUnlocked] = useState({ status: 'idle', games: [], playerName: '', role: 'player', isAdmin: false });
  const [playingSlug, setPlayingSlug] = useState(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');

  const googleAvailable = enabled && providers.includes('google');
  const viewerKey = isAdmin ? 'admin:' + (admin?.email || '') : (user?.id ?? user?.email ?? null);

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

  async function handleGoogleSignIn() {
    setSignInError('');
    setIsSigningIn(true);

    try {
      await signInWithProvider('google', '/juegos.html');
    } catch {
      setSignInError('No pudimos iniciar sesión con Google. Volvé a intentarlo.');
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
      content = (
        <>
          <p className={'games-section__welcome' + (unlocked.isAdmin ? ' is-admin' : '')} role="status">
            {unlocked.isAdmin
              ? `Modo Administrador activo (${unlocked.playerName}): los juegos reciben role=admin, isAdmin=true y tus propiedades configuradas.`
              : `¡Hola, ${unlocked.playerName}! Estos son tus juegos gratis.`}
          </p>
          <div className="games-section__grid">
            {unlocked.games.map((game) => (
              <GameCard
                key={game.id || game.slug}
                game={game}
                locked={false}
                isAdmin={unlocked.isAdmin}
                playerName={unlocked.playerName}
                role={unlocked.role}
                isPlaying={playingSlug === game.slug}
                onTogglePlay={togglePlay}
              />
            ))}
          </div>
        </>
      );
    }
  } else if (isStaticPreview || !googleAvailable) {
    content = (
      <>
        <div className="games-section__grid">
          {gamesPreview.map((game) => <GameCard key={game.id || game.slug} game={game} locked />)}
        </div>
        <div className="games-section__cta">
          <p className="games-section__note">
            Los juegos son gratuitos para clientes registrados con Google. Muy pronto habilitaremos el ingreso con Google para desbloquear esta sección.
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
          <p>Iniciá sesión con tu cuenta de Google para desbloquear los juegos gratis.</p>
          <button className="button button--dark" type="button" onClick={handleGoogleSignIn} disabled={isSigningIn}>
            {isSigningIn ? 'Conectando con Google…' : 'Iniciar sesión con Google para entrar'}
          </button>
          {signInError && <p className="games-section__error" role="alert">{signInError}</p>}
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
            <p className="section-heading__aside">Un regalo para quienes inician sesión con Google: juegos gratuitos creados por nosotros.</p>
          </div>
        ) : (
          <h2 className="visually-hidden">Juegos disponibles</h2>
        )}
        {content}
      </div>
    </section>
  );
}
