// 귀여운 블록 동물 26종: 머리가 크고 몸이 작은 동글동글한 모양 · 큰 눈.
// 외부 3D 모델 없이 상자만으로 만들어요 (저작권 걱정 없음). 동물은 +z 쪽을 바라봐요.
// buildAnimal(model) → { root, update(t, moving, act) , size, center }
//   act: 특별한 순간이 시작된 뒤 지난 초 (아니면 -1)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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
// 둥근 모서리 상자: 동물 · 건물이 둥근 캐릭터와 로우폴리 배경에 어울리게 (크기마다 한 번만 만들어요)
const RB = new Map();
function roundGeo(w, h, d) {
  const k = `${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  if (!RB.has(k)) {
    const r = Math.min(w, h, d) * 0.22;
    RB.set(k, r < 0.012 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 2, r));   // 아주 작은 부품은 각진 채로 (크기는 그대로)
  }
  return RB.get(k);
}
export function box(parent, color, w, h, d, x = 0, y = 0, z = 0, glow = 0, opacity = 1) {
  const m = new THREE.Mesh(roundGeo(w, h, d), typeof color === 'string' ? mat(color, glow, opacity) : color);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
// 각진 상자 (1번 네모 탐험가 · 얇은 판처럼 각이 있어야 하는 것)
export function sharpBox(parent, color, w, h, d, x = 0, y = 0, z = 0, glow = 0, opacity = 1) {
  const m = new THREE.Mesh(BOX, typeof color === 'string' ? mat(color, glow, opacity) : color);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
// =====================================================================
// 진짜 동물처럼: 실제 몸 비율 · 털 색 · 무늬를 매끈한 3D 로 (도감의 진짜 사진과 어울리게)
// 모든 동물은 +z 쪽을 바라봐요. BUILD[model]() → { root, update(t, moving, act) }
// =====================================================================
const sin = Math.sin, cos = Math.cos;
const SPH = new THREE.SphereGeometry(1, 14, 10);   // 휴대폰에 맞게 면 수는 적당히
const SPH_LO = new THREE.SphereGeometry(1, 7, 5);
const SMATS = new Map();
// 털 · 피부 재료 (살짝 거칠게), 눈은 반짝이게
function skin(c, rough = 0.75, extra = {}) {
  const k = c + rough + JSON.stringify(extra);
  if (!SMATS.has(k)) SMATS.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0, ...extra }));
  return SMATS.get(k);
}
function joint(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
// 타원 몸통 조각
function E(p, c, rx, ry, rz, x = 0, y = 0, z = 0, rot = null, lo = false) {
  const m = new THREE.Mesh(lo ? SPH_LO : SPH, typeof c === 'string' ? skin(c) : c);
  m.scale.set(rx, ry, rz); m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  p.add(m); return m;
}
// 가늘어지는 원기둥 (다리 · 목 · 꼬리): 관절 아래로 len 만큼
const CYLS = new Map();
function taper(p, c, len, r0, r1, dir = -1) {
  const k = `${len.toFixed(3)}${r0.toFixed(3)}${r1.toFixed(3)}`;
  if (!CYLS.has(k)) { const g = new THREE.CylinderGeometry(r1, r0, len, 8, 1); CYLS.set(k, g); }
  const m = new THREE.Mesh(CYLS.get(k), typeof c === 'string' ? skin(c) : c);
  m.position.y = dir * len / 2; if (dir > 0) m.rotation.x = Math.PI;
  p.add(m);
  E(p, c, r1, r1, r1, 0, dir * len, 0);   // 끝을 둥글게
  return m;
}
// 진짜 같은 눈: 까만 눈동자(가끔 색 홍채) + 작은 반짝
function eye(p, r, x, y, z, iris = null, pupil = 'round') {
  const g = joint(p, x, y, z);
  if (iris) {
    E(g, skin(iris, 0.2), r, r, r * 0.8);
    E(g, skin('#0b0b0f', 0.1), pupil === 'slit' ? r * 0.25 : r * 0.55, r * 0.8, r * 0.5, 0, 0, r * 0.45);
  } else E(g, skin('#120d0b', 0.12), r, r, r * 0.8);
  E(g, skin('#ffffff', 0.1), r * 0.28, r * 0.28, r * 0.2, -r * 0.3, r * 0.35, r * 0.7, null, true);
  return g;
}
const eyePair = (p, r, gap, y, z, iris, pupil, turn = 0.5) => [-1, 1].map((sx) => { const e = eye(p, r, sx * gap, y, z, iris, pupil); e.rotation.y = sx * turn; return e; });
// 무늬: 타원 표면 위에 납작한 점을 붙여요 (where 로 자리 고르기)
function spotsOn(p, cfg, rnd) {
  const { rx, ry, rz, cx = 0, cy = 0, cz = 0, n, color, size, where = () => true, flat = 0.25, stretch = 1 } = cfg;
  const q = new THREE.Vector3(), nrm = new THREE.Vector3();
  let made = 0, tries = 0;
  while (made < n && tries++ < n * 20) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    const nx = s * cos(th), ny = u, nz = s * sin(th);
    if (!where(nx, ny, nz)) continue;
    q.set(cx + nx * rx * 0.99, cy + ny * ry * 0.99, cz + nz * rz * 0.99);
    nrm.set(nx / rx, ny / ry, nz / rz).normalize();
    const k = size * (0.6 + rnd() * 0.7);
    const m = E(p, color, k * stretch, k, k * flat, q.x, q.y, q.z, null, true);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
    if (cfg.ring) {   // 표범 꽃무늬: 까만 테두리 안이 밝은 색
      const c2 = E(p, cfg.ring, k * stretch * 0.62, k * 0.62, k * flat * 0.6, q.x + nrm.x * 0.006, q.y + nrm.y * 0.006, q.z + nrm.z * 0.006, null, true);
      c2.quaternion.copy(m.quaternion);
    }
    made++;
  }
}
const easeIn = (a, d = 0.3) => Math.min(1, a / d);
const SPINE = new THREE.ConeGeometry(0.012, 0.075, 4);

// ---------------- 네 발 짐승 (사자 · 치타 · 표범 · 하이에나 · 카피바라 · 낙타 · 사막여우 · 땅돼지 · 고슴도치) ----------------
function quadruped(o) {
  const rnd = mulberry(o.seed || 7);
  const root = new THREE.Group();
  const [bx, by, bz] = o.body, H = o.leg + by * 0.55;
  const body = joint(root, 0, H, 0);
  const torso = joint(body);
  E(torso, o.color, bx, by, bz);
  if (o.chest) E(torso, o.chest, bx * 0.82, by * 0.95, bz * 0.5, 0, 0.02, bz * 0.45);   // 가슴은 조금 더 두툼
  if (o.belly) E(torso, o.belly, bx * 0.86, by * 0.55, bz * 0.88, 0, -by * 0.45, 0);
  if (o.rump) E(torso, o.color, bx * 0.95, by * 0.92, bz * 0.45, 0, o.rump, -bz * 0.5);
  if (o.hump) E(torso, o.color, bx * 0.6, o.hump, bz * 0.38, 0, by * 0.75, -bz * 0.05);
  if (o.spots) spotsOn(torso, { rx: bx, ry: by, rz: bz, n: o.spots.n, color: o.spots.c, size: o.spots.s, where: (nx, ny) => ny > -0.35, stretch: o.spots.stretch || 1, ring: o.spots.ring }, rnd);
  if (o.spines) for (let i = 0; i < o.spines; i++) {
    const u = rnd(), th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u), nx = s * cos(th), nz = s * sin(th), ny = u;
    if (ny < 0.05 || nz > 0.85) continue;
    const c = new THREE.Mesh(SPINE, skin(i % 3 ? '#5e4a36' : '#efe4d0'));
    c.position.set(nx * bx, ny * by, nz * bz); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx / bx, ny / by, nz / bz).normalize());
    torso.add(c);
  }
  // 다리: 어깨 · 엉덩이에서 아래로, 끝에 발
  const knees = [];
  const legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => {
    const rear = sz < 0, k = rear ? (o.rearLeg || 1) : 1;
    const top = H - by * 0.25 - (rear ? (1 - k) * o.leg : 0);
    const l = joint(root, sx * bx * 0.55, top, sz * bz * 0.6);
    const len = top, up = len * 0.5, lo = len - up;
    // 허벅지는 몸에 녹아들게 두툼하게, 앞다리는 뒤로 · 뒷다리는 앞으로 살짝 꺾인 무릎
    E(l, o.color, o.legR * (rear ? 2.1 : 1.7), by * (rear ? 0.62 : 0.5), o.legR * (rear ? 2.4 : 1.9), 0, -by * 0.08, rear ? -o.legR * 0.3 : 0);
    taper(l, o.legColor || o.color, up, o.legR * 1.35, o.legR * 1.0);
    const knee = joint(l, 0, -up, 0); knee.rotation.x = rear ? 0.35 : -0.12; knees.push(knee);
    taper(knee, o.legColor || o.color, lo, o.legR * 0.95, o.legR * 0.7);
    const foot = joint(knee, 0, -lo, 0); foot.rotation.x = rear ? -0.35 : 0.12;
    E(foot, o.foot || o.legColor || o.color, o.legR * 1.05, o.legR * 0.65, o.legR * 1.5, 0, o.legR * 0.15, o.legR * 0.4);
    return l;
  });
  if (o.slope) torso.rotation.x = o.slope;   // 하이에나처럼 앞이 높고 뒤가 낮게
  // 목 · 머리
  const neck = joint(body, 0, by * 0.35, bz * 0.82);
  neck.rotation.x = (o.neckTilt ?? 0.75);   // 앞으로 기울인 목
  const [nl, nr] = o.neck || [by * 0.9, by * 0.55];
  taper(neck, o.color, nl, nr, nr * 0.8, 1);
  if (o.mane) { E(neck, o.mane, nr * 1.55, nl * 0.75, nr * 1.45, 0, nl * 0.5, -nr * 0.05); E(neck, o.mane2 || o.mane, nr * 1.2, nl * 0.5, nr * 0.9, 0, nl * 0.2, nr * 0.5); }   // 목 · 가슴 갈기
  const head = joint(neck, 0, nl, 0);
  const headX = -(o.neckTilt ?? 0.75) + (o.headTilt || 0);   // 머리는 다시 앞을 보게
  head.rotation.x = headX;
  const [hx, hy, hz] = o.head;
  E(head, o.headColor || o.color, hx, hy, hz);
  if (o.mane) {
    // 갈기: 얼굴 둘레를 감싸는 털 (얼굴은 앞으로 보이게)
    for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; E(head, i % 2 ? o.mane : o.mane2 || o.mane, hx * 0.55, hx * 0.55, hz * 0.6, cos(a) * hx * 1.2, sin(a) * hy * 1.2 - hy * 0.05, -hz * 0.25); }
    E(head, o.mane, hx * 1.55, hy * 1.55, hz * 0.9, 0, -0.02, -hz * 0.55);
  }
  const [sx_, sy_, sz_, sc] = o.snout;
  E(head, sc || o.headColor || o.color, sx_, sy_, sz_, 0, -hy * 0.25, hz * 0.85);
  if (o.lip) E(head, o.lip, sx_ * 0.85, sy_ * 0.45, sz_ * 0.9, 0, -hy * 0.25 - sy_ * 0.6, hz * 0.85);
  E(head, o.nose || '#2a1d18', sx_ * 0.45, sy_ * 0.35, sy_ * 0.3, 0, -hy * 0.2 + sy_ * 0.35, hz * 0.85 + sz_ * 0.92);
  if (o.tear) for (const s of [-1, 1]) E(head, o.tear, hx * 0.06, hy * 0.42, 0.01, s * hx * 0.38, -hy * 0.2, hz * 0.78, [0, s * 0.5, s * 0.15]);
  const eyes = eyePair(head, hx * (o.eye || 0.16), hx * 0.48, hy * 0.25, hz * 0.62, o.iris, 'round', 0.55);
  if (o.headSpots) spotsOn(head, { rx: hx, ry: hy, rz: hz, n: o.headSpots, color: o.spots.c, size: o.spots.s * 0.6, where: (nx, ny, nz) => ny > 0.1 && nz < 0.7 }, rnd);
  const ears = [-1, 1].map((s) => {
    const e = joint(head, s * hx * 0.62, hy * 0.75, -hz * 0.15);
    const [ew, eh] = o.ear;
    if (o.triEar) {   // 넓은 세모 귀 (사막여우 · 땅돼지)
      const c = new THREE.Mesh(new THREE.ConeGeometry(ew, eh * 2, 16), skin(o.earColor || o.color)); c.scale.z = 0.3; c.position.y = eh; e.add(c);
      if (o.earIn) { const c2 = new THREE.Mesh(new THREE.ConeGeometry(ew * 0.7, eh * 1.6, 16), skin(o.earIn)); c2.scale.z = 0.15; c2.position.set(0, eh * 0.9, ew * 0.12); e.add(c2); }
    } else {
      E(e, o.earColor || o.color, ew, eh, ew * 0.35, 0, eh * 0.75, 0);
      if (o.earIn) E(e, o.earIn, ew * 0.65, eh * 0.7, ew * 0.15, 0, eh * 0.72, ew * 0.18);
    }
    e.rotation.z = s * -(o.earOut ?? 0.35);
    return e;
  });
  // 꼬리
  const tail = joint(body, 0, by * 0.35, -bz * 0.92);
  tail.rotation.x = -(o.tailDroop ?? 2.3);
  taper(tail, o.tailColor || o.color, o.tail, o.tailR || 0.035, (o.tailR || 0.035) * 0.6, 1);
  if (o.tuft) E(tail, o.tuft, (o.tailR || 0.035) * 2.2, (o.tailR || 0.035) * 3, (o.tailR || 0.035) * 2.2, 0, o.tail, 0);
  if (o.tailRings) for (let i = 1; i <= o.tailRings; i++) E(tail, o.spots.c, (o.tailR || 0.035) * 1.15, 0.018, (o.tailR || 0.035) * 1.15, 0, o.tail * (0.4 + i * 0.12), 0, null, true);

  const kind = o.kind, gait = o.gait || 9;
  function update(t, moving, act) {
    const w = moving ? sin(t * gait) * 0.5 : 0;
    legs[0].rotation.x = w; legs[3].rotation.x = w; legs[1].rotation.x = -w; legs[2].rotation.x = -w;
    knees.forEach((k, i) => { const ph = (i === 0 || i === 3 ? 1 : -1) * (moving ? cos(t * gait) : 0); k.userData.base ??= k.rotation.x; k.rotation.x = k.userData.base + (i < 2 ? -1 : 1) * Math.max(0, ph) * 0.6; });
    body.position.y = H + (moving ? Math.abs(sin(t * gait)) * 0.025 : sin(t * 1.6) * 0.006);
    body.rotation.x = 0; torso.scale.y = 1 + (moving ? 0 : sin(t * 1.6) * 0.012);   // 숨쉬기
    neck.rotation.x = (o.neckTilt ?? 0.75) + (moving ? sin(t * gait * 2) * 0.03 : sin(t * 0.7) * 0.05);
    head.rotation.set(headX, moving ? 0 : sin(t * 0.5) * 0.25, 0); head.scale.setScalar(1);
    tail.rotation.z = sin(t * 2.2) * 0.25;
    ears.forEach((e, i) => { e.rotation.x = 0; });
    blink(eyes, t + (o.seed || 0));
    if (act < 0) return;
    const p = easeIn(act);
    if (kind === 'roar') { neck.rotation.x -= 0.35 * p; head.rotation.x += 0.25 * p; head.scale.setScalar(1 + 0.06 * p * (0.7 + 0.3 * sin(act * 28))); }
    else if (kind === 'nap') { neck.rotation.x += 0.55 * p; eyes.forEach((e) => { e.scale.y = 0.12; }); }
    else if (kind === 'laugh') { neck.rotation.x -= 0.25; head.rotation.x += sin(act * 24) * 0.18; body.position.y += Math.abs(sin(act * 24)) * 0.03; }
    else if (kind === 'dash') { const w2 = sin(t * 24) * 0.95; legs[0].rotation.x = w2; legs[3].rotation.x = w2; legs[1].rotation.x = -w2; legs[2].rotation.x = -w2; body.rotation.x = sin(t * 24) * 0.06; }
    else if (kind === 'wag') { tail.rotation.z = sin(act * 12) * 0.9; tail.rotation.x = -1.6; head.rotation.y = sin(act * 3) * 0.3; }
    else if (kind === 'chew') { head.rotation.z = sin(act * 9) * 0.1; neck.rotation.x -= 0.15; }
    else if (kind === 'ears') { ears.forEach((e, i) => { e.rotation.x = -0.4 * p + sin(act * 16 + i) * 0.12; }); head.rotation.y = sin(act * 3) * 0.6; }
    else if (kind === 'dig') { neck.rotation.x += 0.6 * p; legs[0].rotation.x = sin(act * 16) * 0.8; legs[1].rotation.x = -sin(act * 16) * 0.8; }
    else if (kind === 'ball') { torso.scale.set(1 + 0.15 * p, 1 + 0.25 * p, 1 - 0.2 * p); neck.rotation.x += 0.8 * p; }
  }
  return { root, update };
}
function blink(eyes, t) { const b = (t % 4.1) < 0.11 ? 0.12 : 1; eyes.forEach((e) => { e.scale.y = b; }); }

// ---------------- 뱀 (에메랄드나무보아 · 방울뱀) ----------------
function snake(o) {
  const rnd = mulberry(o.seed || 3);
  const root = new THREE.Group();
  const N = 18, segs = [];
  for (let i = 0; i < N; i++) {
    const r = o.r * (i < 3 ? 0.85 + i * 0.05 : Math.max(0.25, 1 - (i - 3) / (N - 2) * 0.85));
    const s = joint(root, 0, r * 0.85, -i * o.r * 1.1);
    const band = o.band && i % 3 === 1;
    E(s, band ? o.band : o.color, r * 1.05, r * 0.85, o.r * 0.9);
    if (o.belly) E(s, o.belly, r * 0.9, r * 0.35, o.r * 0.85, 0, -r * 0.55, 0, null, true);
    if (o.diamond && i % 2 === 0 && i < N - 2) E(s, o.diamond, r * 0.6, r * 0.2, o.r * 0.6, 0, r * 0.78, 0, [0, Math.PI / 4, 0], true);
    segs.push(s);
  }
  const head = joint(root, 0, o.r * 0.85, o.r * 1.1);
  E(head, o.color, o.r * 1.15, o.r * 0.7, o.r * 1.6, 0, 0, o.r * 0.5);
  E(head, o.belly || o.color, o.r * 0.9, o.r * 0.3, o.r * 1.3, 0, -o.r * 0.35, o.r * 0.6, null, true);
  const eyes = eyePair(head, o.r * 0.24, o.r * 0.82, o.r * 0.3, o.r * 1.1, o.iris, 'slit', 0.9);
  const tongue = joint(head, 0, -o.r * 0.15, o.r * 2.0);
  E(tongue, '#c8243c', o.r * 0.08, o.r * 0.05, o.r * 0.6, 0, 0, o.r * 0.5); tongue.visible = false;
  let rattle = null;
  if (o.rattle) { rattle = joint(segs[N - 1], 0, 0.02, -o.r * 0.6); for (let i = 0; i < 4; i++) E(rattle, '#d9c49a', o.r * (0.45 - i * 0.05), o.r * (0.35 - i * 0.04), o.r * 0.32, 0, 0, -i * o.r * 0.42); }
  // 쉴 때는 사진처럼 똬리를 틀고, 움직일 때는 길게 펴서 S자로
  let coil = 1;
  function update(t, moving, act) {
    coil += ((moving ? 0 : 1) - coil) * 0.06;
    const sp = moving ? 7 : 1.6, amp = o.r * 1.6;
    // 똬리: 마디 길이만큼씩 나선을 따라 촘촘하게 (안쪽부터 바깥으로)
    let a = 0.8, rad = o.r * 1.3;
    segs.forEach((s, i) => {
      const lx = sin(t * sp - i * 0.55) * amp * Math.min(1, i / 3 + 0.2), lz = -i * o.r * 1.1;
      const cx = cos(a) * rad, cz = sin(a) * rad, cy = o.r * 0.85 + Math.max(0, 5 - i) * o.r * 0.35;
      s.position.set(lx + (cx - lx) * coil, (o.r * 0.85) + (cy - o.r * 0.85) * coil, lz + (cz - lz) * coil);
      const step = (o.r * 1.15) / rad; a += step; rad += o.r * 1.9 * step / (Math.PI * 2);
    });
    head.position.set(sin(t * sp + 0.55) * amp * 0.2 * (1 - coil), o.r * 0.85 + o.r * 1.6 * coil, o.r * 1.1 * (1 - coil) + o.r * 0.6 * coil);
    head.rotation.set(-0.1 * coil, sin(t * 0.6) * 0.4 * coil, 0); tongue.visible = (t % 2.2) < 0.25;
    blink(eyes, t + 5);
    if (rattle) rattle.rotation.z = 0;
    if (act < 0) return;
    const p = easeIn(act);
    head.position.y += o.r * 2.2 * p; head.rotation.x = -0.25 * p;
    if (rattle) { rattle.rotation.z = sin(act * 70) * 0.4; segs[N - 1].position.y = o.r * 2 * p; }
    else tongue.visible = sin(act * 22) > 0;
  }
  return { root, update };
}

// ---------------- 빨간눈청개구리 ----------------
function frog() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0.13, 0);
  E(body, '#5cc23e', 0.2, 0.12, 0.26);
  E(body, '#4aa8d8', 0.205, 0.06, 0.2, 0, -0.03, -0.02);   // 옆구리 파랑
  E(body, '#f4ecb8', 0.16, 0.06, 0.2, 0, -0.07, 0.02);    // 하얀 배
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) E(body, '#f2d23c', 0.012, 0.035, 0.03, s * 0.19, -0.02, -0.08 + i * 0.07, null, true);   // 옆구리 노란 줄
  const head = joint(body, 0, 0.03, 0.2);
  E(head, '#5cc23e', 0.17, 0.09, 0.13);
  E(head, '#2f7a2a', 0.05, 0.012, 0.012, 0, -0.01, 0.125, null, true);
  const eyes = [-1, 1].map((s) => { const b = joint(head, s * 0.11, 0.08, 0.02); E(b, '#5cc23e', 0.07, 0.065, 0.07); const e = eye(b, 0.06, 0, 0.01, 0.025, '#e0242a', 'slit'); e.rotation.y = s * 0.6; return e; });
  const legs = [-1, 1].map((s) => {
    const l = joint(root, s * 0.17, 0.09, -0.12);
    E(l, '#5cc23e', 0.07, 0.06, 0.16, 0, 0, 0.02);
    E(l, '#4aa8d8', 0.05, 0.04, 0.1, s * 0.03, -0.03, -0.04, null, true);
    for (let k = 0; k < 3; k++) E(l, '#f08a2a', 0.025, 0.012, 0.025, s * 0.04 + (k - 1) * 0.03, -0.075, 0.15);
    return l;
  });
  for (const s of [-1, 1]) { const a = joint(root, s * 0.12, 0.08, 0.15); taper(a, '#5cc23e', 0.08, 0.025, 0.02); for (let k = 0; k < 3; k++) E(a, '#f08a2a', 0.02, 0.01, 0.02, (k - 1) * 0.025, -0.085, 0.02); }
  function update(t, moving, act) {
    let y = moving ? Math.abs(sin(t * 6)) * 0.1 : 0;
    if (act >= 0) y = Math.abs(sin(act * 4)) * 0.45;
    body.position.y = 0.13 + y; legs.forEach((l) => { l.position.y = 0.09 + y * 0.9; l.rotation.x = y > 0.03 ? 0.7 : 0; });
    body.scale.y = 1 + (moving || act >= 0 ? 0 : Math.abs(sin(t * 2.4)) * 0.05);   // 목 부풀리기
    blink(eyes, t + 1);
  }
  return { root, update };
}

// ---------------- 영장류 · 나무늘보 (나무늘보 · 오랑우탄 · 올빼미원숭이) ----------------
function primate(o) {
  const root = new THREE.Group();
  const body = joint(root, 0, o.leg + o.body[1] * 0.8, 0);
  const torso = joint(body); torso.rotation.x = o.lean ?? 0.25;
  E(torso, o.color, ...o.body);
  if (o.shag) for (let i = 0; i < (o.strands ? 18 : 10); i++) { const a = (i / 10) * Math.PI * 2; E(torso, i % 2 ? o.color : o.shag, o.body[0] * 0.35, o.body[1] * 0.5, o.body[2] * 0.3, cos(a) * o.body[0] * 0.8, -o.body[1] * 0.35, sin(a) * o.body[2] * 0.8, null, true); }
  if (o.belly) E(torso, o.belly, o.body[0] * 0.65, o.body[1] * 0.75, o.body[2] * 0.4, 0, -0.02, o.body[2] * 0.62);
  const head = joint(body, 0, o.body[1] * 0.95, o.body[2] * 0.25);
  E(head, o.color, o.head, o.head * 0.95, o.head * 0.9);
  if (o.cheekPads) for (const s of [-1, 1]) E(head, o.color, o.head * 0.35, o.head * 0.55, o.head * 0.2, s * o.head * 0.95, -o.head * 0.05, o.head * 0.3);
  E(head, o.face, o.head * 0.72, o.head * 0.7, o.head * 0.3, 0, -o.head * 0.05, o.head * 0.68);
  E(head, o.muzzle || o.face, o.head * 0.42, o.head * 0.3, o.head * 0.25, 0, -o.head * 0.35, o.head * 0.82);
  E(head, '#2a1d18', o.head * 0.14, o.head * 0.08, o.head * 0.06, 0, -o.head * 0.25, o.head * 1.02);
  if (o.mask) for (const s of [-1, 1]) E(head, o.mask, o.head * 0.22, o.head * 0.11, o.head * 0.08, s * o.head * 0.28, o.head * 0.1, o.head * 0.86, [0, 0, s * -0.4]);
  if (o.brows) for (const s of [-1, 1]) E(head, o.brows, o.head * 0.2, o.head * 0.06, o.head * 0.08, s * o.head * 0.25, o.head * 0.35, o.head * 0.8, [0, 0, s * -0.2]);
  const eyes = eyePair(head, o.head * (o.eye || 0.11), o.head * 0.27, o.head * 0.12, o.head * 0.86, o.iris, 'round', 0.25);
  const arms = [-1, 1].map((s) => {
    const a = joint(body, s * o.body[0] * 0.85, o.body[1] * 0.6, o.body[2] * 0.2);
    taper(a, o.color, o.arm, o.armR, o.armR * 0.75);
    if (o.strands) for (let k = 0; k < 5; k++) E(a, k % 2 ? o.color : o.shag || o.color, o.armR * 0.45, o.arm * 0.22, o.armR * 0.35, (k % 2 - 0.5) * o.armR * 0.9, -o.arm * (0.25 + k * 0.14), -o.armR * 0.8, [0.15, 0, 0], true);
    if (o.claws) for (let k = 0; k < 3; k++) { const c = joint(a, (k - 1) * o.armR * 0.6, -o.arm, o.armR * 0.3); taper(c, '#e8dcc6', o.armR * 1.8, o.armR * 0.2, o.armR * 0.12); c.rotation.x = 0.6; }
    else E(a, o.face, o.armR * 1.2, o.armR * 0.8, o.armR * 1.3, 0, -o.arm, o.armR * 0.4);
    a.rotation.z = s * 0.25;
    return a;
  });
  const legs = [-1, 1].map((s) => { const l = joint(root, s * o.body[0] * 0.45, o.leg, 0.02); taper(l, o.color, o.leg, o.armR * 1.1, o.armR * 0.85); E(l, o.face, o.armR * 1.1, o.armR * 0.6, o.armR * 1.6, 0, -o.leg + 0.02, o.armR * 0.5); return l; });
  let tail = null;
  if (o.tail) { tail = joint(body, 0, -o.body[1] * 0.6, -o.body[2] * 0.7); tail.rotation.x = -2.5; taper(tail, o.color, o.tail, o.armR * 0.8, o.armR * 0.5, 1); }
  const sp = o.slow ? 2.6 : 7;
  function update(t, moving, act) {
    const w = moving ? sin(t * sp) * 0.5 : 0;
    legs[0].rotation.x = w; legs[1].rotation.x = -w;
    arms[0].rotation.set(-w * 1.1 - 0.15, 0, -0.25); arms[1].rotation.set(w * 1.1 - 0.15, 0, 0.25);
    body.rotation.z = moving ? sin(t * sp) * 0.05 : 0;
    head.rotation.set(0, sin(t * (o.slow ? 0.3 : 0.6)) * 0.3, 0);
    if (tail) tail.rotation.z = sin(t * 1.5) * 0.3;
    blink(eyes, t + 3);
    if (act < 0) return;
    const p = easeIn(act, o.slow ? 1.2 : 0.3);
    if (o.slow) { arms[0].rotation.set(0, 0, -2.6 * p); arms[1].rotation.set(0, 0, 2.6 * p); head.rotation.x = -0.35 * p; }
    else if (o.beat) { const b = sin(act * 18); arms[0].rotation.set(-1.4 - b * 0.3, 0, -0.4); arms[1].rotation.set(-1.4 + b * 0.3, 0, 0.4); head.rotation.x = -0.2; }
    else { eyes.forEach((e) => e.scale.setScalar(1 + 0.25 * sin(act * 6) ** 2)); head.rotation.y = sin(act * 2.5) * 0.7; }
  }
  return { root, update };
}

// ---------------- 토코투칸 ----------------
function toucan() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0.32, 0);
  const torso = joint(body); torso.rotation.x = -0.35;
  E(torso, '#16161c', 0.15, 0.24, 0.15);
  E(torso, '#fff2b0', 0.12, 0.11, 0.07, 0, 0.12, 0.11);   // 노르스름한 하얀 목
  E(torso, '#c8243c', 0.08, 0.05, 0.08, 0, -0.18, 0.06);  // 꼬리 밑 빨강
  const head = joint(body, 0, 0.26, 0.04);
  E(head, '#16161c', 0.12, 0.12, 0.12);
  E(head, '#fff2b0', 0.1, 0.07, 0.06, 0, -0.05, 0.08);
  for (const s of [-1, 1]) E(head, '#4fb0e8', 0.05, 0.05, 0.02, s * 0.1, 0.02, 0.05, [0, s * 0.8, 0]);
  const eyes = eyePair(head, 0.026, 0.11, 0.02, 0.055, '#2a3f8a', 'round', 1.0);
  const beak = joint(head, 0, 0.0, 0.1);
  // 몸보다 큰 바나나 모양 부리: 주황 · 끝은 까맣게 · 윗부분 노랑, 아래로 살짝 휘어요
  const bk = joint(beak); bk.rotation.x = 0.18;
  E(bk, skin('#ff8a1c', 0.35), 0.055, 0.085, 0.25, 0, -0.01, 0.2);
  E(bk, skin('#ffb81c', 0.35), 0.05, 0.035, 0.2, 0, 0.055, 0.16, null, true);
  E(bk, skin('#e2283a', 0.4), 0.05, 0.02, 0.04, 0, 0.07, 0.03, null, true);
  E(bk, skin('#16161c', 0.3), 0.04, 0.05, 0.06, 0, -0.03, 0.42);
  E(bk, '#16161c', 0.056, 0.006, 0.22, 0, -0.012, 0.2, null, true);   // 부리 사이 선
  const wings = [-1, 1].map((s) => { const w = joint(body, s * 0.13, 0.08, 0); E(w, '#16161c', 0.04, 0.2, 0.13, 0, -0.08, -0.03); return w; });
  const tail = joint(body, 0, -0.18, -0.1); E(tail, '#16161c', 0.07, 0.03, 0.22, 0, 0, -0.2); tail.rotation.x = 0.5;
  for (const s of [-1, 1]) { const l = joint(root, s * 0.06, 0.12, 0.02); taper(l, '#4a6a9a', 0.12, 0.018, 0.014); }
  function update(t, moving, act) {
    body.position.y = 0.32 + (moving ? Math.abs(sin(t * 10)) * 0.04 : 0);
    head.rotation.set(0, sin(t * 1.1) * 0.5, sin(t * 0.7) * 0.1);
    wings[0].rotation.z = 0; wings[1].rotation.z = 0;
    blink(eyes, t + 2);
    if (act < 0) return;
    const f = sin(act * 26) * 0.8 + 0.8;
    wings[0].rotation.z = -f; wings[1].rotation.z = f;
    body.position.y = 0.32 + Math.abs(sin(act * 4)) * 0.35;
  }
  return { root, update };
}

// ---------------- 가시도마뱀 ----------------
function thornydevil() {
  const rnd = mulberry(7);
  const root = new THREE.Group();
  const body = joint(root, 0, 0.09, 0);
  E(body, '#c98a4a', 0.15, 0.07, 0.2);
  spotsOn(body, { rx: 0.15, ry: 0.07, rz: 0.2, n: 14, color: '#7a3e22', size: 0.04, where: (x, y) => y > 0 }, rnd);
  spotsOn(body, { rx: 0.15, ry: 0.07, rz: 0.2, n: 10, color: '#ecc070', size: 0.035, where: (x, y) => y > 0 }, rnd);
  const spikes = joint(body);
  for (let i = 0; i < 26; i++) {
    const u = rnd() * 0.9 + 0.1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u), nx = s * cos(th), nz = s * sin(th);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 5), skin(i % 3 ? '#a8622e' : '#f2c27a'));
    c.position.set(nx * 0.15, u * 0.07, nz * 0.2); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx / 0.15, u / 0.07, nz / 0.2).normalize()); spikes.add(c);
  }
  const head = joint(body, 0, 0.02, 0.2);
  E(head, '#c98a4a', 0.08, 0.05, 0.09, 0, 0, 0.04);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.07, 6), skin('#a8622e')); h.position.set(s * 0.04, 0.06, 0.01); h.rotation.z = s * -0.3; head.add(h); }
  const eyes = eyePair(head, 0.016, 0.06, 0.02, 0.06, '#3a2a1a', 'round', 1.1);
  const tail = joint(body, 0, 0, -0.18); tail.rotation.x = -1.7; taper(tail, '#c98a4a', 0.22, 0.03, 0.01, 1);
  const legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => { const l = joint(root, sx * 0.12, 0.07, sz * 0.12); l.rotation.z = sx * 1.1; taper(l, '#b87a3e', 0.1, 0.02, 0.014); return l; });
  function update(t, moving, act) {
    const w = moving ? sin(t * 12) * 0.5 : 0;
    legs.forEach((l, i) => { l.rotation.y = (i === 0 || i === 3 ? w : -w); });
    tail.rotation.z = sin(t * (moving ? 12 : 1.5)) * 0.25;
    body.scale.set(1, 1, 1); spikes.scale.setScalar(1); head.rotation.set(0, 0, 0);
    blink(eyes, t + 4);
    if (act < 0) return;
    const p = easeIn(act, 0.4);
    body.scale.set(1 + 0.12 * p, 1 + 0.3 * p, 1); spikes.scale.setScalar(1 + 0.35 * p); head.rotation.x = 0.5 * p;
  }
  return { root, update };
}

// ---------------- 캥거루쥐 ----------------
function kangaroorat() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0.13, 0);
  E(body, '#c9a072', 0.1, 0.1, 0.12);
  E(body, '#fbf3e4', 0.075, 0.07, 0.09, 0, -0.04, 0.02);
  const head = joint(body, 0, 0.08, 0.1);
  E(head, '#c9a072', 0.075, 0.07, 0.085);
  E(head, '#fbf3e4', 0.04, 0.03, 0.05, 0, -0.03, 0.06);
  E(head, '#e89aa0', 0.012, 0.01, 0.01, 0, -0.01, 0.13);
  for (const s of [-1, 1]) E(head, '#fbf3e4', 0.025, 0.015, 0.02, s * 0.05, -0.035, 0.045, null, true);   // 하얀 뺨
  const eyes = eyePair(head, 0.024, 0.045, 0.02, 0.06, null, 'round', 0.7);
  for (const s of [-1, 1]) { const e = joint(head, s * 0.04, 0.06, -0.01); E(e, '#d8b088', 0.025, 0.035, 0.008, 0, 0.02, 0); E(e, '#f0c8c0', 0.015, 0.024, 0.004, 0, 0.02, 0.006); }
  const legs = [-1, 1].map((s) => { const l = joint(root, s * 0.07, 0.1, -0.02); E(l, '#c9a072', 0.045, 0.07, 0.08); E(l, '#fbf3e4', 0.03, 0.015, 0.1, 0, -0.07, 0.05); return l; });
  for (const s of [-1, 1]) { const a = joint(body, s * 0.05, -0.02, 0.09); taper(a, '#fbf3e4', 0.04, 0.012, 0.01); }
  const tail = joint(body, 0, -0.04, -0.11); tail.rotation.x = -1.4;
  taper(tail, '#b88a5a', 0.38, 0.012, 0.008, 1);
  E(tail, '#2e2016', 0.025, 0.06, 0.025, 0, 0.36, 0); E(tail, '#fbf3e4', 0.022, 0.03, 0.022, 0, 0.42, 0);
  function update(t, moving, act) {
    let y = moving ? Math.abs(sin(t * 9)) * 0.1 : 0;
    if (act >= 0) y = Math.abs(sin(act * 3.5)) * 0.7;
    body.position.y = 0.13 + y; legs.forEach((l) => { l.position.y = 0.1 + y; l.rotation.x = y > 0.03 ? 0.5 : 0; });
    head.rotation.y = sin(t * 2) * 0.3;
    blink(eyes, t + 6);
  }
  return { root, update };
}

// ---------------- 미어캣 ----------------
function meerkat() {
  const root = new THREE.Group();
  const body = joint(root, 0, 0.1, 0);
  const torso = joint(body, 0, 0.17, 0);
  E(torso, '#c9a06a', 0.085, 0.19, 0.08);
  E(torso, '#ecd2a6', 0.06, 0.15, 0.03, 0, -0.01, 0.06);
  for (let i = 0; i < 5; i++) E(torso, '#8a6a44', 0.06, 0.012, 0.03, 0, 0.08 - i * 0.04, -0.07, null, true);   // 등 줄무늬
  const head = joint(body, 0, 0.4, 0.02);
  E(head, '#d4ae7a', 0.07, 0.065, 0.075);
  E(head, '#d4ae7a', 0.035, 0.03, 0.05, 0, -0.02, 0.08);
  E(head, '#2a1d18', 0.015, 0.012, 0.01, 0, -0.01, 0.13);
  for (const s of [-1, 1]) E(head, '#2e2016', 0.028, 0.03, 0.02, s * 0.035, 0.01, 0.055, [0, s * 0.4, 0]);   // 까만 눈 둘레
  const eyes = eyePair(head, 0.016, 0.037, 0.012, 0.07, null, 'round', 0.45);
  for (const s of [-1, 1]) E(head, '#2e2016', 0.02, 0.022, 0.01, s * 0.065, 0.03, -0.01);
  const arms = [-1, 1].map((s) => { const a = joint(torso, s * 0.06, 0.08, 0.05); taper(a, '#c9a06a', 0.1, 0.018, 0.014); return a; });
  for (const s of [-1, 1]) { const l = joint(root, s * 0.05, 0.1, 0.02); E(l, '#c9a06a', 0.045, 0.08, 0.06, 0, -0.03, 0); E(l, '#2e2016', 0.025, 0.012, 0.05, 0, -0.1, 0.04); }
  const tail = joint(body, 0, 0.04, -0.06); tail.rotation.x = -1.9; taper(tail, '#c9a06a', 0.24, 0.022, 0.01, 1); E(tail, '#2e2016', 0.014, 0.05, 0.014, 0, 0.23, 0);
  function update(t, moving, act) {
    body.rotation.x = moving ? 1.0 : 0; body.position.y = moving ? 0.1 + Math.abs(sin(t * 11)) * 0.03 : 0.1;
    torso.scale.y = 1; head.rotation.set(moving ? -1.0 : 0, sin(t * 1.3) * 0.6, 0);
    arms.forEach((a) => { a.rotation.x = moving ? 0.3 : -0.3; });
    blink(eyes, t + 7);
    if (act < 0) return;
    const p = easeIn(act);
    body.rotation.x = 0; torso.scale.y = 1 + 0.15 * p; head.rotation.set(-0.15, sin(act * 3) * 1.0, 0);
  }
  return { root, update };
}

// ---------------- 게 (홍게 · 유령게) ----------------
function crab(C1 = '#d8402a', C2 = '#f07a4a', legLong = 1, stalks = false, clawK = 1) {
  const root = new THREE.Group();
  const body = joint(root, 0, 0.13, 0);
  E(body, C1, 0.19, 0.075, 0.19);
  E(body, C2, 0.15, 0.04, 0.12, 0, 0.05, 0.02, null, true);
  for (let i = 0; i < 6; i++) E(body, C2, 0.015, 0.015, 0.015, (i % 3 - 1) * 0.08, 0.075, (Math.floor(i / 3) - 0.5) * 0.08, null, true);
  E(body, '#f6ecd8', 0.17, 0.03, 0.14, 0, -0.06, 0, null, true);
  const eyes = [-1, 1].map((s) => { const e = joint(body, s * 0.04, 0.06, 0.15); if (stalks) { taper(e, C1, 0.07, 0.008, 0.008, 1); const k = eye(e, 0.02, 0, 0.08, 0); return k; } return eye(e, 0.016, 0, 0.01, 0); });
  const claws = [-1, 1].map((s) => {
    const c = joint(body, s * 0.16, 0.0, 0.12); c.rotation.y = s * -0.4;
    taper(c, C1, 0.12, 0.025, 0.02, 1); c.children[0].rotation.x = Math.PI / 2 + 0.4; c.children[0].position.set(0, 0.03, 0.05);
    c.scale.setScalar(clawK);
    const top = joint(c, 0, 0.05, 0.12); E(top, C1, 0.05, 0.035, 0.07, 0, 0, 0.04); E(top, '#2a1d18', 0.01, 0.01, 0.025, 0, 0, 0.1, null, true);
    E(c, C1, 0.035, 0.02, 0.06, 0, 0.02, 0.17);
    return { c, top };
  });
  const legs = [];
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const l = joint(root, s * 0.17, 0.13, -0.08 + i * 0.05);
    l.rotation.z = s * (legLong > 1.2 ? 1.35 : 1.0 - i * 0.05); l.rotation.y = s * (0.45 - i * 0.3);   // 대게처럼 긴 다리는 옆으로 쫙
    taper(l, C1, 0.13 * legLong, 0.012, 0.009);
    const k = joint(l, 0, -0.13 * legLong, 0); k.rotation.z = s * (legLong > 1.2 ? -0.9 : -1.6); taper(k, C2, 0.12 * legLong, 0.009, 0.005);
    legs.push(l);
  }
  function update(t, moving, act) {
    legs.forEach((l, i) => { l.rotation.x = moving ? sin(t * 16 + i) * 0.35 : 0; });
    body.position.y = 0.13 + (moving ? Math.abs(sin(t * 16)) * 0.015 : 0);
    claws.forEach(({ c, top }) => { c.rotation.x = 0; top.rotation.x = 0; });
    blink(eyes, t + 8);
    if (act < 0) return;
    if (stalks) { root.position.x = sin(act * 10) * 0.25; return; }   // 유령게는 쌩 옆으로
    claws.forEach(({ c, top }, i) => { c.rotation.x = -0.9 * easeIn(act, 0.25); top.rotation.x = -Math.abs(sin(act * 14 + i)) * 0.6; });
  }
  return { root, update };
}

// ---------------- 물고기 공통: 렌즈 모양 몸 · 등이 짙고 배가 밝게 ----------------
function fin(p, c, w, h, x, y, z, rot, opacity = 0.9) {
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(w * 0.4, h * 0.9, w, h); sh.lineTo(w * 0.9, 0); sh.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), skin(c, 0.5, { side: THREE.DoubleSide, transparent: opacity < 1, opacity }));
  m.position.set(x, y, z); if (rot) m.rotation.set(...rot); p.add(m); return m;
}
function fishBody(p, o) {
  const g = joint(p);
  E(g, o.back, o.w, o.h, o.l);
  E(g, o.belly, o.w * 1.01, o.h * 0.55, o.l * 0.94, 0, -o.h * 0.45, 0);
  if (o.stripe) E(g, o.stripe, o.w * 1.02, o.h * 0.12, o.l * 0.9, 0, 0, 0, null, true);
  const eyes = eyePair(g, o.h * 0.16, o.w * 0.8, o.h * 0.2, o.l * 0.65, o.iris || '#d8d8c0', 'round', 1.3);
  const tail = joint(g, 0, 0, -o.l * 0.95);
  fin(tail, o.fin, o.h * 0.9, o.h * 1.0, 0, 0, 0, [0, Math.PI / 2, 0]);
  fin(tail, o.fin, o.h * 0.9, o.h * 1.0, 0, 0, 0, [Math.PI, Math.PI / 2, 0]);
  if (o.dorsal !== false) fin(g, o.fin, o.l * 0.45, o.h * 0.7, 0, o.h * 0.8, o.l * 0.15, [0, Math.PI / 2, 0]);
  return { g, tail, eyes };
}
function sardine() {
  const root = new THREE.Group(), rnd = mulberry(5), fish = [];
  for (let i = 0; i < 12; i++) {
    const p = joint(root, (rnd() - 0.5) * 0.9, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.8);
    const f = fishBody(p, { w: 0.022, h: 0.035, l: 0.13, back: '#3e7a8a', belly: '#e6ecf0', stripe: '#c8d4dc', fin: '#b8c8d0' });
    for (let k = 0; k < 3; k++) E(f.g, '#1e3c58', 0.006, 0.006, 0.006, 0.034, 0.02, 0.06 - k * 0.04, null, true);
    fish.push({ p, ...f, base: p.position.clone(), ph: rnd() * 6 });
  }
  function update(t, moving, act) {
    fish.forEach((f) => { f.tail.rotation.y = sin(t * 18 + f.ph) * 0.45; f.p.position.y = f.base.y + sin(t * 2 + f.ph) * 0.05; f.p.rotation.set(0, 0, 0); });
    root.rotation.y = 0;
    if (act < 0) return;
    fish.forEach((f) => { f.p.rotation.z = act * 8 + f.ph; f.p.position.y = f.base.y + sin(act * 6 + f.ph) * 0.1; });
    root.rotation.y = act * 2.6;
  }
  return { root, update };
}
function flounder() {
  const root = new THREE.Group(), rnd = mulberry(9);
  const body = joint(root, 0, 0.05, 0);
  E(body, '#9a7e5c', 0.24, 0.035, 0.3);
  spotsOn(body, { rx: 0.24, ry: 0.035, rz: 0.3, n: 22, color: '#6e5636', size: 0.03, where: (x, y) => y > 0.3 }, rnd);
  spotsOn(body, { rx: 0.24, ry: 0.035, rz: 0.3, n: 10, color: '#d8c49a', size: 0.02, where: (x, y) => y > 0.3 }, rnd);
  for (const s of [-1, 1]) E(body, '#8a6e4c', 0.06, 0.012, 0.28, s * 0.23, 0, -0.01, null, true);   // 지느러미 테두리
  const eyes = [eye(body, 0.024, -0.03, 0.04, 0.2, '#d8c88a'), eye(body, 0.024, 0.05, 0.04, 0.16, '#d8c88a')];
  eyes.forEach((e) => { e.rotation.x = -1.3; });
  const tail = joint(body, 0, 0, -0.3); fin(tail, '#8a6e4c', 0.12, 0.1, 0, 0, 0, [-Math.PI / 2, 0, 0]); fin(tail, '#8a6e4c', 0.12, 0.1, 0, 0, 0, [-Math.PI / 2, Math.PI, 0]);
  const sand = joint(root); sand.visible = false;
  for (let i = 0; i < 10; i++) E(sand, '#e6d2a2', 0.025, 0.025, 0.025, (rnd() - 0.5) * 0.6, 0.05, (rnd() - 0.5) * 0.6, null, true);
  function update(t, moving, act) {
    tail.rotation.x = sin(t * (moving ? 8 : 2)) * 0.25; body.rotation.z = moving ? sin(t * 8) * 0.05 : 0; body.position.y = 0.05; sand.visible = false;
    blink(eyes, t + 9);
    if (act < 0) return;
    body.position.y = 0.05 + Math.abs(sin(act * 8)) * 0.08; body.rotation.z = sin(act * 16) * 0.15;
    sand.visible = true; sand.children.forEach((s, i) => { s.position.y = 0.05 + ((act * 1.2 + i * 0.11) % 0.5); });
  }
  return { root, update };
}
function turtle() {
  const root = new THREE.Group();
  const body = joint(root);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), skin('#5a6a3a', 0.55));
  shell.scale.set(0.44, 0.24, 0.52); body.add(shell); shell.material = skin('#6a3e22', 0.45);
  // 등딱지 무늬 (가운데 줄 + 양옆 판)
  // 등딱지 판: 붉은 갈색 판마다 밝은 테두리와 가운데서 퍼지는 무늬
  for (let i = 0; i < 5; i++) { E(body, '#c8905a', 0.085, 0.032, 0.075, 0, 0.235 - Math.abs(i - 2) * 0.03, -0.3 + i * 0.15, null, true); E(body, '#8a4a26', 0.065, 0.035, 0.055, 0, 0.237 - Math.abs(i - 2) * 0.03, -0.3 + i * 0.15, null, true); }
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { E(body, '#c8905a', 0.08, 0.026, 0.075, s * 0.2, 0.16, -0.22 + i * 0.15, [0, 0, s * 0.6], true); E(body, '#7a4022', 0.06, 0.028, 0.055, s * 0.201, 0.162, -0.22 + i * 0.15, [0, 0, s * 0.6], true); }
  E(body, '#e8dcb0', 0.42, 0.05, 0.5, 0, -0.01, 0);
  const head = joint(body, 0, 0.03, 0.5);
  E(head, '#8a6a46', 0.1, 0.085, 0.13, 0, 0.01, 0.06);
  for (let i = 0; i < 4; i++) E(head, '#e8d2a6', 0.03, 0.02, 0.025, (i % 2 - 0.5) * 0.08, 0.07, 0.03 + Math.floor(i / 2) * 0.06, null, true);
  const eyes = eyePair(head, 0.02, 0.07, 0.04, 0.14, '#3a2a1a', 'round', 0.9);
  const fl = [[-1, 1, 0.34], [1, 1, 0.34], [-1, -1, 0.18], [1, -1, 0.18]].map(([sx, sz, len]) => { const f = joint(body, sx * 0.36, -0.02, sz * 0.22); E(f, '#8a6a46', len, 0.025, 0.1, sx * len * 0.85, 0, 0, [0, sx * sz * -0.35, 0]); return f; });
  function update(t, moving, act) {
    const s = sin(t * (moving ? 2.6 : 1.2));
    fl[0].rotation.z = s * 0.45; fl[1].rotation.z = -s * 0.45; fl[2].rotation.z = -s * 0.25; fl[3].rotation.z = s * 0.25;
    head.rotation.set(0, sin(t * 0.7) * 0.2, 0);
    blink(eyes, t + 10);
    if (act < 0) return;
    fl[0].rotation.z = 0.9 + sin(act * 10) * 0.5; head.rotation.x = -0.3;
  }
  return { root, update };
}
function shark() {
  const root = new THREE.Group();
  const body = joint(root);
  E(body, '#c8b47a', 0.17, 0.2, 0.85);
  E(body, '#f2ead2', 0.165, 0.09, 0.78, 0, -0.11, 0.02);
  E(body, '#c8b47a', 0.13, 0.1, 0.26, 0, -0.02, 0.72);   // 납작하고 넓은 코
  E(body, '#2a2a2a', 0.08, 0.008, 0.05, 0, -0.1, 0.78, null, true);   // 입
  const eyes = eyePair(body, 0.02, 0.11, 0.0, 0.74, '#c8c070', 'slit', 1.3);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) E(body, '#8a7a4a', 0.004, 0.06, 0.01, s * 0.235, 0, 0.4 - i * 0.04, null, true);   // 아가미
  fin(body, '#a8985a', 0.3, 0.32, 0, 0.22, 0.05, [0, Math.PI / 2, 0]);
  fin(body, '#a8985a', 0.24, 0.26, 0, 0.14, -0.42, [0, Math.PI / 2, 0]);   // 레몬상어는 두 등지느러미 크기가 비슷해요
  const pect = [-1, 1].map((s) => { const f = joint(body, s * 0.2, -0.12, 0.25); fin(f, '#a8985a', 0.3, 0.12, 0, 0, 0, [Math.PI / 2, 0, s > 0 ? 0 : Math.PI]); f.rotation.z = s * -0.4; return f; });
  const tail = joint(body, 0, 0, -0.8);
  fin(tail, '#a8985a', 0.3, 0.42, 0, 0, 0, [0, Math.PI / 2, 0.1]);
  fin(tail, '#a8985a', 0.22, 0.22, 0, 0, 0, [Math.PI, Math.PI / 2, 0.1]);
  function update(t, moving, act) {
    tail.rotation.y = sin(t * 4) * 0.35; body.rotation.y = sin(t * 4) * 0.05; body.rotation.z = 0;
    blink(eyes, t + 11);
    if (act < 0) return;
    body.rotation.z = act * 4.5;
  }
  return { root, update };
}
function angler() {
  const root = new THREE.Group();
  const body = joint(root);
  E(body, '#3a2e3a', 0.32, 0.3, 0.34);
  E(body, '#2a2028', 0.3, 0.12, 0.3, 0, -0.18, 0.04);
  E(body, '#120c12', 0.26, 0.09, 0.08, 0, -0.06, 0.29);   // 커다란 입
  for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.07, 5), skin('#f2ece0', 0.3)); c.position.set(-0.2 + i * 0.057, i % 2 ? -0.02 : -0.1, 0.33); c.rotation.x = i % 2 ? Math.PI : 0; body.add(c); }
  const eyes = eyePair(body, 0.03, 0.15, 0.1, 0.26, null, 'round', 0.7);
  const lure = joint(body, 0, 0.26, 0.15);
  const rod = joint(lure); rod.rotation.x = 0.6; taper(rod, '#4a3a4a', 0.32, 0.012, 0.008, 1);
  const bulb = joint(rod, 0, 0.33, 0);
  E(bulb, skin('#bff6ff', 0.2, { emissive: '#bff6ff', emissiveIntensity: 1.6 }), 0.045, 0.045, 0.045);
  const tail = joint(body, 0, 0, -0.32); fin(tail, '#3a2e3a', 0.18, 0.2, 0, 0, 0, [0, Math.PI / 2, 0]); fin(tail, '#3a2e3a', 0.18, 0.2, 0, 0, 0, [Math.PI, Math.PI / 2, 0]);
  function update(t, moving, act) {
    tail.rotation.y = sin(t * 3.5) * 0.35; lure.rotation.x = sin(t * 1.8) * 0.15; bulb.scale.setScalar(1);
    blink(eyes, t + 12);
    if (act < 0) return;
    bulb.scale.setScalar(1.6 + sin(act * 12) * 0.5); lure.rotation.x = sin(act * 6) * 0.35;
  }
  return { root, update };
}
function dragonfish() {
  const root = new THREE.Group();
  const segs = []; let prev = root;
  for (let i = 0; i < 6; i++) {
    const s = joint(prev, 0, 0, i ? -0.2 : 0.2); prev = s;
    const k = 1 - i * 0.12;
    E(s, '#14121e', 0.07 * k, 0.1 * k, 0.13);
    E(s, skin('#6ef0ff', 0.2, { emissive: '#6ef0ff', emissiveIntensity: 1.3 }), 0.01, 0.01, 0.01, 0.07 * k, -0.05 * k, 0, null, true);
    E(s, skin('#6ef0ff', 0.2, { emissive: '#6ef0ff', emissiveIntensity: 1.3 }), 0.01, 0.01, 0.01, -0.07 * k, -0.05 * k, 0, null, true);
    segs.push(s);
  }
  const head = joint(segs[0], 0, 0.01, 0.13);
  E(head, '#14121e', 0.08, 0.11, 0.14, 0, 0, 0.04);
  for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.06, 5), skin('#e8e8f0', 0.3)); c.position.set(-0.04 + i * 0.02, -0.05, 0.16); c.rotation.x = Math.PI; head.add(c); }
  const eyes = eyePair(head, 0.022, 0.06, 0.03, 0.1, '#3a3a50', 'round', 1.2);
  const barbel = joint(head, 0, -0.1, 0.06);
  taper(barbel, '#3a3550', 0.32, 0.005, 0.004);
  const glow = joint(barbel, 0, -0.33, 0); E(glow, skin('#ff5af0', 0.2, { emissive: '#ff5af0', emissiveIntensity: 1.6 }), 0.03, 0.03, 0.03);
  const tail = segs[5]; fin(tail, '#14121e', 0.12, 0.14, 0, 0, -0.1, [0, Math.PI / 2, 0]); fin(tail, '#14121e', 0.12, 0.14, 0, 0, -0.1, [Math.PI, Math.PI / 2, 0]);
  function update(t, moving, act) {
    segs.forEach((s, i) => { s.rotation.y = i ? sin(t * 3.5 - i) * 0.16 : 0; });
    barbel.rotation.x = sin(t * 2) * 0.2; barbel.rotation.z = 0; glow.scale.setScalar(1);
    blink(eyes, t + 13);
    if (act < 0) return;
    barbel.rotation.z = sin(act * 7) * 0.8; barbel.rotation.x = -0.5; glow.scale.setScalar(1.6 + sin(act * 14) * 0.5);
  }
  return { root, update };
}
function oarfish() {
  const root = new THREE.Group();
  const segs = []; let prev = root;
  for (let i = 0; i < 14; i++) {
    const s = joint(prev, 0, 0, i ? -0.24 : 0.9); prev = s;
    const h = 0.17 - i * 0.008;
    E(s, i % 2 ? '#dfe5ee' : '#c8d0dc', 0.04, h, 0.14);
    if (i % 2 === 0) E(s, '#7a8aa0', 0.041, 0.012, 0.04, 0, (i % 4 ? 0.05 : -0.04), 0, null, true);
    E(s, skin('#e2283a', 0.5, { transparent: true, opacity: 0.9 }), 0.008, 0.05, 0.13, 0, h + 0.03, 0, null, true);   // 빨간 등지느러미
    segs.push(s);
  }
  const head = joint(segs[0], 0, 0, 0.14);
  E(head, '#dfe5ee', 0.045, 0.15, 0.12);
  for (let i = 0; i < 5; i++) { const r = joint(head, 0, 0.14, -0.02 - i * 0.03); r.rotation.x = -0.5 - i * 0.12; taper(r, '#e2283a', 0.3 - i * 0.04, 0.008, 0.004, 1); }
  const eyes = eyePair(head, 0.025, 0.04, 0.03, 0.06, '#c8c8a0', 'round', 1.4);
  function update(t, moving, act) {
    const amp = act >= 0 ? 0.42 : 0.16, sp = act >= 0 ? 6 : 2.4;
    segs.forEach((s, i) => { s.rotation.y = i ? sin(t * sp - i * 0.7) * amp * 0.6 : 0; s.rotation.x = act >= 0 && i ? sin(t * sp - i * 0.7 + 1) * 0.1 : 0; });
    blink(eyes, t + 14);
  }
  return { root, update };
}
function clione() {
  const root = new THREE.Group();
  const body = joint(root);
  const glass = skin('#eaf6ff', 0.15, { transparent: true, opacity: 0.55, emissive: '#cfeaff', emissiveIntensity: 0.25 });
  E(body, glass, 0.09, 0.22, 0.09);
  E(body, skin('#ff7a2a', 0.4, { emissive: '#ff7a2a', emissiveIntensity: 0.4 }), 0.045, 0.07, 0.045, 0, -0.02, 0);
  const head = joint(body, 0, 0.2, 0);
  E(head, glass, 0.08, 0.08, 0.08);
  E(head, skin('#ff8a3a', 0.4), 0.03, 0.03, 0.03, 0, 0.06, 0, null, true);
  const eyes = eyePair(head, 0.01, 0.03, 0.01, 0.07, null, 'round', 0.3);
  E(body, glass, 0.04, 0.06, 0.04, 0, -0.24, 0);
  const wings = [-1, 1].map((s) => { const w = joint(body, s * 0.07, 0.08, 0); E(w, glass, 0.12, 0.06, 0.012, s * 0.11, 0, 0); return w; });
  function update(t, moving, act) {
    const sp = act >= 0 ? 20 : 5, a = act >= 0 ? 0.9 : 0.5;
    wings[0].rotation.y = sin(t * sp) * a; wings[1].rotation.y = -sin(t * sp) * a;
    body.position.y = sin(t * 2) * 0.05 + (act >= 0 ? Math.abs(sin(act * 3)) * 0.25 : 0);
    blink(eyes, t + 15);
  }
  return { root, update };
}
function dumbo() {
  const root = new THREE.Group();
  const body = joint(root);
  const mantle = skin('#d8d0ec', 0.35, { transparent: true, opacity: 0.95, emissive: '#6a5aa0', emissiveIntensity: 0.12 });
  E(body, mantle, 0.25, 0.3, 0.24, 0, 0.08, 0);
  E(body, skin('#e8e2f6', 0.35), 0.16, 0.12, 0.15, 0, 0.3, -0.02);
  const eyes = eyePair(body, 0.035, 0.12, 0.04, 0.2, null, 'round', 0.6);
  const ears = [-1, 1].map((s) => { const e = joint(body, s * 0.22, 0.24, 0); E(e, skin('#c8bce8', 0.4, { transparent: true, opacity: 0.9 }), 0.15, 0.025, 0.1, s * 0.12, 0, 0); return e; });
  // 다리 사이 막(우산처럼) + 다리 8개
  const web = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.22, 16, 1, true), skin('#c8bce8', 0.5, { transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  web.position.y = -0.24; web.rotation.x = Math.PI; body.add(web);
  const arms = [...Array(8)].map((_, i) => { const an = (i / 8) * Math.PI * 2; const a = joint(body, cos(an) * 0.17, -0.18, sin(an) * 0.17); taper(a, '#d8d0ec', 0.2, 0.03, 0.015); for (let k = 0; k < 3; k++) E(a, '#f4e8d8', 0.008, 0.008, 0.008, 0, -0.05 - k * 0.05, 0.02, null, true); a.userData.an = an; return a; });
  function update(t, moving, act) {
    const sp = act >= 0 ? 12 : 2.6, a = act >= 0 ? 0.8 : 0.35;
    ears[0].rotation.z = sin(t * sp) * a; ears[1].rotation.z = -sin(t * sp) * a;
    body.position.y = sin(t * 1.4) * 0.06 + (act >= 0 ? Math.abs(sin(act * 4)) * 0.25 : 0);
    arms.forEach((ar) => { const k = 0.35 + sin(t * 1.8) * 0.12; ar.rotation.x = sin(ar.userData.an) * k; ar.rotation.z = -cos(ar.userData.an) * k; });
    web.scale.set(1 + sin(t * 1.8) * 0.08, 1, 1 + sin(t * 1.8) * 0.08);
    blink(eyes, t + 16);
  }
  return { root, update };
}

// ---------------- 동물별 실제 모습 ----------------
const BUILD = {
  frog: () => frog(),
  snake: () => snake({ color: '#2fa84a', band: '#e8f4d0', belly: '#e8e070', r: 0.075, iris: '#c8b84a', seed: 2 }),
  rattlesnake: () => snake({ color: '#c4a46e', diamond: '#6e4a2a', belly: '#efe0b8', r: 0.07, iris: '#d8a83a', rattle: true, seed: 4 }),
  sloth: () => primate({ color: '#8e877a', shag: '#a8a090', strands: true, face: '#efe2c8', muzzle: '#e2d2b2', mask: '#2e241c', body: [0.24, 0.27, 0.2], head: 0.15, leg: 0.12, arm: 0.42, armR: 0.045, claws: true, slow: true, lean: 0.35 }),
  orangutan: () => primate({ color: '#a8481a', shag: '#c8642a', strands: true, face: '#5a3a2e', muzzle: '#6e4a3a', body: [0.3, 0.33, 0.25], head: 0.2, leg: 0.2, arm: 0.66, armR: 0.065, cheekPads: true, beat: true, eye: 0.1, lean: 0.2 }),
  nightmonkey: () => primate({ color: '#7a7066', belly: '#e0a868', face: '#c8baa4', muzzle: '#d8cbb4', brows: '#f4ecdc', mask: '#2a2420', body: [0.14, 0.17, 0.13], head: 0.12, leg: 0.12, arm: 0.2, armR: 0.03, eye: 0.3, iris: '#b8762a', tail: 0.42, lean: 0.3 }),
  toucan: () => toucan(),
  capybara: () => quadruped({ body: [0.3, 0.27, 0.5], color: '#9a6a3a', belly: '#a87a48', leg: 0.12, legR: 0.055, neck: [0.1, 0.15], neckTilt: 1.2, head: [0.14, 0.17, 0.22], snout: [0.13, 0.15, 0.16, '#8a5c32'], nose: '#3a2418', ear: [0.035, 0.03], earOut: 0.2, tail: 0.02, eye: 0.1, kind: 'nap', gait: 7, seed: 1 }),
  hyena: () => quadruped({ body: [0.22, 0.27, 0.42], color: '#b89a6a', belly: '#d2bc92', chest: '#c4a674', leg: 0.36, rearLeg: 0.88, slope: -0.08, legR: 0.05, neck: [0.24, 0.14], neckTilt: 0.75, head: [0.14, 0.13, 0.16], snout: [0.08, 0.075, 0.11, '#3e3024'], ear: [0.06, 0.065], earColor: '#4e3e2c', earIn: '#8a7050', earOut: 0.45, tail: 0.24, tuft: '#2e2418', spots: { c: '#4a3624', n: 34, s: 0.035 }, eye: 0.13, kind: 'laugh', rump: -0.06, seed: 3 }),
  lion: () => quadruped({ body: [0.27, 0.28, 0.55], color: '#c99c5a', belly: '#e2c896', leg: 0.38, legR: 0.065, foot: '#b88c4e', neck: [0.22, 0.16], neckTilt: 0.55, mane: '#7a3e1a', mane2: '#9a5626', head: [0.16, 0.15, 0.18], headColor: '#cfa462', snout: [0.1, 0.085, 0.11, '#e8d0a0'], nose: '#4e2e20', ear: [0.045, 0.04], earOut: 0.4, tail: 0.55, tailDroop: 2.6, tuft: '#4a2410', eye: 0.11, iris: '#c8902a', kind: 'roar', seed: 5 }),
  cheetah: () => quadruped({ body: [0.18, 0.2, 0.5], color: '#dcae62', belly: '#f6e8c8', leg: 0.48, legR: 0.033, neck: [0.18, 0.09], neckTilt: 0.65, head: [0.1, 0.09, 0.1], snout: [0.05, 0.045, 0.05, '#f2e2c0'], tear: '#1e1a16', ear: [0.032, 0.026], earOut: 0.55, tail: 0.58, tailR: 0.022, tailDroop: 2.8, tailRings: 5, spots: { c: '#1e1a16', n: 90, s: 0.018 }, headSpots: 12, eye: 0.16, iris: '#c8a03a', kind: 'dash', gait: 11, seed: 8 }),
  leopard: () => quadruped({ body: [0.23, 0.22, 0.5], color: '#d69c44', belly: '#f4e4c0', leg: 0.28, legR: 0.05, neck: [0.16, 0.12], neckTilt: 0.7, head: [0.14, 0.13, 0.14], snout: [0.08, 0.06, 0.07, '#f0dcb4'], ear: [0.04, 0.032], earOut: 0.55, tail: 0.62, tailR: 0.03, tailDroop: 2.4, spots: { c: '#2a1a0e', n: 64, s: 0.04, ring: '#c88a3e' }, headSpots: 14, eye: 0.13, iris: '#a8c04a', kind: 'wag', seed: 11 }),
  camel: () => quadruped({ body: [0.3, 0.3, 0.55], color: '#c8986a', belly: '#d8b48a', leg: 0.9, legR: 0.048, foot: '#a8784a', hump: 0.32, neck: [0.55, 0.085], neckTilt: 0.95, headTilt: 0.85, head: [0.11, 0.11, 0.19], snout: [0.085, 0.08, 0.1, '#b8885a'], lip: '#a07448', ear: [0.025, 0.035], earOut: 0.8, tail: 0.32, tailR: 0.018, tuft: '#6a4a2e', eye: 0.14, kind: 'chew', gait: 5, seed: 12 }),
  fennec: () => quadruped({ body: [0.14, 0.13, 0.24], color: '#e8c48c', belly: '#fbf2e2', leg: 0.17, legR: 0.024, neck: [0.09, 0.07], head: [0.09, 0.085, 0.09], headColor: '#f0d4a4', snout: [0.04, 0.035, 0.07, '#fbf2e2'], ear: [0.1, 0.1], triEar: true, earIn: '#f6dcd0', earOut: 0.75, tail: 0.24, tailR: 0.05, tailDroop: 2.4, tuft: '#2e2016', eye: 0.2, kind: 'ears', seed: 13 }),
  aardvark: () => quadruped({ body: [0.25, 0.25, 0.48], color: '#9a8478', belly: '#b09888', leg: 0.22, legR: 0.055, rump: 0.08, slope: 0.08, neck: [0.12, 0.13], neckTilt: 1.15, headTilt: 0.25, head: [0.1, 0.1, 0.15], snout: [0.045, 0.045, 0.24, '#8e7a6e'], nose: '#d8a090', ear: [0.05, 0.11], triEar: true, earIn: '#c89a90', earOut: 0.25, tail: 0.42, tailR: 0.065, tailDroop: 2.4, eye: 0.12, kind: 'dig', gait: 6, seed: 14 }),
  hedgehog: () => quadruped({ body: [0.16, 0.12, 0.2], color: '#6e5a44', belly: '#f2e6d2', leg: 0.06, legR: 0.025, spines: 260, neck: [0.06, 0.06], neckTilt: 1.2, head: [0.08, 0.075, 0.09], headColor: '#f2e6d2', snout: [0.038, 0.034, 0.075, '#f2e6d2'], nose: '#2a1a1a', ear: [0.045, 0.055], earIn: '#f0bcb4', earOut: 0.45, tail: 0.02, eye: 0.17, kind: 'ball', gait: 12, seed: 21 }),
  thornydevil: () => thornydevil(),
  kangaroorat: () => kangaroorat(),
  meerkat: () => meerkat(),
  crab: () => crab('#e07a46', '#f6b07a', 2.0, false, 0.6),
  ghostcrab: () => crab('#e4d6b4', '#f4ead2', 1.0, true),
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
