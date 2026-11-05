// 스냅주 · 높은 산과 강 (지도 시안 E, 2026-11-05)
// 640 m 섬 하나: 가운데 큰 산 꼭대기 = 북극 눈밭, 산허리 = 정글, 아래 들 = 초원, 산 동쪽 비 그늘 = 사막, 남서쪽 강 하구 = 바다.
// 강이 산꼭대기 아래에서 굽이쳐 바다로. 강가 마을에서 시작 → 누른 곳 · 방향키로 걷기, 🚡 케이블카로 산꼭대기까지.
// 그림 느낌: 툰(두세 단계 그늘) 재질 + 안개 + 그림자. 무거운 판이라 휴대폰에서는 그림자 · 해상도를 줄여요.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const FOG = new THREE.Color('#cfe3ea');
scene.fog = new THREE.Fog(FOG, 120, 720);
const camera = new THREE.PerspectiveCamera(50, 1, 0.3, 2400);

// 하늘: 위는 파랗게, 지평선은 안개색
const sky = new THREE.Mesh(new THREE.SphereGeometry(1600, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color('#6fa8de') }, mid: { value: new THREE.Color('#bfdcef') }, bot: { value: FOG } },
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.5, h)) : bot; c = mix(bot, c, smoothstep(-0.02, 0.08, h)); gl_FragColor = vec4(c, 1.0); }',
}));
scene.add(sky);
scene.add(new THREE.HemisphereLight('#f4f8ff', '#7c8a5a', 1.25));
const sun = new THREE.DirectionalLight('#fff1d8', 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 400 });
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);

// 툰 그늘 (세 단계) — 그림체 '나'의 또렷한 그늘을 3D 로
const grad = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: grad, ...extra });

// ───────── 땅 ─────────
const SIZE = 680, SEG = MOBILE ? 220 : 320;
const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
tg.rotateX(-Math.PI / 2);
const pos = tg.attributes.position, col = new Float32Array(pos.count * 3);
const C = {
  snow: new THREE.Color('#f3f7fb'), rock: new THREE.Color('#8f949a'), jungle: new THREE.Color('#3f7a3a'), jungle2: new THREE.Color('#2f6a34'),
  savanna: new THREE.Color('#cdb763'), savanna2: new THREE.Color('#a9b65e'), desert: new THREE.Color('#e2b679'), desert2: new THREE.Color('#d39c62'),
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
const ground = new THREE.Mesh(tg, toon('#ffffff', { vertexColors: true }));
ground.receiveShadow = true;
scene.add(ground);

// ───────── 바다 (출렁) ─────────
const wg = new THREE.PlaneGeometry(2400, 2400, 90, 90); wg.rotateX(-Math.PI / 2);
const sea = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: '#3d8fc0', roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.88 }));
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
const trunkM = toon('#6a4c34'), leafJ = toon('#2f6f35'), leafJ2 = toon('#3f8a3e'), pineM = toon('#2d5a3c'), snowCap = toon('#f3f7fb'), acaciaM = toon('#7aa04e'), bushM = toon('#8aa85a'), cactusM = toon('#4f8a4a'), rockM = toon('#9a8f80'), mesaM = toon('#c98a5a'), iceM = toon('#d8ecf6');
const cyl = (r1, r2, h, s = 7) => new THREE.CylinderGeometry(r1, r2, h, s);
// 정글: 키 큰 나무 (줄기 + 둥근 잎 두 덩이)
scatter('jungle', MOBILE ? 900 : 1700, [[cyl(0.35, 0.55, 8), trunkM, 4], [new THREE.IcosahedronGeometry(3.2, 0), leafJ, 8.6], [new THREE.IcosahedronGeometry(2.4, 0), leafJ2, 10.6]], 0.8, 1.5);
// 눈 경계 아래 소나무 (산허리 위쪽)
scatter('jungle', 420, [[cyl(0.25, 0.35, 3), trunkM, 1.5], [new THREE.ConeGeometry(2.2, 6, 7), pineM, 5.5], [new THREE.ConeGeometry(1.1, 2.2, 7), snowCap, 8]], 0.8, 1.2, (x, z, y) => y > 70);
// 초원: 아카시아 (납작한 우산 잎) · 덤불
scatter('savanna', 240, [[cyl(0.3, 0.45, 6), trunkM, 3], [cyl(5.5, 4.2, 1.4, 9), acaciaM, 6.6]], 0.8, 1.3);
scatter('savanna', 420, [[new THREE.IcosahedronGeometry(1.3, 0), bushM, 0.6, 1, 0.7, 1]], 0.7, 1.5);
// 사막: 선인장 · 붉은 바위 언덕(메사)
scatter('desert', 220, [[cyl(0.45, 0.5, 4.5), cactusM, 2.25], [cyl(0.3, 0.3, 1.8), cactusM, 2.6, 1, 1, 1]], 0.8, 1.4);
scatter('desert', 22, [[new THREE.CylinderGeometry(5.5, 7.5, 9, 7), mesaM, 4]], 0.7, 1.2);
scatter('desert', 90, [[new THREE.DodecahedronGeometry(1.6, 0), rockM, 0.6, 1, 0.6, 1]], 0.6, 1.8);
// 북극: 얼음 바위
scatter('arctic', 90, [[new THREE.OctahedronGeometry(2, 0), iceM, 1, 1, 1.4, 1]], 0.6, 1.6);

