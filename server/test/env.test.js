import assert from 'node:assert/strict';
import test from 'node:test';
import { parseEnvironment } from '../src/config/env.js';

const validOAuthEnvironment = {
  BETTER_AUTH_URL: 'https://tienda.example',
  BETTER_AUTH_SECRET: 'test-only-secret-that-is-at-least-32-characters',
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
  FACEBOOK_CLIENT_ID: 'facebook-app-id',
  FACEBOOK_CLIENT_SECRET: 'facebook-app-secret',
};

const googleOnlyProduction = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb://127.0.0.1:27017',
  CORS_ORIGINS: 'https://tienda.example',
  BETTER_AUTH_URL: 'https://tienda.example',
  BETTER_AUTH_SECRET: validOAuthEnvironment.BETTER_AUTH_SECRET,
  GOOGLE_CLIENT_ID: validOAuthEnvironment.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: validOAuthEnvironment.GOOGLE_CLIENT_SECRET,
};

test('usa los valores de desarrollo seguros cuando no hay variables locales', () => {
  const environment = parseEnvironment({});

  assert.equal(environment.NODE_ENV, 'development');
  assert.equal(environment.PORT, 4000);
  assert.equal(environment.MONGODB_DATABASE, 'carnivoras_tucuman');
  assert.deepEqual(environment.corsOrigins, [
    'http://127.0.0.1:5173',
    'http://localhost:5173',
  ]);
});

test('rechaza un ID de proveedor sin su secreto correspondiente', () => {
  assert.throws(
    () => parseEnvironment({ GOOGLE_CLIENT_ID: 'google-client-id' }),
    /Configura ID y secreto de Google juntos/,
  );
});

test('requiere secreto de sesión y URL al activar un proveedor social', () => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ...withoutSession } = validOAuthEnvironment;

  assert.throws(
    () => parseEnvironment({ GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BETTER_AUTH_URL: 'https://tienda.example' }),
    /Genera un secreto de al menos 32 caracteres/,
  );
  assert.throws(
    () => parseEnvironment({ GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BETTER_AUTH_SECRET: withoutSession.BETTER_AUTH_SECRET }),
    /Configura la URL pública exacta/,
  );
});

test('producción acepta una configuración con solo Google', () => {
  const environment = parseEnvironment(googleOnlyProduction);

  assert.equal(environment.NODE_ENV, 'production');
  assert.deepEqual(environment.corsOrigins, ['https://tienda.example']);
});

test('producción exige MongoDB y al menos un proveedor social', () => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ...withoutProvider } = googleOnlyProduction;
  const { MONGODB_URI, ...withoutDatabase } = googleOnlyProduction;

  assert.throws(
    () => parseEnvironment(withoutProvider),
    /Configura al menos un proveedor social/,
  );
  assert.throws(
    () => parseEnvironment(withoutDatabase),
    /MONGODB_URI es obligatorio/,
  );
});

test('producción exige CORS_ORIGINS explícito y solo con orígenes HTTPS públicos', () => {
  const { CORS_ORIGINS, ...withoutCors } = googleOnlyProduction;

  assert.throws(() => parseEnvironment(withoutCors), /CORS_ORIGINS es obligatorio/);
  assert.throws(
    () => parseEnvironment({ ...googleOnlyProduction, CORS_ORIGINS: 'http://localhost:5173' }),
    /solo admite orígenes HTTPS públicos/,
  );
  assert.throws(
    () => parseEnvironment({ ...googleOnlyProduction, CORS_ORIGINS: 'https://tienda.example, http://admin.example' }),
    /solo admite orígenes HTTPS públicos/,
  );
});

test('producción exige que BETTER_AUTH_URL use HTTPS', () => {
  assert.throws(
    () => parseEnvironment({ ...googleOnlyProduction, BETTER_AUTH_URL: 'http://tienda.example' }),
    /BETTER_AUTH_URL debe usar HTTPS/,
  );
});

test('normaliza orígenes y acepta una configuración de producción completa', () => {
  const environment = parseEnvironment({
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb://127.0.0.1:27017',
    CORS_ORIGINS: 'https://tienda.example, https://admin.example ',
    ...validOAuthEnvironment,
  });

  assert.deepEqual(environment.corsOrigins, [
    'https://tienda.example',
    'https://admin.example',
  ]);
});
