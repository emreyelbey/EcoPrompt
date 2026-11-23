# EKOTOKEN — TÜBİTAK 2204-A PROJESİ MASTER PROMPT (YEDEK & YENİDEN ÜRETİM ŞARTNAMESİ)

> **Kullanım:** Bu metnin tamamını yeni bir yapay zeka sohbetine (Gemini, Cursor, v0, Bolt, Lovable vb.) yapıştırarak projeyi sıfırdan birebir aynı mimari, bilimsel katsayılar ve UX kurallarıyla yeniden üretebilir veya canlıya alma (Vercel + Firebase) aşamasından doğrudan devam edebilirsin.

---

## 1. PROJE KİMLİĞİ VE KAPSAM

**EkoToken**, TÜBİTAK 2204-A Lise Öğrencileri Araştırma Projeleri Yarışması için geliştirilen, **Ön Test – Son Test Kontrol Gruplu Kör Deney** desenine sahip bir **Yapay Zeka Çevresel Ayak İzi (Su, Enerji, $\text{CO}_2$) İzleme ve Farkındalık Web Uygulamasıdır**.

### Zorunlu TÜBİTAK Kuralları
- **Marka ve Reklam Yasağı:** Görünür kullanıcı arayüzünün hiçbir yerinde ticari yapay zeka marka/ürün adları veya logoları (OpenAI, ChatGPT, Claude, Anthropic, Gemini, Google vb.) yer almamalıdır.
- **Bilimsel Ölçek Sınıflandırması:** Yalnızca 3 ölçek sınıfı kullanılır: **Hafif Model**, **Standart Model** ve **Akıl Yürütme Modeli**.
- **Dil:** Uygulamanın tüm arayüzü, hata mesajları, grafikler, istatistik yorumları ve Excel başlıkları tamamen **Türkçe** olmalıdır.

---

## 2. KULLANICI ROLLERİ, KİMLİK DOĞRULAMA VE KÖR DENEY AKIŞI

### 2.1. Katılımcı Kodları (Toplam 60 Kod)
- **Kontrol Grubu (30 kod):** `K001` – `K030` (`K001–K020` Asıl, `K021–K030` Yedek).
- **Deney Grubu (30 kod):** `D001` – `D030` (`D001–D020` Asıl, `D021–D030` Yedek).
- Öğrenciler yalnızca kendilerine verilen geçerli 60 koddan biriyle giriş yapabilir; rastgele isim veya geçersiz kod reddedilir.
- **Sıkı Erişim Kuralı:** Giriş ekranında tek tıkla demo/önizleme giriş butonları **kesinlikle bulunmamalıdır**.
- **Yönetici Girişi:** Giriş kartının en altında sade bir "Yönetici Girişi" bağlantısı bulunur; tıklandığında parola ekranı açılır (ör. `TUBITAK2026`, parola arayüzde hiçbir yerde yazmaz; canlı sürümde ortam değişkeni / sunucu tarafında doğrulanır).
- **Oturum Koruma:** Sayfa yenilendiğinde öğrencinin aktif kodu kaybolmamalıdır (`localStorage` ile oturum saklanır).

### 2.2. Ön Test – Son Test Kontrol Gruplu Kör Deney Mekanizması
Yönetici panelinde üst çubukta tek tıkla değiştirilebilen ve veritabanında merkezi olarak tutulan bir **Aktif Test Aşaması** anahtarı bulunur: **`Ön Test`** (`pretest`) / **`Son Test`** (`posttest`).

1. **Aktif Aşama = `Ön Test` (Kör Başlangıç Ölçümü):**
   - Hem **Kontrol Grubu (`K001–K030`)** hem de **Deney Grubu (`D001–D030`)** tamamen aynı, sade, nötr **"Eğitim Asistanı"** sohbet ekranını görür. Hiçbir su, enerji, $\text{CO}_2$, maliyet veya tasarruf uyarısı gösterilmez (başlangıç denkliğinin bozulmaması için).
   - Gelen her etkileşim arkada öğrencinin gerçek grubu (`Kontrol` / `Deney`) ve `phase: "pretest"` etiketiyle kaydedilir.
