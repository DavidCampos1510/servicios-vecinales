import type { ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { CheckCircle, WifiOff } from 'lucide-react';
import { MobileStatusBar } from './MobileStatusBar';
import { isRealFirebaseConfigured } from '../state/databaseService';

interface PhoneFrameProps {
  children: ReactNode;
}

export function PhoneFrame({ children }: PhoneFrameProps) {
  const hasRealFirebase = isRealFirebaseConfigured();
  const isNativeApp = Capacitor.isNativePlatform();

  // En Android/iOS la WebView YA es el teléfono. No debemos volver a dibujar
  // el marco de demostración que se usa en la versión web de escritorio.
  if (isNativeApp) {
    return (
      <div className="native-app-shell font-sans sv-screen">
        {children}
      </div>
    );
  }

  // Vista de demostración para navegador de escritorio.
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#e7efeb] p-2 sm:p-6 font-sans">
      <div className="text-center mb-4 max-w-md select-none text-slate-500">
        <h1 className="text-xl font-black text-[#143453] flex items-center justify-center gap-2">
          <span>Servicios Vecinales</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-mono">v2.6</span>
        </h1>
        <p className="text-xs mt-1 text-slate-500">Red comunitaria de servicios verificados</p>
        <div className="mt-2.5 flex items-center justify-center gap-2">
          {hasRealFirebase ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[11px] font-mono">
              <CheckCircle className="w-3.5 h-3.5" /> Firebase conectado
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25 text-[11px] font-mono">
              <WifiOff className="w-3.5 h-3.5" /> Modo local · revisa .env
            </div>
          )}
        </div>
      </div>

      <div className="relative w-full max-w-[420px] h-[850px] sm:h-[840px] rounded-[48px] bg-[#0b1f2e] shadow-2xl border-[10px] border-[#10283a] flex flex-col overflow-hidden">
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-950 rounded-full z-50 flex items-center justify-center">
          <div className="w-12 h-1.5 bg-neutral-900 rounded-full" />
        </div>
        <MobileStatusBar />
        <div className="flex-1 overflow-hidden relative flex flex-col sv-screen rounded-b-[38px]">
          {children}
        </div>
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-neutral-950 rounded-full z-40 pointer-events-none opacity-40" />
      </div>
      <div className="mt-4 text-center max-w-sm text-[11px] text-neutral-500">React, Firebase, PWA y Capacitor.</div>
    </div>
  );
}
