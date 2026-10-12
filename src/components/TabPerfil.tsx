import { shareProviderProfile } from '../shareProviderProfile';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock,
  Image as ImageIcon,
  Heart,
  Info,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  Settings,
  ChevronRight,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  PROVIDER_AVAILABILITY_CLASSES,
  PROVIDER_AVAILABILITY_LABELS,
  PROVIDER_AVAILABILITY_OPTIONS,
  PROVIDER_CATEGORIES,
  WEEKLY_SCHEDULE_DAYS,
  createDefaultWeeklySchedule,
} from '../constants';
import {
  DEFAULT_COUNTRY_CODE,
  buildLocationLabel,
  formatPhoneForCountry,
  getCountryConfig,
  getRegionConfig,
  type SupportedCountryCode,
} from '../data/countries';
import { GeoLocationFields } from './GeoLocationFields';
import { LegalCenter } from './LegalCenter';
import { PrivacyRightsCenter } from './PrivacyRightsCenter';
import { auth, getFriendlyFirebaseError } from '../firebase';
import { LEGAL_POLICIES_VERSION, type LegalSectionId } from '../legalPolicies';
import { formatDate, isRealFirebaseConfigured, SVDatabaseService } from '../state/databaseService';
import {
  getLocalProfilePhoto,
  prepareLocalProfilePhoto,
  removeLocalProfilePhoto,
  saveLocalProfilePhoto,
  subscribeLocalProfilePhoto,
} from '../state/localProfilePhoto';
import { SVPushNotifications } from '../state/pushNotifications';
import type {
  AgendaSemanalProveedor,
  CategoriaProveedor,
  DiaSemanaAgenda,
  DisponibilidadProveedor,
  Proveedor,
  ProviderProfileUpdate,
  Resena,
  SolicitudServicio,
  UserRole,
  Usuario,
} from '../types';

interface TabPerfilProps {
  currentUser: Usuario | null;
  currentProvider: Proveedor | null;
  onAuthChange: (user: Usuario | null, provider: Proveedor | null) => void;
  triggerRefresh: () => void;
  startInRegisterMode?: boolean;
}

const DEFAULT_PROFILE_PHOTO =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=faces';

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function openLegalSection(
  setSection: (section: LegalSectionId) => void,
  setOpen: (open: boolean) => void,
  section: LegalSectionId,
) {
  setSection(section);
  setOpen(true);
}

