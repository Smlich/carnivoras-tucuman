import {
  createHash,
  createHmac,
  pbkdf2Sync,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

export const ADMIN_COOKIE_NAME = 'ct_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;
export const USER_COOKIE_NAME = 'ct_user_session';
export const USER_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
export const OAUTH_STATE_COOKIE_NAME = 'ct_oauth_state';
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_KEY_LENGTH = 32;

function sha256Buffer(value) {
  return createHash('sha256').update(String(value ?? ''), 'utf8').digest();
}

export function safeEqualStrings(left, right) {
  return timingSafeEqual(sha256Buffer(left), sha256Buffer(right));
}

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function parseAdminEmails(envConfig = {}) {
  const candidates = [
    ...(String(envConfig.ADMIN_EMAILS ?? '').split(',')),
    envConfig.ADMIN_EMAIL ?? '',
  ];

  const normalized = candidates
    .map(normalizeEmail)
    .filter(Boolean);

  return [...new Set(normalized)];
}

export function getPrimaryAdminEmail(envConfig = {}) {
  const explicit = normalizeEmail(envConfig.ADMIN_EMAIL);
  if (explicit) return explicit;
  return parseAdminEmails(envConfig)[0] || '';
}

export function isAllowedAdminEmail(email, envConfig = {}) {
  const target = normalizeEmail(email);
  if (!target) return false;
  return parseAdminEmails(envConfig).some((allowed) => safeEqualStrings(allowed, target));
}

export function isAdminGoogleEmail(email, envConfig = {}, overrideAccount = null) {
  const target = normalizeEmail(email);
  if (!target) return false;
  if (overrideAccount?.email && safeEqualStrings(normalizeEmail(overrideAccount.email), target)) {
    return true;
  }
  return isAllowedAdminEmail(target, envConfig);
}

export function getSessionSigningSecret(envConfig = {}) {
  for (const key of ['USER_SESSION_SECRET', 'BETTER_AUTH_SECRET', 'ADMIN_SESSION_SECRET']) {
    const candidate = String(envConfig?.[key] ?? '').trim();
    if (candidate.length >= 32) return candidate;
  }
  return '';
}

export function isGoogleOAuthConfigured(envConfig = {}) {
  return Boolean(
    String(envConfig?.GOOGLE_CLIENT_ID ?? '').trim()
    && String(envConfig?.GOOGLE_CLIENT_SECRET ?? '').trim()
    && getSessionSigningSecret(envConfig),
  );
}

export function isFacebookOAuthConfigured(envConfig = {}) {
  return Boolean(
    String(envConfig?.FACEBOOK_CLIENT_ID ?? '').trim()
    && String(envConfig?.FACEBOOK_CLIENT_SECRET ?? '').trim()
    && getSessionSigningSecret(envConfig),
  );
}

export function isEmailAuthConfigured(envConfig = {}) {
  return Boolean(getSessionSigningSecret(envConfig));
}

export function sanitizeReturnTo(value, fallback = '/') {
  const text = String(value ?? '').trim();
  if (!text || text.length > 200 || !text.startsWith('/') || text.startsWith('//') || text.startsWith('/\\')) {
    return fallback;
  }
  if (/[\r\n]/.test(text)) return fallback;
  return text;
}

export function generatePkcePair() {
  const state = randomBytes(24).toString('base64url');
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return { state, codeVerifier, codeChallenge };
}

export function hashPasswordPbkdf2(password, saltHex = randomBytes(16).toString('hex'), iterations = PBKDF2_ITERATIONS) {
  const cleanSaltHex = String(saltHex).toLowerCase();
  const saltBuffer = Buffer.from(cleanSaltHex, 'hex');
  const derived = pbkdf2Sync(String(password), saltBuffer, iterations, PBKDF2_KEY_LENGTH, 'sha256');
  return `pbkdf2$${iterations}$${cleanSaltHex}$${derived.toString('hex')}`;
}

export function verifyPasswordHash(password, storedHash) {
  const candidate = String(password ?? '');
  const hashText = String(storedHash ?? '').trim();
  if (!candidate || !hashText) return false;

  const parts = hashText.split('$');
  const algorithm = parts[0];

  if (algorithm === 'pbkdf2' && parts.length === 4) {
    const iterations = Number(parts[1]);
    const saltHex = parts[2];
    const expectedHex = parts[3];
    if (!Number.isInteger(iterations) || iterations < 10_000 || !/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]+$/i.test(expectedHex)) {
      return false;
    }

    const expectedBuffer = Buffer.from(expectedHex, 'hex');
    const derived = pbkdf2Sync(candidate, Buffer.from(saltHex, 'hex'), iterations, expectedBuffer.length, 'sha256');
    return timingSafeEqual(derived, expectedBuffer);
  }

  if (algorithm === 'scrypt' && parts.length === 3) {
    const saltHex = parts[1];
    const expectedHex = parts[2];
    if (!/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]+$/i.test(expectedHex)) {
      return false;
    }

    const expectedBuffer = Buffer.from(expectedHex, 'hex');
    const derived = scryptSync(candidate, Buffer.from(saltHex, 'hex'), expectedBuffer.length);
    return timingSafeEqual(derived, expectedBuffer);
  }

  return false;
}

