# Lección 12 — Probar los contratos del catálogo

## Objetivo

Verificar por HTTP las respuestas que React consume desde Express: listado, búsqueda, categoría, paginación, detalle y errores. Estas pruebas usan el catálogo demo para ser rápidas y no depender de Atlas.

## 1. Preparar un servidor efímero

`server/test/helpers/http.js` inicia `createApp()` en un puerto local disponible y lo cierra al terminar cada prueba. `server/src/config/database.js` reporta MongoDB desconectado en ese proceso aislado, así las rutas usan datos demo. No se abre una conexión a Atlas.

## 2. Revisar los contratos cubiertos

`server/test/products.test.js` comprueba:

- valores por defecto y metadatos de paginación del listado;
- filtro por categoría y resultados de una página concreta;
- búsqueda sin distinguir mayúsculas;
- errores `400 VALIDATION_ERROR` para filtros inválidos;
- forma del detalle de un producto, incluida su foto real y precio ARS;
- error `404 PRODUCT_NOT_FOUND` cuando el slug no existe.

Cada caso envía solicitudes reales a Express con `fetch`, recibe JSON y contrasta campos estables. Esto verifica la ruta completa en el modo demo, no solo funciones privadas.

## 3. Ejecutar la suite

Desde la raíz del repositorio:

```sh
npm test
```

El script ejecuta los archivos que coinciden con `server/test/**/*.test.js`. El runner incorporado de Node permite usar glob entre sistemas, como explica la [documentación oficial de Node.js](https://nodejs.org/api/test.html).

## 4. Comprobar Atlas de forma manual

La suite anterior usa datos demo y es la que ejecuta CI. Para comprobar de forma local la rama MongoDB, configura `MONGODB_URI` en `.env` y ejecuta:

```sh
npm run test:integration:mongo
```

`server/test/integration/mongodb-products.integration.js` inicia una conexión a la base configurada, levanta Express en un puerto temporal y consulta `/api/health`, el listado de Venus y el detalle de un resultado. Solo envía solicitudes `GET`; no inserta, cambia ni elimina datos. Si falta la URI, Node informa la prueba como omitida. Si Atlas rechaza la conexión, el mensaje orienta qué revisar sin imprimir credenciales.

Esta es una comprobación de integración acotada, no una suite exhaustiva de filtros o índices de MongoDB. El nombre `.integration.js` la mantiene fuera de `npm test`, así los trabajos de GitHub no necesitan secretos ni acceso de red a Atlas. Usa únicamente la base de desarrollo que elegiste para la práctica.

## Práctica para repetir

1. Agrega una prueba para `q` de más de 80 caracteres y verifica el campo que aparece en `error.details`.
2. Cambia `limit` o `page` en una solicitud válida y predice los metadatos antes de correrla.
3. Explica por qué `source: demo-catalog` demuestra que no se conectó Atlas.
4. Amplía la integración con una base de prueba aislada para verificar búsqueda literal y exclusión de productos inactivos; no uses fixtures que escriban en el catálogo de desarrollo.

## Límites

`npm test` no prueba la rama `source: mongodb`, consultas, índices ni el orden devuelto por Atlas; la comprobación manual cubre salud, listado y detalle con una consulta de categoría. Ninguna de las dos recorre React en un navegador, el carrito ni el envío de una consulta por WhatsApp. Antes de atribuir un fallo al producto, recuerda que los precios y el stock actuales se reconfirman con el vivero.

## Preguntas de repaso

1. ¿Qué diferencia hay entre probar una ruta con datos demo y probar una consulta MongoDB?
2. ¿Por qué el listado conserva `total` después de paginar los resultados?
3. ¿Qué información estable conviene exponer en un error sin filtrar una traza interna?