2. **Ara Dönem (Sınıf İçi Müdahale):**
   - Araştırmacı, yalnızca Deney grubuna "etkili istem (prompt) yazma ve yapay zekanın çevresel etkisi" eğitimi verir.
3. **Aktif Aşama = `Son Test` (Eğitim Sonrası Ölçüm):**
   - Yönetici panelden aşamayı **`Son Test`** yaptığında eski Ön Test verileri silinmez; ancak öğrenci ekranları yalnızca aktif aşamaya ait mesajları gösterir (öğrenciler temiz bir Son Test sohbetiyle başlar).
   - **Kontrol Grubu (`K001–K030`)** yine sade **"Eğitim Asistanı"** arayüzünü görmeye devam eder.
   - **Deney Grubu (`D001–D030`)** için otomatik olarak **"EkoToken" Eko-Farkındalık Arayüzü** açılır:
     - Üstte kompakt canlı çevresel etki özet şeridi (İstem/Token, Enerji, Su, $\text{CO}_2$ + günlük karşılık).
     - Her yapay zeka yanıtının altında girdi/çıktı token sayısı, Enerji (min–maks Wh), Su (min–maks mL), $\text{CO}_2$ (min–maks g) rozetleri ve açılıp kapanabilen **"Günlük Karşılık"** detay kartı.
     - Standart veya Akıl Yürütme modeli seçildiyse **Tasarruf İpucu**: *"Bu soruyu Hafif Model ile sorsaydın %X daha az su ve enerji harcardın."*
     - Üst çubuktan açılan **"Kişisel Rapor"** penceresi (günlük hayat karşılıkları, etkileşim bazlı girdi/çıktı token grafiği, birikimli Su/Enerji/$\text{CO}_2$ trend grafiği, model dağılımı pasta grafiği) ve **"Metodoloji"** bilgi penceresi.

---

## 3. BİLİMSEL HESAPLAMA MOTORU VE KAYNAKÇA

### 3.1. Ağırlıklı Token Formülü
Çıktı üretimi (otoregresif decode), girdi işlemekten (prefill) belirgin ölçüde daha fazla bellek bant genişliği ve GPU enerjisi tükettiği için çıktı tokenları 3 kat ağırlıklandırılır:

$$\text{Ağırlıklı Token} = \text{Girdi Token} + 3 \times \text{Çıktı Token}$$

- API yanıtında gerçek `usageMetadata` (input/output token) varsa doğrudan o kullanılır; yoksa Türkçe metin tahmini olarak $\lceil \text{karakter sayısı} / 3.6 \rceil$ formülü kullanılır.
- Boş metin her zaman `0` token sayılır; gizli veya sabit tahmini çıkış tokenı (ör. sabit 500 token) kesinlikle eklenmez.

### 3.2. Model Ölçek Sınıfları ve Katsayılar (1.000 Ağırlıklı Token Başına)
| Model Sınıfı (`id`) | Enerji Min / Ort / Maks (Wh) | Referans Maliyet (USD / 1M Token) |
| :--- | :--- | :--- |
| **Hafif Model** (`light`) | $0.12$ / $0.18$ / $0.25$ Wh | Girdi $\$0.10$ · Çıktı $\$0.40$ |
| **Standart Model** (`standard`) | $0.45$ / $0.65$ / $0.90$ Wh | Girdi $\$1.25$ · Çıktı $\$5.00$ |
| **Akıl Yürütme Modeli** (`reasoning`) | $1.40$ / $2.10$ / $3.00$ Wh | Girdi $\$3.00$ · Çıktı $\$15.00$ |

