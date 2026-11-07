// 스냅주 · 높은 산과 강 (지도 시안 E, 2026-11-05)
// 640 m 섬 하나: 가운데 큰 산 꼭대기 = 북극 눈밭, 산허리 = 정글, 아래 들 = 초원, 산 동쪽 비 그늘 = 사막, 남서쪽 강 하구 = 바다.
// 강이 산꼭대기 아래에서 굽이쳐 바다로. 강가 마을에서 시작 → 누른 곳 · 방향키로 걷기, 🚡 케이블카로 산꼭대기까지.
// 그림 느낌: ③ 극장판 부드러운 3D (2026-11-05 결정) — 매끈한 면 · 노을빛 역광 · 부드러운 그림자 · 안개.
// 동물 · 산책자 · 재질은 zoo3d.js (시안 docs/시안/메타버스3D시안.html 과 같은 코드). 무거운 판이라 휴대폰에서는 그림자 · 풀 · 해상도를 줄여요.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ICON, BADGE_ICON, lookIcon, hairIcon } from './icons.js?v=20261107n';
import { addPhoto, listPhotos, removePhoto, getPhoto } from './album.js?v=20261107n';
import { IslandNet, myName, myLook, setMyName, NAME_A, NAME_B } from './net.js?v=20261107n';
import { IslandSound } from './sound.js?v=20261107n';
import { ROSTER } from './fauna.js?v=20261107n';
import { DEX_PHOTOS } from './dexphotos.js?v=20261107n';   // 구역마다 10종 (zoo3d.js 의 SPECIES 에 더해져요)
import { person as makeWalker, BODIES, START_BODY, CAMERAS, HAIRS, ACCS } from './person.js?v=20261107n';
import { HATS, LOOKS, plain, SPECIES as ZOO, skyDome, cloudTex, LOOK, acaciaGeos, NOISE } from './zoo3d.js?v=20261107n';
const LK = LOOK.soft, SUN_DIR = new THREE.Vector3(0.7, 0.42, -0.58).normalize();   // 해 질 녘보다 조금 높은 해 (그림자가 너무 길지 않게)

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
const IPAD = /iPad|Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;   // 키보드 · 트랙패드를 붙인 아이패드도 가볍게
const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 700 || IPAD;
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ───────── 땅 높이 ─────────
// 값 노이즈 (그림 파일 없이 코드로 울퉁불퉁)
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(hash(xi, zi), hash(xi + 1, zi), u), lerp(hash(xi, zi + 1), hash(xi + 1, zi + 1), u), v) * 2 - 1;
}
const fbm = (x, z) => noise(x, z) * 0.55 + noise(x * 2.1, z * 2.1) * 0.28 + noise(x * 4.3, z * 4.3) * 0.17;

