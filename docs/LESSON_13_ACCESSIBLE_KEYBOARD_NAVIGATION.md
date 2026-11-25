# Lección 13 — Navegación por teclado y enlace de salto

## Objetivo

Permitir que una persona que navega con teclado omita los bloques repetidos y comience directamente en el contenido principal, con un indicador visual claro.

## Qué encontramos

La portada y la guía de cuidados ya tenían el enlace visible al recibir foco: “Saltar al contenido”. Su destino era `<main id="contenido">`, pero ese elemento no aceptaba el foco. La URL cambiaba al fragmento, mientras el foco real quedaba en `body` y no en el contenido.

La técnica G1 de W3C comprueba que, al activar el enlace, el foco llegue al contenido principal; HTML recomienda `tabindex="-1"` para un destino no interactivo que debe recibir foco sin sumarse a la secuencia normal de Tab. Consulta [W3C G1](https://www.w3.org/WAI/WCAG21/Techniques/general/G1) y [HTML: tabindex](https://html.spec.whatwg.org/multipage/interaction.html#the-tabindex-attribute).

## Cambio aplicado

- React asigna `tabIndex={-1}` a `<main>`; la guía estática usa `tabindex="-1"`.
- El foco programático puede llegar al destino, pero Tab sigue yendo a los controles reales.
- `main:focus-visible` resalta el título de la página con el borde visual del sistema, sin dibujar un marco alrededor de todo el documento.
- Se aumentó el contraste de etiquetas secundarias y estados del carrito. El campo de búsqueda, el resumen de cuenta y los elementos interactivos usan un indicador de foco naranja visible.
- Al vaciar el último producto, el foco pasa al botón «Volver al catálogo» para que no quede en un control que ya desapareció.
- El catálogo anuncia con una región `role="status"` cuántas plantas quedan después de cambiar filtros o búsqueda, sin agregar texto visual ni mover el foco.

## Comprobación manual

En la compilación de producción local, se abrió la portada y `/cuidados.html`, se enfocó “Saltar al contenido” y se pulsó Enter. En ambas páginas `document.activeElement` fue `MAIN#contenido`; el título inicial mostró el indicador y el contenedor principal no dibujó el marco extenso.

Repetí la comprobación en cada página después de cambiar la cabecera o el orden del HTML. En la vista previa local también recorrí el carrito con Tab y Shift+Tab, lo cerré con Escape y comprobé que el foco vuelva a «Abrir pedido». Al eliminar el último producto, el foco llega a «Volver al catálogo». Esto comprueba estas interacciones concretas; no sustituye una auditoría WCAG completa ni las pruebas con lectores de pantalla.

En una revisión posterior, recorrí la página con Tab hasta «Leer la guía de cuidados». El borde lima se vio con claridad sobre el fondo verde oscuro; la compilación publicada por Netlify contiene la misma regla CSS. El flujo CI de ese commit finalizó correctamente. Esta evidencia cubre el control y el fondo revisados, no todos los estados ni todas las combinaciones de contraste.

En la compilación local del 25 de noviembre de 2026, el filtro «Combos y promos» cambió el anuncio accesible de ocho a dos plantas; una búsqueda sin coincidencias anunció «No se encontraron plantas». En el carrito vacío, Shift+Tab y Tab recorrieron solo los controles del diálogo, Escape lo cerró y el foco volvió al botón «Mi pedido». En `/cuidados.html`, el enlace «Saltar al contenido» recibió foco, Enter movió el fragmento a `#contenido` y el indicador quedó sobre el título principal. La región de resultados es visualmente oculta y no mueve el foco.

## Indicadores de foco y contraste

Durante la revisión visual encontré que el borde de foco del menú de cuenta era demasiado tenue y que algunos textos secundarios no alcanzaban el contraste AA para texto normal. Centralicé esos tonos en `--color-muted` (`#5f7163`) y usé el naranja de marca para el foco de la cuenta y del campo de búsqueda. En la sección verde oscura el naranja solo alcanzaba 2.69:1, por eso los controles de esa sección usan un borde lima, con 7.54:1 de contraste.

En los fondos claros de la tienda (`#fbf9f0`, `#fffefb` y `#fff`), `#5f7163` ofrece una relación de contraste mínima de 4.94:1; el foco naranja (`#ed5736`) sobre el fondo papel ofrece 3.31:1. Se corrigieron etiquetas, placeholders, datos secundarios de producto, notas del carrito y enlaces auxiliares que usaban tonos con menor contraste. El criterio AA para texto normal pide al menos 4.5:1; los elementos gráficos de foco requieren una señal perceptible con contraste suficiente.

Esta comprobación cubre combinaciones identificadas en estos dos fondos claros y no equivale a una auditoría de contraste de todos los estados, fotografías, fondos translúcidos o combinaciones del sitio.

## Práctica guiada

1. Presiona Tab desde el inicio y localiza el enlace de salto.
2. Pulsa Enter y comprueba que el foco pase al contenido; usa Tab una vez más para continuar hacia el primer control de contenido.
3. Repite en la portada y en la guía.
4. Abre el carrito con teclado y comprueba su retorno de foco al cerrar, usando la [lección del sistema visual](LESSON_10_VISUAL_SYSTEM.md) para revisar el estilo de foco.
5. Cambia un filtro y escribe en la búsqueda; confirma que el anuncio de resultados cambia sin robar el foco del control.

## Preguntas de repaso

1. ¿Por qué el destino usa `tabindex="-1"` en vez de `tabindex="0"`?
2. ¿Qué evidencia diferencia que cambie el fragmento de URL de que se haya movido el foco?
3. ¿Qué otras pruebas harías antes de afirmar conformidad WCAG?
