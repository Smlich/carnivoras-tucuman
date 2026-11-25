# Lección 09 — Netlify para prueba, Hostinger para producción

## Objetivo

Separar una vista previa rápida del despliegue final MERN. La vista estática ya fue publicada para revisión; el servidor full stack sigue siendo local.

## 1. Netlify: vista previa estática

El archivo `netlify.toml` establece:

- Build: `npm run build`.
- Salida pública: `dist`.
- Node de compilación: 24.
- `VITE_STATIC_PREVIEW=true`.

En esa variante, React usa el catálogo local de `src/data/products.js` y no consulta `/api` ni muestra acceso social. Un aviso visible aclara que precio, stock y entrega deben confirmarse por WhatsApp. No hacen falta la URI de Atlas ni secretos OAuth. La tienda conserva filtros, carrito de consulta y WhatsApp; la guía estática `/cuidados.html` también se publica.

### Publicar la vista previa

La versión de revisión está disponible en [Carnívoras Tucumán en Netlify](https://carnivorastucuman.netlify.app/). El código está versionado en [GitHub](https://github.com/Smlich/carnivoras-tucuman), pero el proyecto Netlify se creó con una carga manual desde `dist` y aún no está conectado al repositorio. La ruta `/cuidados.html` también está publicada. Esta URL es una vista de prueba: muestra el aviso de confirmación por WhatsApp y no activa API, Atlas ni autenticación social.

**Estado observado el 25 de noviembre de 2026:** la URL responde con HTTP 200, pero sigue mostrando los metadatos y estilos de la entrega anterior al rediseño. El código nuevo sí está en GitHub y pasó el build local y CI; el sitio solo podrá reflejarlo después de conectar Netlify o publicar la carpeta `dist`. Al abrir el panel, Netlify pidió iniciar sesión; completa el acceso desde la pestaña abierta y luego se puede continuar con el vínculo.

1. En Netlify, importa el repositorio GitHub existente y conserva el directorio raíz.
2. Autoriza la integración de Netlify con GitHub y selecciona `Smlich/carnivoras-tucuman`.
3. Revisa que el build use `npm run build`, la carpeta `dist` y Node 24; `netlify.toml` ya define esos valores.
4. Espera el resultado del build y abre la URL de despliegue.
5. Recorre portada, `/cuidados.html`, catálogo, filtros y enlaces. No confirmes ni envíes un pedido durante la revisión.

Netlify crea deploys de prueba por rama o pull request cuando el repositorio queda conectado. Trata la URL de prueba como pública: no la anuncies como catálogo vigente hasta verificar precios, stock, entrega y derechos de las fotos.

## 2. Hostinger: aplicación MERN final

En producción, el proceso Node arranca `server/src/index.js`. Express sirve la salida `dist` y mantiene `/api/health`, `/api/products` y Better Auth en el mismo origen. Por eso el sitio conserva el fallback `/api` local desactivado solo en Netlify; en Hostinger se deja vacía `VITE_STATIC_PREVIEW`.

### Parámetros iniciales en Hostinger

- Root directory: raíz del repositorio (`./`).
- Node.js: 24.
- Package manager: npm (`package-lock.json`).
- Build command: `npm run build`.
- Entry file del servidor: `server/src/index.js`.
- Output directory, si el preset lo solicita: `dist`.
- Framework: Express si Hostinger detecta el servidor; si el preset no refleja el proyecto combinado Vite + Express, elegir `Other` y completar los campos anteriores.

La publicación de Node.js administrado requiere actualmente un plan Business/Unlimited o Cloud. El soporte y los límites dependen del plan; verifica el panel antes de iniciar. Un VPS permite más control y exige administración manual del proceso. **La publicación en Hostinger está aplazada por decisión del negocio hasta contar con presupuesto**; no compres un plan para esta etapa.

### Variables runtime

Configúralas en el panel del hosting, no en el repositorio:

```dotenv
NODE_ENV=production
MONGODB_URI=<uri-privada-de-atlas>
MONGODB_DATABASE=carnivoras_tucuman
BETTER_AUTH_URL=https://<dominio-final>
BETTER_AUTH_SECRET=<secreto-aleatorio-de-al-menos-32-caracteres>
GOOGLE_CLIENT_ID=<client-id>
GOOGLE_CLIENT_SECRET=<client-secret>
FACEBOOK_CLIENT_ID=<app-id>
FACEBOOK_CLIENT_SECRET=<app-secret>
CORS_ORIGINS=https://<dominio-final>
```

`PORT` lo proporciona el entorno Node del hosting; el servidor también conserva 4000 como valor local. No copies credenciales desde `.env` a este documento ni las envíes por chat. La validación de producción requiere Atlas, Google y Facebook completos.

### Antes de ponerlo en uso

1. Define dominio y HTTPS; usa el mismo origen en `BETTER_AUTH_URL` y `CORS_ORIGINS`.
2. Permite en Atlas la conexión saliente del hosting y usa un usuario de base de datos con permisos mínimos.
3. Registra en Google y Meta exactamente `https://<dominio-final>/api/auth/callback/google` y `https://<dominio-final>/api/auth/callback/facebook`.
4. Confirma precio, disponibilidad, entrega, texto del catálogo y permiso de uso de cada fotografía.
5. Compila y revisa `/`, `/cuidados.html`, `/api/health` y `/api/products`; después completa un inicio de sesión de prueba de cada proveedor.
6. Comprueba el historial de despliegues y guarda el enlace de la versión estable.

## Lo que este plan no activa

La vista previa de Netlify no es una API MERN ni prueba OAuth; sirve para revisión visual y de contenido. La aplicación completa podrá desplegarse cuando haya presupuesto para el hosting y estén preparados dominio y ambas aplicaciones sociales. El código y CI están en GitHub; el deploy de prueba se actualiza manualmente hasta conectar Netlify con ese repositorio.

## Fuentes oficiales

- [Vite — desplegar sitios estáticos en Netlify](https://vite.dev/guide/static-deploy.html#netlify)
- [Netlify — Express con una app frontend](https://docs.netlify.com/build/frameworks/framework-setup-guides/express/)
- [Netlify — versiones de Node en el entorno de build](https://docs.netlify.com/build/configure-builds/available-software-at-build-time/)
- [Hostinger — publicar una app Node.js](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- [Hostinger — límites Node.js por plan](https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/)
- [Autenticación y callbacks](AUTHENTICATION.md)
