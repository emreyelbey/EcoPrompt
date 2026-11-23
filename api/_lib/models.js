// Ölçek sınıfı → gerçek yapay zeka modeli eşlemesi (proje rehberi Bölüm 4).
// Model adları projede YALNIZCA bu dosyada geçer. Arayüz, kayıtlar ve Excel yalnızca
// 'light' | 'standard' | 'reasoning' sınıf kimliklerini görür.
//
// Onay: 23.11.2026. Sağlayıcının model listesi ve ücretsiz katman bilgisi kontrol edildi.
// Her sınıf gerçekten farklı bir modele gider (prototipteki "üç sınıf tek model" hatası tekrarlanmaz).
//   thinkingLevel: modelin cevap vermeden önce ne kadar "düşüneceği".
//   - minimal: neredeyse kapalı (bu modelde tamamen kapatılamaz)
//   - low:     az düşünme (bu modelde düşünme kapatılamaz; en düşük seviye low)
//   - high:    derin düşünme (akıl yürütme sınıfı)

export const MODEL_MAP = {
  light: { model: 'gemini-3.5-flash-lite', thinkingLevel: 'minimal' },
  standard: { model: 'gemini-3.8-flash', thinkingLevel: 'low' },
  reasoning: { model: 'gemini-4-hydrogen', thinkingLevel: 'high' },
};

// Sınıf kimliğine göre model ayarını döner. Bilinmeyen sınıfta hata verir:
// yanlış modele sessizce gitmek araştırma verisini bozar.
export function getModelConfig(modelId) {
  if (!Object.hasOwn(MODEL_MAP, modelId)) {
    throw new Error(`Bilinmeyen model sınıfı: ${modelId}`);
  }
  return MODEL_MAP[modelId];
}
