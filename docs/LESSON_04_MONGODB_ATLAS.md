# Lección 4 — Conectar la aplicación con MongoDB Atlas

## Objetivo

Conectar Express a Atlas, explicar qué permite el acceso y comprobar que el catálogo que ves viene de MongoDB. La práctica usa datos de demostración del proyecto; no cargues productos reales hasta revisar precios y disponibilidad.

## Cuatro piezas distintas

- **Proyecto y clúster Atlas:** el espacio administrado donde vive la base de datos.
- **Lista de acceso IP:** decide desde qué redes puede llegar una conexión al clúster.
- **Usuario de base de datos:** autentica a la aplicación y recibe permisos sobre una base. No es tu cuenta del panel de Atlas.
- **URI de conexión:** identifica el clúster e incluye las credenciales del usuario de base de datos.

Atlas exige tanto un usuario de base de datos como una IP autorizada antes de aceptar una conexión. Mantén la lista limitada a la IP de desarrollo y usa un usuario de aplicación con permisos mínimos. No abras el clúster a `0.0.0.0/0` para resolver una conexión fallida ([seguridad de Atlas](https://www.mongodb.com/docs/atlas/setup-cluster-security/), [lista de acceso IP](https://www.mongodb.com/docs/atlas/security/ip-access-list/)).

## Preparación local

1. Sigue [la guía paso a paso de Atlas](MONGODB_ATLAS_SETUP.md) para crear un clúster Free de aprendizaje, un usuario de base de datos y una entrada IP limitada.
2. Copia `.env.example` a `.env` solo si `.env` todavía no existe.
3. Pega en `MONGODB_URI` la URI de **Connect → Drivers**; conserva el formato de Atlas y reemplaza únicamente el marcador de contraseña.
4. Conserva `MONGODB_DATABASE=carnivoras_tucuman`. En `server/src/config/database.js`, Mongoose recibe ese nombre por la opción `dbName`.
5. No pegues la URI en el navegador, en un issue público ni en este chat. `.env` está excluido de Git.

Si la contraseña tiene caracteres reservados (`$ : / ? # [ ] @`), deben codificarse para URL. La guía del driver explica cuáles son y cómo hacerlo; en esa máquina no uses una página de terceros para codificar una contraseña ([errores de conexión del driver](https://www.mongodb.com/docs/drivers/node/current/connect/connection-troubleshooting/)).

## Sembrar y verificar

Desde la raíz del repo, abre una terminal PowerShell:

```powershell
npm run seed:products
npm run dev:all
```

El primer comando escribe en Atlas ocho productos de ejemplo con `stockStatus: ask`; usa `upsert` por `slug`, no elimina otros productos y puede repetirse para sincronizar esos ocho registros. Revisa [el catálogo transcrito](CATALOG.md) antes de tomarlo como inventario comercial actual.

Comprueba el recorrido:

1. `GET http://127.0.0.1:4000/api/health` debe mostrar `status: ok`, `database: connected` y `catalogMode: mongodb`.
2. `GET http://127.0.0.1:4000/api/products` debe devolver `meta.source: mongodb` y ocho productos.
3. La web debe seguir cargando las fotos locales del catálogo. La base guarda la ruta de imagen, no una copia de los archivos.
4. `GET http://127.0.0.1:4000/api/auth/status` puede seguir devolviendo `enabled: false`; Atlas solo no habilita OAuth. Google/Facebook también requieren sus credenciales y el secreto de Better Auth.

## Cómo leer la conexión en el código

`connectDatabase()` devuelve `false` si falta `MONGODB_URI` en desarrollo; así el API conserva el catálogo demo. Si existe una URI, espera a `mongoose.connect()` con `dbName` y un tiempo máximo de selección de servidor de cinco segundos. Después, `isDatabaseConnected()` consulta `mongoose.connection.readyState`; la ruta de productos decide entonces entre demo y MongoDB.

Mongoose documenta que `dbName` selecciona la base y puede sustituir el nombre incluido en la URI ([conexiones de Mongoose](https://mongoosejs.com/docs/connections.html)). Esta separación mantiene la base elegida en configuración, no duplicada dentro del código.

## Diagnóstico sin exponer secretos

- **Tiempo de espera:** revisa la lista IP, la conexión a Internet y que el clúster figure como disponible.
- **Autenticación fallida:** confirma el usuario de base de datos y la contraseña; no uses tu cuenta de Atlas.
- **La contraseña incluye símbolos:** vuelve a codificar solo el valor de contraseña para URL, sin codificar dos veces toda la URI.
- **El seed escribe, pero la API no muestra los datos:** revisa `database` en `/api/health`, el nombre de base y que API y seed hayan leído el mismo `.env`.
- **La app arranca en modo demo:** busca el mensaje de conexión en la terminal y confirma que `.env` esté en la raíz del proyecto. No copies su contenido a un registro o captura.

## Práctica y repaso

1. Dibuja qué hace la lista IP y qué hace el usuario de base de datos. ¿Por qué hacen falta ambos?
2. Busca `dbName` en `database.js`. ¿Qué parte controla la base y qué parte controla el clúster?
3. Ejecuta el seed dos veces y explica por qué no duplica esos ocho productos.
4. Compara `meta.source` antes y después de conectar Atlas.
5. Si la conexión falla, informa solo el mensaje de error saneado y los tres campos del endpoint de salud; nunca compartas la URI.

## Patrón reutilizable

Para otro proyecto MERN, conserva esta secuencia: variables privadas validadas al inicio → conexión única del backend → modelos con restricciones → seed idempotente → endpoint de salud sin secretos → modo demo solo en desarrollo. En producción exige persistencia real y permisos mínimos.
