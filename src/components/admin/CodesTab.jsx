// Sekme 4: Katılımcı Kodları (60).
// Her kodun grubu, Asıl/Yedek statüsü, Ön Test ve Son Test'te giriş yapıp yapmadığı (logins koleksiyonu),
// giriş sayısı, istem sayıları ve son etkinlik zamanı. Panoya kopyalama ve CSV.
// Giriş sayısı yalnızca /api/login çağrılarını sayar (sayfa yenileme de giriş sayılır); istemler sayılmaz.
// Aynı kodla çok sayıda giriş, başka birinin o kodu kullandığını gösterebilir (Bilinen sınırlamalar).
// Telefonda (sm altı) tablo yerine her kod bir kart olarak gösterilir (CodeCard); masaüstü tablo aynıdır.
// Bu sekme önizlemede de gerçek giriş verisini gösterir (örnek veri yalnızca istatistik/kayıtlar içindir),
// bu yüzden kartlarda ÖRNEK VERİ etiketi yoktur.
import { useMemo, useState } from 'react';
import { Copy, Check, FileDown, CheckCircle2, Minus } from 'lucide-react';
import { codeRows } from '../../lib/adminSummary.js';
import { ALL_CODES, getGroup, getStatus } from '../../lib/participants.js';
import { codesCsv, downloadCsv } from '../../lib/csv.js';
import { useIsPhone } from './useIsPhone.js';

