import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { startTestServer } from './helpers/http.js';

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
