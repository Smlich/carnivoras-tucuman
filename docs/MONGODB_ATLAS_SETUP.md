# Configurar MongoDB Atlas para desarrollo

Esta guía conecta el API Express de Carnívoras Tucumán a una base remota. La URI contiene credenciales: guárdala solo en el archivo `.env` local, que Git ignora.

## Estado del proyecto

El entorno de desarrollo actual usa el proyecto Atlas **Carnivoras Tucuman** y el clúster Free **CarnivorasTucuman** en AWS `SA_EAST_1` (São Paulo). El API Express ya conecta a `carnivoras_tucuman`, el seed cargó ocho productos y `/api/health` confirma `database: connected`. La URI y la contraseña del usuario de aplicación permanecen en `.env`; los ejemplos de esta guía sirven para reconstruir la conexión en otro equipo.

## 1. Crear el clúster

1. Crea una cuenta e inicia sesión en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
2. Crea un proyecto para Carnívoras Tucumán y despliega un clúster Free para desarrollo.
3. Elige una región cercana a Tucumán cuando esté disponible.

Atlas ofrece clústeres Free para aprendizaje y prototipos. Consulta la disponibilidad y condiciones vigentes en la [guía oficial para desplegar un clúster Free](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/).

## 2. Crear un usuario de base de datos

1. En **Security → Database Access**, crea un usuario dedicado a la aplicación.
2. Genera una contraseña larga y única. No reutilices la contraseña de tu cuenta de Atlas.
3. Para desarrollo, limita sus permisos a lectura y escritura en la base que use esta aplicación. No uses el usuario administrativo de Atlas en la aplicación.

El usuario de base de datos es distinto del usuario con el que inicias sesión en el panel de Atlas.

## 3. Permitir la conexión de desarrollo

1. En **Security → Network Access**, añade la IP pública actual de tu computadora.
2. No habilites el acceso desde todas las direcciones (`0.0.0.0/0`).
3. Si cambia tu IP, actualiza la lista. En un despliegue, habrá que permitir la IP de salida del servidor.

Atlas requiere un usuario de base de datos y una entrada de IP permitida antes de aceptar la conexión. Consulta [configurar la lista de acceso IP](https://www.mongodb.com/docs/atlas/security/ip-access-list/).

## 4. Guardar la URI localmente

1. En **Database → Clusters**, pulsa **Connect → Drivers**.
2. Selecciona **Node.js** y copia la URI que genera Atlas.
3. En la raíz del proyecto, copia `.env.example` a `.env`.
4. Pega la URI en `MONGODB_URI` dentro de `.env`. Conserva el formato generado por Atlas; reemplaza el marcador de contraseña. Si la contraseña contiene símbolos reservados, codifícala para URL.
5. No pegues la URI en esta conversación, capturas públicas, README, código del frontend ni commits.

La base del proyecto se llama `carnivoras_tucuman`; `MONGODB_DATABASE` ya queda indicado en `.env.example`. Para habilitar cuentas sociales, configura también las variables de Better Auth y los proveedores siguiendo [la guía de autenticación](AUTHENTICATION.md).

La URI `mongodb+srv://` es la que Atlas entrega normalmente para la conexión de una aplicación. Consulta [conectar una aplicación a un clúster](https://www.mongodb.com/docs/atlas/driver-connection/) y [conectar con el driver de Node.js](https://www.mongodb.com/docs/drivers/node/current/get-started/).

## 5. Cargar y comprobar el catálogo

Desde la raíz del proyecto, en PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
npm run seed:products
npm run dev:all
```

Si ya habías creado `.env`, no vuelvas a copiarlo encima; edítalo para evitar reemplazar tu URI.

Abre `http://127.0.0.1:4000/api/health`. Una conexión correcta debe informar que la base de datos está conectada y que el catálogo usa MongoDB. La API del catálogo responde en `http://127.0.0.1:4000/api/products` y el frontend en `http://localhost:5173`.

El script `npm run seed:products` crea o actualiza los ocho productos iniciales y es seguro volver a ejecutarlo para sincronizar esos mismos productos. Las cantidades de stock siguen siendo “consultar disponibilidad”; la carga no inventa inventario.

## Si la conexión falla

- Revisa que la IP actual esté en la lista de acceso de Atlas.
- Confirma que usaste el usuario de base de datos, no el usuario del panel.
- Comprueba que la contraseña de la URI esté codificada para URL si contiene símbolos reservados.
- Vuelve a copiar la URI desde **Connect → Drivers** y confirma que `.env` está en la raíz del proyecto.
- No compartas el contenido de `.env` en un issue ni en el repositorio.

## Preguntas de repaso

1. ¿Qué diferencia hay entre una cuenta de Atlas y el usuario de base de datos?
2. ¿Por qué permitimos la IP de desarrollo en lugar de abrir el clúster a todo Internet?
3. ¿Qué evita que la URI llegue al bundle público de React?
