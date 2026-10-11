import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, isFirebaseConfigured, OperationType } from '../firebase';
import type {
  AgendaSemanalProveedor,
  ApelacionCuenta,
  CategoriaProveedor,
  CotizacionHistorial,
  CotizacionSolicitud,
  DisponibilidadProveedor,
  EstadoApelacion,
  EstadoCotizacion,
  EstadoReporte,
  EstadoCuenta,
  EstadoSolicitud,
  HistorialSolicitudEntry,
  MensajeSolicitud,
  NuevaCotizacionSolicitud,
  NuevoReporte,
  NuevaResena,
  NuevaSolicitudServicio,
  Notificacion,
  Proveedor,
  ProviderProfileUpdate,
  Reporte,
  Resena,
  SolicitudPrivacidad,
  EstadoBloqueoPrivacidad,
  EstadoSolicitudPrivacidad,
  TipoSolicitudPrivacidad,
  SolicitudServicio,
  Usuario,
} from '../types';
import {
  INITIAL_PROVEEDORES,
  INITIAL_RESENAS,
  INITIAL_SOLICITUDES,
  INITIAL_USUARIOS,
} from './mockData';

const STORAGE_PREFIX = 'sv_local_';
const DEFAULT_PROFILE_PHOTO =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=faces';

export interface AdminAuditEntry {
  id: string;
  admin_id: string;
  admin_nombre: string;
  accion: string;
  objetivo_id: string;
  objetivo_nombre: string;
  detalle: string;
  createdAt: unknown;
}

export function isRealFirebaseConfigured(): boolean {
  return isFirebaseConfigured();
}

function getLocal<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(STORAGE_PREFIX + key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
}

export function initializeSimulatedDatabase(): void {
  if (!localStorage.getItem(STORAGE_PREFIX + 'usuarios')) setLocal('usuarios', INITIAL_USUARIOS);
  if (!localStorage.getItem(STORAGE_PREFIX + 'proveedores')) setLocal('proveedores', INITIAL_PROVEEDORES);
  if (!localStorage.getItem(STORAGE_PREFIX + 'resenas')) setLocal('resenas', INITIAL_RESENAS);
  if (!localStorage.getItem(STORAGE_PREFIX + 'solicitudes')) setLocal('solicitudes', INITIAL_SOLICITUDES);
  if (!localStorage.getItem(STORAGE_PREFIX + 'notificaciones')) setLocal('notificaciones', [] as Notificacion[]);
  if (!localStorage.getItem(STORAGE_PREFIX + 'historial_solicitudes')) setLocal('historial_solicitudes', {} as Record<string, HistorialSolicitudEntry[]>);
  if (!localStorage.getItem(STORAGE_PREFIX + 'favoritos')) setLocal('favoritos', {} as Record<string, string[]>);
  if (!localStorage.getItem(STORAGE_PREFIX + 'mensajes_solicitudes')) setLocal('mensajes_solicitudes', {} as Record<string, MensajeSolicitud[]>);
  if (!localStorage.getItem(STORAGE_PREFIX + 'cotizaciones_solicitudes')) setLocal('cotizaciones_solicitudes', {} as Record<string, CotizacionSolicitud>);
  if (!localStorage.getItem(STORAGE_PREFIX + 'cotizaciones_historial_solicitudes')) setLocal('cotizaciones_historial_solicitudes', {} as Record<string, CotizacionHistorial[]>);
  if (!localStorage.getItem(STORAGE_PREFIX + 'reportes')) setLocal('reportes', [] as Reporte[]);
  if (!localStorage.getItem(STORAGE_PREFIX + 'apelaciones')) setLocal('apelaciones', [] as ApelacionCuenta[]);
  if (!localStorage.getItem(STORAGE_PREFIX + 'auditoria_admin')) setLocal('auditoria_admin', [] as AdminAuditEntry[]);
  if (!localStorage.getItem(STORAGE_PREFIX + 'solicitudes_privacidad')) setLocal('solicitudes_privacidad', [] as SolicitudPrivacidad[]);
}

export function dateToMillis(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;
    if (typeof toDate === 'function') return toDate.call(value).getTime();
  }
  return 0;
}

export function formatDate(value: unknown): string {
  const timestamp = dateToMillis(value);
  if (!timestamp) return 'Fecha pendiente';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp));
}

function inferCategory(text: string): Proveedor['categoria_id'] {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('electric')) return 'electricidad';
  if (normalized.includes('gasfit') || normalized.includes('plomer')) return 'gasfiteria';
  if (normalized.includes('cerraj')) return 'cerrajeria';
  if (normalized.includes('carpint') || normalized.includes('mueble')) return 'carpinteria';
  if (normalized.includes('pint')) return 'pintura';
  if (normalized.includes('constru') || normalized.includes('maestro')) return 'construccion';
  if (normalized.includes('clima') || normalized.includes('aire acondicionado') || normalized.includes('calef')) return 'climatizacion';
  if (normalized.includes('limpieza') || normalized.includes('aseo')) return 'limpieza';
  if (normalized.includes('jardin')) return 'jardineria';
  if (normalized.includes('informat') || normalized.includes('comput') || normalized.includes('tecnico pc')) return 'informatica';
  if (normalized.includes('web') || normalized.includes('pagina') || normalized.includes('software')) return 'desarrollo_web';
  if (normalized.includes('electrodom') || normalized.includes('lavadora') || normalized.includes('refrigerador')) return 'electrodomesticos';
  if (normalized.includes('mecanic') || normalized.includes('automotr')) return 'mecanica';
  if (normalized.includes('flete') || normalized.includes('mudanza')) return 'fletes';
  if (normalized.includes('mascota') || normalized.includes('veterin') || normalized.includes('paseo perro')) return 'mascotas';
  if (normalized.includes('belleza') || normalized.includes('peluquer') || normalized.includes('barber')) return 'belleza';
  if (normalized.includes('clase') || normalized.includes('profesor') || normalized.includes('tutor')) return 'clases_particulares';
  if (normalized.includes('fotograf') || normalized.includes('evento')) return 'fotografia_eventos';
  if (normalized.includes('costura') || normalized.includes('modista') || normalized.includes('arreglo ropa')) return 'costura';
  return 'otros';
}


function normalizeWeeklySchedule(value: unknown): AgendaSemanalProveedor | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
  const normalized = {} as AgendaSemanalProveedor;
  for (const day of days) {
    const item = raw[day];
    if (!item || typeof item !== 'object') return undefined;
    const source = item as Record<string, unknown>;
    normalized[day] = {
      activo: source.activo === true,
      desde: typeof source.desde === 'string' ? source.desde.slice(0, 5) : '',
      hasta: typeof source.hasta === 'string' ? source.hasta.slice(0, 5) : '',
    };
  }
  return normalized;
}

function normalizePreferredSchedule(dateValue?: string, timeValue?: string): { fecha_preferida?: string; hora_preferida?: string } {
  const fecha = String(dateValue || '').trim();
  const hora = String(timeValue || '').trim();
  if (!fecha && !hora) return {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
    throw new Error('La fecha y hora preferidas deben ingresarse juntas y con un formato válido.');
  }
  const date = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error('La fecha preferida no es válida.');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(`${fecha}T00:00:00`);
  if (selected.getTime() < today.getTime()) throw new Error('La fecha preferida no puede estar en el pasado.');
  return { fecha_preferida: fecha, hora_preferida: hora };
}

function normalizeProvider(data: Partial<Proveedor> & { nombre?: string }, id: string): Proveedor {
  const publicName = data.nombre_publico?.trim() || data.nombre?.trim();
  const primaryCategory = data.categoria_id || inferCategory(`${data.oficio || ''} ${data.descripcion || ''}`);
  const categories = Array.from(new Set(
    Array.isArray(data.categorias) && data.categorias.length ? data.categorias : [primaryCategory],
  )).slice(0, 5) as CategoriaProveedor[];
  const weeklySchedule = normalizeWeeklySchedule(data.agenda_semanal);
  return {
    id,
    usuario_id: data.usuario_id || id,
    ...(publicName ? { nombre_publico: publicName } : {}),
    categoria_id: categories[0] || primaryCategory,
    categorias: categories,
    oficio: data.oficio || 'Profesional Vecinal',
    experiencia: Number.isFinite(Number(data.experiencia)) ? Number(data.experiencia) : 0,
    descripcion: data.descripcion || '',
    ubicacion: data.ubicacion || '',
    ...(data.pais_codigo ? { pais_codigo: data.pais_codigo } : {}),
    ...(typeof data.pais_nombre === 'string' && data.pais_nombre.trim() ? { pais_nombre: data.pais_nombre.trim() } : {}),
    ...(typeof data.region_codigo === 'string' && data.region_codigo.trim() ? { region_codigo: data.region_codigo.trim() } : {}),
    ...(typeof data.region_nombre === 'string' && data.region_nombre.trim() ? { region_nombre: data.region_nombre.trim() } : {}),
    ...(typeof data.localidad_nombre === 'string' && data.localidad_nombre.trim() ? { localidad_nombre: data.localidad_nombre.trim() } : {}),
    ...(data.moneda_codigo ? { moneda_codigo: data.moneda_codigo } : {}),
    ...(typeof data.prefijo_telefonico === 'string' && data.prefijo_telefonico.trim() ? { prefijo_telefonico: data.prefijo_telefonico.trim() } : {}),
    foto_perfil: data.foto_perfil || DEFAULT_PROFILE_PHOTO,
    whatsapp: data.whatsapp || '',
    calificacion_promedio: Number(data.calificacion_promedio || 0),
    cantidad_resenas: Number(data.cantidad_resenas || 0),
    verificado: Boolean(data.verificado),
    activo: data.activo !== false,
    estado_verificacion: data.verificado ? 'verificado' : (data.estado_verificacion || 'sin_solicitar'),
    ...(data.verificacion_solicitada_at ? { verificacion_solicitada_at: data.verificacion_solicitada_at } : {}),
    ...(data.verificacion_resuelta_at ? { verificacion_resuelta_at: data.verificacion_resuelta_at } : {}),
    ...(typeof data.verificacion_observacion === 'string' && data.verificacion_observacion.trim() ? { verificacion_observacion: data.verificacion_observacion.trim() } : {}),
    fotos_trabajos: Array.isArray(data.fotos_trabajos) ? data.fotos_trabajos.slice(0, 12) : [],
    ...(data.disponibilidad ? { disponibilidad: data.disponibilidad } : {}),
    ...(typeof data.horario_atencion === 'string' ? { horario_atencion: data.horario_atencion.trim() } : {}),
    ...(weeklySchedule ? { agenda_semanal: weeklySchedule } : {}),
  };
}

function normalizeUser(data: Partial<Usuario>, id: string): Usuario {
  return {
    id,
    nombre: String(data.nombre || ''),
    email: String(data.email || ''),
    telefono: String(data.telefono || ''),
    ...(data.pais_codigo ? { pais_codigo: data.pais_codigo } : {}),
    ...(typeof data.pais_nombre === 'string' && data.pais_nombre.trim() ? { pais_nombre: data.pais_nombre.trim() } : {}),
    ...(typeof data.region_codigo === 'string' && data.region_codigo.trim() ? { region_codigo: data.region_codigo.trim() } : {}),
    ...(typeof data.region_nombre === 'string' && data.region_nombre.trim() ? { region_nombre: data.region_nombre.trim() } : {}),
    ...(typeof data.localidad_nombre === 'string' && data.localidad_nombre.trim() ? { localidad_nombre: data.localidad_nombre.trim() } : {}),
    ...(data.moneda_codigo ? { moneda_codigo: data.moneda_codigo } : {}),
    ...(typeof data.prefijo_telefonico === 'string' && data.prefijo_telefonico.trim() ? { prefijo_telefonico: data.prefijo_telefonico.trim() } : {}),
    tipo_usuario: data.tipo_usuario || 'cliente',
    estado_cuenta: data.estado_cuenta || 'activa',
    ...(typeof data.moderacion_motivo === 'string' && data.moderacion_motivo.trim()
      ? { moderacion_motivo: data.moderacion_motivo.trim() }
      : {}),
    ...(data.moderacion_actualizada_at ? { moderacion_actualizada_at: data.moderacion_actualizada_at } : {}),
    ...(typeof data.reactivacion_pendiente === 'boolean' ? { reactivacion_pendiente: data.reactivacion_pendiente } : {}),
    ...(data.reactivada_at ? { reactivada_at: data.reactivada_at } : {}),
    ...(typeof data.politicas_aceptadas === 'boolean' ? { politicas_aceptadas: data.politicas_aceptadas } : {}),
    ...(data.jurisdiccion_politicas ? { jurisdiccion_politicas: data.jurisdiccion_politicas } : {}),
    ...(typeof data.politicas_version === 'string' && data.politicas_version.trim()
      ? { politicas_version: data.politicas_version.trim() }
      : {}),
    ...(data.politicas_aceptadas_at ? { politicas_aceptadas_at: data.politicas_aceptadas_at } : {}),
    ...(typeof data.terminos_aceptados === 'boolean' ? { terminos_aceptados: data.terminos_aceptados } : {}),
    ...(typeof data.terminos_version === 'string' && data.terminos_version.trim() ? { terminos_version: data.terminos_version.trim() } : {}),
    ...(data.terminos_aceptados_at ? { terminos_aceptados_at: data.terminos_aceptados_at } : {}),
    ...(typeof data.privacidad_informada === 'boolean' ? { privacidad_informada: data.privacidad_informada } : {}),
    ...(typeof data.privacidad_version === 'string' && data.privacidad_version.trim() ? { privacidad_version: data.privacidad_version.trim() } : {}),
    ...(data.privacidad_informada_at ? { privacidad_informada_at: data.privacidad_informada_at } : {}),
    ...(typeof data.mayor_18_declarado === 'boolean' ? { mayor_18_declarado: data.mayor_18_declarado } : {}),
    ...(data.mayor_18_declarado_at ? { mayor_18_declarado_at: data.mayor_18_declarado_at } : {}),
    ...(data.createdAt ? { createdAt: data.createdAt } : {}),
  };
}

