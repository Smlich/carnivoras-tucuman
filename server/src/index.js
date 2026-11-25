import mongoose from 'mongoose';
import { createApp } from './app.js';
import { createAuth } from './auth/create-auth.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

let server;

async function startServer() {
  const databaseConnected = await connectDatabase();

  if (!databaseConnected) {
    console.warn('MongoDB no está configurado. La API usa el catálogo de demostración y no persiste cambios.');
  }

  const authConfig = databaseConnected ? createAuth() : null;
  const hasGoogleCredentials = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const hasFacebookCredentials = Boolean(env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET);
  const missingAuthRequirements = [];
  if (!env.BETTER_AUTH_SECRET) missingAuthRequirements.push('BETTER_AUTH_SECRET');
  if (!env.BETTER_AUTH_URL) missingAuthRequirements.push('BETTER_AUTH_URL');
  if (!hasGoogleCredentials && !hasFacebookCredentials) {
    missingAuthRequirements.push('credenciales de Google o Facebook');
  }

  if (!authConfig) {
    if (!databaseConnected) {
      console.info('Autenticación social pendiente: se requiere una conexión a MongoDB Atlas.');
    } else {
      console.info('Autenticación social pendiente. Completa: ' + missingAuthRequirements.join(', ') + '.');
    }
  } else {
    console.info('Proveedores sociales disponibles:', authConfig.providers.join(', '));
    const missingProductionProviders = [
      !hasGoogleCredentials && 'Google',
      !hasFacebookCredentials && 'Facebook',
    ].filter(Boolean);
    if (missingProductionProviders.length > 0) {
      console.info('Para producción también faltan credenciales de:', missingProductionProviders.join(', '));
    }
  }

  const app = createApp({
    auth: authConfig?.instance,
    authProviders: authConfig?.providers ?? [],
  });

  server = app.listen(env.PORT, () => {
    console.log('API disponible en http://127.0.0.1:' + env.PORT);
  });
}

async function stopServer(signal) {
  console.log('Recibí ' + signal + '; cerrando conexiones.');
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
  process.exit(0);
}

process.on('SIGINT', () => stopServer('SIGINT'));
process.on('SIGTERM', () => stopServer('SIGTERM'));

startServer().catch((error) => {
  console.error('No se pudo iniciar la API:', error.message);
  process.exitCode = 1;
});
