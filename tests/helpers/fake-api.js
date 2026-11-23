// Test yardımcıları: sahte Firestore ve sahte HTTP istek/yanıt nesneleri.
// Gerçek veritabanına bağlanmadan uç noktaları denemek için kullanılır.

// Bellekte çalışan, yalnızca bizim kullandığımız işlemleri taklit eden Firestore.
// Belgeler "koleksiyon/belge" anahtarıyla bir Map'te tutulur.
export function createFakeDb(initialDocs = {}) {
  const docs = new Map(Object.entries(initialDocs));

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
      async get() {
        return snapshot(path);
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
      return { doc: (id) => docRef(`${name}/${id}`) };
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
