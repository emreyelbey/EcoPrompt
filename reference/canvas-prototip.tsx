import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  collection,
  writeBatch
} from 'firebase/firestore';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Leaf,
  Droplets,
  Zap,
  Cloud,
  Send,
  LogOut,
  Shield,
  BarChart3,
  FileSpreadsheet,
  FileDown,
  Trash2,
  Database,
  Users,
  BookOpen,
  Activity,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
  Search,
  X,
  Info,
  Sparkles,
  GraduationCap,
  Lock,
  TrendingDown,
  TrendingUp,
  FlaskConical,
  Eye,
  PlusCircle,
  MinusCircle,
  CheckCircle2,
  Clock,
  Lightbulb,
  PieChart as PieChartIcon,
  Layers,
  ArrowRight
} from 'lucide-react';

/* ============================================================================
 * 1. FIREBASE BAŞLATMA (BİLEŞEN DIŞINDA VE GÜVENLİ YEDEK DESTEKLİ)
 * ============================================================================ */
let firebaseApp = null;
let auth = null;
let db = null;
let hasFirebase = false;

const appId =
  typeof __app_id !== 'undefined' && __app_id
    ? String(__app_id)
    : 'ekotoken-tubitak-2204a';

try {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    const parsedConfig =
      typeof __firebase_config === 'string'
        ? JSON.parse(__firebase_config)
        : __firebase_config;
    if (parsedConfig && parsedConfig.apiKey) {
      firebaseApp = initializeApp(parsedConfig);
      auth = getAuth(firebaseApp);
      db = getFirestore(firebaseApp);
      hasFirebase = true;
    }
  }
} catch (_err) {
  hasFirebase = false;
}

/* ============================================================================
 * 2. BİLİMSEL SABİTLER, KATILIMCI KODLARI VE AKADEMİK KAYNAKÇA
 * ============================================================================ */

// Yönetici erişim doğrulama anahtarı (arayüzde kesinlikle gösterilmez)
const ADMIN_PASSCODE = 'TUBITAK2026';

// Hız sınırı ve istem uzunluğu sınırları
const RATE_LIMIT_MS = 3000;
const MAX_PROMPT_LENGTH = 4000;

// 3 Bilimsel Ölçek Sınıfı ve Katsayıları (1.000 Ağırlıklı Token Başına)
const MODEL_SCALES = {
  light: {
    id: 'light',
    name: 'Hafif Model',
    shortName: 'Hafif',
    desc: 'Hızlı, kısa ve doğrudan yanıtlar · En düşük su ve enerji tüketimi',
    energyMin: 0.12,
    energyAvg: 0.18,
    energyMax: 0.25,
    costInputPer1M: 0.10,
    costOutputPer1M: 0.40,
    color: '#10b981',
    bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    systemDepth:
      'Yanıtlarını özlü, doğrudan, sade ve gereksiz uzatmalardan kaçınarak ver. Net ve anlaşılır ol.'
  },
  standard: {
    id: 'standard',
    name: 'Standart Model',
    shortName: 'Standart',
    desc: 'Dengeli açıklama ve kavramsal derinlik · Orta düzey çevresel etki',
    energyMin: 0.45,
    energyAvg: 0.65,
    energyMax: 0.90,
    costInputPer1M: 1.25,
    costOutputPer1M: 5.00,
    color: '#3b82f6',
    bgClass: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-800',
    systemDepth:
      'Yanıtlarını dengeli, açıklayıcı, örneklerle desteklenmiş ve öğretici biçimde sun.'
  },
  reasoning: {
    id: 'reasoning',
    name: 'Akıl Yürütme Modeli',
    shortName: 'Akıl Yürütme',
    desc: 'Adım adım derin analiz ve çok katmanlı çözüm · Yüksek çevresel etki',
    energyMin: 1.40,
    energyAvg: 2.10,
    energyMax: 3.00,
    costInputPer1M: 3.00,
    costOutputPer1M: 15.00,
    color: '#8b5cf6',
    bgClass: 'bg-violet-50 text-violet-700 border-violet-200',
    badgeClass: 'bg-violet-100 text-violet-800',
    systemDepth:
      'Soruyu adım adım analiz et, gerekçelendirilmiş, kapsamlı ve çok boyutlu bir akıl yürütme ile açıkla.'
  }
};

const MODEL_ORDER = ['light', 'standard', 'reasoning'];

// Su Ayak İzi (WUE: mL / Wh) ve Şebeke Karbon Yoğunluğu (g CO2 / Wh)
const WUE = { min: 0.2, avg: 1.0, max: 1.8 };
const CARBON_INTENSITY = { min: 0.30, avg: 0.43, max: 0.55 };

// 60 Geçerli Katılımcı Kodu (K001–K030 Kontrol, D001–D030 Deney)
const PARTICIPANT_CODES = (() => {
  const list = [];
  for (let i = 1; i <= 30; i++) {
    const num = String(i).padStart(3, '0');
    list.push({
      code: `K${num}`,
      group: 'Kontrol',
      groupCode: 0,
      status: i <= 20 ? 'Asıl' : 'Yedek'
    });
  }
  for (let i = 1; i <= 30; i++) {
    const num = String(i).padStart(3, '0');
    list.push({
      code: `D${num}`,
      group: 'Deney',
      groupCode: 1,
      status: i <= 20 ? 'Asıl' : 'Yedek'
    });
  }
  return list;
})();

const PARTICIPANT_MAP = Object.fromEntries(
  PARTICIPANT_CODES.map((p) => [p.code, p])
);

// Akademik Kaynakça (Metodoloji Sekmesi ve Modalı)
const ACADEMIC_REFERENCES = [
  {
    id: 1,
    authors: 'Li, P., Yang, J., Islam, M. A., & Ren, S.',
    year: '2023–2025',
    institution: 'UC Riverside',
    title: 'Making AI Less Thirsty: Uncovering and Addressing the Secret Water Footprint of AI Models',
    note: 'Veri merkezi soğutma suyu kullanım etkinliği (WUE) ve çıkarım başına su ayak izi modeli.'
  },
  {
    id: 2,
    authors: 'Luccioni, A. S., Jernite, Y., & Strubell, E.',
    year: '2024',
    institution: 'ACM FAccT',
    title: 'Power Hungry Processing: Watts Driving the Cost of AI Deployment',
    note: 'Model ölçeği ile çıkarım (inference) enerji tüketimi arasındaki doğrusal olmayan ilişki.'
  },
  {
    id: 3,
    authors: 'EcoLogits (GenAI Impact)',
    year: '2024–2025',
    institution: 'GenAI Impact',
    title: 'Çıkarım (Inference) Enerji, PUE ve Çevresel Etki Metodolojisi',
    note: 'Otoregresif çıktı token ağırlıklandırması, GPU bellek bant genişliği ve PUE çarpanı yaklaşımı.'
  },
  {
    id: 4,
    authors: 'International Energy Agency (IEA)',
    year: '2024–2025',
    institution: 'IEA',
    title: 'Electricity & Emissions Factors — Küresel Elektrik Şebekesi Karbon Yoğunluğu Verileri',
    note: 'Küresel ve bölgesel elektrik şebekesi karbon yoğunluğu aralığı (300–550 g CO₂/kWh, ort. 430 g CO₂/kWh).'
  }
];

/* ============================================================================
 * 3. BİLİMSEL HESAPLAMA MOTORU VE GÜNLÜK HAYAT KARŞILIKLARI
 * ============================================================================ */

/**
 * Türkçe metin için token tahmini (boş metin daima 0; gizli sabit token eklenmez).
 */
function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.ceil(trimmed.length / 3.6);
}

/**
 * Bilimsel çevresel ayak izi hesaplaması.
 * Ağırlıklı Token = Girdi + 3 × Çıktı
 */
function calculateFootprint(inputTokens, outputTokens, modelId) {
  const safeInput = Math.max(0, Math.round(Number(inputTokens) || 0));
  const safeOutput = Math.max(0, Math.round(Number(outputTokens) || 0));
  const model = MODEL_SCALES[modelId] || MODEL_SCALES.standard;

  const weightedTokens = safeInput + 3 * safeOutput;
  const perThousand = weightedTokens / 1000;

  const energyMin = perThousand * model.energyMin;
  const energyAvg = perThousand * model.energyAvg;
  const energyMax = perThousand * model.energyMax;

  const waterMin = energyMin * WUE.min;
  const waterAvg = energyAvg * WUE.avg;
  const waterMax = energyMax * WUE.max;

  const co2Min = energyMin * CARBON_INTENSITY.min;
  const co2Avg = energyAvg * CARBON_INTENSITY.avg;
  const co2Max = energyMax * CARBON_INTENSITY.max;

  const costUsd =
    (safeInput / 1_000_000) * model.costInputPer1M +
    (safeOutput / 1_000_000) * model.costOutputPer1M;

  const savingsPct =
    model.id === 'light'
      ? 0
      : Math.round(((model.energyAvg - MODEL_SCALES.light.energyAvg) / model.energyAvg) * 100);

  return {
    inputTokens: safeInput,
    outputTokens: safeOutput,
    weightedTokens,
    energyMin,
    energyAvg,
    energyMax,
    waterMin,
    waterAvg,
    waterMax,
    co2Min,
    co2Avg,
    co2Max,
    costUsd,
    savingsPct
  };
}

/**
 * Sayı biçimlendirme yardımcısı (Türkçe yerel ayar)
 */
function fmtNum(val, decimals = 2) {
  const num = Number(val);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function fmtSmart(val) {
  const num = Number(val) || 0;
  if (num === 0) return '0';
  if (num < 0.01) return fmtNum(num, 4);
  if (num < 1) return fmtNum(num, 3);
  if (num < 100) return fmtNum(num, 2);
  return fmtNum(num, 1);
}

/**
 * Günlük hayat somutlaştırma hesaplayıcısı
 */
function getDailyEquivalents(waterMl, energyWh, co2Grams) {
  // Su karşılıkları
  const drops = waterMl / 0.05;
  const teaspoons = waterMl / 5;
  const glasses = waterMl / 200;
  const bottles = waterMl / 500;

  let waterPrimary = '';
  if (waterMl < 2.5) {
    waterPrimary = `≈ ${fmtNum(drops, drops < 10 ? 1 : 0)} su damlası`;
  } else if (waterMl < 80) {
    waterPrimary = `≈ ${fmtNum(teaspoons, 1)} tatlı kaşığı su`;
  } else if (waterMl < 400) {
    waterPrimary = `≈ ${fmtNum(glasses, 2)} su bardağı`;
  } else {
    waterPrimary = `≈ ${fmtNum(bottles, 2)} yarım litrelik şişe`;
  }

  // Enerji karşılıkları (10 W LED ampul: 1 Wh = 360 sn; Akıllı telefon: 15 Wh)
  const ledSeconds = energyWh * 360;
  const phonePct = (energyWh / 15) * 100;

  let ledText = '';
  if (ledSeconds < 60) {
    ledText = `${fmtNum(ledSeconds, 0)} sn`;
  } else if (ledSeconds < 3600) {
    ledText = `${fmtNum(ledSeconds / 60, 1)} dk`;
  } else {
    ledText = `${fmtNum(ledSeconds / 3600, 2)} sa`;
  }

  // Karbon karşılıkları (Araç: 120 g/km = 0.12 g/m; Olgun ağaç: 60 g/gün)
  const carMeters = co2Grams / 0.12;
  const treeDayPct = (co2Grams / 60) * 100;

  const carText =
    carMeters < 1000
      ? `${fmtNum(carMeters, carMeters < 10 ? 1 : 0)} metre araç sürüşü`
      : `${fmtNum(carMeters / 1000, 2)} km araç sürüşü`;

  const treeText =
    treeDayPct < 100
      ? `1 olgun ağacın günlük emiliminin %${fmtSmart(treeDayPct)}'i`
      : `1 olgun ağacın ${fmtNum(treeDayPct / 100, 2)} günlük CO₂ emilimi`;

  return {
    waterPrimary,
    drops,
    teaspoons,
    glasses,
    bottles,
    ledSeconds,
    ledText: `10 W LED ampulü ${ledText} yakmaya eşdeğer`,
    phonePct,
    phoneText: `Telefon bataryasının %${fmtSmart(phonePct)}'i`,
    carMeters,
    carText,
    treeDayPct,
    treeText
  };
}

/* ============================================================================
 * 4. SAF MATEMATİKSEL İSTATİSTİK MOTORU (MİNİ SPSS — α = 0.05)
 *    Log-Gamma + Lentz Sürekli Kesir Düzenlenmiş Eksik Beta Fonksiyonu
 * ============================================================================ */

function lnGamma(z) {
  const cof = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5
  ];
  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += cof[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betacf(a, b, x) {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1.0;
  const qam = a - 1.0;
  let c = 1.0;
  let d = 1.0 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1.0 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1.0 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1.0 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1.0 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1.0 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1.0) < EPS) break;
  }
  return h;
}

function regularizedIncompleteBeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    lnGamma(a + b) -
      lnGamma(a) -
      lnGamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

function studentTTwoTailedP(tStat, df) {
  if (!Number.isFinite(tStat) || !Number.isFinite(df) || df <= 0) return null;
  const tAbs = Math.abs(tStat);
  if (tAbs === 0) return 1.0;
  const x = df / (df + tAbs * tAbs);
  const p = regularizedIncompleteBeta(df / 2, 0.5, x);
  return Math.max(0, Math.min(1, p));
}

function calcDescriptives(values) {
  const n = values.length;
  if (n === 0) return { n: 0, mean: 0, sd: 0, variance: 0 };
  const mean = values.reduce((acc, v) => acc + v, 0) / n;
  if (n === 1) return { n: 1, mean, sd: 0, variance: 0 };
  const ss = values.reduce((acc, v) => acc + (v - mean) ** 2, 0);
  const variance = ss / (n - 1);
  return { n, mean, sd: Math.sqrt(variance), variance };
}

/**
 * Bağımsız Örneklem Welch t-testi (çift yönlü)
 */
function welchTTest(arr1, arr2) {
  const d1 = calcDescriptives(arr1);
  const d2 = calcDescriptives(arr2);
  if (d1.n < 2 || d2.n < 2) {
    return {
      valid: false,
      reason: 'Bağımsız örneklem t-testi için her iki grupta en az 2 katılımcı gereklidir.'
    };
  }
  const se1 = d1.variance / d1.n;
  const se2 = d2.variance / d2.n;
  const seSum = se1 + se2;
  if (seSum === 0) {
    return {
      valid: true,
      t: 0,
      df: d1.n + d2.n - 2,
      p: 1.0,
      meanDiff: d1.mean - d2.mean,
      d1,
      d2
    };
  }
  const t = (d1.mean - d2.mean) / Math.sqrt(seSum);
  const num = seSum * seSum;
  const den = (se1 * se1) / (d1.n - 1) + (se2 * se2) / (d2.n - 1);
  const df = den > 0 ? num / den : d1.n + d2.n - 2;
  const p = studentTTwoTailedP(t, df);
  return {
    valid: true,
    t,
    df,
    p,
    meanDiff: d1.mean - d2.mean,
    d1,
    d2
  };
}

/**
 * Bağımlı Örneklem (Eşleştirilmiş) t-testi (çift yönlü)
 * pairs: [{ pre, post }]
 */
function pairedTTest(pairs) {
  const n = pairs.length;
  if (n < 2) {
    return {
      valid: false,
      reason: 'Bağımlı örneklem t-testi için hem Ön Test hem Son Test verisine sahip en az 2 katılımcı gereklidir.'
    };
  }
  const diffs = pairs.map((p) => p.post - p.pre);
  const dStats = calcDescriptives(diffs);
  const df = n - 1;
  if (dStats.sd === 0) {
    return {
      valid: true,
      t: dStats.mean === 0 ? 0 : dStats.mean > 0 ? 999 : -999,
      df,
      p: dStats.mean === 0 ? 1.0 : 0.0001,
      meanDiff: dStats.mean,
      n
    };
  }
  const se = dStats.sd / Math.sqrt(n);
  const t = dStats.mean / se;
  const p = studentTTwoTailedP(t, df);
  return {
    valid: true,
    t,
    df,
    p,
    meanDiff: dStats.mean,
    n
  };
}

function formatPValue(p) {
  if (p === null || p === undefined || !Number.isFinite(p)) return '—';
  if (p < 0.001) return '< 0,001';
  return fmtNum(p, 4);
}

/* ============================================================================
 * 5. GEMINI API ENTEGRASYONU (ÜSTEL GERİ ÇEKİLME & GERÇEK TOKEN METADATA)
 * ============================================================================ */

