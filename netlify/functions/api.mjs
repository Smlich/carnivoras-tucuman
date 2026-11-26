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
  siteSettingsSchema,
  validateAndDecodeImageBase64,
} from '../../server/src/schemas/admin-schemas.js';
import {
  sanitizeGamesForViewer,
  sanitizePublicGamesPreview,
} from '../../server/src/utils/game-visibility.js';

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
};

function readRuntimeEnv(name) {
  if (typeof globalThis.Netlify?.env?.get === 'function') {
    const value = globalThis.Netlify.env.get(name);
    if (value !== undefined) return value;
  }
  return process.env[name];
}

function getAdminEnvConfig() {
  return {
    ADMIN_EMAIL: readRuntimeEnv('ADMIN_EMAIL') || '',
    ADMIN_EMAILS: readRuntimeEnv('ADMIN_EMAILS') || '',
    ADMIN_NAME: readRuntimeEnv('ADMIN_NAME') || 'Administrador',
    ADMIN_PASSWORD: readRuntimeEnv('ADMIN_PASSWORD') || '',
    ADMIN_PASSWORD_HASH: readRuntimeEnv('ADMIN_PASSWORD_HASH') || '',
    ADMIN_SESSION_SECRET: readRuntimeEnv('ADMIN_SESSION_SECRET') || '',
    GOOGLE_CLIENT_ID: readRuntimeEnv('GOOGLE_CLIENT_ID') || '',
    GOOGLE_CLIENT_SECRET: readRuntimeEnv('GOOGLE_CLIENT_SECRET') || '',
    USER_SESSION_SECRET: readRuntimeEnv('USER_SESSION_SECRET') || '',
    BETTER_AUTH_SECRET: readRuntimeEnv('BETTER_AUTH_SECRET') || '',
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

function authenticateAdminCookie(request, envConfig) {
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const token = cookies.ct_admin_session;
  if (!token || !envConfig.ADMIN_SESSION_SECRET) return null;
  const parsed = verifyAdminToken(token, envConfig.ADMIN_SESSION_SECRET);
  if (!parsed) return null;
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
  const users = await loadRegisteredUsers(store);
  const normalizedEmail = profile.email.trim().toLowerCase();
  const userId = String(profile.sub || normalizedEmail);
  const nowIso = new Date().toISOString();
  const existingIndex = users.findIndex((item) => item.id === userId || item.email === normalizedEmail);
  const existing = existingIndex >= 0 ? users[existingIndex] : null;

  const record = {
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

  if (existingIndex >= 0) {
    users.splice(existingIndex, 1);
  }
  users.unshift(record);
  await store.setJSON(KEYS.users, users.slice(0, 1000));
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

export default async function handler(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const envConfig = getAdminEnvConfig();
  const https = isHttpsRequest(request, url);

  try {
    // 1. MEDIA PÚBLICA DESDE BLOBS
    if (path.startsWith('/api/media/') && method === 'GET') {
      const key = decodeURIComponent(path.slice('/api/media/'.length));
      if (!/^[a-zA-Z0-9._-]{3,160}$/.test(key)) {
        return errorResponse(400, 'INVALID_MEDIA_KEY', 'Identificador de archivo inválido.');
      }

      const mediaStore = getMediaStore();
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

    const store = getSiteStore();

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
      const category = url.searchParams.get('category') || undefined;
      const q = url.searchParams.get('q') || '';
      const page = Math.max(1, Number(url.searchParams.get('page') || 1) || 1);
      const limit = Math.min(48, Math.max(1, Number(url.searchParams.get('limit') || 24) || 24));

      const normalizedSearch = normalizeSearchText(q);
      const activeProducts = (await loadProducts(store)).filter((item) => item.isActive !== false);
      const filtered = activeProducts.filter((product) => {
        const matchesCategory = !category || product.category === category;
        const searchable = normalizeSearchText(
          [product.name, product.species, product.description, product.categoryLabel, product.note].join(' '),
        );
        return matchesCategory && searchable.includes(normalizedSearch);
      });
      const start = (page - 1) * limit;

      return jsonResponse({
        data: filtered.slice(start, start + limit),
        meta: { page, limit, total: filtered.length, source: 'netlify-blobs' },
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
      const input = orderCreateSchema.parse(await parseJsonBody(request));
      const sessionUser = authenticateUserCookie(request, envConfig);
      const googleRegistered = Boolean(sessionUser);
      const customerEmail = sessionUser?.email || '';
      const totalARS = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const order = {
        id: 'PED-' + Date.now().toString(36).toUpperCase() + '-' + randomBytes(2).toString('hex').toUpperCase(),
        createdAt: new Date().toISOString(),
        customerName: input.customerName || sessionUser?.name || '',
        customerEmail,
        googleRegistered,
        notes: input.notes,
        items: input.items,
        totalARS,
        status: 'nuevo',
        adminNotes: '',
        source: input.source,
      };
      const orders = await loadOrders(store);
      orders.unshift(order);
      await store.setJSON(KEYS.orders, orders.slice(0, 250));
      return jsonResponse({ data: order }, 201);
    }

    // 3. JUEGOS PROTEGIDOS (GOOGLE OAUTH O SESIÓN DE ADMINISTRADOR)
    if (path === '/api/games' || path.startsWith('/api/games/')) {
      const accountOverride = await readJsonBlob(store, KEYS.adminAccount, null);
      const adminUser = authenticateAdminCookie(request, envConfig);
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
      const user = configured ? authenticateAdminCookie(request, envConfig) : null;

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
        return errorResponse(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
      }

      const token = createAdminToken({ email: verification.email, name: verification.name }, envConfig.ADMIN_SESSION_SECRET);
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

      const adminUser = authenticateAdminCookie(request, envConfig);
      if (!adminUser) {
        return errorResponse(401, 'ADMIN_AUTH_REQUIRED', 'Iniciá sesión como administrador para acceder al panel.');
      }

      if (path === '/api/admin/auth/account' && method === 'PUT') {
        const body = adminAccountUpdateSchema.parse(await parseJsonBody(request));
        const verificationEmail = adminUser.method === 'google'
          ? (accountOverride?.email || getPrimaryAdminEmail(envConfig))
          : adminUser.email;
        const verification = verifyBootstrapCredentials({
          email: verificationEmail,
          password: body.currentPassword,
          envConfig,
          overrideAccount: accountOverride,
        });

        if (verification.configured && !verification.valid) {
          return errorResponse(401, 'INVALID_CURRENT_PASSWORD', 'La contraseña actual no coincide.');
        }

        const passwordToHash = body.newPassword || body.currentPassword;
        const nextOverride = {
          email: body.email.trim().toLowerCase(),
          name: body.name.trim(),
          passwordHash: hashPasswordPbkdf2(passwordToHash),
          updatedAt: new Date().toISOString(),
        };
        await store.setJSON(KEYS.adminAccount, nextOverride);

        const nextToken = createAdminToken(
          { email: nextOverride.email, name: nextOverride.name, method: adminUser.method },
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

      if (path === '/api/admin/products') {
        if (method === 'GET') {
          return jsonResponse({ data: await loadProducts(store) });
        }
        if (method === 'POST') {
          const item = productPayloadSchema.parse(await parseJsonBody(request));
          const list = await loadProducts(store);
          if (list.some((existing) => existing.id === item.id)) {
            return errorResponse(409, 'DUPLICATE_SLUG', `Ya existe un producto con el identificador "${item.id}".`);
          }
          list.push(item);
          await store.setJSON(KEYS.products, list);
          return jsonResponse({ data: item }, 201);
        }
      }

      if (path.startsWith('/api/admin/products/')) {
        const slug = decodeURIComponent(path.slice('/api/admin/products/'.length));
        const list = await loadProducts(store);
        const index = list.findIndex((item) => item.id === slug);
        if (index === -1) return errorResponse(404, 'PRODUCT_NOT_FOUND', 'No encontramos ese producto.');

        if (method === 'PUT') {
          const updated = productPayloadSchema.parse({ ...(await parseJsonBody(request)), id: slug });
          list[index] = updated;
          await store.setJSON(KEYS.products, list);
          return jsonResponse({ data: updated });
        }
        if (method === 'DELETE') {
          list.splice(index, 1);
          await store.setJSON(KEYS.products, list);
          return jsonResponse({ data: { deletedId: slug } });
        }
      }

      if (path === '/api/admin/gallery') {
        if (method === 'GET') {
          return jsonResponse({ data: await loadGallery(store) });
        }
        if (method === 'POST') {
          const item = galleryItemPayloadSchema.parse(await parseJsonBody(request));
          const list = await loadGallery(store);
          if (list.some((existing) => existing.id === item.id)) {
            return errorResponse(409, 'DUPLICATE_ID', `Ya existe una foto con el identificador "${item.id}".`);
          }
          list.push(item);
          await store.setJSON(KEYS.gallery, list);
          return jsonResponse({ data: item }, 201);
        }
      }

      if (path.startsWith('/api/admin/gallery/')) {
        const id = decodeURIComponent(path.slice('/api/admin/gallery/'.length));
        const list = await loadGallery(store);
        const index = list.findIndex((item) => item.id === id);
        if (index === -1) return errorResponse(404, 'GALLERY_ITEM_NOT_FOUND', 'No encontramos esa fotografía.');

        if (method === 'PUT') {
          const updated = galleryItemPayloadSchema.parse({ ...(await parseJsonBody(request)), id });
          list[index] = updated;
          await store.setJSON(KEYS.gallery, list);
          return jsonResponse({ data: updated });
        }
        if (method === 'DELETE') {
          list.splice(index, 1);
          await store.setJSON(KEYS.gallery, list);
          return jsonResponse({ data: { deletedId: id } });
        }
      }

      if (path === '/api/admin/games') {
        if (method === 'GET') {
          return jsonResponse({ data: await loadGames(store) });
        }
        if (method === 'POST') {
          const parsedGame = gamePayloadSchema.parse(await parseJsonBody(request));
          const game = { ...parsedGame, id: parsedGame.slug, requiredProviders: ['google'] };
          const list = await loadGames(store);
          if (list.some((existing) => existing.slug === game.slug)) {
            return errorResponse(409, 'DUPLICATE_SLUG', `Ya existe un juego con slug "${game.slug}".`);
          }
          list.push(game);
          await store.setJSON(KEYS.games, list);
          return jsonResponse({ data: game }, 201);
        }
      }

      if (path.startsWith('/api/admin/games/')) {
        const slug = decodeURIComponent(path.slice('/api/admin/games/'.length));
        const list = await loadGames(store);
        const index = list.findIndex((item) => item.slug === slug);
        if (index === -1) return errorResponse(404, 'GAME_NOT_FOUND', 'No encontramos ese juego.');

        if (method === 'PUT') {
          const parsedGame = gamePayloadSchema.parse({ ...(await parseJsonBody(request)), slug });
          const updated = { ...parsedGame, id: slug, requiredProviders: ['google'] };
          list[index] = updated;
          await store.setJSON(KEYS.games, list);
          return jsonResponse({ data: updated });
        }
        if (method === 'DELETE') {
          list.splice(index, 1);
          await store.setJSON(KEYS.games, list);
          return jsonResponse({ data: { deletedSlug: slug } });
        }
      }

      if (path === '/api/admin/orders' && method === 'GET') {
        return jsonResponse({ data: await loadOrders(store) });
      }

      if (path.startsWith('/api/admin/orders/')) {
        const id = decodeURIComponent(path.slice('/api/admin/orders/'.length));
        const list = await loadOrders(store);
        const index = list.findIndex((order) => order.id === id);
        if (index === -1) return errorResponse(404, 'ORDER_NOT_FOUND', 'No encontramos ese pedido.');

        if (method === 'PATCH') {
          const patch = orderUpdateSchema.parse(await parseJsonBody(request));
          list[index] = {
            ...list[index],
            status: patch.status,
            adminNotes: patch.adminNotes,
            updatedAt: new Date().toISOString(),
          };
          await store.setJSON(KEYS.orders, list);
          return jsonResponse({ data: list[index] });
        }
        if (method === 'DELETE') {
          list.splice(index, 1);
          await store.setJSON(KEYS.orders, list);
          return jsonResponse({ data: { deletedId: id } });
        }
      }

      if (path === '/api/admin/media' && method === 'POST') {
        const payload = mediaUploadSchema.parse(await parseJsonBody(request));
        const buffer = validateAndDecodeImageBase64(payload.dataBase64, payload.contentType);
        const baseName = payload.filename
          .replace(/\.[^.]+$/, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 48) || 'imagen';
        const key = `${Date.now()}-${randomUUID().slice(0, 8)}-${baseName}.${extensionForMime(payload.contentType)}`;

        const mediaStore = getMediaStore();
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

    console.error('Error en función API de Netlify:', error?.message || error);
    return errorResponse(500, 'INTERNAL_ERROR', error?.message || 'Error interno al procesar la solicitud.');
  }
}
