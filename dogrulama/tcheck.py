# Bağımsız doğrulama betiği: istatistik motorunun (src/lib/stats.js) p değerlerini
# tamamen farklı bir yöntemle yeniden hesaplar.
#
# Neden gerekli?
#   stats.js, p değerini "düzenlenmiş eksik beta fonksiyonu" ve sürekli kesir
#   (Lentz yöntemi) ile bulur. Bu betik ise t dağılımının yoğunluk fonksiyonunu
#   Simpson yöntemiyle sayısal olarak integre eder (eğrinin altındaki alanı küçük
#   parçalara bölerek toplar). İki farklı yol aynı sonucu veriyorsa hesap doğrudur.
#   tests/stats.test.js içindeki Welch testi beklenen değerleri bu betikten alınmıştır.
#
# Nasıl çalıştırılır?
#   Proje kök klasöründe:  python dogrulama/tcheck.py
#   Yalnızca Python'un standart kütüphanesini (math) kullanır; ek paket gerekmez.
#   Çıktıdaki değerler tests/stats.test.js içindeki beklenen değerlerle karşılaştırılır.
#
# Bu betik uygulamanın parçası değildir; yalnızca jüriye ve danışmana
# hesapların doğruluğunu göstermek için tutulur.

import math


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


def welch(a, b):
    """Welch t-testi: (t, serbestlik derecesi, p) döner."""
    n1, m1, v1 = desc(a)
    n2, m2, v2 = desc(b)
    s1, s2 = v1 / n1, v2 / n2
    t = (m1 - m2) / math.sqrt(s1 + s2)
    df = (s1 + s2) ** 2 / (s1 ** 2 / (n1 - 1) + s2 ** 2 / (n2 - 1))
    return t, df, p_two(t, df)


# Zorunlu testler (proje rehberi Bölüm 6)
print("p(2.0, 10)      =", p_two(2.0, 10))
print("p(2.228139, 10) =", p_two(2.228139, 10))
print("p(3.5, 4)       =", p_two(3.5, 4))

# Eşleştirilmiş t-testi örneği: fark = son − ön
d = [b - a for a, b in zip([10, 12, 9, 11, 13], [8, 11, 7, 10, 9])]
n, m, v = desc(d)
t = m / math.sqrt(v / n)
print("eşleştirilmiş (t, sd, p) =", (t, n - 1, p_two(t, n - 1)))

# Welch t-testi örnekleri (t, sd, p)
print("Welch A =", welch([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]))
print("Welch B =", welch([12, 15, 11, 14, 13, 16], [9, 8, 10, 7]))
print("Welch C (bir grubun varyansı 0) =", welch([5, 5, 5, 5], [3, 4, 6, 7, 8]))
