// 귀여운 블록 동물 26종: 머리가 크고 몸이 작은 동글동글한 모양 · 큰 눈.
// 외부 3D 모델 없이 상자만으로 만들어요 (저작권 걱정 없음). 동물은 +z 쪽을 바라봐요.
// buildAnimal(model) → { root, update(t, moving, act) , size, center }
//   act: 특별한 순간이 시작된 뒤 지난 초 (아니면 -1)
import * as THREE from 'three';

const MATS = new Map();
export function mat(color, emissive = 0, opacity = 1) {
  const k = `${color}|${emissive}|${opacity}`;
  if (!MATS.has(k)) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });
    if (emissive) { m.emissive = new THREE.Color(color); m.emissiveIntensity = emissive; }
    if (opacity < 1) { m.transparent = true; m.opacity = opacity; m.depthWrite = false; }
    MATS.set(k, m);
  }
  return MATS.get(k);
}
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CONE = new THREE.ConeGeometry(0.5, 1, 4);
export function box(parent, color, w, h, d, x = 0, y = 0, z = 0, glow = 0, opacity = 1) {
  const m = new THREE.Mesh(BOX, typeof color === 'string' ? mat(color, glow, opacity) : color);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function cone(parent, color, r, h, x, y, z, rx = 0, rz = 0) {
  const m = new THREE.Mesh(CONE, mat(color));
  m.scale.set(r * 2, h, r * 2);
  m.position.set(x, y, z);
  m.rotation.set(rx, Math.PI / 4, rz);
  parent.add(m);
  return m;
}
// 관절: 회전축이 되는 빈 그룹
function joint(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
// 큰 눈 두 개 (흰자 · 까만 눈동자 · 반짝 점). s 는 눈 크기, gap 은 두 눈 사이 반 거리
function eyes(parent, s, gap, y, z, side = false) {
  for (const sx of [-1, 1]) {
    const e = new THREE.Group();
    if (side) { e.position.set(sx * gap, y, z); e.rotation.y = sx * 0.9; } else e.position.set(sx * gap, y, z);
    parent.add(e);
    box(e, '#ffffff', s, s, s * 0.3, 0, 0, 0);
    box(e, '#1b1b22', s * 0.66, s * 0.72, s * 0.12, 0, -s * 0.06, s * 0.17);
    box(e, '#ffffff', s * 0.22, s * 0.22, s * 0.05, s * 0.14 * -sx, s * 0.14, s * 0.24);
  }
}
function cheeks(parent, w, y, z, color = '#ff9aa8') {
  box(parent, color, w * 0.18, w * 0.1, 0.02, -w * 0.36, y, z);
  box(parent, color, w * 0.18, w * 0.1, 0.02, w * 0.36, y, z);
}
const sin = Math.sin;

// ---------- 네 발 동물 (카피바라 · 하이에나 · 사자 · 치타 · 표범 · 낙타 · 사막여우) ----------
function quad(o) {
  const root = new THREE.Group();
  const body = joint(root, 0, o.leg + o.bh / 2, 0);
  box(body, o.color, o.bw, o.bh, o.bd);
  if (o.belly) box(body, o.belly, o.bw * 0.8, 0.04, o.bd * 0.8, 0, -o.bh / 2 - 0.01, 0);
  if (o.spots) {
    const r = mulberry(o.seed || 3);
    for (let i = 0; i < o.spots.n; i++) {
      const sx = (r() - 0.5) * o.bd * 0.85, side = r() < 0.5 ? -1 : 1;
      const top = r() < 0.4;
      const s = o.spots.s * (0.7 + r() * 0.6);
      if (top) box(body, o.spots.c, s, 0.02, s, (r() - 0.5) * o.bw * 0.7, o.bh / 2 + 0.005, sx);
      else box(body, o.spots.c, 0.02, s, s, side * (o.bw / 2 + 0.005), (r() - 0.3) * o.bh * 0.6, sx);
    }
  }
  if (o.hump) box(body, o.color, o.bw * 0.7, o.hump, o.bd * 0.4, 0, o.bh / 2 + o.hump / 2 - 0.02, -o.bd * 0.05);
  // 목과 머리
  const neck = joint(body, 0, o.bh * 0.25, o.bd / 2);
  if (o.neck) { box(neck, o.color, o.hs * 0.38, o.neck, o.hs * 0.38, 0, o.neck / 2, 0.02); }
  const head = joint(neck, 0, (o.neck || 0) + o.hs * 0.35, o.hs * 0.25);
  if (o.mane) box(head, o.mane, o.hs * 1.45, o.hs * 1.4, o.hs * 0.6, 0, -o.hs * 0.02, -o.hs * 0.35);
  box(head, o.color, o.hs, o.hs * 0.9, o.hs * 0.85);
  box(head, o.snout || o.belly || o.color, o.hs * 0.5, o.hs * 0.34, o.hs * 0.22, 0, -o.hs * 0.22, o.hs * 0.5);
  box(head, '#2b2020', o.hs * 0.18, o.hs * 0.1, o.hs * 0.05, 0, -o.hs * 0.12, o.hs * 0.62);
  if (o.tear) for (const sx of [-1, 1]) box(head, o.tear, o.hs * 0.05, o.hs * 0.28, 0.02, sx * o.hs * 0.27, -o.hs * 0.18, o.hs * 0.43);
  eyes(head, o.hs * 0.24, o.hs * 0.24, o.hs * 0.06, o.hs * 0.43);
  cheeks(head, o.hs, -o.hs * 0.2, o.hs * 0.43);
  const ears = [];
  for (const sx of [-1, 1]) {
    const e = joint(head, sx * o.hs * 0.33, o.hs * 0.45, -o.hs * 0.1);
    const ew = o.ear === 'big' ? o.hs * 0.42 : o.hs * 0.24, eh = o.ear === 'big' ? o.hs * 0.85 : o.ear === 'pointy' ? o.hs * 0.36 : o.hs * 0.18;
    box(e, o.earColor || o.color, ew, eh, o.hs * 0.08, 0, eh / 2 - 0.02, 0);
    if (o.ear === 'big') box(e, '#ffc9c0', ew * 0.6, eh * 0.75, 0.02, 0, eh / 2, 0.045);
    e.rotation.z = sx * (o.ear === 'big' ? -0.35 : -0.1);
    ears.push(e);
  }
  // 다리
  const legs = [];
  for (const [lx, lz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const l = joint(root, lx * o.bw * 0.3, o.leg, lz * o.bd * 0.32);
    box(l, o.legColor || o.color, o.lw || 0.14, o.leg, o.lw || 0.14, 0, -o.leg / 2, 0);
    legs.push(l);
  }
  // 꼬리
  const tail = joint(body, 0, o.bh * 0.2, -o.bd / 2);
  const tl = o.tail || 0.35;
  box(tail, o.tailColor || o.color, 0.07, 0.07, tl, 0, 0, -tl / 2);
  if (o.tuft) box(tail, o.tuft, 0.13, 0.13, 0.13, 0, 0, -tl);
  tail.rotation.x = -0.5;

  const k = o.kind;
  function update(t, moving, act) {
    const w = moving ? sin(t * 10) * 0.6 : 0;
    legs[0].rotation.x = w; legs[3].rotation.x = w; legs[1].rotation.x = -w; legs[2].rotation.x = -w;
    body.position.y = o.leg + o.bh / 2 + (moving ? Math.abs(sin(t * 10)) * 0.03 : sin(t * 2) * 0.01);
    tail.rotation.y = sin(t * 3) * 0.4;
    head.rotation.set(0, 0, 0); head.scale.setScalar(1); body.rotation.set(0, 0, 0);
    ears.forEach((e, i) => { e.rotation.x = 0; });
    if (act < 0) return;
    const p = Math.min(1, act / 0.3);
    if (k === 'roar') { head.rotation.x = -0.5 * p; head.scale.setScalar(1 + 0.15 * p * (0.6 + 0.4 * sin(act * 30))); }
    else if (k === 'nap') { head.rotation.x = 0.35 * p + sin(act * 3) * 0.08; }
    else if (k === 'laugh') { head.rotation.x = -0.3 + sin(act * 25) * 0.25; body.position.y += Math.abs(sin(act * 25)) * 0.04; }
    else if (k === 'dash') { const w2 = sin(t * 26) * 0.9; legs[0].rotation.x = w2; legs[3].rotation.x = w2; legs[1].rotation.x = -w2; legs[2].rotation.x = -w2; body.rotation.x = sin(t * 26) * 0.08; }
    else if (k === 'wag') { tail.rotation.y = sin(act * 14) * 1.0; tail.rotation.x = -1.0; head.rotation.z = sin(act * 4) * 0.15; }
    else if (k === 'chew') { head.rotation.z = sin(act * 10) * 0.12; head.rotation.x = -0.2; }
    else if (k === 'ears') { ears.forEach((e) => { e.rotation.x = -0.4 * p + sin(act * 18) * 0.15; }); head.rotation.y = sin(act * 3) * 0.5; head.scale.setScalar(1 + 0.08 * p); }
  }
  return { root, update };
}

// ---------- 뱀 (뱀 · 방울뱀) ----------
function snake(o) {
  const root = new THREE.Group();
  const N = 9, segs = [];
  for (let i = 0; i < N; i++) {
    const s = joint(root, 0, 0.09, -i * 0.15);
    const c = o.pattern && i % 2 ? o.pattern : o.color;
    box(s, c, 0.17 - i * 0.008, 0.15 - i * 0.006, 0.17);
    segs.push(s);
  }
  const head = joint(segs[0], 0, 0.1, 0.12);
  box(head, o.color, 0.32, 0.24, 0.3);
  box(head, o.belly || o.color, 0.26, 0.06, 0.2, 0, -0.1, 0.06);
  eyes(head, 0.1, 0.09, 0.06, 0.15);
  cheeks(head, 0.3, -0.04, 0.155);
  const tongue = box(head, '#e23b52', 0.04, 0.02, 0.16, 0, -0.06, 0.2);
  tongue.visible = false;
  let rattle = null;
  if (o.rattle) {
    rattle = joint(segs[N - 1], 0, 0.04, -0.1);
    for (let i = 0; i < 3; i++) box(rattle, '#e8d7a8', 0.1 - i * 0.015, 0.1 - i * 0.015, 0.06, 0, 0, -i * 0.07);
  }
  function update(t, moving, act) {
    const sp = moving ? 8 : 2, amp = moving ? 0.12 : 0.05;
    segs.forEach((s, i) => { s.position.x = sin(t * sp - i * 0.8) * amp * Math.min(1, i / 2 + 0.3); });
    head.rotation.set(0, 0, 0); head.position.y = 0.1; tongue.visible = false;
    if (rattle) rattle.rotation.z = 0;
    if (act < 0) return;
    if (o.rattle) { rattle.rotation.z = sin(act * 60) * 0.5; rattle.position.y = 0.04 + 0.12 * Math.min(1, act * 3); head.rotation.x = -0.3; head.position.y = 0.2; }
    else { head.position.y = 0.1 + 0.2 * Math.min(1, act * 3); head.rotation.x = -0.3; tongue.visible = sin(act * 20) > 0; }
  }
  return { root, update };
}

// ---------- 개구리 ----------
function frog() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0.17, 0);
  box(body, '#5fc25a', 0.48, 0.3, 0.45);
  box(body, '#d8f2a6', 0.36, 0.05, 0.12, 0, -0.07, 0.2);
  box(body, '#3f9a45', 0.12, 0.02, 0.12, -0.12, 0.155, -0.08);
  box(body, '#3f9a45', 0.08, 0.02, 0.08, 0.14, 0.155, 0.02);
  for (const sx of [-1, 1]) {
    const bump = joint(body, sx * 0.14, 0.2, 0.12);
    box(bump, '#5fc25a', 0.18, 0.16, 0.16);
  }
  eyes(body, 0.13, 0.14, 0.23, 0.2);
  box(body, '#2b4d2a', 0.2, 0.025, 0.02, 0, 0, 0.23);
  cheeks(body, 0.48, 0.03, 0.23);
  const legs = [];
  for (const sx of [-1, 1]) {
    const l = joint(root, sx * 0.24, 0.1, -0.08);
    box(l, '#4fae4b', 0.12, 0.14, 0.28, 0, 0, 0);
    box(l, '#4fae4b', 0.14, 0.04, 0.12, sx * 0.03, -0.07, 0.15);
    legs.push(l);
    box(root, '#4fae4b', 0.08, 0.14, 0.08, sx * 0.15, 0.07, 0.17);
  }
  function update(t, moving, act) {
    let y = 0;
    if (moving) y = Math.abs(sin(t * 6)) * 0.15;
    if (act >= 0) y = Math.abs(sin(act * 4)) * 0.7;
    root.children.forEach(() => {});
    body.position.y = 0.17 + y; legs.forEach((l) => { l.position.y = 0.1 + y * 0.8; l.rotation.x = y > 0.05 ? 0.6 : 0; });
    body.scale.y = 1 + (moving || act >= 0 ? 0 : sin(t * 3) * 0.05);
  }
  return { root, update };
}

// ---------- 나무늘보 · 오랑우탄 (앉아 있는 원숭이 모양) ----------
function ape(o) {
  const root = new THREE.Group();
  const body = joint(root, 0, o.leg + o.bh / 2, 0);
  box(body, o.color, o.bw, o.bh, o.bd);
  box(body, o.belly, o.bw * 0.6, o.bh * 0.7, 0.02, 0, -o.bh * 0.05, o.bd / 2 + 0.005);
  const head = joint(body, 0, o.bh / 2 + o.hs * 0.42, 0.03);
  box(head, o.color, o.hs, o.hs * 0.88, o.hs * 0.85);
  if (o.hair) box(head, o.hair, o.hs * 1.1, o.hs * 0.3, o.hs * 0.9, 0, o.hs * 0.42, -0.02);
  box(head, o.face, o.hs * 0.78, o.hs * 0.62, 0.03, 0, -o.hs * 0.06, o.hs * 0.43);
  if (o.mask) for (const sx of [-1, 1]) box(head, o.mask, o.hs * 0.28, o.hs * 0.14, 0.02, sx * o.hs * 0.2, o.hs * 0.03, o.hs * 0.45);
  box(head, o.mouth || '#5a3a2a', o.hs * 0.3, o.hs * 0.05, 0.02, 0, -o.hs * 0.24, o.hs * 0.46);
  eyes(head, o.hs * 0.19, o.hs * 0.19, o.hs * 0.04, o.hs * 0.46);
  cheeks(head, o.hs, -o.hs * 0.15, o.hs * 0.455);
  const arms = [];
  for (const sx of [-1, 1]) {
    const a = joint(body, sx * (o.bw / 2 + o.aw / 2), o.bh * 0.35, 0);
    box(a, o.color, o.aw, o.arm, o.aw, 0, -o.arm / 2, 0);
    box(a, o.face, o.aw * 1.05, 0.06, o.aw * 1.05, 0, -o.arm, 0);
    arms.push(a);
  }
  const legs = [];
  for (const sx of [-1, 1]) {
    const l = joint(root, sx * o.bw * 0.27, o.leg, 0);
    box(l, o.color, o.aw * 1.1, o.leg, o.aw * 1.1, 0, -o.leg / 2, 0);
    legs.push(l);
  }
  function update(t, moving, act) {
    const w = moving ? sin(t * (o.slow ? 3 : 7)) * 0.5 : 0;
    legs[0].rotation.x = w; legs[1].rotation.x = -w;
    arms[0].rotation.set(-w, 0, 0.1); arms[1].rotation.set(w, 0, -0.1);
    body.rotation.z = moving ? sin(t * (o.slow ? 3 : 7)) * 0.06 : 0;
    head.rotation.set(0, sin(t * 0.7) * 0.2, 0);
    if (act < 0) return;
    const p = Math.min(1, act / (o.slow ? 1.2 : 0.3));
    if (o.slow) { arms[0].rotation.set(0, 0, -2.6 * p); arms[1].rotation.set(0, 0, 2.6 * p); head.rotation.x = -0.3 * p; }
    else { const b = sin(act * 18); arms[0].rotation.set(-1.4 - b * 0.3, 0, -0.5); arms[1].rotation.set(-1.4 + b * 0.3, 0, 0.5); head.rotation.x = -0.25; }
  }
  return { root, update };
}

// ---------- 새 (토코투칸) ----------
function toucan() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0.3, 0);
  box(body, '#1d1d24', 0.32, 0.38, 0.32);
  box(body, '#fff2b8', 0.24, 0.24, 0.02, 0, 0.04, 0.165);
  const head = joint(body, 0, 0.3, 0.02);
  box(head, '#1d1d24', 0.36, 0.32, 0.34);
  box(head, '#fff2b8', 0.3, 0.14, 0.02, 0, -0.08, 0.175);
  for (const sx of [-1, 1]) box(head, '#4fb3ff', 0.12, 0.12, 0.02, sx * 0.1, 0.04, 0.172);
  eyes(head, 0.08, 0.1, 0.04, 0.185);
  const beak = joint(head, 0, -0.02, 0.17);
  box(beak, '#ff8a1c', 0.16, 0.16, 0.36, 0, 0, 0.18);
  box(beak, '#ffd23c', 0.165, 0.06, 0.2, 0, 0.06, 0.12);
  box(beak, '#1d1d24', 0.08, 0.08, 0.06, 0, 0, 0.37);
  const wings = [];
  for (const sx of [-1, 1]) {
    const w = joint(body, sx * 0.17, 0.12, 0);
    box(w, '#1d1d24', 0.05, 0.3, 0.28, sx * 0.02, -0.12, -0.02);
    wings.push(w);
  }
  box(body, '#d6334a', 0.2, 0.06, 0.1, 0, -0.16, -0.17);
  const tail = joint(body, 0, -0.1, -0.16);
  box(tail, '#1d1d24', 0.2, 0.06, 0.3, 0, 0, -0.14);
  tail.rotation.x = 0.5;
  for (const sx of [-1, 1]) box(root, '#6aa0c8', 0.05, 0.12, 0.05, sx * 0.08, 0.06, 0);
  function update(t, moving, act) {
    body.position.y = 0.3 + (moving ? Math.abs(sin(t * 10)) * 0.06 : 0);
    head.rotation.set(0, sin(t * 1.3) * 0.4, 0);
    wings[0].rotation.z = 0; wings[1].rotation.z = 0;
    if (act < 0) return;
    const f = sin(act * 28) * 0.9 + 0.9;
    wings[0].rotation.z = -f; wings[1].rotation.z = f;
    body.position.y = 0.3 + Math.abs(sin(act * 5)) * 0.35;
  }
  return { root, update };
}

