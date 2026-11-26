import 'dotenv/config';
import { z } from 'zod';

const defaultDevCorsOrigins = ['http://127.0.0.1:5173', 'http://localhost:5173'];

const optionalText = (schema = z.string().trim().min(1)) => z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  schema.optional(),
);

function splitOrigins(value) {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isPublicHttpsOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:'
      && url.origin === origin
      && url.hostname !== 'localhost'
      && url.hostname !== '127.0.0.1';
  } catch {
    return false;
  }
}

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().url().optional(),
  ),
  MONGODB_DATABASE: z.string().trim().min(1).default('carnivoras_tucuman'),
  BETTER_AUTH_URL: optionalText(z.string().url()),
  BETTER_AUTH_SECRET: optionalText(z.string().min(32, 'Debe tener al menos 32 caracteres.')),
  GOOGLE_CLIENT_ID: optionalText(),
  GOOGLE_CLIENT_SECRET: optionalText(),
  FACEBOOK_CLIENT_ID: optionalText(),
  FACEBOOK_CLIENT_SECRET: optionalText(),
  CORS_ORIGINS: optionalText(z.string()),
  ADMIN_EMAIL: optionalText(z.string().email('ADMIN_EMAIL debe ser un correo válido.')),
  ADMIN_EMAILS: optionalText(z.string()),
  ADMIN_NAME: optionalText(z.string()),
  ADMIN_PASSWORD: optionalText(z.string()),
  ADMIN_PASSWORD_HASH: optionalText(z.string()),
  ADMIN_SESSION_SECRET: optionalText(z.string().min(32, 'ADMIN_SESSION_SECRET debe tener al menos 32 caracteres.')),
  USER_SESSION_SECRET: optionalText(z.string().min(32, 'USER_SESSION_SECRET debe tener al menos 32 caracteres.')),
  GEMINI_API_KEY: optionalText(z.string().min(10, 'GEMINI_API_KEY parece incompleta.')),
  GEMINI_MODEL: optionalText(z.string().regex(/^[a-z0-9][a-z0-9._-]{2,64}$/i, 'GEMINI_MODEL inválido.')),
  GEMINI_DAILY_LIMIT: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.coerce.number().int().min(1).max(10_000).optional(),
  ),
}).superRefine((values, context) => {
  const providerPairs = [
    ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'Google'],
    ['FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET', 'Facebook'],
  ];

  for (const [idKey, secretKey, providerName] of providerPairs) {
    if (Boolean(values[idKey]) !== Boolean(values[secretKey])) {
      context.addIssue({
        code: 'custom',
        path: [idKey],
        message: `Configura ID y secreto de ${providerName} juntos.`,
      });
    }
  }

  const hasProvider = Boolean(values.GOOGLE_CLIENT_ID || values.FACEBOOK_CLIENT_ID);
  if (hasProvider && !values.BETTER_AUTH_SECRET) {
    context.addIssue({
      code: 'custom',
      path: ['BETTER_AUTH_SECRET'],
      message: 'Genera un secreto de al menos 32 caracteres para Better Auth.',
    });
  }

  if (hasProvider && !values.BETTER_AUTH_URL) {
    context.addIssue({
      code: 'custom',
      path: ['BETTER_AUTH_URL'],
      message: 'Configura la URL pública exacta que sirve el frontend.',
    });
  }

  if (values.NODE_ENV !== 'production') return;

  if (!hasProvider) {
    context.addIssue({
      code: 'custom',
      path: ['GOOGLE_CLIENT_ID'],
      message: 'Configura al menos un proveedor social (Google o Facebook) antes de iniciar producción.',
    });
  }

  if (!values.MONGODB_URI) {
    context.addIssue({
      code: 'custom',
      path: ['MONGODB_URI'],
      message: 'MONGODB_URI es obligatorio cuando NODE_ENV=production.',
    });
  }

  if (values.BETTER_AUTH_URL && !values.BETTER_AUTH_URL.startsWith('https://')) {
    context.addIssue({
      code: 'custom',
      path: ['BETTER_AUTH_URL'],
      message: 'En producción BETTER_AUTH_URL debe usar HTTPS.',
    });
  }

  if (!values.CORS_ORIGINS) {
    context.addIssue({
      code: 'custom',
      path: ['CORS_ORIGINS'],
      message: 'CORS_ORIGINS es obligatorio en producción: lista los orígenes HTTPS públicos.',
    });
  } else if (!splitOrigins(values.CORS_ORIGINS).every(isPublicHttpsOrigin)) {
    context.addIssue({
      code: 'custom',
      path: ['CORS_ORIGINS'],
      message: 'En producción CORS_ORIGINS solo admite orígenes HTTPS públicos, sin localhost ni rutas.',
    });
  }
});

export function parseEnvironment(source) {
  const parsedEnvironment = environmentSchema.safeParse(source);

  if (!parsedEnvironment.success) {
    const issues = parsedEnvironment.error.issues
      .map((issue) => issue.path.join('.') + ': ' + issue.message)
      .join('; ');
    throw new Error('Configuración del servidor inválida: ' + issues);
  }

  const { CORS_ORIGINS: corsOrigins, ...rest } = parsedEnvironment.data;

  return {
    ...rest,
    CORS_ORIGINS: corsOrigins,
    corsOrigins: corsOrigins
      ? splitOrigins(corsOrigins)
      : (rest.NODE_ENV === 'production' ? [] : defaultDevCorsOrigins),
  };
}

export const env = parseEnvironment(process.env);
