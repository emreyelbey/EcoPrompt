# EkoToken — Claude Code Proje Rehberi

Bu dosya her oturumun başında okunur. Buradaki kurallar sohbetteki genel alışkanlıklardan önce gelir.
Ayrıntılı gereksinimler: `docs/sartname.md`. Görsel ve mantık referansı: `reference/canvas-prototip.tsx`.

## 1. Proje nedir?

EkoToken, TÜBİTAK 2204-A Lise Araştırma Projeleri için geliştirilen bir web uygulamasıdır.
Öğrencilerin yapay zeka kullanımının çevresel ayak izini (enerji, su, CO₂) ölçer ve farkındalık oluşturur.
Araştırma deseni: **Ön Test – Son Test Kontrol Gruplu Kör Deney** (60 katılımcı kodu: K001–K030, D001–D030).

- **Ön Test:** Herkes aynı sade "Eğitim Asistanı" sohbet ekranını görür. Hiçbir çevresel gösterge yoktur.
- **Son Test:** Kontrol grubu sade ekranda kalır. Deney grubu (D…) "EkoToken" arayüzünü görür: rozetler, günlük karşılıklar, tasarruf ipucu, kişisel rapor, metodoloji.
- **Yönetici paneli:** Aşama anahtarı, grafikler, mini SPSS (4 t-testi), kayıtlar, kodlar, 4 sayfalı Excel.

Kapsam: Şartnamedeki **tüm** özellikler yapılacak. Hiçbir özellik kesilmeyecek. Bölüm 9'daki sıra yalnızca inşa sırasıdır.

## 2. Mutlak kurallar (TÜBİTAK)

1. **Marka yasağı:** Arayüzde, hata mesajlarında, Excel'de ve yapay zekanın cevaplarında hiçbir ticari yapay zeka marka/ürün adı (OpenAI, ChatGPT, Claude, Anthropic, Gemini, Google vb.) veya logosu görünmez. Model adları yalnızca sunucu kodunda ve ortam değişkenlerinde geçer.
2. **Yalnızca 3 ölçek sınıfı:** `light` = Hafif Model, `standard` = Standart Model, `reasoning` = Akıl Yürütme Modeli.
3. **Dil:** Arayüz, hata mesajları, grafikler, istatistik yorumları ve Excel başlıkları tamamen Türkçedir.
4. **Giriş ekranında demo/önizleme butonu yoktur.** Yalnızca geçerli 60 koddan biriyle giriş yapılır. Altta sade bir "Yönetici Girişi" bağlantısı bulunur.

## 3. Mimari (KARARLAŞTIRILDI — değiştirmeden önce sor)

```
Tarayıcı (React)  ──HTTP──>  Vercel sunucu fonksiyonları (/api/*)  ──Admin SDK──>  Firestore
       │                              │
       │                              └──> Yapay zeka API'si (anahtar yalnızca sunucuda)
       └── (tek istisna) settings/experiment belgesini SALT OKUNUR dinler
```

- **Öğrencinin tarayıcısı veritabanına doğrudan erişmez.** Kod doğrulama, yönetici parolası, kayıt yazma ve okuma işlemlerinin hepsi `/api/*` fonksiyonlarından geçer.
- **Tek istisna:** `settings/experiment` belgesi (`activePhase`). Tarayıcı bunu Firebase istemci SDK'sı ile gerçek zamanlı **okur**, yazamaz. Firestore kuralları: bu belge `read: true, write: false`, geri kalan her şey `read, write: false`.
- **Sunucu belirler, tarayıcı değil:** `group` koddan, `phase` veritabanından, `createdAt` sunucu saatinden, token sayıları API yanıtından gelir. Tarayıcıdan gelen bu alanlara asla güvenilmez.
- **Öğrenci yalnızca kendi kayıtlarını alır** (kendi kodu + aktif aşama). Başka hiçbir öğrencinin verisi tarayıcıya inmez.
- **Yönetici oturumu:** Parola sunucuda `ADMIN_PASSCODE` ile karşılaştırılır. Başarılıysa sunucu imzalı, süreli bir token döner (`SESSION_SECRET` ile). Tüm yönetici uç noktaları bu token'ı doğrular. Yönetici paneli veriyi birkaç saniyede bir yenileyerek çeker.
- **Öğrenci oturumu:** Aktif kod `localStorage`'da saklanır (sayfa yenilenince kaybolmaz). Sunucu her istekte kodu yeniden doğrular.
- **Hız sınırı:** Kod başına 3 saniye, istem en fazla 4000 karakter. Son istek zamanı Firestore'da tutulur (sunucusuz ortamda bellekte tutulamaz).

