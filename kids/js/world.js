// 장소 만들기: 정거장 대기실 · 정글 · 초원 · 사막 · 바닷가 · 깊은 바다
// 장소마다 { group, radius, colliders, spots, sky, fog, spawn, place(kind) } 를 돌려줘요.
// 움직이지 않는 풍경 상자는 bake() 로 한 덩어리(정점 색)로 합쳐서 휴대폰에서도 가볍게 그려요.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, mat, mulberry } from './animals.js';

const BAKED = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
const BAKED_FLAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true });
const joint = (p, x = 0, y = 0, z = 0) => { const o = new THREE.Group(); o.position.set(x, y, z); p.add(o); return o; };
const add = (p, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, typeof m === 'string' ? mat(m) : m); o.position.set(x, y, z); p.add(o); return o; };
// 각진 로우폴리 재료 (나무 · 바위 · 언덕)
const FLATS = new Map();
export function flat(c) { if (!FLATS.has(c)) FLATS.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0, flatShading: true })); return FLATS.get(c); }
const ICO = new THREE.IcosahedronGeometry(1, 1), ICO0 = new THREE.IcosahedronGeometry(1, 0), DODE = new THREE.DodecahedronGeometry(1, 0);
const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10), CONE = new THREE.ConeGeometry(1, 1, 8);
const blob = (p, c, geo, sx, sy, sz, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, flat(c)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.y = ry; p.add(m); return m; };

// 그룹 안의 불투명 · 빛나지 않는 부품들을 메시 하나로 합쳐요 (각진 것 · 매끈한 것 따로)
export function bake(root, deep = true) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const parts = [[], []];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o === root) return;
    if (!deep && o.parent !== root) return;
    const m = o.material;
    if (Array.isArray(m) || m.map) return;   // 얼굴 그림 · 무늬 천은 따로 그려요
    if (m.transparent || m.vertexColors || (m.emissive && m.emissiveIntensity > 0 && m.emissive.getHex() !== 0) || o.userData.keep) return;
    if (!o.geometry.attributes.position) return;
    parts[m.flatShading ? 1 : 0].push(o);
  });
  parts.forEach((list, isFlat) => {
    if (list.length < 2) return;
    const geos = list.map((o) => {
      let g = o.geometry.clone();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      if (g.index) g = g.toNonIndexed();
      const c = o.material.color, n = g.attributes.position.count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
      return g;
    });
    const merged = mergeGeometries(geos);
    geos.forEach((g) => g.dispose());
    if (!merged) return;
    list.forEach((o) => o.parent.remove(o));
    const baked = new THREE.Mesh(merged, isFlat ? BAKED_FLAT : BAKED);
    baked.castShadow = true; baked.receiveShadow = true;
    root.add(baked);
  });
}

// 움직이는 동물 · 사람은 관절(그룹)마다 따로 합쳐요
export function bakeJoints(root) {
  const groups = [];
  root.traverse((o) => { if (o.isGroup || o === root) groups.push(o); });
  groups.forEach((g) => bake(g, false));
}

// ---------- 질감 그림 (캔버스로 그려요, 그림 파일 없이) ----------
const PAL = {
  grass:    ['#8cc86c', '#7dbb5f', '#9ad37a', '#72ae55', '#a6d985'],
  jgrass:   ['#4f9a4a', '#468f43', '#5ba754', '#3e8440', '#64ad58'],
  savanna:  ['#d2c56c', '#c6b85f', '#ddd17e', '#bcae56', '#a9a24e'],
  sand:     ['#edd49c', '#e4c98d', '#f4ddac', '#dbbf84', '#f7e6c0'],
  beach:    ['#f2daa3', '#eacf95', '#f8e6b9', '#e1c58b', '#fff0cc'],
  seabed:   ['#d6c08a', '#cdb57e', '#dfcb98', '#c4ab74', '#e6d4a6'],
  seafloor: ['#2c3c56', '#27364e', '#33465f', '#223048', '#3a4f6c'],
};
const TEX = {};
function groundTex(kind) {
  if (TEX[kind]) return TEX[kind];
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), r = mulberry(kind.length * 977 + 13), P = PAL[kind];
  x.fillStyle = P[0]; x.fillRect(0, 0, N, N);
  // 크고 옅은 얼룩 → 작은 점 → (풀) 짧은 풀잎 · (모래) 물결 무늬
  for (let i = 0; i < 70; i++) { x.globalAlpha = 0.25; x.fillStyle = P[1 + (i % 4)]; x.beginPath(); x.ellipse(r() * N, r() * N, 20 + r() * 50, 14 + r() * 36, r() * 3, 0, 7); x.fill(); }
  x.globalAlpha = 0.7;
  for (let i = 0; i < 2600; i++) { x.fillStyle = P[1 + Math.floor(r() * 4)]; const s = 1 + r() * 2.5; x.fillRect(r() * N, r() * N, s, s); }
  if (kind === 'grass' || kind === 'jgrass' || kind === 'savanna') {
    x.lineWidth = 1.6;
    for (let i = 0; i < 1400; i++) { const px = r() * N, py = r() * N; x.strokeStyle = P[1 + Math.floor(r() * 4)]; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 4, py - 4 - r() * 6); x.stroke(); }
  }
  if (kind === 'sand' || kind === 'beach' || kind === 'seabed') {
    x.globalAlpha = 0.35; x.strokeStyle = P[4]; x.lineWidth = 2;
    for (let i = 0; i < 40; i++) { const py = r() * N, px = r() * N; x.beginPath(); for (let k = 0; k < 80; k++) x.lineTo(px + k * 3, py + Math.sin((px + k * 3) / 18) * 4); x.stroke(); }
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return (TEX[kind] = t);
}
// 광장 돌 포장: 둥근 모서리 돌을 엇갈려 깔고 돌마다 색을 조금씩
function paverTex() {
  if (TEX.paver) return TEX.paver;
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), r = mulberry(31);
  x.fillStyle = '#a99073'; x.fillRect(0, 0, N, N);
  const cols = ['#dcc7a0', '#d4bd93', '#e3d0ab', '#cdb488', '#e8d9ba', '#d9c09a'];
  const rows = 8, h = N / rows;
  for (let j = 0; j < rows; j++) {
    const w = N / 6, off = j % 2 ? w / 2 : 0;
    for (let i = -1; i < 7; i++) {
      const px = i * w + off + 3, py = j * h + 3, ww = w - 6, hh = h - 6;
      x.fillStyle = cols[Math.floor(r() * cols.length)];
      x.beginPath(); x.roundRect(px, py, ww, hh, 10); x.fill();
      x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.roundRect(px + 4, py + 3, ww - 8, 6, 3); x.fill();
      x.fillStyle = 'rgba(80,60,30,.12)'; for (let k = 0; k < 14; k++) x.fillRect(px + r() * ww, py + r() * hh, 2, 2);
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return (TEX.paver = t);
}
const GROUND_KIND = { '#9fd486': 'grass', '#4f9a4a': 'jgrass', '#cfc46a': 'savanna', '#ecd096': 'sand', '#f1d59b': 'beach', '#2a3a52': 'seafloor', '#d9c48a': 'seabed' };
function ground(g, color, r) {
  const kind = GROUND_KIND[color] || 'grass', tex = groundTex(kind).clone();
  tex.needsUpdate = true; tex.repeat.set((r + 40) / 4, (r + 40) / 4);
  tex.repeat.set(70, 70);   // 땅은 지평선까지 (멀리 겹겹이 산이 서 있게)
  const m = new THREE.Mesh(new THREE.CircleGeometry(280, 72), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }));
  m.rotation.x = -Math.PI / 2;
  m.userData.keep = true; m.receiveShadow = true;
  g.add(m);
  g.userData.groundKind = kind;
  return m;
}
// 가장자리를 둘러싸는 로우폴리 언덕 (넘어가지 못하는 곳이 보이게)
function rim(g, r, colors, h = 2.2, seed = 1) {
  const rnd = mulberry(seed);
  const n = Math.round(r * 1.1);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, rr = r + 2 + rnd() * 2.5;
    const s = 2.6 + rnd() * 2.6;
    blob(g, colors[i % colors.length], ICO, s, h * (0.7 + rnd() * 0.9), s * (0.8 + rnd() * 0.4), Math.cos(a) * rr, 0, Math.sin(a) * rr, rnd() * 3);
  }
}
// 자리 고르기: 반지름 안 · 장애물과 겹치지 않는 곳
function placer(Z) {
  return (kind = 'land', margin = 0.85) => {
    for (let i = 0; i < 80; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * Z.radius * margin;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Z.okFor && !Z.okFor(kind, x, z)) continue;
      if (Z.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 0.8)) continue;
      if (Math.hypot(x - Z.spawn.x, z - Z.spawn.z) < 4) continue;
      return { x, z };
    }
    return { x: 0, z: -Z.radius * 0.4 };
  };
}

