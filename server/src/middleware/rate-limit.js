// Limitador de peticiones por IP en memoria, sin dependencias externas.
// Es suficiente para una sola instancia de Express; con varias instancias haría falta un almacén compartido.
export function createRateLimiter({
  windowMs = 60_000,
  max = 120,
  maxEntries = 10_000,
  code = 'RATE_LIMIT_EXCEEDED',
  message = 'Demasiadas consultas en poco tiempo. Esperá un momento y volvé a intentar.',
} = {}) {
  const hits = new Map();

  function pruneExpired(now) {
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }

  return function rateLimit(request, response, next) {
    const now = Date.now();
    const key = request.ip || request.socket?.remoteAddress || 'unknown';
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      if (!entry && hits.size >= maxEntries) {
        pruneExpired(now);
        if (hits.size >= maxEntries) hits.delete(hits.keys().next().value);
      }

      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    const secondsUntilReset = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    response.set('RateLimit-Limit', String(max));
    response.set('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    response.set('RateLimit-Reset', String(secondsUntilReset));

    if (entry.count > max) {
      response.set('Retry-After', String(secondsUntilReset));
      return response.status(429).json({ error: { code, message } });
    }

    return next();
  };
}
