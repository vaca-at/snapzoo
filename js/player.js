// 탐험가 캐릭터: 몸 두 가지 (시안 1번 '네모 탐험가' · 시안 8번 '콩알 탐험가')
// 같은 관절(hips · legs · body · arms · head)을 써서 걷기 · 점프 · 앉기 · 🍦👋🪁 동작이 둘 다 돼요.
// wear = { body, gender, hair, outfit, item: [] } (js/data.js 의 BODIES · LOOKS)
import * as THREE from 'three';
import { box, mat } from './animals.js';
import { bakeJoints } from './world.js';
import { HOODS } from './data.js';

const SKIN = '#ffd9b8';
const SHADOW_GEO = new THREE.CircleGeometry(0.38, 16);
const SHADOW_MAT = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.18, depthWrite: false });
const SPH = new THREE.SphereGeometry(1, 24, 16);
const S = (p, c, rx, ry, rz, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(SPH, typeof c === 'string' ? mat(c) : c); m.scale.set(rx, ry, rz); m.position.set(x, y, z); p.add(m); return m; };
const add = (p, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, typeof m === 'string' ? mat(m) : m); o.position.set(x, y, z); p.add(o); return o; };
const joint = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const geoCache = new Map();
const G = (k, f) => { if (!geoCache.has(k)) geoCache.set(k, f()); return geoCache.get(k); };

// 옷 색 (네모 · 콩알 같이 써요)
const OUT = {
  explorer: { top: '#f2efe4', bottom: '#7a7350', shoe: '#5a3a24', vest: '#9a7a44' },
  tee:      { top: '#3aa7a0', bottom: '#3a6a8a', shoe: '#ffffff', trim: '#ffffff', stripe: '#ff6b4a' },
  overall:  { top: '#ffb3c7', bottom: '#7ec8e3', shoe: '#ffffff', strap: '#7ec8e3' },
  plaid:    { top: 'plaid', bottom: '#4a6fa5', shoe: '#ffffff', trim: '#f2efe4' },
  raincoat: { top: '#ffd23c', bottom: '#ffd23c', shoe: '#e6b800', hood: '#ffd23c', btn: '#3a7bd5' },
  wetsuit:  { top: '#26324a', bottom: '#26324a', shoe: '#3fa9f5', stripe: '#3fa9f5' },
  frog:     { top: '#5fc25a', bottom: '#5fc25a', shoe: '#4fae4b', hood: '#5fc25a', belly: '#d8f2a6' },
  jacket:   { top: '#c94f3d', bottom: '#33384a', shoe: '#c94f3d', zip: '#f2c14e' },
  lion:     { top: '#e8b24e', bottom: '#b98a4a', shoe: '#7a4a22', hood: '#e8b24e', belly: '#fbe2b0', mane: '#b4601f' },
};
let plaid = null;
function topMat(c) {
  if (c !== 'plaid') return mat(c);
  if (!plaid) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 32;
    const x = cv.getContext('2d');
    x.fillStyle = '#d9473b'; x.fillRect(0, 0, 32, 32);
    x.fillStyle = '#a8322a'; x.fillRect(0, 12, 32, 8); x.fillRect(12, 0, 8, 32);
    x.fillStyle = '#2b2b33'; x.fillRect(0, 15, 32, 2); x.fillRect(15, 0, 2, 32);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
    plaid = new THREE.MeshStandardMaterial({ roughness: 0.85,  map: t });
  }
  return plaid;
}

// 네모 얼굴 그림 (픽셀). 여자는 속눈썹 · 볼이 조금 더 분홍
const faces = {};
function faceMat(gender) {
  if (faces[gender]) return faces[gender];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const px = (cx, cy, w, h, col) => { x.fillStyle = col; x.fillRect(cx * 4, cy * 4, w * 4, h * 4); };
  px(0, 0, 16, 16, SKIN);
  for (const ex of [4, 10]) { px(ex, 7, 2, 3, '#1b1b22'); px(ex, 7, 1, 1, '#ffffff'); }
  if (gender === 'f') { px(3, 6, 1, 1, '#1b1b22'); px(12, 6, 1, 1, '#1b1b22'); }
  const cheek = gender === 'f' ? '#ff8aa0' : '#ffa8a8';
  px(2, 11, 3, 1, cheek); px(11, 11, 3, 1, cheek);
  px(7, 12, 2, 1, '#c4574a');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  return (faces[gender] = new THREE.MeshStandardMaterial({ roughness: 0.85,  map: t }));
}

