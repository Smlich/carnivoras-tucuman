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

## Comprobación manual

En la compilación de producción local, se abrió la portada y `/cuidados.html`, se enfocó “Saltar al contenido” y se pulsó Enter. En ambas páginas `document.activeElement` fue `MAIN#contenido`; el título inicial mostró el indicador y el contenedor principal no dibujó el marco extenso.

Repetí la comprobación en cada página después de cambiar la cabecera o el orden del HTML. Esto verifica el enlace de salto; no sustituye una auditoría WCAG completa ni las pruebas con lectores de pantalla.

## Práctica guiada

1. Presiona Tab desde el inicio y localiza el enlace de salto.
2. Pulsa Enter y comprueba que el foco pase al contenido; usa Tab una vez más para continuar hacia el primer control de contenido.
3. Repite en la portada y en la guía.
4. Abre el carrito con teclado y comprueba su retorno de foco al cerrar, usando la [lección del sistema visual](LESSON_10_VISUAL_SYSTEM.md) para revisar el estilo de foco.

## Preguntas de repaso

1. ¿Por qué el destino usa `tabindex="-1"` en vez de `tabindex="0"`?
2. ¿Qué evidencia diferencia que cambie el fragmento de URL de que se haya movido el foco?
3. ¿Qué otras pruebas harías antes de afirmar conformidad WCAG?
