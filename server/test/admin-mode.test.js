import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_MODE_STORAGE_KEY,
  readAdminModePreference,
  resolveEffectiveAdminMode,
  writeAdminModePreference,
} from '../../src/utils/admin-mode.js';

function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
  };
}

test('readAdminModePreference devuelve true por defecto o ante storage ausente/inaccesible', () => {
  assert.equal(readAdminModePreference(null), true);
  assert.equal(readAdminModePreference(createMemoryStorage()), true);
  assert.equal(
    readAdminModePreference({
      getItem() {
        throw new Error('Blocked');
      },
    }),
    true,
  );
});

test('writeAdminModePreference persiste false y true y readAdminModePreference lo lee', () => {
  const storage = createMemoryStorage();
  writeAdminModePreference(false, storage);
  assert.equal(storage.getItem(ADMIN_MODE_STORAGE_KEY), 'false');
  assert.equal(readAdminModePreference(storage), false);

  writeAdminModePreference(true, storage);
  assert.equal(storage.getItem(ADMIN_MODE_STORAGE_KEY), 'true');
  assert.equal(readAdminModePreference(storage), true);
});

test('resolveEffectiveAdminMode nunca habilita admin sin privilegio real del servidor', () => {
  assert.equal(resolveEffectiveAdminMode({ hasAdminAccess: false, adminModeEnabled: true }), false);
  assert.equal(resolveEffectiveAdminMode({ hasAdminAccess: false, adminModeEnabled: false }), false);
  assert.equal(resolveEffectiveAdminMode({ hasAdminAccess: true, adminModeEnabled: false }), false);
  assert.equal(resolveEffectiveAdminMode({ hasAdminAccess: true, adminModeEnabled: true }), true);
});
