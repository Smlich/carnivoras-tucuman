# Cronograma de aprendizaje y entregas

Plan inicial de seis semanas, con sesiones de 60 a 90 minutos y una carga orientativa de 6 a 8 horas por semana. Se ajusta al tiempo real disponible; cada etapa termina con una entrega visible y una revisión del código.

## Hito 0 — Tienda funcional inicial

**Estado:** completado. **Duración prevista:** 1 a 2 jornadas.

- Construir la portada, el catálogo, los filtros y el carrito.
- Enviar un pedido armado a WhatsApp.
- Usar el logo y las fotos reales compartidas por el negocio.
- Documentar cómo ejecutar el proyecto y qué datos faltan.

**Aprendizaje:** estructura HTML semántica, componentes React, estado, eventos, CSS adaptable y Git.

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

**Estado:** se eligió MongoDB Atlas; el modelo de producto y la carga inicial están preparados, y la guía de conexión quedó documentada. **Pendiente:** crear el clúster y usuario de base de datos, agregar la URI de forma local, cargar el catálogo y comprobar persistencia; el modelo de pedidos se añadirá después de definir identidad y privacidad.

## Semana 4 — Cuentas con Google y Facebook

- Crear aplicaciones OAuth en Google Cloud y Meta for Developers.
- Configurar URLs de retorno local y de producción.
- Implementar inicio de sesión en el servidor, sesión segura y logout.
- Asociar el proveedor y su identificador a una cuenta interna; no guardar contraseñas del proveedor.
- Añadir pruebas de autorización y protección de rutas como trabajo de esta etapa.

**Entrega:** el cliente puede crear o recuperar su cuenta usando Google o Facebook.

**Estado:** Better Auth, MongoDB y las rutas Express están integrados; el menú React aparece cuando hay configuración válida. **Pendiente:** conectar Atlas, crear las aplicaciones OAuth, guardar secretos localmente y completar un inicio de sesión real de cada proveedor.

**Lección:** recorre [OAuth, sesiones y secretos](LESSON_03_OAUTH_AND_SECRETS.md) antes de configurar proveedores reales. La lectura enseña el flujo sin necesitar compartir credenciales.

**Bloqueo externo:** requiere IDs/secretos OAuth, URLs definitivas y revisión de requisitos de cada proveedor. Los secretos se guardan en variables de entorno y nunca en Git.

## Semana 5 — Gestión de venta

- Convertir el carrito en pedidos con estados claros.
- Crear una vista privada sencilla para editar productos y stock.
- Acordar el flujo de pago y entrega. Evaluar Mercado Pago solo después de definir cuenta comercial y condiciones.
- Añadir confirmaciones al cliente sin prometer disponibilidad que no esté verificada.

**Entrega:** ciclo completo de consulta, confirmación y seguimiento del pedido.

## Semana 6 — Calidad, SEO y publicación

- Añadir validaciones, pruebas automatizadas de rutas críticas y revisión de accesibilidad.
- Publicar en un hosting adecuado para frontend y backend.
- Configurar dominio, HTTPS, Search Console, sitemap y medición de rendimiento.
- Crear páginas indexables por producto con descripciones propias y datos estructurados únicamente cuando precio y disponibilidad sean reales.
- Vincular las redes oficiales y crear un calendario de contenido útil sobre especies y cuidados.

**Entrega:** versión de portafolio desplegada, instrucciones reproducibles y lista de mejoras priorizada.

## Rutina de cada sesión

1. Elegir un objetivo pequeño y observable.
2. Revisar el concepto antes de modificar código.
3. Implementar juntos y explicar cada decisión.
4. Hacer una revisión manual del resultado.
5. Anotar lo aprendido y dejar una pregunta de repaso para la próxima sesión.

Usa `LEARNING_LOG_TEMPLATE.md` para el registro. No publiques credenciales, datos privados de clientes ni imágenes sin autorización.
