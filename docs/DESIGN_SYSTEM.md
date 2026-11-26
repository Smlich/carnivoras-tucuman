# Sistema visual — Selva Pantanosa × Laboratorio Botánico

Esta guía documenta la estética de **Carnívoras Tucumán** para mantener coherencia entre la tienda, la zona de juegos y la guía ilustrada de cuidados.

## Dirección visual

La interfaz combina el ambiente oscuro, húmedo y selvático de las turberas con la precisión gráfica de un herbario o estación botánica juvenil, usando directamente los pigmentos vivos observados en las fotos reales del vivero.

## Tipografía

| Uso | Familia | Rol |
| --- | --- | --- |
| Titulares y precios | `Bricolage Grotesque` | Encabezados expresivos, modernos y con carácter juvenil. |
| Acento en cursiva | `Fraunces` | Una palabra clave en cursiva por titular para contraste editorial. |
| Lectura e interfaz | `Plus Jakarta Sans` | Párrafos, fichas, navegación y controles táctiles legibles en cualquier pantalla. |
| Etiquetas científicas | `JetBrains Mono` | Códigos de espécimen (`CT-01`), coordenadas, nombres latinos y métricas (`< 50 PPM`). |

## Paleta inspirada en las plantas reales

| Token CSS | Valor | Origen botánico y uso |
| --- | --- | --- |
| `--bog-abyss` | `#051610` | Sombra profunda de selva; hero, diagrama, tarjetas de juegos y footer. |
| `--bog-canopy` | `#0b261c` | Dosel húmedo del vivero; fondos degradados oscuros. |
| `--paper` | `#f4f5eb` | Papel de herbario cálido para catálogo, álbum y guía. |
| `--surface` | `#fffef9` | Tarjetas claras de alto contraste. |
| `--lime` | `#b7f43e` | Verde neón de *Nepenthes* (`jarro-con-gotas`); CTA principal y acento en fondos oscuros. |
| `--lime-deep` | `#1e7a3c` | Verde hoja para texto y enlaces accesibles sobre fondo claro. |
| `--crimson` / `--crimson-text` | `#e04036` / `#b42620` | Rojo vivo del interior de *Dionaea muscipula* (`venus-trampa-macro`); insignias Venus y foco en fondo claro. |
| `--ruby` | `#8f1d2c` | Carmesí profundo de *Sarracenia* y *Nepenthes Bloody Mary*. |
| `--orchid` / `--orchid-text` | `#df86f7` / `#7e2a96` | Lila floral de *Pinguicula* (`flor-carnivora-vivero`) y *Drosera*. |
| `--dew` | `#f5c842` | Brillo ámbar de las gotas de *Drosera* y polen. |
| `--water` | `#56e0cc` | Agua pura de lluvia / capilaridad en el diagrama de riego. |

## Recursos gráficos botánicos (`public/images/botanical/`)

- `hanging-pitcher-vine.svg`: liana colgante con trampas de jarro.
- `drosera-bloom.svg`: flor de cinco pétalos inspirada en la floración del vivero.
- `venus-trap-specimen.svg`: ilustración científica de *Dionaea muscipula* con dientes y pelos sensitivos.
- `swamp-water-tray.svg`: esquema transversal didáctico del método de la bandeja y capilaridad.

## Responsive y accesibilidad

- En pantallas de hasta `860 px`, la barra de navegación pasa a una segunda fila deslizable con todos los enlaces visibles (`Catálogo`, `Vivero`, `Cuidados`, `Juegos`, `Contacto`) sin ocultar secciones ni provocar desbordamiento horizontal.
- Los textos secundarios mantienen tamaño legible (mínimo `11 px` en etiquetas monoespaciadas breves y `14–16 px` en lectura) y los controles interactivos del carrito tienen área táctil de al menos `36 × 36 px`.
- Todas las animaciones respetan `prefers-reduced-motion: reduce`.
