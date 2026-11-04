// 사진 앨범: 찍은 사진을 이 기기 브라우저 안(IndexedDB)에만 모아요. 서버로 보내지 않아요.
// (캠핑장 js/album.js 와 같은 방식) 동물마다 최고 사진은 'best-<동물 id>' 로 따로 보관해요.
const DB = 'snapzoo-album', STORE = 'photos', MAX = 80;

let dbp = null;
function open() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return dbp;
}
function tx(mode, fn) {
  return open().then((db) => new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), st = t.objectStore(STORE);
    const out = fn(st);
    t.oncomplete = () => res(out?.result ?? out);
    t.onerror = () => rej(t.error);
  }));
}

export async function addPhoto(rec) {
  try {
    const id = rec.id || `${Date.now()}`;
    await tx('readwrite', (st) => st.put({ ...rec, id, at: Date.now() }));
    if (!id.startsWith('best-')) {
      const all = (await listPhotos()).filter((p) => !p.id.startsWith('best-'));
      if (all.length > MAX) await Promise.all(all.slice(MAX).map((p) => removePhoto(p.id)));
    }
    return true;
  } catch { return false; }
}
export async function getPhoto(id) {
  try { return await tx('readonly', (st) => st.get(id)); } catch { return null; }
}
export async function listPhotos() {
  try { const all = await tx('readonly', (st) => st.getAll()); return (all || []).sort((a, b) => b.at - a.at); } catch { return []; }
}
export function removePhoto(id) { return tx('readwrite', (st) => st.delete(id)).catch(() => {}); }
