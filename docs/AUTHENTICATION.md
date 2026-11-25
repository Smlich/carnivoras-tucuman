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

Better Auth recomienda una URL base explícita y callbacks registrados en Google y Meta ([Google](https://better-auth.com/docs/authentication/google), [Facebook](https://better-auth.com/docs/authentication/facebook)). Su handler Express 5 debe montarse antes del parser JSON ([integración Express](https://better-auth.com/docs/integrations/express)); el adaptador MongoDB puede compartir el cliente y habilitar transacciones ([adaptador MongoDB](https://better-auth.com/docs/adapters/mongo)).

## Preparar `.env`

Usa `.env.example` como plantilla y guarda estos valores solo en `.env`:

- `MONGODB_URI`: URI privada del clúster Atlas.
- `MONGODB_DATABASE=carnivoras_tucuman`.
- `BETTER_AUTH_URL=http://localhost:5173` para desarrollo local.
- `BETTER_AUTH_SECRET`: secreto aleatorio de al menos 32 caracteres.
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
- `FACEBOOK_CLIENT_ID` y `FACEBOOK_CLIENT_SECRET`.

Puedes generar el secreto desde PowerShell con Node.js:

```powershell
node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('base64url'))"
```

Pega el resultado directamente en el archivo local `.env`; no lo envíes por chat ni lo agregues a Git.

## URIs de retorno

Usa la misma dirección local que `BETTER_AUTH_URL`, incluida la ruta y sin agregar una barra final:

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
4. Abre la web desde `http://localhost:5173` y usa el menú de cuenta.
5. Repite el inicio de sesión con Google y Facebook, y confirma que al volver hay una sesión activa.

Si falta Atlas o la configuración OAuth, la API informa `enabled: false`; en desarrollo el resto de la tienda sigue funcionando. En producción, el servidor exige ambos proveedores para impedir un lanzamiento con el requisito social a medias.

## Preguntas de repaso

1. ¿Por qué los secretos OAuth están en Express y no en React?
2. ¿Qué protege la cookie `HttpOnly`?
3. ¿Por qué el marcador `.invalid` de Facebook no debe usarse como correo de contacto?
4. ¿Por qué el inicio de sesión no convierte automáticamente al cliente en administrador?
