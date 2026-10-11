import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no controlado al renderizar Servicios Vecinales', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-screen bg-slate-950 p-5 flex items-center justify-center">
        <section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-rose-100">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <h1 className="mt-4 text-center text-lg font-bold text-slate-800">La aplicación encontró un error</h1>
          <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">
            Ya no ocultamos los errores con una pantalla blanca. Revisa el mensaje inferior y la consola del navegador.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-3 text-[10px] text-rose-200">
            {this.state.error.message || String(this.state.error)}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Recargar aplicación
          </button>
        </section>
      </main>
    );
  }
}
