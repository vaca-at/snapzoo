// 스냅주 · 높은 산과 강 (지도 시안 E, 2026-11-05)
// 640 m 섬 하나: 가운데 큰 산 꼭대기 = 북극 눈밭, 산허리 = 정글, 아래 들 = 초원, 산 동쪽 비 그늘 = 사막, 남서쪽 강 하구 = 바다.
// 강이 산꼭대기 아래에서 굽이쳐 바다로. 강가 마을에서 시작 → 누른 곳 · 방향키로 걷기, 🚡 케이블카로 산꼭대기까지.
// 그림 느낌: ③ 극장판 부드러운 3D (2026-11-05 결정) — 매끈한 면 · 노을빛 역광 · 부드러운 그림자 · 안개.
// 동물 · 산책자 · 재질은 zoo3d.js (시안 docs/시안/메타버스3D시안.html 과 같은 코드). 무거운 판이라 휴대폰에서는 그림자 · 풀 · 해상도를 줄여요.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { plain, SPECIES as ZOO, walker as makeWalker, skyDome, cloudTex, LOOK, acaciaGeos, NOISE } from './zoo3d.js';
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
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
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
{ const sk = skyDome(LK.top, LK.mid, LK.hor, SUN_DIR, LK.glow); sk.scale.setScalar(1.3); scene.add(sk); }
scene.add(new THREE.HemisphereLight(LK.hemi[0], LK.hemi[1], LK.hemi[2] * 1.4));   // 역광이어도 동물 얼굴이 보이게
const sun = new THREE.DirectionalLight(LK.sunC, LK.sunI);
sun.castShadow = true;
sun.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 400 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
// 높은 구름 (노을빛 솜구름)
for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + rnd() * 0.4, d = 900 + rnd() * 400; const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex(['#fff1dc', '#c89a8a', '#ffe0c4'], i * 7 + 1, 8), fog: false, depthWrite: false, transparent: true, opacity: 0.85 })); c.position.set(Math.sin(a) * d, 230 + rnd() * 160, Math.cos(a) * d); c.scale.set(380, 190, 1); scene.add(c); }

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
    im.castShadow = true; im.receiveShadow = true; scene.add(im);
  }
  return spots;
}
const trunkM = new THREE.MeshStandardMaterial({ color: '#6a5038', roughness: 0.85 }), leafJ = new THREE.MeshStandardMaterial({ color: '#4a7a30', roughness: 0.8 }), leafJ2 = new THREE.MeshStandardMaterial({ color: '#5f8c38', roughness: 0.8 }), pineM = new THREE.MeshStandardMaterial({ color: '#3f6438', roughness: 0.8 }), snowCap = toon('#f6f4f2'), acaciaM = toon('#6f8a36'), bushM = toon('#8a9a48'), cactusM = toon('#4f8a4a'), rockM = toon('#9a8f80'), mesaM = toon('#c98a5a'), iceM = toon('#d8ecf6');
const cyl = (r1, r2, h, s = 16) => new THREE.CylinderGeometry(r1, r2, h, s);
const blob = (r, d = 3) => new THREE.IcosahedronGeometry(r, d);
// 정글: 키 큰 나무 (줄기 + 둥근 잎 두 덩이)
scatter('jungle', MOBILE ? 900 : 1700, [[cyl(0.35, 0.55, 8, 10), trunkM, 4], [blob(3.2), leafJ, 8.6, 1, 0.82, 1], [blob(2.4), leafJ2, 10.6, 1, 0.85, 1]], 0.8, 1.5);
// 눈 경계 아래 소나무 (산허리 위쪽)
scatter('jungle', 420, [[cyl(0.25, 0.35, 3, 10), trunkM, 1.5], [new THREE.ConeGeometry(2.2, 6, 18), pineM, 5.5], [new THREE.ConeGeometry(1.1, 2.2, 18), snowCap, 8]], 0.8, 1.2, (x, z, y) => y > 70);
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
function house(w, d, wallH, roofC, wallC) {
  const h = new THREE.Group(), wall = toon(wallC), trim = toon('#7a5a40'), glass = new THREE.MeshStandardMaterial({ color: '#7fa6c0', roughness: 0.15, metalness: 0.2 });
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
  const fire = new THREE.PointLight('#ffb070', 4, 26); fire.position.set(0, 3, 0); g.add(fire);
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
const ME3 = makeWalker();
const me = { g: ME3.root, st: ME3, pos: VIL.clone().add(V.set(0, 0, 8)), target: null, face: 0, riding: null, t: 0 };
me.pos.y = height(me.pos.x, me.pos.z);
scene.add(me.g);

// ───────── 동물 (구역마다) ─────────
// 새로 빚은 동물(zoo3d.js)을 이 세계의 동물 모양 { g, legs, neck } 으로 감싸요. 다리 · 고개 · 꼬리는 st.update 가 움직여요
const z3 = (kind, s = 1) => () => { const st = ZOO[kind](); st.root.scale.setScalar(s); return { g: st.root, st, legs: [], neck: null }; };
const SPEED = { '아기 코끼리': 1.0, '아기 기린': 1.3, '얼룩말': 1.5, '톰슨가젤': 1.7, '누': 1.4, '펭귄': 0.5, '사막여우': 1.6, '고릴라': 0.9, '맥': 1.1, '낙타': 1.3, '북극곰': 1.0 };
const SPECIES = [
  ['savanna', '아기 코끼리', 4, z3('elephant', 1.15)],
  ['savanna', '아기 기린', 4, z3('giraffe', 1.25)],
  ['savanna', '얼룩말', 5, z3('zebra')],
  ['savanna', '톰슨가젤', 6, z3('gazelle')],
  ['savanna', '누', 5, z3('gnu')],
  ['jungle', '고릴라', 3, z3('gorilla')],
  ['jungle', '맥', 3, z3('tapir')],
  ['desert', '낙타', 4, z3('camel')],
  ['desert', '사막여우', 4, z3('fennec', 1.3)],
  ['arctic', '펭귄', 8, z3('penguin', 1.2)],
  ['arctic', '북극곰', 2, z3('polarbear')],
];
const animals = [];
for (const [zone, name, n, mk] of SPECIES) {
  const home = findSpot(zone, (x, z, y) => (zone === 'arctic' ? y > 108 : true), 2000);
  if (!home) continue;
  for (let k = 0; k < n; k++) {
    const a = mk(), p = home.clone().add(V.set((rnd() - 0.5) * 30, 0, (rnd() - 0.5) * 30));
    p.y = height(p.x, p.z); a.g.position.copy(p); scene.add(a.g);
    const tag = document.createElement('div'); tag.className = 'tag'; tag.textContent = name; document.body.append(tag);
    const tagH = new THREE.Box3().setFromObject(a.g).getSize(V).y + 0.35;
    animals.push({ ...a, name, zone, home, pos: p, target: null, wait: rnd() * 4, face: rnd() * 6, t: rnd() * 9, tag, tagH, speed: SPEED[name] || 1.4 });
  }
}
// 돌고래: 강 하구 앞바다에서 뛰어올라요
const dolphins = [];
for (let k = 0; k < 4; k++) {
  const st = ZOO.dolphin(), g = st.root; g.scale.setScalar(1.15);
  scene.add(g); dolphins.push({ g, st, phase: k * 1.6, cx: -205 + k * 9, cz: 300 + (k % 2) * 12 });
}


// ───────── 내 둘레 풀밭: 바람에 물결치는 풀잎 (초원 · 마을). 땅에 붙은 격자 자리라 다시 깔아도 같은 자리에 나요 ─────────
const GR = MOBILE ? 22 : 34, GSTEP = MOBILE ? 0.34 : 0.27, GMAX = Math.ceil((Math.PI * GR * GR) / (GSTEP * GSTEP));
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
    M4.compose(V.set(x, y - 0.03, z), GQ, GS.set(s, s * (0.55 + h2 * 0.7), s)); grass.setMatrixAt(k, M4);
    GC.copy(GCOL[zn]).multiplyScalar(0.9 + fbm(x * 0.08, z * 0.08) * 0.25); grass.setColorAt(k, GC); k++;
  }
  grass.count = k; grass.instanceMatrix.needsUpdate = true; if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
}

