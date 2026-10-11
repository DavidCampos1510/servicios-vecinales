import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'cliente' | 'proveedor' | 'admin';
export type SupportedCountryCode = 'CL' | 'AR' | 'MX' | 'CO' | 'PE';
export type CategoriaProveedor =
  | 'electricidad'
  | 'gasfiteria'
  | 'cerrajeria'
  | 'carpinteria'
  | 'pintura'
  | 'construccion'
  | 'climatizacion'
  | 'limpieza'
  | 'jardineria'
  | 'informatica'
  | 'desarrollo_web'
  | 'electrodomesticos'
  | 'mecanica'
  | 'fletes'
  | 'mascotas'
  | 'belleza'
  | 'clases_particulares'
  | 'fotografia_eventos'
  | 'costura'
  | 'otros';

export type EstadoSolicitud =
  | 'solicitada'
  | 'aceptada'
  | 'rechazada'
  | 'en_proceso'
  | 'completada'
  | 'cancelada';

export type FirestoreDate = Timestamp | Date | string | null;

export type DisponibilidadProveedor =
  | 'disponible_ahora'
  | 'disponible_hoy'
  | 'con_agenda'
  | 'no_disponible';

export type DiaSemanaAgenda =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

export interface HorarioDiaProveedor {
  activo: boolean;
  desde: string;
  hasta: string;
}

export type AgendaSemanalProveedor = Record<DiaSemanaAgenda, HorarioDiaProveedor>;

export type EstadoVerificacionProveedor = 'sin_solicitar' | 'pendiente' | 'verificado' | 'rechazado';
export type EstadoCuenta = 'activa' | 'suspendida' | 'eliminada';
export type TipoReporte = 'proveedor' | 'cliente' | 'resena';
export type MotivoReporte = 'contenido_inapropiado' | 'informacion_falsa' | 'spam' | 'conducta_inadecuada' | 'otro';
export type EstadoReporte = 'pendiente' | 'revisado' | 'descartado';
export type EstadoApelacion = 'pendiente' | 'aprobada' | 'rechazada';
export type TipoSolicitudPrivacidad = 'acceso' | 'rectificacion' | 'supresion' | 'oposicion' | 'portabilidad';
export type EstadoSolicitudPrivacidad = 'pendiente' | 'en_revision' | 'resuelta' | 'rechazada';
export type EstadoBloqueoPrivacidad = 'no_solicitado' | 'pendiente' | 'aprobado' | 'rechazado';

export type TipoNotificacion = 'nueva_solicitud' | 'estado_solicitud' | 'nueva_resena' | 'nuevo_mensaje' | 'cotizacion' | 'verificacion';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  pais_codigo?: SupportedCountryCode;
  pais_nombre?: string;
  region_codigo?: string;
  region_nombre?: string;
  localidad_nombre?: string;
  moneda_codigo?: 'CLP' | 'ARS' | 'MXN' | 'COP' | 'PEN';
  prefijo_telefonico?: string;
  tipo_usuario: UserRole;
  estado_cuenta?: EstadoCuenta;
  moderacion_motivo?: string;
  moderacion_actualizada_at?: FirestoreDate;
  reactivacion_pendiente?: boolean;
  reactivada_at?: FirestoreDate;
  politicas_aceptadas?: boolean;
  jurisdiccion_politicas?: SupportedCountryCode;
  politicas_version?: string;
  politicas_aceptadas_at?: FirestoreDate;
  terminos_aceptados?: boolean;
  terminos_version?: string;
  terminos_aceptados_at?: FirestoreDate;
  privacidad_informada?: boolean;
  privacidad_version?: string;
  privacidad_informada_at?: FirestoreDate;
  mayor_18_declarado?: boolean;
  mayor_18_declarado_at?: FirestoreDate;
  createdAt?: FirestoreDate;
}

export interface Proveedor {
  id: string;
  usuario_id: string;
  nombre_publico?: string;
  categoria_id: CategoriaProveedor;
  categorias?: CategoriaProveedor[];
  oficio: string;
  experiencia: number;
  descripcion: string;
  ubicacion: string;
  pais_codigo?: SupportedCountryCode;
  pais_nombre?: string;
  region_codigo?: string;
  region_nombre?: string;
  localidad_nombre?: string;
  moneda_codigo?: 'CLP' | 'ARS' | 'MXN' | 'COP' | 'PEN';
  prefijo_telefonico?: string;
  foto_perfil: string;
  whatsapp: string;
  calificacion_promedio: number;
  cantidad_resenas: number;
  verificado: boolean;
  activo?: boolean;
  fotos_trabajos: string[];
  disponibilidad?: DisponibilidadProveedor;
  horario_atencion?: string;
  agenda_semanal?: AgendaSemanalProveedor;
  estado_verificacion?: EstadoVerificacionProveedor;
  verificacion_solicitada_at?: FirestoreDate;
  verificacion_resuelta_at?: FirestoreDate;
  verificacion_observacion?: string;
}

