import assert from 'node:assert/strict';
import test from 'node:test';
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
  hashPasswordPbkdf2,
  isAdminConfigured,
  isAdminGoogleEmail,
  isAdminTokenVersionValid,
  isAllowedAdminEmail,
  isEmailAuthConfigured,
  isFacebookOAuthConfigured,
  isGoogleOAuthConfigured,
  parseCookies,
  sanitizeReturnTo,
  verifyAdminToken,
  verifyBootstrapCredentials,
  verifyOAuthStateToken,
  verifyPasswordHash,
  verifyUserToken,
} from '../src/auth/admin-session.js';
import { validateAndDecodeImageBase64 } from '../src/schemas/admin-schemas.js';

test('hashPasswordPbkdf2 genera hashes verificables en timing-safe', () => {
  const hash = hashPasswordPbkdf2('ClaveUltraSegura2026!');

  assert.match(hash, /^pbkdf2\$210000\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
  assert.equal(verifyPasswordHash('ClaveUltraSegura2026!', hash), true);
  assert.equal(verifyPasswordHash('ClaveIncorrecta', hash), false);
});

test('createAdminToken firma y verifyAdminToken valida sesiones y rechaza manipulaciones', () => {
  const secret = 'super-secret-admin-signing-key-32-chars-min';
  const token = createAdminToken({ email: 'ADMIN@Carnivoras.com', name: 'Facundo' }, secret, 600);
  const verified = verifyAdminToken(token, secret);

  assert.equal(verified.email, 'admin@carnivoras.com');
  assert.equal(verified.name, 'Facundo');
  assert.equal(verified.role, 'admin');

  const tampered = token.slice(0, -4) + 'AAAA';
  assert.equal(verifyAdminToken(tampered, secret), null);
  assert.equal(verifyAdminToken(token, 'other-secret-that-is-over-32-characters'), null);
});

test('parseCookies y buildAdminCookie manejan cookies seguras HttpOnly', () => {
  const cookieHeader = buildAdminCookie('abc.123', { secure: true, maxAge: 3600 });
  assert.match(cookieHeader, /ct_admin_session=abc\.123/);
  assert.match(cookieHeader, /HttpOnly/);
  assert.match(cookieHeader, /SameSite=Lax/);
  assert.match(cookieHeader, /Secure/);

  const cleared = buildClearAdminCookie({ secure: true });
  assert.match(cleared, /Max-Age=0/);

  const parsed = parseCookies('other=1; ct_admin_session=abc.123');
  assert.equal(parsed.ct_admin_session, 'abc.123');
});

test('verifyBootstrapCredentials respeta override almacenado y allowlist de correos', () => {
  const secret = '0123456789abcdef0123456789abcdef';
  const hash = hashPasswordPbkdf2('PrimerPass#2026');
  const envConfig = {
    ADMIN_EMAIL: 'dueno@carnivorastucuman.com',
    ADMIN_EMAILS: 'extra@carnivorastucuman.com',
    ADMIN_PASSWORD_HASH: hash,
    ADMIN_SESSION_SECRET: secret,
  };

  assert.equal(isAdminConfigured(envConfig), true);
  assert.equal(isAllowedAdminEmail('EXTRA@carnivorastucuman.com', envConfig), true);
  assert.equal(isAllowedAdminEmail('otro@ejemplo.com', envConfig), false);

  const ok = verifyBootstrapCredentials({
    email: 'Dueno@carnivorastucuman.com',
    password: 'PrimerPass#2026',
    envConfig,
  });
  assert.equal(ok.valid, true);

  const override = {
    email: 'nuevo@carnivorastucuman.com',
    name: 'Admin Nuevo',
    passwordHash: hashPasswordPbkdf2('PassActualizada#9'),
  };
  assert.equal(
    verifyBootstrapCredentials({
      email: 'dueno@carnivorastucuman.com',
      password: 'PrimerPass#2026',
      envConfig,
      overrideAccount: override,
    }).valid,
    false,
  );
  assert.equal(
    verifyBootstrapCredentials({
      email: 'nuevo@carnivorastucuman.com',
      password: 'PassActualizada#9',
      envConfig,
      overrideAccount: override,
    }).valid,
    true,
  );
});

test('validateAndDecodeImageBase64 verifica cabeceras reales de PNG', () => {
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const decoded = validateAndDecodeImageBase64(pngBytes.toString('base64'), 'image/png');
  assert.equal(decoded.length, pngBytes.length);

  assert.throws(
    () => validateAndDecodeImageBase64(Buffer.from('no-es-imagen').toString('base64'), 'image/png'),
    /imagen PNG, JPEG o WebP válida/,
  );
});

test('sesiones de cliente Google, estado OAuth con PKCE y sanitización de retorno', () => {
  const secret = 'client-session-signing-secret-over-32-chars';
  const userToken = createUserToken({
    id: 'google-sub-123',
    email: 'Cliente@Gmail.com',
    name: 'Sofía Pérez',
    image: 'https://lh3.googleusercontent.com/a/photo',
  }, secret, 600);

  const verifiedUser = verifyUserToken(userToken, secret);
  assert.equal(verifiedUser.id, 'google-sub-123');
  assert.equal(verifiedUser.email, 'cliente@gmail.com');
  assert.equal(verifiedUser.name, 'Sofía Pérez');
  assert.equal(verifiedUser.role, 'customer');
  assert.equal(verifyAdminToken(userToken, secret), null);

  const pkce = generatePkcePair();
  assert.ok(pkce.state.length >= 24);
  assert.ok(pkce.codeVerifier.length >= 32);
  assert.ok(pkce.codeChallenge.length >= 32);

  const stateToken = createOAuthStateToken({
    state: pkce.state,
    codeVerifier: pkce.codeVerifier,
    returnTo: '/juegos.html?modo=1',
  }, secret, 300);
  const verifiedState = verifyOAuthStateToken(stateToken, secret);
  assert.equal(verifiedState.state, pkce.state);
  assert.equal(verifiedState.codeVerifier, pkce.codeVerifier);
  assert.equal(verifiedState.returnTo, '/juegos.html?modo=1');

  assert.equal(sanitizeReturnTo('/catalogo.html'), '/catalogo.html');
  assert.equal(sanitizeReturnTo('//evil.example/phish'), '/');
  assert.equal(sanitizeReturnTo('https://evil.example'), '/');

  assert.match(buildUserCookie(userToken, { secure: true }), /ct_user_session=/);
  assert.match(buildClearUserCookie({ secure: true }), /Max-Age=0/);
  assert.match(buildOAuthStateCookie(stateToken, { secure: true }), /ct_oauth_state=/);
  assert.match(buildClearOAuthStateCookie({ secure: true }), /Max-Age=0/);
});

test('isGoogleOAuthConfigured y isAdminGoogleEmail validan credenciales y elevación admin', () => {
  assert.equal(isGoogleOAuthConfigured({
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    ADMIN_SESSION_SECRET: 'signing-secret-with-at-least-32-chars',
  }), true);

  assert.equal(isGoogleOAuthConfigured({
    GOOGLE_CLIENT_ID: 'client-id',
    ADMIN_SESSION_SECRET: 'signing-secret-with-at-least-32-chars',
  }), false);

  assert.equal(isAdminGoogleEmail(
    'Dueno@Gmail.com',
    { ADMIN_EMAILS: 'dueno@gmail.com' },
    null,
  ), true);

  assert.equal(isAdminGoogleEmail(
    'nuevo-admin@gmail.com',
    { ADMIN_EMAIL: 'viejo@carnivorastucuman.com' },
    { email: 'nuevo-admin@gmail.com' },
  ), true);

  assert.equal(isAdminGoogleEmail(
    'visitante@gmail.com',
    { ADMIN_EMAILS: 'dueno@gmail.com' },
    null,
  ), false);
});

test('isAdminTokenVersionValid invalida tokens de contraseña viejos tras cambio de clave', () => {
  const secret = 'super-secret-admin-signing-key-32-chars-min';
  const oldPasswordToken = verifyAdminToken(
    createAdminToken({ email: 'admin@carnivoras.com', name: 'Admin', method: 'password', ver: 1 }, secret, 600),
    secret,
  );
  const googleToken = verifyAdminToken(
    createAdminToken({ email: 'admin@carnivoras.com', name: 'Admin', method: 'google', ver: 1 }, secret, 600),
    secret,
  );

  assert.equal(isAdminTokenVersionValid(oldPasswordToken, { tokenVersion: 1 }), true);
  assert.equal(isAdminTokenVersionValid(oldPasswordToken, { tokenVersion: 2 }), false);
  assert.equal(isAdminTokenVersionValid(googleToken, { tokenVersion: 2 }), true);
});

test('isFacebookOAuthConfigured e isEmailAuthConfigured validan secretos y credenciales', () => {
  const signingSecret = 'signing-secret-with-at-least-32-chars';
  assert.equal(isEmailAuthConfigured({ USER_SESSION_SECRET: signingSecret }), true);
  assert.equal(isEmailAuthConfigured({ USER_SESSION_SECRET: 'corto' }), false);

  assert.equal(isFacebookOAuthConfigured({
    FACEBOOK_CLIENT_ID: 'fb-id',
    FACEBOOK_CLIENT_SECRET: 'fb-secret',
    USER_SESSION_SECRET: signingSecret,
  }), true);

  assert.equal(isFacebookOAuthConfigured({
    FACEBOOK_CLIENT_ID: 'fb-id',
    USER_SESSION_SECRET: signingSecret,
  }), false);
});