// ───────── 강가 마을 (모이는 곳) ─────────
{
  const g = new THREE.Group(); g.position.copy(VIL); scene.add(g);
  const wall = toon('#f2e6cf'), roofs = ['#c8553d', '#4f7aa8', '#d9a33a', '#6b8f4a', '#a8604a', '#5a6a8a'];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2, r = 15, hx = Math.cos(a) * r, hz = Math.sin(a) * r, hy = height(VIL.x + hx, VIL.z + hz) - VIL.y;
    const house = new THREE.Group(); house.position.set(hx, hy, hz); house.rotation.y = -a + Math.PI / 2; g.add(house);
    const body = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 5), wall); body.position.y = 2; house.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 3, 4), toon(roofs[k])); roof.position.y = 5.5; roof.rotation.y = Math.PI / 4; house.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.1), toon('#6a4c34')); door.position.set(0, 1, 2.55); house.add(door);
    house.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  const well = new THREE.Mesh(cyl(1.6, 1.6, 1.2, 12), toon('#9a8f80')); well.position.y = 0.6; well.castShadow = true; g.add(well);
  const fire = new THREE.PointLight('#ffb070', 4, 26); fire.position.set(0, 3, 0); g.add(fire);
}

// ───────── 케이블카: 마을 옆 정류장 ↔ 산꼭대기 ─────────
const CABLE = new THREE.QuadraticBezierCurve3(STA.clone().add(V.set(0, 12, 0)), new THREE.Vector3((STA.x + TOPS.x) / 2, Math.max(STA.y, TOPS.y) + 30, (STA.z + TOPS.z) / 2), TOPS.clone().add(V.set(0, 12, 0)));
{
  const line = new THREE.Mesh(new THREE.TubeGeometry(CABLE, 120, 0.12, 5), toon('#3a3a40')); scene.add(line);
  for (const p of [STA, TOPS]) { const tw = new THREE.Mesh(new THREE.BoxGeometry(2, 12, 2), toon('#6d6f78')); tw.position.set(p.x, p.y + 6, p.z); tw.castShadow = true; scene.add(tw); }
}
const gondola = new THREE.Group(); scene.add(gondola);
{ const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.6), toon('#d8483a')); b.position.y = -2.2; b.castShadow = true; gondola.add(b);
  const w = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.9, 2.7), toon('#cfe8f6')); w.position.y = -1.9; gondola.add(w);
  const arm = new THREE.Mesh(cyl(0.08, 0.08, 1.4, 5), toon('#3a3a40')); arm.position.y = -0.7; gondola.add(arm); }

