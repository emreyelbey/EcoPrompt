// Marka yasağı (TÜBİTAK kuralı 1) için yasaklı ad desenleri. Tek yerde tutulur:
// tests/marka-yasagi.test.js (kaynak kod taraması) ve tests/excelExport.test.js (Excel içeriği taraması) kullanır.
// \b kelime sınırıdır: "metadata" gibi masum kelimeler yakalanmasın diye.
export const BRAND_PATTERNS = [
  /\bopenai\b/i,
  /\bchatgpt\b/i,
  /\bgpt\b/i,
  /\bclaude\b/i,
  /\banthropic\b/i,
  /\bgemini\b/i,
  /\bgoogle\b/i,
  /\bbard\b/i,
  /\bcopilot\b/i,
  /\bmicrosoft\b/i,
  /\bllama\b/i,
  /\bmeta ai\b/i,
  /\bmistral\b/i,
  /\bdeepseek\b/i,
  /\bgrok\b/i,
  /\bperplexity\b/i,
];