function buildSystemInstruction(modelId) {
  const scale = MODEL_SCALES[modelId] || MODEL_SCALES.standard;
  return [
    'Sen lise öğrencilerine yardımcı olan, yapay zeka destekli bir eğitim asistanısın.',
    'Her zaman doğal, akıcı, saygılı ve doyurucu Türkçe yanıtlar ver.',
    `Yanıt derinliği yaklaşımın: ${scale.systemDepth}`,
    'ÇOK ÖNEMLİ BİÇİM KURALI: Yanıt biçimini sorunun türüne göre doğal olarak uyarla. Kullanıcı hikâye, şiir, deneme, günlük konuşma veya serbest sohbet istediğinde yapay olarak fizik/matematik formülü veya sosyoloji/karşılaştırma tablosu UYDURMA.',
    'Yalnızca ders anlatımı, fen/matematik problem çözümü, bilimsel kavram açıklaması veya yapılandırılmış rehber istendiğinde başlıklar, numaralı adımlar, tablolar ve gerçekten gerekli olduğunda LaTeX ($...$ veya $$...$$) formülleri kullan.',
    'Para tutarı yazarken (ör. $10 veya $0.15) formül işaretleyici kullanma.',
    'GİZLİLİK VE TARAFSIZLIK KURALI: Kendinden bahsederken veya yanıtlarının hiçbir yerinde ticari yapay zeka marka, şirket veya ürün adlarını (OpenAI, ChatGPT, Claude, Anthropic, Gemini, Google vb.) KESİNLİKLE anma. Yalnızca "Eğitim Asistanı" olarak hitap et.'
  ].join(' ');
}

async function fetchWithBackoff(url, options, maxRetries = 3) {
  let attempt = 0;
  let lastError = null;
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`Sunucu yanıt kodu: ${response.status}`);
      } else {
        let errDetail = '';
        try {
          const errJson = await response.json();
          errDetail = errJson?.error?.message || '';
        } catch (_e) {
          // ignore
        }
        throw new Error(
          errDetail
            ? 'Yapay zeka servisi şu an yanıt üretemedi. Lütfen birkaç saniye sonra tekrar deneyin.'
            : `İstek işlenemedi (Kod: ${response.status}).`
        );
      }
    } catch (err) {
      lastError = err;
      if (attempt >= maxRetries - 1) break;
    }
    const delayMs = 1000 * Math.pow(2, attempt);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    attempt++;
  }
  throw (
    lastError ||
    new Error('Bağlantı zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.')
  );
}

async function requestAssistantResponse(promptText, historyMessages, modelId) {
  const apiKey = '';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  // Çok turlu sohbet bağlamı (son 12 etkileşime kadar)
  const recentHistory = historyMessages.slice(-12);
  const contents = [];
  for (const item of recentHistory) {
    if (item.prompt) {
      contents.push({ role: 'user', parts: [{ text: item.prompt }] });
    }
    if (item.response) {
      contents.push({ role: 'model', parts: [{ text: item.response }] });
    }
  }
  contents.push({ role: 'user', parts: [{ text: promptText }] });

  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: buildSystemInstruction(modelId) }]
    },
    generationConfig: {
      temperature: modelId === 'reasoning' ? 0.5 : 0.7
    }
  };

  const response = await fetchWithBackoff(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const textParts = candidate?.content?.parts
    ?.filter((p) => typeof p.text === 'string')
    .map((p) => p.text)
    .join('\n')
    .trim();

  if (!textParts) {
    throw new Error('Asistan geçerli bir metin yanıtı döndüremedi. Lütfen tekrar deneyin.');
  }

  // Gerçek usageMetadata varsa doğrudan kullan; yoksa Türkçe metin tahmini
  const usage = data?.usageMetadata;
  let inputTokens = estimateTokens(promptText);
  let outputTokens = estimateTokens(textParts);
  let tokenSource = 'tahmini';

  if (usage && typeof usage.promptTokenCount === 'number' && usage.promptTokenCount > 0) {
    inputTokens = usage.promptTokenCount;
    const candTokens = typeof usage.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : 0;
    const thoughtTokens = typeof usage.thoughtsTokenCount === 'number' ? usage.thoughtsTokenCount : 0;
    const totalOut = candTokens + thoughtTokens;
    outputTokens = totalOut > 0 ? totalOut : estimateTokens(textParts);
    tokenSource = 'gerçek';
  }

  return {
    responseText: textParts,
    inputTokens,
    outputTokens,
    tokenSource
  };
}

/* ============================================================================
 * 6. GERÇEK 4 SAYFALI EXCEL (.XLSX) VE CSV DIŞA AKTARIM MOTORU
 *    (SheetJS CDN + Sıfır Bağımlılıklı Saf OOXML .xlsx Çevrimdışı Yedek)
 * ============================================================================ */

function xmlEscape(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colIndexToLetter(idx) {
  let letter = '';
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

// CRC32 tablosu (saf JS ZIP arşivleyici için)
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZipBlob(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const crc = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((s, b) => s + b.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, eocd], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

function buildFallbackXlsxBlob(sheets) {
  const files = [];
  const contentTypesOverrides = [];
  const workbookSheets = [];
  const workbookRels = [];

  sheets.forEach((sheet, idx) => {
    const sheetNum = idx + 1;
    const sheetXmlPath = `xl/worksheets/sheet${sheetNum}.xml`;
    contentTypesOverrides.push(
      `<Override PartName="/${sheetXmlPath}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    );
    workbookSheets.push(
      `<sheet name="${xmlEscape(sheet.name)}" sheetId="${sheetNum}" r:id="rId${sheetNum}"/>`
    );
    workbookRels.push(
      `<Relationship Id="rId${sheetNum}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheetNum}.xml"/>`
    );

    const rowsXml = sheet.rows
      .map((row, rIdx) => {
        const cellsXml = row
          .map((val, cIdx) => {
            const ref = `${colIndexToLetter(cIdx)}${rIdx + 1}`;
            if (typeof val === 'number' && Number.isFinite(val)) {
              return `<c r="${ref}"><v>${val}</v></c>`;
            }
            return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(val ?? '')}</t></is></c>`;
          })
          .join('');
        return `<row r="${rIdx + 1}">${cellsXml}</row>`;
      })
      .join('');

    files.push({
      name: sheetXmlPath,
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml}</sheetData></worksheet>`
    });
  });

  files.push({
    name: '[Content_Types].xml',
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${contentTypesOverrides.join('')}</Types>`
  });

  files.push({
    name: '_rels/.rels',
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  });

  files.push({
    name: 'xl/workbook.xml',
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets.join('')}</sheets></workbook>`
  });

  files.push({
    name: 'xl/_rels/workbook.xml.rels',
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels.join('')}</Relationships>`
  });

  return createZipBlob(files);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

function downloadCsvFile(filename, headers, rows) {
  const escapeCsv = (val) => {
    const str = String(val ?? '');
    if (/[",;\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    headers.map(escapeCsv).join(';'),
    ...rows.map((r) => r.map(escapeCsv).join(';'))
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;'
  });
  triggerDownload(blob, filename);
}

let sheetJsPromise = null;
function loadSheetJS() {
  if (typeof window !== 'undefined' && window.XLSX) {
    return Promise.resolve(window.XLSX);
  }
  if (!sheetJsPromise) {
    sheetJsPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
      script.async = true;
      script.onload = () => resolve(window.XLSX || null);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }
  return sheetJsPromise;
}

async function exportFourSheetExcel(interactions) {
  const round4 = (n) => Math.round((Number(n) || 0) * 10000) / 10000;
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

  // 1. Tum_Kayitlar
  const sheet1Header = [
    'Tarih',
    'Aşama',
    'Katılımcı Kodu',
    'Grup',
    'Model Sınıfı',
    'Girdi Token',
    'Çıktı Token',
    'Ağırlıklı Token',
    'Enerji Min (Wh)',
    'Enerji Ort (Wh)',
    'Enerji Maks (Wh)',
    'Su Min (mL)',
    'Su Ort (mL)',
    'Su Maks (mL)',
    'CO2 Min (g)',
    'CO2 Ort (g)',
    'CO2 Maks (g)',
    'Tahmini Maliyet ($)',
    'İstem'
  ];

  const sorted = [...interactions].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const sheet1Rows = [
    sheet1Header,
    ...sorted.map((it) => [
      it.createdAt ? new Date(it.createdAt).toLocaleString('tr-TR') : '',
      it.phase === 'posttest' ? 'Son Test' : 'Ön Test',
      it.code,
      it.group,
      MODEL_SCALES[it.modelId]?.name || it.modelId,
      it.inputTokens || 0,
      it.outputTokens || 0,
      it.weightedTokens || 0,
      round4(it.energyMin),
      round4(it.energyAvg),
      round4(it.energyMax),
      round4(it.waterMin),
      round4(it.waterAvg),
      round4(it.waterMax),
      round4(it.co2Min),
      round4(it.co2Avg),
      round4(it.co2Max),
      round4(it.costUsd),
      it.prompt || ''
    ])
  ];

  // Öğrenci bazlı özetler (60 kodun tamamı)
  const perStudent = PARTICIPANT_CODES.map((p) => {
    const mine = interactions.filter((i) => i.code === p.code);
    const pre = mine.filter((i) => i.phase === 'pretest');
    const post = mine.filter((i) => i.phase === 'posttest');
    const agg = (arr) => ({
      count: arr.length,
      water: arr.reduce((s, x) => s + (x.waterAvg || 0), 0),
      energy: arr.reduce((s, x) => s + (x.energyAvg || 0), 0),
      co2: arr.reduce((s, x) => s + (x.co2Avg || 0), 0),
      lightPct:
        arr.length > 0
          ? (arr.filter((x) => x.modelId === 'light').length / arr.length) * 100
          : 0
    });
    const preA = agg(pre);
    const postA = agg(post);
    const totA = agg(mine);
    return { ...p, preA, postA, totA };
  });

  // 2. Ogrenci_Ozetleri
  const sheet2Header = [
    'Katılımcı Kodu',
    'Grup',
    'Statü',
    'Ön Test İstem',
    'Ön Test Su (mL)',
    'Ön Test Enerji (Wh)',
    'Ön Test CO2 (g)',
    'Son Test İstem',
    'Son Test Su (mL)',
    'Son Test Enerji (Wh)',
    'Son Test CO2 (g)',
    'Toplam İstem',
    'Toplam Su (mL)',
    'Toplam Enerji (Wh)',
    'Toplam CO2 (g)'
  ];
  const sheet2Rows = [
    sheet2Header,
    ...perStudent.map((s) => [
      s.code,
      s.group,
      s.status,
      s.preA.count,
      round4(s.preA.water),
      round4(s.preA.energy),
      round4(s.preA.co2),
      s.postA.count,
      round4(s.postA.water),
      round4(s.postA.energy),
      round4(s.postA.co2),
      s.totA.count,
      round4(s.totA.water),
      round4(s.totA.energy),
      round4(s.totA.co2)
    ])
  ];

  // 3. Grup_Karsilastirma (4 hücre: Kontrol/Deney x Ön/Son)
  const cells = [
    { label: 'Kontrol - Ön Test', group: 'Kontrol', phase: 'pretest' },
    { label: 'Kontrol - Son Test', group: 'Kontrol', phase: 'posttest' },
    { label: 'Deney - Ön Test', group: 'Deney', phase: 'pretest' },
    { label: 'Deney - Son Test', group: 'Deney', phase: 'posttest' }
  ];
  const sheet3Header = [
    'Hücre',
    'Grup',
    'Aşama',
    'Aktif Katılımcı (n)',
    'Toplam İstem',
    'Öğrenci Başına Ort. İstem',
    'Toplam Su (mL)',
    'Öğrenci Başına Ort. Su (mL)',
    'Toplam Enerji (Wh)',
    'Öğrenci Başına Ort. Enerji (Wh)',
    'Toplam CO2 (g)',
    'Öğrenci Başına Ort. CO2 (g)',
    'Hafif Model Oranı (%)'
  ];
  const sheet3Rows = [
    sheet3Header,
    ...cells.map((c) => {
      const subset = interactions.filter((i) => i.group === c.group && i.phase === c.phase);
      const uniqueCodes = new Set(subset.map((i) => i.code));
      const n = uniqueCodes.size;
      const totPrompts = subset.length;
      const totWater = subset.reduce((s, x) => s + (x.waterAvg || 0), 0);
      const totEnergy = subset.reduce((s, x) => s + (x.energyAvg || 0), 0);
      const totCo2 = subset.reduce((s, x) => s + (x.co2Avg || 0), 0);
      const lightPct =
        totPrompts > 0
          ? (subset.filter((x) => x.modelId === 'light').length / totPrompts) * 100
          : 0;
      return [
        c.label,
        c.group,
        c.phase === 'posttest' ? 'Son Test' : 'Ön Test',
        n,
        totPrompts,
        n > 0 ? round2(totPrompts / n) : 0,
        round4(totWater),
        n > 0 ? round4(totWater / n) : 0,
        round4(totEnergy),
        n > 0 ? round4(totEnergy / n) : 0,
        round4(totCo2),
        n > 0 ? round4(totCo2 / n) : 0,
        round2(lightPct)
      ];
    })
  ];

  // 4. SPSS_Veri_Seti (Geniş format, 1 öğrenci = 1 satır)
  const sheet4Header = [
    'Katilimci_Kodu',
    'Grup_Kodu',
    'Grup_Adi',
    'Statu',
    'OnTest_Istem',
    'OnTest_Su_mL',
    'OnTest_Enerji_Wh',
    'OnTest_CO2_g',
    'OnTest_HafifPct',
    'SonTest_Istem',
    'SonTest_Su_mL',
    'SonTest_Enerji_Wh',
    'SonTest_CO2_g',
    'SonTest_HafifPct',
    'Fark_Istem',
    'Fark_Su_mL',
    'Fark_Enerji_Wh',
    'Fark_CO2_g',
    'Fark_HafifPct'
  ];
  const sheet4Rows = [
    sheet4Header,
    ...perStudent.map((s) => [
      s.code,
      s.groupCode,
      s.group,
      s.status,
      s.preA.count,
      round4(s.preA.water),
      round4(s.preA.energy),
      round4(s.preA.co2),
      round2(s.preA.lightPct),
      s.postA.count,
      round4(s.postA.water),
      round4(s.postA.energy),
      round4(s.postA.co2),
      round2(s.postA.lightPct),
      s.postA.count - s.preA.count,
      round4(s.postA.water - s.preA.water),
      round4(s.postA.energy - s.preA.energy),
      round4(s.postA.co2 - s.preA.co2),
      round2(s.postA.lightPct - s.preA.lightPct)
    ])
  ];

  const sheets = [
    { name: 'Tum_Kayitlar', rows: sheet1Rows },
    { name: 'Ogrenci_Ozetleri', rows: sheet2Rows },
    { name: 'Grup_Karsilastirma', rows: sheet3Rows },
    { name: 'SPSS_Veri_Seti', rows: sheet4Rows }
  ];

  const dateTag = new Date().toISOString().slice(0, 10);
  const filename = `EkoToken_TUBITAK2204A_VeriSeti_${dateTag}.xlsx`;

  const XLSX = await loadSheetJS();
  if (XLSX && XLSX.utils) {
    const wb = XLSX.utils.book_new();
    sheets.forEach((sh) => {
      const ws = XLSX.utils.aoa_to_sheet(sh.rows);
      XLSX.utils.book_append_sheet(wb, ws, sh.name);
    });
    XLSX.writeFile(wb, filename);
  } else {
    const blob = buildFallbackXlsxBlob(sheets);
    triggerDownload(blob, filename);
  }
}

/* ============================================================================
 * 7. ZENGİN MESAJ GÖSTERİCİSİ (RichMessage: Markdown + KaTeX + Çevrimdışı Yedek)
 * ============================================================================ */

let katexLoadState = 'idle'; // 'idle' | 'loading' | 'ready' | 'failed'
const katexListeners = new Set();

function ensureKatexLoaded(onUpdate) {
  if (typeof window === 'undefined') return;
  if (window.katex) {
    katexLoadState = 'ready';
    return;
  }
  if (onUpdate) katexListeners.add(onUpdate);
  if (katexLoadState !== 'idle') return;
  katexLoadState = 'loading';

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
  document.head.appendChild(css);

  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
  script.async = true;
  script.onload = () => {
    katexLoadState = 'ready';
    katexListeners.forEach((fn) => fn());
    katexListeners.clear();
  };
  script.onerror = () => {
    katexLoadState = 'failed';
    katexListeners.forEach((fn) => fn());
    katexListeners.clear();
  };
  document.head.appendChild(script);
}

/**
 * KaTeX erişilemediğinde devreye giren temiz çevrimdışı LaTeX -> HTML ayrıştırıcısı.
 * Ham $ veya \ bırakmadan kesir, karekök, üs, alt indis ve Yunan harflerini çizer.
 */
function renderOfflineMathHtml(latex) {
  let s = String(latex || '').trim();
  // HTML karakterlerini kaçır
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // \text{...} ve \mathrm{...}
  s = s.replace(/\\(?:text|mathrm|mathbf|operatorname)\{([^}]*)\}/g, '<span class="not-italic font-sans">$1</span>');

  // İç içe olmayan ve basit iç içe \frac{a}{b}
  for (let i = 0; i < 3; i++) {
    s = s.replace(
      /\\frac\{([^{}]+)\}\{([^{}]+)\}/g,
      '<span class="inline-flex flex-col items-center align-middle mx-0.5 text-[0.88em] leading-tight"><span class="border-b border-current px-1 pb-0.5">$1</span><span class="px-1 pt-0.5">$2</span></span>'
    );
  }

  // \sqrt{x}
  s = s.replace(
    /\\sqrt\{([^{}]+)\}/g,
    '<span class="inline-flex items-center">√<span class="border-t border-current px-0.5">$1</span></span>'
  );

  // \bar{x}, \hat{x}
  s = s.replace(/\\bar\{([^{}]+)\}/g, '<span class="border-t border-current leading-none inline-block">$1</span>');
  s = s.replace(/\\hat\{([^{}]+)\}/g, '$1̂');

  // Yunan harfleri ve matematiksel semboller
  const symbols = {
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\Delta': 'Δ',
    '\\epsilon': 'ε', '\\theta': 'θ', '\\lambda': 'λ', '\\mu': 'μ', '\\pi': 'π',
    '\\sigma': 'σ', '\\Sigma': 'Σ', '\\omega': 'ω', '\\Omega': 'Ω', '\\phi': 'φ',
    '\\times': '×', '\\cdot': '·', '\\div': '÷', '\\pm': '±', '\\approx': '≈',
    '\\neq': '≠', '\\ne': '≠', '\\le': '≤', '\\leq': '≤', '\\ge': '≥', '\\geq': '≥',
    '\\infty': '∞', '\\rightarrow': '→', '\\to': '→', '\\leftarrow': '←',
    '\\Rightarrow': '⇒', '\\Leftrightarrow': '⇔', '\\degree': '°', '\\circ': '°',
    '\\lceil': '⌈', '\\rceil': '⌉', '\\lfloor': '⌊', '\\rfloor': '⌋',
    '\\sum': '∑', '\\int': '∫', '\\partial': '∂', '\\in': '∈', '\\subset': '⊂',
    '\\cup': '∪', '\\cap': '∩', '\\forall': '∀', '\\exists': '∃',
    '\\%': '%', '\\ ': ' ', '\\,': ' ', '\\;': ' ', '\\quad': '  '
  };
  Object.entries(symbols).forEach(([k, v]) => {
    s = s.split(k).join(v);
  });

  // Üs ve alt indisler: ^{...}, _{...}, ^2, _2
  s = s.replace(/\^\{([^{}]+)\}/g, '<sup class="text-[0.75em]">$1</sup>');
  s = s.replace(/_\{([^{}]+)\}/g, '<sub class="text-[0.75em]">$1</sub>');
  s = s.replace(/\^([A-Za-z0-9+\-])/g, '<sup class="text-[0.75em]">$1</sup>');
  s = s.replace(/_([A-Za-z0-9+\-])/g, '<sub class="text-[0.75em]">$1</sub>');

  // Kalan süslü parantez ve kaçışları temizle
  s = s.replace(/\\left|\\right/g, '');
  s = s.replace(/\\([A-Za-z]+)/g, '$1');
  s = s.replace(/[{}]/g, '');

  return s;
}

function MathSpan({ expr, displayMode = false }) {
  const html = useMemo(() => {
    if (typeof window !== 'undefined' && window.katex) {
      try {
        return window.katex.renderToString(expr, {
          displayMode,
          throwOnError: false,
          strict: false
        });
      } catch (_e) {
        return renderOfflineMathHtml(expr);
      }
    }
    return renderOfflineMathHtml(expr);
  }, [expr, displayMode]);

  if (displayMode) {
    return (
      <div
        className="my-2.5 overflow-x-auto py-2 px-3 rounded-lg bg-slate-50/90 border border-slate-200/80 text-center font-serif text-slate-900"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <span
      className="font-serif text-[1.02em] px-0.5 text-slate-900"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Satır içi Markdown + Matematik ayrıştırıcısı (Para birimi korumalı: $0.15, $10 bozulmaz)
 */
function renderInlineTokens(text, keyPrefix = 'in') {
  if (!text) return null;
  const nodes = [];
  let i = 0;
  let buf = '';
  let tokenIdx = 0;

  const flushBuf = () => {
    if (buf) {
      nodes.push(<React.Fragment key={`${keyPrefix}-t-${tokenIdx++}`}>{buf}</React.Fragment>);
      buf = '';
    }
  };

  while (i < text.length) {
    // 1. Satır içi kod `...`
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        flushBuf();
        nodes.push(
          <code
            key={`${keyPrefix}-c-${tokenIdx++}`}
            className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[0.86em] border border-slate-200"
          >
            {text.slice(i + 1, end)}
          </code>
        );
        i = end + 1;
        continue;
      }
    }

    // 2. Satır içi blok formül $$...$$
    if (text[i] === '$' && text[i + 1] === '$') {
      const end = text.indexOf('$$', i + 2);
      if (end !== -1) {
        flushBuf();
        nodes.push(
          <MathSpan
            key={`${keyPrefix}-dm-${tokenIdx++}`}
            expr={text.slice(i + 2, end).trim()}
            displayMode
          />
        );
        i = end + 2;
        continue;
      }
    }

    // 3. \( ... \) veya \[ ... \]
    if (text[i] === '\\' && text[i + 1] === '(') {
      const end = text.indexOf('\\)', i + 2);
      if (end !== -1) {
        flushBuf();
        nodes.push(
          <MathSpan key={`${keyPrefix}-lm-${tokenIdx++}`} expr={text.slice(i + 2, end).trim()} />
        );
        i = end + 2;
        continue;
      }
    }
    if (text[i] === '\\' && text[i + 1] === '[') {
      const end = text.indexOf('\\]', i + 2);
      if (end !== -1) {
        flushBuf();
        nodes.push(
          <MathSpan
            key={`${keyPrefix}-lb-${tokenIdx++}`}
            expr={text.slice(i + 2, end).trim()}
            displayMode
          />
        );
        i = end + 2;
        continue;
      }
    }

    // 4. Satır içi $...$ (Para birimi korumalı: $0.15, $10, $1.25 gibi ifadeleri korur)
    if (text[i] === '$') {
      const rest = text.slice(i);
      const currencyMatch = rest.match(/^\$\d+(?:[.,]\d+)?(?=\s|[,.;:!?)/·\-]|$)/);
      // Eğer saf para birimi kalıbıysa ve hemen bitişiğinde matematik operatörü yoksa metin olarak bırak
      if (currencyMatch) {
        const afterChar = rest[currencyMatch[0].length];
        if (!afterChar || !/[\\^_+=<>*/]/.test(afterChar)) {
          buf += currencyMatch[0];
          i += currencyMatch[0].length;
          continue;
        }
      }

      if (text[i + 1] && text[i + 1] !== ' ' && text[i + 1] !== '$') {
        let end = i + 1;
        while (end < text.length) {
          if (text[end] === '$' && text[end - 1] !== '\\') break;
          end++;
        }
        if (end < text.length && text[end - 1] !== ' ') {
          const candidate = text.slice(i + 1, end);
          // İki para birimi arasındaki normal Türkçe cümleyi yanlışlıkla formül sanma
          const looksLikeCurrencySpan =
            /^\d+(?:[.,]\d+)?\s+[a-zA-ZçğıöşüÇĞİÖŞÜ]{2,}/.test(candidate) &&
            !/[\\^_=<>]/.test(candidate);
          if (!looksLikeCurrencySpan && candidate.length <= 220) {
            flushBuf();
            nodes.push(<MathSpan key={`${keyPrefix}-im-${tokenIdx++}`} expr={candidate} />);
            i = end + 1;
            continue;
          }
        }
      }
    }

    // 5. Kalın **...**
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        flushBuf();
        nodes.push(
          <strong key={`${keyPrefix}-b-${tokenIdx++}`} className="font-semibold text-slate-900">
            {renderInlineTokens(text.slice(i + 2, end), `${keyPrefix}-b${tokenIdx}`)}
          </strong>
        );
        i = end + 2;
        continue;
      }
    }

    // 6. Üstü çizili ~~...~~
    if (text[i] === '~' && text[i + 1] === '~') {
      const end = text.indexOf('~~', i + 2);
      if (end !== -1) {
        flushBuf();
        nodes.push(
          <del key={`${keyPrefix}-del-${tokenIdx++}`} className="text-slate-500">
            {renderInlineTokens(text.slice(i + 2, end), `${keyPrefix}-d${tokenIdx}`)}
          </del>
        );
        i = end + 2;
        continue;
      }
    }

    // 7. İtalik *...*
    if (text[i] === '*' && text[i + 1] !== ' ' && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1 && text[end - 1] !== ' ') {
        flushBuf();
        nodes.push(
          <em key={`${keyPrefix}-it-${tokenIdx++}`} className="italic">
            {renderInlineTokens(text.slice(i + 1, end), `${keyPrefix}-i${tokenIdx}`)}
          </em>
        );
        i = end + 1;
        continue;
      }
    }

    buf += text[i];
    i++;
  }

  flushBuf();
  return nodes;
}