// ---------- 나무 · 바위 · 덤불 · 꽃 (로우폴리) ----------
const LEAF = { round: ['#5fb35a', '#4fa24c', '#6fc163'], jungle: ['#2f8a3e', '#3b9a45', '#28763a'], acacia: ['#8aa645', '#7d9a3c', '#99b452'], pine: ['#3f8f52', '#36804a'] };
function trunk(g, x, z, h, r0, col = '#7a5532', lean = 0) {
  const t = new THREE.Mesh(CYL, flat(col)); t.scale.set(r0 * 2, h, r0 * 2); t.position.set(x + lean * h * 0.5, h / 2, z); t.rotation.z = -lean; g.add(t); return t;
}
function tree(g, col, x, z, s = 1, kind = 'round', rnd = Math.random) {
  if (kind === 'jungle') {
    trunk(g, x, z, 5.2 * s, 0.32 * s, '#6e4a2c');
    const L = LEAF.jungle;
    blob(g, L[0], ICO, 2.2 * s, 1.1 * s, 2.2 * s, x, 5.4 * s, z, rnd() * 3);
    blob(g, L[1], ICO, 1.6 * s, 0.9 * s, 1.6 * s, x + 0.9 * s, 6.1 * s, z - 0.4 * s, rnd() * 3);
    blob(g, L[2], ICO, 1.5 * s, 0.8 * s, 1.5 * s, x - 1.0 * s, 4.7 * s, z + 0.7 * s, rnd() * 3);
    for (let i = 0; i < 2; i++) if (rnd() < 0.7) { const v = new THREE.Mesh(CYL, flat('#4f8a3a')); v.scale.set(0.05, 2.6 * s, 0.05); v.position.set(x + (i ? 1.3 : -1.2) * s, 3.6 * s, z + 0.3 * s); g.add(v); }
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + rnd(); const f = blob(g, L[i % 3], ICO0, 0.9 * s, 0.12 * s, 0.4 * s, x + Math.cos(a) * 0.7 * s, 0.35 * s, z + Math.sin(a) * 0.7 * s, -a); f.rotation.z = 0.5; }
  } else if (kind === 'acacia') {
    trunk(g, x, z, 2.6 * s, 0.18 * s, '#6a4a2a', 0.12);
    const b2 = new THREE.Mesh(CYL, flat('#6a4a2a')); b2.scale.set(0.24 * s, 1.5 * s, 0.24 * s); b2.position.set(x - 0.35 * s, 2.9 * s, z); b2.rotation.z = 0.6; g.add(b2);
    blob(g, LEAF.acacia[0], ICO, 2.6 * s, 0.45 * s, 2.1 * s, x + 0.4 * s, 3.7 * s, z, rnd() * 3);
    blob(g, LEAF.acacia[2], ICO, 1.7 * s, 0.35 * s, 1.4 * s, x - 0.7 * s, 3.5 * s, z + 0.4 * s, rnd() * 3);
  } else if (kind === 'palm') {
    // 살짝 휜 줄기 + 늘어진 잎 + 야자열매
    let px = x, py = 0;
    for (let i = 0; i < 6; i++) { const seg = new THREE.Mesh(CYL, flat(i % 2 ? '#b08850' : '#9c7642')); seg.scale.set((0.36 - i * 0.025) * s, 0.85 * s, (0.36 - i * 0.025) * s); seg.position.set(px, py + 0.42 * s, z); seg.rotation.z = -0.08 - i * 0.03; g.add(seg); px += (0.06 + i * 0.03) * s; py += 0.82 * s; }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rnd() * 0.3;
      const leaf = new THREE.Mesh(ICO0, flat(i % 2 ? '#3f9e4a' : '#58b85a'));
      leaf.scale.set(1.5 * s, 0.08 * s, 0.38 * s);
      leaf.position.set(px + Math.cos(a) * 1.2 * s, py - 0.25 * s, z + Math.sin(a) * 1.2 * s);
      leaf.rotation.set(0, -a, -0.42); g.add(leaf);
    }
    for (let i = 0; i < 3; i++) blob(g, '#6b4a2a', ICO0, 0.16 * s, 0.16 * s, 0.16 * s, px + Math.cos(i * 2) * 0.22 * s, py - 0.25 * s, z + Math.sin(i * 2) * 0.22 * s);
  } else if (kind === 'cactus') {
    const C = '#4f9a52', cap = (r0, h, x0, y0, z0, rz = 0) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r0, h, 4, 10), flat(C)); m.position.set(x0, y0, z0); m.rotation.z = rz; g.add(m); };
    cap(0.32 * s, 2.0 * s, x, 1.3 * s, z);
    cap(0.18 * s, 0.6 * s, x - 0.48 * s, 1.15 * s, z, Math.PI / 2); cap(0.18 * s, 0.7 * s, x - 0.75 * s, 1.6 * s, z);
    cap(0.16 * s, 0.4 * s, x + 0.42 * s, 1.55 * s, z, Math.PI / 2); cap(0.16 * s, 0.6 * s, x + 0.62 * s, 1.95 * s, z);
    blob(g, '#ff8fb0', ICO0, 0.16 * s, 0.12 * s, 0.16 * s, x, 2.75 * s, z);
  } else if (kind === 'pine') {
    trunk(g, x, z, 1.4 * s, 0.2 * s, '#6e4a2c');
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(CONE, flat(LEAF.pine[i % 2])); c.scale.set((1.5 - i * 0.35) * s, 1.6 * s, (1.5 - i * 0.35) * s); c.position.set(x, (1.8 + i * 1.0) * s, z); c.rotation.y = rnd() * 3; g.add(c); }
  } else {
    // 공원 나무: 둥근 잎 덩어리 서너 개
    trunk(g, x, z, 2.2 * s, 0.2 * s, '#7a5532');
    const L = LEAF.round;
    blob(g, L[0], ICO, 1.35 * s, 1.2 * s, 1.35 * s, x, 2.9 * s, z, rnd() * 3);
    blob(g, L[1], ICO, 0.95 * s, 0.9 * s, 0.95 * s, x + 0.75 * s, 2.5 * s, z + 0.3 * s, rnd() * 3);
    blob(g, L[2], ICO, 0.9 * s, 0.85 * s, 0.9 * s, x - 0.6 * s, 3.4 * s, z - 0.3 * s, rnd() * 3);
  }
}
function rock(g, x, z, s, col = '#9a9a92') {
  const c2 = new THREE.Color(col).offsetHSL(0, 0, 0.06).getStyle();
  blob(g, col, DODE, 0.9 * s, 0.6 * s, 0.75 * s, x, 0.25 * s, z, x * 7);
  blob(g, c2, DODE, 0.5 * s, 0.4 * s, 0.5 * s, x + 0.6 * s, 0.2 * s, z - 0.3 * s, z * 3);
}
function bush(g, x, z, s = 1, cols = LEAF.round) {
  blob(g, cols[0], ICO, 0.8 * s, 0.6 * s, 0.8 * s, x, 0.35 * s, z);
  blob(g, cols[1], ICO, 0.6 * s, 0.5 * s, 0.6 * s, x + 0.55 * s, 0.3 * s, z + 0.2 * s);
  blob(g, cols[2] || cols[0], ICO, 0.55 * s, 0.45 * s, 0.55 * s, x - 0.5 * s, 0.28 * s, z - 0.1 * s);
}
// 풀 한 포기는 따로 그리지 않고 모아 두었다가 장소를 다 만든 뒤 한 번에 (아래 grassField)
function tuft(g, x, z, col) { (g.userData.tufts ||= []).push([x, z, col]); }
const PETAL = new THREE.SphereGeometry(1, 8, 6);
function flower(g, x, z, col) {
  const st = new THREE.Mesh(CYL, flat('#4f9a52')); st.scale.set(0.035, 0.32, 0.035); st.position.set(x, 0.16, z); g.add(st);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const p = new THREE.Mesh(PETAL, mat(col)); p.scale.set(0.07, 0.03, 0.07); p.position.set(x + Math.cos(a) * 0.07, 0.34, z + Math.sin(a) * 0.07); g.add(p); }
  const c = new THREE.Mesh(PETAL, mat('#ffd23c')); c.scale.set(0.045, 0.035, 0.045); c.position.set(x, 0.35, z); g.add(c);
}

