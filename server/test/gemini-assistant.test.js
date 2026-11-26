import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AssistantServiceError,
  callGeminiJson,
  DEFAULT_GEMINI_MODEL,
  diagnoseCarnivorousPlant,
  generateAdminCopy,
  getArgentinaDateKey,
  getGeminiModel,
  isGeminiConfigured,
  recommendCatalogProducts,
} from '../src/services/gemini-assistant.js';

const sampleCatalog = [
  {
    id: 'venus-small',
    name: 'Venus atrapamoscas chica',
    species: 'Dionaea muscipula',
    description: 'Planta juvenil aclimatada.',
    price: 8000,
    category: 'venus',
    categoryLabel: 'Venus',
    image: '/images/catalog/venus-small.png',
    imageAlt: 'Venus chica',
    note: 'Maceta n.º 6',
    stockStatus: 'available',
    isActive: true,
  },
  {
    id: 'nepenthes-bloody',
    name: 'Nepenthes Bloody Mary',
    species: 'Nepenthes ×',
    description: 'Híbrido tropical de jarros rojos.',
    price: 22000,
    category: 'otras',
    categoryLabel: 'Otras especies',
    image: '/images/gallery/nepenthes.jpeg',
    imageAlt: 'Nepenthes',
    note: 'Colgante',
    stockStatus: 'unavailable',
    isActive: true,
  },
];

test('isGeminiConfigured, getGeminiModel y getArgentinaDateKey validan configuración básica', () => {
  assert.equal(isGeminiConfigured({}), false);
  assert.equal(isGeminiConfigured({ GEMINI_API_KEY: 'corta' }), false);
  assert.equal(isGeminiConfigured({ GEMINI_API_KEY: 'AIzaSyTestKeyExample123456' }), true);

  assert.equal(getGeminiModel({}), DEFAULT_GEMINI_MODEL);
  assert.equal(getGeminiModel({ GEMINI_MODEL: 'gemini-2.5-flash' }), 'gemini-2.5-flash');
  assert.equal(getGeminiModel({ GEMINI_MODEL: 'invalido con espacios!' }), DEFAULT_GEMINI_MODEL);

  // 2026-11-26T02:00:00Z corresponde a las 23:00 del 25/11 en Argentina (UTC-3).
  assert.equal(getArgentinaDateKey(new Date('2026-11-26T02:00:00Z')), '2026-11-25');
});

test('diagnoseCarnivorousPlant envía header x-goog-api-key, imagen multimodal y filtra productos no disponibles', async () => {
  let capturedUrl = '';
  let capturedHeaders = null;
  let capturedBody = null;

  const mockFetch = async (url, init) => {
    capturedUrl = String(url);
    capturedHeaders = init.headers;
    capturedBody = JSON.parse(init.body);
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                severity: 'leve',
                summary: 'Las trampas viejas negras suelen ser recambio natural si el centro sigue verde.',
                possibleCauses: ['Recambio natural de trampas'],
                steps: ['Cortá solo la parte negra seca con tijera limpia.'],
                avoid: ['No uses agua de la canilla'],
                tucumanTip: 'En siestas de verano tucumano evitá sol directo entre las 12 y 16 h.',
                recommendedProductIds: ['venus-small', 'nepenthes-bloody', 'inventado'],
              }),
            }],
          },
        }],
      }),
    };
  };

  const result = await diagnoseCarnivorousPlant({
    apiKey: 'AIzaSySecretKeyNoLeak',
    model: 'gemini-3.5-flash-lite',
    question: 'Tiene hojas negras viejas en la base',
    species: 'Venus atrapamoscas',
    image: { contentType: 'image/jpeg', dataBase64: 'AAAA' },
    catalogProducts: sampleCatalog,
    fetchImpl: mockFetch,
  });

  assert.equal(capturedUrl.includes('AIzaSySecretKeyNoLeak'), false);
  assert.equal(capturedHeaders['x-goog-api-key'], 'AIzaSySecretKeyNoLeak');
  assert.equal(capturedBody.contents[0].parts.length, 2);
  assert.equal(capturedBody.contents[0].parts[1].inlineData.mimeType, 'image/jpeg');
  assert.equal(result.severity, 'leve');
  assert.deepEqual(result.recommendedProducts.map((p) => p.id), ['venus-small']);
});

