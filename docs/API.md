# API del catálogo

Base local: http://127.0.0.1:4000. En desarrollo, Vite reenvía /api al servidor Express.

## Endpoints

### GET /api/health

Devuelve el estado dentro de `data`. Una conexión activa a Atlas debe tener una respuesta de esta forma:

    {
      "data": {
        "service": "carnivoras-tucuman-api",
        "status": "ok",
        "database": "connected",
        "catalogMode": "mongodb"
      }
    }

Si `data.status` es `degraded`, `data.database` es `not-configured` y `data.catalogMode` es `demo-catalog`, la API usa el catálogo local y no persiste cambios.

### GET /api/products

Parámetros opcionales:

- category: combos, otras, venus o especiales.
- q: búsqueda de hasta 80 caracteres.
- page: página, desde 1.
- limit: resultados por página, entre 1 y 24.

Respuesta:

    {
      "data": [],
      "meta": {
        "page": 1,
        "limit": 12,
        "total": 8,
        "source": "demo-catalog"
      }
    }

Cada elemento de data usa la misma forma que el catálogo de React. source identifica si los datos vienen de MongoDB o del modo de demostración.

**Comprobación local (25 de noviembre de 2026):** `/api/health` informó `data.status: ok`, `data.database: connected` y `data.catalogMode: mongodb`; `/api/products` devolvió ocho productos con `meta.source: mongodb`. La consulta `/api/products?category=venus&limit=2` devolvió dos Venus desde MongoDB. `/api/auth/status` informó `enabled: false` y una lista vacía de proveedores. Se comprobó solo la presencia de variables (sin leer ni mostrar valores): Atlas, `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL` ya están configurados; faltan los IDs y secretos OAuth de Google y Facebook.

### GET /api/products/:slug

Devuelve un producto publicado o un 404 PRODUCT_NOT_FOUND.

### GET /api/auth/status

Indica si la autenticación está disponible y devuelve los nombres públicos de los proveedores configurados. No expone IDs ni secretos. Si `enabled` es `false`, el menú de registro se oculta.

### Rutas de Better Auth

Cuando Atlas, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` y al menos un proveedor estén configurados, Better Auth atiende el flujo social bajo `/api/auth/*`. Express monta su handler antes del parser JSON, y React usa el cliente oficial de Better Auth para consultar sesión, registrarse/iniciar sesión y cerrar sesión.

## Validación y errores

Los filtros se validan con Zod. La API responde JSON con un código estable y un mensaje legible; las trazas internas no se envían al navegador en producción. Helmet agrega cabeceras de seguridad y CORS limita los orígenes que se pueden conectar.

## Carga inicial en MongoDB

Después de configurar MONGODB_URI en .env, ejecuta npm run seed:products. El script crea o actualiza los productos por slug y no elimina otros documentos. Los valores son los transcritos del catálogo recibido; verifica que sigan vigentes antes de usar una base real.

## Límites actuales

- La API solo permite leer catálogo y estado.
- Las rutas de autenticación no se activan hasta que MongoDB y proveedores OAuth estén configurados.
- No hay rutas de administración ni escritura de pedidos.
- En el entorno local verificado, MongoDB Atlas está conectado; el modo demo se conserva para equipos sin URI local.
- El modo de demostración existe solo para desarrollo; producción exige MONGODB_URI.
