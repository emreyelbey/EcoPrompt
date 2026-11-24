# EkoToken — Claude Code Proje Rehberi

Bu dosya her oturumun başında okunur. Buradaki kurallar sohbetteki genel alışkanlıklardan önce gelir.
Ayrıntılı gereksinimler: `docs/sartname.md`. Mantık referansı: `reference/canvas-prototip.tsx`. Görsel referans (Yön 2b arayüz tasarımı, `tasarim-yon2b` dalı): `reference/tasarim-yon2b/` (`TASARIM.md` + 4 `.dc.html` taslak; uygulama kodu değil, React + Tailwind'e uyarlanır).

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
5. **Kör deney için nötr adlar:** Yayın adresi, Vercel proje adı ve sekme başlığı (`<title>`) nötr olmalı; "eko" veya çevre (enerji, su, karbon, yeşil vb.) çağrışımı yapmamalı. Kontrol grubu deneyin amacını adres çubuğundan veya sekmeden tahmin edememeli. Mevcut adres: `https://egitim-asistani-2204.vercel.app`, sekme başlığı: "Eğitim Asistanı".
6. **Dondurma kuralı (ölçüm koşulları):** Ön Test başladıktan sonra Son Test bitene kadar şunlar DEĞİŞTİRİLMEZ: sistem talimatı (`api/_lib/prompt.js`), model eşlemesi ve düşünme ayarları (`api/_lib/models.js`), sıcaklık (`api/_lib/ai.js` → `TEMPERATURE`), `footprint.js` katsayıları ve `HISTORY_LIMIT` (`api/_lib/interactions.js`). Sebep: sistem talimatı ve bağlam her istemin girdi tokenına eklenir, model ve katsayılar enerji hesabını belirler; aradaki bir değişiklik karıştırıcı değişken olur. Kanıt: her kayıt bu ayarların SHA-256 özetini `configHash` alanında taşır (`api/_lib/configHash.js`); yönetici panelinin İstatistik sekmesi kayıtlarda tek değer olup olmadığını ve sunucunun şu anki özetini (`/api/admin/data` → `currentConfigHash`, kayıt olmasa da) gösterir; ikisi farklıysa kırmızı uyarı çıkar. Bir hata düzeltmesi zorunluysa önce danışman öğretmene sorulur ve raporda belirtilir.

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
- **Aşamanın doğru kaynağı her zaman sunucudur.** Öğrenci ekranı aşamayı yalnızca istemci SDK dinleyicisinden öğrenmez: `/api/messages` ve `/api/chat` yanıtlarındaki `phase` ekrandakinden farklıysa ekran sunucunun söylediğine göre güncellenir (`src/lib/phases.js` → `applyPhaseReport`, `chatResponseAction`). Sebep: okul ağı veya reklam engelleyici dinleyiciyi bloklarsa Deney grubu Son Test'te sade ekranda kalır; kayıt "Deney/posttest" olur ama müdahale hiç uygulanmamış olur. `/api/chat` aşamayı isteğin başında okuduğu için yanıtındaki aşama farklıysa doğrudan uygulanmaz; geçmiş `/api/messages` ile yeniden yüklenir ve oradaki aşama uygulanır. `tests/phase-guvence.test.js` dinleyici hiç çalışmadan görünümün değiştiğini denetler.
- **Yönetici oturumu:** Parola sunucuda `ADMIN_PASSCODE` ile karşılaştırılır. Başarılıysa sunucu imzalı, süreli bir token döner (`SESSION_SECRET` ile). Tüm yönetici uç noktaları bu token'ı doğrular. Yönetici paneli veriyi **artımlı** çeker (Dilim 6, `src/components/admin/useAdminData.js`): açılışta bir kez tam yükleme, sonra 15 sn'de bir yalnızca son görülen zamandan sonra gelen kayıtlar (`/api/admin/data?since=…`, 5 sn örtüşme, sayfa başı 500). Sekme arka plandaysa yoklama durur. Sebep: Firestore Spark planı (günlük 50.000 okuma); tüm koleksiyonu sık sık yeniden okumak kotayı bitirir. Liste uzun yanıt metnini taşımaz (`ADMIN_LIST_FIELDS`, Firestore `select`); tam yanıt `/api/admin/record?id=` ile gelir.
- **Öğrenci oturumu:** Aktif kod `localStorage`'da saklanır (sayfa yenilenince ve tarayıcı kapanınca kaybolmaz; yalnızca Çıkış siler). Sunucu her istekte kodu yeniden doğrular.
- **Hız sınırı:** Kod başına 3 saniye, istem en fazla 4000 karakter. Son istek zamanı Firestore'da tutulur (sunucusuz ortamda bellekte tutulamaz).

### Teknoloji yığını
- Frontend: Vite + React + Tailwind CSS + `lucide-react` + `recharts`
- Markdown/formül: `react-markdown` + `remark-gfm` + `remark-math` + `remark-breaks` (tek satır sonu korunur) + kendi küçük eklentimiz `src/lib/remarkBrTags.js` (yanıttaki `<br>`, `<br/>`, `<br />` etiketlerini, tablo hücreleri dahil, gerçek satır sonuna çevirir; ham HTML kapalı kalır, başka etiketler ve kod içindeki `<br>` metin olarak görünür) + `rehype-katex` (KaTeX npm paketiyle, CDN yok) + KaTeX'in `mhchem` eklentisi (`\ce{H2O}` kimyasal formüller). `package.json` → `overrides` ile projede tek KaTeX kopyası (0.19.x) vardır; iki kopya olursa CSS ile çizici farklı sürümden gelir ve mhchem yanlış kopyaya kaydolur.
- Excel: npm paketiyle `.xlsx` üretimi (CDN yok)
- Sunucu: Vercel Serverless Functions (`/api`), `firebase-admin`
- Veritabanı: Firebase Firestore (ücretsiz Spark planı)
- Yapay zeka: Google AI Studio (Gemini API) ücretsiz kota
- Test: Vitest (+ ekran testleri için `jsdom` ve `@testing-library/react`; bu dosyalar başına `// @vitest-environment jsdom` yazar)
- Grafikler: `recharts`. Kişisel Rapor `React.lazy` ile ayrı parçada yüklenir; sade ekran bu kodu indirmez.

### Ortam değişkenleri (asla koda veya git'e yazılmaz)
| Değişken | Nerede | Açıklama |
|---|---|---|
| `GEMINI_API_KEY` | Sunucu | Yapay zeka API anahtarı. Tanımlı: Vercel (Production, Secret) ve `.env.local` |
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
- **Onaylı eşleme (23.11.2026, Dilim 3):** `api/_lib/models.js` içinde. Hafif → en küçük "lite" model (düşünme `minimal`), Standart → orta "flash" model (düşünme `low`), Akıl Yürütme → en yeni nesil model (düşünme `high`). Üçü de ücretsiz katmanda ve kararlı sürümdedir. Model adları yalnızca o dosyadadır.
  - Ücretsiz katmanın dakika/gün kotaları herkese açık belgelerde yazmıyor; yalnızca sağlayıcının oturum açılmış kota sayfasında görünüyor. Kontrol sırasında ücretsiz katmanda geçici "yoğun talep" (503) yanıtları görüldü. Bu yüzden `api/_lib/ai.js` sınırlı yeniden deneme yapar ve canlı deneyden önce ücretli katmana geçmek zorunludur (Bölüm 13).
  - **23.11.2026'da ücretli katmana geçildi** (Bölüm 13). Aşağıdaki teşhis bulgusu ücretsiz katman dönemine aittir; Standart ve Akıl Yürütme sınıfları artık gerçek kapasiteyle test edilebilir.
- **Teşhis bulgusu (23.11.2026, `vercel dev` denemesi):** Sohbetin çalışmaması istek gövdesinden kaynaklanmıyordu: `thinkingConfig`, `systemInstruction` ve `temperature` ayrı ayrı çıkarıldığında sonuç değişmedi. Ücretsiz katmanda Standart sınıfın modeli **proje başına dakikada yalnızca 5 istek** kabul ediyor (429 gövdesindeki kota: `GenerateRequestsPerMinutePerProjectPerModel-FreeTier = 5`) ve sık sık 503 ("yoğun talep") veriyor. Akıl Yürütme sınıfının modeli de denemelerde sürekli 503 verdi. Hafif sınıf sorunsuz çalıştı (0,5–2 sn).
  - **Sonuç:** Standart ve Akıl Yürütme sınıfları ancak faturalandırma açıldıktan sonra (Bölüm 13) gerçek kapasiteyle test edilebilir. O zamana kadar geliştirme ve denemeler Hafif modelle sürer.
  - 503 gelince sessizce başka bir modele geçilmez: kayıtta yazan sınıf ile yanıtı üreten model farklı olur, bilimsel geçerlilik bozulur.
- **Süre sınırı:** Vercel Hobby planında (Fluid Compute açık, yeni projelerde varsayılan) bir fonksiyon en çok 300 sn çalışabilir; aşılırsa Vercel 504 `FUNCTION_INVOCATION_TIMEOUT` döner. `api/chat.js` `maxDuration: 60` kullanır. Yapay zekaya isteğin başından itibaren 50 sn bütçe ayrılır. Her denemenin bir üst süresi vardır (`ATTEMPT_TIMEOUT_MS`: Hafif ve Standart 20 sn, Akıl Yürütme 40 sn), böylece asılı kalan tek bir deneme bütün bütçeyi tüketmez. 429'da sağlayıcının önerdiği bekleme süresi (`RetryInfo.retryDelay`) kullanılır. Bekleme veya yeni deneme bütçeye sığmıyorsa yeniden deneme yapılmaz. Böylece Vercel fonksiyonu kesmeden önce Türkçe zaman aşımı hatası döner.

## 5. Bilimsel hesaplama motoru

Saf fonksiyonlar `src/lib/footprint.js` içinde. Her fonksiyonun birim testi olmalı.

- **Ağırlıklı token** = Girdi + 3 × Çıktı
- API yanıtında gerçek `usageMetadata` varsa o kullanılır. **Çıktı token = `candidatesTokenCount + thoughtsTokenCount`** (düşünme tokenları üretilmiş tokendır, enerji harcar).
- `usageMetadata` yoksa tahmin: ⌈karakter / 3,6⌉. Boş metin = 0. Gizli/sabit token eklenmez.
- Hangi yöntemle sayıldığı kayda yazılır: `tokenSource: 'gerçek' | 'tahmini'`.
- **Metodoloji notu (bilinçli tasarım kararı):** `inputTokens`, yeni istemin yanında sistem talimatını ve son 12 etkileşimin bağlamını da içerir (yapay zeka çok turlu sohbette bu metni her istekte yeniden okur; bu gerçek bir enerji harcamasıdır). Bu nedenle uzun sohbetlerde istem başına girdi token sayısı büyür. Bu durum araştırma raporunda açıklanacaktır.

| Sınıf | Enerji Min / Ort / Maks (Wh, 1000 ağırlıklı token başına) | Maliyet USD/1M (Girdi · Çıktı) |
|---|---|---|
| light | 0.12 / 0.18 / 0.25 | 0.10 · 0.40 |
| standard | 0.45 / 0.65 / 0.90 | 1.25 · 5.00 |
| reasoning | 1.40 / 2.10 / 3.00 | 3.00 · 15.00 |

- **`costUsd` gerçek fatura değildir.** Yukarıdaki tablodaki şartname referans fiyatlarıyla hesaplanan, sınıflar arası karşılaştırma amaçlı bir tahmindir. Gerçek harcama AI Studio'nun faturalandırma/kullanım sayfasından izlenir.
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

**Dilim 7 kararları (23.11.2026, uygulandı):**
- **Birincil ölçüt (ana hipotez): öğrenci başına toplam enerji (Wh).** İkincil (seçilebilir) ölçütler: istem sayısı, ağırlıklı token (toplam), istem başına ortalama enerji, su, CO₂, Hafif Model %. Su ve CO₂ enerjinin sabit katları olduğu için testleri enerjiyle birebir aynıdır; arayüz bunu not eder. Raporda birincil ölçüt dışındakiler ikincil bulgu olarak sunulur (çoklu karşılaştırma eleştirisine karşı).
- **p değerleri çift yönlüdür** (kartlarda "p (çift yönlü)"; Excel'de de yazılı). p tam 0,05 ise anlamlı sayılmaz (p < 0,05 kuralı).
- **Cohen's d (SPSS 27+ ile aynı):** bağımsız gruplarda havuzlanmış SS ile d = (x̄K − x̄D) / sp; eşleştirilmişte dz = farkların ortalaması / farkların SS'si (fark = Son − Ön). Etiketler: |d| < 0,2 ihmal edilebilir · 0,2–0,5 küçük · 0,5–0,8 orta · ≥ 0,8 büyük. Metinler tek yerde: `stats.js` → `COHENS_D_FORMULAS`. Test hesaplanamıyorsa d = null.
- Eşleştirilmiş testte n yalnızca iki aşamada da verisi olanlardır; kart "Ön Test'te x, Son Test'te y, eşleşen n kişi" gösterir.
- Hesaplar ve yorumlar `src/lib/statsReport.js`'tedir; sekme (`StatsTab.jsx`) ve Excel aynı fonksiyonları kullanır.
- **Çapraz kontrol:** `python dogrulama/tcheck.py <indirilen>.xlsx` SPSS_Veri_Seti'ni okuyup 7 ölçüt × 4 testi Simpson integraliyle yeniden hesaplar ve Grup_Karsilastirma'daki panel değerleriyle karşılaştırır (23.11.2026 denemesinde en büyük fark 6·10⁻¹⁴).

**Excel (Dilim 7):** `src/lib/excelExport.js` + sıfır bağımlılıklı yazıcı `src/lib/xlsxWriter.js` (yeni paket yok; npm'deki `xlsx` bilinen açıklar içeriyor, ExcelJS çok bağımlılıklı). Yalnızca "Excel İndir" tıklanınca `import()` ile yüklenir. 5 sayfa: `Tum_Kayitlar`, `Ogrenci_Ozetleri`, `Grup_Karsilastirma`, `SPSS_Veri_Seti`, `Degisken_Sozlugu` (veri sayfasına açıklama satırı SPSS aktarımını bozacağı için sözlük ayrı sayfadadır).
- SPSS_Veri_Seti: 60 satır, geniş format; `Grup_Kodu` 0 = Kontrol / 1 = Deney, `Statu_Kodu` 0 = Asıl / 1 = Yedek, `OnTest_Katilim`, `SonTest_Katilim` (0/1), `OnTest_*`, `SonTest_*`, `Fark_*`. **Eksik veri boş hücredir, 0 yazılmaz** (prototip 0 yazıp sahte düşüş üretiyordu); kural `ZERO_PROMPT_POLICY` ile panelle aynıdır.
- Ogrenci_Ozetleri aynı eksik veri kuralını izler: o aşamanın analizine girmeyen katılımcının ölçüt hücreleri boştur ("Giriş" sütunu Evet/Hayır kalır); Toplam sütunları yalnızca mevcut aşamaların toplamıdır, iki aşama da boşsa boş. Böylece Excel'de sütun ortalaması paneldeki hücre ortalamasıyla aynı çıkar.
- Tum_Kayitlar'daki tarih gerçek Excel tarih hücresidir: seri sayı, Türkiye saati (UTC+3, `xlsxWriter.js` → `excelSerialTR`, `dateCell`), `styles.xml`'de özel biçim 164 = `dd.mm.yyyy hh:mm:ss`.
- Sayılar yuvarlanmadan gerçek sayısal hücre; metinler `inlineStr` (formül çalışmaz); 32.767 karakteri aşan metin kırpılıp "…[kırpıldı]" eklenir; XML'de yasak kontrol karakterleri silinir.

## 7. Veri modeli (Firestore)

`interactions/{id}`:
```
code, group ('Kontrol'|'Deney'), phase ('pretest'|'posttest'), modelId,
prompt, response, inputTokens, outputTokens, weightedTokens, tokenSource,
energyMin/Avg/Max, waterMin/Avg/Max, co2Min/Avg/Max, costUsd, savingsPct,
isSample (boolean), engineVersion, configHash, createdAt (sunucu zamanı)
```
- **`configHash` (Dilim 8):** Ölçüm koşullarının 12 karakterlik özeti (Bölüm 2/6, dondurma kuralı). Yönetici listesine ve Excel'in `Tum_Kayitlar` sayfasına ("Yapılandırma Özeti") girer; öğrenciye giden mesajlarda yoktur. Dilim 8'den önceki kayıtlarda alan yoktur.
- **`engineVersion`:** Yapay zeka yanıtındaki gerçek model sürümü (`modelVersion`). Yanıtta yoksa `null` olur. Tekrarlanabilirlik için yalnızca veritabanında tutulur. Marka yasağı gereği bu alan **Excel'e, CSV'ye ve tarayıcıya giden yanıtlara ASLA girmez.** Tarayıcıya giden mesaj alanları `api/_lib/interactions.js` → `toClientMessage` ile sınırlıdır (`id, modelId, prompt, response, createdAt`). `tests/api-messages.test.js` ve `tests/api-chat.test.js` bunu denetler. Yönetici listesi/detayı (`api/_lib/admin.js`) ve CSV (`src/lib/csv.js`) bu alanı içermez (`tests/api-admin-data.test.js`, `tests/csv.test.js`). Excel de bu alanı içermez (`tests/excelExport.test.js` bütün dosya baytlarında `engineVersion`, model sürümü ve marka adı arar).
- **Öğrenciye giden çevresel alanlar (Dilim 5):** Uç noktalar mesajı `toStudentMessage(id, data, view)` ile döner; `view` sunucuda `getStudentView(grup, aşama)` ile hesaplanır. Yalnızca `'ekotoken'` (Deney + Son Test) görünümünde mesaja `eco` nesnesi eklenir (`toEcoClientMessage`); içeriği açık listedir (`ECO_CLIENT_FIELDS`: `inputTokens, outputTokens, tokenSource, energy*, water*, co2*, savingsPct`). **`costUsd`, `weightedTokens` ve `engineVersion` hiçbir görünümde tarayıcıya çıkmaz.** Kontrol grubunun ve Ön Test'teki Deney grubunun yanıtında `eco` yoktur; `tests/api-chat.test.js`, `tests/api-messages.test.js` ve `tests/chat-ekran.test.jsx` denetler.
- **Metodoloji penceresi** deney desenini (Kontrol grubunun ne gördüğünü) anlatmaz (kör deney; 23.11.2026 kararı). Sayılar `footprint.js` sabitlerinden üretilir, kaynakça `src/lib/methodology.js`'tedir.
`settings/experiment`: `{ activePhase: 'pretest' | 'posttest', updatedAt }` — yalnızca `/api/admin/phase` (POST, yönetici token'ı) yazar; `updatedAt` sunucu saatidir. Tarayıcı `src/lib/phaseListener.js` ile salt okunur dinler. Güvenlik kuralları repoda `firestore.rules` dosyasındadır ve Firebase konsolundan elle yayınlanır.
- **Aşama değişince öğrenci ekranı:** aşama adı (Ön Test / Son Test) öğrenci ekranında HİÇ yazmaz (kör deney). Ekran açıkken aşama değişirse eski mesajlar kalkar, yalnızca nötr bir not çıkar ("Yeni oturum başladı. Önceki mesajlar bu ekranda gösterilmiyor.") ve yeni aşamanın mesajları `/api/messages` ile yüklenir (bu çağrı `recordLogin` ile öğrenciyi yeni aşamada giriş yapmış sayar).
- **Okuma kotası ve bileşik indeks:** Modele giden bağlam (`getHistory`, her istemde) yalnızca son 12 gerçek kaydı okur: `code ==, phase ==, isSample == false, orderBy(createdAt desc), limit(12)`, sonra sıra ters çevrilir. Bu sorgu `interactions` için bileşik indeks ister: `code ↑, phase ↑, isSample ↑, createdAt ↓` (`firestore.indexes.json`). İndeks konsoldan elle oluşturulur (Firestore Database → Indexes → Composite → Create index); Firebase CLI kullanılmıyor, JSON dosyası yalnızca belge amaçlıdır. Ekrandaki geçmiş (`/api/messages` → `getOwnInteractions`) kısaltılmaz; sayfa yüklenince bir kez bütün kayıtları okur ve indeks gerektirmez.
`rateLimits/{code}`: `{ lastRequestAt }` (sunucu saati, milisaniye cinsinden sayı)
`logins/{code}_{phase}` (ör. `logins/K001_pretest`): `{ code, group, phase, firstLoginAt, lastLoginAt, loginCount, sessionCount }` — hangi kodun hangi aşamada giriş yaptığını tutar (Bölüm 12/1). Zamanlar sunucu saatidir. `/api/login` yazar (`api/_lib/logins.js` → `recordLogin`); `/api/chat` ve `/api/messages` de her istekte aynı yardımcıyla günceller. **`loginCount` = etkinlik sayısı** (giriş + mesaj geçmişi + her istem). **`sessionCount` = giriş sayısı**: yalnızca `/api/login` artırır (`isLogin: true`; Dilim 6, 23.11.2026). Sayfa yenileme de `/api/login` çağırdığı için giriş sayılır. Dilim 6'dan önceki belgelerde `sessionCount` yoktur (panelde "—"). Aşama `settings/experiment` yoksa `'pretest'` varsayılır.

- **Örnek veriler (`isSample: true`) istatistiklere, grafiklere ve Excel'e varsayılan olarak GİRMEZ.** Yönetici panelinde örnekler varken açık bir uyarı bandı gösterilir.
  - **Dilim 8a'dan beri örnek veri Firestore'a hiç yazılmaz.** Yönetici panelinde "Örnek Veriyle Önizle" ile tarayıcıda sabit tohumlu ve nötr (gruplar/aşamalar arasında tasarlanmış fark yok) olarak üretilir (`src/lib/sampleData.js`). Ayrı kodlar kullanılır: OK01–OK10, OD01–OD10. Önizlemede grafikler, istatistik ve kayıtlar yalnızca örnekten hesaplanır. Kartlarda "ÖRNEK VERİ" etiketi ve filigranı, panelin sabit başlık çubuğunda turuncu bant vardır. Excel, CSV ve Verileri Temizle pasiftir.
  - **Kod izin listesi:** `aggregateByParticipant`, `overviewStats`, Excel ve CSV yalnızca 60 katılımcı kodunu (`PARTICIPANT_CODE_GROUPS` / `ALL_CODES`, `src/lib/participants.js`) alır. Listede olmayan kod hiçbir hesaba girmez.
- Aşama değiştirilince eski veriler silinmez. Öğrenci ekranı yalnızca aktif aşamanın mesajlarını gösterir.
- **"Verileri Temizle" (yönetici paneli) `interactions` ile birlikte `logins` ve `rateLimits` koleksiyonlarını da temizler.** Yoksa UAT/test girişleri katılım verisi olarak kalır ve istatistiği bozar (ör. `'zero'` politikasında test girişi yapılmış bir kod 0 istemle analize girer). `settings/experiment` silinmez. **Uygulandı (Dilim 6):** `api/admin/clear.js`. İki kat güvence: (1) onay penceresi (`ClearDataModal.jsx`) silinecek sayıları gösterir (`GET`, Firestore `count()`), yedek uyarısı verir ve kutuya büyük harfle "SİL" yazılmadan buton pasiftir; (2) sunucu gövdede tam olarak `{ confirm: "SİL" }` yoksa 400 döner ve hiçbir şey silmez. İngilizce klavyede "İ" yazılamadığı için "SIL" de kabul edilir; küçük harf ("sil", "Sil") reddedilir. Kural tek yerdedir: `src/lib/clearConfirm.js` (tarayıcı ve sunucu ortak kullanır). Spark'ta günlük 20.000 silme sınırı vardır.

### Bilinen sınırlamalar
- **Katılımcı kodları tahmin edilebilir** (K001–K030, D001–D030 sıralı ve parolasız). Bir öğrenci başkasının kodunu yazarak giriş yapabilir. Önlem: deney oturumları öğretmen gözetiminde yapılır; yönetici Katılımcı Kodları sekmesinde `logins.sessionCount` (giriş sayısı) ve son etkinlik zamanı ile şüpheli çoklu girişleri kontrol eder. (`loginCount` her istemde arttığı için bu amaçla kullanılamaz.)
- **Yapay zeka sağlayıcısı riski:** Gemini API şartları (23 Mart 2026) 18 yaş altına yönelik uygulamalarda kullanımı yasaklıyor. Ayrıca ücretsiz katmanda gönderilen içerik ürün geliştirme için kullanılabiliyor ve insan değerlendiriciler tarafından okunabiliyor. Proje ekibi bu riski bilerek Gemini ile devam etme kararı aldı.
  - Önlem: Canlı deneyden önce faturalandırma hesabı bağlanarak ücretli katmana geçilecek; böylece veri kullanımı ve insan incelemesi kapanır (Bölüm 13). Bu önlem veri kullanımını kapsar; 18 yaş sınırını kaldırmaz.
  - Sağlayıcı değişirse yalnızca `api/_lib/models.js` ve `api/_lib/` içindeki ilgili yapay zeka istemci kodu değişmeli; uç noktalar ve arayüz etkilenmemeli.

## 8. Arayüz kuralları (önceki denemelerde yaşanmış hatalar)

- Ana görünümler: `fixed inset-0 w-full h-full flex flex-col overflow-hidden`. `body` kaydırması kapalı.
- Bütün ana görünümler (giriş, sohbet, yönetici paneli, yükleniyor) ve pencere kutuları `app-viewport` sınıfını taşır (Dilim 8d; mobil-duzeltmeler, 24.11.2026). Klavye KAPALIYKEN `.app-viewport` tarayıcının dinamik yüksekliğini (`100dvh`) izler; böylece kaydırırken adres çubuğu küçülünce düzen eski yükseklikte kilitli kalmaz. Klavye AÇIKKEN (yazı kutusu odakta ve görünen alan pencereden en az 120 px kısa) `src/lib/viewport.js` görünen alanı `--app-height` / `--app-top` değişkenlerine yazar ve `<html data-klavye="acik">` koyar. Dinlenen olaylar: visualViewport resize + scroll, window resize, orientationchange, focusin/focusout; güncelleme `requestAnimationFrame` ile yapılır. Android için `index.html` viewport etiketinde `interactive-widget=resizes-content` vardır. Yeni bir ana görünüm eklenirse o da `app-viewport` almalıdır. Pencereler yüksekliği `dvh` ile sınırlar (`max-h-[90dvh]`), `vh` kullanılmaz.
- **Pencereler ve sayfa zemini (mobil-klavye, 24.11.2026):** Bütün pencereler ortak kabuk `src/components/Overlay.jsx`'i kullanır (kendi karartmasını yazmaz; `tests/zemin-temasi.test.jsx` denetler). Kabuk pencereyi `app-viewport` ile görünen alana oturtur (`max-h-[min(90dvh,100%)]`), içerik `data-pencere-kaydirma` bölümünde kayar, eylem butonları sabit alt bölümdedir (`data-pencere-eylemler`); odaklanan kutu klavye açılınca da görünür tutulur (`keepFocusedVisible`, `scrollIntoView` yok). Karartma görünen alanın dışına taşar (`.overlay-scrim`). html/body zemini ve `theme-color` tek yerden `src/lib/screenTheme.js` ile yönetilir. Zemin: giriş = koyu (ink), sohbet/panel = açık (paper), pencere açıkken = karartma rengi (#828282). `theme-color` (Safari üst çubuğu) ekranın üst kenarındaki öğeyle eşleşir: giriş = ink, panel = ink (siyah başlık), sohbet = surface (beyaz), pencere açıkken = o rengin %50 ink karartma altındaki tonu (`scrimOver`). Yeni ana ekran `useScreenTheme('login' | 'admin' | 'chat')` çağırır; yeni bir ekran türü `SCREENS` tablosuna eklenir.
- `header` ve `footer` sabit (`shrink-0`). Yalnızca mesaj listesi (`main`) `flex-1 min-h-0 overflow-y-auto` ile kayar.
- **`scrollIntoView()` KULLANILMAZ.** Yalnızca `container.scrollTo({ top: container.scrollHeight })`.
- Model seçici mobilde `grid-cols-3`, sağdan taşmaz.
- Yapay zeka hatasında sahte/kalıp yanıt gösterilmez. Türkçe hata kartı + "Tekrar Dene" butonu.
- Para birimleri (`$0.15`, `$10`) formül sanılıp bozulmaz. Bunun için test yazılır.
- Her yanıtta "Kopyala" butonu. Başlıklar (6 seviye), tablolar, alıntılar, iç içe listeler, kod blokları desteklenir.
- Tarayıcı `alert/confirm` kullanılmaz. Onay için kendi modal bileşenimiz kullanılır.

### Tasarım dili (Yön 2b, `tasarim-yon2b` dalı, 24.11.2026)
Görsel referans: `reference/tasarim-yon2b/TASARIM.md` ve taslaklar. Yalnızca görünüm değişti; hesaplar, API, aşama mantığı ve configHash girdileri aynı kaldı (`32d5f9e088de`).
- **Belirteçler** `src/index.css` → `@theme` içinde: renkler (`ink`, `paper`, `surface`, `line`, `muted`, `text-2/3`, `accent`, `on-dark*`, `eco*`), yazı tipleri, kapsül gölgesi ve animasyonlar. Yeni ekranda sabit renk yerine bu sınıflar kullanılır (`bg-ink`, `text-text-3`, `font-mono`…).
- **Yazı tipleri npm paketlerinden** (`@fontsource/inter-tight` 400/500/600/700, `@fontsource/instrument-serif` 400 italik, `@fontsource/jetbrains-mono` 500); CDN yok. Yalnızca latin + latin-ext alt kümeleri `src/fonts.css`'te tanımlıdır (ğ Ğ ş Ş İ yalnızca latin-ext'te). `tests/tasarim-belirtecleri.test.js` denetler.
- **Hareketi azalt:** `prefers-reduced-motion: reduce` olan cihazlarda bütün CSS animasyon ve geçişleri kapanır (`index.css`); grafik kütüphanesinin JS animasyonları (`isAnimationActive`) ve sohbetin otomatik kaydırması da bu ayarı okur. Animasyonlar içeriği asla geciktirmez.
- **Hareket sistemi (animasyonlar dalı, 24.11.2026; yeni paket yok):** Süreler ve eğri tek yerde, `index.css` → `:root` (`--motion-fast` 150 ms, `--motion-normal` 220 ms, `--motion-slow` 350 ms, `--ease-motion`); Tailwind'in `transition-*` varsayılanları da bunlara bağlıdır. JS tarafı `src/lib/motion.js` (değerleri CSS'ten okur; `usePresence` pencerelerin kapanış animasyonu için). Yalnızca transform / scale / opacity canlandırılır (model seçici hapı da `transform` ile kayar). Butonlar basınca 0,97 küçülür (`index.css` → `button`). Pencereler `.motion-dialog` taşır (telefonda alttan yükselir, kapanırken `.overlay-closing`). Yönetici panelinde sekme değişince iç kaydırma kabı başa kayar ve h1 programla odak alır (`src/lib/tabScroll.js`). **Kör deney:** sade ve EkoToken sohbet ekranının ortak öğeleri aynı animasyon sınıflarını taşır; görünüme özel öğeler `data-gorunume-ozel` ile işaretlidir (`tests/animasyon.test.jsx` denetler).
- **Tek kaynak kuralları:**
  - `src/lib/modelColors.js`: model sınıfı → renk + biçim (Hafif dolu yeşil, Standart içi boş + çerçeve, Akıl Yürütme dolu siyah; koyu zeminde Akıl Yürütme açık ton). SVG grafiklerinde çerçeve kuralı da buradadır (`chartSliceStyle`, `insetSliceRect`: üç sınıfın dış ölçüleri aynı). Başka dosya kendi model paleti tanımlamaz (`tests/modelColors.test.js`).
- **Yeşil yalnızca Hafif Model / EkoToken içindir.** Sade ekranda, girişte ve yönetici panelinde yeşil kullanılmaz (panel mührünün "uyumlu" durumu nötr renktedir); `tests/chat-ekran.test.jsx` sade ekranın işaretlemesinde yeşil sınıf arar. Token, trend, grup ve aşama grafikleri model renkleriyle karışmayan tonlar kullanır.
- **Düzen:** Sohbet okuma sütunu 760 px (2xl'de 800 px); xl ve üstünde EkoToken oturum özeti sağdaki "birikim sütunu"dur ve sütunu itmez. Yönetici panelinde başlık ve içerik ortak 1440 px kapsayıcıdadır; telefonda sekmeler siyah şeritteki seçim kutusundan seçilir.

## 9. İnşa sırası (hepsi yapılacak)

| Dilim | İçerik |
|---|---|
| 0 | İskelet: Vite + React + Tailwind, Vitest, boş sayfa Vercel'de yayında |
| 1 | Hesaplama motoru + istatistik motoru (saf fonksiyonlar + testler) |
| 2 | Giriş ekranı + `/api/login` (kod doğrulama) + yönetici girişi |
| 3 | Sade sohbet ekranı + `/api/chat` (gerçek model eşlemesi, hız sınırı, kayıt) |
| 4 | Aktif aşama: `settings/experiment` + yönetici anahtarı + gerçek zamanlı dinleme |
| 5 | EkoToken arayüzü: rozetler, günlük karşılık, tasarruf ipucu, kişisel rapor, metodoloji ✅ (23.11.2026) |
| 6 | Yönetici paneli: genel bakış, kayıtlar (+CSV), katılımcı kodları ✅ (23.11.2026) |
| 7 | Mini SPSS sekmesi + 4 sayfalı Excel (+ değişken sözlüğü) ✅ (23.11.2026) |
| 8 | Örnek veri, Markdown/KaTeX cilası, mobil uyum, UAT hazırlığı ✅ (24.11.2026; deney günü listesi: `docs/deney-gunu-kontrol-listesi.md`) |

**Dilim 8 için görsel notlar (Dilim 3 `vercel dev` denemesinden, 23.11.2026; ikisi de Dilim 8b'de çözüldü: `remark-breaks` ve mhchem `\ce{}`):**
1. Alt alta yazılan denklemler tek satıra yapışıyor. Yanıttaki tek satır sonları korunmalı (Markdown'da tek satır sonu varsayılan olarak boşluğa dönüşüyor).
2. Kimyasal formüller (ör. H₂O, CO₂) italik görünüyor. Sistem talimatına kimyasal formüllerde `	ext{}` kullanımı eklenebilir.

## 10. Çalışma kuralları

- **Kullanıcıyla her zaman Türkçe konuş.** Açıklamalar, planlar, sorular ve özetler Türkçe olur (kod, komut ve dosya adları olduğu gibi kalır).
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
- Yayın: GitHub `main` dalına push → Vercel otomatik yayınlar (https://egitim-asistani-2204.vercel.app).
- **Dal önizlemeleri:** Başka bir dal GitHub'a gönderilirse Vercel o dal için ayrı bir önizleme adresi üretir. Bu adres aynı ortam değişkenlerini ve **aynı Firestore'u** kullanabilir. Önizleme adresinde **öğrenci koduyla giriş yapılmaz** (giriş ve istemler gerçek `logins`/`interactions` kaydı olarak yazılır ve istatistiğe karışır). Önizleme yalnızca görsel kontrol içindir; gerekirse yalnızca yönetici girişiyle ve Örnek Veri Önizlemesi ile bakılır. Dikkat: önizlemedeki yönetici paneli de gerçek veriye bağlıdır; aşama anahtarı, kayıt silme ve "Verileri Temizle" canlı deneyi etkiler, önizlemede bunlara dokunulmaz. Dal GitHub'a gönderilmeden önce kullanıcıya sorulur.
- `tests/marka-yasagi.test.js`: `src/`, `index.html`, `api/` içinde marka adı arar; `api/_lib/` hariçtir. Yasaklı ad listesi `tests/helpers/brand-patterns.js`'tedir (Excel testi de kullanır).
- `python dogrulama/tcheck.py` — sabit örneklerin bağımsız hesabı; `python dogrulama/tcheck.py <dosya>.xlsx` — indirilen Excel'in panel değerleriyle çapraz kontrolü (yalnızca Python standart kütüphanesi).
- Firestore kuralları: `firestore.rules` içeriği Firebase konsolu → Firestore Database → Rules sekmesine yapıştırılıp Publish edilir (Firebase CLI kullanılmıyor). Dosya değişirse konsol da güncellenir.
- Firestore indeksleri: `firestore.indexes.json` içindeki indeksler konsoldan (Firestore Database → Indexes → Composite) elle oluşturulur. Dosya değişirse konsol da güncellenir.

## 12. Açık kararlar (uygulamadan önce kullanıcıya sor)

1. **Hiç istem yazmayan katılımcılar:** O aşamada 0 istem yazan bir öğrenci analize 0 değeriyle mi girecek, dışarıda mı kalacak? Prototip dışarıda bırakıyordu; bu, istem sayısındaki düşüşü sistematik olarak gizleyebilir. Danışman öğretmenin kararı bekleniyor. Karar verilene kadar istatistik kodunda bu nokta tek bir yapılandırma değeri olarak tutulur.
   - **Uygulama (Dilim 1'de kararlaştırıldı):** `src/lib/stats.js` içinde `ZERO_PROMPT_POLICY = 'exclude' | 'zero'`. Varsayılan `'exclude'` (prototip davranışı).
   - `'zero'` politikası yalnızca **o aşamada giriş yapmış** katılımcıları 0 istemle dahil eder. "Herhangi bir aşamada kaydı olan" ölçütü KULLANILMAZ: Son Test'e hiç gelmeyen öğrenci 0 istem yazmış sayılır ve sahte bir düşüş görünür.
   - Bunun için toplama fonksiyonu her aşamada giriş yapmış kodların listesini parametre olarak alır (`{ pretest: [...], posttest: [...] }`).
   - **Dilim 2'de yapıldı:** Giriş kayıtları `logins/{code}_{phase}` koleksiyonunda tutuluyor (Bölüm 7).
   - Hafif model oranı 0 istemde tanımsızdır; bu metrikte 0 istemli katılımcı her iki politikada da dışarıda kalır.
2. **Model adları:** ✅ 23.11.2026'da onaylandı (Bölüm 4). Ücretsiz kota sayıları sağlayıcının kota sayfasından okunup buraya eklenecek.
3. **Etik/veli onayı:** Kod meselesi değil, ama UAT ve canlı deneyden önce tamamlanmış olmalı.
4. **Varsayılan seçili model:** Sohbet ekranı şu an "Standart Model" seçili açılıyor (prototiple aynı, `src/components/ChatScreen.jsx`). Varsayılan seçim, Hafif model tercih oranı metriğini etkileyebilir (öğrenciler çoğu zaman varsayılanı değiştirmez). Danışman öğretmenle karar verilecek: Standart, Hafif veya seçim yapılmadan gönderilemeyen (varsayılansız) seçici. Karar ne olursa olsun Ön Test ve Son Test'te ve iki grupta aynı kalmalı.
5. **Mobilde yazarken EkoToken özet şeridi gizleniyor (Dilim 8d, 24.11.2026):** Danışmana sorulacak, raporda belirtilmeli. Yazma alanı odaktayken (klavye açık) 640 px'ten dar ekranda Deney grubunun özet şeridi ve iki grupta da model açıklama satırı gizlenir; odak gidince 200 ms sonra geri gelir (`src/components/ChatScreen.jsx`). Sebep: klavye açıkken iki grubun mesaj alanı eşit kalsın. Rozetler, tasarruf ipucu, Kişisel Rapor ve Metodoloji etkilenmez. Proje ekibi kabul etti; danışman onayı bekleniyor.

## 13. Canlı deney öncesi kontrol listesi

60 öğrencilik canlı deney başlamadan önce hepsi tamamlanmış olmalı. Öğretmenin deney günü izleyeceği sade sürüm: `docs/deney-gunu-kontrol-listesi.md`. Oradaki maddeler buradakilerle aynı sıradadır ve **(B13-n)** etiketiyle eşlenir; bu listeye madde eklenir veya çıkarılırsa o belge de güncellenir.

- [ ] **`ADMIN_PASSCODE` değiştirildi.** Şu anki değer geçicidir. Vercel'de (Production) yeni, güçlü bir parola girilip yeniden yayın yapıldı.
- [x] **Firestore kuralları yayınlandı ve denendi:** Konsoldaki kurallar `firestore.rules` ile aynı; Rules Playground'da `settings/experiment` okuma izinli, yazma reddedildi; `interactions` okuma reddedildi.
  - ✅ 23.11.2026: Kurallar konsoldan yayınlandı, Playground'da üç senaryo da beklendiği gibi sonuçlandı. `vercel dev` ile iki pencerede aşama geçişi doğrulandı (nötr not göründü, aşama adı görünmedi, Ön Test'e dönünce eski mesajlar geri geldi).
- [ ] **`VITE_FIREBASE_*` Vercel'de tanımlı ve canlı dinleyici çalışıyor:** Yönetici aşamayı değiştirince açık öğrenci ekranı birkaç saniyede yeni aşamaya geçiyor (okul ağında da denendi).
- [x] **Öğrenci tarafı okuma kotası düzeltildi:** `getHistory` her istemde öğrencinin o aşamadaki *bütün* kayıtlarını okuyordu. Düzeltme: yalnızca son 12 kaydı okumak (`orderBy` + `limit`).
  - ✅ 23.11.2026: `api/_lib/interactions.js` → `getHistory` (30 istemde geçmiş okuması 435 → 282, büyüme ikinci dereceden doğrusala indi). Bileşik indeks (`code ↑, phase ↑, isSample ↑, createdAt ↓`, Bölüm 7, `firestore.indexes.json`) Firebase konsolunda oluşturuldu ve Enabled durumunda. `vercel dev` ile doğrulandı: sohbet hatasız, bağlam sırası doğru, sayfa yenilenince geçmiş tam geliyor, `FAILED_PRECONDITION` yok.
  - Firestore projesi değişirse veya yeniden kurulursa indeks konsoldan yeniden oluşturulmalı; yoksa her sohbet isteği 500 döner.
- [ ] **Tüm test verileri temizlendi:** `interactions`, `logins`, `rateLimits` (yönetici panelindeki "Verileri Temizle" ile; Bölüm 7). Temizlik sonrası panelde 0 kayıt görüldü.
- [ ] **Etik kurul ve veli onayı tamamlandı** (Bölüm 12/3).
- [ ] **Gerçek model eşlemesi ve ücretsiz kota doğrulandı:** Üç ölçek sınıfının gerçekten farklı modellere gittiği kontrol edildi; 60 öğrencinin aynı anda kullanımına benzer bir yük testiyle kota sınırına takılmadığı görüldü.
- [x] **Excel dışa aktarma bir kez denendi:** 5 sayfa da gerçek Excel'de açılıyor (onarım uyarısı yok), başlıklar ve Türkçe karakterler doğru, SPSS_Veri_Seti SPSS'e (veya JASP'a) aktarılıyor, `python dogrulama/tcheck.py <dosya>.xlsx` "UYUMLU" diyor.
  - ✅ 24.11.2026: Excel Online'da onarım uyarısı olmadan 5 sayfa olarak açıldı. Dosya bağımsız olarak incelendi: ZIP yapısı, sayısal hücreler, boş eksik veri, SPSS değişken adları, tarih biçimi (numFmt 164, Türkiye saati) ve marka taraması doğru. `tcheck.py` çapraz kontrolünde 28 testin hepsi uyumlu çıktı.
  - Gerçek SPSS'e (veya JASP'a) aktarma henüz denenmedi; canlı veriyle ilk analizde yapılacak.
- [x] **Gemini API anahtarının bağlı olduğu `egitim-asistani-2204` projesine faturalandırma hesabı bağlandı (ücretli katman).** Bkz. Bölüm 7 → Bilinen sınırlamalar.
  - ✅ 23.11.2026: Proje Cloud Prepay hesabına bağlandı (250 TL ön ödeme, otomatik yükleme KAPALI; aylık 10 $ Google Developer Program kredisi otomatik uygulanıyor). Ücretli katmanda Standart sınıfın modeliyle yapılan test isteği 200 döndü.
  - Otomatik yükleme kapalı olduğu için bakiye biterse istekler başarısız olur. Canlı deneyden önce AI Studio'dan bakiye kontrol edilmeli.
- [ ] **AI Studio bakiyesi yeterli:** Ön Test ve Son Test günlerinin her birinden önce kalan bakiye AI Studio faturalandırma sayfasından kontrol edildi (otomatik yükleme kapalı).
- [ ] **Örnek veri önizlemesi kapalı:** Deney sırasında ve veri dışa aktarılırken yönetici panelinde turuncu "ÖRNEK VERİ ÖNİZLEMESİ" bandı yok. Önizleme ekran görüntüleri asla sonuç olarak kullanılmaz.
- [ ] **Her oturumdan sonra Çıkış (asıl önlem) + bütün tarayıcılar kapatıldı (ek önlem):** Kod `localStorage`'da tutulur (`src/lib/session.js`); tarayıcıyı kapatmak onu silmez, yalnızca Çıkış (`clearSession`) siler. Çıkış yapılmamış bir bilgisayarda site açıldığı anda `App.jsx` kayıtlı kodla `/api/login` çağırır ve o kod için **aktif aşamada** giriş kaydedilir (`recordLogin`, Bölüm 7). Açık kalan sekme de aşama değişince `/api/messages` ile aynı kaydı oluşturur. Sonuç: öğrenci Son Test'e gelmediği halde katılmış görünür. Tarayıcıyı kapatmak yalnızca ikinci durumu önler.
  - **Son Test sırası:** Aşama Son Test'e alınmadan ÖNCE (hâlâ Ön Test'teyken) her öğrenci bilgisayarında site açılır ve giriş ekranının geldiği doğrulanır; sohbet ekranı gelirse Çıkış'a basılır (en kötü ihtimalle fazladan bir Ön Test girişi oluşur). Aşama ancak bundan sonra değiştirilir.
- [ ] **Dondurma kuralı izlendi (Bölüm 2/6):** Ön Test'ten önce İstatistik sekmesindeki "Sunucunun şu anki yapılandırma özeti" not edildi (`/api/admin/data` → `currentConfigHash`, kayıt olmasa da görünür). Son Test'e geçmeden önce (aşama hâlâ Ön Test'teyken) aynı olduğu doğrulandı; farklıysa aşama değiştirilmez, ekip ve danışman haberdar edilir. Son Test sonunda İstatistik sekmesindeki Yapılandırma Mührü kartında onay işareti (✓) var ve "Kayıtlardaki yapılandırma özeti" aynı değer.