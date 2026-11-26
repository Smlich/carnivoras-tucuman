# Inicio de sesión con Google y Facebook

El sitio soporta autenticación OAuth 2.0 en sus dos despliegues:

1. **En Netlify Live (`netlify/functions/api.mjs` + Netlify Blobs):** flujo OAuth 2.0 Authorization Code + PKCE (S256) directo con Google (`/api/auth/google/start`, `/api/auth/callback/google`, `/api/auth/get-session`, `/api/auth/sign-out`) usando cookies `HttpOnly` firmadas (`ct_oauth_state` y `ct_user_session`).
2. **En el servidor Express MERN (`server/`):** Better Auth en `/api/auth/*` con MongoDB Atlas.

React solo muestra el botón «Ingresar» con Google cuando `/api/auth/status` confirma que las credenciales están configuradas en el servidor. No se guardan contraseñas de clientes ni secretos de Google en el navegador.

## Activar Google Sign-In en Netlify (2 pasos)

1. En **Google Cloud Console** → Credenciales OAuth → URIs de redireccionamiento autorizados: agregá `https://carnivorastucuman.netlify.app/api/auth/callback/google` (y origen JavaScript `https://carnivorastucuman.netlify.app`).
2. En **Netlify** → Environment variables: cargá `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y (opcional) `ADMIN_EMAILS` con tu Gmail para activar también el modo Admin al entrar con Google; luego ejecutá un redeploy.

## Flujo de una cuenta

```text
React → /api/auth/google/start (PKCE) o Better Auth → Google
      ← callback validado en servidor ← Google
      → cliente guardado en Blobs (registered-users) o MongoDB
      ← cookie HttpOnly ct_user_session ← navegador
      (si el email verificado coincide con ADMIN_EMAIL / ADMIN_EMAILS, también emite ct_admin_session)
```

La tienda conserva WhatsApp como canal de confirmación del pedido, adjuntando automáticamente el **nombre del cliente** y si **está registrado con Google** (con su correo verificado) o compra sin cuenta.

## Opciones de seguridad

- Los clientes normales nunca ven enlaces ni textos relacionados con `/admin.html`: la UI de administración se renderiza únicamente tras autenticar una sesión Admin válida.

- Better Auth valida el estado OAuth y procesa los callbacks en el servidor.
- La URL base es explícita; cada proveedor exige que la URI de retorno coincida exactamente con la configurada en su panel.
- La lista `trustedOrigins` usa los orígenes permitidos en `CORS_ORIGINS`.
- Las cookies son `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- Los tokens OAuth se cifran en MongoDB. El sitio solo necesita identificar a la persona; no llama APIs de Google o Meta en nombre del cliente.
- Google exige correo verificado para abrir sesión. Facebook puede no entregar un correo válido; cuando falta, se guarda un marcador con dominio reservado `.invalid` basado en el ID de la cuenta. Ese marcador no es un contacto y no se usa para enviar mensajes.
- El registro social normal no da permisos de administración. Los clientes que inician sesión con Google juegan con rol estándar (`player`).
- El panel `/admin.html` y las rutas `/api/admin/*` exigen autenticación explícita de administrador: sesión firmada `ct_admin_session` (`HttpOnly`, `SameSite=Lax`, `Secure` en HTTPS) con contraseña verificada vía PBKDF2 (`ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` / `ADMIN_SESSION_SECRET`), o en el servidor MERN un correo verificado de Google listado en `ADMIN_EMAILS`.
- Para crear o restablecer el acceso de administración en MongoDB Atlas desde línea de comandos está disponible `npm run seed:admin`.

## Estado verificado en desarrollo

El 25 de noviembre de 2026, `/api/auth/status` respondió `enabled: true` y `providers: ["google"]`. Se completó un inicio real de sesión con Google desde `http://localhost:5173`; Better Auth procesó el callback y la tienda mostró una sesión activa. En la misma sesión se comprobó que el acceso persistía al recargar, que cerrar sesión devolvía la opción de acceso con Google y que un nuevo inicio volvía a persistir tras otra recarga. Las credenciales permanecen en `.env`, que Git ignora. Facebook aún no está configurado. La vista pública de Netlify publica el frontend y una Netlify Function exclusiva del contador, sin API MERN ni sesiones OAuth.

