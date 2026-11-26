export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_PUBLIC_DAILY_LIMIT = 120;
export const DEFAULT_ADMIN_DAILY_LIMIT = 80;

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,64}$/i;

export class AssistantServiceError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'AssistantServiceError';
    this.status = status;
    this.code = code;
  }
}

export function isGeminiConfigured(envConfig = {}) {
  return Boolean(typeof envConfig.GEMINI_API_KEY === 'string' && envConfig.GEMINI_API_KEY.trim().length >= 10);
}

export function getGeminiModel(envConfig = {}) {
  const candidate = typeof envConfig.GEMINI_MODEL === 'string' ? envConfig.GEMINI_MODEL.trim() : '';
  return candidate && MODEL_NAME_PATTERN.test(candidate) ? candidate : DEFAULT_GEMINI_MODEL;
}

export function getGeminiDailyLimit(envConfig = {}) {
  const raw = envConfig.GEMINI_DAILY_LIMIT;
  const parsed = Number(raw);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 10_000) {
    return parsed;
  }
  return DEFAULT_PUBLIC_DAILY_LIMIT;
}

export function getArgentinaDateKey(date = new Date()) {
  const argentinaMs = date.getTime() - 3 * 60 * 60 * 1000;
  return new Date(argentinaMs).toISOString().slice(0, 10);
}

