import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DollarSign,
  Flag,
  History,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  Star,
  UserRound,
  Wrench,
  XCircle,
} from 'lucide-react';
import { REQUEST_STATUS_CLASSES, REQUEST_STATUS_LABELS, normalizePhone } from '../constants';
import { getFriendlyFirebaseError } from '../firebase';
import { formatCurrencyForCountry, getCountryConfig } from '../data/countries';
import { dateToMillis, formatDate, SVDatabaseService } from '../state/databaseService';
import type {
  CotizacionHistorial,
  CotizacionSolicitud,
  FormaPagoCotizacion,
  EstadoSolicitud,
  HistorialSolicitudEntry,
  MensajeSolicitud,
  MotivoReporte,
  Proveedor,
  SolicitudServicio,
  Usuario,
} from '../types';

interface TabSolicitudesProps {
  currentUser: Usuario | null;
  onRequestDetailChange?: (open: boolean) => void;
  openChatSolicitudId?: string | null;
  onOpenChatHandled?: () => void;
}

type SolicitudesVista = 'activas' | 'completadas' | 'cerradas';

const ACTIVE_STATUSES: EstadoSolicitud[] = ['solicitada', 'aceptada', 'en_proceso'];
const CLOSED_STATUSES: EstadoSolicitud[] = ['cancelada', 'rechazada'];

function nextActions(request: SolicitudServicio, role: Usuario['tipo_usuario']): EstadoSolicitud[] {
  if (role === 'cliente') {
    return request.estado === 'solicitada' || request.estado === 'aceptada' ? ['cancelada'] : [];
  }
  if (role === 'proveedor') {
    if (request.estado === 'solicitada') return ['aceptada', 'rechazada'];
    if (request.estado === 'aceptada') return ['en_proceso', 'cancelada'];
    if (request.estado === 'en_proceso') return ['completada', 'cancelada'];
  }
  return [];
}

function requestMatchesView(request: SolicitudServicio, view: SolicitudesVista): boolean {
  if (view === 'activas') return ACTIVE_STATUSES.includes(request.estado);
  if (view === 'completadas') return request.estado === 'completada';
  return CLOSED_STATUSES.includes(request.estado);
}

function emptyMessage(view: SolicitudesVista, role: Usuario['tipo_usuario']): { title: string; description: string } {
  if (view === 'activas') {
    return {
      title: 'No tienes solicitudes activas',
      description:
        role === 'cliente'
          ? 'Tus solicitudes nuevas, aceptadas y en proceso aparecerán aquí.'
          : role === 'proveedor'
            ? 'Las solicitudes nuevas y los trabajos que estés realizando aparecerán aquí.'
            : 'No hay solicitudes activas en este momento.',
    };
  }

  if (view === 'completadas') {
    return {
      title: 'Aún no hay trabajos completados',
      description:
        role === 'cliente'
          ? 'Cuando un proveedor termine un trabajo, quedará guardado aquí y podrás dejar una reseña.'
          : role === 'proveedor'
            ? 'Los trabajos que marques como completados quedarán guardados en este historial.'
            : 'Todavía no existen solicitudes completadas.',
    };
  }

  return {
    title: 'No hay solicitudes cerradas',
    description: 'Las solicitudes canceladas o rechazadas quedarán guardadas aquí para no mezclarlas con tus trabajos activos.',
  };
}

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

function formatCurrency(value: number, countryCode?: string | null): string {
  return formatCurrencyForCountry(value, countryCode);
}

const PAYMENT_METHOD_LABELS: Record<FormaPagoCotizacion, string> = {
  por_coordinar: 'Por coordinar',
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  mixto: 'Mixto',
};

function quoteExpired(quote: CotizacionSolicitud): boolean {
  const expires = dateToMillis(quote.vigencia_hasta);
  return Boolean(expires && expires < Date.now());
}

function formatQuoteValidity(value: unknown): string {
  const timestamp = dateToMillis(value);
  if (!timestamp) return 'Sin vigencia definida';
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(timestamp));
}

