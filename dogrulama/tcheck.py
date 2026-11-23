# Bağımsız doğrulama betiği: istatistik motorunun (src/lib/stats.js) sonuçlarını
# tamamen farklı bir yöntemle yeniden hesaplar.
#
# Neden gerekli?
#   stats.js, p değerini "düzenlenmiş eksik beta fonksiyonu" ve sürekli kesir
#   (Lentz yöntemi) ile bulur. Bu betik ise t dağılımının yoğunluk fonksiyonunu
#   Simpson yöntemiyle sayısal olarak integre eder (eğrinin altındaki alanı küçük
#   parçalara bölerek toplar). İki farklı yol aynı sonucu veriyorsa hesap doğrudur.
#   tests/stats.test.js içindeki Welch testi ve Cohen's d beklenen değerleri bu betikten alınmıştır.
#
# Nasıl çalıştırılır?
#   1) Proje kök klasöründe:  python dogrulama/tcheck.py
#      Sabit örneklerin sonuçlarını yazar; tests/stats.test.js ile karşılaştırılır.
#   2) Yönetici panelinden indirilen Excel dosyasıyla:
#         python dogrulama/tcheck.py EkoToken_Veri_Seti_2026-11-23.xlsx
#      SPSS_Veri_Seti sayfasını okur, her ölçüt için 4 testi yeniden hesaplar ve
#      Grup_Karsilastirma sayfasındaki (panelin hesapladığı) değerlerle tek tek karşılaştırır.
#   Yalnızca Python'un standart kütüphanesini kullanır; ek paket gerekmez.
#
# Bütün p değerleri ÇİFT YÖNLÜDÜR (two-tailed).
# Cohen's d: bağımsız gruplarda havuzlanmış standart sapma ile; eşleştirilmişte dz = ort. fark / farkların SS'si.
#
# Bu betik uygulamanın parçası değildir; yalnızca jüriye ve danışmana
# hesapların doğruluğunu göstermek için tutulur.

import math
import re
import sys
import zipfile
import xml.etree.ElementTree as ET


def pdf(x, df):
    """Student t dağılımının yoğunluk fonksiyonu (df: serbestlik derecesi)."""
    c = math.exp(math.lgamma((df + 1) / 2) - math.lgamma(df / 2)) / math.sqrt(df * math.pi)
    return c * (1 + x * x / df) ** (-(df + 1) / 2)


def p_two(t, df, n=200000):
    """Çift yönlü p değeri: 1 − 2 × (0'dan |t|'ye kadar yoğunluğun integrali), Simpson yöntemi."""
    a, b = 0.0, abs(t)
    h = (b - a) / n
    s = pdf(a, df) + pdf(b, df)
    for i in range(1, n):
        s += (4 if i % 2 else 2) * pdf(a + i * h, df)
    return 1 - 2 * (s * h / 3)


def desc(v):
    """n, ortalama ve örneklem varyansı (n − 1'e bölünür)."""
    n = len(v)
    m = sum(v) / n
    var = sum((x - m) ** 2 for x in v) / (n - 1)
    return n, m, var


def welch(a, b, steps=200000):
    """Welch t-testi: (t, serbestlik derecesi, p) döner."""
    n1, m1, v1 = desc(a)
    n2, m2, v2 = desc(b)
    s1, s2 = v1 / n1, v2 / n2
    t = (m1 - m2) / math.sqrt(s1 + s2)
    df = (s1 + s2) ** 2 / (s1 ** 2 / (n1 - 1) + s2 ** 2 / (n2 - 1))
    return t, df, p_two(t, df, steps)


def cohen_d_bagimsiz(a, b):
    """Cohen's d, havuzlanmış standart sapma ile: (ort1 − ort2) / sp."""
    n1, m1, v1 = desc(a)
    n2, m2, v2 = desc(b)
    sp = math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2))
    return (m1 - m2) / sp


def eslestirilmis(on, son, steps=200000):
    """Eşleştirilmiş t-testi: (t, sd, p, dz) döner. Fark = son − ön."""
    d = [b - a for a, b in zip(on, son)]
    n, m, v = desc(d)
    sd_fark = math.sqrt(v)
    t = m / (sd_fark / math.sqrt(n))
    return t, n - 1, p_two(t, n - 1, steps), m / sd_fark