// ───────── 산책자 (나) ─────────
function makeWalker() {
  const g = new THREE.Group();
  const skin = toon('#f2d2b6'), dress = toon('#6f7d4c'), shirt = toon('#f7f3ea'), hat = toon('#ecd296'), band = toon('#c84a3e'), hair = toon('#3b2a22'), bag = toon('#a0683e');
  const legs = [-0.16, 0.16].map((x) => { const l = new THREE.Group(); l.position.set(x, 0.85, 0); const m = new THREE.Mesh(cyl(0.07, 0.07, 0.85, 6), skin); m.position.y = -0.42; l.add(m); const s = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.3), toon('#6a4430')); s.position.set(0, -0.86, 0.05); l.add(s); g.add(l); return l; });
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.75, 10), dress); skirt.position.y = 1.15; g.add(skirt);
  const body = new THREE.Mesh(cyl(0.2, 0.24, 0.55, 8), shirt); body.position.y = 1.62; g.add(body);
  const arms = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(0.28 * s, 1.85, 0); const m = new THREE.Mesh(cyl(0.06, 0.06, 0.6, 6), skin); m.position.y = -0.3; a.add(m); g.add(a); return a; });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), skin); head.position.y = 2.15; g.add(head);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair); hr.position.set(0, 2.17, -0.03); hr.scale.set(1, 1.15, 1.05); g.add(hr);
  const brim = new THREE.Mesh(cyl(0.55, 0.55, 0.04, 16), hat); brim.position.y = 2.36; g.add(brim);
  const crown = new THREE.Mesh(cyl(0.24, 0.27, 0.22, 14), hat); crown.position.y = 2.48; g.add(crown);
  const rib = new THREE.Mesh(cyl(0.275, 0.275, 0.06, 14), band); rib.position.y = 2.41; g.add(rib);
  const sack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.12), bag); sack.position.set(0.32, 1.25, 0.1); g.add(sack);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), toon('#2a1d18')); e.position.set(0.09 * s, 2.17, 0.24); g.add(e); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { g, legs, arms };
}
const me = { ...makeWalker(), pos: VIL.clone().add(V.set(0, 0, 8)), target: null, face: 0, riding: null, t: 0 };
me.pos.y = height(me.pos.x, me.pos.z);
scene.add(me.g);

