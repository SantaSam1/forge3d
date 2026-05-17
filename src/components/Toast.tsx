import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastData; onRemove: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onRemove]);

  return (
    <div className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-gray-800 border border-white/10 rounded-xl shadow-2xl min-w-[260px] max-w-sm animate-in">
      {toast.type === 'success' ? (
        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
      ) : toast.type === 'error' ? (
        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
      ) : null}
      <span className="text-gray-200 text-sm flex-1">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="text-gray-500 hover:text-gray-300">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
