import 'dotenv/config';
import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().url().optional(),
  ),
  CORS_ORIGINS: z.string().default('http://127.0.0.1:5173,http://localhost:5173'),
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