export interface Resena {
  id: string;
  solicitud_id: string;
  cliente_id: string;
  cliente_nombre: string;
  proveedor_id: string;
  calificacion: number;
  comentario: string;
  fecha: FirestoreDate;
}

export interface NuevaResena {
  solicitud_id: string;
  cliente_id: string;
  cliente_nombre: string;
  proveedor_id: string;
  calificacion: number;
  comentario: string;
}


export type EstadoCotizacion = 'enviada' | 'aceptada' | 'rechazada';
export type FormaPagoCotizacion = 'por_coordinar' | 'efectivo' | 'transferencia' | 'tarjeta' | 'mixto';

export interface CotizacionSolicitud {
  id: 'actual';
  solicitud_id: string;
  proveedor_id: string;
  cliente_id: string;
  mano_obra: number;
  materiales: number;
  otros: number;
  costo_visita: number;
  descuento: number;
  anticipo: number;
  total: number;
  forma_pago: FormaPagoCotizacion;
  vigencia_dias: number;
  vigencia_hasta: FirestoreDate;
  observaciones: string;
  estado: EstadoCotizacion;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface CotizacionHistorial extends Omit<CotizacionSolicitud, 'id'> {
  id: string;
  archivadaAt: FirestoreDate;
}

export interface NuevaCotizacionSolicitud {
  mano_obra: number;
  materiales: number;
  otros: number;
  costo_visita: number;
  descuento: number;
  anticipo: number;
  forma_pago: FormaPagoCotizacion;
  vigencia_dias: number;
  observaciones: string;
}

export interface SolicitudServicio {
  id: string;
  cliente_id: string;
  cliente_nombre: string;
  proveedor_id: string;
  proveedor_oficio: string;
  descripcion: string;
  ubicacion: string;
  telefono_contacto: string;
  estado: EstadoSolicitud;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
  fecha_preferida?: string;
  hora_preferida?: string;
}


export type ActorHistorialSolicitud = UserRole | 'sistema';

export interface HistorialSolicitudEntry {
  id: string;
  estado: EstadoSolicitud;
  actor_id: string;
  actor_rol: ActorHistorialSolicitud;
  fecha: FirestoreDate;
}

export interface NuevaSolicitudServicio {
  cliente_id: string;
  cliente_nombre: string;
  proveedor_id: string;
  proveedor_oficio: string;
  descripcion: string;
  ubicacion: string;
  telefono_contacto: string;
  fecha_preferida?: string;
  hora_preferida?: string;
}


export type ChatParticipantRole = 'cliente' | 'proveedor';

export interface MensajeSolicitud {
  id: string;
  solicitud_id: string;
  remitente_id: string;
  remitente_nombre: string;
  remitente_rol: ChatParticipantRole;
  texto: string;
  createdAt: FirestoreDate;
}

export interface Notificacion {
  id: string;
  usuario_id: string;
  solicitud_id?: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  estado_solicitud?: EstadoSolicitud;
  leida: boolean;
  createdAt: FirestoreDate;
}


export interface Reporte {
  id: string;
  reportante_id: string;
  reportante_nombre: string;
  tipo: TipoReporte;
  proveedor_id?: string;
  cliente_id?: string;
  solicitud_id?: string;
  resena_id?: string;
  motivo: MotivoReporte;
  descripcion: string;
  estado: EstadoReporte;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface NuevoReporte {
  reportante_id: string;
  reportante_nombre: string;
  tipo: TipoReporte;
  proveedor_id?: string;
  cliente_id?: string;
  solicitud_id?: string;
  resena_id?: string;
  motivo: MotivoReporte;
  descripcion: string;
}


export interface ApelacionCuenta {
  id: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_email: string;
  usuario_tipo: Exclude<UserRole, 'admin'>;
  estado_cuenta: Extract<EstadoCuenta, 'suspendida' | 'eliminada'>;
  motivo_moderacion: string;
  mensaje: string;
  estado: EstadoApelacion;
  respuesta_admin: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}


export interface SolicitudPrivacidad {
  id: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_email: string;
  usuario_tipo: UserRole;
  tipo: TipoSolicitudPrivacidad;
  detalle: string;
  solicita_bloqueo_temporal: boolean;
  estado_bloqueo: EstadoBloqueoPrivacidad;
  estado: EstadoSolicitudPrivacidad;
  respuesta_admin: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface ProviderProfileUpdate {
  categoria_id: CategoriaProveedor;
  categorias: CategoriaProveedor[];
  oficio: string;
  experiencia: number;
  descripcion: string;
  ubicacion: string;
  pais_codigo?: SupportedCountryCode;
  pais_nombre?: string;
  region_codigo?: string;
  region_nombre?: string;
  localidad_nombre?: string;
  moneda_codigo?: 'CLP' | 'ARS' | 'MXN' | 'COP' | 'PEN';
  prefijo_telefonico?: string;
  foto_perfil: string;
  whatsapp: string;
}