def sabit_ornekler():
    # Zorunlu testler (proje rehberi Bölüm 6)
    print("p(2.0, 10)      =", p_two(2.0, 10))
    print("p(2.228139, 10) =", p_two(2.228139, 10))
    print("p(3.5, 4)       =", p_two(3.5, 4))

    # Eşleştirilmiş t-testi örneği: fark = son − ön
    on, son = [10, 12, 9, 11, 13], [8, 11, 7, 10, 9]
    print("eşleştirilmiş (t, sd, p, dz) =", eslestirilmis(on, son))

    # Welch t-testi örnekleri (t, sd, p) ve Cohen's d
    for ad, a, b in [
        ("A", [1, 2, 3, 4, 5], [2, 4, 6, 8, 10]),
        ("B", [12, 15, 11, 14, 13, 16], [9, 8, 10, 7]),
        ("C (bir grubun varyansı 0)", [5, 5, 5, 5], [3, 4, 6, 7, 8]),
    ]:
        print(f"Welch {ad} =", welch(a, b), " d =", cohen_d_bagimsiz(a, b))

    # Sabit 5 Kontrol + 5 Deney veri seti (öğrenci başına toplam enerji, Wh).
    # Aynı sayılar tests/stats.test.js → "sabit veri seti" bölümünde de vardır.
    k_on = [3.2, 2.8, 4.1, 3.5, 2.9]
    k_son = [3.0, 3.1, 3.8, 3.6, 2.7]
    d_on = [3.4, 3.0, 3.9, 2.7, 3.6]
    d_son = [1.9, 2.2, 2.5, 1.6, 2.4]
    print("\nSabit veri seti (4 kanonik test):")
    print("1) Ön Test K vs D  (t, sd, p) =", welch(k_on, d_on), " d =", cohen_d_bagimsiz(k_on, d_on))
    print("2) Kontrol Ön→Son  (t, sd, p, dz) =", eslestirilmis(k_on, k_son))
    print("3) Deney Ön→Son    (t, sd, p, dz) =", eslestirilmis(d_on, d_son))
    print("4) Son Test K vs D (t, sd, p) =", welch(k_son, d_son), " d =", cohen_d_bagimsiz(k_son, d_son))


# ---------------------------------------------------------------------------
# Excel (.xlsx) okuma: bir .xlsx dosyası aslında içinde XML dosyaları olan bir ZIP arşividir.
# ---------------------------------------------------------------------------

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def sutun_no(hucre_ref):
    """'C12' → 2 (A = 0)."""
    harfler = re.match(r"[A-Z]+", hucre_ref).group(0)
    no = 0
    for h in harfler:
        no = no * 26 + (ord(h) - 64)
    return no - 1


def sayfalari_oku(dosya):
    """Her sayfayı satır listesi olarak döner: { sayfa_adı: [[hücre, ...], ...] }. Boş hücre = None."""
    with zipfile.ZipFile(dosya) as z:
        # Excel dosyayı yeniden kaydettiyse metinler ortak tabloya (sharedStrings) taşınmış olabilir.
        ortak = []
        if "xl/sharedStrings.xml" in z.namelist():
            kok = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in kok.findall("m:si", NS):
                ortak.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))

        # Sayfa adı → XML dosyası eşlemesi
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        hedef = {r.get("Id"): r.get("Target") for r in rels}
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        sonuc = {}
        for sh in wb.find("m:sheets", NS):
            yol = hedef[sh.get(REL_NS)].lstrip("/")
            if not yol.startswith("xl/"):
                yol = "xl/" + yol
            kok = ET.fromstring(z.read(yol))
            satirlar = []
            for row in kok.iter(f"{{{NS['m']}}}row"):
                hucreler = {}
                for c in row.findall("m:c", NS):
                    tip = c.get("t")
                    if tip == "inlineStr":
                        deger = "".join(t.text or "" for t in c.iter(f"{{{NS['m']}}}t"))
                    else:
                        v = c.find("m:v", NS)
                        if v is None:
                            continue
                        deger = ortak[int(v.text)] if tip == "s" else (v.text if tip == "str" else float(v.text))
                    hucreler[sutun_no(c.get("r"))] = deger
                genislik = max(hucreler) + 1 if hucreler else 0
                satirlar.append([hucreler.get(i) for i in range(genislik)])
            sonuc[sh.get("name")] = satirlar
    return sonuc


