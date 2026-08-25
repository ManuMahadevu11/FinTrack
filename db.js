// ===================== INDEXEDDB MODULE =====================
const DB_NAME    = 'FinanceTrackerDB';
const DB_VERSION = 2;                  // bumped: adds transactions store
const STORE_MONTHS = 'months';
const STORE_TX     = 'transactions';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_MONTHS)) {
        db.createObjectStore(STORE_MONTHS, { keyPath: 'month' });
      }
      if (!db.objectStoreNames.contains(STORE_TX)) {
        const txStore = db.createObjectStore(STORE_TX, { keyPath: 'id' });
        txStore.createIndex('month', 'month', { unique: false });
        txStore.createIndex('date',  'date',  { unique: false });
      }
    };
  });
}

// ─── Month data ───────────────────────────────────────────────────────────────
async function saveMonthData(month, data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_MONTHS, 'readwrite');
      const req = tx.objectStore(STORE_MONTHS).put({ month, data, updated: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror  = () => reject(req.error);
    });
  } catch (e) {
    console.warn('IDB unavailable, using localStorage:', e);
    const all = JSON.parse(localStorage.getItem('financeTrackerData') || '{}');
    all[month] = data;
    localStorage.setItem('financeTrackerData', JSON.stringify(all));
  }
}

async function loadAllData() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx  = db.transaction(STORE_MONTHS, 'readonly');
      const req = tx.objectStore(STORE_MONTHS).getAll();
      req.onsuccess = () => {
        const result = {};
        req.result.forEach(r => result[r.month] = r.data);
        resolve(result);
      };
      req.onerror = () => resolve({});
    });
  } catch (e) {
    return JSON.parse(localStorage.getItem('financeTrackerData') || '{}');
  }
}

// ─── Transaction CRUD ─────────────────────────────────────────────────────────
/**
 * Add or overwrite a transaction (upsert by id).
 * @param {{ id, month, date, amount, category, note, createdAt }} tx
 */
async function addTransaction(tx) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t   = db.transaction(STORE_TX, 'readwrite');
      const req = t.objectStore(STORE_TX).put(tx);
      req.onsuccess = () => resolve();
      req.onerror  = () => reject(req.error);
    });
  } catch (e) {
    _lsTxUpsert(tx);
  }
}

/**
 * Returns all transactions for a month, sorted newest-first.
 */
async function getMonthTransactions(month) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const t   = db.transaction(STORE_TX, 'readonly');
      const idx = t.objectStore(STORE_TX).index('month');
      const req = idx.getAll(month);
      req.onsuccess = () => resolve(_sortTx(req.result));
      req.onerror  = () => resolve([]);
    });
  } catch (e) {
    return _sortTx(_lsTxAll().filter(t => t.month === month));
  }
}

/**
 * Returns ALL transactions across all months.
 */
async function getAllTransactions() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const t   = db.transaction(STORE_TX, 'readonly');
      const req = t.objectStore(STORE_TX).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror  = () => resolve([]);
    });
  } catch (e) {
    return _lsTxAll();
  }
}

/**
 * Merge `changes` into an existing transaction by id.
 */
async function updateTransaction(id, changes) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t     = db.transaction(STORE_TX, 'readwrite');
      const store = t.objectStore(STORE_TX);
      const get   = store.get(id);
      get.onsuccess = () => {
        const updated = { ...get.result, ...changes };
        store.put(updated).onsuccess = () => resolve();
      };
      get.onerror = () => reject(get.error);
    });
  } catch (e) {
    const all = _lsTxAll();
    const idx = all.findIndex(t => t.id === id);
    if (idx >= 0) { all[idx] = { ...all[idx], ...changes }; _lsTxSave(all); }
  }
}

/**
 * Delete a transaction by id.
 */
async function deleteTransaction(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t   = db.transaction(STORE_TX, 'readwrite');
      const req = t.objectStore(STORE_TX).delete(id);
      req.onsuccess = () => resolve();
      req.onerror  = () => reject(req.error);
    });
  } catch (e) {
    _lsTxSave(_lsTxAll().filter(t => t.id !== id));
  }
}

// ─── Clear everything ─────────────────────────────────────────────────────────
async function clearDB() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const t  = db.transaction([STORE_MONTHS, STORE_TX], 'readwrite');
      let done = 0;
      const onDone = () => { if (++done === 2) resolve(); };
      t.objectStore(STORE_MONTHS).clear().onsuccess = onDone;
      t.objectStore(STORE_TX).clear().onsuccess     = onDone;
    });
  } catch (e) {
    localStorage.removeItem('financeTrackerData');
    localStorage.removeItem('financeTrackerTx');
  }
}

// ─── localStorage helpers (private) ─────────────────────────────────────────
function _lsTxAll()       { return JSON.parse(localStorage.getItem('financeTrackerTx') || '[]'); }
function _lsTxSave(arr)   { localStorage.setItem('financeTrackerTx', JSON.stringify(arr)); }
function _lsTxUpsert(tx)  {
  const all = _lsTxAll();
  const idx = all.findIndex(t => t.id === tx.id);
  if (idx >= 0) all[idx] = tx; else all.push(tx);
  _lsTxSave(all);
}
function _sortTx(arr) {
  return arr.slice().sort((a, b) =>
    b.date.localeCompare(a.date) || b.createdAt - a.createdAt
  );
}
