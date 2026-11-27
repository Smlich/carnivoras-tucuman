import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiHandler } from '../../netlify/functions/api.mjs';
import { createAdminToken, createUserToken, hashPasswordPbkdf2 } from '../src/auth/admin-session.js';
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

function setup(env = testEnv, rateLimits = {}, fetchImpl = globalThis.fetch) {
  const store = createFakeStore();
  const mediaStore = createFakeStore();
  const handler = createApiHandler({
    getSiteStore: () => store,
    getMediaStore: () => mediaStore,
    env: (name) => env[name],
    rateLimits,
    fetchImpl,
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

test('endpoints de asistente Gemini validan origen, fotos, cuota diaria, admin auth y recomendaciones', async () => {
  const unconfigured = setup(testEnv);
  assert.equal((await (await unconfigured.call('/api/assistant/status')).json()).data.enabled, false);
  const notConfiguredCare = await unconfigured.call('/api/assistant/care', {
    method: 'POST',
    body: { question: '¿Qué agua uso?' },
  });
  assert.equal(notConfiguredCare.status, 503);

  let callMode = 'care';
  const mockGeminiFetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: callMode === 'care'
              ? JSON.stringify({
                severity: 'leve',
                summary: 'Usá agua de lluvia o destilada.',
                possibleCauses: ['Riego con agua dura'],
                steps: ['Cambiá al método de bandeja con agua destilada.'],
                avoid: ['No uses agua de canilla'],
                tucumanTip: 'Evitá sol directo entre 12 y 16 h.',
                recommendedProductIds: ['venus-pequena'],
              })
              : callMode === 'recommend'
                ? JSON.stringify({
                  intro: 'Te conviene empezar con Venus.',
                  recommendations: [
                    { productId: 'venus-pequena', reason: 'Ideal para empezar en Tucumán.', careSummary: 'Sol suave y bandeja.' },
                  ],
                  generalTip: 'Siempre agua de lluvia.',
                })
                : JSON.stringify({
                  suggestedTitle: 'Venus atrapamoscas juvenil',
                  description: 'Ejemplar sano en crecimiento.',
                  altText: 'Venus atrapamoscas con trampas abiertas.',
                  instagramCaption: 'Disponible #CarnivorasTucuman',
                  whatsappPitch: 'Tenemos Venus listas para retirar.',
                }),
          }],
        },
      }],
    }),
  });

  const aiEnv = { ...testEnv, GEMINI_API_KEY: 'AIzaSyTestKeyExample987654', GEMINI_DAILY_LIMIT: '3' };
  const { call } = setup(aiEnv, { assistantMax: 10 }, mockGeminiFetch);

  assert.equal((await (await call('/api/assistant/status')).json()).data.enabled, true);

  const foreignCare = await call('/api/assistant/care', {
    method: 'POST',
    body: { question: '¿Qué hago con mi planta?' },
    headers: { origin: 'https://otro.example' },
  });
  assert.equal(foreignCare.status, 403);

  const forgedImageCare = await call('/api/assistant/care', {
    method: 'POST',
    body: {
      question: '¿Qué tiene mi planta?',
      image: { contentType: 'image/png', dataBase64: Buffer.from('falsa-imagen-123456').toString('base64') },
    },
  });
  assert.equal(forgedImageCare.status, 400);
  assert.equal((await forgedImageCare.json()).error.code, 'INVALID_MEDIA');

  const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02, 0x03]);
  callMode = 'care';
  const okCare = await call('/api/assistant/care', {
    method: 'POST',
    body: {
      question: 'Tiene hojas viejas oscuras',
      species: 'Venus',
      image: { contentType: 'image/png', dataBase64: validPng.toString('base64') },
    },
  });
  assert.equal(okCare.status, 200);
  const okCareBody = await okCare.json();
  assert.equal(okCareBody.data.recommendedProducts[0].id, 'venus-pequena');

  callMode = 'recommend';
  const okRec = await call('/api/assistant/recommend', {
    method: 'POST',
    body: { query: 'Balcón con sol de mañana en Yerba Buena', budgetMaxARS: 10000 },
  });
  assert.equal(okRec.status, 200);
  assert.equal((await okRec.json()).data.recommendations[0].product.price, 6000);

  callMode = 'care';
  const thirdCall = await call('/api/assistant/care', {
    method: 'POST',
    body: { question: 'Consulta número 3 del día' },
  });
  assert.equal(thirdCall.status, 200);

  const fourthLimited = await call('/api/assistant/care', {
    method: 'POST',
    body: { question: 'Consulta 4 supera cuota diaria' },
  });
  assert.equal(fourthLimited.status, 429);
  assert.equal((await fourthLimited.json()).error.code, 'ASSISTANT_DAILY_LIMIT');

  assert.equal((await call('/api/admin/assistant/status')).status, 401);

  const uploaded = await (await call('/api/admin/media', {
    method: 'POST',
    body: { filename: 'venus-ai.png', contentType: 'image/png', dataBase64: validPng.toString('base64') },
    headers: adminHeaders(),
  })).json();

  callMode = 'admin';
  const adminStatus = await (await call('/api/admin/assistant/status', { headers: adminHeaders() })).json();
  assert.equal(adminStatus.data.usedToday, 3);
  assert.equal(adminStatus.data.dailyLimit, 3);

  const adminCopy = await call('/api/admin/assistant/copy', {
    method: 'POST',
    body: { target: 'product', name: 'Venus', imageUrl: uploaded.data.url },
    headers: adminHeaders(),
  });
  assert.equal(adminCopy.status, 200);
  assert.equal((await adminCopy.json()).data.suggestedTitle, 'Venus atrapamoscas juvenil');
});

