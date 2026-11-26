import { Router } from 'express';
import { env } from '../config/env.js';
import { isDatabaseConnected } from '../config/database.js';

export function createHealthRouter({
  isProduction = env.NODE_ENV === 'production',
  hasDatabaseUri = Boolean(env.MONGODB_URI),
} = {}) {
  const router = Router();

  router.get('/', (request, response) => {
    response.set('Cache-Control', 'no-store');

    if (isDatabaseConnected()) {
      return response.status(200).json({
        data: {
          service: 'carnivoras-tucuman-api',
          status: 'ok',
          database: 'connected',
          catalogMode: 'mongodb',
        },
      });
    }

    const database = hasDatabaseUri ? 'disconnected' : 'not-configured';

    // En producción, sin base de datos el servicio no puede atender y los monitores deben enterarse.
    if (isProduction) {
      return response.status(503).json({
        data: {
          service: 'carnivoras-tucuman-api',
          status: 'unavailable',
          database,
          catalogMode: 'unavailable',
        },
      });
    }

    return response.status(200).json({
      data: {
        service: 'carnivoras-tucuman-api',
        status: 'degraded',
        database,
        catalogMode: 'demo-catalog',
      },
    });
  });

  return router;
}

export const healthRouter = createHealthRouter();
