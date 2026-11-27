export const ADMIN_MODE_STORAGE_KEY = 'ct_admin_mode_enabled';

export function readAdminModePreference(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  try {
    if (!storage || typeof storage.getItem !== 'function') return true;
    return storage.getItem(ADMIN_MODE_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function writeAdminModePreference(
  enabled,
  storage = typeof window !== 'undefined' ? window.localStorage : null,
) {
  try {
    if (!storage || typeof storage.setItem !== 'function') return;
    storage.setItem(ADMIN_MODE_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignorar en entornos sin acceso a almacenamiento persistente (p. ej. modo privado estricto).
  }
}

export function resolveEffectiveAdminMode({ hasAdminAccess = false, adminModeEnabled = true } = {}) {
  return Boolean(hasAdminAccess && adminModeEnabled);
}