export function isAdminConfigured(envConfig = {}, overrideAccount = null) {
  const hasSecret = Boolean(envConfig?.ADMIN_SESSION_SECRET && String(envConfig.ADMIN_SESSION_SECRET).length >= 32);
  if (!hasSecret) return false;

  if (overrideAccount?.email && overrideAccount?.passwordHash) {
    return true;
  }

  const hasEmails = parseAdminEmails(envConfig).length > 0;
  const hasCredential = Boolean(envConfig?.ADMIN_PASSWORD_HASH || envConfig?.ADMIN_PASSWORD);
  return hasEmails && hasCredential;
}

export function verifyBootstrapCredentials({ email, password, envConfig = {}, overrideAccount = null }) {
  const normalizedInputEmail = normalizeEmail(email);
  const candidatePassword = String(password ?? '');

  if (overrideAccount?.email && overrideAccount?.passwordHash) {
    const overrideEmail = normalizeEmail(overrideAccount.email);
    const emailMatches = safeEqualStrings(normalizedInputEmail, overrideEmail);
    const passwordMatches = verifyPasswordHash(candidatePassword, overrideAccount.passwordHash);
    if (!emailMatches || !passwordMatches) {
      return { valid: false, configured: true };
    }
    return {
      valid: true,
      configured: true,
      email: overrideEmail,
      name: String(overrideAccount.name || 'Administrador').trim() || 'Administrador',
    };
  }

  const allowedEmails = parseAdminEmails(envConfig);
  const hasCredential = Boolean(envConfig.ADMIN_PASSWORD_HASH || envConfig.ADMIN_PASSWORD);
  if (allowedEmails.length === 0 || !hasCredential) {
    return { valid: false, configured: false };
  }

  const emailMatches = allowedEmails.some((allowed) => safeEqualStrings(normalizedInputEmail, allowed));
  let passwordMatches = false;

  if (envConfig.ADMIN_PASSWORD_HASH) {
    passwordMatches = verifyPasswordHash(candidatePassword, envConfig.ADMIN_PASSWORD_HASH);
  } else if (envConfig.ADMIN_PASSWORD) {
    passwordMatches = safeEqualStrings(candidatePassword, envConfig.ADMIN_PASSWORD);
  }

  if (!emailMatches || !passwordMatches) {
    return { valid: false, configured: true };
  }

  return {
    valid: true,
    configured: true,
    email: normalizedInputEmail,
    name: String(envConfig.ADMIN_NAME || 'Administrador').trim() || 'Administrador',
  };
}

function encodeBase64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function decodeBase64Url(input) {
  return Buffer.from(String(input), 'base64url').toString('utf8');
}

function signTokenPayload(encodedPayload, secret) {
  return createHmac('sha256', String(secret)).update(encodedPayload).digest('base64url');
}

