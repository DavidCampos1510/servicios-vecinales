import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  Download,
  FileText,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { getFriendlyFirebaseError } from '../firebase';
import { SUPPORT_EMAIL } from '../legalPolicies';
import { dateToMillis, SVDatabaseService } from '../state/databaseService';
import type {
  SolicitudPrivacidad,
  TipoSolicitudPrivacidad,
  Usuario,
} from '../types';

interface PrivacyRightsCenterProps {
  currentUser: Usuario;
  onClose: () => void;
}

const TYPE_LABELS: Record<TipoSolicitudPrivacidad, string> = {
  acceso: 'Acceso a mis datos',
  rectificacion: 'Rectificar datos',
  supresion: 'Suprimir datos',
  oposicion: 'Oponerme a un tratamiento',
  portabilidad: 'Portabilidad de datos',
};

const TYPE_HELP: Record<TipoSolicitudPrivacidad, string> = {
  acceso: 'Solicita información sobre los datos personales que trata Servicios Vecinales.',
  rectificacion: 'Indica qué dato consideras inexacto, incompleto o desactualizado.',
  supresion: 'Solicita eliminar datos que ya no sean necesarios o respecto de los cuales proceda la supresión.',
  oposicion: 'Explica a qué tratamiento específico deseas oponerte y por qué.',
  portabilidad: 'Solicita una copia portable cuando corresponda legal y técnicamente.',
};

const STATUS_LABELS: Record<SolicitudPrivacidad['estado'], string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  resuelta: 'Resuelta',
  rechazada: 'Rechazada',
};

const BLOCK_LABELS: Record<SolicitudPrivacidad['estado_bloqueo'], string> = {
  no_solicitado: 'No solicitado',
  pendiente: 'Bloqueo pendiente',
  aprobado: 'Bloqueo aprobado',
  rechazado: 'Bloqueo rechazado',
};

