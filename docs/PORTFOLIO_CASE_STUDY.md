# Caso de estudio para portafolio

> Borrador basado en el estado actual. La vista estática de Netlify se actualiza desde `main`. Google OAuth ya se verificó en desarrollo local; la aplicación MERN de producción no está desplegada. Facebook queda diferido mientras Meta no complete la verificación por SMS.

## Carnívoras Tucumán — tienda web full stack en evolución

### El problema

El vivero vende plantas carnívoras con consultas directas por WhatsApp. Las publicaciones viven en redes, mezclan fotos, textos y precios, y el cliente necesita entender qué incluye cada producto y confirmar disponibilidad antes de pagar. La prioridad fue crear pronto un catálogo navegable que use fotografías reales y haga explícito que precio, stock y entrega se confirman.

### La solución

Una tienda en español para explorar productos, buscar por especie, filtrar categorías, preparar un pedido local y enviarlo como consulta a WhatsApp. El API Express sirve el catálogo desde Atlas en el entorno local y reporta si usa MongoDB o el modo de demostración. Better Auth autentica con Google en desarrollo local; Facebook y la publicación full stack siguen pendientes. Netlify muestra únicamente la vista estática.

### Decisiones de ingeniería

- **Entrega incremental:** el frontend funciona primero con catálogo local; después se agregó Express y una API de lectura. Si MongoDB no está configurado en desarrollo, el mismo API usa el catálogo demo.
- **Fotos y confianza:** las tarjetas usan archivos reales recibidos del vivero. No se sustituyen por imágenes generadas. Los precios y el inventario se presentan como referencia y se confirman por WhatsApp.
- **Rendimiento sin perder trazabilidad:** los originales se conservan; Sharp genera variantes adaptables de 480 y 960 píxeles y `CatalogImage` entrega una por imagen con `<picture>` y `srcset`. PNG se sirve como WebP, JPEG permanece JPEG y los logos se optimizan sin pérdida. La suma de la variante mayor de cada asset bajó de 11.1 MiB a 2.1 MiB (80.7% menos); es una comparación agregada de archivos, no una medición del tiempo de carga real.
- **Responsive con evidencia:** se revisaron portada y guía entre 240 y 1920 píxeles, incluyendo móvil angosto, pantallas horizontales, tablet y escritorio. No apareció desplazamiento horizontal ni encabezados fuera de sus cajas; las imágenes cargaron y, al abrir el carrito en anchos seleccionados, el enlace de WhatsApp siguió visible. La revisión encontró que las tarjetas se apretaban debajo de 316 px; el catálogo ahora usa una columna en ese rango. Es una muestra representativa, no una afirmación de prueba en cada dispositivo existente.
- **Carga de código bajo demanda:** React `lazy` y `Suspense` separan el panel de Better Auth. Solo se solicita cuando hay un proveedor social habilitado y la persona abre el menú de cuenta. En el build local MERN del 25 de noviembre de 2026, el chunk inicial es 471.45 kB (139.86 kB gzip) y el panel pesa 34.24 kB (12.66 kB gzip); las cifras describen archivos compilados, no una medición del rendimiento en el navegador.
- **Publicación por etapas:** la vista estática de revisión está disponible en [Netlify](https://carnivorastucuman.netlify.app/) sin secretos; Hostinger queda aplazado hasta contar con presupuesto. La aplicación MERN completa aún no está desplegada.
- **Identidad secundaria:** el pie usa sellos SVG propios de origen argentino, desarrollo argentino y SMlich Soluciones IT, con diseño accesible y adaptable. La marca del vivero sigue siendo la principal.
- **Carrito sin promesa de compra:** el navegador recuerda la selección y genera una consulta; no cobra, reserva stock ni crea pedidos en servidor. El precio debe recalcularse en el backend antes de incorporar pagos.
- **Separación de secretos:** React no recibe credenciales OAuth ni la URI de Atlas. Express valida el entorno y Better Auth gestiona las sesiones cuando la base y los proveedores estén configurados.
- **Datos verificables:** Zod valida filtros de API, Mongoose define restricciones del producto y el seed hace upsert por slug sin borrar otros documentos.
- **SEO honesto:** hay título, descripción y secciones enlazables. No se afirma que Google ya indexó el sitio ni se agrega marcado de oferta mientras el stock, precios y páginas individuales no estén confirmados.
- **Accesibilidad práctica:** el catálogo tiene controles etiquetados; el enlace de salto mueve el foco a `<main>` y el título visible en ambas páginas; el diálogo del carrito gestiona foco, teclado y retorno al control de apertura. Sigue pendiente una auditoría WCAG completa.

### Stack actual

| Capa | Tecnología | Estado comprobable |
| --- | --- | --- |
| Interfaz | React, Vite, JSX y CSS | Funciona localmente; build de producción exitoso. |
| API | Node.js, Express 5, Zod y Helmet | API de salud y catálogo responde en desarrollo. |
| Datos | MongoDB Atlas, Mongoose | Clúster Free conectado en AWS São Paulo; ocho productos sembrados; la API confirma `meta.source: mongodb`. |
| Autenticación | Better Auth, Google y Facebook | Google configurado en modo Testing y probado con una sesión real en `http://localhost:5173`; secretos en `.env`, ignorado por Git. Facebook pendiente. |
| Pedido | localStorage y enlace WhatsApp | Genera una consulta; no registra una orden ni procesa pagos. |
| Calidad | documentación, ADR, plan de aprendizaje, Node test runner y CI en GitHub Actions | Suite automatizada para configuración, perfil de Facebook, estado OAuth y contratos de lectura del catálogo demo; CI ejecuta pruebas y build. Google se verificó manualmente; faltan prueba real de Facebook, más integración de consultas MongoDB, pruebas de compra y auditoría integral. |

### Vista previa pública

URL: [https://carnivorastucuman.netlify.app/](https://carnivorastucuman.netlify.app/). Permite revisar la interfaz estática, el catálogo, el carrito de consulta, WhatsApp, la guía y el enlace de Instagram. Antes de compartirla como catálogo vigente, confirma precios, stock y entrega. La autenticación Google/Facebook y la API MERN no forman parte de esta vista previa.

### Demostración local

1. Ejecuta `npm install` y `npm run dev:all` desde la raíz.
2. Abre `http://localhost:5173`.
3. Muestra búsqueda, filtros, fotos de catálogo, cambio de cantidades y consulta por WhatsApp. No envíes el mensaje durante una entrevista.
4. Abre `/api/health` y muestra `database: connected`; `/api/products` debe indicar `meta.source: mongodb`. En una instalación limpia sin URI, explica que desarrollo vuelve al modo demo.
5. Explica que Google inició sesión en desarrollo local; la autenticación no está incluida en la vista previa estática de Netlify.

### Guion oral de 60 segundos

> “Construí una tienda web para un vivero real de Tucumán. Empecé por un catálogo con fotos auténticas, búsqueda, filtros y un pedido que se consulta por WhatsApp porque el stock se confirma manualmente. Separé la interfaz de una API Express y conecté Mongoose con Atlas; el endpoint de salud confirma la base y el catálogo devuelve ocho productos persistidos. El servidor valida filtros y mantiene los secretos fuera de React. Integré Better Auth con Google y comprobé el inicio de sesión local; Facebook y el despliegue full stack siguen pendientes. Elegí entregarlo por etapas para tener una experiencia útil desde el inicio y evitar anunciar pagos o disponibilidad que el negocio aún no confirma.”

Adapta este guion con tus propias palabras después de recorrer [la lección del pedido](LESSON_01_ORDER_FLOW.md), [la lección de la API](LESSON_02_API.md), [Atlas](LESSON_04_MONGODB_ATLAS.md) y [OAuth](LESSON_03_OAUTH_AND_SECRETS.md). No afirmes que implementaste personalmente una parte que todavía no puedas explicar.

### Próximas evidencias para completar el caso

- Probar inicios de sesión reales en Google y Facebook y documentar callbacks correctos.
- Confirmar precios, stock, entrega y derechos de uso de las fotos con el negocio.
- Definir privacidad, condiciones de venta, dominio y alojamiento.
- Comprobar que cada cambio en `main` genere un deploy exitoso en Netlify y documentar el historial reciente.
- Añadir la cobertura automatizada prevista y un ciclo completo de pedido cuando se definan reglas de venta.
- Extender las pruebas del catálogo demo a consultas MongoDB sin depender de un clúster externo.

## Enlaces internos

- [README y arranque](../README.md)
- [Preparación de Netlify y Hostinger](LESSON_09_DEPLOYMENT_PATHS.md)
- [Arquitectura](ARCHITECTURE.md)
- [Decisiones técnicas](DECISIONS.md)
- [Cronograma](ROADMAP.md)
- [Contenido y SEO](CONTENT_PLAN.md)
