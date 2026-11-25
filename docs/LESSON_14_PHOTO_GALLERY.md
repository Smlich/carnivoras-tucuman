# Lección 14 — Una galería accesible y rápida

Esta lección recorre el álbum de 24 fotografías propias de Carnívoras Tucumán. El objetivo es que puedas explicar cómo los datos alimentan los componentes React, cómo CSS conserva las fotos completas y cómo el navegador elige una imagen adecuada para cada pantalla.

## 1. Datos separados del diseño

Abre `src/data/gallery.js`. Cada entrada declara la ruta, dimensiones originales, etiqueta, título, descripción y texto alternativo. El manifiesto permite cambiar el orden o el texto sin copiar el componente. Las dimensiones reales en `width` y `height` ayudan al navegador a reservar espacio antes de que cargue la foto y reducen saltos de contenido.

Las etiquetas usan nombres de especie solo cuando son visualmente claros; las demás describen la forma o el contexto. Ninguna foto de galería implica que ese ejemplar siga disponible para la venta.

## 2. Estado local de React

Abre `src/components/GallerySection.jsx` y localiza estos estados:

- `isExpanded` decide si se muestra la selección inicial de ocho fotos o las 24.
- `activeIndex` identifica la foto abierta. `null` significa que el visor está cerrado.
- `dialogRef` permite llamar `showModal()` y `close()` en el `<dialog>` nativo.

La selección inicial reduce el peso que se descarga cuando alguien solo quiere ver unas pocas fotos. El botón del álbum expone `aria-expanded` y `aria-controls` para que su estado y relación sean comprensibles con tecnología de asistencia.

## 3. Imágenes adaptables

Cada tarjeta entrega un `srcSet` con la miniatura JPEG de 480 px y el original, junto con `sizes`, `width`, `height`, `loading="lazy"` y `decoding="async"`. El navegador elige el archivo según el tamaño estimado de la tarjeta y la pantalla. La foto se carga cuando se aproxima a la zona visible, no toda al abrir la página.

Ejecuta `npm run images:optimize:gallery` para regenerar miniaturas con Sharp. El script no altera ni reemplaza los originales. Comprueba que la miniatura conserva nitidez suficiente y que el visor usa la foto fuente.

## 4. CSS y composición

En `src/styles.css`, `.gallery-grid` usa CSS multi-column para lograr un ritmo tipo masonry sin fijar una altura común. `break-inside: avoid` mantiene cada tarjeta unida. La imagen tiene `width: 100%` y `height: auto`, por lo que conserva su formato vertical u horizontal y la firma del autor.

Las columnas pasan de cuatro a tres, dos y una al reducir el ancho. El botón de ampliación revela su indicación al pasar el cursor o recibir foco; no depende únicamente del ratón. El visor limita la foto al alto disponible y `object-fit: contain` evita recortes.

## 5. Teclado y accesibilidad

El `<dialog>` nativo modal gestiona el foco y se cierra con Escape. El código devuelve el foco al abrir el botón de cierre, permite navegar con las flechas izquierda y derecha y ofrece botones anterior, siguiente y cerrar con nombres accesibles. `aria-labelledby` vincula el diálogo con el título de la foto.

Al revisar un cambio, recorre el álbum solo con Tab, Shift+Tab, Enter, Escape y flechas. Comprueba que el foco siempre se vea y que el texto alternativo describa la escena sin repetir la leyenda palabra por palabra.

## Práctica

1. Cambia `initialVisibleCount` a 6 y explica cómo cambia la descarga inicial.
2. Agrega una imagen autorizada con sus dimensiones verificadas, una descripción fiel y un texto alternativo.
3. Regenera la miniatura y comprueba que aparezca en la tarjeta y en el visor.
4. Prueba la galería con teclado y a 390 px de ancho.

Consulta el [manual de mantenimiento](GALLERY.md) para incorporar nuevas fotos sin perder originales ni atribuir especies sin confirmación.
