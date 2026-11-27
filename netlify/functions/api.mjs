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
  isEmailAuthConfigured,
  isFacebookOAuthConfigured,
  isGoogleOAuthConfigured,
  parseAdminEmails,
  parseCookies,
  safeEqualStrings,
  sanitizeReturnTo,
  verifyAdminToken,
  verifyBootstrapCredentials,
  verifyOAuthStateToken,
  verifyPasswordHash,
  verifyUserToken,
} from '../../server/src/auth/admin-session.js';
import {
  adminAccountUpdateSchema,
  adminLoginSchema,
  customerLoginSchema,
  customerRegisterSchema,
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
  adminCopyRequestSchema,
  careAssistantRequestSchema,
  catalogRecommendRequestSchema,
} from '../../server/src/schemas/assistant-schemas.js';
import {
  AssistantServiceError,
  DEFAULT_ADMIN_DAILY_LIMIT,
  diagnoseCarnivorousPlant,
  generateAdminCopy,
  getArgentinaDateKey,
  getGeminiDailyLimit,
  getGeminiModel,
  isGeminiConfigured,
  recommendCatalogProducts,
} from '../../server/src/services/gemini-assistant.js';
import {
  sanitizeGamesForViewer,
  sanitizePublicGamesPreview,
} from '../../server/src/utils/game-visibility.js';
import {
  gameScorePayloadSchema,
  validateGameRuntimeConfig,
} from '../../server/src/schemas/game-runtime-schemas.js';
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
  userCredentials: 'user-credentials',
  adminAccount: 'admin-account',
  loginThrottle: 'admin-login-throttle',
  assistantQuota: 'assistant-daily-quota',
  gameConfigPrefix: 'game-config:',
  gameScores: 'game-scores',
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
    FACEBOOK_CLIENT_ID: readEnv('FACEBOOK_CLIENT_ID') || '',
    FACEBOOK_CLIENT_SECRET: readEnv('FACEBOOK_CLIENT_SECRET') || '',
    USER_SESSION_SECRET: readEnv('USER_SESSION_SECRET') || '',
    BETTER_AUTH_SECRET: readEnv('BETTER_AUTH_SECRET') || '',
    GEMINI_API_KEY: readEnv('GEMINI_API_KEY') || '',
    GEMINI_MODEL: readEnv('GEMINI_MODEL') || '',
    GEMINI_DAILY_LIMIT: readEnv('GEMINI_DAILY_LIMIT') || '',
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
  const adminSecret = envConfig.ADMIN_SESSION_SECRET || getSessionSigningSecret(envConfig);
  if (!token || !adminSecret) return null;
  const parsed = verifyAdminToken(token, adminSecret);
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

function resolveNetlifyAdminUser(request, envConfig, accountOverride = null) {
  const cookieAdmin = authenticateAdminCookie(request, envConfig, accountOverride);
  if (cookieAdmin) return cookieAdmin;

  const googleUser = authenticateUserCookie(request, envConfig);
  if (
    googleUser
    && googleUser.provider === 'google'
    && googleUser.emailVerified !== false
    && isAdminGoogleEmail(googleUser.email, envConfig, accountOverride)
  ) {
    return {
      email: googleUser.email,
      name: googleUser.name || 'Administrador',
      role: 'admin',
      method: 'google',
    };
  }

  return null;
}

async function loadRegisteredUsers(store) {
  const stored = await readJsonBlob(store, KEYS.users, []);
  return Array.isArray(stored) ? stored : [];
}

