# Sistema visual

Esta guía registra las decisiones visuales de Carnívoras Tucumán para mantener la marca coherente al sumar páginas y componentes.

## Dirección

La interfaz mezcla la calma de un vivero especializado con una energía juvenil inspirada en cómics y lettering urbano. Las formas expresivas se reservan para titulares y acentos breves. La navegación, el catálogo y la información de cuidados conservan jerarquía y lectura clara.

## Tipografía

| Uso | Familia | Regla |
| --- | --- | --- |
| Titulares y cifras | Bangers | Usar en encabezados principales, precios y cifras breves. Evitar párrafos largos. |
| Acentos expresivos | Permanent Marker | Usar en una frase corta dentro de un titular o en una etiqueta. No aplicar a instrucciones. |
| Lectura e interfaz | Space Grotesk | Usar en párrafos, navegación, botones, formularios, fichas y preguntas frecuentes. |

Las dos páginas HTML cargan las fuentes desde Google Fonts y declaran alternativas locales. Si el proveedor no responde, la jerarquía y el contenido siguen siendo legibles.

## Paleta

| Token CSS | Valor | Uso |
| --- | --- | --- |
| `--color-forest-deep` | `#0b2119` | Fondo principal oscuro y footer. |
| `--color-forest` | `#1d583d` | Elementos de marca y detalles botánicos. |
| `--color-leaf` | `#48a65c` | Hojas, superficies secundarias y decoración. |
| `--color-lime` | `#c8f451` | Llamadas a la acción y acento de alto contraste en fondos oscuros. |
| `--color-orange` | `#fb6348` | Detalles cálidos y estados de foco. En texto sobre fondos claros se usa una variante más oscura para conservar contraste. |
| `--color-orchid` | `#d995dc` | Acento floral inspirado en la floración de Drosera. |
| `--color-paper` | `#f7f4e8` | Fondo general cálido. |
| `--color-white` | `#fffef9` | Tarjetas y superficies claras. |

Mantén el verde profundo y el papel cálido como base. Reserva lima, coral y orquídea para áreas pequeñas. No uses un acento claro como texto pequeño sobre papel claro.

## Fotografía e ilustración

- Las fotos del catálogo muestran los ejemplares ofrecidos y usan únicamente imágenes reales autorizadas por el vivero.
- Las fotos originales de `public/images/gallery/` pueden aparecer fuera del catálogo como escenas editoriales del vivero, siempre sin precio o reclamo que las haga parecer una publicación de otro producto.
- El hero usa `jarro-con-gotas.jpeg`, una foto real del vivero. La galería conserva las 24 fotografías originales para descubrir las especies, el cultivo y las trampas.
- Las ilustraciones de lianas, trampas de jarro y flor de Drosera en `public/images/botanical/` son SVG originales inspirados en las formas observadas en las fotos del vivero. No se agregan flores de plantas no carnívoras.
- No uses imágenes de stock ni generadas como representación de una planta vendida. Las miniaturas deben proceder de los originales y no reemplazarlos.

## Movimiento y profundidad

Usa perspectiva 3D ligera en tarjetas y marcos de fotografía para dar profundidad al desplazarse o pasar el puntero. Las lianas y flores pueden tener una oscilación lenta; no deben cubrir textos, botones ni detalles de las plantas. Respeta `prefers-reduced-motion` para desactivar desplazamientos y transiciones.

## Sellos de marca

El pie reúne “Hecho en Argentina”, “Codeado en Argentina” y “SMlich Soluciones IT” en marcas del mismo tamaño, centradas y equilibradas en una sola grilla. Son información secundaria: la identidad de Carnívoras Tucumán conserva el primer plano en encabezado y pie.

Los archivos SVG viven en `public/images/brand/` y tienen texto visible junto a sus símbolos. En pantallas estrechas se mantiene la grilla de tres columnas, con tamaños de texto que pueden envolver sin deformar ni superponer las marcas.

## Contador de visitas

El contador del pie retoma la forma de una hoja y usa los acentos lima y coral. Presenta el total de sesiones de pestaña compartido desde Netlify Blobs; no lo rotules como personas únicas. Si el endpoint no responde, conserva un estado neutral y no inventa cifras.

## Responsive y accesibilidad

- Reutiliza las variables de color y tipografía declaradas en `src/styles.css`.
- Mantén espacio visible entre llamadas a la acción; organiza botones contiguos con un contenedor flex o grid y define `gap`.
- Comprueba que el encabezado, las marcas, las tarjetas y el contador no provoquen desplazamiento horizontal en móvil.
- Conserva foco de teclado visible, texto alternativo fiel y jerarquía semántica.
- Revisa `prefers-reduced-motion` después de añadir animación.
- Aplica las mismas variables a `/cuidados.html` mediante `src/care-page.css`.
