# Lección 05 — Imágenes reales, rápidas y adaptables

## Objetivo

Aprender a reducir lo que descarga el catálogo sin cambiar la identidad de las plantas ni reemplazar las fotos del vivero.

## Qué se implementó

- Los originales del negocio siguen en `public/images/catalog` y el script nunca los sobrescribe.
- `npm run images:optimize` prepara copias de 480 y 960 píxeles en `public/images/catalog/optimized`.
- Las fotos fuente PNG se sirven como WebP. Las que ya eran JPEG conservan JPEG; si un JPEG redimensionado pesa más que el original, el script conserva el original.
- Los logos se guardan como WebP sin pérdida y se reducen a 512 píxeles.
- `CatalogImage` usa `<picture>` y `srcset`. El navegador elige una variante según `sizes`, el espacio disponible y la densidad de pantalla. Si no admite ese formato, el `<img>` mantiene el original como respaldo.
- Para que existan candidatos de 480 y 960 píxeles sin ampliar una foto pequeña, el script requiere fotos fuente de al menos 960 píxeles de ancho.

Las variantes solo cambian formato, dimensiones de píxel o compresión. No se retocan colores, no se quita texto y no se recorta el producto. Antes de publicar, compara el resultado visual y confirma que las fotos representan lo que el cliente recibirá.

## Medición de esta versión

Con el catálogo actual, el original de cada archivo suma aproximadamente 11.1 MiB. La suma de la variante más grande disponible por cada foto y logo suma aproximadamente 2.1 MiB: una reducción agregada del 80.7%. Esta comparación ayuda a revisar el peso de los assets; no equivale a medir una carga real, porque el navegador pide solo los recursos visibles y una variante por imagen.

## Cómo repetirlo

1. Agrega a `public/images/catalog` una foto autorizada y conserva el archivo original.
2. Ejecuta `npm run images:optimize`.
3. Asegúrate de que `CatalogImage` reconoce la ruta y que los anchos listados en `srcset` existen y corresponden al ancho real de cada archivo.
4. Ejecuta `npm run build` y abre la tienda.
5. En las herramientas del navegador, revisa la pestaña Network con el filtro Img. Comprueba qué archivo eligió el navegador, sus dimensiones, formato y bytes transferidos.
6. Compara la variante con la foto original a tamaño normal y ampliada; ajusta calidad si aparecen artefactos en bordes, texto o detalles de la planta.

## Conceptos para explicar en una entrevista

- `srcset` ofrece varios archivos con anchos declarados en píxeles; el navegador elige uno.
- `sizes` describe cuánto espacio ocupará la imagen en el diseño y ayuda al navegador a tomar esa decisión.
- `<picture>` permite elegir un formato y mantener un `<img>` de respaldo.
- Reducir dimensiones evita transferir millones de píxeles que una tarjeta pequeña no puede mostrar.
- Los originales guardados hacen que la optimización sea reversible y permiten regenerar variantes con otros parámetros.
- Una cifra agregada de ahorro es una evidencia inicial; una auditoría de red y de calidad visual completa la medición.

## Ejercicio de repaso

Sin mirar el código, explica por qué un JPEG ya comprimido puede pesar más después de convertirlo a WebP, qué describe el descriptor `960w` y por qué conservamos el original. Después añade una foto real, regenera sus variantes y comprueba cuál eligió el navegador en una pantalla móvil.
