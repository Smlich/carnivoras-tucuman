# Lección 11 — Probar configuración y disponibilidad de OAuth

## Objetivo

Comprobar reglas del servidor y respuestas HTTP sin conectarse a una cuenta real de Google o Facebook. Estas pruebas ayudan a detectar errores de configuración antes de iniciar el flujo del proveedor.

## 1. Validar variables como una función

`server/src/config/env.js` exporta `parseEnvironment(source)`. La función valida un objeto de entrada y devuelve valores normalizados. El servidor la usa con `process.env`; las pruebas de `server/test/` le pasan objetos sintéticos.

`server/test/env.test.js` comprueba:

- valores seguros por defecto para desarrollo;
- que cada proveedor tenga tanto ID como secreto;
- que OAuth requiera URL y secreto de sesión;
- que producción exija MongoDB y los dos proveedores;
- que `CORS_ORIGINS` se convierta en una lista limpia.

La prueba `server/test/facebook-profile.test.js` también verifica que el mapeo de Facebook conserve el email cuando existe y use un identificador `.invalid` cuando falta.

Así las reglas se pueden revisar sin leer ni imprimir el `.env` local. No pongas credenciales verdaderas en los datos de una prueba.

## 2. Probar una ruta HTTP sin Atlas

`server/test/app.test.js` levanta Express en un puerto local efímero y lo cierra al terminar.

- `GET /api/auth/status` devuelve solo si OAuth está activo y los nombres de proveedores disponibles; incluye `Cache-Control: no-store`.
- Si la autenticación no está configurada, `POST /api/auth/sign-in/social` responde `503 AUTH_NOT_CONFIGURED`.

El test no crea una sesión, no conecta a MongoDB y no llama a Google o Meta. Se verifica el contrato de la API de preparación, no un inicio de sesión real.

## 3. Ejecutar el mismo comando que CI

En la raíz del repositorio:

```sh
npm test
```

El script ejecuta `node --test`; Node descubre los archivos `*.test.js`. GitHub Actions ejecuta estas pruebas después de `npm ci` y antes del build en las versiones 22, 24 y 26 definidas por el workflow. Consulta [el ejecutor de pruebas de Node.js](https://nodejs.org/api/test.html).

## Práctica para repetir

1. Agrega un caso que rechace una URL mal formada de `BETTER_AUTH_URL`.
2. Ejecuta `npm test` y confirma que el error identifica el campo sin mostrar valores de otras variables.
3. Revisa el mapeo de perfil de Facebook cuando el proveedor no devuelve email. Usa siempre un ID sintético; el servidor genera un identificador `.invalid` que no sirve como email de contacto.
4. Abre una rama, sube el cambio y revisa que el job de CI corra tanto las pruebas como el build.

## Qué queda sin demostrar

Google OAuth ya está configurado en desarrollo y se completó un inicio real de sesión con el callback local. Esa verificación manual no forma parte de la suite automatizada. Falta configurar y probar Facebook, comprobar de nuevo la persistencia y el cierre de sesión, y validar errores de callback. Las pruebas actuales no demuestran permisos comerciales, checkout, pagos ni administración de inventario.

## Preguntas de repaso

1. ¿Por qué `parseEnvironment` recibe un objeto en vez de leer `process.env` en cada aserción?
2. ¿Qué contrato protege `GET /api/auth/status`?
3. ¿Qué resultado demuestra una prueba automatizada y qué debe confirmarse con una cuenta del proveedor?

## Referencias

- [Node.js — Test runner](https://nodejs.org/api/test.html)
- [Better Auth — Facebook](https://better-auth.com/docs/authentication/facebook)
- [Better Auth — OAuth y proveedores sin email](https://better-auth.com/docs/concepts/oauth)
