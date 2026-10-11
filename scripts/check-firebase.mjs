import { readProjectEnv } from './firebase-config.mjs';

try {
  const config = readProjectEnv();
  console.log('Configuración Firebase válida.');
  console.log(`Proyecto: ${config.projectId}`);
  console.log(`Base Firestore: ${config.databaseId}`);
  if (config.databaseId !== '(default)') {
    console.warn('Aviso: esta versión fue preparada para la base Firestore (default).');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
