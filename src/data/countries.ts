import { CHILE_COMMUNES } from './chileCommunes';

export type SupportedCountryCode = 'CL' | 'AR' | 'MX' | 'CO' | 'PE';

export interface RegionOption {
  code: string;
  name: string;
}

export interface CountryConfig {
  code: SupportedCountryCode;
  name: string;
  flag: string;
  phonePrefix: string;
  currencyCode: 'CLP' | 'ARS' | 'MXN' | 'COP' | 'PEN';
  currencySymbol: string;
  locale: string;
  regionLabel: string;
  localityLabel: string;
  regions: RegionOption[];
}

const region = (code: string, name: string): RegionOption => ({ code, name });

export const SUPPORTED_COUNTRIES: CountryConfig[] = [
  {
    code: 'CL', name: 'Chile', flag: '🇨🇱', phonePrefix: '+56', currencyCode: 'CLP', currencySymbol: '$', locale: 'es-CL',
    regionLabel: 'Región', localityLabel: 'Comuna',
    regions: [
      region('CL-AP', 'Región de Arica y Parinacota'), region('CL-TA', 'Región de Tarapacá'),
      region('CL-AN', 'Región de Antofagasta'), region('CL-AT', 'Región de Atacama'),
      region('CL-CO', 'Región de Coquimbo'), region('CL-VS', 'Región de Valparaíso'),
      region('CL-RM', 'Región Metropolitana de Santiago'), region('CL-LI', "Región del Libertador General Bernardo O'Higgins"),
      region('CL-ML', 'Región del Maule'), region('CL-NB', 'Región de Ñuble'),
      region('CL-BI', 'Región del Biobío'), region('CL-AR', 'Región de La Araucanía'),
      region('CL-LR', 'Región de Los Ríos'), region('CL-LL', 'Región de Los Lagos'),
      region('CL-AI', 'Región de Aysén del General Carlos Ibáñez del Campo'),
      region('CL-MA', 'Región de Magallanes y de la Antártica Chilena'),
    ],
  },
  {
    code: 'AR', name: 'Argentina', flag: '🇦🇷', phonePrefix: '+54', currencyCode: 'ARS', currencySymbol: '$', locale: 'es-AR',
    regionLabel: 'Provincia', localityLabel: 'Municipio / localidad',
    regions: [
      region('AR-C', 'Ciudad Autónoma de Buenos Aires'), region('AR-B', 'Buenos Aires'), region('AR-K', 'Catamarca'),
      region('AR-H', 'Chaco'), region('AR-U', 'Chubut'), region('AR-X', 'Córdoba'), region('AR-W', 'Corrientes'),
      region('AR-E', 'Entre Ríos'), region('AR-P', 'Formosa'), region('AR-Y', 'Jujuy'), region('AR-L', 'La Pampa'),
      region('AR-F', 'La Rioja'), region('AR-M', 'Mendoza'), region('AR-N', 'Misiones'), region('AR-Q', 'Neuquén'),
      region('AR-R', 'Río Negro'), region('AR-A', 'Salta'), region('AR-J', 'San Juan'), region('AR-D', 'San Luis'),
      region('AR-Z', 'Santa Cruz'), region('AR-S', 'Santa Fe'), region('AR-G', 'Santiago del Estero'),
      region('AR-V', 'Tierra del Fuego, Antártida e Islas del Atlántico Sur'), region('AR-T', 'Tucumán'),
    ],
  },
  {
    code: 'MX', name: 'México', flag: '🇲🇽', phonePrefix: '+52', currencyCode: 'MXN', currencySymbol: '$', locale: 'es-MX',
    regionLabel: 'Estado', localityLabel: 'Municipio / alcaldía',
    regions: [
      region('MX-AGU', 'Aguascalientes'), region('MX-BCN', 'Baja California'), region('MX-BCS', 'Baja California Sur'),
      region('MX-CAM', 'Campeche'), region('MX-CHP', 'Chiapas'), region('MX-CHH', 'Chihuahua'),
      region('MX-CMX', 'Ciudad de México'), region('MX-COA', 'Coahuila'), region('MX-COL', 'Colima'),
      region('MX-DUR', 'Durango'), region('MX-GUA', 'Guanajuato'), region('MX-GRO', 'Guerrero'),
      region('MX-HID', 'Hidalgo'), region('MX-JAL', 'Jalisco'), region('MX-MEX', 'Estado de México'),
      region('MX-MIC', 'Michoacán'), region('MX-MOR', 'Morelos'), region('MX-NAY', 'Nayarit'),
      region('MX-NLE', 'Nuevo León'), region('MX-OAX', 'Oaxaca'), region('MX-PUE', 'Puebla'),
      region('MX-QUE', 'Querétaro'), region('MX-ROO', 'Quintana Roo'), region('MX-SLP', 'San Luis Potosí'),
      region('MX-SIN', 'Sinaloa'), region('MX-SON', 'Sonora'), region('MX-TAB', 'Tabasco'),
      region('MX-TAM', 'Tamaulipas'), region('MX-TLA', 'Tlaxcala'), region('MX-VER', 'Veracruz'),
      region('MX-YUC', 'Yucatán'), region('MX-ZAC', 'Zacatecas'),
    ],
  },
  {
    code: 'CO', name: 'Colombia', flag: '🇨🇴', phonePrefix: '+57', currencyCode: 'COP', currencySymbol: '$', locale: 'es-CO',
    regionLabel: 'Departamento', localityLabel: 'Municipio / distrito',
    regions: [
      region('CO-AMA', 'Amazonas'), region('CO-ANT', 'Antioquia'), region('CO-ARA', 'Arauca'),
      region('CO-ATL', 'Atlántico'), region('CO-BOG', 'Bogotá, D.C.'), region('CO-BOL', 'Bolívar'),
      region('CO-BOY', 'Boyacá'), region('CO-CAL', 'Caldas'), region('CO-CAQ', 'Caquetá'),
      region('CO-CAS', 'Casanare'), region('CO-CAU', 'Cauca'), region('CO-CES', 'Cesar'),
      region('CO-CHO', 'Chocó'), region('CO-COR', 'Córdoba'), region('CO-CUN', 'Cundinamarca'),
      region('CO-GUA', 'Guainía'), region('CO-GUV', 'Guaviare'), region('CO-HUI', 'Huila'),
      region('CO-LAG', 'La Guajira'), region('CO-MAG', 'Magdalena'), region('CO-MET', 'Meta'),
      region('CO-NAR', 'Nariño'), region('CO-NSA', 'Norte de Santander'), region('CO-PUT', 'Putumayo'),
      region('CO-QUI', 'Quindío'), region('CO-RIS', 'Risaralda'), region('CO-SAP', 'San Andrés, Providencia y Santa Catalina'),
      region('CO-SAN', 'Santander'), region('CO-SUC', 'Sucre'), region('CO-TOL', 'Tolima'),
      region('CO-VAC', 'Valle del Cauca'), region('CO-VAU', 'Vaupés'), region('CO-VID', 'Vichada'),
    ],
  },
  {
    code: 'PE', name: 'Perú', flag: '🇵🇪', phonePrefix: '+51', currencyCode: 'PEN', currencySymbol: 'S/', locale: 'es-PE',
    regionLabel: 'Departamento', localityLabel: 'Distrito / localidad',
    regions: [
      region('PE-AMA', 'Amazonas'), region('PE-ANC', 'Áncash'), region('PE-APU', 'Apurímac'), region('PE-ARE', 'Arequipa'),
      region('PE-AYA', 'Ayacucho'), region('PE-CAJ', 'Cajamarca'), region('PE-CAL', 'Callao'), region('PE-CUS', 'Cusco'),
      region('PE-HUV', 'Huancavelica'), region('PE-HUC', 'Huánuco'), region('PE-ICA', 'Ica'), region('PE-JUN', 'Junín'),
      region('PE-LAL', 'La Libertad'), region('PE-LAM', 'Lambayeque'), region('PE-LIM', 'Lima'), region('PE-LOR', 'Loreto'),
      region('PE-MDD', 'Madre de Dios'), region('PE-MOQ', 'Moquegua'), region('PE-PAS', 'Pasco'), region('PE-PIU', 'Piura'),
      region('PE-PUN', 'Puno'), region('PE-SAM', 'San Martín'), region('PE-TAC', 'Tacna'), region('PE-TUM', 'Tumbes'),
      region('PE-UCA', 'Ucayali'),
    ],
  },
];

