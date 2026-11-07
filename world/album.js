// 섬 사진 앨범: 찍은 사진(폴라로이드)을 이 기기 브라우저 안(IndexedDB)에만 모아요. 서버로 보내지 않아요.
// (kids/js/album.js 와 같은 방식, 저장소 이름만 따로)
const DB = 'snapzoo-island-album', STORE = 'photos', MAX = 80;

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
    t.onabort = () => rej(t.error || new Error('저장이 취소됐어요'));   // 사파리는 onerror 없이 취소만 될 때가 있어요
  }));
}

// 사파리가 사진 파일(Blob) 저장을 거절할 때가 있어서 숫자 묶음(ArrayBuffer)으로 바꿔 넣어요. 꺼낼 때 다시 사진 파일로 (예전 사진은 그대로)
const pack = async (r) => { if (!r.blob) return r; const { blob, ...o } = r; return { ...o, buf: await blob.arrayBuffer(), type: blob.type }; };
const unpack = (r) => (r && r.buf ? { ...r, blob: new Blob([r.buf], { type: r.type || 'image/jpeg' }) } : r);
const inTime = (p) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('저장이 너무 오래 걸려요')), 6000))]);

export async function addPhoto(rec) {
  try {
    const id = rec.id || `${Date.now()}`, data = await pack(rec);
    await inTime(tx('readwrite', (st) => st.put({ ...data, id, at: Date.now() })));
    if (!id.startsWith('best-')) {
      const all = (await listPhotos()).filter((p) => !p.id.startsWith('best-'));
      if (all.length > MAX) await Promise.all(all.slice(MAX).map((p) => removePhoto(p.id)));
    }
    return true;
  } catch { return false; }
}
export async function getPhoto(id) {
  try { return unpack(await tx('readonly', (st) => st.get(id))); } catch { return null; }
}
export async function listPhotos() {
  try { const all = await tx('readonly', (st) => st.getAll()); return (all || []).map(unpack).sort((a, b) => b.at - a.at); } catch { return []; }
}
export function removePhoto(id) { return tx('readwrite', (st) => st.delete(id)).catch(() => {}); }