function recalculateLocalRating(providerId: string): void {
  const reviewsByProvider = getLocal<Record<string, Resena[]>>('resenas', {});
  const reviews = reviewsByProvider[providerId] || [];
  const providers = getLocal<Proveedor[]>('proveedores', []);
  const index = providers.findIndex((provider) => provider.id === providerId);
  if (index < 0) return;

  const sum = reviews.reduce((total, review) => total + review.calificacion, 0);
  providers[index] = {
    ...providers[index],
    calificacion_promedio: reviews.length ? Number((sum / reviews.length).toFixed(1)) : 0,
    cantidad_resenas: reviews.length,
  };
  setLocal('proveedores', providers);
}

const LOCAL_NOTIFICATIONS_EVENT = 'sv-local-notifications-changed';
const LOCAL_MESSAGES_EVENT = 'sv-local-messages-changed';
const LOCAL_QUOTES_EVENT = 'sv-local-quotes-changed';

function emitLocalNotificationsChanged(): void {
  window.dispatchEvent(new Event(LOCAL_NOTIFICATIONS_EVENT));
}

function emitLocalMessagesChanged(): void {
  window.dispatchEvent(new Event(LOCAL_MESSAGES_EVENT));
}

function emitLocalQuotesChanged(): void {
  window.dispatchEvent(new Event(LOCAL_QUOTES_EVENT));
}

function historyActorForStatus(status: EstadoSolicitud): HistorialSolicitudEntry['actor_rol'] {
  if (status === 'solicitada') return 'cliente';
  if (status === 'aceptada' || status === 'rechazada' || status === 'en_proceso' || status === 'completada') return 'proveedor';
  return 'sistema';
}

function synthesizeSolicitudHistory(request: SolicitudServicio, entries: HistorialSolicitudEntry[]): HistorialSolicitudEntry[] {
  const merged = [...entries];
  if (!merged.some((entry) => entry.estado === 'solicitada')) {
    merged.push({
      id: 'solicitada_reconstruida',
      estado: 'solicitada',
      actor_id: request.cliente_id,
      actor_rol: 'cliente',
      fecha: request.createdAt,
    });
  }
  if (request.estado !== 'solicitada' && !merged.some((entry) => entry.estado === request.estado)) {
    merged.push({
      id: `${request.estado}_reconstruida`,
      estado: request.estado,
      actor_id: '',
      actor_rol: historyActorForStatus(request.estado),
      fecha: request.updatedAt,
    });
  }
  return merged.sort((a, b) => dateToMillis(a.fecha) - dateToMillis(b.fecha));
}

function notificationForStatus(
  request: SolicitudServicio,
  nextStatus: EstadoSolicitud,
  recipientId: string,
): Omit<Notificacion, 'createdAt'> {
  const statusMessages: Record<EstadoSolicitud, { titulo: string; mensaje: string }> = {
    solicitada: {
      titulo: 'Nueva solicitud de servicio',
      mensaje: `${request.cliente_nombre} solicitó un servicio de ${request.proveedor_oficio}.${request.fecha_preferida && request.hora_preferida ? ` Propone ${request.fecha_preferida} a las ${request.hora_preferida}.` : ''}`,
    },
    aceptada: {
      titulo: 'Solicitud aceptada',
      mensaje: `Tu solicitud de ${request.proveedor_oficio} fue aceptada por el proveedor.`,
    },
    rechazada: {
      titulo: 'Solicitud rechazada',
      mensaje: `El proveedor rechazó tu solicitud de ${request.proveedor_oficio}.`,
    },
    en_proceso: {
      titulo: 'Trabajo en proceso',
      mensaje: `El proveedor indicó que tu trabajo de ${request.proveedor_oficio} está en proceso.`,
    },
    completada: {
      titulo: 'Trabajo completado',
      mensaje: `Tu trabajo de ${request.proveedor_oficio} fue marcado como completado. Ya puedes dejar una reseña si quieres.`,
    },
    cancelada: {
      titulo: 'Solicitud cancelada',
      mensaje: `La solicitud de ${request.proveedor_oficio} fue cancelada.`,
    },
  };
  const content = statusMessages[nextStatus];
  return {
    id: `${request.id}_${nextStatus}`,
    usuario_id: recipientId,
    solicitud_id: request.id,
    tipo: nextStatus === 'solicitada' ? 'nueva_solicitud' : 'estado_solicitud',
    titulo: content.titulo,
    mensaje: content.mensaje,
    estado_solicitud: nextStatus,
    leida: false,
  };
}

function canTransition(
  current: EstadoSolicitud,
  next: EstadoSolicitud,
  role: Usuario['tipo_usuario'],
): boolean {
  if (role === 'admin') return true;
  if (role === 'cliente') {
    return (current === 'solicitada' || current === 'aceptada') && next === 'cancelada';
  }
  const providerTransitions: Record<EstadoSolicitud, EstadoSolicitud[]> = {
    solicitada: ['aceptada', 'rechazada'],
    aceptada: ['en_proceso', 'cancelada'],
    rechazada: [],
    en_proceso: ['completada', 'cancelada'],
    completada: [],
    cancelada: [],
  };
  return providerTransitions[current].includes(next);
}


