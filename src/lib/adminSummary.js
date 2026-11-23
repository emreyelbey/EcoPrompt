// Yönetici paneli hesapları (saf fonksiyonlar): genel bakış özetleri, kayıt filtreleme,
// 60 katılımcı kodunun durumu. Ekran bileşenleri bu fonksiyonların sonucunu yalnızca gösterir.
// Kural: örnek kayıtlar (isSample) istatistiklere ve grafiklere varsayılan olarak GİRMEZ (proje rehberi Bölüm 7).
// Kaynak: reference/canvas-prototip.tsx (AdminDashboard → overviewStats, filteredRecords, codeRows).
import { MODEL_ORDER } from './footprint.js';
import { ALL_CODES, getGroup, getStatus } from './participants.js';

// Aşamaların yönetici ekranındaki adları (öğrenci ekranında aşama adı hiç yazmaz).
export const PHASE_LABELS = { pretest: 'Ön Test', posttest: 'Son Test' };

export const GROUPS = ['Kontrol', 'Deney'];

// Örnek olmayan (gerçek) kayıtlar.
export function realRecords(records) {
  return records.filter((r) => r.isSample !== true);
}

// Aşama filtresi: 'all' | 'pretest' | 'posttest'.
export function filterByPhase(items, phase) {
  if (phase === 'all') return items;
  return items.filter((r) => r.phase === phase);
}

// Bir listedeki sayısal alanın toplamı (eksik değer 0 sayılır).
function sum(items, field) {
  return items.reduce((total, item) => total + (Number(item[field]) || 0), 0);
}

// Bir grubun özet değerleri.
function groupSummary(records) {
  const prompts = records.length;
  const users = new Set(records.map((r) => r.code)).size;
  const per = (field) => (prompts > 0 ? sum(records, field) / prompts : 0);

  // Model tercihleri: her sınıfın istem sayısı ve yüzdesi.
  const models = {};
  for (const id of MODEL_ORDER) {
    const count = records.filter((r) => r.modelId === id).length;
    models[id] = { count, pct: prompts > 0 ? (count / prompts) * 100 : 0 };
  }

  return {
    users,
    prompts,
    avgPrompts: users > 0 ? prompts / users : 0,
    avgEnergy: per('energyAvg'),
    avgWater: per('waterAvg'),
    avgCo2: per('co2Avg'),
    models,
  };
}

/**
 * Genel Bakış sekmesinin bütün sayıları.
 * @param {object[]} records  örnek kayıtlar çıkarılmış etkileşim listesi
 * @param {object[]} logins   giriş kayıtları
 * @param {'all'|'pretest'|'posttest'} phase
 */
export function overviewStats(records, logins, phase) {
  const list = filterByPhase(records, phase);
  const loginList = filterByPhase(logins, phase);

  const groups = {};
  for (const g of GROUPS) groups[g] = groupSummary(list.filter((r) => r.group === g));

  return {
    activeParticipants: new Set(list.map((r) => r.code)).size, // en az 1 istem yazan
    loggedInParticipants: new Set(loginList.map((l) => l.code)).size, // giriş yapmış
    totalPrompts: list.length,
    totalEnergy: sum(list, 'energyAvg'),
    totalWater: sum(list, 'waterAvg'),
    totalCo2: sum(list, 'co2Avg'),
    groups,
  };
}

/**
 * Öğrenci Kayıtları sekmesindeki filtreler. Sonuç en yeniden en eskiye sıralıdır.
 * @param {object} f  { query, group, phase, model, showSamples }  ('all' = filtre yok)
 */
export function filterRecords(records, f) {
  const q = (f.query || '').trim().toLocaleLowerCase('tr-TR');
  return records
    .filter((r) => {
      if (!f.showSamples && r.isSample === true) return false;
      if (f.group !== 'all' && r.group !== f.group) return false;
      if (f.phase !== 'all' && r.phase !== f.phase) return false;
      if (f.model !== 'all' && r.modelId !== f.model) return false;
      if (q) {
        const inCode = (r.code || '').toLocaleLowerCase('tr-TR').includes(q);
        const inPrompt = (r.prompt || '').toLocaleLowerCase('tr-TR').includes(q);
        if (!inCode && !inPrompt) return false;
      }
      return true;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * 60 katılımcı kodunun her biri için bir satır: grup, statü, her aşamada giriş durumu ve istem sayıları.
 * Giriş bilgisi logins koleksiyonundan, istem sayıları gerçek (örnek olmayan) kayıtlardan gelir.
 */
export function codeRows(records, logins) {
  const loginByKey = new Map(logins.map((l) => [`${l.code}|${l.phase}`, l]));
  const real = realRecords(records);

  return ALL_CODES.map((code) => {
    const mine = real.filter((r) => r.code === code);
    const phaseInfo = (phase) => {
      const login = loginByKey.get(`${code}|${phase}`);
      return {
        loggedIn: Boolean(login),
        firstLoginAt: login?.firstLoginAt ?? null,
        lastLoginAt: login?.lastLoginAt ?? null,
        // Eski belgelerde giriş sayacı yoksa null ("—" gösterilir).
        sessionCount: typeof login?.sessionCount === 'number' ? login.sessionCount : null,
        prompts: mine.filter((r) => r.phase === phase).length,
      };
    };
    const pretest = phaseInfo('pretest');
    const posttest = phaseInfo('posttest');
    const times = [pretest.lastLoginAt, posttest.lastLoginAt].filter((t) => t !== null);

    return {
      code,
      group: getGroup(code),
      status: getStatus(code),
      pretest,
      posttest,
      totalPrompts: pretest.prompts + posttest.prompts,
      lastActivityAt: times.length > 0 ? Math.max(...times) : null,
    };
  });
}

// Bir listedeki en büyük zaman değeri (ms); liste boşsa undefined. Artımlı okumanın imleci.
export function latestMillis(items, field) {
  let max;
  for (const item of items) {
    const t = item[field];
    if (typeof t === 'number' && (max === undefined || t > max)) max = t;
  }
  return max;
}

// Yeni gelen öğeleri kimliğe göre önbelleğe ekler (tekrarlar üzerine yazılır). Yeni Map döner.
export function mergeById(map, items) {
  const next = new Map(map);
  for (const item of items) next.set(item.id, item);
  return next;
}