### 3.3. Su, Karbon ve Tasarruf Katsayıları
- **Su Ayak İzi (WUE):** Min $0.2$, Ort $1.0$, Maks $1.8\ \text{mL/Wh}$ ($\text{L/kWh}$).
- **Karbon Emisyonu (Şebeke Yoğunluğu):** Min $0.30$, Ort $0.43$, Maks $0.55\ \text{g }\text{CO}_2\text{/Wh}$ ($300$ – $550\ \text{g }\text{CO}_2\text{/kWh}$).
- **Tasarruf Oranı:** Seçilen modelin ortalama enerjisi ile Hafif Modelin ortalama enerjisi arasındaki yüzdesel fark.

### 3.4. Günlük Hayat Karşılıkları (Somutlaştırma)
- **Su:** Damla ($\approx 0.05\ \text{mL}$), tatlı kaşığı ($5\ \text{mL}$), su bardağı ($200\ \text{mL}$), yarım litrelik şişe ($500\ \text{mL}$).
- **Enerji:** $10\ \text{W}$ LED ampul yanma süresi ($1\ \text{Wh} = 360\ \text{saniye}$) ve ortalama akıllı telefon bataryası ($15\ \text{Wh}$) şarj yüzdesi.
- **Karbon ($\text{CO}_2$):** Ortalama binek araç sürüş mesafesi ($120\ \text{g/km} = 0.12\ \text{g/m}$) ve olgun bir ağacın günlük $\text{CO}_2$ emilimi ($\approx 60\ \text{g/gün}$).

### 3.5. Metodoloji Sekmesinde Yer Alacak Akademik Referanslar
1. Li, P., Yang, J., Islam, M. A., & Ren, S. (UC Riverside, 2023–2025) — *"Making AI Less Thirsty"*
2. Luccioni, A. S., Jernite, Y., & Strubell, E. (2024) — *"Power Hungry Processing"*
3. EcoLogits (GenAI Impact, 2024–2025) — Çıkarım (inference) enerji ve PUE metodolojisi
4. International Energy Agency (IEA, 2024–2025) — Elektrik şebekesi karbon yoğunluğu verileri

---

## 4. YAPAY ZEKA SOHBET DAVRANIŞI, MARKDOWN/FORMÜL ÇİZİMİ VE UX KURALLARI

### 4.1. Doğal ve Bağlama Duyarlı Sistem Yönergesi
- Yapay zeka önceki konuşma geçmişini (çok turlu bağlam) koruyarak doğal, akıcı ve doyurucu Türkçe yanıtlar verir.
- **Önemli Davranış Kuralı:** Yanıt biçimi sorunun türüne göre uyarlanır. Kullanıcı hikâye, şiir veya serbest sohbet istediğinde yapay olarak fizik/matematik formülü veya sosyoloji tablosu **uydurulmaz**. Yalnızca ders, bilim, problem çözme veya rehber istendiğinde başlıklar, numaralı adımlar, tablolar ve gerçekten gerekli olduğunda LaTeX formülleri kullanılır.
- **Hata Yönetimi:** Ağ veya API hatasında sessizce sahte/kalıp yanıt **döndürülmez**; kullanıcıya anlaşılır Türkçe bir hata kartı ve **"Tekrar Dene"** butonu gösterilir.

### 4.2. Zengin Mesaj Göstericisi (`RichMessage`)
- **Matematik Formülleri:** KaTeX ile `$...$`, `$$...$$`, `\(...\)` ve `\[...\]` blokları temiz tipografiyle çizilir; CDN erişilemezse yerleşik çevrimdışı HTML/CSS yedek ayrıştırıcı kesir, üs, alt indis, karekök ve Yunan harflerini ham `$` veya `\` bırakmadan çizer.
- **Para Birimi Koruması:** `$0.15`, `$10` gibi para birimleri formül sanılıp bozulmaz.
- **Tam Markdown Desteği:** `#` – `######` (6 başlık seviyesi dâhil `####`), `---` yatay ayırıcılar, `>` alıntılar, Markdown tabloları, iç içe girintili madde/numara listeleri, kod blokları ve her yanıt için **Kopyala** butonu.

