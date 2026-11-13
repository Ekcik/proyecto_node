# Proyecto final de Node.js y API REST — TechLab

En este trabajo desarrollé una API para administrar productos de una tienda. La preentrega era una aplicación de consola que consultaba FakeStore API. En esta etapa el servidor recibe peticiones HTTP con Express y guarda los productos en Firebase Firestore.

El objetivo es aplicar rutas, controladores, servicios, modelos y autenticación con JWT, manteniendo una organización que permita entender y probar cada parte. El proyecto utiliza JavaScript, ES Modules y `index.js` como punto de entrada.

La preentrega se conserva en la rama `main`. El trabajo final se realiza en `proyecto-final`, dentro del repositorio `proyecto_node`; el nombre de la carpeta local puede ser distinto. No hace falta modificar `main` para ejecutar esta versión.

## Instalación

Se necesita Node.js 22 o posterior y npm. Para usar la base de datos también se requiere un proyecto Firebase, credenciales de servidor y conexión a Internet.

```bash
git switch proyecto-final
npm ci
```

`npm ci` instala las versiones registradas en `package-lock.json`. Para ejecutar las pruebas simuladas no se necesitan Firebase ni un archivo `.env`:

```bash
npm test
```

## Dependencias

| Dependencia | Uso |
| --- | --- |
| `express` | Servidor HTTP y rutas. Se utiliza la versión 5, que deriva los errores de funciones `async` al middleware de errores. |
| `cors` | Permite configurar los orígenes de aplicaciones web. |
| `body-parser` | Interpreta cuerpos JSON, con un máximo de 16 KiB. |
| `dotenv` | Carga las variables de `.env`. |
| `firebase` | Se incluye por requisito de la consigna. El servidor accede a Firestore mediante Admin SDK. |
| `firebase-admin` | Conexión de servidor y operaciones reales en Firestore. |
| `jsonwebtoken` | Emisión y verificación de JWT. |
| `helmet` | Agrega cabeceras HTTP de seguridad. |
| `express-rate-limit` | Limita el login a 10 solicitudes por IP cada 15 minutos. |
| `supertest` (desarrollo) | Prueba los endpoints HTTP junto con `node:test`. |

Las contraseñas se procesan con `scrypt`, sal aleatoria y comparación de tiempo constante mediante `node:crypto`. No se agrega otra dependencia para esta tarea.