def excel_kontrol(dosya):
    sayfalar = sayfalari_oku(dosya)
    spss = sayfalar["SPSS_Veri_Seti"]
    baslik, veri = spss[0], spss[1:]
    sutun = {ad: i for i, ad in enumerate(baslik)}

    def deger(satir, ad):
        i = sutun[ad]
        return satir[i] if i < len(satir) and isinstance(satir[i], float) else None

    olcutler = [ad[len("OnTest_"):] for ad in baslik if ad.startswith("OnTest_") and ad != "OnTest_Katilim"]
    print(f"SPSS_Veri_Seti: {len(veri)} satır, ölçütler: {', '.join(olcutler)}\n")

    # Panelin hesapladığı değerler (Grup_Karsilastirma → test bloğu)
    panel = {}
    gk = sayfalar["Grup_Karsilastirma"]
    for i, satir in enumerate(gk):
        if satir and satir[0] == "Ölçüt" and "Test No" in satir:
            b = {ad: j for j, ad in enumerate(satir)}
            for s in gk[i + 1:]:
                if not s or s[0] is None:
                    break
                al = lambda ad: s[b[ad]] if b[ad] < len(s) else None
                panel[(al("SPSS Değişkeni"), int(al("Test No")))] = {
                    "t": al("t"), "sd": al("sd"), "p": al("p (çift yönlü)"), "d": al("Cohen's d"),
                }

    en_buyuk_fark = 0.0
    for olcut in olcutler:
        def liste(asama, grup):
            return [deger(s, f"{asama}_{olcut}") for s in veri
                    if deger(s, "Grup_Kodu") == grup and deger(s, f"{asama}_{olcut}") is not None]

        def ciftler(grup):
            on, son = [], []
            for s in veri:
                a, b = deger(s, f"OnTest_{olcut}"), deger(s, f"SonTest_{olcut}")
                if deger(s, "Grup_Kodu") == grup and a is not None and b is not None:
                    on.append(a)
                    son.append(b)
            return on, son

        print(f"=== {olcut} ===")
        testler = [
            (1, "Ön Test K vs D (Welch)", "welch", (liste("OnTest", 0.0), liste("OnTest", 1.0))),
            (2, "Kontrol Ön→Son (eşleştirilmiş)", "paired", ciftler(0.0)),
            (3, "Deney Ön→Son (eşleştirilmiş)", "paired", ciftler(1.0)),
            (4, "Son Test K vs D (Welch)", "welch", (liste("SonTest", 0.0), liste("SonTest", 1.0))),
        ]
        for no, ad, tur, (a, b) in testler:
            try:
                if tur == "welch":
                    t, sd, p = welch(a, b, 20000)
                    d = cohen_d_bagimsiz(a, b)
                    nmetin = f"n={len(a)}/{len(b)}"
                else:
                    t, sd, p, d = eslestirilmis(a, b, 20000)
                    nmetin = f"eşleşen n={len(a)}"
            except (ZeroDivisionError, ValueError):
                print(f"  {no}) {ad}: hesaplanamadı (n < 2 veya varyans 0)")
                continue
            satir = f"  {no}) {ad}: {nmetin}  t={t:.6f}  sd={sd:.4f}  p={p:.6f}  d={d:.6f}"
            pv = panel.get((olcut, no))
            if pv and all(isinstance(pv[k], float) for k in ("t", "p", "d")):
                fark = max(abs(pv["t"] - t), abs(pv["p"] - p), abs(pv["d"] - d), abs(pv["sd"] - sd))
                en_buyuk_fark = max(en_buyuk_fark, fark)
                satir += f"   panel farkı={fark:.2e} {'UYUMLU' if fark < 1e-6 else 'UYUMSUZ!'}"
            else:
                satir += "   (panelde sayı yok)"
            print(satir)
        print()
    print(f"En büyük fark: {en_buyuk_fark:.2e} (1e-6'dan küçükse panel ile bağımsız hesap aynıdır)")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        excel_kontrol(sys.argv[1])
    else:
        sabit_ornekler()
