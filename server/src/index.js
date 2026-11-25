import mongoose from 'mongoose';
import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

let server;

async function startServer() {
  const databaseConnected = await connectDatabase();

  if (!databaseConnected) {
    console.warn('MongoDB no está configurado. La API usa el catálogo de demostración y no persiste cambios.');
  }

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