// 확인 · 공유용: 주소에 ?at=savanna (또는 jungle · desert · arctic) 를 붙이면 그 구역 동물 곁에서 바로 시작
{ const at = new URLSearchParams(location.search).get('at'); const a = at && at !== 'village' && animals.find((x) => x.zone === at);
  if (a) { me.pos.copy(a.home).add(V.set(6, 0, 9)); me.pos.y = height(me.pos.x, me.pos.z); me.face = Math.PI + 0.4; } }

// ───────── 카메라 · 조작 ─────────
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 2.5; controls.maxDistance = 320; controls.maxPolarAngle = Math.PI * 0.47;
controls.target.copy(me.pos).add(V.set(0, 1.1, 0));
// 처음엔 섬 전체를 보다가 마을로 내려와요 (덮개 화면 없이)
camera.position.set(260, 260, 380);
let intro = { t: 0, from: camera.position.clone(), to: VIL.clone().add(new THREE.Vector3(5, 3.8, 1.5)) };   // 마을 광장 안쪽에서 나를 바라보게 (집에 가리지 않게)
if (new URLSearchParams(location.search).get('at')) { if (new URLSearchParams(location.search).get('at') !== 'village') intro.to = me.pos.clone().add(V.set(5, 4, 10)); camera.position.copy(intro.to); controls.target.copy(me.pos).add(V.set(0, 1.1, 0)); intro = null; }

