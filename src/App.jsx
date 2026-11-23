// Ana bileşen (Dilim 0 iskeleti). Sabit üst bilgi + kayan orta alan + sabit alt bilgi düzenini kurar.
// Sonraki dilimlerde giriş ekranı, sohbet ekranı ve yönetici paneli buraya bağlanacak.

export default function App() {
  return (
    // Tüm ekranı kaplayan, kendisi kaymayan ana kap (proje rehberi, Bölüm 8).
    <div className="fixed inset-0 w-full h-full flex flex-col overflow-hidden bg-slate-50 text-slate-800">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 font-semibold">
        Eğitim Asistanı
      </header>

      {/* Yalnızca bu orta alan kayar. */}
      <main className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-4">
        <p className="text-slate-500">Kurulum tamam.</p>
      </main>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-2 text-center text-xs text-slate-400">
        TÜBİTAK 2204-A Lise Araştırma Projesi
      </footer>
    </div>
  );
}