// ---------- 도마뱀 (가시도마뱀) ----------
function thornydevil() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0.12, 0);
  box(body, '#d49a52', 0.34, 0.16, 0.42);
  box(body, '#8a5a2b', 0.12, 0.165, 0.42);
  const spikes = new THREE.Group(); body.add(spikes);
  const r = mulberry(7);
  for (let i = 0; i < 14; i++) cone(spikes, i % 3 ? '#b8743a' : '#f0c27a', 0.03, 0.09, (r() - 0.5) * 0.3, 0.1, (r() - 0.5) * 0.38);
  const head = joint(body, 0, 0.05, 0.26);
  box(head, '#d49a52', 0.3, 0.2, 0.22);
  cone(head, '#b8743a', 0.035, 0.12, -0.1, 0.14, -0.02);
  cone(head, '#b8743a', 0.035, 0.12, 0.1, 0.14, -0.02);
  eyes(head, 0.08, 0.09, 0.03, 0.115);
  cheeks(head, 0.3, -0.05, 0.115);
  const tail = joint(body, 0, 0, -0.21);
  box(tail, '#d49a52', 0.08, 0.07, 0.3, 0, 0, -0.15);
  const legs = [];
  for (const [lx, lz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const l = joint(root, lx * 0.2, 0.08, lz * 0.13);
    box(l, '#c28745', 0.14, 0.06, 0.06, lx * 0.05, -0.04, 0);
    legs.push(l);
  }
  function update(t, moving, act) {
    const w = moving ? sin(t * 14) * 0.5 : 0;
    legs.forEach((l, i) => { l.rotation.y = (i === 0 || i === 3 ? w : -w); });
    tail.rotation.y = sin(t * (moving ? 14 : 2)) * 0.3;
    body.scale.set(1, 1, 1); spikes.scale.setScalar(1);
    head.rotation.set(0, 0, 0);
    if (act < 0) return;
    const p = Math.min(1, act / 0.4);
    body.scale.set(1 + 0.15 * p, 1 + 0.25 * p, 1);
    spikes.scale.setScalar(1 + 0.4 * p + sin(act * 20) * 0.05);
    head.rotation.x = 0.4 * p;
  }
  return { root, update };
}