// 둥근 얼굴 부품 (구 표면에 붙여요)
function onSphere(head, r, lat, lon) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ'; g.rotation.set(-lat, lon, 0);
  const inner = new THREE.Group(); inner.position.z = r; g.add(inner); head.add(g); return inner;
}
function eyeSet(p, s, eyes, lash) {
  const g = joint(p); eyes.push(g);
  S(g, '#1b1b22', 0.055 * s, 0.078 * s, 0.03);
  S(g, '#ffffff', 0.02 * s, 0.02 * s, 0.02, -0.018 * s, 0.026 * s, 0.022);
  S(g, '#ffffff', 0.01 * s, 0.01 * s, 0.01, 0.02 * s, -0.025 * s, 0.024);
  if (lash) box(g, '#1b1b22', 0.035 * s, 0.012, 0.01, lash * 0.05 * s, 0.07 * s, 0.01).rotation.z = lash * 0.5;
  return g;
}
const smileGeo = () => G('smile', () => new THREE.TorusGeometry(0.035, 0.009, 6, 14, Math.PI));
function roundFace(head, r, lat, gender) {
  const eyes = [];
  for (const s of [-1, 1]) eyeSet(onSphere(head, r, lat, s * 0.3), 1.1, eyes, gender === 'f' ? s : 0);
  for (const s of [-1, 1]) S(onSphere(head, r, lat - 0.28, s * 0.5), gender === 'f' ? '#ff8aa0' : '#ff9aa8', 0.06, 0.035, 0.012);
  add(onSphere(head, r, lat - 0.32, 0), smileGeo(), '#a0463c').rotation.z = Math.PI;
  return eyes;
}
function flatFace(p, y, z, gender) {
  const eyes = [];
  for (const sx of [-1, 1]) {
    eyeSet(joint(p, sx * 0.085, y + 0.02, z), 0.95, eyes, gender === 'f' ? sx : 0);
    S(p, '#ff9aa8', 0.05, 0.03, 0.01, sx * 0.16, y - 0.05, z - 0.01);
  }
  add(p, smileGeo(), '#a0463c', 0, y - 0.05, z + 0.005).rotation.z = Math.PI;
  return eyes;
}

