import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { startTestServer } from './helpers/http.js';

const productionEnv = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/carnivoras_tucuman',
  corsOrigins: ['https://carnivorastucuman.com'],
};

test('expone si OAuth está habilitado sin revelar configuración privada', async (context) => {
  const origin = await startTestServer(createApp(), context);
  const statusResponse = await fetch(`${origin}/api/auth/status`);
  assert.equal(statusResponse.status, 200);
  assert.equal(statusResponse.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await statusResponse.json(), { enabled: false, providers: [] });

  const signInResponse = await fetch(`${origin}/api/auth/sign-in/social`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'google' }),
  });
  assert.equal(signInResponse.status, 503);
  assert.deepEqual(await signInResponse.json(), {
    error: {
      code: 'AUTH_NOT_CONFIGURED',
      message: 'El inicio de sesión estará disponible cuando se configure MongoDB y al menos un proveedor social.',
    },
  });
});

test('informa estado degradado en desarrollo y 503 en producción cuando MongoDB no está conectado', async (context) => {
  const devOrigin = await startTestServer(createApp({ env: { NODE_ENV: 'development', corsOrigins: [] } }), context);
  const devHealth = await fetch(`${devOrigin}/api/health`);
  const devBody = await devHealth.json();

  assert.equal(devHealth.status, 200);
  assert.equal(devHealth.headers.get('cache-control'), 'no-store');
  assert.equal(devBody.data.status, 'degraded');
  assert.equal(devBody.data.database, 'not-configured');
  assert.equal(devBody.data.catalogMode, 'demo-catalog');

  const prodOrigin = await startTestServer(createApp({ env: productionEnv }), context);
  const prodHealth = await fetch(`${prodOrigin}/api/health`);
  const prodBody = await prodHealth.json();

  assert.equal(prodHealth.status, 503);
  assert.equal(prodBody.data.status, 'unavailable');
  assert.equal(prodBody.data.database, 'disconnected');
  assert.equal(prodBody.data.catalogMode, 'unavailable');
});

test('en producción nunca vuelve a precios demo si MongoDB no está conectado', async (context) => {
  const origin = await startTestServer(createApp({ env: productionEnv }), context);

  for (const path of ['/api/products', '/api/products/venus-pequena']) {
    const response = await fetch(`${origin}${path}`);
    const body = await response.json();

    assert.equal(response.status, 503, path);
    assert.equal(response.headers.get('cache-control'), 'no-store', path);
    assert.equal(body.error.code, 'DATABASE_UNAVAILABLE', path);
  }
});

test('rechaza slugs inválidos con error de validación', async (context) => {
  const origin = await startTestServer(createApp(), context);
  const response = await fetch(`${origin}/api/products/slug_invalido!`);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
});

test('limita peticiones repetidas con estado 429 y cabecera Retry-After', async (context) => {
  const origin = await startTestServer(createApp({ rateLimits: { productsMax: 2 } }), context);

  assert.equal((await fetch(`${origin}/api/products`)).status, 200);
  assert.equal((await fetch(`${origin}/api/products`)).status, 200);

  const limited = await fetch(`${origin}/api/products`);
  const body = await limited.json();

  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);
  assert.equal(body.error.code, 'RATE_LIMIT_EXCEEDED');
});

test('envía cabeceras CSP explícitas y respeta orígenes permitidos de CORS', async (context) => {
  const origin = await startTestServer(createApp({ env: productionEnv }), context);

  const allowedResponse = await fetch(`${origin}/api/auth/status`, {
    headers: { Origin: 'https://carnivorastucuman.com' },
  });
  const csp = allowedResponse.headers.get('content-security-policy') || '';

  assert.equal(allowedResponse.headers.get('access-control-allow-origin'), 'https://carnivorastucuman.com');
  assert.match(csp, /frame-src 'self'/);
  assert.match(csp, /lh3\.googleusercontent\.com/);

  const disallowedResponse = await fetch(`${origin}/api/auth/status`, {
    headers: { Origin: 'https://sitio-externo.example' },
  });
  assert.equal(disallowedResponse.headers.get('access-control-allow-origin'), null);
});

test('redirige secciones HTML y entrega 404 HTML o JSON según la ruta en producción', async (context) => {
  const origin = await startTestServer(createApp({ env: productionEnv }), context);

  for (const page of ['catalogo', 'vivero', 'cuidados', 'juegos', 'contacto', 'admin']) {
    const redirectResponse = await fetch(`${origin}/${page}`, { redirect: 'manual' });
    assert.equal(redirectResponse.status, 301);
    assert.equal(redirectResponse.headers.get('location'), `/${page}.html`);

    const trailingResponse = await fetch(`${origin}/${page}/`, { redirect: 'manual' });
    assert.equal(trailingResponse.status, 301);
    assert.equal(trailingResponse.headers.get('location'), `/${page}.html`);
  }

  const htmlNotFound = await fetch(`${origin}/pagina-que-no-existe`, {
    headers: { Accept: 'text/html' },
  });
  assert.equal(htmlNotFound.status, 404);
  assert.match(htmlNotFound.headers.get('content-type') || '', /text\/html/);
  assert.match(await htmlNotFound.text(), /No encontramos esa página/);

  const apiNotFound = await fetch(`${origin}/api/ruta-inexistente`, {
    headers: { Accept: 'text/html, application/json' },
  });
  assert.equal(apiNotFound.status, 404);
  assert.equal((await apiNotFound.json()).error.code, 'ROUTE_NOT_FOUND');
});
