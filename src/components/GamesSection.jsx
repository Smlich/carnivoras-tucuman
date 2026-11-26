import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { games as previewGames } from '../data/games';
import { fetchUnlockedGames } from '../services/games-api';

function GameCard({ game, locked, isPlaying, onTogglePlay }) {
  const isPlayable = game.status === 'playable' && Boolean(game.embedUrl);

  return (
    <article className={'game-card' + (locked ? ' is-locked' : '')}>
      <div className="game-card__header">
        <span className="game-card__badge">{game.badge}</span>
        <span className="game-card__status">{isPlayable ? 'Disponible' : 'Próximamente'}</span>
      </div>
      <h3>{game.title}</h3>
      <p>{game.description}</p>
      <p className="game-card__platform">Creado en {game.platform}</p>

      {!locked && isPlayable && (
        <button className="button button--dark" type="button" aria-expanded={isPlaying} onClick={() => onTogglePlay(game.slug)}>
          {isPlaying ? 'Cerrar juego' : 'Jugar ahora'}
        </button>
      )}

      {!locked && isPlayable && isPlaying && (
        <div className="game-card__stage" style={{ aspectRatio: game.aspectRatio }}>
          <iframe
            title={game.title}
            src={game.embedUrl}
            sandbox="allow-scripts allow-same-origin allow-pointer-lock"
            allow="fullscreen"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}
    </article>
  );
}

export default function GamesSection() {
  const { isStaticPreview, isLoading, enabled, providers, user } = useAuth();
  const [unlocked, setUnlocked] = useState({ status: 'idle', games: [], playerName: '' });
  const [playingSlug, setPlayingSlug] = useState(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');

  const googleAvailable = enabled && providers.includes('google');
  const userId = user?.id ?? user?.email ?? null;

  useEffect(() => {
    if (!userId || !googleAvailable) {
      setUnlocked({ status: 'idle', games: [], playerName: '' });
      setPlayingSlug(null);
      return undefined;
    }

    const controller = new AbortController();
    setUnlocked({ status: 'loading', games: [], playerName: '' });

    fetchUnlockedGames({ signal: controller.signal })
      .then((result) => setUnlocked({ status: 'ready', ...result }))
      .catch((error) => {
        if (error.name !== 'AbortError') setUnlocked({ status: 'error', games: [], playerName: '' });
      });

    return () => controller.abort();
  }, [googleAvailable, userId]);

  async function handleGoogleSignIn() {
    setSignInError('');
    setIsSigningIn(true);

    try {
      const { authClient } = await import('../services/auth-client');
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: window.location.origin + '/#juegos',
      });
      if (result?.error) throw new Error('Inicio de sesión rechazado.');
    } catch {
      setSignInError('No pudimos iniciar sesión con Google. Volvé a intentarlo.');
      setIsSigningIn(false);
    }
  }

  function togglePlay(slug) {
    setPlayingSlug((current) => (current === slug ? null : slug));
  }

  let content;

  if (isStaticPreview || (!isLoading && !googleAvailable)) {
    content = (
      <>
        <div className="games-section__grid">
          {previewGames.map((game) => <GameCard key={game.id} game={game} locked />)}
        </div>
        <p className="games-section__note">Gratis al iniciar sesión con Google. Esta función se activa cuando el sitio completo esté publicado.</p>
      </>
    );
  } else if (isLoading) {
    content = <p className="games-section__note" role="status">Comprobando tu acceso…</p>;
  } else if (!user) {
    content = (
      <>
        <div className="games-section__grid">
          {previewGames.map((game) => <GameCard key={game.id} game={game} locked />)}
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
  } else if (unlocked.status === 'error') {
    content = <p className="games-section__error" role="alert">No pudimos cargar los juegos. Recargá la página para volver a intentarlo.</p>;
  } else if (unlocked.status !== 'ready') {
    content = <p className="games-section__note" role="status">Cargando tus juegos…</p>;
  } else {
    content = (
      <>
        <p className="games-section__welcome" role="status">¡Hola, {unlocked.playerName}! Estos son tus juegos gratis.</p>
        <div className="games-section__grid">
          {unlocked.games.map((game) => (
            <GameCard key={game.id} game={game} locked={false} isPlaying={playingSlug === game.slug} onTogglePlay={togglePlay} />
          ))}
        </div>
      </>
    );
  }

  return (
    <section className="games-section section-pad" id="juegos" aria-labelledby="games-title">
      <div className="page-shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow__line" /> Zona de juegos gratis</p>
            <h2 id="games-title">Jugá mientras <em>tus plantas crecen.</em></h2>
          </div>
          <p className="section-heading__aside">Un regalo para quienes inician sesión con Google: juegos gratuitos creados por nosotros.</p>
        </div>
        {content}
      </div>
    </section>
  );
}
