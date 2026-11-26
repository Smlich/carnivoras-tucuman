import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatFreezeUnit,
  getPriceFreezeDuration,
  PRICE_FREEZE_START,
} from '../../src/utils/price-freeze-duration.js';

test('PRICE_FREEZE_START begins on August 1, 2024', () => {
  assert.deepEqual(PRICE_FREEZE_START, { year: 2024, month: 8, day: 1 });
});

test('getPriceFreezeDuration returns exact elapsed calendar breakdown from August 2024', () => {
  assert.deepEqual(
    getPriceFreezeDuration(new Date('2024-08-01T12:00:00-03:00')),
    { years: 0, months: 0, days: 0 },
  );

  assert.deepEqual(
    getPriceFreezeDuration(new Date('2025-02-01T12:00:00-03:00')),
    { years: 0, months: 6, days: 0 },
  );

  assert.deepEqual(
    getPriceFreezeDuration(new Date('2026-08-01T00:00:00-03:00')),
    { years: 2, months: 0, days: 0 },
  );

  assert.deepEqual(
    getPriceFreezeDuration(new Date('2026-11-26T15:00:00-03:00')),
    { years: 2, months: 3, days: 25 },
  );
});

test('getPriceFreezeDuration handles dates prior to freeze start and invalid dates safely', () => {
  assert.deepEqual(
    getPriceFreezeDuration(new Date('2024-07-31T23:59:00-03:00')),
    { years: 0, months: 0, days: 0 },
  );
  assert.deepEqual(getPriceFreezeDuration(new Date('invalid')), { years: 0, months: 0, days: 0 });
  assert.deepEqual(getPriceFreezeDuration(null), { years: 0, months: 0, days: 0 });
});

test('getPriceFreezeDuration uses Argentina UTC-3 calendar boundaries', () => {
  // 2026-09-01 02:30 UTC is still August 31 23:30 in Tucuman (UTC-3)
  assert.deepEqual(
    getPriceFreezeDuration(new Date('2026-09-01T02:30:00Z')),
    { years: 2, months: 0, days: 30 },
  );
});

test('formatFreezeUnit formats singular and plural labels cleanly', () => {
  assert.equal(formatFreezeUnit(1, 'año', 'años'), 'año');
  assert.equal(formatFreezeUnit(2, 'año', 'años'), 'años');
  assert.equal(formatFreezeUnit(0, 'mes', 'meses'), 'meses');
  assert.equal(formatFreezeUnit(1, 'mes', 'meses'), 'mes');
  assert.equal(formatFreezeUnit(25, 'día', 'días'), 'días');
});