// ───────── 동물 (구역마다) ─────────
function quad(o) {
  const g = new THREE.Group(), m = toon(o.c), leg = toon(o.lc || o.c);
  const [bw, bh, bl] = o.body, lh = o.legH;
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), m); body.scale.set(bw / 2, bh / 2, bl / 2); body.position.y = lh + bh / 2; g.add(body);
  if (o.belly) { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), toon(o.belly)); b.scale.set(bw / 2.15, bh / 2.6, bl / 2.2); b.position.y = lh + bh * 0.38; g.add(b); }
  const legs = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const l = new THREE.Group(); l.position.set(sx * bw * 0.3, lh + 0.1, sz * bl * 0.32); const lm = new THREE.Mesh(cyl(o.legR, o.legR * 0.8, lh + 0.1, 6), leg); lm.position.y = -(lh + 0.1) / 2; l.add(lm); g.add(l); legs.push(l); }
  const neck = new THREE.Group(); neck.position.set(0, lh + bh * 0.75, bl * 0.42); neck.rotation.x = o.neckA ?? -0.5; g.add(neck);
  const nm = new THREE.Mesh(cyl(o.neckR ?? bw * 0.18, o.neckR ?? bw * 0.22, o.neckL, 7), m); nm.position.y = o.neckL / 2; neck.add(nm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(...o.head), m); head.position.set(0, o.neckL, o.head[2] * 0.25); head.rotation.x = -(o.neckA ?? -0.5) + 0.25; neck.add(head);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(o.head[0] * 0.09, 6, 4), toon('#1e1814')); e.position.set(o.head[0] * 0.48 * s, o.neckL + o.head[1] * 0.15, o.head[2] * 0.5); neck.add(e); }
  if (o.trunk) { const t = new THREE.Mesh(cyl(0.18, 0.28, o.trunk, 6), m); t.position.set(0, o.neckL - o.trunk / 2, o.head[2] * 0.7); t.rotation.x = 0.2; neck.add(t); }
  if (o.hump) { const h = new THREE.Mesh(new THREE.SphereGeometry(o.hump, 10, 6), m); h.position.set(0, lh + bh * 0.95, 0); g.add(h); }
  if (o.ears) for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(o.ears[0], o.ears[1], 0.12), m); e.position.set((o.head[0] / 2 + o.ears[0] / 2) * s, o.neckL + 0.1, 0); neck.add(e); }
  if (o.stripes) for (let k = -2; k <= 2; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(bw * 1.02, bh * 0.85, 0.14), toon('#2a2628')); st.position.set(0, lh + bh / 2, k * bl * 0.15); g.add(st); }
  if (o.spots) for (let k = 0; k < 12; k++) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), toon(o.spots)); const a = rnd() * Math.PI * 2; sp.position.set(Math.cos(a) * bw * 0.48, lh + bh * (0.35 + rnd() * 0.4), (rnd() - 0.5) * bl * 0.8); sp.scale.set(1, 1, 0.4); sp.lookAt(0, lh + bh / 2, sp.position.z); g.add(sp); }
  g.traverse((x) => { if (x.isMesh) x.castShadow = true; });
  g.scale.setScalar(o.s || 1);
  return { g, legs, neck };
}
function penguin() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), toon('#26262c')); b.scale.set(1, 1.5, 0.9); b.position.y = 0.6; g.add(b);
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), toon('#f4f4f2')); f.scale.set(0.9, 1.35, 0.6); f.position.set(0, 0.55, 0.14); g.add(f);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), toon('#f0a030')); beak.rotation.x = Math.PI / 2; beak.position.set(0, 1.05, 0.38); g.add(beak);
  const legs = [-0.15, 0.15].map((x) => { const l = new THREE.Group(); l.position.set(x, 0.12, 0.05); const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.22), toon('#f0a030')); l.add(m); g.add(l); return l; });
  g.traverse((x) => { if (x.isMesh) x.castShadow = true; });
  return { g, legs, neck: null };
}
const SPECIES = [
  ['savanna', '아기 코끼리', 4, () => quad({ c: '#9e9890', body: [2.6, 2.2, 3.2], legH: 1.4, legR: 0.38, neckL: 0.6, neckA: 0.2, head: [1.6, 1.5, 1.3], trunk: 1.5, ears: [0.9, 1.2] })],
  ['savanna', '아기 기린', 4, () => quad({ c: '#e8b45c', body: [1.5, 1.4, 2.4], legH: 2.4, legR: 0.12, neckL: 3, neckA: -0.25, neckR: 0.2, head: [0.5, 0.5, 0.8], spots: '#a8642e' })],
  ['savanna', '얼룩말', 5, () => quad({ c: '#f2efe8', body: [1.3, 1.3, 2.2], legH: 1.2, legR: 0.11, neckL: 1, neckA: -0.6, head: [0.45, 0.5, 0.9], stripes: true, lc: '#ddd8d0' })],
  ['savanna', '톰슨가젤', 6, () => quad({ c: '#d0a068', body: [0.8, 0.8, 1.4], legH: 0.9, legR: 0.06, neckL: 0.7, neckA: -0.5, head: [0.3, 0.3, 0.55], belly: '#f6f0e4' })],
  ['jungle', '고릴라', 3, () => quad({ c: '#2e2a2c', body: [1.4, 1.5, 1.4], legH: 0.8, legR: 0.22, neckL: 0.3, neckA: 0.3, head: [0.7, 0.7, 0.6] })],
  ['jungle', '맥', 3, () => quad({ c: '#2a2a30', body: [1.1, 1.0, 1.9], legH: 0.7, legR: 0.13, neckL: 0.35, neckA: -0.3, head: [0.45, 0.45, 0.7], belly: '#e8e4dc' })],
  ['desert', '낙타', 4, () => quad({ c: '#c9a26a', body: [1.4, 1.3, 2.4], legH: 2, legR: 0.13, neckL: 1.6, neckA: -0.9, head: [0.45, 0.45, 0.85], hump: 0.7 })],
  ['desert', '사막여우', 4, () => quad({ c: '#e8c48a', body: [0.45, 0.4, 0.8], legH: 0.35, legR: 0.05, neckL: 0.2, neckA: -0.4, head: [0.3, 0.28, 0.35], ears: [0.22, 0.4] })],
  ['arctic', '펭귄', 7, penguin],
  ['arctic', '북극곰', 2, () => quad({ c: '#f2f0ea', body: [1.6, 1.4, 2.4], legH: 0.9, legR: 0.26, neckL: 0.5, neckA: -0.4, head: [0.7, 0.6, 0.8] })],
];
const animals = [];
for (const [zone, name, n, mk] of SPECIES) {
  const home = findSpot(zone, (x, z, y) => (zone === 'arctic' ? y > 108 : true), 2000);
  if (!home) continue;
  for (let k = 0; k < n; k++) {
    const a = mk(), p = home.clone().add(V.set((rnd() - 0.5) * 24, 0, (rnd() - 0.5) * 24));
    p.y = height(p.x, p.z); a.g.position.copy(p); scene.add(a.g);
    const tag = document.createElement('div'); tag.className = 'tag'; tag.textContent = name; document.body.append(tag);
    animals.push({ ...a, name, zone, home, pos: p, target: null, wait: rnd() * 4, face: rnd() * 6, t: rnd() * 9, tag, speed: name === '펭귄' ? 0.9 : name === '사막여우' ? 2.4 : 1.4 });
  }
}
// 돌고래: 강 하구 앞바다에서 뛰어올라요
const dolphins = [];
for (let k = 0; k < 4; k++) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), toon('#6f8fa8')); b.scale.set(0.8, 0.8, 2.6); g.add(b);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 4), toon('#5a7a94')); fin.position.set(0, 0.55, -0.1); g.add(fin);
  scene.add(g); dolphins.push({ g, phase: k * 1.6, cx: -205 + k * 9, cz: 300 + (k % 2) * 12 });
}