export class Player {
  constructor() {
    this.root = new THREE.Group();
    this.vy = 0; this.onGround = true; this.moving = 0; this.walkT = 0;
    this.sitting = false; this.action = null; this.flavor = '#ffb3c7';
    this.shadow = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT);
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.02;
    this.build({ body: 'block', gender: 'm', hair: 'short', outfit: 'explorer', item: [] }, '#ffffff');
  }

  build(wear, camColor) {
    this.root.clear();
    this.wear = wear;
    this.eyes = [];
    this.tail = null;
    const o = OUT[wear.outfit] || OUT.explorer;
    const items = new Set(wear.item || []);
    const hood = HOODS.includes(wear.outfit);
    if (wear.body === 'bean') this.buildBean(wear, o, items, hood, camColor);
    else this.buildBlock(wear, o, items, hood, camColor);
    // 동작 소품: 아이스크림 (입 앞에 크게, 맛에 따라 색) · 연 (몸 위) · 자전거
    const bean = wear.body === 'bean';
    this.icecream = joint(this.head, bean ? -0.2 : -0.22, bean ? 0.02 : 0.1, bean ? 0.46 : 0.42);
    this.icecream.rotation.z = -0.35;
    const coneM = add(this.icecream, G('icone', () => new THREE.ConeGeometry(0.09, 0.28, 12)), '#d9a05b', 0, -0.16, 0); coneM.rotation.x = Math.PI;
    for (let i = 0; i < 4; i++) box(this.icecream, '#b98040', 0.012, 0.22, 0.012, Math.cos(i * 1.57) * 0.05, -0.15, Math.sin(i * 1.57) * 0.05).rotation.z = 0.25;
    this.scoop = S(this.icecream, new THREE.MeshStandardMaterial({ roughness: 0.6, color: this.flavor }), 0.11, 0.1, 0.11, 0, 0.0, 0);
    this.scoop.userData.keep = true;   // 합치지 않아야 맛 색을 바꿀 수 있어요
    this.scoop2 = S(this.icecream, new THREE.MeshStandardMaterial({ roughness: 0.6, color: '#fff4ea' }), 0.09, 0.085, 0.09, 0.01, 0.13, 0);
    this.scoop2.userData.keep = true;
    S(this.icecream, '#e23b52', 0.035, 0.035, 0.035, 0.02, 0.22, 0.01);
    this.icecream.visible = false;
    this.bike = this.buildBike(bean); this.root.add(this.bike); this.bike.visible = false;
    this.kite = joint(this.root); this.kite.visible = false;
    const k = joint(this.kite); this.kiteBody = k;
    box(k, '#ff6b8a', 0.6, 0.6, 0.03).rotation.z = Math.PI / 4;
    box(k, '#ffd23c', 0.3, 0.3, 0.04).rotation.z = Math.PI / 4;
    for (let i = 0; i < 4; i++) box(k, i % 2 ? '#4fb3ff' : '#ffd23c', 0.1, 0.06, 0.02, 0, -0.45 - i * 0.14, 0);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]), new THREE.LineBasicMaterial({ color: '#ffffff' }));
    this.kite.add(line); this.kiteLine = line;
    // 곤충 채집망 (곤충잡기): 손잡이 + 테 + 반투명 그물
    this.net = joint(this.arms[0], 0, this.handY, 0.04); this.net.visible = false;
    box(this.net, '#c9a46a', 0.04, 0.04, 0.9, 0, 0, 0.42);
    const hoop = add(this.net, G('hoop', () => new THREE.TorusGeometry(0.2, 0.018, 6, 20)), '#e8e8e8', 0, 0, 0.98); hoop.rotation.y = Math.PI / 2;
    const mesh = add(this.net, G('netc', () => new THREE.ConeGeometry(0.19, 0.4, 14, 1, true)), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }), 0, -0.2, 0.98);
    mesh.rotation.x = Math.PI;
    bakeJoints(this.root);   // 관절마다 상자를 합쳐 가볍게 (친구가 많아도 버티게)
    this.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.pose = null;   // 자세는 처음 그릴 때 바로 맞춰요
  }

  // ---------- 1번 네모 탐험가 ----------
  buildBlock(wear, o, items, hood, camColor) {
    const R = this.root;
    this.hipY = 0.5; this.sitY = 0.36; this.handY = -0.44;
    const hips = joint(R, 0, this.hipY, 0); this.hips = hips;
    this.legs = [-1, 1].map((s) => {
      const l = joint(hips, s * 0.12, 0, 0);
      box(l, o.bottom, 0.2, 0.42, 0.22, 0, -0.21, 0);
      box(l, o.shoe, 0.22, 0.14, 0.3, 0, -0.44, 0.03);
      if (wear.outfit === 'tee') box(l, o.stripe, 0.23, 0.03, 0.31, 0, -0.39, 0.03);
      return l;
    });
    const body = joint(hips); this.body = body;
    box(body, topMat(o.top), 0.5, 0.54, 0.3, 0, 0.27, 0);
    const front = (c, w, h, x, y, d = 0.02) => box(body, c, w, h, d, x, y, 0.15 + d / 2);
    if (wear.outfit === 'explorer') {
      for (const s of [-1, 1]) { box(body, o.vest, 0.16, 0.48, 0.32, s * 0.17, 0.29, 0); front('#7d6236', 0.11, 0.09, s * 0.17, 0.2, 0.03); }
      box(body, '#4a3a2a', 0.52, 0.06, 0.32, 0, 0.04, 0); front('#d9b44a', 0.07, 0.06, 0, 0.04, 0.03);
      if (!items.has('bag')) box(body, '#2b2b33', 0.05, 0.66, 0.02, 0, 0.3, 0.17).rotation.z = 0.72;
    }
    if (wear.outfit === 'tee') { box(body, o.trim, 0.3, 0.07, 0.31, 0, 0.51, 0); front('#ffd23c', 0.06, 0.06, 0, 0.32); front('#ffd23c', 0.06, 0.06, 0, 0.18); }
    if (wear.outfit === 'overall') {
      box(body, o.bottom, 0.52, 0.26, 0.32, 0, 0.13, 0);
      for (const s of [-1, 1]) { front(o.strap, 0.07, 0.3, s * 0.14, 0.38); front('#ffd23c', 0.05, 0.05, s * 0.14, 0.29, 0.03); }
    }
    if (wear.outfit === 'plaid') box(body, o.trim, 0.18, 0.06, 0.31, 0, 0.51, 0);
    if (wear.outfit === 'raincoat') { box(body, o.top, 0.56, 0.2, 0.34, 0, -0.04, 0); for (let i = 0; i < 3; i++) front(o.btn, 0.05, 0.05, 0, 0.4 - i * 0.14, 0.03); }
    if (wear.outfit === 'wetsuit') for (const s of [-1, 1]) box(body, o.stripe, 0.04, 0.54, 0.31, s * 0.23, 0.27, 0);
    if (wear.outfit === 'jacket') { front(o.zip, 0.04, 0.52, 0, 0.27); for (const s of [-1, 1]) front('#a63e2f', 0.12, 0.08, s * 0.14, 0.14); box(body, '#f2efe4', 0.3, 0.06, 0.32, 0, 0.51, 0); }
    if (o.belly) front(o.belly, 0.3, 0.32, 0, 0.22);
    if (wear.outfit === 'lion') { this.tail = joint(body, 0, 0.08, -0.16); box(this.tail, o.top, 0.06, 0.06, 0.34, 0, 0.06, -0.15).rotation.x = -0.5; box(this.tail, o.mane, 0.13, 0.13, 0.13, 0, 0.16, -0.3); }
    const long = !['explorer', 'tee'].includes(wear.outfit);
    this.arms = [-1, 1].map((s) => {
      const a = joint(body, s * 0.33, 0.48, 0);
      box(a, topMat(o.top), 0.16, long ? 0.36 : 0.22, 0.18, 0, long ? -0.16 : -0.1, 0);
      box(a, SKIN, 0.14, long ? 0.1 : 0.24, 0.15, 0, long ? -0.38 : -0.32, 0);
      return a;
    });
    this.addCamera(this.arms[1], -0.44, camColor);
    // 머리 (앞면에 픽셀 얼굴)
    const head = joint(body, 0, 0.56, 0); this.head = head;
    const sk = mat(SKIN), fm = faceMat(wear.gender);
    const h = new THREE.Mesh(G('hbox', () => new THREE.BoxGeometry(1, 1, 1)), [sk, sk, sk, sk, fm, sk]); h.scale.set(0.6, 0.56, 0.52); h.position.y = 0.28; head.add(h);
    if (hood) this.blockHood(head, wear.outfit, o);
    else this.blockHair(head, wear.hair, wear.gender);
    // 아이템
    if (items.has('hat') && !hood) { box(head, '#d2ae72', 0.86, 0.05, 0.78, 0, 0.66, 0); box(head, '#d2ae72', 0.6, 0.2, 0.54, 0, 0.78, -0.01); box(head, '#7a5a32', 0.62, 0.06, 0.56, 0, 0.71, -0.01); }
    if (items.has('sprout')) { const y = items.has('hat') && !hood ? 0.88 : hood ? 0.68 : 0.7; box(head, '#4f9a52', 0.04, 0.16, 0.04, 0.14, y, 0); for (const s of [-1, 1]) box(head, '#6cc070', 0.14, 0.04, 0.08, 0.14 + s * 0.07, y + 0.08, 0).rotation.z = s * 0.4; }
    if (items.has('goggles')) { box(head, '#2b2b33', 0.62, 0.05, 0.54, 0, 0.5, 0); for (const s of [-1, 1]) { box(head, '#ff6b4a', 0.18, 0.14, 0.06, s * 0.13, 0.5, 0.27); box(head, '#9fd8ff', 0.12, 0.09, 0.02, s * 0.13, 0.5, 0.305); } }
    if (items.has('headlamp')) { box(head, '#2b2b33', 0.62, 0.05, 0.54, 0, 0.44, 0); box(head, '#fff6b0', 0.12, 0.1, 0.06, 0, 0.44, 0.28, 1.2); }
    if (items.has('compass')) { box(body, '#8a6a3a', 0.3, 0.02, 0.02, 0, 0.5, 0.17); box(body, '#e8c35a', 0.12, 0.12, 0.03, 0, 0.36, 0.175); box(body, '#c43c3c', 0.02, 0.06, 0.01, 0, 0.37, 0.195); }
    if (items.has('bag')) { box(body, '#5a4a3a', 0.05, 0.66, 0.02, 0, 0.3, 0.17).rotation.z = -0.72; box(body, '#4a3c2e', 0.24, 0.2, 0.14, 0.3, 0.08, 0.08); box(body, '#2b2b33', 0.1, 0.1, 0.02, 0.3, 0.1, 0.16); }
    if (items.has('binocular')) for (const s of [-1, 1]) box(body, '#2b2b33', 0.08, 0.1, 0.08, s * 0.06, 0.24, 0.21);
  }
  blockHair(head, hair) {
    const H = '#4a3226', H2 = '#6a4836';
    box(head, H, 0.64, 0.14, 0.56, 0, 0.6, 0);
    box(head, H, 0.64, 0.44, 0.12, 0, 0.36, -0.23);
    for (const s of [-1, 1]) box(head, H, 0.07, 0.36, 0.52, s * 0.32, 0.4, -0.01);
    if (hair !== 'curly') [[-0.21, 0.16], [-0.03, 0.12], [0.15, 0.17], [0.27, 0.1]].forEach(([x, h]) => box(head, H, 0.2, h, 0.06, x, 0.56 - h / 2 + 0.02, 0.27));
    box(head, H2, 0.12, 0.04, 0.5, 0.12, 0.675, 0);
    if (hair === 'long') {
      for (let i = 0; i < 4; i++) box(head, i % 2 ? H2 : H, 0.16, 0.86 - (i % 2) * 0.08, 0.12, -0.24 + i * 0.16, 0.18 + (i % 2) * 0.04, -0.26);
      for (const s of [-1, 1]) { box(head, H, 0.08, 0.62, 0.46, s * 0.33, 0.27, -0.03); box(head, H2, 0.085, 0.42, 0.1, s * 0.33, 0.04, 0.19); }
      box(head, '#ff6b8a', 0.18, 0.06, 0.58, -0.14, 0.66, 0);
    }
    if (hair === 'ponytail') { box(head, '#ffd23c', 0.14, 0.12, 0.1, 0, 0.5, -0.32); box(head, H, 0.16, 0.42, 0.14, 0, 0.26, -0.38); box(head, H2, 0.1, 0.2, 0.15, 0, 0.12, -0.38); }
    if (hair === 'curly') {
      for (let i = 0; i < 9; i++) box(head, i % 2 ? H2 : H, 0.2, 0.18, 0.2, -0.22 + (i % 3) * 0.22, 0.66 + (i % 2) * 0.03, -0.2 + Math.floor(i / 3) * 0.2);
      for (const s of [-1, 1]) box(head, H, 0.14, 0.3, 0.34, s * 0.32, 0.4, -0.06);
      [-0.18, 0.02, 0.2].forEach((x) => box(head, H, 0.18, 0.14, 0.12, x, 0.54, 0.25));
    }
    if (hair === 'braid') for (const s of [-1, 1]) { for (let i = 0; i < 3; i++) box(head, i % 2 ? H2 : H, 0.11, 0.11, 0.11, s * 0.34, 0.18 - i * 0.12, -0.08); box(head, '#ffd23c', 0.12, 0.05, 0.12, s * 0.34, -0.22, -0.08); }
  }
  blockHood(head, id, o) {
    const C = o.hood;
    box(head, C, 0.72, 0.12, 0.64, 0, 0.6, -0.03); box(head, C, 0.72, 0.62, 0.1, 0, 0.3, -0.3);
    for (const s of [-1, 1]) box(head, C, 0.08, 0.62, 0.62, s * 0.36, 0.3, -0.03);
    if (id === 'lion') {
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, rr = 0.38; box(head, i % 2 ? o.mane : '#c9732a', 0.17, 0.17, 0.12, Math.cos(a) * rr, 0.3 + Math.sin(a) * rr * 0.95, 0.24).rotation.z = a; }
      for (const s of [-1, 1]) { box(head, C, 0.16, 0.14, 0.1, s * 0.25, 0.72, 0.05); box(head, '#ffc9c0', 0.08, 0.07, 0.02, s * 0.25, 0.72, 0.105); }
    }
    if (id === 'frog') for (const s of [-1, 1]) { box(head, C, 0.2, 0.18, 0.18, s * 0.19, 0.72, 0.08); box(head, '#ffffff', 0.13, 0.13, 0.04, s * 0.19, 0.74, 0.18); box(head, '#1b1b22', 0.06, 0.08, 0.02, s * 0.19, 0.74, 0.205); }
    if (id === 'raincoat') { box(head, '#e6b800', 0.74, 0.06, 0.1, 0, 0.62, 0.25); box(head, '#5a3a26', 0.5, 0.08, 0.06, 0, 0.53, 0.27); }
  }

  // ---------- 8번 콩알 탐험가 ----------
  buildBean(wear, o, items, hood, camColor) {
    const R = this.root;
    this.hipY = 0.12; this.sitY = 0.02; this.handY = -0.16;
    const hips = joint(R, 0, this.hipY, 0); this.hips = hips;
    this.legs = [-1, 1].map((s) => { const l = joint(hips, s * 0.12, 0, 0); S(l, o.shoe, 0.11, 0.07, 0.15, 0, -0.05, 0.04); return l; });
    const body = joint(hips); this.body = body;
    const full = hood;   // 후드 옷은 몸 전체를 감싸요
    add(body, G('cap', () => new THREE.CapsuleGeometry(0.36, 0.5, 8, 24)), full ? o.top : SKIN, 0, 0.6, 0);
    if (!full) {
      add(body, G('band', () => new THREE.CylinderGeometry(0.368, 0.368, 0.3, 32, 1, true)), topMat(o.top), 0, 0.37, 0);
      add(body, G('bot', () => new THREE.SphereGeometry(0.368, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), wear.outfit === 'overall' ? mat(o.bottom) : topMat(o.top), 0, 0.22, 0);
      add(body, G('belt', () => new THREE.TorusGeometry(0.37, 0.03, 8, 32)), o.trim || o.vest || o.stripe || o.zip || '#4a3a2a', 0, 0.52, 0).rotation.x = Math.PI / 2;
      const fr = (c, w, h, x, y, rz = 0) => { const b = box(body, c, w, h, 0.04, x, y, Math.sqrt(Math.max(0, 0.37 ** 2 - x * x)) + 0.005); b.rotation.set(0, Math.asin(x / 0.37), rz); return b; };
      if (wear.outfit === 'explorer') { for (const s of [-1, 1]) fr(o.vest, 0.14, 0.3, s * 0.2, 0.35); if (!items.has('bag')) fr('#2b2b33', 0.04, 0.5, 0.05, 0.4, 0.7); }
      if (wear.outfit === 'tee') { fr('#ffd23c', 0.05, 0.05, 0, 0.42); fr('#ffd23c', 0.05, 0.05, 0, 0.3); }
      if (wear.outfit === 'overall') for (const s of [-1, 1]) { fr(o.strap, 0.06, 0.16, s * 0.13, 0.42); fr('#ffd23c', 0.05, 0.05, s * 0.13, 0.48); }
      if (wear.outfit === 'jacket') fr(o.zip, 0.035, 0.3, 0, 0.36);
      if (wear.outfit === 'wetsuit') add(body, G('stripe', () => new THREE.TorusGeometry(0.37, 0.022, 8, 32)), o.stripe, 0, 0.3, 0).rotation.x = Math.PI / 2;
    } else {
      S(body, SKIN, 0.25, 0.21, 0.08, 0, 0.74, 0.3);   // 얼굴 구멍
      if (o.belly) S(body, o.belly, 0.24, 0.26, 0.08, 0, 0.4, 0.3);
      if (wear.outfit === 'raincoat') for (let i = 0; i < 3; i++) S(body, o.btn, 0.03, 0.03, 0.02, 0, 0.5 - i * 0.12, 0.36);
    }
    this.arms = [-1, 1].map((s) => { const a = joint(body, s * 0.37, 0.5, 0); S(a, full ? o.top : SKIN, 0.07, 0.11, 0.07, 0, -0.08, 0); return a; });
    this.addCamera(this.arms[1], -0.16, camColor);
    const head = joint(body, 0, 0.6, 0); this.head = head;
    if (full) {
      this.eyes = flatFace(head, 0.15, 0.375, wear.gender);
      if (wear.outfit === 'frog') for (const s of [-1, 1]) { S(head, o.hood, 0.12, 0.11, 0.11, s * 0.17, 0.46, 0.1); S(head, '#ffffff', 0.08, 0.08, 0.06, s * 0.17, 0.48, 0.17); S(head, '#1b1b22', 0.04, 0.05, 0.03, s * 0.17, 0.48, 0.215); }
      if (wear.outfit === 'lion') {
        for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; S(head, i % 2 ? o.mane : '#c9732a', 0.09, 0.09, 0.06, Math.cos(a) * 0.3, 0.14 + Math.sin(a) * 0.27, 0.3); }
        for (const s of [-1, 1]) S(head, o.hood, 0.08, 0.08, 0.06, s * 0.22, 0.5, 0.05);
        this.tail = joint(body, 0, 0.3, -0.34); S(this.tail, o.top, 0.04, 0.04, 0.16, 0, 0.05, -0.12); S(this.tail, o.mane, 0.07, 0.07, 0.07, 0, 0.08, -0.26);
      }
      if (wear.outfit === 'raincoat') add(head, G('rim', () => new THREE.TorusGeometry(0.27, 0.03, 8, 28)), '#e6b800', 0, 0.15, 0.33);
    } else {
      this.eyes = roundFace(head, 0.36, 0.32, wear.gender);
      // 여자는 리본, 남자는 삐죽 머리카락
      if (wear.gender === 'f') { for (const s of [-1, 1]) S(head, '#ff6b8a', 0.09, 0.06, 0.05, 0.14 + s * 0.08, 0.58, 0.05); S(head, '#ff4f78', 0.04, 0.04, 0.04, 0.14, 0.58, 0.07); }
      else { S(head, '#5a3a26', 0.05, 0.09, 0.05, 0.03, 0.62, 0.05).rotation.z = -0.4; S(head, '#5a3a26', 0.04, 0.07, 0.04, -0.04, 0.6, 0.04).rotation.z = 0.5; }
    }
    // 아이템
    if (items.has('hat') && !full) { add(head, G('brim', () => new THREE.CylinderGeometry(0.42, 0.42, 0.04, 32)), '#d2ae72', 0, 0.5, 0); add(head, G('crown', () => new THREE.CylinderGeometry(0.22, 0.26, 0.18, 24)), '#d2ae72', 0, 0.6, 0); add(head, G('band2', () => new THREE.CylinderGeometry(0.262, 0.262, 0.05, 24)), '#7a5a32', 0, 0.54, 0); }
    if (items.has('sprout')) { const y = items.has('hat') && !full ? 0.72 : 0.62; box(head, '#4f9a52', 0.03, 0.12, 0.03, -0.08, y, 0); for (const s of [-1, 1]) S(head, '#6cc070', 0.08, 0.025, 0.045, -0.08 + s * 0.07, y + 0.06, 0).rotation.z = s * 0.5; }
    if (items.has('goggles')) {
      add(head, G('strap', () => new THREE.TorusGeometry(0.365, 0.02, 8, 32)), '#2b2b33', 0, 0.3, 0).rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) { const g = onSphere(head, 0.37, 0.72, s * 0.28); add(g, G('gog', () => new THREE.TorusGeometry(0.07, 0.022, 8, 20)), '#ff6b4a'); }
    }
    if (items.has('headlamp')) { add(head, G('strap', () => new THREE.TorusGeometry(0.365, 0.02, 8, 32)), '#2b2b33', 0, 0.3, 0).rotation.x = Math.PI / 2; box(head, '#fff6b0', 0.1, 0.08, 0.05, 0, 0.3, 0.37, 1.2); }
    if (items.has('compass')) S(body, '#e8c35a', 0.06, 0.06, 0.02, 0, 0.44, 0.37);
    if (items.has('bag')) { box(body, '#4a3c2e', 0.2, 0.18, 0.12, 0.36, 0.3, 0.06); box(body, '#5a4a3a', 0.04, 0.5, 0.02, 0.08, 0.5, 0.36).rotation.z = -0.7; }
    if (items.has('binocular')) for (const s of [-1, 1]) add(body, G('bino', () => new THREE.CylinderGeometry(0.04, 0.045, 0.09, 12)), '#2b2b33', s * 0.05, 0.36, 0.39).rotation.x = Math.PI / 2;
  }

  // 자전거: 바퀴 두 개 · 몸통 · 안장 · 핸들 (바퀴는 달리는 만큼 돌아요)
  buildBike(bean) {
    const b = new THREE.Group(), sc = bean ? 0.85 : 1;
    b.scale.setScalar(sc);
    const W = G('wheel', () => new THREE.TorusGeometry(0.3, 0.045, 8, 24));
    this.wheels = [-1, 1].map((sz) => {
      const w = joint(b, 0, 0.34, sz * 0.52); add(w, W, '#2b2b33').rotation.y = Math.PI / 2;
      for (let i = 0; i < 4; i++) box(w, '#d9d9d9', 0.02, 0.56, 0.02, 0, 0, 0).rotation.x = i * Math.PI / 4;
      return w;
    });
    const frame = (x0, y0, z0, x1, y1, z1, r = 0.035, c = '#ff6b4a') => {
      const a = new THREE.Vector3(x0, y0, z0), c2 = new THREE.Vector3(x1, y1, z1), len = a.distanceTo(c2);
      const m = add(b, G('bar', () => new THREE.CylinderGeometry(1, 1, 1, 8)), c, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      m.scale.set(r, len, r); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), c2.sub(a).normalize());
    };
    frame(0, 0.34, -0.52, 0, 0.62, -0.05); frame(0, 0.62, -0.05, 0, 0.34, 0.1); frame(0, 0.34, 0.1, 0, 0.34, -0.52);
    frame(0, 0.62, -0.05, 0, 0.72, 0.42); frame(0, 0.34, 0.52, 0, 0.88, 0.42, 0.03, '#d9d9d9');
    frame(-0.24, 0.9, 0.42, 0.24, 0.9, 0.42, 0.025, '#2b2b33');
    box(b, '#2b2b33', 0.16, 0.05, 0.26, 0, 0.82, -0.08);   // 안장
    add(b, G('bell', () => new THREE.SphereGeometry(0.04, 8, 6)), '#ffd23c', 0.16, 0.95, 0.42);
    b.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return b;
  }

  addCamera(arm, y, col) {
    const cam = joint(arm, 0, y, 0.12);
    box(cam, col, 0.22, 0.14, 0.1, 0, 0, 0);
    box(cam, '#2b2b33', 0.09, 0.09, 0.08, 0, 0, 0.08);
    box(cam, '#9fd8ff', 0.05, 0.05, 0.02, 0, 0, 0.125);
    this.cam = cam;
  }

  // 동작 켜기 · 끄기 (같은 단추를 다시 누르면 멈춰요). 켜졌으면 true
  play(id, flavor) {
    if (this.action?.id === id && id !== 'wave' && id !== 'icecream') { this.action = null; return false; }
    this.action = { id, t: 0 };
    if (!MOVING.has(id)) this.sitting = this.sitting && SEATED_OK.has(id);
    if (id === 'icecream' && flavor) { this.flavor = flavor; this.scoop.material.color.set(flavor); }
    return true;
  }
  doAction(id, flavor) { return this.play(id, flavor); }
  jump() { if (this.onGround && !this.sitting) { this.vy = 5.2; this.onGround = false; } }

  // 자세 섞기 (캠핑장 avatar.js 방식): 서기 · 앉기 · 걷기 · 뛰기 · 점프 · 동작 자세 사이를 매 프레임 부드럽게
  animate(dt, t) {
    const bean = this.wear.body === 'bean';
    const sp = this.speed ?? (this.moving > 0.05 ? 2.7 * this.moving : 0);
    const a = this.action;
    if (a) {
      a.t += dt;
      if (DUR[a.id] && a.t > DUR[a.id]) this.action = null;
      else if (sp > 0.2 && !MOVING.has(a.id)) this.action = null;   // 걸으면 제자리 동작은 멈춰요
    }
    const act = this.action;
    let tg = this.sitting ? (bean ? SIT_BEAN : SIT) : STAND;
    if (act) tg = actionPose(act.id, act.t, tg, t);
    // 걷기 · 뛰기: 속도만큼 다리 · 팔을 흔들고, 뛸 때는 몸을 숙여요
    if (!this.sitting && sp > 0.05 && this.onGround && act?.id !== 'bike') {
      const run = Math.min(1, Math.max(0, (sp - 3.2) / 1.6));
      this.walkT += dt * (6 + Math.min(sp, 3.2) * 2.5 + run * 4);
      const s = Math.sin(this.walkT) * Math.min(1, sp / 2) * (0.6 + run * 0.35) * (bean ? 0.8 : 1);
      tg = { ...tg, hip: tg.hip + run * 0.22, head: tg.head - run * 0.12, l0: [s, 0], l1: [-s, 0],
        ...(act && ARM_ACTS.has(act.id) ? {} : { a0: [-s * (0.8 + run * 0.5) - run * 0.5, -0.1], a1: [s * 0.4 - 0.55 - run * 0.2, 0.1] }) };
    }
    if (!this.onGround && !this.sitting) tg = { ...tg, hip: -0.05, head: -0.1, l0: [-0.75, 0], l1: [0.45, 0], a0: [-2.6, -0.35], ...(act ? {} : { a1: [-2.4, 0.35] }) };
    const k = this.pose ? Math.min(1, dt * 9) : 1;
    const p = this.pose ||= { y: 0, hip: 0, head: 0, hy: 0, a0: [0, 0], a1: [0, 0], l0: [0, 0], l1: [0, 0] };
    for (const key of ['y', 'hip', 'head', 'hy']) p[key] += ((tg[key] ?? 0) - p[key]) * k;
    for (const key of ['a0', 'a1', 'l0', 'l1']) { p[key][0] += (tg[key][0] - p[key][0]) * k; p[key][1] += (tg[key][1] - p[key][1]) * k; }
    if (act?.id === 'bike') this.walkT += dt * (2 + sp * 2.2);   // 페달 밟기
    const bob = !this.sitting && sp > 0.05 && this.onGround && act?.id !== 'bike' ? Math.abs(Math.sin(this.walkT)) * (sp > 4 ? 0.08 : 0.04) : 0;
    const breathe = Math.sin(t * 1.1) * 0.01;
    this.hips.position.y = this.hipY + p.y + bob;
    this.body.rotation.set(p.hip, 0, bean && sp > 0.05 ? Math.sin(this.walkT) * 0.05 : 0);
    this.body.scale.y = 1 + breathe;
    this.head.rotation.set(p.head, p.hy, 0);
    this.arms[0].rotation.set(p.a0[0], 0, p.a0[1]);
    this.arms[1].rotation.set(p.a1[0], 0, p.a1[1]);
    this.legs[0].rotation.set(p.l0[0], 0, p.l0[1]);
    this.legs[1].rotation.set(p.l1[0], 0, p.l1[1]);
    if (act?.id === 'bike') {
      // 안장 높이에 엉덩이를 올리고, 두 발은 번갈아 페달을 돌려요
      this.hips.position.y = (bean ? 0.62 : 0.86) * (bean ? 0.85 : 1) + (bean ? 0 : -0.02);
      this.hips.position.z = bean ? -0.05 : -0.08;
      const ped = Math.sin(this.walkT) * 0.55;
      this.legs[0].rotation.x = -1.15 + ped; this.legs[1].rotation.x = -1.15 - ped;
    } else this.hips.position.z = 0;
    if (this.tail) this.tail.rotation.y = Math.sin(t * 3) * 0.5;
    // 눈 깜빡
    const blink = (t % 3.6) < 0.12 ? 0.15 : 1;
    this.eyes.forEach((e) => { e.scale.y = blink; });
    // 소품
    this.icecream.visible = act?.id === 'icecream';
    if (this.icecream.visible) this.icecream.position.y = (bean ? 0.02 : 0.1) + Math.max(0, Math.sin(act.t * 4)) * 0.03;   // 할짝할짝
    this.bike.visible = act?.id === 'bike';
    if (this.bike.visible) this.wheels.forEach((w) => { w.rotation.x += dt * sp * 3.2; });
    this.net.visible = act?.id === 'bugs';
    this.cam.visible = !this.net.visible && !this.icecream.visible && !this.bike.visible;
    this.kite.visible = act?.id === 'kite';
    if (this.kite.visible) {
      const up = Math.min(1, act.t / 1.5);
      const kx = 0.9 + Math.sin(t * 1.3) * 0.5, ky = 1.8 + up * 2.2 + Math.sin(t * 2) * 0.25, kz = 1.6 + up * 1.4;
      this.kiteBody.position.set(kx, ky, kz);
      this.kiteBody.rotation.set(0.3, 0, Math.sin(t * 2.2) * 0.3);
      const hy = bean ? 0.62 : 1.25;
      const pos = this.kiteLine.geometry.attributes.position;
      pos.setXYZ(0, 0.33, hy, 0.35); pos.setXYZ(1, kx, ky - 0.3, kz); pos.needsUpdate = true;
    }
  }
}

