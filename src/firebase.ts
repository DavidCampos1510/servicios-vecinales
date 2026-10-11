import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import fallbackConfig from './firebase-applet-config.json';

const requestedFirebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) || fallbackConfig.apiKey,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || fallbackConfig.authDomain,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) || fallbackConfig.projectId,
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) || fallbackConfig.storageBucket,
  messagingSenderId:
    (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) ||
    fallbackConfig.messagingSenderId,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined) || fallbackConfig.appId,
  firestoreDatabaseId:
    (import.meta.env.VITE_FIREBASE_DATABASE_ID as string | undefined) ||
    fallbackConfig.firestoreDatabaseId ||
    '(default)',
};

function isConfiguredValue(value: unknown): boolean {
  const text = String(value ?? '').trim();
  return Boolean(
    text &&
      !text.startsWith('REEMPLAZAR_') &&
      !text.toLowerCase().includes('mock') &&
      !text.toLowerCase().includes('your_'),
  );
}

const requiredFirebaseValues = {
  apiKey: requestedFirebaseConfig.apiKey,
  projectId: requestedFirebaseConfig.projectId,
  messagingSenderId: requestedFirebaseConfig.messagingSenderId,
  appId: requestedFirebaseConfig.appId,
};

export const missingFirebaseValues = Object.entries(requiredFirebaseValues)
  .filter(([, value]) => !isConfiguredValue(value))
  .map(([key]) => key);

export function isFirebaseConfigured(): boolean {
  return missingFirebaseValues.length === 0;
}

/*
 * No se debe lanzar una excepción aquí. Un error de configuración en un módulo
 * importado antes de montar React deja toda la página en blanco. Cuando faltan
 * credenciales usamos una configuración local inerte; databaseService detecta
 * ese estado y trabaja con localStorage hasta que exista un .env válido.
 */
const runtimeFirebaseConfig = isFirebaseConfigured()
  ? requestedFirebaseConfig
  : {
      apiKey: 'local-demo-api-key',
      authDomain: 'servicios-vecinales-local.invalid',
      projectId: 'servicios-vecinales-local',
      storageBucket: 'servicios-vecinales-local.invalid',
      messagingSenderId: '000000000000',
      appId: '1:000000000000:web:localdemo',
      firestoreDatabaseId: '(default)',
    };

export const firebaseApp = initializeApp(runtimeFirebaseConfig);
export const auth = getAuth(firebaseApp);
auth.languageCode = 'es';
export const db =
  runtimeFirebaseConfig.firestoreDatabaseId === '(default)'
    ? getFirestore(firebaseApp)
    : getFirestore(firebaseApp, runtimeFirebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
}

export class SVDatabaseError extends Error {
  constructor(
    message: string,
    public readonly operationType: OperationType,
    public readonly path: string,
    public readonly originalError: unknown,
  ) {
    super(message, { cause: originalError });
    this.name = 'SVDatabaseError';
  }
}

interface ErrorLike {
  message?: unknown;
  code?: unknown;
  originalError?: unknown;
  cause?: unknown;
}

function collectErrorDetails(error: unknown, visited = new Set<unknown>()): string[] {
  if (error == null || visited.has(error)) return [];
  if (typeof error !== 'object') return [String(error)];
  visited.add(error);

  const value = error as ErrorLike;
  const details: string[] = [];
  if (typeof value.code === 'string') details.push(value.code);
  if (typeof value.message === 'string') details.push(value.message);
  details.push(...collectErrorDetails(value.originalError, visited));
  details.push(...collectErrorDetails(value.cause, visited));
  return details;
}

export function getFirebaseErrorDetails(error: unknown): string {
  return collectErrorDetails(error).filter(Boolean).join(' | ');
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string,
): never {
  const originalDetails = getFirebaseErrorDetails(error) || String(error);
  console.error('Firestore operation failed', {
    operationType,
    path,
    userId: auth.currentUser?.uid ?? null,
    originalDetails,
  });

  throw new SVDatabaseError(
    `No fue posible completar la operación en Firebase (${operationType}: ${path}).`,
    operationType,
    path,
    error,
  );
}

export function getFriendlyFirebaseError(error: unknown): string {
  const raw = getFirebaseErrorDetails(error).toLowerCase();

  if (raw.includes('permission-denied') || raw.includes('missing or insufficient permissions')) {
    return 'Firebase rechazó la operación por permisos. Publica firestore.rules en el mismo proyecto y base de datos que usa la aplicación.';
  }
  if (raw.includes('failed-precondition') && raw.includes('index')) {
    return 'Firestore necesita un índice para esta consulta. Publica firestore.indexes.json y vuelve a intentarlo.';
  }
  if (raw.includes('unauthenticated') || raw.includes('user-token-expired')) {
    return 'Tu sesión de Firebase venció. Cierra sesión, vuelve a ingresar e inténtalo nuevamente.';
  }
  if (raw.includes('network-request-failed') || raw.includes('client is offline') || raw.includes('unavailable')) {
    return 'No se pudo conectar con Firebase. Revisa tu conexión a Internet e inténtalo nuevamente.';
  }
  if (raw.includes('invalid-email')) return 'El correo electrónico no tiene un formato válido.';
  if (raw.includes('user-not-found')) return 'No existe una cuenta registrada con ese correo.';
  if (raw.includes('operation-not-allowed')) return 'El acceso con correo y contraseña no está habilitado en Firebase Authentication.';
  if (raw.includes('unauthorized-domain')) return 'Este dominio no está autorizado en Firebase Authentication.';
  if (raw.includes('missing-email')) return 'Ingresa el correo electrónico de tu cuenta.';
  if (raw.includes('email-already-in-use')) return 'Ese correo ya está registrado.';
  if (raw.includes('invalid-credential')) return 'Correo o contraseña incorrectos.';
  if (raw.includes('weak-password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (raw.includes('too-many-requests')) return 'Se realizaron demasiados intentos. Intenta nuevamente más tarde.';
  if (raw.includes('la sesión autenticada no coincide')) return 'La sesión activa no coincide con tu perfil. Cierra sesión y vuelve a ingresar.';
  if (raw.includes('teléfono de contacto')) return 'Tu perfil no tiene un teléfono válido. Corrígelo en “Mi perfil” o escríbelo en la solicitud.';

  const directMessage = error instanceof Error ? error.message : '';
  if (directMessage && !directMessage.startsWith('No fue posible completar la operación en Firebase')) {
    return directMessage;
  }

  return 'Ocurrió un problema inesperado. Revisa la consola para obtener más detalles.';
}
