const storageKey = 'carnivoras-tucuman:visit-count:v1';
const counterSelector = '[data-visit-counter]';
const netlifyEndpoint = '/.netlify/functions/visit-counter';

function formatCount(count) {
  return new Intl.NumberFormat('es-AR').format(count);
}

function updateCounter(element, count, caption) {
  const value = element.querySelector('[data-visit-count]');
  const note = element.querySelector('[data-visit-caption]');

  if (value) value.textContent = count === null ? '—' : formatCount(count);
  if (note && caption) note.textContent = caption;
}

function getSavedCount() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    return Number.isSafeInteger(saved?.count) && saved.count >= 0 ? saved.count : null;
  } catch {
    return null;
  }
}

function saveCount(count) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify({ count }));
  } catch {
    // The current page still displays the count when browser storage is disabled.
  }
}

// La portada indica su endpoint (data-visit-endpoint). La guía estática no: allí se deduce por el dominio.
function getEndpoints(element) {
  const configured = element.dataset.visitEndpoint;
  if (configured) return [configured];
  if (window.location.hostname.endsWith('.netlify.app')) return [netlifyEndpoint];
  return ['/api/visits', netlifyEndpoint];
}

async function requestCount(element) {
  const endpoints = getEndpoints(element);

  for (let index = 0; index < endpoints.length; index += 1) {
    const response = await fetch(endpoints[index], {
      method: 'POST',
      headers: { 'X-Counter-Request': '1' },
      cache: 'no-store',
    });

    // Solo se prueba el siguiente endpoint cuando el actual no existe en este hosting.
    if (response.status === 404 && index < endpoints.length - 1) continue;
    if (!response.ok) throw new Error('The shared visit counter is unavailable.');

    return response.json();
  }

  throw new Error('The shared visit counter is unavailable.');
}

async function loadSharedCount(element) {
  const savedCount = getSavedCount();
  if (savedCount !== null) {
    updateCounter(element, savedCount, 'total compartido · una visita por sesión');
    return;
  }

  try {
    const result = await requestCount(element);
    if (!Number.isSafeInteger(result.count) || result.count < 0) throw new Error('The visit counter returned an invalid count.');

    saveCount(result.count);
    updateCounter(element, result.count, 'total compartido · una visita por sesión');
  } catch {
    updateCounter(element, null, 'contador temporalmente no disponible');
  }
}

function initializeCounter(element) {
  if (element.dataset.initialized) return;
  element.dataset.initialized = 'true';
  loadSharedCount(element);
}

function initializeCounters() {
  const counters = document.querySelectorAll(counterSelector);
  counters.forEach(initializeCounter);
  if (counters.length) observer.disconnect();
}

const observer = new MutationObserver(initializeCounters);
observer.observe(document.documentElement, { childList: true, subtree: true });
initializeCounters();