// ---------- 캥거루쥐 ----------
function kangaroorat() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0.16, 0);
  box(body, '#d8b07a', 0.22, 0.22, 0.26);
  box(body, '#fff4e0', 0.16, 0.14, 0.02, 0, -0.02, 0.13);
  const head = joint(body, 0, 0.16, 0.06);
  box(head, '#d8b07a', 0.26, 0.24, 0.24);
  box(head, '#fff4e0', 0.14, 0.08, 0.06, 0, -0.06, 0.13);
  box(head, '#ff8fa0', 0.04, 0.03, 0.02, 0, -0.03, 0.165);
  eyes(head, 0.08, 0.075, 0.03, 0.125);
  cheeks(head, 0.26, -0.05, 0.123);
  for (const sx of [-1, 1]) box(head, '#d8b07a', 0.08, 0.1, 0.03, sx * 0.09, 0.15, -0.02);
  const legs = [];
  for (const sx of [-1, 1]) {
    const l = joint(root, sx * 0.09, 0.1, -0.03);
    box(l, '#d8b07a', 0.08, 0.14, 0.18, 0, 0, 0);
    box(l, '#fff4e0', 0.07, 0.03, 0.18, 0, -0.08, 0.06);
    legs.push(l);
  }
  const tail = joint(body, 0, -0.06, -0.13);
  box(tail, '#c79a62', 0.035, 0.035, 0.5, 0, 0, -0.25);
  box(tail, '#3a2a1e', 0.07, 0.07, 0.12, 0, 0, -0.5);
  tail.rotation.x = 0.25;
  function update(t, moving, act) {
    let y = moving ? Math.abs(sin(t * 9)) * 0.14 : 0;
    if (act >= 0) y = Math.abs(sin(act * 3.5)) * 0.9;
    body.position.y = 0.16 + y; legs.forEach((l) => { l.position.y = 0.1 + y; l.rotation.x = y > 0.04 ? 0.5 : 0; });
    tail.position.y = -0.06; head.rotation.y = sin(t * 2) * 0.3;
  }
  return { root, update };
}

