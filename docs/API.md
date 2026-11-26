# API del vivero y Panel de Administración

La misma interfaz de API (`/api/*`) funciona tanto en **Netlify live** (`netlify/functions/api.mjs` + Netlify Blobs) como en el **servidor MERN** (`server/` Express 5 + MongoDB Atlas).

## Endpoints públicos

- `GET /api/health` — estado del servicio y almacenamiento (`netlify-blobs`, `mongodb` o `demo-catalog`).
- `GET /api/site-data` — configuración global del sitio, productos activos, álbum visible y vista previa pública de juegos (`admin-only` filtrado).
- `GET /api/products` y `GET /api/products/:slug` — catálogo con filtro por categoría y búsqueda sin distinguir mayúsculas ni tildes, validado con Zod (`productsQuerySchema`).
- `GET /api/gallery` — fotografías activas del álbum del vivero.
- `GET /api/media/:key` — sirve imágenes subidas por el administrador con caché inmutable.
- `GET /api/visits` / `POST /api/visits` (`X-Counter-Request: 1`) — contador compartido de sesiones.
- `GET /api/auth/status`, `GET /api/auth/get-session`, `GET /api/auth/google/start`, `GET /api/auth/callback/google`, `POST /api/auth/sign-out` — flujo OAuth 2.0 + PKCE con Google para clientes en Netlify Functions (en el servidor MERN lo atiende Better Auth bajo `/api/auth/*`).
- `POST /api/orders` — registra consultas armadas en «Mi pedido» antes de abrir WhatsApp, aplicando rate limit, recalculando precios/nombres desde el catálogo vigente del servidor, bloqueando productos sin stock y adjuntando `customerName`, `notes` opcional y estado verificado en servidor (`googleRegistered`, `customerEmail`).
- `GET /api/assistant/status` — indica si el asistente botánico (`GEMINI_API_KEY`) está activo sin exponer configuración ni claves.
- `POST /api/assistant/care` — diagnóstico multimodal (texto + foto opcional JPG/PNG/WebP hasta 2 MB) para el «Doctor de carnívoras» en `/cuidados.html`, protegido con rate limit por IP y cuota diaria compartida.
- `POST /api/assistant/recommend` — recomendador de compra sobre productos activos en stock de `/catalogo.html`.
- `GET /api/games`, `GET /api/games/:slug`, `GET /api/games/:slug/config` y `POST /api/games/:slug/scores` — juegos desbloqueados por Google OAuth (`role: 'player'`) o sesión de Administrador (`role: 'admin'`, `isAdmin: true`), lectura de balance guardado y guardado de puntajes.

## Endpoints de Administración (`/api/admin/*`)

Todas las mutaciones exigen sesión verificada (`ct_admin_session` cookie `HttpOnly` firmada o Google allowlist via `ADMIN_EMAIL` / `ADMIN_EMAILS`) y cabecera `X-Admin-Request: 1`:

- `GET /api/admin/auth/session` — estado de sesión admin actual (`?meta=1` incluye disponibilidad de configuración para `/admin.html`).
- `POST /api/admin/auth/login` y `POST /api/admin/auth/logout` — inicio/cierre de sesión con verificación timing-safe PBKDF2/scrypt y bloqueo temporal tras intentos fallidos repetidos (`429 TOO_MANY_LOGIN_ATTEMPTS`).
- `PUT /api/admin/auth/account` — actualiza correo, nombre y contraseña de administrador e incrementa `tokenVersion` para revocar cookies de contraseña previas.
- `GET /api/admin/overview` — totales de visitas, productos, álbum, juegos, clientes registrados con Google y consultas.
- `GET /api/admin/users` — listado de clientes registrados con Google.
- `GET/PUT /api/admin/settings` — textos globales, hero, latitud `?`, contador desde agosto 2024, banner de aviso y redes/WhatsApp.
- `GET/POST /api/admin/products` y `PUT/DELETE /api/admin/products/:slug` — CRUD completo de catálogo y stock (limpia automáticamente imágenes `/api/media/*` huérfanas).
- `GET/POST /api/admin/gallery` y `PUT/DELETE /api/admin/gallery/:id` — CRUD de fotografías del vivero (limpia automáticamente imágenes `/api/media/*` huérfanas).
- `GET/POST /api/admin/games`, `PUT/DELETE /api/admin/games/:slug`, `GET/PUT /api/admin/games/:slug/config` y `GET /api/admin/games/:slug/scores` — CRUD de juegos, persistencia del editor in-game de Dionaea Strike solo para Admin y listado de puntajes.
- `GET /api/admin/orders` y `PATCH/DELETE /api/admin/orders/:id` — gestión de estado, notas del cliente y notas internas de pedidos.
- `POST /api/admin/media` — subida segura de PNG/JPEG/WebP (máximo 2 MB, verificación de firma mágica).
- `GET /api/admin/assistant/status` y `POST /api/admin/assistant/copy` — estado, modelo, contadores diarios y generación con Gemini de descripción, `alt` SEO, caption para Instagram y respuesta rápida para WhatsApp.
