// 장소 만들기: 정거장 대기실 · 정글 · 초원 · 사막 · 바닷가 · 깊은 바다
// 장소마다 { group, radius, colliders, spots, sky, fog, spawn, place(kind) } 를 돌려줘요.
// 움직이지 않는 풍경 상자는 bake() 로 한 덩어리(정점 색)로 합쳐서 휴대폰에서도 가볍게 그려요.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, mat, mulberry } from './animals.js';

const BAKED = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
const joint = (p, x = 0, y = 0, z = 0) => { const o = new THREE.Group(); o.position.set(x, y, z); p.add(o); return o; };
const add = (p, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, typeof m === 'string' ? mat(m) : m); o.position.set(x, y, z); p.add(o); return o; };

// 그룹 안의 불투명 · 빛나지 않는 상자들을 메시 하나로 합쳐요 (관절별로)
export function bake(root, deep = true) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const parts = [];
  root.traverse((o) => {
    if (!o.isMesh || o === root) return;
    if (!deep && o.parent !== root) return;
    const m = o.material;
    if (Array.isArray(m) || m.map) return;   // 얼굴 그림 · 무늬 천은 따로 그려요
    if (m.transparent || m.vertexColors || (m.emissive && m.emissiveIntensity > 0 && m.emissive.getHex() !== 0) || o.userData.keep) return;
    if (!o.geometry.index && !o.geometry.attributes.position) return;
    parts.push(o);
  });
  if (parts.length < 2) return;
  const geos = parts.map((o) => {
    const g = o.geometry.clone();
    const mtx = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(mtx);
    const c = o.material.color, n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    return g.index ? g.toNonIndexed() : g;
  });
  const merged = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  if (!merged) return;
  parts.forEach((o) => o.parent.remove(o));
  const baked = new THREE.Mesh(merged, BAKED);
  baked.castShadow = true; baked.receiveShadow = true;
  root.add(baked);
}

// 움직이는 동물 · 사람은 관절(그룹)마다 따로 합쳐요
export function bakeJoints(root) {
  const groups = [];
  root.traverse((o) => { if (o.isGroup || o === root) groups.push(o); });
  groups.forEach((g) => bake(g, false));
}

