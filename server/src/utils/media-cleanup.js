const MANAGED_MEDIA_PREFIX = '/api/media/';
const MEDIA_KEY_PATTERN = /^\/api\/media\/([a-zA-Z0-9._-]{3,160})$/;

export function extractManagedMediaKey(url) {
  if (typeof url !== 'string') return null;
  const match = MEDIA_KEY_PATTERN.exec(url.trim());
  return match ? match[1] : null;
}

export function isManagedMediaReferenced(key, products = [], gallery = []) {
  if (!key) return false;
  const expectedUrl = MANAGED_MEDIA_PREFIX + key;
  return products.some((item) => item?.image === expectedUrl)
    || gallery.some((item) => item?.src === expectedUrl);
}