function formatPreferredAppointment(request: SolicitudServicio): string {
  if (!request.fecha_preferida || !request.hora_preferida) return 'Por coordinar';
  const date = new Date(`${request.fecha_preferida}T12:00:00`);
  if (Number.isNaN(date.getTime())) return `${request.fecha_preferida} · ${request.hora_preferida}`;
  const label = new Intl.DateTimeFormat('es-CL', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
  return `${label} · ${request.hora_preferida}`;
}

function historyActorLabel(entry: HistorialSolicitudEntry): string {
  if (entry.actor_rol === 'cliente') return 'Cliente';
  if (entry.actor_rol === 'proveedor') return 'Proveedor';
  if (entry.actor_rol === 'admin') return 'Administración';
  return 'Registro del sistema';
}

export function TabSolicitudes({
  currentUser,
  onRequestDetailChange,
  openChatSolicitudId,
  onOpenChatHandled,
}: TabSolicitudesProps) {
  const [requests, setRequests] = useState<SolicitudServicio[]>([]);
  const [providersById, setProvidersById] = useState<Record<string, Proveedor>>({});
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState<SolicitudesVista>('activas');

  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [historyEntries, setHistoryEntries] = useState<HistorialSolicitudEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const [reviewedRequestIds, setReviewedRequestIds] = useState<Set<string>>(new Set());
  const [reviewingId, setReviewingId] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<MensajeSolicitud[]>([]);
  const [chatText, setChatText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [quote, setQuote] = useState<CotizacionSolicitud | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [quoteFormOpen, setQuoteFormOpen] = useState(false);
  const [quoteLabor, setQuoteLabor] = useState('');
  const [quoteMaterials, setQuoteMaterials] = useState('');
  const [quoteOthers, setQuoteOthers] = useState('');
  const [quoteVisit, setQuoteVisit] = useState('');
  const [quoteDiscount, setQuoteDiscount] = useState('');
  const [quoteAdvance, setQuoteAdvance] = useState('');
  const [quotePaymentMethod, setQuotePaymentMethod] = useState<FormaPagoCotizacion>('por_coordinar');
  const [quoteValidityDays, setQuoteValidityDays] = useState('7');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteHistory, setQuoteHistory] = useState<CotizacionHistorial[]>([]);
  const [quoteHistoryOpen, setQuoteHistoryOpen] = useState(false);
  const [quoteHistoryLoading, setQuoteHistoryLoading] = useState(false);
  const [quoteSaving, setQuoteSaving] = useState(false);
  const [quoteResponding, setQuoteResponding] = useState(false);
  const [clientReportOpen, setClientReportOpen] = useState(false);
  const [clientReportReason, setClientReportReason] = useState<MotivoReporte>('conducta_inadecuada');
  const [clientReportDescription, setClientReportDescription] = useState('');
  const [clientReportSubmitting, setClientReportSubmitting] = useState(false);
  const [clientReportError, setClientReportError] = useState('');
  const [clientReportMessage, setClientReportMessage] = useState('');

  const loadRequests = useCallback(async () => {
    if (!currentUser) {
      setRequests([]);
      setReviewedRequestIds(new Set());
      setProvidersById({});
      return;
    }

    setLoading(true);
    setError('');
    try {
      let loadedRequests: SolicitudServicio[] = [];
      if (currentUser.tipo_usuario === 'cliente') {
        loadedRequests = await SVDatabaseService.getSolicitudesCliente(currentUser.id);
      } else if (currentUser.tipo_usuario === 'proveedor') {
        loadedRequests = await SVDatabaseService.getSolicitudesProveedor(currentUser.id);
      } else {
        loadedRequests = await SVDatabaseService.getSolicitudes();
      }

      setRequests(loadedRequests);

      const providerIds = [...new Set(loadedRequests.map((request) => request.proveedor_id))];
      const providerEntries = await Promise.all(
        providerIds.map(async (providerId) => {
          const provider = await SVDatabaseService.getProveedor(providerId);
          return provider ? ([providerId, provider] as const) : null;
        }),
      );
      setProvidersById(
        Object.fromEntries(
          providerEntries.filter((entry): entry is readonly [string, Proveedor] => entry !== null),
        ),
      );

      if (currentUser.tipo_usuario === 'cliente') {
        const completedRequests = loadedRequests.filter((request) => request.estado === 'completada');
        const checks = await Promise.all(
          completedRequests.map(async (request) => ({
            id: request.id,
            reviewed: await SVDatabaseService.hasResenaSolicitud(request.proveedor_id, request.id),
          })),
        );
        setReviewedRequestIds(new Set(checks.filter((item) => item.reviewed).map((item) => item.id)));
      } else {
        setReviewedRequestIds(new Set());
      }
    } catch (requestError) {
      setError(getFriendlyFirebaseError(requestError));
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => () => onRequestDetailChange?.(false), [onRequestDetailChange]);

  const loadHistory = useCallback(async (request: SolicitudServicio) => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      setHistoryEntries(await SVDatabaseService.getHistorialSolicitud(request));
    } catch (historyRequestError) {
      setHistoryEntries([]);
      setHistoryError(getFriendlyFirebaseError(historyRequestError));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!openChatSolicitudId || loading || !currentUser) return;
    const target = requests.find((request) => request.id === openChatSolicitudId);
    if (!target) {
      if (requests.length > 0) {
        setError('No fue posible encontrar la solicitud asociada a este mensaje.');
        onOpenChatHandled?.();
      }
      return;
    }

    if (target.estado === 'completada') setView('completadas');
    else if (CLOSED_STATUSES.includes(target.estado)) setView('cerradas');
    else setView('activas');

    setSelectedRequestId(target.id);
    setChatMessages([]);
    setChatText('');
    setChatError('');
    setChatOpen(true);
    onRequestDetailChange?.(true);
    void loadHistory(target);
    onOpenChatHandled?.();
  }, [
    openChatSolicitudId,
    loading,
    currentUser,
    requests,
    loadHistory,
    onOpenChatHandled,
    onRequestDetailChange,
  ]);

  const counts = useMemo(
    () => ({
      activas: requests.filter((request) => ACTIVE_STATUSES.includes(request.estado)).length,
      completadas: requests.filter((request) => request.estado === 'completada').length,
      cerradas: requests.filter((request) => CLOSED_STATUSES.includes(request.estado)).length,
    }),
    [requests],
  );

  const visibleRequests = useMemo(
    () => requests.filter((request) => requestMatchesView(request, view)),
    [requests, view],
  );

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) || null,
    [requests, selectedRequestId],
  );

  useEffect(() => {
    if (!selectedRequest || !currentUser || currentUser.tipo_usuario === 'admin') {
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError('');
      return undefined;
    }

    setQuoteLoading(true);
    setQuoteError('');
    return SVDatabaseService.subscribeCotizacionSolicitud(
      selectedRequest,
      currentUser.id,
      (nextQuote) => {
        setQuote(nextQuote);
        setQuoteLoading(false);
      },
      (quoteRequestError) => {
        setQuoteError(getFriendlyFirebaseError(quoteRequestError));
        setQuoteLoading(false);
      },
    );
  }, [selectedRequest, currentUser]);

  useEffect(() => {
    if (!selectedRequest || !currentUser || currentUser.tipo_usuario === 'admin') {
      setQuoteHistory([]);
      setQuoteHistoryLoading(false);
      return undefined;
    }

    setQuoteHistoryLoading(true);
    return SVDatabaseService.subscribeCotizacionesHistorialSolicitud(
      selectedRequest,
      currentUser.id,
      (history) => {
        setQuoteHistory(history);
        setQuoteHistoryLoading(false);
      },
      () => {
        setQuoteHistory([]);
        setQuoteHistoryLoading(false);
      },
    );
  }, [selectedRequest, currentUser]);

  useEffect(() => {
    if (!chatOpen || !selectedRequest || !currentUser || currentUser.tipo_usuario === 'admin') {
      return undefined;
    }

    setChatLoading(true);
    setChatError('');
    return SVDatabaseService.subscribeMensajesSolicitud(
      selectedRequest,
      currentUser.id,
      (messages) => {
        setChatMessages(messages);
        setChatLoading(false);
      },
      (chatRequestError) => {
        setChatError(getFriendlyFirebaseError(chatRequestError));
        setChatLoading(false);
      },
    );
  }, [chatOpen, selectedRequest, currentUser]);

  useEffect(() => {
    if (!chatOpen) return;
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chatOpen, chatMessages]);

  const changeStatus = async (request: SolicitudServicio, nextStatus: EstadoSolicitud) => {
    if (!currentUser) return;
    setUpdatingId(request.id);
    setError('');
    try {
      await SVDatabaseService.updateSolicitudEstado(request, nextStatus, currentUser.tipo_usuario);
      const historyRequest: SolicitudServicio = {
        ...request,
        estado: nextStatus,
        updatedAt: new Date(),
      };
      await loadRequests();
      if (selectedRequestId === request.id) await loadHistory(historyRequest);
    } catch (requestError) {
      setError(getFriendlyFirebaseError(requestError));
    } finally {
      setUpdatingId('');
    }
  };

  const openReview = (requestId: string) => {
    setReviewingId(requestId);
    setReviewRating(0);
    setReviewComment('');
    setReviewError('');
  };

  const closeReview = () => {
    setReviewingId('');
    setReviewRating(0);
    setReviewComment('');
    setReviewError('');
  };

  const changeView = (nextView: SolicitudesVista) => {
    closeReview();
    setView(nextView);
  };

  const openDetail = (request: SolicitudServicio) => {
    closeReview();
    setSelectedRequestId(request.id);
    onRequestDetailChange?.(true);
    void loadHistory(request);
  };

  const closeDetail = () => {
    closeReview();
    setChatOpen(false);
    setChatMessages([]);
    setChatText('');
    setChatError('');
    setSelectedRequestId('');
    setHistoryEntries([]);
    setHistoryError('');
    setQuote(null);
    setQuoteError('');
    setQuoteFormOpen(false);
    setQuoteLabor('');
    setQuoteMaterials('');
    setQuoteOthers('');
    setQuoteVisit('');
    setQuoteDiscount('');
    setQuoteAdvance('');
    setQuotePaymentMethod('por_coordinar');
    setQuoteValidityDays('7');
    setQuoteNotes('');
    setQuoteHistory([]);
    setQuoteHistoryOpen(false);
    onRequestDetailChange?.(false);
  };

  const openChat = () => {
    setChatMessages([]);
    setChatText('');
    setChatError('');
    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setChatText('');
    setChatError('');
  };

  const openQuoteForm = () => {
    setQuoteLabor(quote ? String(quote.mano_obra) : '');
    setQuoteMaterials(quote ? String(quote.materiales) : '');
    setQuoteOthers(quote ? String(quote.otros) : '');
    setQuoteVisit(quote ? String(quote.costo_visita || 0) : '');
    setQuoteDiscount(quote ? String(quote.descuento || 0) : '');
    setQuoteAdvance(quote ? String(quote.anticipo || 0) : '');
    setQuotePaymentMethod(quote?.forma_pago || 'por_coordinar');
    setQuoteValidityDays(String(quote?.vigencia_dias || 7));
    setQuoteNotes(quote?.observaciones || '');
    setQuoteError('');
    setQuoteFormOpen(true);
  };

  const closeQuoteForm = () => {
    setQuoteFormOpen(false);
    setQuoteError('');
  };

  const submitQuote = async (request: SolicitudServicio) => {
    if (!currentUser || currentUser.tipo_usuario !== 'proveedor') return;
    setQuoteSaving(true);
    setQuoteError('');
    try {
      await SVDatabaseService.saveCotizacionSolicitud(request, currentUser, {
        mano_obra: Number(quoteLabor || 0),
        materiales: Number(quoteMaterials || 0),
        otros: Number(quoteOthers || 0),
        costo_visita: Number(quoteVisit || 0),
        descuento: Number(quoteDiscount || 0),
        anticipo: Number(quoteAdvance || 0),
        forma_pago: quotePaymentMethod,
        vigencia_dias: Number(quoteValidityDays || 7),
        observaciones: quoteNotes,
      });
      setQuoteFormOpen(false);
    } catch (quoteRequestError) {
      setQuoteError(getFriendlyFirebaseError(quoteRequestError));
    } finally {
      setQuoteSaving(false);
    }
  };

  const respondQuote = async (request: SolicitudServicio, decision: 'aceptada' | 'rechazada') => {
    if (!currentUser || currentUser.tipo_usuario !== 'cliente' || !quote) return;
    setQuoteResponding(true);
    setQuoteError('');
    try {
      await SVDatabaseService.respondCotizacionSolicitud(request, quote, currentUser, decision);
    } catch (quoteRequestError) {
      setQuoteError(getFriendlyFirebaseError(quoteRequestError));
    } finally {
      setQuoteResponding(false);
    }
  };

  const sendChatMessage = async (request: SolicitudServicio) => {
    if (!currentUser || currentUser.tipo_usuario === 'admin') return;
    const message = chatText.trim();
    if (!message) return;

    setChatSending(true);
    setChatError('');
    try {
      await SVDatabaseService.sendMensajeSolicitud(request, currentUser, message);
      setChatText('');
    } catch (chatRequestError) {
      setChatError(getFriendlyFirebaseError(chatRequestError));
    } finally {
      setChatSending(false);
    }
  };

  const submitClientReport = async (request: SolicitudServicio) => {
    if (!currentUser || currentUser.tipo_usuario !== 'proveedor') return;
    const description = clientReportDescription.trim();
    if (description.length < 3) {
      setClientReportError('Describe brevemente el motivo del reporte.');
      return;
    }

    setClientReportSubmitting(true);
    setClientReportError('');
    setClientReportMessage('');
    try {
      await SVDatabaseService.crearReporte({
        reportante_id: currentUser.id,
        reportante_nombre: currentUser.nombre,
        tipo: 'cliente',
        cliente_id: request.cliente_id,
        solicitud_id: request.id,
        motivo: clientReportReason,
        descripcion: description,
      });
      setClientReportOpen(false);
      setClientReportDescription('');
      setClientReportMessage('Reporte enviado. Administración podrá revisarlo junto con la solicitud asociada.');
    } catch (reportRequestError) {
      setClientReportError(getFriendlyFirebaseError(reportRequestError));
    } finally {
      setClientReportSubmitting(false);
    }
  };

  const submitReview = async (request: SolicitudServicio) => {
    if (!currentUser || currentUser.tipo_usuario !== 'cliente') return;
    if (request.estado !== 'completada') {
      setReviewError('Solo puedes calificar un trabajo que ya fue completado.');
      return;
    }
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError('Selecciona una calificación de 1 a 5 estrellas.');
      return;
    }
    const commentLength = reviewComment.trim().length;
    if (commentLength < 10 || commentLength > 1000) {
      setReviewError('Escribe un comentario de entre 10 y 1000 caracteres.');
      return;
    }

    setReviewSubmitting(true);
    setReviewError('');
    try {
      await SVDatabaseService.saveResena(request.proveedor_id, {
        solicitud_id: request.id,
        cliente_id: currentUser.id,
        cliente_nombre: currentUser.nombre,
        proveedor_id: request.proveedor_id,
        calificacion: reviewRating,
        comentario: reviewComment,
      });
      setReviewedRequestIds((current) => new Set([...current, request.id]));
      setReviewingId('');
      setReviewComment('');
      setReviewRating(0);
    } catch (requestError) {
      setReviewError(getFriendlyFirebaseError(requestError));
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <header className="h-14 bg-emerald-600 flex items-center px-4 text-white font-bold shadow-md">
          Solicitudes
        </header>
        <div className="flex-1 flex items-center justify-center p-6 pb-20">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center shadow-sm">
            <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Inicia sesión para ver tus solicitudes</p>
            <p className="text-xs text-slate-400 mt-1">Los clientes solicitan trabajos y los proveedores administran el avance.</p>
          </div>
        </div>
      </div>
    );
  }

  if (selectedRequest) {
    const provider = providersById[selectedRequest.proveedor_id] || null;
    const providerLabel = provider?.nombre_publico || provider?.oficio || selectedRequest.proveedor_oficio;
    const quoteCountryCode = provider?.pais_codigo || currentUser.pais_codigo || 'CL';
    const quoteCountry = getCountryConfig(quoteCountryCode);
    const actions = nextActions(selectedRequest, currentUser.tipo_usuario).filter(
      (action) => action !== 'en_proceso' || (!quoteLoading && (!quote || quote.estado === 'aceptada')),
    );
    const quoteDraftSubtotal = Math.max(0, Number(quoteLabor || 0))
      + Math.max(0, Number(quoteMaterials || 0))
      + Math.max(0, Number(quoteOthers || 0))
      + Math.max(0, Number(quoteVisit || 0));
    const quoteDraftTotal = Math.max(0, quoteDraftSubtotal - Math.max(0, Number(quoteDiscount || 0)));
    const quoteDraftAdvance = Math.max(0, Number(quoteAdvance || 0));
    const currentQuoteExpired = quote ? quoteExpired(quote) : false;
    const alreadyReviewed = reviewedRequestIds.has(selectedRequest.id);
    const isReviewOpen = reviewingId === selectedRequest.id;
    const hasReconstructedHistory = historyEntries.some((entry) => entry.id.endsWith('_reconstruida'));
    const chatClosed = selectedRequest.estado === 'rechazada' || selectedRequest.estado === 'cancelada';
    const chatCounterpart =
      currentUser.tipo_usuario === 'proveedor'
        ? selectedRequest.cliente_nombre
        : providerLabel;

    if (chatOpen && currentUser.tipo_usuario !== 'admin') {
      return (
        <div className="h-full flex flex-col bg-slate-50">
          <header className="h-14 bg-emerald-600 flex items-center gap-3 px-3 text-white shadow-md shrink-0">
            <button
              type="button"
              onClick={closeChat}
              aria-label="Volver al detalle"
              className="p-2 rounded-full bg-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-sm truncate">{chatCounterpart}</h2>
              <p className="text-[10px] text-white/80 truncate">
                Chat de la solicitud · {selectedRequest.proveedor_oficio}
              </p>
            </div>
            <MessageCircle className="w-5 h-5 text-white/90" />
          </header>

          <main className="flex-1 overflow-y-auto px-3 py-3">
            {chatError && (
              <div className="mb-3 text-[10px] text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                {chatError}
              </div>
            )}

            {chatLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Cargando conversación...
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center max-w-[240px]">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 mt-3">Aún no hay mensajes</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Usa este chat para coordinar detalles relacionados con este trabajo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pb-2">
                {chatMessages.map((message) => {
                  const ownMessage = message.remitente_id === currentUser.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${ownMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${
                          ownMessage
                            ? 'bg-emerald-600 text-white rounded-br-md'
                            : 'bg-white border border-slate-100 text-slate-700 rounded-bl-md'
                        }`}
                      >
                        {!ownMessage && (
                          <p className="text-[9px] font-bold mb-1 text-emerald-700">
                            {message.remitente_nombre}
                          </p>
                        )}
                        <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                          {message.texto}
                        </p>
                        <p className={`text-[8px] mt-1 text-right ${ownMessage ? 'text-white/70' : 'text-slate-400'}`}>
                          {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            )}
          </main>

          <footer className="shrink-0 bg-white border-t border-slate-100 p-3">
            {chatClosed ? (
              <div className="rounded-xl bg-slate-100 px-3 py-2.5 text-center">
                <p className="text-[11px] font-bold text-slate-600">Conversación cerrada</p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Puedes consultar los mensajes anteriores, pero ya no enviar nuevos.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-end gap-2">
                  <textarea
                    value={chatText}
                    onChange={(event) => setChatText(event.target.value)}
                    maxLength={1000}
                    rows={1}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 min-h-10 max-h-24 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => void sendChatMessage(selectedRequest)}
                    disabled={chatSending || chatText.trim().length === 0}
                    aria-label="Enviar mensaje"
                    className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 disabled:bg-slate-300"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between px-1 mt-1">
                  <p className="text-[8px] text-slate-400">Solo participantes de esta solicitud pueden leer el chat.</p>
                  <p className="text-[8px] text-slate-400">{chatText.length}/1000</p>
                </div>
              </>
            )}
          </footer>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col bg-slate-50">
        <header className="h-14 bg-emerald-600 flex items-center gap-3 px-3 text-white shadow-md shrink-0">
          <button
            type="button"
            onClick={closeDetail}
            aria-label="Volver a solicitudes"
            className="p-2 rounded-full bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-sm">Detalle de solicitud</h2>
            <p className="text-[10px] text-white/80 truncate">Solicitud #{selectedRequest.id.slice(-8)}</p>
          </div>
          <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-white/15 border border-white/20">
            {REQUEST_STATUS_LABELS[selectedRequest.estado]}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-3">
          {error && (
            <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl">{error}</div>
          )}

          <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              {currentUser.tipo_usuario === 'proveedor' ? (
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <UserRound className="w-6 h-6 text-emerald-600" />
                </div>
              ) : provider?.foto_perfil ? (
                <img
                  src={provider.foto_perfil}
                  alt={providerLabel}
                  className="w-12 h-12 rounded-2xl object-cover bg-slate-100 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <Wrench className="w-6 h-6 text-emerald-600" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
                  {currentUser.tipo_usuario === 'proveedor' ? 'Cliente' : 'Proveedor'}
                </p>
                <h3 className="text-sm font-bold text-slate-800 truncate">
                  {currentUser.tipo_usuario === 'proveedor' ? selectedRequest.cliente_nombre : providerLabel}
                </h3>
                <p className="text-[11px] text-slate-500 truncate">
                  {currentUser.tipo_usuario === 'proveedor' ? selectedRequest.proveedor_oficio : provider?.oficio || selectedRequest.proveedor_oficio}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">Estado actual</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{REQUEST_STATUS_LABELS[selectedRequest.estado]}</p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${REQUEST_STATUS_CLASSES[selectedRequest.estado]}`}>
                {REQUEST_STATUS_LABELS[selectedRequest.estado]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-slate-50 rounded-xl p-2.5">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Creada</p>
                <p className="text-[10px] text-slate-600 mt-1">{formatDateTime(selectedRequest.createdAt)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Último cambio</p>
                <p className="text-[10px] text-slate-600 mt-1">{formatDateTime(selectedRequest.updatedAt)}</p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800">Información del trabajo</h3>
            <p className="text-xs text-slate-600 mt-3 leading-relaxed whitespace-pre-wrap">{selectedRequest.descripcion}</p>
            <div className="mt-4 space-y-2 text-[11px] text-slate-600">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Ubicación</p>
                  <p>{selectedRequest.ubicacion}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Fecha y hora propuestas</p>
                  <p className="font-semibold text-slate-700">{formatPreferredAppointment(selectedRequest)}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Es una preferencia del cliente; pueden confirmarla o cambiarla por chat.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Teléfono indicado en la solicitud</p>
                  <a href={`tel:${normalizePhone(selectedRequest.telefono_contacto)}`} className="font-semibold text-emerald-700">
                    {selectedRequest.telefono_contacto}
                  </a>
                </div>
              </div>
              {currentUser.tipo_usuario === 'cliente' && provider?.whatsapp && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Contacto del proveedor</p>
                    <a href={`tel:${normalizePhone(provider.whatsapp)}`} className="font-semibold text-emerald-700">
                      {provider.whatsapp}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </section>

          {currentUser.tipo_usuario === 'proveedor' && (
            <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                  <Flag className="w-5 h-5 text-rose-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-slate-800">Seguridad y convivencia</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Si el cliente incumple las normas, puedes reportarlo y administración revisará el caso.</p>
                </div>
              </div>
              {clientReportMessage && <p className="mt-3 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-2.5">{clientReportMessage}</p>}
              <button
                type="button"
                onClick={() => {
                  setClientReportError('');
                  setClientReportMessage('');
                  setClientReportOpen(true);
                }}
                className="w-full mt-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Flag className="w-4 h-4" /> Reportar cliente
              </button>
            </section>
          )}

          {currentUser.tipo_usuario !== 'admin' && (quote || selectedRequest.estado === 'aceptada') && (
            <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-slate-800">Cotización del servicio</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    La cotización es opcional. Si se envía una, debe ser aceptada antes de iniciar el trabajo.
                  </p>
                  <p className="text-[9px] text-emerald-700 font-bold mt-1">
                    Moneda: {quoteCountry.currencyCode} · {quoteCountry.name}
                  </p>
                </div>
              </div>

              {quoteError && (
                <div className="mt-3 text-[10px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-2.5">
                  {quoteError}
                </div>
              )}

              {quoteLoading ? (
                <div className="py-5 text-center text-[10px] text-slate-400">Cargando cotización...</div>
              ) : quoteFormOpen && currentUser.tipo_usuario === 'proveedor' ? (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <label className="block">
                      <span className="text-[9px] font-bold text-slate-500">Mano de obra</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={quoteLabor}
                        onChange={(event) => setQuoteLabor(event.target.value)}
                        placeholder={`${quoteCountry.currencySymbol}0`}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[9px] font-bold text-slate-500">Materiales</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={quoteMaterials}
                        onChange={(event) => setQuoteMaterials(event.target.value)}
                        placeholder={`${quoteCountry.currencySymbol}0`}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[9px] font-bold text-slate-500">Otros</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={quoteOthers}
                        onChange={(event) => setQuoteOthers(event.target.value)}
                        placeholder={`${quoteCountry.currencySymbol}0`}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <label className="block">
                      <span className="text-[9px] font-bold text-slate-500">Costo visita</span>
                      <input type="number" min="0" step="1" value={quoteVisit} onChange={(event) => setQuoteVisit(event.target.value)} placeholder={`${quoteCountry.currencySymbol}0`} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    </label>
                    <label className="block">
                      <span className="text-[9px] font-bold text-slate-500">Descuento</span>
                      <input type="number" min="0" step="1" value={quoteDiscount} onChange={(event) => setQuoteDiscount(event.target.value)} placeholder={`${quoteCountry.currencySymbol}0`} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    </label>
                    <label className="block">
                      <span className="text-[9px] font-bold text-slate-500">Anticipo</span>
                      <input type="number" min="0" step="1" value={quoteAdvance} onChange={(event) => setQuoteAdvance(event.target.value)} placeholder={`${quoteCountry.currencySymbol}0`} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-[9px] font-bold text-slate-500">Forma de pago</span>
                      <select value={quotePaymentMethod} onChange={(event) => setQuotePaymentMethod(event.target.value as FormaPagoCotizacion)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500">
                        {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[9px] font-bold text-slate-500">Vigencia</span>
                      <select value={quoteValidityDays} onChange={(event) => setQuoteValidityDays(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500">
                        <option value="3">3 días</option>
                        <option value="7">7 días</option>
                        <option value="15">15 días</option>
                        <option value="30">30 días</option>
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-[9px] font-bold text-slate-500">Observaciones</span>
                    <textarea
                      value={quoteNotes}
                      onChange={(event) => setQuoteNotes(event.target.value)}
                      maxLength={500}
                      placeholder="Ej.: incluye instalación; materiales sujetos a disponibilidad."
                      className="mt-1 w-full h-20 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="block text-right text-[8px] text-slate-400 mt-1">{quoteNotes.length}/500</span>
                  </label>

                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-emerald-700"><span>Subtotal</span><span>{formatCurrency(quoteDraftSubtotal, quoteCountryCode)}</span></div>
                    {Number(quoteDiscount || 0) > 0 && <div className="flex items-center justify-between text-[10px] text-emerald-700"><span>Descuento</span><span>- {formatCurrency(Number(quoteDiscount || 0), quoteCountryCode)}</span></div>}
                    <div className="border-t border-emerald-200 pt-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-700">Total cotización</span>
                      <span className="text-sm font-extrabold text-emerald-700">{formatCurrency(quoteDraftTotal, quoteCountryCode)}</span>
                    </div>
                    {quoteDraftAdvance > 0 && <div className="flex items-center justify-between text-[9px] text-emerald-700"><span>Anticipo propuesto</span><span>{formatCurrency(quoteDraftAdvance, quoteCountryCode)}</span></div>}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={closeQuoteForm}
                      disabled={quoteSaving}
                      className="py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitQuote(selectedRequest)}
                      disabled={quoteSaving || quoteDraftTotal <= 0 || quoteDraftAdvance > quoteDraftTotal || Number(quoteDiscount || 0) > quoteDraftSubtotal}
                      className="py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:bg-slate-300"
                    >
                      {quoteSaving ? 'Enviando...' : quote ? 'Enviar nueva cotización' : 'Enviar cotización'}
                    </button>
                  </div>
                </div>
              ) : quote ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      quote.estado === 'aceptada'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : quote.estado === 'rechazada'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {quote.estado === 'aceptada' ? 'Aceptada' : quote.estado === 'rechazada' ? 'Rechazada' : 'Esperando respuesta'}
                    </span>
                    <span className="text-[9px] text-slate-400">Actualizada {formatDateTime(quote.updatedAt)}</span>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 space-y-2">
                    <div className="flex justify-between text-[11px] text-slate-600"><span>Mano de obra</span><strong>{formatCurrency(quote.mano_obra, quoteCountryCode)}</strong></div>
                    <div className="flex justify-between text-[11px] text-slate-600"><span>Materiales</span><strong>{formatCurrency(quote.materiales, quoteCountryCode)}</strong></div>
                    <div className="flex justify-between text-[11px] text-slate-600"><span>Otros</span><strong>{formatCurrency(quote.otros, quoteCountryCode)}</strong></div>
                    {quote.costo_visita > 0 && <div className="flex justify-between text-[11px] text-slate-600"><span>Costo de visita</span><strong>{formatCurrency(quote.costo_visita, quoteCountryCode)}</strong></div>}
                    {quote.descuento > 0 && <div className="flex justify-between text-[11px] text-emerald-700"><span>Descuento</span><strong>- {formatCurrency(quote.descuento, quoteCountryCode)}</strong></div>}
                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">Total</span>
                      <strong className="text-base text-emerald-700">{formatCurrency(quote.total, quoteCountryCode)}</strong>
                    </div>
                    {quote.anticipo > 0 && (
                      <>
                        <div className="flex justify-between text-[11px] text-slate-600"><span>Anticipo</span><strong>{formatCurrency(quote.anticipo, quoteCountryCode)}</strong></div>
                        <div className="flex justify-between text-[11px] text-slate-600"><span>Saldo posterior</span><strong>{formatCurrency(Math.max(0, quote.total - quote.anticipo), quoteCountryCode)}</strong></div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="rounded-xl border border-slate-100 bg-white p-2.5">
                      <p className="text-[9px] uppercase font-bold text-slate-400">Forma de pago</p>
                      <p className="text-[11px] font-semibold text-slate-700 mt-0.5">{PAYMENT_METHOD_LABELS[quote.forma_pago] || 'Por coordinar'}</p>
                    </div>
                    <div className={`rounded-xl border p-2.5 ${currentQuoteExpired ? 'border-rose-100 bg-rose-50' : 'border-slate-100 bg-white'}`}>
                      <p className="text-[9px] uppercase font-bold text-slate-400">Vigencia</p>
                      <p className={`text-[11px] font-semibold mt-0.5 ${currentQuoteExpired ? 'text-rose-700' : 'text-slate-700'}`}>{formatQuoteValidity(quote.vigencia_hasta)}</p>
                    </div>
                  </div>

                  {currentQuoteExpired && quote.estado === 'enviada' && (
                    <p className="mt-3 text-[10px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-2.5 text-center">
                      Esta cotización venció. El proveedor debe enviar una nueva propuesta.
                    </p>
                  )}

                  {quote.observaciones && (
                    <div className="mt-3 rounded-xl bg-white border border-slate-100 p-3">
                      <p className="text-[9px] uppercase font-bold text-slate-400">Observaciones</p>
                      <p className="text-[11px] text-slate-600 mt-1 whitespace-pre-wrap">{quote.observaciones}</p>
                    </div>
                  )}

                  {currentUser.tipo_usuario === 'cliente' && quote.estado === 'enviada' && selectedRequest.estado === 'aceptada' && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        type="button"
                        disabled={quoteResponding}
                        onClick={() => void respondQuote(selectedRequest, 'rechazada')}
                        className="py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        disabled={quoteResponding || currentQuoteExpired}
                        onClick={() => void respondQuote(selectedRequest, 'aceptada')}
                        className="py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
                      >
                        {quoteResponding ? 'Guardando...' : currentQuoteExpired ? 'Cotización vencida' : 'Aceptar cotización'}
                      </button>
                    </div>
                  )}

                  {(quoteHistory.length > 0 || quoteHistoryLoading) && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <button type="button" onClick={() => setQuoteHistoryOpen((open) => !open)} className="w-full flex items-center justify-between gap-2 text-[10px] font-bold text-slate-600">
                        <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Historial de cotizaciones</span>
                        <span>{quoteHistoryLoading ? '...' : quoteHistory.length}</span>
                      </button>
                      {quoteHistoryOpen && (
                        <div className="mt-2 space-y-2">
                          {quoteHistory.map((previous, index) => (
                            <div key={previous.id} className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-bold text-slate-700">Cotización anterior #{quoteHistory.length - index}</p>
                                <span className={`text-[9px] font-bold ${previous.estado === 'rechazada' ? 'text-rose-600' : previous.estado === 'aceptada' ? 'text-emerald-600' : 'text-amber-600'}`}>{previous.estado === 'rechazada' ? 'Rechazada' : previous.estado === 'aceptada' ? 'Aceptada' : 'Enviada'}</span>
                              </div>
                              <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500"><span>{formatDateTime(previous.updatedAt)}</span><strong className="text-slate-700">{formatCurrency(previous.total, quoteCountryCode)}</strong></div>
                              <p className="text-[9px] text-slate-400 mt-1">Pago: {PAYMENT_METHOD_LABELS[previous.forma_pago] || 'Por coordinar'} · Vigencia: {formatQuoteValidity(previous.vigencia_hasta)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {currentUser.tipo_usuario === 'proveedor' && selectedRequest.estado === 'aceptada' && (quote.estado === 'rechazada' || (quote.estado === 'enviada' && currentQuoteExpired)) && (
                    <button
                      type="button"
                      onClick={openQuoteForm}
                      className="w-full mt-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                    >
                      {currentQuoteExpired ? 'Renovar cotización vencida' : 'Preparar nueva cotización'}
                    </button>
                  )}

                  {currentUser.tipo_usuario === 'proveedor' && quote.estado === 'enviada' && !currentQuoteExpired && (
                    <p className="mt-3 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-center">
                      Esperando que el cliente acepte o rechace la cotización.
                    </p>
                  )}

                  {quote.estado === 'aceptada' && (
                    <p className="mt-3 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-center">
                      Precio acordado. El proveedor ya puede iniciar el trabajo.
                    </p>
                  )}
                </div>
              ) : currentUser.tipo_usuario === 'proveedor' ? (
                <div className="mt-3">
                  <p className="text-[10px] text-slate-500">
                    Si necesitas acordar un precio antes de comenzar, envía una cotización. Si no es necesaria, puedes iniciar el trabajo directamente.
                  </p>
                  <button
                    type="button"
                    onClick={openQuoteForm}
                    className="w-full mt-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <DollarSign className="w-4 h-4" /> Crear cotización
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-[10px] text-slate-500">
                  El proveedor todavía no ha enviado una cotización. Puede continuar sin una si el precio se coordina por otro medio.
                </p>
              )}
            </section>
          )}

          {currentUser.tipo_usuario !== 'admin' && (
            <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-slate-800">Conversación del servicio</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {chatClosed
                      ? 'La conversación está cerrada, pero puedes consultar los mensajes anteriores.'
                      : `Coordina directamente con ${chatCounterpart} sin salir de la aplicación.`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openChat}
                className="w-full mt-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                {chatClosed ? 'Ver conversación' : 'Abrir chat'}
              </button>
            </section>
          )}

          <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800">Historial del trabajo</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Cambios de estado registrados para esta solicitud.</p>
              </div>
              <button
                type="button"
                onClick={() => void loadHistory(selectedRequest)}
                className="p-2 rounded-full bg-slate-50 text-slate-500"
                aria-label="Actualizar historial"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {historyError ? (
              <div className="mt-3 text-[10px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-2.5">{historyError}</div>
            ) : historyLoading ? (
              <div className="py-6 text-center text-[10px] text-slate-400">Cargando historial...</div>
            ) : (
              <div className="mt-4">
                {historyEntries.map((entry, index) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full border-2 ${index === historyEntries.length - 1 ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`} />
                      {index < historyEntries.length - 1 && <div className="w-px flex-1 min-h-10 bg-slate-200" />}
                    </div>
                    <div className="pb-4 min-w-0">
                      <p className="text-[11px] font-bold text-slate-700">{REQUEST_STATUS_LABELS[entry.estado]}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{historyActorLabel(entry)} · {formatDateTime(entry.fecha)}</p>
                    </div>
                  </div>
                ))}
                {historyEntries.length === 0 && (
                  <p className="text-[10px] text-slate-400 text-center py-4">No hay cambios de estado registrados.</p>
                )}
              </div>
            )}

            {hasReconstructedHistory && (
              <div className="mt-1 text-[9px] text-slate-400 bg-slate-50 rounded-xl p-2.5">
                Esta solicitud fue creada antes del historial detallado. Se muestran las fechas disponibles del registro anterior.
              </div>
            )}
          </section>

          {currentUser.tipo_usuario === 'proveedor' && selectedRequest.estado === 'aceptada' && quote && quote.estado !== 'aceptada' && (
            <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
              {quote.estado === 'enviada'
                ? 'No puedes iniciar el trabajo hasta que el cliente responda la cotización.'
                : 'La cotización fue rechazada. Envía una nueva propuesta o cancela la solicitud.'}
            </div>
          )}

          {actions.length > 0 && (
            <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 mb-3">Acciones disponibles</h3>
              <div className="grid grid-cols-2 gap-2">
                {actions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    disabled={updatingId === selectedRequest.id}
                    onClick={() => void changeStatus(selectedRequest, action)}
                    className={`py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 ${
                      action === 'aceptada' || action === 'en_proceso' || action === 'completada'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {updatingId === selectedRequest.id ? 'Guardando...' : REQUEST_STATUS_LABELS[action]}
                  </button>
                ))}
              </div>
            </section>
          )}

          {currentUser.tipo_usuario === 'cliente' && selectedRequest.estado === 'completada' && (
            <section className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              {alreadyReviewed ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Reseña enviada</p>
                    <p className="text-[10px] text-emerald-600">Gracias por compartir tu experiencia.</p>
                  </div>
                </div>
              ) : isReviewOpen ? (
                <div>
                  <div className="mb-3">
                    <p className="text-xs font-bold text-slate-700">Calificar a {providerLabel}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">La reseña es opcional. Puedes enviarla ahora o dejarla para después.</p>
                  </div>

                  <div className="flex gap-1.5 mb-3" aria-label="Calificación">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setReviewRating(value)}
                        aria-label={`${value} estrellas`}
                        className="p-0.5"
                      >
                        <Star className={`w-6 h-6 ${value <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    maxLength={1000}
                    placeholder="Cuéntanos cómo fue el servicio (mín. 10 caracteres)"
                    className="w-full text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-200 h-20 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="text-right text-[9px] text-slate-400 mt-1">{reviewComment.length}/1000</div>

                  {reviewError && (
                    <p className="mt-2 text-[10px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-2">{reviewError}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      type="button"
                      disabled={reviewSubmitting}
                      onClick={closeReview}
                      className="py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold disabled:opacity-50"
                    >
                      Ahora no
                    </button>
                    <button
                      type="button"
                      disabled={reviewSubmitting}
                      onClick={() => void submitReview(selectedRequest)}
                      className="py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:bg-slate-300"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {reviewSubmitting ? 'Enviando...' : 'Enviar reseña'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => openReview(selectedRequest.id)}
                    className="w-full py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Star className="w-4 h-4" /> Calificar servicio
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1.5">Opcional · puedes hacerlo más adelante.</p>
                </div>
              )}
            </section>
          )}
        </main>

        {clientReportOpen && currentUser.tipo_usuario === 'proveedor' && (
          <div className="absolute inset-0 z-50 bg-slate-950/45 flex items-end sm:items-center justify-center p-2">
            <div className="w-full max-w-md bg-white rounded-3xl p-4 shadow-2xl border border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Flag className="w-4 h-4 text-rose-600" /> Reportar cliente</h3>
                  <p className="text-[11px] text-slate-400 mt-1">{selectedRequest.cliente_nombre} · Solicitud #{selectedRequest.id.slice(-8)}</p>
                </div>
                <button type="button" onClick={() => setClientReportOpen(false)} disabled={clientReportSubmitting} className="p-1.5 rounded-full bg-slate-100 text-slate-500"><XCircle className="w-4 h-4" /></button>
              </div>

              <label className="block mt-4 text-[10px] font-bold text-slate-600">Motivo
                <select value={clientReportReason} onChange={(event) => setClientReportReason(event.target.value as MotivoReporte)} className="mt-1 w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <option value="conducta_inadecuada">Conducta inadecuada</option>
                  <option value="informacion_falsa">Información falsa o engañosa</option>
                  <option value="contenido_inapropiado">Contenido inapropiado</option>
                  <option value="spam">Spam</option>
                  <option value="otro">Otro</option>
                </select>
              </label>

              <label className="block mt-3 text-[10px] font-bold text-slate-600">Detalle
                <textarea value={clientReportDescription} onChange={(event) => setClientReportDescription(event.target.value)} minLength={3} maxLength={600} placeholder="Explica brevemente qué ocurrió..." className="mt-1 w-full h-24 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs resize-none" />
              </label>

              {clientReportError && <p className="mt-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-100 p-2 rounded-xl">{clientReportError}</p>}
              <button type="button" disabled={clientReportSubmitting} onClick={() => void submitClientReport(selectedRequest)} className="w-full mt-3 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold disabled:bg-slate-300">
                {clientReportSubmitting ? 'Enviando...' : 'Enviar reporte'}
              </button>
              <p className="text-[9px] text-slate-400 text-center mt-2">El reporte será visible solo para administración.</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentEmptyMessage = emptyMessage(view, currentUser.tipo_usuario);
  const views: Array<{ id: SolicitudesVista; label: string; count: number; icon: typeof Clock3 }> = [
    { id: 'activas', label: 'Activas', count: counts.activas, icon: Clock3 },
    { id: 'completadas', label: 'Completadas', count: counts.completadas, icon: CheckCircle2 },
    { id: 'cerradas', label: 'Cerradas', count: counts.cerradas, icon: XCircle },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <header className="h-14 bg-emerald-600 flex items-center justify-between px-4 text-white shadow-md shrink-0">
        <div>
          <h2 className="font-bold text-sm">Solicitudes de servicio</h2>
          <p className="text-[10px] text-white/80">
            {currentUser.tipo_usuario === 'cliente' ? 'Trabajos que has solicitado' : currentUser.tipo_usuario === 'proveedor' ? 'Trabajos recibidos' : 'Vista general'}
          </p>
        </div>
        <button onClick={() => void loadRequests()} aria-label="Actualizar solicitudes" className="p-2 rounded-full bg-white/10">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur px-4 pt-3 pb-2 border-b border-slate-100">
          <div className="grid grid-cols-3 gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
            {views.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => changeView(item.id)}
                  className={`min-w-0 rounded-xl px-1.5 py-2 flex flex-col items-center justify-center gap-1 transition-colors ${
                    active ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className={`min-w-4 h-4 px-1 rounded-full text-[9px] leading-4 text-center font-bold ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {item.count}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold truncate max-w-full">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 px-1">
            <History className="w-3.5 h-3.5" />
            <span>
              {view === 'activas'
                ? 'Solicitadas, aceptadas y en proceso.'
                : view === 'completadas'
                  ? 'Historial de trabajos terminados.'
                  : 'Solicitudes canceladas o rechazadas.'}
            </span>
          </div>
        </div>

        <div className="px-4 pt-3">
          {error && (
            <div className="mb-3 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void loadRequests()}
                className="mt-2 px-3 py-1.5 rounded-lg bg-white border border-rose-200 font-bold"
              >
                Reintentar
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400">Cargando solicitudes...</div>
          ) : error && requests.length === 0 ? null : visibleRequests.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-7 text-center mt-1">
              {view === 'activas' ? (
                <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              ) : view === 'completadas' ? (
                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              ) : (
                <XCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              )}
              <p className="text-sm font-bold text-slate-700">{currentEmptyMessage.title}</p>
              <p className="text-xs text-slate-400 mt-1">{currentEmptyMessage.description}</p>
              {view === 'activas' && currentUser.tipo_usuario === 'cliente' && requests.length === 0 && (
                <p className="text-[10px] text-slate-400 mt-3">Abre el perfil de un proveedor y selecciona “Solicitar este servicio”.</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {visibleRequests.map((request) => {
                const actions = nextActions(request, currentUser.tipo_usuario).filter(
                  (action) => !(request.estado === 'aceptada' && action === 'en_proceso'),
                );
                const alreadyReviewed = reviewedRequestIds.has(request.id);
                const provider = providersById[request.proveedor_id];
                const providerLabel = provider?.nombre_publico || provider?.oficio || request.proveedor_oficio;

                return (
                  <article
                    key={request.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetail(request)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') openDetail(request);
                    }}
                    className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.995] transition-transform"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-800 truncate">
                          {currentUser.tipo_usuario === 'proveedor' ? request.cliente_nombre : providerLabel}
                        </h3>
                        {currentUser.tipo_usuario !== 'proveedor' && provider && (
                          <p className="text-[11px] text-slate-500 truncate">{request.proveedor_oficio}</p>
                        )}
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <CalendarDays className="w-3 h-3" /> {formatDate(request.createdAt)}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${REQUEST_STATUS_CLASSES[request.estado]}`}>
                        {REQUEST_STATUS_LABELS[request.estado]}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-3 leading-relaxed line-clamp-2">{request.descripcion}</p>
                    <div className="mt-3 flex flex-col gap-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emerald-600" /> {request.ubicacion}</span>
                      <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 text-emerald-600" /> Preferencia: {formatPreferredAppointment(request)}</span>
                      {currentUser.tipo_usuario === 'proveedor' && (
                        <a
                          href={`tel:${normalizePhone(request.telefono_contacto)}`}
                          onClick={(event) => event.stopPropagation()}
                          className="flex items-center gap-1 text-emerald-700 font-semibold"
                        >
                          <Phone className="w-3.5 h-3.5" /> {request.telefono_contacto}
                        </a>
                      )}
                    </div>

                    {actions.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-4" onClick={(event) => event.stopPropagation()}>
                        {actions.map((action) => (
                          <button
                            key={action}
                            type="button"
                            disabled={updatingId === request.id}
                            onClick={() => void changeStatus(request, action)}
                            className={`py-2 rounded-xl text-xs font-bold disabled:opacity-50 ${
                              action === 'aceptada' || action === 'en_proceso' || action === 'completada'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {updatingId === request.id ? 'Guardando...' : REQUEST_STATUS_LABELS[action]}
                          </button>
                        ))}
                      </div>
                    )}

                    {currentUser.tipo_usuario === 'cliente' && request.estado === 'completada' && (
                      <div className={`mt-3 rounded-xl px-3 py-2 text-[10px] font-semibold ${alreadyReviewed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {alreadyReviewed ? '✓ Reseña enviada' : '★ Reseña pendiente (opcional)'}
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-1 text-[10px] font-bold text-emerald-700">
                      Ver detalle <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
