# Lección 7 — Crear credenciales de Google y Facebook

## Objetivo

Configurar el inicio de sesión social local sin publicar secretos ni confundir la URL del sitio con la URL del callback. El proyecto usa Better Auth 1.7.28, React en Vite y Express detrás del proxy `/api`.

Esta lección crea credenciales de desarrollo. No publica la aplicación ni habilita el acceso público en los paneles de los proveedores.

## Antes de empezar

- Atlas debe estar conectado y `/api/health` debe indicar `database: connected`.
- Abre la tienda con `http://localhost:5173`. La URL base y el host deben coincidir con los registrados en los proveedores.
- `.env` debe estar en la raíz del repo. Nunca escribas credenciales dentro de `src`, variables `VITE_*`, capturas públicas o GitHub.
- No compartas el contenido de `.env` por chat. Para pedir ayuda, comparte el nombre de la variable y el mensaje saneado, nunca su valor.

El callback local actual es:

```text
http://localhost:5173/api/auth/callback/google
http://localhost:5173/api/auth/callback/facebook
```

Better Auth construye estas direcciones desde `BETTER_AUTH_URL` y `basePath`. Si cambia el host, el puerto o la ruta, actualiza la URL en `.env` y en los dos paneles. El URI debe coincidir exactamente, incluso en esquema, host, ruta y barra final.

## 1. Crear el cliente web de Google

