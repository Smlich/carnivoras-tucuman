# Álbum fotográfico del vivero

La galería reúne 24 fotos propias compartidas por el negocio. Los originales se conservan en `public/images/gallery`; la marca de autoría que aparece en las fotos permanece visible. Las miniaturas JPEG son copias optimizadas para la página y no reemplazan los originales.

## Cómo funciona

- `src/data/gallery.js` contiene la ruta, las dimensiones y el texto alternativo de cada foto. Las descripciones cuentan lo que se ve sin asegurar una especie cuando no está confirmada.
- `src/components/GallerySection.jsx` muestra una selección de ocho fotos, permite desplegar el álbum completo y abre cada imagen en un visor con teclado y controles accesibles.
- `scripts/optimize-gallery-images.mjs` genera miniaturas JPEG de hasta 480 píxeles. Las tarjetas usan carga diferida, dimensiones explícitas y `srcset` para elegir la miniatura o el original según el ancho; el visor siempre muestra el original.
- Las tarjetas conservan la proporción de cada foto (`height: auto`), sin recortar la planta ni la firma de autoría.

## Agregar fotos

1. Copia el original JPEG a `public/images/gallery` con un nombre breve, descriptivo y sin espacios.
2. Ejecuta `npm run images:optimize:gallery` desde la raíz.
3. Añade una entrada a `src/data/gallery.js` con su ruta, dimensiones reales, etiqueta, título, descripción y texto alternativo.
4. Describe lo visible con precisión. No afirmes que una planta está a la venta ni nombres una especie sin confirmación.

## Diseño

El álbum usa la misma paleta y tipografía de la tienda. Un diseño de columnas tipo masonry baja de cuatro a tres, dos y una columna según el ancho disponible. El visor nativo `<dialog>` muestra el original completo, admite Escape y flechas izquierda y derecha, ofrece controles visibles y se cierra con clic fuera de la foto.

Para entender las decisiones de React, CSS, accesibilidad y rendimiento, continúa con la [lección del álbum](LESSON_14_PHOTO_GALLERY.md).
