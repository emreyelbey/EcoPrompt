// Sekme 4: Katılımcı Kodları (60).
// Her kodun grubu, Asıl/Yedek statüsü, Ön Test ve Son Test'te giriş yapıp yapmadığı (logins koleksiyonu),
// giriş sayısı, istem sayıları ve son etkinlik zamanı. Panoya kopyalama ve CSV.
// Giriş sayısı yalnızca /api/login çağrılarını sayar (sayfa yenileme de giriş sayılır); istemler sayılmaz.
// Aynı kodla çok sayıda giriş, başka birinin o kodu kullandığını gösterebilir (Bilinen sınırlamalar).
import { useMemo, useState } from 'react';
import { Copy, Check, FileDown, CheckCircle2, Minus } from 'lucide-react';
import { codeRows } from '../../lib/adminSummary.js';
import { ALL_CODES, getGroup, getStatus } from '../../lib/participants.js';
import { codesCsv, downloadCsv } from '../../lib/csv.js';

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
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Tanımlı 60 Katılımcı Kodu (30 Kontrol + 30 Deney)</h3>
          <p className="text-xs text-slate-500">
            K001–K020 / D001–D020 Asıl · K021–K030 / D021–D030 Yedek. Giriş sayısı sayfa yenilemeyi de içerir; istemler
            sayılmaz.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
          >
            {copied === 'ALL' ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
            Tümünü Kopyala
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
            Kodları CSV İndir
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
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
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => (
              <tr key={row.code} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono font-bold text-slate-900">{row.code}</td>
                <td className="px-3 py-2">{row.group}</td>
                <td className="px-3 py-2 text-slate-600">{row.status}</td>
                <td className="px-3 py-2">
                  <LoginCell info={row.pretest} />
                </td>
                <td className="px-3 py-2 tabular-nums">{row.pretest.prompts}</td>
                <td className="px-3 py-2">
                  <LoginCell info={row.posttest} />
                </td>
                <td className="px-3 py-2 tabular-nums">{row.posttest.prompts}</td>
                <td className="px-3 py-2 tabular-nums font-bold text-slate-900">{row.totalPrompts}</td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">{time(row.lastActivityAt)}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => copy(row.code, row.code)}
                    aria-label={`${row.code} kodunu kopyala`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium"
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
    </div>
  );
}

// Giriş hücresi: simge + yazı (renk tek başına bilgi taşımaz).
function LoginCell({ info }) {
  if (!info.loggedIn) {
    return (
      <span className="inline-flex items-center gap-1 text-slate-400">
        <Minus className="w-3.5 h-3.5" aria-hidden="true" /> Giriş yok
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-slate-800">
      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
      {time(info.firstLoginAt)}
      {info.sessionCount === null ? (
        // Giriş sayacı (sessionCount) eklenmeden önce oluşturulmuş belge: sayı bilinmiyor.
        <span className="text-slate-500" title="Bu belge giriş sayacı eklenmeden önce oluşturuldu">
          · sayı yok
        </span>
      ) : (
        <span className="text-slate-500">· {info.sessionCount} giriş</span>
      )}
    </span>
  );
}
