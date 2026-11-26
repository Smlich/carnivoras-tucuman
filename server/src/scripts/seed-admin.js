import mongoose from 'mongoose';
import {
  getPrimaryAdminEmail,
  hashPasswordPbkdf2,
} from '../auth/admin-session.js';
import { connectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { AdminAccount } from '../models/AdminAccount.js';

async function seedAdmin() {
  if (!env.MONGODB_URI) {
    throw new Error('Configurá MONGODB_URI en .env antes de registrar la cuenta de administración.');
  }

  const email = getPrimaryAdminEmail(env);
  if (!email) {
    throw new Error('Configurá ADMIN_EMAIL en .env.');
  }

  let passwordHash = env.ADMIN_PASSWORD_HASH;
  if (!passwordHash) {
    if (!env.ADMIN_PASSWORD) {
      throw new Error('Configurá ADMIN_PASSWORD_HASH o ADMIN_PASSWORD en .env para crear el administrador.');
    }
    passwordHash = hashPasswordPbkdf2(env.ADMIN_PASSWORD);
  }

  await connectDatabase();

  const name = (env.ADMIN_NAME || 'Administrador').trim() || 'Administrador';
  const saved = await AdminAccount.findOneAndUpdate(
    { key: 'primary' },
    { email, name, passwordHash },
    { upsert: true, returnDocument: 'after' },
  ).lean();

  console.log(`Cuenta administradora lista en MongoDB para ${saved.email} (${saved.name}).`);
}

seedAdmin()
  .catch((error) => {
    console.error('No se pudo registrar la cuenta de administrador:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
