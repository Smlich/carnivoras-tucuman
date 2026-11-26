import mongoose from 'mongoose';
import { env } from './env.js';

let listenersAttached = false;

function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('error', (error) => {
    console.error('Error en la conexión con MongoDB:', error.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB se desconectó.');
  });
}

export async function connectDatabase() {
  if (!env.MONGODB_URI) {
    if (env.NODE_ENV === 'production') {
      throw new Error('No se puede iniciar el servidor de producción sin MONGODB_URI.');
    }
    return false;
  }

  attachConnectionListeners();

  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DATABASE,
    serverSelectionTimeoutMS: 5000,
  });

  return true;
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}