El `overrides` de npm fija `@grpc/grpc-js` en `1.14.7` dentro de `@firebase/firestore`: el paquete `firebase` arrastraba una versión vulnerable. Esta decisión queda registrada en el lockfile y debe revisarse al actualizar Firebase. Se puede consultar el [aviso de seguridad del proyecto gRPC](https://github.com/advisories/GHSA-m9gg-hp2v-232j). El SDK web de Firebase no participa en las peticiones de esta API.

## Configuración manual de Firebase

Para verificar el proyecto, configuré Firebase y utilicé una base de datos Firestore real. Las credenciales de la cuenta de servicio son privadas y no forman parte del repositorio. Mantengo los siguientes pasos para que otra persona pueda configurar su propio entorno.

1. Ingresar a la [consola de Firebase](https://console.firebase.google.com/) y crear un proyecto. Copiar su **ID de proyecto**, que puede diferir del nombre visible.
2. En **Firestore Database**, crear una base de datos de edición Standard, en modo nativo y con el identificador `(default)`. Elegir la ubicación y comenzar con acceso restringido, evitando reglas de modo de prueba abiertas.
3. En la pestaña de reglas, publicar el contenido de `firestore.rules`. Estas reglas niegan acceso directo desde SDK de cliente; las consultas públicas de esta entrega se realizan a través de Express.
4. Para preparar la primera colección desde la pestaña de datos, elegir **Iniciar colección**, escribir `products`, usar un **ID automático** y crear un documento con los campos de la tabla siguiente. No agregar un campo `id` al documento.
5. En **Configuración del proyecto → Cuentas de servicio → Firebase Admin SDK**, generar una clave privada JSON. Guardarla fuera del repositorio, por ejemplo en una carpeta personal `.config/techlab`. No copiar su contenido en archivos de código, capturas, mensajes o commits. Para una cuenta de servicio dedicada, otorgar permisos IAM de lectura y escritura en Firestore, por ejemplo `roles/datastore.user`, sin asignarle el rol Owner.
6. Completar `FIREBASE_PROJECT_ID` y `GOOGLE_APPLICATION_CREDENTIALS` en `.env` con el ID y la ruta absoluta de ese archivo. La aplicación comprueba que el JSON corresponde al mismo proyecto.

| Campo inicial | Tipo Firestore | Ejemplo de producto |
| --- | --- | --- |
| `title` | string | Cuaderno |
| `price` | number | 1250.50 |
| `category` | string | Librería |
| `description` | string | 80 hojas |

También se puede dejar la base vacía: el primer `POST /api/products/create` crea la colección y su documento. Las lecturas de una colección vacía devuelven `[]`.

El Admin SDK usa la cuenta de servicio y **omite las reglas de seguridad de Firestore**; por eso se controlan los permisos tanto con IAM como con los middlewares de Express. Este comportamiento se explica en la [documentación de seguridad de Firestore](https://firebase.google.com/docs/firestore/security/rules-conditions#authentication). El JWT de la API es propio y no es un token de Firebase Authentication.

## Variables de entorno y administrador

Copiar la plantilla, sin subir el archivo resultante a Git:

```powershell
Copy-Item .env.example .env
```

En Bash se puede usar `cp .env.example .env`. Completar los valores manualmente:

| Variable | Configuración |
| --- | --- |
| `PORT` | Opcional, predeterminado `3000`. Entero entre 1 y 65535. |
| `FIREBASE_PROJECT_ID` | Obligatorio. ID del proyecto Firebase. |
| `GOOGLE_APPLICATION_CREDENTIALS` | Obligatorio. Ruta al JSON de cuenta de servicio. En Windows conviene escribir `C:/Users/usuario/.config/techlab/service-account.json`. |
| `ADMIN_USERNAME` | Obligatorio. Usuario del administrador de demostración, máximo 100 caracteres. |
| `ADMIN_PASSWORD_HASH` | Obligatorio. Hash generado con el comando indicado debajo; nunca la contraseña en texto plano. |
| `JWT_SECRET` | Obligatorio. 32 bytes aleatorios representados como 64 caracteres hexadecimales. |
| `JWT_EXPIRES_IN_SECONDS` | Opcional. Entero entre 60 y 86400; predeterminado `3600` (una hora). |
| `CORS_ORIGINS` | Opcional. Orígenes HTTP/HTTPS separados por comas, sin ruta ni barra final, por ejemplo `http://localhost:5173`. Vacío no habilita acceso web entre orígenes diferentes. |

Para generar el hash, ejecutar en una terminal interactiva:

```bash
npm run password:hash
```

El comando pide una contraseña de 12 a 128 caracteres y su confirmación, con entrada oculta. Copiar a `.env` la línea `ADMIN_PASSWORD_HASH=...` que devuelve y conservar la contraseña fuera del repositorio. El formato es `scrypt:sal:hash`; los parámetros son N=16384, r=8, p=1 y salida de 64 bytes.

Para generar el secreto JWT, ejecutar localmente:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copiar el resultado a `JWT_SECRET`. Este resultado es un secreto y tampoco debe compartirse. Los valores vacíos de `.env.example` son intencionales: no existe un usuario ni una contraseña predeterminados.

`.gitignore` excluye `.env`, variantes de entorno, carpetas de credenciales, nombres habituales de claves JSON y claves PEM. Esto no reemplaza guardar los archivos sensibles fuera del repositorio ni revisar `git diff` antes de publicar. Si alguna clave se publica por accidente, hay que revocarla y reemplazarla.

## Ejecución

```bash
npm run start
```

Antes de escuchar peticiones, se validan las variables, se leen las credenciales y se consulta un documento de `products` para verificar el acceso. La comprobación de conexión tiene un límite de 15 segundos. Si falta configuración o falla Firebase, el proceso termina con código 1 y un mensaje general, sin imprimir claves ni errores internos del proveedor. No hay una base en memoria de reemplazo. El emulador de Firestore no está habilitado en este arranque.

Si el arranque es correcto, la terminal informa `API disponible en http://localhost:3000` (o el puerto elegido). `Ctrl+C` cierra el servidor y la conexión.

Ante problemas, revisar los nombres y formatos de la tabla anterior, que el JSON exista y pertenezca al proyecto indicado, que la base `(default)` esté creada y que la cuenta tenga permisos IAM. Revisar también la conexión a Internet y que el puerto esté libre. No pegar el contenido de credenciales o tokens para pedir ayuda.

## Organización

```text
index.js                         Arranque y cierre del servidor
src/
  app.js                         Configuración de Express y montaje de rutas
  config/env.js                  Validación de configuración
  config/firebase.js             Conexión real a Firestore
  routes/products.routes.js      Endpoints de productos
  routes/auth.routes.js          Endpoint de login y límite de intentos
  controllers/                   Lectura de la petición y respuesta HTTP
  services/                      Casos de uso de productos y autenticación
  models/products.model.js       Acceso a la colección products
  middlewares/                   JWT, permisos, rutas desconocidas y errores
  validators/                    Validación de productos e identificadores
  utils/                         Hash de contraseña y error HTTP
scripts/hash-password.js         Generador local de hash
test/                            Pruebas simuladas e integración real separada
docs/ejemplos-api.md              Ejemplos curl y PowerShell/Postman
firestore.rules                  Reglas para publicar manualmente en Firebase
```

Las rutas delegan en controladores; los controladores llaman a servicios; los servicios validan los datos y usan el modelo. El modelo concentra las operaciones de Firestore. `createApp` recibe el modelo como dependencia para que los tests puedan sustituirlo sin modificar el código de producción.

## Endpoints y datos

Base local: `http://localhost:3000`.

| Método | Ruta | Acceso | Resultado correcto |
| --- | --- | --- | --- |
| GET | `/api/products` o `/api/products/` | Público | `200`, array de productos |
| GET | `/api/products/:id` | Público | `200`, producto |
| POST | `/api/products/create` | Administrador | `201`, producto creado y cabecera `Location` |
| PUT | `/api/products/:id` | Administrador | `200`, producto actualizado |
| DELETE | `/api/products/:id` | Administrador | `204`, sin cuerpo |
| POST | `/api/auth/login` | Público, limitado por IP | `200`, token y duración |

En las rutas individuales, `:id` se reemplaza por el ID de documento devuelto por Firestore. Se interpreta así la barra final sin identificador de la transcripción de la consigna. `DELETE /api/products/` y `PUT /api/products/` devuelven 404: la API no elimina ni actualiza toda la colección. Los IDs son textos y se deben codificar en la URL si contienen caracteres especiales.

**PUT es una funcionalidad adicional**, incorporada para cubrir la actualización mencionada en la premisa. Requiere todos los campos obligatorios; no se implementa PATCH. Una actualización nunca crea un producto inexistente. La eliminación utiliza una transacción para comprobar la existencia del documento y borrarlo de manera consistente.

POST y PUT reciben `Content-Type: application/json` con esta estructura:

```json
{
  "title": "Cuaderno",
  "price": 1250.50,
  "category": "Librería",
  "description": "80 hojas"
}
```

- `title`: obligatorio, texto de 1 a 150 caracteres después de quitar espacios en los extremos.
- `price`: obligatorio, número JSON finito entre 0 y 1000000000. No se convierte desde texto.
- `category`: obligatorio, texto de 1 a 80 caracteres después de quitar espacios.
- `description`: opcional, texto de hasta 2000 caracteres; si se omite se guarda `""`.
- Se rechazan campos adicionales, incluido `id`. El servidor devuelve el ID real del documento como `id`.

PUT actualiza estos campos; si se omite `description`, pasa a `""`. GET no tiene orden garantizado. Esta entrega lista todos los productos y no agrega paginación.

## Autenticación y permisos

`POST /api/auth/login` recibe exclusivamente `username` y `password`. Valida el usuario configurado y compara la contraseña con su hash. Si son correctos, devuelve:

```text
{ "accessToken": "<JWT emitido por el servidor>", "tokenType": "Bearer", "expiresIn": 3600 }
```

Para escribir productos, agregar `Authorization: Bearer <accessToken>`. El token se firma con **HS256** y su verificación admite explícitamente sólo ese algoritmo. También se validan firma, vencimiento, sujeto, emisor `techlab-products-api` y audiencia `techlab-products-clients`. El rol `admin` se asigna en el servidor, nunca desde el cuerpo del login.

Las consultas GET quedan públicas porque corresponden al catálogo de productos. Las operaciones que cambian datos requieren autenticación y rol administrador. CORS controla la lectura desde navegadores entre distintos orígenes; no reemplaza estos permisos y no limita a clientes como curl o Postman.

Un token ausente, inválido o vencido produce **401**. Un token válido sin el rol requerido produce **403**. El login de demostración sólo emite tokens de administrador; el caso 403 se verifica en los tests mediante tokens de prueba firmados con un rol distinto. No hay registro de usuarios, renovación de tokens ni revocación individual: el JWT dura hasta su vencimiento. Cambiar el secreto invalida todos los tokens emitidos anteriormente.

## Respuestas de error

Los errores se concentran en un middleware y mantienen este formato:

```json
{
  "error": {
    "status": 404,
    "message": "Producto no encontrado."
  }
}
```

| Código | Situación |
| --- | --- |
| 400 | Cuerpo inválido, JSON malformado o demasiado grande, campos o ID inválidos. |
| 401 | Credenciales incorrectas o autenticación ausente, inválida o vencida. |
| 403 | Token válido con permisos insuficientes. |
| 404 | Producto inexistente o ruta desconocida. |
| 429 | Más de 10 solicitudes de login por IP en 15 minutos. Incluye `Retry-After`. |
| 500 | Error interno o fallo de Firestore; respuesta general sin detalles del proveedor. |

Las respuestas de error no incluyen credenciales, tokens, cuerpos de las peticiones ni trazas internas.

## Pruebas

### Pruebas automatizadas sin Firebase

```bash
npm test
```

Se utiliza `node:test` con Supertest. Los tests HTTP sustituyen el modelo por almacenamiento en memoria exclusivo de las pruebas. Los tests del modelo sustituyen los métodos del SDK por dobles controlados. Las contraseñas y claves JWT de prueba se generan aleatoriamente durante la ejecución. El flujo HTTP usa login real y validación real de JWT; sólo se sustituye la persistencia.

Con `npm test` obtuve **93 pruebas aprobadas y ninguna fallida**. Verifiqué consultas públicas, CRUD, códigos de respuesta, campos obligatorios, IDs, JSON malformado, límites de tamaño, credenciales inválidas, firma y vencimiento de JWT, algoritmo permitido, 401/403, errores externos y CORS. También probé hashes, variables obligatorias, rechazo de arranque sin configuración y operaciones del modelo ante documentos ausentes.

**Estos tests no demuestran una conexión real a Firestore** ni verifican los permisos IAM del proyecto del estudiante.

### Prueba real contra Firestore

Una vez configurado `.env`, usar un proyecto Firebase de pruebas y ejecutar:

```bash
npm run test:firestore
```

Este comando se ejecuta por separado y falla si no se configuró el servicio. Realiza una conexión real, un login con contraseña efímera para ese proceso y el recorrido crear → consultar → actualizar → verificar persistencia → listar → eliminar. No cambia el administrador del servidor normal. Sólo modifica un documento creado por el propio test y procura eliminarlo en `finally`; si el proceso se interrumpe o falla el servicio, puede quedar un documento con categoría `Pruebas` que habrá que revisar manualmente. Las operaciones consumen la cuota del proyecto.

Ejecuté `npm run test:firestore` con un proyecto Firestore real y la prueba de integración fue aprobada. Comprobé la conexión y la lectura de productos, además del login JWT, la creación, la consulta, la actualización, la persistencia y la eliminación de un documento temporal. Las credenciales utilizadas son privadas y no forman parte del repositorio. Los ejemplos manuales están en [docs/ejemplos-api.md](docs/ejemplos-api.md).

Para revisar las dependencias:

```bash
npm audit
```

Al ejecutar `npm audit`, obtuve **0 vulnerabilidades reportadas**. Como control de formato, también comprobé que `git diff --cached --check` finalizó sin errores.

## Alcance y pendientes

En esta entrega implementé configuración, dependencias, servidor, rutas, capas de responsabilidad, persistencia Firestore y autenticación JWT, además de validaciones, tests y documentación. También completé la configuración de Firebase y comprobé el CRUD y la persistencia mediante la prueba de integración con Firestore real. Para reproducir el proyecto en otro entorno, cada persona debe configurar su propia cuenta y sus credenciales privadas siguiendo las instrucciones anteriores.

Es un administrador de demostración para un trabajo académico. Para un despliegue público se debe configurar HTTPS y la gestión de secretos en el entorno de hosting. El límite de login usa memoria del proceso: si se ejecutan varias instancias, requiere un almacenamiento compartido; detrás de un proxy también se debe configurar `trust proxy` de acuerdo con esa infraestructura. La API no incluye interfaz web, gestión de múltiples cuentas ni paginación.

## Documentación consultada

- [Firebase Admin SDK: configuración de servidor](https://firebase.google.com/docs/admin/setup).
- [Firestore: primeros pasos con bibliotecas de servidor](https://firebase.google.com/docs/firestore/quickstart-server).
- [Express 5: manejo de errores](https://expressjs.com/en/5x/guide/error-handling/).
- [jsonwebtoken: opciones de firma y verificación](https://github.com/auth0/node-jsonwebtoken).
