// Metodoloji içeriği: hesaplamanın nasıl yapıldığı, katsayılar ve kaynakça.
// İki yerde kullanılır: öğrencinin Metodoloji penceresi (yalnızca Deney grubu + Son Test) ve
// yönetici panelindeki "Metodoloji & Kaynakça" sekmesi. Tablodaki ve metindeki bütün sayılar
// src/lib/footprint.js'teki sabitlerden üretilir; burada elle sayı yazılmaz (katsayı değişirse
// metin de kendiliğinden güncellenir).
// KÖR DENEY: Deney tasarımı (Kontrol grubunun ne gördüğü vb.) bu içerikte BİLEREK yer almaz;
// öğrenci de bu dosyayı gördüğü için o anlatım yalnızca admin/ExperimentDesignSection.jsx dosyasındadır.
// Kaynakçada ticari yapay zeka marka adı geçmez (tests/marka-yasagi.test.js).
// Görünüm (Yön 2b): nötr beyaz kartlar, formül siyah kutuda mono. Bu içerik yönetici panelinde de göründüğü için
// yeşil (eco) renk kullanılmaz.
import { FlaskConical, Droplets, Cloud, BookOpen, Lightbulb } from 'lucide-react';
import {
  MODEL_ORDER,
  MODEL_SCALES,
  WUE,
  CARBON_INTENSITY,
  CHARS_PER_TOKEN,
  OUTPUT_WEIGHT,
  EQUIVALENTS,
  calculateSavingsPct,
} from '../../lib/footprint.js';
import { ACADEMIC_REFERENCES } from '../../lib/methodology.js';
import { fmtNum } from '../../lib/format.js';