async function upsertRegisteredUser(store, profile) {
  const normalizedEmail = profile.email.trim().toLowerCase();
  const userId = String(profile.sub || normalizedEmail);
  const provider = String(profile.provider || 'google');
  const emailVerified = profile.emailVerified !== false;
  const nowIso = new Date().toISOString();
  let record = null;

  await updateJsonBlob(store, KEYS.users, [], (users) => {
    const existingIndex = users.findIndex((item) => item.id === userId || item.email === normalizedEmail);
    const existing = existingIndex >= 0 ? users[existingIndex] : null;

    record = {
      id: existing?.id || userId,
      email: normalizedEmail,
      name: String(profile.name || profile.given_name || normalizedEmail.split('@')[0] || 'Cliente').trim(),
      image: typeof profile.picture === 'string'
        ? profile.picture
        : (typeof profile.image === 'string' ? profile.image : (existing?.image || '')),
      provider,
      emailVerified,
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

function normalizeValidatedImage(image) {
  if (!image) return null;
  const buffer = validateAndDecodeImageBase64(image.dataBase64, image.contentType);
  return {
    contentType: image.contentType,
    dataBase64: buffer.toString('base64'),
  };
}

async function consumeDailyQuota(store, bucket, limit) {
  const todayKey = getArgentinaDateKey();
  const outcome = await updateJsonBlob(store, KEYS.assistantQuota, {}, (current) => {
    const prevToday = current?.[todayKey] && typeof current[todayKey] === 'object'
      ? current[todayKey]
      : { public: 0, admin: 0 };
    const used = Number.isInteger(prevToday[bucket]) ? prevToday[bucket] : 0;
    if (used >= limit) {
      return { response: { allowed: false, used, limit } };
    }
    const nextToday = {
      public: bucket === 'public' ? used + 1 : (Number.isInteger(prevToday.public) ? prevToday.public : 0),
      admin: bucket === 'admin' ? used + 1 : (Number.isInteger(prevToday.admin) ? prevToday.admin : 0),
    };
    return {
      value: { [todayKey]: nextToday },
      result: { allowed: true, used: nextToday[bucket], limit },
    };
  });
  return outcome.response || outcome.result;
}

async function readDailyQuota(store) {
  const todayKey = getArgentinaDateKey();
  const stored = await readJsonBlob(store, KEYS.assistantQuota, {});
  const today = stored?.[todayKey] && typeof stored[todayKey] === 'object' ? stored[todayKey] : {};
  return {
    public: Number.isInteger(today.public) ? today.public : 0,
    admin: Number.isInteger(today.admin) ? today.admin : 0,
  };
}

async function refundDailyQuota(store, bucket) {
  const todayKey = getArgentinaDateKey();
  await updateJsonBlob(store, KEYS.assistantQuota, {}, (current) => {
    const prevToday = current?.[todayKey] && typeof current[todayKey] === 'object'
      ? current[todayKey]
      : null;
    if (!prevToday) return { response: true };
    const used = Number.isInteger(prevToday[bucket]) ? prevToday[bucket] : 0;
    if (used <= 0) return { response: true };
    const nextToday = {
      ...prevToday,
      [bucket]: used - 1,
    };
    return {
      value: { [todayKey]: nextToday },
      result: true,
    };
  });
}

export function createApiHandler({
  getSiteStore: resolveSiteStore = getSiteStore,
  getMediaStore: resolveMediaStore = getMediaStore,
  env = readRuntimeEnv,
  rateLimits = {},
  fetchImpl = globalThis.fetch,
} = {}) {
  const checkOrdersLimit = createMemoryLimiter({
    windowMs: rateLimits.ordersWindowMs ?? 5 * 60_000,
    max: rateLimits.ordersMax ?? 15,
  });
  const checkAssistantLimit = createMemoryLimiter({
    windowMs: rateLimits.assistantWindowMs ?? 10 * 60_000,
    max: rateLimits.assistantMax ?? 8,
  });
  const checkScoresLimit = createMemoryLimiter({
    windowMs: rateLimits.scoresWindowMs ?? 5 * 60_000,
    max: rateLimits.scoresMax ?? 30,
  });
  const checkCustomerAuthLimit = createMemoryLimiter({
    windowMs: rateLimits.customerAuthWindowMs ?? 15 * 60_000,
    max: rateLimits.customerAuthMax ?? 12,
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
        const facebookEnabled = isFacebookOAuthConfigured(envConfig);
        const emailEnabled = isEmailAuthConfigured(envConfig);
        const providers = [
          ...(googleEnabled ? ['google'] : []),
          ...(facebookEnabled ? ['facebook'] : []),
          ...(emailEnabled ? ['email'] : []),
        ];
        const enabled = providers.length > 0;
        const sessionUser = enabled ? authenticateUserCookie(request, envConfig) : null;
        return jsonResponse({
          enabled,
          providers,
          authFlow: 'redirect',
          session: sessionUser
            ? {
              user: {
                id: sessionUser.id,
                email: sessionUser.email,
                name: sessionUser.name,
                image: sessionUser.image,
                provider: sessionUser.provider,
                emailVerified: sessionUser.emailVerified,
              },
              session: {
                expiresAt: new Date(sessionUser.exp * 1000).toISOString(),
              },
            }
            : null,
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

        const tokenResponse = await fetchImpl('https://oauth2.googleapis.com/token', {
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

        const profileResponse = await fetchImpl('https://openidconnect.googleapis.com/v1/userinfo', {
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
        const adminSecret = envConfig.ADMIN_SESSION_SECRET || signingSecret;
        const canGrantAdmin = adminSecret
          && adminSecret.length >= 32
          && isAdminGoogleEmail(savedUser.email, envConfig, accountOverride);

        if (canGrantAdmin) {
          const adminToken = createAdminToken(
            { email: savedUser.email, name: savedUser.name, method: 'google' },
            adminSecret,
          );
          responseCookies.push(buildAdminCookie(adminToken, { secure: https }));
        } else if (returnTo.startsWith('/admin.html')) {
          return redirectResponse('/admin.html?auth_error=not_admin', responseCookies);
        }

        return redirectResponse(returnTo, responseCookies);
      }

      if (path === '/api/auth/register' && method === 'POST') {
        if (!isSameOriginRequest(request, url)) {
          return errorResponse(403, 'FORBIDDEN_ORIGIN', 'Origen no autorizado.');
        }
        if (!isEmailAuthConfigured(envConfig)) {
          return errorResponse(503, 'AUTH_NOT_CONFIGURED', 'El registro con correo todavía no está habilitado en el servidor.');
        }

        const retryAfter = checkCustomerAuthLimit(getClientIp(request));
        if (retryAfter > 0) {
          return jsonResponse(
            {
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Demasiados intentos en poco tiempo. Esperá unos minutos y volvé a probar.',
              },
            },
            429,
            { 'Retry-After': String(retryAfter) },
          );
        }

        const body = customerRegisterSchema.parse(await parseJsonBody(request));
        const signingSecret = getSessionSigningSecret(envConfig);
        const nowIso = new Date().toISOString();
        const userId = 'USR-' + randomUUID();
        const passwordHash = hashPasswordPbkdf2(body.password);

        const credentialOutcome = await updateJsonBlob(store, KEYS.userCredentials, {}, (current) => {
          if (current[body.email]) {
            return {
              value: current,
              response: errorResponse(409, 'EMAIL_EXISTS', 'Ya existe una cuenta registrada con ese correo. Probá iniciar sesión.'),
            };
          }
          return {
            value: {
              ...current,
              [body.email]: {
                id: userId,
                email: body.email,
                name: body.name,
                passwordHash,
                createdAt: nowIso,
                updatedAt: nowIso,
              },
            },
          };
        });

        if (credentialOutcome.response) {
          return credentialOutcome.response;
        }

        const savedUser = await upsertRegisteredUser(store, {
          sub: userId,
          email: body.email,
          name: body.name,
          provider: 'email',
          emailVerified: false,
        });
        const userToken = createUserToken(savedUser, signingSecret);

        return jsonResponse(
          {
            user: {
              id: savedUser.id,
              email: savedUser.email,
              name: savedUser.name,
              image: savedUser.image,
              provider: savedUser.provider,
              emailVerified: savedUser.emailVerified,
            },
            session: {
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
          201,
          {},
          [buildUserCookie(userToken, { secure: https })],
        );
      }

      if (path === '/api/auth/login' && method === 'POST') {
        if (!isSameOriginRequest(request, url)) {
          return errorResponse(403, 'FORBIDDEN_ORIGIN', 'Origen no autorizado.');
        }
        if (!isEmailAuthConfigured(envConfig)) {
          return errorResponse(503, 'AUTH_NOT_CONFIGURED', 'El ingreso con correo todavía no está habilitado en el servidor.');
        }

        const retryAfter = checkCustomerAuthLimit(getClientIp(request));
        if (retryAfter > 0) {
          return jsonResponse(
            {
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Demasiados intentos en poco tiempo. Esperá unos minutos y volvé a probar.',
              },
            },
            429,
            { 'Retry-After': String(retryAfter) },
          );
        }

        const body = customerLoginSchema.parse(await parseJsonBody(request));
        const credentials = await readJsonBlob(store, KEYS.userCredentials, {});
        const record = credentials && typeof credentials === 'object' ? credentials[body.email] : null;
        const validPassword = Boolean(record?.passwordHash) && verifyPasswordHash(body.password, record.passwordHash);

        if (!record || !validPassword) {
          return errorResponse(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
        }

        const savedUser = await upsertRegisteredUser(store, {
          sub: record.id,
          email: record.email,
          name: record.name,
          provider: 'email',
          emailVerified: false,
        });
        const signingSecret = getSessionSigningSecret(envConfig);
        const userToken = createUserToken(savedUser, signingSecret);

        return jsonResponse(
          {
            user: {
              id: savedUser.id,
              email: savedUser.email,
              name: savedUser.name,
              image: savedUser.image,
              provider: savedUser.provider,
              emailVerified: savedUser.emailVerified,
            },
            session: {
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
          200,
          {},
          [buildUserCookie(userToken, { secure: https })],
        );
      }

      if (path === '/api/auth/facebook/start' && method === 'GET') {
        if (!isFacebookOAuthConfigured(envConfig)) {
          return errorResponse(503, 'AUTH_NOT_CONFIGURED', 'El inicio de sesión con Facebook todavía no está configurado en Netlify.');
        }

        const signingSecret = getSessionSigningSecret(envConfig);
        const returnTo = sanitizeReturnTo(url.searchParams.get('returnTo'), '/');
        const { state, codeVerifier } = generatePkcePair();
        const stateToken = createOAuthStateToken({ state, codeVerifier, returnTo }, signingSecret);

        const facebookUrl = new URL('https://www.facebook.com/v20.0/dialog/oauth');
        facebookUrl.searchParams.set('client_id', envConfig.FACEBOOK_CLIENT_ID.trim());
        facebookUrl.searchParams.set('redirect_uri', `${url.origin}/api/auth/callback/facebook`);
        facebookUrl.searchParams.set('response_type', 'code');
        facebookUrl.searchParams.set('scope', 'email,public_profile');
        facebookUrl.searchParams.set('state', state);

        return redirectResponse(facebookUrl.toString(), [
          buildOAuthStateCookie(stateToken, { secure: https }),
        ]);
      }

      if (path === '/api/auth/callback/facebook' && method === 'GET') {
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
          !isFacebookOAuthConfigured(envConfig)
          || oauthError
          || !code
          || !returnedState
          || !statePayload
          || !safeEqualStrings(returnedState, statePayload.state)
        ) {
          return redirectResponse(
            appendQueryParam(returnTo, 'auth_error', oauthError === 'access_denied' ? 'facebook_cancelled' : 'facebook_failed'),
            [clearOAuthCookie],
          );
        }

        const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token');
        tokenUrl.searchParams.set('client_id', envConfig.FACEBOOK_CLIENT_ID.trim());
        tokenUrl.searchParams.set('client_secret', envConfig.FACEBOOK_CLIENT_SECRET.trim());
        tokenUrl.searchParams.set('redirect_uri', `${url.origin}/api/auth/callback/facebook`);
        tokenUrl.searchParams.set('code', code);

        const tokenResponse = await fetchImpl(tokenUrl.toString(), {
          signal: AbortSignal.timeout(10_000),
        });

        if (!tokenResponse.ok) {
          return redirectResponse(appendQueryParam(returnTo, 'auth_error', 'facebook_token_failed'), [clearOAuthCookie]);
        }

        const tokenJson = await tokenResponse.json().catch(() => null);
        if (!tokenJson?.access_token) {
          return redirectResponse(appendQueryParam(returnTo, 'auth_error', 'facebook_token_failed'), [clearOAuthCookie]);
        }

        const profileResponse = await fetchImpl(
          'https://graph.facebook.com/me?fields=id,name,email,picture.type(large)',
          {
            headers: { Authorization: `Bearer ${tokenJson.access_token}` },
            signal: AbortSignal.timeout(10_000),
          },
        );

        if (!profileResponse.ok) {
          return redirectResponse(appendQueryParam(returnTo, 'auth_error', 'facebook_profile_failed'), [clearOAuthCookie]);
        }

        const profile = await profileResponse.json().catch(() => null);
        if (!profile?.id || !profile?.email) {
          return redirectResponse(appendQueryParam(returnTo, 'auth_error', 'facebook_no_email'), [clearOAuthCookie]);
        }

        const savedUser = await upsertRegisteredUser(store, {
          sub: `fb:${profile.id}`,
          email: profile.email,
          name: profile.name,
          picture: profile.picture?.data?.url || '',
          provider: 'facebook',
          emailVerified: true,
        });
        const userToken = createUserToken(savedUser, signingSecret);
        const responseCookies = [
          clearOAuthCookie,
          buildUserCookie(userToken, { secure: https }),
        ];

        if (returnTo.startsWith('/admin.html')) {
          return redirectResponse('/admin.html?auth_error=not_admin', responseCookies);
        }

        return redirectResponse(returnTo, responseCookies);
      }

      if (path === '/api/auth/sign-out' && method === 'POST') {
        if (!isSameOriginRequest(request, url)) {
          return errorResponse(403, 'FORBIDDEN_ORIGIN', 'Origen no autorizado.');
        }

        const cookies = [buildClearUserCookie({ secure: https })];
        const adminUser = resolveNetlifyAdminUser(request, envConfig);
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
            assistantEnabled: isGeminiConfigured(envConfig),
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
        const authProvider = sessionUser?.provider || input.authProvider || '';
        const googleRegistered = Boolean(sessionUser && sessionUser.provider === 'google');
        const accountRegistered = Boolean(sessionUser);
        const customerEmail = sessionUser?.email || '';
        const order = {
          id: 'PED-' + Date.now().toString(36).toUpperCase() + '-' + randomBytes(2).toString('hex').toUpperCase(),
          createdAt: new Date().toISOString(),
          customerName: input.customerName || sessionUser?.name || '',
          customerEmail,
          googleRegistered,
          accountRegistered,
          authProvider,
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

      if (path === '/api/assistant/status' && method === 'GET') {
        return jsonResponse({
          data: {
            enabled: isGeminiConfigured(envConfig),
          },
        });
      }

      if (path === '/api/assistant/care' && method === 'POST') {
        if (!isSameOriginRequest(request, url)) {
          return errorResponse(403, 'FORBIDDEN_ORIGIN', 'Origen no autorizado.');
        }
        if (!isGeminiConfigured(envConfig)) {
          return errorResponse(503, 'ASSISTANT_NOT_CONFIGURED', 'El asistente botánico no está activo en este momento.');
        }
        const retryAfter = checkAssistantLimit(getClientIp(request));
        if (retryAfter > 0) {
          return jsonResponse(
            {
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Hiciste varias consultas seguidas. Esperá unos minutos o escribinos por WhatsApp.',
              },
            },
            429,
            { 'Retry-After': String(retryAfter) },
          );
        }

        const input = careAssistantRequestSchema.parse(await parseJsonBody(request));
        let normalizedImage = null;
        if (input.image) {
          try {
            normalizedImage = normalizeValidatedImage(input.image);
          } catch (mediaError) {
            return errorResponse(400, 'INVALID_MEDIA', mediaError.message);
          }
        }

        const quota = await consumeDailyQuota(store, 'public', getGeminiDailyLimit(envConfig));
        if (!quota.allowed) {
          return errorResponse(
            429,
            'ASSISTANT_DAILY_LIMIT',
            'Alcanzamos el límite diario de consultas del asistente. Escribinos por WhatsApp y te ayudamos directo.',
          );
        }

        const activeProducts = (await loadProducts(store)).filter((item) => item.isActive !== false);
        try {
          const result = await diagnoseCarnivorousPlant({
            apiKey: envConfig.GEMINI_API_KEY.trim(),
            model: getGeminiModel(envConfig),
            question: input.question,
            species: input.species,
            locationContext: input.locationContext,
            image: normalizedImage,
            catalogProducts: activeProducts,
            fetchImpl,
          });
          return jsonResponse({ data: result });
        } catch (assistantError) {
          if ((assistantError?.status ?? 500) >= 500) {
            await refundDailyQuota(store, 'public').catch(() => {});
          }
          throw assistantError;
        }
      }

      if (path === '/api/assistant/recommend' && method === 'POST') {
        if (!isSameOriginRequest(request, url)) {
          return errorResponse(403, 'FORBIDDEN_ORIGIN', 'Origen no autorizado.');
        }
        if (!isGeminiConfigured(envConfig)) {
          return errorResponse(503, 'ASSISTANT_NOT_CONFIGURED', 'El recomendador no está activo en este momento.');
        }
        const retryAfter = checkAssistantLimit(getClientIp(request));
        if (retryAfter > 0) {
          return jsonResponse(
            {
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Hiciste varias consultas seguidas. Esperá unos minutos o escribinos por WhatsApp.',
              },
            },
            429,
            { 'Retry-After': String(retryAfter) },
          );
        }

        const input = catalogRecommendRequestSchema.parse(await parseJsonBody(request));
        const quota = await consumeDailyQuota(store, 'public', getGeminiDailyLimit(envConfig));
        if (!quota.allowed) {
          return errorResponse(
            429,
            'ASSISTANT_DAILY_LIMIT',
            'Alcanzamos el límite diario de recomendaciones automáticas. Podés consultarnos por WhatsApp.',
          );
        }

        const activeProducts = (await loadProducts(store)).filter((item) => item.isActive !== false);
        try {
          const result = await recommendCatalogProducts({
            apiKey: envConfig.GEMINI_API_KEY.trim(),
            model: getGeminiModel(envConfig),
            query: input.query,
            sunlight: input.sunlight,
            experience: input.experience,
            budgetMaxARS: input.budgetMaxARS,
            catalogProducts: activeProducts,
            fetchImpl,
          });
          return jsonResponse({ data: result });
        } catch (assistantError) {
          if ((assistantError?.status ?? 500) >= 500) {
            await refundDailyQuota(store, 'public').catch(() => {});
          }
          throw assistantError;
        }
      }

      // 3. JUEGOS PROTEGIDOS (GOOGLE OAUTH O SESIÓN DE ADMINISTRADOR)
      if (path === '/api/games' || path.startsWith('/api/games/')) {
        const accountOverride = await readJsonBlob(store, KEYS.adminAccount, null);
        const adminUser = resolveNetlifyAdminUser(request, envConfig, accountOverride);
        const customerUser = !adminUser ? authenticateUserCookie(request, envConfig) : null;
        const viewer = adminUser
          ? { isAdmin: true, role: 'admin', playerName: adminUser.name, email: adminUser.email || '' }
          : customerUser
            ? { isAdmin: false, role: 'player', playerName: customerUser.name, email: customerUser.email || '' }
            : null;

        if (!viewer) {
          const anyAuthConfigured = isGoogleOAuthConfigured(envConfig)
            || isFacebookOAuthConfigured(envConfig)
            || isEmailAuthConfigured(envConfig)
            || isAdminConfigured(envConfig, accountOverride);
          if (!anyAuthConfigured) {
            return errorResponse(503, 'AUTH_NOT_CONFIGURED', 'El acceso estará disponible cuando se configure un método de ingreso.');
          }
          return errorResponse(401, 'AUTH_REQUIRED', 'Iniciá sesión para entrar a esta sección.');
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

        const configMatch = /^\/api\/games\/([a-z0-9-]+)\/config$/.exec(path);
        if (configMatch && method === 'GET') {
          const slug = configMatch[1];
          const game = visibleGames.find((item) => item.slug === slug);
          if (!game) {
            return errorResponse(404, 'GAME_NOT_FOUND', 'No encontramos ese juego.');
          }
          const savedConfig = await readJsonBlob(store, `${KEYS.gameConfigPrefix}${slug}`, null);
          return jsonResponse({
            data: savedConfig,
            meta: { isAdmin: viewer.isAdmin, role: viewer.role },
          });
        }

        const scoresMatch = /^\/api\/games\/([a-z0-9-]+)\/scores$/.exec(path);
        if (scoresMatch && method === 'POST') {
          if (!isSameOriginRequest(request, url)) {
            return errorResponse(403, 'FORBIDDEN_ORIGIN', 'Origen no autorizado.');
          }
          const retryAfter = checkScoresLimit(getClientIp(request));
          if (retryAfter > 0) {
            return jsonResponse(
              {
                error: {
                  code: 'RATE_LIMIT_EXCEEDED',
                  message: 'Demasiados envíos de puntaje en poco tiempo. Esperá unos segundos.',
                },
              },
              429,
              { 'Retry-After': String(retryAfter) },
            );
          }
          const slug = scoresMatch[1];
          const game = visibleGames.find((item) => item.slug === slug);
          if (!game) {
            return errorResponse(404, 'GAME_NOT_FOUND', 'No encontramos ese juego.');
          }
          const scoreInput = gameScorePayloadSchema.parse(await parseJsonBody(request));
          const record = {
            id: 'SCR-' + Date.now().toString(36).toUpperCase() + '-' + randomBytes(2).toString('hex').toUpperCase(),
            gameSlug: slug,
            playerName: viewer.playerName,
            playerEmail: viewer.email,
            isAdmin: viewer.isAdmin,
            ...scoreInput,
            createdAt: new Date().toISOString(),
          };
          await updateJsonBlob(store, KEYS.gameScores, [], (list) => ({
            value: [record, ...list].slice(0, 250),
          }));
          return jsonResponse({ data: record }, 201);
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
        const wantMeta = url.searchParams.get('meta') === '1';
        if (!wantMeta) {
          const cookies = parseCookies(request.headers.get('cookie') || '');
          if (!cookies.ct_admin_session && !cookies.ct_user_session) {
            return jsonResponse({
              data: {
                authenticated: false,
                user: null,
              },
            });
          }
        }

        const accountOverride = await readJsonBlob(store, KEYS.adminAccount, null);
        const googleAllowed = isGoogleOAuthConfigured(envConfig)
          && (parseAdminEmails(envConfig).length > 0 || Boolean(accountOverride?.email));
        const configured = isAdminConfigured(envConfig, accountOverride) || googleAllowed;
        const user = configured ? resolveNetlifyAdminUser(request, envConfig, accountOverride) : null;

        if (!user && !wantMeta) {
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
        const adminUser = resolveNetlifyAdminUser(request, envConfig);
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

        const adminUser = resolveNetlifyAdminUser(request, envConfig, accountOverride);
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

          const adminSigningSecret = envConfig.ADMIN_SESSION_SECRET || getSessionSigningSecret(envConfig);
          if (!adminSigningSecret || String(adminSigningSecret).length < 32) {
            return errorResponse(503, 'ADMIN_NOT_CONFIGURED', 'Falta el secreto de sesión para actualizar la cuenta de administrador.');
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
            adminSigningSecret,
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

        const adminGameConfigMatch = /^\/api\/admin\/games\/([a-z0-9-]+)\/config$/.exec(path);
        if (adminGameConfigMatch && (method === 'GET' || method === 'PUT')) {
          const slug = adminGameConfigMatch[1];
          if (method === 'GET') {
            const savedConfig = await readJsonBlob(store, `${KEYS.gameConfigPrefix}${slug}`, null);
            return jsonResponse({ data: savedConfig });
          }
          let validConfig;
          try {
            validConfig = validateGameRuntimeConfig(await parseJsonBody(request));
          } catch (configError) {
            if (configError instanceof SyntaxError || configError instanceof ZodError) throw configError;
            return errorResponse(400, 'VALIDATION_ERROR', configError.message);
          }
          await store.setJSON(`${KEYS.gameConfigPrefix}${slug}`, validConfig);
          return jsonResponse({ data: validConfig });
        }

        const adminGameScoresMatch = /^\/api\/admin\/games\/([a-z0-9-]+)\/scores$/.exec(path);
        if (adminGameScoresMatch && method === 'GET') {
          const slug = adminGameScoresMatch[1];
          const allScores = await readJsonBlob(store, KEYS.gameScores, []);
          const list = Array.isArray(allScores) ? allScores.filter((item) => item.gameSlug === slug) : [];
          return jsonResponse({ data: list });
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

        if (path === '/api/admin/assistant/status' && method === 'GET') {
          const used = await readDailyQuota(store);
          return jsonResponse({
            data: {
              enabled: isGeminiConfigured(envConfig),
              model: getGeminiModel(envConfig),
              dailyLimit: getGeminiDailyLimit(envConfig),
              usedToday: used.public,
              adminDailyLimit: DEFAULT_ADMIN_DAILY_LIMIT,
              adminUsedToday: used.admin,
            },
          });
        }

        if (path === '/api/admin/assistant/copy' && method === 'POST') {
          if (!isGeminiConfigured(envConfig)) {
            return errorResponse(503, 'ASSISTANT_NOT_CONFIGURED', 'Configurá GEMINI_API_KEY en Netlify para activar el Copiloto IA.');
          }
          const body = adminCopyRequestSchema.parse(await parseJsonBody(request));
          let resolvedImage = null;
          if (body.image) {
            try {
              resolvedImage = normalizeValidatedImage(body.image);
            } catch (mediaError) {
              return errorResponse(400, 'INVALID_MEDIA', mediaError.message);
            }
          } else if (body.imageUrl) {
            const mediaKey = extractManagedMediaKey(body.imageUrl);
            if (mediaKey) {
              const entry = await resolveMediaStore().getWithMetadata(mediaKey, { type: 'arrayBuffer', consistency: 'strong' });
              const mime = entry?.metadata?.contentType;
              if (entry?.data && ['image/png', 'image/jpeg', 'image/webp'].includes(mime)) {
                const buffer = Buffer.from(entry.data);
                if (buffer.length > 0 && buffer.length <= 2 * 1024 * 1024) {
                  resolvedImage = { contentType: mime, dataBase64: buffer.toString('base64') };
                }
              }
            }
          }

          const quota = await consumeDailyQuota(store, 'admin', DEFAULT_ADMIN_DAILY_LIMIT);
          if (!quota.allowed) {
            return errorResponse(429, 'ASSISTANT_DAILY_LIMIT', 'Se alcanzó el límite diario del Copiloto IA de administración.');
          }

          try {
            const result = await generateAdminCopy({
              apiKey: envConfig.GEMINI_API_KEY.trim(),
              model: getGeminiModel(envConfig),
              target: body.target,
              name: body.name,
              species: body.species,
              category: body.category,
              price: body.price,
              note: body.note,
              existingDescription: body.existingDescription,
              image: resolvedImage,
              fetchImpl,
            });
            return jsonResponse({ data: result });
          } catch (assistantError) {
            if ((assistantError?.status ?? 500) >= 500) {
              await refundDailyQuota(store, 'admin').catch(() => {});
            }
            throw assistantError;
          }
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

      if (error instanceof AssistantServiceError) {
        return errorResponse(error.status, error.code, error.message);
      }

      console.error('Error en función API de Netlify:', error?.message || error);
      return errorResponse(500, 'INTERNAL_ERROR', 'Error interno al procesar la solicitud.');
    }
  };
}

export default createApiHandler();