// ---------- 미어캣 ----------
function meerkat() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0.12, 0);
  const torso = box(body, '#c9a06a', 0.2, 0.36, 0.18, 0, 0.18, 0);
  box(body, '#f2dcb4', 0.13, 0.28, 0.02, 0, 0.17, 0.095);
  const head = joint(body, 0, 0.44, 0.02);
  box(head, '#c9a06a', 0.26, 0.24, 0.24);
  box(head, '#f2dcb4', 0.16, 0.09, 0.08, 0, -0.06, 0.13);
  box(head, '#2b2020', 0.06, 0.04, 0.02, 0, -0.04, 0.175);
  for (const sx of [-1, 1]) box(head, '#3a2a1e', 0.1, 0.1, 0.02, sx * 0.065, 0.03, 0.122);
  eyes(head, 0.075, 0.065, 0.03, 0.13);
  for (const sx of [-1, 1]) box(head, '#3a2a1e', 0.05, 0.06, 0.03, sx * 0.13, 0.04, -0.02);
  const arms = [];
  for (const sx of [-1, 1]) { const a = joint(body, sx * 0.11, 0.28, 0.07); box(a, '#c9a06a', 0.05, 0.14, 0.05, 0, -0.07, 0); arms.push(a); }
  for (const sx of [-1, 1]) box(root, '#c9a06a', 0.07, 0.12, 0.1, sx * 0.06, 0.06, 0.02);
  const tail = joint(body, 0, 0.02, -0.09);
  box(tail, '#c9a06a', 0.05, 0.05, 0.32, 0, 0, -0.16);
  box(tail, '#3a2a1e', 0.055, 0.055, 0.08, 0, 0, -0.32);
  function update(t, moving, act) {
    body.rotation.x = moving ? 0.9 : 0; body.position.y = moving ? 0.12 + Math.abs(sin(t * 12)) * 0.03 : 0.12;
    body.scale.y = 1; head.rotation.set(moving ? -0.9 : 0, sin(t * 1.5) * 0.5, 0);
    arms.forEach((a) => { a.rotation.x = 0; });
    if (act < 0) return;
    const p = Math.min(1, act / 0.3);
    body.rotation.x = 0; body.scale.y = 1 + 0.18 * p;
    head.rotation.set(-0.1, sin(act * 3) * 0.9, 0);
    arms.forEach((a) => { a.rotation.x = -0.6 * p; });
  }
  return { root, update };
}