function RichMessage({ content, showCopyButton = true }) {
  const [, forceTick] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    ensureKatexLoaded(() => forceTick((n) => n + 1));
  }, []);

  const handleCopy = () => {
    try {
      navigator.clipboard?.writeText(content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_e) {
      // ignore
    }
  };

  const blocks = useMemo(() => {
    const raw = String(content || '').replace(/\r\n/g, '\n');
    const lines = raw.split('\n');
    const result = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      // Kod bloğu ```
      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim();
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // kapatıcı ```
        result.push({ type: 'code', lang, text: codeLines.join('\n') });
        continue;
      }

      // Çok satırlı blok matematik $$ ... $$ veya \[ ... \]
      if (trimmed.startsWith('$$') || trimmed.startsWith('\\[')) {
        const isBracket = trimmed.startsWith('\\[');
        const closeDelim = isBracket ? '\\]' : '$$';
        const openLen = 2;
        if (trimmed.endsWith(closeDelim) && trimmed.length > 4) {
          result.push({
            type: 'math',
            text: trimmed.slice(openLen, -2).trim()
          });
          i++;
          continue;
        }
        const mathLines = [trimmed.slice(openLen)];
        i++;
        while (i < lines.length && !lines[i].trim().endsWith(closeDelim)) {
          mathLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          mathLines.push(lines[i].trim().slice(0, -2));
          i++;
        }
        result.push({ type: 'math', text: mathLines.join('\n').trim() });
        continue;
      }

      // Yatay ayırıcı ---, ***, ___
      if (/^([-*_])\1{2,}$/.test(trimmed)) {
        result.push({ type: 'hr' });
        i++;
        continue;
      }

      // Başlıklar # - ###### (6 seviye dahil ####)
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        result.push({
          type: 'heading',
          level: headingMatch[1].length,
          text: headingMatch[2].trim()
        });
        i++;
        continue;
      }

      // Alıntı >
      if (trimmed.startsWith('>')) {
        const quoteLines = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        result.push({ type: 'blockquote', text: quoteLines.join('\n') });
        continue;
      }

      // Markdown Tablosu
      if (
        trimmed.includes('|') &&
        i + 1 < lines.length &&
        /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(lines[i + 1])
      ) {
        const parseRow = (r) =>
          r
            .trim()
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((c) => c.trim());
        const headers = parseRow(line);
        i += 2; // başlık + ayırıcı satırı atla
        const rows = [];
        while (i < lines.length && lines[i].trim().includes('|')) {
          rows.push(parseRow(lines[i]));
          i++;
        }
        result.push({ type: 'table', headers, rows });
        continue;
      }

      // Madde / Numaralı Listeler (iç içe girinti destekli)
      if (/^(\s*)([-*+]|\d+\.)\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^(\s*)([-*+]|\d+\.)\s+/.test(lines[i])) {
          const m = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
          const indent = Math.min(3, Math.floor((m[1] || '').length / 2));
          const ordered = /^\d+\.$/.test(m[2]);
          items.push({
            indent,
            ordered,
            marker: m[2],
            text: m[3]
          });
          i++;
        }
        result.push({ type: 'list', items });
        continue;
      }

      // Normal paragraf
      const paraLines = [];
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !lines[i].trim().startsWith('```') &&
        !lines[i].trim().startsWith('$$') &&
        !lines[i].trim().startsWith('\\[') &&
        !lines[i].trim().startsWith('>') &&
        !/^(#{1,6})\s+/.test(lines[i]) &&
        !/^([-*_])\1{2,}$/.test(lines[i].trim()) &&
        !/^(\s*)([-*+]|\d+\.)\s+/.test(lines[i])
      ) {
        // Sonraki satır tablo başlatıyorsa paragrafı kes
        if (
          lines[i].includes('|') &&
          i + 1 < lines.length &&
          /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(lines[i + 1])
        ) {
          break;
        }
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length > 0) {
        result.push({ type: 'paragraph', text: paraLines.join('\n') });
      }
    }

    return result;
  }, [content]);

  const headingClasses = {
    1: 'text-lg font-bold text-slate-900 mt-3 mb-1.5 pb-1 border-b border-slate-200',
    2: 'text-base font-bold text-slate-900 mt-3 mb-1.5',
    3: 'text-[15px] font-semibold text-slate-800 mt-2.5 mb-1',
    4: 'text-sm font-semibold text-slate-800 mt-2 mb-1',
    5: 'text-xs font-bold uppercase tracking-wide text-slate-700 mt-2 mb-0.5',
    6: 'text-xs font-semibold text-slate-600 mt-1.5 mb-0.5'
  };

  return (
    <div className="relative group text-[14.5px] leading-relaxed text-slate-800 space-y-2 break-words">
      {showCopyButton && (
        <button
          type="button"
          onClick={handleCopy}
          title="Yanıtı Kopyala"
          className="float-right ml-2 mb-1 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-500 bg-slate-100/90 hover:bg-slate-200 hover:text-slate-800 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">Kopyalandı</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Kopyala</span>
            </>
          )}
        </button>
      )}

      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          const Tag = `h${block.level}`;
          return (
            <Tag key={idx} className={headingClasses[block.level] || headingClasses[4]}>
              {renderInlineTokens(block.text, `h-${idx}`)}
            </Tag>
          );
        }

        if (block.type === 'hr') {
          return <hr key={idx} className="my-3 border-slate-200" />;
        }

        if (block.type === 'math') {
          return <MathSpan key={idx} expr={block.text} displayMode />;
        }

        if (block.type === 'code') {
          return (
            <div
              key={idx}
              className="my-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 text-slate-100"
            >
              {block.lang && (
                <div className="px-3 py-1 bg-slate-800 text-[11px] font-mono text-slate-300 border-b border-slate-700">
                  {block.lang}
                </div>
              )}
              <pre className="p-3 overflow-x-auto text-xs font-mono leading-relaxed">
                <code>{block.text}</code>
              </pre>
            </div>
          );
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={idx}
              className="my-2 pl-3 py-1.5 border-l-4 border-emerald-400 bg-emerald-50/40 rounded-r-md text-slate-700 text-sm italic"
            >
              {block.text.split('\n').map((qLine, qIdx) => (
                <p key={qIdx}>{renderInlineTokens(qLine, `q-${idx}-${qIdx}`)}</p>
              ))}
            </blockquote>
          );
        }

        if (block.type === 'table') {
          return (
            <div key={idx} className="my-2.5 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    {block.headers.map((h, hIdx) => (
                      <th key={hIdx} className="px-3 py-2 border-b border-slate-200">
                        {renderInlineTokens(h, `th-${idx}-${hIdx}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {block.rows.map((r, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50">
                      {r.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-slate-700">
                          {renderInlineTokens(cell, `td-${idx}-${rIdx}-${cIdx}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={idx} className="space-y-1 my-1.5">
              {block.items.map((item, liIdx) => (
                <li
                  key={liIdx}
                  style={{ paddingLeft: `${item.indent * 18}px` }}
                  className="flex items-start gap-2"
                >
                  <span className="shrink-0 mt-0.5 text-slate-500 font-semibold text-xs min-w-[16px]">
                    {item.ordered ? item.marker : '•'}
                  </span>
                  <span className="flex-1">
                    {renderInlineTokens(item.text, `li-${idx}-${liIdx}`)}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        // Paragraf
        return (
          <p key={idx} className="whitespace-pre-wrap">
            {renderInlineTokens(block.text, `p-${idx}`)}
          </p>
        );
      })}
    </div>
  );
}

/* ============================================================================
 * 8. ÖRNEK VERİ ÜRETİCİSİ (ÖN TEST DENK, SON TEST DENEY GRUBU p < 0.05)
 * ============================================================================ */

function generateSampleInteractions() {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const samples = [];

  const heavyQuestions = [
    {
      q: 'Newton hareket yasalarını günlük hayattan örneklerle ve temel formülleriyle detaylıca açıklar mısın?',
      a: '### Newton\'un Hareket Yasaları\n\n1. **Eylemsizlik Yasası (1. Yasa):** Bir cisme etki eden net kuvvet sıfır ($F_{\\text{net}} = 0$) ise cisim duruyorsa durmaya, hareketliyse sabit hızla hareketine devam eder.\n2. **Dinamiğin Temel Yasası (2. Yasa):** Net kuvvet, kütle ile ivmenin çarpımına eşittir:\n$$F_{\\text{net}} = m \\cdot a$$\n3. **Etki–Tepki Yasası (3. Yasa):** Her etkiye karşılık eşit büyüklükte ve zıt yönde bir tepki kuvveti oluşur.\n\n- **Örnek:** Ani fren yapan otobüste öne doğru savrulmamız 1. yasaya, roketlerin gaz itişiyle yükselmesi 3. yasaya örnektir.'
    },
    {
      q: 'Mitoz ve mayoz bölünme arasındaki temel farkları tablo halinde kapsamlı şekilde karşılaştır.',
      a: '### Mitoz ve Mayoz Bölünme Karşılaştırması\n\n| Özellik | Mitoz Bölünme | Mayoz Bölünme |\n| :--- | :--- | :--- |\n| Oluşan Hücre Sayısı | 2 hücre | 4 hücre |\n| Kromozom Sayısı | Sabit kalır ($2n \\to 2n$) | Yarıya iner ($2n \\to n$) |\n| Genetik Çeşitlilik | Yoktur | Krossing-over ile vardır |\n| Görüldüğü Hücreler | Vücut hücreleri | Üreme ana hücreleri |\n\nMitoz büyüme ve onarımı sağlarken, mayoz eşeyli üremede tür içi çeşitliliği ve kromozom sayısının nesiller boyu korunmasını sağlar.'
    },
    {
      q: 'İkinci dereceden bir denklemin köklerini bulmak için diskriminant yöntemini adım adım anlat.',
      a: '### Diskriminant ($\\Delta$) Yöntemi\n\nGenel biçimi $ax^2 + bx + c = 0$ ($a \\neq 0$) olan denklemde diskriminant şöyle hesaplanır:\n$$\\Delta = b^2 - 4ac$$\n\n- $\\Delta > 0$ ise iki farklı gerçel kök vardır:\n$$x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$$\n- $\\Delta = 0$ ise çakışık tek gerçel kök vardır ($x_1 = x_2 = \\frac{-b}{2a}$).\n- $\\Delta < 0$ ise gerçel kök yoktur.'
    },
    {
      q: 'Osmanlı Devleti\'nde Tanzimat Fermanı\'nın ilan edilme nedenlerini ve sonuçlarını özetle.',
      a: '### Tanzimat Fermanı (3 Kasım 1839)\n\n#### Temel Nedenler\n- Devletin dağılmasını önlemek ve azınlık isyanlarını durdurmak.\n- Avrupalı devletlerin iç işlerine müdahalesini engellemek.\n- Hukuk ve yönetim alanında modernleşmeyi başlatmak.\n\n#### Başlıca Sonuçlar\n1. Kanun üstünlüğü ilkesi ilk kez kabul edildi.\n2. Can, mal ve namus güvenliği devlet güvencesine alındı.\n3. Vergilerin herkesin gelirine göre toplanması ve askerliğin vatan görevi olması benimsendi.'
    },
    {
      q: 'Kimyasal tepkimelerde hızı etkileyen faktörleri çarpışma teorisi bağlamında açıkla.',
      a: '### Tepkime Hızını Etkileyen Faktörler\n\nÇarpışma teorisine göre bir tepkimenin gerçekleşmesi için taneciklerin **uygun geometride** ve **eşik enerjisini ($E_a$) aşacak** kinetik enerjiyle çarpışması gerekir.\n\n1. **Sıcaklık:** Ortalama kinetik enerjiyi ve etkin çarpışma sayısını artırır.\n2. **Derişim:** Birim hacimdeki tanecik sayısı arttıkça çarpışma sıklığı yükselir.\n3. **Katalizör:** Aktivasyon enerjisini ($E_a$) düşürerek tepkimeyi hızlandırır.\n4. **Temas Yüzeyi:** Katı maddeler toz haline getirildikçe hız artar.'
    },
    {
      q: 'Fotosentez ve hücresel solunum arasındaki enerji dönüşüm ilişkisini açıklar mısın?',
      a: '### Fotosentez ve Hücresel Solunum İlişkisi\n\n- **Fotosentez** ışık enerjisini kimyasal bağ enerjisine dönüştürür:\n$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{Işık} \\rightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$\n- **Oksijenli Solunum** besindeki kimyasal enerjiyi hücrenin kullanabileceği ATP enerjisine çevirir:\n$$\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\rightarrow 6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{ATP}$$\n\nBu iki süreç doğadaki karbon ve oksijen döngüsünü dengede tutar.'
    },
    {
      q: 'Cumhuriyet dönemi Türk edebiyatında Garip (I. Yeni) akımının özelliklerini ve temsilcilerini yaz.',
      a: '### Garip (I. Yeni) Akımı\n\nOrhan Veli Kanık, Melih Cevdet Anday ve Oktay Rifat tarafından 1941 yılında başlatılmıştır.\n\n- Ölçü, uyak ve şairane söyleyişe karşı çıkılmıştır.\n- Günlük konuşma dili ve sıradan insanın yaşamı şiire taşınmıştır.\n- Söz sanatları yerine yalın, esprili ve sürprizli anlatım tercih edilmiştir.'
    }
  ];

  const conciseQuestions = [
    {
      q: 'Ohm yasasının formülünü ve birimlerini 3 maddede kısaca yaz.',
      a: '- **Formül:** $V = I \\cdot R$\n- **Birimler:** $V$ gerilim (Volt), $I$ akım (Amper), $R$ direnç (Ohm, $\\Omega$).\n- **Özet:** Sabit dirençte gerilim arttıkça akım doğru orantılı artar.'
    },
    {
      q: 'pH ölçeğinde asit, baz ve nötr aralıkları tek satırda özetle.',
      a: '25 °C sıcaklıkta $\\text{pH} < 7$ **asit**, $\\text{pH} = 7$ **nötr**, $\\text{pH} > 7$ **baz** olarak sınıflandırılır.'
    },
    {
      q: 'Türkiye\'de görülen 3 ana iklim tipini sadece adları ve temel özelliğiyle sırala.',
      a: '1. **Akdeniz İklimi:** Yazlar sıcak-kurak, kışlar ılık-yağışlı.\n2. **Karadeniz İklimi:** Her mevsim yağışlı ve ılıman.\n3. **Karasal İklim:** Yazlar sıcak-kurak, kışlar soğuk ve kar yağışlı.'
    }
  ];

  const addRecord = (code, phase, modelId, qa, inTok, outTok, offsetMs) => {
    const p = PARTICIPANT_MAP[code];
    const fp = calculateFootprint(inTok, outTok, modelId);
    samples.push({
      id: `sample-${code}-${phase}-${samples.length}-${Math.random().toString(36).slice(2, 6)}`,
      code,
      group: p.group,
      phase,
      modelId,
      prompt: qa.q,
      response: qa.a,
      ...fp,
      tokenSource: 'örnek',
      isSample: true,
      createdAt: now - offsetMs
    });
  };

  // ÖN TEST (Kontrol K001-K005 ve Deney D001-D005 başlangıçta istatistiksel olarak denk)
  const preKontrolSpec = [
    { code: 'K001', count: 6, models: ['standard', 'reasoning', 'standard', 'reasoning', 'standard', 'light'] },
    { code: 'K002', count: 5, models: ['reasoning', 'standard', 'standard', 'reasoning', 'standard'] },
    { code: 'K003', count: 7, models: ['standard', 'reasoning', 'standard', 'standard', 'reasoning', 'light', 'standard'] },
    { code: 'K004', count: 5, models: ['standard', 'reasoning', 'standard', 'light', 'reasoning'] },
    { code: 'K005', count: 6, models: ['reasoning', 'standard', 'reasoning', 'standard', 'standard', 'light'] }
  ];

  const preDeneySpec = [
    { code: 'D001', count: 6, models: ['standard', 'reasoning', 'standard', 'standard', 'reasoning', 'light'] },
    { code: 'D002', count: 6, models: ['reasoning', 'standard', 'standard', 'reasoning', 'standard', 'light'] },
    { code: 'D003', count: 5, models: ['standard', 'reasoning', 'standard', 'reasoning', 'standard'] },
    { code: 'D004', count: 7, models: ['standard', 'reasoning', 'standard', 'reasoning', 'standard', 'standard', 'light'] },
    { code: 'D005', count: 5, models: ['reasoning', 'standard', 'standard', 'light', 'reasoning'] }
  ];

  // SON TEST (Kontrol benzer alışkanlıkta kalır; Deney grubu bilinçli istem + Hafif Model ile belirgin düşüş gösterir)
  const postKontrolSpec = [
    { code: 'K001', count: 6, models: ['standard', 'reasoning', 'standard', 'reasoning', 'standard', 'light'] },
    { code: 'K002', count: 6, models: ['reasoning', 'standard', 'standard', 'reasoning', 'standard', 'standard'] },
    { code: 'K003', count: 7, models: ['standard', 'reasoning', 'reasoning', 'standard', 'standard', 'light', 'standard'] },
    { code: 'K004', count: 5, models: ['standard', 'reasoning', 'standard', 'reasoning', 'light'] },
    { code: 'K005', count: 6, models: ['reasoning', 'standard', 'standard', 'reasoning', 'standard', 'light'] }
  ];

  const postDeneySpec = [
    { code: 'D001', count: 2, models: ['light', 'light'] },
    { code: 'D002', count: 3, models: ['light', 'light', 'standard'] },
    { code: 'D003', count: 2, models: ['light', 'light'] },
    { code: 'D004', count: 3, models: ['light', 'light', 'light'] },
    { code: 'D005', count: 2, models: ['light', 'light'] }
  ];

  preKontrolSpec.forEach((sp, si) => {
    for (let i = 0; i < sp.count; i++) {
      const qa = heavyQuestions[(si + i) % heavyQuestions.length];
      addRecord(sp.code, 'pretest', sp.models[i], qa, 95 + i * 12, 340 + si * 20 + i * 25, 7 * DAY - (si * 6 + i) * 3600000);
    }
  });

  preDeneySpec.forEach((sp, si) => {
    for (let i = 0; i < sp.count; i++) {
      const qa = heavyQuestions[(si + i + 2) % heavyQuestions.length];
      addRecord(sp.code, 'pretest', sp.models[i], qa, 98 + i * 11, 335 + si * 18 + i * 24, 7 * DAY - (si * 6 + i + 1) * 3600000);
    }
  });

  postKontrolSpec.forEach((sp, si) => {
    for (let i = 0; i < sp.count; i++) {
      const qa = heavyQuestions[(si + i + 1) % heavyQuestions.length];
      addRecord(sp.code, 'posttest', sp.models[i], qa, 100 + i * 10, 355 + si * 18 + i * 22, 1 * DAY - (si * 3 + i) * 1800000);
    }
  });

  postDeneySpec.forEach((sp, si) => {
    for (let i = 0; i < sp.count; i++) {
      const qa = conciseQuestions[(si + i) % conciseQuestions.length];
      addRecord(sp.code, 'posttest', sp.models[i], qa, 42 + i * 8, 125 + si * 10 + i * 15, 1 * DAY - (si * 3 + i + 2) * 1800000);
    }
  });

  return samples;
}

/* ============================================================================
 * 9. ORTAK MODAL VE BİLGİ BİLEŞENLERİ (METODOLOJİ, ONAY, KİŞİSEL RAPOR)
 * ============================================================================ */

function ModalShell({ open, onClose, title, subtitle, maxWidth = 'max-w-3xl', children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50/80">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ open, title, message, confirmLabel = 'Onayla', danger = true, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${danger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors ${
              danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function MethodologyContent() {
  return (
    <div className="space-y-5 text-sm text-slate-700">
      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
        <h4 className="font-bold text-emerald-900 flex items-center gap-2">
          <FlaskConical className="w-4 h-4" />
          Bilimsel Hesaplama Modeli ve Ağırlıklı Token Formülü
        </h4>
        <p className="mt-1.5 text-emerald-900/90 leading-relaxed">
          Büyük dil modellerinde çıktı üretimi (otoregresif <em>decode</em>), girdi metnini işlemekten
          (<em>prefill</em>) belirgin ölçüde daha fazla GPU bellek bant genişliği ve elektrik enerjisi
          tüketir. Bu nedenle her etkileşimde çıktı tokenları 3 kat ağırlıklandırılır:
        </p>
        <div className="mt-3 p-3 rounded-lg bg-white border border-emerald-200 text-center font-semibold text-slate-900">
          Ağırlıklı Token = Girdi Token + 3 × Çıktı Token
        </div>
        <p className="mt-2 text-xs text-emerald-800">
          Yanıt üst verisinde gerçek token sayıları mevcutsa doğrudan onlar kullanılır; aksi durumda Türkçe
          karakter yoğunluğu dikkate alınarak ⌈karakter sayısı / 3,6⌉ tahmini uygulanır. Boş metin daima 0
          token kabul edilir ve sabit gizli token eklenmez.
        </p>
      </div>

      <div>
        <h4 className="font-bold text-slate-900 mb-2">Model Ölçek Sınıfları ve Katsayı Tablosu (1.000 Ağırlıklı Token Başına)</h4>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold">
              <tr>
                <th className="px-3 py-2.5 border-b border-slate-200">Ölçek Sınıfı</th>
                <th className="px-3 py-2.5 border-b border-slate-200">Enerji Min / Ort / Maks (Wh)</th>
                <th className="px-3 py-2.5 border-b border-slate-200">Referans Maliyet (1M Token)</th>
                <th className="px-3 py-2.5 border-b border-slate-200">Hafif Modele Göre Tasarruf</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {MODEL_ORDER.map((id) => {
                const m = MODEL_SCALES[id];
                const sav = id === 'light' ? 0 : Math.round(((m.energyAvg - 0.18) / m.energyAvg) * 100);
                return (
                  <tr key={id}>
                    <td className="px-3 py-2.5 font-semibold text-slate-900">{m.name}</td>
                    <td className="px-3 py-2.5">
                      {fmtNum(m.energyMin, 2)} / <strong>{fmtNum(m.energyAvg, 2)}</strong> / {fmtNum(m.energyMax, 2)} Wh
                    </td>
                    <td className="px-3 py-2.5">
                      Girdi ${m.costInputPer1M.toFixed(2)} · Çıktı ${m.costOutputPer1M.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5">
                      {sav === 0 ? 'Referans (En Verimli)' : `%${sav} daha yüksek tüketim`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200">
          <div className="font-bold text-sky-900 flex items-center gap-1.5">
            <Droplets className="w-4 h-4 text-sky-600" />
            Su Ayak İzi Katsayısı (WUE)
          </div>
          <p className="mt-1 text-xs text-sky-900/90 leading-relaxed">
            Min <strong>0,2</strong> · Ort <strong>1,0</strong> · Maks <strong>1,8 mL/Wh</strong> (L/kWh).
            Veri merkezi soğutma kulesi buharlaşması ve elektrik üretimi dolaylı su tüketimini kapsar.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Cloud className="w-4 h-4 text-slate-600" />
            Karbon Yoğunluğu (Şebeke)
          </div>
          <p className="mt-1 text-xs text-slate-700 leading-relaxed">
            Min <strong>0,30</strong> · Ort <strong>0,43</strong> · Maks <strong>0,55 g CO₂/Wh</strong>
            (300–550 g CO₂/kWh). Küresel elektrik şebekesi emisyon faktörlerini temel alır.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
        <h4 className="font-bold text-slate-900 mb-1.5">Ön Test – Son Test Kontrol Gruplu Kör Deney Tasarımı</h4>
        <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
          <li>
            <strong>Ön Test Aşaması:</strong> Hem Kontrol (K001–K030) hem Deney (D001–D030) grupları
            tamamen nötr <em>Eğitim Asistanı</em> arayüzünü görür; başlangıç denkliği korunur.
          </li>
          <li>
            <strong>Müdahale Süreci:</strong> Yalnızca Deney grubuna etkili istem yazma ve yapay zeka
            çevresel ayak izi farkındalık eğitimi uygulanır.
          </li>
          <li>
            <strong>Son Test Aşaması:</strong> Kontrol grubu nötr arayüzde kalırken Deney grubu canlı
            EkoToken geri bildirimleri, günlük karşılıklar ve kişisel rapor modülü ile çalışır.
          </li>
        </ul>
      </div>

      <div>
        <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          Akademik Kaynakça
        </h4>
        <div className="space-y-2">
          {ACADEMIC_REFERENCES.map((ref) => (
            <div key={ref.id} className="p-3 rounded-xl bg-white border border-slate-200 text-xs">
              <div className="font-semibold text-slate-900">
                {ref.id}. {ref.authors} ({ref.institution}, {ref.year})
              </div>
              <div className="italic text-slate-700 mt-0.5">{ref.title}</div>
              <div className="text-slate-500 mt-1">{ref.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 10. ÖĞRENCİ KİŞİSEL RAPOR MODALI (YALNIZCA DENEY GRUBU + SON TEST)
 * ============================================================================ */

function PersonalReportModal({ open, onClose, messages, participantCode }) {
  const stats = useMemo(() => {
    const totalPrompts = messages.length;
    const totalInput = messages.reduce((s, m) => s + (m.inputTokens || 0), 0);
    const totalOutput = messages.reduce((s, m) => s + (m.outputTokens || 0), 0);
    const totalWater = messages.reduce((s, m) => s + (m.waterAvg || 0), 0);
    const totalEnergy = messages.reduce((s, m) => s + (m.energyAvg || 0), 0);
    const totalCo2 = messages.reduce((s, m) => s + (m.co2Avg || 0), 0);

    let cumWater = 0;
    let cumEnergy = 0;
    let cumCo2 = 0;

    const perInteraction = messages.map((m, idx) => {
      cumWater += m.waterAvg || 0;
      cumEnergy += m.energyAvg || 0;
      cumCo2 += m.co2Avg || 0;
      return {
        name: `#${idx + 1}`,
        Girdi: m.inputTokens || 0,
        Çıktı: m.outputTokens || 0,
        Su: Number(cumWater.toFixed(3)),
        Enerji: Number(cumEnergy.toFixed(3)),
        CO2: Number(cumCo2.toFixed(3))
      };
    });

    const modelDist = MODEL_ORDER.map((id) => ({
      name: MODEL_SCALES[id].name,
      value: messages.filter((m) => m.modelId === id).length,
      color: MODEL_SCALES[id].color
    })).filter((d) => d.value > 0);

    return {
      totalPrompts,
      totalInput,
      totalOutput,
      totalWater,
      totalEnergy,
      totalCo2,
      perInteraction,
      modelDist,
      eq: getDailyEquivalents(totalWater, totalEnergy, totalCo2)
    };
  }, [messages]);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Kişisel Çevresel Ayak İzi Raporu — ${participantCode}`}
      subtitle="Son Test oturumunuzdaki etkileşimlerin anlık bilimsel özeti ve günlük hayat karşılıkları"
      maxWidth="max-w-4xl"
    >
      {stats.totalPrompts === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <Leaf className="w-10 h-10 mx-auto text-emerald-400 mb-3" />
          <p className="font-medium text-slate-700">Henüz bu oturumda bir etkileşiminiz bulunmuyor.</p>
          <p className="text-xs mt-1">İlk sorunuzu sorduktan sonra kişisel grafikleriniz burada oluşacaktır.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Günlük Hayat Karşılık Kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-sky-50 border border-sky-200">
              <div className="flex items-center justify-between text-sky-700 text-xs font-semibold">
                <span>Toplam Su Ayak İzi</span>
                <Droplets className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-sky-950 mt-1">{fmtSmart(stats.totalWater)} mL</div>
              <div className="text-xs text-sky-800 mt-1.5 font-medium">{stats.eq.waterPrimary}</div>
              <div className="text-[11px] text-sky-700/80 mt-0.5">
                {fmtNum(stats.eq.glasses, 3)} su bardağı · {fmtNum(stats.eq.bottles, 3)} şişe
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
                <span>Toplam Enerji Tüketimi</span>
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-amber-950 mt-1">{fmtSmart(stats.totalEnergy)} Wh</div>
              <div className="text-xs text-amber-800 mt-1.5 font-medium">{stats.eq.ledText}</div>
              <div className="text-[11px] text-amber-700/80 mt-0.5">{stats.eq.phoneText}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
              <div className="flex items-center justify-between text-slate-700 text-xs font-semibold">
                <span>Toplam Karbon Emisyonu</span>
                <Cloud className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{fmtSmart(stats.totalCo2)} g CO₂</div>
              <div className="text-xs text-slate-800 mt-1.5 font-medium">{stats.eq.carText}</div>
              <div className="text-[11px] text-slate-600 mt-0.5">{stats.eq.treeText}</div>
            </div>
          </div>

          {/* Etkileşim Bazlı Girdi / Çıktı Token Grafiği */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <h4 className="text-sm font-bold text-slate-900 mb-3">
              Etkileşim Bazlı Girdi ve Çıktı Token Dağılımı
            </h4>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.perInteraction} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Girdi" fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Çıktı" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Birikimli Trend + Model Dağılımı */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 p-4 rounded-xl border border-slate-200 bg-white">
              <h4 className="text-sm font-bold text-slate-900 mb-3">
                Birikimli Su (mL), Enerji (Wh) ve CO₂ (g) Trendi
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.perInteraction} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="Su" name="Su (mL)" stroke="#0284c7" fill="#bae6fd" fillOpacity={0.5} />
                    <Area type="monotone" dataKey="Enerji" name="Enerji (Wh)" stroke="#d97706" fill="#fde68a" fillOpacity={0.5} />
                    <Area type="monotone" dataKey="CO2" name="CO₂ (g)" stroke="#475569" fill="#cbd5e1" fillOpacity={0.4} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col">
              <h4 className="text-sm font-bold text-slate-900 mb-2">Model Tercih Dağılımı</h4>
              <div className="h-48 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.modelDist}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={68}
                      paddingAngle={3}
                    >
                      {stats.modelDist.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 mt-1">
                {stats.modelDist.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {d.value} ({Math.round((d.value / stats.totalPrompts) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

/* ============================================================================
 * 11. GİRİŞ EKRANI (SIKI ERİŞİM KURALI: SIFIR DEMO BUTONU)
 * ============================================================================ */

function LoginScreen({ onStudentLogin, onAdminLogin }) {
  const [mode, setMode] = useState('student'); // 'student' | 'admin'
  const [codeInput, setCodeInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleStudentSubmit = (e) => {
    e.preventDefault();
    const normalized = codeInput.trim().toUpperCase();
    if (!normalized) {
      setErrorMsg('Lütfen size verilen katılımcı kodunu girin.');
      return;
    }
    if (!PARTICIPANT_MAP[normalized]) {
      setErrorMsg(
        'Geçersiz katılımcı kodu. Lütfen yalnızca araştırmacı tarafından size tanımlanan kodu (ör. K001 veya D001 biçiminde) eksiksiz girin.'
      );
      return;
    }
    setErrorMsg('');
    onStudentLogin(normalized);
  };

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    if (passInput.trim() !== ADMIN_PASSCODE) {
      setErrorMsg('Yönetici parolası hatalı. Lütfen tekrar kontrol edin.');
      return;
    }
    setErrorMsg('');
    onAdminLogin();
  };

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/60">
      <main className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden">
          {/* Üst Akademik Başlık */}
          <div className="px-6 pt-7 pb-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mx-auto mb-3">
              {mode === 'admin' ? (
                <Shield className="w-6 h-6 text-emerald-400" />
              ) : (
                <GraduationCap className="w-6 h-6 text-indigo-300" />
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              {mode === 'admin' ? 'Araştırmacı / Yönetici Paneli' : 'Eğitim Asistanı Girişi'}
            </h1>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              {mode === 'admin'
                ? 'TÜBİTAK 2204-A Çalışması · Deney Yönetimi ve İstatistik Merkezi'
                : 'TÜBİTAK 2204-A Bilimsel Araştırma Platformu'}
            </p>
          </div>

          {/* Form Alanı */}
          <div className="p-6">
            {mode === 'student' ? (
              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div>
                  <label htmlFor="participant-code" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Katılımcı Kodu
                  </label>
                  <input
                    id="participant-code"
                    type="text"
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Size verilen kodu yazın"
                    autoComplete="off"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 font-semibold tracking-wider uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    Giriş için yalnızca öğretmeniniz tarafından atanan kişisel çalışma kodunuzu kullanın.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>Oturumu Başlat</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label htmlFor="admin-pass" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Yönetici Parolası
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="admin-pass"
                      type="password"
                      value={passInput}
                      onChange={(e) => {
                        setPassInput(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      placeholder="Parolanızı girin"
                      autoComplete="off"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>Yönetici Paneline Gir</span>
                </button>
              </form>
            )}

            {/* Sade Alt Geçiş Bağlantısı */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              {mode === 'student' ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode('admin');
                    setErrorMsg('');
                    setPassInput('');
                  }}
                  className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
                >
                  Yönetici Girişi
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode('student');
                    setErrorMsg('');
                  }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  ← Öğrenci Girişine Dön
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ============================================================================
 * 12. ÖĞRENCİ SOHBET ARAYÜZÜ (KÖR DENEY: NÖTR "Eğitim Asistanı" vs "EkoToken")
 * ============================================================================ */

function EcoImpactFooter({ interaction }) {
  const [expanded, setExpanded] = useState(false);
  const eq = useMemo(
    () =>
      getDailyEquivalents(
        interaction.waterAvg || 0,
        interaction.energyAvg || 0,
        interaction.co2Avg || 0
      ),
    [interaction.waterAvg, interaction.energyAvg, interaction.co2Avg]
  );

  const model = MODEL_SCALES[interaction.modelId] || MODEL_SCALES.standard;

  return (
    <div className="mt-3 pt-3 border-t border-emerald-100 space-y-2.5">
      {/* Kompakt Metrik Rozetleri */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className={`px-2 py-0.5 rounded-full font-semibold ${model.badgeClass}`}>
          {model.name}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
          Token: {interaction.inputTokens} girdi / {interaction.outputTokens} çıktı
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 font-medium">
          <Zap className="w-3 h-3 text-amber-600" />
          {fmtSmart(interaction.energyMin)}–{fmtSmart(interaction.energyMax)} Wh
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200/80 font-medium">
          <Droplets className="w-3 h-3 text-sky-600" />
          {fmtSmart(interaction.waterMin)}–{fmtSmart(interaction.waterMax)} mL
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
          <Cloud className="w-3 h-3 text-slate-500" />
          {fmtSmart(interaction.co2Min)}–{fmtSmart(interaction.co2Max)} g CO₂
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold transition-colors"
        >
          <span>Günlük Karşılık</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Açılır Günlük Karşılık Detay Kartı */}
      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-xs">
          <div className="flex items-start gap-2">
            <Droplets className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900">Su ({fmtSmart(interaction.waterAvg)} mL ort.)</div>
              <div className="text-slate-600">{eq.waterPrimary}</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900">Enerji ({fmtSmart(interaction.energyAvg)} Wh ort.)</div>
              <div className="text-slate-600">{eq.ledText} · {eq.phoneText}</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Cloud className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900">Karbon ({fmtSmart(interaction.co2Avg)} g ort.)</div>
              <div className="text-slate-600">{eq.carText} · {eq.treeText}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tasarruf İpucu (Standart veya Akıl Yürütme Modeli seçildiyse) */}
      {interaction.savingsPct > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900">
          <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Tasarruf İpucu:</strong> Bu soruyu <strong>Hafif Model</strong> ile sorsaydın{' '}
            <strong>%{interaction.savingsPct} daha az su ve enerji</strong> harcardın.
          </span>
        </div>
      )}
    </div>
  );
}

function StudentChatView({
  participantCode,
  activePhase,
  interactions,
  onAddInteraction,
  onLogout
}) {
  const participant = PARTICIPANT_MAP[participantCode];
  // Kör Deney Kuralı: Eko-Farkındalık arayüzü YALNIZCA Deney grubu + Son Test aşamasında açılır
  const isEcoMode = participant?.group === 'Deney' && activePhase === 'posttest';

  const [selectedModel, setSelectedModel] = useState('standard');
  const [promptInput, setPromptInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorState, setErrorState] = useState(null); // { message, lastPrompt, lastModel }
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const chatContainerRef = useRef(null);
  const lastSentAtRef = useRef(0);

  // Öğrenci yalnızca kendi koduna ve aktif test aşamasına ait mesajları görür
  const myMessages = useMemo(() => {
    return interactions
      .filter((it) => it.code === participantCode && it.phase === activePhase)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [interactions, participantCode, activePhase]);

  // Eko-Farkındalık üst şerit toplamları
  const ecoTotals = useMemo(() => {
    const prompts = myMessages.length;
    const tokens = myMessages.reduce((s, m) => s + (m.inputTokens || 0) + (m.outputTokens || 0), 0);
    const energy = myMessages.reduce((s, m) => s + (m.energyAvg || 0), 0);
    const water = myMessages.reduce((s, m) => s + (m.waterAvg || 0), 0);
    const co2 = myMessages.reduce((s, m) => s + (m.co2Avg || 0), 0);
    const eq = getDailyEquivalents(water, energy, co2);
    return { prompts, tokens, energy, water, co2, eq };
  }, [myMessages]);

  // İç kaydırma kuralı: scrollIntoView() KESİNLİKLE kullanılmaz
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [myMessages.length, isSending, errorState]);

  // Hız sınırı geri sayımı
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = setInterval(() => {
      const rem = Math.max(0, Math.ceil((RATE_LIMIT_MS - (Date.now() - lastSentAtRef.current)) / 1000));
      setCooldownLeft(rem);
    }, 250);
    return () => clearInterval(timer);
  }, [cooldownLeft]);

  const sendPrompt = async (textToSend, modelToUse) => {
    const clean = (textToSend || '').trim();
    if (!clean || isSending) return;

    if (clean.length > MAX_PROMPT_LENGTH) {
      setErrorState({
        message: `İstem uzunluğu en fazla ${MAX_PROMPT_LENGTH} karakter olabilir.`,
        lastPrompt: clean,
        lastModel: modelToUse
      });
      return;
    }

    const elapsed = Date.now() - lastSentAtRef.current;
    if (elapsed < RATE_LIMIT_MS) {
      const waitSec = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
      setCooldownLeft(waitSec);
      return;
    }

    lastSentAtRef.current = Date.now();
    setCooldownLeft(Math.ceil(RATE_LIMIT_MS / 1000));
    setIsSending(true);
    setErrorState(null);
    setPromptInput('');

    try {
      const aiResult = await requestAssistantResponse(clean, myMessages, modelToUse);
      const fp = calculateFootprint(aiResult.inputTokens, aiResult.outputTokens, modelToUse);

      await onAddInteraction({
        code: participantCode,
        group: participant.group,
        phase: activePhase,
        modelId: modelToUse,
        prompt: clean,
        response: aiResult.responseText,
        ...fp,
        tokenSource: aiResult.tokenSource,
        isSample: false,
        createdAt: Date.now()
      });
    } catch (err) {
      // Hata durumunda sahte yanıt döndürülmez; anlaşılır Türkçe hata + Tekrar Dene gösterilir
      setErrorState({
        message:
          err?.message ||
          'Yanıt alınırken bir bağlantı sorunu oluştu. Lütfen tekrar deneyin.',
        lastPrompt: clean,
        lastModel: modelToUse
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendPrompt(promptInput, selectedModel);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPrompt(promptInput, selectedModel);
    }
  };

  return (
    <div
      className={`fixed inset-0 w-full h-full flex flex-col overflow-hidden ${
        isEcoMode ? 'bg-emerald-50/35' : 'bg-slate-50'
      }`}
    >
      {/* SABİT ÜST ÇUBUK */}
      <header
        className={`shrink-0 border-b z-20 ${
          isEcoMode
            ? 'bg-white border-emerald-200/90'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="max-w-5xl mx-auto px-3 sm:px-5 py-2.5 flex flex-col gap-2">
          {/* Üst Satır: Marka/Başlık + Katılımcı Kodu + Aksiyonlar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isEcoMode
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-indigo-600 text-white shadow-xs'
                }`}
              >
                {isEcoMode ? <Leaf className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {isEcoMode ? 'EkoToken' : 'Eğitim Asistanı'}
                  </h1>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      isEcoMode
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {participantCode}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                  {isEcoMode
                    ? 'Yapay Zeka Çevresel Ayak İzi İzleme ve Farkındalık Asistanı'
                    : 'Ders ve araştırma destek sohbet arayüzü'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isEcoMode && (
                <>
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <PieChartIcon className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline sm:inline">Kişisel Rapor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethodologyOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    title="Metodoloji ve Kaynakça"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Metodoloji</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-semibold transition-colors"
                title="Oturumu Kapat"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Çıkış</span>
              </button>
            </div>
          </div>

          {/* Model Ölçeği Seçici — Mobilde sağdan taşmayan tam 3 eşit sütun (grid-cols-3) */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
            {MODEL_ORDER.map((id) => {
              const m = MODEL_SCALES[id];
              const active = selectedModel === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedModel(id)}
                  className={`py-1.5 px-1.5 sm:px-3 rounded-lg text-center transition-all text-[11px] sm:text-xs font-semibold truncate ${
                    active
                      ? isEcoMode
                        ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-300'
                        : 'bg-white text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="sm:hidden">{m.shortName}</span>
                  <span className="hidden sm:inline">{m.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Canlı Çevresel Etki Özet Şeridi (Yalnızca Deney Grubu + Son Test) */}
        {isEcoMode && (
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white border-t border-emerald-600/50">
            <div className="max-w-5xl mx-auto px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] sm:text-xs">
              <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1">
                <span className="font-semibold text-emerald-100">
                  {ecoTotals.prompts} İstem · {ecoTotals.tokens.toLocaleString('tr-TR')} Token
                </span>
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  {fmtSmart(ecoTotals.energy)} Wh
                </span>
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Droplets className="w-3.5 h-3.5 text-sky-300" />
                  {fmtSmart(ecoTotals.water)} mL
                </span>
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Cloud className="w-3.5 h-3.5 text-slate-200" />
                  {fmtSmart(ecoTotals.co2)} g CO₂
                </span>
              </div>
              <div className="text-[11px] text-emerald-100 font-medium truncate">
                {ecoTotals.prompts > 0
                  ? `Günlük karşılık: ${ecoTotals.eq.waterPrimary} · ${ecoTotals.eq.carText}`
                  : 'İpucu: Kısa ve net istemler + Hafif Model en düşük ayak izini üretir.'}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* KAYDIRILABİLİR MESAJ ALANI */}
      <main
        ref={chatContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-5"
      >
        <div className="max-w-4xl mx-auto space-y-5">
          {myMessages.length === 0 && !isSending && !errorState && (
            <div className="py-12 sm:py-16 text-center max-w-lg mx-auto">
              <div
                className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                  isEcoMode
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {isEcoMode ? <Leaf className="w-7 h-7" /> : <Sparkles className="w-7 h-7" />}
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEcoMode ? 'EkoToken Bilinçli Sohbete Hoş Geldin' : 'Eğitim Asistanına Hoş Geldin'}
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                {isEcoMode
                  ? 'Sorularını aşağıdan sorabilir, her yanıtın su, enerji ve karbon ayak izini anlık olarak takip edebilirsin. İhtiyacına uygun model ölçeğini seçerek kaynak tasarrufu sağlayabilirsin.'
                  : 'Ders konuların, ödevlerin veya merak ettiğin herhangi bir konuda sorularını aşağıdan yazabilirsin.'}
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600 shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Seçili sınıf: <strong>{MODEL_SCALES[selectedModel].name}</strong></span>
              </div>
            </div>
          )}

          {myMessages.map((item) => (
            <div key={item.id} className="space-y-3">
              {/* Kullanıcı Mesajı */}
              <div className="flex justify-end">
                <div
                  className={`max-w-[88%] sm:max-w-[78%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed shadow-xs ${
                    isEcoMode
                      ? 'bg-emerald-700 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{item.prompt}</p>
                </div>
              </div>

              {/* Asistan Yanıtı */}
              <div className="flex justify-start">
                <div
                  className={`w-full sm:max-w-[92%] rounded-2xl rounded-tl-sm px-4 sm:px-5 py-4 bg-white border shadow-2xs ${
                    isEcoMode ? 'border-emerald-200/80' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      {isEcoMode ? (
                        <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                      {isEcoMode ? 'EkoToken Asistanı' : 'Eğitim Asistanı'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : ''}
                    </span>
                  </div>

                  <RichMessage content={item.response} showCopyButton />

                  {/* Çevresel Etki Rozetleri ve Tasarruf İpucu (Yalnızca Deney + Son Test) */}
                  {isEcoMode && <EcoImpactFooter interaction={item} />}
                </div>
              </div>
            </div>
          ))}

          {/* Yanıt Üretiliyor Göstergesi */}
          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm px-4 py-3.5 bg-white border border-slate-200 shadow-2xs flex items-center gap-3 text-sm text-slate-600">
                <RefreshCw
                  className={`w-4 h-4 animate-spin ${
                    isEcoMode ? 'text-emerald-600' : 'text-indigo-600'
                  }`}
                />
                <span>Yanıt hazırlanıyor ({MODEL_SCALES[selectedModel].name})...</span>
              </div>
            </div>
          )}

          {/* Hata Kartı + Tekrar Dene */}
          {errorState && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-sm">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Yanıt Alınamadı</div>
                  <div className="text-xs text-rose-800 mt-0.5">{errorState.message}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => sendPrompt(errorState.lastPrompt, errorState.lastModel)}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tekrar Dene</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* SABİT ALT YAZMA ÇUBUĞU */}
      <footer className="shrink-0 bg-white border-t border-slate-200 px-3 sm:px-5 py-3">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                rows={1}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={MAX_PROMPT_LENGTH}
                placeholder="Sorunuzu buraya yazın... (Göndermek için Enter)"
                className={`w-full resize-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all max-h-36 ${
                  isEcoMode
                    ? 'focus:ring-emerald-500 focus:border-emerald-500'
                    : 'focus:ring-indigo-500 focus:border-indigo-500'
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={isSending || !promptInput.trim() || cooldownLeft > 0}
              className={`shrink-0 h-11 px-4 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isEcoMode
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {cooldownLeft > 0 && !isSending ? (
                <span className="text-xs font-mono">{cooldownLeft}s</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Gönder</span>
                </>
              )}
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 px-0.5">
            <span>{MODEL_SCALES[selectedModel].desc}</span>
            <span>
              {promptInput.length}/{MAX_PROMPT_LENGTH}
            </span>
          </div>
        </form>
      </footer>

      {/* Kişisel Rapor & Metodoloji Modalları */}
      {isEcoMode && (
        <>
          <PersonalReportModal
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            messages={myMessages}
            participantCode={participantCode}
          />
          <ModalShell
            open={methodologyOpen}
            onClose={() => setMethodologyOpen(false)}
            title="EkoToken Bilimsel Metodoloji ve Kaynakça"
            subtitle="Çevresel ayak izi hesaplama katsayıları ve akademik referanslar"
          >
            <MethodologyContent />
          </ModalShell>
        </>
      )}
    </div>
  );
}

/* ============================================================================
 * 13. YÖNETİCİ / ARAŞTIRMACI PANELİ (5 SEKME + MİNİ SPSS + 4 SAYFALI EXCEL)
 * ============================================================================ */

function AdminDashboard({
  activePhase,
  onChangePhase,
  interactions,
  onLoadSamples,
  onRemoveSamples,
  onClearAll,
  onDeleteSingle,
  onLogout
}) {
  const [activeTab, setActiveTab] = useState('overview'); // overview | stats | records | codes | methodology
  const [phaseFilter, setPhaseFilter] = useState('all'); // all | pretest | posttest
  const [statsMetric, setStatsMetric] = useState('prompts'); // prompts | water | energy | co2 | lightPct
  const [chartMetric, setChartMetric] = useState('water'); // water | energy | co2 | lightPct

  // Kayıtlar sekmesi filtreleri
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [recordPhaseFilter, setRecordPhaseFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [previewRecord, setPreviewRecord] = useState(null);

  // Onay ve bildirim durumları
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [busyAction, setBusyAction] = useState(false);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2800);
  }, []);

  const hasSamples = useMemo(
    () => interactions.some((i) => i.isSample),
    [interactions]
  );

  // --- SEKME 1: GENEL BAKIŞ VERİLERİ ---
  const overviewFiltered = useMemo(() => {
    if (phaseFilter === 'all') return interactions;
    return interactions.filter((i) => i.phase === phaseFilter);
  }, [interactions, phaseFilter]);

  const overviewStats = useMemo(() => {
    const activeSet = new Set(overviewFiltered.map((i) => i.code));
    const totalPrompts = overviewFiltered.length;
    const totalEnergy = overviewFiltered.reduce((s, x) => s + (x.energyAvg || 0), 0);
    const totalWater = overviewFiltered.reduce((s, x) => s + (x.waterAvg || 0), 0);
    const totalCo2 = overviewFiltered.reduce((s, x) => s + (x.co2Avg || 0), 0);

    const calcGroup = (grp) => {
      const list = overviewFiltered.filter((i) => i.group === grp);
      const users = new Set(list.map((i) => i.code)).size;
      const prompts = list.length;
      const avgPrompts = users > 0 ? prompts / users : 0;
      const avgEnergy = prompts > 0 ? list.reduce((s, x) => s + (x.energyAvg || 0), 0) / prompts : 0;
      const avgWater = prompts > 0 ? list.reduce((s, x) => s + (x.waterAvg || 0), 0) / prompts : 0;
      const avgCo2 = prompts > 0 ? list.reduce((s, x) => s + (x.co2Avg || 0), 0) / prompts : 0;
      const lightPct = prompts > 0 ? (list.filter((x) => x.modelId === 'light').length / prompts) * 100 : 0;
      const stdPct = prompts > 0 ? (list.filter((x) => x.modelId === 'standard').length / prompts) * 100 : 0;
      const reasPct = prompts > 0 ? (list.filter((x) => x.modelId === 'reasoning').length / prompts) * 100 : 0;
      return { users, prompts, avgPrompts, avgEnergy, avgWater, avgCo2, lightPct, stdPct, reasPct };
    };

    const k = calcGroup('Kontrol');
    const d = calcGroup('Deney');

    return {
      activeParticipants: activeSet.size,
      totalPrompts,
      totalEnergy,
      totalWater,
      totalCo2,
      promptCompData: [
        {
          name: 'Toplam İstem',
          Kontrol: k.prompts,
          Deney: d.prompts
        },
        {
          name: 'Öğrenci Başına Ort.',
          Kontrol: Number(k.avgPrompts.toFixed(2)),
          Deney: Number(d.avgPrompts.toFixed(2))
        }
      ],
      perPromptEnvData: [
        { name: 'Enerji (Wh)', Kontrol: Number(k.avgEnergy.toFixed(3)), Deney: Number(d.avgEnergy.toFixed(3)) },
        { name: 'Su (mL)', Kontrol: Number(k.avgWater.toFixed(3)), Deney: Number(d.avgWater.toFixed(3)) },
        { name: 'CO₂ (g)', Kontrol: Number(k.avgCo2.toFixed(3)), Deney: Number(d.avgCo2.toFixed(3)) }
      ],
      modelDistData: [
        {
          name: 'Kontrol Grubu',
          'Hafif Model': Number(k.lightPct.toFixed(1)),
          'Standart Model': Number(k.stdPct.toFixed(1)),
          'Akıl Yürütme': Number(k.reasPct.toFixed(1))
        },
        {
          name: 'Deney Grubu',
          'Hafif Model': Number(d.lightPct.toFixed(1)),
          'Standart Model': Number(d.stdPct.toFixed(1)),
          'Akıl Yürütme': Number(d.reasPct.toFixed(1))
        }
      ]
    };
  }, [overviewFiltered]);

  // --- SEKME 2: ÖN TEST – SON TEST & MİNİ SPSS ---
  const metricMeta = {
    prompts: { label: 'İstem Sayısı', unit: 'istem' },
    water: { label: 'Toplam Su (mL)', unit: 'mL' },
    energy: { label: 'Toplam Enerji (Wh)', unit: 'Wh' },
    co2: { label: 'Toplam CO₂ (g)', unit: 'g' },
    lightPct: { label: 'Hafif Model Oranı (%)', unit: '%' }
  };

  const spssAnalysis = useMemo(() => {
    // Her katılımcının Ön Test ve Son Test metriklerini hesapla
    const buildPhaseStudentMap = (group, phase) => {
      const map = new Map();
      interactions
        .filter((i) => i.group === group && i.phase === phase)
        .forEach((it) => {
          if (!map.has(it.code)) {
            map.set(it.code, { prompts: 0, water: 0, energy: 0, co2: 0, lightCount: 0 });
          }
          const rec = map.get(it.code);
          rec.prompts += 1;
          rec.water += it.waterAvg || 0;
          rec.energy += it.energyAvg || 0;
          rec.co2 += it.co2Avg || 0;
          if (it.modelId === 'light') rec.lightCount += 1;
        });
      // lightPct ekle
      map.forEach((rec) => {
        rec.lightPct = rec.prompts > 0 ? (rec.lightCount / rec.prompts) * 100 : 0;
      });
      return map;
    };

    const kPre = buildPhaseStudentMap('Kontrol', 'pretest');
    const kPost = buildPhaseStudentMap('Kontrol', 'posttest');
    const dPre = buildPhaseStudentMap('Deney', 'pretest');
    const dPost = buildPhaseStudentMap('Deney', 'posttest');

    const getArr = (m, key) => Array.from(m.values()).map((r) => r[key]);
    const getPairs = (mPre, mPost, key) => {
      const pairs = [];
      mPre.forEach((preVal, code) => {
        if (mPost.has(code)) {
          pairs.push({ code, pre: preVal[key], post: mPost.get(code)[key] });
        }
      });
      return pairs;
    };

    const pctChange = (preMean, postMean) => {
      if (!preMean) return null;
      return ((postMean - preMean) / preMean) * 100;
    };

    // 4 Net Değişim Kartı (İstem, Su, Enerji, CO2)
    const changeCards = ['prompts', 'water', 'energy', 'co2'].map((key) => {
      const kpMean = calcDescriptives(getArr(kPre, key)).mean;
      const ksMean = calcDescriptives(getArr(kPost, key)).mean;
      const dpMean = calcDescriptives(getArr(dPre, key)).mean;
      const dsMean = calcDescriptives(getArr(dPost, key)).mean;
      return {
        key,
        label: metricMeta[key].label,
        unit: metricMeta[key].unit,
        kontrolPre: kpMean,
        kontrolPost: ksMean,
        kontrolPct: pctChange(kpMean, ksMean),
        deneyPre: dpMean,
        deneyPost: dsMean,
        deneyPct: pctChange(dpMean, dsMean)
      };
    });

    // Gruplandırılmış Sütun Grafikleri Verisi
    const prePostPromptChart = [
      {
        name: 'Kontrol Grubu',
        'Ön Test': Number(calcDescriptives(getArr(kPre, 'prompts')).mean.toFixed(2)),
        'Son Test': Number(calcDescriptives(getArr(kPost, 'prompts')).mean.toFixed(2))
      },
      {
        name: 'Deney Grubu',
        'Ön Test': Number(calcDescriptives(getArr(dPre, 'prompts')).mean.toFixed(2)),
        'Son Test': Number(calcDescriptives(getArr(dPost, 'prompts')).mean.toFixed(2))
      }
    ];

    const prePostMetricChart = [
      {
        name: 'Kontrol Grubu',
        'Ön Test': Number(calcDescriptives(getArr(kPre, chartMetric)).mean.toFixed(3)),
        'Son Test': Number(calcDescriptives(getArr(kPost, chartMetric)).mean.toFixed(3))
      },
      {
        name: 'Deney Grubu',
        'Ön Test': Number(calcDescriptives(getArr(dPre, chartMetric)).mean.toFixed(3)),
        'Son Test': Number(calcDescriptives(getArr(dPost, chartMetric)).mean.toFixed(3))
      }
    ];

    // Seçili İstatistik Metriği İçin Betimsel İstatistikler ve 4 Kanonik Hipotez Testi
    const kPreArr = getArr(kPre, statsMetric);
    const kPostArr = getArr(kPost, statsMetric);
    const dPreArr = getArr(dPre, statsMetric);
    const dPostArr = getArr(dPost, statsMetric);

    const descriptives = [
      { cell: 'Kontrol — Ön Test', ...calcDescriptives(kPreArr) },
      { cell: 'Kontrol — Son Test', ...calcDescriptives(kPostArr) },
      { cell: 'Deney — Ön Test', ...calcDescriptives(dPreArr) },
      { cell: 'Deney — Son Test', ...calcDescriptives(dPostArr) }
    ];

    const t1 = welchTTest(kPreArr, dPreArr);
    const t2 = pairedTTest(getPairs(kPre, kPost, statsMetric));
    const t3 = pairedTTest(getPairs(dPre, dPost, statsMetric));
    const t4 = welchTTest(kPostArr, dPostArr);

    const tests = [
      {
        id: 'baseline',
        title: '1. Başlangıç Denkliği (Ön Test: Kontrol vs. Deney)',
        method: 'Bağımsız Örneklem Welch t-testi',
        expected: 'Beklenen: p > 0,05 (Başlangıç denkliği)',
        result: t1,
        interpret: (r) => {
          if (!r.valid) return r.reason;
          if (r.p >= 0.05) {
            return `Ön Test aşamasında Kontrol ve Deney grupları arasında istatistiksel olarak anlamlı bir fark yoktur (p = ${formatPValue(r.p)} ≥ 0,05). Grupların başlangıç denkliği bilimsel olarak sağlanmıştır.`;
          }
          return `Ön Test aşamasında gruplar arasında istatistiksel olarak anlamlı fark gözlenmiştir (p = ${formatPValue(r.p)} < 0,05). Başlangıç farkı yorumlanırken dikkate alınmalıdır.`;
        }
      },
      {
        id: 'kontrol_change',
        title: '2. Kontrol Grubu Değişimi (Ön Test vs. Son Test)',
        method: 'Bağımlı Örneklem (Eşleştirilmiş) t-testi',
        expected: 'Beklenen: p > 0,05 (Müdahalesiz kararlılık)',
        result: t2,
        interpret: (r) => {
          if (!r.valid) return r.reason;
          if (r.p >= 0.05) {
            return `Kontrol grubunun Ön Test ve Son Test ortalamaları arasında istatistiksel olarak anlamlı bir değişim oluşmamıştır (p = ${formatPValue(r.p)} ≥ 0,05).`;
          }
          const dir = r.meanDiff < 0 ? 'azalış' : 'artış';
          return `Kontrol grubunda Ön Testten Son Teste anlamlı bir ${dir} gözlenmiştir (p = ${formatPValue(r.p)} < 0,05).`;
        }
      },
      {
        id: 'deney_change',
        title: '3. Deney Grubu Değişimi (Ön Test vs. Son Test)',
        method: 'Bağımlı Örneklem (Eşleştirilmiş) t-testi',
        expected: 'Beklenen: p < 0,05 (Eğitim + EkoToken etkisi)',
        result: t3,
        interpret: (r) => {
          if (!r.valid) return r.reason;
          if (r.p < 0.05) {
            const dir = r.meanDiff < 0 ? 'anlamlı bir düşüş' : 'anlamlı bir artış';
            return `Deney grubunda eğitim ve EkoToken arayüzü sonrası ${dir} gerçekleşmiştir (p = ${formatPValue(r.p)} < 0,05). Müdahalenin etkisi istatistiksel olarak doğrulanmıştır.`;
          }
          return `Deney grubunun Ön Test ve Son Test ortalamaları arasında α = 0,05 düzeyinde istatistiksel olarak anlamlı bir fark bulunmamıştır (p = ${formatPValue(r.p)} ≥ 0,05).`;
        }
      },
      {
        id: 'posttest_diff',
        title: '4. Son Test Grup Farkı (Son Test: Kontrol vs. Deney)',
        method: 'Bağımsız Örneklem Welch t-testi',
        expected: 'Beklenen: p < 0,05 (Gruplar arası net etki)',
        result: t4,
        interpret: (r) => {
          if (!r.valid) return r.reason;
          if (r.p < 0.05) {
            return `Son Test aşamasında Deney ve Kontrol grupları arasında istatistiksel olarak anlamlı bir fark elde edilmiştir (p = ${formatPValue(r.p)} < 0,05).`;
          }
          return `Son Test aşamasında gruplar arasında α = 0,05 düzeyinde istatistiksel olarak anlamlı bir fark saptanmamıştır (p = ${formatPValue(r.p)} ≥ 0,05).`;
        }
      }
    ];

    return { changeCards, prePostPromptChart, prePostMetricChart, descriptives, tests };
  }, [interactions, statsMetric, chartMetric]);

  // --- SEKME 3: ÖĞRENCİ KAYITLARI FİLTRELEME ---
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return interactions
      .filter((it) => {
        if (groupFilter !== 'all' && it.group !== groupFilter) return false;
        if (recordPhaseFilter !== 'all' && it.phase !== recordPhaseFilter) return false;
        if (modelFilter !== 'all' && it.modelId !== modelFilter) return false;
        if (q) {
          const hitCode = (it.code || '').toLowerCase().includes(q);
          const hitPrompt = (it.prompt || '').toLowerCase().includes(q);
          if (!hitCode && !hitPrompt) return false;
        }
        return true;
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [interactions, searchQuery, groupFilter, recordPhaseFilter, modelFilter]);

  // --- SEKME 4: 60 KATILIMCI KODU ÖZETİ ---
  const codeRows = useMemo(() => {
    return PARTICIPANT_CODES.map((p) => {
      const mine = interactions.filter((i) => i.code === p.code);
      const preCount = mine.filter((i) => i.phase === 'pretest').length;
      const postCount = mine.filter((i) => i.phase === 'posttest').length;
      return {
        ...p,
        preCount,
        postCount,
        totalCount: mine.length,
        active: mine.length > 0
      };
    });
  }, [interactions]);

  const handleLoadSamplesClick = async () => {
    setBusyAction(true);
    try {
      await onLoadSamples();
      showToast('Örnek Ön Test + Son Test veri seti yüklendi.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleRemoveSamplesClick = async () => {
    setBusyAction(true);
    try {
      await onRemoveSamples();
      showToast('Örnek kayıtlar kaldırıldı.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleExcelExport = async () => {
    setBusyAction(true);
    try {
      await exportFourSheetExcel(interactions);
      showToast('4 sayfalı Excel (.xlsx) dosyası indirildi.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleExportFilteredCsv = () => {
    downloadCsvFile(
      `EkoToken_Kayitlar_${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'Tarih',
        'Aşama',
        'Kod',
        'Grup',
        'Model',
        'Girdi Token',
        'Çıktı Token',
        'Enerji Ort (Wh)',
        'Su Ort (mL)',
        'CO2 Ort (g)',
        'İstem'
      ],
      filteredRecords.map((r) => [
        r.createdAt ? new Date(r.createdAt).toLocaleString('tr-TR') : '',
        r.phase === 'posttest' ? 'Son Test' : 'Ön Test',
        r.code,
        r.group,
        MODEL_SCALES[r.modelId]?.name || r.modelId,
        r.inputTokens,
        r.outputTokens,
        fmtNum(r.energyAvg, 4),
        fmtNum(r.waterAvg, 4),
        fmtNum(r.co2Avg, 4),
        r.prompt
      ])
    );
    showToast('Filtrelenmiş kayıtlar CSV olarak indirildi.');
  };

  const handleExportCodesCsv = () => {
    downloadCsvFile(
      'EkoToken_Katilimci_Kodlari_60.csv',
      ['Kod', 'Grup', 'Statü', 'Durum', 'Ön Test İstem', 'Son Test İstem', 'Toplam İstem'],
      codeRows.map((c) => [
        c.code,
        c.group,
        c.status,
        c.active ? 'Aktif' : 'Bekliyor',
        c.preCount,
        c.postCount,
        c.totalCount
      ])
    );
    showToast('60 katılımcı kodu CSV olarak indirildi.');
  };

  const copyText = (text, key) => {
    try {
      navigator.clipboard?.writeText(text);
      setCopiedCode(key);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch (_e) {
      // ignore
    }
  };

  const tabs = [
    { id: 'overview', label: 'Genel Bakış & Grafikler', icon: BarChart3 },
    { id: 'stats', label: 'Ön Test – Son Test & İstatistik', icon: Activity },
    { id: 'records', label: `Öğrenci Kayıtları (${interactions.length})`, icon: Database },
    { id: 'codes', label: 'Katılımcı Kodları (60)', icon: Users },
    { id: 'methodology', label: 'Metodoloji & Kaynakça', icon: BookOpen }
  ];

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col overflow-hidden bg-slate-50">
      {/* ÜST ÇUBUK */}
      <header className="shrink-0 bg-slate-900 text-white border-b border-slate-800 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold leading-tight">
                EkoToken · Araştırmacı Paneli
              </h1>
              <p className="text-[11px] text-slate-400">
                TÜBİTAK 2204-A · Ön Test – Son Test Kontrol Gruplu Kör Deney
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tek Tıkla Merkezi Aktif Test Aşaması Anahtarı */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <span className="text-[11px] text-slate-400 px-2 hidden md:inline">Aktif Aşama:</span>
              <button
                type="button"
                onClick={() => onChangePhase('pretest')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activePhase === 'pretest'
                    ? 'bg-indigo-500 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Ön Test
              </button>
              <button
                type="button"
                onClick={() => onChangePhase('posttest')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activePhase === 'posttest'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Son Test
              </button>
            </div>

            <button
              type="button"
              onClick={handleExcelExport}
              disabled={busyAction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-60"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel İndir (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>

        {/* 5 Sekmeli Gezinme Çubuğu */}
        <div className="bg-white border-t border-slate-200 text-slate-700">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                    active
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* BİLDİRİM ŞERİDİ */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ANA KAYDIRILABİLİR İÇERİK */}
      <main className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-5">
        <div className="max-w-7xl mx-auto space-y-5 pb-8">
          {/* ==============================================================
           * SEKME 1: GENEL BAKIŞ & GRAFİKLER
           * ============================================================== */}
          {activeTab === 'overview' && (
            <>
              {/* Kontrol Çubuğu */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {[
                    { id: 'all', label: 'Tümü' },
                    { id: 'pretest', label: 'Ön Test' },
                    { id: 'posttest', label: 'Son Test' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setPhaseFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        phaseFilter === f.id
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={handleLoadSamplesClick}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Örnek Veri Yükle (Ön+Son)</span>
                  </button>
                  {hasSamples && (
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={handleRemoveSamplesClick}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <MinusCircle className="w-4 h-4" />
                      <span>Örnekleri Kaldır</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyAction || interactions.length === 0}
                    onClick={() => setConfirmClearOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Verileri Temizle</span>
                  </button>
                </div>
              </div>

              {/* 5 KPI Kartı */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Aktif Katılımcılar</span>
                    <Users className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-1.5">
                    {overviewStats.activeParticipants}{' '}
                    <span className="text-xs font-normal text-slate-400">/ 60</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Toplam İstem</span>
                    <Activity className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-1.5">
                    {overviewStats.totalPrompts.toLocaleString('tr-TR')}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Toplam Enerji</span>
                    <Zap className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold text-amber-700 mt-1.5">
                    {fmtSmart(overviewStats.totalEnergy)} <span className="text-sm font-semibold">Wh</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Toplam Su</span>
                    <Droplets className="w-4 h-4 text-sky-500" />
                  </div>
                  <div className="text-2xl font-bold text-sky-700 mt-1.5">
                    {fmtSmart(overviewStats.totalWater)} <span className="text-sm font-semibold">mL</span>
                  </div>
                </div>

                <div className="col-span-2 lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Toplam CO₂</span>
                    <Cloud className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800 mt-1.5">
                    {fmtSmart(overviewStats.totalCo2)} <span className="text-sm font-semibold">g</span>
                  </div>
                </div>
              </div>

              {/* Ana Karşılaştırma Grafiği: Toplam & Öğrenci Başına Ort. İstem */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <div className="mb-3">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Kontrol vs. Deney Grubu — Toplam ve Öğrenci Başına Ortalama İstem Sayısı
                  </h3>
                  <p className="text-xs text-slate-500">
                    Seçili aşama filtresine göre gruplar arası istem yoğunluğu karşılaştırması
                  </p>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overviewStats.promptCompData} margin={{ top: 24, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Kontrol" name="Kontrol Grubu" fill="#64748b" radius={[6, 6, 0, 0]} maxBarSize={72}>
                        <LabelList dataKey="Kontrol" position="top" style={{ fontSize: 12, fontWeight: 700, fill: '#334155' }} />
                      </Bar>
                      <Bar dataKey="Deney" name="Deney Grubu" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={72}>
                        <LabelList dataKey="Deney" position="top" style={{ fontSize: 12, fontWeight: 700, fill: '#047857' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Alt İki Grafik: İstem Başına Çevresel Etki + Model Ölçeği Tercih Dağılımı (%) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    İstem Başına Ortalama Çevresel Etki (Enerji, Su, CO₂)
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Tek bir sorunun ortalama su, elektrik ve karbon maliyeti
                  </p>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overviewStats.perPromptEnvData} margin={{ top: 20, right: 16, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Kontrol" name="Kontrol" fill="#64748b" radius={[6, 6, 0, 0]}>
                          <LabelList dataKey="Kontrol" position="top" style={{ fontSize: 11, fill: '#334155' }} />
                        </Bar>
                        <Bar dataKey="Deney" name="Deney" fill="#0284c7" radius={[6, 6, 0, 0]}>
                          <LabelList dataKey="Deney" position="top" style={{ fontSize: 11, fill: '#0369a1' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    Model Ölçeği Tercih Dağılımı (%)
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Hafif, Standart ve Akıl Yürütme modeli kullanım yüzdeleri
                  </p>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overviewStats.modelDistData} margin={{ top: 20, right: 16, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => `%${v}`} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Hafif Model" fill="#10b981" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="Hafif Model" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 10 }} />
                        </Bar>
                        <Bar dataKey="Standart Model" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="Standart Model" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 10 }} />
                        </Bar>
                        <Bar dataKey="Akıl Yürütme" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="Akıl Yürütme" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 10 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ==============================================================
           * SEKME 2: ÖN TEST – SON TEST & İSTATİSTİK (MİNİ SPSS)
           * ============================================================== */}
          {activeTab === 'stats' && (
            <>
              {/* 4 Net Değişim Kartı */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {spssAnalysis.changeCards.map((c) => (
                  <div key={c.key} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
                    <div className="text-xs font-bold text-slate-600">{c.label} (Ön → Son)</div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <span className="font-semibold text-slate-600">Kontrol</span>
                        <span className="font-bold text-slate-800">
                          {c.kontrolPct === null ? (
                            'Veri yok'
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              {c.kontrolPct < 0 ? (
                                <TrendingDown className="w-3.5 h-3.5 text-slate-500" />
                              ) : (
                                <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                              )}
                              {c.kontrolPct > 0 ? '+' : ''}
                              {fmtNum(c.kontrolPct, 1)}%
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                        <span className="font-semibold text-emerald-800">Deney</span>
                        <span className="font-bold text-emerald-900">
                          {c.deneyPct === null ? (
                            'Veri yok'
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              {c.deneyPct < 0 ? (
                                <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                              )}
                              {c.deneyPct > 0 ? '+' : ''}
                              {fmtNum(c.deneyPct, 1)}%
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ön Test vs. Son Test Yan Yana Gruplandırılmış Sütun Grafikleri */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    Öğrenci Başına Ortalama İstem Sayısı (Ön Test vs. Son Test)
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Deney ve Kontrol gruplarının aşamalar arası istem ortalaması
                  </p>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={spssAnalysis.prePostPromptChart} margin={{ top: 22, right: 16, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Ön Test" fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={64}>
                          <LabelList dataKey="Ön Test" position="top" style={{ fontSize: 12, fontWeight: 700 }} />
                        </Bar>
                        <Bar dataKey="Son Test" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={64}>
                          <LabelList dataKey="Son Test" position="top" style={{ fontSize: 12, fontWeight: 700, fill: '#047857' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Ön Test vs. Son Test — {metricMeta[chartMetric].label}
                      </h3>
                      <p className="text-xs text-slate-500">Öğrenci başına ortalama değerler</p>
                    </div>
                    <select
                      value={chartMetric}
                      onChange={(e) => setChartMetric(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="water">Toplam Su (mL)</option>
                      <option value="energy">Toplam Enerji (Wh)</option>
                      <option value="co2">Toplam CO₂ (g)</option>
                      <option value="lightPct">Hafif Model (%)</option>
                    </select>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={spssAnalysis.prePostMetricChart} margin={{ top: 22, right: 16, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Ön Test" fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={64}>
                          <LabelList dataKey="Ön Test" position="top" style={{ fontSize: 11, fontWeight: 700 }} />
                        </Bar>
                        <Bar dataKey="Son Test" fill="#0284c7" radius={[6, 6, 0, 0]} maxBarSize={64}>
                          <LabelList dataKey="Son Test" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#0369a1' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Saf Matematiksel Mini SPSS Motoru */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FlaskConical className="w-5 h-5 text-emerald-600" />
                      İstatistik Motoru (Mini SPSS · α = 0,05)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Eksik Beta Fonksiyonu ile çift yönlü kesin p-değeri · Welch Bağımsız ve Eşleştirilmiş Bağımlı t-Testleri
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Analiz Metriği:</span>
                    <select
                      value={statsMetric}
                      onChange={(e) => setStatsMetric(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="prompts">İstem Sayısı</option>
                      <option value="water">Toplam Su (mL)</option>
                      <option value="energy">Toplam Enerji (Wh)</option>
                      <option value="co2">Toplam CO₂ (g)</option>
                      <option value="lightPct">Hafif Model Oranı (%)</option>
                    </select>
                  </div>
                </div>

                {/* 4 Hücre Betimsel İstatistik Tablosu */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Betimsel İstatistikler — {metricMeta[statsMetric].label}
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-semibold">
                        <tr>
                          <th className="px-4 py-2.5 border-b border-slate-200">Deney Hücresi</th>
                          <th className="px-4 py-2.5 border-b border-slate-200">Katılımcı (n)</th>
                          <th className="px-4 py-2.5 border-b border-slate-200">Ortalama (x̄)</th>
                          <th className="px-4 py-2.5 border-b border-slate-200">Standart Sapma (SS)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {spssAnalysis.descriptives.map((row) => (
                          <tr key={row.cell} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-semibold text-slate-900">{row.cell}</td>
                            <td className="px-4 py-2.5">{row.n}</td>
                            <td className="px-4 py-2.5 font-mono font-semibold text-slate-800">
                              {row.n > 0 ? fmtNum(row.mean, 3) : '—'}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-600">
                              {row.n > 1 ? fmtNum(row.sd, 3) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4 Kanonik Hipotez Testi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {spssAnalysis.tests.map((test) => {
                    const r = test.result;
                    const isSig = r.valid && r.p < 0.05;
                    return (
                      <div
                        key={test.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="text-sm font-bold text-slate-900">{test.title}</h5>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {test.method} · {test.expected}
                              </div>
                            </div>
                            {r.valid ? (
                              <span
                                className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  isSig
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {isSig ? 'Anlamlı (p < 0,05)' : 'Anlamlı Değil (p ≥ 0,05)'}
                              </span>
                            ) : (
                              <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                                Yetersiz n
                              </span>
                            )}
                          </div>

                          {r.valid && (
                            <div className="grid grid-cols-3 gap-2 mt-3">
                              <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
                                <div className="text-[10px] text-slate-500 font-semibold">t istatistiği</div>
                                <div className="text-sm font-mono font-bold text-slate-900">
                                  {fmtNum(r.t, 3)}
                                </div>
                              </div>
                              <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
                                <div className="text-[10px] text-slate-500 font-semibold">sd (df)</div>
                                <div className="text-sm font-mono font-bold text-slate-900">
                                  {fmtNum(r.df, 2)}
                                </div>
                              </div>
                              <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
                                <div className="text-[10px] text-slate-500 font-semibold">p-değeri</div>
                                <div
                                  className={`text-sm font-mono font-bold ${
                                    isSig ? 'text-emerald-700' : 'text-slate-800'
                                  }`}
                                >
                                  {formatPValue(r.p)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200/80">
                          {test.interpret(r)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ==============================================================
           * SEKME 3: ÖĞRENCİ KAYITLARI
           * ============================================================== */}
          {activeTab === 'records' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-2.5">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Kod veya istem içinde ara..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="all">Grup: Tümü</option>
                  <option value="Kontrol">Kontrol</option>
                  <option value="Deney">Deney</option>
                </select>

                <select
                  value={recordPhaseFilter}
                  onChange={(e) => setRecordPhaseFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="all">Aşama: Tümü</option>
                  <option value="pretest">Ön Test</option>
                  <option value="posttest">Son Test</option>
                </select>

                <select
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="all">Model: Tümü</option>
                  <option value="light">Hafif Model</option>
                  <option value="standard">Standart Model</option>
                  <option value="reasoning">Akıl Yürütme</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportFilteredCsv}
                  disabled={filteredRecords.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4" />
                  <span>CSV İndir ({filteredRecords.length})</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Tarih</th>
                      <th className="px-4 py-3">Kod / Grup</th>
                      <th className="px-4 py-3">Aşama</th>
                      <th className="px-4 py-3">Model</th>
                      <th className="px-4 py-3">İstem</th>
                      <th className="px-4 py-3">Enerji / Su / CO₂</th>
                      <th className="px-4 py-3 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                          Seçili filtrelere uygun kayıt bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((rec) => (
                        <tr
                          key={rec.id}
                          onClick={() => setPreviewRecord(rec)}
                          className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                            {rec.createdAt
                              ? new Date(rec.createdAt).toLocaleString('tr-TR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-bold text-slate-900">{rec.code}</span>
                            <span
                              className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                rec.group === 'Deney'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {rec.group}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rec.phase === 'posttest'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}
                            >
                              {rec.phase === 'posttest' ? 'Son Test' : 'Ön Test'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                MODEL_SCALES[rec.modelId]?.badgeClass || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {MODEL_SCALES[rec.modelId]?.shortName || rec.modelId}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate text-slate-800 font-medium">
                            {rec.prompt}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                            {fmtSmart(rec.energyAvg)} Wh · {fmtSmart(rec.waterAvg)} mL · {fmtSmart(rec.co2Avg)} g
                          </td>
                          <td
                            className="px-4 py-3 whitespace-nowrap text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setPreviewRecord(rec)}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                                title="Önizle"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTargetId(rec.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 hover:text-rose-700"
                                title="Kaydı Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==============================================================
           * SEKME 4: KATILIMCI KODLARI (60)
           * ============================================================== */}
          {activeTab === 'codes' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Tanımlı 60 Katılımcı Kodu (30 Kontrol + 30 Deney)
                  </h3>
                  <p className="text-xs text-slate-500">
                    K001–K020 / D001–D020 Asıl · K021–K030 / D021–D030 Yedek katılımcı kodları
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      copyText(PARTICIPANT_CODES.map((c) => `${c.code} (${c.group} - ${c.status})`).join('\n'), 'ALL');
                      showToast('60 katılımcı kodu panoya kopyalandı.');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Tümünü Kopyala</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCodesCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Kodları CSV İndir</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Kod</th>
                      <th className="px-4 py-2.5">Grup</th>
                      <th className="px-4 py-2.5">Statü</th>
                      <th className="px-4 py-2.5">Kullanım</th>
                      <th className="px-4 py-2.5">Ön Test</th>
                      <th className="px-4 py-2.5">Son Test</th>
                      <th className="px-4 py-2.5">Toplam İstem</th>
                      <th className="px-4 py-2.5 text-right">Kopyala</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {codeRows.map((row) => (
                      <tr key={row.code} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{row.code}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.group === 'Deney'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {row.group}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{row.status}</td>
                        <td className="px-4 py-2.5">
                          {row.active ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <Clock className="w-3.5 h-3.5" /> Bekliyor
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono">{row.preCount}</td>
                        <td className="px-4 py-2.5 font-mono">{row.postCount}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{row.totalCount}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => copyText(row.code, row.code)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium"
                          >
                            {copiedCode === row.code ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Kopyalandı</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Kopyala</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==============================================================
           * SEKME 5: METODOLOJİ & KAYNAKÇA
           * ============================================================== */}
          {activeTab === 'methodology' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
              <MethodologyContent />
            </div>
          )}
        </div>
      </main>

      {/* Kayıt Detay Önizleme Modalı */}
      <ModalShell
        open={Boolean(previewRecord)}
        onClose={() => setPreviewRecord(null)}
        title={
          previewRecord
            ? `Etkileşim Detayı — ${previewRecord.code} (${previewRecord.group})`
            : ''
        }
        subtitle={
          previewRecord
            ? `${previewRecord.phase === 'posttest' ? 'Son Test' : 'Ön Test'} · ${
                MODEL_SCALES[previewRecord.modelId]?.name || previewRecord.modelId
              } · ${previewRecord.createdAt ? new Date(previewRecord.createdAt).toLocaleString('tr-TR') : ''}`
            : ''
        }
      >
        {previewRecord && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200">
              <div className="text-[11px] font-bold uppercase text-slate-500 mb-1">Öğrenci İstemi</div>
              <p className="text-sm text-slate-900 whitespace-pre-wrap">{previewRecord.prompt}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Tokenlar</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {previewRecord.inputTokens} in / {previewRecord.outputTokens} out
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-amber-700">Enerji (Ort.)</div>
                <div className="font-bold text-amber-900 mt-0.5">{fmtSmart(previewRecord.energyAvg)} Wh</div>
              </div>
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200">
                <div className="text-sky-700">Su (Ort.)</div>
                <div className="font-bold text-sky-900 mt-0.5">{fmtSmart(previewRecord.waterAvg)} mL</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
                <div className="text-slate-600">CO₂ (Ort.)</div>
                <div className="font-bold text-slate-900 mt-0.5">{fmtSmart(previewRecord.co2Avg)} g</div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <div className="text-[11px] font-bold uppercase text-slate-500 mb-2">Asistan Yanıtı</div>
              <RichMessage content={previewRecord.response} showCopyButton />
            </div>
          </div>
        )}
      </ModalShell>

      {/* Onay Pencereleri (alert/confirm kesinlikle yok) */}
      <ConfirmDialog
        open={confirmClearOpen}
        title="Tüm Verileri Temizle"
        message="Veritabanındaki tüm Ön Test ve Son Test öğrenci etkileşim kayıtları kalıcı olarak silinecektir. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?"
        confirmLabel="Evet, Tümünü Sil"
        danger
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={async () => {
          setConfirmClearOpen(false);
          setBusyAction(true);
          try {
            await onClearAll();
            showToast('Tüm etkileşim kayıtları temizlendi.');
          } finally {
            setBusyAction(false);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTargetId)}
        title="Kaydı Sil"
        message="Bu öğrenci etkileşim kaydını kalıcı olarak silmek istediğinize emin misiniz?"
        confirmLabel="Kaydı Sil"
        danger
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={async () => {
          const id = deleteTargetId;
          setDeleteTargetId(null);
          await onDeleteSingle(id);
          showToast('Kayıt silindi.');
        }}
      />
    </div>
  );
}

/* ============================================================================
 * 14. ANA UYGULAMA BİLEŞENİ (App)
 * ============================================================================ */

export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [authReady, setAuthReady] = useState(!hasFirebase);

  // Merkezi deney aşaması ve etkileşim kayıtları
  const [activePhase, setActivePhase] = useState('pretest'); // 'pretest' | 'posttest'
  const [interactions, setInteractions] = useState([]);

  // Aktif oturum: { role: 'student' | 'admin', code?: string } | null
  const [session, setSession] = useState(null);

  // Dış body kaydırmasını kilitle (tam ekran sabit yerleşim)
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  // 1. Firebase Kimlik Doğrulama (RULE 3: Önce oturum aç, sonra dinleyici kur)
  useEffect(() => {
    if (!hasFirebase || !auth) {
      setAuthReady(true);
      return;
    }

    let mounted = true;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (_err) {
        if (mounted) setAuthReady(true);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!mounted) return;
      setFbUser(user || null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // 2. Firestore Gerçek Zamanlı Senkronizasyon (RULE 1, RULE 2, RULE 3)
  useEffect(() => {
    if (!hasFirebase || !db || !fbUser) return;

    // A) Merkezi aktif aşama dokümanı: /artifacts/{appId}/public/data/settings/experiment
    const expDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'experiment');
    const unsubExp = onSnapshot(
      expDocRef,
      (snap) => {
        if (snap.exists()) {
          const phase = snap.data()?.activePhase;
          if (phase === 'pretest' || phase === 'posttest') {
            setActivePhase(phase);
          }
        }
      },
      (_err) => {
        // Sessizce yerel durumu koru
      }
    );

    // B) Tüm etkileşim kayıtları: /artifacts/{appId}/public/data/interactions
    const interColRef = collection(db, 'artifacts', appId, 'public', 'data', 'interactions');
    const unsubInter = onSnapshot(
      interColRef,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setInteractions(list);
      },
      (_err) => {
        // Sessizce yerel yedekle devam et
      }
    );

    // C) Kullanıcı oturumu koruma (sayfa yenilendiğinde aktif kod kaybolmaz)
    const sessionDocRef = doc(db, 'artifacts', appId, 'users', fbUser.uid, 'session', 'current');
    getDoc(sessionDocRef)
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.role === 'admin') {
            setSession({ role: 'admin' });
          } else if (data?.role === 'student' && PARTICIPANT_MAP[data.code]) {
            setSession({ role: 'student', code: data.code });
          }
        }
      })
      .catch(() => {});

    return () => {
      unsubExp();
      unsubInter();
    };
  }, [fbUser]);

  const persistSession = useCallback(
    async (nextSession) => {
      setSession(nextSession);
      if (hasFirebase && db && fbUser) {
        try {
          const sessionDocRef = doc(db, 'artifacts', appId, 'users', fbUser.uid, 'session', 'current');
          if (nextSession) {
            await setDoc(sessionDocRef, nextSession);
          } else {
            await deleteDoc(sessionDocRef);
          }
        } catch (_err) {
          // ignore
        }
      }
    },
    [fbUser]
  );

  const handleChangePhase = useCallback(
    async (nextPhase) => {
      setActivePhase(nextPhase);
      if (hasFirebase && db && fbUser) {
        try {
          const expDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'experiment');
          await setDoc(expDocRef, { activePhase: nextPhase, updatedAt: Date.now() }, { merge: true });
        } catch (_err) {
          // ignore
        }
      }
    },
    [fbUser]
  );

  const handleAddInteraction = useCallback(
    async (record) => {
      if (hasFirebase && db && fbUser) {
        try {
          const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'interactions');
          await addDoc(colRef, record);
          return;
        } catch (_err) {
          // Yedek yerel ekleme
        }
      }
      setInteractions((prev) => [
        ...prev,
        { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...record }
      ]);
    },
    [fbUser]
  );

  const handleLoadSamples = useCallback(async () => {
    const sampleItems = generateSampleInteractions();
    if (hasFirebase && db && fbUser) {
      try {
        const batch = writeBatch(db);
        // Önce mevcut örnekleri kaldır ki yinelenmesin
        interactions
          .filter((i) => i.isSample)
          .forEach((item) => {
            batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'interactions', item.id));
          });
        sampleItems.forEach((s) => {
          const { id, ...rest } = s;
          batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'interactions', id), rest);
        });
        await batch.commit();
        return;
      } catch (_err) {
        // Yerel yedeğe düş
      }
    }
    setInteractions((prev) => [...prev.filter((i) => !i.isSample), ...sampleItems]);
  }, [fbUser, interactions]);

  const handleRemoveSamples = useCallback(async () => {
    if (hasFirebase && db && fbUser) {
      try {
        const batch = writeBatch(db);
        interactions
          .filter((i) => i.isSample)
          .forEach((item) => {
            batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'interactions', item.id));
          });
        await batch.commit();
        return;
      } catch (_err) {
        // ignore
      }
    }
    setInteractions((prev) => prev.filter((i) => !i.isSample));
  }, [fbUser, interactions]);

  const handleClearAll = useCallback(async () => {
    if (hasFirebase && db && fbUser) {
      try {
        const batch = writeBatch(db);
        interactions.forEach((item) => {
          batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'interactions', item.id));
        });
        await batch.commit();
        return;
      } catch (_err) {
        // ignore
      }
    }
    setInteractions([]);
  }, [fbUser, interactions]);

  const handleDeleteSingle = useCallback(
    async (id) => {
      if (hasFirebase && db && fbUser) {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'interactions', id));
          return;
        } catch (_err) {
          // ignore
        }
      }
      setInteractions((prev) => prev.filter((item) => item.id !== id));
    },
    [fbUser]
  );

  if (!authReady) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-600">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          <span>Platform hazırlanıyor...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        onStudentLogin={(code) => persistSession({ role: 'student', code })}
        onAdminLogin={() => persistSession({ role: 'admin' })}
      />
    );
  }

  if (session.role === 'admin') {
    return (
      <AdminDashboard
        activePhase={activePhase}
        onChangePhase={handleChangePhase}
        interactions={interactions}
        onLoadSamples={handleLoadSamples}
        onRemoveSamples={handleRemoveSamples}
        onClearAll={handleClearAll}
        onDeleteSingle={handleDeleteSingle}
        onLogout={() => persistSession(null)}
      />
    );
  }

  return (
    <StudentChatView
      participantCode={session.code}
      activePhase={activePhase}
      interactions={interactions}
      onAddInteraction={handleAddInteraction}
      onLogout={() => persistSession(null)}
    />
  );
}