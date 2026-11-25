# Lección 08 — Una guía indexable con Vite

## Objetivo

Entender cómo publicar una segunda página que tenga una dirección propia para compartir, HTML con contenido legible desde la primera respuesta y metadatos independientes, manteniendo la tienda React existente.

## Qué construimos

- `cuidados.html` contiene el texto, la navegación y los metadatos sociales de la guía.
- `src/care-page.css` aplica estilos responsivos y reutiliza las variables y componentes visuales globales.
- `vite.config.js` configura `index.html` y `cuidados.html` como entradas de la compilación multipágina.
- La portada enlaza `/cuidados.html` desde su navegación y desde la sección de cuidados.

La guía es informativa y no necesita carrito, estado de sesión ni eventos de React. Por eso el HTML estático evita cargar JavaScript de aplicación en esa página. La tienda continúa usando React. Este patrón no sustituye renderizado de servidor para futuras páginas dinámicas, pero es suficiente para este contenido editorial.

## Conceptos para explicar

1. **HTML semántico:** `main`, `nav`, `article`, `section`, `details` y encabezados describen el propósito del contenido y permiten navegar con tecnologías de asistencia.
2. **Metadatos por página:** el `<title>`, la descripción y Open Graph ayudan a identificar la guía al compartirla. La URL canonical y el sitemap esperan a que el negocio defina su dominio público.
3. **Entradas múltiples de Vite:** durante desarrollo, el archivo HTML se abre directamente. Durante producción, Vite procesa cada entrada y actualiza sus referencias a CSS.
4. **Fuentes y alcance:** las guías enlazadas de ICPS son específicas de especie. El documento de Sarracenia que citamos describe *S. purpurea*; no lo presentamos como instrucciones exactas para cualquier Sarracenia.
5. **Fotos fieles:** la guía no muestra una planta como si representara todos los cuidados ni reutiliza una publicación con precios que pueden haber cambiado.

## Recorrido de aprendizaje

1. Abre `cuidados.html` y localiza el título, la descripción, la navegación y las secciones.
2. En `vite.config.js`, identifica las dos rutas dadas a `rolldownOptions.input`.
3. Abre `/cuidados.html` mientras Vite está en desarrollo y compara el código fuente de la página con la portada React.
4. Ejecuta `npm run build` y verifica que `dist/cuidados.html` exista junto a `dist/index.html`.
5. Si cambia el dominio, agrega la canonical absoluta, las URL públicas de Open Graph y una entrada absoluta para el sitemap.

## Fuentes

- [Vite — Multi-Page App](https://vite.dev/guide/build.html#multi-page-app)
- [U.S. Botanic Garden — Cultivating Carnivorous Plants](https://www.usbg.gov/gardens-plants/cultivating-carnivorous-plants)
- [ICPS — Dionaea muscipula](https://www.carnivorousplants.org/sites/default/files/files/TeacherResources/ICPS_IG_Dionaea_muscipula.pdf)
- [ICPS — Drosera capensis](https://www.carnivorousplants.org/sites/default/files/files/TeacherResources/ICPS_IG_Drosera_capensis.pdf)
- [ICPS — Sarracenia purpurea](https://carnivorousplants.org/sites/default/files/files/TeacherResources/ICPS_IG_Sarracenia_purpurea.pdf)
