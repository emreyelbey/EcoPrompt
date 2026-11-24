# Arayüz Tasarımı — Yön 2b ("Modern ve elit, derinleşmiş")

Bu klasör, uygulamanın yeni görünümü için onaylanmış tasarım referansıdır.
`.dc.html` dosyaları bir tasarım aracında çizilmiş **görsel taslaklardır**: tarayıcıda çalışan
uygulama kodu değildir (`support.js`, `<x-dc>`, `<sc-for>`, `{{...}}` o aracın söz dizimidir).
Bunları **işaretleme ve stil referansı** olarak oku; React + Tailwind bileşenlerine uyarla.

| Dosya | Ekran |
|---|---|
| `Yon2-Giris.dc.html` | Giriş ekranı (koyu) |
| `Yon2b-Sohbet.dc.html` | Sohbet — sade ekran (Ön Test'te iki grup, Son Test'te Kontrol) |
| `Yon2b-EkoToken.dc.html` | Sohbet — EkoToken ekranı (yalnızca Son Test'te Deney) |
| `Yon2b-Panel.dc.html` | Yönetici paneli (İstatistik sekmesi örneği; diğer sekmeler aynı dille) |

Taslaklardaki **sayılar örnektir** (sohbet metinleri, ayak izi değerleri, test sonuçları).
Uygulamada her sayı mevcut hesaplardan gelir; hiçbir sabit sayı koda girmez.

---

## 1. Değişmeyecek olanlar (pazarlıksız)

- **Yalnızca görünüm değişir.** API'ler, veri akışı, hesaplar (`footprint.js`, `stats.js`),
  aşama dinleyicisi, oturum, sistem talimatı (`api/_lib/prompt.js`), model eşlemesi
  (`api/_lib/models.js`) ve yapılandırma özeti (configHash) **değişmez**. configHash değeri
  bu iş boyunca aynı kalmalı; değişirse bir şey yanlış dosyaya dokunmuş demektir.
- **Kör deney:**
  - Ön Test ekranı nötrdür: yeşil, yaprak, doğa, "eko" çağrışımı yok. Ön Test'te K ve D
    birebir aynı ekranı görür.
  - Son Test'te Kontrol grubu sade ekranı görür; tek fark Deney grubundaki EkoToken öğeleridir.
  - Yeşil (`--eco`) yalnızca EkoToken ekranında kullanılır.
  - Öğrenci ekranında aşama adı yazmaz; marka/model adı (sağlayıcı adları) yazmaz.
- **Dilim 8d mobil kuralları korunur:** dokunma hedefleri en az 40–44 px, yazma kutusu
  mobilde 16 px, `app-viewport` / `dvh` düzeni, klavye açıkken iki grubun mesaj alanı eşit,
  odakta özet şeridinin gizlenmesi, 360 px'te taşma yok.
- Türkçe metinler, erişilebilirlik (`aria-label`'lar, gerçek `<button>`/`<label>`) korunur.
- Örnek veri önizlemesi (turuncu bant, "ÖRNEK VERİ" etiketi, filigran) aynen çalışır.

## 2. Tasarım belirteçleri (tokens)

**Renkler**
| Ad | Değer | Kullanım |
|---|---|---|
| ink | `#0A0A0B` | ana metin, birincil butonlar, seçili model, kullanıcı balonu, yönetici kenar menüsü |
| paper | `#FAFAF9` | sayfa zemini |
| surface | `#FFFFFF` | kartlar, üst çubuk, yazma kapsülü |
| line | `#ECECEA` / `#E4E4E7` | ince çizgiler, kenarlıklar |
| muted | `#F4F4F5` | segment zemini, ikon buton zemini |
| text-2 | `#52525B` / `#3F3F46` | ikincil metin |
| text-3 | `#71717A` | etiketler (beyaz zeminde 4.5:1 sağlar) |
| accent (nötr) | `#A5B4FC` (koyu zeminde), `#4F46E5` (açık zeminde) | logo yörünge noktası, "oturum açık" nabzı |
| eco | `#34D399` (koyu zeminde), `#10B981` / `#047857` (açık zeminde) | **yalnızca EkoToken** |
| uyarı | `#FEF3C7` zemin, `#78350F` metin | önizleme bandı |

**Yazı tipleri**
- `Inter Tight` 400/500/600/700: arayüzün tamamı.
- `Instrument Serif` italik: yalnızca vurgu kelimeleri ("Eğitim *Asistanı*", "Eko*Token*",
  girişteki "*Derinleş.*", panel başlıklarındaki ikinci kelime).
- `JetBrains Mono` 500: katılımcı kodları, sayılar, ölçüm değerleri, küçük büyük-harf etiketler.
- **CDN kullanma.** Fontları npm üzerinden kendi paketimizle sun (ör. `@fontsource/inter-tight`,
  `@fontsource/instrument-serif`, `@fontsource/jetbrains-mono`; Türkçe için latin-ext alt kümesi).
  Gerekmeyen ağırlıkları ekleme; paket boyutu 8c'deki hedefin üstüne çıkmasın, ölç ve raporla.

**Biçim**
- Köşe: kartlar 16–20 px, butonlar ve seçiciler tam yuvarlak (999 px), logo karesi 12–13 px.
- Gölge yok denecek kadar az: yalnızca yazma kapsülünde `0 6px 24px rgba(10,10,11,.06)`.
- Gradyan, sol kenar çizgili kart, emoji yok.

## 3. Bileşenler

1. **Logo işareti**
   - Sade ekran / giriş / panel: siyah yuvarlak kare; içinde ince çember, çember üzerinde
     **dönen** küçük nokta (accent), ortada beyaz nokta.
   - EkoToken: aynı kare; içinde **dolan halka** (eco), ortada beyaz nokta. Yaprak ikonu kullanılmaz.
2. **Kelime işareti:** "Eğitim *Asistanı*" / "Eko*Token*"; altında mono küçük satır
   (`K007 · OTURUM AÇIK` + nabız noktası; EkoToken'da `D003 · 3 İSTEM`).
3. **Model seçici:** tam yuvarlak segment; seçili model siyah hap, hap seçime **kayarak**
   geçer (left geçişi ~0,35 s). Altında seçili modelin kısa açıklaması.
4. **Mesajlar:** kullanıcı balonu siyah, sağda; asistan yanıtı kart **değil**: "Asistan" etiketi,
   ince çizgi, mono model/saat, ardından metin. Kopyala ikon butonu. Asistan yazarken üç nokta
   dalgası. Mesajlar alttan hafifçe belirir.
5. **Yazma alanı:** altta yüzen beyaz kapsül; içinde yazma kutusu ve siyah yuvarlak Gönder.
6. **EkoToken oturum paneli:** siyah kart; solda büyük mono oturum enerjisi, altında su ve CO₂;
   sağda **istem başına küçük sütun grafiği** (her istemin enerjisi, son istem eco renginde).
7. **"Bu yanıtın ayak izi" kartı:** enerji / su / CO₂ için büyük mono ortalama, altında
   min–maks aralık çubuğu ve aralık metni; sağ üstte `girdi → çıktı token`.
   - **Açık karar:** aralık çubuğunun ölçeği. Öneri: her ölçüt için çubuğun tamamı, o yanıtın
     üç model sınıfında alabileceği en yüksek değer olsun. Uygulamadan önce bana sor.
8. **Tasarruf karşılaştırması:** büyük mono `−%72` ve iki yatay çubuk (seçili model tam,
   Hafif orantılı kısa, eco renginde). Yüzde mevcut `calculateSavingsPct`'ten gelir.
   Seçili model zaten Hafif ise mevcut davranış korunur.
9. **Günlük karşılık:** tek satır önizleme ("≈ N su damlası", mevcut `EQUIVALENTS`'tan);
   tıklayınca bugünkü ayrıntılar açılır.
10. **Yönetici paneli:** solda siyah kenar menüsü (logo, sekmeler, kayıt sayıları, canlı
    güncelleme kutusu, Çıkış; dar ekranda üste yığılır, sticky değil). Sağ üstte aşama anahtarı
    ve Excel İndir. **Yapılandırma mührü** siyah kart (sunucu ve kayıtlar özeti yan yana;
    farklıysa kırmızı durum). Test kartlarında t, p (çift yönlü), n ve **p çizelgesi**
    (α = 0,05 çizgisi + p noktası). Anlamlı testin kartı koyu çerçeveli.

## 4. Hareket

- Yörünge dönüşü (6 s), nabız (2 s), mesaj belirmesi (0,5 s), halka/çubuk dolması (~0,9–1,4 s),
  model hapının kayması (0,35 s).
- **`prefers-reduced-motion: reduce`** olan cihazlarda bütün animasyonlar kapalı.
- Animasyonlar veriyi asla geciktirmez; içerik hemen görünür, yalnızca süslemesi oynar.
