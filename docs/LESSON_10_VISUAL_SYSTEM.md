# Lección 10 — Un sistema visual moderno y coherente

## Objetivo

Aprender a dar personalidad a una página sin sacrificar legibilidad, y dejar las decisiones listas para reutilizar en otras páginas y proyectos.

## La regla de marca

La tienda usa fotos reales de las plantas del negocio. No reemplaces una planta por una ilustración, una foto de stock ni una imagen generada: la imagen del catálogo debe ayudar al cliente a entender qué va a recibir. El logo y las fotos se conservan como archivos fuente; CSS puede decidir cómo encuadrarlas en una tarjeta.

La identidad visual mezcla verde botánico y fondos cálidos con una energía inspirada en anime y lettering. Las fuentes con más personalidad aparecen en títulos y acentos cortos; las descripciones, las preguntas frecuentes y los controles usan una fuente fácil de leer.

El pie suma tres sellos SVG: origen argentino, código argentino y la identidad de programación SMlich Soluciones IT. El último combina un casco de hielo original, un cristal cian y arcos de energía violeta con un wordmark sans. El contraste entre un emblema con carácter y una composición simple ayuda a que se lea como firma profesional secundaria; no reemplaza la marca principal del vivero ni reutiliza arte de franquicias.

## Paso 1: declarar los valores de la marca

Abre `src/styles.css` y mira el bloque `:root`. Las variables CSS guardan colores y familias tipográficas una sola vez:

```css
:root {
  --color-forest-deep: #142b21;
  --color-forest: #214f38;
  --color-lime: #d2f46a;
  --color-orange: #ed5736;
  --color-paper: #fbf9f0;
  --sans: 'DM Sans', 'Segoe UI', sans-serif;
  --heading: 'Bangers', Impact, sans-serif;
  --marker: 'Permanent Marker', 'Comic Sans MS', cursive;
}
```

`var(--color-lime)` reutiliza ese valor donde aparezca. Para cambiar el color del botón principal, filtros activos y números del carrito a la vez, actualiza el token en `:root`, no cada regla por separado.

## Paso 2: asignar un trabajo a cada tipografía

- **Bangers** da ritmo a `h1`, `h2`, precios y números breves.
- **Permanent Marker** destaca solo palabras cortas dentro de un título y etiquetas breves.
- **DM Sans** se encarga de párrafos, precios explicativos, botones, navegación, formularios y catálogo.

Las fuentes se declaran como enlaces en los `<head>` de `index.html` y `cuidados.html`. La hoja de estilos puede empezar a cargar desde el HTML y las dos páginas usan los mismos nombres. Las listas separadas por comas en CSS sirven como respaldo si no se descarga la fuente principal.

El selector compartido `h1, h2` define la voz de los titulares. `text-wrap: balance` distribuye sus líneas para reducir viudas y cortes desparejos; `em` cambia de familia y color solo en la frase marcada. Evita extender Bangers o Permanent Marker a párrafos: sus formas expresivas cansan cuando se repiten mucho.

## Paso 3: reutilizar las decisiones en componentes y páginas

Los botones primarios, los filtros seleccionados y las etiquetas de producto reutilizan lima; los detalles activos y algunas palabras destacadas reutilizan coral. El contraste oscuro sobre lima mantiene el texto del botón claro.

`cuidados.html` carga la hoja común `src/styles.css` y después `src/care-page.css`. La primera contiene tokens y estilos compartidos; la segunda adapta la composición de la guía. De este modo se puede ajustar un color de marca en un sitio y mantenerlo sincronizado.

## Paso 4: comprobar la implementación

1. Ejecuta `npm run build` para pedirle a Vite que compile las dos páginas.
2. Abre la tienda y `/cuidados.html` en escritorio y una pantalla angosta.
3. Confirma que las palabras destacadas no se salen de los títulos, los párrafos siguen siendo cómodos de leer y los controles de teclado muestran el borde de foco.
4. Si cambias una imagen, compara el resultado con el archivo original y conserva la foto real como fuente.
5. Ajusta temporalmente el ancho a 320 px y confirma que los tres sellos se apilen, que sus textos se mantengan legibles y que la página no tenga desplazamiento horizontal.

