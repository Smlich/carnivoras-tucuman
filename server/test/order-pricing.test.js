import assert from 'node:assert/strict';
import test from 'node:test';
import { extractManagedMediaKey, isManagedMediaReferenced } from '../src/utils/media-cleanup.js';
import { resolveOrderItems } from '../src/utils/order-pricing.js';

const sampleCatalog = [
  { id: 'venus-pequena', name: 'Venus pequeña', price: 6000, stockStatus: 'available', isActive: true },
  { id: 'drosera-agotada', name: 'Drosera agotada', price: 5000, stockStatus: 'unavailable', isActive: true },
  { id: 'oculta', name: 'Planta oculta', price: 9000, stockStatus: 'available', isActive: false },
];

test('resolveOrderItems usa precios del catálogo y fusiona ítems repetidos hasta 99', () => {
  const result = resolveOrderItems(
    [
      { id: 'venus-pequena', name: 'Nombre falso', price: 1, quantity: 60 },
      { id: 'venus-pequena', name: 'Otro', price: 2, quantity: 50 },
    ],
    sampleCatalog,
  );

  assert.equal(result.error, undefined);
  assert.deepEqual(result.items, [
    { id: 'venus-pequena', name: 'Venus pequeña', price: 6000, quantity: 99 },
  ]);
  assert.equal(result.totalARS, 6000 * 99);
});

test('resolveOrderItems rechaza productos ocultos, inexistentes o sin stock', () => {
  const missing = resolveOrderItems([{ id: 'oculta', quantity: 1 }], sampleCatalog);
  assert.equal(missing.error.status, 400);
  assert.equal(missing.error.code, 'INVALID_ORDER_ITEM');

  const unavailable = resolveOrderItems([{ id: 'drosera-agotada', quantity: 1 }], sampleCatalog);
  assert.equal(unavailable.error.status, 409);
  assert.equal(unavailable.error.code, 'PRODUCT_UNAVAILABLE');
});

test('extractManagedMediaKey e isManagedMediaReferenced identifican medios propios', () => {
  assert.equal(extractManagedMediaKey('/api/media/123-abc-foto.png'), '123-abc-foto.png');
  assert.equal(extractManagedMediaKey('/images/catalog/venus.png'), null);
  assert.equal(extractManagedMediaKey('https://example.com/api/media/123.png'), null);

  assert.equal(
    isManagedMediaReferenced('123-abc-foto.png', [{ image: '/api/media/123-abc-foto.png' }], []),
    true,
  );
  assert.equal(
    isManagedMediaReferenced('123-abc-foto.png', [], [{ src: '/api/media/123-abc-foto.png' }]),
    true,
  );
  assert.equal(
    isManagedMediaReferenced('123-abc-foto.png', [{ image: '/images/catalog/venus.png' }], []),
    false,
  );
});