// ---------- 게 ----------
function crab() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0.16, 0);
  box(body, '#e6402e', 0.46, 0.16, 0.32);
  box(body, '#ff7a5c', 0.3, 0.02, 0.18, 0, 0.085, 0.02);
  const stalks = joint(body, 0, 0.08, 0.1);
  for (const sx of [-1, 1]) {
    box(stalks, '#e6402e', 0.04, 0.14, 0.04, sx * 0.09, 0.07, 0);
    const e = new THREE.Group(); e.position.set(sx * 0.09, 0.17, 0.02); stalks.add(e);
    box(e, '#ffffff', 0.1, 0.1, 0.08); box(e, '#1b1b22', 0.07, 0.07, 0.02, 0, -0.005, 0.045);
    box(e, '#ffffff', 0.02, 0.02, 0.01, -sx * 0.015, 0.02, 0.056);
  }
  box(body, '#2b2020', 0.1, 0.02, 0.02, 0, -0.02, 0.161);
  cheeks(body, 0.46, 0.0, 0.161);
  const claws = [];
  for (const sx of [-1, 1]) {
    const c = joint(body, sx * 0.25, 0.02, 0.12);
    box(c, '#e6402e', 0.06, 0.06, 0.14, 0, 0, 0.05);
    const top = joint(c, 0, 0.03, 0.14); box(top, '#ff5a43', 0.14, 0.07, 0.14, 0, 0.02, 0.05);
    box(c, '#ff5a43', 0.13, 0.05, 0.12, 0, -0.03, 0.18);
    claws.push({ c, top });
  }
  const legs = [];
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const l = joint(root, sx * 0.22, 0.12, -0.08 + i * 0.07);
    box(l, '#d33a29', 0.16, 0.03, 0.03, sx * 0.08, -0.04, 0);
    l.rotation.z = sx * -0.6; legs.push(l);
  }
  function update(t, moving, act) {
    legs.forEach((l, i) => { l.rotation.x = moving ? sin(t * 16 + i) * 0.4 : 0; });
    body.position.y = 0.16 + (moving ? Math.abs(sin(t * 16)) * 0.02 : 0);
    claws.forEach(({ c, top }) => { c.rotation.x = 0; top.rotation.x = 0; });
    if (act < 0) return;
    claws.forEach(({ c, top }, i) => { c.rotation.x = -1.1 * Math.min(1, act / 0.25); top.rotation.x = -Math.abs(sin(act * 14 + i)) * 0.7; });
  }
  return { root, update };
}

// ---------- 물고기 모양 공통 ----------
function fishBody(parent, o) {
  const g = joint(parent, 0, 0, 0);
  box(g, o.color, o.w, o.h, o.l);
  if (o.belly) box(g, o.belly, o.w * 0.9, o.h * 0.35, o.l * 0.9, 0, -o.h * 0.33, 0);
  if (o.back) box(g, o.back, o.w * 0.9, o.h * 0.25, o.l * 0.95, 0, o.h * 0.38, 0);
  eyes(g, o.eye, o.w / 2, o.h * 0.1, o.l * 0.35, true);
  const tail = joint(g, 0, 0, -o.l / 2);
  box(tail, o.fin || o.color, 0.03, o.h * 1.1, o.h * 0.6, 0, 0, -o.h * 0.25);
  return { g, tail };
}

function sardine() {
  const root = new THREE.Group();
  const fish = [];
  const r = mulberry(5);
  for (let i = 0; i < 6; i++) {
    const p = joint(root, (r() - 0.5) * 0.7, (r() - 0.5) * 0.35, (r() - 0.5) * 0.7);
    const f = fishBody(p, { w: 0.08, h: 0.12, l: 0.32, color: '#c9d7e3', back: '#3c6e9e', belly: '#f4f8fb', eye: 0.06 });
    fish.push({ p, ...f, base: p.position.clone(), ph: r() * 6 });
  }
  function update(t, moving, act) {
    fish.forEach((f) => {
      f.tail.rotation.y = sin(t * 16 + f.ph) * 0.5;
      f.p.position.y = f.base.y + sin(t * 2 + f.ph) * 0.05;
      f.p.rotation.set(0, 0, 0);
    });
    root.rotation.y = 0;
    if (act < 0) return;
    fish.forEach((f) => { f.p.rotation.z = act * 9 + f.ph; f.p.position.y = f.base.y + sin(act * 6 + f.ph) * 0.1; });
    root.rotation.y = act * 3;
  }
  return { root, update };
}

