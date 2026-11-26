import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { startTestServer } from './helpers/http.js';

function createFakeAuth(sessionData) {
  return {
    handler: async () => new Response(null, { status: 404 }),
    api: { getSession: async () => sessionData },
  };
}

test('los juegos responden 503 mientras la autenticación no esté configurada', async (context) => {
  const origin = await startTestServer(createApp(), context);
  const response = await fetch(`${origin}/api/games`);

  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).error.code, 'AUTH_NOT_CONFIGURED');
});

test('los juegos exigen una sesión iniciada', async (context) => {
  const app = createApp({ auth: createFakeAuth(null), authProviders: ['google'] });
  const origin = await startTestServer(app, context);
  const response = await fetch(`${origin}/api/games`);

  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).error.code, 'AUTH_REQUIRED');
});

test('una sesión válida desbloquea la lista de juegos', async (context) => {
  const app = createApp({
    auth: createFakeAuth({ user: { name: 'Ana' }, session: { id: 'session-1' } }),
    authProviders: ['google'],
  });
  const origin = await startTestServer(app, context);
  const response = await fetch(`${origin}/api/games`);
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.meta.unlocked, true);
  assert.equal(result.meta.playerName, 'Ana');
  assert.ok(result.data.length >= 1);
  assert.equal(result.data[0].slug, 'dionaea-strike');
});

test('un juego inexistente devuelve un error predecible', async (context) => {
  const app = createApp({
    auth: createFakeAuth({ user: { name: 'Ana' }, session: { id: 'session-1' } }),
    authProviders: ['google'],
  });
  const origin = await startTestServer(app, context);
  const response = await fetch(`${origin}/api/games/juego-inexistente`);

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, 'GAME_NOT_FOUND');
});
