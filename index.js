const API_URL = 'https://fakestoreapi.com';

// Muestra los comandos disponibles y cómo escribir sus argumentos.
function mostrarAyuda() {
  console.log(`
Uso:
  npm run start GET products
  npm run start GET products/15
  npm run start POST products T-Shirt-Rex 300 remeras
  npm run start DELETE products/7
  npm run start -- --help

El ID debe ser un entero positivo.
El precio debe ser un número mayor o igual a cero, con punto para decimales.
Usá comillas si el título o la categoría contienen espacios.
`);
}

// Valida los argumentos antes de preparar la petición HTTP.
function prepararPeticion(argumentos) {
  const [metodo, recurso, ...parametros] = argumentos;

  if (!['GET', 'POST', 'DELETE'].includes(metodo)) {
    throw new Error('Indicá un método válido: GET, POST o DELETE.');
  }

  if (metodo === 'POST') {
    if (recurso !== 'products' || parametros.length !== 3) {
      throw new Error('POST requiere products, título, precio y categoría.');
    }

    const [titulo, precioTexto, categoria] = parametros;
    const precio = Number(precioTexto);

    if (!titulo.trim() || !categoria.trim()) {
      throw new Error('El título y la categoría no pueden estar vacíos.');
    }

    if (!/^\d+(\.\d+)?$/.test(precioTexto) || !Number.isFinite(precio)) {
      throw new Error('El precio debe ser un número mayor o igual a cero (ejemplo: 300.50).');
    }

    return {
      recurso,
      opciones: {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titulo.trim(), price: precio, category: categoria.trim() }),
      },
    };
  }

  if (parametros.length !== 0) {
    throw new Error(`${metodo} no acepta argumentos adicionales.`);
  }

  if (metodo === 'GET' && recurso === 'products') {
    return { recurso, opciones: { method: metodo } };
  }

  const coincidencia = /^products\/([1-9]\d*)$/.exec(recurso ?? '');
  if (!coincidencia || !Number.isSafeInteger(Number(coincidencia[1]))) {
    throw new Error(`${metodo} requiere products/ID con un ID entero positivo válido.`);
  }

  return { recurso, opciones: { method: metodo } };
}

// Envía la petición y controla errores de conexión, HTTP y formato de respuesta.
async function consultarApi({ recurso, opciones }) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}/${recurso}`, {
      ...opciones,
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error('La API no respondió dentro de los 10 segundos.');
    }
    throw new Error('No se pudo conectar con la API. Revisá tu conexión a Internet.');
  }

  if (!respuesta.ok) {
    throw new Error(`La API respondió con un error HTTP ${respuesta.status} ${respuesta.statusText}.`);
  }

  try {
    return await respuesta.json();
  } catch {
    throw new Error('La API no devolvió una respuesta JSON válida.');
  }
}

// Lee los argumentos de la terminal y muestra la respuesta de la API.
async function main() {
  const argumentos = process.argv.slice(2);
  if (argumentos.length === 1 && argumentos[0] === '--help') {
    mostrarAyuda();
    return;
  }

  let peticion;
  try {
    peticion = prepararPeticion(argumentos);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    mostrarAyuda();
    process.exitCode = 1;
    return;
  }

  try {
    const datos = await consultarApi(peticion);
    console.log(JSON.stringify(datos, null, 2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
