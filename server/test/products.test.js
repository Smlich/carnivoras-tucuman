import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { startTestServer } from './helpers/http.js';

test('lista el catálogo demo con metadatos de paginación explícitos', async (context) => {
  const origin = await startTestServer(createApp(), context);
  const response = await fetch(`${origin}/api/products`);
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(result.meta, {
    page: 1,
    limit: 12,
    total: 8,
    source: 'demo-catalog',
  });
  assert.equal(result.data.length, 8);
  assert.equal(result.data[0].id, 'combo-tres-carnivoras');
  assert.equal(result.data[0].price, 13000);
});

test('filtra por categoría y aplica la página solicitada', async (context) => {
  const origin = await startTestServer(createApp(), context);
  const response = await fetch(`${origin}/api/products?category=venus&page=2&limit=1`);
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(result.meta, {
    page: 2,
    limit: 1,
    total: 2,
    source: 'demo-catalog',
  });
  assert.deepEqual(result.data.map((product) => product.id), ['venus-mediana']);
});

test('busca por texto sin distinguir mayúsculas', async (context) => {
  const origin = await startTestServer(createApp(), context);
  const response = await fetch(`${origin}/api/products?q=BOHEMIAN`);
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.meta.total, 1);
  assert.deepEqual(result.data.map((product) => product.id), ['venus-bohemian-garnet']);
});

test('rechaza filtros y límites inválidos con un error de validación estable', async (context) => {
  const origin = await startTestServer(createApp(), context);

  for (const query of ['category=desconocida', 'limit=25', 'page=0']) {
    const response = await fetch(`${origin}/api/products?${query}`);
    const result = await response.json();

    assert.equal(response.status, 400, query);
    assert.equal(result.error.code, 'VALIDATION_ERROR', query);
    assert.ok(result.error.details.length > 0, query);
  }
});

test('devuelve el detalle de un producto del catálogo', async (context) => {
  const origin = await startTestServer(createApp(), context);
  const response = await fetch(`${origin}/api/products/venus-red-piranha`);
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.meta.source, 'demo-catalog');
  assert.equal(result.data.id, 'venus-red-piranha');
  assert.equal(result.data.name, 'Venus · Red Piranha');
  assert.equal(result.data.price, 25000);
  assert.match(result.data.image, /venus-red-piranha\.jpeg$/);
});

test('usa una respuesta de error predecible cuando el producto no existe', async (context) => {
  const origin = await startTestServer(createApp(), context);
  const response = await fetch(`${origin}/api/products/planta-inexistente`);
  const result = await response.json();

  assert.equal(response.status, 404);
  assert.equal(result.error.code, 'PRODUCT_NOT_FOUND');
});
