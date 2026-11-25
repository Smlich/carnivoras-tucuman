# API del catálogo

Base local: http://127.0.0.1:4000. En desarrollo, Vite reenvía /api al servidor Express.

## Endpoints

### GET /api/health

Devuelve el estado del servidor y de la base. Si responde status: degraded, database: not-configured y catalogMode: demo-catalog, la API está usando datos locales y no guarda cambios.

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

### GET /api/products/:slug

Devuelve un producto publicado o un 404 PRODUCT_NOT_FOUND.

## Validación y errores

Los filtros se validan con Zod. La API responde JSON con un código estable y un mensaje legible; las trazas internas no se envían al navegador en producción. Helmet agrega cabeceras de seguridad y CORS limita los orígenes que se pueden conectar.

## Carga inicial en MongoDB

Después de configurar MONGODB_URI en .env, ejecuta npm run seed:products. El script crea o actualiza los productos por slug y no elimina otros documentos. Los valores son los transcritos del catálogo recibido; verifica que sigan vigentes antes de usar una base real.

## Límites actuales

- La API solo permite leer catálogo y estado.
- No hay endpoints de registro, sesión, administración ni escritura de pedidos.
- La base MongoDB aún no está conectada en este entorno.
- El modo de demostración existe solo para desarrollo; producción exige MONGODB_URI.