### Teknoloji yığını
- Frontend: Vite + React + Tailwind CSS + `lucide-react` + `recharts`
- Markdown/formül: `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex` (KaTeX npm paketiyle, CDN yok)
- Excel: npm paketiyle `.xlsx` üretimi (CDN yok)
- Sunucu: Vercel Serverless Functions (`/api`), `firebase-admin`
- Veritabanı: Firebase Firestore (ücretsiz Spark planı)
- Yapay zeka: Google AI Studio (Gemini API) ücretsiz kota
- Test: Vitest

### Ortam değişkenleri (asla koda veya git'e yazılmaz)
| Değişken | Nerede | Açıklama |
|---|---|---|
| `GEMINI_API_KEY` | Sunucu | Yapay zeka API anahtarı |
| `ADMIN_PASSCODE` | Sunucu | Yönetici parolası |
| `SESSION_SECRET` | Sunucu | Yönetici token imzası |
| `FIREBASE_SERVICE_ACCOUNT` | Sunucu | Admin SDK kimlik bilgisi (JSON) |
| `VITE_FIREBASE_*` | Tarayıcı | Yalnızca `settings/experiment` okumak için istemci ayarları |

`.env.local` dosyası `.gitignore`'da olmalı. Örnek değerler `.env.example` dosyasında tutulur.

## 4. Gerçek model eşlemesi

Her ölçek sınıfı **gerçekten farklı** bir modele bağlanır. Canvas prototipinde üç sınıf da aynı modeli çağırıyordu; bu bilimsel geçerlilik hatasıdır, tekrarlanmaz.

- Eşleme tek bir sunucu dosyasında tanımlanır (ör. `api/_lib/models.js`). Başka hiçbir yerde model adı geçmez.
- Şartnamedeki hedef: `light` → en küçük/hızlı model, `standard` → orta model, `reasoning` → düşünme modu açık veya en güçlü model.
- **Model adlarını ezberden yazma.** Eşlemeyi kurmadan önce sağlayıcının güncel model listesini ve ücretsiz kota sınırlarını kontrol et, kullanıcıya sun, onay al.

## 5. Bilimsel hesaplama motoru

Saf fonksiyonlar `src/lib/footprint.js` içinde. Her fonksiyonun birim testi olmalı.

- **Ağırlıklı token** = Girdi + 3 × Çıktı
- API yanıtında gerçek `usageMetadata` varsa o kullanılır. **Çıktı token = `candidatesTokenCount + thoughtsTokenCount`** (düşünme tokenları üretilmiş tokendır, enerji harcar).
- `usageMetadata` yoksa tahmin: ⌈karakter / 3,6⌉. Boş metin = 0. Gizli/sabit token eklenmez.
- Hangi yöntemle sayıldığı kayda yazılır: `tokenSource: 'gerçek' | 'tahmini'`.

| Sınıf | Enerji Min / Ort / Maks (Wh, 1000 ağırlıklı token başına) | Maliyet USD/1M (Girdi · Çıktı) |
|---|---|---|
| light | 0.12 / 0.18 / 0.25 | 0.10 · 0.40 |
| standard | 0.45 / 0.65 / 0.90 | 1.25 · 5.00 |
| reasoning | 1.40 / 2.10 / 3.00 | 3.00 · 15.00 |

