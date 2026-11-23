// Sağlık kontrolü: Vercel'de sunucu fonksiyonlarının çalıştığını doğrulamak için basit bir uç nokta.
// Adres: /api/saglik  →  { "durum": "tamam" }

export default function handler(req, res) {
  res.status(200).json({ durum: 'tamam' });
}
