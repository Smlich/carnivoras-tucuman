import { Router } from 'express';
import { z } from 'zod';
import { games } from '../../../src/data/games.js';
import { createRequireAuth } from '../middleware/require-auth.js';

export function createGamesRouter({ auth = null } = {}) {
  const router = Router();

  router.use(createRequireAuth(auth));

  router.get('/', (request, response) => {
    response.status(200).json({
      data: games,
      meta: {
        unlocked: true,
        playerName: request.authUser.name || 'Cliente',
        total: games.length,
      },
    });
  });

  router.get('/:slug', (request, response) => {
    const slug = z.string().regex(/^[a-z0-9-]+$/).parse(request.params.slug);
    const game = games.find((item) => item.slug === slug);

    if (!game) {
      return response.status(404).json({ error: { code: 'GAME_NOT_FOUND', message: 'No encontramos ese juego.' } });
    }

    return response.status(200).json({ data: game, meta: { unlocked: true } });
  });

  return router;
}
