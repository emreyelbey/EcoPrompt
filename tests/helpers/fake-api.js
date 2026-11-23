// Test yardımcıları: sahte Firestore ve sahte HTTP istek/yanıt nesneleri.
// Gerçek veritabanına bağlanmadan uç noktaları denemek için kullanılır.

// Bellekte çalışan, yalnızca bizim kullandığımız işlemleri taklit eden Firestore.
// Belgeler "koleksiyon/belge" anahtarıyla bir Map'te tutulur.
// Seçenek: failWritesTo = 'interactions' verilirse o koleksiyona yazma hata fırlatır
// (kayıt yazılamadığında uç noktanın davranışını denemek için).
export function createFakeDb(initialDocs = {}, { failWritesTo } = {}) {
  const docs = new Map(Object.entries(initialDocs));
  let autoId = 0; // doc() kimliksiz çağrılınca verilecek sıra numarası
  const selectCalls = [];

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
      // { merge: true } verilirse eski alanlar korunur (Firestore'daki gibi).
      async set(data, options = {}) {
        if (failWritesTo && path.startsWith(`${failWritesTo}/`)) throw new Error('Sahte yazma hatası');
        docs.set(path, apply(options.merge ? docs.get(path) || {} : {}, data));
      },
      async delete() {
        docs.delete(path);
      },
    };
  }

  // Alan değerini okur; '__name__' belge kimliği demektir (documentIdField taklidi).
  function fieldValue(id, data, field) {
    return field === '__name__' ? id : data[field];
  }

  // Sorgu zincirini taklit eder: where ('==', '>='), orderBy (artan), startAfter, select, limit, count.
  // Zaman damgaları testlerde düz sayıdır.
  function query(name, state = { filters: [], orders: [], after: null, fields: null, max: null }) {
    const next = (change) => query(name, { ...state, ...change });
    async function run() {
      let result = [];
      for (const [path, data] of docs) {
        const [col, id] = path.split('/');
        if (col !== name) continue;
        const ok = state.filters.every((f) => {
          const v = fieldValue(id, data, f.field);
          if (f.op === '>=') return v !== undefined && v !== null && v >= f.value;
          return v === f.value;
        });
        // Firestore'da orderBy edilen alanı olmayan belge sonuçta yer almaz.
        if (ok && state.orders.every((o) => fieldValue(id, data, o) !== undefined)) result.push({ id, path, data });
      }
      const compare = (a, b) => {
        for (const o of state.orders) {
          const x = fieldValue(a.id, a.data, o);
          const y = fieldValue(b.id, b.data, o);
          if (x < y) return -1;
          if (x > y) return 1;
        }
        return 0;
      };
      if (state.orders.length > 0) result.sort(compare);
      if (state.after) {
        const cursor = { id: null, data: {} };
        state.orders.forEach((o, i) => {
          if (o === '__name__') cursor.id = state.after[i];
          else cursor.data[o] = state.after[i];
        });
        result = result.filter((r) => compare(r, cursor) > 0);
      }
      if (state.max !== null) result = result.slice(0, state.max);
      return result;
    }
    return {
      where: (field, op, value) => next({ filters: [...state.filters, { field, op, value }] }),
      orderBy: (field) => next({ orders: [...state.orders, field] }),
      startAfter: (...values) => next({ after: values }),
      select: (...fields) => next({ fields }),
      limit: (n) => next({ max: n }),
      count: () => ({
        async get() {
          const all = await run();
          return { data: () => ({ count: all.length }) };
        },
      }),
      async get() {
        const all = await run();
        selectCalls.push({ collection: name, fields: state.fields });
        return {
          docs: all.map((r) => ({
            id: r.id,
            ref: docRef(r.path),
            // select() verildiyse yalnızca o alanlar döner (Firestore'daki gibi).
            data: () =>
              state.fields ? Object.fromEntries(state.fields.filter((f) => f in r.data).map((f) => [f, r.data[f]])) : r.data,
          })),
        };
      },
    };
  }

  function snapshot(path) {
    const data = docs.get(path);
    return { exists: data !== undefined, data: () => data };
  }

  return {
    docs,
    selectCalls, // Hangi sorguda hangi alanların istendiği (testler response/engineVersion okunmadığını denetler)
    collection(name) {
      const base = query(name);
      return {
        ...base,
        doc: (id) => docRef(`${name}/${id ?? `oto${++autoId}`}`),
      };
    },
    batch() {
      const ops = [];
      return {
        delete: (ref) => ops.push(ref.path),
        async commit() {
          for (const path of ops) docs.delete(path);
        },
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
export function createReq({ method = 'GET', body, headers = {}, query = {} } = {}) {
  return { method, body, headers, query };
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