function flounder() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0.05, 0);
  box(body, '#a88763', 0.5, 0.07, 0.62);
  const r = mulberry(9);
  for (let i = 0; i < 8; i++) box(body, i % 2 ? '#7a5d3f' : '#c9a982', 0.06, 0.01, 0.06, (r() - 0.5) * 0.38, 0.04, (r() - 0.5) * 0.45);
  box(body, '#c9a982', 0.6, 0.02, 0.5, 0, -0.01, -0.02);
  // 두 눈이 위쪽에 모여 있어요
  for (const sx of [-0.06, 0.08]) {
    const e = new THREE.Group(); e.position.set(sx, 0.07, 0.18); e.rotation.x = -1.2; body.add(e);
    box(e, '#ffffff', 0.09, 0.09, 0.04); box(e, '#1b1b22', 0.06, 0.06, 0.02, 0, 0, 0.02); box(e, '#ffffff', 0.02, 0.02, 0.01, 0.015, 0.015, 0.03);
  }
  box(body, '#ff9aa8', 0.05, 0.01, 0.03, -0.14, 0.04, 0.2);
  const tail = joint(body, 0, 0, -0.31);
  box(tail, '#a88763', 0.3, 0.03, 0.14, 0, 0, -0.07);
  const sand = new THREE.Group(); root.add(sand); sand.visible = false;
  for (let i = 0; i < 8; i++) box(sand, '#e9d6a6', 0.05, 0.05, 0.05, (r() - 0.5) * 0.7, 0.05, (r() - 0.5) * 0.7);
  function update(t, moving, act) {
    tail.rotation.x = sin(t * (moving ? 8 : 2)) * 0.25;
    body.rotation.z = moving ? sin(t * 8) * 0.06 : 0;
    body.position.y = 0.05; sand.visible = false;
    if (act < 0) return;
    body.position.y = 0.05 + Math.abs(sin(act * 8)) * 0.1; body.rotation.z = sin(act * 16) * 0.2;
    sand.visible = true; sand.children.forEach((s, i) => { s.position.y = 0.05 + ((act * 1.5 + i * 0.13) % 0.6); });
  }
  return { root, update };
}

function turtle() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0, 0);
  box(body, '#3f8a5a', 0.8, 0.22, 0.9);
  box(body, '#5aa875', 0.6, 0.14, 0.7, 0, 0.16, 0);
  box(body, '#79c08f', 0.3, 0.06, 0.34, 0, 0.25, 0);
  box(body, '#e8dca8', 0.66, 0.05, 0.76, 0, -0.12, 0);
  const head = joint(body, 0, 0.02, 0.48);
  box(head, '#8fbf6a', 0.34, 0.28, 0.32, 0, 0.04, 0.12);
  eyes(head, 0.1, 0.11, 0.08, 0.285);
  cheeks(head, 0.34, -0.03, 0.285);
  box(head, '#2b4020', 0.12, 0.02, 0.02, 0, -0.04, 0.285);
  const fl = [];
  for (const [sx, sz, len] of [[-1, 1, 0.5], [1, 1, 0.5], [-1, -1, 0.3], [1, -1, 0.3]]) {
    const f = joint(body, sx * 0.38, -0.02, sz * 0.25);
    box(f, '#8fbf6a', len, 0.05, 0.2, sx * len / 2, 0, 0);
    fl.push(f);
  }
  function update(t, moving, act) {
    const s = sin(t * (moving ? 3 : 1.4));
    fl[0].rotation.z = s * 0.5; fl[1].rotation.z = -s * 0.5; fl[2].rotation.z = -s * 0.3; fl[3].rotation.z = s * 0.3;
    head.rotation.set(0, sin(t * 0.8) * 0.2, 0);
    if (act < 0) return;
    fl[0].rotation.z = 0.9 + sin(act * 12) * 0.5; head.rotation.x = -0.3;
  }
  return { root, update };
}

function shark() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0, 0);
  box(body, '#d8c46a', 0.5, 0.48, 1.4);
  box(body, '#f7f0d2', 0.46, 0.18, 1.3, 0, -0.17, 0.02);
  const head = joint(body, 0, 0.02, 0.7);
  box(head, '#d8c46a', 0.46, 0.42, 0.42, 0, 0, 0.12);
  box(head, '#f7f0d2', 0.42, 0.12, 0.38, 0, -0.15, 0.13);
  eyes(head, 0.12, 0.2, 0.06, 0.24, true);
  box(head, '#5a4a2a', 0.2, 0.02, 0.02, 0, -0.1, 0.34);
  cheeks(head, 0.46, -0.05, 0.335);
  cone(body, '#c9b45a', 0.16, 0.36, 0, 0.4, 0.05, -0.3);
  cone(body, '#c9b45a', 0.08, 0.2, 0, 0.3, -0.45, -0.3);
  const fins = [];
  for (const sx of [-1, 1]) { const f = joint(body, sx * 0.25, -0.12, 0.2); box(f, '#c9b45a', 0.4, 0.04, 0.22, sx * 0.2, 0, 0); f.rotation.z = sx * -0.3; fins.push(f); }
  const tail = joint(body, 0, 0, -0.7);
  box(tail, '#c9b45a', 0.08, 0.3, 0.3, 0, 0, -0.12);
  box(tail, '#c9b45a', 0.06, 0.55, 0.16, 0, 0.12, -0.3).rotation.x = -0.5;
  function update(t, moving, act) {
    tail.rotation.y = sin(t * 5) * 0.4; body.rotation.y = sin(t * 5) * 0.06; body.rotation.z = 0;
    if (act < 0) return;
    body.rotation.z = act * 5;
  }
  return { root, update };
}

