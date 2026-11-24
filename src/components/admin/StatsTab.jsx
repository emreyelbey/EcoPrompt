// Sekme 2: İstatistik (mini SPSS). Görünüm Yön 2b.
// - Ölçüt seçici: birincil ölçüt Toplam Enerji (Wh); diğerleri ikincil.
// - Yapılandırma mührü (dondurma kuralı): siyah kart; sunucunun şu anki ve kayıtlardaki yapılandırma özeti.
// - 4 net değişim kartı, Ön/Son gruplandırılmış sütun grafikleri, 4 hücre betimsel tablo.
// - 4 kanonik t-testi: t, sd, p (çift yönlü), ortalamalar, n, Cohen's d, Türkçe yorum ve p çizelgesi
//   (α = 0,05 çizgisi + bu testin p noktası). Anlamlı testin kartı koyu çerçevelidir.
// - Excel İndir: excelExport.js yalnızca butona basılınca import() ile yüklenir (ayrı parça).
// Bütün sayılar src/lib/statsReport.js'ten gelir; bu bileşen yalnızca gösterir.
// Örnek kayıtlar hesaplara girmez (AdminScreen ayıklar, aggregateByParticipant da dışlar).
// Örnek veri önizlemesinde (Dilim 8) AdminScreen örnek seti ve örnek kod listesini (codeGroups) verir;
// o modda Excel butonu pasiftir, yapılandırma mührü gizlenir ve her kartta "ÖRNEK VERİ" işareti görünür.
import { useMemo, useState } from 'react';
import { FileSpreadsheet, Loader2, Info, Check, ShieldAlert } from 'lucide-react';
import { COHENS_D_FORMULAS } from '../../lib/stats.js';
import {
  METRIC_META,
  METRIC_ORDER,
  POLICY_NOTES,
  PRIMARY_METRIC,
  SAME_AS_ENERGY_NOTE,
  buildStatsReport,
  formatMetricValue,
  testVerdict,
} from '../../lib/statsReport.js';
import { fmtNum, fmtSmart, formatPValue } from '../../lib/format.js';
import { configHashSummary } from '../../lib/adminSummary.js';
import { ChartCard, PrePostChart } from './charts.jsx';
import { PreviewMark, usePreview } from './PreviewContext.jsx';

// α düzeyi (p çizelgesindeki eşik çizgisi). Karar kuralı statsReport.js'tedir; burası yalnızca çizimdir.
const ALPHA = 0.05;

// Ölçüt değerini grafik ekseni için kısa yazar.
function axisFormat(metric) {
  if (metric === 'prompts') return (v) => fmtNum(v, 2);
  if (metric === 'weightedTokens') return (v) => fmtNum(v, 0);
  if (metric === 'lightPct') return (v) => `%${fmtNum(v, 0)}`;
  return fmtSmart;
}