- Su (WUE, mL/Wh): 0.2 / 1.0 / 1.8 — min enerji × min WUE, ort × ort, maks × maks
- Karbon (g CO₂/Wh): 0.30 / 0.43 / 0.55 — aynı eşleşme
- Tasarruf % = (seçilen ort. enerji katsayısı − hafif ort.) / seçilen ort. × 100
- Günlük karşılıklar: damla 0.05 mL, tatlı kaşığı 5 mL, bardak 200 mL, şişe 500 mL; 10 W LED (1 Wh = 360 sn); telefon bataryası 15 Wh; araç 120 g/km; olgun ağaç 60 g/gün.
- Referans uygulama: `reference/canvas-prototip.tsx` içindeki `calculateFootprint`, `estimateTokens`, `getDailyEquivalents`.

## 6. İstatistik motoru (mini SPSS)

Saf fonksiyonlar `src/lib/stats.js` içinde. `reference/canvas-prototip.tsx` içindeki `lnGamma`, `betacf`, `regularizedIncompleteBeta`, `studentTTwoTailedP`, `welchTTest`, `pairedTTest` alınır. Bu fonksiyonlar standart t-tablosu değerleriyle doğrulandı (ör. t=2.0, sd=10 → p=0.073388).

Zorunlu testler (Vitest):
- p(t=2.0, df=10) = 0.073388 · p(t=2.228139, df=10) = 0.05 · p(t=−3.5, df=4) = 0.024896
- Eşleştirilmiş: pre=[10,12,9,11,13], post=[8,11,7,10,9] → t = −3.6515, df = 4, p ≈ 0.0217

**Düzeltilecek uç durumlar** (prototip sahte değer üretiyordu):
- Farkların standart sapması 0 ise: `t = ±999, p = 0.0001` YAZILMAZ. `valid: false` ve Türkçe "hesaplanamadı" gerekçesi döner.
- Welch'te iki grubun varyansı 0 ama ortalamalar farklıysa: `p = 1` YAZILMAZ. Aynı şekilde "hesaplanamadı".
- n < 2 ise hata vermeden bilgilendirme gösterilir.

4 kanonik test: (1) Ön Test K vs D (Welch), (2) Kontrol Ön vs Son (eşleştirilmiş), (3) Deney Ön vs Son (eşleştirilmiş), (4) Son Test K vs D (Welch). α = 0.05, her test için t, sd, p ve otomatik Türkçe yorum.

## 7. Veri modeli (Firestore)

`interactions/{id}`:
```
code, group ('Kontrol'|'Deney'), phase ('pretest'|'posttest'), modelId,
prompt, response, inputTokens, outputTokens, weightedTokens, tokenSource,
energyMin/Avg/Max, waterMin/Avg/Max, co2Min/Avg/Max, costUsd, savingsPct,
isSample (boolean), createdAt (sunucu zamanı)
```
`settings/experiment`: `{ activePhase: 'pretest' | 'posttest', updatedAt }`
`rateLimits/{code}`: `{ lastRequestAt }`

- **Örnek veriler (`isSample: true`) istatistiklere, grafiklere ve Excel'e varsayılan olarak GİRMEZ.** Yönetici panelinde örnekler varken açık bir uyarı bandı gösterilir.
- Aşama değiştirilince eski veriler silinmez. Öğrenci ekranı yalnızca aktif aşamanın mesajlarını gösterir.

## 8. Arayüz kuralları (önceki denemelerde yaşanmış hatalar)

- Ana görünümler: `fixed inset-0 w-full h-full flex flex-col overflow-hidden`. `body` kaydırması kapalı.
- `header` ve `footer` sabit (`shrink-0`). Yalnızca mesaj listesi (`main`) `flex-1 min-h-0 overflow-y-auto` ile kayar.
- **`scrollIntoView()` KULLANILMAZ.** Yalnızca `container.scrollTo({ top: container.scrollHeight })`.
- Model seçici mobilde `grid-cols-3`, sağdan taşmaz.
- Yapay zeka hatasında sahte/kalıp yanıt gösterilmez. Türkçe hata kartı + "Tekrar Dene" butonu.
- Para birimleri (`$0.15`, `$10`) formül sanılıp bozulmaz. Bunun için test yazılır.
- Her yanıtta "Kopyala" butonu. Başlıklar (6 seviye), tablolar, alıntılar, iç içe listeler, kod blokları desteklenir.
- Tarayıcı `alert/confirm` kullanılmaz. Onay için kendi modal bileşenimiz kullanılır.

