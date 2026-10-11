import { useMemo, useState } from 'react';
import { ChevronLeft, FileText, ShieldCheck, Scale, X } from 'lucide-react';
import { getCountryConfig } from '../data/countries';
import {
  LEGAL_POLICIES_VERSION,
  getLegalSections,
  type LegalSectionId,
} from '../legalPolicies';

interface LegalCenterProps {
  initialSection?: LegalSectionId;
  countryCode?: string;
  onClose: () => void;
}

const ICONS = {
  terminos: Scale,
  privacidad: ShieldCheck,
  normas: FileText,
} as const;

export function LegalCenter({ initialSection = 'terminos', countryCode = 'CL', onClose }: LegalCenterProps) {
  const [activeSection, setActiveSection] = useState<LegalSectionId>(initialSection);
  const sections = useMemo(() => getLegalSections(countryCode), [countryCode]);
  const content = sections.find((section) => section.id === activeSection) ?? sections[0];
  const ActiveIcon = ICONS[activeSection];
  const country = getCountryConfig(countryCode);

  return (
    <div className="absolute inset-0 z-[90] bg-slate-950/35 flex items-end sm:items-center justify-center">
      <section className="w-full h-[94%] sm:h-[88%] max-w-lg sv-screen rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden flex flex-col sv-modal">
        <header className="h-14 px-4 bg-emerald-600 text-white flex items-center justify-between shrink-0 sv-header">
          <div className="flex items-center gap-2 min-w-0">
            <button type="button" onClick={onClose} className="p-1.5 rounded-xl bg-white/10" aria-label="Volver"><ChevronLeft className="w-4 h-4" /></button>
            <div className="min-w-0">
              <p className="font-black text-sm truncate">Legal y privacidad</p>
              <p className="text-[9px] text-white/75">{country.flag} {country.name} · versión {LEGAL_POLICIES_VERSION}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl bg-white/10" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </header>

        <nav className="grid grid-cols-3 gap-1.5 p-3 bg-white border-b border-slate-100 shrink-0">
          {sections.map((section) => {
            const Icon = ICONS[section.id];
            const selected = section.id === activeSection;
            return (
              <button type="button" key={section.id} onClick={() => setActiveSection(section.id)} className={`rounded-xl border px-1.5 py-2 flex flex-col items-center gap-1 ${selected ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                <Icon className="w-4 h-4" /><span className="text-[9px] font-bold">{section.shortTitle}</span>
              </button>
            );
          })}
        </nav>

        <main className="flex-1 overflow-y-auto px-4 py-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sv-card">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center"><ActiveIcon className="w-5 h-5 text-emerald-600" /></div>
            <h2 className="text-base font-black text-slate-800 mt-3">{content.title}</h2>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1.5">{content.intro}</p>
          </div>
          <div className="space-y-3 mt-3">
            {content.sections.map((section) => (
              <article key={section.title} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm sv-card">
                <h3 className="text-xs font-black text-slate-700">{section.title}</h3>
                <div className="space-y-2 mt-2">{section.paragraphs.map((paragraph) => <p key={paragraph} className="text-[11px] text-slate-500 leading-relaxed">{paragraph}</p>)}</div>
              </article>
            ))}
          </div>
          <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-3">
            <p className="text-[10px] text-amber-800 leading-relaxed">Estos textos son una base técnica adaptada al país seleccionado. Antes de un lanzamiento comercial amplio conviene revisar la versión definitiva con asesoría jurídica en las jurisdicciones donde opere la plataforma.</p>
          </div>
        </main>
      </section>
    </div>
  );
}
