# Lección 6 — Integración continua con GitHub Actions

La integración continua comprueba que el código compila; no publica la web. El despliegue por etapas se estudia aparte en [la lección 09](LESSON_09_DEPLOYMENT_PATHS.md).

La primera ejecución de este repositorio terminó correctamente para Node 22, 24 y 26: [CI del commit f04fb7b](https://github.com/Smlich/carnivoras-tucuman/actions/runs/45595845180). La ejecución más reciente verificada, para `f7d385a`, terminó correctamente: [CI del commit f7d385a](https://github.com/Smlich/carnivoras-tucuman/actions/runs/45604158956). El build comprueba la instalación y compilación; no reemplaza pruebas de interfaz ni una revisión manual.

## Objetivo

Entender cómo GitHub obtiene el código, instala exactamente las dependencias bloqueadas y comprueba que el sitio todavía puede compilarse antes de integrar un cambio.

## Recorrido de `.github/workflows/ci.yml`

1. `name` da un nombre reconocible a la ejecución en la pestaña **Actions**.
2. `on` inicia el flujo al actualizar `main`, abrir o actualizar un pull request, o ejecutarlo manualmente.
3. `permissions: contents: read` limita el token automático del flujo a leer el repositorio; este build no necesita escribir en GitHub.
4. `jobs.build` ejecuta un trabajo aislado en una máquina administrada por GitHub con Linux.
5. `actions/checkout` descarga la revisión que GitHub debe compilar.
6. `actions/setup-node` instala cada versión LTS admitida (22, 24 y 26) según la matriz, y reutiliza la caché de npm basada en `package-lock.json`.
7. `npm ci` instala las versiones bloqueadas y falla si el manifiesto y el lockfile no coinciden.
8. `npm run build` compila el frontend para producción. Si el comando falla, el pull request mostrará el paso rojo y su log.

El workflow actual verifica la instalación y el build. Todavía no existen pruebas automatizadas en este proyecto; un build exitoso no comprueba por sí solo todos los flujos de compra, autenticación o accesibilidad.

## Práctica guiada

1. Abre `.github/workflows/ci.yml` y señala qué evento ejecutaría el flujo ante un pull request.
2. Explica por qué el job usa `npm ci` en lugar de cambiar automáticamente las versiones instaladas.
3. Comprueba las series LTS admitidas en `package.json` y relaciónalas con `matrix.node-version`.
4. Después de publicar el repositorio, crea una rama para un cambio pequeño de documentación y abre un pull request. Mira **Actions → Production build** y localiza cada comando en su log.
5. Si el build falla, identifica el primer paso rojo y relaciona el mensaje con el cambio; corrige el problema en la misma rama y actualiza el pull request.

No agregues secretos de Atlas ni OAuth a este workflow. El build del frontend no los necesita y GitHub puede mostrar sus logs a las personas con acceso al repositorio.

## Preguntas de repaso

1. ¿Qué diferencia hay entre `push` y `pull_request` en este flujo?
2. ¿Qué archivos determinan las versiones que instala `npm ci`?
3. ¿Qué cubre el build y qué queda pendiente de comprobar manualmente o con pruebas?
4. ¿Por qué el token de CI solo recibe permiso de lectura?

## Patrón reutilizable

Para otro proyecto Node, empieza con una verificación que pueda repetirse en cualquier equipo: checkout del commit → versión compatible de Node → instalación desde lockfile → build. Agrega pruebas automáticas cuando existan y ejecútalas como pasos explícitos; no llames “pruebas” a una compilación.

## Referencias oficiales

- [GitHub Actions: crear un flujo para Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)
- [actions/checkout](https://github.com/actions/checkout)
- [actions/setup-node](https://github.com/actions/setup-node)