test('Dionaea Strike restringe configuración a Admin y persiste puntajes de usuarios', async () => {
  const { call } = setup();

  assert.equal((await call('/api/games/dionaea-strike/config')).status, 401);
  assert.equal((await call('/api/games/dionaea-strike/scores', { method: 'POST', body: { score: 100 } })).status, 401);

  const playerToken = createUserToken({ id: 'u-1', email: 'cliente@example.com', name: 'Sofía' }, ADMIN_SECRET);
  const playerHeaders = { cookie: `ct_user_session=${encodeURIComponent(playerToken)}`, origin: ORIGIN };

  const playerTryAdminSave = await call('/api/admin/games/dionaea-strike/config', {
    method: 'PUT',
    body: {
      gameTitle: 'Hack',
      player: {},
      species: {},
      enemies: {},
      waves: [{}],
      bosses: [{}],
    },
    headers: { ...playerHeaders, 'x-admin-request': '1' },
  });
  assert.equal(playerTryAdminSave.status, 401);

  const sampleGameConfig = {
    gameTitle: 'DIONAEA STRIKE PRO',
    gameSubtitle: 'Balance Admin',
    player: { maxHp: 7 },
    species: { dionaea: { damage: 15 } },
    enemies: { drone: { hp: 20 } },
    waves: [{ level: 1 }],
    bosses: [{ name: 'Mosca Reina' }],
  };
  const adminSave = await call('/api/admin/games/dionaea-strike/config', {
    method: 'PUT',
    body: sampleGameConfig,
    headers: adminHeaders(),
  });
  assert.equal(adminSave.status, 200);

  const playerSessionRes = await call('/api/admin/auth/session', { headers: playerHeaders });
  assert.equal(playerSessionRes.status, 200);
  assert.equal((await playerSessionRes.json()).data.authenticated, false);

  const playerReadConfig = await call('/api/games/dionaea-strike/config', { headers: playerHeaders });
  assert.equal(playerReadConfig.status, 200);
  const playerReadBody = await playerReadConfig.json();
  assert.equal(playerReadBody.data.gameTitle, 'DIONAEA STRIKE PRO');
  assert.equal(playerReadBody.meta.isAdmin, false);

  // Admin autenticado vía Google (solo cookie ct_user_session) también recibe permisos Admin reales
  const googleAdminToken = createUserToken({
    id: 'adm-1',
    email: testEnv.ADMIN_EMAIL,
    name: 'Facundo Admin',
    provider: 'google',
    emailVerified: true,
  }, ADMIN_SECRET);
  const googleAdminHeaders = { cookie: `ct_user_session=${encodeURIComponent(googleAdminToken)}`, origin: ORIGIN };

  const googleAdminSessionRes = await call('/api/admin/auth/session', { headers: googleAdminHeaders });
  assert.equal(googleAdminSessionRes.status, 200);
  const googleAdminSessionBody = await googleAdminSessionRes.json();
  assert.equal(googleAdminSessionBody.data.authenticated, true);
  assert.equal(googleAdminSessionBody.data.user.email, testEnv.ADMIN_EMAIL);

  const googleAdminReadCfg = await call('/api/games/dionaea-strike/config', { headers: googleAdminHeaders });
  assert.equal(googleAdminReadCfg.status, 200);
  assert.equal((await googleAdminReadCfg.json()).meta.isAdmin, true);

  const googleAdminPutCfg = await call('/api/admin/games/dionaea-strike/config', {
    method: 'PUT',
    body: { ...sampleGameConfig, gameTitle: 'DIONAEA STRIKE GOOGLE ADMIN' },
    headers: { ...googleAdminHeaders, 'x-admin-request': '1' },
  });
  assert.equal(googleAdminPutCfg.status, 200);
  assert.equal((await googleAdminPutCfg.json()).data.gameTitle, 'DIONAEA STRIKE GOOGLE ADMIN');

  const scoreSave = await call('/api/games/dionaea-strike/scores', {
    method: 'POST',
    body: { score: 4500, highScore: 4500, maxCombo: 18, levelReached: 3, victory: false, petId: 'roy' },
    headers: playerHeaders,
  });
  assert.equal(scoreSave.status, 201);
  const scoreBody = await scoreSave.json();
  assert.equal(scoreBody.data.playerName, 'Sofía');
  assert.equal(scoreBody.data.score, 4500);

  const adminScores = await call('/api/admin/games/dionaea-strike/scores', { headers: adminHeaders() });
  assert.equal(adminScores.status, 200);
  assert.equal((await adminScores.json()).data.length, 1);
});

