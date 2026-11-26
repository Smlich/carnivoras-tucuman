# Inicio de sesión con Google y Facebook

El backend usa Better Auth para gestionar el protocolo OAuth, las cuentas y las sesiones. Express entrega el handler en `/api/auth/*`; React solo muestra el menú cuando el servidor confirma que hay base de datos y proveedor configurados. No se implementan contraseñas ni se guardan credenciales de Google o Meta en el navegador.

## Flujo de una cuenta

```text
React → Better Auth en Express → Google o Facebook
      ← callback validado ← proveedor
      → usuario, cuenta y sesión en MongoDB
      ← cookie de sesión ← navegador
```

La tienda conserva WhatsApp como contacto del pedido. Una cuenta social todavía no crea pedidos ni confirma inventario.

## Opciones de seguridad

- Better Auth valida el estado OAuth y procesa los callbacks en el servidor.
- La URL base es explícita; cada proveedor exige que la URI de retorno coincida exactamente con la configurada en su panel.
- La lista `trustedOrigins` usa los orígenes permitidos en `CORS_ORIGINS`.
- Las cookies son `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- Los tokens OAuth se cifran en MongoDB. El sitio solo necesita identificar a la persona; no llama APIs de Google o Meta en nombre del cliente.
- Google exige correo verificado para abrir sesión. Facebook puede no entregar un correo válido; cuando falta, se guarda un marcador con dominio reservado `.invalid` basado en el ID de la cuenta. Ese marcador no es un contacto y no se usa para enviar mensajes.
- El registro social no da permisos de administración. La autorización de inventario y pedidos requiere reglas separadas.

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
