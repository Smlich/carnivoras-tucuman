# Sistema visual

Esta guía registra las decisiones visuales de Carnívoras Tucumán para poder mantener la marca coherente al sumar páginas y componentes.

## Dirección

La interfaz combina la seriedad de un vivero especializado con energía juvenil inspirada en el lettering de cómics y el grafiti. Las formas y tipografías expresivas se reservan para momentos breves; el catálogo, la navegación y los textos informativos priorizan lectura y confianza.

## Tipografía

| Uso | Familia | Regla |
| --- | --- | --- |
| Titulares y cifras destacadas | Bangers | Títulos `h1` y `h2`, precios y números breves. En mayúsculas por CSS. |
| Acentos dibujados | Permanent Marker | Palabras enfatizadas dentro de titulares y etiquetas cortas. No usar en párrafos ni instrucciones. |
| Lectura e interfaz | DM Sans | Párrafos, navegación, formularios, botones, fichas y preguntas frecuentes. |

Las fuentes se cargan desde Google Fonts en las dos páginas HTML. Las familias de respaldo mantienen una presentación usable si no se puede acceder al servicio.

## Paleta

| Token CSS | Valor | Uso |
| --- | --- | --- |
| `--color-forest-deep` | `#142B21` | Fondos oscuros y áreas de marca. |
| `--color-forest` | `#214F38` | Color principal, vínculos y detalles botánicos. |
| `--color-leaf` | `#37834B` | Variantes verdes para elementos de planta. |
| `--color-lime` | `#D2F46A` | Llamadas a la acción, filtros activos y acentos brillantes. |
| `--color-orange` | `#ED5736` | Acento cálido, foco de teclado y detalles destacados. |
| `--color-paper` | `#FBF9F0` | Fondo general cálido. |
| `--color-white` | `#FFFEFB` | Tarjetas y superficies. |

Usa el verde oscuro y el fondo cálido como base. Lima y coral dan energía en superficies pequeñas o texto grande; conserva contraste suficiente para lectura y foco visible con teclado.

## Fotografía de producto

El catálogo usa fotos reales provistas por el negocio para que las plantas ofrecidas se parezcan a lo que recibe el cliente. No reemplaces plantas por imágenes de stock o generadas. Las versiones optimizadas, cuando existan, deben provenir de los mismos originales. Los recortes visuales pueden ajustarse con CSS sin alterar las fotos fuente.

## Al extender el diseño

- Reutiliza las variables de color y tipografía declaradas al principio de `src/styles.css`.
- Mantén el contenido largo en DM Sans y comprueba los estados de foco y hover.
- Aplica el mismo vocabulario visual a `/cuidados.html` desde `src/care-page.css`.
- Revisa diseños móviles: no reduzcas texto largo ni escondas información esencial.

## Sellos de pie de página

El pie comparte tres gráficos SVG hechos para el proyecto: “Hecho en Argentina”, “Codeado en Argentina” y el logo “SMlich Soluciones IT”. Son secundarios frente al logo del vivero y conservan contraste sobre el fondo verde. El sello argentino combina la bandera celeste y blanca; el de programación usa los signos `</>`; SMlich integra un casco de hielo original, arcos de energía cian y violeta y un wordmark sans. La referencia de fantasía inspira el clima del dibujo, pero el sello no reproduce logotipos, personajes ni emblemas de otras franquicias.

Los archivos viven en `public/images/brand/` y se usan tanto en el pie React como en `/cuidados.html`. El lockup SMlich incorpora su emblema PNG transparente dentro del SVG para mantener la ilustración y el wordmark en un solo recurso; el resto del dibujo y el texto se conservan como vectores. En el pie se muestran en tres columnas en pantallas amplias y en una columna hasta 600 px; cada imagen tiene texto alternativo.
