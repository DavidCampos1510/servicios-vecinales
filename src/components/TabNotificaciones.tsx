import { useMemo, useState } from 'react';
import { BadgeCheck, Bell, CheckCheck, ClipboardList, DollarSign, MessageCircle, Star, Trash2, Wrench } from 'lucide-react';
import { getFriendlyFirebaseError } from '../firebase';
import { dateToMillis, SVDatabaseService } from '../state/databaseService';
import type { Notificacion, Usuario } from '../types';

interface TabNotificacionesProps {
  currentUser: Usuario | null;
  notifications: Notificacion[];
  error?: string;
  onOpenSolicitudes: () => void;
  onOpenChat: (solicitudId: string) => void;
  onOpenPerfil: () => void;
}

function formatNotificationDate(value: unknown): string {
  const timestamp = dateToMillis(value);
  if (!timestamp) return 'Ahora';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function TabNotificaciones({
  currentUser,
  notifications,
  error,
  onOpenSolicitudes,
  onOpenChat,
  onOpenPerfil,
}: TabNotificacionesProps) {
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingRead, setDeletingRead] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.leida).length,
    [notifications],
  );
  const readCount = useMemo(
    () => notifications.filter((notification) => notification.leida).length,
    [notifications],
  );
  const visibleNotifications = useMemo(
    () => (onlyUnread ? notifications.filter((notification) => !notification.leida) : notifications),
    [notifications, onlyUnread],
  );

  const markOneAndOpen = async (notification: Notificacion) => {
    if (!currentUser) return;
    setBusyId(notification.id);
    setActionError('');
    try {
      if (!notification.leida) {
        await SVDatabaseService.markNotificationRead(currentUser.id, notification.id);
      }
      if (notification.tipo === 'nuevo_mensaje' && notification.solicitud_id) {
        onOpenChat(notification.solicitud_id);
      } else if (notification.tipo === 'verificacion') {
        onOpenPerfil();
      } else if (notification.solicitud_id) {
        onOpenSolicitudes();
      }
    } catch (notificationError) {
      setActionError(getFriendlyFirebaseError(notificationError));
    } finally {
      setBusyId('');
    }
  };

  const markAll = async () => {
    if (!currentUser || unreadCount === 0) return;
    setMarkingAll(true);
    setActionError('');
    try {
      await SVDatabaseService.markAllNotificationsRead(currentUser.id);
    } catch (notificationError) {
      setActionError(getFriendlyFirebaseError(notificationError));
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteRead = async () => {
    if (!currentUser || readCount === 0) return;
    const confirmed = window.confirm(`¿Borrar ${readCount} notificación${readCount === 1 ? '' : 'es'} leída${readCount === 1 ? '' : 's'}? Las no leídas se conservarán.`);
    if (!confirmed) return;

    setDeletingRead(true);
    setActionError('');
    try {
      await SVDatabaseService.deleteReadNotifications(currentUser.id);
    } catch (notificationError) {
      setActionError(getFriendlyFirebaseError(notificationError));
    } finally {
      setDeletingRead(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="h-full flex flex-col sv-screen">
        <header className="h-14 bg-emerald-600 flex items-center px-4 text-white font-bold shadow-md sv-header">
          Notificaciones
        </header>
        <div className="flex-1 flex items-center justify-center p-6 pb-20">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center shadow-sm sv-card">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Inicia sesión para ver tus notificaciones</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col sv-screen">
      <header className="h-14 bg-emerald-600 flex items-center justify-between px-4 text-white shadow-md shrink-0 sv-header">
        <div>
          <h2 className="font-bold text-sm">Notificaciones</h2>
          <p className="text-[10px] text-white/80">
            {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void markAll()}
          disabled={markingAll || unreadCount === 0}
          className="px-2.5 py-1.5 rounded-xl bg-white/10 text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          {markingAll ? 'Marcando...' : 'Leer todas'}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
        {(error || actionError) && (
          <div className="mb-3 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl">
            {actionError || error}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setOnlyUnread(false)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${
              !onlyUnread
                ? 'sv-chip-active'
                : 'sv-chip-inactive'
            }`}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setOnlyUnread(true)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${
              onlyUnread
                ? 'sv-chip-active'
                : 'sv-chip-inactive'
            }`}
          >
            No leídas {unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>
        </div>

        {!onlyUnread && readCount > 0 && (
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={() => void deleteRead()}
              disabled={deletingRead}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[10px] font-bold text-slate-500 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deletingRead ? 'Borrando...' : `Borrar leídas (${readCount})`}
            </button>
          </div>
        )}

        {visibleNotifications.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-7 text-center sv-empty-state">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">
              {onlyUnread ? 'No tienes notificaciones pendientes' : 'Aún no tienes notificaciones'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Aquí aparecerán nuevas solicitudes, cotizaciones, cambios de estado, mensajes, reseñas y resultados de verificación.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visibleNotifications.map((notification) => {
              const Icon =
                notification.tipo === 'nueva_solicitud'
                  ? Wrench
                  : notification.tipo === 'nueva_resena'
                    ? Star
                    : notification.tipo === 'nuevo_mensaje'
                      ? MessageCircle
                      : notification.tipo === 'cotizacion'
                        ? DollarSign
                        : notification.tipo === 'verificacion'
                          ? BadgeCheck
                        : ClipboardList;
              return (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => void markOneAndOpen(notification)}
                  disabled={busyId === notification.id}
                  className={`w-full text-left rounded-2xl border p-3.5 shadow-sm transition disabled:opacity-60 sv-notification-card ${
                    notification.leida
                      ? 'bg-white border-slate-100'
                      : 'bg-emerald-50/70 border-emerald-200'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      notification.leida ? 'bg-slate-100 text-slate-500' : 'bg-emerald-600 text-white'
                    }`}>
                      <Icon className={`w-4 h-4 ${notification.tipo === 'nueva_resena' ? 'fill-current' : ''}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-slate-800">{notification.titulo}</p>
                        {!notification.leida && <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0 mt-1" />}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{notification.mensaje}</p>
                      <p className="text-[10px] text-slate-400 mt-2">
                        {busyId === notification.id
                          ? notification.tipo === 'nuevo_mensaje'
                            ? 'Abriendo chat...'
                            : notification.tipo === 'verificacion'
                              ? 'Abriendo perfil...'
                              : 'Abriendo solicitud...'
                          : formatNotificationDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