## 9. İnşa sırası (hepsi yapılacak)

| Dilim | İçerik |
|---|---|
| 0 | İskelet: Vite + React + Tailwind, Vitest, boş sayfa Vercel'de yayında |
| 1 | Hesaplama motoru + istatistik motoru (saf fonksiyonlar + testler) |
| 2 | Giriş ekranı + `/api/login` (kod doğrulama) + yönetici girişi |
| 3 | Sade sohbet ekranı + `/api/chat` (gerçek model eşlemesi, hız sınırı, kayıt) |
| 4 | Aktif aşama: `settings/experiment` + yönetici anahtarı + gerçek zamanlı dinleme |
| 5 | EkoToken arayüzü: rozetler, günlük karşılık, tasarruf ipucu, kişisel rapor, metodoloji |
| 6 | Yönetici paneli: genel bakış, kayıtlar (+CSV), katılımcı kodları |
| 7 | Mini SPSS sekmesi + 4 sayfalı Excel |
| 8 | Örnek veri, Markdown/KaTeX cilası, mobil uyum, UAT hazırlığı |

## 10. Çalışma kuralları

- **Kod sade olacak.** Bu proje lise öğrencileri tarafından jüriye savunulacak. Her dosyanın başında ne yaptığını anlatan kısa bir Türkçe yorum olsun. Karmaşık satırlara Türkçe açıklama yaz. Akıllıca ama anlaşılmaz kısa yollardan kaçın.
- **Küçük adımlar.** Bir seferde tek dilim veya dilimin bir parçası. Bitince çalıştır, test et, sonra commit öner.
- **Önce plan.** Yeni bir dilime başlamadan önce kısa bir plan sun ve onay bekle.
- **Sor:** Mimariyi, veri modelini veya bilimsel katsayıları değiştirmeden; yeni bir bağımlılık eklemeden; bir dosyayı silmeden önce.
- **`reference/` klasörü salt okunurdur.** Oradan kod okunur ve uyarlanır, asla import edilmez veya değiştirilmez.
- **Gizli bilgi asla koda, commit'e veya loglara yazılmaz.**
- Commit mesajları Türkçe ve kısa: ne yapıldığını söyler.

## 11. Komutlar

- `npm run dev` — yerel geliştirme (http://localhost:5173, `/api` fonksiyonları çalışmaz)
- `npm test` — Vitest (tek sefer); `npm run test:watch` — izleme modu
- `npm run build` — üretim derlemesi (`dist/`)
- `vercel dev` — sunucu fonksiyonlarıyla birlikte yerel çalıştırma (Vercel CLI gerekir; Dilim 2–3'te kurulacak)
- Yayın: GitHub `main` dalına push → Vercel otomatik yayınlar.
- `tests/marka-yasagi.test.js`: `src/`, `index.html`, `api/` içinde marka adı arar; `api/_lib/` hariçtir.

## 12. Açık kararlar (uygulamadan önce kullanıcıya sor)

1. **Hiç istem yazmayan katılımcılar:** O aşamada 0 istem yazan bir öğrenci analize 0 değeriyle mi girecek, dışarıda mı kalacak? Prototip dışarıda bırakıyordu; bu, istem sayısındaki düşüşü sistematik olarak gizleyebilir. Danışman öğretmenin kararı bekleniyor. Karar verilene kadar istatistik kodunda bu nokta tek bir yapılandırma değeri olarak tutulur.
2. **Model adları:** Güncel model listesi kontrol edilip onaylanacak (Bölüm 4).
3. **Etik/veli onayı:** Kod meselesi değil, ama UAT ve canlı deneyden önce tamamlanmış olmalı.