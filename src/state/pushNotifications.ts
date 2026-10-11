import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type ActionPerformed,
  type PermissionStatus,
  type PushNotificationSchema,
  type Token,
} from '@capacitor/push-notifications';
import { SVDatabaseService } from './databaseService';

export type PushPermissionState = 'unsupported' | 'prompt' | 'granted' | 'denied';

type PushActionHandler = (data: Record<string, string>) => void;

let listenersAttached = false;
let activeUserId = '';
let lastToken = '';
let actionHandler: PushActionHandler | null = null;

const TOKEN_STORAGE_KEY = 'sv_push_token';
const USER_STORAGE_KEY = 'sv_push_user';

function isSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

function normalizePermission(status: PermissionStatus): PushPermissionState {
  if (status.receive === 'granted') return 'granted';
  if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') return 'prompt';
  return 'denied';
}

function notificationData(notification: PushNotificationSchema | undefined): Record<string, string> {
  const raw = notification?.data;
  if (!raw || typeof raw !== 'object') return {};
  return Object.fromEntries(
    Object.entries(raw)
      .filter((entry): entry is [string, unknown] => Boolean(entry[0]))
      .map(([key, value]) => [key, typeof value === 'string' ? value : String(value)]),
  );
}

async function saveRegistrationToken(token: Token): Promise<void> {
  if (!activeUserId || !token.value) return;
  lastToken = token.value;
  localStorage.setItem(TOKEN_STORAGE_KEY, token.value);
  localStorage.setItem(USER_STORAGE_KEY, activeUserId);
  try {
    await SVDatabaseService.savePushToken(activeUserId, token.value);
  } catch (error) {
    console.error('No fue posible guardar el token push.', error);
  }
}

async function ensureListeners(): Promise<void> {
  if (!isSupported() || listenersAttached) return;

  await PushNotifications.addListener('registration', (token) => {
    void saveRegistrationToken(token);
  });

  await PushNotifications.addListener('registrationError', (error) => {
    console.error('Error registrando notificaciones push:', error.error);
  });

  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.info('Notificación push recibida:', notification.title);
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', (event: ActionPerformed) => {
    actionHandler?.(notificationData(event.notification));
  });

  listenersAttached = true;
}

async function ensureAndroidChannel(): Promise<void> {
  if (!isSupported()) return;
  await PushNotifications.createChannel({
    id: 'servicios-vecinales',
    name: 'Servicios Vecinales',
    description: 'Solicitudes, mensajes y cambios de estado de tus servicios.',
    importance: 4,
    visibility: 1,
    vibration: true,
  }).catch(() => undefined);
}

async function registerIfGranted(): Promise<PushPermissionState> {
  if (!isSupported()) return 'unsupported';
  const permission = normalizePermission(await PushNotifications.checkPermissions());
  if (permission !== 'granted') return permission;
  await ensureAndroidChannel();
  await PushNotifications.register();
  return 'granted';
}

export const SVPushNotifications = {
  isSupported,

  async getPermissionStatus(): Promise<PushPermissionState> {
    if (!isSupported()) return 'unsupported';
    return normalizePermission(await PushNotifications.checkPermissions());
  },

  async initialize(userId: string, onAction?: PushActionHandler): Promise<PushPermissionState> {
    if (!isSupported()) return 'unsupported';
    activeUserId = userId;
    actionHandler = onAction || null;
    if (localStorage.getItem(USER_STORAGE_KEY) === userId) {
      lastToken = localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    }
    await ensureListeners();
    return registerIfGranted();
  },

  async requestAndRegister(userId: string): Promise<PushPermissionState> {
    if (!isSupported()) return 'unsupported';
    activeUserId = userId;
    await ensureListeners();

    let permission = normalizePermission(await PushNotifications.checkPermissions());
    if (permission === 'prompt') {
      permission = normalizePermission(await PushNotifications.requestPermissions());
    }
    if (permission !== 'granted') return permission;

    await ensureAndroidChannel();
    await PushNotifications.register();
    return 'granted';
  },

  async unregisterCurrentUser(): Promise<void> {
    if (!isSupported()) return;
    const userId = activeUserId;
    const token = lastToken;
    activeUserId = '';
    lastToken = '';
    actionHandler = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);

    if (userId && token) {
      await SVDatabaseService.removePushToken(userId, token).catch(() => undefined);
    }
    await PushNotifications.unregister().catch(() => undefined);
  },

  clearActionHandler(): void {
    actionHandler = null;
  },
};
