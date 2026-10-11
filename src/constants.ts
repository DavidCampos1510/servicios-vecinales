import type { AgendaSemanalProveedor, CategoriaProveedor, DiaSemanaAgenda, DisponibilidadProveedor, EstadoSolicitud } from './types';

export const PROVIDER_CATEGORIES: Array<{
  id: CategoriaProveedor | 'todos';
  label: string;
  icon: string;
}> = [
  { id: 'todos', label: 'Todos', icon: '🛠️' },
  { id: 'electricidad', label: 'Electricidad', icon: '⚡' },
  { id: 'gasfiteria', label: 'Gasfitería', icon: '🚰' },
  { id: 'cerrajeria', label: 'Cerrajería', icon: '🔑' },
  { id: 'carpinteria', label: 'Carpintería', icon: '🪚' },
  { id: 'pintura', label: 'Pintura', icon: '🎨' },
  { id: 'construccion', label: 'Construcción', icon: '🧱' },
  { id: 'climatizacion', label: 'Climatización', icon: '❄️' },
  { id: 'limpieza', label: 'Limpieza', icon: '🧹' },
  { id: 'jardineria', label: 'Jardinería', icon: '🌿' },
  { id: 'informatica', label: 'Informática', icon: '💻' },
  { id: 'desarrollo_web', label: 'Desarrollo web', icon: '🌐' },
  { id: 'electrodomesticos', label: 'Electrodomésticos', icon: '🔌' },
  { id: 'mecanica', label: 'Mecánica', icon: '🚗' },
  { id: 'fletes', label: 'Fletes y mudanzas', icon: '🚚' },
  { id: 'mascotas', label: 'Mascotas', icon: '🐾' },
  { id: 'belleza', label: 'Belleza', icon: '✂️' },
  { id: 'clases_particulares', label: 'Clases particulares', icon: '📚' },
  { id: 'fotografia_eventos', label: 'Fotografía y eventos', icon: '📷' },
  { id: 'costura', label: 'Costura y arreglos', icon: '🧵' },
  { id: 'otros', label: 'Otros', icon: '🔧' },
];

export const PROVIDER_CATEGORY_IDS = PROVIDER_CATEGORIES
  .filter((category): category is { id: CategoriaProveedor; label: string; icon: string } => category.id !== 'todos')
  .map((category) => category.id);



export const WEEKLY_SCHEDULE_DAYS: Array<{ id: DiaSemanaAgenda; label: string; shortLabel: string }> = [
  { id: 'lunes', label: 'Lunes', shortLabel: 'Lun' },
  { id: 'martes', label: 'Martes', shortLabel: 'Mar' },
  { id: 'miercoles', label: 'Miércoles', shortLabel: 'Mié' },
  { id: 'jueves', label: 'Jueves', shortLabel: 'Jue' },
  { id: 'viernes', label: 'Viernes', shortLabel: 'Vie' },
  { id: 'sabado', label: 'Sábado', shortLabel: 'Sáb' },
  { id: 'domingo', label: 'Domingo', shortLabel: 'Dom' },
];

export const JS_DAY_TO_SCHEDULE_DAY: DiaSemanaAgenda[] = [
  'domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado',
];

export function createDefaultWeeklySchedule(): AgendaSemanalProveedor {
  return {
    lunes: { activo: true, desde: '09:00', hasta: '18:00' },
    martes: { activo: true, desde: '09:00', hasta: '18:00' },
    miercoles: { activo: true, desde: '09:00', hasta: '18:00' },
    jueves: { activo: true, desde: '09:00', hasta: '18:00' },
    viernes: { activo: true, desde: '09:00', hasta: '18:00' },
    sabado: { activo: false, desde: '09:00', hasta: '14:00' },
    domingo: { activo: false, desde: '09:00', hasta: '14:00' },
  };
}

export function summarizeWeeklySchedule(schedule?: AgendaSemanalProveedor): string {
  if (!schedule) return '';
  const active = WEEKLY_SCHEDULE_DAYS.filter(({ id }) => schedule[id]?.activo);
  if (!active.length) return 'Sin días de atención configurados';
  return active
    .map(({ id, shortLabel }) => `${shortLabel} ${schedule[id].desde}–${schedule[id].hasta}`)
    .join(' · ')
    .slice(0, 120);
}

export const PROVIDER_AVAILABILITY_OPTIONS: Array<{
  id: DisponibilidadProveedor;
  label: string;
}> = [
  { id: 'disponible_ahora', label: 'Disponible ahora' },
  { id: 'disponible_hoy', label: 'Disponible hoy' },
  { id: 'con_agenda', label: 'Con agenda' },
  { id: 'no_disponible', label: 'No disponible' },
];

export const PROVIDER_AVAILABILITY_LABELS: Record<DisponibilidadProveedor, string> = {
  disponible_ahora: 'Disponible ahora',
  disponible_hoy: 'Disponible hoy',
  con_agenda: 'Con agenda',
  no_disponible: 'No disponible',
};

export const PROVIDER_AVAILABILITY_CLASSES: Record<DisponibilidadProveedor, string> = {
  disponible_ahora: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  disponible_hoy: 'bg-sky-50 text-sky-700 border-sky-200',
  con_agenda: 'bg-amber-50 text-amber-700 border-amber-200',
  no_disponible: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const REQUEST_STATUS_LABELS: Record<EstadoSolicitud, string> = {
  solicitada: 'Solicitada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  en_proceso: 'En proceso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

export const REQUEST_STATUS_CLASSES: Record<EstadoSolicitud, string> = {
  solicitada: 'bg-amber-50 text-amber-700 border-amber-200',
  aceptada: 'bg-blue-50 text-blue-700 border-blue-200',
  rechazada: 'bg-rose-50 text-rose-700 border-rose-200',
  en_proceso: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  completada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelada: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}