const PEAK = { x: 0, z: -140 };
const ISLE = { x: -225, z: 250, r: 52 };
const isleD = (x, z) => Math.hypot(x - ISLE.x, z - ISLE.z);
// 강: 산꼭대기 아래 샘에서 남서쪽 바다까지
const RIVER = new THREE.CatmullRomCurve3([
  [-14, -112], [-34, -70], [6, -22], [-26, 34], [12, 86], [-24, 138], [-72, 184], [-122, 222], [-176, 252], [-220, 276],
].map(([x, z]) => new THREE.Vector3(x, 0, z)));
const RS = RIVER.getSpacedPoints(420);
// 강까지 거리: 20 m 칸마다 가까운 강 점만 모아 두고 찾아요 (땅 10만 점을 빠르게)
const CELL = 20, buckets = new Map();
RS.forEach((p, i) => { for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const k = `${Math.floor(p.x / CELL) + dx},${Math.floor(p.z / CELL) + dz}`; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(i); } });
function riverNear(x, z) {
  const list = buckets.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`);
  if (!list) return { d: 99, i: -1 };
  let d = 99, bi = -1;
  for (const i of list) { const p = RS[i], dd = Math.hypot(p.x - x, p.z - z); if (dd < d) { d = dd; bi = i; } }
  return { d, i: bi };
}
const riverW = (i) => lerp(5, 15, i / RS.length);   // 아래로 갈수록 넓게

function rawH(x, z) {
  const dx = x - PEAK.x, dz = z - PEAK.z, r2 = dx * dx + dz * dz;
  let h = 150 * Math.exp(-r2 / (112 * 112)) + 30 * Math.exp(-r2 / (232 * 232));
  h += 16 * fbm(x * 0.018, z * 0.018) * Math.exp(-r2 / (210 * 210));          // 산 능선
  h += 5 * fbm(x * 0.008 + 10, z * 0.008 - 4) + 3;                              // 들판 굴곡
  const de = smooth(95, 175, x);
  h += de * (2.4 * Math.sin(x * 0.09 + z * 0.04) + 1.6 * Math.sin(x * 0.05 - z * 0.07));   // 사막 모래 언덕
  h -= smooth(250, 318, Math.hypot(x, z * 0.95)) * 42;                          // 섬 가장자리
  h -= smooth(165, 250, z - 0.6 * x) * 32;                                      // 남서쪽 바다 · 강 하구
  return isleShape(x, z, terrace(h));
}
// 🏝 갈라파고스 같은 섬: 남서쪽 먼바다. 가운데 작은 화산, 둘레는 완만한 바닷가와 얕은 바다
function isleShape(x, z, t) {
  const d = Math.hypot(x - ISLE.x, z - ISLE.z), R = ISLE.r; if (d > R + 62) return t;
  const land = 5 + 2.2 * fbm(x * 0.03, z * 0.03) + 15 * smooth(36, 4, d);
  const prof = d < R ? land : d < R + 12 ? lerp(land, -1, (d - R) / 12) : d < R + 32 ? lerp(-1, -8, (d - R - 12) / 20) : -8;
  return lerp(t, prof, smooth(R + 60, R + 32, d));
}
// 산을 계단처럼: 높이 30 까지는 그대로, 정글은 완만한 평지(30~44), 짧은 비탈을 오르면 꼭대기 눈밭 평지(108~114)
function terrace(h) {
  if (h <= 30) return h;
  return 30 + 10 * smooth(30, 56, h) + 4 * smooth(56, 88, h) + 64 * smooth(88, 124, h) + 6 * smooth(124, 195, h);
}
function height(x, z) {
  let h = rawH(x, z);
  const { d, i } = riverNear(x, z);
  if (i >= 0) { const w = riverW(i); h -= (1 - smooth(w * 0.35, w * 1.1, d)) * 3.6; }   // 강 바닥 파기
  return h;
}

// ───────── 구역 ─────────
const ZONES = {
  arctic: ['북극 · 산꼭대기 눈밭', '펭귄과 북극곰이 사는 하얀 꼭대기예요'],
  jungle: ['정글 · 안개 낀 산허리', '빽빽한 숲, 안개가 내려앉아요'],
  savanna: ['초원 · 넓은 들', '코끼리 · 기린 · 얼룩말이 풀을 뜯어요'],
  desert: ['사막 · 비 그늘 쪽', '산이 비를 막아 메마른 모래 언덕이에요'],
  sea: ['바다 · 강 하구', '강물이 바다와 만나요. 돌고래가 뛰어요'],
  isle: ['갈라파고스 섬', '거북 · 이구아나 · 푸른발부비새가 사는 화산섬이에요'],
  home: ['우리 집', '침대 · 소파 · 책장을 써 보세요'],
  village: ['강가 마을', '강을 따라 올라가면 산꼭대기 눈밭이에요'],
};
function zoneAt(x, z, y = height(x, z)) {
  if (y < 1.2) return 'sea';
  if (isleD(x, z) < ISLE.r + 16) return 'isle';
  if (y > 100) return 'arctic';
  if (x > 112 + 14 * fbm(z * 0.02, 1.7)) return 'desert';
  if (y > 30 + 6 * fbm(x * 0.03, z * 0.03)) return 'jungle';
  return 'savanna';
}

// ───────── 장면 ─────────
const canvas = $('#gl');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: 'high-performance' }); }
catch (e) { $('#loading').innerHTML = '<b>Snapzoo</b><span>이 기기 · 브라우저에서는 3D 섬을 그릴 수 없어요.<br>크롬 · 사파리 · 엣지 최신판에서, 또는 설정의 ‘하드웨어 가속’을 켜고 다시 들어와 주세요.</span>'; throw e; }
// ⚙ 그래픽: 휴대폰은 처음부터 '가볍게'(해상도 1배 · 그림자 작게 · 풀 · 동물 보이는 거리 줄임). 설정에서 바꾸면 다시 불러와요
const LOWQ = (() => { try { const v = JSON.parse(localStorage.getItem('snapzoo-island-settings') || '{}').lowq; return v === undefined ? MOBILE : !!v; } catch { return MOBILE; } })();
renderer.setPixelRatio(LOWQ ? 1 : Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = LK.exp;
const scene = new THREE.Scene();
const FOG = new THREE.Color(LK.fog);
scene.fog = new THREE.Fog(FOG, 120, 720);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2600);

// 하늘: 위는 푸른 저녁빛, 지평선은 금빛, 해 둘레가 환하게
const sky = skyDome(LK.top, LK.mid, LK.hor, SUN_DIR, LK.glow); sky.scale.setScalar(1.3); scene.add(sky);
const hemi = new THREE.HemisphereLight(LK.hemi[0], LK.hemi[1], LK.hemi[2] * 1.4); scene.add(hemi);   // 역광이어도 동물 얼굴이 보이게
const sun = new THREE.DirectionalLight(LK.sunC, LK.sunI);
sun.castShadow = true;
sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 400 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
// 높은 구름 (노을빛 솜구름)
const clouds = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + rnd() * 0.4, d = 900 + rnd() * 400; const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex(['#fff1dc', '#c89a8a', '#ffe0c4'], i * 7 + 1, 8), fog: false, depthWrite: false, transparent: true, opacity: 0.85 })); c.position.set(Math.sin(a) * d, 230 + rnd() * 160, Math.cos(a) * d); c.scale.set(380, 190, 1); scene.add(c); clouds.push(c); }

// 재질: 매끈한 면 (③). toon() 이름은 그대로 두고 속은 부드러운 재질
const toon = (color, extra = {}) => plain(color, extra);

// ───────── 땅 ─────────
const SIZE = 680, SEG = MOBILE ? 220 : 320;
const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
tg.rotateX(-Math.PI / 2);
const pos = tg.attributes.position, col = new Float32Array(pos.count * 3);
const C = {
  snow: new THREE.Color('#f6f4f2'), rock: new THREE.Color('#9a9088'), jungle: new THREE.Color('#5a7e34'), jungle2: new THREE.Color('#47702e'),
  savanna: new THREE.Color('#c8aa5a'), savanna2: new THREE.Color('#a4a648'), desert: new THREE.Color('#e2b679'), desert2: new THREE.Color('#d39c62'),
  sand: new THREE.Color('#e9dcae'), seabed: new THREE.Color('#5aa0b8'), bank: new THREE.Color('#6f9a4a'),
};
const tmp = new THREE.Color();
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), z = pos.getZ(i), y = height(x, z);
  pos.setY(i, y);
  const n = fbm(x * 0.05, z * 0.05) * 0.5 + 0.5, zn = zoneAt(x, z, y);
  if (y < 0) tmp.copy(C.seabed).lerp(C.sand, smooth(-8, 0, y));
  else if (y < 2.6) tmp.copy(C.sand);
  else if (zn === 'isle') tmp.set('#6f8a4a').lerp(C.jungle2, n * 0.5).lerp(new THREE.Color('#4a4644'), smooth(9, 18, y));
  else if (zn === 'arctic') tmp.copy(C.rock).lerp(C.snow, smooth(96, 106, y + n * 6));
  else if (zn === 'jungle') tmp.copy(C.jungle).lerp(C.jungle2, n).lerp(C.rock, smooth(84, 100, y) * 0.8);
  else if (zn === 'desert') tmp.copy(C.desert).lerp(C.desert2, n).lerp(C.rock, smooth(70, 100, y) * 0.6);
  else tmp.copy(C.savanna).lerp(C.savanna2, n);
  const { d, i: ri } = riverNear(x, z);
  if (ri >= 0 && y > 2.6 && zn !== 'arctic') tmp.lerp(C.bank, (1 - smooth(riverW(ri) * 0.9, riverW(ri) * 2.2, d)) * 0.7);   // 강둑은 푸르게
  col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
}
tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
tg.computeVertexNormals();
const ground = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
ground.receiveShadow = true;
scene.add(ground);

// ───────── 바다 (출렁) ─────────
const wg = new THREE.PlaneGeometry(2400, 2400, 90, 90); wg.rotateX(-Math.PI / 2);
const sea = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: '#5a92b0', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.9 }));
sea.position.y = 0;
scene.add(sea);
const seaBase = Float32Array.from(wg.attributes.position.array);

// ───────── 강 (흐르는 물결) ─────────
const flowC = document.createElement('canvas'); flowC.width = 64; flowC.height = 256;
{ const g = flowC.getContext('2d'); g.fillStyle = '#4f9fd0'; g.fillRect(0, 0, 64, 256); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 3; for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(8 + (y % 64) / 4, y); g.quadraticCurveTo(32, y + 10, 56 - (y % 64) / 4, y + 4); g.stroke(); } }
const flowT = new THREE.CanvasTexture(flowC); flowT.wrapS = flowT.wrapT = THREE.RepeatWrapping; flowT.colorSpace = THREE.SRGBColorSpace;
{
  const vs = [], uvs = [], idx = [];
  RS.forEach((p, i) => {
    const t = RIVER.getTangentAt(i / (RS.length - 1)), nx = -t.z, nz = t.x, w = riverW(i) * 0.62;
    const y = Math.max(height(p.x, p.z) + 1.0, 0.25);
    vs.push(p.x + nx * w, y, p.z + nz * w, p.x - nx * w, y, p.z - nz * w);
    uvs.push(0, i / 6, 1, i / 6);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(vs, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); rg.setIndex(idx); rg.computeVertexNormals();
  const river = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: flowT, roughness: 0.3, transparent: true, opacity: 0.92, side: THREE.DoubleSide }));
  river.receiveShadow = true;
  scene.add(river);
}

// ───────── 강가 마을 · 케이블카 자리 (나무를 심기 전에 먼저 정해 비워 둬요) ─────────
const VIL = (() => { const p = RIVER.getPointAt(0.56), t = RIVER.getTangentAt(0.56); return new THREE.Vector3(p.x - t.z * 26, 0, p.z + t.x * 26); })();
VIL.y = height(VIL.x, VIL.z);
const STA = new THREE.Vector3(VIL.x + 22, 0, VIL.z - 10); STA.y = height(STA.x, STA.z);
const TOPS = new THREE.Vector3(PEAK.x + 8, 0, PEAK.z + 14); TOPS.y = height(TOPS.x, TOPS.z);
const clearAt = (x, z) => Math.hypot(x - VIL.x, z - VIL.z) > 30 && Math.hypot(x - STA.x, z - STA.z) > 8 && Math.hypot(x - TOPS.x, z - TOPS.z) > 10;

// ───────── 나무 · 바위 (한 번에 많이: InstancedMesh) ─────────
function findSpot(zone, test = () => true, tries = 400) {
  for (let k = 0; k < tries; k++) {
    const x = (rnd() - 0.5) * 620, z = (rnd() - 0.5) * 620, y = height(x, z);
    if (y > 2.8 && zoneAt(x, z, y) === zone && riverNear(x, z).d > 10 && clearAt(x, z) && test(x, z, y)) return new THREE.Vector3(x, y, z);
  }
  return null;
}
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), SC = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
// parts: [geometry, material, offsetY, scale(x,y,z)] 같은 자리에 여러 부품을 겹쳐 하나의 나무로
// 🚧 사진을 가리는 것: 집 · 나무 잎 · 바위 등을 공 모양으로 모아 둬요 (10 m 칸). 뒤에 가려진 동물은 안 찍혀요
const OCC = new Map(), OC = 10;
function addOcc(x, y, z, r) { const a = Math.floor((x - r) / OC), b = Math.floor((x + r) / OC), c = Math.floor((z - r) / OC), d = Math.floor((z + r) / OC); for (let i = a; i <= b; i++) for (let j = c; j <= d; j++) { const k = i + ',' + j; if (!OCC.has(k)) OCC.set(k, []); OCC.get(k).push([x, y, z, r * r]); } }
function occAt(x, y, z) { const L = OCC.get(Math.floor(x / OC) + ',' + Math.floor(z / OC)); if (L) for (const o of L) { const a = x - o[0], b = y - o[1], c = z - o[2]; if (a * a + b * b + c * c < o[3]) return true; } return false; }
function scatter(zone, n, parts, sMin = 0.8, sMax = 1.3, test) {
  const spots = []; for (let i = 0; i < n; i++) { const p = findSpot(zone, test); if (p) spots.push([p, sMin + rnd() * (sMax - sMin), rnd() * Math.PI * 2]); }
  for (const [geo, mat, oy, sx = 1, sy = 1, sz = 1] of parts) {
    const im = new THREE.InstancedMesh(geo, mat, spots.length);
    spots.forEach(([p, s, r], i) => { Q.setFromAxisAngle(UP, r); M4.compose(V.set(p.x, p.y + oy * s, p.z), Q, SC.set(sx * s, sy * s, sz * s)); im.setMatrixAt(i, M4); });
    im.castShadow = true; im.receiveShadow = true; scene.add(im); (spots.ims ||= []).push(im);
    // 가늘고 긴 줄기는 빼고, 잎 · 덤불 · 바위만 가림으로 쳐요
    if (!geo.boundingSphere) geo.computeBoundingSphere(); const bs = geo.boundingSphere, thin = geo.type === 'CylinderGeometry' && geo.parameters.radiusBottom < 0.6, rr = bs.radius * (sx + sy + sz) / 3 * 0.8;
    if (!thin && rr >= 0.5) spots.forEach(([p, s2]) => addOcc(p.x + bs.center.x * s2, p.y + (oy + bs.center.y) * s2, p.z + bs.center.z * s2, rr * s2));
  }
  return spots;
}
const trunkM = new THREE.MeshStandardMaterial({ color: '#6a5038', roughness: 0.85 }), leafJ = new THREE.MeshStandardMaterial({ color: '#4a7a30', roughness: 0.8 }), leafJ2 = new THREE.MeshStandardMaterial({ color: '#5f8c38', roughness: 0.8 }), pineM = new THREE.MeshStandardMaterial({ color: '#3f6438', roughness: 0.8 }), snowCap = toon('#f6f4f2'), acaciaM = toon('#6f8a36'), bushM = toon('#8a9a48'), cactusM = toon('#4f8a4a'), rockM = toon('#9a8f80'), mesaM = toon('#c98a5a'), iceM = toon('#d8ecf6');
const cyl = (r1, r2, h, s = 16) => new THREE.CylinderGeometry(r1, r2, h, s);
const blob = (r, d = 3) => new THREE.IcosahedronGeometry(r, d);
// 정글: 키 큰 나무 (줄기 + 둥근 잎 두 덩이)
const JT = []; JT.push(scatter('jungle', MOBILE ? 900 : 1700, [[cyl(0.17, 0.3, 8, 10), trunkM, 4], [blob(3.2), leafJ, 8.6, 1, 0.82, 1], [blob(2.4), leafJ2, 10.6, 1, 0.85, 1]], 0.8, 1.5));
// 눈 경계 아래 소나무 (산허리 위쪽)
JT.push(scatter('jungle', 420, [[cyl(0.25, 0.35, 3, 10), trunkM, 1.5], [new THREE.ConeGeometry(2.2, 6, 18), pineM, 5.5], [new THREE.ConeGeometry(1.1, 2.2, 18), snowCap, 8]], 0.8, 1.2, (x, z, y) => y > 70));
// 정글 나무가 카메라와 나 사이를 가리면 그 나무만 잠깐 숨겨요 (숲 전체를 비치게 하지 않고)
const HIDE = new THREE.Matrix4().makeScale(0, 0, 0), keepM = new Map();
function clearView() {
  const ax = camera.position.x, az = camera.position.z, bx = me.pos.x, bz = me.pos.z, lx = bx - ax, lz = bz - az, L2 = lx * lx + lz * lz || 1;
  for (const sp of JT) sp.forEach(([p], i) => {
    const t = clamp(((p.x - ax) * lx + (p.z - az) * lz) / L2, 0, 1), d = Math.hypot(ax + lx * t - p.x, az + lz * t - p.z);
    const hide = curZone === 'jungle' && t > 0.02 && t < 0.97 && d < 3.6 && p.y + 12 > camera.position.y - 6;   // 정글을 벗어나면 모두 되돌려요
    const key = sp.ims[0].id + ':' + i, was = keepM.has(key);
    if (hide === was) return;
    sp.ims.forEach((im, k) => { if (hide) { const m = new THREE.Matrix4(); im.getMatrixAt(i, m); keepM.set(key + ':' + k, m); im.setMatrixAt(i, HIDE); } else { im.setMatrixAt(i, keepM.get(key + ':' + k)); keepM.delete(key + ':' + k); } im.instanceMatrix.needsUpdate = true; });
    if (hide) keepM.set(key, true); else keepM.delete(key);
  });
}
// 초원: 아카시아 (납작한 우산 잎) · 덤불
{ const ag = acaciaGeos(3); scatter('savanna', 240, [[ag.bark, trunkM, 0], [ag.leaf, acaciaM, 0]], 0.9, 1.5); }
scatter('savanna', 420, [[blob(1.3, 2), bushM, 0.6, 1, 0.7, 1]], 0.7, 1.5);
// 사막: 선인장 · 붉은 바위 언덕(메사)
scatter('desert', 220, [[cyl(0.45, 0.5, 4.5), cactusM, 2.25], [cyl(0.3, 0.3, 1.8), cactusM, 2.6, 1, 1, 1]], 0.8, 1.4);
scatter('desert', 22, [[new THREE.CylinderGeometry(5.5, 7.5, 9, 7), mesaM, 4]], 0.7, 1.2);
scatter('isle', 70, [[cyl(0.3, 0.34, 2.6), cactusM, 1.3], [cyl(0.2, 0.2, 1.2), cactusM, 1.6, 1, 1, 1]], 0.7, 1.2);
scatter('isle', 50, [[new THREE.DodecahedronGeometry(1.1, 0), rockM, 0.4, 1, 0.6, 1]], 0.6, 1.5);
{ const lava = new THREE.MeshStandardMaterial({ color: '#3a3634', roughness: 0.95 }), palmLeaf = new THREE.MeshStandardMaterial({ color: '#5a8a3a', roughness: 0.8 }), bush = new THREE.MeshStandardMaterial({ color: '#7a9a4a', roughness: 0.9 }), bloom = new THREE.MeshStandardMaterial({ color: '#f2c83a', roughness: 0.7 });
  scatter('isle', 90, [[cyl(0.14, 0.24, 4.2, 10), trunkM, 2.1], [blob(1.9, 2), palmLeaf, 4.5, 1, 0.34, 1], [blob(1.2, 2), palmLeaf, 4.9, 1, 0.3, 1]], 0.8, 1.35);   // 야자나무
  scatter('isle', 160, [[blob(0.8, 2), bush, 0.45, 1, 0.65, 1]], 0.6, 1.5);   // 덤불
  scatter('isle', 120, [[blob(0.18, 1), bloom, 0.3, 1, 1, 1], [cyl(0.03, 0.03, 0.3, 6), bush, 0.14]], 0.8, 1.4);   // 들꽃
  scatter('isle', 90, [[new THREE.DodecahedronGeometry(1.3, 0), lava, 0.5, 1, 0.55, 1]], 0.6, 1.9); }   // 검은 용암 바위
scatter('desert', 90, [[new THREE.DodecahedronGeometry(1.6, 0), rockM, 0.6, 1, 0.6, 1]], 0.6, 1.8);
// 북극: 얼음 바위
scatter('arctic', 90, [[new THREE.IcosahedronGeometry(1.2, 1), iceM, 0.5, 1, 0.8, 1]], 0.5, 1.4);

// ───────── 강가 마을 (모이는 곳): 둥근 모서리 흰 벽 · 처마 나온 박공지붕 · 창 · 문 · 굴뚝 · 꽃 화분 ─────────
function gable(w, d, h, over = 0.5) {   // 박공지붕: 세모 단면을 길게 밀어 낸 모양
  const sh = new THREE.Shape(); sh.moveTo(-w / 2 - over, 0); sh.lineTo(0, h); sh.lineTo(w / 2 + over, 0); sh.lineTo(w / 2 + over, -0.22); sh.lineTo(0, h - 0.26); sh.lineTo(-w / 2 - over, -0.22); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: d + over * 2, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 }); g.translate(0, 0, -(d + over * 2) / 2); return g;
}
const GLASS = new THREE.MeshStandardMaterial({ color: '#7fa6c0', roughness: 0.15, metalness: 0.2, emissive: '#ffbe6a', emissiveIntensity: 0 });   // 밤엔 창에 불이 켜져요
let villageFire = null;
function house(w, d, wallH, roofC, wallC) {
  const h = new THREE.Group(), wall = toon(wallC), trim = toon('#7a5a40'), glass = GLASS;
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, wallH, d, 3, 0.18), wall); body.position.y = wallH / 2; h.add(body);
  const base = new THREE.Mesh(new RoundedBoxGeometry(w + 0.2, 0.4, d + 0.2, 2, 0.1), toon('#a89a86')); base.position.y = 0.2; h.add(base);
  const roof = new THREE.Mesh(gable(w, d, w * 0.42), toon(roofC)); roof.position.y = wallH; h.add(roof);
  const gableEnd = new THREE.Shape(); gableEnd.moveTo(-w / 2, 0); gableEnd.lineTo(0, w * 0.42 - 0.1); gableEnd.lineTo(w / 2, 0); gableEnd.closePath();
  for (const s of [-1, 1]) { const ge = new THREE.Mesh(new THREE.ShapeGeometry(gableEnd), wall); ge.position.set(0, wallH - 0.01, s * (d / 2 - 0.02)); if (s < 0) ge.rotation.y = Math.PI; h.add(ge); }
  const door = new THREE.Mesh(new RoundedBoxGeometry(1.1, 2.0, 0.16, 2, 0.06), toon('#7a4e32')); door.position.set(0, 1.0 + 0.2, d / 2 + 0.02); h.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), toon('#d8b060')); knob.position.set(0.35, 1.2, d / 2 + 0.12); h.add(knob);
  for (const [x, z, ry] of [[-w / 2 + 1.1, d / 2 + 0.02, 0], [w / 2 - 1.1, d / 2 + 0.02, 0], [w / 2 + 0.02, 0, Math.PI / 2], [-w / 2 - 0.02, 0, -Math.PI / 2]]) {
    if (Math.abs(x) < 0.9 && z) continue;
    const win = new THREE.Group(); win.position.set(x, 1.75, z); win.rotation.y = ry; h.add(win);
    const fr = new THREE.Mesh(new RoundedBoxGeometry(1.0, 1.0, 0.12, 2, 0.04), trim); win.add(fr);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), glass); gl.position.z = 0.065; win.add(gl);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.03), trim); bar.position.z = 0.08; win.add(bar);
    const bar2 = bar.clone(); bar2.rotation.z = Math.PI / 2; win.add(bar2);
    const box = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.22, 0.28, 2, 0.05), toon('#8a5a3a')); box.position.set(0, -0.58, 0.16); win.add(box);
    for (let i = 0; i < 5; i++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), toon(['#e86a6a', '#f2c84a', '#ffffff', '#e88ab0', '#f29a4a'][(i + Math.round(x)) % 5])); fl.position.set(-0.36 + i * 0.18, -0.42, 0.2); win.add(fl); }
  }
  const ch = new THREE.Mesh(new RoundedBoxGeometry(0.55, 1.4, 0.55, 2, 0.06), toon('#b07a5a')); ch.position.set(w * 0.22, wallH + w * 0.3, -d * 0.2); h.add(ch);
  h.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return h;
}
{
  const g = new THREE.Group(); g.position.copy(VIL); scene.add(g);
  const walls = ['#f6eee0', '#f2e6d2', '#f8f2e6', '#efe2cc', '#f6ece0', '#f3e8d8'], roofs = ['#c8553d', '#4f7aa8', '#d9a33a', '#6b8f4a', '#a8604a', '#5a6a8a'];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2, r = 15, hx = Math.cos(a) * r, hz = Math.sin(a) * r, hy = height(VIL.x + hx, VIL.z + hz) - VIL.y;
    const hs = house(5 + (k % 3) * 0.8, 4.4 + (k % 2) * 0.6, 3.2 + (k % 2) * 0.4, roofs[k], walls[k]); hs.position.set(hx, hy - 0.15, hz); hs.rotation.y = -a - Math.PI / 2; g.add(hs);
    addOcc(VIL.x + hx, VIL.y + hy + 1.6, VIL.z + hz, 3.1); addOcc(VIL.x + hx, VIL.y + hy + 3.8, VIL.z + hz, 2.7);
  }
  // 우물: 돌 둘레 · 나무 지붕
  const well = new THREE.Group(); g.add(well);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.35, 12, 28), toon('#a89a86')); ring.rotation.x = Math.PI / 2; ring.position.y = 0.7; well.add(ring);
  const wall2 = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.7, 28, 1, true), toon('#9a8c78')); wall2.position.y = 0.35; well.add(wall2);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.0, 24), new THREE.MeshStandardMaterial({ color: '#4f7a90', roughness: 0.1 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.45; well.add(water);
  for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 10), toon('#7a5a40')); post.position.set(s * 1.25, 1.2, 0); well.add(post); }
  const wr = new THREE.Mesh(gable(2.4, 1.6, 0.9, 0.25), toon('#a8604a')); wr.position.y = 2.35; wr.rotation.y = Math.PI / 2; well.add(wr);
  well.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const fire = new THREE.PointLight('#ffb070', 4, 26); fire.position.set(0, 3, 0); g.add(fire); villageFire = fire;
}

// ───────── 케이블카: 마을 옆 정류장 ↔ 산꼭대기 ─────────
const CABLE = new THREE.QuadraticBezierCurve3(STA.clone().add(V.set(0, 12, 0)), new THREE.Vector3((STA.x + TOPS.x) / 2, Math.max(STA.y, TOPS.y) + 30, (STA.z + TOPS.z) / 2), TOPS.clone().add(V.set(0, 12, 0)));
{
  const line = new THREE.Mesh(new THREE.TubeGeometry(CABLE, 160, 0.07, 8), toon('#3a3a40')); scene.add(line);
  for (const p of [STA, TOPS]) {
    const tw = new THREE.Group(); tw.position.copy(p); scene.add(tw); const steel = toon('#7d8088');
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 12.4, 10), steel); leg.position.set(sx * 0.8, 6, sz * 0.8); leg.rotation.set(sz * 0.07, 0, -sx * 0.07); tw.add(leg); }
    for (let y = 2; y < 12; y += 2.5) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.95 - y * 0.03, 0.06, 6, 4), steel); band.rotation.set(Math.PI / 2, 0, Math.PI / 4); band.position.y = y; tw.add(band); }
    const head = new THREE.Mesh(new RoundedBoxGeometry(3.4, 0.6, 1.2, 2, 0.15), toon('#c8553d')); head.position.y = 12.2; tw.add(head);
    const pad = new THREE.Mesh(new RoundedBoxGeometry(5, 0.5, 5, 2, 0.15), toon('#a89a86')); pad.position.y = 0.1; tw.add(pad);
    tw.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
}
const gondola = new THREE.Group(); scene.add(gondola);
{ const b = new THREE.Mesh(new RoundedBoxGeometry(2.6, 2.4, 2.6, 4, 0.45), toon('#d8483a')); b.position.y = -2.3; b.castShadow = true; gondola.add(b);
  const w = new THREE.Mesh(new RoundedBoxGeometry(2.68, 0.95, 2.68, 4, 0.4), new THREE.MeshStandardMaterial({ color: '#cfe8f6', roughness: 0.1, metalness: 0.2 })); w.position.y = -1.95; gondola.add(w);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.0, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon('#f2e6d2')); cap.scale.set(1.2, 0.35, 1.2); cap.position.y = -1.1; gondola.add(cap);
  const arm = new THREE.Mesh(cyl(0.08, 0.08, 1.4, 5), toon('#3a3a40')); arm.position.y = -0.7; gondola.add(arm); }

// ───────── 산책자 (나): zoo3d.js 의 산책자 (키 1.65 m, 무릎 굽혀 걷기 · 모자 리본 · 치마 흔들림) ─────────
// 👤 내 모습 · 🪙 지갑 (이 기기에 기억): 성별 · 옷 · 모자, 사진으로 모은 코인, 산 물건
const LOOK_KEY = 'snapzoo-island-me';
const MY = (() => { const d = { g: 'f', body: START_BODY, look: myLook, hat: 0, cam: 'basic', coins: 30, today: { day: '', sec: 0 }, own: { looks: [myLook, (myLook + 1) % 8], hats: [0, 5], cams: ['basic'] } }; try { return { ...d, ...JSON.parse(localStorage.getItem(LOOK_KEY) || '{}') }; } catch { return d; } })();
const saveMy = () => { try { localStorage.setItem(LOOK_KEY, JSON.stringify(MY)); } catch {} };
if (MY.body === undefined) MY.body = START_BODY; MY.cam ||= 'basic'; MY.own.cams ||= ['basic']; MY.today ||= { day: '', sec: 0 };
const camOf = () => CAMERAS.find((c) => c.id === MY.cam) || CAMERAS[0];
// 머리색 · 액세서리: 예전 기록은 입던 옷의 머리색을 그대로 이어받아요
if (MY.hair === undefined) { const h = HAIRS.findIndex((x) => x.c === LOOKS[MY.look % LOOKS.length].hair); MY.hair = h < 0 ? 2 : h; }
MY.acc ||= 0; MY.own.hairs ||= [0, 1, 2, 3, 4]; if (!MY.own.hairs.includes(MY.hair)) MY.own.hairs.push(MY.hair); MY.own.accs ||= [0];
const myWear = () => ({ g: MY.g, hat: MY.hat, body: MY.body, cam: MY.cam, hair: MY.hair, acc: MY.acc });
const ME3 = makeWalker(MY.look, myWear());
const me = { g: ME3.root, st: ME3, pos: VIL.clone().add(V.set(0, 0, 8)), target: null, face: 0, riding: null, t: 0 };
me.pos.y = height(me.pos.x, me.pos.z);
scene.add(me.g);

// ───────── 동물 (구역마다) ─────────

// ───────── 🌅 시간대: 아침 · 낮 · 저녁 · 밤 (⚙ 설정: 실제 시각 따라 · 빠르게 흐르기(하루 24분) · 고정) ─────────
const TOD = [   // [시각, 하늘 위 · 가운데 · 지평선 · 해 둘레, 안개, 햇빛 색 · 세기, 하늘빛 · 땅빛 · 세기, 노출, 해(달) 방향, 구름 색]
  [0, '#0b1430', '#18244a', '#2c3a62', '#6a80c0', '#1c2642', '#9ab0e8', 0.55, '#5a6aa0', '#141820', 0.6, 0.95, [-0.35, 0.65, 0.5], '#4a5478'],
  [5, '#141e40', '#2a3460', '#4a4a72', '#8a90c0', '#2a3050', '#a8b4e0', 0.6, '#6a74a8', '#1a1a22', 0.65, 0.95, [-0.6, 0.4, 0.5], '#5a6080'],
  [6.6, '#5a7ac0', '#e2aab0', '#ffd2a8', '#ffe0c0', '#e8cfc4', '#ffd4b0', 2.0, '#f0d6e0', '#5a5040', 1.05, 1.0, [-0.85, 0.16, 0.35], '#ffd8d0'],
  [9.5, '#3a7ad0', '#8ec0ea', '#e0eef0', '#ffffff', '#d6e4e8', '#fff6e6', 2.6, '#e8f2ff', '#6a7a4a', 1.2, 1.0, [-0.3, 0.85, 0.2], '#ffffff'],
  [15.5, '#3e7cd0', '#92c2ea', '#e6eee6', '#fff8e8', '#dee6e2', '#fff2dc', 2.6, '#eef2ff', '#6a7a4a', 1.2, 1.0, [0.35, 0.8, -0.25], '#ffffff'],
  [18, LK.top, LK.mid, LK.hor, LK.glow, LK.fog, LK.sunC, LK.sunI, LK.hemi[0], LK.hemi[1], LK.hemi[2] * 1.4, LK.exp, [0.7, 0.42, -0.58], '#fff1dc'],
  [19.6, '#2a3060', '#8a6a8a', '#d88a6a', '#ffb880', '#7a6070', '#ffa070', 1.2, '#a88aa8', '#2a2430', 0.8, 1.0, [0.85, 0.08, -0.5], '#c89aa0'],
  [21, '#0b1430', '#18244a', '#2c3a62', '#6a80c0', '#1c2642', '#9ab0e8', 0.55, '#5a6aa0', '#141820', 0.6, 0.95, [-0.35, 0.65, 0.5], '#4a5478'],
  [24, '#0b1430', '#18244a', '#2c3a62', '#6a80c0', '#1c2642', '#9ab0e8', 0.55, '#5a6aa0', '#141820', 0.6, 0.95, [-0.35, 0.65, 0.5], '#4a5478'],
];
const TC = Array.from({ length: 6 }, () => new THREE.Color()), TCa = new THREE.Color(), TCb = new THREE.Color(), sunDir = SUN_DIR.clone();
const tod = { hour: 18, night: 0, fog: new THREE.Color(LK.fog), hemiI: LK.hemi[2] * 1.4, label: '' };
function hourNow(T) {
  const m = SET.time || 'auto';
  if (m === 'morning') return 7.2; if (m === 'day') return 12.5; if (m === 'evening') return 18.1; if (m === 'night') return 22.5;
  if (m === 'cycle') return (18 + T / 60) % 24;   // 1분 = 1시간 (하루 24분), 저녁부터 시작
  const d = new Date(); return d.getHours() + d.getMinutes() / 60;
}
function applyTime(T) {
  const h = hourNow(T); tod.hour = h;
  let i = 0; while (i < TOD.length - 2 && TOD[i + 1][0] <= h) i++;
  const A = TOD[i], Bk = TOD[i + 1], k = THREE.MathUtils.smoothstep(h, A[0], Bk[0]);
  const col = (n) => TCa.set(A[n]).lerp(TCb.set(Bk[n]), k);
  const u = sky.material.uniforms; u.uTop.value.copy(col(1)); u.uMid.value.copy(col(2)); u.uHor.value.copy(col(3)); u.uGlow.value.copy(col(4));
  tod.fog.copy(col(5)); sun.color.copy(col(6)); sun.intensity = A[7] + (Bk[7] - A[7]) * k;
  hemi.color.copy(col(8)); hemi.groundColor.copy(col(9)); tod.hemiI = A[10] + (Bk[10] - A[10]) * k;
  renderer.toneMappingExposure = A[11] + (Bk[11] - A[11]) * k;
  sunDir.set(...A[12]).lerp(V.set(...Bk[12]), k).normalize(); u.uSun.value.copy(sunDir);
  const cc = col(13); clouds.forEach((c) => c.material.color.copy(cc));
  tod.night = h >= 20.5 || h < 5.2 ? 1 : h >= 19 ? (h - 19) / 1.5 : h < 6.4 ? 1 - (h - 5.2) / 1.2 : 0;
  stars.material.opacity = tod.night * 0.95; stars.visible = tod.night > 0.02; moon.visible = tod.night > 0.05; moon.material.opacity = tod.night;
  GLASS.emissiveIntensity = tod.night * 1.4; if (villageFire) villageFire.intensity = 4 + tod.night * 14;
  grassMat.uniforms.uSun.value.copy(sun.color);
  sun.intensity *= wx.sunK; tod.hemiI *= 0.75 + 0.25 * wx.sunK;
  tod.label = (h < 5.2 || h >= 20.5 ? '밤' : h < 9 ? '아침' : h < 16.5 ? '낮' : '저녁') + WX_LABEL[wx.kind];
}
// 별 · 달
const stars = (() => { const n = 1400, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, y = Math.abs(u) * 0.95 + 0.05, rr = Math.sqrt(1 - y * y); p.set([Math.cos(a) * rr * 1500, y * 1500, Math.sin(a) * rr * 1500], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: '#fffbe8', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false })); scene.add(pts); return pts; })();
const moon = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 20, 64, 64, 64); g.addColorStop(0, 'rgba(255,250,230,1)'); g.addColorStop(0.42, 'rgba(255,248,220,1)'); g.addColorStop(0.5, 'rgba(220,230,255,.35)'); g.addColorStop(1, 'rgba(200,210,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false })); sp.scale.setScalar(150); scene.add(sp); return sp; })();

// ───────── 🛶 뗏목 (강) · ⛵ 작은 배 (바다): 물에 들어가면 저절로 타요. 바다는 너무 멀리(깊이 15 m 넘게) 못 가요 ─────────
const raft = new THREE.Group(), boat = new THREE.Group(); scene.add(raft, boat); raft.visible = boat.visible = false;
{ const wood = toon('#9a7048'), rope = toon('#d8c494');
  for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.2, 12), wood); l.rotation.x = Math.PI / 2; l.position.set(-0.68 + i * 0.27, 0, 0); l.castShadow = true; raft.add(l); }
  for (const z of [-0.75, 0.75]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.14), rope); b.position.set(0, 0.13, z); raft.add(b); }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8), wood); pole.position.set(0.55, 0.9, 0.6); pole.rotation.z = -0.35; raft.add(pole);
  const hullS = new THREE.Shape(); hullS.moveTo(0, 1.5); hullS.quadraticCurveTo(0.75, 0.9, 0.7, -0.9); hullS.lineTo(-0.7, -0.9); hullS.quadraticCurveTo(-0.75, 0.9, 0, 1.5);
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(hullS, { depth: 0.45, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3 }), toon('#f2e6d2')); hull.rotation.x = Math.PI / 2; hull.position.y = 0.2; hull.castShadow = true; boat.add(hull);
  const band = new THREE.Mesh(new THREE.ExtrudeGeometry(hullS, { depth: 0.08, bevelEnabled: false }), toon('#c8553d')); band.rotation.x = Math.PI / 2; band.position.y = 0.12; band.scale.set(1.04, 1.04, 1); boat.add(band);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 1.9), toon('#9a7048')); deck.position.set(0, -0.12, -0.05); boat.add(deck);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 2.6, 8), toon('#7a5638')); mast.position.set(0, 1.2, 0.35); boat.add(mast);
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, 2.1), new THREE.Vector2(-0.95, 0.05)])), toon('#fbf6ea', { side: THREE.DoubleSide })); sail.position.set(-0.02, 0.3, 0.35); sail.rotation.y = Math.PI / 2; boat.add(sail); boat.userData.sail = sail; }
// 지금 서 있는 곳의 물: 'river' · 'sea' · null, 그리고 물 높이
const waveAt = (x, z) => { const T = clock ? clock.elapsedTime : 0; return Math.sin(x * 0.04 + T * 0.9) * 0.35 + Math.cos(z * 0.05 + T * 0.7) * 0.3; };   // 바다 출렁과 같은 식
function waterAt(x, z) {
  const y = height(x, z);
  if (y < 0.05) return { kind: 'sea', y: waveAt(x, z) };
  const rv = riverNear(x, z);
  if (rv.i >= 0 && rv.d < riverW(rv.i) * 0.6) { const p = RS[rv.i], wy = Math.max(height(p.x, p.z) + 1.0, 0.25); if (y < wy - 0.05) return { kind: 'river', y: wy }; }
  return null;
}

// ───────── 동물: 구역마다 10종 (fauna.js 의 ROSTER). 사람을 해치는 동물은 없어요 ─────────
// 움직임: walk 구역 안을 거닐어요 · still 거의 가만히 · shore 바닷가 모래 · swim 물속 · jump 돌고래(아래에서 따로)
const SEA_Y = { whale: -0.9, fish: -0.35, seaturtle: -0.18, octopus: -0.05, seaotter: 0.02 };
const nearIsle = (x, z) => isleD(x, z) < ISLE.r + 36, nearVillageSea = (x, z) => isleD(x, z) > ISLE.r + 40 && z - 0.6 * x > 150;
const onBeach = (x, z, isl) => { const y = height(x, z); return y > 0.7 && y < 2.6 && riverNear(x, z).d > 6 && (isl ? nearIsle(x, z) : nearVillageSea(x, z)); };   // 마을 쪽 바닷가 · 섬 바닷가는 살림이 달라요
const inSea = (x, z, isl) => { const y = height(x, z); return y < -1.2 && y > -7 && riverNear(x, z).d > 4 && (isl ? nearIsle(x, z) : nearVillageSea(x, z)); };   // 바닷가에서 보이는 얕은 곳에서 살아요
const inVillage = (x, z) => { const r = Math.hypot(x - VIL.x, z - VIL.z); return r < 27 && r > 3.5 && Math.abs(r - 15) > 4.2 && riverNear(x, z).d > 6; };
function okFor(a, x, z) {
  if (a.zone === 'village') return inVillage(x, z);
  const isl = a.zone === 'islesea';
  if (a.move === 'swim') return inSea(x, z, isl) && Math.hypot(x - a.home.x, z - a.home.z) < 34;
  if (a.move === 'shore') return onBeach(x, z, isl) && Math.hypot(x - a.home.x, z - a.home.z) < 30;
  const y = height(x, z), rv = riverNear(x, z);
  return y > 1.5 && zoneAt(x, z, y) === a.zone && !(rv.i >= 0 && rv.d < riverW(rv.i) * 0.9) && Math.hypot(x - VIL.x, z - VIL.z) > 30;
}
function spotFor(zone, move, test) {
  for (let k = 0; k < 4000; k++) {
    let x, z;
    if (zone === 'village') { const a = rnd() * Math.PI * 2, r = 4 + rnd() * 23; x = VIL.x + Math.sin(a) * r; z = VIL.z + Math.cos(a) * r; if (!inVillage(x, z)) continue; }
    else { const onI = zone === 'isle' || zone === 'islesea'; x = onI ? ISLE.x + (rnd() - 0.5) * 2 * (ISLE.r + 34) : (rnd() - 0.5) * 640; z = onI ? ISLE.z + (rnd() - 0.5) * 2 * (ISLE.r + 34) : (rnd() - 0.5) * 640; const y = height(x, z), isl = zone === 'islesea';
      if (move === 'swim') { if (!inSea(x, z, isl)) continue; }
      else if (move === 'shore') { if (!onBeach(x, z, isl)) continue; }
      else if (!(y > 2.8 && zoneAt(x, z, y) === zone && riverNear(x, z).d > 10 && clearAt(x, z) && (zone !== 'arctic' || y > 104))) continue; }
    if (test(x, z)) return new THREE.Vector3(x, height(x, z), z);
  }
  return null;
}
const animals = [], POOLS = new Map(), tagged = [];
// 구역마다 '모이는 곳'(물웅덩이 · 풀밭 같은) 너덧 군데. 종마다 무리를 여기 나눠 놓으니 한 곳에 여러 종이 섞여 지내요
function poolFor(zone, move) {
  const key = zone + (move === 'swim' || move === 'shore' ? move : ''); if (POOLS.has(key)) return POOLS.get(key);
  const n = zone === 'village' ? 6 : move === 'swim' || move === 'shore' ? 8 : 14, pool = [];
  if (zone === 'arctic' && move !== 'swim' && move !== 'shore') for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4, x = TOPS.x + Math.sin(a) * 16, z = TOPS.z + Math.cos(a) * 16; if (height(x, z) > 100) pool.push(new THREE.Vector3(x, height(x, z), z)); }   // 케이블카 내리는 곳 둘레에도 꼭 (산꼭대기에 내리자마자 만나게)
  for (let i = 0; i < n; i++) { const p = spotFor(zone, move, (x, z) => pool.every((o) => Math.hypot(o.x - x, o.z - z) > (zone === 'village' ? 9 : 32))) || spotFor(zone, move, () => true); if (p) pool.push(p); }
  POOLS.set(key, pool); return pool;
}
for (const [zone, id, name, herds0, per0, scale, move, speed, night] of ROSTER) {
  const herds = herds0, per = per0 >= 3 ? 2 : 1;   // 작은 무리(1~2마리) 여럿을 구역 곳곳에: 걷다 보면 1~3종씩 만나요
  if (move === 'jump') continue;
  const pool = poolFor(zone, move), start = Math.floor(rnd() * pool.length);
  for (let h = 0; h < herds; h++) {
    const base = pool[(start + h) % pool.length]; if (!base) continue;
    const J = zone === 'village' ? 4 : 22, home = base.clone().add(V.set((rnd() - 0.5) * J, 0, (rnd() - 0.5) * J));
    for (let k = 0; k < per; k++) {
      const st = ZOO[id](); st.root.scale.setScalar(scale);
      const a = { g: st.root, st, id, name, zone, move, home, night: !!night, target: null, wait: rnd() * 4, face: rnd() * 6, t: rnd() * 9, speed: speed || 0 };
      if (move === 'fly') { a.flySp = speed; a.speed = 0; a.wait = 1e12; a.flyA = rnd() * 6.28; a.flyR = id === 'bat' ? 7 + rnd() * 7 : 1.5 + rnd() * 3; a.alt = id === 'bat' ? 5 + rnd() * 4 : 0; }
      // 듬성듬성: 다른 동물과 7 m(마을 3.5 m) 넘게 떨어진 자리부터 찾아요
      const gap = zone === 'village' ? 3.5 : 7, W2 = zone === 'village' ? 8 : 26; let p = null;
      for (let i = 0; i < 80 && !p; i++) { const q = home.clone().add(V.set((rnd() - 0.5) * W2, 0, (rnd() - 0.5) * W2)); if ((okFor(a, q.x, q.z) && (i > 60 || animals.every((o) => Math.hypot(o.pos.x - q.x, o.pos.z - q.z) > gap))) || i === 79) p = q; }
      p.y = move === 'swim' ? SEA_Y[id] ?? -0.2 : height(p.x, p.z); a.pos = p; a.g.position.copy(p); scene.add(a.g);
      const tag = document.createElement('div'); tag.className = 'tag'; tag.textContent = name; document.body.append(tag); a.tag = tag;
      { const bs = new THREE.Box3().setFromObject(a.g).getSize(V); a.size = Math.min(2.2, Math.max(0.12, Math.max(bs.x, bs.z) * 0.32)); a.tagH = Math.max(0.35, bs.y + 0.3); } if (move === 'swim') a.tagH = Math.min(a.tagH, 1.2);
      animals.push(a);
    }
  }
}
// 돌고래: 강 하구 앞바다에서 뛰어올라요
const dolphins = [];
for (let k = 0; k < 7; k++) {   // 두 무리
  const st = ZOO.dolphin(), g = st.root; g.scale.setScalar(1.15); const pod = k < 4 ? 0 : 1;
  const sp = (POOLS.get('seaswim') || [])[pod] || V.set(-90, 0, 215); scene.add(g); dolphins.push({ g, st, phase: k * 1.6, cx: sp.x + (k % 4) * 5, cz: sp.z + (k % 2) * 6 });
}


// ───────── 내 둘레 풀밭: 바람에 물결치는 풀잎 (초원 · 마을). 땅에 붙은 격자 자리라 다시 깔아도 같은 자리에 나요 ─────────
const GR = LOWQ ? 18 : 34, GSTEP = LOWQ ? 0.38 : 0.27, GMAX = Math.ceil((Math.PI * GR * GR) / (GSTEP * GSTEP));
const BLADE = (() => { const g = new THREE.BufferGeometry(), w = 0.05; g.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, -w * 0.7, 0.45, 0.02, w * 0.7, 0.45, 0.02, -w * 0.3, 0.8, 0.05, w * 0.3, 0.8, 0.05, 0, 1, 0.1], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 0.45, 1, 0.45, 0, 0.8, 1, 0.8, 0.5, 1], 2)); g.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6]); return g; })();
const grassMat = new THREE.ShaderMaterial({ side: THREE.DoubleSide,
  uniforms: { uTime: { value: 0 }, uRoot: { value: new THREE.Color('#5a6a26') }, uTip: { value: new THREE.Color('#d8b862') }, uGust: { value: new THREE.Color('#fff2c0') }, uFog: { value: FOG }, uFogN: { value: 120 }, uFogF: { value: 720 }, uSun: { value: new THREE.Color(LK.sunC) } },
  vertexShader: NOISE + `uniform float uTime; varying float vH,vGust,vDist; varying vec3 vCol;
    void main(){ vec4 wp=modelMatrix*instanceMatrix*vec4(position,1.0); float h=uv.y; float g=noise(wp.xz*0.05+vec2(-uTime*0.35,uTime*0.12))*0.5+0.5; float gust=smoothstep(0.45,0.95,g);
      float sway=sin(uTime*1.7+wp.x*0.4+wp.z*0.23)*0.06; wp.x+=(sway+gust*0.4)*h*h; wp.z+=gust*0.16*h*h; wp.y-=gust*0.12*h*h;
      vH=h; vGust=gust; vCol=instanceColor; vec4 mv=viewMatrix*wp; vDist=-mv.z; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uRoot,uTip,uGust,uFog,uSun; uniform float uFogN,uFogF; varying float vH,vGust,vDist; varying vec3 vCol;
    void main(){ vec3 c=mix(uRoot,uTip*vCol,smoothstep(0.0,1.0,vH)); c=mix(c,uGust,vGust*vH*0.55); c*=0.8+0.4*vH; c+=uSun*pow(vH,3.0)*0.2;
      c=mix(c,uFog,smoothstep(uFogN,uFogF,vDist)); gl_FragColor=vec4(c,1.0);
      #include <colorspace_fragment>
    }` });
const grass = new THREE.InstancedMesh(BLADE, grassMat, GMAX); grass.frustumCulled = false; grass.setColorAt(0, new THREE.Color('#ffffff')); grass.count = 0; scene.add(grass);   // 색 칸을 처음부터 만들어 둬요 (풀 없는 곳에서 시작해도)
const grassAt = new THREE.Vector3(1e9, 0, 0), GQ = new THREE.Quaternion(), GE = new THREE.Euler(), GS = new THREE.Vector3(), GC = new THREE.Color(), GCOL = { savanna: new THREE.Color('#ffffff'), village: new THREE.Color('#e8f0c8'), jungle: new THREE.Color('#9ab870') };
function layGrass(cx, cz) {
  grassAt.set(cx, 0, cz); let k = 0; const n = Math.ceil(GR / GSTEP), ix = Math.round(cx / GSTEP), iz = Math.round(cz / GSTEP);
  for (let i = -n; i <= n && k < GMAX; i++) for (let j = -n; j <= n && k < GMAX; j++) {
    const gx = ix + i, gz = iz + j, h1 = hash(gx * 1.31, gz * 0.77), h2 = hash(gx * 0.53 + 7, gz * 1.9 - 3);
    const x = (gx + h1 - 0.5) * GSTEP, z = (gz + h2 - 0.5) * GSTEP; if ((x - cx) ** 2 + (z - cz) ** 2 > GR * GR) continue;
    const y = height(x, z); if (y < 2.9) continue;
    const zn = Math.hypot(x - VIL.x, z - VIL.z) < 26 ? 'village' : zoneAt(x, z, y); if (!GCOL[zn] || (zn === 'jungle' && y > 60)) continue;
    const rv = riverNear(x, z); if (rv.i >= 0 && rv.d < riverW(rv.i) * 0.75) continue;
    if (Math.hypot(x - STA.x, z - STA.z) < 4) continue;
    const s = 0.32 + h1 * 0.3; GQ.setFromEuler(GE.set(0, h2 * 6.28, (h1 - 0.5) * 0.3));
    const lawn = zn === 'village' ? 0.42 : 1; M4.compose(V.set(x, y - 0.03, z), GQ, GS.set(s, s * (0.55 + h2 * 0.7) * lawn, s));   // 마을은 잔디처럼 짧게 grass.setMatrixAt(k, M4);
    GC.copy(GCOL[zn]).multiplyScalar(0.9 + fbm(x * 0.08, z * 0.08) * 0.25); grass.setColorAt(k, GC); k++;
  }
  grass.count = k; grass.instanceMatrix.needsUpdate = true; if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
}

// 확인 · 공유용: 주소에 ?at=savanna (또는 jungle · desert · arctic) 를 붙이면 그 구역 동물 곁에서 바로 시작
{ const at = new URLSearchParams(location.search).get('at'); const a = at && at !== 'village' && animals.find((x) => x.zone === at);
  if (a) { me.pos.copy(herdOf(at)); me.pos.y = height(me.pos.x, me.pos.z); me.face = Math.atan2(a.home.x - me.pos.x, a.home.z - me.pos.z); } }

// ───────── 카메라 · 조작 ─────────
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 2.5; controls.maxDistance = 320; controls.maxPolarAngle = Math.PI * 0.47;
controls.target.copy(me.pos).add(V.set(0, 1.1, 0));
// 처음엔 섬 전체를 보다가 마을로 내려와요 (덮개 화면 없이)
camera.position.set(260, 260, 380);
let intro = { t: 0, from: camera.position.clone(), to: VIL.clone().add(new THREE.Vector3(1.0, 2.4, 3.6)) };   // 마을 광장 안쪽에서 나를 바라보게 (집에 가리지 않게)
if (new URLSearchParams(location.search).get('at')) { if (new URLSearchParams(location.search).get('at') !== 'village') intro.to = me.pos.clone().add(V.set(-Math.sin(me.face) * 7, 3.2, -Math.cos(me.face) * 7)); camera.position.copy(intro.to); controls.target.copy(me.pos).add(V.set(0, 1.1, 0)); intro = null; }   // 내 등 뒤에서 무리 쪽을 바라보게

const keys = new Set();
// 키는 글자(e.key)가 아니라 자리(e.code)로 읽어요: 한글 입력 상태에서도 W · A · S · D 가 그대로 돼요
const KEYMAP = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', ArrowUp: 'arrowup', ArrowDown: 'arrowdown', ArrowLeft: 'arrowleft', ArrowRight: 'arrowright' };
addEventListener('keydown', (e) => { const k = KEYMAP[e.code]; if (k && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement)) { keys.add(k); me.target = null; e.preventDefault(); hideHint(); } });
addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) keys.delete(k); });
addEventListener('blur', () => keys.clear());   // 다른 창으로 가면 눌린 키를 놓아요
// 누르기와 끌기를 구분: 6px 안에서 떼면 '누르기' → 그곳으로 걸어가요
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
canvas.addEventListener('pointerdown', (e) => { closePanels(); down = [e.clientX, e.clientY]; if (intro) intro.t0 = -1e9; });   // 누르면 바로 내 곁으로
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || me.riding || mode === 'photo') return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  if (me.inHome) { const q = new THREE.Vector3(); if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -ROOM.y), q)) { if (moveId) { moveTo(q); return; } me.target = q; showMark(q); } return; }
  const hit = ray.intersectObject(ground)[0];
  if (hit) { me.target = hit.point.clone(); showMark(hit.point); hideHint(); }
});
// 누른 곳 표시: 다른 게임처럼 바닥에 점 + 퍼지는 고리 두 개, 도착하면 사라져요
const mark = new THREE.Group(); mark.visible = false; scene.add(mark);
{ const mm = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, fog: false });
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), mm('#fff6e6', 0.95)); dot.rotation.x = -Math.PI / 2; mark.add(dot);
  for (let i = 0; i < 2; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 40), mm('#fff6e6', 0.8)); r.rotation.x = -Math.PI / 2; r.userData.ph = i * 0.5; mark.add(r); }
  mark.renderOrder = 5; }
function showMark(p) { mark.position.set(p.x, (me.inHome ? ROOM.y : height(p.x, p.z)) + 0.05, p.z); mark.visible = true; mark.userData.t = 0; }
function updMark(dt) {
  if (!mark.visible) return; if (!me.target) { mark.visible = false; return; }
  const t = (mark.userData.t += dt);
  mark.children.forEach((c, i) => { if (!i) { c.scale.setScalar(1 + Math.sin(t * 6) * 0.12); return; } const k = (t * 0.9 + c.userData.ph) % 1; c.scale.setScalar(0.5 + k * 1.3); c.material.opacity = 0.85 * (1 - k); });
}
let hintT = setTimeout(hideHint, 10000);
function hideHint() { clearTimeout(hintT); $('#hint').style.opacity = 0; }

// 🚡 케이블카: 지금 있는 쪽에서 반대쪽으로 (약 14초)
$('#cable').onclick = () => {
  if (me.riding) return; exitPhoto();
  const atTop = me.pos.distanceTo(TOPS) < me.pos.distanceTo(STA);
  me.riding = { t: 0, dur: 14, dir: atTop ? -1 : 1 }; bump('cable');
  $('#rideT').textContent = atTop ? '마을로 내려가는 중' : '산꼭대기로 올라가는 중'; $('#rideBar').style.width = '0'; $('#ride').classList.add('on');
  me.target = null; $('#cable').disabled = true;
  closeDrawer();
};
// 🏘 마을로 · 🦁 초원으로 · 🏜️ 사막으로: 로딩 화면처럼 노을 사진 위에 '○○로 가는 중' + 진행선이 차오른 뒤 도착
// ☰ 메뉴 서랍: 도감 · 앨범 · 꾸미기 · 설정 · 이동. 하나를 누르면 닫혀요
// 창은 하나만: 상점 · 캐릭터 · 도감 · 앨범 · 꾸미기 · 어디로 · 설정 · 메뉴
function closePanels() { closeCloset(); closeDex(); closeAlbum(); closeManual(); ['#deco', '#settings'].forEach((q) => $(q).classList.remove('on')); closeActs(); }
function closeDrawer() { $('#drawer').classList.remove('on'); $('#drawer').setAttribute('aria-hidden', 'true'); $('#drawerBtn').setAttribute('aria-expanded', 'false'); }
$('#drawerBtn').onclick = (e) => { e.stopPropagation(); const on = !$('#drawer').classList.contains('on'); if (!on) return closeDrawer(); closePanels(); $('#drawer').classList.add('on'); $('#drawer').setAttribute('aria-hidden', 'false'); $('#drawerBtn').setAttribute('aria-expanded', 'true'); };
$('#drawer').addEventListener('click', (e) => { if (e.target.closest('button') && e.target.closest('button').id !== 'setBtn') closeDrawer(); });
// 📘 매뉴얼
function closeManual() { $('#manual').classList.remove('on'); $('#manual').setAttribute('aria-hidden', 'true'); }
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
$('#credits').innerHTML = ROSTER.filter(([, id]) => DEX_PHOTOS[id]).map(([, id, name]) => { const c = DEX_PHOTOS[id]; return `<p>${name} — ${esc(c.by)} · ${esc(c.license)} · <a href="${esc(c.link)}" target="_blank" rel="noopener">원본</a></p>`; }).join('');
$('#helpBtn').onclick = () => { closePanels(); $('#manual').classList.add('on'); $('#manual').setAttribute('aria-hidden', 'false'); $('#manualX').focus(); };
$('#manualX').onclick = closeManual;
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeManual(); });
addEventListener('pointerdown', (e) => { if (!e.target.closest('#drawer, #drawerBtn, #settings')) closeDrawer(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
let limitT = 0;
// 받침이 있으면 '과', 없으면 '와' (을 · 를 · 이 · 가 고를 때도 씀)
const josa = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? '과' : '와'; };
function toastMsg(b, sm) { const t = $('#toast'); t.querySelector('img').removeAttribute('src'); t.querySelector('span').innerHTML = `<b>${b}</b><small>${sm}</small>`; t.classList.add('on'); clearTimeout(toastMsg.tt); toastMsg.tt = setTimeout(() => t.classList.remove('on'), 2400); }
let travelling = false;
// 도착하면 그곳 동물 1~3마리가 내 앞쪽에 보이게 불러와요 (이미 곁에 있으면 그만큼 덜 불러요)
function bringAnimals() {
  if (me.inHome) return; const x = me.pos.x, z = me.pos.z, y = height(x, z), isl = isleD(x, z) < ISLE.r + 40;
  const zone = Math.hypot(x - VIL.x, z - VIL.z) < 30 ? 'village' : y < 2.8 && onBeach(x, z, isl) ? (isl ? 'islesea' : 'sea') : isl ? 'isle' : zoneAt(x, z, y);
  const L = animals.filter((a) => a.zone === zone && !a.night && a.move !== 'fly' && a.move !== 'swim').sort((p, q) => p.pos.distanceTo(me.pos) - q.pos.distanceTo(me.pos));
  const dx = x - camera.position.x, dz = z - camera.position.z, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl;
  const ahead = (a) => Math.hypot(a.pos.x - x, a.pos.z - z) < 13 && (a.pos.x - x) * ux + (a.pos.z - z) * uz > 2;   // 내 앞쪽에 보이는 동물만 세요
  let need = Math.max(0, 2 + (rnd() < 0.5 ? 1 : 0) - L.filter(ahead).length); if (!need) return;
  for (const a of L) { if (!need) break; if (ahead(a)) continue;
    for (let i = 0; i < 24; i++) { const r = 5 + (i % 6) * 1.2, sd = ((i * 7) % 11 - 5) * 0.9, px = x + ux * r - uz * sd, pz = z + uz * r + ux * sd, py = height(px, pz);
      if (py < 0.7 || (zone !== 'sea' && zone !== 'islesea' && py < 2) || !seenFrom(new THREE.Vector3(x, y + 1.4, z), new THREE.Vector3(px, py + 0.6, pz))) continue;
      a.pos.set(px, py, pz); a.home = a.pos.clone(); a.target = null; a.wait = 6; a.v = 0; a.face = Math.atan2(x - px, z - pz); a.g.position.copy(a.pos); need--; break; } }
}
function travelTo(label, where) {
  if (me.riding || travelling) return; travelling = true; exitPhoto(); me.target = null;
  $('#travelT').textContent = label; $('#travelBar').style.width = '0'; $('#travel').classList.add('on');
  const t0 = performance.now(), dur = 1800; let moved = false;
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur); $('#travelBar').style.width = `${Math.round((1 - Math.pow(1 - k, 2)) * 100)}%`;
    if (k > 0.55 && !moved) { moved = true; const old = me.pos.clone(); me.pos.copy(where()); me.pos.y = me.inHome ? ROOM.y : height(me.pos.x, me.pos.z); V.copy(me.pos).sub(old); camera.position.add(V); controls.target.copy(me.pos).add(V.set(0, 1.1, 0)); if (me.inHome) camera.position.set(ROOM.x + 1, ROOM.y + 7.2, ROOM.z + 6.4); layGrass(me.pos.x, me.pos.z); }   // 집 안은 문 쪽 위에서 방 전체가 보이게
    if (k < 1) requestAnimationFrame(step); else { bringAnimals(); setTimeout(() => { $('#travel').classList.remove('on'); travelling = false; }, 250); }
  };
  requestAnimationFrame(step);
}
// 무리 곁 빈자리: 같은 구역 안에서 무리를 바라볼 수 있게 8~11 m 떨어진 곳
function herdOf(zone) {
  const a = animals.find((x) => x.zone === zone); if (!a) return VIL.clone();
  for (let i = 0; i < 24; i++) { const ang = i * 0.9, r = 8 + (i % 3) * 1.5, x = a.home.x + Math.sin(ang) * r, z = a.home.z + Math.cos(ang) * r; if (zoneAt(x, z) === zone && riverNear(x, z).d > 8) return new THREE.Vector3(x, 0, z); }
  return a.home.clone();
}
// 마을가기: 산꼭대기에서는 케이블카, 섬에서는 배로 돌아와요
$('#home').onclick = () => { if (curZone === 'arctic') $('#cable').onclick(); else if (curZone === 'isle') rideFerry(); else travelTo('마을로 돌아가는 중', () => VIL.clone().add(V.set(0, 0, 8))); };
$('#goHome').onclick = () => enterHome();   // 어디서든 맨 위 단추로 집 안에 들어가요
$('#goSav').onclick = () => travelTo('초원으로 가는 중', () => YARD.savanna.pos.clone());
$('#goDes').onclick = () => travelTo('사막으로 가는 중', () => YARD.desert.pos.clone());
// 지금 있는 구역의 단추는 숨겨요 (마을에선 '마을로'가 없어요). 산꼭대기에선 케이블카가 '마을로 내려가기'
function updMoves(z) {
  // 다섯 단계: 마을(+마을 바닷가) → 초원 → 사막 → 산꼭대기 → 섬(+섬 바닷가). 지금 있는 곳의 단추만 숨겨요
  $('#home').hidden = z === 'village'; $('#goSav').hidden = z === 'savanna'; $('#goDes').hidden = z === 'desert'; $('#cable').hidden = z === 'arctic'; $('#ferry').hidden = z === 'isle';
}


// 🪙 이모지는 기기마다 그림이 달라서(아이폰은 물개처럼 보여요) 화면에 나올 때 우리 금화 그림으로 바꿔요. 글에는 🪙 그대로 쓰면 돼요
{ const img = document.createElement('img'); img.src = 'world/coin.svg'; img.alt = '코인'; img.className = 'ci';
  const coinize = (root) => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), L = []; while (w.nextNode()) if (w.currentNode.nodeValue.includes('🪙')) L.push(w.currentNode);
    for (const n of L) { const f = document.createDocumentFragment(); n.nodeValue.split('🪙').forEach((t, i) => { if (i) f.append(img.cloneNode()); if (t) f.append(t); }); n.replaceWith(f); } };
  coinize(document.body);
  new MutationObserver((ms) => { for (const m of ms) { if (m.type === 'characterData') { if (m.target.parentNode) coinize(m.target.parentNode); } else for (const n of m.addedNodes) { if (n.nodeType === 1) coinize(n); else if (n.nodeType === 3 && n.parentNode) coinize(n.parentNode); } } }).observe(document.body, { subtree: true, childList: true, characterData: true }); }

// ───────── ⚙ 설정 (이 기기에 기억): 걷는 속도 · 배경음악 · 배경음 ─────────
const SET = (() => { try { return { speed: 1, music: 0.5, amb: 0.7, lowq: LOWQ, ...JSON.parse(localStorage.getItem('snapzoo-island-settings') || '{}') }; } catch { return { speed: 1, music: 0.5, amb: 0.7 }; } })();
const saveSet = () => { try { localStorage.setItem('snapzoo-island-settings', JSON.stringify(SET)); } catch {} };
const snd = new IslandSound(); snd.vol.music = SET.music; snd.vol.amb = SET.amb;
const startSound = () => snd.start();
addEventListener('pointerdown', startSound); addEventListener('keydown', startSound);
function showSet() {
  $('#sLow').checked = !!SET.lowq; $('#sTime').value = SET.time || 'auto';
  $('#sSpeed').value = SET.speed; $('#sSpeedV').textContent = `${SET.speed.toFixed(1)}배`;
  $('#sMusic').value = SET.music; $('#sMusicV').textContent = SET.music ? `${Math.round(SET.music * 100)}` : '끔';
  $('#sAmb').value = SET.amb; $('#sAmbV').textContent = SET.amb ? `${Math.round(SET.amb * 100)}` : '끔';
}
$('#setBtn').onclick = (e) => { e.stopPropagation(); closeDrawer(); const was = $('#settings').classList.contains('on'); closePanels(); if (was) $('#settings').classList.add('on'); $('#settings').classList.toggle('on'); showSet(); };
addEventListener('pointerdown', (e) => { if (!e.target.closest('#settings, #setBtn')) $('#settings').classList.remove('on'); });
$('#sLow').onchange = (e) => { SET.lowq = e.target.checked; saveSet(); location.reload(); };
$('#sTime').onchange = (e) => { SET.time = e.target.value; saveSet(); frame.tod = 0; };
$('#sSpeed').oninput = (e) => { SET.speed = +e.target.value; saveSet(); showSet(); };
$('#sMusic').oninput = (e) => { SET.music = +e.target.value; snd.setVolume('music', SET.music); saveSet(); showSet(); };
$('#sAmb').oninput = (e) => { SET.amb = +e.target.value; snd.setVolume('amb', SET.amb); saveSet(); showSet(); };

// ───────── 📷 사진 찍기 (아이용 동물 왕국처럼): 뷰파인더로 바꿔 움직이는 동물을 따라 조준 · 확대 · 찰칵 → 점수 · 별 · 도감 ─────────
//  점수 = 가운데 40 + 크기 30 + 특별한 순간 30 (♥ 반가워할 때 · 나를 바라볼 때 · 돌고래가 뛰어오를 때)
// 도감 · 사진 순서: 마을 → 마을 바닷가 → 초원 → 사막 → 정글 → 산꼭대기 → 섬 → 섬 바닷가
const ZORDER = ['village', 'sea', 'savanna', 'desert', 'jungle', 'arctic', 'isle', 'islesea'];
const DEX = ROSTER.map(([zone, id, name, , , , , , night]) => [id, name, zone, night]).sort((a, b) => ZORDER.indexOf(a[2]) - ZORDER.indexOf(b[2]));
const ZLAB = { village: '마을', sea: '마을 바닷가', savanna: '초원', desert: '사막', jungle: '정글', arctic: '산꼭대기', isle: '섬', islesea: '섬 바닷가' };
let dex = (() => { try { return JSON.parse(localStorage.getItem('snapzoo-island-dex') || '{}'); } catch { return {}; } })();
const saveDex = () => { try { localStorage.setItem('snapzoo-island-dex', JSON.stringify(dex)); } catch {} };
const starsOf = (sc) => (sc >= 85 ? 3 : sc >= 60 ? 2 : sc > 0 ? 1 : 0);
const starHTML = (n) => `<span class="st" aria-label="별 ${n}개"><i>${'★'.repeat(n)}</i><u>${'★'.repeat(3 - n)}</u></span>`;   // 빈 별은 흐린 색으로 (글꼴이 ☆ 를 ★ 처럼 그려서)
let withFriends = false, wantShot = false, shots = 0, mode = 'walk', zoom = 1, target = null, manualAim = 0, hintT2 = 0, raiseT = 0;
const aim = { yaw: 0, pitch: 0 }, fcam = new THREE.PerspectiveCamera(50, 1, 0.1, 2600), EYE = new THREE.Vector3();
function enterPhoto() {
  if (me.riding || mode === 'photo') return; standUp();
  mode = 'photo'; me.target = null; zoom = 1; target = null; manualAim = 0; raiseT = 0.55; me.st.aim = 1;
  camera.getWorldDirection(V); aim.yaw = Math.atan2(V.x, V.z); aim.pitch = 0;
  const tg = (EYE.copy(me.pos).y += [1.5, 1.32, 1.02][MY.body], pickTarget()); if (tg) aim.yaw = Math.atan2(tg.c.x - EYE.x, tg.c.z - EYE.z);
  me.face = aim.yaw; controls.enabled = false; document.body.classList.add('photo', 'raising'); $('#finder').setAttribute('aria-hidden', 'false');
  animals.forEach((a) => a.tag.classList.remove('on')); hideHint(); snd.start(); updZoom();
}
function exitPhoto() { if (mode !== 'photo') return; mode = 'walk'; $('#toast').classList.remove('on'); me.g.visible = true; me.st.aim = 0; controls.enabled = true; document.body.classList.remove('photo', 'raising'); $('#finder').setAttribute('aria-hidden', 'true'); }
$('#shot').onclick = enterPhoto;
// 📱 게임 화면이 확대되지 않게 (사파리는 viewport 설정을 안 따라요): 두 손가락 · 두 번 톡톡 막기
['gesturestart', 'gesturechange', 'gestureend', 'dblclick'].forEach((n) => document.addEventListener(n, (e) => e.preventDefault(), { passive: false }));
{ let lastTap = 0; document.addEventListener('touchend', (e) => { const t = Date.now(); if (t - lastTap < 350 && !e.target.closest('button, a, input, select, textarea, label')) e.preventDefault(); lastTap = t; }, { passive: false }); }
$('#fExit').onclick = exitPhoto;
$('#fShot').onclick = () => { wantShot = true; };
const updZoom = () => { $('#zLab').textContent = `${zoom.toFixed(1)}×`; };
const setZoom = (z) => { zoom = clamp(Math.round(z * 10) / 10, 1, camOf().zoom); updZoom(); };   // 사진기마다 최대 배율
$('#zIn').onclick = () => setZoom(zoom + 0.5); $('#zOut').onclick = () => setZoom(zoom - 0.5);
addEventListener('keydown', (e) => {
  if (e.target !== document.body || $('#album').classList.contains('on') || $('#dex').classList.contains('on')) return;
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (mode === 'photo') wantShot = true; else enterPhoto(); }
  if (mode === 'photo' && e.code === 'Escape') exitPhoto();
  if (mode === 'photo' && (e.key === '+' || e.key === '=')) setZoom(zoom + 0.5);
  if (mode === 'photo' && e.key === '-') setZoom(zoom - 0.5);
});
canvas.addEventListener('wheel', (e) => { if (mode !== 'photo') return; e.preventDefault(); setZoom(zoom - Math.sign(e.deltaY) * 0.25); }, { passive: false });
// 뷰파인더에서 끌면 직접 조준 (2.5초 동안은 자동 조준을 쉬어요)
let fdrag = null;
canvas.addEventListener('pointerdown', (e) => { if (mode === 'photo') fdrag = [e.clientX, e.clientY]; });
addEventListener('pointermove', (e) => { if (mode !== 'photo' || !fdrag) return; const k = 0.0042 / zoom; aim.yaw -= (e.clientX - fdrag[0]) * k; aim.pitch = clamp(aim.pitch - (e.clientY - fdrag[1]) * k, -0.6, 0.7); fdrag = [e.clientX, e.clientY]; manualAim = 2.5; });
addEventListener('pointerup', () => { fdrag = null; });
// 찍을 수 있는 것들: 동물 + 돌고래
// 눈에서 그 점까지 땅(언덕)이 가리는지: 1 m 씩 따라가며 땅 높이와 견줘요
function seenFrom(eye, c) {
  const d = eye.distanceTo(c), n = Math.ceil(d);
  for (let i = 1; i < n; i++) { const k = i / n, x = eye.x + (c.x - eye.x) * k, z = eye.z + (c.z - eye.z) * k, y = eye.y + (c.y - eye.y) * k; if (height(x, z) > y + 0.15) return false; if (i > 1 && n - i > 1 && occAt(x, y, z)) return false; }
  return true;
}
function subjects() {
  const out = [], eye = (EYE.lengthSq() ? EYE : me.pos);
  for (const a of animals) {
    if (!a.g.visible) continue; const h = a.tagH - 0.35, c = a.pos.clone(); c.y += h * 0.55;
    if (c.distanceTo(eye) > Math.min(45, Math.max(9, h * 30)) || !seenFrom(eye, c)) continue;   // 멀거나 언덕 너머면 안 찍혀요 (작은 동물은 가까이서만)
    const toMe = Math.atan2(me.pos.x - a.pos.x, me.pos.z - a.pos.z), look = Math.abs(Math.atan2(Math.sin(toMe - a.g.rotation.y), Math.cos(toMe - a.g.rotation.y))) < 0.55 && a.pos.distanceTo(me.pos) < 20;
    out.push({ id: a.id, name: a.name, c, h, moment: a.heart > 0 || a.call > 0 ? '♥ 반가워해요' : look ? '나를 바라봐요' : '' });
  }
  for (const d of dolphins) { if (d.g.position.y < -0.6 || d.g.position.distanceTo(eye) > 45 || !seenFrom(eye, d.g.position)) continue; out.push({ id: 'dolphin', name: '돌고래', c: d.g.position.clone(), h: 1.1, moment: d.g.position.y > 1 ? '뛰어올랐어요' : '' }); }   // 물 위로 보일 때만
  return out;
}
function pickTarget() {
  let best = null, bs = Infinity;
  for (const o of subjects()) {
    const d = Math.hypot(o.c.x - EYE.x, o.c.z - EYE.z); if (d > 45 || d < 0.8) continue;
    let dy = Math.atan2(o.c.x - EYE.x, o.c.z - EYE.z) - aim.yaw; dy = Math.abs(Math.atan2(Math.sin(dy), Math.cos(dy))); if (dy > 1.8) continue;
    const sc = d * (1 + dy * 0.8); if (sc < bs) { bs = sc; best = o; }
  }
  return best;
}
function updatePhoto(dt) {
  EYE.copy(me.pos); EYE.y += [1.5, 1.32, 1.02][MY.body];   // 눈높이 = 체형마다
  if (raiseT > 0) { raiseT -= Math.max(dt, 1 / 30); me.face = aim.yaw; if (raiseT <= 0) { me.g.visible = false; document.body.classList.remove('raising'); } }
  if (manualAim > 0) manualAim -= dt;
  const tg = manualAim <= 0 ? pickTarget() : null;
  if (tg) {   // 조금 늦게 따라가서, 움직이는 동물은 살짝 벗어나요 (타이밍 놀이)
    const yaw = Math.atan2(tg.c.x - EYE.x, tg.c.z - EYE.z), pitch = Math.atan2(tg.c.y - EYE.y, Math.hypot(tg.c.x - EYE.x, tg.c.z - EYE.z));
    aim.yaw += Math.atan2(Math.sin(yaw - aim.yaw), Math.cos(yaw - aim.yaw)) * Math.min(1, dt * 3.2); aim.pitch += (pitch - aim.pitch) * Math.min(1, dt * 3.2);
  }
  fcam.position.copy(EYE); fcam.lookAt(EYE.x + Math.sin(aim.yaw) * Math.cos(aim.pitch), EYE.y + Math.sin(aim.pitch), EYE.z + Math.cos(aim.yaw) * Math.cos(aim.pitch));
  const fov = 50 / zoom; if (Math.abs(fcam.fov - fov) > 0.01) { fcam.fov += (fov - fcam.fov) * Math.min(1, dt * 10); fcam.updateProjectionMatrix(); }
  if ((hintT2 += dt) > 0.15) { hintT2 = 0; showHint(evaluate()); }
}
function evaluate() {
  const fr = $('#frame').getBoundingClientRect(); if (!fr.width) return null;
  const fcx = fr.left + fr.width / 2, fcy = fr.top + fr.height / 2, f = new THREE.Vector3(); fcam.getWorldDirection(f);
  const tanH = Math.tan(THREE.MathUtils.degToRad(fcam.fov) / 2); let best = null; const all = [];
  for (const o of subjects()) {
    const depth = V.copy(o.c).sub(fcam.position).dot(f); if (depth < 0.5) continue;
    V.copy(o.c).project(fcam); const px = (V.x + 1) / 2 * innerWidth, py = (1 - V.y) / 2 * innerHeight, dx = px - fcx, dy = py - fcy;
    if (Math.abs(dx) > fr.width / 2 || Math.abs(dy) > fr.height / 2) continue;
    const nd = Math.hypot(dx / (fr.width / 2), dy / (fr.height / 2)) / Math.SQRT2;
    const center = Math.round(SCORE.center * Math.max(0, 1 - nd / 0.7));
    const ratio = (o.h / (2 * depth * tanH) * innerHeight) / fr.height;
    const size = ratio > 1.05 ? 0 : Math.round(SCORE.size * Math.max(0, 1 - Math.abs(ratio - 0.45) / 0.33));
    const moment = o.moment ? SCORE.moment : 0, total = center + size + moment;
    all.push({ o, total }); if (!best || total > best.total) best = { o, center, size, moment, total, ratio };
  }
  if (best) best.all = all;
  return best;
}
const SCORE = { center: 40, size: 30, moment: 30 };
function showHint(ev) {
  if (!ev) { $('#fhint').textContent = '동물을 네모 안에 담아 보세요 · 끌어서 조준'; return; }
  const tip = ev.ratio < 0.22 ? '조금 더 가까이' : ev.ratio > 0.85 ? '너무 가까워요' : ev.center < 26 ? '가운데로 맞춰요' : !ev.moment ? '인사하면 반겨 줘요' : ev.o.moment;
  $('#fhint').textContent = `${ev.o.name} · ${ev.total}점 · ${tip}`;
}
let lastShot = -1e9;   // 연타 금지: 1초에 한 번만 찍혀요
function shoot() {
  if (mode !== 'photo' || raiseT > 0) return;
  const nowT = performance.now(); if (nowT - lastShot < 1000) return; lastShot = nowT;
  const ev0 = evaluate();
  if (!ev0) { const t = $('#toast'); t.querySelector('img').removeAttribute('src'); t.querySelector('span').innerHTML = '<b>동물이 네모 안에 없어요</b><small>동물을 가운데에 담고 찰칵!</small>'; t.classList.add('on'); clearTimeout(shoot.tt); shoot.tt = setTimeout(() => t.classList.remove('on'), 1800); return; }
  me.st.snapT = 0.18;
  const ev = ev0, fr = $('#frame').getBoundingClientRect(), k = renderer.getPixelRatio();
  const shot = document.createElement('canvas'); shot.width = 1000; shot.height = 750;
  { const sg = shot.getContext('2d'); sg.filter = camOf().filter || 'none'; sg.drawImage(renderer.domElement, fr.left * k, fr.top * k, fr.width * k, fr.height * k, 0, 0, 1000, 750); }   // 사진기마다 색감
  const zone = ZONES[curZone || 'village'][0], at = new Date(), sp = ev?.o, score = ev?.total || 0, stars = starsOf(score);
  $('#flash').classList.add('on'); requestAnimationFrame(() => setTimeout(() => $('#flash').classList.remove('on'), 60)); snd.shutter();
  shots = (shots + 1) % 1000;   // 친구들 화면에 '📷' 이 잠깐 떠요
  let badge = '', isNew = false;
  let earn = 0, note = ''; const spot = spotHere(), friends2 = [];
  // 🪙 코인 규칙 (2026-11-07): 새 도감 20 + 점수/10 · 최고 점수 넘김 5 + 점수/10 · 같거나 낮으면 10 (같은 동물 1분에 한 번) · 두 마리 이상 +20 (1분에 한 번) · 포토 스팟 +30 (스팟마다 하루 한 번)
  if (sp) {
    const old = dex[sp.id], nowT2 = Date.now(), day = new Date().toDateString(); MY.payT ||= {};
    if (!old) { badge = '새 도감 등록!'; isNew = true; dex[sp.id] = { score, stars, shots: 1, at: nowT2 }; earn = 20 + Math.round(score / 10); }
    else if (score > old.score) { badge = '최고 사진 바꿈!'; Object.assign(old, { score, stars, shots: old.shots + 1, at: nowT2 }); earn = 5 + Math.round(score / 10); }
    else { old.shots++; if (nowT2 - (MY.payT[sp.id] || 0) >= 60000) { MY.payT[sp.id] = nowT2; earn = 10; badge = `최고 사진은 ${old.score}점이에요`; } else { badge = `최고 ${old.score}점을 넘거나 1분 뒤에 코인을 받아요`; } }
    // 네모 안의 다른 동물도 도감에 올려요 (두세 마리까지)
    const seenIds = new Set([sp.id]);
    for (const x of [...(ev.all || [])].sort((a, b) => b.total - a.total)) {
      if (seenIds.has(x.o.id) || seenIds.size >= 3) continue; seenIds.add(x.o.id); friends2.push(x.o);
      const d2 = dex[x.o.id], s2 = x.total;
      if (!d2) { dex[x.o.id] = { score: s2, stars: starsOf(s2), shots: 1, at: nowT2 }; earn += 20 + Math.round(s2 / 10); isNew = true; badge = '새 도감 등록!'; }
      else { d2.shots++; if (s2 > d2.score) Object.assign(d2, { score: s2, stars: starsOf(s2), at: nowT2 }); }
    }
    if ((ev.all || []).length >= 2 && nowT2 - (MY.payT.duo || 0) >= 60000) { MY.payT.duo = nowT2; earn += 20; note = ' · 두 마리 +20'; }
    if (spot) { MY.spotDay ||= {}; if (MY.spotDay[spot.name] !== day) { MY.spotDay[spot.name] = day; earn += 30; } }
    MY.coins += earn; saveMy(); updCoins(); saveDex(); if (isNew) checkTitles();
    if (stars >= 3) bump('star3');
  }
  bump('shot');
  // 글꼴을 오래 기다리지 않아요 (사파리에서 대답이 늦어도 결과는 떠야 해요)
  Promise.race([document.fonts.load('40px OngleipUnz').catch(() => {}), new Promise((r) => setTimeout(r, 800))]).then(() => {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1010; const g = c.getContext('2d');
    g.fillStyle = camOf().frame; g.fillRect(0, 0, 1080, 1010);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(120,100,70,${Math.random() * 0.05})`; g.fillRect(Math.random() * 1080, Math.random() * 1010, 2, 2); }
    g.drawImage(shot, 40, 40); g.strokeStyle = 'rgba(60,40,20,.25)'; g.lineWidth = 2; g.strokeRect(40, 40, 1000, 750);
    g.fillStyle = '#3a2e24'; g.font = '58px OngleipUnz, sans-serif'; g.fillText(sp ? sp.name : zone, 52, 870);
    if (sp) { const x0 = 52 + g.measureText(sp.name).width + 26; g.font = '46px OngleipUnz, sans-serif'; for (let i = 0; i < 3; i++) { g.fillStyle = i < stars ? '#e0a030' : '#ddd3c2'; g.fillText('★', x0 + i * 50, 866); } }
    g.fillStyle = '#7a6a5a'; g.font = '38px OngleipUnz, sans-serif'; g.fillText(sp ? `${spot ? '' + spot.name : zone} · ${score}점${sp.moment ? ' · ' + sp.moment : ''}` : '조용한 한때', 54, 930);
    g.font = '24px OngleipUnz, sans-serif'; g.fillStyle = 'rgba(90,70,50,.55)'; g.textAlign = 'right'; g.fillText('Snapzoo · snapzoo.site', 1032, 985); g.textAlign = 'left';   // 공유할 때 보이는 작은 표시
    g.textAlign = 'right'; g.font = '32px OngleipUnz, sans-serif'; g.fillText(`${at.getFullYear()}. ${at.getMonth() + 1}. ${at.getDate()}`, 1032, 930);
    // 결과(폴라로이드 · 점수 · 도감)를 먼저 보여 주고, 앨범 저장은 그 뒤에 해요. 저장이 막혀도 결과는 떠요
    const done = async (blob, src) => {
      const t = $('#toast'); t.querySelector('img').src = src;
      const msg = sp ? `<b>${[sp.name, ...friends2.map((o) => o.name)].join(' · ')} ${starHTML(stars)} ${score}점</b><small>${badge}${earn ? ` · 🪙 +${earn}` : ''}${note}${spot ? ` · ${spot.name}` : ''}</small>` : '<b>찰칵!</b><small>동물은 안 찍혔어요</small>';
      t.querySelector('span').innerHTML = msg;
      t.classList.add('on'); clearTimeout(shoot.tt); shoot.tt = setTimeout(() => { t.classList.remove('on'); if (src.startsWith('blob:')) URL.revokeObjectURL(src); }, 4500);
      if (isNew) snd.chime();
      let ok = !!blob;
      if (blob) {
        ok = await addPhoto({ blob, zone, seen: sp ? [sp.name, ...friends2.map((o) => o.name)] : [], animal: sp?.id || '', also: friends2.map((o) => o.id), score });
        if (sp && (isNew || badge === '최고 사진 바꿈!')) await addPhoto({ id: `best-${sp.id}`, blob, zone, seen: [sp.name], animal: sp.id, score });
      }
      if (!ok) t.querySelector('span').innerHTML = `${msg}<small>앨범에 저장하지 못했어요 (사파리 개인 정보 보호 탭이면 일반 탭으로 열어 주세요)</small>`;
    };
    try { c.toBlob((blob) => { if (blob) done(blob, URL.createObjectURL(blob)); else done(null, c.toDataURL('image/jpeg', 0.9)); }, 'image/jpeg', 0.9); }
    catch { done(null, c.toDataURL('image/jpeg', 0.9)); }
  });
}
// 📖 도감: 열두 식구, 종마다 가장 잘 찍은 사진 한 장
// 사진이 무서운 어린이도 볼 수 있게 도감은 글자만. 사진은 [📷 사진 보기] 를 눌렀을 때만 (2026-11-07)
let dexTab = 'dex';
let dexCat = 'all';
const DCATS = [['all', '전체'], ['village', '마을'], ['sea', '마을 바닷가'], ['savanna', '초원'], ['desert', '사막'], ['jungle', '정글'], ['arctic', '산꼭대기'], ['isle', '섬'], ['islesea', '섬 바닷가'], ['bug', '곤충']];
let dexPic = false; try { dexPic = localStorage.getItem('snapzoo-dex-pic') === '1'; } catch {}
let dexThumbs = [];
// 사진 보기를 켜면 동물마다 사진 칸. 내가 찍은 사진이 있으면 그것, 없으면 실제 사진
function dexChips(cat) {
  if (cat === 'bug') { const B = MY.bugs || {}; return BUG_KINDS.map(([n]) => `<div class="dchip ${B[n] ? 'got' : ''}">${n}</div>`).join(''); }
  return DEX.filter((d) => d[2] === cat).map(([id, name]) => {
    if (!dexPic) return dex[id] ? `<button type="button" class="dchip got" data-id="${id}">${name}</button>` : `<div class="dchip">${name}</div>`;
    if (!dex[id]) return `<div class="dpic none"><span class="ph"></span><b>${name}</b></div>`;
    const ph = DEX_PHOTOS[id]; return `<button type="button" class="dpic" data-id="${id}"><span class="ph"><img data-pid="${id}" alt="" ${ph ? `src="world/${ph.src || 'dex/' + id + '.jpg'}"` : ''} loading="lazy"></span><b>${name}</b></button>`;
  }).join('');
}
async function fillDexPics() {
  dexThumbs.forEach((u) => URL.revokeObjectURL(u)); dexThumbs = []; if (!dexPic) return;
  const all = await listPhotos();
  document.querySelectorAll('#dexGrid img[data-pid]').forEach((im) => { const id = im.dataset.pid, p = all.find((x) => x.id === `best-${id}`) || all.find((x) => x.animal === id); if (p?.blob) { const u = URL.createObjectURL(p.blob); dexThumbs.push(u); im.src = u; } });
}
function drawDex() {
  const B = MY.bugs || {}, isDex = dexTab === 'dex', bs = BADGES.filter((b) => (MY.badges || []).includes(b.id)).length;
  const inCat = (c) => (c === 'bug' ? BUG_KINDS.map(([n]) => !!B[n]) : DEX.filter((d) => c === 'all' || d[2] === c).map(([id]) => !!dex[id]));
  const L = dexCat === 'all' ? [...inCat('all'), ...inCat('bug')] : inCat(dexCat);
  $('#dexN').textContent = isDex ? `${L.filter(Boolean).length} / ${L.length}` : `${bs} / ${BADGES.length}`;
  document.querySelectorAll('#dexTabs [data-t]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.t === dexTab)));
  $('#dexPicBox').hidden = !isDex; $('#dexPicOn').checked = dexPic;
  $('#dexGrid').className = isDex ? (dexPic ? 'text pics' : 'text') : 'badges';
  const bcard = (b) => `<div class="bdg ${(MY.badges || []).includes(b.id) ? 'got' : ''}"><i>${ICON[BADGE_ICON[b.id]] || ICON.medal}</i><b>${b.name}</b><small>${b.cap}</small></div>`;
  $('#dexGrid').innerHTML = isDex
    ? `<div class="dcats">${DCATS.map(([k, l]) => `<button type="button" data-cat="${k}" class="${dexCat === k ? 'on' : ''}">${l}</button>`).join('')}</div>` + (dexCat === 'all' ? DCATS.slice(1).map(([k, l]) => `<h4 class="dsec">${l}</h4>${dexChips(k)}`).join('') : dexChips(dexCat))
    : `<h4 class="dsec">탐험</h4>${BADGES.filter((b) => b.ex).map(bcard).join('')}<h4 class="dsec">사진 · 활동</h4>${BADGES.filter((b) => !b.ex && !b.id.startsWith('tt-')).map(bcard).join('')}<h4 class="dsec">칭호</h4>${BADGES.filter((b) => b.id.startsWith('tt-')).map(bcard).join('')}`;
  fillDexPics();
}
$('#dexPicOn').onchange = (e) => { dexPic = e.target.checked; try { localStorage.setItem('snapzoo-dex-pic', dexPic ? '1' : '0'); } catch {} drawDex(); };
async function openDex() {
  closePanels(); closeDrawer(); checkBadges(); drawDex();
  $('#dex').classList.add('on'); $('#dex').setAttribute('aria-hidden', 'false'); $('#dexX').focus({ preventScroll: true });
}
$('#dexTabs').addEventListener('click', (e) => { const t = e.target.closest('[data-t]')?.dataset.t; if (t) { dexTab = t; drawDex(); } });
// 📷 모은 동물 사진 크게 보기: 내가 찍은 가장 좋은 사진 + 실제 동물 사진, 옆으로 넘겨요
let dvList = [], dvI = 0;
function dvShow() {
  const x = dvList[dvI]; $('#dvImg').src = x.src; $('#dvImg').alt = x.cap;
  $('#dvCap').textContent = `${x.cap} (${dvI + 1} / ${dvList.length})`;
}
function dvFlip(n) { dvI = (dvI + n + dvList.length) % dvList.length; dvShow(); }
function dvClose() { $('#dexView').classList.remove('on'); dvList.forEach((x) => { if (x.src.startsWith('blob:')) URL.revokeObjectURL(x.src); }); dvList = []; }
$('#dexGrid').addEventListener('click', (e) => { const k = e.target.closest('[data-cat]'); if (k) { dexCat = k.dataset.cat; drawDex(); return; } const c = e.target.closest('[data-id]'); if (c) openPics(c.dataset.id); });
async function openPics(want) {
  const all = await listPhotos(), out = []; let at = -1;
  for (const [id, name] of DEX) {
    if (!dex[id]) continue; if (id === want) at = out.length;
    let mine = all.filter((p) => (p.animal === id || (p.also || []).includes(id)) && !String(p.id).startsWith('best-')); if (!mine.length) mine = all.filter((p) => p.id === `best-${id}`);
    mine.forEach((p, n) => out.push({ src: URL.createObjectURL(p.blob), cap: `${name} · 내 사진 ${n + 1}` }));
    const ph = DEX_PHOTOS[id]; if (ph) out.push({ src: `world/${ph.src || 'dex/' + id + '.jpg'}`, cap: `${name} · 실제 사진 (${ph.by})` });
  }
  if (!out.length) { toastMsg('아직 볼 사진이 없어요', '동물을 찍으면 여기에 모여요'); return; }
  if (want && at >= out.length) at = 0;
  dvList = out; dvI = Math.max(0, at); dvShow(); $('#dexView').classList.add('on');
}
$('#dvPrev').onclick = () => dvFlip(-1); $('#dvNext').onclick = () => dvFlip(1); $('#dvX').onclick = dvClose;
{ let x0 = null; $('#dexView').addEventListener('pointerdown', (e) => { x0 = e.clientX; }); $('#dexView').addEventListener('pointerup', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 50) dvFlip(e.clientX < x0 ? 1 : -1); x0 = null; }); }
addEventListener('keydown', (e) => { if (!$('#dexView').classList.contains('on')) return; if (e.key === 'Escape') dvClose(); if (e.key === 'ArrowLeft') dvFlip(-1); if (e.key === 'ArrowRight') dvFlip(1); });
function closeDex() { $('#dex').classList.remove('on'); $('#dex').setAttribute('aria-hidden', 'true'); }
$('#dexBtn').onclick = () => ($('#dex').classList.contains('on') ? closeDex() : (closeAlbum(), openDex()));
$('#dexX').onclick = closeDex;
// 🖼 앨범
let urls = [], viewing = null, albumList = [], viewI = 0;
async function openAlbum() {
  closePanels();
  const list = (await listPhotos()).filter((p) => !String(p.id).startsWith('best-')); urls.forEach((u) => URL.revokeObjectURL(u)); urls = [];
  $('#albumN').textContent = list.length ? `${list.length}장` : '';
  $('#grid').innerHTML = list.length ? '' : '<p class="empty">아직 사진이 없어요. 사진 찍기로 동물을 담아 보세요</p>';
  albumList = list;
  list.forEach((ph, i) => { const u = URL.createObjectURL(ph.blob); urls.push(u); const b = document.createElement('button'); b.setAttribute('aria-label', `${ph.zone} 사진 크게 보기`); b.innerHTML = `<img src="${u}" alt="" style="--tilt:${((i * 37) % 7) - 3}deg">`; b.onclick = () => { viewI = i; view(ph, u); }; $('#grid').append(b); });
  $('#album').classList.add('on'); $('#album').setAttribute('aria-hidden', 'false');
}
function closeAlbum() { $('#album').classList.remove('on'); $('#album').setAttribute('aria-hidden', 'true'); }
function view(ph, u) { viewing = ph; $('#viewer img').src = u; $('#vN').textContent = `${viewI + 1} / ${albumList.length}`; const d = new Date(ph.at); $('#vSave').href = u; $('#vSave').download = `스냅주-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${d.getHours()}${d.getMinutes()}.jpg`; $('#viewer').classList.add('on'); }
$('#albumBtn').onclick = () => ($('#album').classList.contains('on') ? closeAlbum() : (closeDex(), openAlbum()));
$('#albumX').onclick = closeAlbum;
$('#vX').onclick = () => $('#viewer').classList.remove('on');
function flip(d) { if (!albumList.length) return; viewI = (viewI + d + albumList.length) % albumList.length; view(albumList[viewI], urls[viewI]); $('#vN').textContent = `${viewI + 1} / ${albumList.length}`; }
$('#vPrev').onclick = () => flip(-1); $('#vNext').onclick = () => flip(1);
addEventListener('keydown', (e) => { if (!$('#viewer').classList.contains('on')) return; if (e.code === 'ArrowLeft') { flip(-1); e.stopImmediatePropagation(); } if (e.code === 'ArrowRight') { flip(1); e.stopImmediatePropagation(); } }, true);
let swipeX = null; $('#viewer').addEventListener('pointerdown', (e) => { swipeX = e.clientX; }); $('#viewer').addEventListener('pointerup', (e) => { if (swipeX !== null && Math.abs(e.clientX - swipeX) > 50) flip(e.clientX < swipeX ? 1 : -1); swipeX = null; });
$('#vHang').onclick = () => { if (!viewing) return; const H = MY.home ||= { wall: 'cream', items: [], pics: [] }; if (H.pics.includes(viewing.id)) { toastMsg('이미 벽에 걸려 있어요', '집 안 꾸미기에서 내릴 수 있어요'); return; } if (H.pics.length >= PICS.length) { toastMsg('벽이 꽉 찼어요', '집 안 꾸미기에서 내린 뒤 걸어 주세요'); return; } H.pics.push(viewing.id); saveMy(); toastMsg('집 벽에 걸었어요', '우리 집에 들어가면 보여요'); };
$('#vDel').onclick = async () => { if (!viewing) return; await removePhoto(viewing.id); $('#viewer').classList.remove('on'); openAlbum(); };
addEventListener('keydown', (e) => { if (e.key === 'Escape') { if ($('#viewer').classList.contains('on')) $('#viewer').classList.remove('on'); else { closeAlbum(); closeDex(); $('#settings').classList.remove('on'); } } });




