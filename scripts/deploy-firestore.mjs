import { spawnSync } from 'node:child_process';
import { readProjectEnv } from './firebase-config.mjs';

try {
  const { projectId, databaseId } = readProjectEnv();
  if (databaseId !== '(default)') {
    throw new Error(
      `La aplicación apunta a la base ${databaseId}. Ajusta firebase.json antes de desplegar reglas para una base con nombre.`,
    );
  }

  console.log(`Publicando reglas e índices en Firebase: ${projectId}`);
  const result = spawnSync(
    'firebase',
    ['deploy', '--project', projectId, '--only', 'firestore:rules,firestore:indexes'],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  );

  if (result.error) {
    throw new Error(
      'No se encontró Firebase CLI. Instálalo con: npm install -g firebase-tools',
    );
  }
  process.exit(result.status ?? 1);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
