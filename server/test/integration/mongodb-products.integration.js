import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { env } from '../../src/config/env.js';
import { connectDatabase } from '../../src/config/database.js';
import { createApp } from '../../src/app.js';
import { startTestServer } from '../helpers/http.js';

test('consulta salud, catálogo y detalle desde MongoDB Atlas', {
  skip: env.MONGODB_URI ? false : 'Configura MONGODB_URI en .env para ejecutar esta práctica.',
}, async (context) => {
  context.after(async () => {
    await mongoose.disconnect();
  });

  try {
    await connectDatabase();
  } catch {
    throw new Error('No se pudo conectar con Atlas. Revisa la URI local, el usuario de base de datos y la lista IP; no se imprimieron credenciales.');
  }

  const origin = await startTestServer(createApp(), context);

  let healthResponse;
  let health;
  try {
    healthResponse = await fetch(`${origin}/api/health`);
    health = await healthResponse.json();
  } catch {
    throw new Error('No se pudo leer el endpoint local de salud.');
  }

  assert.equal(healthResponse.status, 200);
  assert.equal(health.data.database, 'connected');
  assert.equal(health.data.catalogMode, 'mongodb');

  let catalogResponse;
  let catalog;
  try {
    catalogResponse = await fetch(`${origin}/api/products?category=venus&limit=24`);
    catalog = await catalogResponse.json();
  } catch {
    throw new Error('No se pudo consultar el catálogo local.');
  }

  assert.equal(catalogResponse.status, 200);
  assert.equal(catalog.meta.source, 'mongodb');
  assert.equal(catalog.meta.limit, 24);
  assert.ok(catalog.meta.total > 0, 'Atlas debe tener al menos una Venus activa; carga el catálogo si corresponde.');
  assert.ok(catalog.data.length > 0);

  for (const product of catalog.data) {
    assert.equal(typeof product.id, 'string');
    assert.equal(typeof product.name, 'string');
    assert.equal(product.category, 'venus');
    assert.ok(Number.isSafeInteger(product.price));
    assert.equal(typeof product.image, 'string');
    assert.equal(typeof product.imageAlt, 'string');
  }

  let detailResponse;
  let detail;
  try {
    detailResponse = await fetch(`${origin}/api/products/${encodeURIComponent(catalog.data[0].id)}`);
    detail = await detailResponse.json();
  } catch {
    throw new Error('No se pudo consultar el detalle local de un producto.');
  }

  assert.equal(detailResponse.status, 200);
  assert.equal(detail.meta.source, 'mongodb');
  assert.equal(detail.data.id, catalog.data[0].id);
});