// ───────── 👤 꾸미기 · 🛍 상점: 성별 · 옷 · 모자 · 액세서리 · 머리색. 안 가진 건 사진으로 모은 코인으로 사요 ─────────
const PRICE = { look: 800, hat: [0, 1000, 800, 1500, 2000, 0, 900, 3000, 2200, 1400, 1400, 1000, 1600, 1500, 1500, 1800, 2000, 1000] };   // 🪙 1초에 1개씩 모여요 (하루 최대 3600)
const SW = ['#6f7d4c', '#4f6a8a', '#a8604a', '#d8b062', '#7a5a8a', '#3f6a5a', '#c8907a', '#5a5a62'];
const LOOK_NAMES = ['풀빛 옷', '바다빛 옷', '벽돌빛 옷', '모래빛 옷', '포도빛 옷', '숲빛 옷', '살구빛 옷', '잿빛 옷'];
const lookName = (i) => LOOKS[i].name || LOOK_NAMES[i], lookPrice = (i) => LOOKS[i].price || PRICE.look, lookColor = (i) => SW[i] || LOOKS[i].shirt;
function updCoins() { const left = Math.max(0, 3600 - (MY.today?.sec || 0)); $('#coins').textContent = `🪙 ${MY.coins}${left ? '' : ' · 오늘 다 모았어요'}`; $('#ccoins').textContent = `🪙 ${MY.coins} · 오늘 ${Math.floor((MY.today?.sec || 0) / 60)}분 / 60분`; }
function remakeMe() {
  const ns = makeWalker(MY.look, myWear()); ns.root.position.copy(me.g.position); ns.root.rotation.y = me.g.rotation.y; ns.root.visible = me.g.visible;
  scene.remove(me.g); scene.add(ns.root); me.g = ns.root; me.st = ns;
}
let pendingBuy = null;
// 소호랩처럼 묶음별 카드: 그림 · 이름 · 설명 · 가격. 캐릭터 창은 가진 것만, 상점은 전부
function card(attr, thumb, name, sub, own, on, price, ask) {
  return `<button type="button" ${attr} class="scard ${own ? 'owned' : 'lock'} ${on ? 'on' : ''} ${ask ? 'ask' : ''}"><span class="th">${thumb}</span><b>${name}</b>${sub ? `<small>${sub}</small>` : ''}<em>${ask ? '한 번 더 누르면 사요' : on ? '쓰는 중' : own ? '가지고 있어요' : '🪙 ' + price}</em></button>`;
}
function drawCloset() {
  updCoins();
  const g = (v, t) => `<button type="button" data-g="${v}" class="${MY.g === v ? 'on' : ''}">${t}</button>`;
  $('#cGender').innerHTML = g('f', '여자') + g('m', '남자');
  $('#cBody').innerHTML = BODIES.map((b, i) => `<button type="button" data-body="${i}" class="${MY.body === i ? 'on' : ''}">${i + 1} · ${b.name}</button>`).join('');
  $('#cLooks').innerHTML = LOOKS.map((L, i) => card(`data-look="${i}"`, lookIcon(L, MY.g !== 'm'), lookName(i), '', MY.own.looks.includes(i), MY.look === i, lookPrice(i), pendingBuy === 'look' + i)).join('');
  $('#cHats').innerHTML = HATS.map((n, i) => card(`data-hat="${i}"`, ICON['hat' + i], n, '', MY.own.hats.includes(i), MY.hat === i, PRICE.hat[i], pendingBuy === 'hat' + i)).join('');
  $('#cAcc').innerHTML = ACCS.map((a, i) => card(`data-acc="${i}"`, ICON['acc' + i], a.name, '', MY.own.accs.includes(i), MY.acc === i, a.price, pendingBuy === 'acc' + i)).join('');
  $('#cHair').innerHTML = HAIRS.map((h, i) => card(`data-hair="${i}"`, hairIcon(h.c), h.name, '', MY.own.hairs.includes(i), MY.hair === i, h.price, pendingBuy === 'hair' + i)).join('');
  $('#cCams').innerHTML = CAMERAS.map((c) => card(`data-cam="${c.id}"`, ICON['cam_' + c.id], c.name, c.desc, MY.own.cams.includes(c.id), MY.cam === c.id, c.price, pendingBuy === 'cam' + c.id)).join('');
  MY.own.furn ||= []; MY.own.walls ||= ['cream']; const hm = MY.home ||= { wall: 'cream', items: [], pics: [] };
  $('#cFurn').innerHTML = FURN.map(([id, , n, pr]) => card(`data-furn="${id}"`, ICON[id], n, '사면 우리 집에 놓여요', MY.own.furn.includes(id), false, pr, pendingBuy === 'f' + id)).join('');
  $('#cWalls').innerHTML = WALLS.map(([id, n, c, pr]) => card(`data-wall="${id}"`, `<i class="swatch sq" style="background:${c}"></i>`, n, '', MY.own.walls.includes(id), hm.wall === id, pr, pendingBuy === 'w' + id)).join('');
}
function closetTap(kind, i) {
  const own = MY.own[{ look: 'looks', cam: 'cams', hat: 'hats', hair: 'hairs', acc: 'accs' }[kind]], price = kind === 'look' ? lookPrice(i) : kind === 'cam' ? CAMERAS.find((c) => c.id === i).price : kind === 'hair' ? HAIRS[i].price : kind === 'acc' ? ACCS[i].price : PRICE.hat[i], key = kind + i;
  if (!own.includes(i)) {
    if (MY.coins < price) { $('#cMsg').textContent = `코인이 ${price - MY.coins}개 모자라요. 섬에 머무는 1초마다 1개씩 모여요 (하루 최대 3600)`; return; }
    if (pendingBuy !== key) { pendingBuy = key; $('#cMsg').textContent = `🪙 ${price}코인으로 살까요? 한 번 더 누르면 사요`; drawCloset(); return; }
    MY.coins -= price; own.push(i); pendingBuy = null; bump('buy'); $('#cMsg').textContent = '샀어요! 바로 입어 볼게요'; snd.chime();
  } else { pendingBuy = null; $('#cMsg').textContent = ''; }
  if (kind === 'look') MY.look = i; else if (kind === 'cam') { MY.cam = i; setZoom(zoom); } else if (kind === 'hair') MY.hair = i; else if (kind === 'acc') MY.acc = i; else MY.hat = i;
  saveMy(); remakeMe(); drawCloset();
}
function homeBuy(key, price, have, give, msg = '샀어요!') {
  if (have) { give(); return; }
  if (MY.coins < price) { $('#cMsg').textContent = `코인이 ${price - MY.coins}개 모자라요`; return; }
  if (pendingBuy !== key) { pendingBuy = key; $('#cMsg').textContent = `🪙 ${price}코인으로 살까요? 한 번 더 누르면 사요`; drawCloset(); return; }
  MY.coins -= price; pendingBuy = null; give(); bump('buy'); $('#cMsg').textContent = msg; snd.chime();
}
$('#closet').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tab) { pendingBuy = null; $('#cMsg').textContent = ''; drawCloset(); document.querySelectorAll('#cTabs button').forEach((x) => x.classList.toggle('on', x === b)); document.querySelectorAll('#closet .sec').forEach((x) => x.classList.toggle('cur', x.dataset.sec === b.dataset.tab)); $('#closet .cbody').scrollTop = 0; return; }
  if (b.dataset.furn) { const f = FURN.find((x) => x[0] === b.dataset.furn); homeBuy('f' + f[0], f[3], MY.own.furn.includes(f[0]), () => { if (!MY.own.furn.includes(f[0])) { MY.own.furn.push(f[0]); placeFurn(f[0]); } saveMy(); if (me.inHome) drawHomeItems(); }, '샀어요! 우리 집에 놓았어요. 집 안 꾸미기 단추로 자리를 옮겨요'); drawCloset(); return; }
  if (b.dataset.wall) { const w = WALLS.find((x) => x[0] === b.dataset.wall); homeBuy('w' + w[0], w[3], MY.own.walls.includes(w[0]), () => { if (!MY.own.walls.includes(w[0])) MY.own.walls.push(w[0]); MY.home.wall = w[0]; saveMy(); if (me.inHome) drawHomeItems(); }, '샀어요! 벽지를 바꿨어요'); drawCloset(); return; }
  if (b.dataset.g) { MY.g = b.dataset.g; saveMy(); remakeMe(); drawCloset(); }
  else if (b.dataset.body) { MY.body = +b.dataset.body; saveMy(); remakeMe(); drawCloset(); }
  else if (b.dataset.look) closetTap('look', +b.dataset.look);
  else if (b.dataset.hat) closetTap('hat', +b.dataset.hat);
  else if (b.dataset.hair) closetTap('hair', +b.dataset.hair);
  else if (b.dataset.acc) closetTap('acc', +b.dataset.acc);
  else if (b.dataset.cam) closetTap('cam', b.dataset.cam);
});
// 👤 캐릭터 = 닉네임 · 성별 · 체형 · 가진 것 입기, 🛍 상점 = 사기 (같은 창을 두 모양으로)
let closetKind = 'char';
function drawNick() {
  const [a, b] = myName.split(' '), opt = (L, v) => L.map((x) => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('');
  $('#nA').innerHTML = opt(NAME_A, a); $('#nB').innerHTML = opt(NAME_B, b);
}
function changeNick(n) { setMyName(n); drawNick(); showPeople(); $('#cMsg').textContent = `이제 '${n}'(으)로 보여요`; }
$('#nA').onchange = $('#nB').onchange = () => changeNick(`${$('#nA').value} ${$('#nB').value}`);
$('#cToShop').onclick = () => openCloset('shop');
$('#nRand').onclick = () => changeNick(`${NAME_A[Math.floor(Math.random() * NAME_A.length)]} ${NAME_B[Math.floor(Math.random() * NAME_B.length)]}`);
function openCloset(kind = 'char') { closePanels(); closeDrawer(); closetKind = kind; const c = $('#closet'); c.classList.toggle('char', kind === 'char'); c.classList.toggle('shop', kind === 'shop'); $('#cTitle').innerHTML = kind === 'char' ? '캐릭터' : '상점'; c.setAttribute('aria-label', kind === 'char' ? '캐릭터' : '상점'); drawNick();
  closeAlbum(); closeDex(); pendingBuy = null; $('#cMsg').textContent = ''; drawCloset(); $('#closet').classList.add('on'); $('#closet').setAttribute('aria-hidden', 'false'); $('#closetX').focus({ preventScroll: true }); }
function closeCloset() { $('#closet').classList.remove('on'); $('#closet').setAttribute('aria-hidden', 'true'); }
const toggleCloset = (k) => ($('#closet').classList.contains('on') && closetKind === k ? closeCloset() : openCloset(k));
$('#charBtn').onclick = () => toggleCloset('char');
$('#shopBtn').onclick = () => toggleCloset('shop');
$('#closetX').onclick = closeCloset;
addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeCloset(); closeActs(); } });
updCoins();