1. Abre [Google Cloud Console — Credentials](https://console.cloud.google.com/apis/credentials) y crea o selecciona un proyecto para la tienda.
2. Completa la configuración de consentimiento/branding con el nombre del negocio y un correo de contacto que controles. Para desarrollo, mantén la aplicación en modo de prueba y añade las cuentas que usarás para probar como usuarios de prueba.
3. En **Credentials**, crea un **OAuth client ID** de tipo **Web application**.
4. Añade este origen autorizado para el sitio local:

   ```text
   http://localhost:5173
   ```

5. Añade este URI autorizado de redirección:

   ```text
   http://localhost:5173/api/auth/callback/google
   ```

6. Guarda el cliente. Copia el client ID y el client secret solo en tu `.env` local.

La tienda solo necesita identidad básica: Better Auth usa el flujo de autorización en el servidor y no solicita acceso a Drive, Gmail ni otros datos de Google. La documentación de Google exige que el `redirect_uri` enviado por el servidor coincida con uno registrado. Consulta [OAuth para aplicaciones web de servidor](https://developers.google.com/identity/protocols/oauth2/web-server) y la [guía de Google de Better Auth](https://better-auth.com/docs/authentication/google).

## 2. Crear la aplicación de Facebook

1. Abre [Meta for Developers](https://developers.facebook.com/apps/) y crea una aplicación para el sitio.
2. En el panel, añade/configura **Facebook Login** para web. La interfaz y el nombre de algunos pasos pueden cambiar según el tipo de aplicación que Meta ofrezca.
3. En la configuración de OAuth del producto, registra como **Valid OAuth Redirect URI**:

   ```text
   http://localhost:5173/api/auth/callback/facebook
   ```

4. Usa las credenciales del producto/aplicación como `FACEBOOK_CLIENT_ID` y `FACEBOOK_CLIENT_SECRET`.
5. Durante desarrollo, deja la aplicación en **Development** y prueba con una cuenta que tenga rol de administrador, desarrollador o tester en esa aplicación. El modo de desarrollo restringe quién puede usar la app.
6. Para abrir el registro a clientes, revisa antes el estado de acceso, la revisión y requisitos de publicación que Meta muestre para la aplicación y sus permisos. La tienda solicita únicamente `email` y `public_profile`; no pide administrar páginas ni publicar contenido.

Meta puede no devolver un correo incluso cuando se solicita el permiso `email`. El backend crea entonces un identificador interno con dominio reservado `.invalid`; no es un correo de contacto y no se debe usar para enviar mensajes. Consulta [Facebook Login de Better Auth](https://better-auth.com/docs/authentication/facebook) y [el ciclo de desarrollo de apps de Meta](https://developers.facebook.com/docs/apps/managing-development-cycle).

## 3. Guardar los valores en `.env`

Edita localmente estas variables. Sustituye cada marcador por el valor correspondiente; no las copies a una terminal compartida ni a un issue.

```dotenv
BETTER_AUTH_URL=http://localhost:5173
BETTER_AUTH_SECRET=<secreto-aleatorio-de-al-menos-32-caracteres>
GOOGLE_CLIENT_ID=<client-id-de-google>
GOOGLE_CLIENT_SECRET=<client-secret-de-google>
FACEBOOK_CLIENT_ID=<app-id-de-meta>
FACEBOOK_CLIENT_SECRET=<app-secret-de-meta>
```

Si Vite inicia en otro puerto, usa ese puerto en `BETTER_AUTH_URL`, `CORS_ORIGINS` y ambos URI callback. No agregues barras finales por intuición: compara la URL del panel con la dirección que muestra el navegador en el error.

Comprueba que Git ignore `.env` sin imprimir su contenido:

```powershell
git check-ignore .env
```

Si el comando no devuelve `.env`, detente antes de hacer un commit y revisa `.gitignore`.

## 4. Reiniciar y comprobar el servidor

1. Detén el proceso de desarrollo con `Ctrl+C` para que el servidor vuelva a leer `.env`.
2. Ejecuta `npm run dev:all`.
3. Abre `http://localhost:4000/api/auth/status`.
4. Cuando estén configurados los valores, espera una respuesta como esta:

   ```json
   { "enabled": true, "providers": ["google", "facebook"] }
   ```

   El orden puede variar. La ruta solo informa si los proveedores están habilitados; nunca devuelve IDs ni secretos.

5. Abre `http://localhost:5173`, despliega **Mi cuenta** y prueba cada proveedor. Completa una sesión nueva, vuelve a abrir el menú y comprueba que aparece el nombre de la cuenta. Cierra sesión y repite el inicio para confirmar que se recupera la misma cuenta.
6. Si pruebas con Google en modo de prueba o con Meta en modo Development, usa una cuenta permitida por el panel del proveedor.

En desarrollo basta con configurar un proveedor para habilitarlo. El servidor de producción exige Google y Facebook configurados porque ambas opciones son un requisito del proyecto.

## Errores comunes

- **`redirect_uri_mismatch`:** compara la URI de callback exacta en Better Auth con el campo del proveedor. Revisa `localhost` frente a `127.0.0.1`, el puerto, el esquema y las barras.
- **`AUTH_NOT_CONFIGURED` o `enabled: false`:** revisa que cada proveedor tenga ambos valores (ID y secreto), que Atlas esté conectado y que hayas reiniciado Express.
- **Error de origen confiable o CORS:** usa el mismo host para abrir la tienda y configura ese origen en `CORS_ORIGINS`. No añadas `*` para ocultar el error.
- **La cuenta no puede entrar durante desarrollo:** comprueba que esté añadida como usuario de prueba en Google o que tenga un rol permitido en Meta.
- **Facebook no entrega email:** el inicio puede funcionar con un marcador `.invalid`. Pide el medio de contacto por un flujo aparte y con consentimiento; no interpretes ese marcador como dirección real.
- **El secreto apareció en Git:** rota/revoca el secreto en el panel del proveedor, actualiza `.env` y sigue el proceso de limpieza de Git si ya se publicó. Borrar el archivo en un commit posterior no revoca un secreto expuesto.

## Qué demuestra esta práctica

- Los secretos permanecen en Express y Better Auth; React solo inicia el flujo y recibe el estado de sesión.
- Google y Facebook devuelven el navegador a Express mediante el callback registrado.
- Better Auth valida el flujo y guarda usuario, cuenta y sesión en Atlas.
- El registro social no concede permisos para administrar productos ni pedidos.

Para recorrer la configuración del servidor y el cliente antes de crear aplicaciones externas, consulta [OAuth, sesiones y secretos](LESSON_03_OAUTH_AND_SECRETS.md) y [la referencia de autenticación](AUTHENTICATION.md).

## Preguntas de repaso

1. ¿Qué diferencia hay entre el origen autorizado de Google y el URI callback?
2. ¿Por qué un ID público puede estar en el servidor pero el client secret no debe aparecer en `VITE_*`?
3. ¿Qué limitación impone el modo de desarrollo de Meta?
4. ¿Por qué el valor `@facebook.carnivorastucuman.invalid` no sirve para contactar al cliente?
5. ¿Qué pasos corresponden al proveedor y cuáles a Express/Better Auth?

## Fuentes oficiales consultadas

- [Google — OAuth 2.0 para aplicaciones web de servidor](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Better Auth — Google](https://better-auth.com/docs/authentication/google)
- [Better Auth — Facebook](https://better-auth.com/docs/authentication/facebook)
- [Meta — Managing Development Cycles](https://developers.facebook.com/docs/apps/managing-development-cycle)
