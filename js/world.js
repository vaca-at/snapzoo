// 장소 만들기: 정거장 대기실 · 정글 · 초원 · 사막 · 바닷가 · 깊은 바다
// 장소마다 { group, radius, colliders, spots, sky, fog, spawn, place(kind) } 를 돌려줘요.
// 움직이지 않는 풍경 상자는 bake() 로 한 덩어리(정점 색)로 합쳐서 휴대폰에서도 가볍게 그려요.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, mat, mulberry } from './animals.js';

const BAKED = new THREE.MeshLambertMaterial({ vertexColors: true });

// 그룹 안의 불투명 · 빛나지 않는 상자들을 메시 하나로 합쳐요 (관절별로)
export function bake(root, deep = true) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const parts = [];
  root.traverse((o) => {
    if (!o.isMesh || o === root) return;
    if (!deep && o.parent !== root) return;
    const m = o.material;
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
  root.add(new THREE.Mesh(merged, BAKED));
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
  m.userData.keep = true;
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

// ================== 정거장 대기실 ==================
function station() {
  const g = new THREE.Group();
  const Z = { group: g, radius: 15, colliders: [], spots: [], benches: [], sky: '#bfe8f5', fog: ['#bfe8f5', 30, 70], spawn: { x: 0, z: 5, yaw: Math.PI } };
  ground(g, '#a8d68a', Z.radius);
  // 바닥 타일
  const floor = new THREE.Group(); g.add(floor);
  for (let i = -6; i <= 6; i++) for (let j = -6; j <= 5; j++) {
    if (Math.hypot(i * 2, j * 2) > 14) continue;
    box(floor, (i + j) % 2 ? '#f2e6c8' : '#e8d8b0', 1.96, 0.1, 1.96, i * 2, 0.05, j * 2);
  }
  // 뒤쪽 정거장 건물
  const st = new THREE.Group(); st.position.set(0, 0, -13); g.add(st);
  box(st, '#fff6e6', 18, 4.5, 2, 0, 2.25, 0);
  box(st, '#ff7a5c', 19, 0.8, 3, 0, 4.9, 0.3);
  box(st, '#ffd23c', 19, 0.25, 3.1, 0, 4.4, 0.3);
  for (let i = -3; i <= 3; i++) { box(st, '#8fd3e8', 1.6, 1.6, 0.1, i * 2.4, 2.6, 1.01); box(st, '#ffffff', 1.7, 0.15, 0.12, i * 2.4, 1.75, 1.02); }
  const title = sign('동물 왕국 정거장', 7, 1.2, '#3f8f5a', '#fffdf6', 76); title.position.set(0, 6.1, 0.9); st.add(title);
  Z.colliders.push({ x: 0, z: -13, r: 0, w: 18, d: 3 });
  // 왼쪽 버스 정류장
  const bus = new THREE.Group(); bus.position.set(-10, 0, -3); g.add(bus);
  box(bus, '#5a6b7a', 0.2, 3, 0.2, -1.4, 1.5, -1.2); box(bus, '#5a6b7a', 0.2, 3, 0.2, 1.4, 1.5, -1.2);
  box(bus, '#ffd23c', 3.4, 0.2, 1.8, 0, 3, -0.6);
  box(bus, '#8fd3e8', 3, 2.2, 0.1, 0, 1.6, -1.3, 0, 0.5);
  const bs = sign('🚌 버스', 2, 0.8, '#ffd23c', '#24342b', 120); bs.position.set(0, 3.6, 0); bus.add(bs);
  const busV = new THREE.Group(); busV.position.set(-3.2, 0, 1); busV.rotation.y = Math.PI / 2; bus.add(busV);
  vehicleBus(busV);
  Z.colliders.push({ x: -13.2, z: -2, r: 2.2 });
  Z.spots.push({ id: 'bus', x: -10, z: -2, r: 2.4, label: '🚌 버스 타기' });
  // 가운데 매표소
  const bo = new THREE.Group(); bo.position.set(0, 0, -6.5); g.add(bo);
  box(bo, '#ff9f6a', 3.4, 2.6, 2, 0, 1.3, 0);
  box(bo, '#fffdf6', 2.4, 1, 0.1, 0, 1.6, 1.01);
  box(bo, '#5a3a24', 3.6, 0.15, 0.6, 0, 1.05, 1.2);
  box(bo, '#ffd23c', 3.8, 0.4, 2.4, 0, 2.8, 0.1);
  for (let i = 0; i < 5; i++) box(bo, i % 2 ? '#ff6b8a' : '#fffdf6', 0.76, 0.5, 0.2, -1.52 + i * 0.76, 2.4, 1.25);
  const bt = sign('🎫 매표소', 2.4, 0.8, '#fffdf6', '#24342b', 110); bt.position.set(0, 3.5, 0.5); bo.add(bt);
  Z.colliders.push({ x: 0, z: -6.5, r: 1.9 });
  Z.spots.push({ id: 'booth', x: 0, z: -4.5, r: 1.8, label: '🎫 표 사기' });
  // 오른쪽 배 선착장
  const water = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), mat('#5bbbe0', 0, 0.85));
  water.rotation.x = -Math.PI / 2; water.position.set(17, 0.08, -3); g.add(water);
  const dock = new THREE.Group(); dock.position.set(11, 0, -3); g.add(dock);
  for (let i = 0; i < 6; i++) box(dock, i % 2 ? '#b88a5a' : '#a87a4a', 0.75, 0.25, 4, i * 0.8, 0.2, 0);
  for (const zz of [-1.8, 1.8]) box(dock, '#7a5532', 0.3, 1.2, 0.3, 4.6, 0.6, zz);
  const ds = sign('⛵ 배', 1.6, 0.8, '#4fb3ff', '#fffdf6', 120); ds.position.set(1.5, 2.6, -2.1); dock.add(ds);
  box(dock, '#7a5532', 0.15, 2.2, 0.15, 1.5, 1.1, -2.2);
  const boat = new THREE.Group(); boat.position.set(7.5, 0, 0); dock.add(boat); vehicleBoat(boat);
  Z.colliders.push({ x: 18.2, z: -3, w: 12, d: 12 });
  Z.spots.push({ id: 'boat', x: 11.5, z: -2.5, r: 2.4, label: '⛵ 배 타기' });
  // 쉬는 의자
  for (const [x, z, ry] of [[-6, 3.5, 0.5], [6, 3.5, -0.5], [-4.5, 8.5, 0.2], [4.5, 8.5, -0.2]]) {
    const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry + Math.PI; g.add(b);
    box(b, '#c9844a', 2.2, 0.15, 0.7, 0, 0.5, 0);
    box(b, '#c9844a', 2.2, 0.6, 0.12, 0, 0.9, -0.32);
    for (const sx of [-0.9, 0.9]) box(b, '#5a6b7a', 0.12, 0.5, 0.6, sx, 0.25, 0);
    Z.benches.push({ x, z, yaw: ry + Math.PI });
    Z.spots.push({ id: 'bench', x, z, r: 1.4, label: '🪑 앉기', yaw: ry });
    Z.colliders.push({ x, z, r: 0.6 });
  }
  // 꽃 화분 · 나무
  const rnd = mulberry(2);
  for (const [x, z] of [[-12, 6], [12, 6], [-8, -9], [8, -9], [-13, 1], [0, 13]]) { tree(g, '#4fae5a', x, z, 0.9); Z.colliders.push({ x, z, r: 0.6 }); }
  for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, d = 13 + rnd() * 3; flower(g, Math.cos(a) * d, Math.sin(a) * d, ['#ff8fab', '#ffd166', '#ffffff', '#c77dff'][i % 4]); }
  rim(g, Z.radius + 1, ['#7fc46a', '#6ab45a'], 1.2, 3);
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