### 4.3. Ekran Yerleşimi ve Mobil Uyum (Kritik Hata Önlemleri)
- **Tam Ekran Kilitli Yerleşim:** Tüm ana görünümler `fixed inset-0 w-full h-full flex flex-col overflow-hidden` yapısında olmalıdır; dış `body` kaydırması kapatılır. Üst çubuk (`header`) ve mesaj yazma alanı (`footer`) her zaman sabit (`shrink-0`), yalnızca ortadaki mesaj listesi (`main`) `flex-1 min-h-0 overflow-y-auto` ile kaydırılır.
- **İç Kaydırma Kuralı:** `scrollIntoView()` kesinlikle kullanılmaz (alt çubuğu yukarı itip altta büyük beyaz boşluk bırakma hatasını önlemek için); yalnızca mesaj konteynerinde `container.scrollTo({ top: container.scrollHeight })` kullanılır.
- **Mobil Üst Çubuk:** Model seçici mobilde tam oturan 3 eşit sütunlu (`grid-cols-3`) yapıda olur, sağdan taşmaz.

---

## 5. YÖNETİCİ / ARAŞTIRMACI PANELİ (5 SEKME + MİNİ SPSS + 4 SAYFALI EXCEL)

Yönetici paneli şu 5 sekmeden oluşur:

1. **Genel Bakış & Grafikler:**
   - Aşama filtresi (`Tümü / Ön Test / Son Test`), **Örnek Veri Yükle (Ön+Son)** (5 Kontrol + 5 Deney öğrencisinin başlangıçta denk Ön Test ve eğitim sonrası anlamlı düşüş gösteren Son Test verisi), **Örnekleri Kaldır** ve onay pencereli **Verileri Temizle** butonları.
   - 5 KPI kartı (Aktif Katılımcılar, Toplam İstem, Toplam Enerji, Toplam Su, Toplam $\text{CO}_2$).
   - **Ana Karşılaştırma Grafiği:** Kontrol vs. Deney Grubu **Toplam İstem Sayısı** ve **Öğrenci Başına Ortalama İstem Sayısı** (sütun üstü sayısal etiketli).
   - İstem Başına Ortalama Çevresel Etki (Enerji, Su, $\text{CO}_2$) ve Model Ölçeği Tercih Dağılımı (%) grafikleri.

2. **Ön Test – Son Test & İstatistik (Mini SPSS):**
   - 4 Net Değişim kartı (İstem, Su, Enerji, $\text{CO}_2$ için Kontrol ve Deney gruplarının Ön Test $\to$ Son Test yüzdesel değişimi).
   - Ön Test vs. Son Test yan yana gruplandırılmış sütun grafikleri (İstem Sayısı + seçilebilir Su / Enerji / $\text{CO}_2$ / Hafif Model %).
   - **Saf Matematiksel İstatistik Motoru ($\alpha = 0.05$):**
     - 4 hücre (`Kontrol Ön`, `Kontrol Son`, `Deney Ön`, `Deney Son`) için Betimsel İstatistikler ($n$, $\bar{x}$, $SS$).
     - Eksik beta fonksiyonu ile çift yönlü kesin $p$ değeri hesaplayan 4 kanonik hipotez testi:
       1. *Başlangıç Denkliği:* Ön Test Kontrol vs. Deney (Bağımsız Örneklem Welch $t$-testi — beklenen $p > 0.05$).
       2. *Kontrol Grubu Değişimi:* Kontrol Ön vs. Son (Bağımlı Örneklem $t$-testi).
       3. *Deney Grubu Değişimi:* Deney Ön vs. Son (Bağımlı Örneklem $t$-testi — beklenen $p < 0.05$).
       4. *Son Test Grup Farkı:* Son Test Kontrol vs. Deney (Bağımsız Örneklem Welch $t$-testi — beklenen $p < 0.05$).
     - Her test için $t$, $sd$ ($df$), $p$ değeri ve otomatik Türkçe bilimsel yorum; grupta 2'den az katılımcı varsa hata vermeden bilgilendirme gösterir.

