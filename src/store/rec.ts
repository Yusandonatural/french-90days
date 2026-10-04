// Self-introduction recordings (Day 0 / Day 90) in IndexedDB.
const DB = 'trois-formes-rec', STORE = 'rec';

function idb() {
  return new Promise<IDBDatabase>((res, rej) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
}
export async function recPut(k: 'day0' | 'day90', blob: Blob) {
  try {
    const db = await idb();
    await new Promise((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(blob, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  } catch { /* storage unavailable */ }
}
export async function recGet(k: 'day0' | 'day90'): Promise<Blob | null> {
  try {
    const db = await idb();
    return await new Promise(res => { const q = db.transaction(STORE).objectStore(STORE).get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); });
  } catch { return null; }
}
