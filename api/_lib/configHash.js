// Yapılandırma özeti (configHash): ölçüm koşullarının deney boyunca değişmediğini kanıtlamak için.
//
// Neden gerekli? Sistem talimatı ve son 12 etkileşimin bağlamı her istemin girdi tokenına eklenir;
// model eşlemesi, düşünme ayarı ve sıcaklık çıktı uzunluğunu, footprint.js katsayıları da enerji hesabını
// belirler. Bunlardan biri Ön Test ile Son Test arasında değişirse enerji ölçümü değişir (karıştırıcı
// değişken). DONDURMA KURALI: Ön Test başladıktan sonra Son Test bitene kadar bunlar değiştirilmez.
//
// Nasıl çalışır? Bu ayarların hepsi sabit sıralı bir metne çevrilir ve SHA-256 özeti alınır (Node'un
// yerleşik crypto modülü; yeni paket yok). İlk 12 onaltılık karakter her etkileşim kaydına `configHash`
// olarak yazılır. Ayarlardan tek bir harf bile değişirse özet tamamen değişir. Yönetici panelindeki
// İstatistik sekmesi kayıtlarda kaç farklı özet olduğunu gösterir: tek değer = koşullar sabit kalmış.
//
// Maliyet: ek Firestore okuması/yazması yok (aynı kayda ~12 karakterlik tek alan). Özet sunucu açılışında
// bir kez hesaplanır. Özet tek yönlüdür; model adlarını açığa çıkarmaz. Yine de öğrenciye gönderilmez.
import { createHash } from 'node:crypto';
import { buildSystemInstruction } from './prompt.js';
import { MODEL_MAP } from './models.js';
import { TEMPERATURE } from './ai.js';
import { HISTORY_LIMIT } from './interactions.js';
import { MODEL_ORDER, MODEL_SCALES, WUE, CARBON_INTENSITY, OUTPUT_WEIGHT, CHARS_PER_TOKEN } from '../../src/lib/footprint.js';

// Özetin uzunluğu (onaltılık karakter). 12 karakter = 48 bit; birkaç sürüm arasında çakışma olasılığı yok sayılabilir.
export const CONFIG_HASH_LENGTH = 12;

// Nesneyi anahtarları alfabetik sıralı JSON metnine çevirir. Böylece aynı ayarlar, nesnedeki anahtar
// sırası farklı olsa bile her zaman aynı metni (ve aynı özeti) verir.
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// Ölçümü etkileyen bütün ayarlar (özetin girdisi).
export function currentConfig() {
  return {
    systemInstructions: Object.fromEntries(MODEL_ORDER.map((id) => [id, buildSystemInstruction(id)])),
    modelMap: MODEL_MAP,
    temperature: TEMPERATURE,
    historyLimit: HISTORY_LIMIT,
    footprint: { MODEL_SCALES, WUE, CARBON_INTENSITY, OUTPUT_WEIGHT, CHARS_PER_TOKEN },
  };
}

// Verilen ayarların kısa özeti.
export function computeConfigHash(config) {
  return createHash('sha256').update(stableStringify(config)).digest('hex').slice(0, CONFIG_HASH_LENGTH);
}

// Bu sunucu sürümünün özeti (açılışta bir kez hesaplanır).
export const CONFIG_HASH = computeConfigHash(currentConfig());
