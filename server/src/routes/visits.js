import { Router } from 'express';
import { isDatabaseConnected } from '../config/database.js';
import { SiteMetric } from '../models/SiteMetric.js';

const counterKey = 'visits';

function sendUnavailable(response) {
  return response.status(503).json({
    error: {
      code: 'COUNTER_UNAVAILABLE',
      message: 'El contador no está disponible temporalmente.',
    },
  });
}

// Contador agregado de sesiones: guarda un único total, sin IP ni identificadores.
export function createVisitsRouter() {
  const router = Router();

  router.use((request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/', async (request, response) => {
    if (!isDatabaseConnected()) return sendUnavailable(response);

    const document = await SiteMetric.findOne({ key: counterKey }).lean();
    return response.status(200).json({ count: document?.count ?? 0 });
  });

  router.post('/', async (request, response) => {
    if (request.get('x-counter-request') !== '1') {
      return response.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Solicitud de contador inválida.' },
      });
    }

    if (!isDatabaseConnected()) return sendUnavailable(response);

    const document = await SiteMetric.findOneAndUpdate(
      { key: counterKey },
      { $inc: { count: 1 } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean();

    return response.status(200).json({ count: document.count });
  });

  return router;
}
