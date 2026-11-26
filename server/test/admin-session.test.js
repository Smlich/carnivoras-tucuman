import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAdminCookie,
  buildClearAdminCookie,
  createAdminToken,
  hashPasswordPbkdf2,
  isAdminConfigured,
  isAllowedAdminEmail,
  parseCookies,
  verifyAdminToken,
  verifyBootstrapCredentials,
  verifyPasswordHash,
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
