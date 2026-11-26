# Arquitectura del proyecto

## Frontend multipágina y API compartida

```text
Navegador (9 páginas Vite)
  ├── React: /, /catalogo.html, /vivero.html, /juegos.html, /contacto.html, /admin.html
  │     ├── GET /api/site-data (ajustes, catálogo activo, galería, preview de juegos)
  │     ├── carrito en localStorage + nota opcional + enlace wa.me + POST /api/orders
  │     └── sesión Google OAuth y panel Admin
  └── HTML estático: /cuidados.html, /privacidad.html, /terminos.html
        ├── contenido indexable + JSON-LD (BreadcrumbList / FAQPage)
        └── scripts progresivos (/visit-counter.js, /mobile-nav.js)

Backend compatible (/api/*)
  ├── Netlify Functions (netlify/functions/api.mjs) + Netlify Blobs + public/_headers + 404.html
  └── Express 5 (server/src) + Mongoose (MongoDB Atlas) + Better Auth
```

El navegador recuerda las cantidades del carrito en `localStorage` y recalcula precios y disponibilidad contra el servidor al registrar consultas en `POST /api/orders`. WhatsApp sigue siendo el canal comercial para confirmar stock, medio de pago y entrega manualmente. Si MongoDB no está configurado en desarrollo, Express sirve el catálogo local con `source: demo-catalog` sin persistencia.

## Arquitectura objetivo: MERN

```text
React (cliente)
  └── API HTTPS
       └── Node.js + Express
            ├── autenticación OAuth (Google / Facebook)
            ├── validación y reglas de negocio
            └── MongoDB (productos, cuentas, pedidos, medios, métricas)
```

El cliente nunca se conecta directamente a MongoDB. El servidor valida cada operación, controla permisos y conserva los secretos de OAuth. Las rutas de administración requieren autorización. Los identificadores y secretos de proveedor viven en variables de entorno del servidor.

## Topología para los dos despliegues

- **Netlify:** publica `dist` (9 páginas HTML + `public/_headers` + `public/404.html`) y la función unificada `netlify/functions/api.mjs` (`/api/*`) sobre Netlify Blobs para catálogo editable, álbum, juegos, pedidos, Google OAuth con PKCE, panel admin y contador de visitas.
- **Hostinger (opcional a futuro):** un proceso Express sirve `dist` y `/api/*` en el mismo origen. Mongoose y Better Auth usan MongoDB Atlas; las credenciales OAuth y de base de datos se configuran en el panel del hosting, nunca en Git.

## Decisiones de la primera entrega

- Vite permite iniciar con un frontend pequeño y evolucionar sin rehacer la interfaz.
- Vite compila `index.html` y `cuidados.html` como dos entradas estáticas. La guía informativa no hidrata React: el texto y los metadatos están en el HTML inicial y no necesitan estado de cliente.
- Better Auth se separa en un chunk que el navegador solicita cuando una persona abre el menú de cuenta y el API confirma al menos un proveedor. Así el visitante que solo recorre la tienda no descarga ese código.
- El catálogo está separado en datos para facilitar su migración posterior a la API.
- React consulta GET /api/products; si el servidor de desarrollo no está disponible, muestra el catálogo local.
- MongoDB es obligatorio en producción; el modo local de demostración no guarda cambios.
- El contacto comercial se concentra en WhatsApp hasta definir pagos, entrega y backend.
- No se inventa el acceso social: botones de autenticación solo aparecerán cuando los proveedores estén configurados y el flujo pueda completarse.
- Las imágenes del catálogo son los archivos originales compartidos por Carnívoras Tucumán. No se generan plantas artificiales ni se cambia su contenido.

## Módulos previstos para la API

- Productos: listar, consultar, crear y actualizar disponibilidad.
- Cuentas: OAuth, sesión, perfil y cierre de sesión.
- Pedidos: crear, consultar los propios y actualizar estados desde administración.
- Operaciones: validación, manejo centralizado de errores y registro sin datos sensibles.