// ---------- 자세 (캠핑장 avatar.js 와 같은 방식: 팔 · 다리 [x회전, z회전]) ----------
// a0 = 왼쪽에 보이는 팔(-x), a1 = 카메라를 든 팔(+x)
const STAND = { y: 0, hip: 0, head: 0, hy: 0, a0: [0, -0.08], a1: [-0.55, 0.1], l0: [0, 0], l1: [0, 0] };
// 앉기: 의자 높이(0.58m)에 엉덩이를 올려요
const SIT = { y: 0.1, hip: 0.04, head: 0.05, hy: 0, a0: [-0.55, -0.3], a1: [-0.6, 0.3], l0: [-1.5, 0.22], l1: [-1.5, -0.22] };
const SIT_BEAN = { ...SIT, y: 0.44, l0: [-1.3, 0.3], l1: [-1.3, -0.3] };
const MOVING = new Set(['kite', 'bugs', 'bike']);         // 걸으면서 하는 동작
const SEATED_OK = new Set(['icecream', 'wave']);          // 앉아서도 하는 동작
const ARM_ACTS = new Set(['kite', 'bugs', 'icecream', 'bike']);   // 걸어도 팔은 동작 자세 그대로
const DUR = { wave: 2.2, icecream: 6 };
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const bump = (x, a, b, c, d) => ease((x - a) / (b - a)) * (1 - ease((x - c) / (d - c)));
function mix(base, over, k) {
  const o = { ...base };
  for (const key of ['y', 'hip', 'head', 'hy']) if (over[key] !== undefined) o[key] = lerp(base[key], over[key], k);
  for (const key of ['a0', 'a1', 'l0', 'l1']) if (over[key]) o[key] = [lerp(base[key][0], over[key][0], k), lerp(base[key][1], over[key][1], k)];
  return o;
}
function actionPose(id, at, base, t) {
  switch (id) {
    case 'wave':   // 한 손을 번쩍 들어 좌우로 흔들기
      return mix(base, { a0: [-0.3, -2.5 + Math.sin(at * 12) * 0.35], head: -0.05 }, bump(at, 0, 0.3, 1.8, 2.2));
    case 'kite':   // 한 손으로 실패를 들고 하늘을 올려다보기
      return mix(base, { a1: [-2.0 + Math.sin(t * 2) * 0.15, 0.15], a0: [-1.4, -0.25], head: -0.45 }, ease(at / 0.4));
    case 'bugs': {   // 채집망을 크게 휘두르기
      const sw = Math.sin(at * 3.2);
      return mix(base, { a0: [-1.7 + sw * 0.6, -(0.2 + sw * 0.5)], a1: [-0.4, 0.2], head: -0.15, hip: 0.05 }, ease(at / 0.4));
    }
    case 'bike':   // 안장에 앉아 핸들을 잡기 (페달 밟는 발은 animate 에서)
      return { ...base, y: 0, hip: 0.22, head: -0.12, a0: [-1.25, -0.12], a1: [-1.25, 0.12], l0: [-1.3, 0.12], l1: [-1.3, -0.12] };
    case 'icecream': {   // 아이스크림을 입으로 가져가 할짝
      const lick = Math.max(0, Math.sin(at * 4));
      return mix(base, { a0: [-1.9 - lick * 0.3, 0.3], head: lick * 0.15 }, bump(at, 0, 0.3, 5.5, 6));
    }
  }
  return base;
}