// 🪙 섬에 머문 1초 = 코인 1개. 하루 최대 1시간(3600개)까지. 화면을 보고 있고, 이 기기에서 '맨 앞 탭' 하나일 때만 세요 (탭 여러 개로 더 모을 수 없게)
const TAB_ID = Math.random().toString(36).slice(2);
function coinLeader() {
  try { const now = Date.now(), L = JSON.parse(localStorage.getItem('snapzoo-island-coinlock') || 'null');
    if (!L || L.id === TAB_ID || now - L.t > 3000) { localStorage.setItem('snapzoo-island-coinlock', JSON.stringify({ id: TAB_ID, t: now })); return true; } return false; } catch { return true; }
}
setInterval(() => {
  if (document.hidden || !coinLeader()) return; const day = new Date().toDateString();
  try { const saved = JSON.parse(localStorage.getItem(LOOK_KEY) || '{}'); if (saved.coins !== undefined && saved.coins < MY.coins - 15) MY.coins = saved.coins; } catch {}   // 다른 탭에서 쓴 코인을 따라가요
  if (MY.today.day !== day) MY.today = { day, sec: 0 };
  if (MY.today.sec >= 3600) return;
  MY.today.sec++; MY.coins++; updCoins(); if (MY.today.sec % 10 === 0) saveMy();
}, 1000);
addEventListener('pagehide', saveMy);