export function TabPerfil({
  currentUser,
  currentProvider,
  onAuthChange,
  triggerRefresh,
  startInRegisterMode = false,
}: TabPerfilProps) {
  const hasRealFirebase = isRealFirebaseConfigured();
  const legalUpToDate = Boolean(
    currentUser?.terminos_aceptados
      && currentUser.terminos_version === LEGAL_POLICIES_VERSION
      && currentUser.privacidad_informada
      && currentUser.privacidad_version === LEGAL_POLICIES_VERSION
      && currentUser.mayor_18_declarado
      && (!currentUser.pais_codigo || currentUser.jurisdiccion_politicas === currentUser.pais_codigo),
  );

  const [isRegisterMode, setIsRegisterMode] = useState(startInRegisterMode);
  const [selectedRole, setSelectedRole] = useState<Exclude<UserRole, 'admin'>>('cliente');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [countryCode, setCountryCode] = useState<SupportedCountryCode>(DEFAULT_COUNTRY_CODE);
  const [regionCode, setRegionCode] = useState('');
  const [locality, setLocality] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<null | 'seguridad' | 'legal'>(null);
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalInitialSection, setLegalInitialSection] = useState<LegalSectionId>('terminos');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [privacyRead, setPrivacyRead] = useState(false);
  const [adultDeclared, setAdultDeclared] = useState(false);
  const [privacyCenterOpen, setPrivacyCenterOpen] = useState(false);
  const [existingAdultDeclared, setExistingAdultDeclared] = useState(Boolean(currentUser?.mayor_18_declarado));
  const [policySaving, setPolicySaving] = useState(false);
  const [policyMessage, setPolicyMessage] = useState('');
  const [policyError, setPolicyError] = useState('');

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalName, setPersonalName] = useState('');
  const [personalPhone, setPersonalPhone] = useState('');
  const [personalCountryCode, setPersonalCountryCode] = useState<SupportedCountryCode>(DEFAULT_COUNTRY_CODE);
  const [personalRegionCode, setPersonalRegionCode] = useState('');
  const [personalLocality, setPersonalLocality] = useState('');
  const [personalSaving, setPersonalSaving] = useState(false);

  const [clientSummary, setClientSummary] = useState({ active: 0, completed: 0, favorites: 0 });
  const [clientSummaryLoading, setClientSummaryLoading] = useState(false);
  const [accountActionLoading, setAccountActionLoading] = useState(false);
  const [accountActionMessage, setAccountActionMessage] = useState('');
  const [accountActionError, setAccountActionError] = useState('');
  const [localProfilePhoto, setLocalProfilePhoto] = useState('');
  const [localPhotoSaving, setLocalPhotoSaving] = useState(false);
  const [localPhotoError, setLocalPhotoError] = useState('');

  const [editingProvider, setEditingProvider] = useState(false);
  const [editCategories, setEditCategories] = useState<CategoriaProveedor[]>(['otros']);
  const [editOficio, setEditOficio] = useState('');
  const [editExperiencia, setEditExperiencia] = useState(0);
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [providerSaving, setProviderSaving] = useState(false);
  const [providerError, setProviderError] = useState('');
  const [providerMessage, setProviderMessage] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  const handleShareProviderProfile = async () => {
    if (!currentProvider) return;
    setShareMessage(await shareProviderProfile(currentProvider));
  };

  const [availabilityStatus, setAvailabilityStatus] = useState<DisponibilidadProveedor>('con_agenda');
  const [availabilityHours, setAvailabilityHours] = useState('');
  const [weeklySchedule, setWeeklySchedule] = useState<AgendaSemanalProveedor>(() => createDefaultWeeklySchedule());
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [verificationSaving, setVerificationSaving] = useState(false);

  const [receivedReviews, setReceivedReviews] = useState<Resena[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [providerRequests, setProviderRequests] = useState<SolicitudServicio[]>([]);
  const [providerStatsLoading, setProviderStatsLoading] = useState(false);
  const [providerSection, setProviderSection] = useState<'perfil' | 'agenda' | 'trabajos' | 'estadisticas'>('perfil');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [photoUiOpened, setPhotoUiOpened] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);

  useEffect(() => {
    setExistingAdultDeclared(Boolean(currentUser?.mayor_18_declarado));
  }, [currentUser?.id, currentUser?.mayor_18_declarado]);

  useEffect(() => {

  if (!currentUser) {
      setLocalProfilePhoto('');
      return;
    }

    const refreshLocalPhoto = (changedUserId?: string) => {
      if (!changedUserId || changedUserId === currentUser.id) {
        setLocalProfilePhoto(getLocalProfilePhoto(currentUser.id));
      }
    };

    refreshLocalPhoto();
    return subscribeLocalProfilePhoto(refreshLocalPhoto);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      setPersonalName(currentUser.nombre);
      setPersonalPhone(currentUser.telefono);
      setPersonalCountryCode(currentUser.pais_codigo || DEFAULT_COUNTRY_CODE);
      setPersonalRegionCode(currentUser.region_codigo || '');
      setPersonalLocality(currentUser.localidad_nombre || '');
    }
  }, [currentUser]);

  useEffect(() => {
    let active = true;
    if (!currentUser || currentUser.tipo_usuario !== 'cliente') {
      setClientSummary({ active: 0, completed: 0, favorites: 0 });
      setClientSummaryLoading(false);
      return () => {
        active = false;
      };
    }

    setClientSummaryLoading(true);
    Promise.all([
      SVDatabaseService.getSolicitudesCliente(currentUser.id),
      SVDatabaseService.getFavoritos(currentUser.id),
    ])
      .then(([requests, favorites]) => {
        if (!active) return;
        setClientSummary({
          active: requests.filter((request) => ['solicitada', 'aceptada', 'en_proceso'].includes(request.estado)).length,
          completed: requests.filter((request) => request.estado === 'completada').length,
          favorites: favorites.length,
        });
      })
      .catch((error) => {
        if (active) setAccountActionError(getFriendlyFirebaseError(error));
      })
      .finally(() => {
        if (active) setClientSummaryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) return;
    const accessNotice = sessionStorage.getItem('sv_account_access_notice');
    if (!accessNotice) return;
    setAuthError(accessNotice);
    sessionStorage.removeItem('sv_account_access_notice');
  }, [currentUser]);

  useEffect(() => {
    let active = true;
    if (!currentProvider) {
      setReceivedReviews([]);
      setProviderRequests([]);
      setReviewsLoading(false);
      setProviderStatsLoading(false);
      return () => {
        active = false;
      };
    }
    setEditCategories(currentProvider.categorias?.length ? currentProvider.categorias : [currentProvider.categoria_id]);
    setEditOficio(currentProvider.oficio);
    setEditExperiencia(currentProvider.experiencia);
    setEditDescripcion(currentProvider.descripcion);
    setEditWhatsapp(currentProvider.whatsapp);
    setAvailabilityStatus(currentProvider.disponibilidad || 'con_agenda');
    setAvailabilityHours(currentProvider.horario_atencion || '');
    setWeeklySchedule(currentProvider.agenda_semanal || createDefaultWeeklySchedule());

    setReviewsLoading(true);
    setProviderStatsLoading(true);
    Promise.all([
      SVDatabaseService.getResenas(currentProvider.id),
      SVDatabaseService.getSolicitudesProveedor(currentProvider.id),
    ])
      .then(([reviews, requests]) => {
        if (!active) return;
        setReceivedReviews(reviews);
        setProviderRequests(requests);
      })
      .catch((error) => {
        if (active) setProviderError(getFriendlyFirebaseError(error));
      })
      .finally(() => {
        if (!active) return;
        setReviewsLoading(false);
        setProviderStatsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentProvider]);

  useEffect(() => {
    setProviderSection('perfil');
  }, [currentProvider?.id]);

  useEffect(() => {
    let active = true;
    if (!currentProvider || providerSection !== 'estadisticas') return () => { active = false; };

    setProviderStatsLoading(true);
    Promise.all([
      SVDatabaseService.getResenas(currentProvider.id),
      SVDatabaseService.getSolicitudesProveedor(currentProvider.id),
    ])
      .then(([reviews, requests]) => {
        if (!active) return;
        setReceivedReviews(reviews);
        setProviderRequests(requests);
      })
      .catch((error) => {
        if (active) setProviderError(getFriendlyFirebaseError(error));
      })
      .finally(() => {
        if (active) setProviderStatsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [providerSection, currentProvider?.id]);

  const handleLocalProfilePhotoChange = async (file: File | undefined) => {
    if (!currentUser || !file || localPhotoSaving) return;
    setLocalPhotoSaving(true);
    setLocalPhotoError('');
    try {
      const compressedPhoto = await prepareLocalProfilePhoto(file);
      saveLocalProfilePhoto(currentUser.id, compressedPhoto);
      setLocalProfilePhoto(compressedPhoto);
      triggerRefresh();
    } catch (error) {
      setLocalPhotoError(error instanceof Error ? error.message : 'No fue posible guardar la foto.');
    } finally {
      setLocalPhotoSaving(false);
    }
  };

  const handleRemoveLocalProfilePhoto = () => {
    if (!currentUser || localPhotoSaving) return;
    removeLocalProfilePhoto(currentUser.id);
    setLocalProfilePhoto('');
    setLocalPhotoError('');
    triggerRefresh();
  };

  const handleClientPasswordReset = async () => {
    if (!currentUser || !['cliente', 'proveedor'].includes(currentUser.tipo_usuario) || accountActionLoading) return;
    setAccountActionLoading(true);
    setAccountActionMessage('');
    setAccountActionError('');
    try {
      if (hasRealFirebase) {
        await sendPasswordResetEmail(auth, currentUser.email);
        setAccountActionMessage('Enviamos un enlace para cambiar tu contraseña. Revisa tu correo y la carpeta Spam.');
      } else {
        setAccountActionMessage('En modo demo no se envían correos. En Firebase real recibirás un enlace de recuperación.');
      }
    } catch (error) {
      setAccountActionError(getFriendlyFirebaseError(error));
    } finally {
      setAccountActionLoading(false);
    }
  };

  const resetAuthFeedback = () => {
    setAuthError('');
    setAuthMessage('');
  };

  const handleAuthSubmit = async (event: FormEvent) => {
    event.preventDefault();
    resetAuthFeedback();

    if (!email.trim() || password.length < 6) {
      setAuthError('Ingresa un correo válido y una contraseña de al menos 6 caracteres.');
      return;
    }
    if (isRegisterMode && (!nombre.trim() || !isValidPhone(telefono))) {
      setAuthError('Ingresa tu nombre y un teléfono válido de 8 a 15 dígitos.');
      return;
    }
    if (isRegisterMode && (!regionCode || locality.trim().length < 2)) {
      setAuthError('Selecciona tu país, región y escribe tu comuna, municipio o localidad.');
      return;
    }
    if (isRegisterMode && !acceptedTerms) {
      setAuthError('Debes aceptar los Términos de uso para crear tu cuenta.');
      return;
    }
    if (isRegisterMode && !privacyRead) {
      setAuthError('Debes confirmar que leíste la Política de privacidad.');
      return;
    }
    if (isRegisterMode && !adultDeclared) {
      setAuthError('Servicios Vecinales requiere declarar que tienes 18 años o más para crear una cuenta.');
      return;
    }

    const selectedCountry = getCountryConfig(countryCode);
    const selectedRegion = getRegionConfig(countryCode, regionCode);
    const internationalPhone = isRegisterMode ? formatPhoneForCountry(telefono, countryCode) : telefono.trim();
    const structuredLocation = isRegisterMode ? buildLocationLabel(countryCode, regionCode, locality) : '';

    setAuthLoading(true);
    try {
      if (hasRealFirebase) {
        if (isRegisterMode) {
          const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          try {
            const userPayload: Usuario = {
              id: credential.user.uid,
              nombre: nombre.trim(),
              email: email.trim().toLowerCase(),
              telefono: internationalPhone,
              pais_codigo: selectedCountry.code,
              pais_nombre: selectedCountry.name,
              region_codigo: selectedRegion?.code || regionCode,
              region_nombre: selectedRegion?.name || '',
              localidad_nombre: locality.trim(),
              moneda_codigo: selectedCountry.currencyCode,
              prefijo_telefonico: selectedCountry.phonePrefix,
              tipo_usuario: selectedRole,
              politicas_aceptadas: true,
              jurisdiccion_politicas: selectedCountry.code,
              politicas_version: LEGAL_POLICIES_VERSION,
              terminos_aceptados: true,
              terminos_version: LEGAL_POLICIES_VERSION,
              privacidad_informada: true,
              privacidad_version: LEGAL_POLICIES_VERSION,
              mayor_18_declarado: true,
            };

            const providerPayload: Proveedor | null = selectedRole === 'proveedor'
              ? {
                  id: credential.user.uid,
                  usuario_id: credential.user.uid,
                  nombre_publico: nombre.trim(),
                  categoria_id: 'otros',
                  categorias: ['otros'],
                  oficio: 'Profesional Vecinal',
                  experiencia: 0,
                  descripcion: 'Completa tu presentación profesional para que los vecinos conozcan tus servicios.',
                  ubicacion: structuredLocation,
                  pais_codigo: selectedCountry.code,
                  pais_nombre: selectedCountry.name,
                  region_codigo: selectedRegion?.code || regionCode,
                  region_nombre: selectedRegion?.name || '',
                  localidad_nombre: locality.trim(),
                  moneda_codigo: selectedCountry.currencyCode,
                  prefijo_telefonico: selectedCountry.phonePrefix,
                  foto_perfil: DEFAULT_PROFILE_PHOTO,
                  whatsapp: internationalPhone,
                  calificacion_promedio: 0,
                  cantidad_resenas: 0,
                  verificado: false,
                  fotos_trabajos: [],
                }
              : null;

            await SVDatabaseService.createRegistrationProfiles(userPayload, providerPayload);
            await sendEmailVerification(credential.user).catch(() => undefined);
            onAuthChange(userPayload, providerPayload);
            setAuthMessage('Cuenta creada. También enviamos un correo de verificación.');
          } catch (profileError) {
            await deleteUser(credential.user).catch(() => undefined);
            throw profileError;
          }
        } else {
          const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
          const userProfile = await SVDatabaseService.getUsuario(credential.user.uid);
          if (!userProfile) {
            await signOut(auth);
            throw new Error('La cuenta existe en Authentication, pero no tiene perfil en Firestore.');
          }
          if (userProfile.estado_cuenta === 'suspendida' || userProfile.estado_cuenta === 'eliminada') {
            onAuthChange(userProfile, null);
            return;
          }
          let providerProfile =
            userProfile.tipo_usuario === 'proveedor'
              ? await SVDatabaseService.getProveedor(userProfile.id)
              : null;
          if (providerProfile && !providerProfile.nombre_publico) {
            try {
              await SVDatabaseService.updateProviderPublicName(providerProfile.id, userProfile.nombre);
              providerProfile = { ...providerProfile, nombre_publico: userProfile.nombre };
            } catch (migrationError) {
              console.warn('No fue posible migrar el nombre público del proveedor.', migrationError);
            }
          }
          onAuthChange(userProfile, providerProfile);
        }
      } else {
        const users = JSON.parse(localStorage.getItem('sv_local_usuarios') || '[]') as Usuario[];
        if (isRegisterMode) {
          if (users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase())) {
            throw new Error('Ese correo demo ya está registrado.');
          }
          const userId = `sim_user_${Date.now()}`;
          const userPayload: Usuario = {
            id: userId,
            nombre: nombre.trim(),
            email: email.trim().toLowerCase(),
            telefono: internationalPhone,
            pais_codigo: selectedCountry.code,
            pais_nombre: selectedCountry.name,
            region_codigo: selectedRegion?.code || regionCode,
            region_nombre: selectedRegion?.name || '',
            localidad_nombre: locality.trim(),
            moneda_codigo: selectedCountry.currencyCode,
            prefijo_telefonico: selectedCountry.phonePrefix,
            tipo_usuario: selectedRole,
            politicas_aceptadas: true,
            jurisdiccion_politicas: selectedCountry.code,
            politicas_version: LEGAL_POLICIES_VERSION,
            terminos_aceptados: true,
            terminos_version: LEGAL_POLICIES_VERSION,
            privacidad_informada: true,
            privacidad_version: LEGAL_POLICIES_VERSION,
            mayor_18_declarado: true,
          };
          let providerPayload: Proveedor | null = null;
          if (selectedRole === 'proveedor') {
            providerPayload = {
              id: userId,
              usuario_id: userId,
              nombre_publico: nombre.trim(),
              categoria_id: 'otros',
              categorias: ['otros'],
              oficio: 'Profesional Vecinal',
              experiencia: 0,
              descripcion: 'Completa tu presentación profesional.',
              ubicacion: structuredLocation,
              pais_codigo: selectedCountry.code,
              pais_nombre: selectedCountry.name,
              region_codigo: selectedRegion?.code || regionCode,
              region_nombre: selectedRegion?.name || '',
              localidad_nombre: locality.trim(),
              moneda_codigo: selectedCountry.currencyCode,
              prefijo_telefonico: selectedCountry.phonePrefix,
              foto_perfil: DEFAULT_PROFILE_PHOTO,
              whatsapp: internationalPhone,
              calificacion_promedio: 0,
              cantidad_resenas: 0,
              verificado: false,
              fotos_trabajos: [],
            };
          }
          await SVDatabaseService.createRegistrationProfiles(userPayload, providerPayload);
          onAuthChange(userPayload, providerPayload);
        } else {
          const matchedUser = users.find(
            (user) => user.email.toLowerCase() === email.trim().toLowerCase(),
          );
          if (!matchedUser) {
            throw new Error(
              'Correo demo no registrado. Prueba jane.doe@example.com, carlos.gomez@example.com o admin@example.com.',
            );
          }
          if (matchedUser.estado_cuenta === 'suspendida' || matchedUser.estado_cuenta === 'eliminada') {
            onAuthChange(matchedUser, null);
            return;
          }
          const providerProfile =
            matchedUser.tipo_usuario === 'proveedor'
              ? await SVDatabaseService.getProveedor(matchedUser.id)
              : null;
          onAuthChange(matchedUser, providerProfile);
        }
      }
      triggerRefresh();
    } catch (error) {
      const friendly = getFriendlyFirebaseError(error);
      setAuthError(friendly.includes('inesperado') && error instanceof Error ? error.message : friendly);
    } finally {
      setAuthLoading(false);
    }
  };

  const openPasswordReset = () => {
    resetAuthFeedback();
    setResetEmail(email.trim());
    setPasswordResetOpen(true);
  };

  const handlePasswordReset = async (event: FormEvent) => {
    event.preventDefault();
    resetAuthFeedback();
    const recoveryEmail = resetEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(recoveryEmail)) {
      setAuthError('Ingresa un correo electrónico válido.');
      return;
    }
    if (!hasRealFirebase) {
      setAuthMessage('El modo local no utiliza contraseñas reales.');
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, recoveryEmail);
      setAuthMessage(
        `Firebase aceptó la solicitud para ${recoveryEmail}. Revisa Recibidos y Spam. El mensaje puede tardar unos minutos.`,
      );
    } catch (error) {
      setAuthError(getFriendlyFirebaseError(error));
    } finally {
      setResetLoading(false);
    }
  };

  const handleAcceptCurrentPolicies = async () => {
    if (!currentUser) return;
    setPolicyMessage('');
    setPolicyError('');
    if (!existingAdultDeclared) {
      setPolicyError('Debes declarar que tienes 18 años o más para actualizar la aceptación de esta versión.');
      return;
    }
    setPolicySaving(true);
    try {
      await SVDatabaseService.aceptarPoliticas(currentUser.id, LEGAL_POLICIES_VERSION, currentUser.pais_codigo || 'CL');
      onAuthChange(
        {
          ...currentUser,
          politicas_aceptadas: true,
          jurisdiccion_politicas: currentUser.pais_codigo || 'CL',
          politicas_version: LEGAL_POLICIES_VERSION,
          politicas_aceptadas_at: new Date().toISOString(),
          terminos_aceptados: true,
          terminos_version: LEGAL_POLICIES_VERSION,
          terminos_aceptados_at: new Date().toISOString(),
          privacidad_informada: true,
          privacidad_version: LEGAL_POLICIES_VERSION,
          privacidad_informada_at: new Date().toISOString(),
          mayor_18_declarado: true,
          mayor_18_declarado_at: new Date().toISOString(),
        },
        currentProvider,
      );
      setPolicyMessage('Versión actual de las políticas aceptada correctamente.');
    } catch (error) {
      setPolicyError(getFriendlyFirebaseError(error));
    } finally {
      setPolicySaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      if (hasRealFirebase) {
        await SVPushNotifications.unregisterCurrentUser();
        await signOut(auth);
      }
    } finally {
      onAuthChange(null, null);
      triggerRefresh();
    }
  };

  const handlePersonalUpdate = async (event: FormEvent) => {
    event.preventDefault();
    setProviderError('');
    setProviderMessage('');
    if (!currentUser || !personalName.trim() || !isValidPhone(personalPhone)) {
      setProviderError('Revisa tu nombre y teléfono antes de guardar.');
      return;
    }
    if (!personalRegionCode || personalLocality.trim().length < 2) {
      setProviderError('Selecciona país, región y ciudad/comuna antes de guardar.');
      return;
    }

    setPersonalSaving(true);
    try {
      const personalCountry = getCountryConfig(personalCountryCode);
      const personalRegion = getRegionConfig(personalCountryCode, personalRegionCode);
      const personalInternationalPhone = formatPhoneForCountry(personalPhone, personalCountryCode);
      const locationLabel = buildLocationLabel(personalCountryCode, personalRegionCode, personalLocality);
      const accountChanges = {
        nombre: personalName.trim(),
        telefono: personalInternationalPhone,
        pais_codigo: personalCountry.code,
        pais_nombre: personalCountry.name,
        region_codigo: personalRegion?.code || personalRegionCode,
        region_nombre: personalRegion?.name || '',
        localidad_nombre: personalLocality.trim(),
        moneda_codigo: personalCountry.currencyCode,
        prefijo_telefonico: personalCountry.phonePrefix,
      };

      await SVDatabaseService.updateUsuarioPersonal(currentUser.id, accountChanges);
      if (currentProvider) {
        await SVDatabaseService.updateProviderAccountData(currentProvider.id, {
          nombre_publico: personalName.trim(),
          ubicacion: locationLabel,
          pais_codigo: personalCountry.code,
          pais_nombre: personalCountry.name,
          region_codigo: personalRegion?.code || personalRegionCode,
          region_nombre: personalRegion?.name || '',
          localidad_nombre: personalLocality.trim(),
          moneda_codigo: personalCountry.currencyCode,
          prefijo_telefonico: personalCountry.phonePrefix,
        });
      }

      const updatedUser = { ...currentUser, ...accountChanges };
      const updatedProvider = currentProvider
        ? {
            ...currentProvider,
            nombre_publico: personalName.trim(),
            ubicacion: locationLabel,
            pais_codigo: personalCountry.code,
            pais_nombre: personalCountry.name,
            region_codigo: personalRegion?.code || personalRegionCode,
            region_nombre: personalRegion?.name || '',
            localidad_nombre: personalLocality.trim(),
            moneda_codigo: personalCountry.currencyCode,
            prefijo_telefonico: personalCountry.phonePrefix,
          }
        : null;
      onAuthChange(updatedUser, updatedProvider);
      setEditingPersonal(false);
      setProviderMessage(currentProvider ? 'Datos de la cuenta y ubicación pública actualizados.' : 'Datos personales actualizados.');
      triggerRefresh();
    } catch (error) {
      setProviderError(getFriendlyFirebaseError(error));
    } finally {
      setPersonalSaving(false);
    }
  };

  const toggleProviderCategory = (category: CategoriaProveedor) => {
    setProviderError('');
    setEditCategories((current) => {
      if (category === 'otros') return ['otros'];
      if (current.includes(category)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== category);
      }
      const withoutOther = current.filter((item) => item !== 'otros');
      if (withoutOther.length >= 5) {
        setProviderError('Puedes seleccionar un máximo de 5 categorías.');
        return current;
      }
      return [...withoutOther, category];
    });
  };

  const handleProviderUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentProvider || !currentUser) return;
    setProviderError('');
    setProviderMessage('');
    if (editOficio.trim().length < 3 || editDescripcion.trim().length < 20 || !isValidPhone(editWhatsapp)) {
      setProviderError('Revisa el oficio, la descripción y el teléfono de WhatsApp.');
      return;
    }
    if (editCategories.length < 1 || editCategories.length > 5) {
      setProviderError('Selecciona entre 1 y 5 categorías para tus servicios.');
      return;
    }

    const canonicalCountryCode = currentUser.pais_codigo || currentProvider.pais_codigo || DEFAULT_COUNTRY_CODE;
    const canonicalRegionCode = currentUser.region_codigo || currentProvider.region_codigo || '';
    const canonicalLocality = currentUser.localidad_nombre || currentProvider.localidad_nombre || '';
    if (!canonicalRegionCode || canonicalLocality.trim().length < 2) {
      setProviderError('Completa primero país, región y ciudad/comuna en Datos de la cuenta.');
      return;
    }

    const providerCountry = getCountryConfig(canonicalCountryCode);
    const providerRegion = getRegionConfig(canonicalCountryCode, canonicalRegionCode);
    const providerPhone = formatPhoneForCountry(editWhatsapp, canonicalCountryCode);
    const changes: ProviderProfileUpdate = {
      categoria_id: editCategories[0],
      categorias: editCategories,
      oficio: editOficio,
      experiencia: editExperiencia,
      descripcion: editDescripcion,
      ubicacion: buildLocationLabel(canonicalCountryCode, canonicalRegionCode, canonicalLocality),
      pais_codigo: providerCountry.code,
      pais_nombre: providerCountry.name,
      region_codigo: providerRegion?.code || canonicalRegionCode,
      region_nombre: providerRegion?.name || currentUser.region_nombre || currentProvider.region_nombre || '',
      localidad_nombre: canonicalLocality.trim(),
      moneda_codigo: providerCountry.currencyCode,
      prefijo_telefonico: providerCountry.phonePrefix,
      foto_perfil: currentProvider.foto_perfil,
      whatsapp: providerPhone,
    };

    setProviderSaving(true);
    try {
      await SVDatabaseService.updateProveedorProfile(currentProvider.id, changes);
      const updatedProvider: Proveedor = { ...currentProvider, ...changes, foto_perfil: changes.foto_perfil || DEFAULT_PROFILE_PHOTO };
      onAuthChange(currentUser, updatedProvider);
      setEditingProvider(false);
      setProviderMessage('Perfil profesional actualizado correctamente.');
      triggerRefresh();
    } catch (error) {
      setProviderError(getFriendlyFirebaseError(error));
    } finally {
      setProviderSaving(false);
    }
  };

  const updateWeeklyScheduleDay = (
    day: DiaSemanaAgenda,
    changes: Partial<AgendaSemanalProveedor[DiaSemanaAgenda]>,
  ) => {
    setWeeklySchedule((current) => ({
      ...current,
      [day]: { ...current[day], ...changes },
    }));
  };

  const handleAvailabilityUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentProvider || !currentUser) return;
    setProviderError('');
    setProviderMessage('');
    if (availabilityHours.trim().length > 120) {
      setProviderError('La referencia de horario no puede superar los 120 caracteres.');
      return;
    }

    const activeDays = WEEKLY_SCHEDULE_DAYS.filter(({ id }) => weeklySchedule[id].activo);
    if (availabilityStatus !== 'no_disponible' && activeDays.length === 0) {
      setProviderError('Activa al menos un día en tu agenda semanal.');
      return;
    }
    for (const { id, label } of activeDays) {
      const slot = weeklySchedule[id];
      if (!slot.desde || !slot.hasta || slot.desde >= slot.hasta) {
        setProviderError(`Revisa el horario de ${label}. La hora de inicio debe ser anterior a la hora de término.`);
        return;
      }
    }

    setAvailabilitySaving(true);
    try {
      await SVDatabaseService.updateProviderAvailability(
        currentProvider.id,
        availabilityStatus,
        availabilityHours,
        weeklySchedule,
      );
      const updatedProvider: Proveedor = {
        ...currentProvider,
        disponibilidad: availabilityStatus,
        horario_atencion: availabilityHours.trim(),
        agenda_semanal: weeklySchedule,
      };
      onAuthChange(currentUser, updatedProvider);
      setProviderMessage('Disponibilidad y agenda semanal actualizadas. Los clientes ya pueden ver tus horarios.');
      triggerRefresh();
    } catch (error) {
      setProviderError(getFriendlyFirebaseError(error));
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const handleRequestVerification = async () => {
    if (!currentProvider || !currentUser) return;
    setProviderError('');
    setProviderMessage('');
    setVerificationSaving(true);
    try {
      await SVDatabaseService.solicitarVerificacionProveedor(currentProvider.id);
      const updatedProvider: Proveedor = {
        ...currentProvider,
        verificado: false,
        estado_verificacion: 'pendiente',
        verificacion_solicitada_at: new Date().toISOString(),
        verificacion_resuelta_at: undefined,
        verificacion_observacion: undefined,
      };
      onAuthChange(currentUser, updatedProvider);
      setProviderMessage('Solicitud de verificación enviada. Administración revisará tu perfil.');
      triggerRefresh();
    } catch (error) {
      setProviderError(getFriendlyFirebaseError(error));
    } finally {
      setVerificationSaving(false);
    }
  };

  const handleAddWorkPhoto = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentProvider || !newPhotoUrl.trim()) return;
    if (currentProvider.fotos_trabajos.length >= 12) {
      setProviderError('El portafolio admite un máximo de 12 fotografías.');
      return;
    }
    setPhotoSaving(true);
    setProviderError('');
    try {
      const photos = [...currentProvider.fotos_trabajos, newPhotoUrl.trim()];
      await SVDatabaseService.updateProviderPhotos(currentProvider.id, photos);
      onAuthChange(currentUser, { ...currentProvider, fotos_trabajos: photos });
      setNewPhotoUrl('');
      setPhotoUiOpened(false);
      triggerRefresh();
    } catch (error) {
      setProviderError(getFriendlyFirebaseError(error));
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleRemoveWorkPhoto = async (indexToRemove: number) => {
    if (!currentProvider) return;
    setPhotoSaving(true);
    try {
      const photos = currentProvider.fotos_trabajos.filter((_, index) => index !== indexToRemove);
      await SVDatabaseService.updateProviderPhotos(currentProvider.id, photos);
      onAuthChange(currentUser, { ...currentProvider, fotos_trabajos: photos });
      triggerRefresh();
    } catch (error) {
      setProviderError(getFriendlyFirebaseError(error));
    } finally {
      setPhotoSaving(false);
    }
  };

  const providerStats = (() => {
    const total = providerRequests.length;
    const active = providerRequests.filter((request) => ['solicitada', 'aceptada', 'en_proceso'].includes(request.estado)).length;
    const completed = providerRequests.filter((request) => request.estado === 'completada').length;
    const rejected = providerRequests.filter((request) => request.estado === 'rechazada').length;
    const accepted = providerRequests.filter((request) => ['aceptada', 'en_proceso', 'completada'].includes(request.estado)).length;
    const decisions = accepted + rejected;
    const acceptanceRate = decisions ? Math.round((accepted / decisions) * 100) : 0;
    const attendedClients = new Set(
      providerRequests
        .filter((request) => request.estado === 'completada')
        .map((request) => request.cliente_id),
    ).size;
    const rating = receivedReviews.length
      ? receivedReviews.reduce((sum, review) => sum + review.calificacion, 0) / receivedReviews.length
      : currentProvider?.calificacion_promedio || 0;

    return { total, active, completed, rejected, accepted, decisions, acceptanceRate, attendedClients, rating };
  })();

  if (!currentUser) {
    return (
      <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto pb-20">
        <div className="h-14 bg-emerald-600 flex items-center px-4 shadow-md shrink-0">
          <span className="font-bold text-white text-base flex items-center gap-1.5"><User className="w-5 h-5" /> Mi perfil</span>
        </div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm text-center">
            <div className="w-14 h-14 bg-emerald-50 rounded-full mx-auto flex items-center justify-center"><Lock className="w-7 h-7 text-emerald-600" /></div>
            <h2 className="text-base font-bold text-slate-800 mt-3">
              {passwordResetOpen ? 'Restablecer contraseña' : isRegisterMode ? 'Crear cuenta' : 'Iniciar sesión'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {passwordResetOpen
                ? 'Te enviaremos el enlace de recuperación al correo de tu cuenta.'
                : isRegisterMode
                  ? 'Regístrate como cliente o proveedor.'
                  : 'Accede a solicitudes, reseñas y tu perfil.'}
            </p>

            {passwordResetOpen ? (
              <form onSubmit={handlePasswordReset} className="flex flex-col gap-3 mt-5 text-left">
                <label className="text-[11px] font-bold text-slate-600">Correo electrónico
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                      maxLength={150}
                      required
                      autoFocus
                      placeholder="nombre@correo.cl"
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </label>

                {authError && <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 p-2.5 rounded-xl">{authError}</p>}
                {authMessage && <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">{authMessage}</p>}

                <button disabled={resetLoading} className="w-full py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl disabled:bg-slate-300">
                  {resetLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordResetOpen(false);
                    resetAuthFeedback();
                  }}
                  className="w-full py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Volver a iniciar sesión
                </button>
                <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                  Si Firebase confirma el envío pero no ves el mensaje, revisa Spam y la plantilla de “Restablecimiento de contraseña” en Firebase Authentication.
                </p>
              </form>
            ) : (
              <>
                <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3 mt-5 text-left">
                  {isRegisterMode && (
                    <>
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
                        <p className="text-[10px] font-black text-emerald-800 mb-0.5">1. ¿Dónde te encuentras?</p>
                        <p className="text-[9px] text-slate-500 mb-2.5">Esta ubicación será la base para mostrarte proveedores cercanos.</p>
                        <GeoLocationFields
                          countryCode={countryCode}
                          regionCode={regionCode}
                          locality={locality}
                          onCountryChange={(nextCountry) => {
                            setCountryCode(nextCountry);
                            setAcceptedTerms(false);
                            setPrivacyRead(false);
                          }}
                          onRegionChange={setRegionCode}
                          onLocalityChange={setLocality}
                        />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-700 mb-2">2. ¿Cómo quieres usar Servicios Vecinales?</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(['cliente', 'proveedor'] as const).map((role) => (
                            <button type="button" key={role} onClick={() => setSelectedRole(role)} className={`py-2.5 rounded-xl text-xs font-bold border ${selectedRole === role ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{role === 'cliente' ? 'Soy cliente' : 'Soy proveedor'}</button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] font-black text-slate-700 -mb-1">3. Tus datos</p>
                      <label className="text-[11px] font-bold text-slate-600">Nombre completo
                        <input value={nombre} onChange={(event) => setNombre(event.target.value)} maxLength={100} required className="mt-1 w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                      </label>
                      <label className="text-[11px] font-bold text-slate-600">Teléfono
                        <div className="flex mt-1">
                          <span className="px-3 py-2.5 rounded-l-xl bg-slate-100 border border-r-0 border-slate-200 text-xs font-bold text-slate-500">{getCountryConfig(countryCode).phonePrefix}</span>
                          <input value={telefono} onChange={(event) => setTelefono(event.target.value)} maxLength={20} required placeholder="912345678" className="flex-1 min-w-0 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-r-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                        </div>
                      </label>
                    </>
                  )}
                  <label className="text-[11px] font-bold text-slate-600">Correo electrónico
                    <div className="relative mt-1"><Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={150} required className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" /></div>
                  </label>
                  <label className="text-[11px] font-bold text-slate-600">Contraseña
                    <div className="relative mt-1"><Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} maxLength={128} required className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" /></div>
                  </label>

                  {isRegisterMode && (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2.5">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" checked={adultDeclared} onChange={(event) => setAdultDeclared(event.target.checked)} className="mt-0.5 accent-emerald-600" />
                        <span className="text-[10px] leading-relaxed text-slate-600"><strong>Declaro tener 18 años o más.</strong> Servicios Vecinales está diseñado para contratación de servicios entre personas adultas.</span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 accent-emerald-600" />
                        <span className="text-[10px] leading-relaxed text-slate-600">Acepto los <button type="button" onClick={(event) => { event.preventDefault(); openLegalSection(setLegalInitialSection, setLegalOpen, 'terminos'); }} className="font-bold text-emerald-700 underline">Términos de uso</button>.</span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" checked={privacyRead} onChange={(event) => setPrivacyRead(event.target.checked)} className="mt-0.5 accent-emerald-600" />
                        <span className="text-[10px] leading-relaxed text-slate-600">Declaro haber leído la <button type="button" onClick={(event) => { event.preventDefault(); openLegalSection(setLegalInitialSection, setLegalOpen, 'privacidad'); }} className="font-bold text-emerald-700 underline">Política de privacidad</button>. Esta constancia no reemplaza consentimientos específicos que pudieran ser necesarios para funciones opcionales.</span>
                      </label>
                      <button type="button" onClick={() => openLegalSection(setLegalInitialSection, setLegalOpen, 'normas')} className="text-[10px] text-slate-500 underline ml-6">Ver normas de convivencia</button>
                    </div>
                  )}

                  {authError && <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 p-2.5 rounded-xl">{authError}</p>}
                  {authMessage && <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">{authMessage}</p>}

                  <button disabled={authLoading} className="w-full py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl disabled:bg-slate-300">{authLoading ? 'Procesando...' : isRegisterMode ? 'Crear cuenta' : 'Ingresar'}</button>
                </form>

                {!isRegisterMode && <button onClick={openPasswordReset} className="text-[11px] text-slate-500 underline mt-3">Olvidé mi contraseña</button>}
                <button onClick={() => { setIsRegisterMode((mode) => !mode); setAcceptedTerms(false); setPrivacyRead(false); setAdultDeclared(false); resetAuthFeedback(); }} className="block mx-auto text-xs text-emerald-700 font-bold mt-4">{isRegisterMode ? 'Ya tengo una cuenta · Iniciar sesión' : 'Crear una cuenta nueva'}</button>
                <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-slate-100">
                  <button type="button" onClick={() => openLegalSection(setLegalInitialSection, setLegalOpen, 'terminos')} className="text-[9px] text-slate-400 underline">Términos</button>
                  <button type="button" onClick={() => openLegalSection(setLegalInitialSection, setLegalOpen, 'privacidad')} className="text-[9px] text-slate-400 underline">Privacidad</button>
                  <button type="button" onClick={() => openLegalSection(setLegalInitialSection, setLegalOpen, 'normas')} className="text-[9px] text-slate-400 underline">Normas</button>
                </div>
              </>
            )}

            {!hasRealFirebase && <div className="mt-5 text-left bg-amber-50 border border-amber-100 rounded-xl p-3"><p className="text-[10px] text-amber-800"><b>Modo demo:</b> usa jane.doe@example.com, carlos.gomez@example.com o admin@example.com. La contraseña puede ser cualquier texto de 6 caracteres.</p></div>}
          </div>
        </motion.div>
        {legalOpen && <LegalCenter countryCode={countryCode} initialSection={legalInitialSection} onClose={() => setLegalOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <header className="relative z-50 h-14 bg-emerald-600 flex items-center justify-between px-4 text-white shadow-md shrink-0">
        <div><h2 className="font-bold text-sm">Mi perfil</h2><p className="text-[10px] text-white/80 capitalize">Cuenta {currentUser.tipo_usuario}</p></div>
        {currentUser.tipo_usuario === 'admin' ? <ShieldCheck className="w-5 h-5" /> : (
          <div className="relative">
            <button type="button" aria-label="Configuración" aria-expanded={settingsMenuOpen} onClick={() => { setSettingsView(null); setSettingsMenuOpen((open) => !open); }} className="p-2 rounded-xl hover:bg-white/15" ><Settings className="w-5 h-5" /></button>
            {settingsMenuOpen && <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl text-slate-800 z-[100]">
              {(currentUser.tipo_usuario === 'cliente' || currentUser.tipo_usuario === 'proveedor') && <button type="button" onClick={() => { setSettingsView('seguridad'); setSettingsMenuOpen(false); }} className="w-full flex items-center gap-2 text-left p-3 rounded-xl hover:bg-slate-50 text-xs font-bold"><ShieldCheck className="w-4 h-4 text-emerald-600"/> Seguridad y cuenta <ChevronRight className="w-3.5 h-3.5 ml-auto"/></button>}
              <button type="button" onClick={() => { setSettingsView('legal'); setSettingsMenuOpen(false); }} className="w-full flex items-center gap-2 text-left p-3 rounded-xl hover:bg-slate-50 text-xs font-bold"><ShieldCheck className="w-4 h-4 text-emerald-600"/> Legal y privacidad <ChevronRight className="w-3.5 h-3.5 ml-auto"/></button>
            </div>}
          </div>
        )}
      </header>

      {settingsView !== null && <main className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
        <button type="button" onClick={() => setSettingsView(null)} className="flex items-center gap-1 text-xs font-bold text-emerald-700 py-2 mb-2"><ChevronLeft className="w-4 h-4"/> Volver a mi perfil</button>
        <h2 className="font-black text-lg text-slate-800 mb-3">{settingsView === 'seguridad' ? 'Seguridad y cuenta' : 'Legal y privacidad'}</h2>
        {settingsView === 'seguridad' && (currentUser.tipo_usuario === 'cliente' || currentUser.tipo_usuario === 'proveedor') && (
                      <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">Seguridad y cuenta</h3>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                  <span className="text-[10px] text-slate-500">Estado de la cuenta</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">Activa</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                  <span className="text-[10px] text-slate-500">Correo electrónico</span>
                  <span className={`text-[10px] font-bold ${hasRealFirebase && auth.currentUser?.emailVerified ? 'text-emerald-700' : 'text-amber-600'}`}>
                    {hasRealFirebase ? (auth.currentUser?.emailVerified ? 'Verificado' : 'Pendiente de verificar') : 'Modo demo'}
                  </span>
                </div>
                {currentUser.createdAt && (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="text-[10px] text-slate-500">Miembro desde</span>
                    <span className="text-[10px] font-semibold text-slate-700">{formatDate(currentUser.createdAt)}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={accountActionLoading}
                onClick={() => void handleClientPasswordReset()}
                className="w-full mt-3 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:bg-slate-300"
              >
                <KeyRound className="w-4 h-4" /> {accountActionLoading ? 'Enviando...' : 'Cambiar contraseña'}
              </button>
              {accountActionMessage && <p className="mt-2 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-2.5">{accountActionMessage}</p>}
              {accountActionError && <p className="mt-2 text-[10px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-2.5">{accountActionError}</p>}
            </section>
        )}
        {settingsView === 'legal' && (
                  <section className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="text-xs font-black text-slate-700">Legal y privacidad</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Términos, privacidad y normas de Servicios Vecinales.</p>
              </div>
            </div>
            <span className={`shrink-0 text-[9px] font-bold px-2 py-1 rounded-full border ${legalUpToDate ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
              {legalUpToDate ? 'Al día' : 'Pendiente'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            <button type="button" onClick={() => openLegalSection(setLegalInitialSection, setLegalOpen, 'terminos')} className="py-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-600">Términos</button>
            <button type="button" onClick={() => openLegalSection(setLegalInitialSection, setLegalOpen, 'privacidad')} className="py-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-600">Política de privacidad</button>
            <button type="button" onClick={() => openLegalSection(setLegalInitialSection, setLegalOpen, 'normas')} className="py-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-600">Normas</button>
            {currentUser.tipo_usuario !== 'admin' && <button type="button" onClick={() => setPrivacyCenterOpen(true)} className="py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-700">Mis datos y derechos</button>}
          </div>
          {!legalUpToDate && (
            <div className="mt-3">
              {!currentUser.mayor_18_declarado && (
                <label className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 p-2.5 mb-2 cursor-pointer">
                  <input type="checkbox" checked={existingAdultDeclared} onChange={(event) => setExistingAdultDeclared(event.target.checked)} className="mt-0.5 accent-emerald-600" />
                  <span className="text-[10px] text-amber-800 leading-relaxed">Declaro tener 18 años o más.</span>
                </label>
              )}
              <button
                type="button"
                onClick={() => void handleAcceptCurrentPolicies()}
                disabled={policySaving || !existingAdultDeclared}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:bg-slate-300"
              >
                {policySaving ? 'Guardando...' : `Aceptar términos y confirmar lectura · ${LEGAL_POLICIES_VERSION}`}
              </button>
            </div>
          )}
          {policyMessage && <p className="mt-2 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-2.5">{policyMessage}</p>}
          {policyError && <p className="mt-2 text-[10px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-2.5">{policyError}</p>}
        </section>
        )}
      </main>}
      <main className={`relative z-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-20 ${settingsView !== null ? 'hidden' : ''}`}>

        <section className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">Datos de la cuenta</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Identidad, contacto y ubicación principal.</p>
            </div>
            <button type="button" onClick={() => setEditingPersonal((editing) => !editing)} className="shrink-0 px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold inline-flex items-center gap-1 whitespace-nowrap">
              <Pencil className="w-3.5 h-3.5" /> {editingPersonal ? 'Cerrar' : 'Editar'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {localProfilePhoto || currentProvider?.foto_perfil ? (
                <img src={localProfilePhoto || currentProvider?.foto_perfil} alt="Foto de perfil" className="w-14 h-14 rounded-2xl object-cover border border-slate-100" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center"><User className="w-7 h-7 text-emerald-600" /></div>
              )}
              <label className="absolute -right-1 -bottom-1 w-6 h-6 rounded-full bg-emerald-600 text-white shadow flex items-center justify-center cursor-pointer" title="Cambiar foto">
                <ImageIcon className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={localPhotoSaving}
                  onChange={(event) => {
                    void handleLocalProfilePhotoChange(event.target.files?.[0]);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            </div>
            <div className="flex-1 min-w-0"><p className="font-bold text-slate-800 truncate">{currentUser.nombre}</p><p className="text-xs text-slate-400 truncate">{currentUser.email}</p><span className="inline-block text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-1">{currentUser.tipo_usuario}</span></div>

          </div>

          {localProfilePhoto && (
            <div className="mt-2 flex justify-end">
              <button type="button" onClick={handleRemoveLocalProfilePhoto} disabled={localPhotoSaving}
                className="inline-flex items-center gap-1 text-[10px] text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 disabled:opacity-50"
                title="Quitar foto local"><Trash2 className="w-3 h-3" /> Quitar foto</button>
            </div>
          )}
          {localPhotoSaving && <p className="mt-2 text-[10px] text-emerald-700">Preparando y guardando foto...</p>}
          {localPhotoError && <p className="mt-2 text-[10px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-2.5">{localPhotoError}</p>}

          {editingPersonal ? (
            <form onSubmit={handlePersonalUpdate} className="mt-4 flex flex-col gap-2.5">
              <input value={personalName} onChange={(event) => setPersonalName(event.target.value)} maxLength={100} required className="text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              <input value={personalPhone} onChange={(event) => setPersonalPhone(event.target.value)} maxLength={20} required className="text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              <GeoLocationFields
                countryCode={personalCountryCode}
                regionCode={personalRegionCode}
                locality={personalLocality}
                onCountryChange={setPersonalCountryCode}
                onRegionChange={setPersonalRegionCode}
                onLocalityChange={setPersonalLocality}
                compact
              />
              <button disabled={personalSaving} className="py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">{personalSaving ? 'Guardando...' : 'Guardar datos personales'}</button>
            </form>
          ) : (
            <>
              <div className="mt-4 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-500 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {currentUser.telefono}</div>
              {(currentUser.localidad_nombre || currentUser.region_nombre || currentUser.pais_nombre) && (
                <div className="mt-2 bg-slate-50 rounded-xl p-2.5 text-[11px] text-slate-500 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{[currentUser.localidad_nombre, currentUser.region_nombre, currentUser.pais_nombre].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </>
          )}
        </section>

        {currentUser.tipo_usuario === 'cliente' && (
          <>
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">Mi actividad</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Resumen de tu actividad en Servicios Vecinales</p>
                </div>
                <Briefcase className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-2xl bg-amber-50 border border-amber-100 px-2 py-3 text-center">
                  <ClipboardList className="w-4 h-4 text-amber-600 mx-auto" />
                  <p className="text-lg font-black text-slate-800 mt-1">{clientSummaryLoading ? '…' : clientSummary.active}</p>
                  <p className="text-[9px] text-slate-500 font-semibold">Activas</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-2 py-3 text-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  <p className="text-lg font-black text-slate-800 mt-1">{clientSummaryLoading ? '…' : clientSummary.completed}</p>
                  <p className="text-[9px] text-slate-500 font-semibold">Completados</p>
                </div>
                <div className="rounded-2xl bg-rose-50 border border-rose-100 px-2 py-3 text-center">
                  <Heart className="w-4 h-4 text-rose-500 mx-auto" />
                  <p className="text-lg font-black text-slate-800 mt-1">{clientSummaryLoading ? '…' : clientSummary.favorites}</p>
                  <p className="text-[9px] text-slate-500 font-semibold">Favoritos</p>
                </div>
              </div>
            </section>


          </>
        )}

        {providerError && <p className="mt-3 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">{providerError}</p>}
        {providerMessage && <p className="mt-3 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">{providerMessage}</p>}

        {currentUser.tipo_usuario === 'proveedor' && currentProvider && (
          <>
            <section className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 mt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-sm text-slate-800 truncate">{currentProvider.oficio}</h3>
                    {currentProvider.verificado && <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{currentProvider.ubicacion}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-amber-500 font-black flex items-center gap-1 justify-end">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    {currentProvider.cantidad_resenas ? currentProvider.calificacion_promedio.toFixed(1) : '—'}
                  </p>
                  <p className="text-[9px] text-slate-400">{currentProvider.cantidad_resenas || 0} reseñas</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 mt-3">
                {([
                  ['perfil', 'Presentación', User],
                  ['agenda', 'Agenda', CalendarDays],
                  ['trabajos', 'Trabajos', ImageIcon],
                  ['estadisticas', 'Estadísticas', ClipboardList],
                ] as const).map(([id, label, Icon]) => {
                  const active = providerSection === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setProviderSection(id)}
                      className={`min-w-0 py-2 px-1 rounded-xl border flex flex-col items-center gap-1 transition ${active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[9px] font-bold truncate w-full text-center">{label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {providerSection === 'perfil' && (
              <>
                <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-3">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">Presentación pública</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Lo que verán los clientes al abrir tu perfil profesional.</p>
                    </div>
                    <button type="button" onClick={() => void handleShareProviderProfile()} title="Compartir perfil" aria-label="Compartir perfil" className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-1.5 text-[10px] font-semibold">
                      <Share2 className="w-3.5 h-3.5" /> Compartir
                    </button>
                  </div>
                  {shareMessage && <p role="status" className="mb-3 text-[10px] text-slate-600">{shareMessage}</p>}
                  <div className="flex gap-3 items-center">
                    <img src={localProfilePhoto || currentProvider.foto_perfil} alt="Perfil profesional" className="w-14 h-14 rounded-2xl object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1">
                        {(currentProvider.categorias?.length ? currentProvider.categorias : [currentProvider.categoria_id]).slice(0, 3).map((categoryId) => {
                          const category = PROVIDER_CATEGORIES.find((item) => item.id === categoryId);
                          return category ? <span key={categoryId} className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-semibold">{category.icon} {category.label}</span> : null;
                        })}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5"><b>{currentProvider.experiencia}</b> años de experiencia</p>
                      {currentProvider.disponibilidad && (
                        <span className={`inline-flex mt-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${PROVIDER_AVAILABILITY_CLASSES[currentProvider.disponibilidad]}`}>
                          {PROVIDER_AVAILABILITY_LABELS[currentProvider.disponibilidad]}
                        </span>
                      )}
                    </div>
                  </div>

                  {!editingProvider && (
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-3 bg-slate-50 rounded-xl p-3">
                      {currentProvider.descripcion}
                    </p>
                  )}

                  {editingProvider ? (
                    <form onSubmit={handleProviderUpdate} className="mt-4 flex flex-col gap-3">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-600">Categorías de servicio</span>
                          <span className="text-[10px] text-slate-400">{editCategories.length}/5</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {PROVIDER_CATEGORIES.filter((category) => category.id !== 'todos').map((category) => {
                            const categoryId = category.id as CategoriaProveedor;
                            const active = editCategories.includes(categoryId);
                            return (
                              <button type="button" key={category.id} onClick={() => toggleProviderCategory(categoryId)} className={`px-2.5 py-2 rounded-xl border text-[11px] font-semibold text-left flex items-center gap-1.5 ${active ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                <span>{category.icon}</span><span className="truncate">{category.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <label className="text-[11px] font-bold text-slate-600">Oficio o título<input value={editOficio} onChange={(event) => setEditOficio(event.target.value)} maxLength={80} required className="mt-1 w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" /></label>
                      <label className="text-[11px] font-bold text-slate-600">Años de experiencia<input type="number" min={0} max={80} value={editExperiencia} onChange={(event) => setEditExperiencia(Number(event.target.value))} required className="mt-1 w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" /></label>
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-emerald-800">Ubicación pública</p>
                            <p className="text-[10px] text-slate-600 mt-0.5">{currentProvider.ubicacion}</p>
                            <p className="text-[9px] text-slate-400 mt-1">Se modifica una sola vez desde Datos de la cuenta y se sincroniza con tu presentación.</p>
                          </div>
                        </div>
                      </div>
                      <label className="text-[11px] font-bold text-slate-600">WhatsApp público <span className="font-normal text-slate-400">(puede ser distinto al teléfono de la cuenta)</span><input value={editWhatsapp} onChange={(event) => setEditWhatsapp(event.target.value)} maxLength={20} required className="mt-1 w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" /></label>
                      <label className="text-[11px] font-bold text-slate-600">Descripción<textarea value={editDescripcion} onChange={(event) => setEditDescripcion(event.target.value)} maxLength={2000} required className="mt-1 w-full h-24 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl resize-none" /></label>
                      <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setEditingProvider(false)} className="py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Cancelar</button><button disabled={providerSaving} className="py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"><Save className="w-3.5 h-3.5" /> {providerSaving ? 'Guardando...' : 'Guardar'}</button></div>
                    </form>
                  ) : (
                    <button onClick={() => setEditingProvider(true)} className="w-full mt-3 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1"><Briefcase className="w-4 h-4" /> Editar presentación pública</button>
                  )}
                </section>

                {!currentProvider.verificado && (
                  <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentProvider.estado_verificacion === 'pendiente' ? 'bg-amber-50' : currentProvider.estado_verificacion === 'rechazado' ? 'bg-rose-50' : 'bg-slate-100'}`}>
                        <BadgeCheck className={`w-5 h-5 ${currentProvider.estado_verificacion === 'pendiente' ? 'text-amber-600' : currentProvider.estado_verificacion === 'rechazado' ? 'text-rose-600' : 'text-slate-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-bold text-slate-700 uppercase">Verificación</h3>
                        {currentProvider.estado_verificacion === 'pendiente' ? (
                          <p className="text-[11px] text-amber-700 mt-1">Tu solicitud está pendiente de revisión{currentProvider.verificacion_solicitada_at ? ` desde ${formatDate(currentProvider.verificacion_solicitada_at)}` : ''}.</p>
                        ) : currentProvider.estado_verificacion === 'rechazado' ? (
                          <p className="text-[11px] text-rose-700 mt-1">La última solicitud no fue aprobada. Puedes corregir tu perfil y solicitar una nueva revisión.</p>
                        ) : (
                          <p className="text-[11px] text-slate-500 mt-1">Solicita una revisión manual para obtener la insignia.</p>
                        )}
                        {currentProvider.verificacion_observacion && <p className="text-[10px] text-slate-500 mt-2 bg-slate-50 border border-slate-100 rounded-lg p-2"><b>Observación:</b> {currentProvider.verificacion_observacion}</p>}
                      </div>
                    </div>
                    {currentProvider.estado_verificacion !== 'pendiente' && (
                      <button type="button" disabled={verificationSaving} onClick={() => void handleRequestVerification()} className="w-full mt-3 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:bg-slate-300">
                        {verificationSaving ? 'Enviando...' : currentProvider.estado_verificacion === 'rechazado' ? 'Solicitar nueva revisión' : 'Solicitar verificación'}
                      </button>
                    )}
                  </section>
                )}
              </>
            )}

            {providerSection === 'agenda' && (
              <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1"><Clock className="w-4 h-4" /> Disponibilidad y agenda</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Configura aquí tus horarios. Esta información será visible para los clientes.</p>
                  </div>
                  {currentProvider.disponibilidad ? (
                    <span className={`px-2 py-1 rounded-full border text-[9px] font-bold whitespace-nowrap ${PROVIDER_AVAILABILITY_CLASSES[currentProvider.disponibilidad]}`}>{PROVIDER_AVAILABILITY_LABELS[currentProvider.disponibilidad]}</span>
                  ) : null}
                </div>
                <form onSubmit={handleAvailabilityUpdate} className="mt-3 flex flex-col gap-2.5">
                  <label className="text-[11px] font-bold text-slate-600">Estado actual
                    <select value={availabilityStatus} onChange={(event) => setAvailabilityStatus(event.target.value as DisponibilidadProveedor)} className="mt-1 w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      {PROVIDER_AVAILABILITY_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="text-[11px] font-bold text-slate-600">Referencia adicional <span className="text-slate-400 font-normal">(opcional)</span>
                    <input value={availabilityHours} onChange={(event) => setAvailabilityHours(event.target.value)} maxLength={120} placeholder="Ej. Urgencias fuera de horario por coordinar" className="mt-1 w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex items-start gap-2 mb-3">
                      <CalendarDays className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div><p className="text-[11px] font-bold text-slate-700">Agenda semanal</p><p className="text-[10px] text-slate-400 mt-0.5">Activa solo los días en que atiendes.</p></div>
                    </div>
                    <div className="space-y-2">
                      {WEEKLY_SCHEDULE_DAYS.map(({ id, label, shortLabel }) => {
                        const slot = weeklySchedule[id];
                        return (
                          <div key={id} className={`grid grid-cols-[58px_1fr_1fr] gap-2 items-center rounded-xl p-2 border ${slot.activo ? 'bg-white border-emerald-100' : 'bg-slate-100/70 border-slate-200'}`}>
                            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={slot.activo} onChange={(event) => updateWeeklyScheduleDay(id, { activo: event.target.checked })} className="accent-emerald-600" /><span className="text-[10px] font-bold text-slate-600 sm:hidden">{shortLabel}</span><span className="text-[10px] font-bold text-slate-600 hidden sm:inline">{label}</span></label>
                            <input type="time" value={slot.desde} disabled={!slot.activo} onChange={(event) => updateWeeklyScheduleDay(id, { desde: event.target.value })} aria-label={`Hora de inicio ${label}`} className="min-w-0 w-full text-[10px] p-2 bg-white border border-slate-200 rounded-lg disabled:bg-slate-100 disabled:text-slate-400" />
                            <input type="time" value={slot.hasta} disabled={!slot.activo} onChange={(event) => updateWeeklyScheduleDay(id, { hasta: event.target.value })} aria-label={`Hora de término ${label}`} className="min-w-0 w-full text-[10px] p-2 bg-white border border-slate-200 rounded-lg disabled:bg-slate-100 disabled:text-slate-400" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button disabled={availabilitySaving} className="py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 disabled:bg-slate-300"><Save className="w-3.5 h-3.5" /> {availabilitySaving ? 'Guardando...' : 'Actualizar disponibilidad'}</button>
                </form>
              </section>
            )}

            {providerSection === 'trabajos' && (
              <>
                <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-3">
                  <div className="flex justify-between items-center"><h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1"><ImageIcon className="w-4 h-4" /> Portafolio ({currentProvider.fotos_trabajos.length}/12)</h3><button onClick={() => setPhotoUiOpened((open) => !open)} className="p-1.5 rounded-full bg-slate-100"><Plus className="w-4 h-4" /></button></div>
                  {photoUiOpened && <form onSubmit={handleAddWorkPhoto} className="mt-3 flex gap-2"><input type="url" value={newPhotoUrl} onChange={(event) => setNewPhotoUrl(event.target.value)} maxLength={500} required placeholder="https://..." className="flex-1 min-w-0 text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl" /><button disabled={photoSaving} className="px-3 bg-slate-900 text-white text-xs font-bold rounded-xl">Añadir</button></form>}
                  {currentProvider.fotos_trabajos.length ? <div className="grid grid-cols-3 gap-2 mt-3">{currentProvider.fotos_trabajos.map((photo, index) => <div key={`${photo}-${index}`} className="relative group"><img src={photo} alt={`Trabajo ${index + 1}`} className="rounded-xl h-20 w-full object-cover" /><button disabled={photoSaving} onClick={() => void handleRemoveWorkPhoto(index)} className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white" aria-label="Eliminar foto"><Trash2 className="w-3 h-3" /></button></div>)}</div> : <p className="text-[11px] italic text-slate-400 py-4 text-center bg-slate-50 rounded-xl mt-3">Todavía no has agregado trabajos a tu portafolio.</p>}
                </section>

                <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">Reseñas recibidas ({receivedReviews.length})</h3>
                  {reviewsLoading ? <p className="text-xs text-slate-400 py-4 text-center">Cargando...</p> : receivedReviews.length ? <div className="flex flex-col gap-3">{receivedReviews.map((review) => <article key={review.id} className="border-b border-slate-100 pb-3 last:border-0"><div className="flex justify-between"><span className="font-bold text-xs text-slate-700">{review.cliente_nombre}</span><span className="flex">{Array.from({ length: review.calificacion }).map((_, index) => <Star key={index} className="w-3 h-3 fill-amber-500 text-amber-500" />)}</span></div>{review.comentario && <p className="text-xs text-slate-500 mt-1">“{review.comentario}”</p>}</article>)}</div> : <p className="text-[11px] italic text-slate-400 text-center py-4 bg-slate-50 rounded-xl">Todavía no has recibido reseñas verificadas.</p>}
                </section>
              </>
            )}

            {providerSection === 'estadisticas' && (
              <>
                <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-3">
                  <div className="flex items-center justify-between gap-2"><div><h3 className="text-xs font-black text-slate-700 uppercase">Mi rendimiento</h3><p className="text-[10px] text-slate-400 mt-0.5">Resumen calculado con tus solicitudes y reseñas reales.</p></div><Briefcase className="w-5 h-5 text-emerald-600" /></div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3"><ClipboardList className="w-4 h-4 text-slate-500" /><p className="text-xl font-black text-slate-800 mt-1">{providerStatsLoading ? '…' : providerStats.total}</p><p className="text-[9px] font-semibold text-slate-500">Solicitudes recibidas</p></div>
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><p className="text-xl font-black text-slate-800 mt-1">{providerStatsLoading ? '…' : providerStats.completed}</p><p className="text-[9px] font-semibold text-slate-500">Trabajos completados</p></div>
                    <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3"><User className="w-4 h-4 text-amber-600" /><p className="text-xl font-black text-slate-800 mt-1">{providerStatsLoading ? '…' : providerStats.attendedClients}</p><p className="text-[9px] font-semibold text-slate-500">Clientes atendidos</p></div>
                    <div className="rounded-2xl bg-rose-50 border border-rose-100 p-3"><Star className="w-4 h-4 text-rose-500" /><p className="text-xl font-black text-slate-800 mt-1">{providerStatsLoading ? '…' : providerStats.rating ? providerStats.rating.toFixed(1) : '—'}</p><p className="text-[9px] font-semibold text-slate-500">Calificación promedio</p></div>
                  </div>
                </section>

                <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-3">
                  <div className="flex items-center justify-between"><div><p className="text-xs font-bold text-slate-700">Tasa de aceptación</p><p className="text-[10px] text-slate-400 mt-0.5">Aceptadas frente a rechazadas. Las pendientes y canceladas no se cuentan.</p></div><span className="text-lg font-black text-emerald-600">{providerStatsLoading ? '…' : `${providerStats.acceptanceRate}%`}</span></div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-3"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(providerStats.acceptanceRate, 100)}%` }} /></div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="rounded-xl bg-slate-50 p-2"><p className="font-black text-sm text-slate-800">{providerStats.active}</p><p className="text-[9px] text-slate-500">Activas</p></div>
                    <div className="rounded-xl bg-slate-50 p-2"><p className="font-black text-sm text-slate-800">{providerStats.accepted}</p><p className="text-[9px] text-slate-500">Aceptadas</p></div>
                    <div className="rounded-xl bg-slate-50 p-2"><p className="font-black text-sm text-slate-800">{providerStats.rejected}</p><p className="text-[9px] text-slate-500">Rechazadas</p></div>
                  </div>
                </section>

                <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-3">
                  <div className="flex items-center justify-between"><h3 className="text-xs font-bold text-slate-700 uppercase">Reseñas</h3><span className="text-[10px] text-slate-400">{receivedReviews.length} recibidas</span></div>
                  <div className="flex items-center gap-3 mt-3"><div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center"><Star className="w-6 h-6 text-amber-500 fill-amber-500" /></div><div><p className="text-2xl font-black text-slate-800">{providerStats.rating ? providerStats.rating.toFixed(1) : '—'}</p><p className="text-[10px] text-slate-400">Promedio de calificación</p></div></div>
                  <button type="button" onClick={() => setProviderSection('trabajos')} className="w-full mt-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Ver reseñas y portafolio</button>
                </section>
              </>
            )}
          </>
        )}




        {currentUser.tipo_usuario === 'admin' && (
          <section className="mt-4 bg-slate-900 text-white rounded-2xl p-4"><div className="flex items-start gap-2"><Info className="w-4 h-4 text-emerald-400 shrink-0" /><p className="text-xs text-white/75">Tu cuenta tiene acceso al panel administrativo. Usa la pestaña Admin para verificar proveedores y revisar la actividad general.</p></div></section>
        )}

        <button onClick={() => void handleSignOut()} className="w-full py-2.5 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 mt-4"><LogOut className="w-4 h-4" /> Cerrar sesión</button>
      </main>
      {legalOpen && <LegalCenter countryCode={currentUser.pais_codigo || 'CL'} initialSection={legalInitialSection} onClose={() => setLegalOpen(false)} />}
      {privacyCenterOpen && currentUser && currentUser.tipo_usuario !== 'admin' && <PrivacyRightsCenter currentUser={currentUser} onClose={() => setPrivacyCenterOpen(false)} />}
    </div>
  );
}