function ground(g, color, r) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r + 40, 48), mat(color));
  m.rotation.x = -Math.PI / 2;
  m.userData.keep = true; m.receiveShadow = true;
  g.add(m);
  return m;
}
// 가장자리를 둘러싸는 낮은 언덕 · 바위 (넘어가지 못하는 곳이 보이게)
function rim(g, r, colors, h = 2.2, seed = 1) {
  const rnd = mulberry(seed);
  const n = Math.round(r * 1.4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, rr = r + 1.5 + rnd() * 2;
    const s = 2 + rnd() * 2.5;
    box(g, colors[i % colors.length], s, h * (0.6 + rnd() * 0.8), s, Math.cos(a) * rr, h * 0.3, Math.sin(a) * rr).rotation.y = rnd() * 3;
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

function tree(g, col, x, z, s = 1, kind = 'round', rnd = Math.random) {
  if (kind === 'jungle') {
    box(g, '#7a5532', 0.5 * s, 5 * s, 0.5 * s, x, 2.5 * s, z);
    box(g, '#2f8a3e', 3.2 * s, 1.2 * s, 3.2 * s, x, 5.2 * s, z);
    box(g, '#3fa04c', 2.2 * s, 1 * s, 2.2 * s, x + 0.3 * s, 6 * s, z - 0.2 * s);
    box(g, '#2f8a3e', 1.6 * s, 0.8 * s, 1.6 * s, x - 0.9 * s, 4.3 * s, z + 0.8 * s);
    if (rnd() < 0.6) box(g, '#4fae3e', 0.1, 3 * s, 0.1, x + 1.2 * s, 3.4 * s, z + 0.4 * s);
  } else if (kind === 'acacia') {
    box(g, '#6a4a2a', 0.35 * s, 3 * s, 0.35 * s, x, 1.5 * s, z);
    box(g, '#6a4a2a', 0.25 * s, 1.4 * s, 0.25 * s, x + 0.5 * s, 3 * s, z).rotation.z = -0.6;
    box(g, '#7f9a3e', 4.2 * s, 0.5 * s, 3.4 * s, x + 0.4 * s, 3.6 * s, z);
    box(g, '#93ad4a', 3 * s, 0.35 * s, 2.4 * s, x + 0.4 * s, 3.95 * s, z);
  } else if (kind === 'palm') {
    for (let i = 0; i < 5; i++) box(g, i % 2 ? '#a8804a' : '#94703e', 0.4 * s, 0.9 * s, 0.4 * s, x + i * 0.12 * s, 0.45 * s + i * 0.88 * s, z);
    const tx = x + 0.6 * s, ty = 4.6 * s;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const leaf = box(g, i % 2 ? '#3fa04c' : '#55b85a', 2.4 * s, 0.12 * s, 0.6 * s, tx + Math.cos(a) * 1.1 * s, ty - 0.2 * s, z + Math.sin(a) * 1.1 * s);
      leaf.rotation.y = -a; leaf.rotation.z = 0.35;
    }
    box(g, '#7a5532', 0.3 * s, 0.3 * s, 0.3 * s, tx, ty - 0.3 * s, z + 0.2 * s);
  } else if (kind === 'cactus') {
    box(g, '#4f9a52', 0.6 * s, 2.6 * s, 0.6 * s, x, 1.3 * s, z);
    box(g, '#4f9a52', 0.8 * s, 0.4 * s, 0.4 * s, x - 0.6 * s, 1.2 * s, z);
    box(g, '#4f9a52', 0.4 * s, 1 * s, 0.4 * s, x - 0.9 * s, 1.8 * s, z);
    box(g, '#4f9a52', 0.7 * s, 0.4 * s, 0.4 * s, x + 0.55 * s, 1.7 * s, z);
    box(g, '#4f9a52', 0.4 * s, 0.8 * s, 0.4 * s, x + 0.8 * s, 2.1 * s, z);
    box(g, '#ff8fb0', 0.25 * s, 0.2 * s, 0.25 * s, x, 2.7 * s, z);
  } else {
    box(g, '#7a5532', 0.4 * s, 2 * s, 0.4 * s, x, 1 * s, z);
    box(g, col, 2 * s, 1.8 * s, 2 * s, x, 2.6 * s, z);
  }
}
function rock(g, x, z, s, col = '#9a9a92') {
  box(g, col, 1.4 * s, 0.9 * s, 1.2 * s, x, 0.4 * s, z).rotation.y = x * 7;
  box(g, col, 0.8 * s, 0.6 * s, 0.8 * s, x + 0.5 * s, 0.7 * s, z - 0.2 * s).rotation.y = z * 3;
}
function tuft(g, x, z, col) {
  for (let i = 0; i < 3; i++) box(g, col, 0.08, 0.5 + i * 0.12, 0.08, x + (i - 1) * 0.12, 0.25, z).rotation.z = (i - 1) * 0.3;
}
function flower(g, x, z, col) {
  box(g, '#4f9a52', 0.05, 0.3, 0.05, x, 0.15, z);
  box(g, col, 0.18, 0.12, 0.18, x, 0.32, z);
  box(g, '#ffd23c', 0.08, 0.13, 0.08, x, 0.32, z);
}
// 글자 판 (캔버스 글씨)
function sign(text, w, h, bg = '#fffdf6', ink = '#24342b', size = 64) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = ink; x.lineWidth = 12; x.strokeRect(6, 6, c.width - 12, c.height - 12);
  x.fillStyle = ink; x.font = `${size}px Jua, "Apple SD Gothic Neo", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, c.width / 2, c.height / 2 + 4);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
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
  disc(0, Z.radius, '#d9c49a', 0.02);
  [[3.2, 3.6], [6.4, 6.9], [10.2, 10.8], [14.2, 14.8]].forEach(([r0, r1]) => disc(r0, r1, '#b89a6a', 0.025));
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const t = box(g, '#c9b084', 0.3, 0.012, 13.4, Math.cos(a) * 9.7, 0.028, Math.sin(a) * 9.7); t.rotation.y = -a + Math.PI / 2; }

  // 분수 (가운데)
  const f = joint(g, 0, 0, -1);
  add(f, new THREE.CylinderGeometry(2.5, 2.6, 0.55, 40), '#d9d2c3', 0, 0.28, 0);
  add(f, new THREE.CylinderGeometry(2.25, 2.25, 0.08, 40), '#6fc3e8', 0, 0.5, 0);
  add(f, new THREE.CylinderGeometry(0.3, 0.38, 1.3, 20), '#cfc6b4', 0, 1.0, 0);
  add(f, new THREE.CylinderGeometry(0.95, 0.5, 0.32, 28), '#d9d2c3', 0, 1.7, 0);
  add(f, new THREE.CylinderGeometry(0.85, 0.85, 0.05, 28), '#8fd6f0', 0, 1.85, 0);
  add(f, new THREE.SphereGeometry(0.22, 16, 12), '#8fd6f0', 0, 2.05, 0);
  const drops = [];
  for (let i = 0; i < 14; i++) { const d = add(f, new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshLambertMaterial({ color: '#cdeefb', transparent: true, opacity: 0.9 }), 0, 2, 0); d.userData.keep = true; drops.push({ d, a: (i / 14) * Math.PI * 2, o: i / 14 }); }
  Z.colliders.push({ x: 0, z: -1, r: 2.7 });
  Z.update = (t) => drops.forEach(({ d, a, o }) => { const k = (t * 0.7 + o) % 1; const r = 0.3 + k * 1.6; d.position.set(Math.cos(a) * r, 2.05 + Math.sin(k * Math.PI) * 0.7 - k * 1.5, Math.sin(a) * r); });

  // 뒤쪽 정거장 건물
  const st = joint(g, 0, 0, -15.5);
  box(st, '#fff6e6', 18, 4.5, 2, 0, 2.25, 0);
  box(st, '#ff7a5c', 19, 0.8, 3, 0, 4.9, 0.3);
  box(st, '#ffd23c', 19, 0.25, 3.1, 0, 4.4, 0.3);
  for (let i = -3; i <= 3; i++) { box(st, '#8fd3e8', 1.6, 1.6, 0.1, i * 2.4, 2.6, 1.01); box(st, '#ffffff', 1.7, 0.15, 0.12, i * 2.4, 1.75, 1.02); }
  const title = sign('동물 왕국 정거장', 7, 1.2, '#3f8f5a', '#fffdf6', 76); title.position.set(0, 6.1, 0.9); st.add(title);
  Z.colliders.push({ x: 0, z: -15.5, r: 0, w: 18, d: 3 });

  // 매표소 (뒤쪽 가운데)
  const bo = joint(g, 0, 0, -9);
  box(bo, '#ff9f6a', 3.4, 2.6, 2, 0, 1.3, 0);
  box(bo, '#fffdf6', 2.4, 1, 0.1, 0, 1.6, 1.01);
  box(bo, '#5a3a24', 3.6, 0.15, 0.6, 0, 1.05, 1.2);
  box(bo, '#ffd23c', 3.8, 0.4, 2.4, 0, 2.8, 0.1);
  for (let i = 0; i < 5; i++) box(bo, i % 2 ? '#ff6b8a' : '#fffdf6', 0.76, 0.5, 0.2, -1.52 + i * 0.76, 2.4, 1.25);
  const bt = sign('🎫 매표소', 2.4, 0.8, '#fffdf6', '#24342b', 110); bt.position.set(0, 3.5, 0.5); bo.add(bt);
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
  const water = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), mat('#5bbbe0', 0, 0.85));
  water.rotation.x = -Math.PI / 2; water.position.set(21, 0.08, -3); g.add(water);
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
  const cone = joint(ic, 0, 2.7, 0);
  add(cone, new THREE.ConeGeometry(0.55, 1.4, 16), '#e0a45a', 0, 0.75, 0).rotation.x = Math.PI;
  add(cone, new THREE.SphereGeometry(0.62, 18, 14), '#ffb3c7', 0, 1.65, 0);
  add(cone, new THREE.SphereGeometry(0.5, 18, 14), '#a8ecd0', 0, 2.2, 0);
  add(cone, new THREE.SphereGeometry(0.12, 10, 8), '#e23b52', 0.05, 2.75, 0);
  const ics = sign('🍦 아이스크림', 2.6, 0.7, '#ffffff', '#c2185b', 100); ics.position.set(0, 2.15, 1.13); ic.add(ics);
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
  const shs = sign('🛒 상점', 2.2, 0.7, '#3f8f5a', '#fffdf6', 110); shs.position.set(0, 2.1, 1.23); sh.add(shs);
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
    box(g, '#fff3c0', 0.36, 0.42, 0.36, x, 3.72, z, 0.6);
    box(g, '#3b4a5a', 0.46, 0.08, 0.46, x, 3.97, z);
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
      const fl = box(g, flagCols[(i + k) % 5], 0.36, 0.42, 0.03, x, y - 0.22, z);
      fl.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      fl.rotation.z = Math.PI / 4; fl.scale.set(0.24, 0.24, 0.03);
    }
  }

  // 꽃밭 · 나무 화분
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3, x = Math.cos(a) * 15.6, z = Math.sin(a) * 15.6 + 1;
    if (z < -12 || (Math.abs(x) > 11 && z < 1 && z > -7)) continue;
    box(g, '#a87a4a', 2.2, 0.4, 1.0, x, 0.2, z).rotation.y = -a;
    for (let k = 0; k < 5; k++) flower(g, x + Math.cos(-a + Math.PI / 2) * (k - 2) * 0.38, z + Math.sin(-a + Math.PI / 2) * (k - 2) * 0.38, flagCols[(i + k) % 5]);
    Z.colliders.push({ x, z, r: 0.9 });
  }
  for (const [x, z] of [[-6, -11.8], [6, -11.8], [-15, 9], [15, 9], [0, 15.5]]) { box(g, '#c9844a', 1.2, 0.6, 1.2, x, 0.3, z); tree(g, '#4fae5a', x, z, 0.8); Z.colliders.push({ x, z, r: 0.7 }); }
  for (let i = 0; i < 30; i++) { const a = rnd() * 6.28, d = 17.5 + rnd() * 4; flower(g, Math.cos(a) * d, Math.sin(a) * d, flagCols[i % 5]); }
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
  Z.water = water;
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
    const s = 0.5 + rnd() * 0.7; box(g, i % 2 ? '#3f8f45' : '#5bb35a', 1.2 * s, 0.7 * s, 1.2 * s, x, 0.35 * s, z);
    if (i % 3 === 0) flower(g, x + 0.8, z, ['#ff6b8a', '#ffd23c', '#c77dff'][i % 3]);
  }
  // 작은 개울
  const river = new THREE.Mesh(new THREE.PlaneGeometry(4, 60), mat('#5bbbe0', 0, 0.8)); river.rotation.set(-Math.PI / 2, 0, 0.5); river.position.set(-6, 0.04, 0); g.add(river);
  rim(g, Z.radius, ['#2f7a3e', '#3f8f45', '#26693a'], 4, 4);
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
  box(g, '#b07a4a', 1.4, 2.4, 1.4, 10, 1.2, -8); box(g, '#b07a4a', 0.8, 1.2, 0.8, 10.2, 2.8, -8); Z.colliders.push({ x: 10, z: -8, r: 1 });
  const pond = new THREE.Mesh(new THREE.CircleGeometry(4, 20), mat('#6cc3e0', 0, 0.85)); pond.rotation.x = -Math.PI / 2; pond.position.set(-9, 0.05, -6); g.add(pond);
  rim(g, Z.radius, ['#c9a46a', '#b8945a'], 2.5, 5);
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
    const dune = box(g, '#f2d9a4', s * 2.2, s * 0.3, s * 1.5, x, 0, z); dune.rotation.y = rnd() * 3;
    box(g, '#e6c88a', s * 1.4, s * 0.3, s, x, s * 0.08, z).rotation.y = dune.rotation.y;
    Z.colliders.push({ x, z, r: s * 0.8 });
  }
  for (let i = 0; i < 16; i++) {
    const x = (rnd() - 0.5) * 56, z = (rnd() - 0.5) * 56; if (Math.hypot(x, z) > 28 || Math.hypot(x, z - 24) < 5) continue;
    if (Z.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 1)) continue;
    if (i % 2) { tree(g, '', x, z, 0.7 + rnd() * 0.5, 'cactus'); Z.colliders.push({ x, z, r: 0.5 }); }
    else { rock(g, x, z, 0.6 + rnd() * 0.8, '#c98a5a'); Z.colliders.push({ x, z, r: 0.9 }); }
  }
  // 오아시스
  const pond = new THREE.Mesh(new THREE.CircleGeometry(3.4, 20), mat('#5bc0d8', 0, 0.85)); pond.rotation.x = -Math.PI / 2; pond.position.set(8, 0.05, 6); g.add(pond);
  tree(g, '', 11.5, 4.5, 0.9, 'palm'); Z.colliders.push({ x: 11.5, z: 4.5, r: 0.5 });
  tree(g, '', 5, 9, 0.8, 'palm'); Z.colliders.push({ x: 5, z: 9, r: 0.5 });
  Z.colliders.push({ x: 8, z: 6, r: 3 });
  rim(g, Z.radius, ['#e0b878', '#d0a060', '#c98a5a'], 3.5, 6);
  Z.place = placer(Z);
  return Z;
}

// ================== 바닷가 ==================
// 앞쪽(z > 0)은 모래밭, 뒤쪽(z < -2)은 얕은 바다. 물고기는 바다 쪽에서 헤엄쳐요
function beach() {
  const g = new THREE.Group();
  const Z = { group: g, radius: 30, colliders: [], spots: [], sky: '#a8e0ff', fog: ['#c8ecff', 30, 80], spawn: { x: 0, z: 20, yaw: Math.PI }, waterLevel: 1.6 };
  ground(g, '#f1d59b', Z.radius);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), mat('#d9c48a')); sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.02, -22); sea.userData.keep = true; g.add(sea);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(80, 42), mat('#4fb3e0', 0, 0.45)); water.rotation.x = -Math.PI / 2; water.position.set(0, 1.6, -23); g.add(water);
  Z.water = water;
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(80, 0.6), mat('#ffffff', 0, 0.8)); foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.06, -2); g.add(foam);
  Z.foam = foam;
  const rnd = mulberry(51);
  for (const [x, z] of [[-14, 10], [15, 8], [-20, 2], [20, -1], [8, 16]]) { tree(g, '', x, z, 0.9 + rnd() * 0.3, 'palm'); Z.colliders.push({ x, z, r: 0.5 }); }
  for (let i = 0; i < 10; i++) { const x = (rnd() - 0.5) * 50, z = -4 - rnd() * 22; if (Math.hypot(x, z) > 27) continue; rock(g, x, z, 0.6 + rnd(), '#8a9a9a'); }
  for (let i = 0; i < 18; i++) { const x = (rnd() - 0.5) * 50, z = -6 - rnd() * 20; if (Math.hypot(x, z) > 27) continue; for (let k = 0; k < 4; k++) box(g, i % 2 ? '#3f9a5a' : '#5ab86a', 0.12, 0.5, 0.12, x + k * 0.15, 0.25 + k * 0.4, z).rotation.z = Math.sin(k) * 0.3; }
  for (let i = 0; i < 30; i++) { const x = (rnd() - 0.5) * 50, z = rnd() * 22; if (Math.hypot(x, z) > 27) continue; box(g, i % 2 ? '#ff9e7a' : '#fff1de', 0.2, 0.06, 0.2, x, 0.05, z); }
  // 파라솔
  box(g, '#ffffff', 0.1, 2.6, 0.1, -5, 1.3, 9); box(g, '#ff6b8a', 3, 0.2, 3, -5, 2.6, 9); box(g, '#ffffff', 2, 0.25, 2, -5, 2.75, 9);
  box(g, '#4fb3ff', 1.2, 0.1, 2.2, -3.5, 0.1, 9.5);
  Z.colliders.push({ x: -5, z: 9, r: 0.3 });
  rim(g, Z.radius, ['#d0b880', '#9aa8a8'], 2.5, 7);
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

const BUILDERS = { station, jungle, savanna, desert, beach, deep };
const cache = {};
export function getZone(id) {
  if (!cache[id]) {
    const Z = BUILDERS[id]();
    // 상자 장애물은 반지름으로 바꿔 둬요 (정거장 건물 같은 긴 벽은 따로)
    bake(Z.group);
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