// ───────── 🔥 모닥불 · 🪑 통나무 의자 (마을 · 산꼭대기): 앉아서 쉬어요 ─────────
const SEATS = [], FIRES = [];
function campfire(c, faceTo) {
  const g = new THREE.Group(); g.position.set(c.x, height(c.x, c.z), c.z); scene.add(g);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 1), toon('#8a8478')); st.position.set(Math.sin(a) * 0.62, 0.08, Math.cos(a) * 0.62); st.scale.y = 0.6; g.add(st); }
  for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.9, 10), toon('#6a4a30')); w.rotation.set(Math.PI / 2 - 0.5, i * Math.PI / 2, 0); w.position.y = 0.2; g.add(w); }
  const flames = []; for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.2 - i * 0.05, 0.7 - i * 0.12, 12), new THREE.MeshBasicMaterial({ color: ['#ff8a2a', '#ffb83a', '#fff0a0'][i], transparent: true, opacity: 0.9, fog: false })); f.position.y = 0.45 - i * 0.02; g.add(f); flames.push(f); }
  const light = new THREE.PointLight('#ff9a4a', 6, 14, 1.6); light.position.y = 0.9; g.add(light);
  FIRES.push({ g, flames, light });
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4, x = c.x + Math.sin(a) * 1.9, z = c.z + Math.cos(a) * 1.9, y = height(x, z);
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, 1.1, 14), toon('#8a5e3a')); log.rotation.set(0, a, Math.PI / 2); log.position.set(x, y + 0.17, z); log.castShadow = log.receiveShadow = true; scene.add(log);
    SEATS.push({ pos: new THREE.Vector3(x, y, z), face: Math.atan2(c.x - x, c.z - z), fire: c }); }
}
campfire(VIL.clone().add(V.set(6.5, 0, -5)));
campfire(TOPS.clone().add(V.set(-7, 0, 6)));

// ───────── 📍 포토 스팟: 경치 좋은 곳 여섯. 둥근 빛 안에서 찍으면 보너스 ─────────
const SPOTS = [];
function addSpot(name, p) {
  if (!p) return; const y = height(p.x, p.z), g = new THREE.Group(); g.position.set(p.x, Math.max(y, 0.05) + 0.06, p.z); scene.add(g);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.0, 48), new THREE.MeshBasicMaterial({ color: '#ffd98a', transparent: true, opacity: 0.55, depthWrite: false, fog: false })); ring.rotation.x = -Math.PI / 2; g.add(ring);
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d'); x.fillStyle = 'rgba(18,14,12,.6)'; x.beginPath(); x.roundRect(8, 16, 496, 96, 40); x.fill(); x.fillStyle = '#fff3d6'; x.font = '54px OngleipUnz, sans-serif'; x.textAlign = 'center'; x.fillText('' + name, 256, 84);
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); sign.scale.set(4, 1, 1); sign.position.y = 3.4; g.add(sign);
  // 멀리서도 보이는 금빛 기둥
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.5, 46, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd98a', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, fog: false })); beam.position.y = 23; g.add(beam);
  SPOTS.push({ name, pos: new THREE.Vector3(p.x, y, p.z), g, ring, sign, tex: c });
}
document.fonts.load('40px OngleipUnz').catch(() => {}).then(() => {
  addSpot('강가 모닥불', VIL.clone().add(V.set(6.5, 0, -1.5)));
  addSpot('돌고래 해변', (POOLS.get('seashore') || [])[0]);
  addSpot('노을 물웅덩이', YARD.savanna.spot);
  addSpot('붉은 메사 언덕', YARD.desert.spot);
  addSpot('안개 숲 빈터', (POOLS.get('jungle') || [])[0]);
  addSpot('산꼭대기 전망대', YARD.arctic.spot);
  addSpot('화산 전망대', YARD.isle.spot);
  addSpot('거북이 바닷가', (POOLS.get('isleseashore') || [])[0]);
});
const spotHere = () => SPOTS.find((sp) => Math.hypot(sp.pos.x - me.pos.x, sp.pos.z - me.pos.z) < 3.2);

// ───────── 🌦 날씨: 맑음 · 비 · 안개 · 비 갠 뒤 무지개 (3~5분마다 바뀌어요). 북극은 비 대신 눈 ─────────
const wx = { kind: 'clear', until: 120, sunK: 1, fogK: 1, rain: 0, bow: 0 };
const rainG = new THREE.BufferGeometry(), RN = 1400, rainP = new Float32Array(RN * 6);
for (let i = 0; i < RN; i++) { const x = (Math.random() - 0.5) * 60, y = Math.random() * 30, z = (Math.random() - 0.5) * 60; rainP.set([x, y, z, x + 0.05, y - 0.7, z], i * 6); }
rainG.setAttribute('position', new THREE.BufferAttribute(rainP, 3));
const rain = new THREE.LineSegments(rainG, new THREE.LineBasicMaterial({ color: '#c8d8e8', transparent: true, opacity: 0, depthWrite: false })); rain.frustumCulled = false; scene.add(rain);
const bow = new THREE.Group(); scene.add(bow); bow.visible = false;
['#ff5a5a', '#ff9a3a', '#ffe24a', '#5ad25a', '#4a9aff', '#5a5ad8', '#a05ad8'].forEach((c, i) => { const t = new THREE.Mesh(new THREE.TorusGeometry(420 - i * 9, 4.5, 6, 80, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, fog: false })); bow.add(t); });
const WX_LABEL = { clear: '', rain: ' · 비', fog: ' · 안개', rainbow: ' · 무지개' };
function updWeather(T, dt, z0) {
  if (T > wx.until) { const r = Math.random(); wx.kind = wx.kind === 'rain' ? (tod.night < 0.5 ? 'rainbow' : 'clear') : r < 0.55 ? 'clear' : r < 0.8 ? 'rain' : 'fog'; wx.until = T + (wx.kind === 'rainbow' ? 70 : 180 + Math.random() * 120); }
  const k = Math.min(1, dt * 0.4), wantRain = wx.kind === 'rain' && z0 !== 'arctic' && z0 !== 'desert' ? 1 : 0;
  wx.rain += (wantRain - wx.rain) * k; wx.sunK += ((wx.kind === 'rain' ? 0.45 : wx.kind === 'fog' ? 0.7 : 1) - wx.sunK) * k; wx.fogK += ((wx.kind === 'fog' ? 0.28 : wx.kind === 'rain' ? 0.55 : 1) - wx.fogK) * k;
  wx.bow += ((wx.kind === 'rainbow' && tod.night < 0.3 ? 1 : 0) - wx.bow) * k * 0.5;
  rain.visible = wx.rain > 0.02; rain.material.opacity = wx.rain * 0.55;
  if (rain.visible) { rain.position.set(camera.position.x, camera.position.y - 12, camera.position.z); for (let i = 0; i < RN; i++) { const o = i * 6; rainP[o + 1] -= dt * 22; rainP[o + 4] -= dt * 22; if (rainP[o + 4] < 0) { rainP[o + 1] += 30; rainP[o + 4] += 30; } } rainG.attributes.position.needsUpdate = true; }
  bow.visible = wx.bow > 0.02; if (bow.visible) { bow.position.copy(camera.position).addScaledVector(V.set(-sunDir.x, 0, -sunDir.z).normalize(), 900); bow.position.y = camera.position.y - 60; bow.lookAt(camera.position.x, bow.position.y, camera.position.z); bow.children.forEach((m) => (m.material.opacity = wx.bow * 0.32)); }
  snd.rain = wx.rain;
}

