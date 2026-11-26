# SEO local y redes sociales

La meta es que las personas encuentren el vivero cuando buscan plantas carnívoras y cuidados en Tucumán, y que el contenido de redes las lleve a páginas útiles del sitio. Ningún canal puede garantizar por sí solo un lugar determinado en los resultados; Google describe sus sistemas de ranking como una combinación de señales y sistemas.

## Base ya incluida

- Título y descripción en español para cada una de las páginas públicas (`index.html`, `catalogo.html`, `vivero.html`, `cuidados.html`, `juegos.html`, `contacto.html`, `privacidad.html`, `terminos.html`) y `noindex, nofollow` en `admin.html` y `404.html`.
- URL canónica de cada página, metadatos Open Graph y tarjetas de X (`twitter:*`) con `og:image:alt` y `twitter:image:alt` para las fotografías reales.
- `robots.txt` permite el rastreo público, bloquea `/admin`, `/admin.html` y `/api/`, y apunta al `sitemap.xml` con las páginas públicas.
- Datos estructurados JSON-LD: `GardenStore` en portada, `ContactPage` en contacto, `BreadcrumbList` en todas las páginas públicas y `FAQPage` en `/cuidados.html`.
- Páginas legales iniciales en `/privacidad.html` y `/terminos.html` (con marcas `[Pendiente de completar]` para los datos comerciales que faltan).
- Secciones enlazables para catálogo y contacto, más la página propia `/cuidados.html`.
- La guía de cuidados tiene HTML semántico, título y descripción propios y metadatos Open Graph para compartir.
- Texto real del negocio y de sus especies, evitando contenido genérico.
- Fotos reales del catálogo, sin reemplazarlas por imágenes generadas.
- Página responsive y enlace de contacto directo.
- Enlaces a la cuenta oficial de Instagram (`@carnivoras_tucuman`) desde el contacto y el pie de página, más referencia `sameAs` en los datos estructurados de la tienda.
- Consejos iniciales de agua, luz, sustrato y reposo con enlaces a guías de la International Carnivorous Plant Society y del U.S. Botanic Garden. La guía advierte cuándo una recomendación solo aplica a una especie determinada.

## Antes de publicar

- Al elegir el dominio final, reemplazar la URL de Netlify en canonical, Open Graph, Twitter, JSON-LD, `robots.txt` y `sitemap.xml`.
- Crear páginas por especie o producto cuando los datos se confirmen.
- Mantener precio, disponibilidad, tamaño, envío y promociones sincronizados con el catálogo real.
- Completar los datos pendientes en `/privacidad.html` y `/terminos.html` (razón social/email y zonas/costos de entrega).
- Enviar un sitemap a Search Console una vez publicado el dominio.
- Confirmar que `@carnivoras_tucuman` siga siendo la cuenta oficial y vincular Facebook si el negocio abre o confirma esa cuenta.

## Contenido para redes

Cada publicación puede responder una pregunta concreta: cómo regar una especie, qué luz necesita, cómo se adapta a un ambiente nuevo, cómo se prepara un envío o qué diferencia hay entre dos cultivares. Vincula la publicación con la página específica del sitio cuando exista. Reutiliza fotos autorizadas y la misma información de precio y disponibilidad; evita promesas de stock o cuidados que no hayas confirmado.

Usa el [plan del primer mes](CONTENT_PLAN.md) para trabajar con una cadencia sostenible, medir consultas y conservar la fidelidad de las fotos/precios. No todas las piezas deben vender: alterna catálogo, educación y preguntas frecuentes.

Antes de crear una ficha de Google Business Profile, comprueba que el negocio sea elegible según las reglas oficiales; no todos los negocios solo en línea pueden crearla. El criterio principal incluye contacto presencial con clientes durante el horario indicado.

## Datos estructurados

La primera entrega no agrega marcado Product/Offer: el catálogo no tiene URLs individuales, el stock no está confirmado y el pedido se termina de coordinar por WhatsApp. Cuando existan páginas de producto y datos comerciales vigentes, revisaremos los requisitos de Google para resultados de comerciantes y probaremos la implementación en Search Console. El marcado ayuda a interpretar datos, pero no garantiza un resultado enriquecido.

## Fuentes oficiales

- [Google Search Central: sistemas de ranking](https://developers.google.com/search/docs/appearance/ranking-systems-guide)
- [Google Search Central: datos estructurados Product](https://developers.google.com/search/docs/appearance/structured-data/product)
- [Google Search Central: datos para fichas de comerciantes](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing)
- [ICPS: guía de Dionaea muscipula](https://www.carnivorousplants.org/sites/default/files/files/TeacherResources/ICPS_IG_Dionaea_muscipula.pdf)
- [ICPS: guía de Drosera capensis](https://www.carnivorousplants.org/sites/default/files/files/TeacherResources/ICPS_IG_Drosera_capensis.pdf)
- [ICPS: guía de Sarracenia purpurea](https://carnivorousplants.org/sites/default/files/files/TeacherResources/ICPS_IG_Sarracenia_purpurea.pdf)
- [U.S. Botanic Garden: cultivar plantas carnívoras](https://www.usbg.gov/gardens-plants/cultivating-carnivorous-plants)