function signSignedPayload(payload, secret) {
  if (!secret || String(secret).length < 32) {
    throw new Error('La clave secreta de sesión debe tener al menos 32 caracteres.');
  }
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signTokenPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

function verifySignedPayload(token, secret) {
  if (!token || !secret || typeof token !== 'string') return null;

  const dotIndex = token.indexOf('.');
  if (dotIndex <= 0 || dotIndex === token.length - 1) return null;

  const encodedPayload = token.slice(0, dotIndex);
  const receivedSignature = token.slice(dotIndex + 1);
  const expectedSignature = signTokenPayload(encodedPayload, secret);

  const receivedBuffer = Buffer.from(receivedSignature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(encodedPayload));
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!parsed || typeof parsed.exp !== 'number' || parsed.exp <= nowSeconds) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function createAdminToken(user, secret, ttlSeconds = ADMIN_SESSION_TTL_SECONDS) {
  if (!secret || String(secret).length < 32) {
    throw new Error('ADMIN_SESSION_SECRET debe tener al menos 32 caracteres.');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return signSignedPayload({
    sub: normalizeEmail(user.email),
    email: normalizeEmail(user.email),
    name: String(user.name || 'Administrador').trim() || 'Administrador',
    role: 'admin',
    method: user.method || 'password',
    ver: Number.isInteger(user.ver) ? user.ver : 0,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  }, secret);
}

export function verifyAdminToken(token, secret) {
  const parsed = verifySignedPayload(token, secret);
  if (!parsed || parsed.role !== 'admin' || !parsed.email) return null;
  return parsed;
}

export function isAdminTokenVersionValid(parsedToken, overrideAccount = null) {
  if (!parsedToken) return false;
  if (parsedToken.method === 'google') return true;
  if (!overrideAccount || !Number.isInteger(overrideAccount.tokenVersion)) return true;
  return parsedToken.ver === overrideAccount.tokenVersion;
}

export function createUserToken(user, secret, ttlSeconds = USER_SESSION_TTL_SECONDS) {
  const email = normalizeEmail(user?.email);
  if (!email) {
    throw new Error('El correo del usuario es obligatorio.');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return signSignedPayload({
    sub: String(user?.id || user?.sub || email),
    id: String(user?.id || user?.sub || email),
    email,
    name: String(user?.name || email.split('@')[0] || 'Cliente').trim(),
    image: typeof user?.image === 'string' ? user.image : '',
    provider: String(user?.provider || 'google'),
    emailVerified: user?.emailVerified !== false,
    role: 'customer',
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  }, secret);
}

export function verifyUserToken(token, secret) {
  const parsed = verifySignedPayload(token, secret);
  if (!parsed || parsed.role !== 'customer' || !parsed.email) return null;
  return parsed;
}

export function createOAuthStateToken({ state, codeVerifier, returnTo = '/' }, secret, ttlSeconds = OAUTH_STATE_TTL_SECONDS) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return signSignedPayload({
    typ: 'oauth_state',
    state: String(state || ''),
    codeVerifier: String(codeVerifier || ''),
    returnTo: sanitizeReturnTo(returnTo, '/'),
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  }, secret);
}

export function verifyOAuthStateToken(token, secret) {
  const parsed = verifySignedPayload(token, secret);
  if (!parsed || parsed.typ !== 'oauth_state' || !parsed.state || !parsed.codeVerifier) return null;
  return {
    ...parsed,
    returnTo: sanitizeReturnTo(parsed.returnTo, '/'),
  };
}

export function parseCookies(cookieHeader = '') {
  const cookies = {};
  for (const part of String(cookieHeader || '').split(';')) {
    const equalsIndex = part.indexOf('=');
    if (equalsIndex <= 0) continue;
    const key = part.slice(0, equalsIndex).trim();
    const rawValue = part.slice(equalsIndex + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(rawValue);
    } catch {
      cookies[key] = rawValue;
    }
  }
  return cookies;
}

function buildCookieString(name, value, { secure = false, maxAge } = {}) {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildAdminCookie(token, { secure = false, maxAge = ADMIN_SESSION_TTL_SECONDS } = {}) {
  return buildCookieString(ADMIN_COOKIE_NAME, encodeURIComponent(token), { secure, maxAge });
}

export function buildClearAdminCookie({ secure = false } = {}) {
  return buildCookieString(ADMIN_COOKIE_NAME, '', { secure, maxAge: 0 });
}

export function buildUserCookie(token, { secure = false, maxAge = USER_SESSION_TTL_SECONDS } = {}) {
  return buildCookieString(USER_COOKIE_NAME, encodeURIComponent(token), { secure, maxAge });
}

export function buildClearUserCookie({ secure = false } = {}) {
  return buildCookieString(USER_COOKIE_NAME, '', { secure, maxAge: 0 });
}

export function buildOAuthStateCookie(token, { secure = false, maxAge = OAUTH_STATE_TTL_SECONDS } = {}) {
  return buildCookieString(OAUTH_STATE_COOKIE_NAME, encodeURIComponent(token), { secure, maxAge });
}

export function buildClearOAuthStateCookie({ secure = false } = {}) {
  return buildCookieString(OAUTH_STATE_COOKIE_NAME, '', { secure, maxAge: 0 });
}
