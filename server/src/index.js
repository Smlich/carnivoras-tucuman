import mongoose from 'mongoose';
import { createApp } from './app.js';
import { createAuth } from './auth/create-auth.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

let server;
let isShuttingDown = false;

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
    const optionalMissingProviders = [
      !hasGoogleCredentials && 'Google',
      !hasFacebookCredentials && 'Facebook',
    ].filter(Boolean);
    if (optionalMissingProviders.length > 0) {
      console.info('Proveedores sociales opcionales sin configurar:', optionalMissingProviders.join(', '));
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

async function stopServer(signal, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('Recibí ' + signal + '; cerrando conexiones.');

  const forceExitTimer = setTimeout(() => {
    console.error('El cierre tardó demasiado; forzando salida.');
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  try {
    if (server) {
      server.closeIdleConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error al cerrar el servidor:', error.message);
    process.exit(1);
  } finally {
    clearTimeout(forceExitTimer);
  }

  process.exit(exitCode);
}

process.on('SIGINT', () => stopServer('SIGINT'));
process.on('SIGTERM', () => stopServer('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  console.error('Promesa rechazada sin manejar:', message);
  stopServer('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
  console.error('Excepción no capturada:', error.message);
  stopServer('uncaughtException', 1);
});

startServer().catch((error) => {
  console.error('No se pudo iniciar la API:', error.message);
  process.exitCode = 1;
});
