# Cronograma de aprendizaje y entregas

Plan inicial de seis semanas, con sesiones de 60 a 90 minutos y una carga orientativa de 6 a 8 horas por semana. Se ajusta al tiempo real disponible; cada etapa termina con una entrega visible y una revisión del código.

## Hito 0 — Tienda funcional inicial

**Estado:** completado. **Duración prevista:** 1 a 2 jornadas.

- Construir la portada, el catálogo, los filtros y el carrito.
- Enviar un pedido armado a WhatsApp.
- Usar el logo y las fotos reales compartidas por el negocio.
- Documentar cómo ejecutar el proyecto y qué datos faltan.

**Aprendizaje:** estructura HTML semántica, componentes React, estado, eventos, CSS adaptable y Git.

## Hito 0.1 — Guía indexable de cuidados

**Estado:** completado. **Duración orientativa:** una sesión.

- Crear `/cuidados.html` como una segunda página estática con título y descripción propios.
- Explicar cuidados iniciales y enlazar fuentes botánicas; distinguir consejos generales de datos específicos de una especie.
- Enlazar la guía desde la portada y el calendario de redes.

**Aprendizaje:** entradas HTML múltiples en Vite, etiquetas semánticas, metadatos sociales y cuándo una página informativa no necesita React.

## Hito 0.2 — Preparar Netlify y Hostinger

**Estado:** la vista estática pública de Netlify quedó vinculada al repositorio GitHub y despliega los cambios de `main`. Conserva catálogo local y no activa API, Atlas ni OAuth. Hostinger queda aplazado hasta contar con presupuesto.

- Netlify compila y publica `dist` para una revisión temprana sin backend ni credenciales.
- Hostinger ejecutará Express como proceso Node, servirá `dist` y conectará MongoDB Atlas y OAuth desde variables protegidas.
- Elegir Node 24, disponible en ambos destinos y fijado en `.nvmrc`.
- Confirmar precios, stock, entrega, dominio y cuentas de OAuth antes de la publicación final.

**Aprendizaje:** diferenciar una vista previa estática de una aplicación MERN en producción y preparar variables por entorno.

## Hito 0.3 — Sistema visual juvenil y legible

**Estado:** sistema visual implementado en la tienda y la guía, con sellos SVG propios en el pie. La compilación de producción y la revisión responsive de anchos representativos están verificadas; cada nuevo cambio requiere revisar la versión publicada.

- Definir tokens de color y tipografía reutilizables.
- Usar fuentes de personalidad en títulos y acentos cortos y una fuente legible en el catálogo y la guía.
- Mantener las fotografías reales del vivero.
- Unificar la guía de cuidados con la paleta y los encabezados de la tienda.

**Aprendizaje:** seguir [la lección del sistema visual](LESSON_10_VISUAL_SYSTEM.md) y practicar el uso de variables CSS antes de añadir componentes nuevos.

## Semana 1 — Fundamentos y revisión del frontend

- Recorrer cada componente y explicar el flujo de un pedido.
- Repasar JavaScript moderno, props, estado y efectos de React.
- Mover el catálogo a datos editables y corregir textos, imágenes y precios.
- Aprender a crear ramas, commits pequeños y una descripción de cambio.

**Entrega:** catálogo revisado por el negocio y primer registro de aprendizaje.

## Semana 2 — API con Node.js y Express

- Crear una carpeta `server` independiente.
- Levantar Express con configuración validada por variables de entorno.
- Crear GET /api/health, GET /api/products y GET /api/products/:slug.
- Validar filtros y paginación, normalizar errores y documentar la API.
- Conectar React al endpoint y conservar un fallback local durante desarrollo.

**Estado:** API y lectura de catálogo implementadas. **Pendiente de aprendizaje:** recorrer el flujo y consultar la respuesta en el navegador. **Entrega:** API local en modo de demostración.

## Semana 3 — MongoDB y persistencia

- Crear y verificar modelos de productos, clientes y pedidos.
- Conectar con MongoDB Atlas usando una URI privada.
- Añadir operaciones de lectura y administración de productos.
- Registrar pedidos con estado y fecha, sin guardar datos de pago sensibles.

**Estado parcial:** el proyecto Atlas y el clúster Free están conectados desde desarrollo; el seed cargó ocho productos y Express confirma `database: connected` y `meta.source: mongodb`. Recorre la [lección práctica de Atlas](LESSON_04_MONGODB_ATLAS.md). **Pendiente:** diseñar modelos de clientes y pedidos después de definir privacidad, y persistir pedidos solo cuando se acuerden las reglas de venta.

## Semana 4 — Cuentas con Google y Facebook

