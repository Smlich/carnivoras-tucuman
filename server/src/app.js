import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { toNodeHandler } from 'better-auth/node';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { productsRouter } from './routes/products.js';

export function createApp({ auth = null, authProviders = [] } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    maxAge: 86400,
  }));

  app.get('/api/auth/status', (request, response) => {
    response.set('Cache-Control', 'no-store');
    response.json({ enabled: Boolean(auth), providers: auth ? authProviders : [] });
  });

  if (auth) {
    app.all('/api/auth/*splat', toNodeHandler(auth));
  } else {
    app.all('/api/auth/*splat', (request, response) => response.status(503).json({
      error: {
        code: 'AUTH_NOT_CONFIGURED',
        message: 'El inicio de sesión estará disponible cuando se configure MongoDB y al menos un proveedor social.',
      },
    }));
  }

  app.use(express.json({ limit: '16kb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/products', productsRouter);

  app.use((request, response) => {
    response.status(404).json({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'No encontramos esta ruta de la API.',
      },
    });
  });

  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);

    if (error instanceof ZodError) {
      return response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Revisá los parámetros de la consulta.',
          details: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
    }

    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    const code = error.code || 'INTERNAL_SERVER_ERROR';
    const message = statusCode < 500 ? error.message : 'Ocurrió un error interno.';

    if (statusCode >= 500 && env.NODE_ENV !== 'production') {
      console.error(error);
    }

    return response.status(statusCode).json({ error: { code, message } });
  });

  return app;
}
