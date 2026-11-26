# Carnívoras Tucumán

Tienda web de plantas carnívoras de Tucumán. Este repositorio es también una ruta de aprendizaje para construir, documentar y evolucionar una aplicación MERN con prácticas profesionales.

Código fuente: [GitHub · Smlich/carnivoras-tucuman](https://github.com/Smlich/carnivoras-tucuman).

## Primera entrega

- Catálogo en español con fotografías reales enviadas por el negocio.
- Búsqueda y filtros básicos.
- Carrito local que recuerda el pedido en este dispositivo.
- Pedido enviado a WhatsApp para confirmar precio, disponibilidad y entrega.
- Contador compartido de visitas por sesión de pestaña, persistido en Netlify Blobs; no guarda identificadores personales.
- Diseño adaptable, navegación por teclado y metadatos básicos.
- Sistema visual juvenil y legible: titulares tipo cómic, acentos lettering y paleta botánica viva documentados en [el sistema visual](docs/DESIGN_SYSTEM.md).
- Tres sellos originales en el pie: Hecho en Argentina, Codeado en Argentina y SMlich Soluciones IT; el logo del área de programación es una identidad secundaria.
- Guía educativa en `/cuidados.html`, con contenido HTML indexable y fuentes botánicas enlazadas.
- En producción, Express sirve el frontend compilado y la API bajo el mismo origen; `npm start` inicia el servidor.
- API Express de solo lectura para catálogo y salud del servicio.
- Esquema Mongoose y script de carga inicial preparados para MongoDB.
- Inicio de sesión con Better Auth: Google está configurado y probado localmente; Facebook sigue pendiente. Netlify sirve el frontend estático y la función acotada del contador; la API MERN y OAuth siguen locales.

Los productos y valores del catálogo se transcribieron de las publicaciones compartidas el 25 de noviembre de 2026. El stock se confirma por WhatsApp. Actualiza los datos antes de anunciar la web como catálogo vigente.

## Ejecutar localmente

Requisitos: Node.js 22.12+ en la serie 22, o las series 24.x y 26.x, con npm. Descarga una versión LTS desde [nodejs.org](https://nodejs.org/en/download). En Windows, deja activa la opción para agregar Node al `PATH`; después abre una terminal nueva y confirma con `node --version` y `npm --version`.

1. Abre una terminal en esta carpeta.
2. Ejecuta `npm ci` para instalar las versiones bloqueadas en `package-lock.json`.
3. Ejecuta `npm run dev:all` para iniciar web y API en dos procesos.
4. Abre `http://localhost:5173`.

También puedes usar `npm run dev` para trabajar solo en el frontend.

## MongoDB Atlas

En este entorno local, Express está conectado a un clúster Free de Atlas en São Paulo y el catálogo de ocho productos ya fue cargado. `GET /api/health` informa `database: connected` y `catalogMode: mongodb`; `GET /api/products` informa `meta.source: mongodb`. La URI vive únicamente en el `.env` local, ignorado por Git.

En una instalación nueva o en otro equipo, sigue [la guía de Atlas](docs/MONGODB_ATLAS_SETUP.md), copia `.env.example` a `.env`, configura una URI privada y ejecuta `npm run seed:products`. Si `MONGODB_URI` falta durante desarrollo, la API usa el catálogo demo y lo indica en `/api/health`; no persiste datos en ese modo.

En producción, el servidor no inicia sin `MONGODB_URI`. No incluyas el archivo `.env` ni secretos en Git ni los envíes por chat.

Para generar la versión de producción, ejecuta `npm run build`; la carpeta `dist` contiene el sitio estático.

El workflow de GitHub Actions en `.github/workflows/ci.yml` ejecuta `npm ci`, `npm test` y `npm run build` al abrir o actualizar un pull request, y al subir cambios a `main`. Las pruebas cubren configuración, disponibilidad de OAuth y lectura del catálogo demo; no hacen un inicio de sesión real ni consultan MongoDB.

Ejecuta `npm test` para correr la suite de la API con datos demo. Para comprobar manualmente las rutas contra el Atlas configurado en tu `.env`, ejecuta `npm run test:integration:mongo`; esa prueba consulta salud, catálogo y detalle, pero no modifica datos y no corre en GitHub Actions. Las [pruebas de configuración y OAuth](docs/LESSON_11_API_CONFIGURATION_TESTS.md) y las [pruebas del catálogo](docs/LESSON_12_CATALOG_API_TESTS.md) explican los alcances.

## Estructura

- `src/components`: piezas reutilizables de interfaz.
- `src/data/products.js`: catálogo de esta primera entrega.
- `src/config/store.js`: nombre del negocio, moneda y contacto.
- `src/hooks/use-cart.js`: estado y persistencia del carrito.
- `src/utils`: formato de precios y construcción del pedido para WhatsApp.
- `src/services`: comunicación entre React y la API.
- `server/src`: API Express, configuración, esquema Mongo, lectura del catálogo y autenticación.
- `netlify/functions`: endpoint de contador compartido con persistencia en Netlify Blobs.
- `public/visit-counter.js`: conecta el pie a la función y limita el incremento a una sesión por pestaña.
- `docs`: arquitectura, decisiones, sistema visual, cronograma, [álbum fotográfico](docs/GALLERY.md), [lección para entender su implementación](docs/LESSON_14_PHOTO_GALLERY.md) y registro de aprendizaje.
- `public/images/catalog`: archivos originales compartidos por el negocio.
- `public/images/catalog/optimized`: variantes optimizadas para la web; conserva intactos los originales.
- `public/images/gallery`: las 24 fotografías originales del vivero y las miniaturas generadas para el álbum.
- `cuidados.html` y `src/care-page.css`: página informativa independiente, generada junto con la portada por Vite.

Para regenerar variantes después de agregar o actualizar fotos autorizadas, ejecuta `npm run images:optimize`. El script prepara versiones adaptables para móvil y escritorio; usa WebP para los PNG y JPEG para las fotos que ya venían en JPEG. Cada `<picture>` mantiene también la foto original como respaldo, sin alterar los archivos fuente. Aprende el flujo en [la lección de optimización](docs/LESSON_05_IMAGE_OPTIMIZATION.md).

## Ruta de aprendizaje

Recorre [el flujo del pedido](docs/LESSON_01_ORDER_FLOW.md), [la API](docs/LESSON_02_API.md), [MongoDB Atlas](docs/LESSON_04_MONGODB_ATLAS.md), [OAuth y los secretos](docs/LESSON_03_OAUTH_AND_SECRETS.md), [configuración de Google y Facebook](docs/LESSON_07_OAUTH_PROVIDER_SETUP.md), [optimización de imágenes](docs/LESSON_05_IMAGE_OPTIMIZATION.md), [álbum y visor de fotos](docs/LESSON_14_PHOTO_GALLERY.md), [integración continua](docs/LESSON_06_GITHUB_ACTIONS.md), [pruebas de configuración y OAuth](docs/LESSON_11_API_CONFIGURATION_TESTS.md), [pruebas del catálogo](docs/LESSON_12_CATALOG_API_TESTS.md), [la guía de cuidados indexable](docs/LESSON_08_INDEXABLE_CARE_GUIDE.md), [navegación accesible por teclado](docs/LESSON_13_ACCESSIBLE_KEYBOARD_NAVIGATION.md), [el recorrido de Netlify a Hostinger](docs/LESSON_09_DEPLOYMENT_PATHS.md) y [el sistema visual](docs/LESSON_10_VISUAL_SYSTEM.md). Usa `docs/LEARNING_LOG_TEMPLATE.md` para anotar tus explicaciones, decisiones y preguntas de repaso.

## Portafolio

Usa [el caso de estudio](docs/PORTFOLIO_CASE_STUDY.md) para presentar la arquitectura, demostrar el estado actual y explicar con honestidad qué falta antes del despliegue.

## Publicación por etapas

La vista de prueba se publica desde `main` mediante la integración de GitHub con [Netlify](https://carnivorastucuman.netlify.app/), con catálogo local, fotos reales, la guía `/cuidados.html` y una función persistente para el contador. No representa la API MERN ni verifica OAuth. Hostinger queda aplazado hasta contar con presupuesto. La guía [Netlify de prueba y Hostinger final](docs/LESSON_09_DEPLOYMENT_PATHS.md) explica el despliegue de cada etapa.

### Presupuesto de esta etapa

Por ahora, usa únicamente funciones y planes sin costo. No habilites facturación, agregues una tarjeta, contrates un dominio, inicies una prueba que pueda convertirse en pago ni actives complementos pagos para terminar el prototipo. Si un proveedor presenta un requisito de pago o se supera un límite gratuito, detente y revisamos una alternativa. La publicación full stack en Hostinger queda para una etapa futura con presupuesto.

## Próximos hitos

Lee `docs/ROADMAP.md`, `docs/API.md`, [la guía de autenticación](docs/AUTHENTICATION.md), [la lección del contador en Netlify](docs/LESSON_15_NETLIFY_COUNTER.md) y el [plan de contenidos y SEO local](docs/CONTENT_PLAN.md). Google OAuth ya pasó un inicio de sesión real en desarrollo usando `http://localhost:5173`; Facebook todavía no está configurado. Netlify no incluye la API MERN ni la sesión OAuth. No hay escritura de pedidos en la API.

## Datos que faltan antes del lanzamiento

- Confirmar precios y disponibilidad actual.
- Definir zonas, costos y condiciones de entrega.
- Cuenta oficial de Instagram confirmada: `@carnivoras_tucuman`; compartir Facebook si se decide usarlo.
- Definir dominio, política de privacidad y condiciones de venta.
- Configurar Facebook OAuth y revisar publicación, callbacks HTTPS y verificación de proveedores antes de un despliegue full stack.

## Fuentes técnicas

- [React: Quick Start](https://react.dev/learn)
- [React: lazy](https://react.dev/reference/react/lazy)
- [React: Suspense](https://react.dev/reference/react/Suspense)
- [Vite: despliegue estático](https://vite.dev/guide/static-deploy.html)
- [Vite: Getting Started](https://vite.dev/guide/)
- [Express: Installing](https://expressjs.com/en/starter/installing/)
- [MongoDB Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/)
- [Mongoose](https://mongoosejs.com/docs/)
- [Better Auth: Express](https://better-auth.com/docs/integrations/express)
- [Better Auth: MongoDB](https://better-auth.com/docs/adapters/mongo)
- [Google Search Central: datos estructurados de productos](https://developers.google.com/search/docs/appearance/structured-data/product)