test('fallos >= 500 de Gemini reembolsan cuota, /scores aplica rate limit y /auth/status + /site-data incluyen estado', async () => {
  const failThenOkEnv = {
    ...testEnv,
    GEMINI_API_KEY: 'AIzaSyTestKeyExample987654',
    GEMINI_DAILY_LIMIT: '1',
    GOOGLE_CLIENT_ID: 'cid',
    GOOGLE_CLIENT_SECRET: 'csec',
  };

  let shouldFailUpstream = true;
  const mockFetch = async () => {
    if (shouldFailUpstream) {
      return { ok: false, status: 502, text: async () => 'upstream bad gateway' };
    }
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                intro: 'Te recomendamos empezar con Venus.',
                recommendations: [],
                generalTip: 'Usá agua de lluvia.',
              }),
            }],
          },
        }],
      }),
    };
  };

  const { call, store } = setup(failThenOkEnv, { assistantMax: 10, scoresMax: 2 }, mockFetch);

  const siteDataRes = await call('/api/site-data');
  assert.equal(siteDataRes.status, 200);
  assert.equal((await siteDataRes.json()).data.assistantEnabled, true);

  const failedRec = await call('/api/assistant/recommend', {
    method: 'POST',
    body: { query: 'Quiero una carnívora fácil' },
  });
  assert.equal(failedRec.status, 502);

  shouldFailUpstream = false;
  const okAfterRefund = await call('/api/assistant/recommend', {
    method: 'POST',
    body: { query: 'Quiero una carnívora fácil' },
  });
  assert.equal(okAfterRefund.status, 200);

  const quotaBlob = store.data.get('assistant-daily-quota')?.value || {};
  const todayBucket = Object.values(quotaBlob)[0];
  assert.equal(todayBucket.public, 1);

  const playerToken = createUserToken({ id: 'u-2', email: 'jugador@example.com', name: 'Lucas' }, ADMIN_SECRET);
  const playerHeaders = {
    cookie: `ct_user_session=${encodeURIComponent(playerToken)}`,
    origin: ORIGIN,
    'x-nf-client-connection-ip': '203.0.113.88',
  };

  const authStatusRes = await call('/api/auth/status', { headers: playerHeaders });
  assert.equal(authStatusRes.status, 200);
  const authStatusBody = await authStatusRes.json();
  assert.equal(authStatusBody.enabled, true);
  assert.equal(authStatusBody.session.user.email, 'jugador@example.com');

  assert.equal((await call('/api/games/dionaea-strike/scores', { method: 'POST', body: { score: 100 }, headers: playerHeaders })).status, 201);
  assert.equal((await call('/api/games/dionaea-strike/scores', { method: 'POST', body: { score: 200 }, headers: playerHeaders })).status, 201);
  const limitedScore = await call('/api/games/dionaea-strike/scores', { method: 'POST', body: { score: 300 }, headers: playerHeaders });
  assert.equal(limitedScore.status, 429);
  assert.ok(Number(limitedScore.headers.get('retry-after')) >= 1);
  assert.equal((await limitedScore.json()).error.code, 'RATE_LIMIT_EXCEEDED');
});

