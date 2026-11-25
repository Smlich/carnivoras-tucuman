import 'dotenv/config';
import { z } from 'zod';

const optionalText = (schema = z.string().trim().min(1)) => z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  schema.optional(),
);

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
  CORS_ORIGINS: z.string().default('http://127.0.0.1:5173,http://localhost:5173'),
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

  if (values.NODE_ENV === 'production' && (!values.GOOGLE_CLIENT_ID || !values.FACEBOOK_CLIENT_ID)) {
    context.addIssue({
      code: 'custom',
      path: ['GOOGLE_CLIENT_ID'],
      message: 'Google y Facebook deben estar configurados antes de iniciar producción.',
    });
  }
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const issues = parsedEnvironment.error.issues
    .map((issue) => issue.path.join('.') + ': ' + issue.message)
    .join('; ');
  throw new Error('Configuración del servidor inválida: ' + issues);
}

export const env = {
  ...parsedEnvironment.data,
  corsOrigins: parsedEnvironment.data.CORS_ORIGINS
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

if (env.NODE_ENV === 'production' && !env.MONGODB_URI) {
  throw new Error('MONGODB_URI es obligatorio cuando NODE_ENV=production.');
}
