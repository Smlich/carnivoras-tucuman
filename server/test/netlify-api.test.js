import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiHandler } from '../../netlify/functions/api.mjs';
import { createAdminToken, hashPasswordPbkdf2 } from '../src/auth/admin-session.js';
import { defaultAdminProducts } from '../../src/data/site-defaults.js';

const ORIGIN = 'https://test.local';
const ADMIN_SECRET = 'a'.repeat(40);

const testEnv = {
  ADMIN_EMAIL: 'admin@example.test',
  ADMIN_PASSWORD_HASH: 'hash-de-prueba',
  ADMIN_SESSION_SECRET: ADMIN_SECRET,
};

// Almacén en memoria con la misma semántica condicional (ETag) que Netlify Blobs.
function createFakeStore() {
  const data = new Map();
  let etagCounter = 0;
  const tick = () => new Promise((resolve) => setImmediate(resolve));

  return {
    data,
    async get(key) {
      await tick();
      return data.has(key) ? structuredClone(data.get(key).value) : null;
    },
    async getWithMetadata(key) {
      await tick();
      if (!data.has(key)) return null;
      const entry = data.get(key);
      return { data: structuredClone(entry.value), etag: entry.etag, metadata: entry.metadata || {} };
    },
    async setJSON(key, value, options = {}) {
      await tick();
      const existing = data.get(key);
      if (options.onlyIfNew && existing) return { modified: false };
      if (options.onlyIfMatch && existing?.etag !== options.onlyIfMatch) return { modified: false };
      etagCounter += 1;
      const etag = `etag-${etagCounter}`;
      data.set(key, { value: structuredClone(value), etag, metadata: options.metadata || {} });
      return { modified: true, etag };
    },
    async set(key, value, options = {}) {
      await tick();
      etagCounter += 1;
      data.set(key, { value, etag: `etag-${etagCounter}`, metadata: options.metadata || {} });
      return { modified: true };
    },
    async delete(key) {
      await tick();
      data.delete(key);
    },
  };
}