function extractCookieValue(setCookieHeaders, cookieName) {
  for (const header of setCookieHeaders) {
    const firstPart = header.split(';')[0] || '';
    if (firstPart.startsWith(`${cookieName}=`)) {
      return firstPart;
    }
  }
  return '';
}

test('registro e ingreso con correo funciona, bloquea duplicados/rate-limit y nunca eleva a Admin', async () => {
  const { call, store } = setup(testEnv, { customerAuthMax: 2, customerAuthWindowMs: 60_000 });

  const statusBefore = await (await call('/api/auth/status')).json();
  assert.equal(statusBefore.enabled, true);
  assert.ok(statusBefore.providers.includes('email'));

  const regRes = await call('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Intento Admin Email',
      email: testEnv.ADMIN_EMAIL,
      password: 'ClaveClienteSegura2026',
    },
    headers: { 'x-nf-client-connection-ip': '198.51.100.10' },
  });
  assert.equal(regRes.status, 201);
  const regCookies = regRes.headers.getSetCookie();
  const userCookie = extractCookieValue(regCookies, 'ct_user_session');
  assert.ok(userCookie);
  assert.equal(extractCookieValue(regCookies, 'ct_admin_session'), '');

  const regBody = await regRes.json();
  assert.equal(regBody.user.provider, 'email');
  assert.equal(regBody.user.email, testEnv.ADMIN_EMAIL);

  const usersStored = store.data.get('registered-users')?.value || [];
  assert.equal(usersStored[0].passwordHash, undefined);
  assert.equal(usersStored[0].provider, 'email');
  assert.ok(store.data.get('user-credentials')?.value?.[testEnv.ADMIN_EMAIL]?.passwordHash);

  const dupRes = await call('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Otro',
      email: testEnv.ADMIN_EMAIL,
      password: 'ClaveClienteSegura2026',
    },
    headers: { 'x-nf-client-connection-ip': '198.51.100.11' },
  });
  assert.equal(dupRes.status, 409);

  // Sesión por correo desbloquea /api/games pero JAMÁS desbloquea rutas Admin
  const gamesRes = await call('/api/games', { headers: { cookie: userCookie } });
  assert.equal(gamesRes.status, 200);
  const adminBlocked = await call('/api/admin/orders', { headers: { cookie: userCookie } });
  assert.equal(adminBlocked.status, 401);

  // Pedidos con sesión de correo registran proveedor sin marcar googleRegistered
  const orderRes = await call('/api/orders', {
    method: 'POST',
    body: validOrder('Intento Admin Email'),
    headers: { cookie: userCookie },
  });
  assert.equal(orderRes.status, 201);
  const savedOrder = (await orderRes.json()).data;
  assert.equal(savedOrder.accountRegistered, true);
  assert.equal(savedOrder.googleRegistered, false);
  assert.equal(savedOrder.authProvider, 'email');

  // Login correcto e incorrecto + rate limit en una IP separada
  const loginOk = await call('/api/auth/login', {
    method: 'POST',
    body: { email: testEnv.ADMIN_EMAIL, password: 'ClaveClienteSegura2026' },
    headers: { 'x-nf-client-connection-ip': '198.51.100.20' },
  });
  assert.equal(loginOk.status, 200);

  const loginBad = await call('/api/auth/login', {
    method: 'POST',
    body: { email: testEnv.ADMIN_EMAIL, password: 'IncorrectaPassword' },
    headers: { 'x-nf-client-connection-ip': '198.51.100.20' },
  });
  assert.equal(loginBad.status, 401);

  const loginRateLimited = await call('/api/auth/login', {
    method: 'POST',
    body: { email: testEnv.ADMIN_EMAIL, password: 'ClaveClienteSegura2026' },
    headers: { 'x-nf-client-connection-ip': '198.51.100.20' },
  });
  assert.equal(loginRateLimited.status, 429);
  assert.ok(Number(loginRateLimited.headers.get('retry-after')) >= 1);
});