const keys = new Set();
addEventListener('keydown', (e) => { const k = e.key.toLowerCase(); if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(k)) { keys.add(k); me.target = null; e.preventDefault(); hideHint(); } });
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
// 누르기와 끌기를 구분: 6px 안에서 떼면 '누르기' → 그곳으로 걸어가요
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || me.riding) return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObject(ground)[0];
  if (hit) { me.target = hit.point.clone(); hideHint(); }
});
let hintT = setTimeout(hideHint, 10000);
function hideHint() { clearTimeout(hintT); $('#hint').style.opacity = 0; }

// 🚡 케이블카: 지금 있는 쪽에서 반대쪽으로 (약 14초)
$('#cable').onclick = () => {
  if (me.riding) return;
  const atTop = me.pos.distanceTo(TOPS) < me.pos.distanceTo(STA);
  me.riding = { t: 0, dur: 14, dir: atTop ? -1 : 1 };
  me.target = null; $('#cable').disabled = true;
  $('#cable').textContent = atTop ? '🚡 내려가는 중…' : '🚡 올라가는 중…';
};
$('#home').onclick = () => { if (me.riding) return; me.pos.copy(VIL).add(V.set(0, 0, 8)); me.pos.y = height(me.pos.x, me.pos.z); me.target = null; controls.target.copy(me.pos).add(V.set(0, 1.1, 0)); };

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
for (const m of [leafJ, leafJ2, pineM, trunkM]) m.transparent = true;