3. **Öğrenci Kayıtları:**
   - Kod/soru arama, Grup (`Tümü / Kontrol / Deney`), Aşama (`Tümü / Ön Test / Son Test`) ve Model Ölçeği filtreleri, filtrelenmiş `.CSV` indirme, satıra tıklandığında tam soru + `RichMessage` ile biçimlendirilmiş yanıt önizlemesi ve tekil kayıt silme.

4. **Katılımcı Kodları (60):**
   - Tüm 60 kodun statüsü (`Asıl / Yedek`), kullanım durumu, toplam istem sayısı, panoya kopyalama ve `.CSV` indirme.

5. **Metodoloji & Kaynakça:**
   - Bilimsel hesaplama modeli, katsayı tablosu, kör deney tasarımı özeti ve akademik referanslar.

### 4 Sayfalı Gerçek Excel (`.xlsx`) Dışa Aktarma
Tek tıkla indirilen `.xlsx` çalışma kitabı şu 4 sayfayı içerir:
1. `Tum_Kayitlar` (Tarih, Aşama, Kod, Grup, Model, Tokenlar, Enerji/Su/$\text{CO}_2$ aralıkları, Maliyet, İstem)
2. `Ogrenci_Ozetleri` (60 kodun tamamı; Ön Test / Son Test / Toplam istem ve tüketimleri)
3. `Grup_Karsilastirma` (4 hücreli Kontrol/Deney $\times$ Ön/Son Test özet tablosu)
4. `SPSS_Veri_Seti` (Geniş format: her öğrenci 1 satır, sayısal `Grup_Kodu` `0=Kontrol` / `1=Deney`, `OnTest_*`, `SonTest_*` ve `Fark_*` sütunları — doğrudan IBM SPSS'e aktarım için).

---

## 6. CANLIYA ALMA (PRODUCTION) MİMARİSİ — 0 TL MALİYETLİ KURULUM HEDEFİ

Bağımsız alan adında (sıfır dış platform logosu, 60 cihazdan merkezi kayıt ve güvenli API anahtarı) yayınlamak için hedef teknik yığın:

- **Frontend:** Vite + React + Tailwind CSS + `lucide-react` + `recharts` + `firebase` + KaTeX.
- **Backend Proxy (Vercel Serverless — `/api/chat.js`):**
  - Ücretsiz **Google AI Studio (Gemini API)** anahtarı yalnızca Vercel Environment Variables (`GEMINI_API_KEY`) içinde tutulur; istemci kodunda asla yer almaz.
  - 3 model sınıfının gerçek motor eşleşmesi:
    - `light` $\to$ `gemini-2.5-flash-lite`
    - `standard` $\to$ `gemini-2.5-flash`
    - `reasoning` $\to$ `gemini-2.5-flash` (yüksek `thinkingBudget` açık) veya `gemini-2.5-pro`
  - API yanıtındaki gerçek `usageMetadata` (`promptTokenCount`, `candidatesTokenCount`, `thoughtsTokenCount`) frontende döndürülür.
  - Öğrenci spam koruması: kod başına $3\text{–}4$ saniyelik hız sınırı (rate limit) ve makul istem uzunluğu sınırı.
  - Yönetici parola doğrulaması da sunucu tarafında (`ADMIN_PASSCODE` ortam değişkeni) yapılabilir.
- **Merkezi Veritabanı (Firebase Firestore — Ücretsiz Spark Plan):**
  - `interactions` koleksiyonu: Tüm öğrenci sohbet kayıtları (öğrenci yalnızca kendi `code` ve aktif `phase` kayıtlarını okur; yönetici tüm kayıtları okur).
  - `settings/experiment` dokümanı: Aktif test aşamasını (`activePhase: "pretest" | "posttest"`) tutar; yönetici değiştirdiği an 60 öğrenci cihazında gerçek zamanlı güncellenir.
- **UAT $\to$ Canlı Geçişi:** Aynı Vercel linki önce danışman öğretmen ve öğrenci ile UAT testi için kullanılır; onay alındığında yönetici panelinden **"Verileri Temizle"** butonuna basılarak birebir aynı sistem 60 öğrencilik canlı deneye açılır.