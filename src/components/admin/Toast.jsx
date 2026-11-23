// Kısa bildirim şeridi (sağ altta, birkaç saniye görünür). Tarayıcı alert() yerine kullanılır.
import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div role="status" className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4 text-indigo-300" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
