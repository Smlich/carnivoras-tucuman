# Integrar un juego de Google AI Studio

La web ya tiene una sección **Zona de juegos gratis** (`#juegos`). Está preparada para mostrar juegos solo a quienes inician sesión con Google. Hoy muestra el juego `vivero-carnivoro` como «Próximamente»; cuando esté listo, solo hay que publicarlo y cambiar su estado.

## Cómo funciona

```text
Visitante → botón «Iniciar sesión con Google» (Better Auth)
          → React pide GET /api/games (con la cookie de sesión)
          → Express verifica la sesión en el servidor (401 si no hay)
          → React muestra los juegos y, si están «playable», los abre en un iframe
```

- El registro de juegos vive en `src/data/games.js` y lo comparten React y Express.
- La ruta `GET /api/games` y `GET /api/games/:slug` exigen sesión (`server/src/middleware/require-auth.js`). Sin base de datos o sin Google configurado responde `503`; sin sesión, `401`.
- La sección solo se activa con el sitio completo (Express + Atlas + Google). En la vista estática de Netlify muestra la tarjeta «Próximamente» sin pedir nada.

## Publicar un juego

1. Exportá o compilá el juego desde Google AI Studio como una carpeta web estática (HTML, JS y recursos).
2. Copiá esa carpeta en `public/games/<slug>/` (por ejemplo `public/games/vivero-carnivoro/index.html`).
3. En `src/data/games.js` cambiá la entrada del juego:

   ```js
   status: 'playable',
   embedUrl: '/games/vivero-carnivoro/index.html',
   ```

4. Probalo en local con `npm run dev:all`, iniciá sesión con Google y abrí `http://localhost:5173/#juegos`.

La política de seguridad de Express ya permite incrustar contenido del mismo sitio (`frame-src 'self'`). Si el juego se aloja en otro dominio, hay que agregar ese dominio a `frame-src` en `server/src/app.js` y usarlo en `embedUrl`.

> [!IMPORTANT]
> Los archivos de `public/games/` se pueden descargar directamente por URL. Esta protección oculta y desbloquea la sección, pero no impide que alguien con el enlace exacto abra los archivos. Si el juego fuera de pago o secreto, habría que servirlo detrás de una ruta de Express que verifique la sesión.

## Claves de Gemini

Si el juego llama a la API de Gemini, **nunca** dejes la clave dentro del código del juego: cualquiera podría copiarla desde el navegador. Guardala en `.env` (por ejemplo `GEMINI_API_KEY`), llamala desde una ruta de Express protegida con `createRequireAuth` y que el juego use esa ruta. Verificá antes los límites y costos de la API; este proyecto mantiene la etapa en planes gratuitos.

## Datos que faltan

- El nombre final, la descripción y las imágenes del juego.
- Cómo se exporta el juego desde Google AI Studio (carpeta estática o enlace compartido) para decidir entre `public/games/` y un `embedUrl` externo.
- Si, además de Google, querés exigir otra condición (por ejemplo, correo verificado, que ya se exige en Better Auth).
