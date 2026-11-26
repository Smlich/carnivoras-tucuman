# API del vivero

Base local: `http://127.0.0.1:4000`. En desarrollo, Vite reenvía `/api` al servidor Express.

## Endpoints

### `GET /api/health`

Devuelve `Cache-Control: no-store` y el estado dentro de `data`. Con MongoDB Atlas conectado responde `200`:

```json
{
  "data": {
    "service": "carnivoras-tucuman-api",
    "status": "ok",
    "database": "connected",
    "catalogMode": "mongodb"
  }
}
```

- **En desarrollo sin MongoDB:** responde `200` con `status: "degraded"`, `database: "not-configured"` (o `"disconnected"` si `MONGODB_URI` está configurada pero no conecta) y `catalogMode: "demo-catalog"`.
- **En producción sin MongoDB conectado:** responde **`503`** con `status: "unavailable"`, `database: "disconnected"` y `catalogMode: "unavailable"`, para que los monitores de disponibilidad detecten la caída.

### `GET /api/products`

Parámetros opcionales:

- `category`: `combos`, `otras`, `venus` o `especiales`.
- `q`: búsqueda de hasta 80 caracteres, sin distinguir mayúsculas ni tildes (`pequena` coincide con `pequeña`).
- `page`: página, desde `1`.
- `limit`: resultados por página, entre `1` y `24` (por defecto `12`; el frontend solicita `24`).

Respuesta:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 8,
    "source": "demo-catalog"
  }
}
```

Cada producto incluye `stockStatus` (`ask`, `available` o `unavailable`). `meta.source` indica si los datos vienen de `mongodb` o de `demo-catalog`.

> En `NODE_ENV=production`, si MongoDB se desconecta la API responde **`503 DATABASE_UNAVAILABLE`** y nunca sirve precios viejos del catálogo de demostración.

### `GET /api/products/:slug`

Devuelve un producto publicado, `400 VALIDATION_ERROR` si el `slug` tiene formato inválido, `404 PRODUCT_NOT_FOUND` si no existe, o `503 DATABASE_UNAVAILABLE` en producción sin conexión a MongoDB.

### `GET /api/auth/status`

Indica si la autenticación está disponible (`enabled`) y qué proveedores públicos están activos (`providers`), con `Cache-Control: no-store`. No expone IDs ni secretos.

### Rutas de Better Auth (`/api/auth/*`)

Cuando Atlas, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` y al menos un proveedor están configurados, Better Auth atiende OAuth y sesiones bajo `/api/auth/*` (montado antes de `express.json()`). Si falta configuración, responde `503 AUTH_NOT_CONFIGURED`.

### `GET /api/games` y `GET /api/games/:slug`

Rutas protegidas con `createRequireAuth(auth)` y `Cache-Control: no-store`:

- Sin autenticación configurada en el servidor: `503 AUTH_NOT_CONFIGURED`.
- Sin sesión válida en Better Auth: `401 AUTH_REQUIRED`.
- Con sesión válida: devuelve los juegos registrados en `src/data/games.js` con `meta.unlocked: true` y `meta.playerName`, o `404 GAME_NOT_FOUND` para un `slug` inexistente.

### `GET /api/visits` y `POST /api/visits`

Contador agregado de sesiones persistido en MongoDB (`SiteMetric`, sin IP ni identificadores personales) para el despliegue full-stack MERN:

- `GET /api/visits`: devuelve `{ "count": <número> }` o `503 COUNTER_UNAVAILABLE` si MongoDB no está conectado.
- `POST /api/visits`: requiere cabecera `X-Counter-Request: 1` (si falta responde `400 INVALID_REQUEST`), incrementa atómicamente con `$inc` y devuelve el nuevo total.
- En la vista estática de Netlify (`VITE_STATIC_PREVIEW=true`), el pie consulta `/.netlify/functions/visit-counter` (que además valida mismo origen en `POST`).

## Seguridad, validación y límites

- **Validación:** Zod valida query params y slugs; los errores responden JSON estable sin exponer trazas en producción.
- **Errores 500:** En producción se registra un resumen estructurado seguro (`method`, `path`, `statusCode`, `code`, `message`) en logs del servidor sin exponer cabeceras ni secretos.
- **Cabeceras y CORS:** Helmet aplica CSP explícita (`frame-src 'self'` para juegos locales e imágenes de perfil de Google en `img-src`). En producción se activa `trust proxy`, `CORS_ORIGINS` es obligatorio con orígenes HTTPS públicos y `/cuidados` redirige `301` a `/cuidados.html`.
- **Rate limiting:** Límite por IP en memoria con cabeceras `RateLimit-*` y respuesta `429 RATE_LIMIT_EXCEEDED` con `Retry-After` (`/api/products`: 120/min, `/api/games` y `/api/auth/status`: 60/min, `/api/visits`: 20/min).

## Carga inicial en MongoDB (`seed-products.js`)

Ejecutá `npm run seed:products` con `MONGODB_URI` configurada en `.env`:

- **Modo seguro (por defecto):** valida cada producto contra el esquema Mongoose e inserta solo slugs nuevos (`$setOnInsert`), sin pisar precios, stock ni ediciones ya cargadas en Atlas.
- **Sobrescritura explícita:** `node server/src/scripts/seed-products.js --force` sobrescribe los productos existentes desde `src/data/products.js`.