// Tek bir sayıyı Türkçe ondalıkla, gereksiz sıfır bırakmadan yazar (0,2 / 1,8 / 0,43).
function n(value) {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

export default function MethodologyContent() {
  return (
    <div className="space-y-5 text-sm text-text-2b">
      {/* Ağırlıklı token formülü */}
      <section className="p-4 rounded-2xl bg-surface border border-line">
        <h3 className="font-semibold text-ink flex items-center gap-2">
          <FlaskConical className="w-4 h-4" aria-hidden="true" />
          Ağırlıklı Token Formülü
        </h3>
        <p className="mt-1.5 text-text-2b leading-relaxed">
          Yapay zekanın yanıt üretmesi (çıktı), gelen metni okumasından (girdi) belirgin ölçüde daha fazla enerji
          harcar. Bu nedenle çıktı tokenları {OUTPUT_WEIGHT} kat ağırlıklandırılır:
        </p>
        <div className="mt-3 p-3 rounded-xl bg-ink text-on-dark text-center font-mono text-[13px]">
          Ağırlıklı Token = Girdi Token + {OUTPUT_WEIGHT} × Çıktı Token
        </div>
        <ul className="mt-2.5 space-y-1 text-xs text-text-2 list-disc pl-4">
          <li>
            Yanıtla birlikte gerçek token sayıları geldiyse onlar kullanılır. Gelmediyse ⌈karakter sayısı /{' '}
            {n(CHARS_PER_TOKEN)}⌉ tahmini uygulanır ve rozetlerde sayının önüne “≈” konur. Boş metin 0 token sayılır.
          </li>
          <li>Yapay zekanın yanıt öncesi “düşünme” adımında ürettiği tokenlar da çıktıya dahildir.</li>
          <li>
            Girdi tokenları yalnızca yeni soruyu değil, asistanın yönergesini ve sohbetin son 12 etkileşimini de içerir;
            çünkü asistan her soruda bu metni yeniden okur. Bu yüzden uzun sohbetlerde girdi sayısı büyür.
          </li>
        </ul>
      </section>

      {/* Katsayı tablosu */}
      <section>
        <h3 className="font-semibold text-ink mb-2">Model Sınıfları ve Enerji Katsayıları (1.000 ağırlıklı token başına)</h3>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-muted text-text-2b font-semibold">
              <tr>
                <th className="px-3 py-2.5">Model Sınıfı</th>
                <th className="px-3 py-2.5">Enerji Min / Ort / Maks (Wh)</th>
                <th className="px-3 py-2.5">Hafif Modele geçince tasarruf</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {MODEL_ORDER.map((id) => {
                const m = MODEL_SCALES[id];
                const savings = calculateSavingsPct(id);
                return (
                  <tr key={id}>
                    <td className="px-3 py-2.5 font-semibold text-ink">{m.name}</td>
                    <td className="px-3 py-2.5">
                      {fmtNum(m.energyMin, 2)} / <strong>{fmtNum(m.energyAvg, 2)}</strong> / {fmtNum(m.energyMax, 2)}
                    </td>
                    <td className="px-3 py-2.5">{savings === 0 ? 'Referans (en verimli)' : `%${savings}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-xs text-text-3">
          Tasarruf = (seçilen sınıfın ort. enerjisi − Hafif Modelin ort. enerjisi) / seçilen sınıfın ort. enerjisi × 100
        </p>
      </section>

      {/* Su ve karbon katsayıları */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-2xl bg-surface border border-line">
          <h3 className="font-semibold text-ink flex items-center gap-1.5">
            <Droplets className="w-4 h-4 text-text-3" aria-hidden="true" />
            Su Ayak İzi (WUE)
          </h3>
          <p className="mt-1 text-xs text-text-2 leading-relaxed">
            Min <strong>{n(WUE.min)}</strong> · Ort <strong>{n(WUE.avg)}</strong> · Maks{' '}
            <strong>{n(WUE.max)} mL/Wh</strong>. Veri merkezi soğutması ve elektrik üretimindeki dolaylı su
            tüketimini kapsar. Su = Enerji × WUE.
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-surface border border-line">
          <h3 className="font-semibold text-ink flex items-center gap-1.5">
            <Cloud className="w-4 h-4 text-text-3" aria-hidden="true" />
            Karbon Yoğunluğu (Şebeke)
          </h3>
          <p className="mt-1 text-xs text-text-2 leading-relaxed">
            Min <strong>{n(CARBON_INTENSITY.min)}</strong> · Ort <strong>{n(CARBON_INTENSITY.avg)}</strong> · Maks{' '}
            <strong>{n(CARBON_INTENSITY.max)} g CO₂/Wh</strong>. Elektrik şebekesi emisyon faktörlerine dayanır.
            CO₂ = Enerji × karbon yoğunluğu.
          </p>
        </div>
      </section>
      <p className="text-xs text-text-3 -mt-2">
        Rozetlerdeki aralıklar en düşük katsayıların birlikte (min × min) ve en yüksek katsayıların birlikte (maks × maks)
        kullanılmasıyla bulunur; toplamlar ortalama değerlerle hesaplanır.
      </p>

      {/* Günlük hayat karşılıkları */}
      <section className="p-4 rounded-2xl bg-surface border border-line">
        <h3 className="font-semibold text-ink flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-text-3" aria-hidden="true" />
          Günlük Hayat Karşılıkları
        </h3>
        <ul className="mt-1.5 space-y-1 text-xs text-text-2 list-disc pl-4">
          <li>
            Su: 1 damla ≈ {n(EQUIVALENTS.dropMl)} mL, tatlı kaşığı {n(EQUIVALENTS.teaspoonMl)} mL, su bardağı{' '}
            {n(EQUIVALENTS.glassMl)} mL, yarım litrelik şişe {n(EQUIVALENTS.bottleMl)} mL.
          </li>
          <li>
            Enerji: 10 W LED ampul (1 Wh = {n(EQUIVALENTS.ledSecondsPerWh)} saniye yanma), akıllı telefon bataryası ≈{' '}
            {n(EQUIVALENTS.phoneBatteryWh)} Wh.
          </li>
          <li>
            Karbon: binek araç ≈ {n(EQUIVALENTS.carGramsPerMeter * 1000)} g CO₂/km, olgun bir ağacın günlük emilimi ≈{' '}
            {n(EQUIVALENTS.treeGramsPerDay)} g CO₂.
          </li>
        </ul>
      </section>

      {/* Kaynakça */}
      <section>
        <h3 className="font-semibold text-ink mb-2 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-text-3" aria-hidden="true" />
          Akademik Kaynakça
        </h3>
        <ol className="space-y-2">
          {ACADEMIC_REFERENCES.map((ref) => (
            <li key={ref.id} className="p-3 rounded-2xl bg-surface border border-line text-xs">
              <div className="font-semibold text-ink">
                {ref.id}. {ref.authors} ({ref.institution}, {ref.year})
              </div>
              <div className="italic text-text-2b mt-0.5">{ref.title}</div>
              <div className="text-text-3 mt-1">{ref.note}</div>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-[11px] text-text-3">
        Not: Değerler bilimsel kaynaklara dayanan tahmini aralıklardır; gerçek tüketim veri merkezine, donanıma ve
        elektrik kaynağına göre değişebilir.
      </p>
    </div>
  );
}