// ---------- 바람에 흔들리는 풀 (한 번에 수천 포기, 모양 하나를 여러 자리에) ----------
export const WIND = { value: 0 };
let BLADE = null;
function bladeGeo() {
  if (BLADE) return BLADE;
  const gs = [];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.ConeGeometry(0.035, 0.42, 3, 1); b.translate(0, 0.21, 0);
    b.rotateZ((i - 1) * 0.35); b.rotateY(i * 2.1); b.translate((i - 1) * 0.05, 0, 0);
    gs.push(b.index ? b.toNonIndexed() : b);
  }
  return (BLADE = mergeGeometries(gs));
}
const GRASS_MAT = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, flatShading: true });
GRASS_MAT.onBeforeCompile = (sh) => {
  sh.uniforms.uWind = WIND;
  sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    float sway = sin(uWind * 1.6 + instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27) * 0.12 * position.y * 2.4;
    transformed.x += sway; transformed.z += sway * 0.5;`);
};
function grassField(Z, extra = []) {
  const g = Z.group, kind = g.userData.groundKind, list = [...(g.userData.tufts || []), ...extra];
  const auto = { grass: ['#6fae55', '#86c46a', '#5b9e48'], jgrass: ['#3f8a3e', '#56a250', '#2f7a36'], savanna: ['#c8b85a', '#b4a44c', '#ddd078'] }[kind];
  if (auto) {
    const rnd = mulberry(77), n = Z.grassCount || (kind === 'jgrass' ? 1400 : 1000);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * (Z.radius + 6), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Z.noGrass?.(x, z)) continue;
      if (Z.colliders.some((c) => !c.w && Math.hypot(c.x - x, c.z - z) < c.r * 0.9)) continue;
      list.push([x, z, auto[i % 3]]);
    }
  }
  if (!list.length) return;
  const im = new THREE.InstancedMesh(bladeGeo(), GRASS_MAT, list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), rnd = mulberry(5);
  list.forEach(([x, z, c], i) => {
    const k = (0.7 + rnd() * 0.8) * (Z.grassScale || 1);
    q.setFromEuler(e.set(0, rnd() * 6.28, 0)); v.set(x, 0, z); sc.set(k, k * (0.8 + rnd() * 0.6), k);
    im.setMatrixAt(i, m4.compose(v, q, sc)); im.setColorAt(i, col.set(c).offsetHSL(0, 0, (rnd() - 0.5) * 0.06));
  });
  im.receiveShadow = true; im.userData.keep = true;
  g.add(im); Z.grassMesh = im; Z.grassN = list.length;
}

// ---------- 출렁이는 물 (각진 면이 햇빛을 반짝 받아요) ----------
function water(Z, geo, color, x, y, z, opacity = 0.86, amp = 0.06) {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.12, metalness: 0.15, flatShading: true }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z);
  m.receiveShadow = true; m.userData.keep = true;
  const p = geo.attributes.position;
  m.userData.base = Float32Array.from(p.array);
  m.userData.amp = amp;
  Z.group.add(m); (Z.waves ||= []).push(m);
  return m;
}
export function animateWater(Z, t) {
  if (!Z.waves) return;
  for (const m of Z.waves) {
    const p = m.geometry.attributes.position, b = m.userData.base, A = m.userData.amp;
    for (let i = 0; i < p.count; i++) {
      const x = b[i * 3], y = b[i * 3 + 1];
      p.array[i * 3 + 2] = (Math.sin(x * 0.9 + t * 1.6) + Math.sin(y * 1.3 - t * 1.2) * 0.7 + Math.sin((x + y) * 2.1 + t * 2.4) * 0.3) * A;
    }
    p.needsUpdate = true;
    m.geometry.computeVertexNormals();
  }
}
const pondGeo = (r) => new THREE.RingGeometry(0.01, r, 40, 8);
const DUNE_GEO = new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2);
let DUNE_MAT = null;
function duneMat() { if (!DUNE_MAT) { const t = groundTex('sand').clone(); t.needsUpdate = true; t.repeat.set(3, 3); DUNE_MAT = new THREE.MeshStandardMaterial({ map: t, roughness: 1 }); } return DUNE_MAT; }

// 글자 판 (캔버스 글씨): 언즈체 손글씨 · 둥근 판 · 테두리와 그림자. 글꼴이 늦게 오면 다시 그려요
export const SIGN_FONT = '"OngleipUnz", "Jua", "Apple SD Gothic Neo", sans-serif';
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
function sign(text, w, h, bg = '#fffdf6', ink = '#24342b', size = 64) {
  const c = document.createElement('canvas'); c.width = 768; c.height = Math.round(768 * h / w);
  const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const draw = () => {
    const W = c.width, H = c.height, r = Math.min(H * 0.32, 60);
    x.clearRect(0, 0, W, H);
    x.fillStyle = ink; x.beginPath(); x.roundRect(4, 4, W - 8, H - 8, r); x.fill();          // 테두리
    x.fillStyle = bg; x.beginPath(); x.roundRect(16, 14, W - 32, H - 34, r * 0.8); x.fill(); // 판
    x.fillStyle = 'rgba(255,255,255,.22)'; x.beginPath(); x.roundRect(28, 22, W - 56, (H - 34) * 0.32, r * 0.5); x.fill();   // 윗면 빛
    // 맨 앞 이모지는 이모지 글꼴로, 나머지 글자는 언즈체로
    const m = /^(\p{Extended_Pictographic}️?)\s*(.*)$/u.exec(text);
    const emo = m ? m[1] : '', word = m ? m[2] : text;
    const fs = size * 1.5;
    x.font = `${fs}px ${SIGN_FONT}`;
    const ew = emo ? fs * 1.05 : 0, tw = x.measureText(word).width, total = ew + tw;
    const scale = Math.min(1, (W - 70) / total);
    x.save(); x.translate(W / 2, (H - 20) / 2 + 4); x.scale(scale, scale);
    let px = -total / 2;
    if (emo) { x.font = `${fs * 0.82}px ${EMOJI_FONT}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(emo, px, 2); px += ew; }
    x.font = `${fs}px ${SIGN_FONT}`; x.textAlign = 'left'; x.textBaseline = 'middle';
    x.lineJoin = 'round'; x.lineWidth = fs * 0.12; x.strokeStyle = 'rgba(0,0,0,.12)'; x.strokeText(word, px + 3, 6);
    x.fillStyle = ink; x.fillText(word, px, 2);
    x.restore();
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load(`64px "OngleipUnz"`).then(draw).catch(() => {});
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.userData.keep = true;
  return m;
}

// 누를 수 있는 곳: 보이지 않는 상자 (그림은 합쳐서 그리니 누르기 판정은 따로)
const HIT_GEO = new THREE.BoxGeometry(1, 1, 1);
const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
function hitBox(Z, spot, x, y, z, w, h, d) {
  const m = new THREE.Mesh(HIT_GEO, HIT_MAT);
  m.position.set(x, y, z); m.scale.set(w, h, d);
  m.userData.keep = true; if (spot) m.userData.spot = spot;
  Z.group.add(m); Z.hits.push(m);
}