Usa siempre el mismo host en `BETTER_AUTH_URL`, el navegador y el URI de retorno. `localhost` y `127.0.0.1` son orígenes distintos: mezclarlos produjo `state_mismatch` en una prueba; usar `localhost` en los tres lugares lo corrigió.

Better Auth recomienda una URL base explícita y callbacks registrados en Google y Meta ([Google](https://better-auth.com/docs/authentication/google), [Facebook](https://better-auth.com/docs/authentication/facebook)). Su handler Express 5 debe montarse antes del parser JSON ([integración Express](https://better-auth.com/docs/integrations/express)); el adaptador MongoDB puede compartir el cliente y habilitar transacciones ([adaptador MongoDB](https://better-auth.com/docs/adapters/mongo)).

## Preparar `.env`

Usa `.env.example` como plantilla y guarda estos valores solo en `.env`:

- `MONGODB_URI`: URI privada del clúster Atlas.
- `MONGODB_DATABASE=carnivoras_tucuman`.
- `BETTER_AUTH_URL=http://localhost:5173` para desarrollo local.
- `BETTER_AUTH_SECRET`: secreto aleatorio de al menos 32 caracteres.
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
- `FACEBOOK_CLIENT_ID` y `FACEBOOK_CLIENT_SECRET`.

`BETTER_AUTH_URL` debe coincidir exactamente con el origen desde el que abres Vite. El valor de ejemplo usa `http://localhost:5173`; si Vite informa otro puerto, actualiza también `BETTER_AUTH_URL`, agrega ese origen a `CORS_ORIGINS` y registra las URIs de retorno con el mismo host y puerto. El API recibe esas rutas mediante el proxy de Vite.

Puedes generar el secreto desde PowerShell con Node.js:

```powershell
node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('base64url'))"
```

Pega el resultado directamente en el archivo local `.env`; no lo envíes por chat ni lo agregues a Git.

## URIs de retorno

Con el valor de ejemplo de `.env.example`, registra estas URIs locales. Si cambias el origen o el puerto, sustituye esa parte en ambas direcciones para que coincida con `BETTER_AUTH_URL`:

```text
http://localhost:5173/api/auth/callback/google
http://localhost:5173/api/auth/callback/facebook
```

Agrega cada URI en la aplicación correspondiente de Google Cloud Console y Meta for Developers. En producción registra las dos versiones HTTPS con el dominio definitivo, por ejemplo `https://tu-dominio.com/api/auth/callback/google` y `https://tu-dominio.com/api/auth/callback/facebook`.

## Iniciar y comprobar la configuración

Después de configurar Atlas, `.env` y al menos un proveedor:

1. Reinicia `npm run dev:all`.
2. Abre `http://127.0.0.1:4000/api/auth/status`.
3. Comprueba que responda `enabled: true` y liste los proveedores con IDs y secretos configurados.
4. Abre la web desde el mismo origen configurado en `BETTER_AUTH_URL` y usa el menú de cuenta.
5. Repite el inicio de sesión con Google y Facebook, y confirma que al volver hay una sesión activa.

Si falta Atlas o la configuración OAuth, la API informa `enabled: false`; en desarrollo el resto de la tienda sigue funcionando. En producción, el servidor exige `MONGODB_URI`, `CORS_ORIGINS` (HTTPS públicos, sin `localhost`), `BETTER_AUTH_URL` con HTTPS, `BETTER_AUTH_SECRET` y **al menos un proveedor social** (por ejemplo solo Google mientras Facebook siga pendiente).

## Preguntas de repaso

1. ¿Por qué los secretos OAuth están en Express y no en React?
2. ¿Qué protege la cookie `HttpOnly`?
3. ¿Por qué el marcador `.invalid` de Facebook no debe usarse como correo de contacto?
4. ¿Por qué el inicio de sesión no convierte automáticamente al cliente en administrador?
