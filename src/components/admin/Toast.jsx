// Kısa bildirim şeridi (sağ altta, birkaç saniye görünür). Tarayıcı alert() yerine kullanılır.
// Mobilde iki kenardan 20 px içeride tam genişlik; geniş ekranda sağ altta, en fazla 28rem.
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
    <div role="status" className="fixed bottom-5 left-5 right-5 sm:left-auto sm:max-w-md z-50 px-4 py-2.5 rounded-2xl bg-ink text-paper text-xs font-semibold shadow-xl flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4 shrink-0 text-accent" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
