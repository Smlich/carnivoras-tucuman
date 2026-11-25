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

**Decisión:** agregar OAuth real en una etapa posterior; no simular registros en el frontend.

**Motivo:** el servidor debe validar la identidad, mantener los secretos privados y controlar la sesión.

**Consecuencia:** las cuentas de cliente aún no están activas. El requisito se considera pendiente para el lanzamiento con registro.
