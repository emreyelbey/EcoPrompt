// Ölçü → renk eşlemesi (TEK KAYNAK). Enerji, su ve CO₂ ikonlarına küçük, anlamlı bir renk dokunuşu verir:
// ikon, açık tonlu küçük yuvarlak bir zeminin içinde aynı rengin koyu tonuyla çizilir (src/components/ui/MetricIcon.jsx).
// Kullanıldığı yerler: yönetici paneli KPI kartları, Metodoloji başlıkları, EkoToken Günlük Karşılık ayrıntısı,
// Kişisel Rapor toplam kartları. Sade öğrenci ekranında KULLANILMAZ (orada ölçü gösterimi yoktur).
//
// Kurallar (tests/metricColors.test.js denetler):
//   - YEŞİL KULLANILMAZ: yeşil yalnızca Hafif Model'e / EkoToken'a ayrılmıştır (src/lib/modelColors.js).
//   - İkon rengi hem kendi yuvarlak zeminine hem kâğıt beyazı sayfa zeminine karşı en az 3:1 kontrast sağlar.
//   - Ölçü olmayan ikonlar (katılımcı, istem, ampul, kitap…) aynı yuvarlak zemini nötr gri tonla kullanır;
//     böylece bütün ikonların hizası ve boyutu aynı kalır.
//
// Renkler: Enerji = amber, Su = mavi, CO₂ = kurşuni (gri-mavi), nötr = gri.
//   enerji ikon/zemin 4,5:1 · su 5,5:1 · CO₂ 6,2:1 · nötr 7,0:1

export const METRIC_STYLES = {
  energy: { bg: '#FEF3C7', fg: '#B45309' },
  water: { bg: '#DBEAFE', fg: '#1D4ED8' },
  co2: { bg: '#E2E8F0', fg: '#475569' },
  neutral: { bg: '#F4F4F5', fg: '#52525B' },
};

/** Yuvarlak ikon zemini için satır içi stil. Bilinmeyen ölçü nötr gri olur. */
export function metricIconStyle(metric) {
  const style = METRIC_STYLES[metric] ?? METRIC_STYLES.neutral;
  return { backgroundColor: style.bg, color: style.fg };
}
