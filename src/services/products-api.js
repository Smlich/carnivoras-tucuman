export async function fetchProducts({ limit = 24, signal } = {}) {
  const response = await fetch('/api/products?limit=' + encodeURIComponent(limit), {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error('La API de catálogo respondió con estado ' + response.status + '.');
  }

  const payload = await response.json();
  if (!Array.isArray(payload.data)) {
    throw new Error('La respuesta de catálogo no tiene el formato esperado.');
  }

  return payload.data;
}
