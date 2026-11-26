import { getStore } from '@netlify/blobs';
import { randomBytes, randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import {
  defaultAdminGames,
  defaultAdminProducts,
  defaultGalleryItems,
  defaultSiteSettings,
} from '../../src/data/site-defaults.js';
import { normalizeSearchText } from '../../src/utils/normalize-text.js';
import {
  buildAdminCookie,
  buildClearAdminCookie,
  buildClearOAuthStateCookie,
  buildClearUserCookie,
  buildOAuthStateCookie,
  buildUserCookie,
  createAdminToken,
  createOAuthStateToken,
  createUserToken,
  generatePkcePair,
  getPrimaryAdminEmail,
  getSessionSigningSecret,
  hashPasswordPbkdf2,
  isAdminConfigured,
  isAdminGoogleEmail,
  isAdminTokenVersionValid,
  isGoogleOAuthConfigured,
  parseAdminEmails,
  parseCookies,
  safeEqualStrings,
  sanitizeReturnTo,
  verifyAdminToken,
  verifyBootstrapCredentials,
  verifyOAuthStateToken,
  verifyUserToken,
} from '../../server/src/auth/admin-session.js';
import {
  adminAccountUpdateSchema,
  adminLoginSchema,
  galleryItemPayloadSchema,
  gamePayloadSchema,
  mediaUploadSchema,
  orderCreateSchema,
  orderUpdateSchema,
  productPayloadSchema,
  productsQuerySchema,
  siteSettingsSchema,
  validateAndDecodeImageBase64,
} from '../../server/src/schemas/admin-schemas.js';
import {
  sanitizeGamesForViewer,
  sanitizePublicGamesPreview,
} from '../../server/src/utils/game-visibility.js';
import {
  extractManagedMediaKey,
  isManagedMediaReferenced,
} from '../../server/src/utils/media-cleanup.js';
import { resolveOrderItems } from '../../server/src/utils/order-pricing.js';

export const config = { path: '/api/*' };

const SITE_STORE_NAME = 'carnivoras-tucuman-site';
const MEDIA_STORE_NAME = 'carnivoras-tucuman-media';

const KEYS = {
  visits: 'visits',
  settings: 'site-settings',
  products: 'catalog-products',
  gallery: 'gallery-items',
  games: 'games',
  orders: 'orders',
  users: 'registered-users',
  adminAccount: 'admin-account',
  loginThrottle: 'admin-login-throttle',
};

function readRuntimeEnv(name) {
  if (typeof globalThis.Netlify?.env?.get === 'function') {
    const value = globalThis.Netlify.env.get(name);
    if (value !== undefined) return value;
  }
  return process.env[name];
}

function getAdminEnvConfig(readEnv = readRuntimeEnv) {
  return {
    ADMIN_EMAIL: readEnv('ADMIN_EMAIL') || '',
    ADMIN_EMAILS: readEnv('ADMIN_EMAILS') || '',
    ADMIN_NAME: readEnv('ADMIN_NAME') || 'Administrador',
    ADMIN_PASSWORD: readEnv('ADMIN_PASSWORD') || '',
    ADMIN_PASSWORD_HASH: readEnv('ADMIN_PASSWORD_HASH') || '',
    ADMIN_SESSION_SECRET: readEnv('ADMIN_SESSION_SECRET') || '',
    GOOGLE_CLIENT_ID: readEnv('GOOGLE_CLIENT_ID') || '',
    GOOGLE_CLIENT_SECRET: readEnv('GOOGLE_CLIENT_SECRET') || '',
    USER_SESSION_SECRET: readEnv('USER_SESSION_SECRET') || '',
    BETTER_AUTH_SECRET: readEnv('BETTER_AUTH_SECRET') || '',
  };
}

function getSiteStore() {
  return getStore({ name: SITE_STORE_NAME, consistency: 'strong' });
}

function getMediaStore() {
  return getStore({ name: MEDIA_STORE_NAME, consistency: 'strong' });
}

function jsonResponse(payload, status = 200, extraHeaders = {}, cookies = []) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  for (const cookie of cookies) {
    if (cookie) headers.append('Set-Cookie', cookie);
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

function redirectResponse(location, cookies = []) {
  const headers = new Headers({
    Location: location,
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
  });
  for (const cookie of cookies) {
    if (cookie) headers.append('Set-Cookie', cookie);
  }
  return new Response(null, { status: 302, headers });
}

function appendQueryParam(relativePath, key, value) {
  const safePath = sanitizeReturnTo(relativePath, '/');
  const dummy = new URL(safePath, 'https://local.invalid');
  dummy.searchParams.set(key, value);
  return `${dummy.pathname}${dummy.search}`;
}

function errorResponse(status, code, message, details = undefined) {
  return jsonResponse({ error: { code, message, ...(details ? { details } : {}) } }, status);
}

async function readJsonBlob(store, key, fallback) {
  try {
    const value = await store.get(key, { type: 'json' });
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

const MAX_WRITE_ATTEMPTS = 16;

class BlobConflictError extends Error {}

function cloneJson(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

// Lectura-modificación-escritura con control de concurrencia (ETag), igual que el contador de visitas.
// `mutate(current)` devuelve `{ value, result }` para guardar, o `{ response }` para abortar sin escribir.
async function updateJsonBlob(store, key, fallback, mutate) {
  const expectArray = Array.isArray(fallback);
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    const entry = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' });
    const hasValidShape = expectArray
      ? Array.isArray(entry?.data)
      : (entry?.data && typeof entry.data === 'object' && !Array.isArray(entry.data));
    const current = hasValidShape ? entry.data : cloneJson(fallback);
    const outcome = await mutate(current);
    if (outcome.response) return outcome;
    const write = entry
      ? await store.setJSON(key, outcome.value, { onlyIfMatch: entry.etag })
      : await store.setJSON(key, outcome.value, { onlyIfNew: true });
    if (write?.modified) return outcome;
  }
  throw new BlobConflictError('No se pudo guardar el cambio por escrituras simultáneas. Intentá de nuevo.');
}

function getClientIp(request) {
  const forwarded = request.headers.get('x-nf-client-connection-ip')
    || request.headers.get('x-forwarded-for')
    || '';
  const first = forwarded.split(',')[0].trim();
  return first || 'unknown';
}

function createMemoryLimiter({ windowMs, max }) {
  const hits = new Map();
  return function checkLimit(key) {
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (!entry && hits.size >= 5000) {
        for (const [k, item] of hits) {
          if (item.resetAt <= now) hits.delete(k);
        }
        if (hits.size >= 5000) hits.delete(hits.keys().next().value);
      }
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      return retryAfter;
    }
    return 0;
  };
}

function pruneLoginThrottle(map, now) {
  const next = {};
  for (const [key, entry] of Object.entries(map || {})) {
    if (entry && typeof entry.resetAt === 'number' && entry.resetAt > now) {
      next[key] = entry;
    }
  }
  return next;
}

async function readVisitCount(store) {
  const entry = await store.getWithMetadata(KEYS.visits, { type: 'json', consistency: 'strong' });
  return Number.isSafeInteger(entry?.data?.count) && entry.data.count >= 0 ? entry.data.count : 0;
}

async function incrementVisitCount(store) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const current = await store.getWithMetadata(KEYS.visits, { type: 'json', consistency: 'strong' });
    if (!current) {
      const created = await store.setJSON(KEYS.visits, { count: 1 }, { onlyIfNew: true });
      if (created.modified) return 1;
      continue;
    }
    const count = Number.isSafeInteger(current.data?.count) && current.data.count >= 0 ? current.data.count : 0;
    const updated = await store.setJSON(KEYS.visits, { count: count + 1 }, { onlyIfMatch: current.etag });
    if (updated.modified) return count + 1;
  }
  throw new Error('No se pudo actualizar el contador de visitas.');
}

function isSameOriginRequest(request, url) {
  const originHeader = request.headers.get('origin');
  if (!originHeader) return true;
  try {
    return new URL(originHeader).origin === url.origin;
  } catch {
    return false;
  }
}

function isHttpsRequest(request, url) {
  return url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
}

function requireAdminMutationHeaders(request, url) {
  if (!isSameOriginRequest(request, url)) {
    return errorResponse(403, 'FORBIDDEN_ORIGIN', 'Origen no autorizado para esta operación.');
  }
  if (request.headers.get('x-admin-request') !== '1') {
    return errorResponse(400, 'MISSING_ADMIN_HEADER', 'Falta la cabecera de seguridad de administración.');
  }
  return null;
}

function authenticateAdminCookie(request, envConfig, accountOverride = null) {
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const token = cookies.ct_admin_session;
  if (!token || !envConfig.ADMIN_SESSION_SECRET) return null;
  const parsed = verifyAdminToken(token, envConfig.ADMIN_SESSION_SECRET);
  if (!parsed || !isAdminTokenVersionValid(parsed, accountOverride)) return null;
  return {
    email: parsed.email,
    name: parsed.name || 'Administrador',
    role: 'admin',
    method: parsed.method || 'password',
  };
}

function authenticateUserCookie(request, envConfig) {
  const secret = getSessionSigningSecret(envConfig);
  if (!secret) return null;
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const token = cookies.ct_user_session;
  if (!token) return null;
  const parsed = verifyUserToken(token, secret);
  if (!parsed) return null;
  return {
    id: parsed.id || parsed.sub,
    email: parsed.email,
    name: parsed.name || 'Cliente',
    image: parsed.image || '',
    provider: parsed.provider || 'google',
    emailVerified: parsed.emailVerified !== false,
    exp: parsed.exp,
  };
}

async function loadRegisteredUsers(store) {
  const stored = await readJsonBlob(store, KEYS.users, []);
  return Array.isArray(stored) ? stored : [];
}

async function upsertRegisteredUser(store, profile) {
  const normalizedEmail = profile.email.trim().toLowerCase();
  const userId = String(profile.sub || normalizedEmail);
  const nowIso = new Date().toISOString();
  let record = null;

  await updateJsonBlob(store, KEYS.users, [], (users) => {
    const existingIndex = users.findIndex((item) => item.id === userId || item.email === normalizedEmail);
    const existing = existingIndex >= 0 ? users[existingIndex] : null;

    record = {
      id: userId,
      email: normalizedEmail,
      name: String(profile.name || profile.given_name || normalizedEmail.split('@')[0] || 'Cliente').trim(),
      image: typeof profile.picture === 'string' ? profile.picture : (existing?.image || ''),
      provider: 'google',
      emailVerified: true,
      registeredAt: existing?.registeredAt || nowIso,
      lastLoginAt: nowIso,
      loginsCount: (existing?.loginsCount || 0) + 1,
    };

    const next = [...users];
    if (existingIndex >= 0) next.splice(existingIndex, 1);
    next.unshift(record);
    return { value: next.slice(0, 1000) };
  });
  return record;
}

async function loadMergedSettings(store) {
  const stored = await readJsonBlob(store, KEYS.settings, null);
  return stored && typeof stored === 'object' ? { ...defaultSiteSettings, ...stored } : defaultSiteSettings;
}

async function loadProducts(store) {
  const stored = await readJsonBlob(store, KEYS.products, null);
  const list = Array.isArray(stored) ? stored : defaultAdminProducts;
  return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
}

async function loadGallery(store) {
  const stored = await readJsonBlob(store, KEYS.gallery, null);
  const list = Array.isArray(stored) ? stored : defaultGalleryItems;
  return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

async function loadGames(store) {
  const stored = await readJsonBlob(store, KEYS.games, null);
  const list = Array.isArray(stored) ? stored : defaultAdminGames;
  return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

async function loadOrders(store) {
  const stored = await readJsonBlob(store, KEYS.orders, []);
  return Array.isArray(stored) ? stored : [];
}

async function parseJsonBody(request) {
  const text = await request.text();
  if (!text) return {};
  return JSON.parse(text);
}

function extensionForMime(contentType) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

export function createApiHandler({
  getSiteStore: resolveSiteStore = getSiteStore,
  getMediaStore: resolveMediaStore = getMediaStore,
  env = readRuntimeEnv,
  rateLimits = {},
} = {}) {
  const checkOrdersLimit = createMemoryLimiter({
    windowMs: rateLimits.ordersWindowMs ?? 5 * 60_000,
    max: rateLimits.ordersMax ?? 15,
  });
  const loginMax = rateLimits.loginMax ?? 10;
  const loginWindowMs = rateLimits.loginWindowMs ?? 15 * 60_000;

  return async function handler(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();
    const envConfig = getAdminEnvConfig(env);
    const https = isHttpsRequest(request, url);

    try {
      // 1. MEDIA PÚBLICA DESDE BLOBS
      if (path.startsWith('/api/media/') && method === 'GET') {
        const key = decodeURIComponent(path.slice('/api/media/'.length));
        if (!/^[a-zA-Z0-9._-]{3,160}$/.test(key)) {
          return errorResponse(400, 'INVALID_MEDIA_KEY', 'Identificador de archivo inválido.');
        }

        const mediaStore = resolveMediaStore();
        const entry = await mediaStore.getWithMetadata(key, { type: 'arrayBuffer', consistency: 'strong' });
        if (!entry || entry.data === null) {
          return errorResponse(404, 'MEDIA_NOT_FOUND', 'Archivo multimedia no encontrado.');
        }

        return new Response(entry.data, {
          status: 200,
          headers: {
            'Content-Type': entry.metadata?.contentType || 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }

      const store = resolveSiteStore();

      // 2. ENDPOINTS PÚBLICOS DE LA TIENDA
      if (path === '/api/health' && method === 'GET') {
        return jsonResponse({
          data: {
            service: 'carnivoras-tucuman-api',
            status: 'ok',
            database: 'netlify-blobs',
            catalogMode: 'netlify-blobs',
          },
        });
      }

      if (path === '/api/auth/status' && method === 'GET') {
        const googleEnabled = isGoogleOAuthConfigured(envConfig);
        return jsonResponse({
          enabled: googleEnabled,
          providers: googleEnabled ? ['google'] : [],
          authFlow: 'redirect',
        });
      }

      if (path === '/api/auth/get-session' && method === 'GET') {
        const user = authenticateUserCookie(request, envConfig);
        if (!user) return jsonResponse(null);
        return jsonResponse({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            provider: user.provider,
            emailVerified: user.emailVerified,
          },
          session: {
            expiresAt: new Date(user.exp * 1000).toISOString(),
          },
        });
      }

      if (path === '/api/auth/google/start' && method === 'GET') {
        if (!isGoogleOAuthConfigured(envConfig)) {
          return errorResponse(503, 'AUTH_NOT_CONFIGURED', 'El inicio de sesión con Google todavía no está configurado en Netlify.');
        }

        const signingSecret = getSessionSigningSecret(envConfig);
        const returnTo = sanitizeReturnTo(url.searchParams.get('returnTo'), '/');
        const { state, codeVerifier, codeChallenge } = generatePkcePair();
        const stateToken = createOAuthStateToken({ state, codeVerifier, returnTo }, signingSecret);

        const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        googleUrl.searchParams.set('client_id', envConfig.GOOGLE_CLIENT_ID.trim());
        googleUrl.searchParams.set('redirect_uri', `${url.origin}/api/auth/callback/google`);
        googleUrl.searchParams.set('response_type', 'code');
        googleUrl.searchParams.set('scope', 'openid email profile');
        googleUrl.searchParams.set('state', state);
        googleUrl.searchParams.set('code_challenge', codeChallenge);
        googleUrl.searchParams.set('code_challenge_method', 'S256');
        googleUrl.searchParams.set('prompt', 'select_account');

        return redirectResponse(googleUrl.toString(), [
          buildOAuthStateCookie(stateToken, { secure: https }),
        ]);
      }

      if (path === '/api/auth/callback/google' && method === 'GET') {
        const clearOAuthCookie = buildClearOAuthStateCookie({ secure: https });
        const cookies = parseCookies(request.headers.get('cookie') || '');
        const signingSecret = getSessionSigningSecret(envConfig);
        const statePayload = signingSecret
          ? verifyOAuthStateToken(cookies.ct_oauth_state, signingSecret)
          : null;
        const returnTo = statePayload?.returnTo || '/';

        const oauthError = url.searchParams.get('error');
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');

        if (
          !isGoogleOAuthConfigured(envConfig)
          || oauthError
          || !code
          || !returnedState
          || !statePayload
          || !safeEqualStrings(returnedState, statePayload.state)
        ) {
          return redirectResponse(
            appendQueryParam(returnTo, 'auth_error', oauthError === 'access_denied' ? 'google_cancelled' : 'google_failed'),
            [clearOAuthCookie],
          );
        }

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: envConfig.GOOGLE_CLIENT_ID.trim(),
            client_secret: envConfig.GOOGLE_CLIENT_SECRET.trim(),
            redirect_uri: `${url.origin}/api/auth/callback/google`,
            grant_type: 'authorization_code',
            code_verifier: statePayload.codeVerifier,
          }),
          signal: AbortSignal.timeout(10_000),
        });

        if (!tokenResponse.ok) {
          return redirectResponse(appendQueryParam(returnTo, 'auth_error', 'google_token_failed'), [clearOAuthCookie]);
        }

        const tokenJson = await tokenResponse.json().catch(() => null);
        if (!tokenJson?.access_token) {
          return redirectResponse(appendQueryParam(returnTo, 'auth_error', 'google_token_failed'), [clearOAuthCookie]);
        }

        const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
          headers: { Authorization: `Bearer ${tokenJson.access_token}` },
          signal: AbortSignal.timeout(10_000),
        });

        if (!profileResponse.ok) {
          return redirectResponse(appendQueryParam(returnTo, 'auth_error', 'google_profile_failed'), [clearOAuthCookie]);
        }

        const profile = await profileResponse.json().catch(() => null);
        if (!profile?.email || profile.email_verified !== true) {
          return redirectResponse(appendQueryParam(returnTo, 'auth_error', 'google_unverified_email'), [clearOAuthCookie]);
        }

        const savedUser = await upsertRegisteredUser(store, profile);
        const userToken = createUserToken(savedUser, signingSecret);
        const responseCookies = [
          clearOAuthCookie,
          buildUserCookie(userToken, { secure: https }),
        ];

        const accountOverride = await readJsonBlob(store, KEYS.adminAccount, null);
        const canGrantAdmin = envConfig.ADMIN_SESSION_SECRET
          && envConfig.ADMIN_SESSION_SECRET.length >= 32
          && isAdminGoogleEmail(savedUser.email, envConfig, accountOverride);

        if (canGrantAdmin) {
          const adminToken = createAdminToken(
            { email: savedUser.email, name: savedUser.name, method: 'google' },
            envConfig.ADMIN_SESSION_SECRET,
          );
          responseCookies.push(buildAdminCookie(adminToken, { secure: https }));
        } else if (returnTo.startsWith('/admin.html')) {
          return redirectResponse('/admin.html?auth_error=not_admin', responseCookies);
        }

        return redirectResponse(returnTo, responseCookies);
      }

      if (path === '/api/auth/sign-out' && method === 'POST') {
        if (!isSameOriginRequest(request, url)) {
          return errorResponse(403, 'FORBIDDEN_ORIGIN', 'Origen no autorizado.');
        }

        const cookies = [buildClearUserCookie({ secure: https })];
        const adminUser = authenticateAdminCookie(request, envConfig);
        if (adminUser?.method === 'google') {
          cookies.push(buildClearAdminCookie({ secure: https }));
        }

        return jsonResponse({ success: true }, 200, {}, cookies);
      }

      if (path === '/api/site-data' && method === 'GET') {
        const [settings, allProducts, allGallery, allGames] = await Promise.all([
          loadMergedSettings(store),
          loadProducts(store),
          loadGallery(store),
          loadGames(store),
        ]);

        return jsonResponse({
          data: {
            settings,
            products: allProducts.filter((item) => item.isActive !== false),
            gallery: allGallery.filter((item) => item.isActive !== false),
            gamesPreview: sanitizePublicGamesPreview(allGames),
          },
        });
      }

      if (path === '/api/products' && method === 'GET') {
        const query = productsQuerySchema.parse({
          category: url.searchParams.get('category') || undefined,
          q: url.searchParams.get('q') || undefined,
          page: url.searchParams.get('page') ?? undefined,
          limit: url.searchParams.get('limit') ?? undefined,
        });

        const normalizedSearch = normalizeSearchText(query.q || '');
        const activeProducts = (await loadProducts(store)).filter((item) => item.isActive !== false);
        const filtered = activeProducts.filter((product) => {
          const matchesCategory = !query.category || product.category === query.category;
          const searchable = normalizeSearchText(
            [product.name, product.species, product.description, product.categoryLabel, product.note].join(' '),
          );
          return matchesCategory && searchable.includes(normalizedSearch);
        });
        const start = (query.page - 1) * query.limit;

        return jsonResponse({
          data: filtered.slice(start, start + query.limit),
          meta: { page: query.page, limit: query.limit, total: filtered.length, source: 'netlify-blobs' },
        });
      }

      if (path.startsWith('/api/products/') && method === 'GET') {
        const slug = decodeURIComponent(path.slice('/api/products/'.length));
        if (!/^[a-z0-9-]+$/.test(slug)) {
          return errorResponse(400, 'VALIDATION_ERROR', 'Identificador de producto inválido.');
        }
        const product = (await loadProducts(store)).find((item) => item.id === slug && item.isActive !== false);
        if (!product) {
          return errorResponse(404, 'PRODUCT_NOT_FOUND', 'No encontramos ese producto.');
        }
        return jsonResponse({ data: product, meta: { source: 'netlify-blobs' } });
      }

      if (path === '/api/gallery' && method === 'GET') {
        const gallery = (await loadGallery(store)).filter((item) => item.isActive !== false);
        return jsonResponse({ data: gallery, meta: { total: gallery.length } });
      }

      if (path === '/api/visits') {
        if (method === 'GET') {
          return jsonResponse({ count: await readVisitCount(store) });
        }
        if (method === 'POST') {
          if (!isSameOriginRequest(request, url)) {
            return errorResponse(403, 'FORBIDDEN_ORIGIN', 'Origen no autorizado.');
          }
          if (request.headers.get('x-counter-request') !== '1') {
            return errorResponse(400, 'INVALID_REQUEST', 'Solicitud de contador inválida.');
          }
          return jsonResponse({ count: await incrementVisitCount(store) });
        }
      }

      if (path === '/api/orders' && method === 'POST') {
        if (!isSameOriginRequest(request, url)) {
          return errorResponse(403, 'FORBIDDEN_ORIGIN', 'Origen no autorizado.');
        }
        const retryAfter = checkOrdersLimit(getClientIp(request));
        if (retryAfter > 0) {
          return jsonResponse(
            {
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Demasiadas consultas en poco tiempo. Esperá un momento y volvé a intentar.',
              },
            },
            429,
            { 'Retry-After': String(retryAfter) },
          );
        }

        const input = orderCreateSchema.parse(await parseJsonBody(request));
        const priced = resolveOrderItems(input.items, await loadProducts(store));
        if (priced.error) {
          return errorResponse(priced.error.status, priced.error.code, priced.error.message);
        }

        const sessionUser = authenticateUserCookie(request, envConfig);
        const googleRegistered = Boolean(sessionUser);
        const customerEmail = sessionUser?.email || '';
        const order = {
          id: 'PED-' + Date.now().toString(36).toUpperCase() + '-' + randomBytes(2).toString('hex').toUpperCase(),
          createdAt: new Date().toISOString(),
          customerName: input.customerName || sessionUser?.name || '',
          customerEmail,
          googleRegistered,
          notes: input.notes,
          items: priced.items,
          totalARS: priced.totalARS,
          status: 'nuevo',
          adminNotes: '',
          source: input.source,
        };
        await updateJsonBlob(store, KEYS.orders, [], (orders) => ({
          value: [order, ...orders].slice(0, 250),
        }));
        return jsonResponse({ data: order }, 201);
      }

      // 3. JUEGOS PROTEGIDOS (GOOGLE OAUTH O SESIÓN DE ADMINISTRADOR)
      if (path === '/api/games' || path.startsWith('/api/games/')) {
        const accountOverride = await readJsonBlob(store, KEYS.adminAccount, null);
        const adminUser = authenticateAdminCookie(request, envConfig, accountOverride);
        const customerUser = !adminUser ? authenticateUserCookie(request, envConfig) : null;
        const viewer = adminUser
          ? { isAdmin: true, role: 'admin', playerName: adminUser.name }
          : customerUser
            ? { isAdmin: false, role: 'player', playerName: customerUser.name }
            : null;

        if (!viewer) {
          const anyAuthConfigured = isGoogleOAuthConfigured(envConfig) || isAdminConfigured(envConfig, accountOverride);
          if (!anyAuthConfigured) {
            return errorResponse(503, 'AUTH_NOT_CONFIGURED', 'El acceso estará disponible cuando se configure Google OAuth.');
          }
          return errorResponse(401, 'AUTH_REQUIRED', 'Iniciá sesión con Google para entrar a esta sección.');
        }

        const gamesList = await loadGames(store);
        const visibleGames = sanitizeGamesForViewer(gamesList, { isAdmin: viewer.isAdmin });

        if (path === '/api/games' && method === 'GET') {
          return jsonResponse({
            data: visibleGames,
            meta: {
              unlocked: true,
              playerName: viewer.playerName,
              role: viewer.role,
              isAdmin: viewer.isAdmin,
              total: visibleGames.length,
            },
          });
        }

        if (method === 'GET') {
          const slug = decodeURIComponent(path.slice('/api/games/'.length));
          if (!/^[a-z0-9-]+$/.test(slug)) {
            return errorResponse(400, 'VALIDATION_ERROR', 'Slug de juego inválido.');
          }
          const game = visibleGames.find((item) => item.slug === slug);
          if (!game) {
            return errorResponse(404, 'GAME_NOT_FOUND', 'No encontramos ese juego.');
          }
          return jsonResponse({
            data: game,
            meta: { unlocked: true, role: viewer.role, isAdmin: viewer.isAdmin },
          });
        }
      }

      // 4. SESIÓN Y CUENTA DE ADMINISTRADOR
      if (path === '/api/admin/auth/session' && method === 'GET') {
        const accountOverride = await readJsonBlob(store, KEYS.adminAccount, null);
        const googleAllowed = isGoogleOAuthConfigured(envConfig)
          && (parseAdminEmails(envConfig).length > 0 || Boolean(accountOverride?.email));
        const configured = isAdminConfigured(envConfig, accountOverride) || googleAllowed;
        const user = configured ? authenticateAdminCookie(request, envConfig, accountOverride) : null;

        if (!user && url.searchParams.get('meta') !== '1') {
          return jsonResponse({
            data: {
              authenticated: false,
              user: null,
            },
          });
        }

        return jsonResponse({
          data: {
            configured,
            authenticated: Boolean(user),
            user,
            googleAllowed,
            storageMode: 'netlify-blobs',
          },
        });
      }

      if (path === '/api/admin/auth/login' && method === 'POST') {
        const csrfCheck = requireAdminMutationHeaders(request, url);
        if (csrfCheck) return csrfCheck;

        const body = adminLoginSchema.parse(await parseJsonBody(request));
        const throttleKey = `${getClientIp(request)}:${body.email.trim().toLowerCase()}`;
        const nowMs = Date.now();
        const throttleMap = pruneLoginThrottle(await readJsonBlob(store, KEYS.loginThrottle, {}), nowMs);
        const existingAttempt = throttleMap[throttleKey];
        if (existingAttempt && existingAttempt.count >= loginMax) {
          const retryAfter = Math.max(1, Math.ceil((existingAttempt.resetAt - nowMs) / 1000));
          return jsonResponse(
            {
              error: {
                code: 'TOO_MANY_LOGIN_ATTEMPTS',
                message: 'Demasiados intentos de acceso. Esperá unos minutos y volvé a intentarlo.',
              },
            },
            429,
            { 'Retry-After': String(retryAfter) },
          );
        }

        const accountOverride = await readJsonBlob(store, KEYS.adminAccount, null);
        if (!envConfig.ADMIN_SESSION_SECRET || String(envConfig.ADMIN_SESSION_SECRET).length < 32) {
          return errorResponse(503, 'ADMIN_NOT_CONFIGURED', 'La cuenta de administración todavía no fue configurada en el servidor.');
        }

        const verification = verifyBootstrapCredentials({
          email: body.email,
          password: body.password,
          envConfig,
          overrideAccount: accountOverride,
        });

        if (!verification.configured) {
          return errorResponse(503, 'ADMIN_NOT_CONFIGURED', 'La cuenta de administración todavía no fue configurada en el servidor.');
        }
        if (!verification.valid) {
          await updateJsonBlob(store, KEYS.loginThrottle, {}, (map) => {
            const now = Date.now();
            const cleaned = pruneLoginThrottle(map, now);
            const prev = cleaned[throttleKey];
            cleaned[throttleKey] = prev
              ? { count: prev.count + 1, resetAt: prev.resetAt }
              : { count: 1, resetAt: now + loginWindowMs };
            return { value: cleaned };
          });
          return errorResponse(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
        }

        if (existingAttempt) {
          await updateJsonBlob(store, KEYS.loginThrottle, {}, (map) => {
            const cleaned = pruneLoginThrottle(map, Date.now());
            delete cleaned[throttleKey];
            return { value: cleaned };
          });
        }

        const token = createAdminToken(
          {
            email: verification.email,
            name: verification.name,
            ver: Number.isInteger(accountOverride?.tokenVersion) ? accountOverride.tokenVersion : 0,
          },
          envConfig.ADMIN_SESSION_SECRET,
        );
        return jsonResponse(
          { data: { user: { email: verification.email, name: verification.name, role: 'admin', method: 'password' } } },
          200,
          {},
          [buildAdminCookie(token, { secure: https })],
        );
      }

      if (path === '/api/admin/auth/logout' && method === 'POST') {
        const csrfCheck = requireAdminMutationHeaders(request, url);
        if (csrfCheck) return csrfCheck;

        const cookies = [buildClearAdminCookie({ secure: https })];
        const adminUser = authenticateAdminCookie(request, envConfig);
        if (adminUser?.method === 'google') {
          cookies.push(buildClearUserCookie({ secure: https }));
        }

        return jsonResponse({ data: { ok: true } }, 200, {}, cookies);
      }

      // 5. RUTAS PROTEGIDAS DE ADMINISTRACIÓN
      if (path.startsWith('/api/admin/')) {
        if (method !== 'GET' && method !== 'HEAD') {
          const csrfCheck = requireAdminMutationHeaders(request, url);
          if (csrfCheck) return csrfCheck;
        }

        const accountOverride = await readJsonBlob(store, KEYS.adminAccount, null);
        const googleAllowed = isGoogleOAuthConfigured(envConfig)
          && (parseAdminEmails(envConfig).length > 0 || Boolean(accountOverride?.email));
        if (!isAdminConfigured(envConfig, accountOverride) && !googleAllowed) {
          return errorResponse(503, 'ADMIN_NOT_CONFIGURED', 'La cuenta de administración no está configurada.');
        }

        const adminUser = authenticateAdminCookie(request, envConfig, accountOverride);
        if (!adminUser) {
          return errorResponse(401, 'ADMIN_AUTH_REQUIRED', 'Iniciá sesión como administrador para acceder al panel.');
        }

        if (path === '/api/admin/auth/account' && method === 'PUT') {
          const body = adminAccountUpdateSchema.parse(await parseJsonBody(request));
          const verificationEmail = adminUser.method === 'google'
            ? (accountOverride?.email || getPrimaryAdminEmail(envConfig))
            : adminUser.email;
          const passwordConfigured = Boolean(
            accountOverride?.passwordHash || envConfig.ADMIN_PASSWORD_HASH || envConfig.ADMIN_PASSWORD,
          );

          if (passwordConfigured) {
            if (!body.currentPassword) {
              return errorResponse(401, 'INVALID_CURRENT_PASSWORD', 'La contraseña actual no coincide.');
            }
            const verification = verifyBootstrapCredentials({
              email: verificationEmail,
              password: body.currentPassword,
              envConfig,
              overrideAccount: accountOverride,
            });
            if (verification.configured && !verification.valid) {
              return errorResponse(401, 'INVALID_CURRENT_PASSWORD', 'La contraseña actual no coincide.');
            }
          }

          if (!passwordConfigured && !body.newPassword) {
            return errorResponse(400, 'NEW_PASSWORD_REQUIRED', 'Definí una nueva contraseña (mínimo 8 caracteres) para habilitar el acceso local.');
          }

          const passwordToHash = body.newPassword || body.currentPassword;
          const nextTokenVersion = (Number.isInteger(accountOverride?.tokenVersion) ? accountOverride.tokenVersion : 0) + 1;
          const nextOverride = {
            email: body.email.trim().toLowerCase(),
            name: body.name.trim(),
            passwordHash: hashPasswordPbkdf2(passwordToHash),
            tokenVersion: nextTokenVersion,
            updatedAt: new Date().toISOString(),
          };
          await store.setJSON(KEYS.adminAccount, nextOverride);

          const nextToken = createAdminToken(
            { email: nextOverride.email, name: nextOverride.name, method: adminUser.method, ver: nextTokenVersion },
            envConfig.ADMIN_SESSION_SECRET,
          );
          return jsonResponse(
            {
              data: {
                user: { email: nextOverride.email, name: nextOverride.name, role: 'admin', method: adminUser.method },
                updatedAt: nextOverride.updatedAt,
              },
            },
            200,
            {},
            [buildAdminCookie(nextToken, { secure: https })],
          );
        }

        if (path === '/api/admin/overview' && method === 'GET') {
          const [visitsCount, allProducts, allGallery, allGames, allOrders, allUsers, settings] = await Promise.all([
            readVisitCount(store),
            loadProducts(store),
            loadGallery(store),
            loadGames(store),
            loadOrders(store),
            loadRegisteredUsers(store),
            loadMergedSettings(store),
          ]);

          return jsonResponse({
            data: {
              visitsCount,
              productsTotal: allProducts.length,
              activeProducts: allProducts.filter((item) => item.isActive !== false).length,
              galleryTotal: allGallery.filter((item) => item.isActive !== false).length,
              gamesTotal: allGames.length,
              ordersTotal: allOrders.length,
              pendingOrders: allOrders.filter((order) => order.status === 'nuevo' || order.status === 'en-proceso').length,
              usersTotal: allUsers.length,
              googleOAuthConfigured: isGoogleOAuthConfigured(envConfig),
              showPreviewBanner: settings.showPreviewBanner,
              storageMode: 'netlify-blobs',
            },
          });
        }

        if (path === '/api/admin/users' && method === 'GET') {
          return jsonResponse({ data: await loadRegisteredUsers(store) });
        }

        if (path === '/api/admin/settings') {
          if (method === 'GET') {
            return jsonResponse({ data: await loadMergedSettings(store) });
          }
          if (method === 'PUT') {
            const updatedSettings = siteSettingsSchema.parse(await parseJsonBody(request));
            await store.setJSON(KEYS.settings, updatedSettings);
            return jsonResponse({ data: updatedSettings });
          }
        }

        async function cleanupUnreferencedMedia(candidateUrls = []) {
          const keys = [...new Set(candidateUrls.map(extractManagedMediaKey).filter(Boolean))];
          if (keys.length === 0) return;
          const [productsList, galleryList] = await Promise.all([loadProducts(store), loadGallery(store)]);
          const mediaStore = resolveMediaStore();
          for (const key of keys) {
            if (!isManagedMediaReferenced(key, productsList, galleryList)) {
              try {
                await mediaStore.delete?.(key);
              } catch {
                // La limpieza de huérfanos no debe fallar la operación principal.
              }
            }
          }
        }

        if (path === '/api/admin/products') {
          if (method === 'GET') {
            return jsonResponse({ data: await loadProducts(store) });
          }
          if (method === 'POST') {
            const item = productPayloadSchema.parse(await parseJsonBody(request));
            const outcome = await updateJsonBlob(store, KEYS.products, defaultAdminProducts, (list) => {
              if (list.some((existing) => existing.id === item.id)) {
                return { response: errorResponse(409, 'DUPLICATE_SLUG', `Ya existe un producto con el identificador "${item.id}".`) };
              }
              return { value: [...list, item] };
            });
            if (outcome.response) return outcome.response;
            return jsonResponse({ data: item }, 201);
          }
        }

        if (path.startsWith('/api/admin/products/') && (method === 'PUT' || method === 'DELETE')) {
          const slug = decodeURIComponent(path.slice('/api/admin/products/'.length));
          const updated = method === 'PUT'
            ? productPayloadSchema.parse({ ...(await parseJsonBody(request)), id: slug })
            : null;
          let replacedUrl = null;
          const outcome = await updateJsonBlob(store, KEYS.products, defaultAdminProducts, (list) => {
            const index = list.findIndex((item) => item.id === slug);
            if (index === -1) return { response: errorResponse(404, 'PRODUCT_NOT_FOUND', 'No encontramos ese producto.') };
            const prevUrl = list[index]?.image || null;
            replacedUrl = updated ? (prevUrl !== updated.image ? prevUrl : null) : prevUrl;
            const next = [...list];
            if (updated) next[index] = updated;
            else next.splice(index, 1);
            return { value: next };
          });
          if (outcome.response) return outcome.response;
          if (replacedUrl) await cleanupUnreferencedMedia([replacedUrl]);
          return jsonResponse({ data: updated || { deletedId: slug } });
        }

        if (path === '/api/admin/gallery') {
          if (method === 'GET') {
            return jsonResponse({ data: await loadGallery(store) });
          }
          if (method === 'POST') {
            const item = galleryItemPayloadSchema.parse(await parseJsonBody(request));
            const outcome = await updateJsonBlob(store, KEYS.gallery, defaultGalleryItems, (list) => {
              if (list.some((existing) => existing.id === item.id)) {
                return { response: errorResponse(409, 'DUPLICATE_ID', `Ya existe una foto con el identificador "${item.id}".`) };
              }
              return { value: [...list, item] };
            });
            if (outcome.response) return outcome.response;
            return jsonResponse({ data: item }, 201);
          }
        }

        if (path.startsWith('/api/admin/gallery/') && (method === 'PUT' || method === 'DELETE')) {
          const id = decodeURIComponent(path.slice('/api/admin/gallery/'.length));
          const updated = method === 'PUT'
            ? galleryItemPayloadSchema.parse({ ...(await parseJsonBody(request)), id })
            : null;
          let replacedUrl = null;
          const outcome = await updateJsonBlob(store, KEYS.gallery, defaultGalleryItems, (list) => {
            const index = list.findIndex((item) => item.id === id);
            if (index === -1) return { response: errorResponse(404, 'GALLERY_ITEM_NOT_FOUND', 'No encontramos esa fotografía.') };
            const prevUrl = list[index]?.src || null;
            replacedUrl = updated ? (prevUrl !== updated.src ? prevUrl : null) : prevUrl;
            const next = [...list];
            if (updated) next[index] = updated;
            else next.splice(index, 1);
            return { value: next };
          });
          if (outcome.response) return outcome.response;
          if (replacedUrl) await cleanupUnreferencedMedia([replacedUrl]);
          return jsonResponse({ data: updated || { deletedId: id } });
        }

        if (path === '/api/admin/games') {
          if (method === 'GET') {
            return jsonResponse({ data: await loadGames(store) });
          }
          if (method === 'POST') {
            const parsedGame = gamePayloadSchema.parse(await parseJsonBody(request));
            const game = { ...parsedGame, id: parsedGame.slug, requiredProviders: ['google'] };
            const outcome = await updateJsonBlob(store, KEYS.games, defaultAdminGames, (list) => {
              if (list.some((existing) => existing.slug === game.slug)) {
                return { response: errorResponse(409, 'DUPLICATE_SLUG', `Ya existe un juego con slug "${game.slug}".`) };
              }
              return { value: [...list, game] };
            });
            if (outcome.response) return outcome.response;
            return jsonResponse({ data: game }, 201);
          }
        }

        if (path.startsWith('/api/admin/games/') && (method === 'PUT' || method === 'DELETE')) {
          const slug = decodeURIComponent(path.slice('/api/admin/games/'.length));
          let updated = null;
          if (method === 'PUT') {
            const parsedGame = gamePayloadSchema.parse({ ...(await parseJsonBody(request)), slug });
            updated = { ...parsedGame, id: slug, requiredProviders: ['google'] };
          }
          const outcome = await updateJsonBlob(store, KEYS.games, defaultAdminGames, (list) => {
            const index = list.findIndex((item) => item.slug === slug);
            if (index === -1) return { response: errorResponse(404, 'GAME_NOT_FOUND', 'No encontramos ese juego.') };
            const next = [...list];
            if (updated) next[index] = updated;
            else next.splice(index, 1);
            return { value: next };
          });
          if (outcome.response) return outcome.response;
          return jsonResponse({ data: updated || { deletedSlug: slug } });
        }

        if (path === '/api/admin/orders' && method === 'GET') {
          return jsonResponse({ data: await loadOrders(store) });
        }

        if (path.startsWith('/api/admin/orders/') && (method === 'PATCH' || method === 'DELETE')) {
          const id = decodeURIComponent(path.slice('/api/admin/orders/'.length));
          const patch = method === 'PATCH'
            ? orderUpdateSchema.parse(await parseJsonBody(request))
            : null;
          let updatedOrder = null;
          const outcome = await updateJsonBlob(store, KEYS.orders, [], (list) => {
            const index = list.findIndex((order) => order.id === id);
            if (index === -1) return { response: errorResponse(404, 'ORDER_NOT_FOUND', 'No encontramos ese pedido.') };
            const next = [...list];
            if (patch) {
              updatedOrder = {
                ...next[index],
                status: patch.status,
                adminNotes: patch.adminNotes,
                updatedAt: new Date().toISOString(),
              };
              next[index] = updatedOrder;
            } else {
              next.splice(index, 1);
            }
            return { value: next };
          });
          if (outcome.response) return outcome.response;
          return jsonResponse({ data: updatedOrder || { deletedId: id } });
        }

        if (path === '/api/admin/media' && method === 'POST') {
          const payload = mediaUploadSchema.parse(await parseJsonBody(request));
          let buffer;
          try {
            buffer = validateAndDecodeImageBase64(payload.dataBase64, payload.contentType);
          } catch (mediaError) {
            return errorResponse(400, 'INVALID_MEDIA', mediaError.message);
          }
          const baseName = payload.filename
            .replace(/\.[^.]+$/, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 48) || 'imagen';
          const key = `${Date.now()}-${randomUUID().slice(0, 8)}-${baseName}.${extensionForMime(payload.contentType)}`;

          const mediaStore = resolveMediaStore();
          await mediaStore.set(key, buffer, {
            metadata: {
              contentType: payload.contentType,
              filename: payload.filename,
              uploadedAt: new Date().toISOString(),
            },
          });

          return jsonResponse({
            data: {
              key,
              url: '/api/media/' + key,
              contentType: payload.contentType,
              size: buffer.length,
            },
          }, 201);
        }
      }

      return errorResponse(404, 'ROUTE_NOT_FOUND', 'No encontramos esta ruta de la API.');
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => `${issue.path.join('.') || 'campo'}: ${issue.message}`);
        return errorResponse(400, 'VALIDATION_ERROR', details[0] || 'Datos inválidos.', details);
      }

      if (error instanceof SyntaxError) {
        return errorResponse(400, 'INVALID_JSON', 'El formato JSON enviado es inválido.');
      }

      if (error instanceof BlobConflictError) {
        return errorResponse(409, 'WRITE_CONFLICT', error.message);
      }

      console.error('Error en función API de Netlify:', error?.message || error);
      return errorResponse(500, 'INTERNAL_ERROR', 'Error interno al procesar la solicitud.');
    }
  };
}

export default createApiHandler();
