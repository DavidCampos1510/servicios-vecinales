import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { MapPin } from 'lucide-react';
import { normalizeSearch } from '../constants';
import { CHILE_COMMUNES, type ChileCommune } from '../data/chileCommunes';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  className?: string;
  inputClassName?: string;
  showIcon?: boolean;
  maxSuggestions?: number;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Escribe una comuna',
  required = false,
  maxLength = 120,
  className = '',
  inputClassName = '',
  showIcon = true,
  maxSuggestions = 8,
}: LocationAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(() => {
    const term = normalizeSearch(value);
    if (term.length < 2) return [];

    return CHILE_COMMUNES
      .filter((location) => {
        const comuna = normalizeSearch(location.comuna);
        const region = normalizeSearch(location.region);
        const label = normalizeSearch(location.label);
        return comuna.includes(term) || region.includes(term) || label.includes(term);
      })
      .sort((a, b) => {
        const aComuna = normalizeSearch(a.comuna);
        const bComuna = normalizeSearch(b.comuna);
        const aStarts = aComuna.startsWith(term) ? 0 : 1;
        const bStarts = bComuna.startsWith(term) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.comuna.localeCompare(b.comuna, 'es');
      })
      .slice(0, maxSuggestions);
  }, [value, maxSuggestions]);

  const selectLocation = (location: ChileCommune) => {
    onChange(location.label);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectLocation(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {showIcon && (
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-[1] pointer-events-none" />
      )}
      <input
        type="search"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        className={`${showIcon ? 'pl-9' : 'pl-3'} pr-3 ${inputClassName} sv-form-field`}
      />

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto sv-card">
          {suggestions.map((location, index) => (
            <button
              key={`${location.comuna}-${location.region}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectLocation(location)}
              className={`w-full px-3 py-2.5 text-left border-b border-slate-100 last:border-0 transition-colors ${
                activeIndex === index ? 'bg-emerald-50' : 'bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{location.comuna}</p>
                  <p className="text-[10px] text-slate-500 truncate">{location.region}, Chile</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