// ───────── 카메라 · 조작 ─────────
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 6; controls.maxDistance = 320; controls.maxPolarAngle = Math.PI * 0.47;
controls.target.copy(me.pos).add(V.set(0, 1.6, 0));
// 처음엔 섬 전체를 보다가 마을로 내려와요 (덮개 화면 없이)
camera.position.set(260, 260, 380);
let intro = { t: 0, from: camera.position.clone(), to: me.pos.clone().add(new THREE.Vector3(12, 13, 22)) };

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
$('#home').onclick = () => { if (me.riding) return; me.pos.copy(VIL).add(V.set(0, 0, 8)); me.pos.y = height(me.pos.x, me.pos.z); me.target = null; controls.target.copy(me.pos).add(V.set(0, 1.6, 0)); };

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
for (const m of [leafJ, leafJ2, pineM]) m.transparent = true;

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
    const sp = (inWater ? 3 : 7) * dt;
    const nx = me.pos.x + mv.x * sp, nz = me.pos.z + mv.z * sp, ny = height(nx, nz);
    if (ny > -2.2 && Math.abs(nx) < SIZE / 2 - 4 && Math.abs(nz) < SIZE / 2 - 4) { me.pos.x = nx; me.pos.z = nz; } else me.target = null;   // 깊은 바다는 못 들어가요
    me.face = Math.atan2(mv.x, mv.z);
  }
  if (me.riding) {
    const r = me.riding; r.t += dt; const k = clamp(r.t / r.dur, 0, 1), e = k * k * (3 - 2 * k), u = r.dir > 0 ? e : 1 - e;
    const p = CABLE.getPointAt(u); gondola.position.copy(p); me.pos.set(p.x, p.y - 4.2, p.z);
    if (k >= 1) { const end = r.dir > 0 ? TOPS : STA; me.pos.copy(end).add(V.set(3, 0, 3)); me.pos.y = height(me.pos.x, me.pos.z); me.riding = null; $('#cable').disabled = false; }
  } else {
    me.pos.y = lerp(me.pos.y, Math.max(height(me.pos.x, me.pos.z), -0.6), 0.5);
    const atTop = me.pos.distanceTo(TOPS) < me.pos.distanceTo(STA);
    $('#cable').textContent = atTop ? '🚡 마을로 내려가기' : '🚡 산꼭대기로';
    gondola.position.copy(CABLE.getPointAt(0.5 + 0.5 * Math.sin(T * 0.08)));   // 빈 케이블카는 천천히 오가요
  }
  me.g.position.copy(me.pos);
  me.g.rotation.y = lerp(me.g.rotation.y, me.face, 0.2);
  me.t += dt * (moving ? 9 : 0);
  const sw = moving ? Math.sin(me.t) * 0.6 : 0;
  me.legs[0].rotation.x = sw; me.legs[1].rotation.x = -sw; me.arms[0].rotation.x = -sw * 0.8; me.arms[1].rotation.x = sw * 0.8;
  me.g.children[2].position.y = 1.15 + (moving ? Math.abs(Math.sin(me.t)) * 0.04 : 0);

  // 동물: 집 둘레를 천천히 거닐다 멈춰 쉬어요. 가까이 가면 나를 바라보고 이름표
  for (const a of animals) {
    const dMe = Math.hypot(a.pos.x - me.pos.x, a.pos.z - me.pos.z);
    let walking = false;
    if (dMe < 9) a.face = Math.atan2(me.pos.x - a.pos.x, me.pos.z - a.pos.z);
    else if (a.wait > 0) a.wait -= dt;
    else {
      if (!a.target) { a.target = a.home.clone().add(V.set((rnd() - 0.5) * 40, 0, (rnd() - 0.5) * 40)); }
      const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.5) { a.target = null; a.wait = 3 + rnd() * 6; }
      else { const nx = a.pos.x + (dx / d) * a.speed * dt, nz = a.pos.z + (dz / d) * a.speed * dt, ny = height(nx, nz);
        if (ny > 1.5 && zoneAt(nx, nz, ny) === a.zone) { a.pos.x = nx; a.pos.z = nz; a.face = Math.atan2(dx, dz); walking = true; } else { a.target = null; a.wait = 1; } }
    }
    a.pos.y = height(a.pos.x, a.pos.z);
    a.g.position.copy(a.pos); a.g.rotation.y = lerp(a.g.rotation.y, a.face, 0.08);
    a.t += dt * (walking ? 7 : 0);
    a.legs.forEach((l, i) => { l.rotation.x = walking ? Math.sin(a.t + (i % 3 ? Math.PI : 0)) * 0.45 : 0; });
    if (a.neck && !walking && dMe >= 9) a.neck.rotation.z = Math.sin(T * 0.7 + a.home.x) * 0.06;
    // 이름표
    const on = dMe < 16;
    a.tag.classList.toggle('on', on);
    if (on) { V.copy(a.pos); V.y += 4.2 * (a.g.scale.x || 1); V.project(camera); a.tag.style.transform = `translate(${(V.x * 0.5 + 0.5) * innerWidth}px, ${(-V.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`; if (V.z > 1) a.tag.classList.remove('on'); }
  }
  for (const d of dolphins) { const k = ((T * 0.35 + d.phase) % 3) / 3, j = Math.sin(k * Math.PI); d.g.position.set(d.cx + k * 26, k < 1 ? j * 4 - 1.2 : -3, d.cz); d.g.rotation.x = -Math.cos(k * Math.PI) * 0.9; d.g.rotation.y = Math.PI / 2; }

  // 바다 출렁 · 강물 흐름
  const sp2 = wg.attributes.position;
  for (let i = 0; i < sp2.count; i++) { const x = seaBase[i * 3], z = seaBase[i * 3 + 2]; sp2.array[i * 3 + 1] = Math.sin(x * 0.04 + T * 0.9) * 0.35 + Math.cos(z * 0.05 + T * 0.7) * 0.3; }
  sp2.needsUpdate = true;
  flowT.offset.y -= dt * 0.25;

  // 카메라: 처음 내려오기 → 그다음은 나를 따라
  if (intro) {
    intro.t += dt / 3.2; const e = 1 - Math.pow(1 - clamp(intro.t, 0, 1), 3);
    camera.position.lerpVectors(intro.from, intro.to, e); controls.target.lerp(V.copy(me.pos).add(UP).add(UP), 0.2);
    if (intro.t >= 1) intro = null;
  } else {
    const want = V.copy(me.pos); want.y += 1.6;
    const delta = want.sub(controls.target).multiplyScalar(0.15);
    controls.target.add(delta); camera.position.add(delta);
  }
  controls.update();
  // 해 · 그림자: 나를 따라와요
  sun.position.copy(me.pos).add(V.set(80, 140, 60)); sun.target.position.copy(me.pos);

  // 구역 · 안개 · 눈
  const z0 = me.pos.distanceTo(VIL) < 26 ? 'village' : zoneAt(me.pos.x, me.pos.z);
  setZone(z0);
  const fogNear = z0 === 'jungle' ? 30 : z0 === 'arctic' ? 60 : 120, fogFar = z0 === 'jungle' ? 260 : z0 === 'arctic' ? 420 : 720;
  scene.fog.near = lerp(scene.fog.near, fogNear, 0.02); scene.fog.far = lerp(scene.fog.far, fogFar, 0.02);
  const leafA = z0 === 'jungle' ? 0.38 : 1;
  for (const m of [leafJ, leafJ2, pineM]) { m.opacity = lerp(m.opacity, leafA, 0.08); m.depthWrite = m.opacity > 0.95; }
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
