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
    plaid = new THREE.MeshLambertMaterial({ map: t });
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
  return (faces[gender] = new THREE.MeshLambertMaterial({ map: t }));
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
    // 동작 소품: 아이스크림 (왼손, 맛에 따라 색) · 연 (몸 위)
    this.icecream = joint(this.arms[0], 0, this.handY - 0.04, 0.08);
    box(this.icecream, '#d9a05b', 0.08, 0.16, 0.08, 0, -0.04, 0);
    this.scoop = box(this.icecream, new THREE.MeshLambertMaterial({ color: this.flavor }), 0.14, 0.12, 0.14, 0, 0.08, 0);
    this.scoop.userData.keep = true;   // 합치지 않아야 맛 색을 바꿀 수 있어요
    box(this.icecream, '#fff2f6', 0.08, 0.06, 0.08, 0, 0.16, 0);
    this.icecream.visible = false;
    this.kite = joint(this.root); this.kite.visible = false;
    const k = joint(this.kite); this.kiteBody = k;
    box(k, '#ff6b8a', 0.6, 0.6, 0.03).rotation.z = Math.PI / 4;
    box(k, '#ffd23c', 0.3, 0.3, 0.04).rotation.z = Math.PI / 4;
    for (let i = 0; i < 4; i++) box(k, i % 2 ? '#4fb3ff' : '#ffd23c', 0.1, 0.06, 0.02, 0, -0.45 - i * 0.14, 0);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]), new THREE.LineBasicMaterial({ color: '#ffffff' }));
    this.kite.add(line); this.kiteLine = line;
    bakeJoints(this.root);   // 관절마다 상자를 합쳐 가볍게 (친구가 많아도 버티게)
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
      if (wear.outfit === 'overall') for (const s of [-1, 1]) { fr(o.strap, 0.06, 0.28, s * 0.13, 0.6); fr('#ffd23c', 0.05, 0.05, s * 0.13, 0.5); }
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

  addCamera(arm, y, col) {
    const cam = joint(arm, 0, y, 0.12);
    box(cam, col, 0.22, 0.14, 0.1, 0, 0, 0);
    box(cam, '#2b2b33', 0.09, 0.09, 0.08, 0, 0, 0.08);
    box(cam, '#9fd8ff', 0.05, 0.05, 0.02, 0, 0, 0.125);
    this.cam = cam;
  }

  doAction(id, flavor) {
    this.action = { id, t: 0 }; this.sitting = false;
    if (id === 'icecream' && flavor) { this.flavor = flavor; this.scoop.material.color.set(flavor); }
  }
  jump() { if (this.onGround && !this.sitting) { this.vy = 6.2; this.onGround = false; this.action = null; } }

  animate(dt, t) {
    const { legs, arms, hips, body, head } = this;
    const bean = this.wear.body === 'bean';
    this.walkT += dt * (this.moving > 0.05 ? 10 * Math.min(1.4, this.moving) : 0);
    const w = this.moving > 0.05 && this.onGround ? Math.sin(this.walkT) * (bean ? 0.5 : 0.7) : 0;
    legs[0].rotation.set(w, 0, 0); legs[1].rotation.set(-w, 0, 0);
    arms[0].rotation.set(-w * 0.8, 0, bean ? -0.15 : 0); arms[1].rotation.set(w * 0.4 - 0.6, 0, bean ? 0.15 : 0);
    hips.position.y = this.hipY + (this.moving > 0.05 && this.onGround ? Math.abs(Math.sin(this.walkT)) * 0.05 : 0);
    body.rotation.set(0, 0, bean && this.moving > 0.05 ? Math.sin(this.walkT) * 0.06 : 0); head.rotation.set(0, 0, 0);
    if (this.tail) this.tail.rotation.y = Math.sin(t * 3) * 0.5;
    if (!this.onGround) { legs[0].rotation.x = -0.6; legs[1].rotation.x = 0.4; arms[0].rotation.set(0, 0, -2.4); }
    if (this.sitting) {
      hips.position.y = this.sitY; legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.5;
      arms[0].rotation.set(-0.3, 0, 0); head.rotation.y = Math.sin(t * 0.5) * 0.3;
    }
    // 눈 깜빡
    const blink = (t % 3.6) < 0.12 ? 0.15 : 1;
    this.eyes.forEach((e) => { e.scale.y = blink; });
    this.icecream.visible = false; this.kite.visible = false;
    const a = this.action;
    if (!a) return;
    a.t += dt;
    if (a.id === 'icecream') {
      this.icecream.visible = true;
      arms[0].rotation.set(-1.9 - Math.max(0, Math.sin(a.t * 4)) * 0.3, 0, 0.3);
      head.rotation.x = Math.max(0, Math.sin(a.t * 4)) * 0.15;
      if (a.t > 5) this.action = null;
    } else if (a.id === 'wave') {
      arms[0].rotation.set(0, 0, -2.6 + Math.sin(a.t * 12) * 0.4);
      if (a.t > 2.4) this.action = null;
    } else if (a.id === 'kite') {
      this.kite.visible = true;
      const up = Math.min(1, a.t / 1.5);
      const kx = -0.8 + Math.sin(t * 1.3) * 0.6, ky = 1.6 + up * 2.4 + Math.sin(t * 2) * 0.3, kz = 2.6 * up;
      this.kiteBody.position.set(kx, ky, kz);
      this.kiteBody.rotation.set(0.3, 0, Math.sin(t * 2.2) * 0.3);
      const hy = bean ? 0.75 : 1.4;
      const pos = this.kiteLine.geometry.attributes.position;
      pos.setXYZ(0, -0.33, hy, 0.3); pos.setXYZ(1, kx, ky - 0.3, kz); pos.needsUpdate = true;
      arms[0].rotation.set(-2.2, 0, 0);
      if (a.t > 8) this.action = null;
    }
  }
}
