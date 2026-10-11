import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function readProjectEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    throw new Error('No existe el archivo .env. Copia tu .env actual dentro de esta carpeta.');
  }

  const values = {};
  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    values[key] = value;
  }

  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];
  const missing = required.filter(
    (key) => !values[key] || values[key].startsWith('REEMPLAZAR_'),
  );
  if (missing.length) {
    throw new Error(`Faltan valores Firebase en .env: ${missing.join(', ')}`);
  }

  return {
    projectId: values.VITE_FIREBASE_PROJECT_ID,
    databaseId: values.VITE_FIREBASE_DATABASE_ID || '(default)',
  };
}
