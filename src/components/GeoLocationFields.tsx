import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import {
  DEFAULT_COUNTRY_CODE,
  SUPPORTED_COUNTRIES,
  getChileCommunesForRegion,
  getCountryConfig,
  getRegionConfig,
  type SupportedCountryCode,
} from '../data/countries';

interface GeoLocationFieldsProps {
  countryCode: SupportedCountryCode;
  regionCode: string;
  locality: string;
  onCountryChange: (country: SupportedCountryCode) => void;
  onRegionChange: (regionCode: string) => void;
  onLocalityChange: (locality: string) => void;
  required?: boolean;
  compact?: boolean;
}

export function GeoLocationFields({
  countryCode,
  regionCode,
  locality,
  onCountryChange,
  onRegionChange,
  onLocalityChange,
  required = true,
  compact = false,
}: GeoLocationFieldsProps) {
  const country = getCountryConfig(countryCode || DEFAULT_COUNTRY_CODE);
  const selectedRegion = getRegionConfig(country.code, regionCode);
  const chileCommunes = useMemo(
    () => country.code === 'CL' && selectedRegion ? getChileCommunesForRegion(selectedRegion.name) : [],
    [country.code, selectedRegion?.name],
  );

  const inputClass = compact
    ? 'w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 sv-form-field'
    : 'w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 sv-form-field';

  return (
    <div className="space-y-2.5">
      <label className="block text-[11px] font-bold text-slate-600">País
        <select
          value={country.code}
          required={required}
          onChange={(event) => {
            const next = event.target.value as SupportedCountryCode;
            onCountryChange(next);
            onRegionChange('');
            onLocalityChange('');
          }}
          className={`${inputClass} mt-1`}
        >
          {SUPPORTED_COUNTRIES.map((item) => (
            <option key={item.code} value={item.code}>{item.flag} {item.name}</option>
          ))}
        </select>
      </label>

      <label className="block text-[11px] font-bold text-slate-600">{country.regionLabel}
        <select
          value={regionCode}
          required={required}
          onChange={(event) => {
            onRegionChange(event.target.value);
            onLocalityChange('');
          }}
          className={`${inputClass} mt-1`}
        >
          <option value="">Selecciona {country.regionLabel.toLowerCase()}</option>
          {country.regions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
      </label>

      <label className="block text-[11px] font-bold text-slate-600">{country.localityLabel}
        <div className="relative mt-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            list={country.code === 'CL' && regionCode ? 'sv-chile-localities' : undefined}
            value={locality}
            onChange={(event) => onLocalityChange(event.target.value)}
            placeholder={country.code === 'CL' ? 'Ej. San Antonio' : `Escribe ${country.localityLabel.toLowerCase()}`}
            required={required}
            minLength={2}
            maxLength={100}
            autoComplete="address-level2"
            className={`${inputClass} pl-9`}
          />
          {country.code === 'CL' && regionCode && (
            <datalist id="sv-chile-localities">
              {chileCommunes.map((commune) => <option key={commune} value={commune} />)}
            </datalist>
          )}
        </div>
        {country.code !== 'CL' && (
          <span className="block text-[9px] text-slate-400 mt-1">Escribe tu {country.localityLabel.toLowerCase()} tal como se conoce localmente.</span>
        )}
      </label>
    </div>
  );
}
