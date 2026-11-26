export async function fetchUnlockedGames({ signal } = {}) {
  const response = await fetch('/api/games', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    throw new Error('La API de juegos respondió con estado ' + response.status + '.');
  }

  const payload = await response.json();
  if (!Array.isArray(payload.data)) {
    throw new Error('La respuesta de juegos no tiene el formato esperado.');
  }

  return { games: payload.data, playerName: payload.meta?.playerName ?? 'Cliente' };
}
