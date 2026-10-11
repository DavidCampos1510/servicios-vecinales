import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Ban,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  BarChart3,
  Download,
  History,
  Trophy,
  LayoutDashboard,
  Mail,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Tags,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { REQUEST_STATUS_LABELS } from '../constants';
import { getFriendlyFirebaseError } from '../firebase';
import { formatDate, SVDatabaseService } from '../state/databaseService';
import type { AdminAuditEntry } from '../state/databaseService';
import type { ApelacionCuenta, EstadoBloqueoPrivacidad, EstadoCuenta, EstadoReporte, EstadoSolicitudPrivacidad, Proveedor, Reporte, SolicitudPrivacidad, SolicitudServicio, Usuario } from '../types';

interface TabAdminProps {
  currentUser: Usuario | null;
}

type AdminSection = 'resumen' | 'verificacion' | 'reportes' | 'revisiones' | 'privacidad' | 'cuentas';
type AccountRoleFilter = 'todos' | 'cliente' | 'proveedor';
type AccountStateFilter = 'todos' | EstadoCuenta;
type StatsPeriod = 'hoy' | '7d' | '30d' | 'todo';

const REPORT_REASON_LABELS: Record<Reporte['motivo'], string> = {
  conducta_inadecuada: 'Conducta inadecuada',
  informacion_falsa: 'Información falsa o engañosa',
  contenido_inapropiado: 'Contenido inapropiado',
  spam: 'Spam',
  otro: 'Otro',
};

const ACCOUNT_STATE_LABELS: Record<EstadoCuenta, string> = {
  activa: 'Activa',
  suspendida: 'Suspendida',
  eliminada: 'Eliminada de la app',
};

const ACCOUNT_STATE_CLASSES: Record<EstadoCuenta, string> = {
  activa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspendida: 'bg-amber-50 text-amber-700 border-amber-200',
  eliminada: 'bg-rose-50 text-rose-700 border-rose-200',
};

const PRIVACY_TYPE_LABELS: Record<SolicitudPrivacidad['tipo'], string> = {
  acceso: 'Acceso',
  rectificacion: 'Rectificación',
  supresion: 'Supresión',
  oposicion: 'Oposición',
  portabilidad: 'Portabilidad',
};

const PRIVACY_STATUS_LABELS: Record<SolicitudPrivacidad['estado'], string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  resuelta: 'Resuelta',
  rechazada: 'Rechazada',
};

const SECTION_LABELS: Array<{ id: AdminSection; label: string }> = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'verificacion', label: 'Verificación' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'revisiones', label: 'Revisiones' },
  { id: 'privacidad', label: 'Privacidad' },
  { id: 'cuentas', label: 'Cuentas' },
];

const PERIOD_LABELS: Array<{ id: StatsPeriod; label: string }> = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'todo', label: 'Todo' },
];

const AUDIT_ACTION_LABELS: Record<string, string> = {
  verificacion_aprobada: 'Verificación aprobada',
  verificacion_rechazada: 'Verificación rechazada',
  verificacion_retirada: 'Verificación retirada',
  reporte_revisado: 'Reporte marcado como revisado',
  reporte_descartado: 'Reporte descartado',
  cuenta_suspendida: 'Cuenta suspendida',
  cuenta_reactivada: 'Cuenta reactivada',
  cuenta_eliminada: 'Cuenta eliminada de la app',
  apelacion_aprobada: 'Apelación aprobada',
  apelacion_rechazada: 'Apelación rechazada',
  privacidad_en_revision: 'Solicitud de privacidad en revisión',
  privacidad_resuelta: 'Solicitud de privacidad resuelta',
  privacidad_rechazada: 'Solicitud de privacidad rechazada',
  privacidad_bloqueo_aprobado: 'Bloqueo temporal de privacidad aprobado',
  privacidad_bloqueo_rechazado: 'Bloqueo temporal de privacidad rechazado',
};

const dateValue = (value: unknown): number => {
  if (!value) return 0;
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return 0;
};

const percentage = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;

const formatDateTime = (value: unknown): string => {
  const timestamp = dateValue(value);
  if (!timestamp) return 'Fecha pendiente';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
};

const csvCell = (value: unknown): string => `"${String(value ?? '').replaceAll('"', '""')}"`;


