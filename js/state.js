// 기록: 이 기기 브라우저(localStorage)에만 저장해요. 서버로 보내지 않아요.
import { ANIMALS, CAMERAS, DAILY_SECONDS, NAME_A, NAME_B, PER_SEC_BASE, LOOKS, BODIES } from './data.js';

const KEY = 'snapzoo.v1';

const fresh = () => ({
  name: '',
  coins: 0,
  dex: {},            // id -> { score, stars, shots, at }
  tickets: {},        // bus, boat
  cameras: { copper: true },
  camera: 'copper',
  looks: { hair: {}, outfit: {}, item: {} },   // 상점에서 산 것 (값 0 인 기본은 늘 가진 걸로 봐요)
  wear: null,          // { body, gender, hair, outfit, item: [] } — 처음이면 아래 firstWear()
  day: '',            // 오늘 날짜 (밤 12시에 초당 시간이 다시 55분)
  usedSec: 0,         // 오늘 초당 포인트를 받은 시간(초)
  zone: 'station',
});

export const S = load();

function load() {
  const base = fresh();
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') {
      Object.assign(base, s);
      base.cameras = { copper: true, ...s.cameras };
      base.looks = { hair: { ...s.looks?.hair }, outfit: { ...s.looks?.outfit }, item: { ...s.looks?.item } };
      base.wear = s.wear && typeof s.wear === 'object' ? { ...firstWear(), ...s.wear } : null;
    }
  } catch { /* 처음 시작 */ }
  if (!base.wear) base.wear = firstWear();
  fixWear(base);
  rollDay(base);
  return base;
}

// 처음 온 아이: 몸 · 성별 · 기본 옷을 골고루 무작위로 (창을 띄우지 않고 바로 시작, 언제든 바꿔요)
function firstWear() {
  const p = (a) => a[Math.floor(Math.random() * a.length)];
  const gender = Math.random() < 0.5 ? 'm' : 'f';
  return { body: p(BODIES).id, gender, hair: gender === 'm' ? 'short' : 'long', outfit: p(LOOKS.outfit.filter((o) => o.price === 0)).id, item: [] };
}
export function owns(tab, id, s = S) { return !!LOOKS[tab].find((x) => x.id === id && (x.price === 0 || s.looks[tab]?.[id])); }
// 없어진 옷이나 안 가진 것을 입고 있으면 기본으로 돌려요 (예전 기록 정리)
function fixWear(s) {
  const w = s.wear;
  if (!BODIES.some((b) => b.id === w.body)) w.body = 'block';
  if (w.gender !== 'm' && w.gender !== 'f') w.gender = 'm';
  if (!owns('hair', w.hair, s)) w.hair = w.gender === 'm' ? 'short' : 'long';
  if (!owns('outfit', w.outfit, s)) w.outfit = 'explorer';
  w.item = Array.isArray(w.item) ? w.item.filter((i) => owns('item', i, s)) : [];
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 저장 공간이 꽉 찬 경우 */ }
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function rollDay(s) {
  const t = today();
  if (s.day !== t) { s.day = t; s.usedSec = 0; }
}

export const dexCount = () => Object.keys(S.dex).length;
export const perSec = () => PER_SEC_BASE;   // 도감과 상관없이 모두 똑같이
export const secLeft = () => { rollDay(S); return Math.max(0, DAILY_SECONDS - S.usedSec); };
export const camera = () => CAMERAS.find((c) => c.id === S.camera) || CAMERAS[0];

// 1초가 지날 때마다 부르면 초당 포인트를 더하고 더한 만큼 돌려줘요
export function tickSecond() {
  if (secLeft() <= 0) return 0;
  S.usedSec += 1;
  const n = perSec();
  S.coins += n;
  return n;
}

// '000 00' 모양의 정해진 낱말 조합인지 (예전 이름이면 새로 받아요)
export const validName = (n) => typeof n === 'string' && NAME_A.some((a) => NAME_B.some((b) => n === `${a} ${b}`));
export function randomName() {
  const p = (a) => a[Math.floor(Math.random() * a.length)];
  return `${p(NAME_A)} ${p(NAME_B)}`;
}

export const animalById = (id) => ANIMALS.find((a) => a.id === id);