function formatDateTime(value: unknown): string {
  const timestamp = dateToMillis(value);
  if (!timestamp) return 'Fecha pendiente';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function PrivacyRightsCenter({ currentUser, onClose }: PrivacyRightsCenterProps) {
  const [requests, setRequests] = useState<SolicitudPrivacidad[]>([]);
  const [type, setType] = useState<TipoSolicitudPrivacidad>('acceso');
  const [detail, setDetail] = useState('');
  const [temporaryBlock, setTemporaryBlock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const blockAllowed = useMemo(() => ['rectificacion', 'supresion', 'oposicion'].includes(type), [type]);

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      setRequests(await SVDatabaseService.getSolicitudesPrivacidadUsuario(currentUser.id));
    } catch (loadError) {
      setError(getFriendlyFirebaseError(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, [currentUser.id]);

  useEffect(() => {
    if (!blockAllowed) setTemporaryBlock(false);
  }, [blockAllowed]);

  const submitRequest = async () => {
    setMessage('');
    setError('');
    if (detail.trim().length < 10) {
      setError('Explica tu solicitud con al menos 10 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const created = await SVDatabaseService.crearSolicitudPrivacidad(
        currentUser,
        type,
        detail,
        temporaryBlock,
      );
      setRequests((items) => [created, ...items]);
      setDetail('');
      setTemporaryBlock(false);
      setMessage('Solicitud enviada a Administración. Puedes revisar su estado en esta misma sección.');
    } catch (submitError) {
      setError(getFriendlyFirebaseError(submitError));
    } finally {
      setSaving(false);
    }
  };

  const exportSummary = async () => {
    setExporting(true);
    setError('');
    setMessage('');
    try {
      const data = await SVDatabaseService.getResumenDatosPersonales(currentUser);
      downloadJson(`servicios-vecinales-mis-datos-${currentUser.id}.json`, data);
      setMessage('Se descargó un resumen de tus datos. Para un acceso o portabilidad completa puedes enviar una solicitud formal.');
    } catch (exportError) {
      setError(getFriendlyFirebaseError(exportError));
    } finally {
      setExporting(false);
    }
  };

  const emailSubject = encodeURIComponent('Solicitud de privacidad - Servicios Vecinales');
  const emailBody = encodeURIComponent(`Hola,\n\nQuiero realizar una consulta relacionada con mis datos personales en Servicios Vecinales.\n\nNombre: ${currentUser.nombre}\nCorreo de la cuenta: ${currentUser.email}\n\nDetalle:\n`);

  return (
    <div className="absolute inset-0 z-[95] bg-slate-950/40 flex items-end sm:items-center justify-center">
      <section className="w-full h-[95%] sm:h-[90%] max-w-lg sv-screen rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden flex flex-col sv-modal">
        <header className="h-14 px-4 bg-slate-900 text-white flex items-center justify-between shrink-0 sv-header">
          <div className="flex items-center gap-2 min-w-0">
            <button type="button" onClick={onClose} className="p-1.5 rounded-xl bg-white/10" aria-label="Volver">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="font-black text-sm truncate">Mis datos y privacidad</p>
              <p className="text-[9px] text-white/65">Ejercicio de derechos y solicitudes</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl bg-white/10" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <section className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm sv-card">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800">Control sobre tus datos</h2>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                  Puedes solicitar acceso, rectificación, supresión, oposición o portabilidad. Para rectificación, supresión u oposición también puedes pedir bloqueo temporal mientras se revisa el requerimiento.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                type="button"
                onClick={() => void exportSummary()}
                disabled={exporting}
                className="py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" /> {exporting ? 'Preparando...' : 'Descargar resumen'}
              </button>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${emailSubject}&body=${emailBody}`}
                className="py-2.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-bold flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" /> Escribir a soporte
              </a>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm mt-3 sv-card">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-violet-600" />
              <div><h3 className="text-xs font-black text-slate-700">Nueva solicitud</h3><p className="text-[9px] text-slate-400">Quedará registrada para revisión administrativa.</p></div>
            </div>

            <label className="block text-[10px] font-bold text-slate-600">Derecho que deseas ejercer
              <select value={type} onChange={(event) => setType(event.target.value as TipoSolicitudPrivacidad)} className="mt-1 w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                {Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <p className="text-[9px] text-slate-400 leading-relaxed mt-1.5">{TYPE_HELP[type]}</p>

            <label className="block text-[10px] font-bold text-slate-600 mt-3">Detalle
              <textarea
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
                maxLength={1500}
                placeholder="Explica qué información necesitas revisar, corregir, eliminar o a qué tratamiento deseas oponerte."
                className="mt-1 w-full h-28 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs resize-none"
              />
            </label>
            <p className="text-[9px] text-slate-400 text-right mt-1">{detail.length}/1500</p>

            {blockAllowed && (
              <label className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 p-2.5 cursor-pointer">
                <input type="checkbox" checked={temporaryBlock} onChange={(event) => setTemporaryBlock(event.target.checked)} className="mt-0.5" />
                <span className="text-[10px] text-amber-800 leading-relaxed"><strong>Solicitar bloqueo temporal</strong> de los datos o tratamiento relacionados con este requerimiento mientras se resuelve.</span>
              </label>
            )}

            <button type="button" onClick={() => void submitRequest()} disabled={saving || detail.trim().length < 10} className="w-full mt-3 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:bg-slate-300 sv-dark-action">
              <Send className="w-3.5 h-3.5" /> {saving ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </section>

          {message && <p className="mt-3 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">{message}</p>}
          {error && <p className="mt-3 text-[10px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-3">{error}</p>}

          <section className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm mt-3 sv-card">
            <div className="flex items-center justify-between gap-2">
              <div><h3 className="text-xs font-black text-slate-700">Mis solicitudes</h3><p className="text-[9px] text-slate-400">Seguimiento de tus requerimientos de privacidad.</p></div>
              <button type="button" onClick={() => void loadRequests()} disabled={loading} className="p-2 rounded-xl bg-slate-50 text-slate-500 border border-slate-100"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>

            {loading ? <p className="text-[10px] text-slate-400 py-6 text-center">Cargando solicitudes...</p> : requests.length ? (
              <div className="space-y-2 mt-3">
                {requests.map((request) => (
                  <article key={request.id} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><p className="text-[10px] font-black text-slate-700">{TYPE_LABELS[request.tipo]}</p><p className="text-[9px] text-slate-400">{formatDateTime(request.createdAt)}</p></div>
                      <span className="text-[8px] font-bold px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600">{STATUS_LABELS[request.estado]}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed mt-2 whitespace-pre-wrap">{request.detalle}</p>
                    {request.solicita_bloqueo_temporal && <p className="text-[9px] font-bold text-amber-700 mt-2">{BLOCK_LABELS[request.estado_bloqueo]}</p>}
                    {request.respuesta_admin && <div className="mt-2 rounded-lg bg-white border border-slate-100 p-2"><p className="text-[8px] font-bold uppercase text-slate-400">Respuesta de Administración</p><p className="text-[10px] text-slate-600 mt-1 whitespace-pre-wrap">{request.respuesta_admin}</p></div>}
                  </article>
                ))}
              </div>
            ) : <p className="text-[10px] text-slate-400 py-6 text-center">Todavía no has presentado solicitudes de privacidad.</p>}
          </section>
        </main>
      </section>
    </div>
  );
}
