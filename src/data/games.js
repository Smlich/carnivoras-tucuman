// Registro de juegos gratuitos. Lo comparten el servidor (API protegida) y React.
// Para publicar un juego: ver docs/GAMES_INTEGRATION.md y cambiar status a 'playable' con su embedUrl.
export const games = [
  {
    id: 'vivero-carnivoro',
    slug: 'vivero-carnivoro',
    title: 'Juego del vivero carnívoro',
    description: 'Un juego gratuito inspirado en el vivero y sus plantas carnívoras. Está en desarrollo y se desbloquea al iniciar sesión con Google.',
    status: 'coming-soon',
    requiresAuth: true,
    requiredProviders: ['google'],
    platform: 'Google AI Studio',
    embedUrl: null,
    adminEmbedUrl: null,
    adminProps: {
      adminMode: true,
      debugTools: true,
      unlockAll: true,
    },
    aspectRatio: '16 / 9',
    badge: 'Gratis con Google',
  },
];