// ================== 정거장 광장 ==================
// 가운데 분수와 벤치, 뒤쪽 정거장 건물 · 매표소, 왼쪽 버스 · 오른쪽 배,
// 앞쪽 양옆에 아이스크림 가게 · 상점. 가로등 사이에 깃발 줄, 꽃밭과 풍선 수레.
// spots: 가까이 가거나 누르면 그 위에 말풍선 메뉴가 떠요 (ax, ay, az = 말풍선 자리)
function station() {
  const g = new THREE.Group();
  const Z = { group: g, radius: 17, colliders: [], spots: [], benches: [], hits: [], sky: '#bfe8f5', fog: ['#bfe8f5', 34, 80], spawn: { x: 0, z: 8, yaw: Math.PI } };
  const rnd = mulberry(2);
  ground(g, '#9fd486', Z.radius);
  // 바닥: 동그란 광장 돌길 (안쪽에서 바깥쪽으로 고리 무늬)
  const disc = (r0, r1, c, y) => { const m = new THREE.Mesh(r0 ? new THREE.RingGeometry(r0, r1, 64) : new THREE.CircleGeometry(r1, 64), mat(c)); m.rotation.x = -Math.PI / 2; m.position.y = y; m.userData.keep = true; m.receiveShadow = true; g.add(m); };
  { const pt = paverTex().clone(); pt.needsUpdate = true; pt.repeat.set(9, 9);
    const pv = new THREE.Mesh(new THREE.CircleGeometry(Z.radius, 72), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.95 }));
    pv.rotation.x = -Math.PI / 2; pv.position.y = 0.02; pv.userData.keep = true; pv.receiveShadow = true; g.add(pv); }
  add(g, new THREE.TorusGeometry(Z.radius, 0.14, 6, 96), '#bfae90', 0, 0.04, 0).rotation.x = Math.PI / 2;
  [[3.2, 3.6], [6.4, 6.9], [10.2, 10.8], [14.2, 14.8]].forEach(([r0, r1]) => disc(r0, r1, '#b89a6a', 0.025));
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const t = box(g, '#c9b084', 0.3, 0.012, 13.4, Math.cos(a) * 9.7, 0.028, Math.sin(a) * 9.7); t.rotation.y = -a + Math.PI / 2; }

  // 분수 (가운데)
  const f = joint(g, 0, 0, -1);
  add(f, new THREE.CylinderGeometry(2.5, 2.65, 0.5, 40), '#d9d2c3', 0, 0.25, 0);
  add(f, new THREE.TorusGeometry(2.42, 0.16, 10, 48), '#e6dfd0', 0, 0.56, 0).rotation.x = Math.PI / 2;
  water(Z, pondGeo(2.32), '#4fb6e2', 0, 0.6, -1, 0.92, 0.02);
  add(f, new THREE.CylinderGeometry(0.3, 0.38, 1.3, 20), '#cfc6b4', 0, 1.0, 0);
  add(f, new THREE.CylinderGeometry(0.95, 0.5, 0.32, 28), '#d9d2c3', 0, 1.7, 0);
  water(Z, pondGeo(0.85), '#6cc8ee', 0, 1.86, -1, 0.92, 0.015);
  add(f, new THREE.SphereGeometry(0.22, 16, 12), '#8fd6f0', 0, 2.05, 0);
  const drops = [];
  for (let i = 0; i < 14; i++) { const d = add(f, new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshLambertMaterial({ color: '#cdeefb', transparent: true, opacity: 0.9 }), 0, 2, 0); d.userData.keep = true; drops.push({ d, a: (i / 14) * Math.PI * 2, o: i / 14 }); }
  Z.colliders.push({ x: 0, z: -1, r: 2.7 });
  Z.update = (t) => drops.forEach(({ d, a, o }) => { const k = (t * 0.7 + o) % 1; const r = 0.3 + k * 1.6; d.position.set(Math.cos(a) * r, 2.05 + Math.sin(k * Math.PI) * 0.7 - k * 1.5, Math.sin(a) * r); });

  // 뒤쪽 정거장 건물
  const st = joint(g, 0, 0, -15.5);
  box(st, '#fff6e6', 18, 4.5, 2, 0, 2.25, 0);
  box(st, '#ff7a5c', 19, 0.8, 3, 0, 4.9, 0.3);
  for (let i = 0; i < 19; i++) box(st, i % 2 ? '#ffffff' : '#ff9f6a', 1, 0.35, 0.5, -9 + i, 4.35, 1.85).rotation.x = 0.4;
  box(st, '#ffd23c', 19, 0.25, 3.1, 0, 4.4, 0.3);
  for (let i = -3; i <= 3; i++) { box(st, '#8fd3e8', 1.6, 1.6, 0.1, i * 2.4, 2.6, 1.01); box(st, '#ffffff', 1.7, 0.15, 0.12, i * 2.4, 1.75, 1.02); }
  for (let i = -4; i <= 4; i++) if (i) add(st, new THREE.CylinderGeometry(0.22, 0.26, 4.2, 12), '#fffaf0', i * 2.05, 2.1, 1.25);
  box(st, '#d9cfbd', 18.6, 0.4, 2.8, 0, 0.2, 0.3);
  // 시계탑
  const tw = joint(st, 0, 5.2, -0.1);
  box(tw, '#fff6e6', 2.6, 2.8, 2.4, 0, 1.4, 0); box(tw, '#ffd23c', 2.9, 0.3, 2.7, 0, 2.9, 0);
  const tr = add(tw, new THREE.ConeGeometry(2.2, 1.9, 4), '#ff7a5c', 0, 4.0, 0); tr.rotation.y = Math.PI / 4;
  add(tw, new THREE.CylinderGeometry(0.85, 0.85, 0.12, 32), '#ffffff', 0, 1.5, 1.22).rotation.x = Math.PI / 2;
  add(tw, new THREE.TorusGeometry(0.85, 0.07, 8, 32), '#3f8f5a', 0, 1.5, 1.27);
  box(tw, '#24342b', 0.08, 0.55, 0.04, 0, 1.72, 1.3); box(tw, '#24342b', 0.42, 0.08, 0.04, 0.18, 1.5, 1.31);
  const title = sign('동물 왕국 정거장', 6.4, 0.95, '#3f8f5a', '#fffdf6', 80); title.position.set(0, 4.95, 1.84); st.add(title);   // 지붕 앞면에
  Z.colliders.push({ x: 0, z: -15.5, r: 0, w: 18, d: 3 });

  // 매표소 (뒤쪽 가운데)
  const bo = joint(g, 0, 0, -9);
  box(bo, '#ff9f6a', 3.4, 2.6, 2, 0, 1.3, 0);
  box(bo, '#fffdf6', 2.4, 1, 0.1, 0, 1.6, 1.01);
  box(bo, '#5a3a24', 3.6, 0.15, 0.6, 0, 1.05, 1.2);
  box(bo, '#ffd23c', 3.8, 0.3, 2.4, 0, 2.75, 0.1);
  { const rf = add(bo, new THREE.CylinderGeometry(0.01, 2.0, 1.3, 4, 1), flat('#e2574c'), 0, 3.55, 0.1); rf.rotation.y = Math.PI / 4; rf.scale.set(1.35, 1, 0.85); }
  add(bo, new THREE.SphereGeometry(0.16, 12, 10), '#ffd23c', 0, 4.25, 0.1);
  for (let i = 0; i < 5; i++) box(bo, i % 2 ? '#ff6b8a' : '#fffdf6', 0.76, 0.5, 0.2, -1.52 + i * 0.76, 2.4, 1.25);
  const bt = sign('🎫 매표소', 2.4, 0.8, '#fffdf6', '#24342b', 110); bt.position.set(0, 3.05, 1.9); bt.rotation.x = -0.12; bo.add(bt);   // 지붕 앞으로
  Z.colliders.push({ x: 0, z: -9, r: 1.9 });
  const boothSpot = { id: 'booth', x: 0, z: -6.9, r: 2.4, ax: 0, ay: 4.1, az: -9 };
  Z.spots.push(boothSpot); hitBox(Z, boothSpot, 0, 1.8, -8.8, 4, 3.8, 2.8);

  // 왼쪽 버스 정류장
  const bus = joint(g, -12.5, 0, -3);
  box(bus, '#5a6b7a', 0.2, 3, 0.2, -1.4, 1.5, -1.2); box(bus, '#5a6b7a', 0.2, 3, 0.2, 1.4, 1.5, -1.2);
  box(bus, '#ffd23c', 3.4, 0.2, 1.8, 0, 3, -0.6);
  box(bus, '#8fd3e8', 3, 2.2, 0.1, 0, 1.6, -1.3, 0, 0.5);
  const bs = sign('🚌 버스', 2, 0.8, '#ffd23c', '#24342b', 120); bs.position.set(0, 3.6, 0); bus.add(bs);
  const busV = joint(bus, -2.9, 0, 1.2); busV.rotation.y = Math.PI / 2; vehicleBus(busV);
  Z.colliders.push({ x: -15.4, z: -1.8, r: 2.2 });
  const busSpot = { id: 'bus', x: -12, z: -1.6, r: 2.8, ax: -13.6, ay: 4.4, az: -2.6 };
  Z.spots.push(busSpot); hitBox(Z, busSpot, -14, 1.7, -2.4, 6.6, 3.8, 4.6);

  // 오른쪽 배 선착장
  const harbor = water(Z, new THREE.PlaneGeometry(16, 12, 28, 20), '#3aa6d6', 21, 0.12, -3, 0.9, 0.07);
  const dock = joint(g, 13.2, 0, -3);
  for (let i = 0; i < 6; i++) box(dock, i % 2 ? '#b88a5a' : '#a87a4a', 0.75, 0.25, 4, i * 0.8, 0.2, 0);
  for (const zz of [-1.8, 1.8]) box(dock, '#7a5532', 0.3, 1.2, 0.3, 4.6, 0.6, zz);
  const ds = sign('⛵ 배', 1.6, 0.8, '#4fb3ff', '#fffdf6', 120); ds.position.set(1.5, 2.6, -2.1); dock.add(ds);
  box(dock, '#7a5532', 0.15, 2.2, 0.15, 1.5, 1.1, -2.2);
  const boat = joint(dock, 7.5, 0, 0); vehicleBoat(boat);
  Z.colliders.push({ x: 20.4, z: -3, w: 12, d: 12 });
  const boatSpot = { id: 'boat', x: 13.6, z: -2.5, r: 2.8, ax: 17.6, ay: 3.3, az: -3 };
  Z.spots.push(boatSpot); hitBox(Z, boatSpot, 17.4, 1.3, -3, 9.5, 3, 5.5);

  // 아이스크림 가게 (앞 왼쪽)
  const ic = joint(g, -8.6, 0, 4.2);
  box(ic, '#fff6fa', 3.6, 2.4, 2.2, 0, 1.2, 0);
  box(ic, '#ffb3c7', 3.7, 0.3, 2.3, 0, 0.15, 0);
  box(ic, '#8fd3e8', 2.4, 1, 0.06, 0, 1.5, 1.11);
  box(ic, '#c9844a', 3.8, 0.14, 0.6, 0, 1.0, 1.35);
  for (let i = 0; i < 6; i++) box(ic, i % 2 ? '#ff8fb0' : '#ffffff', 0.66, 0.16, 1.2, -1.65 + i * 0.66, 2.62, 1.5).rotation.x = 0.35;
  box(ic, '#ff8fb0', 3.8, 0.3, 2.4, 0, 2.55, 0);
  { const rf = add(ic, new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#ffc2d4', 0, 2.68, 0); rf.scale.set(2.0, 0.55, 1.3); }
  const cone = joint(ic, 0, 2.7, 0);
  add(cone, new THREE.ConeGeometry(0.55, 1.4, 16), '#e0a45a', 0, 0.75, 0).rotation.x = Math.PI;
  add(cone, new THREE.SphereGeometry(0.62, 18, 14), '#ffb3c7', 0, 1.65, 0);
  add(cone, new THREE.SphereGeometry(0.5, 18, 14), '#a8ecd0', 0, 2.2, 0);
  add(cone, new THREE.SphereGeometry(0.12, 10, 8), '#e23b52', 0.05, 2.75, 0);
  const ics = sign('🍦 아이스크림', 2.8, 0.55, '#ffffff', '#c2185b', 100); ics.position.set(0, 2.98, 1.55);   // 지붕 앞면 ic.add(ics);
  for (const [x, c] of [[-0.9, '#ffb3c7'], [-0.3, '#8a5a3a'], [0.3, '#a8ecd0'], [0.9, '#fff2b0']]) add(ic, new THREE.SphereGeometry(0.16, 10, 8), c, x, 1.18, 1.35);
  Z.colliders.push({ x: -8.6, z: 4.2, r: 0, w: 3.8, d: 2.4 });
  const iceSpot = { id: 'icecream', x: -8.6, z: 6.4, r: 2.2, ax: -8.6, ay: 5.2, az: 4.6 };
  Z.spots.push(iceSpot); hitBox(Z, iceSpot, -8.6, 2.2, 4.4, 3.8, 4.4, 2.8);
  // 풍선 수레
  const cart = joint(g, -4.8, 0, 7.4);
  box(cart, '#4fb3ff', 1.1, 0.6, 0.7, 0, 0.6, 0); for (const sx of [-0.4, 0.4]) add(cart, new THREE.CylinderGeometry(0.18, 0.18, 0.1, 14), '#2b2b33', sx, 0.22, 0.38).rotation.x = Math.PI / 2;
  [['#ff6b8a', -0.3, 2.6], ['#ffd23c', 0.1, 2.9], ['#4fb3ff', 0.4, 2.5], ['#a8ecd0', -0.1, 2.3], ['#c77dff', 0.25, 2.2]].forEach(([c, x, y]) => {
    add(cart, new THREE.SphereGeometry(0.26, 14, 12), c, x, y, 0).scale.y = 1.15;
    box(cart, '#ffffff', 0.015, y - 0.9, 0.015, x * 0.5, (y + 0.9) / 2, 0);
  });
  Z.colliders.push({ x: -4.8, z: 7.4, r: 0.8 });

  // 상점 (앞 오른쪽): 옷 가게 · 카메라
  const sh = joint(g, 8.6, 0, 4.2);
  box(sh, '#fff8e8', 3.8, 2.6, 2.4, 0, 1.3, 0);
  box(sh, '#3f8f5a', 4.2, 0.35, 2.8, 0, 2.75, 0);
  add(sh, new THREE.ConeGeometry(2.9, 1.3, 4), '#3f8f5a', 0, 3.55, 0).rotation.y = Math.PI / 4;
  for (let i = 0; i < 6; i++) box(sh, i % 2 ? '#4fb3ff' : '#ffffff', 0.68, 0.16, 1.1, -1.7 + i * 0.68, 2.3, 1.6).rotation.x = 0.35;
  box(sh, '#8fd3e8', 1.4, 1.3, 0.06, -0.85, 1.3, 1.21); box(sh, '#8a5a34', 0.9, 1.7, 0.06, 0.95, 0.85, 1.21);
  box(sh, '#ffd23c', 0.08, 0.08, 0.04, 1.25, 0.85, 1.25);
  // 진열창 속 옷 (마네킹)
  box(sh, '#e8d6ae', 0.08, 0.5, 0.08, -0.85, 0.95, 1.05); box(sh, '#5fc25a', 0.42, 0.42, 0.22, -0.85, 1.35, 1.05); box(sh, '#d2ae72', 0.5, 0.05, 0.4, -0.85, 1.72, 1.05);
  const shs = sign('🛒 상점', 2.4, 0.5, '#3f8f5a', '#fffdf6', 110); shs.position.set(0, 2.62, 2.12); shs.rotation.x = -0.2;   // 지붕 앞면 sh.add(shs);
  Z.colliders.push({ x: 8.6, z: 4.2, r: 0, w: 4, d: 2.6 });
  const shopSpot = { id: 'shop', x: 8.6, z: 6.5, r: 2.2, ax: 8.6, ay: 5.0, az: 4.6 };
  Z.spots.push(shopSpot); hitBox(Z, shopSpot, 8.6, 2.2, 4.4, 4.2, 4.6, 3);

  // 벤치: 분수를 둘러싸고 · 가게 앞
  for (const [x, z, face] of [[-3.2, -4.3, 1], [3.2, -4.3, 1], [-3.4, 2.6, 1], [3.4, 2.6, 1], [-12.5, 6, 0], [12.5, 6, 0]]) {
    const yaw = face ? Math.atan2(0 - x, -1 - z) : Math.atan2(-x, -z);
    const b = joint(g, x, 0, z); b.rotation.y = yaw;
    box(b, '#c9844a', 2.2, 0.15, 0.7, 0, 0.5, 0);
    box(b, '#c9844a', 2.2, 0.6, 0.12, 0, 0.9, -0.32);
    for (const sx of [-0.9, 0.9]) box(b, '#5a6b7a', 0.12, 0.5, 0.6, sx, 0.25, 0);
    // 의자: 말풍선 없이, 누르면 걸어가서 저절로 앉아요 (앉는 자리는 의자 가운데 · 의자가 보는 쪽)
    const seat = { id: 'bench', x: x + Math.sin(yaw) * 0.05, z: z + Math.cos(yaw) * 0.05, yaw };
    Z.benches.push(seat);
    hitBox(Z, null, x, 0.65, z, 2.4, 1.3, 1.6); Z.hits[Z.hits.length - 1].userData.seat = seat;
    Z.colliders.push({ x, z, r: 0.6 });
  }

  // 가로등 + 깃발 줄
  const lamps = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8, x = Math.cos(a) * 12.4, z = Math.sin(a) * 12.4 + 1;
    if (z < -6 && Math.abs(x) < 6) continue;
    box(g, '#3b4a5a', 0.16, 3.4, 0.16, x, 1.7, z);
    box(g, '#3b4a5a', 0.5, 0.12, 0.5, x, 3.45, z);
    add(g, new THREE.SphereGeometry(0.27, 16, 12), mat('#fff1b8', 0.9), x, 3.75, z);
    add(g, new THREE.ConeGeometry(0.34, 0.24, 12), '#3b4a5a', x, 4.08, z);
    lamps.push([x, z]);
    Z.colliders.push({ x, z, r: 0.25 });
  }
  const flagCols = ['#ff6b8a', '#ffd23c', '#4fb3ff', '#5fc25a', '#c77dff'];
  for (let i = 0; i < lamps.length; i++) {
    const [x0, z0] = lamps[i], [x1, z1] = lamps[(i + 1) % lamps.length];
    if (Math.hypot(x1 - x0, z1 - z0) > 11 || (z0 + z1) / 2 > 0) continue;   // 깃발 줄은 뒤쪽에만 (카메라 앞을 가리지 않게)
    const n = 9;
    for (let k = 1; k < n; k++) {
      const t = k / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = 3.5 - Math.sin(t * Math.PI) * 0.7;
      const fl = box(g, flagCols[(i + k) % 5], 0.24, 0.24, 0.03, x, y - 0.22, z);
      fl.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      fl.rotation.z = Math.PI / 4;
    }
  }

  // 꽃밭 · 나무 화분
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3, x = Math.cos(a) * 15.6, z = Math.sin(a) * 15.6 + 1;
    if (z < -12 || (Math.abs(x) > 11 && z < 1 && z > -7) || (Math.abs(x) < 5 && z > 8)) continue;   // 시작 지점 뒤(카메라 자리)는 비워요
    box(g, '#a87a4a', 2.2, 0.4, 1.0, x, 0.2, z).rotation.y = -a;
    for (let k = 0; k < 5; k++) flower(g, x + Math.cos(-a + Math.PI / 2) * (k - 2) * 0.38, z + Math.sin(-a + Math.PI / 2) * (k - 2) * 0.38, flagCols[(i + k) % 5]);
    Z.colliders.push({ x, z, r: 0.9 });
  }
  for (const [x, z] of [[-6, -11.8], [6, -11.8], [-15, 9], [15, 9], [-4.5, 16.5], [4.5, 16.5]]) { box(g, '#c9844a', 1.2, 0.6, 1.2, x, 0.3, z); tree(g, '#4fae5a', x, z, 0.8); Z.colliders.push({ x, z, r: 0.7 }); }
  for (let i = 0; i < 30; i++) { const a = rnd() * 6.28, d = 17.5 + rnd() * 4; flower(g, Math.cos(a) * d, Math.sin(a) * d, flagCols[i % 5]); }
  for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2 + 0.1, d = 18.2 + rnd() * 1.2, x = Math.cos(a) * d, z = Math.sin(a) * d; if (x > 12 && Math.abs(z + 3) < 7) continue; bush(g, x, z, 0.8 + rnd() * 0.5); }
  // 곤충잡기: 꽃밭 주변을 나는 나비 · 잠자리
  Z.bugs = [];
  const wingGeo = new THREE.CircleGeometry(0.1, 10);
  for (let i = 0; i < 9; i++) {
    const dragon = i % 3 === 2;
    const b = new THREE.Group();
    const col = dragon ? '#7fd3ff' : ['#ffd23c', '#ff8fb0', '#ffffff', '#c77dff'][i % 4];
    const wm = new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide, roughness: 0.6, transparent: dragon, opacity: dragon ? 0.7 : 1 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, dragon ? 0.34 : 0.16, 6), mat(dragon ? '#2f6aa8' : '#3a2a20'));
    body.rotation.x = Math.PI / 2; b.add(body);
    const wings = [];
    for (const sx of [-1, 1]) {
      const w = new THREE.Group(); b.add(w);
      const m = new THREE.Mesh(wingGeo, wm); m.position.x = sx * 0.12; m.rotation.x = -Math.PI / 2; m.scale.set(dragon ? 1.4 : 1, dragon ? 0.5 : 1, 1); w.add(m);
      wings.push([w, sx]);
    }
    b.traverse((o) => { o.userData.keep = true; if (o.isMesh) o.castShadow = true; });
    const a0 = (i / 9) * Math.PI * 2, home = { x: Math.cos(a0) * (7 + (i % 3) * 2.5), z: Math.sin(a0) * (7 + (i % 3) * 2.5) + 1 };
    b.position.set(home.x, 1, home.z); g.add(b);
    Z.bugs.push({ g: b, wings, home, ph: i * 1.7, kind: dragon ? 'dragonfly' : 'butterfly', away: 0 });
  }
  const fountainUpdate = Z.update;
  Z.update = (t, dt) => {
    fountainUpdate(t);
    for (const b of Z.bugs) {
      const k = t * (b.kind === 'dragonfly' ? 0.5 : 0.3) + b.ph;
      const nx = b.home.x + Math.sin(k) * 2.4 + Math.sin(k * 2.3) * 0.6, nz = b.home.z + Math.cos(k * 0.8) * 2.4;
      const y = 0.9 + Math.sin(k * 3.1) * 0.35 + (b.kind === 'dragonfly' ? 0.6 : 0);
      b.g.rotation.y = Math.atan2(nx - b.g.position.x, nz - b.g.position.z);
      b.g.position.set(nx, y, nz);
      const flap = Math.sin(t * (b.kind === 'dragonfly' ? 40 : 18) + b.ph) * (b.kind === 'dragonfly' ? 0.35 : 0.9);
      for (const [w, sx] of b.wings) w.rotation.z = sx * flap;
    }
  };
  rim(g, Z.radius + 2.5, ['#7fc46a', '#6ab45a'], 1.4, 3);
  // 광장 밖 멀리 둘러싼 나무숲 (빈 들판처럼 보이지 않게)
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + rnd() * 0.1, d = 23 + rnd() * 9, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (x > 14 && Math.abs(z + 3) < 7) continue;   // 배 선착장 바다 쪽은 비워요
    const s2 = 1 + rnd() * 0.8;
    box(g, '#7a5532', 0.5 * s2, 2.2 * s2, 0.5 * s2, x, 1.1 * s2, z);
    box(g, i % 3 ? '#4f9e52' : '#3f8f45', 2.6 * s2, 2.2 * s2, 2.6 * s2, x, 3.1 * s2, z);
    box(g, '#5fb35f', 1.7 * s2, 1.3 * s2, 1.7 * s2, x + 0.2, 4.4 * s2, z - 0.2);
  }
  Z.water = harbor;
  Z.noGrass = (x, z) => Math.hypot(x, z) < Z.radius + 0.4 || (x > 12 && Math.abs(z + 3) < 7);
  Z.place = placer(Z);
  return Z;
}
function vehicleBus(g) {
  box(g, '#ffc93c', 5, 2, 2.2, 0, 1.4, 0);
  box(g, '#ffffff', 5.02, 0.2, 2.22, 0, 0.9, 0);
  for (let i = 0; i < 4; i++) for (const sz of [-1, 1]) box(g, '#8fd3e8', 0.9, 0.8, 0.05, -1.6 + i * 1.1, 1.8, sz * 1.11);
  box(g, '#8fd3e8', 0.05, 0.9, 1.8, 2.51, 1.8, 0);
  for (const [x, z] of [[-1.6, 1.1], [1.6, 1.1], [-1.6, -1.1], [1.6, -1.1]]) box(g, '#2b2b33', 0.7, 0.7, 0.3, x, 0.4, z);
  box(g, '#fff6b0', 0.1, 0.3, 0.4, 2.52, 0.9, 0.7, 1); box(g, '#fff6b0', 0.1, 0.3, 0.4, 2.52, 0.9, -0.7, 1);
}
function vehicleBoat(g) {
  box(g, '#ffffff', 2.4, 0.9, 5, 0, 0.45, 0);
  box(g, '#ff6b4a', 2.42, 0.25, 5.02, 0, 0.3, 0);
  box(g, '#ffffff', 1.6, 0.7, 2.6, 0, 0.6, 2.5).rotation.x = 0.3;
  box(g, '#4fb3ff', 1.6, 1, 1.8, 0, 1.4, -0.6);
  box(g, '#8fd3e8', 1.62, 0.4, 1.4, 0, 1.6, -0.6);
  box(g, '#ff6b4a', 1.8, 0.15, 2, 0, 1.95, -0.6);
}

