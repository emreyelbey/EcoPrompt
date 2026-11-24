// Markdown ağacında (mdast) yalnızca <br> etiketlerini gerçek satır sonuna çeviren küçük remark eklentisi.
// Neden: yapay zeka tablo hücrelerinde alt satıra geçmek için "<br>" yazıyor. Ham HTML güvenlik için kapalı
// olduğundan (rehype-raw yok) bu etiket ekranda çiğ metin olarak görünüyordu ("soğurulur.<br>• Su…").
// Güvenlik: ham HTML AÇILMAZ. Bir HTML düğümündeki yalnızca <br>, <br/>, <br /> (büyük/küçük harf) etiketleri
// "break" (satır sonu) düğümüne çevrilir; düğümün geri kalanı DÜZ METİN olur (öğe olarak çizilmez).
// Başka hiçbir etiket (ör. <script>, <b>, <br class="a">) dönüşmez ve önceki gibi metin olarak görünür.
// Kod blokları ve satır içi kod HTML düğümü üretmediği için içlerindeki <br> hiç etkilenmez.
// Tablo hücreleri, paragraflar, başlıklar ve liste öğeleri aynı şekilde çalışır.
// Sıra: RichMessage'da remark-breaks'ten ÖNCE çalışır; böylece üretilen metindeki tek satır sonları da korunur.

// Yalnızca yalın <br> etiketi (öznitelik yok).
const BR_TAG = /<br\s*\/?>/i;
const BR_SPLIT = /<br\s*\/?>/gi;

// İçine doğrudan satır sonu konabilen (satır içi içerik taşıyan) düğüm türleri.
const PHRASING_PARENTS = new Set(['paragraph', 'heading', 'tableCell', 'emphasis', 'strong', 'delete', 'link', 'linkReference']);

// Bir HTML değerini [metin, satır sonu, metin, …] dizisine çevirir; boş metin parçaları atlanır.
function splitOnBr(value) {
  const out = [];
  value.split(BR_SPLIT).forEach((part, i) => {
    if (i > 0) out.push({ type: 'break' });
    if (part) out.push({ type: 'text', value: part });
  });
  return out;
}

// Ağacı dolaşır; <br> içeren HTML düğümlerini yerinde değiştirir.
function transform(node) {
  if (!Array.isArray(node.children)) return;
  const phrasing = PHRASING_PARENTS.has(node.type);
  const next = [];
  for (const child of node.children) {
    if (child.type === 'html' && BR_TAG.test(child.value)) {
      const parts = splitOnBr(child.value);
      // Satır içi yerdeyse parçalar doğrudan eklenir; blok düzeyindeyse (ör. satır başında tek başına <br>)
      // bir paragrafın içine konur (mdast'ta satır sonu yalnızca satır içi içerikte bulunabilir).
      if (phrasing) next.push(...parts);
      else next.push({ type: 'paragraph', children: parts });
      continue;
    }
    transform(child);
    next.push(child);
  }
  node.children = next;
}

export default function remarkBrTags() {
  return (tree) => {
    transform(tree);
  };
}
