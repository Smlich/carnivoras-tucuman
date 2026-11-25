# Carnívoras Tucumán

Tienda web de plantas carnívoras de Tucumán. Este repositorio es también una ruta de aprendizaje para construir, documentar y evolucionar una aplicación MERN con prácticas profesionales.

## Primera entrega

- Catálogo en español con fotografías reales enviadas por el negocio.
- Búsqueda y filtros básicos.
- Carrito local que recuerda el pedido en este dispositivo.
- Pedido enviado a WhatsApp para confirmar precio, disponibilidad y entrega.
- Diseño adaptable, navegación por teclado y metadatos básicos.
- API Express de solo lectura para catálogo y salud del servicio.
- Esquema Mongoose y script de carga inicial preparados para MongoDB.
- Flujo de cuentas preparado con Better Auth para Google y Facebook; se activa al configurar Atlas y las credenciales OAuth.

Los productos y valores del catálogo se transcribieron de las publicaciones compartidas el 25 de noviembre de 2026. El stock se confirma por WhatsApp. Actualiza los datos antes de anunciar la web como catálogo vigente.

## Ejecutar localmente

Requisitos: Node.js 20.19+ o 22.12+ y npm.

1. Abre una terminal en esta carpeta.
2. Ejecuta `npm install`.
3. Ejecuta `npm run dev:all` para iniciar web y API en dos procesos.
4. Abre `http://localhost:5173`.

También puedes usar `npm run dev` para trabajar solo en el frontend.

## MongoDB Atlas

La API funciona sin base de datos en modo de demostración durante desarrollo y muestra claramente ese estado en `GET /api/health`. No persiste cambios en ese modo.

1. Sigue [la guía de configuración de Atlas](docs/MONGODB_ATLAS_SETUP.md) para crear el clúster, un usuario de base de datos y limitar el acceso a tu IP.
2. Copia `.env.example` a `.env` y pega localmente la URI de conexión en `MONGODB_URI`.
3. Ejecuta `npm run seed:products` para crear o actualizar los productos de ejemplo en MongoDB.
4. Ejecuta `npm run dev:all`; `GET /api/health` debe indicar que la base está conectada.

En producción, el servidor no inicia sin `MONGODB_URI`. No incluyas el archivo `.env` ni secretos en Git ni los envíes por chat.

Para generar la versión de producción, ejecuta `npm run build`; la carpeta `dist` contiene el sitio estático.

## Estructura

- `src/components`: piezas reutilizables de interfaz.
- `src/data/products.js`: catálogo de esta primera entrega.
- `src/config/store.js`: nombre del negocio, moneda y contacto.
- `src/hooks/use-cart.js`: estado y persistencia del carrito.
- `src/utils`: formato de precios y construcción del pedido para WhatsApp.
- `src/services`: comunicación entre React y la API.
- `server/src`: API Express, configuración, esquema Mongo, lectura del catálogo y autenticación.
- `docs`: arquitectura, decisiones, cronograma y registro de aprendizaje.
- `public/images/catalog`: archivos originales compartidos por el negocio.

## Ruta de aprendizaje

Recorre [el flujo del pedido](docs/LESSON_01_ORDER_FLOW.md), [la API](docs/LESSON_02_API.md) y [OAuth y los secretos](docs/LESSON_03_OAUTH_AND_SECRETS.md). Usa `docs/LEARNING_LOG_TEMPLATE.md` para anotar tus explicaciones, decisiones y preguntas de repaso.

## Próximos hitos

Lee `docs/ROADMAP.md`, `docs/API.md`, [la guía de autenticación](docs/AUTHENTICATION.md) y el [plan de contenidos y SEO local](docs/CONTENT_PLAN.md). Los botones de cuenta aparecen cuando Atlas y al menos un proveedor están configurados. El flujo está preparado, pero todavía no se ha conectado a credenciales reales ni verificado con cuentas de Google o Facebook. No hay escritura de pedidos en la API.

## Datos que faltan antes del lanzamiento

- Confirmar precios y disponibilidad actual.
- Definir zonas, costos y condiciones de entrega.
- Compartir los enlaces oficiales de Instagram y Facebook.
- Definir dominio, política de privacidad y condiciones de venta.
- Configurar credenciales de Google y Meta para OAuth.

## Fuentes técnicas

- [React: Quick Start](https://react.dev/learn)
- [Vite: Getting Started](https://vite.dev/guide/)
- [Express: Installing](https://expressjs.com/en/starter/installing/)
- [MongoDB Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/)
- [Mongoose](https://mongoosejs.com/docs/)
- [Better Auth: Express](https://better-auth.com/docs/integrations/express)
- [Better Auth: MongoDB](https://better-auth.com/docs/adapters/mongo)
- [Google Search Central: datos estructurados de productos](https://developers.google.com/search/docs/appearance/structured-data/product)