// ================== 정글 ==================
function jungle() {
  const g = new THREE.Group();
  const Z = { group: g, radius: 28, colliders: [], spots: [], sky: '#a8dcb8', fog: ['#a8dcb8', 18, 55], spawn: { x: 0, z: 20, yaw: Math.PI } };
  ground(g, '#4f9a4a', Z.radius);
  const rnd = mulberry(21);
  for (let i = 0; i < 40; i++) {
    const a = rnd() * 6.28, d = 6 + rnd() * 22, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.hypot(x, z - 20) < 5) continue;
    tree(g, '', x, z, 0.8 + rnd() * 0.5, 'jungle', rnd); Z.colliders.push({ x, z, r: 0.7 });
  }
  for (let i = 0; i < 60; i++) {
    const x = (rnd() - 0.5) * 54, z = (rnd() - 0.5) * 54; if (Math.hypot(x, z) > 27) continue;
    const s = 0.5 + rnd() * 0.7; bush(g, x, z, s, LEAF.jungle);
    if (i % 3 === 0) flower(g, x + 0.8, z, ['#ff6b8a', '#ffd23c', '#c77dff'][i % 3]);
  }
  // 작은 개울
  const river = water(Z, new THREE.PlaneGeometry(4, 60, 6, 70), '#3d9fc8', -6, 0.06, 0, 0.88, 0.05); river.rotation.z = 0.5;
  Z.wet = (x, z) => Math.abs((x + 6) * Math.cos(0.5) - z * Math.sin(0.5)) < 2;   // 개울
  for (let i = 0; i < 26; i++) { const x = (rnd() - 0.5) * 50, z = (rnd() - 0.5) * 50; if (Math.hypot(x, z) < 26 && Math.hypot(x, z - 20) > 4) bush(g, x, z, 0.7 + rnd() * 0.6, LEAF.jungle); }
  rim(g, Z.radius, ['#2f7a3e', '#3f8f45', '#26693a'], 4, 4);
  // 먼 배경: 안개 낀 숲 벽 → 먼 산 (멀수록 옅은 초록)
  silhouettes(Z, [
    { kind: 'canopy', r: 40, dr: 12, n: 46, h: [12, 20], w: [5, 8], color: '#3e7a4e' },
    { kind: 'canopy', r: 62, dr: 14, n: 40, h: [16, 26], w: [7, 11], color: '#6f9f82' },
    { kind: 'mountain', r: 130, dr: 30, n: 18, h: [40, 70], w: [30, 50], color: '#9cc3ad' },
  ], 41);
  Z.place = placer(Z);
  return Z;
}

