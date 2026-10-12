import { shareProviderProfile } from '../shareProviderProfile';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Clock,
  ChevronLeft,
  Flag,
  Folder,
  Heart,
  Info,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Search,
  Share2,
  Sparkles,
  Star,
  Wrench,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  PROVIDER_AVAILABILITY_CLASSES,
  PROVIDER_AVAILABILITY_LABELS,
  PROVIDER_AVAILABILITY_OPTIONS,
  PROVIDER_CATEGORIES,
  JS_DAY_TO_SCHEDULE_DAY,
  WEEKLY_SCHEDULE_DAYS,
  summarizeWeeklySchedule,
  normalizePhone,
  normalizeSearch,
} from '../constants';
import { getFriendlyFirebaseError } from '../firebase';
import { formatDate, SVDatabaseService } from '../state/databaseService';
import { getLocalProfilePhoto, subscribeLocalProfilePhoto } from '../state/localProfilePhoto';
import {
  SUPPORTED_COUNTRIES,
  getChileCommunesForRegion,
  getCountryConfig,
  getRegionConfig,
  normalizeLocationKey,
  type SupportedCountryCode,
} from '../data/countries';
import type { CategoriaProveedor, DisponibilidadProveedor, MotivoReporte, Proveedor, Resena, SolicitudServicio, TipoReporte, Usuario } from '../types';

interface TabInicioProps {
  currentUser: Usuario | null;
  onRefreshTrigger: number;
  onProviderDetailChange?: (open: boolean) => void;
}

function getProviderCategoryIds(provider: Proveedor): CategoriaProveedor[] {
  return provider.categorias?.length ? provider.categorias : [provider.categoria_id];
}

function getProviderCategoryText(provider: Proveedor): string {
  return getProviderCategoryIds(provider)
    .map((categoryId) => PROVIDER_CATEGORIES.find((item) => item.id === categoryId)?.label || '')
    .join(' ');
}


function localTodayInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatPreferredDate(dateValue: string): string {
  if (!dateValue) return '';
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: '2-digit', month: 'short' }).format(date);
}

function scheduleForDate(provider: Proveedor, dateValue: string) {
  if (!provider.agenda_semanal || !dateValue) return null;
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const dayId = JS_DAY_TO_SCHEDULE_DAY[date.getDay()];
  return { dayId, slot: provider.agenda_semanal[dayId] };
}

