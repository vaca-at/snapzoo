// 스냅주 · 높은 산과 강 (지도 시안 E, 2026-11-05)
// 640 m 섬 하나: 가운데 큰 산 꼭대기 = 북극 눈밭, 산허리 = 정글, 아래 들 = 초원, 산 동쪽 비 그늘 = 사막, 남서쪽 강 하구 = 바다.
// 강이 산꼭대기 아래에서 굽이쳐 바다로. 강가 마을에서 시작 → 누른 곳 · 방향키로 걷기, 🚡 케이블카로 산꼭대기까지.
// 그림 느낌: ③ 극장판 부드러운 3D (2026-11-05 결정) — 매끈한 면 · 노을빛 역광 · 부드러운 그림자 · 안개.
// 동물 · 산책자 · 재질은 zoo3d.js (시안 docs/시안/메타버스3D시안.html 과 같은 코드). 무거운 판이라 휴대폰에서는 그림자 · 풀 · 해상도를 줄여요.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { addPhoto, listPhotos, removePhoto, getPhoto } from './album.js';
import { IslandNet, myName, myLook } from './net.js';
import { IslandSound } from './sound.js';
import { ROSTER } from './fauna.js';
import { DEX_PHOTOS } from './dexphotos.js';   // 구역마다 10종 (zoo3d.js 의 SPECIES 에 더해져요)
import { person as makeWalker, BODIES, START_BODY, CAMERAS } from './person.js';
import { HATS, plain, SPECIES as ZOO, skyDome, cloudTex, LOOK, acaciaGeos, NOISE } from './zoo3d.js';
const LK = LOOK.soft, SUN_DIR = new THREE.Vector3(0.7, 0.42, -0.58).normalize();   // 해 질 녘보다 조금 높은 해 (그림자가 너무 길지 않게)

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
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
  return h;
}
function height(x, z) {
  let h = rawH(x, z);
  const { d, i } = riverNear(x, z);
  if (i >= 0) { const w = riverW(i); h -= (1 - smooth(w * 0.35, w * 1.1, d)) * 3.6; }   // 강 바닥 파기
  return h;
}

// ───────── 구역 ─────────
const ZONES = {
  arctic: ['🐧 북극 · 산꼭대기 눈밭', '펭귄과 북극곰이 사는 하얀 꼭대기예요'],
  jungle: ['🌴 정글 · 안개 낀 산허리', '빽빽한 숲, 안개가 내려앉아요'],
  savanna: ['🦁 초원 · 넓은 들', '코끼리 · 기린 · 얼룩말이 풀을 뜯어요'],
  desert: ['🏜️ 사막 · 비 그늘 쪽', '산이 비를 막아 메마른 모래 언덕이에요'],
  sea: ['🌊 바다 · 강 하구', '강물이 바다와 만나요. 돌고래가 뛰어요'],
  village: ['🏘 강가 마을', '강을 따라 올라가면 산꼭대기 눈밭이에요'],
};
function zoneAt(x, z, y = height(x, z)) {
  if (y < 1.2) return 'sea';
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
function scatter(zone, n, parts, sMin = 0.8, sMax = 1.3, test) {
  const spots = []; for (let i = 0; i < n; i++) { const p = findSpot(zone, test); if (p) spots.push([p, sMin + rnd() * (sMax - sMin), rnd() * Math.PI * 2]); }
  for (const [geo, mat, oy, sx = 1, sy = 1, sz = 1] of parts) {
    const im = new THREE.InstancedMesh(geo, mat, spots.length);
    spots.forEach(([p, s, r], i) => { Q.setFromAxisAngle(UP, r); M4.compose(V.set(p.x, p.y + oy * s, p.z), Q, SC.set(sx * s, sy * s, sz * s)); im.setMatrixAt(i, M4); });
    im.castShadow = true; im.receiveShadow = true; scene.add(im); (spots.ims ||= []).push(im);
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
const ME3 = makeWalker(MY.look, { g: MY.g, hat: MY.hat, body: MY.body, cam: MY.cam });
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
  tod.label = (h < 5.2 || h >= 20.5 ? '🌙 밤' : h < 9 ? '🌅 아침' : h < 16.5 ? '☀️ 낮' : '🌇 저녁') + WX_LABEL[wx.kind];
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
const onBeach = (x, z) => { const y = height(x, z); return y > 0.7 && y < 2.6 && riverNear(x, z).d > 6 && z - 0.6 * x > 150; };   // 남서쪽 강 하구 바닷가
const inSea = (x, z) => { const y = height(x, z); return y < -1.2 && y > -15 && riverNear(x, z).d > 4 && z - 0.6 * x > 150; };   // 너무 멀리(깊이)는 안 가요
const inVillage = (x, z) => { const r = Math.hypot(x - VIL.x, z - VIL.z); return r < 27 && r > 3.5 && Math.abs(r - 15) > 4.2 && riverNear(x, z).d > 6; };
function okFor(a, x, z) {
  if (a.zone === 'village') return inVillage(x, z);
  if (a.move === 'swim') return inSea(x, z) && Math.hypot(x - a.home.x, z - a.home.z) < 34;
  if (a.move === 'shore') return onBeach(x, z) && Math.hypot(x - a.home.x, z - a.home.z) < 30;
  const y = height(x, z), rv = riverNear(x, z);
  return y > 1.5 && zoneAt(x, z, y) === a.zone && !(rv.i >= 0 && rv.d < riverW(rv.i) * 0.9) && Math.hypot(x - VIL.x, z - VIL.z) > 30;
}
function spotFor(zone, move, test) {
  for (let k = 0; k < 4000; k++) {
    let x, z;
    if (zone === 'village') { const a = rnd() * Math.PI * 2, r = 4 + rnd() * 23; x = VIL.x + Math.sin(a) * r; z = VIL.z + Math.cos(a) * r; if (!inVillage(x, z)) continue; }
    else { x = (rnd() - 0.5) * 640; z = (rnd() - 0.5) * 640; const y = height(x, z);
      if (move === 'swim') { if (!inSea(x, z) || height(x, z) < -9) continue; }
      else if (move === 'shore') { if (!onBeach(x, z)) continue; }
      else if (!(y > 2.8 && zoneAt(x, z, y) === zone && riverNear(x, z).d > 10 && clearAt(x, z) && (zone !== 'arctic' || y > 104))) continue; }
    if (test(x, z)) return new THREE.Vector3(x, height(x, z), z);
  }
  return null;
}
const animals = [], POOLS = new Map();
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
    const home = base.clone().add(V.set((rnd() - 0.5) * (zone === 'village' ? 4 : 8), 0, (rnd() - 0.5) * (zone === 'village' ? 4 : 8)));
    for (let k = 0; k < per; k++) {
      const st = ZOO[id](); st.root.scale.setScalar(scale);
      const a = { g: st.root, st, id, name, zone, move, home, night: !!night, target: null, wait: rnd() * 4, face: rnd() * 6, t: rnd() * 9, speed: speed || 0 };
      if (move === 'fly') { a.flySp = speed; a.speed = 0; a.wait = 1e12; a.flyA = rnd() * 6.28; a.flyR = id === 'bat' ? 7 + rnd() * 7 : 1.5 + rnd() * 3; a.alt = id === 'bat' ? 5 + rnd() * 4 : 0; }
      let p = null; for (let i = 0; i < 40 && !p; i++) { const q = home.clone().add(V.set((rnd() - 0.5) * (zone === 'village' ? 8 : 12), 0, (rnd() - 0.5) * (zone === 'village' ? 8 : 12))); if (okFor(a, q.x, q.z) || i === 39) p = q; }
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
  scene.add(g); dolphins.push({ g, st, phase: k * 1.6, cx: (pod ? -255 : -205) + (k % 4) * 9, cz: (pod ? 262 : 300) + (k % 2) * 12 });
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
canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; if (intro) intro.t0 = -1e9; });   // 누르면 바로 내 곁으로
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || me.riding || mode === 'photo') return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObject(ground)[0];
  if (hit) { me.target = hit.point.clone(); showMark(hit.point); hideHint(); }
});
// 누른 곳 표시: 다른 게임처럼 바닥에 점 + 퍼지는 고리 두 개, 도착하면 사라져요
const mark = new THREE.Group(); mark.visible = false; scene.add(mark);
{ const mm = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, fog: false });
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), mm('#fff6e6', 0.95)); dot.rotation.x = -Math.PI / 2; mark.add(dot);
  for (let i = 0; i < 2; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 40), mm('#fff6e6', 0.8)); r.rotation.x = -Math.PI / 2; r.userData.ph = i * 0.5; mark.add(r); }
  mark.renderOrder = 5; }
