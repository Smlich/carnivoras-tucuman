# Caso de estudio para portafolio

> Borrador basado en el estado local actual. No lo presentes como tienda desplegada ni como autenticación verificada. Completa las secciones de dominio, repositorio público y resultados cuando existan.

## Carnívoras Tucumán — tienda web full stack en evolución

### El problema

El vivero vende plantas carnívoras con consultas directas por WhatsApp. Las publicaciones viven en redes, mezclan fotos, textos y precios, y el cliente necesita entender qué incluye cada producto y confirmar disponibilidad antes de pagar. La prioridad fue crear pronto un catálogo navegable que use fotografías reales y haga explícito que precio, stock y entrega se confirman.

### La solución

Una tienda en español para explorar productos, buscar por especie, filtrar categorías, preparar un pedido local y enviarlo como consulta a WhatsApp. El API Express sirve el catálogo y reporta si usa MongoDB o el modo de demostración. El acceso con Google y Facebook está preparado en el servidor; requiere conectar Atlas y verificar las dos aplicaciones OAuth antes de ofrecerlo a clientes.

### Decisiones de ingeniería

- **Entrega incremental:** el frontend funciona primero con catálogo local; después se agregó Express y una API de lectura. Si MongoDB no está configurado en desarrollo, el mismo API usa el catálogo demo.
- **Fotos y confianza:** las tarjetas usan archivos reales recibidos del vivero. No se sustituyen por imágenes generadas. Los precios y el inventario se presentan como referencia y se confirman por WhatsApp.
- **Carrito sin promesa de compra:** el navegador recuerda la selección y genera una consulta; no cobra, reserva stock ni crea pedidos en servidor. El precio debe recalcularse en el backend antes de incorporar pagos.
- **Separación de secretos:** React no recibe credenciales OAuth ni la URI de Atlas. Express valida el entorno y Better Auth gestiona las sesiones cuando la base y los proveedores estén configurados.
- **Datos verificables:** Zod valida filtros de API, Mongoose define restricciones del producto y el seed hace upsert por slug sin borrar otros documentos.
- **SEO honesto:** hay título, descripción y secciones enlazables. No se afirma que Google ya indexó el sitio ni se agrega marcado de oferta mientras el stock, precios y páginas individuales no estén confirmados.
- **Accesibilidad práctica:** el catálogo tiene controles etiquetados; el diálogo del carrito gestiona foco, teclado y retorno al control de apertura.

### Stack actual

| Capa | Tecnología | Estado comprobable |
| --- | --- | --- |
| Interfaz | React, Vite, JSX y CSS | Funciona localmente; build de producción exitoso. |
| API | Node.js, Express 5, Zod y Helmet | API de salud y catálogo responde en desarrollo. |
| Datos | MongoDB Atlas, Mongoose | Esquema y seed listos; Atlas todavía no está conectado en este entorno. |
| Autenticación | Better Auth, Google y Facebook | Integración preparada; sin credenciales reales ni sesión OAuth verificada. |
| Pedido | localStorage y enlace WhatsApp | Genera una consulta; no registra una orden ni procesa pagos. |
| Calidad | documentación, ADR, plan de aprendizaje y revisión manual | Build y flujos principales revisados; auditoría integral y pruebas automatizadas siguen en el cronograma. |

### Demostración local

1. Ejecuta `npm install` y `npm run dev:all` desde la raíz.
2. Abre `http://localhost:5173`.
3. Muestra búsqueda, filtros, fotos de catálogo, cambio de cantidades y consulta por WhatsApp. No envíes el mensaje durante una entrevista.
4. Abre `/api/health` y explica que `database: not-configured` identifica el modo demo. Cuando Atlas esté conectado, verifica también `meta.source: mongodb` en `/api/products`.
5. Explica que el menú de autenticación aparece solo al configurar proveedores y base de datos.

### Guion oral de 60 segundos

> “Construí una tienda web para un vivero real de Tucumán. Empecé por un catálogo con fotos auténticas, búsqueda, filtros y un pedido que se consulta por WhatsApp porque el stock se confirma manualmente. Luego separé catálogo y presentación con una API Express y preparé Mongoose para persistir productos en Atlas. El servidor valida filtros, configura sus secretos desde el entorno y tiene Better Auth preparado para Google y Facebook. Hoy funciona localmente con catálogo de demostración; todavía estoy completando la conexión a Atlas y la validación OAuth. Elegí entregarlo por etapas para tener una experiencia útil desde el inicio y evitar anunciar pagos o disponibilidad que el negocio aún no confirma.”

Adapta este guion con tus propias palabras después de recorrer [la lección del pedido](LESSON_01_ORDER_FLOW.md), [la lección de la API](LESSON_02_API.md), [Atlas](LESSON_04_MONGODB_ATLAS.md) y [OAuth](LESSON_03_OAUTH_AND_SECRETS.md). No afirmes que implementaste personalmente una parte que todavía no puedas explicar.

### Próximas evidencias para completar el caso

- Conectar Atlas y mostrar que `GET /api/products` entrega datos persistidos.
- Probar inicios de sesión reales en Google y Facebook y documentar callbacks correctos.
- Confirmar precios, stock, entrega y derechos de uso de las fotos con el negocio.
- Definir privacidad, condiciones de venta, dominio y alojamiento.
- Publicar el repositorio con documentación reproducible y, después, la demo.
- Añadir la cobertura automatizada prevista y un ciclo completo de pedido cuando se definan reglas de venta.

## Enlaces internos

- [README y arranque](../README.md)
- [Arquitectura](ARCHITECTURE.md)
- [Decisiones técnicas](DECISIONS.md)
- [Cronograma](ROADMAP.md)
- [Contenido y SEO](CONTENT_PLAN.md)