export function TabInicio({ currentUser, onRefreshTrigger, onProviderDetailChange }: TabInicioProps) {
  const [providers, setProviders] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteBusyId, setFavoriteBusyId] = useState('');
  const [favoriteError, setFavoriteError] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<CategoriaProveedor | 'todos'>('todos');
  const [availabilityFilter, setAvailabilityFilter] = useState<DisponibilidadProveedor | 'todos'>('todos');
  const [searchTrade, setSearchTrade] = useState('');
  const [searchCountryCode, setSearchCountryCode] = useState<SupportedCountryCode | ''>(currentUser?.pais_codigo || '');
  const [searchRegionCode, setSearchRegionCode] = useState(currentUser?.region_codigo || '');
  const [searchLocality, setSearchLocality] = useState(currentUser?.localidad_nombre || '');

  const [selectedProvider, setSelectedProvider] = useState<Proveedor | null>(null);
  const [publicShareMessage, setPublicShareMessage] = useState('');
  const [providerReviews, setProviderReviews] = useState<Resena[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [requestDescription, setRequestDescription] = useState('');
  const [requestLocation, setRequestLocation] = useState('');
  const [requestPhone, setRequestPhone] = useState(currentUser?.telefono || '');
  const [requestPreferredDate, setRequestPreferredDate] = useState('');
  const [requestPreferredTime, setRequestPreferredTime] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestError, setRequestError] = useState('');
  const [activeProviderRequest, setActiveProviderRequest] = useState<SolicitudServicio | null>(null);
  const [activeRequestLoading, setActiveRequestLoading] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ tipo: TipoReporte; proveedorId: string; resenaId?: string; clienteId?: string; label: string } | null>(null);
  const [reportReason, setReportReason] = useState<MotivoReporte>('conducta_inadecuada');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [reportError, setReportError] = useState('');
  const [localPhotoVersion, setLocalPhotoVersion] = useState(0);

  useEffect(() => subscribeLocalProfilePhoto(() => setLocalPhotoVersion((version) => version + 1)), []);

  useEffect(() => {
    setSearchCountryCode(currentUser?.pais_codigo || '');
    setSearchRegionCode(currentUser?.region_codigo || '');
    setSearchLocality(currentUser?.localidad_nombre || '');
  }, [currentUser?.id]);

  const providerPhoto = (provider: Proveedor): string => getLocalProfilePhoto(provider.id) || provider.foto_perfil;

  const loadProviders = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setProviders(await SVDatabaseService.getProveedores());
    } catch (error) {
      setLoadError(getFriendlyFirebaseError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProviders();
  }, [onRefreshTrigger]);

  useEffect(() => {
    let active = true;
    setFavoriteError('');
    setShowFavoritesOnly(false);

    if (!currentUser || currentUser.tipo_usuario !== 'cliente') {
      setFavoriteIds(new Set());
      return () => {
        active = false;
      };
    }

    void SVDatabaseService.getFavoritos(currentUser.id)
      .then((ids) => {
        if (active) setFavoriteIds(new Set(ids));
      })
      .catch((error) => {
        if (active) setFavoriteError(getFriendlyFirebaseError(error));
      });

    return () => {
      active = false;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.tipo_usuario !== 'cliente' || !selectedProvider) {
      setActiveProviderRequest(null);
      setActiveRequestLoading(false);
      return () => undefined;
    }

    setActiveRequestLoading(true);
    const unsubscribe = SVDatabaseService.subscribeSolicitudesCliente(
      currentUser.id,
      (requests) => {
        const activeRequest = requests.find(
          (request) =>
            request.proveedor_id === selectedProvider.id &&
            ['solicitada', 'aceptada', 'en_proceso'].includes(request.estado),
        );
        setActiveProviderRequest(activeRequest || null);
        setActiveRequestLoading(false);
        if (activeRequest) setRequestFormOpen(false);
      },
      (error) => {
        setRequestError(getFriendlyFirebaseError(error));
        setActiveRequestLoading(false);
      },
    );

    return unsubscribe;
  }, [currentUser, selectedProvider?.id]);

  const handleToggleFavorite = async (providerId: string) => {
    if (!currentUser || currentUser.tipo_usuario !== 'cliente' || favoriteBusyId) return;
    const wasFavorite = favoriteIds.has(providerId);
    setFavoriteBusyId(providerId);
    setFavoriteError('');

    setFavoriteIds((current) => {
      const next = new Set(current);
      if (wasFavorite) next.delete(providerId);
      else next.add(providerId);
      return next;
    });

    try {
      if (wasFavorite) await SVDatabaseService.removeFavorito(currentUser.id, providerId);
      else await SVDatabaseService.addFavorito(currentUser.id, providerId);
    } catch (error) {
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (wasFavorite) next.add(providerId);
        else next.delete(providerId);
        return next;
      });
      setFavoriteError(getFriendlyFirebaseError(error));
    } finally {
      setFavoriteBusyId('');
    }
  };

  const loadProviderDetail = async (provider: Proveedor) => {
    setDetailLoading(true);
    try {
      setProviderReviews(await SVDatabaseService.getResenas(provider.id));
    } catch (error) {
      setLoadError(getFriendlyFirebaseError(error));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSelectProvider = async (provider: Proveedor) => {
    setSelectedProvider(provider);
    onProviderDetailChange?.(true);
    setProviderReviews([]);
    setRequestFormOpen(false);
    setRequestDescription('');
    setRequestLocation(currentUser?.localidad_nombre || currentUser?.region_nombre || '');
    setRequestPhone(currentUser?.telefono || '');
    setRequestPreferredDate('');
    setRequestPreferredTime('');
    setRequestMessage('');
    setRequestError('');
    setActiveProviderRequest(null);
    setActiveRequestLoading(currentUser?.tipo_usuario === 'cliente');
    setReportMessage('');
    setReportError('');
    setReportTarget(null);
    await loadProviderDetail(provider);
  };


  useEffect(() => {
    const providerId = new URLSearchParams(window.location.search).get('provider');
    if (!providerId || providers.length === 0 || selectedProvider?.id === providerId) return;
    const provider = providers.find((item) => item.id === providerId && item.activo !== false);
    if (provider) void handleSelectProvider(provider);
  }, [providers]);

  const handleCreateRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || currentUser.tipo_usuario !== 'cliente' || !selectedProvider) return;
    if (activeProviderRequest) {
      setRequestError('Ya tienes una solicitud activa con este proveedor. Cuando finalice podrás solicitar otro servicio.');
      setRequestFormOpen(false);
      return;
    }
    if (requestDescription.trim().length < 15) {
      setRequestError('Describe el trabajo con al menos 15 caracteres.');
      return;
    }
    if (requestLocation.trim().length < 3) {
      setRequestError('Ingresa la comuna o ubicación del servicio.');
      return;
    }
    const contactPhone = normalizePhone(requestPhone);
    if (contactPhone.length < 8 || contactPhone.length > 15) {
      setRequestError('Ingresa un teléfono de contacto válido de 8 a 15 dígitos.');
      return;
    }

    if (Boolean(requestPreferredDate) !== Boolean(requestPreferredTime)) {
      setRequestError('Si propones una fecha, selecciona también una hora. Puedes dejar ambos campos vacíos para coordinar después.');
      return;
    }
    if (requestPreferredDate && requestPreferredTime) {
      if (requestPreferredDate < localTodayInputValue()) {
        setRequestError('La fecha propuesta no puede estar en el pasado.');
        return;
      }
      const schedule = scheduleForDate(selectedProvider, requestPreferredDate);
      if (schedule) {
        const dayLabel = WEEKLY_SCHEDULE_DAYS.find((day) => day.id === schedule.dayId)?.label || 'ese día';
        if (!schedule.slot.activo) {
          setRequestError(`Según su agenda, el proveedor no atiende el ${dayLabel.toLowerCase()}. Elige otro día o deja la fecha por coordinar.`);
          return;
        }
        if (requestPreferredTime < schedule.slot.desde || requestPreferredTime > schedule.slot.hasta) {
          setRequestError(`Para ${dayLabel}, el horario publicado es ${schedule.slot.desde}–${schedule.slot.hasta}.`);
          return;
        }
      }
    }

    setRequestSubmitting(true);
    setRequestError('');
    setRequestMessage('');
    try {
      const createdRequest = await SVDatabaseService.createSolicitud({
        cliente_id: currentUser.id,
        cliente_nombre: currentUser.nombre,
        proveedor_id: selectedProvider.id,
        proveedor_oficio: selectedProvider.oficio,
        descripcion: requestDescription,
        ubicacion: requestLocation,
        telefono_contacto: contactPhone,
        ...(requestPreferredDate && requestPreferredTime ? { fecha_preferida: requestPreferredDate, hora_preferida: requestPreferredTime } : {}),
      });
      setActiveProviderRequest(createdRequest);
      setRequestDescription('');
      setRequestLocation('');
      setRequestPhone(currentUser.telefono || '');
      setRequestPreferredDate('');
      setRequestPreferredTime('');
      setRequestFormOpen(false);
      setRequestMessage('Solicitud enviada. Puedes revisar su estado en la pestaña Solicitudes.');
    } catch (error) {
      setRequestError(getFriendlyFirebaseError(error));
    } finally {
      setRequestSubmitting(false);
    }
  };

  const openReport = (tipo: TipoReporte, proveedorId: string, label: string, resenaId?: string, clienteId?: string) => {
    if (!currentUser || currentUser.tipo_usuario === 'admin') return;
    setReportTarget({ tipo, proveedorId, resenaId, clienteId, label });
    setReportReason('conducta_inadecuada');
    setReportDescription('');
    setReportError('');
  };

  const handleSubmitReport = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !reportTarget) return;
    if (reportDescription.trim().length < 3) {
      setReportError('Describe brevemente el motivo del reporte.');
      return;
    }

    setReportSubmitting(true);
    setReportError('');
    try {
      await SVDatabaseService.crearReporte({
        reportante_id: currentUser.id,
        reportante_nombre: currentUser.nombre,
        tipo: reportTarget.tipo,
        proveedor_id: reportTarget.proveedorId,
        ...(reportTarget.tipo === 'resena' ? { resena_id: reportTarget.resenaId, cliente_id: reportTarget.clienteId } : {}),
        motivo: reportReason,
        descripcion: reportDescription,
      });
      setReportMessage('Reporte enviado. La administración podrá revisarlo.');
      setReportTarget(null);
      setReportDescription('');
    } catch (error) {
      setReportError(getFriendlyFirebaseError(error));
    } finally {
      setReportSubmitting(false);
    }
  };

  const searchCountry = searchCountryCode ? getCountryConfig(searchCountryCode) : null;
  const searchRegion = searchCountryCode && searchRegionCode ? getRegionConfig(searchCountryCode, searchRegionCode) : undefined;
  const searchLocalitySuggestions = useMemo(() => {
    if (searchCountryCode !== 'CL' || !searchRegion) return [];
    return getChileCommunesForRegion(searchRegion.name);
  }, [searchCountryCode, searchRegion?.name]);

  const filteredProviders = useMemo(() => {
    const tradeTerm = normalizeSearch(searchTrade);
    const localityTerm = normalizeLocationKey(searchLocality);
    const regionNameTerm = normalizeLocationKey(searchRegion?.name || '');
    return providers.filter((provider) => {
      if (provider.activo === false) return false;
      const providerText = normalizeSearch(`${provider.oficio} ${provider.descripcion} ${getProviderCategoryText(provider)}`);
      const legacyLocation = normalizeLocationKey(provider.ubicacion || '');
      const providerCountry = provider.pais_codigo || (legacyLocation.includes('chile') ? 'CL' : 'CL');
      const providerRegionCode = provider.region_codigo || '';
      const providerRegionName = normalizeLocationKey(provider.region_nombre || '');
      const providerLocality = normalizeLocationKey(provider.localidad_nombre || provider.ubicacion.split(',')[0] || '');
      const matchesCategory = selectedCategory === 'todos' || getProviderCategoryIds(provider).includes(selectedCategory);
      const matchesTrade = !tradeTerm || providerText.includes(tradeTerm);
      const matchesCountry = !searchCountryCode || providerCountry === searchCountryCode;
      const matchesRegion = !searchRegionCode || providerRegionCode === searchRegionCode || Boolean(regionNameTerm && (providerRegionName.includes(regionNameTerm) || legacyLocation.includes(regionNameTerm)));
      const matchesLocality = !localityTerm || providerLocality.includes(localityTerm) || legacyLocation.includes(localityTerm);
      const matchesFavorite = !showFavoritesOnly || favoriteIds.has(provider.id);
      const matchesAvailability = availabilityFilter === 'todos' || provider.disponibilidad === availabilityFilter;
      return matchesCategory && matchesTrade && matchesCountry && matchesRegion && matchesLocality && matchesFavorite && matchesAvailability;
    });
  }, [providers, searchTrade, searchCountryCode, searchRegionCode, searchLocality, searchRegion?.name, selectedCategory, availabilityFilter, showFavoritesOnly, favoriteIds]);


  const displayedRating = useMemo(() => {
    if (!selectedProvider) return 0;
    if (!providerReviews.length) return selectedProvider.calificacion_promedio;
    return Number(
      (
        providerReviews.reduce((sum, review) => sum + review.calificacion, 0) /
        providerReviews.length
      ).toFixed(1),
    );
  }, [providerReviews, selectedProvider]);

  const renderRating = (provider: Proveedor) =>
    provider.cantidad_resenas > 0 ? (
      <span className="flex items-center gap-1 text-amber-500 font-semibold">
        <Star className="w-3.5 h-3.5 fill-amber-500" />
        {provider.calificacion_promedio.toFixed(1)} ({provider.cantidad_resenas})
      </span>
    ) : (
      <span className="text-slate-400">Sin reseñas</span>
    );

  return (
    <div className={`sv-search-screen flex flex-col h-full min-h-0 bg-slate-50 relative ${selectedProvider ? '' : 'pb-[70px]'}`}>
      <AnimatePresence mode="wait">
        {!selectedProvider ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 min-h-0 flex flex-col overflow-y-auto px-3 pt-16 pb-5 scrollbar-thin"
          >
            <div className="absolute top-0 left-0 right-0 h-14 bg-emerald-600 flex items-center px-4 justify-between shadow-md z-50">
              <span className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-5 h-5" /> Buscar Servicios
              </span>
              <span className="text-white/80 font-mono text-xs font-semibold bg-emerald-700 px-2 py-0.5 rounded">
                Vecinal
              </span>
            </div>

            <div className="sv-search-filters bg-white rounded-2xl p-2 shadow-sm border border-slate-100 flex flex-col gap-1 mt-1">
              <div className="relative">
                <Search className="absolute left-3 top-2 w-4 h-4 text-slate-400" />
                <input
                  type="search"
                  placeholder="Ej. cerrajero, pintor..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  value={searchTrade}
                  onChange={(event) => setSearchTrade(event.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={searchCountryCode}
                  onChange={(event) => {
                    setSearchCountryCode(event.target.value as SupportedCountryCode | '');
                    setSearchRegionCode('');
                    setSearchLocality('');
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Todos los países</option>
                  {SUPPORTED_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.name}</option>)}
                </select>
                <select
                  value={searchRegionCode}
                  disabled={!searchCountryCode}
                  onChange={(event) => { setSearchRegionCode(event.target.value); setSearchLocality(''); }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:text-slate-300"
                >
                  <option value="">{searchCountry ? `Toda ${searchCountry.regionLabel.toLowerCase()}` : 'Región / estado'}</option>
                  {searchCountry?.regions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                </select>
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-2 w-4 h-4 text-slate-400" />
                <input
                  type="search"
                  list={searchCountryCode === 'CL' && searchRegionCode ? 'sv-search-chile-localities' : undefined}
                  value={searchLocality}
                  onChange={(event) => setSearchLocality(event.target.value)}
                  disabled={!searchCountryCode}
                  placeholder={searchCountry ? `${searchCountry.localityLabel} (opcional)` : 'Primero selecciona un país'}
                  maxLength={100}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:text-slate-300"
                />
                {searchCountryCode === 'CL' && searchRegionCode && (
                  <datalist id="sv-search-chile-localities">{searchLocalitySuggestions.map((item) => <option key={item} value={item} />)}</datalist>
                )}
              </div>
              {currentUser?.pais_codigo && (
                <div className="sv-location-shortcuts flex flex-nowrap gap-1 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchCountryCode(currentUser.pais_codigo || '');
                      setSearchRegionCode(currentUser.region_codigo || '');
                      setSearchLocality(currentUser.localidad_nombre || '');
                    }}
                    className="shrink-0 whitespace-nowrap px-2 py-1 rounded-full bg-emerald-600 text-white text-[9px] font-bold"
                  >
                    Mi {getCountryConfig(currentUser.pais_codigo).localityLabel.toLowerCase()}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchCountryCode(currentUser.pais_codigo || '');
                      setSearchRegionCode(currentUser.region_codigo || '');
                      setSearchLocality('');
                    }}
                    className="shrink-0 whitespace-nowrap px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-[9px] font-bold"
                  >
                    Toda mi {getCountryConfig(currentUser.pais_codigo).regionLabel.toLowerCase()}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchCountryCode(currentUser.pais_codigo || '');
                      setSearchRegionCode('');
                      setSearchLocality('');
                    }}
                    className="shrink-0 whitespace-nowrap px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-[9px] font-bold"
                  >
                    Todo {getCountryConfig(currentUser.pais_codigo).name}
                  </button>
                </div>
              )}
              <div className="relative">
                <Clock className="absolute left-3 top-2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={availabilityFilter}
                  onChange={(event) => setAvailabilityFilter(event.target.value as DisponibilidadProveedor | 'todos')}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none appearance-none"
                >
                  <option value="todos">Cualquier disponibilidad</option>
                  {PROVIDER_AVAILABILITY_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </div>
            </div>

            <div className="my-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Categorías rápidas
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x select-none">
                {PROVIDER_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap cursor-pointer ${
                      selectedCategory === category.id
                        ? 'bg-emerald-600 text-white border-transparent shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{category.icon}</span>
                    <span>{category.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {currentUser?.tipo_usuario === 'cliente' && (
              <div className="mb-4 flex items-center gap-2">
                <button
                  onClick={() => setShowFavoritesOnly((value) => !value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    showFavoritesOnly
                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-rose-500 text-rose-500' : ''}`} />
                  Mis favoritos
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center justify-center">
                    {favoriteIds.size}
                  </span>
                </button>
                {showFavoritesOnly && (
                  <button
                    onClick={() => setShowFavoritesOnly(false)}
                    className="text-[11px] text-emerald-700 font-semibold"
                  >
                    Ver todos
                  </button>
                )}
              </div>
            )}

            {favoriteError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-[11px] text-rose-700">
                {favoriteError}
              </div>
            )}

            <div className="flex-1 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider">
                  Proveedores ({filteredProviders.length})
                </span>
                {(searchTrade || searchCountryCode || searchRegionCode || searchLocality || selectedCategory !== 'todos' || availabilityFilter !== 'todos') && (
                  <button
                    onClick={() => {
                      setSearchTrade('');
                      setSearchCountryCode('');
                      setSearchRegionCode('');
                      setSearchLocality('');
                      setSelectedCategory('todos');
                      setAvailabilityFilter('todos');
                    }}
                    className="text-emerald-600 font-semibold hover:underline"
                  >
                    Borrar filtros
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex flex-col justify-center items-center py-20 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mb-2" />
                  Cargando proveedores...
                </div>
              ) : loadError ? (
                <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-center">
                  <p className="text-xs text-rose-700">{loadError}</p>
                  <button onClick={() => void loadProviders()} className="mt-3 text-xs font-bold text-rose-700 underline">
                    Reintentar
                  </button>
                </div>
              ) : filteredProviders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 bg-white border border-dashed border-slate-200 rounded-3xl text-center">
                  <span className="text-3xl mb-2">🔍</span>
                  <p className="font-semibold text-slate-800 text-sm">{showFavoritesOnly ? 'Aún no tienes favoritos' : 'No hay resultados'}</p>
                  <p className="text-xs text-slate-400 mt-1">{showFavoritesOnly ? 'Marca el corazón de un proveedor para guardarlo aquí.' : 'Prueba con otro oficio, categoría o comuna.'}</p>
                </div>
              ) : (
                filteredProviders.map((provider) => (
                  <article key={provider.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
                    <div className="flex gap-3">
                      <img
                        key={`${provider.id}-${localPhotoVersion}`}
                        src={providerPhoto(provider)}
                        alt={provider.oficio}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-xl object-cover bg-slate-100 border border-slate-100"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{provider.nombre_publico || provider.oficio}</h4>
                          {provider.verificado && <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Proveedor verificado" />}
                        </div>
                        {provider.nombre_publico && <p className="text-[11px] text-slate-500 truncate">{provider.oficio}</p>}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {getProviderCategoryIds(provider).slice(0, 2).map((categoryId) => {
                            const category = PROVIDER_CATEGORIES.find((item) => item.id === categoryId);
                            return category ? <span key={categoryId} className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-semibold">{category.icon} {category.label}</span> : null;
                          })}
                          {getProviderCategoryIds(provider).length > 2 && <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-semibold">+{getProviderCategoryIds(provider).length - 2}</span>}
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="truncate">{provider.ubicacion}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {provider.disponibilidad ? (
                            <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${PROVIDER_AVAILABILITY_CLASSES[provider.disponibilidad]}`}>
                              {PROVIDER_AVAILABILITY_LABELS[provider.disponibilidad]}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-400 text-[10px] font-medium">Consultar disponibilidad</span>
                          )}
                          {(provider.horario_atencion || provider.agenda_semanal) && <span className="text-[10px] text-slate-400 truncate max-w-[145px]">{provider.horario_atencion || summarizeWeeklySchedule(provider.agenda_semanal)}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium text-slate-600">
                            {provider.experiencia} años exp.
                          </span>
                          {renderRating(provider)}
                        </div>
                      </div>
                      {currentUser?.tipo_usuario === 'cliente' && (
                        <button
                          type="button"
                          aria-label={favoriteIds.has(provider.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                          title={favoriteIds.has(provider.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                          disabled={favoriteBusyId === provider.id}
                          onClick={() => void handleToggleFavorite(provider.id)}
                          className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition-colors disabled:opacity-50 ${
                            favoriteIds.has(provider.id)
                              ? 'bg-rose-50 border-rose-200 text-rose-500'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${favoriteIds.has(provider.id) ? 'fill-rose-500' : ''}`} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{provider.descripcion}</p>
                    <div className="flex gap-2 pt-1">
                      {currentUser?.tipo_usuario === 'cliente' && (
                        <>
                          <a href={`tel:${normalizePhone(provider.whatsapp)}`} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-slate-50 text-xs font-semibold">
                            <Phone className="w-3.5 h-3.5" /> Llamar
                          </a>
                          <a
                            href={`https://wa.me/${normalizePhone(provider.whatsapp)}?text=${encodeURIComponent('Hola, vi tu perfil en Servicios Vecinales y me interesa tu servicio.')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        </>
                      )}
                      <button onClick={() => void handleSelectProvider(provider)} className="flex-1 bg-slate-900 text-white text-xs font-semibold py-1.5 rounded-lg">
                        Ver perfil
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-16 pb-5 scrollbar-thin bg-slate-50 isolate"
          >
            <div className="absolute top-0 left-0 right-0 h-14 bg-emerald-600 flex items-center px-4 justify-between shadow-md z-50">
              <button
                onClick={() => {
                  setSelectedProvider(null);
                  onProviderDetailChange?.(false);
                }}
                className="flex items-center gap-1 text-white font-semibold text-sm"
              >
                <ChevronLeft className="w-5 h-5" /> Volver
              </button>
              <span className="text-white font-bold text-sm">Detalle proveedor</span>
              {currentUser?.tipo_usuario === 'cliente' ? (
                <button
                  type="button"
                  aria-label={favoriteIds.has(selectedProvider.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  title={favoriteIds.has(selectedProvider.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  disabled={favoriteBusyId === selectedProvider.id}
                  onClick={() => void handleToggleFavorite(selectedProvider.id)}
                  className="w-10 h-10 flex items-center justify-center text-white disabled:opacity-50"
                >
                  <Heart className={`w-5 h-5 ${favoriteIds.has(selectedProvider.id) ? 'fill-white' : ''}`} />
                </button>
              ) : (
                <div className="w-10" />
              )}
            </div>

            <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center mt-2 gap-3 relative overflow-hidden shrink-0 min-h-[250px]">
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-emerald-600 to-teal-500" />
              <img key={`${selectedProvider.id}-${localPhotoVersion}`} src={providerPhoto(selectedProvider)} alt={selectedProvider.oficio} referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=faces'; }} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md z-10 mt-4 shrink-0 bg-slate-100" />
              <div className="z-10 mt-1">
                <div className="flex items-center justify-center gap-1">
                  <h2 className="text-base font-bold text-slate-900">{selectedProvider.nombre_publico || selectedProvider.oficio}</h2>
                  {selectedProvider.verificado && <BadgeCheck className="w-5 h-5 text-emerald-600" />}
                </div>
                {selectedProvider.nombre_publico && (
                  <p className="text-xs font-semibold text-emerald-700 mt-0.5">{selectedProvider.oficio}</p>
                )}
                <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                  {getProviderCategoryIds(selectedProvider).map((categoryId) => {
                    const category = PROVIDER_CATEGORIES.find((item) => item.id === categoryId);
                    return category ? <span key={categoryId} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-semibold border border-emerald-100">{category.icon} {category.label}</span> : null;
                  })}
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {selectedProvider.ubicacion}
                </div>
                <div className="flex flex-col items-center gap-1 mt-2">
                  {selectedProvider.disponibilidad ? (
                    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${PROVIDER_AVAILABILITY_CLASSES[selectedProvider.disponibilidad]}`}>
                      {PROVIDER_AVAILABILITY_LABELS[selectedProvider.disponibilidad]}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-bold">Consultar disponibilidad</span>
                  )}
                  <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1 text-center">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {selectedProvider.horario_atencion?.trim()
                      ? selectedProvider.horario_atencion
                      : selectedProvider.agenda_semanal
                        ? summarizeWeeklySchedule(selectedProvider.agenda_semanal)
                        : selectedProvider.disponibilidad === 'no_disponible'
                          ? 'Sin horario disponible'
                          : 'Horario por coordinar'}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold text-slate-700">{selectedProvider.experiencia} años exp.</span>
                  {providerReviews.length || selectedProvider.cantidad_resenas ? (
                    <span className="flex items-center gap-1 text-amber-500 font-bold text-sm"><Star className="w-4 h-4 fill-amber-500" /> {displayedRating.toFixed(1)}</span>
                  ) : (
                    <span className="text-xs text-slate-400">Sin reseñas</span>
                  )}
                </div>
              </div>
              {currentUser?.tipo_usuario === 'cliente' ? (
                <div className="w-full flex gap-3 pt-2">
                  <a href={`tel:${normalizePhone(selectedProvider.whatsapp)}`} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold"><Phone className="w-4 h-4" /> Llamar</a>
                  <a href={`https://wa.me/${normalizePhone(selectedProvider.whatsapp)}?text=${encodeURIComponent('Hola, vi tu perfil en Servicios Vecinales.')}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"><MessageCircle className="w-4 h-4" /> WhatsApp</a>
                </div>
              ) : !currentUser ? (
                <div className="w-full pt-2">
                  <p className="text-[10px] text-slate-400 text-center">Inicia sesión como cliente para contactar al proveedor.</p>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => { setPublicShareMessage(''); void shareProviderProfile(selectedProvider).then(setPublicShareMessage); }}
                className="w-full mt-2 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Compartir perfil
              </button>
              {publicShareMessage && <p role="status" className="text-[10px] text-slate-500 text-center">{publicShareMessage}</p>}

            </section>

            {selectedProvider.agenda_semanal && (
              <section className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 shrink-0">
                <div className="flex items-start gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-700">Horario semanal</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Horario habitual informado por el proveedor.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1.5 mt-3">
                  {WEEKLY_SCHEDULE_DAYS.map(({ id, label }) => {
                    const slot = selectedProvider.agenda_semanal![id];
                    return (
                      <div key={id} className="flex items-center justify-between gap-3 text-[11px] py-1.5 border-b border-slate-100 last:border-0">
                        <span className="font-semibold text-slate-600">{label}</span>
                        <span className={slot.activo ? 'font-bold text-emerald-700' : 'text-slate-400'}>
                          {slot.activo ? `${slot.desde} – ${slot.hasta}` : 'No atiende'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {currentUser?.tipo_usuario === 'cliente' && (
              <section className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 shrink-0">
                {selectedProvider.disponibilidad === 'no_disponible' && (
                  <div className="mb-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
                    <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Este proveedor figura como no disponible actualmente. Puedes enviar una solicitud para coordinar una fecha futura.</span>
                  </div>
                )}
                {activeProviderRequest && (
                  <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                    <p className="text-[11px] font-bold">Ya tienes un servicio activo con este proveedor</p>
                    <p className="text-[10px] mt-1">
                      {activeProviderRequest.estado === 'solicitada'
                        ? 'Tu solicitud está pendiente de respuesta.'
                        : activeProviderRequest.estado === 'aceptada'
                          ? 'El proveedor ya aceptó tu solicitud.'
                          : 'El trabajo se encuentra en proceso.'}
                      {' '}Cuando el trabajo sea completado, cancelado o rechazado podrás solicitar uno nuevo.
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  disabled={activeRequestLoading || Boolean(activeProviderRequest)}
                  onClick={() => setRequestFormOpen((open) => !open)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${activeProviderRequest || activeRequestLoading ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-900 text-white'}`}
                >
                  <Wrench className="w-4 h-4" />
                  {activeRequestLoading
                    ? 'Revisando solicitudes...'
                    : activeProviderRequest
                      ? activeProviderRequest.estado === 'solicitada'
                        ? 'Solicitud pendiente'
                        : activeProviderRequest.estado === 'aceptada'
                          ? 'Servicio aceptado'
                          : 'Trabajo en proceso'
                      : requestFormOpen
                        ? 'Cerrar solicitud'
                        : 'Solicitar este servicio'}
                </button>
                {requestMessage && <p className="mt-3 text-[11px] bg-emerald-50 text-emerald-700 p-2 rounded-lg">{requestMessage}</p>}
                {requestFormOpen && !activeProviderRequest && (
                  <form onSubmit={handleCreateRequest} className="mt-3 flex flex-col gap-2.5">
                    <textarea value={requestDescription} onChange={(event) => setRequestDescription(event.target.value)} maxLength={1000} required placeholder="Describe el trabajo, problema o reparación que necesitas..." className="w-full h-24 text-xs p-2.5 border border-slate-200 bg-slate-50 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    <div>
                      <label className="text-[10px] font-bold text-slate-600">Ubicación del servicio</label>
                      <input
                        value={requestLocation}
                        onChange={(event) => setRequestLocation(event.target.value)}
                        maxLength={120}
                        required
                        placeholder={currentUser?.localidad_nombre ? `${currentUser.localidad_nombre} o dirección aproximada` : 'Ciudad, municipio o ubicación del servicio'}
                        className="mt-1 w-full px-3 text-xs py-2.5 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <div className="flex items-start gap-2 mb-2">
                        <CalendarDays className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold text-slate-600">Fecha y hora preferidas <span className="font-normal text-slate-400">(opcional)</span></p>
                          <p className="text-[9px] text-slate-400">Es una propuesta para el proveedor. Si no eliges fecha, podrán coordinar por chat.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          min={localTodayInputValue()}
                          value={requestPreferredDate}
                          onChange={(event) => setRequestPreferredDate(event.target.value)}
                          className="min-w-0 w-full text-[10px] p-2 border border-slate-200 bg-white rounded-lg"
                          aria-label="Fecha preferida"
                        />
                        <input
                          type="time"
                          value={requestPreferredTime}
                          onChange={(event) => setRequestPreferredTime(event.target.value)}
                          className="min-w-0 w-full text-[10px] p-2 border border-slate-200 bg-white rounded-lg"
                          aria-label="Hora preferida"
                        />
                      </div>
                      {requestPreferredDate && (() => {
                        const schedule = scheduleForDate(selectedProvider, requestPreferredDate);
                        if (!schedule) return <p className="text-[9px] text-slate-400 mt-2">El proveedor aún no tiene agenda semanal configurada para validar esta fecha.</p>;
                        const dayLabel = WEEKLY_SCHEDULE_DAYS.find((day) => day.id === schedule.dayId)?.label || formatPreferredDate(requestPreferredDate);
                        return <p className={`text-[9px] mt-2 ${schedule.slot.activo ? 'text-emerald-700' : 'text-amber-700'}`}>{dayLabel}: {schedule.slot.activo ? `${schedule.slot.desde}–${schedule.slot.hasta}` : 'sin atención habitual'}</p>;
                      })()}
                    </div>
                    <input value={requestPhone} onChange={(event) => setRequestPhone(event.target.value)} inputMode="tel" maxLength={20} required placeholder="Teléfono de contacto" className="w-full text-xs p-2.5 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    {requestError && <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 p-2 rounded-lg">{requestError}</p>}
                    <button disabled={requestSubmitting} className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:bg-slate-300">{requestSubmitting ? 'Enviando...' : 'Enviar solicitud'}</button>
                  </form>
                )}
              </section>
            )}

            {currentUser?.tipo_usuario === 'cliente' && (
              <section className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 shrink-0">
                {reportMessage && <p className="mb-3 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 p-2.5 rounded-xl">{reportMessage}</p>}
                <button
                  type="button"
                  onClick={() => openReport('proveedor', selectedProvider.id, selectedProvider.nombre_publico || selectedProvider.oficio)}
                  className="w-full py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-semibold flex items-center justify-center gap-1.5"
                >
                  <Flag className="w-3.5 h-3.5" /> Reportar proveedor
                </button>
                <p className="text-[9px] text-slate-400 text-center mt-1.5">Usa esta opción solo para contenido, información o conductas que deban ser revisadas.</p>
              </section>
            )}

            <section className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 shrink-0">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1"><Briefcase className="w-4 h-4" /> Acerca de sus servicios</h3>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{selectedProvider.descripcion}</p>
            </section>

            <section className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 shrink-0">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1"><Folder className="w-4 h-4" /> Trabajos realizados</h3>
              {selectedProvider.fotos_trabajos.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {selectedProvider.fotos_trabajos.map((photo, index) => <img key={`${photo}-${index}`} src={photo} alt={`Trabajo ${index + 1}`} className="rounded-xl h-24 w-full object-cover border border-slate-100" />)}
                </div>
              ) : <p className="text-xs text-slate-400 py-3 text-center italic bg-slate-50 rounded-xl">Aún no hay fotos de trabajos.</p>}
            </section>

            <section className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 shrink-0">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1"><MessageSquare className="w-4 h-4" /> Reseñas ({providerReviews.length})</h3>

              {currentUser?.tipo_usuario === 'cliente' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <Info className="w-4 h-4 text-slate-500 shrink-0" />
                  <p className="text-[11px] text-slate-500">
                    Las reseñas son opcionales. Cuando un trabajo esté completado podrás calificarlo directamente desde la pestaña Solicitudes, sin volver a buscar al proveedor.
                  </p>
                </div>
              )}

              {detailLoading ? (
                <p className="text-xs text-slate-400 text-center py-4">Cargando reseñas...</p>
              ) : providerReviews.length ? (
                <div className="flex flex-col gap-3">
                  {providerReviews.map((review) => (
                    <article key={review.id} className="border-b border-slate-100 pb-3 last:border-0">
                      <div className="flex justify-between items-center"><span className="font-bold text-slate-800 text-xs">{review.cliente_nombre}</span><span className="flex">{[1, 2, 3, 4, 5].map((value) => <Star key={value} className={`w-3 h-3 ${value <= review.calificacion ? 'fill-amber-500 text-amber-500' : 'text-slate-200'}`} />)}</span></div>
                      {review.comentario && <p className="text-xs text-slate-500 mt-1">“{review.comentario}”</p>}
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400">Servicio verificado · {formatDate(review.fecha)}</span>
                        {currentUser?.tipo_usuario === 'cliente' && (
                          <button type="button" onClick={() => openReport('resena', selectedProvider.id, `Reseña de ${review.cliente_nombre}`, review.id, review.cliente_id)} className="text-[9px] text-slate-400 hover:text-rose-600 flex items-center gap-1">
                            <Flag className="w-3 h-3" /> Reportar
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 italic text-center py-4">Este proveedor aún no tiene reseñas.</p>}
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reportTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[80] bg-black/45 flex items-end sm:items-center justify-center p-3"
            onClick={() => !reportSubmitting && setReportTarget(null)}
          >
            <motion.form
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onSubmit={handleSubmitReport}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-3xl p-4 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5"><Flag className="w-4 h-4 text-rose-600" /> Reportar contenido</h3><p className="text-[11px] text-slate-400 mt-1">{reportTarget.label}</p></div>
                <button type="button" disabled={reportSubmitting} onClick={() => setReportTarget(null)} className="p-1.5 rounded-full bg-slate-100 text-slate-500"><X className="w-4 h-4" /></button>
              </div>
              <label className="block mt-4 text-[11px] font-bold text-slate-600">Motivo
                <select value={reportReason} onChange={(event) => setReportReason(event.target.value as MotivoReporte)} className="mt-1 w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <option value="conducta_inadecuada">Conducta inadecuada</option>
                  <option value="informacion_falsa">Información falsa o engañosa</option>
                  <option value="contenido_inapropiado">Contenido inapropiado</option>
                  <option value="spam">Spam</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
              <label className="block mt-3 text-[11px] font-bold text-slate-600">Detalle
                <textarea value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} minLength={3} maxLength={600} required placeholder="Explica brevemente qué debería revisar administración..." className="mt-1 w-full h-24 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs resize-none" />
              </label>
              {reportError && <p className="mt-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-100 p-2 rounded-xl">{reportError}</p>}
              <button disabled={reportSubmitting} className="w-full mt-3 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold disabled:bg-slate-300">{reportSubmitting ? 'Enviando...' : 'Enviar reporte'}</button>
              <p className="text-[9px] text-slate-400 text-center mt-2">El reporte será visible solo para administración.</p>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
