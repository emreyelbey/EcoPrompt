// Yönetici paneli hesapları (saf fonksiyonlar): genel bakış özetleri, kayıt filtreleme,
// 60 katılımcı kodunun durumu. Ekran bileşenleri bu fonksiyonların sonucunu yalnızca gösterir.
// Kural: örnek kayıtlar (isSample) istatistiklere ve grafiklere varsayılan olarak GİRMEZ (proje rehberi Bölüm 7).
// Kaynak: reference/canvas-prototip.tsx (AdminDashboard → overviewStats, filteredRecords, codeRows).
import { MODEL_ORDER } from './footprint.js';
import { ALL_CODES, PARTICIPANT_CODE_GROUPS, getGroup, getStatus } from './participants.js';

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
 * @param {Object<string, string>} [codeGroups]  İZİN LİSTESİ (kod → grup); varsayılan 60 katılımcı kodu.
 *        Listede olmayan koda ait kayıt sayılmaz. Örnek veri önizlemesi örnek kodların listesini verir.
 */
export function overviewStats(records, logins, phase, codeGroups = PARTICIPANT_CODE_GROUPS) {
  const allowed = (item) => Object.hasOwn(codeGroups, item.code);
  const list = filterByPhase(records, phase).filter(allowed);
  const loginList = filterByPhase(logins, phase).filter(allowed);

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
    totalCodes: Object.keys(codeGroups).length, // "Aktif Katılımcılar x / 60" kartındaki payda
  };
}

/**
 * Öğrenci Kayıtları sekmesindeki filtreler. Sonuç en yeniden en eskiye sıralıdır.
 * Hangi kayıtların (gerçek veya örnek önizleme) listeleneceğine AdminScreen karar verir; burada ayıklanmaz.
 * @param {object} f  { query, group, phase, model }  ('all' = filtre yok)
 */
export function filterRecords(records, f) {
  const q = (f.query || '').trim().toLocaleLowerCase('tr-TR');
  return records
    .filter((r) => {
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

/**
 * Yapılandırma özeti kontrolü (Dilim 8, dondurma kuralı): kayıtlarda kaç farklı configHash var?
 * Deney boyunca tek değer olmalıdır. Farklı değerler, Ön Test ile Son Test arasında sistem talimatının,
 * model eşlemesinin, katsayıların veya bağlam sınırının değiştiğini gösterir (enerji ölçümünü etkiler).
 * @param {object[]} records  gerçek kayıtlar
 * @returns {{ hashes: { hash: string, count: number, pretest: number, posttest: number }[], missing: number, ok: boolean }}
 *          hashes en çok kayıttan en aza sıralı; missing: alan eklenmeden önce yazılmış (özetsiz) kayıt sayısı;
 *          ok: en fazla bir farklı özet var mı.
 */
export function configHashSummary(records) {
  const byHash = new Map();
  let missing = 0;
  for (const r of records) {
    if (typeof r.configHash !== 'string' || r.configHash === '') {
      missing += 1;
      continue;
    }
    if (!byHash.has(r.configHash)) byHash.set(r.configHash, { hash: r.configHash, count: 0, pretest: 0, posttest: 0 });
    const entry = byHash.get(r.configHash);
    entry.count += 1;
    if (r.phase === 'pretest' || r.phase === 'posttest') entry[r.phase] += 1;
  }
  const hashes = [...byHash.values()].sort((a, b) => b.count - a.count);
  return { hashes, missing, ok: hashes.length <= 1 };
}