En este entorno, la compilación se verificó con `node node_modules/vite/bin/vite.js build` porque el comando `npm` aún no está disponible en la terminal. La compilación de Vite es la comprobación de que el HTML, CSS y JavaScript se pueden preparar para producción; no reemplaza la revisión visual del navegador.

## Comprobación responsive realizada

La tienda y `/cuidados.html` se revisaron en anchos CSS de 280, 320, 360, 390, 430, 600, 760, 768, 900, 1000, 1024, 1280, 1440 y 1920 px. En cada ancho, el ancho desplazable del documento coincidió con el viewport y las fotos cargaron. También se abrió el carrito a 280, 320, 390 y 768 px; el enlace de WhatsApp siguió visible y fue el elemento que recibía el clic en el centro del botón.

Esa interacción encontró un caso real: el aviso flotante de confirmación tenía `z-index: 55` y se pintaba encima del carrito (`z-index: 50`), tapando parte del botón de consulta. En `src/styles.css`, el aviso ahora usa `z-index: 45`; el diálogo queda por delante y el aviso ya no intercepta ni cubre la acción. La región `contact-card__ornament` puede salir parcialmente de la pantalla en móvil, pero la tarjeta la recorta intencionalmente con `overflow: hidden`.

En una revisión de la vista pública del 25 de noviembre de 2026 amplié las pruebas a proporciones representativas: 240×320, 280×568, 320×480, 390×844, 568×320, 812×375, 768×1024, 1024×600, 1366×768 y 1920×480. La portada y `/cuidados.html` no tuvieron desplazamiento horizontal; los encabezados quedaron dentro de sus cajas, los centros de los controles visibles no estaban cubiertos y las imágenes cargaron. Con el carrito abierto, el botón de WhatsApp permaneció completamente visible y clickeable en 280×568, 320×480, 390×844, 568×320 y 768×1024.

La revisión de 240 px sí encontró que los nombres largos de Venus salían de sus tarjetas con la cuadrícula de dos columnas. Añadí una sola columna hasta 315 px y repetí la comprobación: los títulos entraron y la página siguió sin desbordarse. Esta lista sirve como muestreo de anchos y alturas reales; no implica que se haya revisado cada combinación de dispositivo posible.

Para repetir la revisión, abre DevTools, activa la emulación de dispositivo y cambia el ancho del viewport, no el zoom del navegador. Revisa ambas páginas, el título, la franja superior, las tarjetas, el pie y los estados abiertos del carrito y la cuenta. Compara `document.documentElement.scrollWidth` con `document.documentElement.clientWidth`; `window.innerWidth` también incluye el espacio de la barra de desplazamiento en escritorio. Confirma visualmente los elementos interactivos: la igualdad de los anchos por sí sola no detecta texto recortado dentro de un componente.

## Práctica para repetir

1. Cambia temporalmente `--color-lime` por otro color que conserve contraste con el texto oscuro.
2. Busca los elementos que heredan el valor con `var(--color-lime)`.
3. Restaura el color original y explica con tus palabras la diferencia entre un token y una regla CSS.
4. En otro proyecto, define tokens propios antes de construir el primer botón y reutilízalos en la segunda página.

## Repaso

- ¿Por qué dejamos DM Sans para los párrafos aunque Bangers dé más personalidad?
- ¿Qué ventaja tiene `var(--color-orange)` frente a repetir `#ed5736` en veinte selectores?
- ¿Cómo confirmas que las fotos del catálogo siguen mostrando plantas reales?
- ¿Qué información comunica cada sello y por qué SMlich aparece como marca secundaria?

## Referencias

- [MDN: Custom properties de CSS](https://developer.mozilla.org/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties)
- [MDN: `font-family` y fuentes de reserva](https://developer.mozilla.org/docs/Web/CSS/font-family)
- [Vite: construir para producción](https://vite.dev/guide/build)
