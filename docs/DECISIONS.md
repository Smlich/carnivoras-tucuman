# Decisiones técnicas

## ADR-001 — Empezar con una tienda frontend

**Decisión:** la primera entrega usa React y Vite, con datos locales y pedidos por WhatsApp.

**Motivo:** mostrar una experiencia de compra útil pronto y aprender la interfaz antes de sumar servidor y base de datos.

**Consecuencia:** el carrito solo vive en el navegador y WhatsApp no confirma stock. El catálogo se migrará a una API en la etapa MERN.

## ADR-002 — Fotos fieles al catálogo

**Decisión:** usar exclusivamente las fotos reales compartidas por el negocio para representar las plantas.

**Motivo:** que el cliente vea material auténtico y reducir diferencias entre la publicación y la planta recibida.

**Consecuencia:** las publicaciones originales pueden incluir textos, logo y precios dentro de la imagen. Las imágenes se muestran como fueron entregadas; se puede preparar una futura sesión fotográfica de producto con fotos reales limpias.

## ADR-003 — No publicar precios ni disponibilidad como definitivos

**Decisión:** el sitio informa que se confirma stock por WhatsApp.

**Motivo:** el material recibido no indica cuándo se actualizó cada precio y la disponibilidad puede cambiar.

**Consecuencia:** antes del lanzamiento comercial, el negocio confirma catálogo, vigencia, zonas de entrega y precio final.

## ADR-004 — Acceso Google/Facebook se implementa en el backend

**Decisión:** usar Better Auth en el backend Express para el flujo OAuth de Google y Facebook; no simular registros en el frontend.

**Motivo:** el servidor valida la identidad, mantiene los secretos privados y controla la sesión. Una biblioteca especializada evita escribir manualmente los detalles delicados del protocolo.

**Consecuencia:** las cuentas y sesiones se almacenan en MongoDB mediante el adaptador oficial de Better Auth. Los botones se ocultan hasta que MongoDB, el secreto de sesión y al menos un proveedor estén configurados.

## ADR-005 — El catálogo se lee desde Express y MongoDB

**Decisión:** React consulta una API de solo lectura; Express consulta MongoDB cuando hay una conexión activa.

**Motivo:** separar interfaz y datos ahora facilita aprender API REST y añadir persistencia sin exponer la base al navegador.

**Consecuencia:** en desarrollo sin MongoDB, Express sirve el catálogo de demostración y el endpoint de salud lo identifica. En producción, la API requiere MongoDB. No hay rutas para editar productos ni guardar pedidos hasta implementar autorización y reglas de venta.

## ADR-006 — Compartir Atlas entre productos y autenticación

**Decisión:** usar una sola base MongoDB para productos Mongoose y las colecciones de autenticación de Better Auth, con `MONGODB_DATABASE` explícito.

**Motivo:** conservar MERN, evitar una segunda base y mantener las cuentas, identidades OAuth y sesiones en el servidor.

**Consecuencia:** Better Auth usa el driver nativo de MongoDB a través del mismo cliente conectado por Mongoose. Los tokens OAuth se cifran antes de guardarse; el inicio de sesión nunca habilita permisos administrativos por sí solo.

## ADR-007 — Tipografía expresiva con lectura clara

**Decisión:** usar Bangers y Permanent Marker para titulares y acentos breves, y DM Sans para lectura e interfaz. La paleta mantiene verde profundo y papel cálido como base, con lima y coral para acentos.

**Motivo:** darle a la tienda una personalidad joven inspirada en anime y grafiti sin quitar claridad al catálogo ni confianza a la marca.

**Consecuencia:** los estilos se comparten con la guía de cuidados y quedan documentados en [el sistema visual](DESIGN_SYSTEM.md). Las fotos de las plantas siguen siendo las imágenes reales del negocio.

## ADR-008 — Sellos SVG de origen y autoría

**Decisión:** añadir al pie de la tienda y la guía tres SVG propios: “Hecho en Argentina”, “Codeado en Argentina” y el lockup “SMlich Soluciones”.

**Motivo:** dar crédito al origen del vivero y del desarrollo, además de presentar el alias de programación sin confundirlo con la marca comercial principal.

**Consecuencia:** los sellos son secundarios, accesibles mediante texto alternativo y apilados en pantallas de hasta 600 px. El monograma angular con tema helado usa una interpretación original de fantasía; no reutiliza arte ni logotipos de franquicias existentes.

## ADR-009 — Mantener gratuita la etapa de aprendizaje

**Decisión:** durante el prototipo se usan solo funciones y planes sin costo. No se activa facturación, se agrega una tarjeta, se inicia una prueba con conversión a pago ni se contrata un servicio.

**Motivo:** el negocio todavía no destina presupuesto al hosting final y el objetivo es aprender y publicar la vista de prueba sin asumir cargos.

**Consecuencia:** Netlify conserva el catálogo estático de revisión y Atlas usa su clúster gratuito; la API y Better Auth se ejecutan en desarrollo mientras no haya hosting full stack. Si se alcanza un límite o un proveedor exige pago, se pausa esa opción y se evalúa una alternativa gratuita. Hostinger queda para una etapa futura con presupuesto.