test('recommendCatalogProducts hidrata productos del catálogo y descarta IDs inexistentes', async () => {
  const result = await recommendCatalogProducts({
    apiKey: 'AIzaSySecretKeyNoLeak',
    query: 'Balcón con 3 horas de sol en Yerba Buena',
    sunlight: 'sol-parcial',
    experience: 'principiante',
    budgetMaxARS: 12000,
    catalogProducts: sampleCatalog,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                intro: 'Para empezar en balcón te conviene esta Venus.',
                recommendations: [
                  { productId: 'venus-small', reason: 'Ideal para sol suave de mañana.', careSummary: 'Bandeja con agua de lluvia.' },
                  { productId: 'no-existe', reason: 'Alucinación', careSummary: 'Nada' },
                ],
                generalTip: 'Aclimatá al sol gradualmente.',
              }),
            }],
          },
        }],
      }),
    }),
  });

  assert.equal(result.recommendations.length, 1);
  assert.equal(result.recommendations[0].product.price, 8000);
  assert.equal(result.recommendations[0].product.name, 'Venus atrapamoscas chica');
});

test('generateAdminCopy devuelve título, descripción, alt SEO y captions y sanitiza errores 429/401', async () => {
  const copy = await generateAdminCopy({
    apiKey: 'AIzaSySecretKeyNoLeak',
    target: 'product',
    name: 'Venus chica',
    species: 'Dionaea muscipula',
    price: 8000,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: '```json\n{"suggestedTitle":"Venus atrapamoscas juvenil","description":"Cultivada en Tucumán con trampas activas.","altText":"Venus atrapamoscas verde en maceta negra.","instagramCaption":"Sumá una Venus a tu balcón #CarnivorasTucuman","whatsappPitch":"Tenemos Venus chicas disponibles a $8.000."}\n```',
            }],
          },
        }],
      }),
    }),
  });

  assert.equal(copy.suggestedTitle, 'Venus atrapamoscas juvenil');
  assert.match(copy.instagramCaption, /CarnivorasTucuman/);

  await assert.rejects(
    () => diagnoseCarnivorousPlant({
      apiKey: 'AIzaSySecretKeyNoLeak',
      question: '¿Cómo la riego?',
      fetchImpl: async () => ({ ok: false, status: 429 }),
    }),
    (err) => err instanceof AssistantServiceError && err.status === 429 && !err.message.includes('AIzaSy'),
  );
});

test('gemini-3.5-flash-lite omite temperature, modelos 2.5 la mantienen y 503 transitorio se reintenta 1 vez', async () => {
  const seenConfigs = [];
  let attempts = 0;

  const res35 = await callGeminiJson({
    apiKey: 'AIzaSySecretKeyNoLeak',
    model: 'gemini-3.5-flash-lite',
    systemInstruction: 'System',
    userText: 'User',
    retryDelayMs: 0,
    fetchImpl: async (_url, init) => {
      attempts += 1;
      const body = JSON.parse(init.body);
      seenConfigs.push(body.generationConfig);
      if (attempts === 1) {
        return { ok: false, status: 503, text: async () => 'temporarily unavailable' };
      }
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
        }),
      };
    },
  });

  assert.equal(attempts, 2);
  assert.equal(res35.ok, true);
  assert.equal('temperature' in seenConfigs[0], false);
  assert.equal(seenConfigs[0].maxOutputTokens, 1024);

  let legacyConfig = null;
  await callGeminiJson({
    apiKey: 'AIzaSySecretKeyNoLeak',
    model: 'gemini-2.5-flash',
    systemInstruction: 'System',
    userText: 'User',
    temperature: 0.4,
    retryDelayMs: 0,
    fetchImpl: async (_url, init) => {
      legacyConfig = JSON.parse(init.body).generationConfig;
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
        }),
      };
    },
  });
  assert.equal(legacyConfig.temperature, 0.4);
});
