import { randomBytes } from 'node:crypto';
import { fromNodeHeaders } from 'better-auth/node';
import { Router } from 'express';
import { z } from 'zod';
import { defaultAdminGames } from '../../../src/data/site-defaults.js';
import { isAdminConfigured } from '../auth/admin-session.js';
import { isDatabaseConnected } from '../config/database.js';
import { env } from '../config/env.js';
import { getStoredAdminAccount, resolveAdminAccess } from '../middleware/require-admin.js';
import { Game } from '../models/Game.js';
import { GamePlayConfig } from '../models/GamePlayConfig.js';
import { GameScore } from '../models/GameScore.js';
import { gameScorePayloadSchema } from '../schemas/game-runtime-schemas.js';
import { sanitizeGamesForViewer } from '../utils/game-visibility.js';

const memoryGameConfigs = new Map();
const memoryGameScores = [];

async function loadGamesList() {
  if (isDatabaseConnected()) {
    const docs = await Game.find().sort({ sortOrder: 1, title: 1 }).lean();
    if (docs.length > 0) return docs;
  }
  return defaultAdminGames;
}

export function createGamesRouter({ auth = null, appEnv = env } = {}) {
  const router = Router();

  router.use(async (request, response, next) => {
    response.set('Cache-Control', 'no-store');

    try {
      const adminUser = await resolveAdminAccess(request, { auth, appEnv });
      if (adminUser) {
        request.gameViewer = {
          playerName: adminUser.name || 'Administrador',
          email: adminUser.email || '',
          role: 'admin',
          isAdmin: true,
        };
        return next();
      }

      const overrideAccount = await getStoredAdminAccount();
      const adminAvailable = isAdminConfigured(appEnv, overrideAccount);

      if (!auth && !adminAvailable) {
        return response.status(503).json({
          error: {
            code: 'AUTH_NOT_CONFIGURED',
            message: 'El inicio de sesión estará disponible cuando se configure MongoDB y al menos un proveedor social.',
          },
        });
      }

      if (auth) {
        const sessionData = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
        if (sessionData?.user) {
          request.gameViewer = {
            playerName: sessionData.user.name || 'Cliente',
            email: sessionData.user.email ? String(sessionData.user.email).toLowerCase() : '',
            role: 'player',
            isAdmin: false,
          };
          return next();
        }
      }

      return response.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Iniciá sesión con Google para entrar a esta sección.',
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/', async (request, response) => {
    const viewer = request.gameViewer;
    const allGames = await loadGamesList();
    const visibleGames = sanitizeGamesForViewer(allGames, { isAdmin: viewer.isAdmin });

    response.status(200).json({
      data: visibleGames,
      meta: {
        unlocked: true,
        playerName: viewer.playerName,
        role: viewer.role,
        isAdmin: viewer.isAdmin,
        total: visibleGames.length,
      },
    });
  });

  router.get('/:slug/config', async (request, response) => {
    const slug = z.string().regex(/^[a-z0-9-]+$/).parse(request.params.slug);
    const viewer = request.gameViewer;
    const allGames = await loadGamesList();
    const visibleGames = sanitizeGamesForViewer(allGames, { isAdmin: viewer.isAdmin });
    const game = visibleGames.find((item) => item.slug === slug);
    if (!game) {
      return response.status(404).json({ error: { code: 'GAME_NOT_FOUND', message: 'No encontramos ese juego.' } });
    }
    if (isDatabaseConnected()) {
      const doc = await GamePlayConfig.findOne({ gameSlug: slug }).lean();
      return response.status(200).json({ data: doc?.config ?? null });
    }
    return response.status(200).json({ data: memoryGameConfigs.get(slug) ?? null });
  });

  router.post('/:slug/scores', async (request, response) => {
    const slug = z.string().regex(/^[a-z0-9-]+$/).parse(request.params.slug);
    const viewer = request.gameViewer;
    const allGames = await loadGamesList();
    const visibleGames = sanitizeGamesForViewer(allGames, { isAdmin: viewer.isAdmin });
    const game = visibleGames.find((item) => item.slug === slug);
    if (!game) {
      return response.status(404).json({ error: { code: 'GAME_NOT_FOUND', message: 'No encontramos ese juego.' } });
    }
    const scoreInput = gameScorePayloadSchema.parse(request.body ?? {});
    const scoreId = 'SCR-' + Date.now().toString(36).toUpperCase() + '-' + randomBytes(2).toString('hex').toUpperCase();
    const payload = {
      scoreId,
      gameSlug: slug,
      playerName: viewer.playerName,
      playerEmail: viewer.email || '',
      isAdmin: Boolean(viewer.isAdmin),
      ...scoreInput,
    };
    if (isDatabaseConnected()) {
      const saved = await GameScore.create(payload);
      return response.status(201).json({ data: { id: saved.scoreId, ...payload, createdAt: saved.createdAt } });
    }
    const fallback = { id: scoreId, ...payload, createdAt: new Date().toISOString() };
    memoryGameScores.unshift(fallback);
    if (memoryGameScores.length > 250) memoryGameScores.length = 250;
    return response.status(201).json({ data: fallback });
  });

  router.get('/:slug', async (request, response) => {
    const slug = z.string().regex(/^[a-z0-9-]+$/).parse(request.params.slug);
    const viewer = request.gameViewer;
    const allGames = await loadGamesList();
    const visibleGames = sanitizeGamesForViewer(allGames, { isAdmin: viewer.isAdmin });
    const game = visibleGames.find((item) => item.slug === slug);

    if (!game) {
      return response.status(404).json({ error: { code: 'GAME_NOT_FOUND', message: 'No encontramos ese juego.' } });
    }

    return response.status(200).json({
      data: game,
      meta: { unlocked: true, role: viewer.role, isAdmin: viewer.isAdmin },
    });
  });

  return router;
}
