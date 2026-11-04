// 기록: 이 기기 브라우저(localStorage)에만 저장해요. 서버로 보내지 않아요.
import { ANIMALS, CAMERAS, DAILY_SECONDS, NAME_A, NAME_B, PER_SEC_BASE } from './data.js';

const KEY = 'snapzoo.v1';

const fresh = () => ({
  name: '',
  coins: 0,
  dex: {},            // id -> { score, stars, shots, at }
  tickets: {},        // bus, boat
  cameras: { copper: true },
  camera: 'copper',
  looks: { hair: { short: true }, outfit: { explorer: true }, item: {} },
  wear: { hair: 'short', outfit: 'explorer', item: [] },
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
      base.looks = { hair: { short: true, ...s.looks?.hair }, outfit: { explorer: true, ...s.looks?.outfit }, item: { ...s.looks?.item } };
      base.wear = { ...fresh().wear, ...s.wear };
      if (!Array.isArray(base.wear.item)) base.wear.item = [];
    }
  } catch { /* 처음 시작 */ }
  rollDay(base);
  return base;
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
export const perSec = () => PER_SEC_BASE + dexCount();
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
