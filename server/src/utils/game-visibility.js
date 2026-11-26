export function sanitizeGamesForViewer(gamesList = [], { isAdmin = false } = {}) {
  const ordered = [...gamesList].sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));

  return ordered
    .filter((game) => isAdmin || game.status !== 'admin-only')
    .map((game) => {
      const sanitized = {
        id: game.id || game.slug,
        slug: game.slug,
        title: game.title,
        description: game.description,
        status: game.status,
        requiresAuth: game.requiresAuth !== false,
        requiredProviders: Array.isArray(game.requiredProviders) ? game.requiredProviders : ['google'],
        platform: game.platform || 'Google AI Studio',
        embedUrl: game.embedUrl ?? null,
        aspectRatio: game.aspectRatio || '16 / 9',
        badge: game.badge || 'Gratis con Google',
      };

      if (isAdmin) {
        sanitized.adminEmbedUrl = game.adminEmbedUrl ?? null;
        sanitized.adminProps = game.adminProps && typeof game.adminProps === 'object' ? game.adminProps : {};
      }

      return sanitized;
    });
}

export function sanitizePublicGamesPreview(gamesList = []) {
  return sanitizeGamesForViewer(gamesList, { isAdmin: false }).map((game) => ({
    id: game.id,
    slug: game.slug,
    title: game.title,
    description: game.description,
    status: game.status,
    requiresAuth: game.requiresAuth,
    requiredProviders: game.requiredProviders,
    platform: game.platform,
    embedUrl: game.status === 'playable' ? game.embedUrl : null,
    aspectRatio: game.aspectRatio,
    badge: game.badge,
  }));
}
