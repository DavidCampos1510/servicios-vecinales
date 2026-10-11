export type ThemePreference = 'system' | 'light' | 'dark';
export type TextSizePreference = 'normal' | 'large';

export interface AccessibilityPreferences {
  theme: ThemePreference;
  textSize: TextSizePreference;
}

const STORAGE_KEY = 'sv_accessibility_preferences_v1';
const CHANGE_EVENT = 'sv-accessibility-change';
const STYLE_ID = 'sv-accessibility-runtime-styles';

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  theme: 'system',
  textSize: 'normal',
};

let systemThemeListenerInstalled = false;

function ensureRuntimeStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html.sv-dark { color-scheme: dark; }
    html.sv-dark body,
    html.sv-dark #root { background: #020617 !important; color: #e2e8f0 !important; }

    html.sv-dark .sv-screen,
    html.sv-dark .sv-auth-shell {
      background: #0b1220 !important;
      color: #e5edf5 !important;
    }
    html.sv-dark .sv-card,
    html.sv-dark .sv-panel,
    html.sv-dark .sv-search-panel,
    html.sv-dark .sv-provider-card,
    html.sv-dark .sv-auth-card,
    html.sv-dark .sv-profile-hero {
      background: #0f172a !important;
      border-color: #243247 !important;
      box-shadow: 0 10px 28px rgba(0,0,0,.28) !important;
    }
    html.sv-dark .sv-bottom-nav {
      background: rgba(15, 23, 42, .97) !important;
      border-color: #263348 !important;
    }
    html.sv-dark .sv-bottom-nav button[data-active="true"] {
      background: rgba(16, 185, 129, .12) !important;
    }
    html.sv-dark .sv-chip-inactive,
    html.sv-dark .sv-secondary {
      background: #111827 !important;
      border-color: #334155 !important;
      color: #cbd5e1 !important;
    }
    html.sv-dark .sv-form-field {
      background: #111827 !important;
      border-color: #334155 !important;
      color: #f1f5f9 !important;
    }

    html.sv-dark .bg-white { background-color: #0f172a !important; }
    html.sv-dark .bg-slate-50 { background-color: #111827 !important; }
    html.sv-dark .bg-slate-50\\/60,
    html.sv-dark .bg-slate-50\\/40 { background-color: rgba(17, 24, 39, 0.82) !important; }
    html.sv-dark .bg-slate-100 { background-color: #1e293b !important; }
    html.sv-dark .bg-slate-200 { background-color: #334155 !important; }
    html.sv-dark .bg-slate-900 { background-color: #020617 !important; }

    html.sv-dark .border-slate-100 { border-color: #1e293b !important; }
    html.sv-dark .border-slate-200 { border-color: #334155 !important; }
    html.sv-dark .border-white { border-color: #475569 !important; }

    html.sv-dark .text-slate-900,
    html.sv-dark .text-slate-800,
    html.sv-dark .text-slate-700 { color: #f1f5f9 !important; }
    html.sv-dark .text-slate-600 { color: #cbd5e1 !important; }
    html.sv-dark .text-slate-500,
    html.sv-dark .text-slate-400 { color: #94a3b8 !important; }

    html.sv-dark .bg-emerald-50 { background-color: rgba(6, 78, 59, 0.32) !important; }
    html.sv-dark .bg-emerald-50\\/40 { background-color: rgba(6, 78, 59, 0.22) !important; }
    html.sv-dark .border-emerald-100 { border-color: rgba(16, 185, 129, 0.35) !important; }
    html.sv-dark .text-emerald-700,
    html.sv-dark .text-emerald-800 { color: #6ee7b7 !important; }

    html.sv-dark .bg-amber-50 { background-color: rgba(120, 53, 15, 0.28) !important; }
    html.sv-dark .border-amber-100 { border-color: rgba(245, 158, 11, 0.35) !important; }
    html.sv-dark .text-amber-700,
    html.sv-dark .text-amber-800 { color: #fcd34d !important; }

    html.sv-dark .bg-rose-50 { background-color: rgba(127, 29, 29, 0.28) !important; }
    html.sv-dark .border-rose-100 { border-color: rgba(244, 63, 94, 0.35) !important; }
    html.sv-dark .text-rose-600,
    html.sv-dark .text-rose-700 { color: #fda4af !important; }

    html.sv-dark input,
    html.sv-dark textarea,
    html.sv-dark select {
      background-color: #111827 !important;
      color: #f1f5f9 !important;
      border-color: #334155 !important;
    }
    html.sv-dark input::placeholder,
    html.sv-dark textarea::placeholder { color: #64748b !important; }

    html.sv-dark nav.bg-white { background-color: #0f172a !important; }
    html.sv-dark .shadow-sm,
    html.sv-dark .shadow-md,
    html.sv-dark .shadow-lg,
    html.sv-dark .shadow-xl,
    html.sv-dark .shadow-2xl { --tw-shadow-color: rgba(0,0,0,.38) !important; }

    html.sv-text-large { font-size: 17px; }
    html.sv-text-large .text-\\[8px\\] { font-size: 10px !important; }
    html.sv-text-large .text-\\[9px\\] { font-size: 11px !important; }
    html.sv-text-large .text-\\[10px\\] { font-size: 12px !important; }
    html.sv-text-large .text-\\[11px\\] { font-size: 13px !important; }

    button:focus-visible,
    a:focus-visible,
    input:focus-visible,
    textarea:focus-visible,
    select:focus-visible,
    [tabindex]:focus-visible {
      outline: 3px solid #10b981 !important;
      outline-offset: 2px !important;
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export function getAccessibilityPreferences(): AccessibilityPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>;
    return {
      theme: parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system' ? parsed.theme : 'system',
      textSize: parsed.textSize === 'large' ? 'large' : 'normal',
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function applyAccessibilityPreferences(preferences: AccessibilityPreferences) {
  if (typeof document === 'undefined') return;
  ensureRuntimeStyles();

  const prefersDark = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const useDark = preferences.theme === 'dark'
    || (preferences.theme === 'system' && prefersDark);

  document.documentElement.classList.toggle('sv-dark', useDark);
  document.documentElement.classList.toggle('sv-text-large', preferences.textSize === 'large');
  document.documentElement.dataset.svTheme = preferences.theme;
  document.documentElement.dataset.svTextSize = preferences.textSize;
}

export function saveAccessibilityPreferences(preferences: AccessibilityPreferences) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }
  applyAccessibilityPreferences(preferences);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: preferences }));
  }
}

export function subscribeAccessibilityPreferences(callback: (preferences: AccessibilityPreferences) => void) {
  if (typeof window === 'undefined') return () => undefined;

  const handler = () => callback(getAccessibilityPreferences());
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function initializeAccessibilityPreferences() {
  const preferences = getAccessibilityPreferences();
  applyAccessibilityPreferences(preferences);

  if (typeof window !== 'undefined' && !systemThemeListenerInstalled && window.matchMedia) {
    systemThemeListenerInstalled = true;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const latest = getAccessibilityPreferences();
      if (latest.theme === 'system') applyAccessibilityPreferences(latest);
    };
    if (typeof media.addEventListener === 'function') media.addEventListener('change', handleSystemThemeChange);
    else if (typeof media.addListener === 'function') media.addListener(handleSystemThemeChange);
  }

  return preferences;
}
