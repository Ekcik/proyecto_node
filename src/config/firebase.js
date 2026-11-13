import { readFile } from 'node:fs/promises';
import { cert, initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export async function connectFirestore(config) {
  const credentials = JSON.parse(await readFile(config.credentialsPath, 'utf8'));
  if (credentials.type !== 'service_account' || credentials.project_id !== config.projectId) {
    throw new Error('La cuenta de servicio debe pertenecer al proyecto configurado.');
  }
  const firebaseApp = initializeApp({ credential: cert(credentials), projectId: config.projectId });
  const db = getFirestore(firebaseApp);
  const close = async () => {
    try {
      await db.terminate();
    } finally {
      await deleteApp(firebaseApp);
    }
  };
  let timeout;
  try {
    // Inicializar el SDK no prueba la conexión: hacemos una lectura antes de escuchar.
    await Promise.race([
      db.collection('products').limit(1).get(),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Tiempo de conexión agotado.')), 15000);
      }),
    ]);
    return { db, close };
  } catch (error) {
    await close().catch(() => {});
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