function angler() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0, 0);
  box(body, '#3b2f4a', 0.7, 0.62, 0.7);
  box(body, '#4d3f60', 0.5, 0.2, 0.6, 0, 0.3, 0);
  box(body, '#1a1424', 0.58, 0.18, 0.04, 0, -0.14, 0.36);
  for (let i = 0; i < 6; i++) cone(body, '#f4f0e6', 0.025, 0.08, -0.22 + i * 0.09, -0.06, 0.37, Math.PI, 0);
  eyes(body, 0.12, 0.2, 0.12, 0.36);
  const lure = joint(body, 0, 0.32, 0.15);
  box(lure, '#4d3f60', 0.03, 0.03, 0.5, 0, 0.12, 0.2).rotation.x = -0.6;
  const bulb = joint(lure, 0, 0.26, 0.43);
  box(bulb, '#bff6ff', 0.12, 0.12, 0.12, 0, 0, 0, 1.4);
  const tail = joint(body, 0, 0, -0.35);
  box(tail, '#3b2f4a', 0.05, 0.4, 0.26, 0, 0, -0.12);
  for (const sx of [-1, 1]) box(body, '#4d3f60', 0.2, 0.2, 0.04, sx * 0.38, -0.05, 0.05);
  function update(t, moving, act) {
    tail.rotation.y = sin(t * 4) * 0.4; lure.rotation.x = sin(t * 2) * 0.15;
    bulb.scale.setScalar(1);
    if (act < 0) return;
    bulb.scale.setScalar(1.6 + sin(act * 12) * 0.5); lure.rotation.x = sin(act * 6) * 0.4;
  }
  return { root, update };
}

function dragonfish() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0, 0);
  const segs = [];
  for (let i = 0; i < 5; i++) {
    const s = joint(i ? segs[i - 1] : body, 0, 0, i ? -0.24 : 0);
    box(s, '#1c1a2a', 0.2 - i * 0.015, 0.26 - i * 0.02, 0.26);
    box(s, '#7df9ff', 0.03, 0.03, 0.03, 0.1 - i * 0.008, -0.08, 0, 1.5);
    box(s, '#7df9ff', 0.03, 0.03, 0.03, -0.1 + i * 0.008, -0.08, 0, 1.5);
    segs.push(s);
  }
  const head = joint(body, 0, 0.02, 0.2);
  box(head, '#1c1a2a', 0.26, 0.3, 0.3, 0, 0, 0.08);
  for (let i = 0; i < 4; i++) cone(head, '#e8e8f0', 0.02, 0.1, -0.08 + i * 0.055, -0.1, 0.24, Math.PI, 0);
  eyes(head, 0.1, 0.11, 0.06, 0.22, true);
  const barbel = joint(head, 0, -0.14, 0.12);
  box(barbel, '#3a3550', 0.02, 0.4, 0.02, 0, -0.2, 0);
  const glow = joint(barbel, 0, -0.42, 0);
  box(glow, '#ff5af0', 0.08, 0.08, 0.08, 0, 0, 0, 1.5);
  const tail = segs[4];
  box(tail, '#1c1a2a', 0.03, 0.3, 0.2, 0, 0, -0.22);
  function update(t, moving, act) {
    segs.forEach((s, i) => { s.rotation.y = i ? sin(t * 4 - i) * 0.18 : 0; });
    barbel.rotation.x = sin(t * 2) * 0.2; barbel.rotation.z = 0; glow.scale.setScalar(1);
    if (act < 0) return;
    barbel.rotation.z = sin(act * 8) * 0.9; barbel.rotation.x = -0.6; glow.scale.setScalar(1.6 + sin(act * 14) * 0.5);
  }
  return { root, update };
}

function oarfish() {
  const root = new THREE.Group();
  const segs = [];
  let prev = root;
  for (let i = 0; i < 12; i++) {
    const s = joint(prev, 0, 0, i ? -0.3 : 0.9);
    box(s, i % 2 ? '#d7dde6' : '#c3cbd6', 0.1, 0.36 - i * 0.018, 0.3);
    box(s, '#e63b4a', 0.03, 0.08, 0.3, 0, 0.2 - i * 0.009, 0);
    if (i % 3 === 0) box(s, '#8a96a8', 0.105, 0.03, 0.12, 0, 0.02, 0);
    segs.push(s); prev = s;
  }
  const head = joint(segs[0], 0, 0, 0.18);
  box(head, '#d7dde6', 0.14, 0.34, 0.24);
  for (let i = 0; i < 4; i++) box(head, '#e63b4a', 0.03, 0.3 - i * 0.04, 0.04, 0, 0.32 - i * 0.03, -0.06 - i * 0.05).rotation.x = -0.4;
  eyes(head, 0.1, 0.075, 0.05, 0.08, true);
  function update(t, moving, act) {
    const amp = act >= 0 ? 0.45 : 0.18, sp = act >= 0 ? 6 : 2.5;
    segs.forEach((s, i) => { s.rotation.y = i ? sin(t * sp - i * 0.7) * amp * 0.6 : 0; s.rotation.x = act >= 0 && i ? sin(t * sp - i * 0.7 + 1) * 0.12 : 0; });
  }
  return { root, update };
}

function clione() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0, 0);
  box(body, '#e8f6ff', 0.24, 0.5, 0.24, 0, 0, 0, 0.3, 0.75);
  box(body, '#ff8a3c', 0.1, 0.14, 0.1, 0, -0.06, 0, 0.6);
  const head = joint(body, 0, 0.3, 0);
  box(head, '#e8f6ff', 0.28, 0.24, 0.26, 0, 0, 0, 0.3, 0.8);
  eyes(head, 0.08, 0.06, 0.02, 0.135);
  cheeks(head, 0.28, -0.05, 0.135);
  box(body, '#e8f6ff', 0.1, 0.16, 0.1, 0, -0.32, 0, 0.3, 0.75);
  const wings = [];
  for (const sx of [-1, 1]) {
    const w = joint(body, sx * 0.12, 0.08, 0);
    box(w, '#d6f0ff', 0.32, 0.18, 0.03, sx * 0.16, 0, 0, 0.3, 0.7);
    wings.push(w);
  }
  function update(t, moving, act) {
    const sp = act >= 0 ? 22 : 6, a = act >= 0 ? 0.9 : 0.5;
    wings[0].rotation.y = sin(t * sp) * a; wings[1].rotation.y = -sin(t * sp) * a;
    body.position.y = sin(t * 2) * 0.06 + (act >= 0 ? Math.abs(sin(act * 3)) * 0.3 : 0);
  }
  return { root, update };
}