function showMark(p) { mark.position.set(p.x, height(p.x, p.z) + 0.05, p.z); mark.visible = true; mark.userData.t = 0; }
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
  me.riding = { t: 0, dur: 14, dir: atTop ? -1 : 1 };
  $('#rideT').textContent = atTop ? '🚡 마을로 내려가는 중' : '🚡 산꼭대기로 올라가는 중'; $('#rideBar').style.width = '0'; $('#ride').classList.add('on');
  me.target = null; $('#cable').disabled = true;
  $('#cable small').textContent = atTop ? '내려가는 중' : '올라가는 중'; closeDrawer();
};
// 🏘 마을로 · 🦁 초원으로 · 🏜️ 사막으로: 로딩 화면처럼 노을 사진 위에 '○○로 가는 중' + 진행선이 차오른 뒤 도착
// ☰ 메뉴 서랍: 도감 · 앨범 · 꾸미기 · 설정 · 이동. 하나를 누르면 닫혀요
function closeDrawer() { $('#drawer').classList.remove('on'); $('#drawer').setAttribute('aria-hidden', 'true'); $('#drawerBtn').setAttribute('aria-expanded', 'false'); }
$('#drawerBtn').onclick = (e) => { e.stopPropagation(); const on = !$('#drawer').classList.contains('on'); if (!on) return closeDrawer(); $('#drawer').classList.add('on'); $('#drawer').setAttribute('aria-hidden', 'false'); $('#drawerBtn').setAttribute('aria-expanded', 'true'); };
$('#drawer').addEventListener('click', (e) => { if (e.target.closest('button') && e.target.closest('button').id !== 'setBtn') closeDrawer(); });
// 📘 매뉴얼
function closeManual() { $('#manual').classList.remove('on'); $('#manual').setAttribute('aria-hidden', 'true'); }
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
$('#credits').innerHTML = ROSTER.filter(([, id]) => DEX_PHOTOS[id]).map(([, id, name]) => { const c = DEX_PHOTOS[id]; return `<p>${name} — ${esc(c.by)} · ${esc(c.license)} · <a href="${esc(c.link)}" target="_blank" rel="noopener">원본</a></p>`; }).join('');
$('#helpBtn').onclick = () => { closeAlbum(); closeDex(); $('#manual').classList.add('on'); $('#manual').setAttribute('aria-hidden', 'false'); $('#manualX').focus(); };
$('#manualX').onclick = closeManual;
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeManual(); });
addEventListener('pointerdown', (e) => { if (!e.target.closest('#drawer, #drawerBtn, #settings')) closeDrawer(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
let limitT = 0;
function toastMsg(b, sm) { const t = $('#toast'); t.querySelector('img').removeAttribute('src'); t.querySelector('span').innerHTML = `<b>${b}</b><small>${sm}</small>`; t.classList.add('on'); clearTimeout(toastMsg.tt); toastMsg.tt = setTimeout(() => t.classList.remove('on'), 2400); }
let travelling = false;
function travelTo(label, where) {
  if (me.riding || travelling) return; travelling = true; exitPhoto(); me.target = null;
  $('#travelT').textContent = label; $('#travelBar').style.width = '0'; $('#travel').classList.add('on');
  const t0 = performance.now(), dur = 1800; let moved = false;
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur); $('#travelBar').style.width = `${Math.round((1 - Math.pow(1 - k, 2)) * 100)}%`;
    if (k > 0.55 && !moved) { moved = true; const old = me.pos.clone(); me.pos.copy(where()); me.pos.y = height(me.pos.x, me.pos.z); V.copy(me.pos).sub(old); camera.position.add(V); controls.target.copy(me.pos).add(V.set(0, 1.1, 0)); layGrass(me.pos.x, me.pos.z); }
    if (k < 1) requestAnimationFrame(step); else setTimeout(() => { $('#travel').classList.remove('on'); travelling = false; }, 250);
  };
  requestAnimationFrame(step);
}
// 무리 곁 빈자리: 같은 구역 안에서 무리를 바라볼 수 있게 8~11 m 떨어진 곳
function herdOf(zone) {
  const a = animals.find((x) => x.zone === zone); if (!a) return VIL.clone();
  for (let i = 0; i < 24; i++) { const ang = i * 0.9, r = 8 + (i % 3) * 1.5, x = a.home.x + Math.sin(ang) * r, z = a.home.z + Math.cos(ang) * r; if (zoneAt(x, z) === zone && riverNear(x, z).d > 8) return new THREE.Vector3(x, 0, z); }
  return a.home.clone();
}
$('#home').onclick = () => travelTo('🏘 마을로 돌아가는 중', () => VIL.clone().add(V.set(0, 0, 8)));
$('#goSav').onclick = () => travelTo('🦁 초원으로 가는 중', () => herdOf('savanna'));
$('#goDes').onclick = () => travelTo('🏜️ 사막으로 가는 중', () => herdOf('desert'));
$('#goJun').onclick = () => travelTo('🌴 정글로 가는 중', () => herdOf('jungle'));
$('#goSea').onclick = () => travelTo('🌊 바닷가로 가는 중', () => { const b = (POOLS.get('seashore') || [])[0]; return b ? b.clone() : RIVER.getPointAt(0.97).clone().add(V.set(10, 0, -10)); });
// 지금 있는 구역의 단추는 숨겨요 (마을에선 '마을로'가 없어요). 산꼭대기에선 케이블카가 '마을로 내려가기'
function updMoves(z) {
  const atTop = z === 'arctic';
  $('#home').hidden = z === 'village' || atTop; $('#goSav').hidden = z === 'savanna'; $('#goDes').hidden = z === 'desert'; $('#goJun').hidden = z === 'jungle'; $('#goSea').hidden = z === 'sea';
}


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
$('#setBtn').onclick = (e) => { e.stopPropagation(); closeDrawer(); $('#settings').classList.toggle('on'); showSet(); };
addEventListener('pointerdown', (e) => { if (!e.target.closest('#settings, #setBtn')) $('#settings').classList.remove('on'); });
$('#sLow').onchange = (e) => { SET.lowq = e.target.checked; saveSet(); location.reload(); };
$('#sTime').onchange = (e) => { SET.time = e.target.value; saveSet(); frame.tod = 0; };
$('#sSpeed').oninput = (e) => { SET.speed = +e.target.value; saveSet(); showSet(); };
$('#sMusic').oninput = (e) => { SET.music = +e.target.value; snd.setVolume('music', SET.music); saveSet(); showSet(); };
$('#sAmb').oninput = (e) => { SET.amb = +e.target.value; snd.setVolume('amb', SET.amb); saveSet(); showSet(); };

// ───────── 📷 사진 찍기 (아이용 동물 왕국처럼): 뷰파인더로 바꿔 움직이는 동물을 따라 조준 · 확대 · 찰칵 → 점수 · 별 · 도감 ─────────
//  점수 = 가운데 40 + 크기 30 + 특별한 순간 30 (♥ 반가워할 때 · 나를 바라볼 때 · 돌고래가 뛰어오를 때)
const DEX = ROSTER.map(([zone, id, name, , , , , , night]) => [id, name, zone, night]);
const ZLAB = { village: '🏘 마을', savanna: '🦁 초원', jungle: '🌴 정글', desert: '🏜️ 사막', arctic: '🐧 북극', sea: '🌊 바다' };
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
function exitPhoto() { if (mode !== 'photo') return; mode = 'walk'; me.g.visible = true; me.st.aim = 0; controls.enabled = true; document.body.classList.remove('photo', 'raising'); $('#finder').setAttribute('aria-hidden', 'true'); }
$('#shot').onclick = enterPhoto;
$('#fExit').onclick = exitPhoto;
$('#fFr').onclick = () => { withFriends = !withFriends; $('#fFr').setAttribute('aria-pressed', String(withFriends)); };
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
  for (let i = 1; i < n; i++) { const k = i / n, x = eye.x + (c.x - eye.x) * k, z = eye.z + (c.z - eye.z) * k, y = eye.y + (c.y - eye.y) * k; if (height(x, z) > y + 0.15) return false; }
  return true;
}
function subjects() {
  const out = [], eye = (EYE.lengthSq() ? EYE : me.pos);
  for (const a of animals) {
    if (!a.g.visible) continue; const h = a.tagH - 0.35, c = a.pos.clone(); c.y += h * 0.55;
    if (c.distanceTo(eye) > Math.min(45, Math.max(9, h * 30)) || !seenFrom(eye, c)) continue;   // 멀거나 언덕 너머면 안 찍혀요 (작은 동물은 가까이서만)
    const toMe = Math.atan2(me.pos.x - a.pos.x, me.pos.z - a.pos.z), look = Math.abs(Math.atan2(Math.sin(toMe - a.g.rotation.y), Math.cos(toMe - a.g.rotation.y))) < 0.55 && a.pos.distanceTo(me.pos) < 20;
    out.push({ id: a.id, name: a.name, c, h, moment: a.heart > 0 || a.call > 0 ? '♥ 반가워해요' : look ? '👀 나를 바라봐요' : '' });
  }
  for (const d of dolphins) { if (d.g.position.y < -0.6 || d.g.position.distanceTo(eye) > 45 || !seenFrom(eye, d.g.position)) continue; out.push({ id: 'dolphin', name: '돌고래', c: d.g.position.clone(), h: 1.1, moment: d.g.position.y > 1 ? '🐬 뛰어올랐어요' : '' }); }   // 물 위로 보일 때만
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
  const tanH = Math.tan(THREE.MathUtils.degToRad(fcam.fov) / 2); let best = null;
  for (const o of subjects()) {
    const depth = V.copy(o.c).sub(fcam.position).dot(f); if (depth < 0.5) continue;
    V.copy(o.c).project(fcam); const px = (V.x + 1) / 2 * innerWidth, py = (1 - V.y) / 2 * innerHeight, dx = px - fcx, dy = py - fcy;
    if (Math.abs(dx) > fr.width / 2 || Math.abs(dy) > fr.height / 2) continue;
    const nd = Math.hypot(dx / (fr.width / 2), dy / (fr.height / 2)) / Math.SQRT2;
    const center = Math.round(SCORE.center * Math.max(0, 1 - nd / 0.7));
    const ratio = (o.h / (2 * depth * tanH) * innerHeight) / fr.height;
    const size = ratio > 1.05 ? 0 : Math.round(SCORE.size * Math.max(0, 1 - Math.abs(ratio - 0.45) / 0.33));
    const moment = o.moment ? SCORE.moment : 0, total = center + size + moment;
    if (!best || total > best.total) best = { o, center, size, moment, total, ratio };
  }
  return best;
}
const SCORE = { center: 40, size: 30, moment: 30 };
function showHint(ev) {
  if (!ev) { $('#fhint').textContent = '동물을 네모 안에 담아 보세요 · 끌어서 조준'; return; }
  const tip = ev.ratio < 0.22 ? '➕ 조금 더 가까이' : ev.ratio > 0.85 ? '➖ 너무 가까워요' : ev.center < 26 ? '가운데로 맞춰요' : !ev.moment ? '👋 인사하면 반겨 줘요' : ev.o.moment;
  $('#fhint').textContent = `${ev.o.name} · ${ev.total}점 · ${tip}`;
}
function shoot() {
  if (mode !== 'photo' || raiseT > 0) return;
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
  let earn = 0; const spot = spotHere();
  if (sp) {
    const old = dex[sp.id];
    earn = Math.max(1, Math.round(score / 10)) + (old ? 0 : 20) + (old && score > old.score ? 5 : 0); MY.coins += earn; saveMy(); updCoins();
    if (!old) { badge = '📖 새 도감 등록!'; isNew = true; dex[sp.id] = { score, stars, shots: 1, at: Date.now() }; }
    else if (score > old.score) { badge = '최고 사진 바꿈!'; Object.assign(old, { score, stars, shots: old.shots + 1, at: Date.now() }); }
    else { badge = `최고 사진은 ${old.score}점이에요`; old.shots++; }
    saveDex(); if (spot) { MY.coins += 30; saveMy(); updCoins(); } if (isNew) checkTitles();
  }
  document.fonts.load('40px OngleipUnz').catch(() => {}).then(() => {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1010; const g = c.getContext('2d');
    g.fillStyle = camOf().frame; g.fillRect(0, 0, 1080, 1010);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(120,100,70,${Math.random() * 0.05})`; g.fillRect(Math.random() * 1080, Math.random() * 1010, 2, 2); }
    g.drawImage(shot, 40, 40); g.strokeStyle = 'rgba(60,40,20,.25)'; g.lineWidth = 2; g.strokeRect(40, 40, 1000, 750);
    g.fillStyle = '#3a2e24'; g.font = '58px OngleipUnz, sans-serif'; g.fillText(sp ? sp.name : zone, 52, 870);
    if (sp) { const x0 = 52 + g.measureText(sp.name).width + 26; g.font = '46px OngleipUnz, sans-serif'; for (let i = 0; i < 3; i++) { g.fillStyle = i < stars ? '#e0a030' : '#ddd3c2'; g.fillText('★', x0 + i * 50, 866); } }
    g.fillStyle = '#7a6a5a'; g.font = '38px OngleipUnz, sans-serif'; g.fillText(sp ? `${spot ? '📍 ' + spot.name : zone} · ${score}점${sp.moment ? ' · ' + sp.moment : ''}` : '조용한 한때', 54, 930);
    g.font = '24px OngleipUnz, sans-serif'; g.fillStyle = 'rgba(90,70,50,.55)'; g.textAlign = 'right'; g.fillText('Snapzoo · snapzoo.site', 1032, 985); g.textAlign = 'left';   // 공유할 때 보이는 작은 표시
    g.textAlign = 'right'; g.font = '32px OngleipUnz, sans-serif'; g.fillText(`${at.getFullYear()}. ${at.getMonth() + 1}. ${at.getDate()}`, 1032, 930);
    c.toBlob(async (blob) => {
      if (!blob) return;
      await addPhoto({ blob, zone, seen: sp ? [sp.name] : [], animal: sp?.id || '', score });
      if (sp && (isNew || badge === '최고 사진 바꿈!')) await addPhoto({ id: `best-${sp.id}`, blob, zone, seen: [sp.name], animal: sp.id, score });
      const t = $('#toast'), u = URL.createObjectURL(blob); t.querySelector('img').src = u;
      t.querySelector('span').innerHTML = sp ? `<b>${sp.name} ${starHTML(stars)} ${score}점</b><small>${badge} · 🪙 +${earn}${spot ? ` · 📍 ${spot.name} +30` : ''}</small>` : '<b>찰칵!</b><small>동물은 안 찍혔어요</small>';
      t.classList.add('on'); clearTimeout(shoot.tt); shoot.tt = setTimeout(() => { t.classList.remove('on'); URL.revokeObjectURL(u); }, 3200);
      if (isNew) snd.chime();
    }, 'image/jpeg', 0.9);
  });
}
// 📖 도감: 열두 식구, 종마다 가장 잘 찍은 사진 한 장
let dexUrls = [];
async function openDex() {
  dexUrls.forEach((u) => URL.revokeObjectURL(u)); dexUrls = [];
  const got = DEX.filter(([id]) => dex[id]).length; $('#dexN').textContent = `${got} / ${DEX.length}`;
  $('#dexTitles').innerHTML = Object.entries(TITLES).map(([z, t]) => `<span class="tt ${(MY.titles || []).includes(z) ? 'on' : ''}">${t}</span>`).join('');
  const cards = DEX.map(([id, name, zone, night]) => {
    const d = dex[id], ph = DEX_PHOTOS[id], img = ph ? `<img src="world/${ph.src || 'dex/' + id + '.jpg'}" alt="${name} 실제 사진" loading="lazy">` : '?';
    return `<div class="dcard ${d ? '' : 'none'}"><div class="ph">${img}${d ? '' : '<span class="q">?</span>'}</div><b>${name}${d ? ' ' + starHTML(d.stars) : ''}</b><small>${d ? `내 사진 ${d.score}점 · ${d.shots}장` : `${ZLAB[zone]}${night ? ' · 🌙 밤에만' : ''} 어딘가`}</small></div>`;
  });
  $('#dexGrid').innerHTML = cards.join('');
  $('#dex').classList.add('on'); $('#dex').setAttribute('aria-hidden', 'false'); $('#dexX').focus({ preventScroll: true });
}
function closeDex() { $('#dex').classList.remove('on'); $('#dex').setAttribute('aria-hidden', 'true'); }
$('#dexBtn').onclick = () => ($('#dex').classList.contains('on') ? closeDex() : (closeAlbum(), openDex()));
$('#dexX').onclick = closeDex;
// 🖼 앨범
let urls = [], viewing = null, albumList = [], viewI = 0;
async function openAlbum() {
  const list = (await listPhotos()).filter((p) => !String(p.id).startsWith('best-')); urls.forEach((u) => URL.revokeObjectURL(u)); urls = [];
  $('#albumN').textContent = list.length ? `${list.length}장` : '';
  $('#grid').innerHTML = list.length ? '' : '<p class="empty">아직 사진이 없어요. 📷 사진 찍기로 동물을 담아 보세요</p>';
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
$('#vDel').onclick = async () => { if (!viewing) return; await removePhoto(viewing.id); $('#viewer').classList.remove('on'); openAlbum(); };
addEventListener('keydown', (e) => { if (e.key === 'Escape') { if ($('#viewer').classList.contains('on')) $('#viewer').classList.remove('on'); else { closeAlbum(); closeDex(); $('#settings').classList.remove('on'); } } });




// ───────── 👤 꾸미기 · 🛍 상점: 성별 · 옷 여덟 벌 · 모자 여섯. 안 가진 건 사진으로 모은 코인으로 사요 ─────────
const PRICE = { look: 800, hat: [0, 1000, 800, 1500, 2000, 0] };   // 🪙 1초에 1개씩 모여요 (하루 최대 3600)
const SW = ['#6f7d4c', '#4f6a8a', '#a8604a', '#d8b062', '#7a5a8a', '#3f6a5a', '#c8907a', '#5a5a62'];
const HAT_ICON = ['👒', '🧢', '🧶', '🤠', '🌸', '🙂'];
function updCoins() { const left = Math.max(0, 3600 - (MY.today?.sec || 0)); $('#coins').textContent = `🪙 ${MY.coins}${left ? '' : ' · 오늘 다 모았어요'}`; $('#ccoins').textContent = `🪙 ${MY.coins} · 오늘 ${Math.floor((MY.today?.sec || 0) / 60)}분 / 60분`; }
function remakeMe() {
  const ns = makeWalker(MY.look, { g: MY.g, hat: MY.hat, body: MY.body, cam: MY.cam }); ns.root.position.copy(me.g.position); ns.root.rotation.y = me.g.rotation.y; ns.root.visible = me.g.visible;
  scene.remove(me.g); scene.add(ns.root); me.g = ns.root; me.st = ns;
}
let pendingBuy = null;
function drawCloset() {
  updCoins();
  const g = (v, t) => `<button type="button" data-g="${v}" class="${MY.g === v ? 'on' : ''}">${t}</button>`;
  $('#cGender').innerHTML = g('f', '👩 여자') + g('m', '👨 남자');
  $('#cBody').innerHTML = BODIES.map((b, i) => `<button type="button" data-body="${i}" class="${MY.body === i ? 'on' : ''}">${i + 1} · ${b.name}</button>`).join('');
  $('#cLooks').innerHTML = SW.map((c, i) => { const own = MY.own.looks.includes(i); return `<button type="button" data-look="${i}" class="sw ${MY.look === i ? 'on' : ''} ${own ? '' : 'lock'} ${pendingBuy === 'look' + i ? 'ask' : ''}" style="--c:${c}" aria-label="옷 ${i + 1}${own ? '' : ` · ${PRICE.look}코인`}">${own ? '' : `<small>${pendingBuy === 'look' + i ? '사기?' : '🪙' + PRICE.look}</small>`}</button>`; }).join('');
  $('#cCams').innerHTML = CAMERAS.map((c) => { const own = MY.own.cams.includes(c.id), k = 'cam' + c.id; return `<button type="button" data-cam="${c.id}" class="cam ${MY.cam === c.id ? 'on' : ''} ${own ? '' : 'lock'} ${pendingBuy === k ? 'ask' : ''}"><span>${c.icon}</span><b>${c.name}</b><em>${c.desc}</em>${own ? (MY.cam === c.id ? '<small>쓰는 중</small>' : '<small>가지고 있어요</small>') : `<small>${pendingBuy === k ? '한 번 더 누르면 사요' : '🪙 ' + c.price}</small>`}</button>`; }).join('');
  $('#cHats').innerHTML = HATS.map((n, i) => { const own = MY.own.hats.includes(i); return `<button type="button" data-hat="${i}" class="${MY.hat === i ? 'on' : ''} ${own ? '' : 'lock'} ${pendingBuy === 'hat' + i ? 'ask' : ''}"><span>${HAT_ICON[i]}</span>${n}${own ? '' : `<small>${pendingBuy === 'hat' + i ? '한 번 더 누르면 사요' : '🪙 ' + PRICE.hat[i]}</small>`}</button>`; }).join('');
}
function closetTap(kind, i) {
  const own = MY.own[kind === 'look' ? 'looks' : kind === 'cam' ? 'cams' : 'hats'], price = kind === 'look' ? PRICE.look : kind === 'cam' ? CAMERAS.find((c) => c.id === i).price : PRICE.hat[i], key = kind + i;
  if (!own.includes(i)) {
    if (MY.coins < price) { $('#cMsg').textContent = `코인이 ${price - MY.coins}개 모자라요. 섬에 머무는 1초마다 1개씩 모여요 (하루 최대 3600)`; return; }
    if (pendingBuy !== key) { pendingBuy = key; $('#cMsg').textContent = `🪙 ${price}코인으로 살까요? 한 번 더 누르면 사요`; drawCloset(); return; }
    MY.coins -= price; own.push(i); pendingBuy = null; $('#cMsg').textContent = '🛍 샀어요! 바로 입어 볼게요'; snd.chime();
  } else { pendingBuy = null; $('#cMsg').textContent = ''; }
  if (kind === 'look') MY.look = i; else if (kind === 'cam') { MY.cam = i; setZoom(zoom); } else MY.hat = i;
  saveMy(); remakeMe(); drawCloset();
}
$('#closet').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.g) { MY.g = b.dataset.g; saveMy(); remakeMe(); drawCloset(); }
  else if (b.dataset.body) { MY.body = +b.dataset.body; saveMy(); remakeMe(); drawCloset(); }
  else if (b.dataset.look) closetTap('look', +b.dataset.look);
  else if (b.dataset.hat) closetTap('hat', +b.dataset.hat);
  else if (b.dataset.cam) closetTap('cam', b.dataset.cam);
});
function openCloset() { closeAlbum(); closeDex(); pendingBuy = null; $('#cMsg').textContent = ''; drawCloset(); $('#closet').classList.add('on'); $('#closet').setAttribute('aria-hidden', 'false'); $('#closetX').focus({ preventScroll: true }); }
function closeCloset() { $('#closet').classList.remove('on'); $('#closet').setAttribute('aria-hidden', 'true'); }
$('#closetBtn').onclick = () => ($('#closet').classList.contains('on') ? closeCloset() : openCloset());
$('#closetX').onclick = closeCloset;
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCloset(); });
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
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d'); x.fillStyle = 'rgba(18,14,12,.6)'; x.beginPath(); x.roundRect(8, 16, 496, 96, 40); x.fill(); x.fillStyle = '#fff3d6'; x.font = '54px OngleipUnz, sans-serif'; x.textAlign = 'center'; x.fillText('📍 ' + name, 256, 84);
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); sign.scale.set(4, 1, 1); sign.position.y = 3.4; g.add(sign);
  SPOTS.push({ name, pos: new THREE.Vector3(p.x, y, p.z), g, ring, sign, tex: c });
}
document.fonts.load('40px OngleipUnz').catch(() => {}).then(() => {
  addSpot('산꼭대기 전망대', TOPS.clone().add(V.set(12, 0, -6)));
  addSpot('노을 물웅덩이', (POOLS.get('savanna') || [])[0]);
  addSpot('붉은 메사 언덕', (POOLS.get('desert') || [])[1]);
  addSpot('안개 숲 빈터', (POOLS.get('jungle') || [])[0]);
  addSpot('돌고래 해변', (POOLS.get('seashore') || [])[0]);
  addSpot('강가 모닥불', VIL.clone().add(V.set(6.5, 0, -1.5)));
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
const WX_LABEL = { clear: '', rain: ' · 🌧 비', fog: ' · 🌫 안개', rainbow: ' · 🌈 무지개' };
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
function nearAnimal() { let best = null, bd = 3; for (const a of animals) { if (!a.g.visible || !a.speed || a.move === 'swim' || a.move === 'fly') continue; const d = Math.hypot(a.pos.x - me.pos.x, a.pos.z - me.pos.z); if (d < bd) { bd = d; best = a; } } return best; }
function nearSeat() { return SEATS.find((s) => Math.hypot(s.pos.x - me.pos.x, s.pos.z - me.pos.z) < 2.4); }
function updCtx() {
  if (mode === 'photo' || me.riding) { $('#ctx').hidden = true; return; }
  let kind = '', label = '';
  if (sitting) { kind = 'stand'; label = '🚶 일어나기'; }
  else if (nearSeat()) { kind = 'sit'; label = '🪑 모닥불 곁에 앉기'; }
  else { ctxA = nearAnimal(); if (ctxA) { kind = 'feed'; label = (ctxA.fedT > 0 ? '🤲 쓰다듬기 · ' : '🥕 먹이 주기 · ') + ctxA.name; } }
  ctxKind = kind; $('#ctx').hidden = !kind; if ($('#ctx').textContent !== label) $('#ctx').textContent = label;
}
function sitDown(seat) { sitting = seat; me.target = null; me.pos.copy(seat.pos); me.face = seat.face; me.st.sit = 1; me.st.seat = 0.3; toastMsg('🔥 모닥불 곁에 앉았어요', '움직이면 일어나요 · 타닥타닥 불소리를 들어 보세요'); snd.fire = 1; }
function standUp() { if (!sitting) return; sitting = null; me.st.sit = 0; snd.fire = 0; }
$('#ctx').onclick = () => {
  if (ctxKind === 'sit') sitDown(nearSeat());
  else if (ctxKind === 'stand') standUp();
  else if (ctxKind === 'feed' && ctxA) {
    const a = ctxA, pet = a.fedT > 0; a.face = Math.atan2(me.pos.x - a.pos.x, me.pos.z - a.pos.z); a.target = null; a.v = 0; a.visit = true; a.wait = 6; a.heart = 6; a.fedT = 30;
    me.face = Math.atan2(a.pos.x - me.pos.x, a.pos.z - me.pos.z); me.st.waveT = 1.0;
    if (!pet && !(a.coinT > 0)) { MY.coins += 2; a.coinT = 120; saveMy(); updCoins(); }
    toastMsg(pet ? `🤲 ${a.name}${josa(a.name) === '과' ? '이' : '가'} 좋아해요` : `🥕 ${a.name}${josa(a.name) === '과' ? '이' : '가'} 맛있게 먹어요`, '6초 동안 곁에 머물러요 · 지금 찍으면 ♥ 특별한 순간!'); snd.chime();
  }
};

// ───────── 😊 감정 표현 (친구에게 보여요) ─────────
const EMOS = ['😊', '👍', '❤️', '😂', '🙏', '😮'];
let emoN = 0, emoI = 0;
$('#emoBtn').onclick = (e) => { e.stopPropagation(); $('#emo').classList.toggle('on'); };
$('#emo').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; emoI = +b.dataset.i; emoN = (emoN + 1) % 1000; showEmo($('#meEmo'), EMOS[emoI]); $('#emo').classList.remove('on'); });
addEventListener('pointerdown', (e) => { if (!e.target.closest('#emo, #emoBtn')) $('#emo').classList.remove('on'); });
function showEmo(el, ch) { el.textContent = ch; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('pop'), 2600); }

// ───────── 🏅 도감 칭호: 구역 식구를 다 찍으면 칭호 + 코인 ─────────
const TITLES = { village: '🏘 마을 산책가', savanna: '🦁 초원 사진가', jungle: '🌴 정글 탐험가', desert: '🏜️ 사막 여행자', arctic: '🐧 눈꽃 사진가', sea: '🌊 바다 친구', all: '🌏 섬 도감 박사' };
function checkTitles() {
  MY.titles ||= []; const got = [];
  for (const z of Object.keys(ZLAB)) { if (MY.titles.includes(z)) continue; const ids = DEX.filter((d) => d[2] === z).map((d) => d[0]); if (ids.length && ids.every((id) => dex[id])) { MY.titles.push(z); got.push(z); } }
  if (!MY.titles.includes('all') && DEX.every(([id]) => dex[id])) { MY.titles.push('all'); got.push('all'); }
  if (got.length) { MY.coins += 500 * got.length; saveMy(); updCoins(); setTimeout(() => toastMsg(`🏅 칭호를 얻었어요: ${TITLES[got[0]]}`, `구역 식구를 모두 찍었어요 · 🪙 +${500 * got.length}`), 3400); snd.chime(); showPeople(); }
}
const myTitle = () => (MY.titles && MY.titles.length ? TITLES[MY.titles[MY.titles.length - 1]] + ' ' : '');

// ───────── 💾 내 기록 내보내기 · 불러오기 (기기를 바꿔도 이어 하게) ─────────
const blobToData = (b) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
$('#expBtn').onclick = async () => {
  const photos = await listPhotos(), out = { app: 'snapzoo-island', v: 1, at: Date.now(), me: MY, dex, settings: SET, photos: [] };
  for (const p of photos) out.photos.push({ id: p.id, zone: p.zone, seen: p.seen, animal: p.animal, score: p.score, at: p.at, data: await blobToData(p.blob) });
  const u = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' })), a = document.createElement('a'), d = new Date();
  a.href = u; a.download = `스냅주-내기록-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  toastMsg('💾 내 기록을 파일로 저장했어요', `사진 ${photos.length}장 · 코인 · 도감 · 꾸미기`);
};
$('#impBtn').onclick = () => $('#impFile').click();
$('#impFile').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const j = JSON.parse(await f.text()); if (j.app !== 'snapzoo-island') throw new Error('not ours');
    localStorage.setItem(LOOK_KEY, JSON.stringify(j.me)); localStorage.setItem('snapzoo-island-dex', JSON.stringify(j.dex || {})); localStorage.setItem('snapzoo-island-settings', JSON.stringify(j.settings || {}));
    for (const p of j.photos || []) { const blob = await (await fetch(p.data)).blob(); await addPhoto({ id: p.id, zone: p.zone, seen: p.seen, animal: p.animal, score: p.score, blob }); }
    toastMsg('📂 기록을 불러왔어요', '잠시 뒤 다시 시작해요'); setTimeout(() => location.reload(), 1200);
  } catch { toastMsg('📂 불러오지 못했어요', '스냅주에서 내보낸 기록 파일(.json)을 골라 주세요'); }
};

