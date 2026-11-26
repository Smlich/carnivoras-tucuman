const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

async function requestAdminJson(url, { method = 'GET', body } = {}) {
  const isMutation = method !== 'GET' && method !== 'HEAD';
  const headers = {
    Accept: 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(isMutation ? { 'X-Admin-Request': '1' } : {}),
  };

  const response = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    cache: 'no-store',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `Error ${response.status} al comunicarse con el servidor.`;
    const error = new Error(message);
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }

  return payload?.data ?? payload;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No pudimos leer el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });
}

export async function loginAdmin({ email, password }) {
  return requestAdminJson('/api/admin/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function logoutAdmin() {
  return requestAdminJson('/api/admin/auth/logout', { method: 'POST', body: {} });
}

export async function updateAdminAccount({ email, name, currentPassword, newPassword }) {
  return requestAdminJson('/api/admin/auth/account', {
    method: 'PUT',
    body: { email, name, currentPassword, newPassword },
  });
}

export async function fetchAdminOverview() {
  return requestAdminJson('/api/admin/overview');
}

export async function fetchAdminSettings() {
  return requestAdminJson('/api/admin/settings');
}

export async function saveAdminSettings(settings) {
  return requestAdminJson('/api/admin/settings', { method: 'PUT', body: settings });
}

export async function fetchAdminProducts() {
  return requestAdminJson('/api/admin/products');
}

export async function createAdminProduct(product) {
  return requestAdminJson('/api/admin/products', { method: 'POST', body: product });
}

export async function updateAdminProduct(id, product) {
  return requestAdminJson('/api/admin/products/' + encodeURIComponent(id), { method: 'PUT', body: product });
}

export async function deleteAdminProduct(id) {
  return requestAdminJson('/api/admin/products/' + encodeURIComponent(id), { method: 'DELETE', body: {} });
}

export async function fetchAdminGallery() {
  return requestAdminJson('/api/admin/gallery');
}

export async function createAdminGalleryItem(item) {
  return requestAdminJson('/api/admin/gallery', { method: 'POST', body: item });
}

export async function updateAdminGalleryItem(id, item) {
  return requestAdminJson('/api/admin/gallery/' + encodeURIComponent(id), { method: 'PUT', body: item });
}

export async function deleteAdminGalleryItem(id) {
  return requestAdminJson('/api/admin/gallery/' + encodeURIComponent(id), { method: 'DELETE', body: {} });
}

export async function fetchAdminGames() {
  return requestAdminJson('/api/admin/games');
}

export async function createAdminGame(game) {
  return requestAdminJson('/api/admin/games', { method: 'POST', body: game });
}

export async function updateAdminGame(slug, game) {
  return requestAdminJson('/api/admin/games/' + encodeURIComponent(slug), { method: 'PUT', body: game });
}

export async function deleteAdminGame(slug) {
  return requestAdminJson('/api/admin/games/' + encodeURIComponent(slug), { method: 'DELETE', body: {} });
}

export async function fetchAdminOrders() {
  return requestAdminJson('/api/admin/orders');
}

export async function fetchAdminUsers() {
  return requestAdminJson('/api/admin/users');
}

export async function updateAdminOrder(id, patch) {
  return requestAdminJson('/api/admin/orders/' + encodeURIComponent(id), { method: 'PATCH', body: patch });
}

export async function deleteAdminOrder(id) {
  return requestAdminJson('/api/admin/orders/' + encodeURIComponent(id), { method: 'DELETE', body: {} });
}

export async function uploadAdminMediaFile(file) {
  if (!file) throw new Error('Seleccioná una imagen primero.');
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Formato admitido: PNG, JPEG o WebP.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('La imagen supera los 2 MB permitidos.');
  }

  const dataUrl = await readFileAsDataUrl(file);
  const commaIndex = dataUrl.indexOf(',');
  const dataBase64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;

  return requestAdminJson('/api/admin/media', {
    method: 'POST',
    body: {
      filename: file.name || 'imagen.jpg',
      contentType: file.type,
      dataBase64,
    },
  });
}
