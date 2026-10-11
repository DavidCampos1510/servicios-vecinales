import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import { onDocumentCreated, onDocumentDeleted } from 'firebase-functions/v2/firestore';

const adminApp = initializeApp();
const database = getFirestore(adminApp);
const messaging = getMessaging(adminApp);

async function recalculateProviderRating(providerId: string): Promise<void> {
  const reviewsSnapshot = await database
    .collection('proveedores')
    .doc(providerId)
    .collection('resenas')
    .get();

  const ratings = reviewsSnapshot.docs
    .map((document) => Number(document.data().calificacion))
    .filter((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5);

  const average = ratings.length
    ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1))
    : 0;

  await database.collection('proveedores').doc(providerId).update({
    calificacion_promedio: average,
    cantidad_resenas: ratings.length,
  });

  logger.info('Calificación actualizada', {
    providerId,
    average,
    reviewCount: ratings.length,
  });
}

async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<void> {
  const registrations = await database
    .collection('usuarios')
    .doc(userId)
    .collection('pushTokens')
    .get();

  const devices = registrations.docs
    .map((document) => ({ document, token: String(document.data().token || '').trim() }))
    .filter((item) => item.token.length > 0);

  if (!devices.length) {
    logger.info('Usuario sin dispositivos push registrados', { userId });
    return;
  }

  const invalidCodes = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
  ]);

  for (let offset = 0; offset < devices.length; offset += 500) {
    const chunk = devices.slice(offset, offset + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: chunk.map((item) => item.token),
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'servicios-vecinales',
          sound: 'default',
        },
      },
    });

    const invalidDocuments = response.responses
      .map((result, index) => ({ result, document: chunk[index]?.document }))
      .filter(({ result, document }) => Boolean(document) && !result.success && invalidCodes.has(result.error?.code || ''))
      .map(({ document }) => document!);

    if (invalidDocuments.length) {
      const batch = database.batch();
      invalidDocuments.forEach((document) => batch.delete(document.ref));
      await batch.commit();
    }

    logger.info('Notificación push procesada', {
      userId,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  }
}

export const onReviewCreated = onDocumentCreated(
  {
    document: 'proveedores/{providerId}/resenas/{reviewId}',
    region: 'us-central1',
  },
  async (event) => {
    await recalculateProviderRating(event.params.providerId);
  },
);

export const onReviewDeleted = onDocumentDeleted(
  {
    document: 'proveedores/{providerId}/resenas/{reviewId}',
    region: 'us-central1',
  },
  async (event) => {
    await recalculateProviderRating(event.params.providerId);
  },
);

export const onUserNotificationCreated = onDocumentCreated(
  {
    document: 'usuarios/{userId}/notificaciones/{notificationId}',
    region: 'us-central1',
  },
  async (event) => {
    const notification = event.data?.data();
    if (!notification) return;

    const solicitudId = String(notification.solicitud_id || '');
    await sendPushToUser(
      event.params.userId,
      String(notification.titulo || 'Servicios Vecinales'),
      String(notification.mensaje || 'Tienes una nueva notificación.'),
      {
        tipo: String(notification.tipo || 'aviso'),
        solicitud_id: solicitudId,
        notification_id: event.params.notificationId,
        target: solicitudId ? 'solicitudes' : 'notificaciones',
      },
    );
  },
);
