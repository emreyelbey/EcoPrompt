// Metodoloji penceresindeki akademik kaynakça (şartname Bölüm 3.5).
// Ayrı dosyadadır: hem MethodologyModal hem de tests/methodology.test.js kullanır.
// KURAL: Hiçbir ticari yapay zeka marka/ürün adı geçmez (tests/marka-yasagi.test.js denetler).
// Kaynak: reference/canvas-prototip.tsx (ACADEMIC_REFERENCES).

export const ACADEMIC_REFERENCES = [
  {
    id: 1,
    authors: 'Li, P., Yang, J., Islam, M. A., & Ren, S.',
    year: '2023–2025',
    institution: 'UC Riverside',
    title: 'Making AI Less Thirsty: Uncovering and Addressing the Secret Water Footprint of AI Models',
    note: 'Veri merkezi soğutma suyu kullanım etkinliği (WUE) ve çıkarım başına su ayak izi modeli.',
  },
  {
    id: 2,
    authors: 'Luccioni, A. S., Jernite, Y., & Strubell, E.',
    year: '2024',
    institution: 'ACM FAccT',
    title: 'Power Hungry Processing: Watts Driving the Cost of AI Deployment',
    note: 'Model ölçeği ile çıkarım (inference) enerji tüketimi arasındaki ilişki.',
  },
  {
    id: 3,
    authors: 'EcoLogits (GenAI Impact)',
    year: '2024–2025',
    institution: 'GenAI Impact',
    title: 'Çıkarım (Inference) Enerji, PUE ve Çevresel Etki Metodolojisi',
    note: 'Çıktı tokenlarının ağırlıklandırılması, GPU bellek bant genişliği ve PUE çarpanı yaklaşımı.',
  },
  {
    id: 4,
    authors: 'International Energy Agency (IEA)',
    year: '2024–2025',
    institution: 'IEA',
    title: 'Electricity & Emissions Factors — Küresel Elektrik Şebekesi Karbon Yoğunluğu Verileri',
    note: 'Elektrik şebekesi karbon yoğunluğu aralığı (300–550 g CO₂/kWh, ort. 430 g CO₂/kWh).',
  },
];