// ================== 초원 ==================
function savanna() {
  const g = new THREE.Group();
  const Z = { group: g, radius: 32, colliders: [], spots: [], sky: '#ffe6b0', fog: ['#ffe6b0', 30, 80], spawn: { x: 0, z: 24, yaw: Math.PI } };
  ground(g, '#cfc46a', Z.radius);
  const rnd = mulberry(31);
  for (let i = 0; i < 14; i++) {
    const a = rnd() * 6.28, d = 8 + rnd() * 22, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.hypot(x, z - 24) < 6) continue;
    tree(g, '', x, z, 0.9 + rnd() * 0.4, 'acacia'); Z.colliders.push({ x, z, r: 0.5 });
  }
  for (let i = 0; i < 120; i++) { const x = (rnd() - 0.5) * 64, z = (rnd() - 0.5) * 64; if (Math.hypot(x, z) < 31) tuft(g, x, z, i % 2 ? '#b8a84a' : '#e0d27a'); }
  for (let i = 0; i < 8; i++) { const x = (rnd() - 0.5) * 50, z = (rnd() - 0.5) * 50; if (Math.hypot(x, z) > 28 || Math.hypot(x, z - 24) < 5) continue; rock(g, x, z, 0.8 + rnd(), '#b8a88a'); Z.colliders.push({ x, z, r: 1 }); }
  // 흰개미 언덕 · 물웅덩이
  { const tm = new THREE.Mesh(CONE, flat('#b07a4a')); tm.scale.set(1.1, 3.2, 1.1); tm.position.set(10, 1.6, -8); g.add(tm);
    const t2 = new THREE.Mesh(CONE, flat('#a06c40')); t2.scale.set(0.5, 1.6, 0.5); t2.position.set(10.7, 0.8, -7.6); g.add(t2); }
  Z.colliders.push({ x: 10, z: -8, r: 1 });
  water(Z, pondGeo(4), '#4fb0d4', -9, 0.07, -6, 0.88, 0.04);
  Z.wet = (x, z) => Math.hypot(x + 9, z + 6) < 3.9;   // 물웅덩이
  for (let i = 0; i < 10; i++) { const x = (rnd() - 0.5) * 54, z = (rnd() - 0.5) * 54; if (Math.hypot(x, z) < 28 && Math.hypot(x, z - 24) > 5) bush(g, x, z, 0.6 + rnd() * 0.4, LEAF.acacia); }
  rim(g, Z.radius, ['#c9a46a', '#b8945a'], 0.9, 5);   // 낮게: 지평선이 탁 트이게
  // 큰 바위 언덕 (멀리서도 보이는 초원의 표지)
  for (const [x, y, z, sx, sy, sz, c] of [[16, 1.6, -15, 5, 3.2, 4.4, '#b88c62'], [18.5, 3.6, -16, 3.8, 3, 3.4, '#c99c70'], [14.5, 4.8, -16.5, 2.6, 2.2, 2.4, '#a97f58'], [17.5, 6.4, -15.5, 2.2, 1.4, 2, '#d4a77a'], [12.5, 1.2, -12.8, 2.2, 1.6, 2, '#b88c62']]) {
    const b = new THREE.Mesh(DODE, flat(c)); b.scale.set(sx, sy, sz); b.position.set(x, y, z); b.rotation.set(0.2, x, 0.1); g.add(b);
  }
  Z.colliders.push({ x: 16.5, z: -15, r: 5.2 });
  // 키 큰 황금빛 풀
  Z.grassScale = 1.7; Z.grassCount = 2400;
  // 먼 배경: 노을빛 언덕 → 지평선의 아카시아 → 겹겹이 산 (멀수록 하늘에 녹아들어요)
  silhouettes(Z, [
    { kind: 'hill', r: 52, dr: 10, n: 26, h: [3, 7], w: [12, 20], color: '#c98f52' },
    { kind: 'acacia', r: 62, dr: 30, n: 16, h: [7, 10], w: [5, 7], color: '#6e4426' },
    { kind: 'hill', r: 95, dr: 20, n: 22, h: [10, 18], w: [25, 40], color: '#d99e62' },
    { kind: 'mountain', r: 160, dr: 30, n: 16, h: [35, 60], w: [40, 70], color: '#e9b277' },
  ], 51);
  const herds = [herd(Z, { r: 62 }, 5, 'elephant', '#5e3a22'), herd(Z, { r: 75 }, 3, 'giraffe', '#6b4426')];
  herds[1].ang = herds[0].ang + 2.4; herds[1].speed = -0.01;
  const flock = birds(Z, 9, '#4a2c1c');
  Z.update = (t, dt) => {
    for (const h of herds) {
      h.ang += h.speed * dt;
      h.g.position.set(Math.cos(h.ang) * h.r, 0, Math.sin(h.ang) * h.r);
      h.g.rotation.y = -h.ang + (h.speed > 0 ? Math.PI : 0);
      h.animals.forEach((a, i) => { a.position.y = Math.abs(Math.sin(t * 2 + i)) * 0.15; });
    }
    const fa = t * 0.05;
    flock.g.position.set(Math.cos(fa) * 45, 28 + Math.sin(t * 0.3) * 2, Math.sin(fa) * 45);
    flock.g.rotation.y = -fa;
    flock.list.forEach(({ w, ph }) => w.forEach(([j, sx]) => { j.rotation.z = sx * Math.sin(t * 6 + ph) * 0.6; }));
  };
  Z.place = placer(Z);
  return Z;
}

