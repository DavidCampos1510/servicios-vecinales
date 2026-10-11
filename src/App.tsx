import { useEffect, useState } from 'react';
import { Bell, ClipboardList, LogOut, Mail, Search, Send, ShieldAlert, ShieldCheck, User } from 'lucide-react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { PhoneFrame } from './components/PhoneFrame';
import { TabAdmin } from './components/TabAdmin';
import { TabInicio } from './components/TabInicio';
import { TabNotificaciones } from './components/TabNotificaciones';
import { TabPerfil } from './components/TabPerfil';
import { TabSolicitudes } from './components/TabSolicitudes';
import { auth, getFriendlyFirebaseError } from './firebase';
import {
  initializeSimulatedDatabase,
  isRealFirebaseConfigured,
  SVDatabaseService,
} from './state/databaseService';
import type { ApelacionCuenta, Notificacion, Proveedor, Usuario } from './types';
import { SVPushNotifications } from './state/pushNotifications';
import { initializeAccessibilityPreferences } from './state/accessibilityPreferences';

type AppTab = 'servicios' | 'solicitudes' | 'notificaciones' | 'perfil' | 'admin';

const SUPPORT_EMAIL = 'soporte.serviciosvecinales@gmail.com';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('servicios');
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [currentProvider, setCurrentProvider] = useState<Proveedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [providerDetailOpen, setProviderDetailOpen] = useState(false);
  const [requestDetailOpen, setRequestDetailOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notificacion[]>([]);
  const [notificationError, setNotificationError] = useState('');
  const [openChatSolicitudId, setOpenChatSolicitudId] = useState<string | null>(null);
  const [reactivationAcknowledging, setReactivationAcknowledging] = useState(false);
  const [blockedUser, setBlockedUser] = useState<Usuario | null>(null);
  const [accountAppeal, setAccountAppeal] = useState<ApelacionCuenta | null>(null);
  const [appealMessage, setAppealMessage] = useState('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealError, setAppealError] = useState('');
  const hasRealFirebase = isRealFirebaseConfigured();
  useEffect(() => {
    initializeAccessibilityPreferences();
  }, []);

  const [showFirstLaunchSplash, setShowFirstLaunchSplash] = useState(() => {
    try { return localStorage.getItem('sv_first_launch_splash_seen') !== '1'; } catch { return true; }
  });

  useEffect(() => {
    if (!showFirstLaunchSplash) return undefined;
    const timer = window.setTimeout(() => {
      try { localStorage.setItem('sv_first_launch_splash_seen', '1'); } catch { /* ignore */ }
      setShowFirstLaunchSplash(false);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [showFirstLaunchSplash]);

  useEffect(() => {
    if (!hasRealFirebase) {
      initializeSimulatedDatabase();
      const savedUser = localStorage.getItem('sv_simulated_user');
      const savedProvider = localStorage.getItem('sv_simulated_provider');
      setCurrentUser(savedUser ? (JSON.parse(savedUser) as Usuario) : null);
      setCurrentProvider(savedProvider ? (JSON.parse(savedProvider) as Proveedor) : null);
      if (!savedUser) setActiveTab('perfil');
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      try {
        if (!firebaseUser) {
          setCurrentUser(null);
          setCurrentProvider(null);
          setActiveTab('perfil');
          return;
        }
        const profile = await SVDatabaseService.getUsuario(firebaseUser.uid);
        if (!profile) {
          setCurrentUser(null);
          setCurrentProvider(null);
          return;
        }
        if (profile.estado_cuenta === 'suspendida' || profile.estado_cuenta === 'eliminada') {
          setBlockedUser(profile);
          setCurrentUser(null);
          setCurrentProvider(null);
          setActiveTab('perfil');
          return;
        }
        setBlockedUser(null);
        let provider =
          profile.tipo_usuario === 'proveedor'
            ? await SVDatabaseService.getProveedor(firebaseUser.uid)
            : null;
        if (provider && !provider.nombre_publico) {
          try {
            await SVDatabaseService.updateProviderPublicName(provider.id, profile.nombre);
            provider = { ...provider, nombre_publico: profile.nombre };
          } catch (migrationError) {
            console.warn('No fue posible migrar el nombre público del proveedor.', migrationError);
          }
        }
        setCurrentUser(profile);
        setCurrentProvider(provider);
        if (profile.tipo_usuario === 'admin') {
          setProviderDetailOpen(false);
          setRequestDetailOpen(false);
          setOpenChatSolicitudId(null);
          setActiveTab('admin');
        }
      } catch (error) {
        console.error('No fue posible restaurar la sesión', error);
        setCurrentUser(null);
        setCurrentProvider(null);
      } finally {
        setLoading(false);
      }
    });
  }, [hasRealFirebase]);

  useEffect(() => {
    if (activeTab === 'admin' && currentUser?.tipo_usuario !== 'admin') {
      setActiveTab('servicios');
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (!currentUser || !hasRealFirebase) return undefined;
    return SVDatabaseService.subscribeUsuario(
      currentUser.id,
      (profile) => {
        if (!profile) {
          setCurrentUser(null);
          setCurrentProvider(null);
          setActiveTab('perfil');
          return;
        }
        if (profile.estado_cuenta === 'suspendida' || profile.estado_cuenta === 'eliminada') {
          setBlockedUser(profile);
          setCurrentUser(null);
          setCurrentProvider(null);
          setActiveTab('perfil');
          return;
        }
        setCurrentUser(profile);
      },
      (error) => console.warn('No fue posible escuchar el estado de la cuenta.', error),
    );
  }, [currentUser?.id, hasRealFirebase]);


  useEffect(() => {
    if (!blockedUser || !hasRealFirebase) return undefined;
    return SVDatabaseService.subscribeUsuario(
      blockedUser.id,
      async (profile) => {
        if (!profile) return;
        if (profile.estado_cuenta === 'suspendida' || profile.estado_cuenta === 'eliminada') {
          setBlockedUser(profile);
          return;
        }

        let provider = profile.tipo_usuario === 'proveedor'
          ? await SVDatabaseService.getProveedor(profile.id)
          : null;
        if (provider && !provider.nombre_publico) {
          try {
            await SVDatabaseService.updateProviderPublicName(provider.id, profile.nombre);
            provider = { ...provider, nombre_publico: profile.nombre };
          } catch (migrationError) {
            console.warn('No fue posible migrar el nombre público del proveedor.', migrationError);
          }
        }
        setBlockedUser(null);
        setAccountAppeal(null);
        setAppealMessage('');
        setAppealError('');
        setCurrentUser(profile);
        setCurrentProvider(provider);
        setActiveTab(profile.tipo_usuario === 'admin' ? 'admin' : 'servicios');
      },
      (error) => console.warn('No fue posible escuchar la revisión de la cuenta.', error),
    );
  }, [blockedUser?.id, hasRealFirebase]);

  useEffect(() => {
    if (!blockedUser) {
      setAccountAppeal(null);
      return undefined;
    }
    setAppealError('');
    return SVDatabaseService.subscribeApelacionCuenta(
      blockedUser.id,
      setAccountAppeal,
      (error) => setAppealError(getFriendlyFirebaseError(error)),
    );
  }, [blockedUser?.id]);

  useEffect(() => {
    if (!currentUser || currentUser.tipo_usuario === 'admin') {
      setNotifications([]);
      setNotificationError('');
      return undefined;
    }

    setNotificationError('');
    return SVDatabaseService.subscribeNotificaciones(
      currentUser.id,
      setNotifications,
      (error) => setNotificationError(getFriendlyFirebaseError(error)),
    );
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.tipo_usuario === 'admin' || !hasRealFirebase) {
      SVPushNotifications.clearActionHandler();
      return undefined;
    }

    let mounted = true;
    void SVPushNotifications.initialize(currentUser.id, (data) => {
      if (!mounted) return;
      setProviderDetailOpen(false);
      setRequestDetailOpen(false);
      setActiveTab(data.solicitud_id ? 'solicitudes' : 'notificaciones');
    }).catch((error) => {
      console.warn('No fue posible inicializar las notificaciones push.', error);
    });

    return () => {
      mounted = false;
      SVPushNotifications.clearActionHandler();
    };
  }, [currentUser, hasRealFirebase]);


  const handleAuthChange = (user: Usuario | null, provider: Proveedor | null) => {
    if (user?.estado_cuenta === 'suspendida' || user?.estado_cuenta === 'eliminada') {
      setBlockedUser(user);
      setCurrentUser(null);
      setCurrentProvider(null);
      setActiveTab('perfil');
      return;
    }
    setBlockedUser(null);
    setCurrentUser(user);
    setCurrentProvider(provider);
    if (user?.tipo_usuario === 'admin') {
      setProviderDetailOpen(false);
      setRequestDetailOpen(false);
      setOpenChatSolicitudId(null);
      setActiveTab('admin');
    } else if (user) {
      // Tras registro o inicio de sesión manual, abre el perfil correspondiente.
      setProviderDetailOpen(false);
      setRequestDetailOpen(false);
      setOpenChatSolicitudId(null);
      setActiveTab('perfil');
    } else if (activeTab === 'admin') {
      setActiveTab('perfil');
    }
    if (!hasRealFirebase) {
      if (user) localStorage.setItem('sv_simulated_user', JSON.stringify(user));
      else localStorage.removeItem('sv_simulated_user');
      if (provider) localStorage.setItem('sv_simulated_provider', JSON.stringify(provider));
      else localStorage.removeItem('sv_simulated_provider');
    }
  };

  const acknowledgeReactivation = async () => {
    if (!currentUser || !currentUser.reactivacion_pendiente) return;
    setReactivationAcknowledging(true);
    try {
      await SVDatabaseService.confirmarReactivacion(currentUser.id);
      setCurrentUser({ ...currentUser, reactivacion_pendiente: false });
    } catch (error) {
      console.error('No fue posible confirmar la reactivación.', error);
    } finally {
      setReactivationAcknowledging(false);
    }
  };


  const submitAccountAppeal = async () => {
    if (!blockedUser) return;
    setAppealSubmitting(true);
    setAppealError('');
    try {
      await SVDatabaseService.solicitarRevisionCuenta(blockedUser, appealMessage);
      const savedAppeal = await SVDatabaseService.getApelacionCuenta(blockedUser.id);
      setAccountAppeal(savedAppeal);
      setAppealMessage('');
    } catch (error) {
      setAppealError(getFriendlyFirebaseError(error));
    } finally {
      setAppealSubmitting(false);
    }
  };

  const contactSupport = () => {
    if (!blockedUser) return;
    const subject = encodeURIComponent(`Solicitud de revisión de cuenta - ${blockedUser.nombre}`);
    const body = encodeURIComponent(
      `Hola equipo de Servicios Vecinales,\n\nQuisiera solicitar una revisión de mi cuenta.\n\nNombre: ${blockedUser.nombre}\nCorreo de la cuenta: ${blockedUser.email}\nTipo de cuenta: ${blockedUser.tipo_usuario}\nEstado: ${blockedUser.estado_cuenta}\nMotivo informado: ${blockedUser.moderacion_motivo || 'No especificado'}\n\nDetalle de mi solicitud:\n`,
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  const leaveBlockedAccount = async () => {
    try {
      if (hasRealFirebase) await signOut(auth);
    } finally {
      setBlockedUser(null);
      setAccountAppeal(null);
      setAppealMessage('');
      setAppealError('');
      setCurrentUser(null);
      setCurrentProvider(null);
      setActiveTab('perfil');
    }
  };

  const triggerRefresh = () => setRefreshTrigger((value) => value + 1);

  const tabs: Array<{ id: AppTab; label: string; icon: typeof Search; visible: boolean }> = [
    { id: 'servicios', label: 'Servicios', icon: Search, visible: currentUser?.tipo_usuario !== 'admin' },
    { id: 'solicitudes', label: 'Solicitudes', icon: ClipboardList, visible: Boolean(currentUser && currentUser.tipo_usuario !== 'admin') },
    { id: 'notificaciones', label: 'Avisos', icon: Bell, visible: Boolean(currentUser && currentUser.tipo_usuario !== 'admin') },
    { id: 'perfil', label: 'Mi perfil', icon: User, visible: true },
    { id: 'admin', label: 'Admin', icon: ShieldCheck, visible: currentUser?.tipo_usuario === 'admin' },
  ];

  if (showFirstLaunchSplash) {
    return (
      <PhoneFrame>
        <div className="h-full sv-auth-shell flex flex-col items-center justify-center px-8 text-center relative overflow-hidden">
          <div className="w-28 h-28 rounded-[32px] bg-white shadow-2xl border border-emerald-100 flex items-center justify-center overflow-hidden relative z-10">
            <img src="/icons/icon-192.png" alt="Servicios Vecinales" className="w-24 h-24 object-contain" />
          </div>
          <h1 className="mt-6 text-2xl font-black text-[#143453] tracking-tight relative z-10">Servicios Vecinales</h1>
          <p className="mt-2 text-sm text-slate-500 max-w-[260px] relative z-10">Encuentra y ofrece servicios cerca de tu comunidad.</p>
          <div className="mt-8 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse [animation-delay:300ms]" />
          </div>
        </div>
      </PhoneFrame>
    );
  }

  if (blockedUser) {
    const isSuspended = blockedUser.estado_cuenta === 'suspendida';
    const hasPendingAppeal = accountAppeal?.estado === 'pendiente';
    const canSendAppeal = !hasPendingAppeal;

    return (
      <PhoneFrame>
        <div className="h-full bg-slate-50 overflow-y-auto px-5 py-8">
          <div className="min-h-full flex items-center justify-center">
            <section className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-5 shadow-xl">
              <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${isSuspended ? 'bg-amber-50' : 'bg-rose-50'}`}>
                <ShieldAlert className={`w-8 h-8 ${isSuspended ? 'text-amber-600' : 'text-rose-600'}`} />
              </div>
              <h1 className="text-lg font-black text-slate-800 text-center mt-4">
                {isSuspended ? 'Tu cuenta está suspendida' : 'Tu cuenta fue eliminada de la app'}
              </h1>
              <p className="text-xs text-slate-500 text-center mt-2 leading-relaxed">
                {isSuspended
                  ? 'Tu acceso está temporalmente bloqueado por una medida de moderación.'
                  : 'Tu acceso a Servicios Vecinales fue bloqueado por una medida administrativa.'}
              </p>

              {blockedUser.moderacion_motivo && (
                <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Motivo informado</p>
                  <p className="text-xs text-slate-700 mt-1 whitespace-pre-line">{blockedUser.moderacion_motivo}</p>
                </div>
              )}

              {accountAppeal && (
                <div className={`mt-4 rounded-2xl border p-3 ${accountAppeal.estado === 'pendiente' ? 'bg-amber-50 border-amber-100' : accountAppeal.estado === 'rechazada' ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <p className="text-xs font-bold text-slate-700">
                    {accountAppeal.estado === 'pendiente' ? 'Solicitud de revisión pendiente' : accountAppeal.estado === 'rechazada' ? 'Solicitud revisada' : 'Solicitud aprobada'}
                  </p>
                  {accountAppeal.estado === 'pendiente' && <p className="text-[10px] text-slate-600 mt-1">Administración recibió tu solicitud. No necesitas enviarla nuevamente.</p>}
                  {accountAppeal.respuesta_admin && <p className="text-[10px] text-slate-700 mt-2"><b>Respuesta:</b> {accountAppeal.respuesta_admin}</p>}
                  {accountAppeal.estado === 'rechazada' && <p className="text-[10px] text-slate-600 mt-1">Puedes enviar una nueva solicitud si tienes información adicional.</p>}
                </div>
              )}

              {canSendAppeal && (
                <div className="mt-4">
                  <label className="text-[10px] font-bold text-slate-600">Solicitar revisión
                    <textarea
                      value={appealMessage}
                      onChange={(event) => setAppealMessage(event.target.value)}
                      minLength={10}
                      maxLength={1000}
                      placeholder="Explica por qué consideras que la suspensión o eliminación debe ser revisada..."
                      className="mt-1 w-full h-28 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs resize-none outline-none focus:border-emerald-400"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={appealSubmitting || appealMessage.trim().length < 10}
                    onClick={() => void submitAccountAppeal()}
                    className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:bg-slate-300 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> {appealSubmitting ? 'Enviando...' : 'Enviar solicitud de revisión'}
                  </button>
                </div>
              )}

              {appealError && <p className="mt-3 text-[10px] text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-2.5">{appealError}</p>}

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-[10px] text-slate-500 text-center">También puedes contactar directamente a soporte:</p>
                <p className="text-xs font-bold text-emerald-700 text-center mt-1 break-all">{SUPPORT_EMAIL}</p>
                <button type="button" onClick={contactSupport} className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4" /> Escribir a soporte
                </button>
                <button type="button" onClick={() => void leaveBlockedAccount()} className="w-full mt-2 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center gap-2">
                  <LogOut className="w-4 h-4" /> Usar otra cuenta
                </button>
              </div>
            </section>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div className="flex-1 flex flex-col h-full sv-screen relative overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="animate-spin rounded-full h-9 w-9 border-2 border-emerald-500 border-t-transparent" />
              <span className="text-xs">Restaurando sesión...</span>
            </div>
          ) : activeTab === 'servicios' ? (
            <TabInicio
              currentUser={currentUser}
              onRefreshTrigger={refreshTrigger}
              onProviderDetailChange={setProviderDetailOpen}
            />
          ) : activeTab === 'solicitudes' ? (
            <TabSolicitudes
              currentUser={currentUser}
              onRequestDetailChange={setRequestDetailOpen}
              openChatSolicitudId={openChatSolicitudId}
              onOpenChatHandled={() => setOpenChatSolicitudId(null)}
            />
          ) : activeTab === 'notificaciones' ? (
            <TabNotificaciones
              currentUser={currentUser}
              notifications={notifications}
              error={notificationError}
              onOpenSolicitudes={() => {
                setOpenChatSolicitudId(null);
                setActiveTab('solicitudes');
              }}
              onOpenChat={(solicitudId) => {
                setProviderDetailOpen(false);
                setRequestDetailOpen(false);
                setOpenChatSolicitudId(solicitudId);
                setActiveTab('solicitudes');
              }}
              onOpenPerfil={() => {
                setProviderDetailOpen(false);
                setRequestDetailOpen(false);
                setOpenChatSolicitudId(null);
                setActiveTab('perfil');
              }}
            />
          ) : activeTab === 'admin' ? (
            <TabAdmin currentUser={currentUser} />
          ) : (
            <TabPerfil
              currentUser={currentUser}
              currentProvider={currentProvider}
              onAuthChange={handleAuthChange}
              triggerRefresh={triggerRefresh}
              startInRegisterMode={!currentUser}
            />
          )}
        </div>

        {!((activeTab === 'servicios' && providerDetailOpen) || (activeTab === 'solicitudes' && requestDetailOpen)) && (
          <nav className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-100 flex items-center justify-around px-3 z-20 shadow-lg sv-bottom-nav">
            {tabs.filter((tab) => tab.visible).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setProviderDetailOpen(false);
                    setRequestDetailOpen(false);
                    setOpenChatSolicitudId(null);
                    setActiveTab(tab.id);
                  }}
                  data-active={active ? 'true' : 'false'}
                  className={`flex flex-col items-center justify-center min-w-14 p-2 transition-all ${active ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                    {tab.id === 'notificaciones' && notifications.some((item) => !item.leida) && (
                      <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[8px] leading-4 text-center font-bold border border-white">
                        {Math.min(99, notifications.filter((item) => !item.leida).length)}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] mt-1 tracking-tight">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {currentUser?.reactivacion_pendiente && (
          <div className="absolute inset-0 z-[80] bg-slate-950/55 backdrop-blur-[2px] flex items-center justify-center p-5">
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-emerald-100 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 mx-auto flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-base font-black text-slate-800 mt-3">¡Bienvenido de nuevo!</h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">Tu cuenta fue reactivada por la administración de Servicios Vecinales. Ya puedes volver a utilizar todas las funciones disponibles para tu perfil.</p>
              <button
                type="button"
                disabled={reactivationAcknowledging}
                onClick={() => void acknowledgeReactivation()}
                className="w-full mt-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:bg-slate-300"
              >
                {reactivationAcknowledging ? 'Ingresando...' : 'Continuar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
