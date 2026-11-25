# Carnívoras Tucumán

Tienda web de plantas carnívoras de Tucumán. Este repositorio es también una ruta de aprendizaje para construir, documentar y evolucionar una aplicación MERN con prácticas profesionales.

## Primera entrega

- Catálogo en español con fotografías reales enviadas por el negocio.
- Búsqueda y filtros básicos.
- Carrito local que recuerda el pedido en este dispositivo.
- Pedido enviado a WhatsApp para confirmar precio, disponibilidad y entrega.
- Diseño adaptable, navegación por teclado y metadatos básicos.

Los productos y valores del catálogo se transcribieron de las publicaciones compartidas el 25 de noviembre de 2026. El stock se confirma por WhatsApp. Actualiza los datos antes de anunciar la web como catálogo vigente.

## Ejecutar localmente

Requisitos: Node.js 20.19+ o 22.12+ y npm.

1. Abre una terminal en esta carpeta.
2. Ejecuta `npm install`.
3. Ejecuta `npm run dev`.
4. Abre la dirección local que muestra Vite.

Para generar la versión de producción, ejecuta `npm run build`; la carpeta `dist` contiene el sitio estático.

## Estructura

- `src/components`: piezas reutilizables de interfaz.
- `src/data/products.js`: catálogo de esta primera entrega.
- `src/config/store.js`: nombre del negocio, moneda y contacto.
- `src/hooks/use-cart.js`: estado y persistencia del carrito.
- `src/utils`: formato de precios y construcción del pedido para WhatsApp.
- `docs`: arquitectura, decisiones, cronograma y registro de aprendizaje.
- `public/images/catalog`: archivos originales compartidos por el negocio.

## Próximos hitos

Lee `docs/ROADMAP.md`. El inicio de sesión con Google y Facebook es un requisito antes de publicar cuentas de clientes: se integrará en una etapa backend cuando existan credenciales OAuth. La primera entrega no simula ni acepta registros todavía.

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
- [Google Search Central: datos estructurados de productos](https://developers.google.com/search/docs/appearance/structured-data/product)
