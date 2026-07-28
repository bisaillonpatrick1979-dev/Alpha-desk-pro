import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  tone: 'success' | 'warning' | 'error' | 'info';
}

interface ToasterProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const TONE_STYLES: Record<ToastMessage['tone'], { border: string; text: string; Icon: typeof Info }> = {
  success: { border: 'border-emerald-500/40 bg-emerald-500/10', text: 'text-emerald-300', Icon: CheckCircle2 },
  warning: { border: 'border-amber-500/40 bg-amber-500/10', text: 'text-amber-300', Icon: AlertTriangle },
  error: { border: 'border-rose-500/40 bg-rose-500/10', text: 'text-rose-300', Icon: XCircle },
  info: { border: 'border-white/15 bg-white/5', text: 'text-white/80', Icon: Info },
};

const Toast: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 6000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const { border, text, Icon } = TONE_STYLES[toast.tone];

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border backdrop-blur-md shadow-2xl text-xs max-w-sm ${border} ${text}`}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="flex-1 leading-relaxed">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-all shrink-0"
        aria-label="Fermer la notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/**
 * Notifications non bloquantes.
 *
 * Remplace les `alert()` qui gelaient l'onglet : sur un tableau de bord dont le
 * flux de prix tourne en continu, une boîte de dialogue modale native fige aussi
 * les timers et fausse la simulation.
 */
export const Toaster: React.FC<ToasterProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.slice(-4).map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
