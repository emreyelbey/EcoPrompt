// Test yardımcısı: dogrulama/tcheck.py'deki sabit 5 Kontrol + 5 Deney veri setinden etkileşim kayıtları üretir.
// Her öğrenci her aşamada tek istem yazmış sayılır; o istemin enerjisi tablodaki değerdir.
// Böylece öğrenci başına toplam enerji = tablodaki değer olur ve testler tcheck.py çıktısıyla karşılaştırılabilir.

export const FIXTURE = {
  kOn: [3.2, 2.8, 4.1, 3.5, 2.9],
  kSon: [3.0, 3.1, 3.8, 3.6, 2.7],
  dOn: [3.4, 3.0, 3.9, 2.7, 3.6],
  dSon: [1.9, 2.2, 2.5, 1.6, 2.4],
};

let nextId = 1;

// Tek bir etkileşim kaydı (panel liste biçimi). Su ve CO₂ ortalama katsayılarla enerjiden türetilir.
export function interaction(code, phase, energy, extra = {}) {
  const id = `r${nextId++}`;
  return {
    id,
    code,
    group: code.startsWith('K') ? 'Kontrol' : 'Deney',
    phase,
    modelId: 'standard',
    prompt: `Soru ${id}`,
    inputTokens: 100,
    outputTokens: 200,
    weightedTokens: 700,
    tokenSource: 'gerçek',
    energyMin: energy * 0.7,
    energyAvg: energy,
    energyMax: energy * 1.4,
    waterMin: energy * 0.7 * 0.2,
    waterAvg: energy * 1.0,
    waterMax: energy * 1.4 * 1.8,
    co2Min: energy * 0.7 * 0.3,
    co2Avg: energy * 0.43,
    co2Max: energy * 1.4 * 0.55,
    costUsd: 0.001,
    savingsPct: 72.3,
    isSample: false,
    createdAt: 1_700_000_000_000 + nextId * 1000,
    ...extra,
  };
}

// Sabit veri setinin kayıtları: K001–K005, D001–D005 (her aşamada birer istem).
export function fixtureRecords() {
  const records = [];
  for (let i = 0; i < 5; i++) {
    const n = String(i + 1).padStart(3, '0');
    records.push(interaction(`K${n}`, 'pretest', FIXTURE.kOn[i]));
    records.push(interaction(`K${n}`, 'posttest', FIXTURE.kSon[i]));
    records.push(interaction(`D${n}`, 'pretest', FIXTURE.dOn[i]));
    records.push(interaction(`D${n}`, 'posttest', FIXTURE.dSon[i]));
  }
  return records;
}

// Kayıtlardan giriş listesi (her kod + aşama bir kez).
export function loginsFor(records) {
  const seen = new Map();
  for (const r of records) seen.set(`${r.code}_${r.phase}`, { id: `${r.code}_${r.phase}`, code: r.code, phase: r.phase });
  return [...seen.values()];
}
