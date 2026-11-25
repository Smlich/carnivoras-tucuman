# Lección 09 — Netlify para prueba, Hostinger para producción

## Objetivo

Separar una vista previa rápida del despliegue final MERN. La vista estática ya fue publicada para revisión; el servidor full stack sigue siendo local.

## 1. Netlify: vista previa estática con una función pequeña

El archivo `netlify.toml` establece:

- Build: `npm run build`.
- Salida pública: `dist`.
- Node de compilación: 24.
- `VITE_STATIC_PREVIEW=true`.

En esa variante, React usa el catálogo local de `src/data/products.js` y no consulta `/api` ni muestra acceso social. Un aviso visible aclara que precio, stock y entrega deben confirmarse por WhatsApp. No hacen falta la URI de Atlas ni secretos OAuth. La tienda conserva filtros, carrito de consulta y WhatsApp; la guía estática `/cuidados.html` también se publica.

`netlify.toml` además declara `netlify/functions` como carpeta de Functions. `visit-counter.mjs` solo lee y actualiza un total agregado en Netlify Blobs; no sustituye la API Express ni requiere conexión a Atlas. El navegador llama `/.netlify/functions/visit-counter`. Vite sirve solo el frontend y no monta esa ruta. Para revisar la función localmente se necesita `netlify dev` con la CLI de Netlify.

### Publicar la vista previa

La vista de prueba está en [Carnívoras Tucumán en Netlify](https://carnivorastucuman.netlify.app/) y el código en [GitHub](https://github.com/Smlich/carnivoras-tucuman). Netlify ya está conectado a `Smlich/carnivoras-tucuman`, rama `main`; al subir cambios allí, Netlify ejecuta `npm run build`, publica `dist` e instala la función del contador. La ruta `/cuidados.html` también se publica. Esta URL de prueba usa catálogo local y no activa la API MERN, Atlas ni autenticación social.

### Revisar un deploy nuevo

1. Comprueba que el cambio esté en la rama `main`.
2. En Netlify, abre el proyecto `carnivorastucuman` y confirma que el último deploy indique **Published** y el commit esperado.
3. Abre la URL pública y recorre portada, `/cuidados.html`, catálogo, filtros, redes y pie de página.
4. Revisa el diseño en pantallas angostas y escritorio. No confirmes ni envíes un pedido durante la revisión.

La primera vinculación de Netlify a GitHub ya se completó. Si Netlify pierde acceso al repositorio, revisa la instalación de la aplicación Netlify dentro de la cuenta/organización de GitHub; no cargues credenciales en el repositorio. Para publicar manualmente una revisión solo si se rompe la integración, construye `dist` y usa la carga de deploys de Netlify.

La insignia flotante **Powered by Netlify** está desactivada en la configuración de este proyecto para que no tape texto del pie. Netlify la inyecta fuera del código de la página, así que no se corrige con CSS: revisa **Project configuration → General → Powered by Netlify badge** si vuelve a aparecer. [Documentación oficial](https://docs.netlify.com/manage/projects/powered-by-netlify-badge/).

Netlify crea deploys de prueba por rama o pull request cuando el repositorio queda conectado. Trata la URL de prueba como pública: no la anuncies como catálogo vigente hasta verificar precios, stock, entrega y derechos de las fotos.

### Límites para mantener el costo en cero

El plan Free basado en créditos tiene un límite estricto y no recarga automáticamente; al agotarse, los sitios del equipo pueden pausarse hasta el siguiente ciclo. Las cuentas creadas antes del 4 de septiembre de 2025 pueden conservar condiciones heredadas. Revisa **Usage & billing** de la cuenta antes de asumir qué límite aplica; no cambies de plan ni actives recargas automáticas. La función consume recursos de Functions/Blobs dentro de los límites del plan. Si el equipo se pausa o la función supera su cuota, la cifra deja de actualizarse y el frontend indica que no está disponible. [Límites de Netlify Functions](https://docs.netlify.com/build/functions/usage-and-billing/) · [Planes y créditos](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/) · [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/).

MongoDB Atlas M0 ofrece 512 MB de almacenamiento y recursos compartidos sin costo, pensado para aprendizaje y pruebas pequeñas. Tiene menos capacidad que un clúster dedicado; no cambies a M2 u otro nivel pago. Si el límite gratuito no alcanza, pausa el trabajo de datos y revisamos otra opción gratuita antes de cambiar nada.

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

La vista previa de Netlify no es la API MERN ni prueba OAuth; sirve para revisión visual y de contenido y mantiene la Function pequeña del contador. La aplicación completa podrá desplegarse cuando haya presupuesto para el hosting y estén preparados dominio y ambas aplicaciones sociales. El código y CI están en GitHub y Netlify publica la rama `main` automáticamente.

## Fuentes oficiales

- [Vite — desplegar sitios estáticos en Netlify](https://vite.dev/guide/static-deploy.html#netlify)
- [Netlify — Express con una app frontend](https://docs.netlify.com/build/frameworks/framework-setup-guides/express/)
- [Netlify — versiones de Node en el entorno de build](https://docs.netlify.com/build/configure-builds/available-software-at-build-time/)
- [Netlify — precios y límites del plan Free](https://www.netlify.com/pricing/)
- [MongoDB Atlas — precios y tamaños de clúster](https://www.mongodb.com/pricing)
- [Hostinger — publicar una app Node.js](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- [Hostinger — límites Node.js por plan](https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/)
- [Autenticación y callbacks](AUTHENTICATION.md)
