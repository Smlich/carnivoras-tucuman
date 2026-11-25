# Lección 15 — Contador compartido con Netlify Blobs

## Objetivo

Aprender a extender un sitio estático con una función pequeña y persistencia compartida, sin desplegar todavía toda la API MERN ni recopilar datos personales.

## Qué ve cada parte

```text
Navegador ── POST /.netlify/functions/visit-counter ──> Netlify Function
    │                                                   │
    └── sessionStorage por pestaña                      └── Netlify Blobs
                                                         total { count }
```

- `netlify.toml` indica dónde buscar las funciones.
- `netlify/functions/visit-counter.mjs` atiende `GET` para leer y `POST` para incrementar.
- `@netlify/blobs` guarda un solo valor agregado llamado `visits`.
- `public/visit-counter.js` llama a la función, formatea el número para Argentina y guarda en `sessionStorage` el resultado de esa sesión de pestaña.

## Cómo evita perder incrementos

Dos navegadores pueden leer el mismo valor a la vez. Cada función relee el registro con consistencia fuerte y escribe usando el ETag que recibió. Netlify acepta la actualización solo si el registro sigue teniendo ese ETag. Si otro incremento ganó la carrera, el intento se repite con el valor más reciente. La creación inicial también usa una condición para que dos primeras visitas no sobrescriban el contador.

Es un patrón de comparación y escritura condicional. Es útil para contadores pequeños; una aplicación con mucha concurrencia debe elegir una base diseñada para sus requisitos y observar límites, errores y costos.

## Qué significa “visita” aquí

El contador suma una vez por sesión de pestaña, no una vez por persona. Abrir una pestaña nueva puede volver a sumar. Bots y recargas con almacenamiento borrado también pueden alterar el total; no lo presentes como usuarios únicos ni como una medida comercial de precisión. El almacenamiento no persiste IP, correo, cuenta ni identificador de dispositivo.

## Desarrollo local y producción

`npm run dev` inicia Vite, que sirve la interfaz y no ejecuta la función. Por eso en localhost puede mostrarse “contador temporalmente no disponible”. Netlify CLI puede ejecutar el sitio y las Functions juntos con `netlify dev`; la instalación y vinculación de esa CLI depende del entorno local.

La versión desplegada en Netlify expone `/.netlify/functions/visit-counter`. El almacén es compartido entre deploys del sitio y no necesita una URI de Atlas. El endpoint público puede ser llamado directamente, así que el contador no es una barrera contra tráfico automatizado.

## Costos y operación

Netlify Blobs y Functions están sujetos al plan, su cuota y el uso del equipo. El plan Free basado en créditos tiene un límite estricto; al agotarse puede detener la publicación de los sitios del equipo hasta el siguiente ciclo. Revisa Usage & billing antes de compartir la web con más tráfico y deja desactivadas las recargas automáticas. [Uso de Functions](https://docs.netlify.com/build/functions/usage-and-billing/) · [Precios y créditos](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/) · [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/).

Si el contador falla, la interfaz mantiene un guion y comunica que no está disponible. No muestra un valor ficticio ni bloquea la tienda.

## Ejercicios para repetir el patrón

1. Cambia el texto de estado desde una función auxiliar y observa qué cambia en el DOM.
2. Explica por qué `sessionStorage` evita incrementar al navegar entre las páginas del mismo tab.
3. Simula dos peticiones simultáneas: identifica por qué hace falta volver a leer después de un ETag vencido.
4. Propón un límite de frecuencia si el contador empezara a recibir abuso; no guardes huellas de navegador para resolverlo.
5. En un proyecto propio, decide si el contador debe representar visitas, sesiones o usuarios autenticados y documenta la diferencia.

## Archivos de la lección

- [Función del contador](../netlify/functions/visit-counter.mjs)
- [Cliente del contador](../public/visit-counter.js)
- [Configuración Netlify](../netlify.toml)
- [Decisión técnica ADR-010](DECISIONS.md#adr-010--contador-agregado-sin-datos-personales)
- [Plan por etapas](ROADMAP.md#hito-05--contador-compartido-de-visitas)