export default function StatsTab({ records, logins, codeGroups, currentConfigHash = null, onToast }) {
  const preview = usePreview();
  const [metric, setMetric] = useState(PRIMARY_METRIC);
  const [exporting, setExporting] = useState(false);
  const report = useMemo(
    // Önizlemede örnek kod listesi verilir; gerçek veride undefined → 60 katılımcı kodu.
    () => buildStatsReport(records, logins, { metric, sample: codeGroups ? { codeGroups } : undefined }),
    [records, logins, metric, codeGroups]
  );
  const meta = METRIC_META[metric];

  const exportExcel = async () => {
    if (preview) return; // örnek veri önizlemesinde dışa aktarma yok
    setExporting(true);
    try {
      // Excel kodu yalnızca burada yüklenir; panelin ilk açılışı ve öğrenci ekranı bu kodu indirmez.
      const { downloadWorkbook } = await import('../../lib/excelExport.js');
      downloadWorkbook(records, logins);
      onToast('Excel dosyası indirildi (4 veri sayfası + değişken sözlüğü).');
    } catch {
      onToast('Excel dosyası oluşturulamadı. Lütfen tekrar deneyin.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Kontrol çubuğu: ölçüt seçici + Excel */}
      {/* Telefonda (sm altı) seçim kutusu ve Excel butonu tam genişlikte, alt alta, 44 px. */}
      <div className="bg-surface rounded-[20px] border border-line p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
        <label className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2.5 text-xs font-medium text-text-2">
          İstatistik ölçütü:
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="w-full sm:w-auto h-11 sm:h-10 rounded-full border border-line-2 bg-surface px-3.5 text-base sm:text-sm font-medium text-ink"
          >
            {METRIC_ORDER.map((id) => (
              <option key={id} value={id}>
                {METRIC_META[id].label} ({METRIC_META[id].unit}){METRIC_META[id].primary ? ' — Birincil' : ''}
              </option>
            ))}
          </select>
          {meta.primary ? (
            <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-paper">Birincil ölçüt (ana hipotez)</span>
          ) : (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-text-2">İkincil ölçüt</span>
          )}
        </label>
        <button
          type="button"
          onClick={exportExcel}
          disabled={exporting || preview}
          title={preview ? 'Örnek veri önizlemesinde Excel indirilemez' : undefined}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-[18px] rounded-full bg-ink hover:bg-ink-2 text-paper text-[13px] font-semibold disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />}
          Excel İndir (.xlsx)
        </button>
      </div>

      {/* Bilgi notları */}
      <div className="rounded-[14px] border border-line bg-surface px-4 py-3 text-xs text-text-2b space-y-1">
        <p className="flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-text-3" aria-hidden="true" />
          <span>
            Değerler öğrenci başınadır. Sıfır istem politikası (<strong>{report.policy}</strong>): {POLICY_NOTES[report.policy]} α = 0,05;
            bütün p değerleri <strong>çift yönlüdür</strong>.
          </span>
        </p>
        {(metric === 'water' || metric === 'co2' || metric === 'energy') && <p className="pl-6">{SAME_AS_ENERGY_NOTE}</p>}
      </div>

      {/* Dondurma kuralı kontrolü: ölçüm koşulları deney boyunca aynı kaldı mı? (örnek veride yok) */}
      {!preview && <ConfigHashCheck records={records} current={currentConfigHash} />}

      {/* 4 net değişim kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {report.changeCards.map((card) => (
          <ChangeCard key={card.metric} card={card} />
        ))}
      </div>

      {/* Ön Test – Son Test grafikleri */}
      <ChartCard title="Ön Test – Son Test Karşılaştırması" subtitle="Öğrenci başına ortalama (yalnızca o aşamanın analizine giren katılımcılar)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PrePostChart title="İstem sayısı" data={report.promptChart} format={axisFormat('prompts')} />
          <PrePostChart title={`${meta.label} (${meta.unit})`} data={report.metricChart} format={axisFormat(metric)} />
        </div>
      </ChartCard>

      {/* Betimsel istatistikler */}
      <ChartCard title={`Betimsel İstatistikler — ${meta.label} (${meta.unit})`} subtitle="n: katılımcı sayısı · x̄: ortalama · SS: standart sapma (n − 1)">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="text-xs text-text-3">
              <tr>
                <th className="py-1.5 pr-4 font-medium whitespace-nowrap">Hücre</th>
                <th className="py-1.5 pr-4 font-medium whitespace-nowrap">n</th>
                <th className="py-1.5 pr-4 font-medium whitespace-nowrap">x̄</th>
                <th className="py-1.5 pr-4 font-medium whitespace-nowrap">SS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {report.descriptives.map((c) => (
                <tr key={c.label}>
                  <td className="py-2 pr-4 font-medium text-ink">{c.label}</td>
                  <td className="py-2 pr-4 font-mono">{c.n}</td>
                  <td className="py-2 pr-4 font-mono">{c.n > 0 ? formatMetricValue(c.mean, metric) : '—'}</td>
                  <td className="py-2 pr-4 font-mono">{c.n > 1 ? fmtSmart(c.sd) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* 4 kanonik test */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {report.tests.map((test) => (
          <TestCard key={test.id} test={test} metric={metric} />
        ))}
      </div>

      {/* Etki büyüklüğü açıklaması */}
      <section className="bg-surface rounded-[20px] border border-line p-5 text-xs text-text-2 space-y-1.5">
        <h3 className="text-base font-semibold tracking-[-0.02em] text-ink">Etki büyüklüğü nasıl hesaplandı?</h3>
        <p>
          p değeri farkın tesadüf olup olmadığını söyler; Cohen's d ise farkın <em>ne kadar büyük</em> olduğunu (standart sapma
          cinsinden) gösterir.
        </p>
        <p>• {COHENS_D_FORMULAS.independent}</p>
        <p>• {COHENS_D_FORMULAS.paired}</p>
        <p>• Etiketler: {COHENS_D_FORMULAS.labels}</p>
      </section>
    </div>
  );
}

// YAPILANDIRMA MÜHRÜ (dondurma kuralı). Siyah kart; iki satır gösterir:
//   1) "Sunucunun şu anki yapılandırma özeti": sunucu şu an hangi ayarlarla çalışıyor (kayıt olmasa da görünür).
//   2) "Kayıtlardaki yapılandırma özeti": öğrenci kayıtları hangi ayarlarla üretildi.
// Uyumluysa nötr onay işareti (yeşil kullanılmaz: yeşil yalnızca EkoToken'a aittir).
// Kırmızı durum (role="alert"): kayıtlarda birden fazla değer varsa VEYA kayıtlardaki değer sunucunun şu ankinden farklıysa.
function ConfigHashCheck({ records, current }) {
  const { hashes, missing, ok } = useMemo(() => configHashSummary(records), [records]);
  const noRecords = hashes.length === 0 && missing === 0;
  if (noRecords && !current) return null; // gösterecek hiçbir bilgi yok

  // Kayıtlardaki değerlerden en az biri sunucunun şu ankinden farklı mı?
  const mismatch = Boolean(current) && hashes.some((h) => h.hash !== current);
  const alarm = !ok || mismatch;
  const missingNote = missing > 0 ? ` ${missing} kayıt bu alan eklenmeden önce yazılmış (özetsiz).` : '';

  // 1. satır: sunucunun şu anki özeti
  const currentLine = (
    <p>
      <strong className="font-semibold text-on-dark">Sunucunun şu anki yapılandırma özeti:</strong>{' '}
      {current ? (
        <code data-testid="sunucu-ozeti" className="font-mono text-on-dark">
          {current}
        </code>
      ) : (
        'sunucu bildirmedi.'
      )}
    </p>
  );

  // 2. satır: kayıtlardaki özet
  let recordsLine;
  if (hashes.length === 0) {
    recordsLine = (
      <p>
        <strong className="font-semibold text-on-dark">Kayıtlardaki yapılandırma özeti:</strong>{' '}
        {noRecords ? 'henüz kayıt yok.' : 'özetli kayıt yok.'}
        {missingNote}
      </p>
    );
  } else if (hashes.length === 1) {
    recordsLine = (
      <p>
        <strong className="font-semibold text-on-dark">Kayıtlardaki yapılandırma özeti:</strong> bütün kayıtlarda tek değer{' '}
        <code className="font-mono text-on-dark">{hashes[0].hash}</code>
        {ok && !mismatch ? ' ✓' : ''}
        {missingNote}
      </p>
    );
  } else {
    recordsLine = (
      <div>
        <p>
          <strong className="font-semibold text-on-dark">Kayıtlardaki yapılandırma özeti:</strong> kayıtlarda {hashes.length} farklı
          değer var.{missingNote}
        </p>
        <ul className="pl-5 list-disc">
          {hashes.map((h) => (
            <li key={h.hash}>
              <code className="font-mono text-on-dark">{h.hash}</code>: {h.count} kayıt (Ön Test {h.pretest}, Son Test {h.posttest})
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      role={alarm ? 'alert' : undefined}
      data-testid="yapilandirma-ozeti"
      className={`rounded-[20px] bg-ink text-on-dark-2 px-5 py-4 flex items-start gap-4 ${alarm ? 'ring-2 ring-rose-500' : ''}`}
    >
      {/* Durum simgesi: uyumluysa nötr vurgu renginde onay, değilse kırmızı kalkan */}
      <div
        className={`shrink-0 w-11 h-11 rounded-full border-[1.5px] flex items-center justify-center ${
          alarm ? 'border-rose-400 text-rose-400' : 'border-accent text-accent'
        }`}
        aria-hidden="true"
      >
        {alarm ? <ShieldAlert className="w-5 h-5" /> : <Check className="w-5 h-5" strokeWidth={2.4} />}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <span className="block font-mono text-[10px] tracking-[0.12em] text-on-dark-2">
          YAPILANDIRMA MÜHRÜ{alarm ? ' · UYARI' : ''}
        </span>
        {!alarm && (
          <p className="text-[15px] text-on-dark">
            {noRecords
              ? 'Kayıt yok. Sunucunun şu anki özetini Ön Test başlamadan önce tutanağa yazın.'
              : 'Ölçüm koşulları (sistem talimatı, model eşlemesi, katsayılar, bağlam sınırı) değişmemiş.'}
          </p>
        )}
        <div className="space-y-0.5 text-xs leading-relaxed break-words">
          {currentLine}
          {recordsLine}
        </div>
        {!ok && (
          <p className="text-[13px] font-semibold text-rose-300">
            Kayıtlarda birden fazla özet var: ölçüm koşulları deney sırasında değişmiş olabilir (dondurma kuralı); enerji
            karşılaştırmaları etkilenebilir.
          </p>
        )}
        {mismatch && (
          <p className="text-[13px] font-semibold text-rose-300">
            Sunucunun şu anki özeti kayıtlardakinden farklı: ölçüm koşulları son kayıtlardan sonra değişmiş. Deney sürüyorsa
            aşamayı değiştirmeyin; ekibe ve danışman öğretmene haber verin.
          </p>
        )}
      </div>
    </div>
  );
}

// Net değişim kartı: Kontrol ve Deney için Ön Test → Son Test yüzde değişim.
// Renk kullanılmaz (yön işaretle okunur: + artış, − azalış).
function ChangeCard({ card }) {
  return (
    <div className="relative bg-surface rounded-[20px] border border-line p-5 flex flex-col gap-3">
      <PreviewMark />
      <div className="text-[13px] text-text-2">
        {card.label} ({card.unit}) — net değişim
      </div>
      {['Kontrol', 'Deney'].map((group) => {
        const pct = card[group].pct;
        return (
          <div key={group} className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-text-3">{group}</span>
            <span className={`font-mono text-lg ${pct === null ? 'text-text-3' : 'text-ink'}`}>
              {pct === null ? '—' : `${pct > 0 ? '+' : pct < 0 ? '−' : ''}%${fmtNum(Math.abs(pct), 1)}`}
            </span>
          </div>
        );
      })}
      <p className="text-[11px] text-text-3">Öğrenci başına ortalamanın Ön Test → Son Test değişimi</p>
    </div>
  );
}

// Tek bir hipotez testinin kartı.
function TestCard({ test, metric }) {
  const r = test.result;
  const verdict = testVerdict(test);
  const significant = verdict === 'Anlamlı';
  const badge = significant
    ? 'bg-ink text-paper'
    : verdict === 'Anlamlı değil'
      ? 'bg-muted text-text-2'
      : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200';

  return (
    <section
      className={`relative bg-surface rounded-[20px] border p-5 flex flex-col gap-4 ${significant ? 'border-ink' : 'border-line'}`}
    >
      <PreviewMark />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-3">{test.method}</span>
          <h3 className="text-base font-semibold tracking-[-0.02em] text-ink">{test.title}</h3>
          <p className="text-xs text-text-3">{test.expected}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1.5 text-xs font-semibold ${badge}`}>{verdict}</span>
      </div>

      {/* Ortalamalar ve n */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {test.compared.map((name, i) => (
          <div key={name} className="rounded-xl bg-paper border border-line px-3 py-2">
            <div className="text-text-3">{name}</div>
            {/* "x̄" düz yazı tipinde: mono yazı tipinde üst çizgi (birleşik karakter) harften kayıyor. */}
            <div className="text-ink mt-0.5">
              x̄ = <span className="font-mono">{formatMetricValue(test.means[i], metric)}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-text-2">
        {test.kind === 'paired'
          ? `Ön Test'te ${test.counts.nPre}, Son Test'te ${test.counts.nPost}, eşleşen ${test.counts.nPaired} kişi (test yalnızca eşleşenlerle yapılır).`
          : `n: Kontrol ${test.counts.n1}, Deney ${test.counts.n2} kişi.`}
      </p>

      {/* İstatistikler */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="t" value={r.valid ? fmtNum(r.t, 3) : '—'} />
        <Stat label="sd" value={r.valid ? fmtNum(r.df, test.kind === 'paired' ? 0 : 2) : '—'} />
        <Stat label="p (çift yönlü)" value={r.valid ? formatPValue(r.p) : '—'} />
        <Stat label="Cohen's d" value={test.d === null ? '—' : fmtNum(test.d, 2)} note={test.d === null ? null : `(${test.dLabel})`} />
      </dl>

      {/* p çizelgesi: yalnızca test hesaplanabildiyse */}
      {r.valid && <PChart p={r.p} />}

      <p className={`text-sm leading-relaxed ${r.valid ? 'text-text-2b' : 'text-amber-800'}`}>{test.interpretation}</p>
    </section>
  );
}

// p çizelgesi: 0–1 arası yatay çizgi; dikey çizgi α = 0,05 eşiği, nokta bu testin p değeri.
// Nokta çizginin solundaysa (p < α) fark anlamlıdır. Süslemedir; p değeri yukarıda sayı olarak yazılıdır.
function PChart({ p }) {
  const position = Math.min(98, Math.max(0, p * 100));
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      <div className="relative h-1.5 rounded-full bg-muted">
        <div className="absolute -top-[3px] -bottom-[3px] w-px bg-ink" style={{ left: `${ALPHA * 100}%` }} />
        <div
          className="absolute -top-1 w-3.5 h-3.5 -ml-[7px] rounded-full bg-ink border-[3px] border-surface shadow-[0_0_0_1px_var(--color-ink)]"
          style={{ left: `${position}%` }}
        />
      </div>
      <span className="text-[11px] text-text-3">Çizgi α = 0,05 eşiği; nokta bu testin p değeri.</span>
    </div>
  );
}

// İstatistik değeri: küçük etiket, büyük mono değer, isteğe bağlı küçük not (ör. Cohen's d etiketi "(orta)").
function Stat({ label, value, note = null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] text-text-3">{label}</dt>
      <dd className="font-mono text-lg leading-6 text-ink">
        {value}
        {note && <span className="block font-sans text-xs leading-4 text-text-2">{note}</span>}
      </dd>
    </div>
  );
}
