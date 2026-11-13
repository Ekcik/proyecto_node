import 'dotenv/config';
import { createApp } from './src/app.js';
import { loadConfig } from './src/config/env.js';
import { connectFirestore } from './src/config/firebase.js';
import { createProductsModel } from './src/models/products.model.js';

let connection;
try {
  const config = loadConfig();
  connection = await connectFirestore(config);
  const app = createApp({ config, productsModel: createProductsModel(connection.db) });
  const server = app.listen(config.port, () => {
    console.log(`API disponible en http://localhost:${config.port}`);
  });

  let stopping = false;
  async function shutdown(exitCode = 0) {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    server.close(async () => {
      try {
        await connection.close();
      } catch {
        exitCode = 1;
      }
      clearTimeout(deadline);
      process.exitCode = exitCode;
    });
  }
  process.on('SIGINT', () => shutdown());
  process.on('SIGTERM', () => shutdown());
  server.on('error', () => {
    console.error('No se pudo iniciar el servidor HTTP. Revisá el puerto configurado.');
    shutdown(1);
  });
} catch {
  // No imprimir objetos de error: los proveedores pueden incluir datos sensibles.
  console.error('No se pudo iniciar la API. Revisá las variables de entorno, las credenciales y el acceso a Firestore según README.md.');
  if (connection) await connection.close().catch(() => {});
  process.exitCode = 1;
}
