import React from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';
import { useSmartPool } from '../context/SmartPoolContext';

export const ToastStack: React.FC = () => {
  const { toasts, dismissToast } = useSmartPool();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 right-3 left-3 sm:left-auto sm:right-5 sm:bottom-5 z-[60] flex flex-col gap-2 sm:w-[360px] pointer-events-none"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.tone === 'success'
            ? CheckCircle2
            : toast.tone === 'danger'
            ? ShieldAlert
            : toast.tone === 'warning'
            ? AlertTriangle
            : Info;

        const cls =
          toast.tone === 'success'
            ? 'bg-[#0A192F] border-emerald-400 text-white'
            : toast.tone === 'danger'
            ? 'bg-red-950 border-red-400 text-white'
            : toast.tone === 'warning'
            ? 'bg-amber-950 border-amber-400 text-white'
            : 'bg-slate-900 border-sky-400 text-white';

        const iconCls =
          toast.tone === 'success'
            ? 'text-emerald-400'
            : toast.tone === 'danger'
            ? 'text-red-400'
            : toast.tone === 'warning'
            ? 'text-amber-400'
            : 'text-sky-400';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border-l-4 px-3.5 py-3 shadow-2xl flex items-start gap-2.5 animate-slide-up ${cls}`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconCls}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold leading-tight">{toast.title}</p>
              {toast.message && (
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