// ───────── 📤 사진 공유 ─────────
$('#vShare').onclick = async () => {
  if (!viewing) return; const file = new File([viewing.blob], `snapzoo-${viewing.id}.jpg`, { type: 'image/jpeg' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Snapzoo', text: '노을 진 섬에서 찍었어요 📷 snapzoo.site' }); return; } } catch (err) { if (err && err.name === 'AbortError') return; }
  $('#vSave').click(); try { await navigator.clipboard.writeText('https://snapzoo.site'); } catch {}
  toastMsg('📤 사진을 저장했어요', '사진과 함께 snapzoo.site 를 친구에게 보내 보세요 (주소를 복사했어요)');
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
  me.st.waveT = 2.4; waves = (waves + 1) % 1000;
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
function friendOf(id, d) {
  let f = friends.get(id);
  if (!f) {
    const st = makeWalker(d.l || 0, { g: d.g ? 'm' : 'f', hat: d.h || 0, body: d.b ?? START_BODY, cam: CAMERAS[d.c || 0]?.id }); scene.add(st.root);
    const tag = document.createElement('div'); tag.className = 'tag friend'; document.body.append(tag);
    f = { st, tag, to: new THREE.Vector3(d.x, d.y, d.z), r: d.r, d, p: d.p, snapT: 0, name: d.n };
    st.root.position.copy(f.to); friends.set(id, f);
  }
  return f;
}
function dropFriend(id) { const f = friends.get(id); if (!f) return; scene.remove(f.st.root); f.tag.remove(); friends.delete(id); }
const net = new IslandNet({
  onState(id, d) { let f = friendOf(id, d); if (d.ec !== undefined && d.ec !== f.ec) { if (f.ec !== undefined) { f.emoT = 2.6; f.emo = EMOS[d.e || 0]; } f.ec = d.ec; } f.st.sit = d.s ? 1 : 0; f.st.seat = 0.3;
    if (f.st.look !== (d.l || 0) || f.st.g !== (d.g ? 'm' : 'f') || f.st.hat !== (d.h || 0) || f.st.body !== (d.b ?? START_BODY) || f.st.cam !== (CAMERAS[d.c || 0]?.id)) {   // 친구가 옷을 갈아입었어요
      const ns = makeWalker(d.l || 0, { g: d.g ? 'm' : 'f', hat: d.h || 0, body: d.b ?? START_BODY, cam: CAMERAS[d.c || 0]?.id }); ns.root.position.copy(f.st.root.position); ns.root.rotation.y = f.st.root.rotation.y; scene.remove(f.st.root); scene.add(ns.root); f.st = ns; } if (d.p !== f.p) { f.p = d.p; f.snapT = 2.2; f.st.aim = 1; f.st.snapT = 0.2; clearTimeout(f.aimT); f.aimT = setTimeout(() => (f.st.aim = 0), 1600); } if (d.w !== f.w) { if (f.w !== undefined) { f.st.waveT = 2.4; f.waveT = 2.4; } f.w = d.w; } f.d = d; f.name = d.n; f.to.set(d.x, d.y, d.z); f.r = d.r; },
  onLeave: dropFriend,
  onReset() { [...friends.keys()].forEach(dropFriend); },
  onStatus() { showPeople(); },
});
function showPeople() { const n = friends.size; $('#people').textContent = `${myTitle()}${myName}${net.online ? (n ? ` · 👥 친구 ${n}명과 함께` : ' · 섬에 혼자예요') : ''}`; }
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
    if (on) { V.copy(g.position); V.y += 2.1; V.project(camera); if (V.z > 1) { f.tag.classList.remove('on'); continue; } f.tag.textContent = (f.emoT > 0 ? f.emo + ' ' : f.waveT > 0 ? '👋 ' : f.snapT > 0 ? '📷 ' : '') + f.name; f.tag.style.transform = `translate(${(V.x * 0.5 + 0.5) * innerWidth}px, ${(-V.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`; }
  }
  if (friends.size !== showPeople.n) { showPeople.n = friends.size; showPeople(); }
}

// ───────── 작은 지도 (한 번 그려 두고 내 점만 움직여요) ─────────
const mini = $('#mini'), mg = mini.getContext('2d'), MW = mini.width;
const miniBase = document.createElement('canvas'); miniBase.width = miniBase.height = MW;
{ const g = miniBase.getContext('2d'), img = g.createImageData(MW, MW), cz = { sea: [74, 150, 200], arctic: [240, 245, 250], jungle: [63, 122, 58], savanna: [205, 183, 99], desert: [226, 182, 121] };
  for (let j = 0; j < MW; j++) for (let i = 0; i < MW; i++) { const x = (i / MW - 0.5) * SIZE, z = (j / MW - 0.5) * SIZE, y = height(x, z); const c = riverNear(x, z).d < 4 && y > 0 ? [90, 170, 220] : cz[zoneAt(x, z, y)]; const o = (j * MW + i) * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255; }
  g.putImageData(img, 0, 0); }
const toMini = (p) => [(p.x / SIZE + 0.5) * MW, (p.z / SIZE + 0.5) * MW];
function drawMini() {
  mg.save(); mg.clearRect(0, 0, MW, MW); mg.beginPath(); mg.arc(MW / 2, MW / 2, MW / 2, 0, Math.PI * 2); mg.clip();
  mg.drawImage(miniBase, 0, 0);
  const [vx, vz] = toMini(VIL); mg.fillStyle = '#c8553d'; mg.fillRect(vx - 5, vz - 5, 10, 10);
  for (const f of friends.values()) { if (f.d.k) continue; const [fx, fz] = toMini(f.to); mg.fillStyle = '#f2c84a'; mg.beginPath(); mg.arc(fx, fz, 5, 0, Math.PI * 2); mg.fill(); }
  const [px, pz] = toMini(me.pos); mg.fillStyle = '#fff'; mg.strokeStyle = '#24302a'; mg.lineWidth = 3; mg.beginPath(); mg.arc(px, pz, 7, 0, Math.PI * 2); mg.fill(); mg.stroke();
  mg.restore();
}

// ───────── 구역 이름 · 안개 ─────────
let curZone = '';
function setZone(z) {
  if (z === curZone) return; curZone = z;
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
    const inWater = !!waterAt(me.pos.x, me.pos.z);
    const sp = (mode === 'photo' ? 1.4 : inWater ? 2.8 : 3.6) * SET.speed * dt;   // 뗏목 · 배는 조금 느리게   // ⚙ 걷는 속도
    const nx = me.pos.x + mv.x * sp, nz = me.pos.z + mv.z * sp, ny = height(nx, nz);
    if (ny > -15 && Math.abs(nx) < SIZE / 2 - 4 && Math.abs(nz) < SIZE / 2 - 4) { me.pos.x = nx; me.pos.z = nz; } else { me.target = null; if (!limitT) { limitT = 2.5; toastMsg('⛵ 여기까지만 갈 수 있어요', '섬에서 너무 멀어지면 돌아와요'); } }   // 너무 먼 바다는 못 가요
    if (mode !== 'photo') me.face = Math.atan2(mv.x, mv.z);
  }
  if (me.riding) {
    const r = me.riding; r.t += dt; const k = clamp(r.t / r.dur, 0, 1), e = k * k * (3 - 2 * k), u = r.dir > 0 ? e : 1 - e;
    const p = CABLE.getPointAt(u); gondola.position.copy(p); me.pos.set(p.x, p.y - 3.3, p.z);
    $('#rideBar').style.width = `${Math.round(k * 100)}%`; $('#rideS').textContent = k < 1 ? `${Math.ceil(r.dur * (1 - k))}초 남았어요 · ${r.dir > 0 ? '🐧 눈 덮인 꼭대기' : '🏘 강가 마을'}` : '도착!';
    if (k >= 1) { const end = r.dir > 0 ? TOPS : STA; me.pos.copy(end).add(V.set(3, 0, 3)); me.pos.y = height(me.pos.x, me.pos.z); me.riding = null; $('#cable').disabled = false; setTimeout(() => $('#ride').classList.remove('on'), 700); }
  } else {
    const wa = waterAt(me.pos.x, me.pos.z), deck = wa ? (wa.kind === 'sea' ? 0.22 : 0.28) : 0;
    me.pos.y = lerp(me.pos.y, wa ? wa.y + deck + (wa.kind === 'sea' ? 0.12 : 0) : height(me.pos.x, me.pos.z), 0.3);
    raft.visible = wa?.kind === 'river'; boat.visible = wa?.kind === 'sea';
    const vessel = raft.visible ? raft : boat.visible ? boat : null;
    if (vessel) { vessel.position.set(me.pos.x, me.pos.y - deck, me.pos.z); vessel.rotation.set(Math.sin(T * 1.3) * 0.03, me.g.rotation.y, Math.sin(T * 1.1) * 0.04); if (vessel === boat) boat.userData.sail.rotation.x = Math.sin(T * 0.9) * 0.08; }
    if (wa?.kind !== frame.lastWater) { frame.lastWater = wa?.kind; if (wa) toastMsg(wa.kind === 'river' ? '🛶 뗏목을 타고 강을 건너요' : '⛵ 작은 배를 타고 바다로', wa.kind === 'river' ? '건너편 강둑에 닿으면 내려요' : '돌고래 · 바다거북 · 해달을 만나 보세요'); }
    if (limitT > 0) limitT -= dt;
    const atTop = me.pos.distanceTo(TOPS) < me.pos.distanceTo(STA);
    const cl = atTop ? '마을로 내려가기' : '산꼭대기로'; if ($('#cable small').textContent !== cl) $('#cable small').textContent = cl;
    gondola.position.copy(CABLE.getPointAt(0.5 + 0.5 * Math.sin(T * 0.08)));   // 빈 케이블카는 천천히 오가요
  }
  me.g.position.copy(me.pos);
  me.g.rotation.y = lerp(me.g.rotation.y, me.face, 0.2);
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
    if (on) { const tx = (a.heart > 0 ? '♥ ' : '') + a.name; if (a.tag.textContent !== tx) a.tag.textContent = tx; V.copy(a.pos); V.y += a.tagH; V.project(camera); const tx2 = (V.x * 0.5 + 0.5) * innerWidth, ty2 = (-V.y * 0.5 + 0.5) * innerHeight; a.tag.style.transform = `translate(${tx2}px, ${ty2}px) translate(-50%, -100%)`; if (V.z > 1 || behindMe(tx2, ty2, camera.position.distanceTo(a.pos))) a.tag.classList.remove('on'); }
  }
  for (const d of dolphins) { const k = ((T * 0.35 + d.phase) % 3) / 3, j = Math.sin(k * Math.PI); d.g.position.set(d.cx + k * 26, k < 1 ? j * 4 - 1.2 : -3, d.cz); d.g.rotation.x = -Math.cos(k * Math.PI) * 0.9; d.g.rotation.order = 'YXZ'; d.g.rotation.y = Math.PI / 2; d.st.update(T); }

  // 풀밭: 12 m 넘게 벗어나면 내 둘레로 다시 깔기
  if (!me.riding && Math.hypot(me.pos.x - grassAt.x, me.pos.z - grassAt.z) > 12) layGrass(me.pos.x, me.pos.z);
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
  setZone(z0); if (z0 !== updMoves.z) { updMoves.z = z0; updMoves(z0); }
  const fogNear = z0 === 'jungle' ? 30 : z0 === 'arctic' ? 60 : 120, fogFar = z0 === 'jungle' ? 260 : z0 === 'arctic' ? 420 : 720;
  updWeather(T, dt, z0);
  scene.fog.near = lerp(scene.fog.near, fogNear * wx.fogK, 0.02); scene.fog.far = lerp(scene.fog.far, fogFar * wx.fogK, 0.02);
  FIRES.forEach((f, i) => { const k = 0.85 + Math.sin(T * 11 + i) * 0.08 + Math.sin(T * 23 + i * 2) * 0.06; f.flames.forEach((m, j) => { m.scale.set(1, k + j * 0.05, 1); m.rotation.y = T * (1 + j); }); f.light.intensity = (4 + tod.night * 10) * k; });
  SPOTS.forEach((sp, i) => { sp.ring.material.opacity = 0.35 + Math.sin(T * 2 + i) * 0.15; sp.g.visible = Math.hypot(sp.pos.x - me.pos.x, sp.pos.z - me.pos.z) < 160; });
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
  net.send({ n: myName, x: +me.pos.x.toFixed(2), z: +me.pos.z.toFixed(2), y: +me.pos.y.toFixed(2), r: +me.g.rotation.y.toFixed(2), m: moving ? 1 : 0, k: me.riding ? 1 : 0, l: MY.look, g: MY.g === 'm' ? 1 : 0, h: MY.hat, b: MY.body, c: Math.max(0, CAMERAS.findIndex((c) => c.id === MY.cam)), p: shots, w: waves, s: sitting ? 1 : 0, e: emoI, ec: emoN }, performance.now());
  // 소리: 구역 · 물가(강 · 바다) 가까움
  if ((frame.st = (frame.st || 0) + dt) > 0.5) { frame.st = 0; const rv = riverNear(me.pos.x, me.pos.z), w = Math.max(rv.i >= 0 ? 1 - rv.d / 30 : 0, me.pos.y < 6 ? 1 - me.pos.y / 6 : 0); snd.setPlace(z0 === 'village' ? 'village' : z0, Math.max(0, w)); }
  if (mode === 'photo') updatePhoto(dt);
  snd.night = tod.night; if ($('#tod').textContent !== tod.label) $('#tod').textContent = tod.label;
  updMark(dt);
  const finder = mode === 'photo' && raiseT <= 0;
  if (finder && !withFriends) for (const f of friends.values()) f.st.root.visible = false;   // 사진엔 동물만 (👥 친구도 켜면 같이)
  renderer.render(scene, finder ? fcam : camera);
  if (wantShot && raiseT <= 0) { wantShot = false; shoot(); }   // 사진기를 드는 중에 누르면 다 든 뒤에 찍어요   // 그린 바로 다음에 찍어야 화면이 비지 않아요
  if (!perf.done) { perf.t += dt; perf.n++; if (perf.t > 8) { perf.done = true; const fps = perf.n / perf.t; if (fps < 25 && !LOWQ) { renderer.setPixelRatio(Math.max(0.75, renderer.getPixelRatio() * 0.6)); AUTO_LOW = true; toastMsg('📱 화면을 조금 가볍게 했어요', '⚙ 설정에서 바꿀 수 있어요'); } else if (fps < 20) { renderer.setPixelRatio(0.75); AUTO_LOW = true; } } }
  requestAnimationFrame(frame);
}
drawMini();
requestAnimationFrame(frame);
$('#loading').classList.add('out');
setTimeout(() => $('#loading').remove(), 900);
window.__world = { wx, SPOTS, SEATS, sitDown, me, animals, height, zoneAt, camera, controls, VIL, TOPS, STA, net, friends, dex, SET, snd, enterPhoto, evaluate };   // 화면 점검용