- Crear aplicaciones OAuth en Google Cloud y Meta for Developers.
- Configurar URLs de retorno local y de producción.
- Implementar inicio de sesión en el servidor, sesión segura y logout.
- Asociar el proveedor y su identificador a una cuenta interna; no guardar contraseñas del proveedor.
- Añadir pruebas de autorización y protección de rutas como trabajo de esta etapa.

**Entrega:** el cliente puede crear o recuperar su cuenta usando Google o Facebook.

**Estado parcial:** Better Auth está integrado con Atlas y el menú React aparecerá al configurar al menos un proveedor. **Pendiente:** crear las aplicaciones OAuth, guardar IDs y secretos localmente y completar un inicio de sesión real de Google y otro de Facebook.

**Lección:** recorre [OAuth, sesiones y secretos](LESSON_03_OAUTH_AND_SECRETS.md) antes de configurar proveedores reales. La lectura enseña el flujo sin necesitar compartir credenciales.

**Práctica guiada:** sigue [la configuración de Google y Facebook](LESSON_07_OAUTH_PROVIDER_SETUP.md) para crear credenciales locales, registrar los callbacks exactos y probar las cuentas de desarrollo sin exponer secretos.

**Bloqueo externo:** requiere IDs/secretos OAuth, URLs definitivas y revisión de requisitos de cada proveedor. Los secretos se guardan en variables de entorno y nunca en Git.

## Semana 5 — Gestión de venta

- Convertir el carrito en pedidos con estados claros.
- Crear una vista privada sencilla para editar productos y stock.
- Acordar el flujo de pago y entrega. Evaluar Mercado Pago solo después de definir cuenta comercial y condiciones.
- Añadir confirmaciones al cliente sin prometer disponibilidad que no esté verificada.

**Entrega:** ciclo completo de consulta, confirmación y seguimiento del pedido.

## Semana 6 — Calidad, SEO y publicación

- Ampliar las pruebas automatizadas del catálogo demo a consultas MongoDB y a las reglas de pedidos, una vez definidas; completar la revisión de accesibilidad.
- Publicar en un hosting adecuado para frontend y backend.
- Configurar dominio, HTTPS, Search Console, sitemap y medición de rendimiento.
- Crear páginas indexables por producto con descripciones propias y datos estructurados únicamente cuando precio y disponibilidad sean reales.
- Vincular las redes oficiales y crear un calendario de contenido útil sobre especies y cuidados.

**Estado parcial de accesibilidad:** el enlace “Saltar al contenido” ahora enfoca `<main>` en la portada y la guía, con un indicador visible sobre el título. El diálogo del carrito también limita la tabulación y devuelve el foco al control de apertura al cerrarse. La revisión integral con lector de pantalla, contraste y todos los estados interactivos sigue pendiente; practica la [lección de navegación por teclado](LESSON_13_ACCESSIBLE_KEYBOARD_NAVIGATION.md).

**Estado parcial de rendimiento:** el catálogo genera variantes adaptables de imágenes y conserva los originales; recorre la [lección de optimización de imágenes](LESSON_05_IMAGE_OPTIMIZATION.md) y completa la medición de red en DevTools.

**Estado parcial de integración continua:** `.github/workflows/ci.yml` instala con `npm ci`, ejecuta `npm test` y construye el frontend en pull requests y cambios a `main`. La suite cubre configuración, disponibilidad OAuth y lectura/filtros del catálogo en modo demo. Faltan pruebas de integración con MongoDB, el flujo de pedidos y la auditoría integral de accesibilidad. Netlify publica automáticamente los cambios de `main`.

**Lección:** recorre [integración continua con GitHub Actions](LESSON_06_GITHUB_ACTIONS.md), [las pruebas de configuración y OAuth](LESSON_11_API_CONFIGURATION_TESTS.md) y [las pruebas del catálogo](LESSON_12_CATALOG_API_TESTS.md) para relacionar cada aserción y comando con CI.

**Entrega:** versión de portafolio desplegada, instrucciones reproducibles, [plan mensual de contenidos](CONTENT_PLAN.md) adaptado a las redes oficiales y lista de mejoras priorizada.

## Rutina de cada sesión

1. Elegir un objetivo pequeño y observable.
2. Revisar el concepto antes de modificar código.
3. Implementar juntos y explicar cada decisión.
4. Hacer una revisión manual del resultado.
5. Anotar lo aprendido y dejar una pregunta de repaso para la próxima sesión.

Usa `LEARNING_LOG_TEMPLATE.md` para el registro. No publiques credenciales, datos privados de clientes ni imágenes sin autorización.
