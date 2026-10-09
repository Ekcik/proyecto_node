# Pre-entrega de Node.js

## Descripción

En esta pre-entrega desarrollé un programa de consola con Node.js para consultar y gestionar productos de una tienda utilizando la API de [Fake Store](https://fakestoreapi.com/).

El objetivo fue aplicar los contenidos que vimos durante el curso, especialmente el manejo de comandos desde la terminal y las peticiones HTTP a una API externa. El programa permite consultar todos los productos, buscar uno por su ID, crear uno nuevo y eliminarlo. Las respuestas se muestran en la consola en formato JSON.

## Tecnologías y conceptos utilizados

Trabajé con **JavaScript y Node.js**, utilizando `process.argv` para leer los argumentos, `fetch` y `async/await` para realizar las peticiones, y métodos de arrays y strings para procesar los datos. También apliqué **destructuring** y **spread** para organizar los argumentos y las opciones de cada petición.

El proyecto está configurado con **ES Modules** (`"type": "module"`) y no requiere dependencias externas.

## Requisitos e instalación

Para ejecutar el programa se necesita **Node.js 22 o posterior** y conexión a Internet.

1. Abrir la carpeta del proyecto en Visual Studio Code o desde una terminal.
2. Ubicarse donde se encuentra el archivo `package.json`.
3. Ejecutar:

```bash
npm install
```

Aunque no hay dependencias externas que instalar, este comando permite preparar el proyecto con npm.

## Comandos disponibles

**1. Consultar todos los productos**

```bash
npm run start GET products
```

Realiza una petición **GET** y muestra la lista de productos de la API.

**2. Consultar un producto por ID**

```bash
npm run start GET products/15
```

Busca el producto con ID `15` y muestra sus datos.

**3. Crear un producto**

```bash
npm run start POST products T-Shirt-Rex 300 remeras
```

Envía una petición **POST** con el título (`T-Shirt-Rex`), el precio (`300`) y la categoría (`remeras`). Si el título o la categoría incluyen espacios, se pueden usar comillas:

```bash
npm run start POST products "Remera T-Rex" 300.50 "remeras estampadas"
```

**4. Eliminar un producto**

```bash
npm run start DELETE products/7
```

Envía una petición **DELETE** para el producto con ID `7` y muestra la respuesta.

**5. Mostrar la ayuda**

```bash
npm run start -- --help
```

También se puede ejecutar directamente con Node.js, por ejemplo: `node index.js GET products`.

## Organización del programa

Para facilitar la lectura, organicé `index.js` en cuatro funciones:

- **`mostrarAyuda()`:** muestra los comandos disponibles.
- **`prepararPeticion()`:** interpreta y valida los argumentos ingresados.
- **`consultarApi()`:** utiliza `fetch` para comunicarse con la API y procesar su respuesta.
- **`main()`:** coordina la ejecución y muestra los resultados.

Además, incorporé validaciones para los métodos HTTP, los ID de productos, el título, la categoría y el precio. Los ID deben ser enteros positivos válidos y el precio debe ser mayor o igual a cero, utilizando un punto para los decimales. Si un comando está mal escrito o hay problemas de conexión o de respuesta, el programa muestra un mensaje de error. Cada petición tiene un tiempo máximo de espera de 10 segundos.

## Pruebas y aclaraciones

Probé los cuatro comandos solicitados en la consigna: consultar todos los productos, consultar por ID, crear y eliminar. También dejé disponible un comando de ayuda para consultar la forma correcta de uso.

Es importante aclarar que **Fake Store API simula las operaciones de creación y eliminación**. Por eso, aunque `POST` o `DELETE` devuelvan una respuesta, los cambios no quedan guardados permanentemente en la API.

## Archivos del proyecto

- `index.js`: código principal y funciones del programa.
- `package.json`: configuración de Node.js y script `start`.
- `README.md`: descripción e instrucciones de uso.
- `.gitignore`: excluye `node_modules` del repositorio.

## Conclusión

Esta actividad me sirvió para practicar el uso de Node.js y entender mejor cómo se realiza una petición a una API desde la terminal. También pude aplicar conceptos de JavaScript que vimos en clase y organizar el código en funciones para que sea más fácil de leer y mantener.