function setup(env = testEnv, rateLimits = {}) {
  const store = createFakeStore();
  const mediaStore = createFakeStore();
  const handler = createApiHandler({
    getSiteStore: () => store,
    getMediaStore: () => mediaStore,
    env: (name) => env[name],
    rateLimits,
  });
  const call = (path, { method = 'GET', body, headers = {} } = {}) => handler(new Request(`${ORIGIN}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  }));
  return { store, mediaStore, call };
}

function adminHeaders() {
  const token = createAdminToken({ email: testEnv.ADMIN_EMAIL, name: 'Admin' }, ADMIN_SECRET);
  return { cookie: `ct_admin_session=${encodeURIComponent(token)}`, 'x-admin-request': '1', origin: ORIGIN };
}

const validOrder = (name = 'Ana') => ({
  customerName: name,
  items: [{ id: 'venus-pequena', name: 'Venus atrapamoscas', price: 18500, quantity: 2 }],
});

const newProduct = (id) => ({
  id,
  name: `Planta ${id}`,
  species: 'Dionaea muscipula',
  description: 'Planta de prueba.',
  price: 1000,
  category: 'venus',
  categoryLabel: 'Venus',
  image: '/images/catalog/test.png',
  imageAlt: 'Foto de prueba',
  note: 'Nota de prueba',
});

test('GET /api/health informa el almacenamiento de Netlify Blobs', async () => {
  const { call } = setup();
  const response = await call('/api/health');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.database, 'netlify-blobs');
});

test('POST /api/orders crea y guarda un pedido usando precios del catálogo vigente', async () => {
  const { call, store } = setup();
  const response = await call('/api/orders', {
    method: 'POST',
    body: {
      customerName: 'Ana',
      items: [{ id: 'venus-pequena', name: 'Nombre manipulado', price: 1, quantity: 2 }],
    },
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.match(body.data.id, /^PED-/);
  assert.equal(body.data.items[0].name, 'Venus atrapamoscas pequeña');
  assert.equal(body.data.items[0].price, 6000);
  assert.equal(body.data.totalARS, 12000);
  assert.equal(store.data.get('orders').value.length, 1);

  const missingProduct = await call('/api/orders', {
    method: 'POST',
    body: { customerName: 'Ana', items: [{ id: 'planta-falsa', name: 'X', price: 100, quantity: 1 }] },
  });
  assert.equal(missingProduct.status, 400);
  assert.equal((await missingProduct.json()).error.code, 'INVALID_ORDER_ITEM');

  await call('/api/admin/products/venus-pequena', {
    method: 'PUT',
    body: { ...defaultAdminProducts.find((item) => item.id === 'venus-pequena'), stockStatus: 'unavailable' },
    headers: adminHeaders(),
  });
  const unavailable = await call('/api/orders', { method: 'POST', body: validOrder() });
  assert.equal(unavailable.status, 409);
  assert.equal((await unavailable.json()).error.code, 'PRODUCT_UNAVAILABLE');
});

test('POST /api/orders no pierde pedidos simultáneos', async () => {
  const { call, store } = setup();
  const responses = await Promise.all(
    Array.from({ length: 10 }, (_, index) => call('/api/orders', { method: 'POST', body: validOrder(`Cliente ${index}`) })),
  );

  assert.deepEqual(responses.map((response) => response.status), Array(10).fill(201));
  const stored = store.data.get('orders').value;
  assert.equal(stored.length, 10);
  assert.equal(new Set(stored.map((order) => order.id)).size, 10);
});

test('POST /api/orders rechaza otros orígenes y pedidos vacíos', async () => {
  const { call } = setup();

  const foreign = await call('/api/orders', {
    method: 'POST',
    body: validOrder(),
    headers: { origin: 'https://evil.example' },
  });
  assert.equal(foreign.status, 403);

  const empty = await call('/api/orders', { method: 'POST', body: { items: [] } });
  assert.equal(empty.status, 400);
  assert.equal((await empty.json()).error.code, 'VALIDATION_ERROR');
});

test('GET /api/admin/orders exige sesión de administrador', async () => {
  const { call } = setup();
  const response = await call('/api/admin/orders');
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, 'ADMIN_AUTH_REQUIRED');
});

test('el administrador actualiza el estado de un pedido y recibe 404 si no existe', async () => {
  const { call } = setup();
  const created = await (await call('/api/orders', { method: 'POST', body: validOrder() })).json();
  const id = created.data.id;

  const patched = await call(`/api/admin/orders/${id}`, {
    method: 'PATCH',
    body: { status: 'confirmado', adminNotes: 'Coordinado' },
    headers: adminHeaders(),
  });
  assert.equal(patched.status, 200);
  assert.equal((await patched.json()).data.status, 'confirmado');

  const listed = await (await call('/api/admin/orders', { headers: adminHeaders() })).json();
  assert.equal(listed.data[0].status, 'confirmado');

  const missingPatch = await call('/api/admin/orders/PED-NO-EXISTE', {
    method: 'PATCH',
    body: { status: 'entregado' },
    headers: adminHeaders(),
  });
  assert.equal(missingPatch.status, 404);

  const missingDelete = await call('/api/admin/orders/PED-NO-EXISTE', { method: 'DELETE', headers: adminHeaders() });
  assert.equal(missingDelete.status, 404);

  const deleted = await call(`/api/admin/orders/${id}`, { method: 'DELETE', headers: adminHeaders() });
  assert.equal(deleted.status, 200);
});

test('las mutaciones de administrador exigen la cabecera de seguridad', async () => {
  const { call } = setup();
  const headers = adminHeaders();
  delete headers['x-admin-request'];
  const response = await call('/api/admin/orders/PED-X', { method: 'DELETE', headers });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'MISSING_ADMIN_HEADER');
});

test('altas simultáneas de productos se conservan junto con los predeterminados', async () => {
  const { call, store } = setup();
  const responses = await Promise.all(
    ['planta-uno', 'planta-dos', 'planta-tres'].map((id) => call('/api/admin/products', {
      method: 'POST',
      body: newProduct(id),
      headers: adminHeaders(),
    })),
  );

  assert.deepEqual(responses.map((response) => response.status), [201, 201, 201]);
  const stored = store.data.get('catalog-products').value;
  assert.equal(stored.length, defaultAdminProducts.length + 3);

  const duplicate = await call('/api/admin/products', {
    method: 'POST',
    body: newProduct('planta-uno'),
    headers: adminHeaders(),
  });
  assert.equal(duplicate.status, 409);
});

test('POST /api/orders respeta límite de consultas por IP', async () => {
  const { call } = setup(testEnv, { ordersMax: 2 });
  const headers = { 'x-nf-client-connection-ip': '203.0.113.10' };

  assert.equal((await call('/api/orders', { method: 'POST', body: validOrder(), headers })).status, 201);
  assert.equal((await call('/api/orders', { method: 'POST', body: validOrder(), headers })).status, 201);

  const limited = await call('/api/orders', { method: 'POST', body: validOrder(), headers });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);
  assert.equal((await limited.json()).error.code, 'RATE_LIMIT_EXCEEDED');
});

test('POST /api/admin/auth/login bloquea temporalmente tras intentos fallidos repetidos', async () => {
  const envWithPass = {
    ...testEnv,
    ADMIN_PASSWORD_HASH: hashPasswordPbkdf2('ClaveCorrecta#2026'),
  };
  const { call } = setup(envWithPass, { loginMax: 2 });
  const headers = { 'x-admin-request': '1', origin: ORIGIN, 'x-nf-client-connection-ip': '203.0.113.20' };

  const bad = () => call('/api/admin/auth/login', {
    method: 'POST',
    body: { email: testEnv.ADMIN_EMAIL, password: 'incorrecta' },
    headers,
  });

  assert.equal((await bad()).status, 401);
  assert.equal((await bad()).status, 401);
  const locked = await bad();
  assert.equal(locked.status, 429);
  assert.ok(Number(locked.headers.get('retry-after')) >= 1);
  assert.equal((await locked.json()).error.code, 'TOO_MANY_LOGIN_ATTEMPTS');
});

test('PUT /api/admin/auth/account revoca sesiones previas y exige clave en Google-only sin password', async () => {
  const envWithPass = {
    ...testEnv,
    ADMIN_PASSWORD_HASH: hashPasswordPbkdf2('ClaveInicial#2026'),
  };
  const { call } = setup(envWithPass);
  const oldHeaders = adminHeaders();

  const wrongCurrent = await call('/api/admin/auth/account', {
    method: 'PUT',
    body: { email: testEnv.ADMIN_EMAIL, name: 'Admin', currentPassword: 'mala', newPassword: 'NuevaClave#2026' },
    headers: oldHeaders,
  });
  assert.equal(wrongCurrent.status, 401);

  const updated = await call('/api/admin/auth/account', {
    method: 'PUT',
    body: { email: testEnv.ADMIN_EMAIL, name: 'Admin', currentPassword: 'ClaveInicial#2026', newPassword: 'NuevaClave#2026' },
    headers: oldHeaders,
  });
  assert.equal(updated.status, 200);
  const setCookie = updated.headers.get('set-cookie') || '';
  const newCookie = setCookie.split(';')[0];

  const oldTokenRejected = await call('/api/admin/orders', { headers: { cookie: oldHeaders.cookie } });
  assert.equal(oldTokenRejected.status, 401);

  const newTokenAccepted = await call('/api/admin/orders', { headers: { cookie: newCookie } });
  assert.equal(newTokenAccepted.status, 200);

  const googleOnlyEnv = {
    ADMIN_EMAILS: 'googleadmin@example.test',
    ADMIN_SESSION_SECRET: ADMIN_SECRET,
    GOOGLE_CLIENT_ID: 'cid',
    GOOGLE_CLIENT_SECRET: 'csec',
  };
  const { call: callGoogle } = setup(googleOnlyEnv);
  const googleToken = createAdminToken({ email: 'googleadmin@example.test', name: 'GAdmin', method: 'google' }, ADMIN_SECRET);
  const googleHeaders = { cookie: `ct_admin_session=${encodeURIComponent(googleToken)}`, 'x-admin-request': '1', origin: ORIGIN };

  const missingNew = await callGoogle('/api/admin/auth/account', {
    method: 'PUT',
    body: { email: 'googleadmin@example.test', name: 'GAdmin' },
    headers: googleHeaders,
  });
  assert.equal(missingNew.status, 400);
  assert.equal((await missingNew.json()).error.code, 'NEW_PASSWORD_REQUIRED');

  const okSet = await callGoogle('/api/admin/auth/account', {
    method: 'PUT',
    body: { email: 'googleadmin@example.test', name: 'GAdmin', newPassword: 'NuevaClave#2026' },
    headers: googleHeaders,
  });
  assert.equal(okSet.status, 200);
});

test('GET /api/products valida parámetros y media subida se sirve desde Blobs', async () => {
  const { call } = setup();

  const badCategory = await call('/api/products?category=invalida');
  assert.equal(badCategory.status, 400);
  assert.equal((await badCategory.json()).error.code, 'VALIDATION_ERROR');

  const badPage = await call('/api/products?page=abc');
  assert.equal(badPage.status, 400);

  const forgedMedia = await call('/api/admin/media', {
    method: 'POST',
    body: { filename: 'falsa.png', contentType: 'image/png', dataBase64: Buffer.from('no-es-png-real-12345').toString('base64') },
    headers: adminHeaders(),
  });
  assert.equal(forgedMedia.status, 400);

  const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02, 0x03]);
  const uploaded = await call('/api/admin/media', {
    method: 'POST',
    body: { filename: 'foto-test.png', contentType: 'image/png', dataBase64: validPng.toString('base64') },
    headers: adminHeaders(),
  });
  assert.equal(uploaded.status, 201);
  const uploadedBody = await uploaded.json();
  assert.match(uploadedBody.data.url, /^\/api\/media\/.+-foto-test\.png$/);

  const fetched = await call(uploadedBody.data.url);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.headers.get('content-type'), 'image/png');
  assert.equal(Buffer.from(await fetched.arrayBuffer()).equals(validPng), true);
});

test('POST /api/orders guarda notas del cliente y la limpieza borra medios huérfanos sin tocar compartidos', async () => {
  const { call, mediaStore } = setup();

  const notedOrder = await call('/api/orders', {
    method: 'POST',
    body: { ...validOrder('Sofía'), notes: 'Barrio Sur, por la tarde' },
  });
  assert.equal(notedOrder.status, 201);
  assert.equal((await notedOrder.json()).data.notes, 'Barrio Sur, por la tarde');

  const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02, 0x03]);
  const uploadA = await (await call('/api/admin/media', {
    method: 'POST',
    body: { filename: 'sola.png', contentType: 'image/png', dataBase64: validPng.toString('base64') },
    headers: adminHeaders(),
  })).json();
  const uploadShared = await (await call('/api/admin/media', {
    method: 'POST',
    body: { filename: 'compartida.png', contentType: 'image/png', dataBase64: validPng.toString('base64') },
    headers: adminHeaders(),
  })).json();

  await call('/api/admin/products', {
    method: 'POST',
    body: { ...newProduct('prod-solo'), image: uploadA.data.url },
    headers: adminHeaders(),
  });
  await call('/api/admin/products', {
    method: 'POST',
    body: { ...newProduct('prod-compartido'), image: uploadShared.data.url },
    headers: adminHeaders(),
  });
  await call('/api/admin/gallery', {
    method: 'POST',
    body: {
      id: 'foto-compartida',
      src: uploadShared.data.url,
      label: 'Venus',
      title: 'Foto compartida',
      description: 'Descripción de prueba',
      alt: 'Alt de prueba',
    },
    headers: adminHeaders(),
  });

  await call('/api/admin/products/prod-solo', { method: 'DELETE', headers: adminHeaders() });
  assert.equal(mediaStore.data.has(uploadA.data.key), false);

  await call('/api/admin/products/prod-compartido', { method: 'DELETE', headers: adminHeaders() });
  assert.equal(mediaStore.data.has(uploadShared.data.key), true);

  await call('/api/admin/gallery/foto-compartida', { method: 'DELETE', headers: adminHeaders() });
  assert.equal(mediaStore.data.has(uploadShared.data.key), false);
});
