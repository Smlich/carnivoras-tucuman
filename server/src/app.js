import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';
import { toNodeHandler } from 'better-auth/node';
import { env } from './config/env.js';
import { createRateLimiter } from './middleware/rate-limit.js';
import { createGamesRouter } from './routes/games.js';
import { createHealthRouter } from './routes/health.js';
import { createProductsRouter } from './routes/products.js';
import { createVisitsRouter } from './routes/visits.js';

const frontendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist');

const notFoundHtml = `<!doctype html>
<html lang="es-AR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Página no encontrada | Carnívoras Tucumán</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; font-family: 'Space Grotesk', 'Segoe UI', sans-serif; color: #f7f4e8; background: #0b2119; }
      main { max-width: 460px; text-align: center; }
      h1 { margin: 0 0 12px; font-size: 2rem; color: #c8f451; }
      p { margin: 0 0 24px; line-height: 1.6; color: #d5e2d2; }
      nav { display: flex; justify-content: center; flex-wrap: wrap; gap: 12px; }
      a { padding: 12px 18px; border-radius: 12px; text-decoration: none; font-weight: 600; }
      .primary { color: #0b2119; background: #c8f451; }
      .secondary { color: #f7f4e8; border: 1px solid rgba(247, 244, 232, .35); }
    </style>
  </head>
  <body>
    <main>
      <h1>No encontramos esa página</h1>
      <p>La dirección puede haber cambiado o estar mal escrita. Volvé a la tienda o consultá la guía de cuidados.</p>
      <nav>
        <a class="primary" href="/">Ir al inicio</a>
        <a class="secondary" href="/cuidados.html">Ver guía de cuidados</a>
      </nav>
    </main>
  </body>
</html>`;

export function createApp({ auth = null, authProviders = [], env: appEnv = env, rateLimits = {} } = {}) {
  const app = express();
  const isProduction = appEnv.NODE_ENV === 'production';

  app.disable('x-powered-by');

  if (isProduction) {
    app.set('trust proxy', 1);
  }

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'default-src': ["'self'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'self'"],
        // Permite incrustar juegos alojados en este mismo sitio (public/games/...).
        'frame-src': ["'self'"],
        'object-src': ["'none'"],
        'script-src': ["'self'"],
        'script-src-attr': ["'none'"],
        'style-src': ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'https://lh3.googleusercontent.com', 'https://*.googleusercontent.com'],
        'connect-src': ["'self'"],
        'upgrade-insecure-requests': isProduction ? [] : null,
      },
    },
  }));

  app.use(cors({
    origin(origin, callback) {
      if (!origin || appEnv.corsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    maxAge: 86400,
  }));

  const authStatusLimiter = createRateLimiter({ max: rateLimits.authStatusMax ?? 60 });
  const productsLimiter = createRateLimiter({ max: rateLimits.productsMax ?? 120 });
  const gamesLimiter = createRateLimiter({ max: rateLimits.gamesMax ?? 60 });
  const visitsLimiter = createRateLimiter({ max: rateLimits.visitsMax ?? 20 });

  app.get('/api/auth/status', authStatusLimiter, (request, response) => {
    response.set('Cache-Control', 'no-store');
    response.json({ enabled: Boolean(auth), providers: auth ? authProviders : [] });
  });

  // El handler de Better Auth va antes de express.json() según la integración oficial para Express 5.
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

  app.use('/api/health', createHealthRouter({
    isProduction,
    hasDatabaseUri: Boolean(appEnv.MONGODB_URI),
  }));
  app.use('/api/products', productsLimiter, createProductsRouter({ isProduction }));
  app.use('/api/games', gamesLimiter, createGamesRouter({ auth }));
  app.use('/api/visits', visitsLimiter, createVisitsRouter());

  if (isProduction) {
    app.get(['/cuidados', '/cuidados/'], (request, response) => {
      response.redirect(301, '/cuidados.html');
    });

    app.use(express.static(frontendDirectory, {
      setHeaders(response, filePath) {
        if (filePath.includes(`${sep}assets${sep}`) || filePath.includes('/assets/')) {
          response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith('.html')) {
          response.setHeader('Cache-Control', 'no-cache');
        }
      },
    }));
  }

  app.use((request, response) => {
    const looksLikeStaticAsset = /\.[a-z0-9]{2,6}$/i.test(request.path);

    if (
      isProduction
      && request.method === 'GET'
      && !request.path.startsWith('/api/')
      && !looksLikeStaticAsset
      && request.accepts('html')
    ) {
      return response
        .status(404)
        .set('Cache-Control', 'no-store')
        .type('html')
        .send(notFoundHtml);
    }

    return response.status(404).json({
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

    if (statusCode >= 500) {
      if (isProduction) {
        console.error('[api:error]', {
          method: request.method,
          path: request.path,
          statusCode,
          code,
          message: error.message,
        });
      } else {
        console.error(error);
      }
    }

    return response.status(statusCode).json({ error: { code, message } });
  });

  return app;
}