// ================== 사막 ==================
function desert() {
  const g = new THREE.Group();
  const Z = { group: g, radius: 32, colliders: [], spots: [], sky: '#ffd9a0', fog: ['#ffe4b8', 28, 80], spawn: { x: 0, z: 24, yaw: Math.PI } };
  ground(g, '#ecd096', Z.radius);
  const rnd = mulberry(41);
  // 모래 언덕
  for (let i = 0; i < 12; i++) {
    const a = rnd() * 6.28, d = 10 + rnd() * 18, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.hypot(x, z - 24) < 7) continue;
    const s = 3 + rnd() * 4;
    const dune = new THREE.Mesh(DUNE_GEO, duneMat()); dune.scale.set(s * 1.3, s * 0.32, s * 0.9); dune.position.set(x, 0, z); dune.rotation.y = rnd() * 3;
    dune.receiveShadow = true; dune.castShadow = true; dune.userData.keep = true; g.add(dune);
    Z.colliders.push({ x, z, r: s * 0.8 });
  }
  for (let i = 0; i < 16; i++) {
    const x = (rnd() - 0.5) * 56, z = (rnd() - 0.5) * 56; if (Math.hypot(x, z) > 28 || Math.hypot(x, z - 24) < 5) continue;
    if (Z.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 1)) continue;
    if (i % 2) { tree(g, '', x, z, 0.7 + rnd() * 0.5, 'cactus'); Z.colliders.push({ x, z, r: 0.5 }); }
    else { rock(g, x, z, 0.6 + rnd() * 0.8, '#c98a5a'); Z.colliders.push({ x, z, r: 0.9 }); }
  }
  // 오아시스
  water(Z, pondGeo(3.4), '#43b4d0', 8, 0.07, 6, 0.9, 0.04);
  tree(g, '', 11.5, 4.5, 0.9, 'palm'); Z.colliders.push({ x: 11.5, z: 4.5, r: 0.5 });
  tree(g, '', 5, 9, 0.8, 'palm'); Z.colliders.push({ x: 5, z: 9, r: 0.5 });
  Z.wet = (x, z) => Math.hypot(x - 8, z - 6) < 3.3;   // 오아시스: 걸으면 느릿느릿, 점프하면 빨리
  rim(g, Z.radius, ['#e0b878', '#d0a060', '#c98a5a'], 3.5, 6);
  // 먼 배경: 모래 언덕 → 붉은 메사(탁자 바위산) → 먼 산
  silhouettes(Z, [
    { kind: 'hill', r: 55, dr: 12, n: 24, h: [4, 9], w: [16, 26], color: '#e4b77c' },
    { kind: 'mesa', r: 90, dr: 25, n: 14, h: [16, 30], w: [14, 26], color: '#d0814e' },
    { kind: 'mountain', r: 165, dr: 30, n: 14, h: [35, 55], w: [45, 70], color: '#e9b48a' },
  ], 61);
  const dflock = birds(Z, 5, '#6a4a3a');
  Z.update = (t) => { const fa = t * 0.06; dflock.g.position.set(Math.cos(fa) * 40, 30, Math.sin(fa) * 40); dflock.g.rotation.y = -fa; dflock.list.forEach(({ w, ph }) => w.forEach(([j, sx]) => { j.rotation.z = sx * Math.sin(t * 5 + ph) * 0.5; })); };
  Z.place = placer(Z);
  return Z;
}

// ================== 바닷가 ==================
// 앞쪽(z > 0)은 모래밭, 뒤쪽(z < -2)은 얕은 바다. 물고기는 바다 쪽에서 헤엄쳐요
function beach() {
  const g = new THREE.Group();
  const Z = { group: g, radius: 30, colliders: [], spots: [], sky: '#a8e0ff', fog: ['#c8ecff', 30, 80], spawn: { x: 0, z: 20, yaw: Math.PI }, waterLevel: 1.6 };
  ground(g, '#f1d59b', Z.radius);
  const bedTex = groundTex('seabed').clone(); bedTex.needsUpdate = true; bedTex.repeat.set(20, 10);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.MeshStandardMaterial({ map: bedTex, roughness: 1 })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.02, -22); sea.userData.keep = true; sea.receiveShadow = true; g.add(sea);
  Z.water = water(Z, new THREE.PlaneGeometry(80, 42, 56, 30), '#2f9ed6', 0, 1.6, -23, 0.55, 0.12);
  Z.wet = (x, z) => z < -2.5;   // 얕은 바다
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(80, 0.6), mat('#ffffff', 0, 0.8)); foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.06, -2); g.add(foam);
  Z.foam = foam;
  const rnd = mulberry(51);
  for (const [x, z] of [[-14, 10], [15, 8], [-20, 2], [20, -1], [8, 16]]) { tree(g, '', x, z, 0.9 + rnd() * 0.3, 'palm'); Z.colliders.push({ x, z, r: 0.5 }); }
  for (let i = 0; i < 10; i++) { const x = (rnd() - 0.5) * 50, z = -4 - rnd() * 22; if (Math.hypot(x, z) > 27) continue; rock(g, x, z, 0.6 + rnd(), '#8a9a9a'); }
  for (let i = 0; i < 18; i++) { const x = (rnd() - 0.5) * 50, z = -6 - rnd() * 20; if (Math.hypot(x, z) > 27) continue; for (let k = 0; k < 4; k++) blob(g, i % 2 ? '#3f9a5a' : '#5ab86a', ICO0, 0.1, 0.32, 0.1, x + Math.sin(k) * 0.12, 0.3 + k * 0.42, z, k); }
  for (let i = 0; i < 30; i++) { const x = (rnd() - 0.5) * 50, z = rnd() * 22; if (Math.hypot(x, z) > 27) continue; blob(g, i % 2 ? '#ff9e7a' : '#fff1de', ICO0, 0.12, 0.06, 0.1, x, 0.04, z, i); }
  // 파라솔
  add(g, new THREE.CylinderGeometry(0.05, 0.05, 2.7, 8), '#ffffff', -5, 1.35, 9);
  for (let i = 0; i < 8; i++) { const seg = add(g, new THREE.ConeGeometry(1.6, 0.6, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4), i % 2 ? '#ffffff' : '#ff6b8a', -5, 2.75, 9); seg.material = new THREE.MeshStandardMaterial({ color: i % 2 ? '#ffffff' : '#ff6b8a', side: THREE.DoubleSide, roughness: 0.8 }); }
  const towel = box(g, '#4fb3ff', 1.1, 0.04, 2.0, -3.3, 0.04, 9.6); towel.rotation.y = 0.2;
  for (let i = 0; i < 4; i++) box(g, '#ffffff', 1.12, 0.045, 0.18, -3.3, 0.045, 8.9 + i * 0.45).rotation.y = 0.2;
  Z.colliders.push({ x: -5, z: 9, r: 0.3 });
  rim(g, Z.radius, ['#d0b880', '#9aa8a8'], 2.5, 7);
  // 먼 배경: 수평선까지 이어지는 바다 + 초록 섬들 (바다 쪽만)
  { const ocean = new THREE.Mesh(new THREE.CircleGeometry(280, 64, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#2f97d4', roughness: 0.2, metalness: 0.1 }));
    ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, 1.55, -35); ocean.userData.keep = true; g.add(ocean); }
  silhouettes(Z, [
    { kind: 'island', r: 85, dr: 40, n: 9, h: [6, 14], w: [14, 26], color: '#5f9a6c', skip: (a) => Math.sin(a) > -0.25 },
    { kind: 'mountain', r: 170, dr: 30, n: 10, h: [25, 45], w: [40, 60], color: '#9cc7d8', skip: (a) => Math.sin(a) > -0.3 },
    { kind: 'hill', r: 60, dr: 15, n: 14, h: [5, 10], w: [14, 22], color: '#6fa772', skip: (a) => Math.sin(a) < 0.2 },
  ], 71);
  Z.okFor = (kind, x, z) => (kind === 'water' ? z < -6 : z > 1);
  Z.place = placer(Z);
  return Z;
}

// ================== 깊은 바다 ==================
function deep() {
  const g = new THREE.Group();
  const Z = { group: g, radius: 26, colliders: [], spots: [], sky: '#0b2340', fog: ['#0b2340', 6, 32], spawn: { x: 0, z: 18, yaw: Math.PI }, dark: true };
  ground(g, '#2a3a52', Z.radius);
  const rnd = mulberry(61);
  for (let i = 0; i < 14; i++) {
    const a = rnd() * 6.28, d = 6 + rnd() * 18, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.hypot(x, z - 18) < 5) continue;
    rock(g, x, z, 1 + rnd() * 1.4, i % 2 ? '#3a4a62' : '#45506a'); Z.colliders.push({ x, z, r: 1.4 });
  }
  for (let i = 0; i < 30; i++) {
    const x = (rnd() - 0.5) * 48, z = (rnd() - 0.5) * 48; if (Math.hypot(x, z) > 24 || Math.hypot(x, z - 18) < 3) continue;
    const h = 2 + rnd() * 4;
    for (let k = 0; k < 5; k++) box(g, k % 2 ? '#2f6a5a' : '#3f8a6a', 0.18, h / 5, 0.18, x + Math.sin(k) * 0.12, h / 10 + k * h / 5, z);
  }
  // 빛나는 산호 · 해파리 점
  for (let i = 0; i < 18; i++) {
    const x = (rnd() - 0.5) * 44, z = (rnd() - 0.5) * 44; if (Math.hypot(x, z) > 23) continue;
    box(g, ['#7df9ff', '#ff7ae0', '#b38bff'][i % 3], 0.25, 0.25, 0.25, x, 0.15, z, 1.2);
  }
  // 떠다니는 알갱이
  const pts = new Float32Array(300 * 3);
  for (let i = 0; i < 300; i++) { pts[i * 3] = (rnd() - 0.5) * 50; pts[i * 3 + 1] = rnd() * 10; pts[i * 3 + 2] = (rnd() - 0.5) * 50; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const snow = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#cfe8ff', size: 0.08, transparent: true, opacity: 0.7 }));
  g.add(snow); Z.snow = snow;
  rim(g, Z.radius, ['#2a3a52', '#344560'], 5, 8);
  Z.okFor = () => true;
  Z.place = placer(Z);
  return Z;
}