function normalizeQuoteAmount(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} debe ser un monto válido.`);
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > 100_000_000) {
    throw new Error(`${label} debe estar entre 0 y 100.000.000.`);
  }
  return rounded;
}

function normalizeQuoteValidityDays(value: number): number {
  if (!Number.isFinite(value)) throw new Error('La vigencia debe ser válida.');
  const days = Math.round(value);
  if (![3, 7, 15, 30].includes(days)) throw new Error('Selecciona una vigencia válida.');
  return days;
}

function quoteValidUntil(days: number): Date {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  date.setDate(date.getDate() + days);
  return date;
}

function normalizeCotizacionData(data: Partial<CotizacionSolicitud>, id: 'actual' = 'actual'): CotizacionSolicitud {
  const manoObra = Number(data.mano_obra || 0);
  const materiales = Number(data.materiales || 0);
  const otros = Number(data.otros || 0);
  const costoVisita = Number(data.costo_visita || 0);
  const descuento = Number(data.descuento || 0);
  const calculatedTotal = Math.max(0, manoObra + materiales + otros + costoVisita - descuento);
  const total = Number.isFinite(Number(data.total)) ? Number(data.total) : calculatedTotal;
  return {
    id,
    solicitud_id: String(data.solicitud_id || ''),
    proveedor_id: String(data.proveedor_id || ''),
    cliente_id: String(data.cliente_id || ''),
    mano_obra: manoObra,
    materiales,
    otros,
    costo_visita: costoVisita,
    descuento,
    anticipo: Number(data.anticipo || 0),
    total,
    forma_pago: data.forma_pago || 'por_coordinar',
    vigencia_dias: Number(data.vigencia_dias || 0),
    vigencia_hasta: data.vigencia_hasta || null,
    observaciones: String(data.observaciones || ''),
    estado: data.estado || 'enviada',
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

function quoteNotification(
  request: SolicitudServicio,
  recipientId: string,
  state: EstadoCotizacion,
): Omit<Notificacion, 'createdAt'> {
  const content: Record<EstadoCotizacion, { titulo: string; mensaje: string }> = {
    enviada: {
      titulo: 'Nueva cotización recibida',
      mensaje: `El proveedor envió una cotización para tu solicitud de ${request.proveedor_oficio}.`,
    },
    aceptada: {
      titulo: 'Cotización aceptada',
      mensaje: `${request.cliente_nombre} aceptó la cotización de ${request.proveedor_oficio}.`,
    },
    rechazada: {
      titulo: 'Cotización rechazada',
      mensaje: `${request.cliente_nombre} rechazó la cotización de ${request.proveedor_oficio}. Puedes enviar una nueva propuesta.`,
    },
  };
  const item = content[state];
  return {
    id: `${request.id}_cotizacion_${state}`,
    usuario_id: recipientId,
    solicitud_id: request.id,
    tipo: 'cotizacion',
    titulo: item.titulo,
    mensaje: item.mensaje.slice(0, 300),
    estado_solicitud: request.estado,
    leida: false,
  };
}

export const SVDatabaseService = {
  async getAuditoriaAdmin(): Promise<AdminAuditEntry[]> {
    if (isRealFirebaseConfigured()) {
      const path = 'auditoria_admin';
      try {
        const snapshot = await getDocs(query(
          collection(db, 'auditoria_admin'),
          orderBy('createdAt', 'desc'),
          limit(50),
        ));
        return snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as AdminAuditEntry);
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    }

    initializeSimulatedDatabase();
    return [...getLocal<AdminAuditEntry[]>('auditoria_admin', [])]
      .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt))
      .slice(0, 50);
  },

  async registrarAuditoriaAdmin(
    adminId: string,
    adminName: string,
    action: string,
    targetId: string,
    targetName: string,
    detail = '',
  ): Promise<AdminAuditEntry> {
    const safeAdminName = adminName.trim().slice(0, 100) || 'Administrador';
    const safeAction = action.trim().slice(0, 80);
    const safeTargetName = targetName.trim().slice(0, 120) || 'Sin nombre';
    const safeDetail = detail.trim().slice(0, 500);

    if (isRealFirebaseConfigured()) {
      if (auth.currentUser?.uid !== adminId) {
        throw new Error('La sesión administrativa cambió. Vuelve a iniciar sesión.');
      }
      const auditRef = doc(collection(db, 'auditoria_admin'));
      const payload = {
        id: auditRef.id,
        admin_id: adminId,
        admin_nombre: safeAdminName,
        accion: safeAction,
        objetivo_id: targetId.slice(0, 128),
        objetivo_nombre: safeTargetName,
        detalle: safeDetail,
        createdAt: serverTimestamp(),
      };
      const path = `auditoria_admin/${auditRef.id}`;
      try {
        await setDoc(auditRef, payload);
        return { ...payload, createdAt: new Date().toISOString() };
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    initializeSimulatedDatabase();
    const now = new Date().toISOString();
    const entry: AdminAuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      admin_id: adminId,
      admin_nombre: safeAdminName,
      accion: safeAction,
      objetivo_id: targetId.slice(0, 128),
      objetivo_nombre: safeTargetName,
      detalle: safeDetail,
      createdAt: now,
    };
    const entries = getLocal<AdminAuditEntry[]>('auditoria_admin', []);
    entries.unshift(entry);
    setLocal('auditoria_admin', entries.slice(0, 100));
    return entry;
  },

  async createRegistrationProfiles(usuario: Usuario, provider: Proveedor | null): Promise<void> {
    const userPayload = {
      id: usuario.id,
      nombre: usuario.nombre.trim(),
      email: usuario.email.trim().toLowerCase(),
      telefono: usuario.telefono.trim(),
      ...(usuario.pais_codigo ? { pais_codigo: usuario.pais_codigo } : {}),
      ...(usuario.pais_nombre ? { pais_nombre: usuario.pais_nombre.trim() } : {}),
      ...(usuario.region_codigo ? { region_codigo: usuario.region_codigo.trim() } : {}),
      ...(usuario.region_nombre ? { region_nombre: usuario.region_nombre.trim() } : {}),
      ...(usuario.localidad_nombre ? { localidad_nombre: usuario.localidad_nombre.trim() } : {}),
      ...(usuario.moneda_codigo ? { moneda_codigo: usuario.moneda_codigo } : {}),
      ...(usuario.prefijo_telefonico ? { prefijo_telefonico: usuario.prefijo_telefonico.trim() } : {}),
      tipo_usuario: usuario.tipo_usuario,
      estado_cuenta: 'activa' as const,
      // Campos legacy se conservan para compatibilidad con cuentas creadas antes de 16B.
      politicas_aceptadas: usuario.politicas_aceptadas === true,
      ...(usuario.jurisdiccion_politicas ? { jurisdiccion_politicas: usuario.jurisdiccion_politicas } : {}),
      politicas_version: usuario.politicas_version || '',
      terminos_aceptados: usuario.terminos_aceptados === true,
      terminos_version: usuario.terminos_version || usuario.politicas_version || '',
      privacidad_informada: usuario.privacidad_informada === true,
      privacidad_version: usuario.privacidad_version || usuario.politicas_version || '',
      mayor_18_declarado: usuario.mayor_18_declarado === true,
    };

    if (isRealFirebaseConfigured()) {
      const path = provider
        ? `usuarios/${usuario.id} + proveedores/${provider.id}`
        : `usuarios/${usuario.id}`;
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'usuarios', usuario.id), {
          ...userPayload,
          politicas_aceptadas_at: serverTimestamp(),
          terminos_aceptados_at: serverTimestamp(),
          privacidad_informada_at: serverTimestamp(),
          mayor_18_declarado_at: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        if (provider) {
          batch.set(
            doc(db, 'proveedores', provider.id),
            normalizeProvider({ ...provider, nombre_publico: usuario.nombre.trim() }, provider.id),
          );
        }
        await batch.commit();
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    initializeSimulatedDatabase();
    const users = getLocal<Usuario[]>('usuarios', []);
    const userIndex = users.findIndex((item) => item.id === usuario.id);
    const localUser: Usuario = {
      ...userPayload,
      politicas_aceptadas_at: new Date().toISOString(),
      terminos_aceptados_at: new Date().toISOString(),
      privacidad_informada_at: new Date().toISOString(),
      mayor_18_declarado_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    if (userIndex >= 0) users[userIndex] = localUser;
    else users.push(localUser);
    setLocal('usuarios', users);

    if (provider) {
      const providers = getLocal<Proveedor[]>('proveedores', []);
      const normalized = normalizeProvider(
        { ...provider, nombre_publico: usuario.nombre.trim() },
        provider.id,
      );
      const providerIndex = providers.findIndex((item) => item.id === provider.id);
      if (providerIndex >= 0) providers[providerIndex] = normalized;
      else providers.push(normalized);
      setLocal('proveedores', providers);
    }
  },

  async getUsuario(userId: string): Promise<Usuario | null> {
    if (isRealFirebaseConfigured()) {
      const path = `usuarios/${userId}`;
      try {
        const snapshot = await getDoc(doc(db, 'usuarios', userId));
        return snapshot.exists() ? normalizeUser(snapshot.data(), snapshot.id) : null;
      } catch (error) {
        return handleFirestoreError(error, OperationType.GET, path);
      }
    }

    initializeSimulatedDatabase();
    const user = getLocal<Usuario[]>('usuarios', []).find((item) => item.id === userId);
    return user ? normalizeUser(user, user.id) : null;
  },

  subscribeUsuario(
    userId: string,
    onData: (user: Usuario | null) => void,
    onError?: (error: Error) => void,
  ): () => void {
    if (isRealFirebaseConfigured()) {
      return onSnapshot(
        doc(db, 'usuarios', userId),
        (snapshot) => onData(snapshot.exists() ? normalizeUser(snapshot.data(), snapshot.id) : null),
        (error) => onError?.(error),
      );
    }

    initializeSimulatedDatabase();
    const user = getLocal<Usuario[]>('usuarios', []).find((item) => item.id === userId);
    onData(user ? normalizeUser(user, user.id) : null);
    return () => undefined;
  },

  async getUsuarios(): Promise<Usuario[]> {
    if (isRealFirebaseConfigured()) {
      const path = 'usuarios';
      try {
        const snapshot = await getDocs(collection(db, 'usuarios'));
        return snapshot.docs.map((item) => normalizeUser(item.data(), item.id));
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    }

    initializeSimulatedDatabase();
    return getLocal<Usuario[]>('usuarios', []).map((user) => normalizeUser(user, user.id));
  },

  async saveUsuario(usuario: Usuario): Promise<void> {
    const payload = {
      id: usuario.id,
      nombre: usuario.nombre.trim(),
      email: usuario.email.trim().toLowerCase(),
      telefono: usuario.telefono.trim(),
      ...(usuario.pais_codigo ? { pais_codigo: usuario.pais_codigo } : {}),
      ...(usuario.pais_nombre ? { pais_nombre: usuario.pais_nombre.trim() } : {}),
      ...(usuario.region_codigo ? { region_codigo: usuario.region_codigo.trim() } : {}),
      ...(usuario.region_nombre ? { region_nombre: usuario.region_nombre.trim() } : {}),
      ...(usuario.localidad_nombre ? { localidad_nombre: usuario.localidad_nombre.trim() } : {}),
      ...(usuario.moneda_codigo ? { moneda_codigo: usuario.moneda_codigo } : {}),
      ...(usuario.prefijo_telefonico ? { prefijo_telefonico: usuario.prefijo_telefonico.trim() } : {}),
      tipo_usuario: usuario.tipo_usuario,
      estado_cuenta: usuario.estado_cuenta || 'activa',
    };

    if (isRealFirebaseConfigured()) {
      const path = `usuarios/${usuario.id}`;
      try {
        await setDoc(doc(db, 'usuarios', usuario.id), { ...payload, createdAt: serverTimestamp() });
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    initializeSimulatedDatabase();
    const users = getLocal<Usuario[]>('usuarios', []);
    const index = users.findIndex((user) => user.id === usuario.id);
    const localPayload: Usuario = { ...payload, createdAt: new Date().toISOString() };
    if (index >= 0) users[index] = localPayload;
    else users.push(localPayload);
    setLocal('usuarios', users);
  },

  async updateUsuarioPersonal(
    userId: string,
    changes: Pick<Usuario, 'nombre' | 'telefono'> & Partial<Pick<Usuario, 'pais_codigo' | 'pais_nombre' | 'region_codigo' | 'region_nombre' | 'localidad_nombre' | 'moneda_codigo' | 'prefijo_telefonico'>>,
  ): Promise<void> {
    const payload = {
      nombre: changes.nombre.trim(),
      telefono: changes.telefono.trim(),
      ...(changes.pais_codigo ? { pais_codigo: changes.pais_codigo } : {}),
      ...(changes.pais_nombre ? { pais_nombre: changes.pais_nombre.trim() } : {}),
      ...(changes.region_codigo ? { region_codigo: changes.region_codigo.trim() } : {}),
      ...(changes.region_nombre ? { region_nombre: changes.region_nombre.trim() } : {}),
      ...(changes.localidad_nombre ? { localidad_nombre: changes.localidad_nombre.trim() } : {}),
      ...(changes.moneda_codigo ? { moneda_codigo: changes.moneda_codigo } : {}),
      ...(changes.prefijo_telefonico ? { prefijo_telefonico: changes.prefijo_telefonico.trim() } : {}),
    };
    if (isRealFirebaseConfigured()) {
      const path = `usuarios/${userId}`;
      try {
        await updateDoc(doc(db, 'usuarios', userId), payload);
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const users = getLocal<Usuario[]>('usuarios', []);
    const index = users.findIndex((user) => user.id === userId);
    if (index >= 0) {
      users[index] = { ...users[index], ...payload };
      setLocal('usuarios', users);
    }
  },

  async aceptarPoliticas(userId: string, version: string, countryCode: Usuario['pais_codigo'] = 'CL'): Promise<void> {
    const normalizedVersion = version.trim();
    if (!normalizedVersion || normalizedVersion.length > 30) {
      throw new Error('La versión de las políticas no es válida.');
    }

    if (isRealFirebaseConfigured()) {
      const path = `usuarios/${userId}`;
      try {
        await updateDoc(doc(db, 'usuarios', userId), {
          // Compatibilidad con versiones anteriores.
          politicas_aceptadas: true,
          jurisdiccion_politicas: countryCode || 'CL',
          politicas_version: normalizedVersion,
          politicas_aceptadas_at: serverTimestamp(),
          // Desde 16B se separa aceptación contractual de constancia de información.
          terminos_aceptados: true,
          terminos_version: normalizedVersion,
          terminos_aceptados_at: serverTimestamp(),
          privacidad_informada: true,
          privacidad_version: normalizedVersion,
          privacidad_informada_at: serverTimestamp(),
          mayor_18_declarado: true,
          mayor_18_declarado_at: serverTimestamp(),
        });
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const users = getLocal<Usuario[]>('usuarios', []);
    const index = users.findIndex((user) => user.id === userId);
    if (index >= 0) {
      const now = new Date().toISOString();
      users[index] = {
        ...users[index],
        politicas_aceptadas: true,
        jurisdiccion_politicas: countryCode || 'CL',
        politicas_version: normalizedVersion,
        politicas_aceptadas_at: now,
        terminos_aceptados: true,
        terminos_version: normalizedVersion,
        terminos_aceptados_at: now,
        privacidad_informada: true,
        privacidad_version: normalizedVersion,
        privacidad_informada_at: now,
        mayor_18_declarado: true,
        mayor_18_declarado_at: now,
      };
      setLocal('usuarios', users);
    }
  },

  async crearSolicitudPrivacidad(
    user: Usuario,
    type: TipoSolicitudPrivacidad,
    detail: string,
    requestTemporaryBlock = false,
  ): Promise<SolicitudPrivacidad> {
    const safeDetail = detail.trim();
    if (safeDetail.length < 10 || safeDetail.length > 1500) {
      throw new Error('Describe tu solicitud con al menos 10 caracteres y un máximo de 1500.');
    }
    const blockAllowed = ['rectificacion', 'supresion', 'oposicion'].includes(type);
    const asksBlock = blockAllowed && requestTemporaryBlock;

    if (isRealFirebaseConfigured()) {
      if (!auth.currentUser || auth.currentUser.uid !== user.id) {
        throw new Error('Debes iniciar sesión nuevamente para enviar una solicitud de privacidad.');
      }
      const reference = doc(collection(db, 'solicitudes_privacidad'));
      const path = `solicitudes_privacidad/${reference.id}`;
      const payload = {
        id: reference.id,
        usuario_id: user.id,
        usuario_nombre: user.nombre.trim(),
        usuario_email: user.email.trim().toLowerCase(),
        usuario_tipo: user.tipo_usuario,
        tipo: type,
        detalle: safeDetail,
        solicita_bloqueo_temporal: asksBlock,
        estado_bloqueo: asksBlock ? 'pendiente' : 'no_solicitado',
        estado: 'pendiente',
        respuesta_admin: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      try {
        await setDoc(reference, payload);
        return { ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as SolicitudPrivacidad;
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    initializeSimulatedDatabase();
    const now = new Date().toISOString();
    const request: SolicitudPrivacidad = {
      id: `priv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      usuario_id: user.id,
      usuario_nombre: user.nombre.trim(),
      usuario_email: user.email.trim().toLowerCase(),
      usuario_tipo: user.tipo_usuario,
      tipo: type,
      detalle: safeDetail,
      solicita_bloqueo_temporal: asksBlock,
      estado_bloqueo: asksBlock ? 'pendiente' : 'no_solicitado',
      estado: 'pendiente',
      respuesta_admin: '',
      createdAt: now,
      updatedAt: now,
    };
    const requests = getLocal<SolicitudPrivacidad[]>('solicitudes_privacidad', []);
    requests.unshift(request);
    setLocal('solicitudes_privacidad', requests);
    return request;
  },

  async getSolicitudesPrivacidadUsuario(userId: string): Promise<SolicitudPrivacidad[]> {
    if (isRealFirebaseConfigured()) {
      if (!auth.currentUser || auth.currentUser.uid !== userId) {
        throw new Error('La sesión autenticada no coincide con el titular de los datos.');
      }
      const path = `solicitudes_privacidad?usuario_id=${userId}`;
      try {
        const snapshot = await getDocs(query(collection(db, 'solicitudes_privacidad'), where('usuario_id', '==', userId)));
        return snapshot.docs
          .map((item) => ({ ...item.data(), id: item.id }) as SolicitudPrivacidad)
          .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt));
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    }
    initializeSimulatedDatabase();
    return getLocal<SolicitudPrivacidad[]>('solicitudes_privacidad', [])
      .filter((item) => item.usuario_id === userId)
      .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt));
  },

  async getSolicitudesPrivacidadAdmin(): Promise<SolicitudPrivacidad[]> {
    if (isRealFirebaseConfigured()) {
      const path = 'solicitudes_privacidad';
      try {
        const snapshot = await getDocs(collection(db, 'solicitudes_privacidad'));
        return snapshot.docs
          .map((item) => ({ ...item.data(), id: item.id }) as SolicitudPrivacidad)
          .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt));
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    }
    initializeSimulatedDatabase();
    return [...getLocal<SolicitudPrivacidad[]>('solicitudes_privacidad', [])]
      .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt));
  },

  async resolverSolicitudPrivacidad(
    requestId: string,
    state: EstadoSolicitudPrivacidad,
    response: string,
    blockState?: EstadoBloqueoPrivacidad,
  ): Promise<void> {
    const safeResponse = response.trim();
    if (['resuelta', 'rechazada'].includes(state) && safeResponse.length < 3) {
      throw new Error('Escribe una respuesta para el titular antes de cerrar la solicitud.');
    }

    if (isRealFirebaseConfigured()) {
      const path = `solicitudes_privacidad/${requestId}`;
      try {
        const changes: Record<string, unknown> = {
          estado: state,
          respuesta_admin: safeResponse,
          updatedAt: serverTimestamp(),
        };
        if (blockState) changes.estado_bloqueo = blockState;
        await updateDoc(doc(db, 'solicitudes_privacidad', requestId), changes);
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    initializeSimulatedDatabase();
    const requests = getLocal<SolicitudPrivacidad[]>('solicitudes_privacidad', []);
    const index = requests.findIndex((item) => item.id === requestId);
    if (index >= 0) {
      requests[index] = {
        ...requests[index],
        estado: state,
        respuesta_admin: safeResponse,
        ...(blockState ? { estado_bloqueo: blockState } : {}),
        updatedAt: new Date().toISOString(),
      };
      setLocal('solicitudes_privacidad', requests);
    }
  },

  async getResumenDatosPersonales(user: Usuario): Promise<Record<string, unknown>> {
    const account = await SVDatabaseService.getUsuario(user.id);
    const requests = user.tipo_usuario === 'proveedor'
      ? await SVDatabaseService.getSolicitudesProveedor(user.id)
      : user.tipo_usuario === 'cliente'
        ? await SVDatabaseService.getSolicitudesCliente(user.id)
        : [];
    const provider = user.tipo_usuario === 'proveedor' ? await SVDatabaseService.getProveedor(user.id) : null;
    const favorites = user.tipo_usuario === 'cliente' ? await SVDatabaseService.getFavoritos(user.id) : [];
    const privacyRequests = await SVDatabaseService.getSolicitudesPrivacidadUsuario(user.id);
    return {
      exportado_en: new Date().toISOString(),
      alcance: 'Resumen descargable. Para un acceso o portabilidad completa puedes usar la solicitud formal del Centro de privacidad.',
      cuenta: account,
      perfil_proveedor: provider,
      solicitudes_servicio: requests,
      favoritos: favorites,
      solicitudes_privacidad: privacyRequests,
    };
  },

  async updateProviderPublicName(providerId: string, publicName: string): Promise<void> {
    const nombrePublico = publicName.trim();
    if (nombrePublico.length < 2 || nombrePublico.length > 100) {
      throw new Error('El nombre público debe tener entre 2 y 100 caracteres.');
    }

    if (isRealFirebaseConfigured()) {
      const path = `proveedores/${providerId}`;
      try {
        await updateDoc(doc(db, 'proveedores', providerId), { nombre_publico: nombrePublico });
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const providers = getLocal<Proveedor[]>('proveedores', []);
    const index = providers.findIndex((provider) => provider.id === providerId);
    if (index >= 0) {
      providers[index] = { ...providers[index], nombre_publico: nombrePublico };
      setLocal('proveedores', providers);
    }
  },

  async updateProviderAccountData(
    providerId: string,
    changes: { nombre_publico: string; ubicacion: string } & Partial<Pick<Proveedor, 'pais_codigo' | 'pais_nombre' | 'region_codigo' | 'region_nombre' | 'localidad_nombre' | 'moneda_codigo' | 'prefijo_telefonico'>>,
  ): Promise<void> {
    const payload = {
      nombre_publico: changes.nombre_publico.trim(),
      ubicacion: changes.ubicacion.trim(),
      ...(changes.pais_codigo ? { pais_codigo: changes.pais_codigo } : {}),
      ...(changes.pais_nombre ? { pais_nombre: changes.pais_nombre.trim() } : {}),
      ...(changes.region_codigo ? { region_codigo: changes.region_codigo.trim() } : {}),
      ...(changes.region_nombre ? { region_nombre: changes.region_nombre.trim() } : {}),
      ...(changes.localidad_nombre ? { localidad_nombre: changes.localidad_nombre.trim() } : {}),
      ...(changes.moneda_codigo ? { moneda_codigo: changes.moneda_codigo } : {}),
      ...(changes.prefijo_telefonico ? { prefijo_telefonico: changes.prefijo_telefonico.trim() } : {}),
    };

    if (isRealFirebaseConfigured()) {
      const path = `proveedores/${providerId}`;
      try {
        await updateDoc(doc(db, 'proveedores', providerId), payload);
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const providers = getLocal<Proveedor[]>('proveedores', []);
    const index = providers.findIndex((provider) => provider.id === providerId);
    if (index >= 0) {
      providers[index] = { ...providers[index], ...payload };
      setLocal('proveedores', providers);
    }
  },

  async getProveedores(): Promise<Proveedor[]> {
    if (isRealFirebaseConfigured()) {
      const path = 'proveedores';
      try {
        const snapshot = await getDocs(collection(db, 'proveedores'));
        return snapshot.docs.map((item) => normalizeProvider(item.data(), item.id));
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    }

    initializeSimulatedDatabase();
    return getLocal<Proveedor[]>('proveedores', []).map((provider) => normalizeProvider(provider, provider.id));
  },

  async getFavoritos(userId: string): Promise<string[]> {
    if (isRealFirebaseConfigured()) {
      const path = `usuarios/${userId}/favoritos`;
      try {
        const snapshot = await getDocs(collection(db, 'usuarios', userId, 'favoritos'));
        return snapshot.docs.map((item) => String(item.data().proveedor_id || item.id));
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    }

    initializeSimulatedDatabase();
    const favorites = getLocal<Record<string, string[]>>('favoritos', {});
    return favorites[userId] || [];
  },

  async addFavorito(userId: string, providerId: string): Promise<void> {
    if (isRealFirebaseConfigured()) {
      const path = `usuarios/${userId}/favoritos/${providerId}`;
      try {
        await setDoc(doc(db, 'usuarios', userId, 'favoritos', providerId), {
          proveedor_id: providerId,
          createdAt: serverTimestamp(),
        });
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    initializeSimulatedDatabase();
    const favorites = getLocal<Record<string, string[]>>('favoritos', {});
    const current = new Set(favorites[userId] || []);
    current.add(providerId);
    favorites[userId] = [...current];
    setLocal('favoritos', favorites);
  },

  async removeFavorito(userId: string, providerId: string): Promise<void> {
    if (isRealFirebaseConfigured()) {
      const path = `usuarios/${userId}/favoritos/${providerId}`;
      try {
        await deleteDoc(doc(db, 'usuarios', userId, 'favoritos', providerId));
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.DELETE, path);
      }
    }

    initializeSimulatedDatabase();
    const favorites = getLocal<Record<string, string[]>>('favoritos', {});
    favorites[userId] = (favorites[userId] || []).filter((id) => id !== providerId);
    setLocal('favoritos', favorites);
  },

  async getProveedor(providerId: string): Promise<Proveedor | null> {
    if (isRealFirebaseConfigured()) {
      const path = `proveedores/${providerId}`;
      try {
        const snapshot = await getDoc(doc(db, 'proveedores', providerId));
        return snapshot.exists() ? normalizeProvider(snapshot.data(), snapshot.id) : null;
      } catch (error) {
        return handleFirestoreError(error, OperationType.GET, path);
      }
    }

    initializeSimulatedDatabase();
    const provider = getLocal<Proveedor[]>('proveedores', []).find((item) => item.id === providerId);
    return provider ? normalizeProvider(provider, provider.id) : null;
  },

  async createProveedor(provider: Proveedor): Promise<void> {
    const normalized = normalizeProvider(provider, provider.id);
    if (isRealFirebaseConfigured()) {
      const path = `proveedores/${provider.id}`;
      try {
        await setDoc(doc(db, 'proveedores', provider.id), normalized);
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    initializeSimulatedDatabase();
    const providers = getLocal<Proveedor[]>('proveedores', []);
    const index = providers.findIndex((item) => item.id === provider.id);
    if (index >= 0) providers[index] = normalized;
    else providers.push(normalized);
    setLocal('proveedores', providers);
  },

  async updateProveedorProfile(providerId: string, changes: ProviderProfileUpdate): Promise<void> {
    const safeCategories = Array.from(new Set(changes.categorias)).slice(0, 5);
    const safeChanges = {
      categoria_id: safeCategories[0] || changes.categoria_id,
      categorias: safeCategories.length ? safeCategories : [changes.categoria_id],
      oficio: changes.oficio.trim(),
      experiencia: Number(changes.experiencia),
      descripcion: changes.descripcion.trim(),
      whatsapp: changes.whatsapp.trim(),
    };

    if (isRealFirebaseConfigured()) {
      const path = `proveedores/${providerId}`;
      try {
        await updateDoc(doc(db, 'proveedores', providerId), safeChanges);
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const providers = getLocal<Proveedor[]>('proveedores', []);
    const index = providers.findIndex((item) => item.id === providerId);
    if (index >= 0) {
      providers[index] = normalizeProvider({ ...providers[index], ...safeChanges }, providerId);
      setLocal('proveedores', providers);
    }
  },

  async updateProviderAvailability(
    providerId: string,
    disponibilidad: DisponibilidadProveedor,
    horarioAtencion: string,
    agendaSemanal: AgendaSemanalProveedor,
  ): Promise<void> {
    const safeHours = horarioAtencion.trim().slice(0, 120);
    const safeSchedule = normalizeWeeklySchedule(agendaSemanal);
    if (!safeSchedule) throw new Error('La agenda semanal tiene un formato inválido.');

    for (const [day, slot] of Object.entries(safeSchedule)) {
      if (!slot.activo) continue;
      if (!/^\d{2}:\d{2}$/.test(slot.desde) || !/^\d{2}:\d{2}$/.test(slot.hasta) || slot.desde >= slot.hasta) {
        throw new Error(`Revisa el horario configurado para ${day}.`);
      }
    }

    if (isRealFirebaseConfigured()) {
      const path = `proveedores/${providerId}`;
      try {
        await updateDoc(doc(db, 'proveedores', providerId), {
          disponibilidad,
          horario_atencion: safeHours,
          agenda_semanal: safeSchedule,
        });
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    initializeSimulatedDatabase();
    const providers = getLocal<Proveedor[]>('proveedores', []);
    const index = providers.findIndex((item) => item.id === providerId);
    if (index >= 0) {
      providers[index] = {
        ...providers[index],
        disponibilidad,
        horario_atencion: safeHours,
        agenda_semanal: safeSchedule,
      };
      setLocal('proveedores', providers);
    }
  },

  async updateProviderPhotos(providerId: string, photos: string[]): Promise<void> {
    const limitedPhotos = photos.filter(Boolean).slice(0, 12);
    if (isRealFirebaseConfigured()) {
      const path = `proveedores/${providerId}`;
      try {
        await updateDoc(doc(db, 'proveedores', providerId), { fotos_trabajos: limitedPhotos });
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const providers = getLocal<Proveedor[]>('proveedores', []);
    const index = providers.findIndex((item) => item.id === providerId);
    if (index >= 0) {
      providers[index] = { ...providers[index], fotos_trabajos: limitedPhotos };
      setLocal('proveedores', providers);
    }
  },

  async solicitarVerificacionProveedor(providerId: string): Promise<void> {
    if (isRealFirebaseConfigured()) {
      const path = `proveedores/${providerId}`;
      try {
        await updateDoc(doc(db, 'proveedores', providerId), {
          // Para una nueva revisión solo cambiamos los campos que el proveedor
          // está autorizado a controlar. Conservamos la fecha de resolución
          // anterior como historial técnico; al resolver esta nueva solicitud
          // el administrador la reemplazará por una fecha nueva.
          verificado: false,
          estado_verificacion: 'pendiente',
          verificacion_solicitada_at: serverTimestamp(),
          verificacion_observacion: '',
        });
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const providers = getLocal<Proveedor[]>('proveedores', []);
    const index = providers.findIndex((provider) => provider.id === providerId);
    if (index >= 0) {
      providers[index] = {
        ...providers[index],
        verificado: false,
        estado_verificacion: 'pendiente',
        verificacion_solicitada_at: new Date().toISOString(),
        verificacion_observacion: '',
      };
      setLocal('proveedores', providers);
    }
  },

  async resolverVerificacionProveedor(
    providerId: string,
    state: 'verificado' | 'rechazado' | 'sin_solicitar',
    observation = '',
  ): Promise<void> {
    const verified = state === 'verificado';
    const safeObservation = observation.trim().slice(0, 300);

    if (isRealFirebaseConfigured()) {
      const path = `proveedores/${providerId}`;
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'proveedores', providerId), {
          verificado: verified,
          estado_verificacion: state,
          verificacion_resuelta_at: serverTimestamp(),
          verificacion_observacion: safeObservation,
        });
        const notificationId = `verificacion_${state}_${Date.now()}`;
        const notificationText = state === 'verificado'
          ? {
              titulo: 'Verificación aprobada',
              mensaje: 'Tu perfil profesional fue aprobado por la administración de Servicios Vecinales.',
            }
          : state === 'rechazado'
            ? {
                titulo: 'Verificación rechazada',
                mensaje: safeObservation
                  ? `Tu solicitud de verificación fue rechazada. Motivo: ${safeObservation}`
                  : 'Tu solicitud de verificación fue rechazada. Puedes corregir tu perfil y solicitar una nueva revisión.',
              }
            : {
                titulo: 'Verificación retirada',
                mensaje: safeObservation
                  ? `La administración retiró la verificación de tu perfil. Motivo: ${safeObservation}`
                  : 'La administración retiró temporalmente la verificación de tu perfil.',
              };
        batch.set(doc(db, 'usuarios', providerId, 'notificaciones', notificationId), {
          id: notificationId,
          usuario_id: providerId,
          tipo: 'verificacion',
          titulo: notificationText.titulo,
          mensaje: notificationText.mensaje.slice(0, 300),
          leida: false,
          createdAt: serverTimestamp(),
        });
        await batch.commit();
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const providers = getLocal<Proveedor[]>('proveedores', []);
    const index = providers.findIndex((provider) => provider.id === providerId);
    if (index >= 0) {
      providers[index] = {
        ...providers[index],
        verificado: verified,
        estado_verificacion: state,
        verificacion_resuelta_at: new Date().toISOString(),
        verificacion_observacion: safeObservation,
      };
      setLocal('proveedores', providers);

      const notifications = getLocal<Notificacion[]>('notificaciones', []);
      notifications.unshift({
        id: `verificacion_${state}_${Date.now()}`,
        usuario_id: providerId,
        tipo: 'verificacion',
        titulo: state === 'verificado' ? 'Verificación aprobada' : state === 'rechazado' ? 'Verificación rechazada' : 'Verificación retirada',
        mensaje: state === 'verificado'
          ? 'Tu perfil profesional fue aprobado por la administración de Servicios Vecinales.'
          : safeObservation || (state === 'rechazado'
            ? 'Tu solicitud de verificación fue rechazada. Puedes solicitar una nueva revisión.'
            : 'La administración retiró temporalmente la verificación de tu perfil.'),
        leida: false,
        createdAt: new Date().toISOString(),
      });
      setLocal('notificaciones', notifications);
      emitLocalNotificationsChanged();
    }
  },

  async getResenas(providerId: string): Promise<Resena[]> {
    if (isRealFirebaseConfigured()) {
      const path = `proveedores/${providerId}/resenas`;
      try {
        const snapshot = await getDocs(collection(db, 'proveedores', providerId, 'resenas'));
        return snapshot.docs
          .map((item) => ({ ...item.data(), id: item.id }) as Resena)
          .sort((a, b) => dateToMillis(b.fecha) - dateToMillis(a.fecha));
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    }

    initializeSimulatedDatabase();
    const reviews = getLocal<Record<string, Resena[]>>('resenas', {})[providerId] || [];
    return [...reviews].sort((a, b) => dateToMillis(b.fecha) - dateToMillis(a.fecha));
  },

  async hasResenaSolicitud(providerId: string, requestId: string): Promise<boolean> {
    if (isRealFirebaseConfigured()) {
      const path = `proveedores/${providerId}/resenas/${requestId}`;
      try {
        const reviewSnapshot = await getDoc(doc(db, 'proveedores', providerId, 'resenas', requestId));
        return reviewSnapshot.exists();
      } catch (error) {
        return handleFirestoreError(error, OperationType.GET, path);
      }
    }

    initializeSimulatedDatabase();
    const reviews = getLocal<Record<string, Resena[]>>('resenas', {})[providerId] || [];
    return reviews.some((review) => review.solicitud_id === requestId);
  },

  async saveResena(providerId: string, review: NuevaResena): Promise<Resena> {
    const reviewId = review.solicitud_id;
    const comment = review.comentario.trim();

    if (!Number.isInteger(review.calificacion) || review.calificacion < 1 || review.calificacion > 5) {
      throw new Error('La calificación debe ser de 1 a 5 estrellas.');
    }
    if (comment.length < 10 || comment.length > 1000) {
      throw new Error('El comentario debe tener entre 10 y 1000 caracteres.');
    }

    if (isRealFirebaseConfigured()) {
      const path = `proveedores/${providerId}/resenas/${reviewId}`;
      try {
        const batch = writeBatch(db);
        const reviewRef = doc(db, 'proveedores', providerId, 'resenas', reviewId);
        const notificationId = `${reviewId}_resena`;
        const notificationRef = doc(
          db,
          'usuarios',
          providerId,
          'notificaciones',
          notificationId,
        );

        batch.set(reviewRef, {
          id: reviewId,
          solicitud_id: review.solicitud_id,
          cliente_id: review.cliente_id,
          cliente_nombre: review.cliente_nombre.trim(),
          proveedor_id: providerId,
          calificacion: review.calificacion,
          comentario: comment,
          fecha: serverTimestamp(),
        });
        batch.set(notificationRef, {
          id: notificationId,
          usuario_id: providerId,
          solicitud_id: review.solicitud_id,
          tipo: 'nueva_resena',
          titulo: 'Nueva reseña recibida',
          mensaje: `${review.cliente_nombre.trim()} calificó tu servicio con ${review.calificacion} estrella${review.calificacion === 1 ? '' : 's'}.`,
          estado_solicitud: 'completada',
          leida: false,
          createdAt: serverTimestamp(),
        });
        await batch.commit();
        return { ...review, id: reviewId, proveedor_id: providerId, comentario: comment, fecha: new Date() };
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    initializeSimulatedDatabase();
    const reviewsByProvider = getLocal<Record<string, Resena[]>>('resenas', {});
    const existing = reviewsByProvider[providerId] || [];
    if (existing.some((item) => item.solicitud_id === review.solicitud_id)) {
      throw new Error('Esta solicitud ya tiene una reseña publicada.');
    }
    const localReview: Resena = {
      ...review,
      id: reviewId,
      proveedor_id: providerId,
      comentario: comment,
      fecha: new Date().toISOString(),
    };
    reviewsByProvider[providerId] = [localReview, ...existing];
    setLocal('resenas', reviewsByProvider);
    recalculateLocalRating(providerId);

    const localNotifications = getLocal<Notificacion[]>('notificaciones', []);
    localNotifications.unshift({
      id: `${reviewId}_resena`,
      usuario_id: providerId,
      solicitud_id: review.solicitud_id,
      tipo: 'nueva_resena',
      titulo: 'Nueva reseña recibida',
      mensaje: `${review.cliente_nombre.trim()} calificó tu servicio con ${review.calificacion} estrella${review.calificacion === 1 ? '' : 's'}.`,
      estado_solicitud: 'completada',
      leida: false,
      createdAt: new Date().toISOString(),
    });
    setLocal('notificaciones', localNotifications);
    emitLocalNotificationsChanged();
    return localReview;
  },

  async createSolicitud(request: NuevaSolicitudServicio): Promise<SolicitudServicio> {
    const clienteNombre = request.cliente_nombre.trim();
    const proveedorOficio = request.proveedor_oficio.trim();
    const descripcion = request.descripcion.trim();
    const ubicacion = request.ubicacion.trim();
    const telefonoContacto = request.telefono_contacto.replace(/\D/g, '');
    const preferredSchedule = normalizePreferredSchedule(request.fecha_preferida, request.hora_preferida);

    if (descripcion.length < 15 || descripcion.length > 1000) {
      throw new Error('La descripción de la solicitud debe tener entre 15 y 1000 caracteres.');
    }
    if (ubicacion.length < 3 || ubicacion.length > 120) {
      throw new Error('La ubicación de la solicitud debe tener entre 3 y 120 caracteres.');
    }
    if (telefonoContacto.length < 8 || telefonoContacto.length > 15) {
      throw new Error('El teléfono de contacto debe tener entre 8 y 15 dígitos.');
    }

    const existingRequests = await SVDatabaseService.getSolicitudesCliente(request.cliente_id);
    const existingActiveRequest = existingRequests.find(
      (item) =>
        item.proveedor_id === request.proveedor_id &&
        ['solicitada', 'aceptada', 'en_proceso'].includes(item.estado),
    );
    if (existingActiveRequest) {
      throw new Error('Ya tienes una solicitud activa con este proveedor. Espera a que finalice antes de solicitar otro servicio.');
    }

    if (isRealFirebaseConfigured()) {
      const authenticatedUid = auth.currentUser?.uid;
      if (!authenticatedUid) {
        throw new Error('Debes iniciar sesión nuevamente antes de enviar una solicitud.');
      }
      if (authenticatedUid !== request.cliente_id) {
        throw new Error('La sesión autenticada no coincide con el perfil del cliente.');
      }

      const ref = doc(collection(db, 'solicitudes'));
      const path = `solicitudes/${ref.id}`;
      try {
        const payload = {
          id: ref.id,
          cliente_id: authenticatedUid,
          cliente_nombre: clienteNombre,
          proveedor_id: request.proveedor_id,
          proveedor_oficio: proveedorOficio,
          descripcion,
          ubicacion,
          telefono_contacto: telefonoContacto,
          ...preferredSchedule,
          estado: 'solicitada' as const,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        const createdRequest: SolicitudServicio = {
          ...payload,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const notification = notificationForStatus(
          createdRequest,
          'solicitada',
          request.proveedor_id,
        );
        const notificationRef = doc(
          db,
          'usuarios',
          request.proveedor_id,
          'notificaciones',
          notification.id,
        );
        const historyRef = doc(db, 'solicitudes', ref.id, 'historial', 'solicitada');
        const batch = writeBatch(db);
        batch.set(ref, payload);
        batch.set(historyRef, {
          id: 'solicitada',
          estado: 'solicitada',
          actor_id: authenticatedUid,
          actor_rol: 'cliente',
          fecha: serverTimestamp(),
        });
        batch.set(notificationRef, {
          ...notification,
          createdAt: serverTimestamp(),
        });
        await batch.commit();
        return createdRequest;
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    initializeSimulatedDatabase();
    const id = `sol_${Date.now()}`;
    const localRequest: SolicitudServicio = {
      ...request,
      cliente_nombre: clienteNombre,
      proveedor_oficio: proveedorOficio,
      descripcion,
      ubicacion,
      telefono_contacto: telefonoContacto,
      ...preferredSchedule,
      id,
      estado: 'solicitada',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const requests = getLocal<SolicitudServicio[]>('solicitudes', []);
    requests.unshift(localRequest);
    setLocal('solicitudes', requests);

    const localHistory = getLocal<Record<string, HistorialSolicitudEntry[]>>('historial_solicitudes', {});
    localHistory[id] = [
      {
        id: 'solicitada',
        estado: 'solicitada',
        actor_id: request.cliente_id,
        actor_rol: 'cliente',
        fecha: localRequest.createdAt,
      },
    ];
    setLocal('historial_solicitudes', localHistory);

    const localNotifications = getLocal<Notificacion[]>('notificaciones', []);
    localNotifications.unshift({
      ...notificationForStatus(localRequest, 'solicitada', request.proveedor_id),
      createdAt: new Date().toISOString(),
    });
    setLocal('notificaciones', localNotifications);
    emitLocalNotificationsChanged();
    return localRequest;
  },

  async getHistorialSolicitud(request: SolicitudServicio): Promise<HistorialSolicitudEntry[]> {
    if (isRealFirebaseConfigured()) {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('Debes iniciar sesión nuevamente para consultar el historial.');
      if (uid !== request.cliente_id && uid !== request.proveedor_id) {
        const user = await SVDatabaseService.getUsuario(uid);
        if (user?.tipo_usuario !== 'admin') throw new Error('No tienes permiso para consultar este historial.');
      }
      const path = `solicitudes/${request.id}/historial`;
      try {
        const snapshot = await getDocs(collection(db, 'solicitudes', request.id, 'historial'));
        const entries = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as HistorialSolicitudEntry);
        return synthesizeSolicitudHistory(request, entries);
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    }

    initializeSimulatedDatabase();
    const localHistory = getLocal<Record<string, HistorialSolicitudEntry[]>>('historial_solicitudes', {});
    return synthesizeSolicitudHistory(request, localHistory[request.id] || []);
  },

  async getSolicitudesCliente(clientId: string): Promise<SolicitudServicio[]> {
    if (isRealFirebaseConfigured()) {
      if (!auth.currentUser) {
        throw new Error('Debes iniciar sesión nuevamente para consultar tus solicitudes.');
      }
      if (auth.currentUser.uid !== clientId) {
        throw new Error('La sesión autenticada no coincide con el perfil del cliente.');
      }
      const path = `solicitudes?cliente_id=${clientId}`;
      try {
        const snapshot = await getDocs(
          query(collection(db, 'solicitudes'), where('cliente_id', '==', clientId)),
        );
        return snapshot.docs
          .map((item) => ({ ...item.data(), id: item.id }) as SolicitudServicio)
          .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt));
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    }

    initializeSimulatedDatabase();
    return getLocal<SolicitudServicio[]>('solicitudes', [])
      .filter((item) => item.cliente_id === clientId)
      .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt));
  },

  subscribeSolicitudesCliente(
    clientId: string,
    onData: (requests: SolicitudServicio[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    if (isRealFirebaseConfigured()) {
      if (!auth.currentUser || auth.currentUser.uid !== clientId) {
        onError?.(new Error('La sesión autenticada no coincide con el perfil del cliente.'));
        return () => undefined;
      }
      return onSnapshot(
        query(collection(db, 'solicitudes'), where('cliente_id', '==', clientId)),
        (snapshot) => {
          onData(
            snapshot.docs
              .map((item) => ({ ...item.data(), id: item.id }) as SolicitudServicio)
              .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt)),
          );
        },
        (error) => onError?.(error),
      );
    }

    initializeSimulatedDatabase();
    onData(
      getLocal<SolicitudServicio[]>('solicitudes', [])
        .filter((item) => item.cliente_id === clientId)
        .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt)),
    );
    return () => undefined;
  },

  async getSolicitudesProveedor(providerId: string): Promise<SolicitudServicio[]> {
    if (isRealFirebaseConfigured()) {
      if (!auth.currentUser) {
        throw new Error('Debes iniciar sesión nuevamente para consultar los trabajos recibidos.');
      }
      if (auth.currentUser.uid !== providerId) {
        throw new Error('La sesión autenticada no coincide con el perfil del proveedor.');
      }
      const path = `solicitudes?proveedor_id=${providerId}`;
      try {
        const snapshot = await getDocs(
          query(collection(db, 'solicitudes'), where('proveedor_id', '==', providerId)),
        );
        return snapshot.docs
          .map((item) => ({ ...item.data(), id: item.id }) as SolicitudServicio)
          .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt));
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    }

    initializeSimulatedDatabase();
    return getLocal<SolicitudServicio[]>('solicitudes', [])
      .filter((item) => item.proveedor_id === providerId)
      .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt));
  },

  async getSolicitudes(): Promise<SolicitudServicio[]> {
    if (isRealFirebaseConfigured()) {
      const path = 'solicitudes';
      try {
        const snapshot = await getDocs(collection(db, 'solicitudes'));
        return snapshot.docs
          .map((item) => ({ ...item.data(), id: item.id }) as SolicitudServicio)
          .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt));
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    }

    initializeSimulatedDatabase();
    return [...getLocal<SolicitudServicio[]>('solicitudes', [])].sort(
      (a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt),
    );
  },

  async updateSolicitudEstado(
    request: SolicitudServicio,
    nextStatus: EstadoSolicitud,
    role: Usuario['tipo_usuario'],
  ): Promise<void> {
    if (!canTransition(request.estado, nextStatus, role)) {
      throw new Error(`No se permite cambiar de ${request.estado} a ${nextStatus}.`);
    }

    const recipientId =
      role === 'proveedor'
        ? request.cliente_id
        : role === 'cliente'
          ? request.proveedor_id
          : null;

    if (isRealFirebaseConfigured()) {
      const path = `solicitudes/${request.id}`;
      const actorId = auth.currentUser?.uid;
      if (!actorId) throw new Error('Debes iniciar sesión nuevamente para actualizar la solicitud.');
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'solicitudes', request.id), {
          estado: nextStatus,
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'solicitudes', request.id, 'historial', nextStatus), {
          id: nextStatus,
          estado: nextStatus,
          actor_id: actorId,
          actor_rol: role,
          fecha: serverTimestamp(),
        });
        if (recipientId) {
          const notification = notificationForStatus(request, nextStatus, recipientId);
          batch.set(
            doc(db, 'usuarios', recipientId, 'notificaciones', notification.id),
            {
              ...notification,
              createdAt: serverTimestamp(),
            },
          );
        }
        await batch.commit();
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const requests = getLocal<SolicitudServicio[]>('solicitudes', []);
    const index = requests.findIndex((item) => item.id === request.id);
    if (index >= 0) {
      const changedAt = new Date().toISOString();
      requests[index] = {
        ...requests[index],
        estado: nextStatus,
        updatedAt: changedAt,
      };
      setLocal('solicitudes', requests);

      const localHistory = getLocal<Record<string, HistorialSolicitudEntry[]>>('historial_solicitudes', {});
      const actorId = role === 'proveedor' ? request.proveedor_id : role === 'cliente' ? request.cliente_id : 'admin_local';
      const historyEntries = localHistory[request.id] || [];
      localHistory[request.id] = [
        ...historyEntries.filter((entry) => entry.estado !== nextStatus),
        {
          id: nextStatus,
          estado: nextStatus,
          actor_id: actorId,
          actor_rol: role,
          fecha: changedAt,
        },
      ];
      setLocal('historial_solicitudes', localHistory);

      if (recipientId) {
        const localNotifications = getLocal<Notificacion[]>('notificaciones', []);
        localNotifications.unshift({
          ...notificationForStatus(request, nextStatus, recipientId),
          createdAt: new Date().toISOString(),
        });
        setLocal('notificaciones', localNotifications);
        emitLocalNotificationsChanged();
      }
    }
  },


  subscribeCotizacionSolicitud(
    request: SolicitudServicio,
    userId: string,
    onData: (quote: CotizacionSolicitud | null) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    const isParticipant = userId === request.cliente_id || userId === request.proveedor_id;
    if (!isParticipant) {
      onError?.(new Error('No tienes permiso para consultar la cotización de esta solicitud.'));
      return () => undefined;
    }

    if (isRealFirebaseConfigured()) {
      if (auth.currentUser?.uid !== userId) {
        onError?.(new Error('La sesión autenticada no coincide con el usuario de la cotización.'));
        return () => undefined;
      }
      const quoteRef = doc(db, 'solicitudes', request.id, 'cotizacion', 'actual');
      return onSnapshot(
        quoteRef,
        (snapshot) => {
          onData(snapshot.exists() ? normalizeCotizacionData(snapshot.data() as Partial<CotizacionSolicitud>) : null);
        },
        (error) => onError?.(error),
      );
    }

    initializeSimulatedDatabase();
    const emit = () => {
      const quotes = getLocal<Record<string, CotizacionSolicitud>>('cotizaciones_solicitudes', {});
      onData(quotes[request.id] ? normalizeCotizacionData(quotes[request.id]) : null);
    };
    emit();
    window.addEventListener(LOCAL_QUOTES_EVENT, emit);
    return () => window.removeEventListener(LOCAL_QUOTES_EVENT, emit);
  },

  subscribeCotizacionesHistorialSolicitud(
    request: SolicitudServicio,
    userId: string,
    onData: (quotes: CotizacionHistorial[]) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    const isParticipant = userId === request.cliente_id || userId === request.proveedor_id;
    if (!isParticipant) {
      onError?.(new Error('No tienes permiso para consultar el historial de cotizaciones.'));
      return () => undefined;
    }

    if (isRealFirebaseConfigured()) {
      if (auth.currentUser?.uid !== userId) {
        onError?.(new Error('La sesión autenticada no coincide con el usuario de la cotización.'));
        return () => undefined;
      }
      const historyQuery = query(
        collection(db, 'solicitudes', request.id, 'cotizaciones_historial'),
        orderBy('archivadaAt', 'desc'),
        limit(20),
      );
      return onSnapshot(
        historyQuery,
        (snapshot) => {
          onData(snapshot.docs.map((item) => ({
            ...normalizeCotizacionData(item.data() as Partial<CotizacionSolicitud>),
            id: item.id,
            archivadaAt: item.data().archivadaAt || item.data().updatedAt || null,
          } as CotizacionHistorial)));
        },
        (error) => onError?.(error),
      );
    }

    initializeSimulatedDatabase();
    const emit = () => {
      const history = getLocal<Record<string, CotizacionHistorial[]>>('cotizaciones_historial_solicitudes', {});
      onData([...(history[request.id] || [])].sort((a, b) => dateToMillis(b.archivadaAt) - dateToMillis(a.archivadaAt)));
    };
    emit();
    window.addEventListener(LOCAL_QUOTES_EVENT, emit);
    return () => window.removeEventListener(LOCAL_QUOTES_EVENT, emit);
  },

  async saveCotizacionSolicitud(
    request: SolicitudServicio,
    provider: Usuario,
    input: NuevaCotizacionSolicitud,
  ): Promise<CotizacionSolicitud> {
    if (provider.tipo_usuario !== 'proveedor' || provider.id !== request.proveedor_id) {
      throw new Error('Solo el proveedor asignado puede enviar una cotización.');
    }
    if (request.estado !== 'aceptada') {
      throw new Error('La cotización solo puede enviarse mientras la solicitud está aceptada.');
    }

    const manoObra = normalizeQuoteAmount(input.mano_obra, 'La mano de obra');
    const materiales = normalizeQuoteAmount(input.materiales, 'Los materiales');
    const otros = normalizeQuoteAmount(input.otros, 'Otros costos');
    const costoVisita = normalizeQuoteAmount(input.costo_visita, 'El costo de visita');
    const descuento = normalizeQuoteAmount(input.descuento, 'El descuento');
    const anticipo = normalizeQuoteAmount(input.anticipo, 'El anticipo');
    const subtotal = manoObra + materiales + otros + costoVisita;
    if (descuento > subtotal) throw new Error('El descuento no puede superar el subtotal.');
    const total = subtotal - descuento;
    if (total <= 0) throw new Error('La cotización debe tener un total mayor a 0.');
    if (total > 100_000_000) throw new Error('El total de la cotización es demasiado alto.');
    if (anticipo > total) throw new Error('El anticipo no puede superar el total de la cotización.');
    const vigenciaDias = normalizeQuoteValidityDays(input.vigencia_dias);
    const vigenciaHasta = quoteValidUntil(vigenciaDias);
    const formaPago = input.forma_pago;
    if (!['por_coordinar', 'efectivo', 'transferencia', 'tarjeta', 'mixto'].includes(formaPago)) {
      throw new Error('Selecciona una forma de pago válida.');
    }
    const observaciones = input.observaciones.trim();
    if (observaciones.length > 500) throw new Error('Las observaciones no pueden superar los 500 caracteres.');

    const quotePayload = {
      mano_obra: manoObra,
      materiales,
      otros,
      costo_visita: costoVisita,
      descuento,
      anticipo,
      total,
      forma_pago: formaPago,
      vigencia_dias: vigenciaDias,
      vigencia_hasta: vigenciaHasta,
      observaciones,
      estado: 'enviada' as const,
    };

    if (isRealFirebaseConfigured()) {
      if (auth.currentUser?.uid !== provider.id) {
        throw new Error('Debes iniciar sesión nuevamente antes de enviar la cotización.');
      }
      const quoteRef = doc(db, 'solicitudes', request.id, 'cotizacion', 'actual');
      const path = `solicitudes/${request.id}/cotizacion/actual`;
      try {
        const existingSnapshot = await getDoc(quoteRef);
        const existing = existingSnapshot.exists()
          ? normalizeCotizacionData(existingSnapshot.data() as Partial<CotizacionSolicitud>)
          : null;
        if (existing?.estado === 'aceptada') {
          throw new Error('Esta cotización ya fue aceptada y no puede modificarse.');
        }
        if (existing?.estado === 'enviada' && (!existing.vigencia_hasta || dateToMillis(existing.vigencia_hasta) >= Date.now())) {
          throw new Error('Debes esperar a que el cliente responda la cotización actual.');
        }

        if (existing) {
          const historyRef = doc(collection(db, 'solicitudes', request.id, 'cotizaciones_historial'));
          const batch = writeBatch(db);
          batch.set(historyRef, {
            ...existingSnapshot.data(),
            id: historyRef.id,
            archivadaAt: serverTimestamp(),
          });
          batch.update(quoteRef, {
            ...quotePayload,
            updatedAt: serverTimestamp(),
          });
          await batch.commit();
        } else {
          await setDoc(quoteRef, {
            id: 'actual',
            solicitud_id: request.id,
            proveedor_id: request.proveedor_id,
            cliente_id: request.cliente_id,
            ...quotePayload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        const notification = quoteNotification(request, request.cliente_id, 'enviada');
        try {
          await setDoc(doc(db, 'usuarios', request.cliente_id, 'notificaciones', notification.id), {
            ...notification,
            createdAt: serverTimestamp(),
          });
        } catch (notificationError) {
          console.error('La cotización se guardó, pero no fue posible crear su aviso interno.', notificationError);
        }

        return {
          id: 'actual',
          solicitud_id: request.id,
          proveedor_id: request.proveedor_id,
          cliente_id: request.cliente_id,
          ...quotePayload,
          createdAt: existing?.createdAt || new Date(),
          updatedAt: new Date(),
        };
      } catch (error) {
        if (error instanceof Error && !('code' in error)) throw error;
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    initializeSimulatedDatabase();
    const quotes = getLocal<Record<string, CotizacionSolicitud>>('cotizaciones_solicitudes', {});
    const existing = quotes[request.id] ? normalizeCotizacionData(quotes[request.id]) : null;
    if (existing?.estado === 'aceptada') throw new Error('Esta cotización ya fue aceptada y no puede modificarse.');
    if (existing?.estado === 'enviada' && (!existing.vigencia_hasta || dateToMillis(existing.vigencia_hasta) >= Date.now())) {
      throw new Error('Debes esperar a que el cliente responda la cotización actual.');
    }
    const now = new Date().toISOString();
    if (existing) {
      const history = getLocal<Record<string, CotizacionHistorial[]>>('cotizaciones_historial_solicitudes', {});
      const entries = history[request.id] || [];
      entries.unshift({ ...existing, id: `hist_${Date.now()}`, archivadaAt: now });
      history[request.id] = entries.slice(0, 20);
      setLocal('cotizaciones_historial_solicitudes', history);
    }
    const localQuote: CotizacionSolicitud = {
      id: 'actual',
      solicitud_id: request.id,
      proveedor_id: request.proveedor_id,
      cliente_id: request.cliente_id,
      ...quotePayload,
      vigencia_hasta: vigenciaHasta.toISOString(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    quotes[request.id] = localQuote;
    setLocal('cotizaciones_solicitudes', quotes);

    const localNotifications = getLocal<Notificacion[]>('notificaciones', []);
    const notification = quoteNotification(request, request.cliente_id, 'enviada');
    const notificationIndex = localNotifications.findIndex((item) => item.id === notification.id && item.usuario_id === request.cliente_id);
    const localNotification: Notificacion = { ...notification, createdAt: now };
    if (notificationIndex >= 0) localNotifications[notificationIndex] = localNotification;
    else localNotifications.unshift(localNotification);
    setLocal('notificaciones', localNotifications);
    emitLocalQuotesChanged();
    emitLocalNotificationsChanged();
    return localQuote;
  },

  async respondCotizacionSolicitud(
    request: SolicitudServicio,
    quote: CotizacionSolicitud,
    client: Usuario,
    decision: Exclude<EstadoCotizacion, 'enviada'>,
  ): Promise<void> {
    if (client.tipo_usuario !== 'cliente' || client.id !== request.cliente_id) {
      throw new Error('Solo el cliente de la solicitud puede responder la cotización.');
    }
    if (request.estado !== 'aceptada') {
      throw new Error('La solicitud ya no admite cambios en la cotización.');
    }
    if (quote.estado !== 'enviada') {
      throw new Error('Esta cotización ya fue respondida.');
    }
    if (decision !== 'aceptada' && decision !== 'rechazada') {
      throw new Error('La respuesta de la cotización no es válida.');
    }
    if (decision === 'aceptada' && quote.vigencia_hasta && dateToMillis(quote.vigencia_hasta) < Date.now()) {
      throw new Error('La cotización venció. Solicita al proveedor una nueva propuesta.');
    }

    if (isRealFirebaseConfigured()) {
      if (auth.currentUser?.uid !== client.id) {
        throw new Error('Debes iniciar sesión nuevamente antes de responder la cotización.');
      }
      const quoteRef = doc(db, 'solicitudes', request.id, 'cotizacion', 'actual');
      const path = `solicitudes/${request.id}/cotizacion/actual`;
      try {
        await updateDoc(quoteRef, {
          estado: decision,
          updatedAt: serverTimestamp(),
        });
        const notification = quoteNotification(request, request.proveedor_id, decision);
        try {
          await setDoc(doc(db, 'usuarios', request.proveedor_id, 'notificaciones', notification.id), {
            ...notification,
            createdAt: serverTimestamp(),
          });
        } catch (notificationError) {
          console.error('La cotización fue respondida, pero no fue posible crear su aviso interno.', notificationError);
        }
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    initializeSimulatedDatabase();
    const quotes = getLocal<Record<string, CotizacionSolicitud>>('cotizaciones_solicitudes', {});
    const stored = quotes[request.id] ? normalizeCotizacionData(quotes[request.id]) : null;
    if (!stored || stored.estado !== 'enviada') throw new Error('Esta cotización ya no está disponible para responder.');
    const now = new Date().toISOString();
    quotes[request.id] = { ...stored, estado: decision, updatedAt: now };
    setLocal('cotizaciones_solicitudes', quotes);

    const localNotifications = getLocal<Notificacion[]>('notificaciones', []);
    const notification = quoteNotification(request, request.proveedor_id, decision);
    const notificationIndex = localNotifications.findIndex((item) => item.id === notification.id && item.usuario_id === request.proveedor_id);
    const localNotification: Notificacion = { ...notification, createdAt: now };
    if (notificationIndex >= 0) localNotifications[notificationIndex] = localNotification;
    else localNotifications.unshift(localNotification);
    setLocal('notificaciones', localNotifications);
    emitLocalQuotesChanged();
    emitLocalNotificationsChanged();
  },


  subscribeMensajesSolicitud(
    request: SolicitudServicio,
    userId: string,
    onData: (messages: MensajeSolicitud[]) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    const isParticipant = userId === request.cliente_id || userId === request.proveedor_id;
    if (!isParticipant) {
      onError?.(new Error('No tienes permiso para acceder a esta conversación.'));
      return () => undefined;
    }

    if (isRealFirebaseConfigured()) {
      if (auth.currentUser?.uid !== userId) {
        onError?.(new Error('La sesión autenticada no coincide con el usuario del chat.'));
        return () => undefined;
      }

      const messagesRef = collection(db, 'solicitudes', request.id, 'mensajes');
      return onSnapshot(
        messagesRef,
        (snapshot) => {
          const messages = snapshot.docs
            .map((item) => ({ ...item.data(), id: item.id }) as MensajeSolicitud)
            .sort((a, b) => dateToMillis(a.createdAt) - dateToMillis(b.createdAt));
          onData(messages);
        },
        (error) => onError?.(error),
      );
    }

    initializeSimulatedDatabase();
    const emit = () => {
      const byRequest = getLocal<Record<string, MensajeSolicitud[]>>('mensajes_solicitudes', {});
      onData([...(byRequest[request.id] || [])].sort((a, b) => dateToMillis(a.createdAt) - dateToMillis(b.createdAt)));
    };
    emit();
    window.addEventListener(LOCAL_MESSAGES_EVENT, emit);
    return () => window.removeEventListener(LOCAL_MESSAGES_EVENT, emit);
  },

  async sendMensajeSolicitud(
    request: SolicitudServicio,
    sender: Usuario,
    rawText: string,
  ): Promise<MensajeSolicitud> {
    const messageText = rawText.trim();

    if (sender.tipo_usuario !== 'cliente' && sender.tipo_usuario !== 'proveedor') {
      throw new Error('Solo clientes y proveedores pueden participar en el chat.');
    }
    if (sender.id !== request.cliente_id && sender.id !== request.proveedor_id) {
      throw new Error('No tienes permiso para enviar mensajes en esta solicitud.');
    }
    if ((sender.tipo_usuario === 'cliente' && sender.id !== request.cliente_id)
      || (sender.tipo_usuario === 'proveedor' && sender.id !== request.proveedor_id)) {
      throw new Error('El rol de tu cuenta no coincide con esta solicitud.');
    }
    if (request.estado === 'rechazada' || request.estado === 'cancelada') {
      throw new Error('Esta conversación está cerrada porque la solicitud fue cancelada o rechazada.');
    }
    if (messageText.length < 1 || messageText.length > 1000) {
      throw new Error('El mensaje debe tener entre 1 y 1000 caracteres.');
    }

    if (isRealFirebaseConfigured()) {
      if (auth.currentUser?.uid !== sender.id) {
        throw new Error('Debes iniciar sesión nuevamente antes de enviar un mensaje.');
      }

      const messageRef = doc(collection(db, 'solicitudes', request.id, 'mensajes'));
      const recipientId = sender.tipo_usuario === 'cliente' ? request.proveedor_id : request.cliente_id;
      const notificationRef = doc(db, 'usuarios', recipientId, 'notificaciones', messageRef.id);
      const path = `solicitudes/${request.id}/mensajes/${messageRef.id}`;
      try {
        const payload = {
          id: messageRef.id,
          solicitud_id: request.id,
          remitente_id: sender.id,
          remitente_nombre: sender.nombre.trim(),
          remitente_rol: sender.tipo_usuario,
          texto: messageText,
          createdAt: serverTimestamp(),
        };
        const notification: Omit<Notificacion, 'createdAt'> = {
          id: messageRef.id,
          usuario_id: recipientId,
          solicitud_id: request.id,
          tipo: 'nuevo_mensaje',
          titulo: `Nuevo mensaje de ${sender.nombre.trim()}`.slice(0, 100),
          mensaje: messageText.slice(0, 300),
          estado_solicitud: request.estado,
          leida: false,
        };

        // Primero guardamos el mensaje. Después generamos el aviso usando el
        // mensaje ya existente como prueba en las reglas de Firestore. Esto
        // evita depender de getAfter() sobre dos escrituras del mismo batch.
        await setDoc(messageRef, payload);
        try {
          await setDoc(notificationRef, {
            ...notification,
            createdAt: serverTimestamp(),
          });
        } catch (notificationError) {
          console.error('El mensaje se guardó, pero no fue posible crear su aviso interno.', notificationError);
        }
        return { ...payload, createdAt: new Date() };
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    initializeSimulatedDatabase();
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const localMessage: MensajeSolicitud = {
      id,
      solicitud_id: request.id,
      remitente_id: sender.id,
      remitente_nombre: sender.nombre.trim(),
      remitente_rol: sender.tipo_usuario,
      texto: messageText,
      createdAt: new Date().toISOString(),
    };
    const byRequest = getLocal<Record<string, MensajeSolicitud[]>>('mensajes_solicitudes', {});
    byRequest[request.id] = [...(byRequest[request.id] || []), localMessage];
    setLocal('mensajes_solicitudes', byRequest);

    const recipientId = sender.id === request.cliente_id ? request.proveedor_id : request.cliente_id;
    const localNotifications = getLocal<Notificacion[]>('notificaciones', []);
    localNotifications.unshift({
      id,
      usuario_id: recipientId,
      solicitud_id: request.id,
      tipo: 'nuevo_mensaje',
      titulo: `Nuevo mensaje de ${sender.nombre.trim()}`.slice(0, 100),
      mensaje: messageText.slice(0, 300),
      estado_solicitud: request.estado,
      leida: false,
      createdAt: new Date().toISOString(),
    });
    setLocal('notificaciones', localNotifications);

    emitLocalMessagesChanged();
    emitLocalNotificationsChanged();
    return localMessage;
  },

  async crearReporte(input: NuevoReporte): Promise<string> {
    const description = input.descripcion.trim().slice(0, 600);

    if (!description) throw new Error('Describe brevemente el motivo del reporte.');
    if (input.tipo === 'cliente' && (!input.cliente_id || !input.solicitud_id)) {
      throw new Error('No fue posible identificar al cliente o la solicitud asociada.');
    }
    if ((input.tipo === 'proveedor' || input.tipo === 'resena') && !input.proveedor_id) {
      throw new Error('No fue posible identificar al proveedor reportado.');
    }
    if (input.tipo === 'resena' && !input.resena_id) {
      throw new Error('No fue posible identificar la reseña reportada.');
    }

    if (isRealFirebaseConfigured()) {
      const ref = doc(collection(db, 'reportes'));
      const reportId = ref.id;
      const path = `reportes/${reportId}`;
      try {
        await setDoc(ref, {
          id: reportId,
          reportante_id: input.reportante_id,
          reportante_nombre: input.reportante_nombre.trim().slice(0, 100),
          tipo: input.tipo,
          ...(input.proveedor_id ? { proveedor_id: input.proveedor_id } : {}),
          ...(input.cliente_id ? { cliente_id: input.cliente_id } : {}),
          ...(input.solicitud_id ? { solicitud_id: input.solicitud_id } : {}),
          ...(input.tipo === 'resena' ? { resena_id: input.resena_id } : {}),
          motivo: input.motivo,
          descripcion: description,
          estado: 'pendiente',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return reportId;
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    initializeSimulatedDatabase();
    const reports = getLocal<Reporte[]>('reportes', []);
    const reportId = `reporte_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    reports.unshift({
      id: reportId,
      reportante_id: input.reportante_id,
      reportante_nombre: input.reportante_nombre.trim().slice(0, 100),
      tipo: input.tipo,
      ...(input.proveedor_id ? { proveedor_id: input.proveedor_id } : {}),
      ...(input.cliente_id ? { cliente_id: input.cliente_id } : {}),
      ...(input.solicitud_id ? { solicitud_id: input.solicitud_id } : {}),
      ...(input.tipo === 'resena' ? { resena_id: input.resena_id } : {}),
      motivo: input.motivo,
      descripcion: description,
      estado: 'pendiente',
      createdAt: now,
      updatedAt: now,
    });
    setLocal('reportes', reports);
    return reportId;
  },

  async getApelacionCuenta(userId: string): Promise<ApelacionCuenta | null> {
    if (isRealFirebaseConfigured()) {
      const path = `apelaciones/${userId}`;
      try {
        const snapshot = await getDoc(doc(db, 'apelaciones', userId));
        return snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as ApelacionCuenta) : null;
      } catch (error) {
        return handleFirestoreError(error, OperationType.GET, path);
      }
    }

    initializeSimulatedDatabase();
    return getLocal<ApelacionCuenta[]>('apelaciones', []).find((item) => item.id === userId) || null;
  },

  subscribeApelacionCuenta(
    userId: string,
    onData: (appeal: ApelacionCuenta | null) => void,
    onError?: (error: Error) => void,
  ): () => void {
    if (isRealFirebaseConfigured()) {
      return onSnapshot(
        doc(db, 'apelaciones', userId),
        (snapshot) => onData(snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as ApelacionCuenta) : null),
        (error) => onError?.(error),
      );
    }

    initializeSimulatedDatabase();
    onData(getLocal<ApelacionCuenta[]>('apelaciones', []).find((item) => item.id === userId) || null);
    return () => undefined;
  },

  async solicitarRevisionCuenta(user: Usuario, message: string): Promise<void> {
    const safeMessage = message.trim().slice(0, 1000);
    if (safeMessage.length < 10) {
      throw new Error('Explica brevemente por qué solicitas una revisión (mínimo 10 caracteres).');
    }
    if (user.tipo_usuario === 'admin') {
      throw new Error('Las cuentas administradoras no utilizan este sistema de revisión.');
    }
    if (user.estado_cuenta !== 'suspendida' && user.estado_cuenta !== 'eliminada') {
      throw new Error('Tu cuenta no se encuentra suspendida ni eliminada de la aplicación.');
    }

    const payload = {
      id: user.id,
      usuario_id: user.id,
      usuario_nombre: user.nombre.trim().slice(0, 100),
      usuario_email: user.email.trim().toLowerCase().slice(0, 254),
      usuario_tipo: user.tipo_usuario,
      estado_cuenta: user.estado_cuenta,
      motivo_moderacion: (user.moderacion_motivo || '').trim().slice(0, 300),
      mensaje: safeMessage,
      estado: 'pendiente' as const,
      respuesta_admin: '',
    };

    if (isRealFirebaseConfigured()) {
      const path = `apelaciones/${user.id}`;
      try {
        await setDoc(doc(db, 'apelaciones', user.id), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    initializeSimulatedDatabase();
    const appeals = getLocal<ApelacionCuenta[]>('apelaciones', []);
    const now = new Date().toISOString();
    const next: ApelacionCuenta = { ...payload, createdAt: now, updatedAt: now };
    const index = appeals.findIndex((item) => item.id === user.id);
    if (index >= 0) appeals[index] = next;
    else appeals.unshift(next);
    setLocal('apelaciones', appeals);
  },

  async getApelacionesCuenta(): Promise<ApelacionCuenta[]> {
    if (isRealFirebaseConfigured()) {
      const path = 'apelaciones';
      try {
        const snapshot = await getDocs(collection(db, 'apelaciones'));
        return snapshot.docs
          .map((item) => ({ ...item.data(), id: item.id }) as ApelacionCuenta)
          .sort((a, b) => dateToMillis(b.updatedAt) - dateToMillis(a.updatedAt));
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    }

    initializeSimulatedDatabase();
    return getLocal<ApelacionCuenta[]>('apelaciones', []).sort((a, b) => dateToMillis(b.updatedAt) - dateToMillis(a.updatedAt));
  },

  async resolverApelacionCuenta(userId: string, state: Exclude<EstadoApelacion, 'pendiente'>, response = ''): Promise<void> {
    const safeResponse = response.trim().slice(0, 500);
    if (state === 'rechazada' && safeResponse.length < 3) {
      throw new Error('Escribe una respuesta breve para explicar por qué se mantiene el bloqueo.');
    }

    if (isRealFirebaseConfigured()) {
      const path = `apelaciones/${userId}`;
      try {
        await updateDoc(doc(db, 'apelaciones', userId), {
          estado: state,
          respuesta_admin: safeResponse,
          updatedAt: serverTimestamp(),
        });
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const appeals = getLocal<ApelacionCuenta[]>('apelaciones', []);
    const index = appeals.findIndex((item) => item.id === userId);
    if (index >= 0) {
      appeals[index] = {
        ...appeals[index],
        estado: state,
        respuesta_admin: safeResponse,
        updatedAt: new Date().toISOString(),
      };
      setLocal('apelaciones', appeals);
    }
  },

  async aprobarApelacionYReactivar(
    userId: string,
    role: Exclude<Usuario['tipo_usuario'], 'admin'>,
    response = 'Tu solicitud fue aprobada. Tu cuenta ha sido reactivada.',
  ): Promise<void> {
    const safeResponse = response.trim().slice(0, 500) || 'Tu solicitud fue aprobada. Tu cuenta ha sido reactivada.';

    if (isRealFirebaseConfigured()) {
      const path = `apelaciones/${userId}`;
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'usuarios', userId), {
          estado_cuenta: 'activa',
          moderacion_motivo: '',
          moderacion_actualizada_at: serverTimestamp(),
          reactivacion_pendiente: true,
          reactivada_at: serverTimestamp(),
        });
        if (role === 'proveedor') {
          batch.update(doc(db, 'proveedores', userId), { activo: true });
        }
        batch.update(doc(db, 'apelaciones', userId), {
          estado: 'aprobada',
          respuesta_admin: safeResponse,
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const users = getLocal<Usuario[]>('usuarios', []);
    const userIndex = users.findIndex((user) => user.id === userId);
    if (userIndex >= 0) {
      users[userIndex] = {
        ...users[userIndex],
        estado_cuenta: 'activa',
        moderacion_motivo: '',
        moderacion_actualizada_at: new Date().toISOString(),
        reactivacion_pendiente: true,
        reactivada_at: new Date().toISOString(),
      };
      setLocal('usuarios', users);
    }
    if (role === 'proveedor') {
      const providers = getLocal<Proveedor[]>('proveedores', []);
      const providerIndex = providers.findIndex((provider) => provider.id === userId);
      if (providerIndex >= 0) {
        providers[providerIndex] = { ...providers[providerIndex], activo: true };
        setLocal('proveedores', providers);
      }
    }
    const appeals = getLocal<ApelacionCuenta[]>('apelaciones', []);
    const appealIndex = appeals.findIndex((item) => item.id === userId);
    if (appealIndex >= 0) {
      appeals[appealIndex] = {
        ...appeals[appealIndex],
        estado: 'aprobada',
        respuesta_admin: safeResponse,
        updatedAt: new Date().toISOString(),
      };
      setLocal('apelaciones', appeals);
    }
  },

  async moderarCuenta(
    userId: string,
    role: Usuario['tipo_usuario'],
    state: EstadoCuenta,
    reason = '',
  ): Promise<void> {
    if (role === 'admin') throw new Error('No se puede moderar una cuenta administradora desde este panel.');
    const safeReason = reason.trim().slice(0, 300);
    if (state !== 'activa' && safeReason.length < 3) {
      throw new Error('Indica un motivo breve para suspender o eliminar la cuenta.');
    }

    if (isRealFirebaseConfigured()) {
      const path = `usuarios/${userId}`;
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'usuarios', userId), {
          estado_cuenta: state,
          moderacion_motivo: state === 'activa' ? '' : safeReason,
          moderacion_actualizada_at: serverTimestamp(),
          reactivacion_pendiente: state === 'activa',
          ...(state === 'activa' ? { reactivada_at: serverTimestamp() } : {}),
        });
        if (role === 'proveedor') {
          batch.update(doc(db, 'proveedores', userId), {
            activo: state === 'activa',
          });
        }
        await batch.commit();
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const users = getLocal<Usuario[]>('usuarios', []);
    const userIndex = users.findIndex((user) => user.id === userId);
    if (userIndex >= 0) {
      users[userIndex] = {
        ...users[userIndex],
        estado_cuenta: state,
        moderacion_motivo: state === 'activa' ? '' : safeReason,
        moderacion_actualizada_at: new Date().toISOString(),
        reactivacion_pendiente: state === 'activa',
        ...(state === 'activa' ? { reactivada_at: new Date().toISOString() } : {}),
      };
      setLocal('usuarios', users);
    }
    if (role === 'proveedor') {
      const providers = getLocal<Proveedor[]>('proveedores', []);
      const providerIndex = providers.findIndex((provider) => provider.id === userId);
      if (providerIndex >= 0) {
        providers[providerIndex] = { ...providers[providerIndex], activo: state === 'activa' };
        setLocal('proveedores', providers);
      }
    }
  },

  async confirmarReactivacion(userId: string): Promise<void> {
    if (isRealFirebaseConfigured()) {
      const path = `usuarios/${userId}`;
      try {
        await updateDoc(doc(db, 'usuarios', userId), { reactivacion_pendiente: false });
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const users = getLocal<Usuario[]>('usuarios', []);
    const index = users.findIndex((user) => user.id === userId);
    if (index >= 0) {
      users[index] = { ...users[index], reactivacion_pendiente: false };
      setLocal('usuarios', users);
    }
  },

  async getReportes(): Promise<Reporte[]> {
    if (isRealFirebaseConfigured()) {
      const path = 'reportes';
      try {
        const snapshot = await getDocs(collection(db, 'reportes'));
        return snapshot.docs
          .map((item) => ({ ...item.data(), id: item.id }) as Reporte)
          .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt));
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    }

    initializeSimulatedDatabase();
    return getLocal<Reporte[]>('reportes', []).sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt));
  },

  async actualizarEstadoReporte(reportId: string, state: EstadoReporte): Promise<void> {
    if (isRealFirebaseConfigured()) {
      const path = `reportes/${reportId}`;
      try {
        await updateDoc(doc(db, 'reportes', reportId), {
          estado: state,
          updatedAt: serverTimestamp(),
        });
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const reports = getLocal<Reporte[]>('reportes', []);
    const index = reports.findIndex((report) => report.id === reportId);
    if (index >= 0) {
      reports[index] = { ...reports[index], estado: state, updatedAt: new Date().toISOString() };
      setLocal('reportes', reports);
    }
  },

  async savePushToken(userId: string, token: string): Promise<void> {
    if (!token.trim()) return;
    if (!isRealFirebaseConfigured()) return;
    if (auth.currentUser?.uid !== userId) {
      throw new Error('No puedes registrar notificaciones para otra cuenta.');
    }

    const tokenId = encodeURIComponent(token);
    const path = `usuarios/${userId}/pushTokens/${tokenId}`;
    try {
      await setDoc(doc(db, 'usuarios', userId, 'pushTokens', tokenId), {
        token,
        platform: 'android',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      return handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async removePushToken(userId: string, token: string): Promise<void> {
    if (!token.trim() || !isRealFirebaseConfigured()) return;
    if (auth.currentUser?.uid !== userId) {
      throw new Error('No puedes eliminar notificaciones de otra cuenta.');
    }

    const tokenId = encodeURIComponent(token);
    const path = `usuarios/${userId}/pushTokens/${tokenId}`;
    try {
      await deleteDoc(doc(db, 'usuarios', userId, 'pushTokens', tokenId));
    } catch (error) {
      return handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  subscribeNotificaciones(
    userId: string,
    onData: (notifications: Notificacion[]) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    if (isRealFirebaseConfigured()) {
      if (auth.currentUser?.uid !== userId) {
        onError?.(new Error('La sesión autenticada no coincide con el usuario de las notificaciones.'));
        return () => undefined;
      }

      const notificationsRef = collection(db, 'usuarios', userId, 'notificaciones');
      return onSnapshot(
        notificationsRef,
        (snapshot) => {
          const notifications = snapshot.docs
            .map((item) => ({ ...item.data(), id: item.id }) as Notificacion)
            .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt));
          onData(notifications);
        },
        (error) => onError?.(error),
      );
    }

    initializeSimulatedDatabase();
    const emit = () => {
      const notifications = getLocal<Notificacion[]>('notificaciones', [])
        .filter((item) => item.usuario_id === userId)
        .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt));
      onData(notifications);
    };
    emit();
    window.addEventListener(LOCAL_NOTIFICATIONS_EVENT, emit);
    return () => window.removeEventListener(LOCAL_NOTIFICATIONS_EVENT, emit);
  },

  async markNotificationRead(userId: string, notificationId: string): Promise<void> {
    if (isRealFirebaseConfigured()) {
      if (auth.currentUser?.uid !== userId) {
        throw new Error('No puedes modificar notificaciones de otra cuenta.');
      }
      const path = `usuarios/${userId}/notificaciones/${notificationId}`;
      try {
        await updateDoc(doc(db, 'usuarios', userId, 'notificaciones', notificationId), {
          leida: true,
        });
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const notifications = getLocal<Notificacion[]>('notificaciones', []);
    const index = notifications.findIndex(
      (item) => item.id === notificationId && item.usuario_id === userId,
    );
    if (index >= 0) {
      notifications[index] = { ...notifications[index], leida: true };
      setLocal('notificaciones', notifications);
      emitLocalNotificationsChanged();
    }
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    if (isRealFirebaseConfigured()) {
      if (auth.currentUser?.uid !== userId) {
        throw new Error('No puedes modificar notificaciones de otra cuenta.');
      }
      const path = `usuarios/${userId}/notificaciones`;
      try {
        const snapshot = await getDocs(collection(db, 'usuarios', userId, 'notificaciones'));
        const unread = snapshot.docs.filter((item) => item.data().leida === false);
        for (let offset = 0; offset < unread.length; offset += 450) {
          const batch = writeBatch(db);
          unread.slice(offset, offset + 450).forEach((item) => {
            batch.update(item.ref, { leida: true });
          });
          await batch.commit();
        }
        return;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const notifications = getLocal<Notificacion[]>('notificaciones', []);
    let changed = false;
    const updated = notifications.map((item) => {
      if (item.usuario_id === userId && !item.leida) {
        changed = true;
        return { ...item, leida: true };
      }
      return item;
    });
    if (changed) {
      setLocal('notificaciones', updated);
      emitLocalNotificationsChanged();
    }
  },

  async deleteReadNotifications(userId: string): Promise<number> {
    if (isRealFirebaseConfigured()) {
      if (auth.currentUser?.uid !== userId) {
        throw new Error('No puedes eliminar notificaciones de otra cuenta.');
      }
      const path = `usuarios/${userId}/notificaciones`;
      try {
        const snapshot = await getDocs(collection(db, 'usuarios', userId, 'notificaciones'));
        const readNotifications = snapshot.docs.filter((item) => item.data().leida === true);
        for (let offset = 0; offset < readNotifications.length; offset += 450) {
          const batch = writeBatch(db);
          readNotifications.slice(offset, offset + 450).forEach((item) => batch.delete(item.ref));
          await batch.commit();
        }
        return readNotifications.length;
      } catch (error) {
        return handleFirestoreError(error, OperationType.DELETE, path);
      }
    }

    const notifications = getLocal<Notificacion[]>('notificaciones', []);
    const remaining = notifications.filter((item) => !(item.usuario_id === userId && item.leida));
    const deleted = notifications.length - remaining.length;
    if (deleted > 0) {
      setLocal('notificaciones', remaining);
      emitLocalNotificationsChanged();
    }
    return deleted;
  },

  async getReviewableRequests(clientId: string, providerId: string): Promise<SolicitudServicio[]> {
    const requests = (await SVDatabaseService.getSolicitudesCliente(clientId)).filter(
      (item) => item.proveedor_id === providerId && item.estado === 'completada',
    );

    if (isRealFirebaseConfigured()) {
      const checks = await Promise.all(
        requests.map(async (item) => {
          const review = await getDoc(doc(db, 'proveedores', providerId, 'resenas', item.id));
          return review.exists() ? null : item;
        }),
      );
      return checks.filter((item): item is SolicitudServicio => Boolean(item));
    }

    const reviews = getLocal<Record<string, Resena[]>>('resenas', {})[providerId] || [];
    const reviewedIds = new Set(reviews.map((item) => item.solicitud_id));
    return requests.filter((item) => !reviewedIds.has(item.id));
  },

  getCurrentFirebaseUid(): string | null {
    return auth.currentUser?.uid || null;
  },
};