// ───────── 🥕 먹이 주기 · 🪑 앉기: 가까이 가면 한가운데 위에 단추가 떠요 ─────────
let sitting = null, ctxKind = '', ctxA = null;
function nearAnimal() { let best = null, bd = 8; for (const a of animals) { if (!a.g.visible || a.move === 'swim' || a.move === 'fly') continue; const d = Math.hypot(a.pos.x - me.pos.x, a.pos.z - me.pos.z); if (d < bd) { bd = d; best = a; } } return best; }
function nearSeat() { return SEATS.find((s) => Math.hypot(s.pos.x - me.pos.x, s.pos.z - me.pos.z) < 2.4); }
function updCtx() {
  if (mode === 'photo' || me.riding) { $('#ctx').hidden = true; return; }
  let kind = '', label = '';
  const st = !me.inHome && [STA, TOPS].find((p) => Math.hypot(p.x - me.pos.x, p.z - me.pos.z) < 7.5), hs = me.inHome && Object.keys(HS).find((k) => Math.hypot(ROOM.x + HS[k].x - me.pos.x, ROOM.z + HS[k].z - me.pos.z) < 1.7);
  if (sitting) { kind = 'stand'; label = '일어나기'; }
  else if (me.inHome && me.pos.z > ROOM.z + 2.3 && Math.abs(me.pos.x - ROOM.x) < 1.6) { kind = 'out'; label = '밖으로 나가기'; }
  else if (hs) { kind = hs; label = HS[hs].label; }
  else if (me.inHome) { kind = ''; }
  else if (Math.hypot(HOME.door.x - me.pos.x, HOME.door.z - me.pos.z) < 3) { kind = 'in'; label = '우리 집 들어가기'; }
  else if (nearPier()) { kind = 'ferry'; label = curZone === 'isle' ? '배 타고 마을로' : '배 타고 섬으로'; }
  else if (st) { kind = 'cable'; label = st === STA ? '케이블카 타기 · 산꼭대기로' : '케이블카 타기 · 마을로'; }
  else if (nearSeat()) { kind = 'sit'; label = '모닥불 곁에 앉기'; }
  else { ctxA = nearAnimal(); if (ctxA) { kind = 'feed'; label = (ctxA.fedT > 0 ? '쓰다듬기 · ' : '먹이 주기 · ') + ctxA.name; } }
  ctxKind = kind; $('#ctx').hidden = !kind; if ($('#ctx').textContent !== label) $('#ctx').textContent = label;
}
function sitDown(seat) { bump('sit'); sitting = seat; me.target = null; me.pos.copy(seat.pos); me.face = seat.face; me.st.sit = 1; me.st.seat = 0.3; toastMsg('모닥불 곁에 앉았어요', '움직이면 일어나요 · 타닥타닥 불소리를 들어 보세요'); snd.fire = 1; }
function standUp() { if (!sitting) return; sitting = null; me.st.sit = 0; me.lie = false; snd.fire = 0; }
// 동물 돌보기: pet = true 쓰다듬기, false 먹이 주기 (안 정하면 먹은 뒤엔 쓰다듬기)
function careAnimal(a, pet = a.fedT > 0) {
  bump(pet ? 'pet' : 'feed');
  a.face = Math.atan2(me.pos.x - a.pos.x, me.pos.z - a.pos.z); a.target = null; a.v = 0; a.visit = true; a.wait = 6; a.heart = 6; a.fedT = 30;
  // 8 m 안이면 동물이 곁으로 다가와요 (도망가지 않게)
  { const dx = a.pos.x - me.pos.x, dz = a.pos.z - me.pos.z, d = Math.hypot(dx, dz), stay = 1.6 + a.tagH * 0.6; if (a.speed && d > stay + 0.4) { a.target = me.pos.clone().add(V.set((dx / d) * stay, 0, (dz / d) * stay)); a.call = 8; a.wait = 0; } }
    me.face = Math.atan2(a.pos.x - me.pos.x, a.pos.z - me.pos.z); me.st.waveT = 1.0;
    if (!pet && !(a.coinT > 0)) { MY.coins += 2; a.coinT = 120; saveMy(); updCoins(); }
    toastMsg(pet ? `${a.name}${josa(a.name) === '과' ? '이' : '가'} 좋아해요` : `${a.name}${josa(a.name) === '과' ? '이' : '가'} 맛있게 먹어요`, '6초 동안 곁에 머물러요 · 지금 찍으면 ♥ 특별한 순간!'); snd.chime();
}
// 🚡 케이블카 탑승장: 지붕 · 표지판 · 바닥 고리. 곁에 가면 '케이블카 타기' 단추가 떠요
function station(p, text) {
  const x = p.x + 4.4, z = p.z + 4.4, y = height(x, z), g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const box = (w, h, d, c, px, py, pz) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.05), toon(c)); m.position.set(px, py, pz); m.castShadow = true; g.add(m); };
  box(5, 0.3, 4, '#a89a86', 0, 0.1, 0); for (const [a, b] of [[-2.2, -1.7], [2.2, -1.7], [-2.2, 1.7], [2.2, 1.7]]) box(0.2, 3, 0.2, '#7a5a40', a, 1.6, b); box(5.6, 0.28, 4.6, '#c8553d', 0, 3.2, 0);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.5, 40), new THREE.MeshBasicMaterial({ color: '#ffd36a', transparent: true, opacity: 0.9, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.3; g.add(ring);
  const c = document.createElement('canvas'); c.width = 640; c.height = 128; const tex = new THREE.CanvasTexture(c);
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); sign.scale.set(6, 1.2, 1); sign.position.y = 4.4; g.add(sign);
  document.fonts.load('40px OngleipUnz').catch(() => {}).then(() => { const x2 = c.getContext('2d'); x2.fillStyle = 'rgba(200,85,61,.95)'; x2.beginPath(); x2.roundRect(6, 10, 628, 108, 30); x2.fill(); x2.fillStyle = '#fff6e6'; x2.font = '58px OngleipUnz, sans-serif'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillText(text, 320, 66); tex.needsUpdate = true; });
}
{ const c = document.createElement('canvas'); c.width = 320; c.height = 112; const tex = new THREE.CanvasTexture(c), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); sp.scale.set(2.6, 0.9, 1); sp.position.set(VIL.x + 12.2, height(VIL.x + 12.2, VIL.z) + 3, VIL.z); scene.add(sp);
  document.fonts.load('40px OngleipUnz').catch(() => {}).then(() => { const x = c.getContext('2d'); x.fillStyle = 'rgba(90,70,50,.92)'; x.beginPath(); x.roundRect(6, 8, 308, 96, 26); x.fill(); x.fillStyle = '#fff6e6'; x.font = '54px OngleipUnz, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('우리 집', 160, 58); tex.needsUpdate = true; }); }
// 🚢 섬 가는 배: 마을 쪽 나루 ↔ 섬 나루 (케이블카처럼 타요)
const PIER = (() => { const dx = VIL.x - ISLE.x, dz = VIL.z - ISLE.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L; let a = null, b = null;
  for (let r = 10; r < L; r += 0.5) { const x = ISLE.x + ux * r, z = ISLE.z + uz * r, y = height(x, z); if (!a && y < 1.1) a = new THREE.Vector3(x - ux * 1.5, 0, z - uz * 1.5); if (a && r > ISLE.r + 40 && y > 1.1) { b = new THREE.Vector3(x + ux * 1.5, 0, z + uz * 1.5); break; } }
  a.y = height(a.x, a.z); b.y = height(b.x, b.z); return { isle: a, main: b, ux, uz }; })();
const FERRY = new THREE.QuadraticBezierCurve3(PIER.main.clone().setY(0).add(V.set(-PIER.ux * 8, 0, -PIER.uz * 8)), new THREE.Vector3((PIER.main.x + PIER.isle.x) / 2 + 12, 0, (PIER.main.z + PIER.isle.z) / 2), PIER.isle.clone().setY(0).add(V.set(PIER.ux * 8, 0, PIER.uz * 8)));
for (const [p, s, t] of [[PIER.main, -1, '섬 가는 배'], [PIER.isle, 1, '마을 가는 배']]) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 112; const tex = new THREE.CanvasTexture(c), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); sp.scale.set(4.6, 1, 1); sp.position.set(p.x, p.y + 3.2, p.z); scene.add(sp);
  document.fonts.load('40px OngleipUnz').catch(() => {}).then(() => { const x = c.getContext('2d'); x.fillStyle = 'rgba(63,115,160,.95)'; x.beginPath(); x.roundRect(6, 8, 500, 96, 28); x.fill(); x.fillStyle = '#fff6e6'; x.font = '54px OngleipUnz, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, 256, 58); tex.needsUpdate = true; });
  const dock = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.3, 9, 2, 0.08), toon('#9a7048')); dock.position.set(p.x + PIER.ux * s * 4, Math.max(0.5, p.y), p.z + PIER.uz * s * 4); dock.rotation.y = Math.atan2(PIER.ux, PIER.uz); dock.castShadow = true; scene.add(dock);
}
// 🏕 모이는 곳: 마을처럼 둥근 광장 · 모닥불 · 작은 집 · 등불
const GATHER = [{ name: '마을 광장', pos: VIL.clone().add(V.set(0, 0, 8)) }];
function plaza(c, label, small) {
  const PR = small ? 6.5 : 9.5;
  const y = height(c.x, c.z), g = new THREE.Group(); g.position.set(c.x, y, c.z); scene.add(g);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR + 0.5, 0.5, 48), toon('#b8ac96')); disc.position.y = 0; disc.receiveShadow = true; g.add(disc);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, x = Math.sin(a) * (PR - 0.9), z = Math.cos(a) * (PR - 0.9); const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 8), toon('#5a4a3a')); post.position.set(x, 1.2, z); g.add(post); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffe0a0' })); lamp.position.set(x, 2.35, z); g.add(lamp); }
  if (!small) { const hs = house(4.8, 4.2, 3, '#a8604a', '#f6eee0'); hs.position.set(0, 0.1, -13.5); g.add(hs); }
  campfire(new THREE.Vector3(c.x, 0, c.z));
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 112; const tex = new THREE.CanvasTexture(cv), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); sp.scale.set(4.4, 1, 1); sp.position.set(0, 4.2, 0); g.add(sp);
  document.fonts.load('40px OngleipUnz').catch(() => {}).then(() => { const x = cv.getContext('2d'); x.fillStyle = 'rgba(90,70,50,.92)'; x.beginPath(); x.roundRect(6, 8, 500, 96, 28); x.fill(); x.fillStyle = '#fff6e6'; x.font = '54px OngleipUnz, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 256, 58); tex.needsUpdate = true; });
  const y0 = { name: label, pos: new THREE.Vector3(c.x + 3, 0, c.z + 3), spot: new THREE.Vector3(c.x + PR * 0.62, 0, c.z - PR * 0.3) }; GATHER.push(y0); return y0;
}
// 도착 지점 마당: 나무 · 강을 피해 평평한 빈자리를 찾아요
function findYard(zone, base) {
  for (let r = 4; r < 90; r += 4) for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + r, x = base.x + Math.sin(a) * r, z = base.z + Math.cos(a) * r, y = height(x, z);
    if (zoneAt(x, z, y) !== zone || riverNear(x, z).d < 14) continue; let ok = true;
    for (let k = 0; k < 8 && ok; k++) { const b = k / 8 * Math.PI * 2, px = x + Math.sin(b) * 7, pz = z + Math.cos(b) * 7, py = height(px, pz); if (Math.abs(py - y) > 1.2 || occAt(px, py + 1, pz) || occAt(x, y + 1, z) || zoneAt(px, pz, py) !== zone) ok = false; }
    if (ok) return new THREE.Vector3(x, 0, z); }
  return base.clone();
}
const YARD = {};
YARD.savanna = plaza(findYard('savanna', (POOLS.get('savanna') || [VIL])[0]), '초원 마당', true);
YARD.desert = plaza(findYard('desert', (POOLS.get('desert') || [VIL])[1] || (POOLS.get('desert') || [VIL])[0]), '사막 마당', true);
{ let c = null; for (let r = 16; r < 46 && !c; r += 2) for (let i = 0; i < 16 && !c; i++) { const a = i / 16 * Math.PI * 2, x = TOPS.x + Math.sin(a) * r, z = TOPS.z + Math.cos(a) * r; if (height(x, z) > 106 && riverNear(x, z).d > 15) c = new THREE.Vector3(x, 0, z); } YARD.arctic = plaza(c || TOPS.clone().add(V.set(-22, 0, 18)), '꼭대기 광장'); }
YARD.isle = plaza(new THREE.Vector3(ISLE.x + PIER.ux * 36, 0, ISLE.z + PIER.uz * 36), '섬 광장');
const nearPier = () => [PIER.main, PIER.isle].find((p) => Math.hypot(p.x - me.pos.x, p.z - me.pos.z) < 7);
function rideFerry() {
  if (me.riding || me.inHome) return; exitPhoto(); standUp();
  const toIsle = curZone !== 'isle'; me.riding = { ferry: true, t: 0, dur: 14, dir: toIsle ? 1 : -1 }; bump('ferry'); me.target = null; $('#ferry').disabled = true;
  $('#rideT').textContent = toIsle ? '섬으로 가는 중' : '마을 쪽 나루로 가는 중'; $('#rideBar').style.width = '0'; $('#ride').classList.add('on'); closeDrawer();
}
$('#ferry').onclick = rideFerry;
station(STA, '케이블카 타는 곳'); station(TOPS, '마을로 내려가는 곳');
// 🏠 우리 집: 마을 동쪽 집의 문. 안은 하늘 높이 따로 만든 방이에요 (벽은 안쪽 면만 그려서 밖에서 들여다보여요)
let doorM = null;   // 카메라가 문 바깥에 있으면 방이 가리지 않게 문을 숨겨요
const ROOM = new THREE.Vector3(0, 320, 0), room = new THREE.Group(), homeItems = new THREE.Group(), wallMat = new THREE.MeshStandardMaterial({ color: '#f6e8d2', side: THREE.BackSide, roughness: 0.9 });
const HOME = { door: new THREE.Vector3(VIL.x + 11.4, 0, VIL.z) }; HOME.door.y = height(HOME.door.x, HOME.door.z);
// 🏠 집 꾸미기: 가구 · 벽지는 상점에서 사고, 🎨 꾸미기에서 놓아요. 사진은 벽에 여섯 장까지 (이 기기에 저장)
const FURN = [['plant', '🪴', '화분', 300], ['lamp', '💡', '스탠드', 400], ['teddy', '🧸', '곰 인형', 500], ['round', '⭕', '동그란 깔개', 500], ['desk', '🖥', '책상', 700], ['fish', '🐠', '어항', 900], ['piano', '🎹', '피아노', 1500], ['fire', '🔥', '벽난로', 1800]];
const WALLS = [['cream', '크림', '#f6e8d2', 0], ['mint', '민트', '#cfe8dc', 300], ['sky', '하늘', '#cfe2f2', 300], ['pink', '분홍', '#f6d8dc', 300], ['wood', '나무', '#c8a47a', 600], ['night', '밤하늘', '#3f4e72', 800]];
// 가구를 사면 저절로 놓이는 자리 (x, z, 돌림). 집 안 꾸미기에서 옮길 수 있어요
const FSPOT = { plant: [-4.3, -0.4, 0], lamp: [-1.7, -3.5, 0], teddy: [1.5, -3.4, 0], round: [-2.4, 1.2, 0], desk: [1.9, 3.5, Math.PI], fish: [3.6, 3.55, Math.PI], piano: [-1.9, 3.5, Math.PI], fire: [-3.6, 3.6, Math.PI] };
const placeFurn = (id) => { const H = MY.home ||= { wall: 'cream', items: [], pics: [] }, [x, z, r] = FSPOT[id] || [0, 1, 0]; H.items = H.items.filter((i) => i.id !== id); H.items.push({ id, x, z, r }); };
const PICS = [[-4.1, 2.35], [-3, 2.35], [-1.9, 2.35], [1.8, 2.35], [2.9, 2.35], [4, 2.35]];
const HS = {
  bed: { x: -3.2, z: -1.9, face: 0, label: '침대에서 쉬기' }, sofa: { x: 3.2, z: -2.9, face: 0, label: '소파에 앉기' },
  book: { x: 0, z: -2.6, face: Math.PI, label: '책 읽기' }, tea: { x: 3.2, z: 0.6, face: Math.PI, label: '차 마시기' },
};
{ room.position.copy(ROOM); room.visible = false; scene.add(room); room.add(homeItems);
  const wall = wallMat, floor = new THREE.MeshStandardMaterial({ color: '#b98a5a', side: THREE.BackSide, roughness: 0.8 }), ceil = new THREE.MeshStandardMaterial({ color: '#fff6e6', side: THREE.BackSide });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(10, 3.4, 8), [wall, wall, ceil, floor, wall, wall]); shell.position.y = 1.7; room.add(shell);
  const B = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(0.05, h / 3)), toon(c)); m.position.set(x, y, z); room.add(m); return m; };
  B(2.1, 0.4, 3, '#8a5e3a', -3.7, 0.22, -2.3); B(1.95, 0.22, 2.85, '#fff6e6', -3.7, 0.5, -2.3); B(1.95, 0.1, 1.8, '#e88a7a', -3.7, 0.64, -1.8); B(1.3, 0.18, 0.6, '#ffffff', -3.7, 0.7, -3.3);   // 침대
  B(2.6, 0.5, 1, '#5a8a7a', 3.2, 0.3, -3.3); B(2.6, 0.9, 0.3, '#4f7a6a', 3.2, 0.75, -3.75); for (const k of [-1, 1]) B(0.3, 0.7, 1, '#4f7a6a', 3.2 + k * 1.3, 0.4, -3.3);   // 소파
  B(1.5, 0.1, 1, '#a8784a', 3.2, 0.72, -0.3); for (const [a, b] of [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]]) B(0.08, 0.7, 0.08, '#8a5e3a', 3.2 + a, 0.35, -0.3 + b); B(0.14, 0.1, 0.14, '#ffffff', 3.2, 0.82, -0.3);   // 탁자 · 찻잔
  B(0.6, 0.45, 0.6, '#a8784a', 3.2, 0.25, 0.75);   // 의자
  B(2.6, 2.4, 0.4, '#8a5e3a', 0, 1.2, -3.78); for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) B(0.2, 0.5, 0.26, ['#c8553d', '#4f7aa8', '#d9a33a', '#6b8f4a', '#7a5a8a'][(i + r * 2) % 5], -1.0 + i * 0.25, 0.55 + r * 0.72, -3.55);   // 책장
  B(3.6, 0.03, 2.6, '#d8b062', 0, 0.03, 0.6);   // 깔개
  doorM = B(1.3, 2.2, 0.1, '#7a4e32', 0, 1.1, 3.96); const mat = B(1.8, 0.03, 1, '#6b8f4a', 0, 0.03, 3.3);   // 문 · 나가는 매트
  for (const x of [-3, 3]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshBasicMaterial({ color: '#a8d8f0' })); w.position.set(x, 1.9, 3.97); w.rotation.y = Math.PI; room.add(w); }
  B(0.06, 0.06, 3.2, '#7a5a40', -4.7, 2.3, 1.6);   // 옷걸이 봉
  for (const y of [1.2, 2]) B(0.34, 0.06, 3.6, '#8a5e3a', 4.8, y, 1.5);   // 진열 선반
  const lamp = new THREE.PointLight('#ffe6c0', 26, 18, 1.4); lamp.position.set(0, 3, 0); room.add(lamp); room.add(new THREE.AmbientLight('#fff2e0', 0.7)); }
const iconSprite = (name) => { const c = document.createElement('canvas'); c.width = c.height = 128; const tex = new THREE.CanvasTexture(c), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true })); sp.scale.setScalar(0.55);
  const im = new Image(); im.onload = () => { c.getContext('2d').drawImage(im, 0, 0, 128, 128); tex.needsUpdate = true; }; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICON[name].replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" ')); return sp; };
// 상점에서 산 것을 방에 놓아요: 옷은 옷걸이 봉에, 모자 · 사진기는 진열 선반에
function makeFurn(id) {
  const g = new THREE.Group(), B = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(0.05, h / 3, w / 3)), toon(c)); m.position.set(x, y, z); g.add(m); return m; }, Bl = (r, c, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), toon(c)); m.position.set(x, y, z); g.add(m); };
  if (id === 'plant') { B(0.4, 0.4, 0.4, '#a8604a', 0, 0.2, 0); Bl(0.42, '#4a8a4a', 0, 0.85, 0); Bl(0.28, '#5a9a5a', 0.2, 1.1, 0.1); }
  else if (id === 'lamp') { B(0.3, 0.05, 0.3, '#5a4a3a', 0, 0.03, 0); B(0.05, 1.5, 0.05, '#5a4a3a', 0, 0.78, 0); Bl(0.26, '#ffe6a8', 0, 1.6, 0); }
  else if (id === 'teddy') { Bl(0.26, '#b07a4a', 0, 0.26, 0); Bl(0.2, '#b07a4a', 0, 0.62, 0); Bl(0.07, '#b07a4a', -0.15, 0.78, 0); Bl(0.07, '#b07a4a', 0.15, 0.78, 0); Bl(0.06, '#e8c8a0', 0, 0.6, 0.17); }
  else if (id === 'round') { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.03, 40), toon('#c87a8a')); m.position.y = 0.02; g.add(m); }
  else if (id === 'desk') { B(1.5, 0.08, 0.7, '#a8784a', 0, 0.76, 0); for (const [a, b] of [[-0.68, -0.3], [0.68, -0.3], [-0.68, 0.3], [0.68, 0.3]]) B(0.07, 0.74, 0.07, '#8a5e3a', a, 0.37, b); B(0.6, 0.4, 0.05, '#2a2a30', 0, 1.02, -0.15); }
  else if (id === 'fish') { B(0.9, 0.6, 0.5, '#8ac8e8', 0, 0.78, 0); B(1, 0.46, 0.6, '#6a4a30', 0, 0.23, 0); Bl(0.07, '#f2a23a', -0.15, 0.8, 0.1); Bl(0.06, '#e85a8a', 0.2, 0.86, -0.05); }
  else if (id === 'piano') { B(1.6, 1.1, 0.6, '#2a2628', 0, 0.55, 0); B(1.5, 0.05, 0.28, '#f6f2e4', 0, 0.76, 0.42); }
  else if (id === 'fire') { B(1.6, 1.3, 0.5, '#a8604a', 0, 0.65, 0); B(0.9, 0.7, 0.1, '#2a2020', 0, 0.42, 0.24); Bl(0.2, '#ff9a3a', 0, 0.34, 0.26); }
  return g;
}
const texLoader = new THREE.TextureLoader();
let homeTk = 0;
async function drawHomeItems() {
  const tk = ++homeTk; homeItems.clear(); const H = MY.home ||= { wall: 'cream', items: [], pics: [] };
  wallMat.color.set((WALLS.find((w) => w[0] === H.wall) || WALLS[0])[2]);
  for (const it of H.items) { const g = makeFurn(it.id); g.position.set(it.x, 0, it.z); g.rotation.y = it.r || 0; homeItems.add(g); }
  for (const [i, id] of H.pics.entries()) {
    const ph = await getPhoto(id), slot = PICS[i]; if (tk !== homeTk) return; if (!ph?.blob || !slot) continue;
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1, 0.94, 0.04), toon('#7a5a40')); fr.position.set(slot[0], slot[1], -3.96); homeItems.add(fr);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.84), new THREE.MeshBasicMaterial({ map: texLoader.load(URL.createObjectURL(ph.blob)) })); pic.position.set(slot[0], slot[1], -3.93); homeItems.add(pic);
  }
  MY.own.looks.slice(-8).forEach((i, n) => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.85, 0.42, 2, 0.04), toon(lookColor(i))); m.position.set(-4.7, 1.82, 0.2 + n * 0.4); homeItems.add(m); });
  MY.own.hats.filter((i) => HATS[i] && i !== 5).slice(-6).forEach((i, n) => { const sp = iconSprite('hat' + i); sp.position.set(4.75, 2.3, 0.1 + n * 0.6); homeItems.add(sp); });
  MY.own.cams.forEach((id, n) => { const sp = iconSprite('cam_' + id); sp.position.set(4.75, 1.5, 0.1 + n * 0.6); homeItems.add(sp); });
}
function homeDo(k) {
  const p = HS[k]; standUp(); me.target = null; me.pos.x = ROOM.x + p.x; me.pos.z = ROOM.z + p.z; me.face = p.face; sitting = { pos: me.pos.clone(), face: p.face };
  // 가구에 가리지 않게 앞쪽에서 봐요
  camera.position.set(me.pos.x + Math.sin(p.face) * 3.4 + (k === 'bed' ? 1.6 : 0), ROOM.y + 2.1, me.pos.z + Math.cos(p.face) * 3.4); controls.target.set(me.pos.x, ROOM.y + 0.9, me.pos.z);
  if (k === 'bed') { me.lie = true; bump('rest'); const day = new Date().toDateString(), gift = MY.restDay !== day; if (gift) { MY.restDay = day; MY.coins += 20; saveMy(); updCoins(); } toastMsg('푹 쉬어요', gift ? '오늘 처음 쉬었어요 · 🪙 +20' : '움직이면 일어나요'); return; }
  me.st.sit = 1; me.st.seat = k === 'sofa' ? 0.45 : 0.42;
  toastMsg({ sofa: '소파에 앉았어요', book: '책을 읽어요', tea: '따뜻한 차를 마셔요' }[k], '움직이면 일어나요');
}
// 🎨 꾸미기 창: 가구 놓기 · 옮기기 · 치우기, 사진 벽
async function openDeco() {
  if (!$('#deco').classList.contains('on')) closePanels();
  const H = MY.home ||= { wall: 'cream', items: [], pics: [] }, own = MY.own.furn || [];
  $('#decoFurn').innerHTML = own.length ? own.map((id) => { const f = FURN.find((x) => x[0] === id), on = H.items.some((i) => i.id === id); return `<div class="dk"><span class="dki">${ICON[id]}${f[2]}</span>${on ? `<button type="button" data-move="${id}">자리 옮기기</button><button type="button" data-off="${id}">치우기</button>` : `<button type="button" data-put="${id}">다시 놓기</button>`}</div>`; }).join('') : '<p class="empty">상점에서 가구를 사면 집에 저절로 놓여요</p>';
  const list = (await listPhotos()).filter((p) => !String(p.id).startsWith('best-')).slice(0, 24); decoUrls.forEach((u) => URL.revokeObjectURL(u)); decoUrls = [];
  $('#decoPics').innerHTML = list.length ? list.map((p) => { const u = URL.createObjectURL(p.blob); decoUrls.push(u); return `<button type="button" data-pic="${p.id}" class="${H.pics.includes(p.id) ? 'on' : ''}" aria-label="사진 걸기"><img src="${u}" alt=""></button>`; }).join('') : '<p class="empty">사진을 찍으면 벽에 걸 수 있어요</p>';
  $('#decoN').textContent = `${H.pics.length} / ${PICS.length}장`; $('#deco').classList.add('on');
}
let decoUrls = [];
$('#decoX').onclick = () => $('#deco').classList.remove('on');
$('#deco').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return; const H = MY.home, d = b.dataset;
  if (d.move) { startMove(d.move); return; }
  if (d.put) placeFurn(d.put);
  else if (d.off) H.items = H.items.filter((i) => i.id !== d.off);
  else if (d.pic) { if (H.pics.includes(d.pic)) H.pics = H.pics.filter((x) => x !== d.pic); else if (H.pics.length < PICS.length) H.pics.push(d.pic); else { toastMsg('벽이 꽉 찼어요', '걸린 사진을 눌러 내린 뒤 걸어 주세요'); return; } }
  else return; saveMy(); drawHomeItems(); openDeco();
});
// 🪑 자리 옮기기: 창을 닫고 바닥을 누른 곳으로 가구를 옮겨요
let moveId = null;
function startMove(id) { moveId = id; $('#deco').classList.remove('on'); $('#moveT').textContent = `바닥을 누르면 ${FURN.find((f) => f[0] === id)[2]}이(가) 옮겨 가요`; document.body.classList.add('placing'); }
function endMove() { moveId = null; document.body.classList.remove('placing'); }
function moveTo(q) { const it = MY.home.items.find((i) => i.id === moveId); if (!it) return; it.x = clamp(q.x - ROOM.x, -4.4, 4.4); it.z = clamp(q.z - ROOM.z, -3.6, 3.6); saveMy(); drawHomeItems(); showMark(q); }
$('#mvTurn').onclick = () => { const it = MY.home.items.find((i) => i.id === moveId); if (it) { it.r = (it.r || 0) + Math.PI / 2; saveMy(); drawHomeItems(); } };
$('#mvDone').onclick = () => { endMove(); openDeco(); };
$('#decoBtn').onclick = () => { endMove(); openDeco(); };
function enterHome() {
  travelTo('집으로 들어가는 중', () => { standUp(); me.inHome = true; room.visible = true; const H = MY.home ||= { wall: 'cream', items: [], pics: [] }; if (!H.auto) { H.auto = 1; (MY.own.furn || []).forEach((id) => { if (!H.items.some((i) => i.id === id)) placeFurn(id); }); saveMy(); } drawHomeItems(); document.body.classList.add('inhome'); controls.maxDistance = 9; me.face = Math.PI; return ROOM.clone().add(V.set(0, 0, 1.8)); });
}
function exitHome() {
  travelTo('마당으로 나가는 중', () => { standUp(); endMove(); me.inHome = false; room.visible = false; document.body.classList.remove('inhome'); controls.maxDistance = 320; me.face = -Math.PI / 2; return HOME.door.clone().add(V.set(-1.6, 0, 0)); });
}
// 🪁 연: 내 뒤 하늘에 떠서 따라와요 (내 화면에서만 보여요)
const kite = { t: 0, g: new THREE.Group() };
{ const sh = new THREE.Shape([new THREE.Vector2(0, 0.6), new THREE.Vector2(0.42, 0), new THREE.Vector2(0, -0.8), new THREE.Vector2(-0.42, 0)]);
  kite.g.add(new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: '#e8553d', side: THREE.DoubleSide })));
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshBasicMaterial({ color: i % 2 ? '#f2c83a' : '#3a9ae8', side: THREE.DoubleSide })); m.position.set(0, -0.95 - i * 0.22, 0); kite.g.add(m); }
  kite.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#fff6e6' })); kite.line.frustumCulled = false;
  kite.g.visible = kite.line.visible = false; scene.add(kite.g, kite.line); }
function updKite(T, dt) {
  const on = kite.t > 0; kite.g.visible = kite.line.visible = on; if (!on) return; kite.t -= dt;
  const x = me.pos.x - Math.sin(me.face) * 6 + Math.sin(T * 0.9) * 1.2, z = me.pos.z - Math.cos(me.face) * 6 + Math.cos(T * 0.7) * 1.2, y = me.pos.y + 7 + Math.sin(T * 1.3) * 0.7;
  kite.g.position.x = lerp(kite.g.position.x, x, 0.05); kite.g.position.z = lerp(kite.g.position.z, z, 0.05); kite.g.position.y = lerp(kite.g.position.y, y, 0.05); kite.g.rotation.z = Math.sin(T * 1.7) * 0.25; kite.g.lookAt(me.pos.x, kite.g.position.y, me.pos.z);
  const p = kite.line.geometry.attributes.position; p.setXYZ(0, me.pos.x, me.pos.y + 1, me.pos.z); p.setXYZ(1, kite.g.position.x, kite.g.position.y, kite.g.position.z); p.needsUpdate = true;
}
// 🥅 곤충잡기: 누르면 다섯 번 저절로 휘둘러요. 잡았어요 / 놓쳤어요, 잡은 곤충은 도감의 곤충 탭에 모여요 (잠깐 보고 놓아줘요)
const BUG_KINDS = [['배추흰나비', 30, '흔해요'], ['메뚜기', 26, '흔해요'], ['무당벌레', 22, '흔해요'], ['밀잠자리', 20, '흔해요'], ['호랑나비', 12, '가끔'], ['고추잠자리', 12, '가끔'], ['매미', 10, '가끔'], ['사슴벌레', 5, '드물어요'], ['장수풍뎅이', 4, '드물어요'], ['반딧불이', 2, '아주 드물어요']];
let bugRun = null;
function bugTry() {
  const r = bugRun; r.n--; r.t = 1.5; me.st.waveT = 1;
  if (Math.random() < 0.6) {
    let w = Math.random() * BUG_KINDS.reduce((n, b) => n + b[1], 0), kind = BUG_KINDS[0]; for (const b of BUG_KINDS) { w -= b[1]; if (w <= 0) { kind = b; break; } }
    MY.bugs ||= {}; const fresh = !MY.bugs[kind[0]]; MY.bugs[kind[0]] = (MY.bugs[kind[0]] || 0) + 1; r.got++; MY.coins += fresh ? 5 : 1; saveMy(); updCoins(); bump('bug'); snd.chime();
    toastMsg(`${kind[0]}${josa(kind[0]) === '과' ? '을' : '를'} 잡았어요!`, fresh ? '곤충 도감에 새로 올랐어요 · 🪙 +5' : '잠깐 보고 놓아줬어요 · 🪙 +1');
  } else toastMsg('놓쳤어요', '다시 휘둘러요');
  if (r.n <= 0) { bugRun = null; setTimeout(() => toastMsg(`다섯 번 중 ${r.got}마리 잡았어요`, '도감 › 곤충에서 볼 수 있어요'), 1400); }
}
// 🦋 날아다니는 곤충: 마을 둘레의 풍경이에요
const BUGS = [];
{ const KINDS = [['나비', '#f2a23a'], ['흰나비', '#f6f2e4'], ['잠자리', '#4a8ac8'], ['무당벌레', '#d8402e']];
  for (let i = 0; i < 14; i++) {
    const [name, c] = KINDS[i % 4], g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }), wg = new THREE.PlaneGeometry(0.2, 0.16);
    const wings = [-1, 1].map((k) => { const pv = new THREE.Group(), w = new THREE.Mesh(wg, mat); w.rotation.x = -Math.PI / 2; w.position.x = k * 0.1; pv.add(w); g.add(pv); return pv; });
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 6).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#2a2220' })));
    const a = i / 14 * Math.PI * 2, r = 8 + (i % 4) * 5; scene.add(g);
    BUGS.push({ g, wings, name, off: 0, hx: VIL.x + Math.sin(a) * r, hz: VIL.z + Math.cos(a) * r, ph: i * 1.7 });
  } }
