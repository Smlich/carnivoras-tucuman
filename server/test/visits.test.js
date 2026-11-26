import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { startTestServer } from './helpers/http.js';

test('GET /api/visits responde 503 sin caché cuando MongoDB no está conectado', async (context) => {
  const origin = await startTestServer(createApp(), context);
  const response = await fetch(`${origin}/api/visits`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(body.error.code, 'COUNTER_UNAVAILABLE');
});

test('POST /api/visits exige cabecera X-Counter-Request', async (context) => {
  const origin = await startTestServer(createApp(), context);
  const response = await fetch(`${origin}/api/visits`, { method: 'POST' });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'INVALID_REQUEST');
});

test('POST /api/visits con cabecera responde 503 sin MongoDB y respeta rate limit', async (context) => {
  const origin = await startTestServer(createApp({ rateLimits: { visitsMax: 1 } }), context);

  const first = await fetch(`${origin}/api/visits`, {
    method: 'POST',
    headers: { 'X-Counter-Request': '1' },
  });
  assert.equal(first.status, 503);
  assert.equal((await first.json()).error.code, 'COUNTER_UNAVAILABLE');

  const second = await fetch(`${origin}/api/visits`, {
    method: 'POST',
    headers: { 'X-Counter-Request': '1' },
  });
  assert.equal(second.status, 429);
  assert.equal((await second.json()).error.code, 'RATE_LIMIT_EXCEEDED');
});