export const DEFAULT_COUNTRY_CODE: SupportedCountryCode = 'CL';

export function getCountryConfig(code?: string | null): CountryConfig {
  return SUPPORTED_COUNTRIES.find((country) => country.code === code) ?? SUPPORTED_COUNTRIES[0];
}

export function getRegionConfig(countryCode: string | undefined, regionCode: string | undefined): RegionOption | undefined {
  return getCountryConfig(countryCode).regions.find((regionItem) => regionItem.code === regionCode);
}

export function getChileCommunesForRegion(regionName: string): string[] {
  return CHILE_COMMUNES.filter((item) => item.region === regionName).map((item) => item.comuna);
}

export function buildLocationLabel(countryCode: string, regionCode: string, locality: string): string {
  const country = getCountryConfig(countryCode);
  const regionItem = country.regions.find((item) => item.code === regionCode);
  return [locality.trim(), regionItem?.name, country.name].filter(Boolean).join(', ');
}

export function normalizeLocationKey(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function formatPhoneForCountry(value: string, countryCode: string): string {
  const country = getCountryConfig(countryCode);
  const digits = value.replace(/\D/g, '');
  const prefixDigits = country.phonePrefix.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith(prefixDigits)) return `+${digits}`;
  return `${country.phonePrefix}${digits}`;
}

export function formatCurrencyForCountry(value: number, countryCode?: string | null): string {
  const country = getCountryConfig(countryCode);
  return new Intl.NumberFormat(country.locale, {
    style: 'currency',
    currency: country.currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}