// ---------- 장소 분위기: 하늘 · 해 · 안개 · 빛 (탐험하러 나가면 넓고 웅장하게) ----------
// sun: 해가 있는 쪽 (가로 각도 az · 높이 el, 도). 낮은 해 = 긴 그림자 · 노을빛
export const ATMO = {
  station: { top: '#5fa8e6', horizon: '#dff1fb', fog: ['#dceff8', 40, 230], sun: { az: 35, el: 52, color: '#fff1d6', i: 2.6, disc: '#fff7dc', size: 60 }, hemi: ['#f4f8ff', '#9a8a68', 0.9], exp: 0.92 },
  savanna: { top: '#d9714a', horizon: '#ffcf7a', fog: ['#f6bf78', 45, 250], sun: { az: -25, el: 16, color: '#ffb35a', i: 2.8, disc: '#fff0b0', size: 150 }, hemi: ['#ffd9a8', '#8a5a34', 1.05], exp: 1.0 },
  desert: { top: '#3f8fd8', horizon: '#ffe0aa', fog: ['#f7d9a8', 50, 250], sun: { az: 40, el: 34, color: '#ffe0b0', i: 2.8, disc: '#fff6d6', size: 80 }, hemi: ['#fff1d8', '#b07a4a', 0.95], exp: 0.95 },
  jungle: { top: '#5fa9a4', horizon: '#d6efcf', fog: ['#c3e2c4', 22, 140], sun: { az: 60, el: 40, color: '#fff3c8', i: 2.2, disc: '#fffbe6', size: 70 }, hemi: ['#e6fbe8', '#4a6a3a', 1.0], exp: 0.95 },
  beach: { top: '#2c8de0', horizon: '#c9efff', fog: ['#cdeeff', 50, 260], sun: { az: 20, el: 45, color: '#fff4dc', i: 2.7, disc: '#ffffff', size: 70 }, hemi: ['#f2fbff', '#c9a874', 0.95], exp: 0.95 },
  deep: { top: '#061428', horizon: '#0d2a4c', fog: ['#0d2a4c', 10, 46], sun: { az: 0, el: 70, color: '#9fc8ff', i: 0.6, disc: '#000000', size: 0 }, hemi: ['#8ab8ff', '#16304e', 1.0], exp: 1.0, dark: true },
};

// ---------- 먼 배경: 겹겹이 산 · 메사 · 숲 실루엣 (빛 없이 색으로만, 멀수록 하늘에 녹아들게) ----------
const BACK_MAT = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
function silhouettes(Z, layers, seed = 9) {
  const rnd = mulberry(seed), geos = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const put = (geo, x, y, z, sx, sy, sz, ry, color) => {
    let g2 = geo.clone(); m4.compose(v.set(x, y, z), q.setFromEuler(e.set(0, ry, 0)), sc.set(sx, sy, sz)); g2.applyMatrix4(m4);
    if (g2.index) g2 = g2.toNonIndexed();
    for (const k of Object.keys(g2.attributes)) if (k !== 'position') g2.deleteAttribute(k);
    const c = new THREE.Color(color), n = g2.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const y0 = g2.attributes.position.getY(i); const k = Math.max(0, Math.min(1, y0 / (sy * 2 + 1))); const cc = c.clone().offsetHSL(0, 0, k * 0.05); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; }
    g2.setAttribute('color', new THREE.BufferAttribute(col, 3)); geos.push(g2);
  };
  for (const L of layers) {
    for (let i = 0; i < L.n; i++) {
      const a = (i / L.n) * Math.PI * 2 + rnd() * 0.2, r = L.r + rnd() * (L.dr || 10), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (L.skip?.(a)) continue;
      const h = L.h[0] + rnd() * (L.h[1] - L.h[0]), w = L.w[0] + rnd() * (L.w[1] - L.w[0]);
      const col = new THREE.Color(L.color).offsetHSL(0, 0, (rnd() - 0.5) * 0.04).getStyle();
      if (L.kind === 'mountain') put(CONE6, x, 0, z, w, h, w * (0.7 + rnd() * 0.5), rnd() * 6, col);
      else if (L.kind === 'hill') put(ICO, x, 0, z, w, h, w * 0.8, rnd() * 6, col);
      else if (L.kind === 'mesa') put(MESA, x, 0, z, w, h, w * (0.6 + rnd() * 0.6), rnd() * 6, col);
      else if (L.kind === 'acacia') { put(CYL, x, h * 0.45, z, 1.1, h * 0.9, 1.1, 0, col); put(CYL, x + w * 0.25, h * 0.75, z, 0.7, h * 0.4, 0.7, 0, col); put(ICO, x, h, z, w, h * 0.1, w * 0.7, rnd() * 6, col); }
      else if (L.kind === 'canopy') { put(CYL, x, h * 0.4, z, 1.2, h * 0.8, 1.2, 0, col); put(ICO, x, h * 0.9, z, w, h * 0.35, w, rnd() * 6, col); }
      else if (L.kind === 'island') { put(ICO, x, -1, z, w, h, w * 0.7, rnd() * 6, col); put(CYL, x + 2, h, z, 0.5, h * 0.8, 0.5, 0, col); put(ICO0, x + 2, h * 1.45, z, 3, 0.6, 3, 0, col); }
    }
  }
  const merged = mergeGeometries(geos);
  geos.forEach((g2) => g2.dispose());
  const mesh = new THREE.Mesh(merged, BACK_MAT);
  mesh.userData.keep = true; mesh.frustumCulled = false;
  Z.group.add(mesh);
}
const CONE6 = (() => { const g2 = new THREE.ConeGeometry(1, 1, 6, 1); g2.translate(0, 0.5, 0); return g2; })();
const MESA = (() => { const g2 = new THREE.CylinderGeometry(0.8, 1, 1, 7, 1); g2.translate(0, 0.5, 0); return g2; })();

// 초원 멀리 천천히 걷는 코끼리 · 기린 무리, 하늘을 나는 새 떼 (그림자처럼 짙은 색)
function herd(Z, center, n, kind, col) {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: col, fog: true });
  const animals = [];
  for (let i = 0; i < n; i++) {
    const a = new THREE.Group(); a.position.set((i - n / 2) * 5 + Math.random() * 2, 0, Math.random() * 4); g.add(a);
    const B = (w, h, d, x, y, z, rx = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.x = rx; a.add(b); return b; };
    const s = kind === 'elephant' ? (i % 3 === 2 ? 0.6 : 1) : 1;
    a.scale.setScalar(s);
    if (kind === 'elephant') {
      B(2.4, 1.8, 3.4, 0, 2.6, 0); B(1.6, 1.5, 1.4, 0, 3.0, 2.2); B(0.45, 1.8, 0.45, 0, 1.9, 3.0, 0.2);
      for (const sx of [-1, 1]) B(0.15, 1.2, 1.0, sx * 0.85, 3.1, 1.9);
      for (const [lx, lz] of [[-0.7, 1.1], [0.7, 1.1], [-0.7, -1.1], [0.7, -1.1]]) B(0.6, 1.8, 0.6, lx, 0.9, lz);
    } else {
      B(1.2, 1.1, 2.2, 0, 2.6, 0); B(0.4, 2.6, 0.4, 0, 4.2, 1.1, -0.35); B(0.5, 0.45, 0.8, 0, 5.4, 1.65);
      for (const [lx, lz] of [[-0.4, 0.8], [0.4, 0.8], [-0.4, -0.8], [0.4, -0.8]]) B(0.22, 2.1, 0.22, lx, 1.05, lz);
    }
    animals.push(a);
  }
  g.traverse((o) => { o.userData.keep = true; });
  Z.group.add(g);
  return { g, animals, center, ang: Math.random() * 6, r: center.r, speed: kind === 'elephant' ? 0.012 : 0.016 };
}
function birds(Z, n, col) {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: col, fog: false, side: THREE.DoubleSide });
  const list = [];
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group(), w = [-1, 1].map((sx) => { const wing = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), m); wing.position.x = sx * 0.6; const j = new THREE.Group(); j.add(wing); b.add(j); return [j, sx]; });
    b.position.set((i % 5) * 2.2 - (i % 2) * 1.5, Math.floor(i / 5) * 1.2, -Math.abs(i % 5 - 2) * 2); g.add(b); list.push({ b, w, ph: i * 0.7 });
  }
  g.traverse((o) => { o.userData.keep = true; });
  Z.group.add(g);
  return { g, list };
}

const BUILDERS = { station, jungle, savanna, desert, beach, deep };
const cache = {};
export function getZone(id) {
  if (!cache[id]) {
    const Z = BUILDERS[id]();
    grassField(Z);
    bake(Z.group);
    // 카메라가 부딪힐 것: 합쳐 그린 건물 · 나무 · 바위 (풀 · 물 · 땅 · 먼 배경은 빼고)
    Z.camHits = Z.group.children.filter((o) => o.isMesh && !o.isInstancedMesh && o.castShadow && !o.userData.keep);
    cache[id] = Z;
  }
  return cache[id];
}

// 움직일 수 있는지: 반지름 밖 · 장애물 안이면 밀어내요
export function collide(Z, p, r = 0.35) {
  const d = Math.hypot(p.x, p.z);
  if (d > Z.radius - r) { p.x *= (Z.radius - r) / d; p.z *= (Z.radius - r) / d; }
  for (const c of Z.colliders) {
    if (c.w) {
      const hx = c.w / 2 + r, hz = c.d / 2 + r;
      const dx = p.x - c.x, dz = p.z - c.z;
      if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
        if (hx - Math.abs(dx) < hz - Math.abs(dz)) p.x = c.x + Math.sign(dx) * hx; else p.z = c.z + Math.sign(dz) * hz;
      }
      continue;
    }
    const dx = p.x - c.x, dz = p.z - c.z, dd = Math.hypot(dx, dz), m = c.r + r;
    if (dd < m && dd > 1e-4) { p.x = c.x + dx / dd * m; p.z = c.z + dz / dd * m; }
  }
}