function dumbo() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0, 0);
  box(body, '#ffb38a', 0.6, 0.56, 0.56);
  box(body, '#ffc9a8', 0.4, 0.2, 0.4, 0, 0.3, 0);
  eyes(body, 0.13, 0.15, 0.04, 0.285);
  cheeks(body, 0.6, -0.1, 0.285);
  box(body, '#9a4a3a', 0.08, 0.02, 0.02, 0, -0.08, 0.285);
  const ears = [];
  for (const sx of [-1, 1]) {
    const e = joint(body, sx * 0.3, 0.18, 0);
    box(e, '#ff9e7a', 0.36, 0.06, 0.26, sx * 0.18, 0, 0);
    ears.push(e);
  }
  const arms = [];
  for (let i = 0; i < 8; i++) {
    const an = (i / 8) * Math.PI * 2;
    const a = joint(body, Math.cos(an) * 0.22, -0.28, Math.sin(an) * 0.22);
    box(a, '#ffb38a', 0.08, 0.28, 0.08, 0, -0.12, 0);
    a.userData.an = an; arms.push(a);
  }
  box(body, '#ffa07a', 0.62, 0.05, 0.62, 0, -0.33, 0);
  function update(t, moving, act) {
    const sp = act >= 0 ? 14 : 3, a = act >= 0 ? 0.8 : 0.35;
    ears[0].rotation.z = sin(t * sp) * a; ears[1].rotation.z = -sin(t * sp) * a;
    body.position.y = sin(t * 1.5) * 0.08 + (act >= 0 ? Math.abs(sin(act * 4)) * 0.3 : 0);
    arms.forEach((ar) => { ar.rotation.x = Math.sin(ar.userData.an) * (0.3 + sin(t * 2) * 0.1); ar.rotation.z = -Math.cos(ar.userData.an) * (0.3 + sin(t * 2) * 0.1); });
  }
  return { root, update };
}

// ---------- 동물별 모양 ----------
const BUILD = {
  frog: () => frog(),
  snake: () => snake({ color: '#7ccf5a', pattern: '#5fae44', belly: '#e2f5b0' }),
  rattlesnake: () => snake({ color: '#c9a36a', pattern: '#8a6236', belly: '#efe0b8', rattle: true }),
  sloth: () => ape({ color: '#a08a72', belly: '#c4b39c', face: '#e6d6bd', mask: '#5a4535', hair: '#8a7560', bw: 0.42, bh: 0.42, bd: 0.32, hs: 0.42, leg: 0.16, arm: 0.42, aw: 0.11, slow: true }),
  orangutan: () => ape({ color: '#d0652a', belly: '#e38a4a', face: '#e8b48a', hair: '#b8521c', mouth: '#8a4a2a', bw: 0.62, bh: 0.6, bd: 0.46, hs: 0.56, leg: 0.24, arm: 0.72, aw: 0.16 }),
  toucan: () => toucan(),
  capybara: () => quad({ color: '#a8743e', snout: '#8a5a2e', bw: 0.5, bh: 0.42, bd: 0.72, hs: 0.44, leg: 0.16, ear: 'round', tail: 0.05, kind: 'nap' }),
  hyena: () => quad({ color: '#c8a46a', belly: '#e2cda0', snout: '#5a4530', bw: 0.42, bh: 0.42, bd: 0.72, hs: 0.44, leg: 0.36, ear: 'round', earColor: '#5a4530', spots: { c: '#5a4530', n: 14, s: 0.08 }, tail: 0.3, tuft: '#3a2a1e', kind: 'laugh', seed: 4 }),
  lion: () => quad({ color: '#e0a94a', belly: '#f2d39a', snout: '#f7e3bc', mane: '#a8561c', bw: 0.5, bh: 0.48, bd: 0.84, hs: 0.5, leg: 0.4, ear: 'round', tail: 0.5, tuft: '#7a3e12', kind: 'roar' }),
  cheetah: () => quad({ color: '#e8bd62', belly: '#fbecc6', snout: '#fbecc6', tear: '#2b2020', bw: 0.36, bh: 0.36, bd: 0.8, hs: 0.4, leg: 0.46, lw: 0.11, ear: 'round', spots: { c: '#2b2020', n: 26, s: 0.06 }, tail: 0.55, kind: 'dash', seed: 8 }),
  leopard: () => quad({ color: '#e0a646', belly: '#f8e6bd', snout: '#f8e6bd', bw: 0.42, bh: 0.4, bd: 0.8, hs: 0.44, leg: 0.36, ear: 'round', spots: { c: '#6a4020', n: 20, s: 0.1 }, tail: 0.6, kind: 'wag', seed: 11 }),
  camel: () => quad({ color: '#d8ae72', belly: '#ecd2a6', snout: '#ecd2a6', bw: 0.56, bh: 0.5, bd: 0.96, hs: 0.42, leg: 0.8, lw: 0.13, neck: 0.5, hump: 0.3, ear: 'round', tail: 0.3, kind: 'chew' }),
  fennec: () => quad({ color: '#f2d2a0', belly: '#fff6e6', snout: '#fff6e6', bw: 0.34, bh: 0.3, bd: 0.48, hs: 0.42, leg: 0.22, lw: 0.08, ear: 'big', tail: 0.42, tuft: '#3a2a1e', tailColor: '#e8c48c', kind: 'ears' }),
  thornydevil: () => thornydevil(),
  kangaroorat: () => kangaroorat(),
  meerkat: () => meerkat(),
  crab: () => crab(),
  sardine: () => sardine(),
  flounder: () => flounder(),
  turtle: () => turtle(),
  shark: () => shark(),
  angler: () => angler(),
  dragonfish: () => dragonfish(),
  oarfish: () => oarfish(),
  clione: () => clione(),
  dumbo: () => dumbo(),
};

const _box = new THREE.Box3(), _v = new THREE.Vector3();
export function buildAnimal(model) {
  const m = (BUILD[model] || BUILD.capybara)();
  m.update(0, false, -1);
  m.root.updateMatrixWorld(true);
  _box.setFromObject(m.root);
  _box.getSize(_v);
  m.size = Math.max(_v.x, _v.y, _v.z * 0.7);   // 사진 크기 판정에 쓰는 길이
  m.height = _v.y;
  m.center = (_box.min.y + _box.max.y) / 2;   // 뿌리에서 몸 가운데까지 높이
  return m;
}

export function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
