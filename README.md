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

Los productos y valores del catálogo se transcribieron de las publicaciones compartidas el 25 de noviembre de 2026. El stock se confirma por WhatsApp. Actualiza los datos antes de anunciar la web como catálogo vigente.

## Ejecutar localmente

Requisitos: Node.js 20.19+ o 22.12+ y npm.

1. Abre una terminal en esta carpeta.
2. Ejecuta `npm install`.
3. Ejecuta `npm run dev:all` para iniciar web y API en dos procesos.
4. Abre `http://127.0.0.1:5173`.

También puedes usar `npm run dev` para trabajar solo en el frontend.

## MongoDB local

La API funciona sin base de datos en modo de demostración durante desarrollo y muestra claramente ese estado en `GET /api/health`. No persiste cambios en ese modo.

1. Copia `.env.example` a `.env` y define `MONGODB_URI` con una instancia local o de MongoDB Atlas.
2. Ejecuta `npm run seed:products` para crear o actualizar los productos de ejemplo en MongoDB.
3. Ejecuta `npm run dev:all`; `GET /api/health` debe indicar que la base está conectada.

En producción, el servidor no inicia sin `MONGODB_URI`. No incluyas el archivo `.env` ni secretos en Git.

Para generar la versión de producción, ejecuta `npm run build`; la carpeta `dist` contiene el sitio estático.

## Estructura

- `src/components`: piezas reutilizables de interfaz.
- `src/data/products.js`: catálogo de esta primera entrega.
- `src/config/store.js`: nombre del negocio, moneda y contacto.
- `src/hooks/use-cart.js`: estado y persistencia del carrito.
- `src/utils`: formato de precios y construcción del pedido para WhatsApp.
- `src/services`: comunicación entre React y la API.
- `server/src`: API Express, configuración, esquema Mongo y lectura del catálogo.
- `docs`: arquitectura, decisiones, cronograma y registro de aprendizaje.
- `public/images/catalog`: archivos originales compartidos por el negocio.

## Próximos hitos

Lee `docs/ROADMAP.md` y `docs/API.md`. El inicio de sesión con Google y Facebook es un requisito antes de publicar cuentas de clientes: se integrará en una etapa backend cuando existan credenciales OAuth. Todavía no hay registro ni escritura de pedidos en la API.

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
- [Google Search Central: datos estructurados de productos](https://developers.google.com/search/docs/appearance/structured-data/product)
