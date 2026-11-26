const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION_PX = 1280;

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No pudimos leer la imagen seleccionada.'));
    reader.readAsDataURL(blob);
  });
}

function splitDataUrl(dataUrl, fallbackContentType) {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(String(dataUrl || ''));
  if (!match) {
    throw new Error('No pudimos preparar la imagen.');
  }
  return {
    contentType: match[1] || fallbackContentType,
    dataBase64: match[2],
  };
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No pudimos procesar la imagen seleccionada.'));
    image.src = src;
  });
}

export async function compressImageForAssistant(file) {
  if (!file) return null;
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Formato admitido: JPG, PNG o WebP.');
  }

  const objectUrl = typeof URL?.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
  try {
    if (objectUrl && typeof document !== 'undefined') {
      const image = await loadImageElement(objectUrl);
      const maxSide = Math.max(image.naturalWidth || 0, image.naturalHeight || 0);
      const scale = maxSide > MAX_DIMENSION_PX ? MAX_DIMENSION_PX / maxSide : 1;
      const width = Math.max(1, Math.round((image.naturalWidth || MAX_DIMENSION_PX) * scale));
      const height = Math.max(1, Math.round((image.naturalHeight || MAX_DIMENSION_PX) * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(image, 0, 0, width, height);
        const outputType = file.type === 'image/png' && file.size <= 700_000 ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputType, 0.82);
        const parsed = splitDataUrl(dataUrl, outputType);
        if (Math.ceil(parsed.dataBase64.length * 0.75) <= MAX_UPLOAD_BYTES) {
          return parsed;
        }
      }
    }
  } catch {
    // Fallback abajo si el canvas no está disponible.
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('La imagen supera los 2 MB permitidos.');
  }
  const fallbackUrl = await readBlobAsDataUrl(file);
  return splitDataUrl(fallbackUrl, file.type);
}

async function requestAssistantJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'No pudimos completar tu consulta en este momento.');
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }
  return payload?.data ?? payload;
}

export async function fetchAssistantStatus() {
  if (import.meta.env.VITE_STATIC_PREVIEW === 'true') {
    return { enabled: false };
  }
  try {
    const data = await requestAssistantJson('/api/assistant/status');
    return { enabled: Boolean(data?.enabled) };
  } catch {
    return { enabled: false };
  }
}

export async function askCareAssistant({ question, species = '', locationContext = '', image = null }) {
  return requestAssistantJson('/api/assistant/care', {
    method: 'POST',
    body: JSON.stringify({ question, species, locationContext, image }),
  });
}

export async function askCatalogRecommender({ query, sunlight = '', experience = '', budgetMaxARS }) {
  return requestAssistantJson('/api/assistant/recommend', {
    method: 'POST',
    body: JSON.stringify({
      query,
      sunlight,
      experience,
      ...(budgetMaxARS ? { budgetMaxARS: Number(budgetMaxARS) } : {}),
    }),
  });
}