export function TabAdmin({ currentUser }: TabAdminProps) {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [providers, setProviders] = useState<Proveedor[]>([]);
  const [requests, setRequests] = useState<SolicitudServicio[]>([]);
  const [reports, setReports] = useState<Reporte[]>([]);
  const [appeals, setAppeals] = useState<ApelacionCuenta[]>([]);
  const [privacyRequests, setPrivacyRequests] = useState<SolicitudPrivacidad[]>([]);
  const [auditLog, setAuditLog] = useState<AdminAuditEntry[]>([]);
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('30d');
  const [loading, setLoading] = useState(false);
  const [updatingProvider, setUpdatingProvider] = useState('');
  const [updatingReport, setUpdatingReport] = useState('');
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({});
  const [showAllReports, setShowAllReports] = useState(false);
  const [moderatingUser, setModeratingUser] = useState('');
  const [updatingAppeal, setUpdatingAppeal] = useState('');
  const [appealResponses, setAppealResponses] = useState<Record<string, string>>({});
  const [privacyResponses, setPrivacyResponses] = useState<Record<string, string>>({});
  const [updatingPrivacy, setUpdatingPrivacy] = useState('');
  const [moderationTarget, setModerationTarget] = useState<Usuario | null>(null);
  const [moderationState, setModerationState] = useState<EstadoCuenta>('suspendida');
  const [moderationReason, setModerationReason] = useState('');
  const [activeSection, setActiveSection] = useState<AdminSection>('resumen');
  const [accountSearch, setAccountSearch] = useState('');
  const [accountRoleFilter, setAccountRoleFilter] = useState<AccountRoleFilter>('todos');
  const [accountStateFilter, setAccountStateFilter] = useState<AccountStateFilter>('todos');
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    if (currentUser?.tipo_usuario !== 'admin') return;
    setLoading(true);
    setError('');
    try {
      const [userList, providerList, requestList, reportList, appealList, privacyList, auditList] = await Promise.all([
        SVDatabaseService.getUsuarios(),
        SVDatabaseService.getProveedores(),
        SVDatabaseService.getSolicitudes(),
        SVDatabaseService.getReportes(),
        SVDatabaseService.getApelacionesCuenta(),
        SVDatabaseService.getSolicitudesPrivacidadAdmin().catch(() => [] as SolicitudPrivacidad[]),
        SVDatabaseService.getAuditoriaAdmin().catch(() => [] as AdminAuditEntry[]),
      ]);
      setUsers(userList);
      setProviders(providerList);
      setRequests(requestList);
      setReports(reportList);
      setAppeals(appealList);
      setPrivacyRequests(privacyList);
      setAuditLog(auditList);
    } catch (dashboardError) {
      setError(getFriendlyFirebaseError(dashboardError));
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const logAdminAction = async (
    action: string,
    targetId: string,
    targetName: string,
    detail = '',
  ) => {
    if (!currentUser) return;
    try {
      const entry = await SVDatabaseService.registrarAuditoriaAdmin(
        currentUser.id,
        currentUser.nombre || 'Administrador',
        action,
        targetId,
        targetName,
        detail,
      );
      setAuditLog((items) => [entry, ...items.filter((item) => item.id !== entry.id)].slice(0, 50));
    } catch (auditError) {
      console.warn('No se pudo registrar la acción administrativa:', auditError);
    }
  };

  const resolveVerification = async (
    provider: Proveedor,
    state: 'verificado' | 'rechazado' | 'sin_solicitar',
  ) => {
    setUpdatingProvider(provider.id);
    setError('');
    try {
      const note = verificationNotes[provider.id] || '';
      await SVDatabaseService.resolverVerificacionProveedor(provider.id, state, note);
      setProviders((items) => items.map((item) => item.id === provider.id
        ? {
            ...item,
            verificado: state === 'verificado',
            estado_verificacion: state,
            verificacion_resuelta_at: new Date().toISOString(),
            verificacion_observacion: note.trim(),
          }
        : item));
      setVerificationNotes((notes) => ({ ...notes, [provider.id]: '' }));
      await logAdminAction(
        state === 'verificado' ? 'verificacion_aprobada' : state === 'rechazado' ? 'verificacion_rechazada' : 'verificacion_retirada',
        provider.id,
        provider.nombre_publico || provider.oficio,
        note.trim(),
      );
    } catch (verificationError) {
      setError(getFriendlyFirebaseError(verificationError));
    } finally {
      setUpdatingProvider('');
    }
  };

  const updateReport = async (report: Reporte, state: EstadoReporte) => {
    setUpdatingReport(report.id);
    setError('');
    try {
      await SVDatabaseService.actualizarEstadoReporte(report.id, state);
      setReports((items) => items.map((item) => item.id === report.id
        ? { ...item, estado: state, updatedAt: new Date().toISOString() }
        : item));
      await logAdminAction(
        state === 'revisado' ? 'reporte_revisado' : state === 'descartado' ? 'reporte_descartado' : 'reporte_actualizado',
        report.id,
        report.tipo === 'cliente' ? userName(report.cliente_id) : providerName(report.proveedor_id),
        REPORT_REASON_LABELS[report.motivo],
      );
    } catch (reportError) {
      setError(getFriendlyFirebaseError(reportError));
    } finally {
      setUpdatingReport('');
    }
  };

  const openModeration = (user: Usuario, state: EstadoCuenta) => {
    setModerationTarget(user);
    setModerationState(state);
    setModerationReason(state === 'activa' ? '' : user.moderacion_motivo || '');
    setError('');
  };

  const applyModeration = async () => {
    if (!moderationTarget) return;
    setModeratingUser(moderationTarget.id);
    setError('');
    try {
      await SVDatabaseService.moderarCuenta(
        moderationTarget.id,
        moderationTarget.tipo_usuario,
        moderationState,
        moderationReason,
      );
      setUsers((items) => items.map((item) => item.id === moderationTarget.id
        ? {
            ...item,
            estado_cuenta: moderationState,
            moderacion_motivo: moderationState === 'activa' ? '' : moderationReason.trim(),
            moderacion_actualizada_at: new Date().toISOString(),
            reactivacion_pendiente: moderationState === 'activa',
            ...(moderationState === 'activa' ? { reactivada_at: new Date().toISOString() } : {}),
          }
        : item));
      if (moderationTarget.tipo_usuario === 'proveedor') {
        setProviders((items) => items.map((item) => item.id === moderationTarget.id
          ? { ...item, activo: moderationState === 'activa' }
          : item));
      }
      await logAdminAction(
        moderationState === 'activa' ? 'cuenta_reactivada' : moderationState === 'suspendida' ? 'cuenta_suspendida' : 'cuenta_eliminada',
        moderationTarget.id,
        moderationTarget.nombre,
        moderationState === 'activa' ? 'Cuenta reactivada por administración.' : moderationReason.trim(),
      );
      setModerationTarget(null);
      setModerationReason('');
    } catch (moderationError) {
      setError(getFriendlyFirebaseError(moderationError));
    } finally {
      setModeratingUser('');
    }
  };

  const resolveAccountAppeal = async (appeal: ApelacionCuenta, approve: boolean) => {
    const targetUser = users.find((user) => user.id === appeal.usuario_id);
    if (!targetUser || targetUser.tipo_usuario === 'admin') {
      setError('No fue posible encontrar la cuenta asociada a esta solicitud de revisión.');
      return;
    }

    const response = (appealResponses[appeal.id] || '').trim();
    if (!approve && response.length < 3) {
      setError('Escribe una respuesta breve para explicar por qué se mantiene la suspensión o eliminación.');
      return;
    }

    setUpdatingAppeal(appeal.id);
    setError('');
    try {
      if (approve) {
        await SVDatabaseService.aprobarApelacionYReactivar(
          appeal.usuario_id,
          targetUser.tipo_usuario,
          response || 'Tu solicitud fue aprobada. Tu cuenta ha sido reactivada.',
        );
        setUsers((items) => items.map((item) => item.id === targetUser.id
          ? {
              ...item,
              estado_cuenta: 'activa',
              moderacion_motivo: '',
              moderacion_actualizada_at: new Date().toISOString(),
              reactivacion_pendiente: true,
              reactivada_at: new Date().toISOString(),
            }
          : item));
        if (targetUser.tipo_usuario === 'proveedor') {
          setProviders((items) => items.map((item) => item.id === targetUser.id ? { ...item, activo: true } : item));
        }
      } else {
        await SVDatabaseService.resolverApelacionCuenta(appeal.usuario_id, 'rechazada', response);
      }
      setAppeals((items) => items.map((item) => item.id === appeal.id
        ? {
            ...item,
            estado: approve ? 'aprobada' : 'rechazada',
            respuesta_admin: response || 'Tu solicitud fue aprobada. Tu cuenta ha sido reactivada.',
            updatedAt: new Date().toISOString(),
          }
        : item));
      await logAdminAction(
        approve ? 'apelacion_aprobada' : 'apelacion_rechazada',
        appeal.usuario_id,
        appeal.usuario_nombre,
        response || (approve ? 'Cuenta reactivada.' : 'Se mantiene el bloqueo.'),
      );
      setAppealResponses((items) => ({ ...items, [appeal.id]: '' }));
    } catch (appealError) {
      setError(getFriendlyFirebaseError(appealError));
    } finally {
      setUpdatingAppeal('');
    }
  };

  const emailAppealUser = (appeal: ApelacionCuenta) => {
    const subject = encodeURIComponent('Revisión de cuenta - Servicios Vecinales');
    const body = encodeURIComponent(`Hola ${appeal.usuario_nombre},\n\nNos comunicamos desde el equipo de Servicios Vecinales respecto de tu solicitud de revisión de cuenta.\n\n`);
    window.location.href = `mailto:${appeal.usuario_email}?subject=${subject}&body=${body}`;
  };

  const resolvePrivacyRequest = async (
    request: SolicitudPrivacidad,
    state: EstadoSolicitudPrivacidad,
    blockState?: EstadoBloqueoPrivacidad,
  ) => {
    const response = (privacyResponses[request.id] || request.respuesta_admin || '').trim();
    if (['resuelta', 'rechazada'].includes(state) && response.length < 3) {
      setError('Escribe una respuesta para el titular antes de cerrar la solicitud.');
      return;
    }
    setUpdatingPrivacy(request.id);
    setError('');
    try {
      await SVDatabaseService.resolverSolicitudPrivacidad(request.id, state, response, blockState);
      const next = {
        ...request,
        estado: state,
        respuesta_admin: response,
        ...(blockState ? { estado_bloqueo: blockState } : {}),
        updatedAt: new Date().toISOString(),
      };
      setPrivacyRequests((items) => items.map((item) => item.id === request.id ? next : item));
      const auditAction = blockState === 'aprobado'
        ? 'privacidad_bloqueo_aprobado'
        : blockState === 'rechazado'
          ? 'privacidad_bloqueo_rechazado'
          : state === 'en_revision'
            ? 'privacidad_en_revision'
            : state === 'resuelta'
              ? 'privacidad_resuelta'
              : 'privacidad_rechazada';
      await logAdminAction(auditAction, request.usuario_id, request.usuario_nombre, `${PRIVACY_TYPE_LABELS[request.tipo]} · ${response}`.slice(0, 500));
    } catch (privacyError) {
      setError(getFriendlyFirebaseError(privacyError));
    } finally {
      setUpdatingPrivacy('');
    }
  };

  const emailPrivacyUser = (request: SolicitudPrivacidad) => {
    const subject = encodeURIComponent('Solicitud de privacidad - Servicios Vecinales');
    const body = encodeURIComponent(`Hola ${request.usuario_nombre},\n\nNos comunicamos desde Servicios Vecinales respecto de tu solicitud de ${PRIVACY_TYPE_LABELS[request.tipo].toLowerCase()}.\n\n`);
    window.location.href = `mailto:${request.usuario_email}?subject=${subject}&body=${body}`;
  };

  const providerName = (providerId?: string) => {
    if (!providerId) return 'Proveedor';
    const provider = providers.find((item) => item.id === providerId);
    return provider?.nombre_publico || provider?.oficio || providerId;
  };

  const userName = (userId?: string) => {
    if (!userId) return 'Usuario';
    return users.find((item) => item.id === userId)?.nombre || userId;
  };

  const reportTargetUserId = (report: Reporte) => report.tipo === 'cliente' || report.tipo === 'resena'
    ? report.cliente_id
    : report.proveedor_id;

  const reportCountForUser = (userId: string) => reports.filter((report) => reportTargetUserId(report) === userId).length;

  const pendingVerifications = useMemo(
    () => providers.filter((provider) => !provider.verificado && provider.estado_verificacion === 'pendiente'),
    [providers],
  );

  const pendingAppeals = useMemo(() => appeals.filter((appeal) => appeal.estado === 'pendiente'), [appeals]);
  const pendingPrivacy = useMemo(() => privacyRequests.filter((request) => request.estado === 'pendiente' || request.estado === 'en_revision'), [privacyRequests]);
  const visibleReports = useMemo(
    () => (showAllReports ? reports : reports.filter((report) => report.estado === 'pendiente')).slice(0, 30),
    [reports, showAllReports],
  );

  const filteredAccounts = useMemo(() => {
    const normalizedSearch = accountSearch.trim().toLocaleLowerCase('es');
    return users
      .filter((user) => user.tipo_usuario !== 'admin')
      .filter((user) => accountRoleFilter === 'todos' || user.tipo_usuario === accountRoleFilter)
      .filter((user) => accountStateFilter === 'todos' || (user.estado_cuenta || 'activa') === accountStateFilter)
      .filter((user) => !normalizedSearch
        || user.nombre.toLocaleLowerCase('es').includes(normalizedSearch)
        || user.email.toLocaleLowerCase('es').includes(normalizedSearch)
        || user.telefono.includes(normalizedSearch));
  }, [users, accountSearch, accountRoleFilter, accountStateFilter]);

  const topCategories = useMemo(() => {
    const counts = new Map<string, number>();
    providers.forEach((provider) => {
      const categories = provider.categorias?.length ? provider.categorias : [provider.categoria_id];
      categories.filter(Boolean).forEach((category) => counts.set(category, (counts.get(category) || 0) + 1));
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [providers]);

  const topCommunes = useMemo(() => {
    const counts = new Map<string, number>();
    providers.forEach((provider) => {
      const commune = provider.ubicacion?.split(',')[0]?.trim();
      if (commune) counts.set(commune, (counts.get(commune) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [providers]);

  const recentRequests = useMemo(
    () => [...requests].sort((a, b) => dateValue(b.updatedAt) - dateValue(a.updatedAt)).slice(0, 8),
    [requests],
  );


  const periodStart = useMemo(() => {
    if (statsPeriod === 'todo') return 0;
    const now = new Date();
    if (statsPeriod === 'hoy') {
      now.setHours(0, 0, 0, 0);
      return now.getTime();
    }
    const days = statsPeriod === '7d' ? 7 : 30;
    return Date.now() - (days * 24 * 60 * 60 * 1000);
  }, [statsPeriod]);

  const periodRequests = useMemo(
    () => requests.filter((request) => !periodStart || dateValue(request.createdAt) >= periodStart),
    [requests, periodStart],
  );

  const periodReports = useMemo(
    () => reports.filter((report) => !periodStart || dateValue(report.createdAt) >= periodStart),
    [reports, periodStart],
  );

  const periodCompletedRequests = useMemo(
    () => requests.filter((request) => request.estado === 'completada' && (!periodStart || dateValue(request.updatedAt) >= periodStart)),
    [requests, periodStart],
  );

  const providerRanking = useMemo(() => {
    const completedByProvider = new Map<string, number>();
    periodCompletedRequests.forEach((request) => completedByProvider.set(
      request.proveedor_id,
      (completedByProvider.get(request.proveedor_id) || 0) + 1,
    ));

    return providers
      .map((provider) => ({
        provider,
        completed: completedByProvider.get(provider.id) || 0,
      }))
      .filter((item) => item.completed > 0)
      .sort((a, b) => b.completed - a.completed || b.provider.calificacion_promedio - a.provider.calificacion_promedio)
      .slice(0, 5);
  }, [periodCompletedRequests, providers]);

  const requestStatusStats = useMemo(() => {
    const statuses: SolicitudServicio['estado'][] = ['solicitada', 'aceptada', 'en_proceso', 'completada', 'rechazada', 'cancelada'];
    return statuses.map((status) => ({
      status,
      count: periodRequests.filter((request) => request.estado === status).length,
    }));
  }, [periodRequests]);

  const maxStatusCount = Math.max(1, ...requestStatusStats.map((item) => item.count));
  const periodCompletedCount = periodCompletedRequests.length;
  const periodCreatedCompletedCount = periodRequests.filter((request) => request.estado === 'completada').length;
  const periodActiveCount = periodRequests.filter((request) => ['solicitada', 'aceptada', 'en_proceso'].includes(request.estado)).length;
  const periodCompletionRate = percentage(periodCreatedCompletedCount, periodRequests.length);

  const downloadCsv = (filename: string, headers: string[], rows: unknown[][]) => {
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportUsers = () => downloadCsv(
    'servicios-vecinales-usuarios.csv',
    ['ID', 'Nombre', 'Correo', 'Teléfono', 'Rol', 'Estado', 'Motivo moderación', 'Fecha registro'],
    users.filter((user) => user.tipo_usuario !== 'admin').map((user) => [
      user.id,
      user.nombre,
      user.email,
      user.telefono,
      user.tipo_usuario,
      user.estado_cuenta || 'activa',
      user.moderacion_motivo || '',
      formatDateTime(user.createdAt),
    ]),
  );

  const exportRequests = () => downloadCsv(
    'servicios-vecinales-solicitudes.csv',
    ['ID', 'Cliente', 'Proveedor', 'Servicio', 'Estado', 'Ubicación', 'Creada', 'Actualizada'],
    requests.map((request) => [
      request.id,
      request.cliente_nombre,
      providerName(request.proveedor_id),
      request.proveedor_oficio,
      REQUEST_STATUS_LABELS[request.estado],
      request.ubicacion,
      formatDateTime(request.createdAt),
      formatDateTime(request.updatedAt),
    ]),
  );

  const exportReports = () => downloadCsv(
    'servicios-vecinales-reportes.csv',
    ['ID', 'Tipo', 'Reportante', 'Motivo', 'Descripción', 'Estado', 'Fecha'],
    reports.map((report) => [
      report.id,
      report.tipo,
      report.reportante_nombre,
      REPORT_REASON_LABELS[report.motivo],
      report.descripcion,
      report.estado,
      formatDateTime(report.createdAt),
    ]),
  );

  const exportAudit = () => downloadCsv(
    'servicios-vecinales-auditoria-admin.csv',
    ['ID', 'Administrador', 'Acción', 'Objetivo', 'Detalle', 'Fecha'],
    auditLog.map((entry) => [
      entry.id,
      entry.admin_nombre,
      AUDIT_ACTION_LABELS[entry.accion] || entry.accion,
      entry.objetivo_nombre,
      entry.detalle,
      formatDateTime(entry.createdAt),
    ]),
  );

  if (currentUser?.tipo_usuario !== 'admin') {
    return <div className="h-full flex items-center justify-center sv-screen text-sm text-slate-500">Acceso restringido.</div>;
  }

  const clients = users.filter((user) => user.tipo_usuario === 'cliente');
  const providerUsers = users.filter((user) => user.tipo_usuario === 'proveedor');
  const verifiedProviders = providers.filter((provider) => provider.verificado).length;
  const suspendedUsers = users.filter((user) => (user.estado_cuenta || 'activa') === 'suspendida').length;
  const deletedUsers = users.filter((user) => (user.estado_cuenta || 'activa') === 'eliminada').length;
  const activeRequests = requests.filter((request) => ['solicitada', 'aceptada', 'en_proceso'].includes(request.estado)).length;
  const completed = requests.filter((request) => request.estado === 'completada').length;
  const closedRequests = requests.filter((request) => ['rechazada', 'cancelada'].includes(request.estado)).length;
  const pendingReports = reports.filter((report) => report.estado === 'pendiente').length;
  const resolvedReports = reports.length - pendingReports;
  const totalPendingActions = pendingVerifications.length + pendingReports + pendingAppeals.length + pendingPrivacy.length;
  const verificationRate = percentage(verifiedProviders, providers.length);
  const completionRate = percentage(completed, requests.length);
  const reportResolutionRate = percentage(resolvedReports, reports.length);

  const renderVerification = () => (
    <>
      <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-4 sv-card">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div><h3 className="text-xs font-bold text-slate-600 uppercase">Solicitudes de verificación</h3><p className="text-[10px] text-slate-400 mt-0.5">Revisión manual de perfiles profesionales.</p></div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700">{pendingVerifications.length}</span>
        </div>
        {pendingVerifications.length ? (
          <div className="flex flex-col gap-3">
            {pendingVerifications.map((provider) => (
              <article key={provider.id} className="border border-slate-100 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <img src={provider.foto_perfil} alt="" className="w-11 h-11 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-800 truncate">{provider.nombre_publico || provider.oficio}</p><p className="text-[10px] text-slate-500 truncate">{provider.oficio} · {provider.ubicacion}</p><p className="text-[9px] text-slate-400 mt-0.5">Solicitada {formatDate(provider.verificacion_solicitada_at)}</p></div>
                </div>
                <input
                  value={verificationNotes[provider.id] || ''}
                  onChange={(event) => setVerificationNotes((notes) => ({ ...notes, [provider.id]: event.target.value }))}
                  maxLength={300}
                  placeholder="Observación opcional para el proveedor"
                  className="mt-2 w-full text-[11px] p-2 rounded-lg bg-slate-50 border border-slate-200"
                />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button disabled={updatingProvider === provider.id} onClick={() => void resolveVerification(provider, 'rechazado')} className="py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold disabled:opacity-50">Rechazar</button>
                  <button disabled={updatingProvider === provider.id} onClick={() => void resolveVerification(provider, 'verificado')} className="py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold disabled:opacity-50">Aprobar</button>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="text-[11px] text-slate-400 text-center py-4 bg-slate-50 rounded-xl">No hay solicitudes pendientes.</p>}
      </section>

      <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm sv-card">
        <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-bold text-slate-600 uppercase">Estado de proveedores</h3><span className="text-[10px] text-slate-400">{verifiedProviders}/{providers.length} verificados</span></div>
        <div className="flex flex-col gap-3">
          {providers.map((provider) => (
            <div key={provider.id} className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
              <img src={provider.foto_perfil} alt="" className="w-10 h-10 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{provider.nombre_publico || provider.oficio}</p>
                <p className="text-[10px] text-slate-400 truncate">{provider.ubicacion}</p>
                <span className={`text-[9px] font-bold ${provider.verificado ? 'text-emerald-600' : provider.estado_verificacion === 'pendiente' ? 'text-amber-600' : provider.estado_verificacion === 'rechazado' ? 'text-rose-600' : 'text-slate-400'}`}>
                  {provider.verificado ? 'Verificado' : provider.estado_verificacion === 'pendiente' ? 'Pendiente' : provider.estado_verificacion === 'rechazado' ? 'Rechazado' : 'Sin solicitar'}
                </span>
              </div>
              {provider.verificado ? (
                <button disabled={updatingProvider === provider.id} onClick={() => void resolveVerification(provider, 'sin_solicitar')} className="text-[9px] font-bold px-2 py-1.5 rounded-lg border bg-slate-50 text-slate-600 border-slate-200 disabled:opacity-50">Retirar</button>
              ) : provider.estado_verificacion !== 'pendiente' ? (
                <button disabled={updatingProvider === provider.id} onClick={() => void resolveVerification(provider, 'verificado')} className="text-[9px] font-bold px-2 py-1.5 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200 disabled:opacity-50">Verificar</button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </>
  );

  const renderAppeals = () => (
    <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm sv-card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div><h3 className="text-xs font-bold text-slate-600 uppercase">Solicitudes de revisión</h3><p className="text-[10px] text-slate-400 mt-0.5">Apelaciones de cuentas suspendidas o eliminadas.</p></div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700">{pendingAppeals.length}</span>
      </div>
      {pendingAppeals.length ? (
        <div className="flex flex-col gap-3">
          {pendingAppeals.map((appeal) => {
            const targetUser = users.find((user) => user.id === appeal.usuario_id);
            return (
              <article key={appeal.id} className="border border-slate-100 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{appeal.usuario_nombre}</p>
                    <p className="text-[10px] text-slate-400 truncate">{appeal.usuario_email} · {appeal.usuario_tipo === 'proveedor' ? 'Proveedor' : 'Cliente'}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${appeal.estado_cuenta === 'suspendida' ? ACCOUNT_STATE_CLASSES.suspendida : ACCOUNT_STATE_CLASSES.eliminada}`}>{appeal.estado_cuenta === 'suspendida' ? 'Cuenta suspendida' : 'Eliminada de la app'}</span>
                      <span className="text-[9px] text-slate-400">Enviada {formatDate(appeal.updatedAt)}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => emailAppealUser(appeal)} className="p-2 rounded-lg bg-slate-100 text-slate-600" aria-label="Enviar correo"><Mail className="w-4 h-4" /></button>
                </div>
                {appeal.motivo_moderacion && <div className="mt-2 bg-rose-50 border border-rose-100 rounded-xl p-2.5"><p className="text-[9px] font-bold text-rose-700 uppercase">Motivo de moderación</p><p className="text-[10px] text-rose-700 mt-1">{appeal.motivo_moderacion}</p></div>}
                <div className="mt-2 bg-slate-50 rounded-xl p-2.5"><p className="text-[9px] font-bold text-slate-500 uppercase">Mensaje del usuario</p><p className="text-[11px] text-slate-700 mt-1 whitespace-pre-line">{appeal.mensaje}</p></div>
                <textarea value={appealResponses[appeal.id] || ''} onChange={(event) => setAppealResponses((items) => ({ ...items, [appeal.id]: event.target.value }))} maxLength={500} placeholder="Respuesta para el usuario" className="mt-2 w-full h-20 p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] resize-none" />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button type="button" disabled={updatingAppeal === appeal.id} onClick={() => void resolveAccountAppeal(appeal, false)} className="py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold disabled:opacity-50">Mantener bloqueo</button>
                  <button type="button" disabled={updatingAppeal === appeal.id || !targetUser} onClick={() => void resolveAccountAppeal(appeal, true)} className="py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold disabled:opacity-50">Reactivar cuenta</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : <p className="text-[11px] text-slate-400 text-center py-4 bg-slate-50 rounded-xl">No hay solicitudes de revisión pendientes.</p>}
    </section>
  );

  const renderReports = () => (
    <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm sv-card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div><h3 className="text-xs font-bold text-slate-600 uppercase">Reportes</h3><p className="text-[10px] text-slate-400 mt-0.5">Clientes, proveedores o reseñas reportadas.</p></div>
        <button onClick={() => setShowAllReports((value) => !value)} className="text-[10px] font-bold text-slate-600 bg-slate-100 rounded-lg px-2 py-1.5">{showAllReports ? 'Solo pendientes' : 'Ver todos'}</button>
      </div>
      {visibleReports.length ? (
        <div className="flex flex-col gap-3">
          {visibleReports.map((report) => (
            <article key={report.id} className="border border-slate-100 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="text-xs font-bold text-slate-800 truncate">{report.tipo === 'cliente' ? `Cliente · ${userName(report.cliente_id)}` : report.tipo === 'proveedor' ? `Proveedor · ${providerName(report.proveedor_id)}` : `Reseña · ${providerName(report.proveedor_id)}`}</p><p className="text-[10px] text-slate-500">{REPORT_REASON_LABELS[report.motivo]}</p></div>
                <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${report.estado === 'pendiente' ? 'bg-amber-50 text-amber-700' : report.estado === 'revisado' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{report.estado}</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-2 whitespace-pre-line">{report.descripcion}</p>
              <p className="text-[9px] text-slate-400 mt-2">Reportó {report.reportante_nombre} · {formatDate(report.createdAt)}{report.solicitud_id ? ` · Solicitud #${report.solicitud_id.slice(-8)}` : ''}</p>
              {report.estado === 'pendiente' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button disabled={updatingReport === report.id} onClick={() => void updateReport(report, 'descartado')} className="py-2 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold disabled:opacity-50 flex items-center justify-center gap-1"><XCircle className="w-3.5 h-3.5" /> Descartar</button>
                  <button disabled={updatingReport === report.id} onClick={() => void updateReport(report, 'revisado')} className="py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold disabled:opacity-50 flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Revisado</button>
                </div>
              )}
              {(() => {
                const targetId = reportTargetUserId(report);
                const targetUser = users.find((user) => user.id === targetId);
                if (!targetUser || targetUser.tipo_usuario === 'admin') return null;
                return <button type="button" onClick={() => openModeration(targetUser, 'suspendida')} className="w-full mt-2 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">Gestionar cuenta reportada</button>;
              })()}
            </article>
          ))}
        </div>
      ) : <p className="text-[11px] text-slate-400 text-center py-4 bg-slate-50 rounded-xl">No hay reportes {showAllReports ? 'registrados' : 'pendientes'}.</p>}
    </section>
  );

  const renderPrivacy = () => (
    <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm sv-card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div><h3 className="text-xs font-bold text-slate-600 uppercase">Solicitudes de privacidad</h3><p className="text-[10px] text-slate-400 mt-0.5">Acceso, rectificación, supresión, oposición y portabilidad.</p></div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-violet-50 text-violet-700">{pendingPrivacy.length}</span>
      </div>
      {privacyRequests.length ? (
        <div className="flex flex-col gap-3">
          {[...privacyRequests].sort((a, b) => {
            const priority = (item: SolicitudPrivacidad) => item.estado_bloqueo === 'pendiente' ? 0 : item.estado === 'pendiente' ? 1 : item.estado === 'en_revision' ? 2 : 3;
            return priority(a) - priority(b) || dateValue(b.createdAt) - dateValue(a.createdAt);
          }).map((request) => (
            <article key={request.id} className={`border rounded-xl p-3 ${request.estado_bloqueo === 'pendiente' ? 'border-amber-200 bg-amber-50/40' : 'border-slate-100'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{request.usuario_nombre}</p>
                  <p className="text-[10px] text-slate-400 truncate">{request.usuario_email} · {PRIVACY_TYPE_LABELS[request.tipo]}</p>
                </div>
                <button type="button" onClick={() => emailPrivacyUser(request)} className="p-2 rounded-lg bg-slate-100 text-slate-600" aria-label="Enviar correo"><Mail className="w-4 h-4" /></button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">{PRIVACY_STATUS_LABELS[request.estado]}</span>
                {request.solicita_bloqueo_temporal && <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${request.estado_bloqueo === 'pendiente' ? 'bg-amber-50 border-amber-200 text-amber-700' : request.estado_bloqueo === 'aprobado' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>Bloqueo: {request.estado_bloqueo}</span>}
                <span className="text-[9px] text-slate-400">{formatDateTime(request.createdAt)}</span>
              </div>
              {request.estado_bloqueo === 'pendiente' && <p className="mt-2 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-2.5">Prioridad: la solicitud incluye bloqueo temporal y debe revisarse con urgencia.</p>}
              <div className="mt-2 bg-slate-50 rounded-xl p-2.5"><p className="text-[9px] font-bold text-slate-500 uppercase">Detalle del titular</p><p className="text-[11px] text-slate-700 mt-1 whitespace-pre-line">{request.detalle}</p></div>
              <textarea value={privacyResponses[request.id] ?? request.respuesta_admin ?? ''} onChange={(event) => setPrivacyResponses((items) => ({ ...items, [request.id]: event.target.value }))} maxLength={1500} placeholder="Respuesta o fundamento para el titular" className="mt-2 w-full h-20 p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] resize-none" />
              {request.estado_bloqueo === 'pendiente' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button type="button" disabled={updatingPrivacy === request.id} onClick={() => void resolvePrivacyRequest(request, request.estado === 'pendiente' ? 'en_revision' : request.estado, 'rechazado')} className="py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold disabled:opacity-50">Rechazar bloqueo</button>
                  <button type="button" disabled={updatingPrivacy === request.id} onClick={() => void resolvePrivacyRequest(request, request.estado === 'pendiente' ? 'en_revision' : request.estado, 'aprobado')} className="py-2 rounded-lg bg-amber-600 text-white text-[10px] font-bold disabled:opacity-50">Aprobar bloqueo</button>
                </div>
              )}
              {!['resuelta', 'rechazada'].includes(request.estado) && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button type="button" disabled={updatingPrivacy === request.id} onClick={() => void resolvePrivacyRequest(request, 'en_revision')} className="py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold disabled:opacity-50">En revisión</button>
                  <button type="button" disabled={updatingPrivacy === request.id} onClick={() => void resolvePrivacyRequest(request, 'rechazada')} className="py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold disabled:opacity-50">Rechazar</button>
                  <button type="button" disabled={updatingPrivacy === request.id} onClick={() => void resolvePrivacyRequest(request, 'resuelta')} className="py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold disabled:opacity-50">Resolver</button>
                </div>
              )}
              {request.respuesta_admin && ['resuelta', 'rechazada'].includes(request.estado) && <p className="mt-2 text-[10px] text-slate-500"><b>Respuesta enviada:</b> {request.respuesta_admin}</p>}
            </article>
          ))}
        </div>
      ) : <p className="text-[11px] text-slate-400 text-center py-4 bg-slate-50 rounded-xl">No hay solicitudes de privacidad registradas.</p>}
    </section>
  );

  const renderAccounts = () => (
    <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm sv-card">
      <div className="mb-3"><h3 className="text-xs font-bold text-slate-600 uppercase">Gestión de cuentas</h3><p className="text-[10px] text-slate-400 mt-0.5">Busca, filtra, suspende, reactiva o retira cuentas.</p></div>
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={accountSearch} onChange={(event) => setAccountSearch(event.target.value)} placeholder="Buscar por nombre, correo o teléfono" className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs" />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <select value={accountRoleFilter} onChange={(event) => setAccountRoleFilter(event.target.value as AccountRoleFilter)} className="py-2 px-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600">
          <option value="todos">Todos los roles</option><option value="cliente">Clientes</option><option value="proveedor">Proveedores</option>
        </select>
        <select value={accountStateFilter} onChange={(event) => setAccountStateFilter(event.target.value as AccountStateFilter)} className="py-2 px-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600">
          <option value="todos">Todos los estados</option><option value="activa">Activas</option><option value="suspendida">Suspendidas</option><option value="eliminada">Eliminadas</option>
        </select>
      </div>
      <p className="text-[9px] text-slate-400 mb-3">{filteredAccounts.length} cuenta{filteredAccounts.length === 1 ? '' : 's'} encontrada{filteredAccounts.length === 1 ? '' : 's'}</p>
      <div className="flex flex-col gap-3">
        {filteredAccounts.map((user) => {
          const state = user.estado_cuenta || 'activa';
          const reportCount = reportCountForUser(user.id);
          return (
            <article key={user.id} className="border border-slate-100 rounded-xl p-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{user.nombre}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email} · {user.tipo_usuario === 'proveedor' ? 'Proveedor' : 'Cliente'}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${ACCOUNT_STATE_CLASSES[state]}`}>{ACCOUNT_STATE_LABELS[state]}</span>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${reportCount > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{reportCount} reporte{reportCount === 1 ? '' : 's'}</span>
                </div>
                {user.moderacion_motivo && state !== 'activa' && <p className="text-[10px] text-slate-500 mt-2"><b>Motivo:</b> {user.moderacion_motivo}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {state === 'activa' ? (
                  <button type="button" disabled={moderatingUser === user.id} onClick={() => openModeration(user, 'suspendida')} className="py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold disabled:opacity-50 flex items-center justify-center gap-1"><Ban className="w-3.5 h-3.5" /> Suspender</button>
                ) : (
                  <button type="button" disabled={moderatingUser === user.id} onClick={() => openModeration(user, 'activa')} className="py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold disabled:opacity-50 flex items-center justify-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Reactivar</button>
                )}
                <button type="button" disabled={moderatingUser === user.id || state === 'eliminada'} onClick={() => openModeration(user, 'eliminada')} className="py-2 rounded-lg bg-rose-600 text-white text-[10px] font-bold disabled:opacity-40 flex items-center justify-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Eliminar de la app</button>
              </div>
            </article>
          );
        })}
        {!filteredAccounts.length && <p className="text-[11px] text-slate-400 text-center py-5 bg-slate-50 rounded-xl">No hay cuentas que coincidan con los filtros.</p>}
      </div>
      <p className="text-[9px] text-slate-400 mt-3 leading-relaxed">“Eliminar de la app” bloquea el acceso y oculta el perfil profesional. La eliminación definitiva de Firebase Authentication continúa siendo manual mientras no usemos backend administrativo.</p>
    </section>
  );

  return (
    <div className="h-full flex flex-col sv-screen">
      <header className="bg-slate-900 text-white shadow-md shrink-0 sv-admin-header">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-400" /><div><h2 className="font-bold text-sm">Administración</h2><p className="text-[10px] text-white/60">Control y salud de Servicios Vecinales</p></div></div>
          <button onClick={() => void loadDashboard()} className="p-2 rounded-full bg-white/10" aria-label="Actualizar panel"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        <div className="flex overflow-x-auto px-2 pb-2 gap-1 no-scrollbar">
          {SECTION_LABELS.map((section) => (
            <button key={section.id} onClick={() => setActiveSection(section.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold transition ${activeSection === section.id ? 'bg-white text-emerald-700 shadow-sm' : 'bg-white/10 text-white/75'}`}>{section.label}{section.id === 'reportes' && pendingReports ? ` (${pendingReports})` : section.id === 'revisiones' && pendingAppeals.length ? ` (${pendingAppeals.length})` : section.id === 'privacidad' && pendingPrivacy.length ? ` (${pendingPrivacy.length})` : section.id === 'verificacion' && pendingVerifications.length ? ` (${pendingVerifications.length})` : ''}</button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
        {error && <p className="mb-3 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">{error}</p>}

        {activeSection === 'resumen' && (
          <>
            {totalPendingActions > 0 && (
              <button type="button" onClick={() => setActiveSection(pendingPrivacy.length ? 'privacidad' : pendingReports ? 'reportes' : pendingAppeals.length ? 'revisiones' : 'verificacion')} className="w-full mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-left flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div><p className="text-xs font-bold text-amber-800">{totalPendingActions} acción{totalPendingActions === 1 ? '' : 'es'} pendiente{totalPendingActions === 1 ? '' : 's'}</p><p className="text-[10px] text-amber-700 mt-0.5">{pendingVerifications.length} verificaciones · {pendingReports} reportes · {pendingAppeals.length} revisiones · {pendingPrivacy.length} privacidad</p></div>
              </button>
            )}

            <section className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm mb-4 sv-card">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div><p className="text-[10px] font-bold text-slate-600 uppercase">Período de estadísticas</p><p className="text-[9px] text-slate-400">Afecta solicitudes, reportes, gráficos y ranking.</p></div>
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {PERIOD_LABELS.map((period) => (
                  <button
                    key={period.id}
                    type="button"
                    onClick={() => setStatsPeriod(period.id)}
                    className={`py-2 rounded-lg text-[9px] font-bold border ${statsPeriod === period.id ? 'sv-chip-active' : 'sv-chip-inactive'}`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-2.5"><p className="text-lg font-black text-blue-700">{periodRequests.length}</p><p className="text-[9px] font-bold text-blue-600 uppercase">Solicitudes creadas</p></div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5"><p className="text-lg font-black text-emerald-700">{periodCompletedCount}</p><p className="text-[9px] font-bold text-emerald-600 uppercase">Completadas</p></div>
                <div className="rounded-xl bg-cyan-50 border border-cyan-100 p-2.5"><p className="text-lg font-black text-cyan-700">{periodActiveCount}</p><p className="text-[9px] font-bold text-cyan-600 uppercase">Activas del período</p></div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-2.5"><p className="text-lg font-black text-amber-700">{periodReports.length}</p><p className="text-[9px] font-bold text-amber-600 uppercase">Reportes recibidos</p></div>
              </div>
              <div className="mt-2 text-[9px] text-slate-400">De las solicitudes creadas en el período, completadas: <b className="text-slate-600">{periodCompletionRate}%</b></div>
            </section>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm sv-card"><Users className="w-5 h-5 text-blue-600" /><p className="text-2xl font-black text-slate-800 mt-2">{clients.length}</p><p className="text-[10px] text-slate-400 uppercase font-bold">Clientes</p></div>
              <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm sv-card"><BriefcaseBusiness className="w-5 h-5 text-emerald-600" /><p className="text-2xl font-black text-slate-800 mt-2">{providerUsers.length}</p><p className="text-[10px] text-slate-400 uppercase font-bold">Proveedores</p></div>
              <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm sv-card"><BadgeCheck className="w-5 h-5 text-violet-600" /><p className="text-2xl font-black text-slate-800 mt-2">{verifiedProviders}</p><p className="text-[10px] text-slate-400 uppercase font-bold">Verificados</p></div>
              <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm sv-card"><Activity className="w-5 h-5 text-cyan-600" /><p className="text-2xl font-black text-slate-800 mt-2">{activeRequests}</p><p className="text-[10px] text-slate-400 uppercase font-bold">Trabajos activos</p></div>
              <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm sv-card"><CheckCircle2 className="w-5 h-5 text-emerald-600" /><p className="text-2xl font-black text-slate-800 mt-2">{completed}</p><p className="text-[10px] text-slate-400 uppercase font-bold">Completados</p></div>
              <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm sv-card"><Ban className="w-5 h-5 text-amber-600" /><p className="text-2xl font-black text-slate-800 mt-2">{suspendedUsers}</p><p className="text-[10px] text-slate-400 uppercase font-bold">Suspendidos</p></div>
            </div>

            <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-4 sv-card">
              <div className="flex items-center gap-2 mb-3"><LayoutDashboard className="w-4 h-4 text-slate-500" /><h3 className="text-xs font-bold text-slate-600 uppercase">Indicadores</h3></div>
              {[
                ['Proveedores verificados', verificationRate, `${verifiedProviders} de ${providers.length}`],
                ['Trabajos completados', completionRate, `${completed} de ${requests.length}`],
                ['Reportes resueltos', reportResolutionRate, `${resolvedReports} de ${reports.length}`],
              ].map(([label, value, detail]) => (
                <div key={String(label)} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-[10px] mb-1"><span className="font-bold text-slate-600">{label}</span><span className="text-slate-400">{detail} · {value}%</span></div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${value}%` }} /></div>
                </div>
              ))}
            </section>

            <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-4 sv-card">
              <div className="flex items-center gap-2 mb-3"><BarChart3 className="w-4 h-4 text-blue-600" /><div><h3 className="text-xs font-bold text-slate-600 uppercase">Solicitudes por estado</h3><p className="text-[9px] text-slate-400">Distribución según el período seleccionado.</p></div></div>
              <div className="space-y-2.5">
                {requestStatusStats.map((item) => (
                  <div key={item.status}>
                    <div className="flex items-center justify-between text-[10px] mb-1"><span className="font-bold text-slate-600">{REQUEST_STATUS_LABELS[item.status]}</span><span className="text-slate-400">{item.count}</span></div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.round((item.count / maxStatusCount) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-4 sv-card">
              <div className="flex items-center gap-2 mb-3"><Trophy className="w-4 h-4 text-amber-500" /><div><h3 className="text-xs font-bold text-slate-600 uppercase">Ranking de proveedores</h3><p className="text-[9px] text-slate-400">Ordenado por trabajos completados en el período.</p></div></div>
              {providerRanking.length ? (
                <div className="space-y-2">
                  {providerRanking.map(({ provider, completed: providerCompleted }, index) => (
                    <div key={provider.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
                      <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600">{index + 1}</div>
                      <div className="flex-1 min-w-0"><p className="text-[11px] font-bold text-slate-700 truncate">{provider.nombre_publico || provider.oficio}</p><p className="text-[9px] text-slate-400 truncate">{provider.oficio} · ⭐ {provider.calificacion_promedio.toFixed(1)}</p></div>
                      <div className="text-right"><p className="text-sm font-black text-emerald-600">{providerCompleted}</p><p className="text-[8px] text-slate-400 uppercase font-bold">completados</p></div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-[10px] text-slate-400 text-center py-4 bg-slate-50 rounded-xl">No hay trabajos completados en este período.</p>}
            </section>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <section className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm sv-card">
                <div className="flex items-center gap-1.5 mb-2"><Tags className="w-4 h-4 text-violet-600" /><h3 className="text-[10px] font-bold text-slate-600 uppercase">Categorías top</h3></div>
                {topCategories.length ? topCategories.map(([category, count]) => <div key={category} className="flex justify-between gap-2 py-1.5 border-b border-slate-50 last:border-0"><span className="text-[10px] text-slate-600 truncate capitalize">{String(category).replaceAll('_', ' ')}</span><span className="text-[10px] font-bold text-slate-800">{count}</span></div>) : <p className="text-[10px] text-slate-400">Sin datos.</p>}
              </section>
              <section className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm sv-card">
                <div className="flex items-center gap-1.5 mb-2"><MapPin className="w-4 h-4 text-rose-600" /><h3 className="text-[10px] font-bold text-slate-600 uppercase">Comunas top</h3></div>
                {topCommunes.length ? topCommunes.map(([commune, count]) => <div key={commune} className="flex justify-between gap-2 py-1.5 border-b border-slate-50 last:border-0"><span className="text-[10px] text-slate-600 truncate">{commune}</span><span className="text-[10px] font-bold text-slate-800">{count}</span></div>) : <p className="text-[10px] text-slate-400">Sin datos.</p>}
              </section>
            </div>

            <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-4 sv-card">
              <div className="flex items-center gap-2 mb-3"><Download className="w-4 h-4 text-emerald-600" /><div><h3 className="text-xs font-bold text-slate-600 uppercase">Exportar datos</h3><p className="text-[9px] text-slate-400">Archivos CSV compatibles con Excel.</p></div></div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={exportUsers} className="py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 flex items-center justify-center gap-1.5"><Download className="w-3.5 h-3.5" /> Usuarios</button>
                <button type="button" onClick={exportRequests} className="py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 flex items-center justify-center gap-1.5"><Download className="w-3.5 h-3.5" /> Solicitudes</button>
                <button type="button" onClick={exportReports} className="py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 flex items-center justify-center gap-1.5"><Download className="w-3.5 h-3.5" /> Reportes</button>
                <button type="button" onClick={exportAudit} className="py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 flex items-center justify-center gap-1.5"><Download className="w-3.5 h-3.5" /> Auditoría</button>
              </div>
            </section>

            <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-4 sv-card">
              <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><History className="w-4 h-4 text-violet-600" /><div><h3 className="text-xs font-bold text-slate-600 uppercase">Registro administrativo</h3><p className="text-[9px] text-slate-400">Últimas acciones realizadas por administración.</p></div></div><span className="text-[9px] text-slate-400">{auditLog.length}</span></div>
              {auditLog.length ? (
                <div className="flex flex-col gap-2">
                  {auditLog.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[10px] font-bold text-slate-700">{AUDIT_ACTION_LABELS[entry.accion] || entry.accion}</p><p className="text-[9px] text-slate-400 truncate">{entry.objetivo_nombre} · por {entry.admin_nombre}</p></div><span className="text-[8px] text-slate-400 whitespace-nowrap">{formatDateTime(entry.createdAt)}</span></div>
                      {entry.detalle && <p className="text-[9px] text-slate-500 mt-1 line-clamp-2">{entry.detalle}</p>}
                    </div>
                  ))}
                </div>
              ) : <p className="text-[10px] text-slate-400 text-center py-4 bg-slate-50 rounded-xl">El registro comenzará con las nuevas acciones administrativas.</p>}
            </section>

            <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-4 sv-card">
              <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-blue-600" /><h3 className="text-xs font-bold text-slate-600 uppercase">Actividad reciente</h3></div><span className="text-[9px] text-slate-400">{requests.length} solicitudes</span></div>
              <div className="flex flex-col gap-2">
                {recentRequests.map((request) => (
                  <div key={request.id} className="flex justify-between gap-3 text-xs border-b border-slate-100 pb-2 last:border-0">
                    <div className="min-w-0"><p className="font-bold text-slate-700 truncate">{request.proveedor_oficio}</p><p className="text-[10px] text-slate-400 truncate">{request.cliente_nombre} · {formatDate(request.updatedAt)}</p></div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">{REQUEST_STATUS_LABELS[request.estado]}</span>
                  </div>
                ))}
                {!recentRequests.length && <p className="text-[11px] text-slate-400 text-center py-4">Todavía no hay solicitudes.</p>}
              </div>
            </section>

            <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm sv-card">
              <h3 className="text-xs font-bold text-slate-600 uppercase mb-3">Estado general</h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-50 rounded-xl p-2.5"><p className="text-lg font-black text-slate-700">{closedRequests}</p><p className="text-[9px] text-slate-400 font-bold uppercase">Canceladas/rechazadas</p></div>
                <div className="bg-slate-50 rounded-xl p-2.5"><p className="text-lg font-black text-slate-700">{deletedUsers}</p><p className="text-[9px] text-slate-400 font-bold uppercase">Eliminadas de la app</p></div>
              </div>
            </section>
          </>
        )}

        {activeSection === 'verificacion' && renderVerification()}
        {activeSection === 'reportes' && renderReports()}
        {activeSection === 'revisiones' && renderAppeals()}
        {activeSection === 'privacidad' && renderPrivacy()}
        {activeSection === 'cuentas' && renderAccounts()}
      </main>

      {moderationTarget && (
        <div className="absolute inset-0 z-50 bg-slate-950/45 flex items-end sm:items-center justify-center p-2">
          <div className="w-full max-w-md bg-white rounded-3xl p-4 shadow-2xl border border-slate-100 sv-modal">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="text-sm font-bold text-slate-800">Gestionar cuenta</h3><p className="text-[11px] text-slate-400 mt-1">{moderationTarget.nombre} · {moderationTarget.tipo_usuario === 'proveedor' ? 'Proveedor' : 'Cliente'}</p></div>
              <button type="button" onClick={() => setModerationTarget(null)} disabled={Boolean(moderatingUser)} className="p-1.5 rounded-full bg-slate-100 text-slate-500"><XCircle className="w-4 h-4" /></button>
            </div>
            <div className={`mt-4 rounded-2xl border p-3 ${ACCOUNT_STATE_CLASSES[moderationState]}`}>
              <p className="text-xs font-bold">{moderationState === 'activa' ? 'Reactivar cuenta' : moderationState === 'suspendida' ? 'Suspender cuenta' : 'Eliminar de la aplicación'}</p>
              <p className="text-[10px] mt-1 opacity-80">{moderationState === 'activa' ? 'La persona podrá volver a iniciar sesión y, si es proveedor, su perfil volverá a mostrarse.' : moderationState === 'suspendida' ? 'La persona no podrá iniciar sesión hasta que administración reactive la cuenta.' : 'La persona quedará bloqueada y, si es proveedor, su perfil dejará de mostrarse a los clientes.'}</p>
            </div>
            {moderationState !== 'activa' && <label className="block mt-3 text-[10px] font-bold text-slate-600">Motivo<textarea value={moderationReason} onChange={(event) => setModerationReason(event.target.value)} minLength={3} maxLength={300} placeholder="Ej.: múltiples reportes confirmados por incumplimiento de normas" className="mt-1 w-full h-24 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs resize-none" /></label>}
            {moderationState === 'eliminada' && <p className="mt-2 text-[10px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-2.5">Esta acción elimina el acceso dentro de Servicios Vecinales. La credencial de Firebase Authentication deberá borrarse manualmente si también quieres eliminarla.</p>}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button type="button" onClick={() => setModerationTarget(null)} disabled={Boolean(moderatingUser)} className="py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={() => void applyModeration()} disabled={Boolean(moderatingUser) || (moderationState !== 'activa' && moderationReason.trim().length < 3)} className={`py-2.5 rounded-xl text-white text-xs font-bold disabled:bg-slate-300 ${moderationState === 'activa' ? 'bg-emerald-600' : moderationState === 'suspendida' ? 'bg-amber-600' : 'bg-rose-600'}`}>{moderatingUser ? 'Guardando...' : moderationState === 'activa' ? 'Reactivar' : moderationState === 'suspendida' ? 'Suspender' : 'Eliminar de la app'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
