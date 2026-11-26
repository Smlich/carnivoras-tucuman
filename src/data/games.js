// Registro de juegos gratuitos. Lo comparten el servidor (API protegida) y React.
// Para publicar o ajustar un juego desde el navegador: usar /admin.html o las propiedades in-game de Administrador.
export const games = [
  {
    id: 'dionaea-strike',
    slug: 'dionaea-strike',
    title: 'Dionaea Strike — Carnívora vs Moscas Alien',
    description: 'Shoot ’em up aéreo en español con biplano carnívoro, mutaciones biológicas de 8 especies reales y mascotas copiloto. Gratis al ingresar con Google.',
    status: 'playable',
    requiresAuth: true,
    requiredProviders: ['google'],
    platform: 'Carnívoras Tucumán · React + Canvas 2D',
    embedUrl: '/jugar-dionaea.html',
    adminEmbedUrl: '/jugar-dionaea.html',
    adminProps: {
      adminMode: true,
      configPanel: true,
      unlockAll: true,
      configEndpoint: '/api/admin/games/dionaea-strike/config',
    },
    aspectRatio: '16 / 9',
    badge: 'Gratis con Google',
  },
];