function time(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Panoya kopyalar; tarayıcı izin vermezse false döner.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function CodesTab({ records, logins, onToast }) {
  const rows = useMemo(() => codeRows(records, logins), [records, logins]);
  const [copied, setCopied] = useState(null);
  const isPhone = useIsPhone();

  const copy = async (text, key, message) => {
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
      if (message) onToast(message);
    } else {
      onToast('Panoya kopyalanamadı. Tarayıcı izin vermiyor olabilir.');
    }
  };

  const copyAll = () =>
    copy(ALL_CODES.map((c) => `${c} (${getGroup(c)} - ${getStatus(c)})`).join('\n'), 'ALL', '60 katılımcı kodu panoya kopyalandı.');

  const exportCsv = () => {
    downloadCsv('Katilimci_Kodlari.csv', codesCsv(rows));
    onToast('60 katılımcı kodu CSV olarak indirildi.');
  };

  return (
    <div className="bg-surface rounded-[20px] border border-line overflow-hidden">
      <div className="p-4 border-b border-line flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Tanımlı 60 Katılımcı Kodu (30 Kontrol + 30 Deney)</h3>
          <p className="text-xs text-text-3">
            K001–K020 / D001–D020 Asıl · K021–K030 / D021–D030 Yedek. Giriş sayısı sayfa yenilemeyi de içerir; istemler
            sayılmaz.
          </p>
        </div>
        {/* Telefonda (sm altı) iki buton tam genişlikte, alt alta, 44 px. */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-2">
          <button
            type="button"
            onClick={copyAll}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-11 sm:h-10 px-4 rounded-full bg-muted hover:bg-line-2 text-ink text-[13px] sm:text-xs font-semibold"
          >
            {copied === 'ALL' ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
            Tümünü Kopyala
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-11 sm:h-10 px-4 rounded-full bg-ink hover:bg-ink-2 text-white text-[13px] sm:text-xs font-semibold"
          >
            <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
            Kodları CSV İndir
          </button>
        </div>
      </div>

      {isPhone ? (
        <ul className="divide-y divide-line" aria-label="Katılımcı kodları">
          {rows.map((row) => (
            <CodeCard key={row.code} row={row} copied={copied === row.code} onCopy={() => copy(row.code, row.code)} />
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-paper text-text-2 font-semibold border-b border-line">
              <tr>
                <th className="px-3 py-2.5">Kod</th>
                <th className="px-3 py-2.5">Grup</th>
                <th className="px-3 py-2.5">Statü</th>
                <th className="px-3 py-2.5">Ön Test giriş</th>
                <th className="px-3 py-2.5">Ön Test istem</th>
                <th className="px-3 py-2.5">Son Test giriş</th>
                <th className="px-3 py-2.5">Son Test istem</th>
                <th className="px-3 py-2.5">Toplam istem</th>
                <th className="px-3 py-2.5">Son etkinlik</th>
                <th className="px-3 py-2.5 text-right">Kopyala</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.code} className="hover:bg-paper">
                  <td className="px-3 py-2 font-mono font-semibold text-ink">{row.code}</td>
                  <td className="px-3 py-2">{row.group}</td>
                  <td className="px-3 py-2 text-text-2">{row.status}</td>
                  <td className="px-3 py-2">
                    <LoginCell info={row.pretest} />
                  </td>
                  <td className="px-3 py-2 tabular-nums">{row.pretest.prompts}</td>
                  <td className="px-3 py-2">
                    <LoginCell info={row.posttest} />
                  </td>
                  <td className="px-3 py-2 tabular-nums">{row.posttest.prompts}</td>
                  <td className="px-3 py-2 tabular-nums font-semibold text-ink">{row.totalPrompts}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-text-3">{time(row.lastActivityAt)}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => copy(row.code, row.code)}
                      aria-label={`${row.code} kodunu kopyala`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted hover:bg-line-2 text-text-2b text-[11px] font-medium"
                    >
                      {copied === row.code ? <Check className="w-3 h-3" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
                      {copied === row.code ? 'Kopyalandı' : 'Kopyala'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Telefon kartı: üstte kod · grup · statü, ortada iki aşamanın giriş ve istem bilgisi, altta son etkinlik
// ve Kopyala. Ekran okuyucu için her değerin etiketi aşama adıyla birlikte okunur (ör. "Ön Test istem: 0").
function CodeCard({ row, copied, onCopy }) {
  return (
    <li data-testid="kod-karti" className="px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-text-2">
          <span className="font-mono font-semibold text-ink">{row.code}</span>
          <span aria-hidden="true"> · </span>
          <span className="sr-only">, grup: </span>
          {row.group}
          <span aria-hidden="true"> · </span>
          <span className="sr-only">, statü: </span>
          {row.status}
        </p>
        <p className="shrink-0 text-xs text-text-3">
          Toplam istem: <span className="font-mono font-semibold text-ink">{row.totalPrompts}</span>
        </p>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <PhaseBox label="Ön Test" info={row.pretest} />
        <PhaseBox label="Son Test" info={row.posttest} />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <p className="text-xs text-text-3">
          Son etkinlik: <span className="text-text-2">{time(row.lastActivityAt)}</span>
        </p>
        <button
          type="button"
          onClick={onCopy}
          aria-label={`${row.code} kodunu kopyala`}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 min-h-11 min-w-11 px-4 rounded-full bg-muted hover:bg-line-2 text-text-2b text-[13px] font-medium"
        >
          {copied ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
    </li>
  );
}

// Kart içindeki bir aşamanın kutusu: giriş durumu, giriş sayısı, istem sayısı.
function PhaseBox({ label, info }) {
  let countText = '—';
  if (info.loggedIn) countText = info.sessionCount === null ? 'sayı yok' : String(info.sessionCount);
  return (
    <div className="rounded-xl bg-paper px-3 py-2">
      <p className="text-[11px] font-semibold text-text-2">{label}</p>
      <dl className="mt-1 space-y-0.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-text-3">
            <span className="sr-only">{label} </span>Giriş
          </dt>
          <dd className={info.loggedIn ? 'inline-flex items-center gap-1 text-ink' : 'inline-flex items-center gap-1 text-text-3'}>
            {info.loggedIn ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-ink" aria-hidden="true" />
                {time(info.firstLoginAt)}
              </>
            ) : (
              <>
                <Minus className="w-3.5 h-3.5" aria-hidden="true" /> Yok
              </>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-text-3">
            <span className="sr-only">{label} </span>Giriş sayısı
          </dt>
          <dd
            className="font-mono text-ink"
            title={info.loggedIn && info.sessionCount === null ? 'Bu belge giriş sayacı eklenmeden önce oluşturuldu' : undefined}
          >
            {countText}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-text-3">
            <span className="sr-only">{label} </span>İstem
          </dt>
          <dd className="font-mono text-ink">{info.prompts}</dd>
        </div>
      </dl>
    </div>
  );
}

// Giriş hücresi: simge + yazı (renk tek başına bilgi taşımaz).
function LoginCell({ info }) {
  if (!info.loggedIn) {
    return (
      <span className="inline-flex items-center gap-1 text-text-3">
        <Minus className="w-3.5 h-3.5" aria-hidden="true" /> Giriş yok
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-ink">
      <CheckCircle2 className="w-3.5 h-3.5 text-accent-ink" aria-hidden="true" />
      {time(info.firstLoginAt)}
      {info.sessionCount === null ? (
        // Giriş sayacı (sessionCount) eklenmeden önce oluşturulmuş belge: sayı bilinmiyor.
        <span className="text-text-3" title="Bu belge giriş sayacı eklenmeden önce oluşturuldu">
          · sayı yok
        </span>
      ) : (
        <span className="text-text-3">· {info.sessionCount} giriş</span>
      )}
    </span>
  );
}