function updBugs(T, dt) {
  if (bugRun) { if (me.target || keys.size || Math.hypot(joy.x, joy.y) > 0.15) bugRun = null; else if ((bugRun.t -= dt) <= 0) bugTry(); }
  if (Math.hypot(me.pos.x - VIL.x, me.pos.z - VIL.z) > 70) return;
  for (const b of BUGS) {
    if (b.off > 0) { b.off -= dt; if (b.off <= 0) b.g.visible = true; continue; }
    const t = T * 0.6 + b.ph, x = b.hx + Math.sin(t) * 2.5, z = b.hz + Math.cos(t * 1.3) * 2.5;
    b.g.position.set(x, height(x, z) + 1.1 + Math.sin(t * 2.3) * 0.4, z); b.g.rotation.y = t; const f = Math.sin(T * 16 + b.ph) * 0.9; b.wings[0].rotation.z = f; b.wings[1].rotation.z = -f;
  }
}
// 🙌 동작 단추: 누르면 다섯 가지가 펼쳐져요. 춤 · 뛰기는 내 화면에서만 보여요
document.querySelectorAll('#actMenu button').forEach((b) => { b.querySelector('span').innerHTML = ICON[b.dataset.a] || ''; });
function closeActs() { $('#actMenu').classList.remove('on'); $('#actBtn').setAttribute('aria-expanded', 'false'); }
// 마을: 연날리기 · 곤충잡기 / 마을 밖: 춤추기 · 뛰기
function paintActs() { const w = me.inHome ? 'home' : curZone === 'village' ? 'village' : 'out'; document.querySelectorAll('#actMenu [data-v]').forEach((b) => { b.hidden = !b.dataset.v.split(' ').includes(w); }); }
$('#actBtn').onclick = (e) => { e.stopPropagation(); paintActs(); const on = $('#actMenu').classList.toggle('on'); $('#actBtn').setAttribute('aria-expanded', String(on)); };
addEventListener('pointerdown', (e) => { if (!e.target.closest('#actMenu, #actBtn')) closeActs(); });
$('#actMenu').addEventListener('click', (e) => {
  const k = e.target.closest('button')?.dataset.a; if (!k) return; closeActs(); if (me.riding) return;
  if (k === 'leave') { exitHome(); return; } if (k === 'deco') { openDeco(); return; } if (HS[k]) { homeDo(k); return; }
  if (k === 'sit') {
    if (sitting) { standUp(); return; }
    const seat = nearSeat(); if (seat) { sitDown(seat); return; }
    bump('sit'); sitting = { pos: me.pos.clone(), face: me.face }; me.target = null; me.st.sit = 1; me.st.seat = 0.04; toastMsg('땅에 앉았어요', '움직이면 일어나요');
  } else if (k === 'pet' || k === 'feed') {
    const a = nearAnimal(); if (!a) { toastMsg('동물 곁으로 가 보세요', '8 m 안에 있으면 다가와요'); return; }
    careAnimal(a, k === 'pet');
  } else if (k === 'kite') {
    if (kite.t > 0) { kite.t = 0; return; }
    standUp(); bump('kite'); kite.t = 20; toastMsg('연을 날려요', '걸어 다녀도 따라와요 · 한 번 더 누르면 내려요');
  } else if (k === 'bug') {
    standUp(); bugRun = { n: 5, t: 0.2, got: 0 }; me.target = null; toastMsg('곤충을 잡아 볼까요?', '다섯 번 저절로 휘둘러요 · 움직이면 그만해요');
  } else { bump(k); standUp(); me.act = k; me.actT = k === 'jump' ? 0.7 : 4; }
});
$('#ctx').onclick = () => {
  if (ctxKind === 'in') enterHome(); else if (ctxKind === 'out') exitHome(); else if (ctxKind === 'cable') $('#cable').onclick(); else if (ctxKind === 'ferry') rideFerry(); else if (HS[ctxKind]) homeDo(ctxKind);
  else if (ctxKind === 'sit') sitDown(nearSeat());
  else if (ctxKind === 'stand') standUp();
  else if (ctxKind === 'feed' && ctxA) careAnimal(ctxA);
};

// ───────── 😊 감정 표현: 단추는 뺐어요 (2026-11-07). 예전 판 친구가 보낸 표현은 이름표에 그대로 떠요 ─────────
const EMOS = ['😊', '👍', '❤️', '😂', '🙏', '😮'];
let emoN = 0, emoI = 0;
function showEmo(el, ch) { el.textContent = ch; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('pop'), 2600); }

// ───────── 🏅 도감 칭호: 구역 식구를 다 찍으면 칭호 + 코인 ─────────
const TITLES = { village: '🏘 마을 산책가', sea: '🌊 바다 친구', savanna: '🦁 초원 사진가', desert: '🏜️ 사막 여행자', jungle: '🌴 정글 탐험가', arctic: '🐧 눈꽃 사진가', isle: '🏝 섬 탐험가', islesea: '🐢 섬 바다 친구', all: '🌏 섬 도감 박사' };
function checkTitles() {
  MY.titles ||= []; const got = [];
  for (const z of Object.keys(ZLAB)) { if (MY.titles.includes(z)) continue; const ids = DEX.filter((d) => d[2] === z).map((d) => d[0]); if (ids.length && ids.every((id) => dex[id])) { MY.titles.push(z); got.push(z); } }
  if (!MY.titles.includes('all') && DEX.every(([id]) => dex[id])) { MY.titles.push('all'); got.push('all'); }
  if (got.length) { MY.coins += 500 * got.length; saveMy(); updCoins(); setTimeout(() => toastMsg(`칭호를 얻었어요: ${titleName(got[0])}`, `구역 식구를 모두 찍었어요 · 🪙 +${500 * got.length}`), 3400); snd.chime(); showPeople(); }
}
// 🏅 뱃지: 이 기기에 쌓인 기록으로 저절로 모여요 (소호랩과 같은 방식). 서버로 보내지 않아요
const BADGES = [
  { id: 'shot1', icon: '📸', name: '첫 찰칵', cap: '사진 1장 찍기', ok: (c) => c.shot >= 1 },
  { id: 'shot10', icon: '🎞', name: '사진 열 장', cap: '사진 10장 찍기', ok: (c) => c.shot >= 10 },
  { id: 'shot100', icon: '🏞', name: '사진가', cap: '사진 100장 찍기', ok: (c) => c.shot >= 100 },
  { id: 'star3', icon: '🌟', name: '별 셋', cap: '별 셋 사진 찍기', ok: (c) => c.star3 >= 1 },
  { id: 'star10', icon: '✨', name: '명사진가', cap: '별 셋 사진 10장', ok: (c) => c.star3 >= 10 },
  { id: 'dex3', icon: '📖', name: '도감 시작', cap: '동물 3종 모으기', ok: (c) => c.dex >= 3 },
  { id: 'dex10', icon: '📚', name: '도감 수집가', cap: '동물 10종 모으기', ok: (c) => c.dex >= 10 },
  { id: 'night', icon: '🌙', name: '밤 친구', cap: '밤에만 나오는 동물 찍기', ok: (c) => c.night >= 1 },
  { id: 'feed', icon: '🥕', name: '첫 먹이', cap: '동물에게 먹이 주기', ok: (c) => c.feed >= 1 },
  { id: 'feed20', icon: '🧺', name: '먹이 담당', cap: '먹이 20번 주기', ok: (c) => c.feed >= 20 },
  { id: 'pet', icon: '🤲', name: '다정한 손', cap: '동물 10번 쓰다듬기', ok: (c) => c.pet >= 10 },
  { id: 'wave', icon: '👋', name: '인사왕', cap: '인사 20번 하기', ok: (c) => c.wave >= 20 },
  { id: 'sit', icon: '🪑', name: '쉬어 가기', cap: '앉아서 쉬기', ok: (c) => c.sit >= 1 },
  { id: 'dance', icon: '💃', name: '섬의 춤꾼', cap: '춤 5번 추기', ok: (c) => c.dance >= 5 },
  { id: 'jump', icon: '🤸', name: '폴짝폴짝', cap: '20번 뛰기', ok: (c) => c.jump >= 20 },
  { id: 'exV', ex: 1, icon: '🏘', name: '마을 산책', cap: '강가 마을 걷기', ok: (c) => c.seen.village },
  { id: 'exB', ex: 1, icon: '⛵', name: '바다 나들이', cap: '배 타고 바다에 나가기', ok: (c) => c.seen.sea },
  { id: 'exS', ex: 1, icon: '🦁', name: '초원 탐험', cap: '초원에 가기', ok: (c) => c.seen.savanna },
  { id: 'exD', ex: 1, icon: '🏜️', name: '사막 탐험', cap: '사막에 가기', ok: (c) => c.seen.desert },
  { id: 'exJ', ex: 1, icon: '🌴', name: '정글 탐험', cap: '정글에 가기', ok: (c) => c.seen.jungle },
  { id: 'exA', ex: 1, icon: '🏔', name: '꼭대기 등정', cap: '산꼭대기 눈밭 가기', ok: (c) => c.seen.arctic },
  { id: 'exI', ex: 1, icon: '🏝', name: '섬 상륙', cap: '갈라파고스 섬 가기', ok: (c) => c.seen.isle },
  { id: 'exH', ex: 1, icon: '🏠', name: '우리 집', cap: '집에 들어가기', ok: (c) => c.seen.home },
  { id: 'exC', ex: 1, icon: '🚡', name: '케이블카 승객', cap: '케이블카 타기', ok: (c) => c.cable >= 1 },
  { id: 'exF', ex: 1, icon: '🚢', name: '뱃길 여행', cap: '배로 섬 다녀오기', ok: (c) => c.ferry >= 2 },
  { id: 'exP1', ex: 1, icon: '📍', name: '첫 포토 스팟', cap: '포토 스팟 1곳 가기', ok: () => Object.keys(MY.spots || {}).length >= 1 },
  { id: 'exP8', ex: 1, icon: '🗺', name: '포토 스팟 완주', cap: '포토 스팟 8곳 다 가기', ok: () => Object.keys(MY.spots || {}).length >= 8 },
  { id: 'exAll', ex: 1, icon: '🧭', name: '섬 탐험가', cap: '여덟 곳 모두 가 보기', ok: (c) => ['village', 'savanna', 'jungle', 'desert', 'arctic', 'sea', 'isle', 'home'].every((z) => c.seen[z]) },
  { id: 'rest', icon: '🛌', name: '집이 최고', cap: '침대에서 쉬기', ok: (c) => c.rest >= 1 },
  { id: 'kite', icon: '🪁', name: '바람 친구', cap: '연 날리기', ok: (c) => c.kite >= 1 },
  { id: 'bug', icon: '🦋', name: '곤충 친구', cap: '곤충 10마리 잡기', ok: (c) => c.bug >= 10 },
  { id: 'bugAll', icon: '🪲', name: '곤충 박사', cap: '곤충 도감 다 모으기', ok: () => BUG_KINDS.every(([n]) => (MY.bugs || {})[n]) },
  { id: 'buy', icon: '🛍', name: '첫 쇼핑', cap: '상점에서 사기', ok: (c) => c.buy >= 1 },
  { id: 'rich', icon: '🪙', name: '코인 부자', cap: '코인 3000개 모으기', ok: (c) => c.coins >= 3000 },
];
// 구역 식구를 다 모으면 받는 칭호도 같은 뱃지 모양으로 (마을 산책가 ~ 섬 도감 박사)
for (const [z, t] of Object.entries(TITLES)) { const sp = t.indexOf(' '); BADGES.push({ id: `tt-${z}`, icon: t.slice(0, sp), name: t.slice(sp + 1), cap: z === 'all' ? '도감 다 모으기' : `${ZLAB[z]} 식구 다 모으기`, ok: () => (MY.titles || []).includes(z) }); }
function bump(k, n = 1) { MY.cnt ||= {}; MY.cnt[k] = (MY.cnt[k] || 0) + n; saveMy(); checkBadges(); }
function checkBadges() {
  const c = { ...(MY.cnt || {}), seen: MY.seen || {}, dex: DEX.filter(([id]) => dex[id]).length, night: DEX.filter(([id, , , n]) => n && dex[id]).length, coins: MY.coins, titles: (MY.titles || []).length };
  const got = BADGES.filter((b) => b.ok({ shot: 0, star3: 0, feed: 0, pet: 0, wave: 0, sit: 0, dance: 0, jump: 0, buy: 0, ...c })).map((b) => b.id), first = !MY.badges, had = MY.badges || [];
  const fresh = got.filter((id) => !had.includes(id)); if (!fresh.length && !first) return;
  MY.badges = [...new Set([...had, ...got])]; saveMy();   // 한 번 받은 뱃지는 그대로
  if (first) return;   // 처음엔 조용히 (이미 한 일들)
  const b = BADGES.find((x) => x.id === fresh[0]); setTimeout(() => toastMsg(`새 뱃지: ${b.name}`, '도감 창의 뱃지에서 볼 수 있어요'), 4800); snd.chime();
}
const titleName = (z) => TITLES[z].slice(TITLES[z].indexOf(' ') + 1);
const myTitle = () => (MY.titles && MY.titles.length ? titleName(MY.titles[MY.titles.length - 1]) + ' ' : '');

