# Lección 3 — OAuth, sesiones y secretos

## Objetivo

Poder explicar el camino desde el botón “Continuar con Google” o “Continuar con Facebook” hasta la cookie de sesión, y repetir el patrón sin exponer credenciales en React.

## Mapa del flujo

```text
AccountMenu.jsx
  ├─ consulta GET /api/auth/status
  └─ authClient.signIn.social(provider)
       ↓
Vite reenvía /api/auth/* → Express
  ├─ createAuth() configura Better Auth y el adaptador MongoDB
  └─ Better Auth valida el callback del proveedor
       ↓
Google o Facebook → Better Auth → colecciones de Atlas → cookie de sesión
```

## Recorrido del código

1. `.env.example` enumera los nombres de configuración pública y privada. El archivo local `.env` guarda los valores reales y está excluido de Git.
2. `server/src/config/env.js` valida URL, longitud del secreto y pares ID/secreto. Una configuración incompleta se rechaza al iniciar.
3. `server/src/auth/create-auth.js` habilita solo proveedores con sus dos credenciales. Usa el cliente de MongoDB que ya abrió Mongoose y cifra los tokens OAuth antes de guardarlos.
4. `server/src/index.js` intenta conectar Atlas antes de crear la instancia de autenticación. Sin base o sin proveedores, la tienda continúa en modo de demostración y el inicio social queda apagado.
5. `server/src/app.js` expone `GET /api/auth/status` sin revelar credenciales y monta el handler de Better Auth antes del parser JSON.
6. `src/services/auth-client.js` crea el cliente oficial de React. `src/components/AccountMenu.jsx` consulta el estado y muestra solo los proveedores habilitados. El componente visual y el cliente de Better Auth viven en `AccountMenuPanel.jsx`, que se carga al abrir el menú.
7. `lazy` y `Suspense` de React mantienen el panel en un chunk separado y muestran un estado mientras llega. Un `ErrorBoundary` limita el fallo si el archivo dinámico no se puede cargar. Los visitantes que no abren una cuenta no descargan ese código.
8. En un inicio de sesión, el navegador sale al proveedor y vuelve a la URI callback exacta. Better Auth valida el flujo, persiste la identidad y crea una sesión con cookie `HttpOnly`.

## Fronteras de confianza

- El navegador puede iniciar un flujo social, pero nunca recibe `CLIENT_SECRET`, `BETTER_AUTH_SECRET` ni `MONGODB_URI`.
- Los IDs y secretos de OAuth se configuran únicamente en el servidor. Los nombres `VITE_*` serían visibles al compilar React y no deben usarse para secretos.
- Una sesión identifica a la persona; no autoriza por sí sola a administrar productos ni a editar pedidos.
- La cookie `HttpOnly` no puede leerse desde JavaScript de la página. `SameSite=Lax` y `Secure` en producción ayudan a limitar su exposición.
- Si Facebook no devuelve email, se genera un marcador `.invalid` a partir del ID. No es una dirección de contacto y nunca debe usarse para enviar mensajes.

## Práctica guiada

1. Sigue el flujo de `GET /api/auth/status` en `server/src/app.js` y encuentra quién consume su respuesta en React.
2. Lee las comprobaciones de `server/src/config/env.js`. ¿Qué error produce un ID de Google sin su secreto?
3. Dibuja en papel qué URLs toca una sesión social y marca qué pasos ocurren en el navegador, Express, el proveedor y MongoDB.
4. Revisa `.gitignore` y confirma que `.env` no forma parte de los archivos versionados. No abras ni compartas valores privados.
5. Explica por qué el cliente no escribe directamente en las colecciones de cuentas y sesiones.
6. ¿Qué parte del panel se solicita al abrir el menú y qué muestra `Suspense` mientras carga?

## Preparación externa

Esta práctica de lectura no necesita cuentas OAuth. Para completar el acceso real se requieren Atlas y aplicaciones creadas en Google Cloud y Meta for Developers. Las URLs callback están en [AUTHENTICATION.md](AUTHENTICATION.md). Se registran exactamente, con el mismo dominio, puerto y ruta que `BETTER_AUTH_URL`.

## Preguntas de repaso

1. ¿Qué diferencia hay entre `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`?
2. ¿Por qué el botón se oculta si la API no confirma que el proveedor está configurado?
3. ¿Qué valida Better Auth al recibir el callback?
4. ¿Por qué una sesión válida no debe otorgar permisos administrativos?
5. ¿Qué tendrías que cambiar al desplegar en otro dominio?

## Patrón reutilizable

Para otro proyecto, conserva la separación entre: validación del entorno, configuración de proveedores en servidor, persistencia de sesiones, endpoint de estado sin secretos y cliente visual de autenticación. Cambia nombre, base de datos, URLs, proveedores habilitados y política de autorización; vuelve a revisar cookies, callbacks y orígenes confiables antes de desplegar.
