// Deney tasarımı anlatımı: Ön Test – Son Test Kontrol Gruplu Kör Deney.
// YALNIZCA YÖNETİCİ PANELİNDE görünür. KÖR DENEY: bu dosya öğrenci ekranlarından (ChatScreen,
// MethodologyModal) asla import edilmez; tests/admin-ekran.test.jsx bunu denetler.
import { FlaskConical } from 'lucide-react';

export default function ExperimentDesignSection() {
  return (
    <section className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-sm text-indigo-950">
      <h3 className="font-bold flex items-center gap-2">
        <FlaskConical className="w-4 h-4" aria-hidden="true" />
        Araştırma Deseni: Ön Test – Son Test Kontrol Gruplu Kör Deney
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-indigo-900">
        Bu bölüm yalnızca yönetici panelinde görünür. Öğrencilerin Metodoloji penceresinde deney tasarımı anlatılmaz;
        böylece Kontrol grubu deneyin amacını tahmin edemez.
      </p>

      <ol className="mt-3 space-y-2 text-xs leading-relaxed list-decimal pl-4">
        <li>
          <strong>Katılımcılar:</strong> 60 kod. Kontrol grubu K001–K030, Deney grubu D001–D030. Her grupta 001–020 Asıl,
          021–030 Yedek katılımcıdır. Grup koddan belirlenir; öğrenci grubunu ekranda görmez.
        </li>
        <li>
          <strong>Ön Test (kör başlangıç ölçümü):</strong> İki grup da aynı sade "Eğitim Asistanı" ekranını kullanır.
          Hiçbir enerji, su veya CO₂ göstergesi yoktur. Kayıtlar arkada gerçek grup ve Ön Test etiketiyle tutulur.
        </li>
        <li>
          <strong>Ara dönem (müdahale):</strong> Yalnızca Deney grubuna etkili istem yazma ve yapay zekanın çevresel etkisi
          eğitimi verilir.
        </li>
        <li>
          <strong>Son Test:</strong> Yönetici aşamayı Son Test yapar; eski kayıtlar silinmez, öğrenciler temiz bir sohbetle
          başlar. Kontrol grubu sade ekranda kalır. Deney grubu EkoToken arayüzünü görür (özet şeridi, rozetler, günlük
          karşılıklar, tasarruf ipucu, kişisel rapor, metodoloji).
        </li>
        <li>
          <strong>Analiz (α = 0,05):</strong> Öğrenci başına toplamlar üzerinde 4 test: (1) Ön Test Kontrol–Deney (Welch,
          başlangıç denkliği), (2) Kontrol Ön–Son (eşleştirilmiş), (3) Deney Ön–Son (eşleştirilmiş), (4) Son Test
          Kontrol–Deney (Welch). Ölçütler: istem sayısı, su, enerji, CO₂ ve Hafif Model oranı.
        </li>
      </ol>
      <p className="mt-3 text-[11px] text-indigo-800">
        Örnek veriler istatistiklere, grafiklere ve Excel'e varsayılan olarak girmez.
      </p>
    </section>
  );
}
