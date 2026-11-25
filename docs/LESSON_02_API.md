# Lección 2 — Qué ocurre en una API

## Objetivo

Entender el recorrido de una petición web desde React hasta Express y distinguir el catálogo de demostración de MongoDB.

## Recorrido de GET /api/products

1. ProductCatalog llama a fetchProducts desde src/services/products-api.js.
2. Vite reenvía la ruta /api al servidor local de Express, puerto 4000.
3. server/src/routes/products.js valida category, q, page y limit con Zod.
4. Si Mongoose está conectado, Express lee productos publicados en MongoDB.
5. Si MongoDB no está configurado y estás en desarrollo, Express devuelve la copia local del catálogo e informa source: demo-catalog.
6. Express responde JSON con data y meta; React reemplaza el catálogo local con data.

## Conceptos clave

- **Ruta:** método HTTP y URL que atienden una operación; aquí es GET /api/products.
- **Query string:** filtros que no modifican datos, por ejemplo ?category=venus&page=1.
- **Validación:** el servidor rechaza parámetros inválidos en lugar de confiar en el navegador.
- **Repositorio y persistencia:** el servidor sabe de dónde viene el producto. El cliente no conoce ni contiene una conexión a MongoDB.
- **Estado degradado:** la API puede servir datos de demostración y seguir funcionando; ese estado no significa que se estén guardando cambios.

La ruta `GET /api/auth/status` aplica el mismo principio de contrato explícito: informa si OAuth está activo y qué proveedores se habilitaron, pero nunca devuelve IDs ni secretos. Los tests de configuración y esta ruta están descritos en [la lección de pruebas](LESSON_11_API_CONFIGURATION_TESTS.md).

El contrato del catálogo también se prueba en [la lección de pruebas del catálogo](LESSON_12_CATALOG_API_TESTS.md): filtros válidos, paginación, detalle y respuestas predecibles para parámetros inválidos o productos inexistentes.

## Práctica guiada

1. Con npm run dev:all activo, abre GET /api/health y lee database y catalogMode.
2. Abre GET /api/products?category=venus&limit=2 y compara meta.total con data.
3. Cambia category por otra categoría y vuelve a comparar.
4. Prueba una categoría que no exista; la API debe responder 400 y describir la validación.
5. Explica por qué la URI de MongoDB está en el servidor y no en React.

### Recorrido verificado en desarrollo

El 25 de noviembre de 2026, Express respondió `data.status: ok`, `data.database: connected` y `data.catalogMode: mongodb` en `/api/health`. La consulta `/api/products?category=venus&limit=2` devolvió dos plantas y `meta.source: mongodb`. Así se puede seguir el dato de punta a punta: el navegador pide un recurso, Express valida los filtros y Mongoose lee los documentos de Atlas.

En ese mismo entorno, `/api/auth/status` devolvió `enabled: false` y `providers: []`. Esto separa dos estados: Atlas ya persiste el catálogo, pero el acceso social no estará disponible hasta configurar Better Auth y las credenciales de los proveedores. Las credenciales se mantienen en `.env` y el endpoint solo revela si están activas.

## Lecturas oficiales

- [Express 5: manejo de errores](https://expressjs.com/en/5x/guide/error-handling/)
- [Express: buenas prácticas de seguridad](https://expressjs.com/en/advanced/best-practice-security/)
- [Mongoose: esquemas](https://mongoosejs.com/docs/guide.html)
- [Mongoose: validación](https://mongoosejs.com/docs/validation.html)