function stripJsonCodeFences(rawText) {
  const trimmed = String(rawText || '').trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function clampString(value, maxLength, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return fallback;
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
}

function clampStringArray(items, maxItems, maxLength) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => clampString(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function formatCatalogSummaryItem(product) {
  return {
    id: product.id,
    name: product.name,
    species: product.species,
    category: product.category,
    categoryLabel: product.categoryLabel,
    priceARS: product.price,
    note: product.note,
    stockStatus: product.stockStatus || 'ask',
    description: clampString(product.description, 180),
  };
}

function hydratePublicProduct(product) {
  return {
    id: product.id,
    name: product.name,
    species: product.species,
    description: product.description,
    price: product.price,
    category: product.category,
    categoryLabel: product.categoryLabel,
    image: product.image,
    imageAlt: product.imageAlt,
    note: product.note,
    stockStatus: product.stockStatus || 'ask',
  };
}

function isGemini35OrNewer(modelName) {
  return /^gemini-3\.[5-9]/i.test(String(modelName || '').trim());
}

export async function callGeminiJson({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  systemInstruction,
  userText,
  image = null,
  responseSchema,
  maxOutputTokens = 1024,
  temperature = 0.35,
  retryDelayMs = 350,
  fetchImpl = globalThis.fetch,
}) {
  if (!apiKey || typeof fetchImpl !== 'function') {
    throw new AssistantServiceError(503, 'ASSISTANT_UNAVAILABLE', 'El asistente no está disponible en este momento.');
  }

  const safeModel = MODEL_NAME_PATTERN.test(String(model || '').trim())
    ? String(model).trim()
    : DEFAULT_GEMINI_MODEL;

  const parts = [{ text: String(userText || '') }];
  if (image?.contentType && image?.dataBase64) {
    parts.push({
      inlineData: {
        mimeType: image.contentType,
        data: image.dataBase64,
      },
    });
  }

  const generationConfig = {
    responseMimeType: 'application/json',
    responseSchema,
    maxOutputTokens,
    ...(!isGemini35OrNewer(safeModel) && typeof temperature === 'number' ? { temperature } : {}),
  };

  const requestBody = JSON.stringify({
    systemInstruction: {
      parts: [{ text: String(systemInstruction || '') }],
    },
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
    generationConfig,
  });

  const retryableStatuses = new Set([500, 502, 503, 504]);
  let response;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetchImpl(`${GEMINI_API_BASE}/${encodeURIComponent(safeModel)}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': String(apiKey).trim(),
        },
        body: requestBody,
        signal: AbortSignal.timeout(22_000),
      });
    } catch (networkError) {
      if (attempt === 0) {
        if (retryDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }
      console.error('Gemini API network error:', { model: safeModel, message: networkError?.message || 'network failure' });
      throw new AssistantServiceError(502, 'ASSISTANT_ERROR', 'No pudimos conectar con el asistente botánico. Probá nuevamente en unos segundos.');
    }

    if (!response.ok && retryableStatuses.has(response.status) && attempt === 0) {
      if (retryDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      continue;
    }
    break;
  }

  if (!response.ok) {
    let detail = '';
    try {
      const errText = await response.text?.();
      detail = String(errText || '').slice(0, 240);
    } catch {
      detail = '';
    }
    console.error('Gemini API upstream error:', { status: response.status, model: safeModel, detail });

    if (response.status === 429) {
      throw new AssistantServiceError(429, 'ASSISTANT_BUSY', 'El asistente está recibiendo muchas consultas. Esperá un momento o escribinos por WhatsApp.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new AssistantServiceError(503, 'ASSISTANT_UNAVAILABLE', 'El asistente botánico no está disponible temporalmente.');
    }
    throw new AssistantServiceError(502, 'ASSISTANT_ERROR', 'No pudimos procesar la consulta botánica en este momento.');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new AssistantServiceError(502, 'ASSISTANT_ERROR', 'El asistente devolvió una respuesta inválida.');
  }

  const candidateParts = payload?.candidates?.[0]?.content?.parts;
  const rawText = Array.isArray(candidateParts)
    ? candidateParts.map((part) => (!part?.thought && typeof part?.text === 'string' ? part.text : '')).join('\n')
    : '';

  if (!rawText.trim()) {
    throw new AssistantServiceError(502, 'ASSISTANT_ERROR', 'No recibimos una respuesta completa del asistente.');
  }

  try {
    return JSON.parse(stripJsonCodeFences(rawText));
  } catch {
    throw new AssistantServiceError(502, 'ASSISTANT_ERROR', 'No pudimos interpretar la respuesta del asistente.');
  }
}

const CARE_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    severity: { type: 'STRING', enum: ['leve', 'atencion', 'urgente'] },
    summary: { type: 'STRING' },
    possibleCauses: { type: 'ARRAY', items: { type: 'STRING' } },
    steps: { type: 'ARRAY', items: { type: 'STRING' } },
    avoid: { type: 'ARRAY', items: { type: 'STRING' } },
    tucumanTip: { type: 'STRING' },
    recommendedProductIds: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['severity', 'summary', 'possibleCauses', 'steps', 'avoid', 'tucumanTip', 'recommendedProductIds'],
};

export async function diagnoseCarnivorousPlant({
  apiKey,
  model,
  question,
  species = '',
  locationContext = '',
  image = null,
  catalogProducts = [],
  fetchImpl = globalThis.fetch,
}) {
  const eligibleCatalog = (Array.isArray(catalogProducts) ? catalogProducts : [])
    .filter((product) => product && product.isActive !== false && product.stockStatus !== 'unavailable');
  const eligibleMap = new Map(eligibleCatalog.map((product) => [product.id, product]));

  const systemInstruction = [
    'Sos el Doctor de Carnívoras de Carnívoras Tucumán (San Miguel de Tucumán, Argentina).',
    'Respondés siempre en español argentino natural (usá voseo: "regá", "ubicá", "evitá", "fijate"), con tono claro, cercano y práctico.',
    'Respondés únicamente sobre cultivo, diagnóstico y cuidados de plantas carnívoras.',
    'Reglas botánicas del vivero:',
    '- Agua pura (< 50 ppm): lluvia, destilada o de ósmosis inversa. Nunca agua de canilla, mineral ni hervida (hervir concentra sales).',
    '- Sustrato inerte: musgo sphagnum, turba rubia ácida sin fertilizantes o perlita. Nunca tierra común, compost ni abonos.',
    '- Luz en Tucumán: Dionaea (Venus), Drosera y Sarracenia necesitan buena luz solar aclimatada; en días extremos de verano tucumano usar media sombra o evitar sol directo de 12 a 16 h para no hervir el agua de la bandeja. Nepenthes y Pinguicula van con luz brillante filtrada sin sol fuerte directo.',
    '- Riego por bandeja: recomendado para Venus, Drosera y Sarracenia; Nepenthes se riega por arriba sin encharcar; Pinguicula moderado sin mojar el centro.',
    '- Hábitos clave: no dar carne/fiambre, no cerrar trampas de Venus con los dedos, respetar reposo/hibernación invernal en especies templadas.',
    'Si el usuario adjunta una foto que no muestra una planta o es borrosa, indicalo con amabilidad en `summary` y pedí una foto con luz natural o consulta por WhatsApp.',
    'Para `recommendedProductIds`, elegí entre 0 y 2 IDs exactos de la lista entregada solo si realmente aportan al caso (si ninguno aplica, devolvé []).',
  ].join('\n');

  const catalogListText = eligibleCatalog.length > 0
    ? JSON.stringify(eligibleCatalog.map(formatCatalogSummaryItem))
    : '[]';

  const userText = [
    `Especie indicada: ${species || 'No especificada'}`,
    `Ubicación / luz / riego actual: ${locationContext || 'No especificado'}`,
    `Foto adjunta: ${image ? 'Sí' : 'No'}`,
    `Consulta del cultivador: ${question}`,
    `Productos disponibles para recomendar (solo usar estos IDs si aplica): ${catalogListText}`,
  ].join('\n');

  const raw = await callGeminiJson({
    apiKey,
    model,
    systemInstruction,
    userText,
    image,
    responseSchema: CARE_RESPONSE_SCHEMA,
    maxOutputTokens: 1024,
    temperature: 0.35,
    fetchImpl,
  });

  const severity = ['leve', 'atencion', 'urgente'].includes(raw?.severity) ? raw.severity : 'atencion';
  const recommendedProducts = [];
  const seenIds = new Set();
  for (const id of Array.isArray(raw?.recommendedProductIds) ? raw.recommendedProductIds : []) {
    if (seenIds.has(id)) continue;
    const match = eligibleMap.get(id);
    if (!match) continue;
    seenIds.add(id);
    recommendedProducts.push(hydratePublicProduct(match));
    if (recommendedProducts.length >= 2) break;
  }

  return {
    severity,
    summary: clampString(raw?.summary, 420, 'Revisamos tu consulta según las pautas del vivero.'),
    possibleCauses: clampStringArray(raw?.possibleCauses, 4, 220),
    steps: clampStringArray(raw?.steps, 5, 240),
    avoid: clampStringArray(raw?.avoid, 4, 220),
    tucumanTip: clampString(
      raw?.tucumanTip,
      280,
      'En Tucumán cuidá que el sol fuerte del mediodía en verano no caliente en exceso la bandeja ni el sustrato.',
    ),
    recommendedProducts,
  };
}

const RECOMMEND_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    intro: { type: 'STRING' },
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          productId: { type: 'STRING' },
          reason: { type: 'STRING' },
          careSummary: { type: 'STRING' },
        },
        required: ['productId', 'reason', 'careSummary'],
      },
    },
    generalTip: { type: 'STRING' },
  },
  required: ['intro', 'recommendations', 'generalTip'],
};

export async function recommendCatalogProducts({
  apiKey,
  model,
  query,
  sunlight = '',
  experience = '',
  budgetMaxARS,
  catalogProducts = [],
  fetchImpl = globalThis.fetch,
}) {
  const eligibleCatalog = (Array.isArray(catalogProducts) ? catalogProducts : [])
    .filter((product) => product && product.isActive !== false && product.stockStatus !== 'unavailable');

  if (eligibleCatalog.length === 0) {
    return {
      intro: 'En este momento no tenemos ejemplares disponibles para recomendar automáticamente.',
      recommendations: [],
      generalTip: 'Escribinos por WhatsApp para consultar próximos ingresos del vivero.',
    };
  }

  const eligibleMap = new Map(eligibleCatalog.map((product) => [product.id, product]));
  const systemInstruction = [
    'Sos el asesor de compras de Carnívoras Tucumán (vivero en Tucumán, Argentina).',
    'Respondé en español argentino cercano (voseo) y recomendá únicamente productos que existan en el catálogo entregado.',
    'Nunca inventes IDs, especies ni precios distintos a los del catálogo.',
    'Elegí entre 1 y 3 productos ordenados del más adecuado al menos adecuado según luz, clima de Tucumán, experiencia y presupuesto máximo si fue indicado.',
    'Si el presupuesto máximo es menor que todos los productos, indicá con honestidad las opciones más accesibles del catálogo.',
  ].join('\n');

  const userText = [
    `Necesidad del cliente: ${query}`,
    `Luz disponible: ${sunlight || 'No especificada'}`,
    `Experiencia previa: ${experience || 'No especificada'}`,
    `Presupuesto máximo aproximado (ARS): ${Number.isFinite(budgetMaxARS) ? budgetMaxARS : 'Sin límite indicado'}`,
    `Catálogo activo disponible: ${JSON.stringify(eligibleCatalog.map(formatCatalogSummaryItem))}`,
  ].join('\n');

  const raw = await callGeminiJson({
    apiKey,
    model,
    systemInstruction,
    userText,
    responseSchema: RECOMMEND_RESPONSE_SCHEMA,
    maxOutputTokens: 1024,
    temperature: 0.35,
    fetchImpl,
  });

  const recommendations = [];
  const seenIds = new Set();
  for (const entry of Array.isArray(raw?.recommendations) ? raw.recommendations : []) {
    const productId = typeof entry?.productId === 'string' ? entry.productId.trim() : '';
    if (!productId || seenIds.has(productId)) continue;
    const match = eligibleMap.get(productId);
    if (!match) continue;
    seenIds.add(productId);
    recommendations.push({
      productId: match.id,
      reason: clampString(entry?.reason, 260, 'Se adapta bien a las condiciones que nos contaste.'),
      careSummary: clampString(entry?.careSummary, 200, match.note || 'Agua pura y buena luz natural.'),
      product: hydratePublicProduct(match),
    });
    if (recommendations.length >= 3) break;
  }

  return {
    intro: clampString(raw?.intro, 280, 'Estas opciones de nuestro catálogo se adaptan mejor a tu espacio:'),
    recommendations,
    generalTip: clampString(
      raw?.generalTip,
      260,
      'Usá siempre agua de lluvia o destilada y consultanos disponibilidad vigente al enviar tu pedido.',
    ),
  };
}

const ADMIN_COPY_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    suggestedTitle: { type: 'STRING' },
    description: { type: 'STRING' },
    altText: { type: 'STRING' },
    instagramCaption: { type: 'STRING' },
    whatsappPitch: { type: 'STRING' },
  },
  required: ['suggestedTitle', 'description', 'altText', 'instagramCaption', 'whatsappPitch'],
};

export async function generateAdminCopy({
  apiKey,
  model,
  target = 'product',
  name = '',
  species = '',
  category = '',
  price,
  note = '',
  existingDescription = '',
  image = null,
  fetchImpl = globalThis.fetch,
}) {
  const isGallery = target === 'gallery';
  const systemInstruction = [
    'Sos el asistente editorial y de redes de Carnívoras Tucumán.',
    'Escribís en español argentino natural (voseo), con tono botánico honesto, claro y sin exageraciones.',
    'Generá:',
    '- `suggestedTitle`: título claro y atractivo en español (máximo 80 caracteres).',
    isGallery
      ? '- `description`: epígrafe breve y real para el álbum del vivero (1 a 2 oraciones, máximo 220 caracteres).'
      : '- `description`: descripción comercial clara para tarjeta de catálogo con punto fuerte de la planta (1 a 2 oraciones, máximo 220 caracteres).',
    '- `altText`: texto alternativo accesible para lectores de pantalla y SEO, describiendo lo que se ve en la foto sin frases como "imagen de" ni relleno de palabras clave (máximo 140 caracteres).',
    '- `instagramCaption`: texto listo para publicar en @carnivoras_tucuman con cierre para consultar por WhatsApp y 4 a 6 hashtags relevantes (#CarnivorasTucuman #PlantasCarnivoras, etc.).',
    '- `whatsappPitch`: mensaje corto y directo (2 a 3 líneas) para responder consultas por WhatsApp.',
  ].join('\n');

  const userText = [
    `Tipo de carga: ${isGallery ? 'Fotografía del álbum del vivero' : 'Producto de catálogo'}`,
    `Nombre o título actual: ${name || 'No especificado'}`,
    `Especie o etiqueta: ${species || category || 'No especificada'}`,
    `Categoría: ${category || 'No especificada'}`,
    `Precio (ARS): ${Number.isFinite(price) ? price : 'No especificado'}`,
    `Nota actual: ${note || 'No especificada'}`,
    `Descripción actual: ${existingDescription || 'Vacía'}`,
    `Foto adjunta para analizar: ${image ? 'Sí (describí con fidelidad los detalles visuales reales que se observan)' : 'No'}`,
  ].join('\n');

  const raw = await callGeminiJson({
    apiKey,
    model,
    systemInstruction,
    userText,
    image,
    responseSchema: ADMIN_COPY_RESPONSE_SCHEMA,
    maxOutputTokens: 1024,
    temperature: 0.45,
    fetchImpl,
  });

  return {
    suggestedTitle: clampString(raw?.suggestedTitle, 90, name || 'Ejemplar del vivero'),
    description: clampString(raw?.description, 260, existingDescription || 'Ejemplar cultivado en nuestro vivero de Tucumán.'),
    altText: clampString(raw?.altText, 150, 'Planta carnívora cultivada en Carnívoras Tucumán.'),
    instagramCaption: clampString(raw?.instagramCaption, 700, ''),
    whatsappPitch: clampString(raw?.whatsappPitch, 400, ''),
  };
}
