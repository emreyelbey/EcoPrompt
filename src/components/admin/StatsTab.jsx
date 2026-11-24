// Sekme 2: Ön Test – Son Test & İstatistik (mini SPSS).
// - Ölçüt seçici: birincil ölçüt Toplam Enerji (Wh); diğerleri ikincil.
// - 4 net değişim kartı, Ön/Son gruplandırılmış sütun grafikleri, 4 hücre betimsel tablo.
// - 4 kanonik t-testi: t, sd, p (çift yönlü), ortalamalar, n, Cohen's d ve Türkçe yorum.
// - Excel İndir: excelExport.js yalnızca butona basılınca import() ile yüklenir (ayrı parça).
// Bütün sayılar src/lib/statsReport.js'ten gelir; bu bileşen yalnızca gösterir.
// Örnek kayıtlar hesaplara girmez (AdminScreen ayıklar, aggregateByParticipant da dışlar).
// Örnek veri önizlemesinde (Dilim 8) AdminScreen örnek seti ve örnek kod listesini (codeGroups) verir;
// o modda Excel butonu pasiftir ve her kartta "ÖRNEK VERİ" işareti görünür.
import { useMemo, useState } from 'react';
import { FileSpreadsheet, Loader2, Info, Star, ShieldCheck, ShieldAlert } from 'lucide-react';
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
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
          İstatistik ölçütü:
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-base sm:text-sm font-medium text-slate-800"
          >
            {METRIC_ORDER.map((id) => (
              <option key={id} value={id}>
                {METRIC_META[id].label} ({METRIC_META[id].unit}){METRIC_META[id].primary ? ' — Birincil' : ''}
              </option>
            ))}
          </select>
          {meta.primary ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700 ring-1 ring-indigo-200">
              <Star className="w-3 h-3" aria-hidden="true" />
              Birincil ölçüt (ana hipotez)
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">İkincil ölçüt</span>
          )}
        </label>
        <button
          type="button"
          onClick={exportExcel}
          disabled={exporting || preview}
          title={preview ? 'Örnek veri önizlemesinde Excel indirilemez' : undefined}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-60"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />}
          Excel İndir (.xlsx)
        </button>
      </div>

      {/* Bilgi notları */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-900 space-y-1">
        <p className="flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="py-1.5 pr-4 font-semibold">Hücre</th>
                <th className="py-1.5 pr-4 font-semibold">n</th>
                <th className="py-1.5 pr-4 font-semibold">x̄</th>
                <th className="py-1.5 pr-4 font-semibold">SS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.descriptives.map((c) => (
                <tr key={c.label}>
                  <td className="py-1.5 pr-4 font-semibold text-slate-800">{c.label}</td>
                  <td className="py-1.5 pr-4 tabular-nums">{c.n}</td>
                  <td className="py-1.5 pr-4 tabular-nums">{c.n > 0 ? formatMetricValue(c.mean, metric) : '—'}</td>
                  <td className="py-1.5 pr-4 tabular-nums">{c.n > 1 ? fmtSmart(c.sd) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* 4 kanonik test */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {report.tests.map((test) => (
          <TestCard key={test.id} test={test} metric={metric} />
        ))}
      </div>

      {/* Etki büyüklüğü açıklaması */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 text-xs text-slate-600 space-y-1.5">
        <h3 className="text-sm font-bold text-slate-900">Etki büyüklüğü nasıl hesaplandı?</h3>
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

// Yapılandırma özeti kontrolü (dondurma kuralı). İki satır gösterir:
//   1) "Sunucunun şu anki yapılandırma özeti": sunucu şu an hangi ayarlarla çalışıyor (kayıt olmasa da görünür).
//   2) "Kayıtlardaki yapılandırma özeti": öğrenci kayıtları hangi ayarlarla üretildi.
// Kırmızı uyarı: kayıtlarda birden fazla değer varsa VEYA kayıtlardaki değer sunucunun şu ankinden farklıysa.
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
      <strong>Sunucunun şu anki yapılandırma özeti:</strong>{' '}
      {current ? <code data-testid="sunucu-ozeti" className="font-mono">{current}</code> : 'sunucu bildirmedi.'}
    </p>
  );

  // 2. satır: kayıtlardaki özet
  let recordsLine;
  if (hashes.length === 0) {
    recordsLine = (
      <p>
        <strong>Kayıtlardaki yapılandırma özeti:</strong> {noRecords ? 'henüz kayıt yok.' : 'özetli kayıt yok.'}
        {missingNote}
      </p>
    );
  } else if (hashes.length === 1) {
    recordsLine = (
      <p>
        <strong>Kayıtlardaki yapılandırma özeti:</strong> bütün kayıtlarda tek değer{' '}
        <code className="font-mono">{hashes[0].hash}</code>
        {ok && !mismatch ? ' ✓' : ''}
        {missingNote}
      </p>
    );
  } else {
    recordsLine = (
      <div>
        <p>
          <strong>Kayıtlardaki yapılandırma özeti:</strong> kayıtlarda {hashes.length} farklı değer var.{missingNote}
        </p>
        <ul className="pl-5 list-disc">
          {hashes.map((h) => (
            <li key={h.hash}>
              <code className="font-mono">{h.hash}</code>: {h.count} kayıt (Ön Test {h.pretest}, Son Test {h.posttest})
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!alarm) {
    return (
      <div data-testid="yapilandirma-ozeti" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="space-y-0.5">
          {currentLine}
          {recordsLine}
          <p>
            {noRecords
              ? 'Kayıt yok. Sunucunun şu anki özetini Ön Test başlamadan önce tutanağa yazın.'
              : 'Ölçüm koşulları (sistem talimatı, model eşlemesi, katsayılar, bağlam sınırı) değişmemiş.'}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div role="alert" data-testid="yapilandirma-ozeti" className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs text-rose-900 flex items-start gap-2">
      <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="space-y-0.5">
        {currentLine}
        {recordsLine}
        {!ok && (
          <p className="font-semibold">
            Kayıtlarda birden fazla özet var: ölçüm koşulları deney sırasında değişmiş olabilir (dondurma kuralı); enerji
            karşılaştırmaları etkilenebilir.
          </p>
        )}
        {mismatch && (
          <p className="font-semibold">
            Sunucunun şu anki özeti kayıtlardakinden farklı: ölçüm koşulları son kayıtlardan sonra değişmiş. Deney sürüyorsa
            aşamayı değiştirmeyin; ekibe ve danışman öğretmene haber verin.
          </p>
        )}
      </div>
    </div>
  );
}

// Net değişim kartı: Kontrol ve Deney için Ön Test → Son Test yüzde değişim.
function ChangeCard({ card }) {
  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 p-4">
      <PreviewMark />
      <div className="text-xs font-semibold text-slate-500">
        {card.label} ({card.unit}) — net değişim
      </div>
      <div className="mt-2 space-y-1.5">
        {['Kontrol', 'Deney'].map((group) => {
          const g = card[group];
          const pct = g.pct;
          const color = pct === null ? 'text-slate-400' : pct < 0 ? 'text-emerald-700' : pct > 0 ? 'text-rose-700' : 'text-slate-700';
          return (
            <div key={group} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-slate-600">{group}</span>
              <span className={`font-bold tabular-nums ${color}`}>
                {pct === null ? '—' : `${pct > 0 ? '+' : ''}%${fmtNum(pct, 1)}`}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">Öğrenci başına ortalamanın Ön Test → Son Test değişimi</p>
    </div>
  );
}

// Tek bir hipotez testinin kartı.
function TestCard({ test, metric }) {
  const r = test.result;
  const verdict = testVerdict(test);
  const badge =
    verdict === 'Anlamlı'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : verdict === 'Anlamlı değil'
        ? 'bg-slate-100 text-slate-700 ring-slate-200'
        : 'bg-amber-50 text-amber-800 ring-amber-200';

  return (
    <section className="relative bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
      <PreviewMark />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{test.title}</h3>
          <p className="text-xs text-slate-500">
            {test.method} · {test.expected}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${badge}`}>{verdict}</span>
      </div>

      {/* Ortalamalar ve n */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {test.compared.map((name, i) => (
          <div key={name} className="rounded-lg bg-slate-50 px-2.5 py-1.5">
            <div className="text-slate-500">{name}</div>
            <div className="font-semibold text-slate-800 tabular-nums">x̄ = {formatMetricValue(test.means[i], metric)}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-600">
        {test.kind === 'paired'
          ? `Ön Test'te ${test.counts.nPre}, Son Test'te ${test.counts.nPost}, eşleşen ${test.counts.nPaired} kişi (test yalnızca eşleşenlerle yapılır).`
          : `n: Kontrol ${test.counts.n1}, Deney ${test.counts.n2} kişi.`}
      </p>

      {/* İstatistikler */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Stat label="t" value={r.valid ? fmtNum(r.t, 3) : '—'} />
        <Stat label="sd" value={r.valid ? fmtNum(r.df, test.kind === 'paired' ? 0 : 2) : '—'} />
        <Stat label="p (çift yönlü)" value={r.valid ? formatPValue(r.p) : '—'} />
        <Stat label="Cohen's d" value={test.d === null ? '—' : `${fmtNum(test.d, 2)} (${test.dLabel})`} />
      </dl>

      <p className={`text-sm leading-relaxed ${r.valid ? 'text-slate-700' : 'text-amber-800'}`}>{test.interpretation}</p>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 px-2.5 py-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900 tabular-nums">{value}</dd>
    </div>
  );
}
