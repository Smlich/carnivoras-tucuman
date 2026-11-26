# API del vivero y Panel de Administración

La misma interfaz de API (`/api/*`) funciona tanto en **Netlify live** (`netlify/functions/api.mjs` + Netlify Blobs) como en el **servidor MERN** (`server/` Express 5 + MongoDB Atlas).

## Endpoints públicos

- `GET /api/health` — estado del servicio y almacenamiento (`netlify-blobs`, `mongodb` o `demo-catalog`).
- `GET /api/site-data` — configuración global del sitio, productos activos, álbum visible y vista previa pública de juegos (`admin-only` filtrado).
- `GET /api/products` y `GET /api/products/:slug` — catálogo con filtro por categoría y búsqueda sin distinguir mayúsculas ni tildes.
- `GET /api/gallery` — fotografías activas del álbum del vivero.
- `GET /api/media/:key` — sirve imágenes subidas por el administrador con caché inmutable.
- `GET /api/visits` / `POST /api/visits` (`X-Counter-Request: 1`) — contador compartido de sesiones.
- `POST /api/orders` — registra consultas armadas en «Mi pedido» antes de abrir WhatsApp.
- `GET /api/games` y `GET /api/games/:slug` — juegos desbloqueados por Google OAuth (`role: 'player'`) o sesión de Administrador (`role: 'admin'`, `isAdmin: true`, incluyendo `adminEmbedUrl` y `adminProps`).

## Endpoints de Administración (`/api/admin/*`)

Todas las mutaciones exigen sesión verificada (`ct_admin_session` cookie `HttpOnly` firmada o Google allowlist en MERN) y cabecera `X-Admin-Request: 1`:

- `GET /api/admin/auth/session` — estado de sesión admin actual.
- `POST /api/admin/auth/login` y `POST /api/admin/auth/logout` — inicio/cierre de sesión con verificación timing-safe PBKDF2/scrypt.
- `PUT /api/admin/auth/account` — actualiza correo, nombre y contraseña de administrador.
- `GET /api/admin/overview` — totales de visitas, productos, álbum, juegos y consultas.
- `GET/PUT /api/admin/settings` — textos globales, hero, latitud `?`, contador desde agosto 2024, banner de aviso y redes/WhatsApp.
- `GET/POST /api/admin/products` y `PUT/DELETE /api/admin/products/:slug` — CRUD completo de catálogo y stock.
- `GET/POST /api/admin/gallery` y `PUT/DELETE /api/admin/gallery/:id` — CRUD de fotografías del vivero.
- `GET/POST /api/admin/games` y `PUT/DELETE /api/admin/games/:slug` — CRUD de juegos y `adminProps`.
- `GET /api/admin/orders` y `PATCH/DELETE /api/admin/orders/:id` — gestión de estado y notas internas de pedidos.
- `POST /api/admin/media` — subida segura de PNG/JPEG/WebP (máximo 2 MB, verificación de firma mágica).