test('Facebook OAuth inicia flujo, valida state, registra cliente y nunca eleva a Admin', async () => {
  const fbEnv = {
    ...testEnv,
    FACEBOOK_CLIENT_ID: 'fb-app-123',
    FACEBOOK_CLIENT_SECRET: 'fb-secret-xyz',
  };
  const mockFetch = async (targetUrl) => {
    const href = String(targetUrl);
    if (href.startsWith('https://graph.facebook.com/v20.0/oauth/access_token')) {
      return { ok: true, json: async () => ({ access_token: 'fb-token-abc' }) };
    }
    if (href.startsWith('https://graph.facebook.com/me')) {
      return {
        ok: true,
        json: async () => ({
          id: '987654321',
          name: 'Facu Meta',
          email: testEnv.ADMIN_EMAIL,
          picture: { data: { url: 'https://fbcdn.test/avatar.jpg' } },
        }),
      };
    }
    return { ok: false, json: async () => ({}) };
  };

  const { call, store } = setup(fbEnv, {}, mockFetch);
  const statusJson = await (await call('/api/auth/status')).json();
  assert.ok(statusJson.providers.includes('facebook'));

  const startRes = await call('/api/auth/facebook/start?returnTo=/admin.html');
  assert.equal(startRes.status, 302);
  const locationUrl = new URL(startRes.headers.get('location'));
  assert.equal(locationUrl.origin, 'https://www.facebook.com');
  const state = locationUrl.searchParams.get('state');
  const stateCookie = extractCookieValue(startRes.headers.getSetCookie(), 'ct_oauth_state');
  assert.ok(state && stateCookie);

  const cbRes = await call(`/api/auth/callback/facebook?code=fb-code-1&state=${encodeURIComponent(state)}`, {
    headers: { cookie: stateCookie },
  });
  assert.equal(cbRes.status, 302);
  assert.equal(cbRes.headers.get('location'), '/admin.html?auth_error=not_admin');

  const cbCookies = cbRes.headers.getSetCookie();
  const userCookie = extractCookieValue(cbCookies, 'ct_user_session');
  assert.ok(userCookie);
  assert.equal(extractCookieValue(cbCookies, 'ct_admin_session'), '');

  const users = store.data.get('registered-users')?.value || [];
  assert.equal(users[0].provider, 'facebook');
  assert.equal(users[0].image, 'https://fbcdn.test/avatar.jpg');

  const adminCheck = await call('/api/admin/orders', { headers: { cookie: userCookie } });
  assert.equal(adminCheck.status, 401);
});
