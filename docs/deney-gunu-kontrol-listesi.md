# Deney Günü Kontrol Listesi

Bu liste, Ön Test – Son Test kontrol gruplu kör deneyin yazılım tarafını adım adım anlatır.
Teknik bilgi gerektirmez. Maddeleri sırayla işaretleyin. Kâğıda basıp kalemle de işaretleyebilirsiniz.

- **Yayın adresi:** https://egitim-asistani-2204.vercel.app
- **Kim yapar?** Maddelerin yanında yazar:
  - **[Öğretmen]**: araştırmayı yürüten öğretmen,
  - **[Ekip]**: yazılımı geliştiren proje öğrencileri.
- **Kaynak:** Bu liste `CLAUDE.md` Bölüm 13 ("Canlı deney öncesi kontrol listesi") ile madde madde aynıdır. Bölüm 13'teki maddelerin yanında **(B13-1)**, **(B13-2)** … etiketi vardır.

---

> [!IMPORTANT]
> ## Dondurma kuralı: ölçüm koşulları deney boyunca değişmez
>
> **Ön Test başladıktan sonra Son Test bitene kadar** yazılımda şu ayarlar DEĞİŞTİRİLMEZ:
> yapay zekaya verilen talimat metni, hangi ölçek sınıfının hangi modele gittiği ve düşünme ayarları,
> yanıt çeşitliliği (sıcaklık) ayarı, enerji/su/karbon katsayıları ve modele gönderilen önceki mesaj sayısı.
>
> **Neden?** Bu ayarlar her sorunun ölçülen enerjisini doğrudan belirler. Arada değişirse Ön Test ile
> Son Test arasındaki fark eğitimden mi yoksa ayar değişikliğinden mi geldi, bilinemez (karıştırıcı değişken).
>
> **Nasıl kanıtlanır?** Sistem bu ayarların 12 karakterlik bir parmak izini ("yapılandırma özeti")
> her kayda yazar. Yönetici panelinde **Ön Test – Son Test & İstatistik** sekmesinin üstündeki kutuda iki satır görünür:
> - **"Sunucunun şu anki yapılandırma özeti"**: sistemin şu an hangi ayarlarla çalıştığı. Hiç kayıt yokken de görünür.
> - **"Kayıtlardaki yapılandırma özeti"**: öğrencilerin soruları hangi ayarlarla yanıtlandı.
>
> - [ ] **(B13-13) Ön Test'ten önce** (Verileri Temizle'den sonra, öğrenciler girmeden) "Sunucunun şu anki yapılandırma özeti"ni aşağıdaki tutanağa yazın. **[Öğretmen]**
> - [ ] **Son Test başlamadan önce** (aşama hâlâ Ön Test'teyken) sunucunun şu anki özeti tutanaktakiyle aynı mı bakın (Bölüm 5, Adım 1). **[Öğretmen]**
> - [ ] **Son Test bitince** kutunun **yeşil** olduğunu kontrol edin: "Kayıtlardaki yapılandırma özeti: bütün kayıtlarda tek değer `……` ✓". Değer tutanaktakiyle aynı olmalı. **[Öğretmen]**
> - Kutu **kırmızıysa** (kayıtlarda birden fazla değer var ya da sunucunun şu anki özeti kayıtlardakinden farklı) ölçüm koşulları değişmiştir. Ekip ile danışman öğretmene haber verin; durum raporda açıklanmalıdır.
> - Zorunlu bir hata düzeltmesi gerekirse önce danışman öğretmene sorulur ve raporda belirtilir.

### Tutanak

| Bilgi | Değer |
|---|---|
| Sunucunun şu anki yapılandırma özeti (Ön Test'ten önce) | |
| Sunucunun şu anki yapılandırma özeti (Son Test'ten önce, aynı mı?) | |
| Kayıtlardaki yapılandırma özeti (Son Test sonu) | |
| Ön Test tarihi / saatleri | |
| Son Test tarihi / saatleri | |
| Verilerin temizlendiği tarih / saat | |
| Excel'in indirildiği tarih / saat | |
| Notlar (yanlış kodla giriş, teknik sorun, yeniden deneme…) | |

---

## 1. Danışman öğretmene sorulacaklar (Ön Test'ten ÖNCE kararlaştırılmalı)

Bu kararlar `CLAUDE.md` Bölüm 12'deki açık kararlardır. Karar verilmeden Ön Test başlamamalı; çünkü bazıları
iki aşamada da aynı kalmak zorundadır.

- [ ] **12/1 — Hiç soru yazmayan öğrenci:** Bir aşamada giriş yapıp hiç soru göndermeyen öğrenci analize "0" değeriyle mi girsin, dışarıda mı kalsın? Şu anki ayar: dışarıda kalır. "0" seçilirse yalnızca o aşamada **giriş yapmış** öğrenciler 0 ile girer (hiç gelmeyen öğrenci 0 sayılmaz). **[Öğretmen + danışman]** → Karar: ……………
- [ ] **12/2 — Model kotaları:** Model eşlemesi 23.11.2026'da onaylandı. Ücretli katmana geçildi. Kota sayıları sağlayıcının kota sayfasından okunup `CLAUDE.md`'ye eklenecek. Danışmana bilgi verilir. **[Ekip]**
- [ ] **12/3 — Etik kurul ve veli onayı:** Deneme kullanımından (UAT) ve canlı deneyden önce tamamlanmış olmalı (aşağıda B13-6 ile aynı madde). **[Öğretmen]**
- [ ] **12/4 — Varsayılan seçili model:** Sohbet ekranı şu an "Standart Model" seçili açılıyor. Öğrenciler çoğu zaman varsayılanı değiştirmediği için bu seçim "Hafif Model %" sonucunu etkileyebilir. Seçenekler: Standart, Hafif, ya da model seçmeden gönderilemeyen seçici. Karar ne olursa olsun Ön Test ve Son Test'te, iki grupta da aynı kalır. **[Öğretmen + danışman]** → Karar: ……………
- [ ] **12/5 — Mobilde yazarken özet şeridinin gizlenmesi:** Telefonda klavye açıkken Deney grubunun EkoToken özet şeridi ve iki grupta da model açıklama satırı gizlenir. Böylece iki grubun mesaj alanı eşit kalır. Proje ekibi kabul etti. Danışman onayı bekleniyor, raporda belirtilecek. **[Öğretmen + danışman]** → Karar: ……………
- [ ] **Dondurma kuralı:** Danışman yukarıdaki kutudaki kuralı biliyor ve onaylıyor. **[Öğretmen]**

> Kararlar kodda bir değişiklik gerektiriyorsa (12/1, 12/4) ekip bunu **Ön Test'ten önce** yapar ve yayınlar.

---

## 2. Deney öncesi (Ön Test'ten birkaç gün önce)

### 2a. Güvenlik ve ayarlar

- [ ] **(B13-1) Yönetici parolası değiştirildi.** Şu anki parola geçicidir. Ekip, Vercel'de (Production) yeni ve güçlü bir parola girip yeniden yayın yaptı. Yeni parola yalnızca öğretmende ve ekipte; hiçbir yere yazılı bırakılmadı. **[Ekip]**
- [x] **(B13-2) Veritabanı güvenlik kuralları yayınlandı ve denendi.** ✅ 23.11.2026 tamamlandı. Öğrenci tarayıcısı yalnızca aktif aşamayı okuyabilir; başka hiçbir veriyi okuyamaz, yazamaz. **[Ekip]**
- [ ] **(B13-3) Canlı aşama dinleyicisi okul ağında çalışıyor.** Vercel'de istemci ayarları (`VITE_FIREBASE_*`) tanımlı. Okul bilgisayar laboratuvarında iki ekran açılır: birinde öğrenci, birinde yönetici paneli. Yönetici aşamayı değiştirince öğrenci ekranı birkaç saniye içinde değişiyor. Deneme bitince aşama yeniden **Ön Test**'e alınır. **[Ekip + Öğretmen]**
- [x] **(B13-4) Öğrenci tarafı okuma kotası düzeltildi.** ✅ 23.11.2026 tamamlandı. Veritabanındaki gerekli indeks açık ("Enabled"). Veritabanı projesi yeniden kurulursa indeks de yeniden oluşturulmalı; yoksa sohbet çalışmaz. **[Ekip]**
- [ ] **(B13-7) Üç ölçek sınıfı gerçekten farklı modellere gidiyor ve yük testi yapıldı.** 60 öğrencinin aynı anda kullanımına benzer bir denemede kota sınırına takılmadı. **[Ekip]**
- [x] **(B13-9) Ücretli katmana geçildi.** ✅ 23.11.2026 tamamlandı (ön ödemeli hesap, otomatik yükleme KAPALI).
- [ ] **(B13-10) AI Studio bakiyesi yeterli.** Otomatik yükleme kapalı olduğu için **bakiye biterse öğrencilerin soruları cevapsız kalır.** Ön Test'ten önce ve Son Test'ten önce AI Studio'nun faturalandırma sayfasından kalan bakiye kontrol edilir; gerekirse elle yükleme yapılır. **[Ekip]** → Kalan bakiye: ……… (tarih: ………)
- [x] **(B13-8) Excel dışa aktarma denendi.** ✅ 24.11.2026 tamamlandı. SPSS/JASP'a gerçek aktarma ilk canlı veriyle yapılacak (Bölüm 6'ya bakın).

### 2b. Etik ve hazırlık

- [ ] **(B13-6) Etik kurul ve veli onayı tamamlandı.** **[Öğretmen]**
- [ ] **Kod kartları hazır.** 60 kod (K001–K030 Kontrol, D001–D030 Deney) kartlara basıldı. 001–020 asıl, 021–030 yedek koddur. Hangi öğrencinin hangi kodu alacağı önceden belirlendi. Öğrenci adı ↔ kod listesi **yalnızca kâğıtta** ve öğretmende durur; sisteme hiçbir yerde ad yazılmaz. **[Öğretmen]**
- [ ] **Öğrenci kartlarında amaç yazmıyor.** Kartta yalnızca adres ve kod bulunur. "Çevre", "enerji", "EkoToken" gibi sözcükler geçmez (kör deney). **[Öğretmen]**
- [ ] **Cihazlar hazır.** Her bilgisayarda internet çalışıyor. Tarayıcı güncel. Adres (https://egitim-asistani-2204.vercel.app) açılıyor ve "Eğitim Asistanı Girişi" ekranı görünüyor. Reklam engelleyici varsa bu site için kapatıldı. **[Öğretmen]**
- [ ] **Cihazlarda eski oturum yok.** Her bilgisayarda site açıldı ve doğrudan sohbet değil, **giriş ekranı** geldi. Sohbet ekranı geliyorsa önceki kişi Çıkış yapmamıştır: sağ üstteki **Çıkış**'a basın. Bu kontrol **Verileri Temizle'den önce** yapılır (2c). **[Öğretmen]**
  - **Önemli:** Sistem öğrencinin kodunu bilgisayarda saklar. **Tarayıcıyı kapatmak bu kodu silmez; kodu yalnızca "Çıkış" siler.** Çıkış yapılmamış bir bilgisayarda site açıldığı anda, o kod adına o günkü aşamada giriş kaydedilir.

### 2c. Deneme kullanımı (UAT) ve temizlik

- [ ] Danışman öğretmen ve bir öğrenci sistemi denedi (bir K ve bir D koduyla, iki aşamada da). Sorun görülmedi. **[Öğretmen + Ekip]**
- [ ] **(B13-11) Önizleme modu KAPALI.** Yönetici paneli → Genel Bakış & Grafikler → buton **"Örnek Veriyle Önizle"** yazıyor olmalı ("Önizlemeden Çık" yazıyorsa basın). Turuncu "ÖRNEK VERİ ÖNİZLEMESİ" bandı görünmemeli. **[Öğretmen]**
- [ ] **(B13-5) Verileri Temizle.** Genel Bakış & Grafikler → **Verileri Temizle**. Açılan pencerede silinecek sayılar görünür. Kutuya büyük harflerle **SİL** yazın (Türkçe klavye yoksa **SIL** de kabul edilir; küçük harf kabul edilmez) ve onaylayın. Bu işlem deneme kayıtlarını, giriş kayıtlarını ve hız sınırı kayıtlarını siler. Aktif aşama ayarı değişmez. **[Öğretmen]**
- [ ] Temizlikten sonra panelde **0 kayıt** görünüyor (sekme adı "Öğrenci Kayıtları (0)"). **[Öğretmen]**
- [ ] **Katılımcı Kodları (60)** sekmesinde 60 kodun **hepsinde "Giriş yok"** yazıyor. **[Öğretmen]**
- [ ] Temizlikten sonra **hiç kimse** (öğretmen ve ekip dahil) öğrenci koduyla deneme girişi yapmıyor. Her deneme girişi katılım verisi olarak kaydedilir. **[Öğretmen + Ekip]**
- [ ] Temizlik tarihi tutanağa yazıldı. **[Öğretmen]**
- [ ] **Ön Test – Son Test & İstatistik** sekmesindeki "Sunucunun şu anki yapılandırma özeti" tutanağa yazıldı (en üstteki kutu, B13-13). "Kayıtlardaki yapılandırma özeti" satırında "henüz kayıt yok" yazıyor. **[Öğretmen]**

---

## 3. Ön Test günü

### Başlamadan önce
- [ ] Yönetici panelinde aktif aşama **Ön Test** seçili (üstteki Ön Test / Son Test anahtarı). **[Öğretmen]**
- [ ] Önizleme modu kapalı (turuncu bant yok). **[Öğretmen]**
- [ ] AI Studio bakiyesi bugün kontrol edildi. **[Ekip]**

### Oturum sırasında
- [ ] Her öğrenci **yalnızca kendi kartındaki kodla** giriş yapıyor. Öğretmen gözetimi sürekli. Kodlar sırayla verildiği için başkasının kodu tahmin edilebilir; bu yüzden gözetim önemlidir. **[Öğretmen]**
- [ ] İlk birkaç öğrenci soru gönderdikten sonra İstatistik sekmesindeki kutu yeşil: "Kayıtlardaki yapılandırma özeti" tutanaktaki değerle aynı. **[Öğretmen]**
- [ ] Öğrencilere amaç anlatılmıyor. Ekranda aşama adı yazmaz; öğrenciler yalnızca bir "eğitim asistanı" kullanıyor. **[Öğretmen]**
- [ ] Ön Test'te iki grup (K ve D) **aynı sade ekranı** görüyor. Deney grubundan birinin ekranında enerji/su/karbon rozeti görünürse aşama yanlıştır: hemen panelden aşamayı kontrol edin. **[Öğretmen]**

### Oturum sonunda
- [ ] **(B13-12) Her öğrenci sağ üstteki "Çıkış" butonuna bastı. Bu ASIL önlemdir.** Öğretmen her ekranda giriş ekranının göründüğünü kontrol eder. **[Öğretmen]**
  - **Neden?** Sistem kodu bilgisayarda saklar ve tarayıcı kapanınca da unutmaz. Çıkış yapılmamış bir bilgisayarda site Son Test günü açılırsa (ya da sekme açık kalırsa) sistem o öğrenci için **Son Test girişi kaydeder**. Böylece öğrenci Son Test'e hiç katılmadığı halde katılmış görünür.
- [ ] **Ek önlem: bütün tarayıcı pencereleri kapatıldı** (yalnızca sekme değil, tarayıcının tamamı). Bu, açık kalan bir sekmenin aşama değişince kendiliğinden yeni aşamaya geçmesini önler. Çıkış'ın yerini **tutmaz**. **[Öğretmen]**
- [ ] Panelde **Katılımcı Kodları** sekmesinden giriş yapan kodlar kontrol edildi. Giriş sayısı beklenenden fazla olan kod (aynı kodla birden çok giriş) tutanağa not edildi. **[Öğretmen]**

---

## 4. Ön Test ile Son Test arası (eğitim süreci)

- [ ] Sistem **Ön Test**'te kalıyor; aşama değiştirilmiyor. **[Öğretmen]**
- [ ] Farkındalık eğitimi **yalnızca Deney grubuna** veriliyor. Kontrol grubu eğitimden ve Deney grubunun ekranından haberdar değil. **[Öğretmen]**
- [ ] Yazılımda dondurma kuralındaki ayarlara dokunulmadı (ekip teyit eder). **[Ekip]**
- [ ] Ara dönemde öğrenciler sistemi kullanacaksa bu kullanım Ön Test kaydı olarak toplanır. Bu durum danışmanla konuşuldu. **[Öğretmen]**
- [ ] Katılımcı Kodları sekmesinde şüpheli çoklu giriş var mı bakıldı. **[Öğretmen]**

---

## 5. Son Test günü

### Başlamadan önce (bu sırayla)

**Adım 1, aşama hâlâ Ön Test'teyken:**
- [ ] AI Studio bakiyesi bugün kontrol edildi. **[Ekip]**
- [ ] Yönetici panelinde aşamanın **hâlâ Ön Test** olduğu görüldü. **[Öğretmen]**
- [ ] **Sunucunun şu anki özeti tutanaktakiyle aynı mı?** İstatistik sekmesindeki "Sunucunun şu anki yapılandırma özeti" tutanaktaki Ön Test değeriyle karşılaştırıldı ve kutu yeşil. **[Öğretmen]**
  - **Farklıysa (kutu kırmızıysa) aşama DEĞİŞTİRİLMEZ.** Ekibe ve danışman öğretmene haber verilir. Ölçüm koşulları Ön Test'ten sonra değişmiştir; Son Test verisi toplanmadan önce durum çözülmelidir.
- [ ] **Her öğrenci bilgisayarında** site açıldı ve **giriş ekranının** geldiği doğrulandı. Sohbet ekranı gelirse sağ üstteki **Çıkış**'a basıldı ve giriş ekranının geldiği görüldü. **[Öğretmen]**
  - **Neden önce bu?** Çıkış yapılmamış bir bilgisayarda kayıtlı kod hâlâ duruyor olabilir. Bu kontrol aşama Ön Test'teyken yapılırsa olsa olsa fazladan bir **Ön Test** girişi oluşur; Son Test verisi etkilenmez. Aşama değiştirildikten sonra yapılırsa o kod için sahte bir **Son Test** girişi kaydedilir.
  - Çıkış'a basmak gereken bilgisayar olduysa kodu tutanağa not edin.

**Adım 2, ancak bütün bilgisayarlar giriş ekranındayken:**
- [ ] Yönetici panelinde aşama **Son Test**'e alındı. Onay penceresinde "Son Test" yazdığı görüldü ve onaylandı. **[Öğretmen]**
- [ ] Önizleme modu kapalı (turuncu bant yok). **[Öğretmen]**
- [ ] Ancak bundan sonra öğrenciler kodlarıyla giriş yapar. **[Öğretmen]**

### Ekran doğrulaması (öğrenciler girdikten sonra, birer öğrencinin ekranına bakarak)
- [ ] **Kontrol grubu (K…)**: Sade ekran. Hiçbir enerji/su/karbon rozeti yok. **[Öğretmen]**
- [ ] **Deney grubu (D…)**: EkoToken ekranı görünüyor. Yanıtların altında rozetler, "Günlük Karşılık" kartı, tasarruf ipucu, Kişisel Rapor ve Metodoloji var. **[Öğretmen]**
- [ ] Bir Deney öğrencisinin ekranı sade kaldıysa **sayfayı yenileyin** (aşağıda Sorun giderme). **[Öğretmen]**

### Oturum sonunda
- [ ] Her öğrenci **Çıkış**'a bastı (asıl önlem; giriş ekranı göründü) ve ek önlem olarak **bütün tarayıcılar kapatıldı.** **[Öğretmen]**
- [ ] **Yapılandırma özeti kutusu yeşil** ve "Kayıtlardaki yapılandırma özeti" Ön Test'ten önce yazılan değerle aynı (en üstteki kutu). **[Öğretmen]**

---

## 6. Veri dışa aktarma (Son Test bittikten sonra)

- [ ] Önizleme modu kapalı. (Önizlemede Excel ve CSV butonları zaten pasiftir.) **[Öğretmen]**
- [ ] **Ön Test – Son Test & İstatistik** sekmesinden **Excel İndir (.xlsx)** ile dosya indirildi. Dosyada 5 sayfa var: `Tum_Kayitlar`, `Ogrenci_Ozetleri`, `Grup_Karsilastirma`, `SPSS_Veri_Seti`, `Degisken_Sozlugu`. **[Öğretmen]**
- [ ] İsteğe bağlı: **Öğrenci Kayıtları** sekmesinden CSV de indirildi. **[Öğretmen]**
- [ ] Ekip çapraz kontrolü yaptı: `python dogrulama/tcheck.py <dosya>.xlsx` komutu **"UYUMLU"** dedi. **[Ekip]**
- [ ] **Yedek alındı:** Excel dosyası en az iki ayrı yerde saklanıyor (ör. okul bilgisayarı + harici bellek). **[Öğretmen]**
- [ ] `SPSS_Veri_Seti` sayfası SPSS'e (veya JASP'a) aktarıldı. Eksik veri boş hücre olarak geldi. **[Ekip]**
- [ ] Veriler yedeklenmeden **Verileri Temizle'ye basılmadı.** **[Öğretmen]**

> **Örnek veri uyarısı:** "Örnek Veriyle Önizle" modu yalnızca jüriye veya öğretmenlere paneli göstermek içindir.
> Bu moddaki grafikler ve istatistikler uydurma örnek veriden üretilir. Kartlarda "ÖRNEK VERİ" etiketi vardır.
> **Önizleme ekran görüntüleri hiçbir zaman sonuç olarak raporda veya sunumda kullanılmaz.** Raporda yalnızca
> gerçek veriden (turuncu bant yokken) alınmış ekranlar ve Excel kullanılır.

---

## 7. Sorun giderme

| Öğrencinin gördüğü / durum | Ne yapılır? |
|---|---|
| **"Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin."** | 1) O bilgisayarda başka bir site açılıyor mu bakın; açılmıyorsa sorun internettir (okul ağı/Wi-Fi). 2) İnternet varsa **Tekrar Dene**'ye basın. Yazılan soru kaybolmaz. 3) Olmazsa sayfayı yenileyin (F5); kod hatırlandığı için yeniden giriş gerekmez. 4) **Bütün öğrencilerde** aynı anda görünüyorsa siteyi öğretmen telefonundan (mobil veriyle) açmayı deneyin ve ekibe haber verin. |
| **"Asistan şu anda çok yoğun…"** | Birkaç saniye bekleyip **Tekrar Dene**'ye basın. |
| **"Asistan şu anda yanıt veremiyor…"** (çok sayıda öğrencide) | Ekip hemen **AI Studio bakiyesini** kontrol etsin. Bakiye bittiyse elle yükleme yapılır. |
| **"Asistan yanıtı zamanında hazırlayamadı…"** | Soruyu kısaltıp yeniden göndersin. Özellikle "Akıl Yürütme Modeli" daha uzun sürebilir. |
| **"Çok hızlı gönderiyorsunuz…"** | Aynı kod 3 saniyede en fazla bir soru gönderebilir. Birkaç saniye beklesin. |
| **"Geçersiz katılımcı kodu…"** | Kart kontrol edilir: büyük harf K veya D + 3 rakam (ör. K007). |
| **Aşama değişti ama öğrenci ekranı değişmedi** (ör. Son Test'te Deney öğrencisi hâlâ sade ekranda) | **Sayfayı yenileyin (F5).** Kod hatırlanır; ekran sunucudaki aşamaya göre açılır. Önce yönetici panelinde aşamanın gerçekten değiştiğini kontrol edin. Okul ağı canlı güncellemeyi engelleyebilir; öğrenci bir soru gönderdiğinde de ekran kendini düzeltir. |
| **Ekranda "Yeni oturum başladı. Önceki mesajlar bu ekranda gösterilmiyor."** | Aşama değişirken ekran açık kalmıştır. Öğrenci devam eder. Not Son Test'in başında çıktıysa önceki oturumda o bilgisayarda Çıkış yapılmamış olabilir: kodu tutanağa yazın. Oturum sonlarında **Çıkış** bunu önler. |
| **Öğrenci yanlışlıkla başkasının koduyla girdi** | Hemen **Çıkış** yaptırın ve doğru kodla girmesini sağlayın. Hiçbir kaydı silmeyin; durumu (saat, kodlar) tutanağa yazın ve ekibe bildirin. |
| **Öğrenci sekmeyi yanlışlıkla kapattı** | Adresi yeniden açsın. Aynı bilgisayarda kod hatırlanır (tarayıcı kapansa da), mesajları geri gelir. Bu yüzden oturum sonunda **Çıkış** şarttır. |
| **Sitede doğrudan başka birinin sohbeti açılıyor** | Önceki kullanıcı Çıkış yapmamıştır; site açıldığı anda o kod adına giriş kaydedilmiştir. **Çıkış**'a basın, yeni öğrenci kendi koduyla girsin. Hangi kodun açıldığını tutanağa yazın. |
| **Yönetici paneli "Yönetici oturumu geçersiz veya süresi dolmuş" diyor** | Giriş ekranının altındaki **Yönetici Girişi**'nden parolayla yeniden girin. Veriler etkilenmez. |
| **İstatistik sekmesinde yapılandırma özeti kutusu kırmızı** | Ölçüm koşulları değişmiştir (dondurma kuralı). Son Test henüz başlamadıysa aşamayı değiştirmeyin. Ekibe ve danışmana haber verin; raporda açıklanır. |

---

## Ek: `CLAUDE.md` Bölüm 13 eşlemesi

| Etiket | Bölüm 13 maddesi | Bu belgede | Durum (24.11.2026) |
|---|---|---|---|
| B13-1 | `ADMIN_PASSCODE` değiştirildi | 2a | Bekliyor |
| B13-2 | Firestore kuralları yayınlandı ve denendi | 2a | ✅ |
| B13-3 | `VITE_FIREBASE_*` tanımlı, canlı dinleyici okul ağında çalışıyor | 2a | Bekliyor |
| B13-4 | Öğrenci tarafı okuma kotası (indeks) | 2a | ✅ |
| B13-5 | Tüm test verileri temizlendi, 0 kayıt | 2c | Bekliyor |
| B13-6 | Etik kurul ve veli onayı | 2b (ve 1 → 12/3) | Bekliyor |
| B13-7 | Gerçek model eşlemesi ve yük testi | 2a | Bekliyor |
| B13-8 | Excel dışa aktarma denendi | 2a, 6 | ✅ (SPSS/JASP aktarımı canlı veriyle) |
| B13-9 | Ücretli katman (faturalandırma) | 2a | ✅ |
| B13-10 | AI Studio bakiyesi yeterli | 2a, 3, 5 | Bekliyor |
| B13-11 | Örnek veri önizlemesi kapalı | 2c, 3, 5, 6 | Bekliyor |
| B13-12 | Her oturumdan sonra Çıkış (asıl önlem) + tarayıcılar kapatıldı (ek önlem); Son Test'te aşama değişmeden önce her bilgisayarda giriş ekranı doğrulandı | 2b, 3, 5 | Bekliyor |
| B13-13 | Dondurma kuralı izlendi (sunucunun şu anki özeti Ön Test'ten önce not edildi, Son Test'ten önce ve sonunda aynı) | En üstteki kutu, 2c, 3, 5 | Bekliyor |
