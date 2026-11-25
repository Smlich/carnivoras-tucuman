import { getStore } from '@netlify/blobs';

const counterKey = 'visits';
const maxWriteAttempts = 8;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function readCount(store) {
  const entry = await store.getWithMetadata(counterKey, { type: 'json', consistency: 'strong' });
  return Number.isSafeInteger(entry?.data?.count) && entry.data.count >= 0 ? entry.data.count : 0;
}

async function incrementCount(store) {
  for (let attempt = 0; attempt < maxWriteAttempts; attempt += 1) {
    const current = await store.getWithMetadata(counterKey, { type: 'json', consistency: 'strong' });

    if (!current) {
      const created = await store.setJSON(counterKey, { count: 1 }, { onlyIfNew: true });
      if (created.modified) return 1;
      continue;
    }

    const count = Number.isSafeInteger(current.data?.count) && current.data.count >= 0 ? current.data.count : 0;
    const updated = await store.setJSON(counterKey, { count: count + 1 }, { onlyIfMatch: current.etag });
    if (updated.modified) return count + 1;
  }

  throw new Error('The visit counter could not be updated after several attempts.');
}

export default async function handler(request) {
  if (request.method === 'GET') {
    try {
      const store = getStore({ name: 'carnivoras-tucuman-site', consistency: 'strong' });
      return jsonResponse({ count: await readCount(store) });
    } catch (error) {
      console.error('Visit counter read failed.', error);
      return jsonResponse({ error: 'counter_unavailable' }, 503);
    }
  }

  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
  }

  if (request.headers.get('x-counter-request') !== '1') {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }

  try {
    const store = getStore({ name: 'carnivoras-tucuman-site', consistency: 'strong' });
    return jsonResponse({ count: await incrementCount(store) });
  } catch (error) {
    console.error('Visit counter update failed.', error);
    return jsonResponse({ error: 'counter_unavailable' }, 503);
  }
}
