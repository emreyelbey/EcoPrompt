// Geçici ekran: öğrenci sohbeti (Dilim 3) ve yönetici paneli (Dilim 6) gelene kadar
// girişin çalıştığını gösteren sade bir sayfa. Düzen kuralları proje rehberi Bölüm 8'e uyar.
import { LogOut } from 'lucide-react';

export default function Placeholder({ title, lines, onLogout }) {
  return (
    <div className="fixed inset-0 w-full h-full flex flex-col overflow-hidden bg-slate-50 text-slate-800">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
        <span className="font-semibold truncate">{title}</span>
        <button
          type="button"
          onClick={onLogout}
          className="shrink-0 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Çıkış</span>
        </button>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-4">
        <div className="text-center space-y-1 text-slate-500">
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </main>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-2 text-center text-xs text-slate-400">
        TÜBİTAK 2204-A Lise Araştırma Projesi
      </footer>
    </div>
  );
}