// ───────── 💾 내 기록 내보내기 · 불러오기 (기기를 바꿔도 이어 하게) ─────────
const blobToData = (b) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
$('#expBtn').onclick = async () => {
  const photos = await listPhotos(), out = { app: 'snapzoo-island', v: 1, at: Date.now(), me: MY, dex, settings: SET, photos: [] };
  for (const p of photos) out.photos.push({ id: p.id, zone: p.zone, seen: p.seen, animal: p.animal, score: p.score, at: p.at, data: await blobToData(p.blob) });
  const u = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' })), a = document.createElement('a'), d = new Date();
  a.href = u; a.download = `스냅주-내기록-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  toastMsg('내 기록을 파일로 저장했어요', `사진 ${photos.length}장 · 코인 · 도감 · 꾸미기`);
};
$('#impBtn').onclick = () => $('#impFile').click();
$('#impFile').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const j = JSON.parse(await f.text()); if (j.app !== 'snapzoo-island') throw new Error('not ours');
    localStorage.setItem(LOOK_KEY, JSON.stringify(j.me)); localStorage.setItem('snapzoo-island-dex', JSON.stringify(j.dex || {})); localStorage.setItem('snapzoo-island-settings', JSON.stringify(j.settings || {}));
    for (const p of j.photos || []) { const blob = await (await fetch(p.data)).blob(); await addPhoto({ id: p.id, zone: p.zone, seen: p.seen, animal: p.animal, score: p.score, blob }); }
    toastMsg('기록을 불러왔어요', '잠시 뒤 다시 시작해요'); setTimeout(() => location.reload(), 1200);
  } catch { toastMsg('불러오지 못했어요', '스냅주에서 내보낸 기록 파일(.json)을 골라 주세요'); }
};

// ───────── 📤 사진 공유 ─────────
$('#vShare').onclick = async () => {
  if (!viewing) return; const file = new File([viewing.blob], `snapzoo-${viewing.id}.jpg`, { type: 'image/jpeg' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Snapzoo', text: '노을 진 섬에서 찍었어요 snapzoo.site' }); return; } } catch (err) { if (err && err.name === 'AbortError') return; }
  $('#vSave').click(); try { await navigator.clipboard.writeText('https://snapzoo.site'); } catch {}
  toastMsg('사진을 저장했어요', '사진과 함께 snapzoo.site 를 친구에게 보내 보세요 (주소를 복사했어요)');
};

// ───────── 🕹 조이스틱 (휴대폰 · 태블릿): 왼쪽 아래, 카메라가 보는 쪽 기준으로 걸어요 ─────────
const joy = { x: 0, y: 0, id: null };
{ const el = $('#joystick'), knob = el.querySelector('i');
  const move = (e) => { const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2 - 14; let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } joy.x = dx / R; joy.y = dy / R; knob.style.transform = `translate(${dx}px, ${dy}px)`; };
  el.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; el.setPointerCapture(e.pointerId); me.target = null; hideHint(); move(e); });
  el.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) move(e); });
  const end = () => { joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); }

// ───────── 👋 인사: 손을 흔들면 가까운(18 m 안) 동물이 다가와 반겨요 (♥). 친구 화면에서도 손을 흔들어요 ─────────
let waves = 0;
function wave() {
  if (me.riding || me.st.waveT > 0.6) return;
  me.st.waveT = 2.4; waves = (waves + 1) % 1000; bump('wave');
  for (const a of animals) {
    const dx = a.pos.x - me.pos.x, dz = a.pos.z - me.pos.z, d = Math.hypot(dx, dz);
    if (d > 18 || d < 1 || !a.speed || a.move === 'swim') { if (d <= 18) a.heart = 3; continue; }
    const stay = 2.4 + a.tagH * 1.1;   // 큰 동물은 조금 떨어져서
    a.target = me.pos.clone().add(V.set((dx / d) * stay, 0, (dz / d) * stay)); a.call = 12; a.wait = 0;
  }
}
$('#wave').onclick = wave;
addEventListener('keydown', (e) => { if (e.code === 'KeyH' && e.target === document.body) wave(); });

// ───────── 섬 친구들 (메타버스): 같은 섬 방의 친구가 각자 옷으로 걸어 다녀요 ─────────
const friends = new Map();
const friendWear = (d) => ({ g: d.g ? 'm' : 'f', hat: d.h || 0, body: d.b ?? START_BODY, cam: CAMERAS[d.c || 0]?.id, hair: d.hc ?? -1, acc: d.a || 0 });
function friendOf(id, d) {
  let f = friends.get(id);
  if (!f) {
    const st = makeWalker(d.l || 0, friendWear(d)); scene.add(st.root);
    const tag = document.createElement('div'); tag.className = 'tag friend'; document.body.append(tag);
    f = { st, tag, to: new THREE.Vector3(d.x, d.y, d.z), r: d.r, d, p: d.p, snapT: 0, name: d.n };
    st.root.position.copy(f.to); friends.set(id, f);
  }
  return f;
}
function dropFriend(id) { const f = friends.get(id); if (!f) return; scene.remove(f.st.root); f.tag.remove(); friends.delete(id); }
const net = new IslandNet({
  onState(id, d) { let f = friendOf(id, d); if (d.n) f.name = d.n; if (d.ec !== undefined && d.ec !== f.ec) { if (f.ec !== undefined) { f.emoT = 2.6; f.emo = EMOS[d.e || 0]; } f.ec = d.ec; } f.st.sit = d.s ? 1 : 0; f.st.seat = 0.3;
    if (f.st.look !== (d.l || 0) || f.st.g !== (d.g ? 'm' : 'f') || f.st.hat !== (d.h || 0) || f.st.body !== (d.b ?? START_BODY) || f.st.cam !== (CAMERAS[d.c || 0]?.id) || f.st.hair !== (d.hc ?? -1) || f.st.acc !== (d.a || 0)) {   // 친구가 옷을 갈아입었어요
      const ns = makeWalker(d.l || 0, friendWear(d)); ns.root.position.copy(f.st.root.position); ns.root.rotation.y = f.st.root.rotation.y; scene.remove(f.st.root); scene.add(ns.root); f.st = ns; } if (d.p !== f.p) { f.p = d.p; f.snapT = 2.2; f.st.aim = 1; f.st.snapT = 0.2; clearTimeout(f.aimT); f.aimT = setTimeout(() => (f.st.aim = 0), 1600); } if (d.w !== f.w) { if (f.w !== undefined) { f.st.waveT = 2.4; f.waveT = 2.4; } f.w = d.w; } f.d = d; f.name = d.n; f.to.set(d.x, d.y, d.z); f.r = d.r; },
  onLeave: dropFriend,
  onReset() { [...friends.keys()].forEach(dropFriend); },
  onStatus() { showPeople(); },
});
function showPeople() { const n = friends.size; $('#people').textContent = `${myTitle()}${myName}${net.online ? (n ? ` · 친구 ${n}명과 함께` : ' · 섬에 혼자예요') : ''}`; }
showPeople(); setTimeout(() => net.join(), 1500);   // 첫 그림이 나온 뒤에 붙어요
addEventListener('pagehide', () => net.close());
function updateFriends(dt) {
  const k = 1 - Math.exp(-dt * 7);
  for (const f of friends.values()) {
    const g = f.st.root; g.position.lerp(f.to, k);
    let dr = f.r - g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); g.rotation.y += dr * k;
    const d = Math.hypot(g.position.x - me.pos.x, g.position.z - me.pos.z);
    g.visible = !f.d.k && d < 220;
    f.st.walk = lerp(f.st.walk, f.d.m ? 1 : 0, 0.15); if (g.visible) f.st.update(clock.elapsedTime, dt);
    f.snapT = Math.max(0, f.snapT - dt); f.waveT = Math.max(0, (f.waveT || 0) - dt); f.emoT = Math.max(0, (f.emoT || 0) - dt);
    const on = g.visible && d < 60; f.tag.classList.toggle('on', on);
    if (on) { V.copy(g.position); V.y += 2.1; V.project(camera); if (V.z > 1) { f.tag.classList.remove('on'); continue; } f.tag.textContent = (f.emoT > 0 ? f.emo + ' ' : f.waveT > 0 ? '' : f.snapT > 0 ? '' : '') + f.name; f.tag.style.transform = `translate(${(V.x * 0.5 + 0.5) * innerWidth}px, ${(-V.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`; }
  }
  if (friends.size !== showPeople.n) { showPeople.n = friends.size; showPeople(); }
}

// ───────── 작은 지도 (한 번 그려 두고 내 점만 움직여요) ─────────
const mini = $('#mini'), mg = mini.getContext('2d'), MW = mini.width, MAP_W = 800, MAP_CX = -60, MAP_CZ = 60;   // 갈라파고스 섬까지 동그란 지도 안에 들어오게
const miniBase = document.createElement('canvas'); miniBase.width = miniBase.height = MW;
{ const g = miniBase.getContext('2d'), img = g.createImageData(MW, MW), cz = { sea: [74, 150, 200], arctic: [240, 245, 250], jungle: [63, 122, 58], savanna: [205, 183, 99], desert: [226, 182, 121], isle: [150, 150, 96] };
  for (let j = 0; j < MW; j++) for (let i = 0; i < MW; i++) { const x = MAP_CX + (i / MW - 0.5) * MAP_W, z = MAP_CZ + (j / MW - 0.5) * MAP_W, y = height(x, z); const c = riverNear(x, z).d < 4 && y > 0 ? [90, 170, 220] : cz[zoneAt(x, z, y)]; const o = (j * MW + i) * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255; }
  g.putImageData(img, 0, 0); }
const toMini = (p) => [((p.x - MAP_CX) / MAP_W + 0.5) * MW, ((p.z - MAP_CZ) / MAP_W + 0.5) * MW];
function drawMini() {
  mg.save(); mg.clearRect(0, 0, MW, MW); mg.beginPath(); mg.arc(MW / 2, MW / 2, MW / 2, 0, Math.PI * 2); mg.clip();
  mg.drawImage(miniBase, 0, 0);
  const [vx, vz] = toMini(VIL); mg.fillStyle = '#c8553d'; mg.fillRect(vx - 5, vz - 5, 10, 10);
  for (const f of friends.values()) { if (f.d.k) continue; const [fx, fz] = toMini(f.to); mg.fillStyle = '#f2c84a'; mg.beginPath(); mg.arc(fx, fz, 5, 0, Math.PI * 2); mg.fill(); }
  for (const sp of SPOTS) { const [sx, sz] = toMini(sp.pos), seen = (MY.spots || {})[sp.name]; mg.fillStyle = seen ? '#fff3d6' : '#ffb400'; mg.strokeStyle = '#6a3a10'; mg.lineWidth = 2; mg.beginPath(); mg.moveTo(sx, sz + 8); mg.arc(sx, sz - 3, 6, Math.PI * 0.85, Math.PI * 0.15); mg.closePath(); mg.fill(); mg.stroke(); }   // 📍 핀: 안 가 본 곳은 진한 금색
  const [px, pz] = toMini(me.inHome ? HOME.door : me.pos), pulse = 11 + Math.sin(performance.now() / 260) * 3; mg.strokeStyle = 'rgba(232,50,40,.7)'; mg.lineWidth = 3; mg.beginPath(); mg.arc(px, pz, pulse, 0, Math.PI * 2); mg.stroke(); mg.fillStyle = '#e83228'; mg.strokeStyle = '#fff'; mg.lineWidth = 3; mg.beginPath(); mg.arc(px, pz, 7, 0, Math.PI * 2); mg.fill(); mg.stroke();   // 나 = 빨간 점 + 맥박 고리
  mg.restore();
}

// ───────── 구역 이름 · 안개 ─────────
let curZone = '';
function setZone(z) {
  if (z === curZone) return; curZone = z; MY.seen ||= {}; if (!MY.seen[z]) { MY.seen[z] = 1; saveMy(); checkBadges(); }
  $('#zoneName').textContent = ZONES[z][0]; $('#zoneSub').textContent = ZONES[z][1];
}
// 북극 눈송이
const snowG = new THREE.BufferGeometry(), SN = MOBILE ? 400 : 900, snowP = new Float32Array(SN * 3);
for (let i = 0; i < SN; i++) { snowP[i * 3] = (rnd() - 0.5) * 70; snowP[i * 3 + 1] = rnd() * 30; snowP[i * 3 + 2] = (rnd() - 0.5) * 70; }
snowG.setAttribute('position', new THREE.BufferAttribute(snowP, 3));
const dotC = document.createElement('canvas'); dotC.width = dotC.height = 32;
{ const g = dotC.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 15); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }
const snow = new THREE.Points(snowG, new THREE.PointsMaterial({ color: '#ffffff', size: 0.28, map: new THREE.CanvasTexture(dotC), transparent: true, opacity: 0, depthWrite: false }));
snow.visible = false;
scene.add(snow);
// 정글에서는 나뭇잎을 반쯤 비치게 해서 나무가 나를 가리지 않게


// ───────── 매 프레임 ─────────
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = fcam.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); fcam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), mv = new THREE.Vector3();
let miniT = 0; const V2C = new THREE.Color();
let perf = { n: 0, t: 0, done: false }, AUTO_LOW = false;
function frame() {
  const dt = Math.min(0.05, clock.getDelta()), T = clock.elapsedTime;
  // 걷기
  mv.set(0, 0, 0);
  if (!me.riding) {
    if (mode === 'photo') fwd.set(Math.sin(aim.yaw), 0, Math.cos(aim.yaw)); else { camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); }
    right.crossVectors(fwd, UP);
    if (keys.has('arrowup') || keys.has('w')) mv.add(fwd);
    if (keys.has('arrowdown') || keys.has('s')) mv.sub(fwd);
    if (keys.has('arrowleft') || keys.has('a')) mv.sub(right);
    if (keys.has('arrowright') || keys.has('d')) mv.add(right);
    if (Math.hypot(joy.x, joy.y) > 0.15) { mv.addScaledVector(fwd, -joy.y).addScaledVector(right, joy.x); }
    if (me.target) { mv.set(me.target.x - me.pos.x, 0, me.target.z - me.pos.z); if (mv.length() < 0.6) { me.target = null; mv.set(0, 0, 0); } }
  }
  if (sitting && mv.lengthSq() > 0) standUp();
  const moving = mv.lengthSq() > 0 && !sitting;
  if (moving) {
    mv.normalize();
    const inWater = !me.inHome && !!waterAt(me.pos.x, me.pos.z);
    const sp = (mode === 'photo' ? 1.4 : inWater ? 2.8 : 3.6) * SET.speed * dt;   // 뗏목 · 배는 조금 느리게   // ⚙ 걷는 속도
    const nx = me.pos.x + mv.x * sp, nz = me.pos.z + mv.z * sp, ny = height(nx, nz);
    if (me.inHome) { me.pos.x = clamp(nx, ROOM.x - 4.4, ROOM.x + 4.4); me.pos.z = clamp(nz, ROOM.z - 3.4, ROOM.z + 3.5); }
    else if (ny > -8 && Math.abs(nx) < SIZE / 2 - 4 && Math.abs(nz) < SIZE / 2 - 4) { me.pos.x = nx; me.pos.z = nz; } else { me.target = null; if (!limitT) { limitT = 2.5; toastMsg('바닷가 둘레까지만 갈 수 있어요', '더 먼 바다는 못 가요'); } }   // 바닷가 둘레만
    if (mode !== 'photo') me.face = Math.atan2(mv.x, mv.z);
  }
  if (me.riding) {
    const r = me.riding; r.t += dt; const k = clamp(r.t / r.dur, 0, 1), e = k * k * (3 - 2 * k), u = r.dir > 0 ? e : 1 - e;
    if (r.ferry) {
      const p = FERRY.getPointAt(u), tn = FERRY.getTangentAt(u); me.pos.set(p.x, waveAt(p.x, p.z) + 0.34, p.z); me.face = Math.atan2(tn.x * r.dir, tn.z * r.dir); boat.visible = true; raft.visible = false; boat.position.set(p.x, me.pos.y - 0.22, p.z); boat.rotation.set(Math.sin(T * 1.3) * 0.03, me.g.rotation.y, Math.sin(T * 1.1) * 0.04);
      $('#rideBar').style.width = `${Math.round(k * 100)}%`; $('#rideS').textContent = k < 1 ? `${Math.ceil(r.dur * (1 - k))}초 남았어요 · ${r.dir > 0 ? '갈라파고스 섬' : '마을 쪽 나루'}` : '도착!';
      if (k >= 1) { const end = r.dir > 0 ? PIER.isle : PIER.main, s = r.dir > 0 ? -1 : 1; me.pos.set(end.x + PIER.ux * s * 3, 0, end.z + PIER.uz * s * 3); me.pos.y = height(me.pos.x, me.pos.z); me.riding = null; boat.visible = false; $('#ferry').disabled = false; setTimeout(() => { $('#ride').classList.remove('on'); bringAnimals(); }, 700); }
    } else {
    const p = CABLE.getPointAt(u); gondola.position.copy(p); me.pos.set(p.x, p.y - 3.3, p.z);
    $('#rideBar').style.width = `${Math.round(k * 100)}%`; $('#rideS').textContent = k < 1 ? `${Math.ceil(r.dur * (1 - k))}초 남았어요 · ${r.dir > 0 ? '눈 덮인 꼭대기' : '강가 마을'}` : '도착!';
    if (k >= 1) { const end = r.dir > 0 ? TOPS : STA; me.pos.copy(end).add(V.set(3, 0, 3)); me.pos.y = height(me.pos.x, me.pos.z); me.riding = null; $('#cable').disabled = false; setTimeout(() => { $('#ride').classList.remove('on'); bringAnimals(); }, 700); }
    }
  } else {
    const wa = me.inHome ? null : waterAt(me.pos.x, me.pos.z), deck = wa ? (wa.kind === 'sea' ? 0.22 : 0.28) : 0;
    me.pos.y = lerp(me.pos.y, wa ? wa.y + deck + (wa.kind === 'sea' ? 0.12 : 0) : me.inHome ? ROOM.y : height(me.pos.x, me.pos.z), 0.3);
    const onRaft = wa?.kind === 'river', onBoat = wa?.kind === 'sea', vessel = onRaft ? raft : onBoat ? boat : null;
    raft.visible = onRaft && mode !== 'photo'; boat.visible = onBoat && mode !== 'photo';   // 사진 찍을 땐 돛대 · 뱃머리가 앞을 가리지 않게 숨겨요
    if (vessel) { vessel.position.set(me.pos.x, me.pos.y - deck, me.pos.z); vessel.rotation.set(Math.sin(T * 1.3) * 0.03, me.g.rotation.y, Math.sin(T * 1.1) * 0.04); if (vessel === boat) boat.userData.sail.rotation.x = Math.sin(T * 0.9) * 0.08; }
    if (wa?.kind !== frame.lastWater) { frame.lastWater = wa?.kind; if (wa) toastMsg(wa.kind === 'river' ? '뗏목을 타고 강을 건너요' : '작은 배를 타고 바다로', wa.kind === 'river' ? '건너편 강둑에 닿으면 내려요' : '돌고래 · 바다거북 · 해달을 만나 보세요'); }
    if (limitT > 0) limitT -= dt;
    gondola.position.copy(CABLE.getPointAt(0.5 + 0.5 * Math.sin(T * 0.08)));   // 빈 케이블카는 천천히 오가요
  }
  me.g.position.copy(me.pos);
  me.g.rotation.y = lerp(me.g.rotation.y, me.face, 0.2);
  updKite(T, dt); updBugs(T, dt);
  me.g.rotation.x = me.lie ? -1.5 : 0; if (me.lie) me.g.position.y += 0.62;   // 침대에 누워요
  if (me.actT > 0) {   // 🙌 춤추기 · 뛰기
    if (mv.lengthSq() > 0 && me.act === 'dance') me.actT = 0;
    me.actT -= dt;
    if (me.act === 'jump') me.g.position.y += Math.sin(Math.max(0, 1 - me.actT / 0.7) * Math.PI) * 0.9;
    else { me.g.position.y += Math.abs(Math.sin(T * 6)) * 0.14; me.g.rotation.y = me.face + Math.sin(T * 5) * 0.5; me.st.waveT = Math.max(me.st.waveT, 0.5); }
  }
  me.st.rate = SET.speed; me.st.walk = lerp(me.st.walk, moving ? 1 : 0, 0.2); me.st.update(T, dt);

  // 내 캐릭터가 화면에서 차지하는 네모: 그 뒤에 있는 동물의 이름표는 숨겨요 (이름표가 사람 몸 위로 뜨지 않게)
  const camD = camera.position.distanceTo(me.pos);
  V.copy(me.pos).project(camera); const fx = (V.x * 0.5 + 0.5) * innerWidth, fy0 = (-V.y * 0.5 + 0.5) * innerHeight;
  V.copy(me.pos); V.y += 2.0; V.project(camera); const fy1 = (-V.y * 0.5 + 0.5) * innerHeight, fw = Math.max(18, (fy0 - fy1) * 0.42);
  const behindMe = (px, py, d) => me.g.visible && d > camD && px > fx - fw && px < fx + fw && py > fy1 - 10 && py < fy0 + 6;
  if ((frame.rk = (frame.rk || 0) + dt) > 0.3) { frame.rk = 0; const near = animals.filter((a) => a.g.visible && Math.abs(a.pos.x - me.pos.x) < 14 && Math.abs(a.pos.z - me.pos.z) < 14).sort((p, q) => p.pos.distanceToSquared(me.pos) - q.pos.distanceToSquared(me.pos)); animals.forEach((a) => (a.tagRank = 99)); const seen = new Set(); let r = 0; for (const a of near) { if (seen.has(a.id) && r >= 1) continue; seen.add(a.id); a.tagRank = r++; } }
  // 동물: 집 둘레를 천천히 거닐다 멈춰 쉬어요. 가까이 가면 나를 바라보고 이름표
  for (const a of animals) {
    const dMe = Math.hypot(a.pos.x - me.pos.x, a.pos.z - me.pos.z);
    a.g.visible = dMe < (LOWQ || AUTO_LOW ? 60 : 120) && (!a.night || tod.night > 0.35);   // 🌙 밤 친구는 해가 지면 나와요
    if (a.move === 'fly') { a.flyA += dt * a.flySp / a.flyR; a.pos.x = a.home.x + Math.sin(a.flyA) * a.flyR; a.pos.z = a.home.z + Math.cos(a.flyA) * a.flyR; }
    // 걸음: 목표 쪽으로 먼저 몸을 돌리고, 천천히 출발 · 멈춤. 다리는 실제 빠르기에 맞춰요
    let want = 0;
    const called = a.call > 0; if (called) a.call -= dt;
    if (a.leave > 0) a.leave -= dt;
    if (a.visit && !called) {   // 인사받고 와서 5초 반기고(사진 찍을 틈) → 제 자리로 돌아가요
      a.face = Math.atan2(me.pos.x - a.pos.x, me.pos.z - a.pos.z); a.wait -= dt;
      if (a.wait <= 0) { a.visit = false; a.leave = 10; a.target = a.home.clone().add(V.set((rnd() - 0.5) * 16, 0, (rnd() - 0.5) * 16)); }
    }
    else if (dMe < 9 && !called && !(a.leave > 0) && !a.target) a.face = Math.atan2(me.pos.x - a.pos.x, me.pos.z - a.pos.z);
    else if (a.wait > 0 && !called) a.wait -= dt;
    else {
      if (!a.target) a.target = a.speed ? a.home.clone().add(V.set((rnd() - 0.5) * 22, 0, (rnd() - 0.5) * 22)) : a.pos.clone();
      const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.6) { a.target = null; a.wait = called ? 5 : 3 + rnd() * 6; if (called) { a.call = 0; a.heart = 5; a.visit = true; } }
      else { a.face = Math.atan2(dx, dz); want = a.speed * (called ? 1.4 : 1) * smooth(0, 2.5, d); }
    }
    let dr = a.face - a.g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); a.g.rotation.y += dr * Math.min(1, dt * 2.6);
    if (Math.abs(dr) > 0.7) want *= 0.2;
    a.v = lerp(a.v || 0, want, Math.min(1, dt * 1.8));
    if (a.v > 0.02) {
      const nx = a.pos.x + Math.sin(a.g.rotation.y) * a.v * dt, nz = a.pos.z + Math.cos(a.g.rotation.y) * a.v * dt, ny = height(nx, nz), rv = riverNear(nx, nz);
      if (called && a.move === 'walk' ? ny > 0.4 && !(rv.i >= 0 && rv.d < riverW(rv.i) * 0.9) : okFor(a, nx, nz)) { a.pos.x = nx; a.pos.z = nz; }   // 제 구역 안에서만 (부르면 조금 벗어나도 돼요)
      else { a.target = null; a.wait = 1; a.v = 0; a.call = 0; }
    }
    // 동물끼리 겹치지 않게: 0.25초마다 가까운 동물을 찾아 두고, 몸 크기만큼 밀어내요
    if (a.g.visible) { if (!a.nb || (a.nbT = (a.nbT || 0) - dt) < 0) { a.nbT = 0.25 + Math.random() * 0.1; a.nb = animals.filter((o) => o !== a && Math.abs(o.pos.x - a.pos.x) < 4 && Math.abs(o.pos.z - a.pos.z) < 4); }
      for (const o of a.nb) { const dx = a.pos.x - o.pos.x, dz = a.pos.z - o.pos.z, dd = Math.hypot(dx, dz) || 0.01, need = (a.size || 0.5) + (o.size || 0.5); if (dd < need) { const k = (need - dd) * Math.min(1, dt * 3); a.pos.x += (dx / dd) * k * 0.5; a.pos.z += (dz / dd) * k * 0.5; } } }
    // 내 둘레 거리 두기: 큰 동물일수록 넉넉히 (카메라가 몸 안에 들어가지 않게)
    const room = mode === 'photo' ? 1.6 + a.tagH * 1.2 : Math.max(1.3, a.tagH * 0.75), dxm = a.pos.x - me.pos.x, dzm = a.pos.z - me.pos.z;
    if (dMe < room && dMe > 0.01) { const push = (room - dMe) * Math.min(1, dt * 4); a.pos.x += (dxm / dMe) * push; a.pos.z += (dzm / dMe) * push; }
    const walking = a.v > 0.05;
    a.pos.y = a.move === 'swim' ? (SEA_Y[a.id] ?? -0.2) + Math.sin(T * 0.9 + a.t) * 0.06 : height(a.pos.x, a.pos.z) + (a.alt ? a.alt + Math.sin(T * 1.3 + a.t) * 0.6 : 0);
    a.g.position.copy(a.pos); if (a.move === 'fly') a.g.rotation.y = a.flyA + Math.PI / 2;
    if (a.st) { a.st.walk = a.speed ? Math.min(1, a.v / a.speed) : 0; if (a.g.visible) a.st.update(T, dt); }
    if (a.heart > 0) a.heart -= dt;
    // 이름표
    const on = dMe < 14 && mode !== 'photo' && a.tagRank < 3;   // 가까운 셋만 (겹치지 않게)
    a.tag.classList.toggle('on', on);
    if (on) { const tx = (a.heart > 0 ? '♥ ' : '') + a.name; if (a.tag.textContent !== tx) a.tag.textContent = tx; V.copy(a.pos); V.y += a.tagH; V.project(camera); const tx2 = (V.x * 0.5 + 0.5) * innerWidth, ty2 = (-V.y * 0.5 + 0.5) * innerHeight; a.tx = tx2; a.ty = ty2; tagged.push(a); a.tag.style.transform = `translate(${tx2}px, ${ty2}px) translate(-50%, -100%)`; if (V.z > 1 || behindMe(tx2, ty2, camera.position.distanceTo(a.pos))) a.tag.classList.remove('on'); }
  }
  // 이름표가 서로 겹치면 가까운 동물 것만 남겨요
  { tagged.sort((p, q) => p.tagRank - q.tagRank); const keep = []; for (const a of tagged) { if (keep.some((b) => Math.abs(a.tx - b.tx) < 104 && Math.abs(a.ty - b.ty) < 32)) a.tag.classList.remove('on'); else keep.push(a); } tagged.length = 0; }
  for (const d of dolphins) { const k = ((T * 0.35 + d.phase) % 3) / 3, j = Math.sin(k * Math.PI); d.g.position.set(d.cx + k * 26, k < 1 ? j * 4 - 1.2 : -3, d.cz); d.g.rotation.x = -Math.cos(k * Math.PI) * 0.9; d.g.rotation.order = 'YXZ'; d.g.rotation.y = Math.PI / 2; d.st.update(T); }

  // 풀밭: 12 m 넘게 벗어나면 내 둘레로 다시 깔기
  if (!me.riding && !me.inHome && Math.hypot(me.pos.x - grassAt.x, me.pos.z - grassAt.z) > 12) layGrass(me.pos.x, me.pos.z);
  grassMat.uniforms.uTime.value = T; grassMat.uniforms.uFogN.value = scene.fog.near; grassMat.uniforms.uFogF.value = scene.fog.far;

  // 바다 출렁 · 강물 흐름
  const sp2 = wg.attributes.position;
  for (let i = 0; i < sp2.count; i++) { const x = seaBase[i * 3], z = seaBase[i * 3 + 2]; sp2.array[i * 3 + 1] = Math.sin(x * 0.04 + T * 0.9) * 0.35 + Math.cos(z * 0.05 + T * 0.7) * 0.3; }
  sp2.needsUpdate = true;
  flowT.offset.y -= dt * 0.25;

  // 카메라: 처음 내려오기 → 그다음은 나를 따라
  if (intro) {
    intro.t0 ??= performance.now(); intro.t = (performance.now() - intro.t0) / 2400; const e = 1 - Math.pow(1 - clamp(intro.t, 0, 1), 3);   // 실제 시간 2.4초 (느린 기기에서도 오래 멀리 머물지 않게)
    camera.position.lerpVectors(intro.from, intro.to, e); V.copy(me.pos); V.y += 1.1; controls.target.lerp(V, Math.max(0.2, e));   // (예전엔 V 를 두 번 써서 섬 한가운데를 바라봤어요)
    if (intro.t >= 1) intro = null;
  } else {
    const want = V.copy(me.pos); want.y += 1.1;
    const delta = want.sub(controls.target).multiplyScalar(0.15);
    controls.target.add(delta); camera.position.add(delta);
  }
  controls.update();
  { const minY = Math.max(height(camera.position.x, camera.position.z), 0.6) + 0.8; if (camera.position.y < minY) camera.position.y = minY; }   // 카메라는 땅 · 물 아래로 들어가지 않아요
  // 해 · 그림자: 나를 따라와요
  if ((frame.tt = (frame.tt || 0) + dt) > 0.25 || !frame.tod) { frame.tt = 0; frame.tod = 1; applyTime(T); }
  sun.position.copy(me.pos).addScaledVector(sunDir, 160); sun.target.position.copy(me.pos); sky.position.copy(camera.position); stars.position.copy(camera.position); moon.position.copy(camera.position).addScaledVector(sunDir, 1300);

  // 구역 · 안개 · 눈
  const z0 = me.pos.distanceTo(VIL) < 26 ? 'village' : zoneAt(me.pos.x, me.pos.z);
  if (me.inHome) doorM.visible = camera.position.z < ROOM.z + 3.9;
  setZone(me.inHome ? 'home' : z0); if (z0 !== updMoves.z) { updMoves.z = z0; updMoves(z0); }
  const fogNear = z0 === 'jungle' ? 30 : z0 === 'arctic' ? 60 : 120, fogFar = z0 === 'jungle' ? 260 : z0 === 'arctic' ? 420 : 720;
  updWeather(T, dt, z0);
  scene.fog.near = lerp(scene.fog.near, fogNear * wx.fogK, 0.02); scene.fog.far = lerp(scene.fog.far, fogFar * wx.fogK, 0.02);
  FIRES.forEach((f, i) => { const k = 0.85 + Math.sin(T * 11 + i) * 0.08 + Math.sin(T * 23 + i * 2) * 0.06; f.flames.forEach((m, j) => { m.scale.set(1, k + j * 0.05, 1); m.rotation.y = T * (1 + j); }); f.light.intensity = (4 + tod.night * 10) * k; });
  SPOTS.forEach((sp, i) => { sp.ring.material.opacity = 0.35 + Math.sin(T * 2 + i) * 0.15; sp.g.visible = !me.inHome && Math.hypot(sp.pos.x - me.pos.x, sp.pos.z - me.pos.z) < 300; });
  // 📍 포토 스팟 알림: 가까워지면 한 번, 안에 들어오면 한 번
  if (!me.inHome && !me.riding) for (const sp of SPOTS) {
    const d = Math.hypot(sp.pos.x - me.pos.x, sp.pos.z - me.pos.z);
    if (d < 3 && !sp.inIt) { sp.inIt = true; MY.spots ||= {}; if (!MY.spots[sp.name]) { MY.spots[sp.name] = 1; saveMy(); checkBadges(); } toastMsg(`포토 스팟 · ${sp.name}`, '여기서 동물을 찍으면 🪙 +30 이고 사진에 장소 이름이 들어가요'); }
    else if (d > 6) sp.inIt = false;
    if (d < 26 && !sp.near) { sp.near = true; if (d >= 3) toastMsg(`근처에 포토 스팟이 있어요`, `금빛 기둥을 찾아가 보세요 · ${sp.name}`); } else if (d > 40) sp.near = false;
  }
  if ((frame.cx = (frame.cx || 0) + dt) > 0.2) { frame.cx = 0; updCtx(); }
  const ZL = { jungle: ['#a9bf8e', 1.75], arctic: ['#dde5ee', 1.35], desert: ['#f2d2a2', 1.1] }[z0] || [LK.fog, LK.hemi[2] * 1.4];   // 정글은 초록 안개 · 밝은 하늘빛
  V2C.copy(tod.fog).lerp(TCa.set(ZL[0]), 0.55 * (1 - tod.night)); scene.fog.color.lerp(V2C, 0.05); grassMat.uniforms.uFog.value.copy(scene.fog.color); hemi.intensity = lerp(hemi.intensity, tod.hemiI * (ZL[1] / (LK.hemi[2] * 1.4)), 0.05);
  if (z0 === 'jungle' || clearView.on) { clearView.on = z0 === 'jungle'; if ((clearView.t = (clearView.t || 0) + dt) > 0.12) { clearView.t = 0; clearView(); } }
  snow.material.opacity = z0 === 'arctic' ? lerp(snow.material.opacity, 0.9, 0.05) : 0;
  snow.visible = snow.material.opacity > 0.02;
  if (snow.visible) {
    snow.position.set(me.pos.x, me.pos.y, me.pos.z);
    for (let i = 0; i < SN; i++) { snowP[i * 3 + 1] -= dt * 3; snowP[i * 3] += Math.sin(T + i) * dt * 0.4; if (snowP[i * 3 + 1] < 0) snowP[i * 3 + 1] = 30; }
    snowG.attributes.position.needsUpdate = true;
  }
  if ((miniT += dt) > 0.2) { miniT = 0; drawMini(); }
  updateFriends(dt);
  if ($('#meEmo').classList.contains('pop')) { V.copy(me.pos); V.y += [2.0, 1.75, 1.45][MY.body]; V.project(camera); $('#meEmo').style.transform = `translate(${(V.x * 0.5 + 0.5) * innerWidth}px, ${(-V.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`; }
  const np = me.inHome ? HOME.door : me.pos;   // 집 안에 있으면 친구에게는 문 앞으로 보여요
  net.send({ n: myName, x: +np.x.toFixed(2), z: +np.z.toFixed(2), y: +np.y.toFixed(2), r: +me.g.rotation.y.toFixed(2), m: moving ? 1 : 0, k: me.riding ? 1 : 0, l: MY.look, g: MY.g === 'm' ? 1 : 0, h: MY.hat, hc: MY.hair, a: MY.acc, b: MY.body, c: Math.max(0, CAMERAS.findIndex((c) => c.id === MY.cam)), p: shots, w: waves, s: sitting ? 1 : 0, e: emoI, ec: emoN }, performance.now());
  // 소리: 구역 · 물가(강 · 바다) 가까움
  if ((frame.st = (frame.st || 0) + dt) > 0.5) { frame.st = 0; const rv = riverNear(me.pos.x, me.pos.z), w = Math.max(rv.i >= 0 ? 1 - rv.d / 30 : 0, me.pos.y < 6 ? 1 - me.pos.y / 6 : 0); snd.setPlace(z0 === 'village' ? 'village' : z0, Math.max(0, w)); }
  if (mode === 'photo') updatePhoto(dt);
  snd.night = tod.night; if ($('#tod').textContent !== tod.label) $('#tod').textContent = tod.label;
  updMark(dt);
  const finder = mode === 'photo' && raiseT <= 0;
  if (finder && !withFriends) for (const f of friends.values()) f.st.root.visible = false;   // 사진엔 동물만 (👥 친구도 켜면 같이)
  renderer.render(scene, finder ? fcam : camera);
  if (wantShot && raiseT <= 0) { wantShot = false; shoot(); }   // 사진기를 드는 중에 누르면 다 든 뒤에 찍어요   // 그린 바로 다음에 찍어야 화면이 비지 않아요
  if (!perf.done) { perf.t += dt; perf.n++; if (perf.t > 8) { perf.done = true; const fps = perf.n / perf.t; if (fps < 25 && !LOWQ) { renderer.setPixelRatio(Math.max(0.75, renderer.getPixelRatio() * 0.6)); AUTO_LOW = true; toastMsg('화면을 조금 가볍게 했어요', '설정에서 바꿀 수 있어요'); } else if (fps < 20) { renderer.setPixelRatio(0.75); AUTO_LOW = true; } } }
  requestAnimationFrame(frame);
}
drawMini();
requestAnimationFrame(frame);
$('#loading').classList.add('out');
setTimeout(() => $('#loading').remove(), 900);
window.__world = { seenFrom, wx, SPOTS, SEATS, sitDown, me, animals, height, zoneAt, camera, controls, VIL, TOPS, STA, net, friends, dex, SET, snd, enterPhoto, evaluate };   // 화면 점검용
