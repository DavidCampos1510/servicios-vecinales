import { useEffect, useState } from 'react';
import { Eye, Monitor, Moon, Sun, Type } from 'lucide-react';
import {
  getAccessibilityPreferences,
  saveAccessibilityPreferences,
  subscribeAccessibilityPreferences,
  type AccessibilityPreferences,
  type TextSizePreference,
  type ThemePreference,
} from '../state/accessibilityPreferences';

const THEME_OPTIONS: Array<{ id: ThemePreference; label: string; icon: typeof Sun }> = [
  { id: 'system', label: 'Sistema', icon: Monitor },
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'dark', label: 'Oscuro', icon: Moon },
];

const TEXT_OPTIONS: Array<{ id: TextSizePreference; label: string }> = [
  { id: 'normal', label: 'Normal' },
  { id: 'large', label: 'Grande' },
];

export function AccessibilityPreferencesPanel({ compact = false }: { compact?: boolean }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(getAccessibilityPreferences);

  useEffect(() => subscribeAccessibilityPreferences(setPreferences), []);

  const updateTheme = (theme: ThemePreference) => {
    const next = { ...preferences, theme };
    setPreferences(next);
    saveAccessibilityPreferences(next);
  };

  const updateTextSize = (textSize: TextSizePreference) => {
    const next = { ...preferences, textSize };
    setPreferences(next);
    saveAccessibilityPreferences(next);
  };

  return (
    <section className={`bg-white rounded-2xl shadow-sm border border-slate-100 sv-card ${compact ? 'p-3' : 'p-4'}`} aria-labelledby="sv-accessibility-title">
      <div className="flex items-start gap-2">
        <Eye className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h3 id="sv-accessibility-title" className="text-xs font-black text-slate-700">Apariencia y accesibilidad</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Estos ajustes se guardan solo en este dispositivo.</p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-bold text-slate-600 mb-1.5">Tema</p>
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Seleccionar tema de la aplicación">
          {THEME_OPTIONS.map(({ id, label, icon: Icon }) => {
            const active = preferences.theme === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => updateTheme(id)}
                className={`min-h-10 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors ${active ? 'sv-chip-active' : 'sv-chip-inactive'}`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Type className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          <p className="text-[10px] font-bold text-slate-600">Tamaño de texto</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Seleccionar tamaño de texto">
          {TEXT_OPTIONS.map(({ id, label }) => {
            const active = preferences.textSize === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => updateTextSize(id)}
                className={`min-h-10 rounded-xl border font-bold ${id === 'large' ? 'text-sm' : 'text-[10px]'} ${active ? 'sv-chip-active' : 'sv-chip-inactive'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
