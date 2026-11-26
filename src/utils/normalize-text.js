// Normaliza texto para buscar sin distinguir mayúsculas ni tildes ("pequeña" coincide con "pequena").
// Es JavaScript puro para poder usarse tanto en React (Vite) como en Express (Node).
export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-AR')
    .trim();
}