// ───────── 매 프레임 ─────────
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), mv = new THREE.Vector3();
let miniT = 0;
function frame() {
  const dt = Math.min(0.05, clock.getDelta()), T = clock.elapsedTime;
  // 걷기
  mv.set(0, 0, 0);
  if (!me.riding) {
    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); right.crossVectors(fwd, UP);
    if (keys.has('arrowup') || keys.has('w')) mv.add(fwd);
    if (keys.has('arrowdown') || keys.has('s')) mv.sub(fwd);
    if (keys.has('arrowleft') || keys.has('a')) mv.sub(right);
    if (keys.has('arrowright') || keys.has('d')) mv.add(right);
    if (me.target) { mv.set(me.target.x - me.pos.x, 0, me.target.z - me.pos.z); if (mv.length() < 0.6) { me.target = null; mv.set(0, 0, 0); } }
  }
  const moving = mv.lengthSq() > 0;
  if (moving) {
    mv.normalize();
    const y0 = height(me.pos.x, me.pos.z), inWater = y0 < 0.6 || riverNear(me.pos.x, me.pos.z).d < 3;
    const sp = (inWater ? 1.6 : 3.6) * dt;
    const nx = me.pos.x + mv.x * sp, nz = me.pos.z + mv.z * sp, ny = height(nx, nz);
    if (ny > -2.2 && Math.abs(nx) < SIZE / 2 - 4 && Math.abs(nz) < SIZE / 2 - 4) { me.pos.x = nx; me.pos.z = nz; } else me.target = null;   // 깊은 바다는 못 들어가요
    me.face = Math.atan2(mv.x, mv.z);
  }
  if (me.riding) {
    const r = me.riding; r.t += dt; const k = clamp(r.t / r.dur, 0, 1), e = k * k * (3 - 2 * k), u = r.dir > 0 ? e : 1 - e;
    const p = CABLE.getPointAt(u); gondola.position.copy(p); me.pos.set(p.x, p.y - 3.3, p.z);
    if (k >= 1) { const end = r.dir > 0 ? TOPS : STA; me.pos.copy(end).add(V.set(3, 0, 3)); me.pos.y = height(me.pos.x, me.pos.z); me.riding = null; $('#cable').disabled = false; }
  } else {
    me.pos.y = lerp(me.pos.y, Math.max(height(me.pos.x, me.pos.z), -0.6), 0.5);
    const atTop = me.pos.distanceTo(TOPS) < me.pos.distanceTo(STA);
    $('#cable').textContent = atTop ? '🚡 마을로 내려가기' : '🚡 산꼭대기로';
    gondola.position.copy(CABLE.getPointAt(0.5 + 0.5 * Math.sin(T * 0.08)));   // 빈 케이블카는 천천히 오가요
  }
  me.g.position.copy(me.pos);
  me.g.rotation.y = lerp(me.g.rotation.y, me.face, 0.2);
  me.st.walk = lerp(me.st.walk, moving ? 1 : 0, 0.2); me.st.update(T, dt);

  // 동물: 집 둘레를 천천히 거닐다 멈춰 쉬어요. 가까이 가면 나를 바라보고 이름표
  for (const a of animals) {
    const dMe = Math.hypot(a.pos.x - me.pos.x, a.pos.z - me.pos.z);
    a.g.visible = dMe < 170;
    let walking = false;
    if (dMe < 9) a.face = Math.atan2(me.pos.x - a.pos.x, me.pos.z - a.pos.z);
    else if (a.wait > 0) a.wait -= dt;
    else {
      if (!a.target) { a.target = a.home.clone().add(V.set((rnd() - 0.5) * 40, 0, (rnd() - 0.5) * 40)); }
      const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.5) { a.target = null; a.wait = 3 + rnd() * 6; }
      else { const nx = a.pos.x + (dx / d) * a.speed * dt, nz = a.pos.z + (dz / d) * a.speed * dt, ny = height(nx, nz);
        const rv = riverNear(nx, nz);   // 강물에는 안 들어가요
        if (ny > 1.5 && zoneAt(nx, nz, ny) === a.zone && !(rv.i >= 0 && rv.d < riverW(rv.i) * 0.9)) { a.pos.x = nx; a.pos.z = nz; a.face = Math.atan2(dx, dz); walking = true; } else { a.target = null; a.wait = 1; } }
    }
    a.pos.y = height(a.pos.x, a.pos.z);
    a.g.position.copy(a.pos); a.g.rotation.y = lerp(a.g.rotation.y, a.face, 0.08);
    a.t += dt * (walking ? 7 : 0);
    if (a.st) { a.st.walk = lerp(a.st.walk, walking ? 1 : 0, 0.1); if (a.g.visible) a.st.update(T, dt); }
    a.legs.forEach((l, i) => { l.rotation.x = walking ? Math.sin(a.t + (i % 3 ? Math.PI : 0)) * 0.45 : 0; });
    if (a.neck && !walking && dMe >= 9) a.neck.rotation.z = Math.sin(T * 0.7 + a.home.x) * 0.06;
    // 이름표
    const on = dMe < 14;
    a.tag.classList.toggle('on', on);
    if (on) { V.copy(a.pos); V.y += a.tagH; V.project(camera); a.tag.style.transform = `translate(${(V.x * 0.5 + 0.5) * innerWidth}px, ${(-V.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`; if (V.z > 1) a.tag.classList.remove('on'); }
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
    intro.t += dt / 3.2; const e = 1 - Math.pow(1 - clamp(intro.t, 0, 1), 3);
    camera.position.lerpVectors(intro.from, intro.to, e); controls.target.lerp(V.copy(me.pos).add(V.set(0, 1.1, 0)), 0.2);
    if (intro.t >= 1) intro = null;
  } else {
    const want = V.copy(me.pos); want.y += 1.1;
    const delta = want.sub(controls.target).multiplyScalar(0.15);
    controls.target.add(delta); camera.position.add(delta);
  }
  controls.update();
  // 해 · 그림자: 나를 따라와요
  sun.position.copy(me.pos).addScaledVector(SUN_DIR, 160); sun.target.position.copy(me.pos);

  // 구역 · 안개 · 눈
  const z0 = me.pos.distanceTo(VIL) < 26 ? 'village' : zoneAt(me.pos.x, me.pos.z);
  setZone(z0);
  const fogNear = z0 === 'jungle' ? 30 : z0 === 'arctic' ? 60 : 120, fogFar = z0 === 'jungle' ? 260 : z0 === 'arctic' ? 420 : 720;
  scene.fog.near = lerp(scene.fog.near, fogNear, 0.02); scene.fog.far = lerp(scene.fog.far, fogFar, 0.02);
  const leafA = z0 === 'jungle' ? 0.38 : 1;
  for (const m of [leafJ, leafJ2, pineM, trunkM]) { m.opacity = lerp(m.opacity, leafA, 0.08); m.depthWrite = m.opacity > 0.95; }
  snow.material.opacity = z0 === 'arctic' ? lerp(snow.material.opacity, 0.9, 0.05) : 0;
  snow.visible = snow.material.opacity > 0.02;
  if (snow.visible) {
    snow.position.set(me.pos.x, me.pos.y, me.pos.z);
    for (let i = 0; i < SN; i++) { snowP[i * 3 + 1] -= dt * 3; snowP[i * 3] += Math.sin(T + i) * dt * 0.4; if (snowP[i * 3 + 1] < 0) snowP[i * 3 + 1] = 30; }
    snowG.attributes.position.needsUpdate = true;
  }
  if ((miniT += dt) > 0.2) { miniT = 0; drawMini(); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
drawMini();
requestAnimationFrame(frame);
$('#loading').classList.add('out');
setTimeout(() => $('#loading').remove(), 900);
window.__world = { me, animals, height, zoneAt, camera, controls, VIL, TOPS, STA };   // 화면 점검용
