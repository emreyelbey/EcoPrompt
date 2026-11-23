// Test yardımcıları: sahte Firestore ve sahte HTTP istek/yanıt nesneleri.
// Gerçek veritabanına bağlanmadan uç noktaları denemek için kullanılır.

// Bellekte çalışan, yalnızca bizim kullandığımız işlemleri taklit eden Firestore.
// Belgeler "koleksiyon/belge" anahtarıyla bir Map'te tutulur.
// Seçenek: failWritesTo = 'interactions' verilirse o koleksiyona yazma hata fırlatır
// (kayıt yazılamadığında uç noktanın davranışını denemek için).
export function createFakeDb(initialDocs = {}, { failWritesTo } = {}) {
  const docs = new Map(Object.entries(initialDocs));
  let autoId = 0; // doc() kimliksiz çağrılınca verilecek sıra numarası

  // Alan değerlerini uygular: { __increment: n } sayaç artırır, diğerleri olduğu gibi yazılır.
  function apply(oldData, newData) {
    const result = { ...oldData };
    for (const [key, value] of Object.entries(newData)) {
      result[key] = value && value.__increment !== undefined ? (result[key] || 0) + value.__increment : value;
    }
    return result;
  }

  function docRef(path) {
    return {
      path,
      id: path.split('/')[1],
      async get() {
        return snapshot(path);
      },
      async set(data) {
        if (failWritesTo && path.startsWith(`${failWritesTo}/`)) throw new Error('Sahte yazma hatası');
        docs.set(path, apply({}, data));
      },
    };
  }

  // where(alan, '==', değer) zincirini taklit eder; yalnızca eşitlik filtresi desteklenir.
  function query(name, filters) {
    return {
      where: (field, op, value) => query(name, [...filters, { field, value }]),
      async get() {
        const result = [];
        for (const [path, data] of docs) {
          const [col, id] = path.split('/');
          if (col !== name) continue;
          if (filters.every((f) => data[f.field] === f.value)) result.push({ id, data: () => data });
        }
        return { docs: result };
      },
    };
  }

  function snapshot(path) {
    const data = docs.get(path);
    return { exists: data !== undefined, data: () => data };
  }

  return {
    docs,
    collection(name) {
      return {
        doc: (id) => docRef(`${name}/${id ?? `oto${++autoId}`}`),
        where: (field, op, value) => query(name, [{ field, value }]),
      };
    },
    async runTransaction(fn) {
      const tx = {
        get: async (ref) => snapshot(ref.path),
        set: (ref, data) => docs.set(ref.path, apply({}, data)),
        update: (ref, data) => docs.set(ref.path, apply(docs.get(ref.path), data)),
      };
      return fn(tx);
    },
  };
}

// Sahte istek nesnesi.
export function createReq({ method = 'GET', body, headers = {} } = {}) {
  return { method, body, headers };
}

// Sahte yanıt nesnesi: status ve json çağrılarını kaydeder.
export function createRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.body = data;
      return res;
    },
    setHeader(name, value) {
      res.headers[name] = value;
    },
  };
  return res;
}
