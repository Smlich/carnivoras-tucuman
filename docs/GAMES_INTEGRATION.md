# Integrar un juego en Zona de juegos gratis

La sección **Zona de juegos gratis** (`/juegos.html`) permite jugar gratis a clientes autenticados con Google y activa un **Modo Administrador** exclusivo cuando estás logueado como administrador (tanto en Netlify `/admin.html` como en Express MERN).

## Dionaea Strike integrado directamente en el código fuente

El juego principal **Dionaea Strike** vive compilado y editable directamente dentro de este repositorio:
- Código fuente React/Canvas 2D + TypeScript: `src/games/dionaea-strike/` (`components/`, `game/`, `assets/images/`, `dionaea.css`, `dionaea-embed.ts`).
- Pistas musicales `.m4a`: `public/assets/aistudio/`.
- Entrada aislada en Vite (para no mezclar Tailwind CSS con la tienda): [jugar-dionaea.html](jugar-dionaea.html) y [src/pages/jugar-dionaea-main.jsx](src/pages/jugar-dionaea-main.jsx).
- Verificación de tipos y reglas de fusión: `npm run lint:game` y `npm test`.

### Regla estricta de Modo Administrador
- En [jugar-dionaea-main.jsx](src/pages/jugar-dionaea-main.jsx), `isAdmin` se obtiene **exclusivamente** de `useAuth()` tras verificar la sesión real del servidor (`/api/admin/auth/session`).
- Parámetros de URL como `?admin=1` no tienen efecto para visitantes ni clientes.
- Cuando iniciás con tu cuenta de administrador, aparece el botón **Administrar** dentro del juego y al guardar cambios se persisten en `PUT /api/admin/games/dionaea-strike/config` para todos los jugadores (`GET /api/games/dionaea-strike/config`). Los puntajes de partida se registran con `POST /api/games/dionaea-strike/scores`.

## Compatibilidad con juegos externos por `<iframe>` (`postMessage`)

## Cómo se comunica con tu juego (Jugador vs Administrador)

Cuando un usuario abre el juego desde `/juegos.html`:

1. **Parámetros en la URL del `<iframe>`:**
   - Para jugadores normales: `?role=player&isAdmin=0&player=<nombre>`
   - Para el administrador: `?role=admin&isAdmin=1&player=<nombre>&adminProps=<JSON>`
2. **Mensaje seguro `window.postMessage`:**
   - Al cargar el `<iframe>` (o cuando tu juego envíe `window.parent.postMessage({ type: 'CARNIVORAS_REQUEST_CONTEXT' }, '*')`), la página responde con:

```json
{
  "type": "CARNIVORAS_PLAYER_CONTEXT",
  "version": 1,
  "role": "admin",
  "isAdmin": true,
  "playerName": "Administrador",
  "gameSlug": "vivero-carnivoro",
  "adminProps": {
    "adminMode": true,
    "debugTools": true,
    "unlockAll": true
  }
}
```

> Para visitantes y jugadores normales, el backend omite `adminEmbedUrl` y siempre entrega `role: "player"`, `isAdmin: false` y `adminProps: {}`. Además oculta los juegos en estado `admin-only`.

## Fragmento listo para pegar en tu juego (Google AI Studio)

```js
// 1) Lectura inicial por URL (?role=admin&isAdmin=1&adminProps=...)
const params = new URLSearchParams(window.location.search);
let gameContext = {
  role: params.get('role') || 'player',
  isAdmin: params.get('isAdmin') === '1',
  playerName: params.get('player') || 'Jugador',
  adminProps: (() => {
    try { return JSON.parse(params.get('adminProps') || '{}'); } catch { return {}; }
  })(),
};

// 2) Escuchar actualización / respuesta por postMessage desde Carnívoras Tucumán
window.addEventListener('message', (event) => {
  if (event.data?.type !== 'CARNIVORAS_PLAYER_CONTEXT') return;
  gameContext = event.data;
  if (gameContext.isAdmin) {
    // Activá paneles de prueba, niveles desbloqueados o controles de admin aquí
    console.info('Modo Admin activado:', gameContext.adminProps);
  }
});

// 3) Avisar al sitio padre que el juego ya está listo para recibir el contexto
if (window.parent !== window) {
  window.parent.postMessage({ type: 'CARNIVORAS_REQUEST_CONTEXT' }, '*');
}
```

## Publicar o configurar sin tocar código desde `/admin.html`

1. Iniciá sesión en `/admin.html`.
2. Entrá a la pestaña **Juegos**.
3. Cargá `embedUrl` (por ejemplo `/games/vivero-carnivoro/index.html` o una URL HTTPS publicada), elegí estado `admin-only` (para probar primero solo con tu cuenta) o `playable`, y ajustá las claves en **Propiedades del modo Administrador**.
4. Pulsá **Probar en `/juegos.html`** para validar ambos modos al instante.
