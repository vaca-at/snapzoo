// 블록 탐험가: 모두 같은 기본 탐험가로 시작하고 상점에서 머리 · 옷 · 아이템을 사서 꾸며요.
// 동작: 걷기 · 점프 · 앉기 · 🍦 아이스크림 · 👋 손 흔들기 · 🪁 연날리기. 손에는 고른 카메라(그 색)를 들어요.
import * as THREE from 'three';
import { box } from './animals.js';

const SKIN = '#ffd9b3', HAIR = '#3a2a20';
const OUTFIT = {
  explorer: { top: '#3aa7a0', bottom: '#5b6b7a', trim: '#2e8a84' },
  safari:   { top: '#e9dcb0', bottom: '#8a7350', trim: '#b89e62', vest: '#a88a52' },
  wetsuit:  { top: '#26324a', bottom: '#26324a', trim: '#3fa9f5' },
  jacket:   { top: '#c94f3d', bottom: '#33384a', trim: '#f2c14e' },
};

export class Player {
  constructor() {
    this.root = new THREE.Group();
    this.vy = 0;
    this.onGround = true;
    this.moving = 0;
    this.walkT = 0;
    this.sitting = false;
    this.action = null;     // { id, t }
    this.face = null;       // 머리 위 표정 { el, t }
    this.build({ hair: 'short', outfit: 'explorer', item: [] }, '#ffffff');
  }

  build(wear, camColor) {
    this.root.clear();
    const R = this.root;
    const o = OUTFIT[wear.outfit] || OUTFIT.explorer;
    const hips = new THREE.Group(); hips.position.y = 0.62; R.add(hips);
    this.hips = hips;
    // 다리
    this.legs = [-1, 1].map((sx) => {
      const l = new THREE.Group(); l.position.set(sx * 0.13, 0, 0); hips.add(l);
      box(l, o.bottom, 0.2, 0.5, 0.22, 0, -0.27, 0);
      box(l, wear.outfit === 'wetsuit' ? '#3fa9f5' : '#5a3a24', 0.22, 0.12, 0.3, 0, -0.56, 0.03);
      return l;
    });
    // 몸통
    const body = new THREE.Group(); hips.add(body); this.body = body;
    box(body, o.top, 0.5, 0.52, 0.3, 0, 0.27, 0);
    box(body, o.trim, 0.52, 0.06, 0.32, 0, 0.04, 0);
    if (o.vest) { box(body, o.vest, 0.16, 0.46, 0.32, -0.16, 0.28, 0); box(body, o.vest, 0.16, 0.46, 0.32, 0.16, 0.28, 0); box(body, '#7a6238', 0.1, 0.08, 0.02, -0.16, 0.3, 0.165); box(body, '#7a6238', 0.1, 0.08, 0.02, 0.16, 0.3, 0.165); }
    if (wear.outfit === 'jacket') { box(body, '#f2c14e', 0.04, 0.5, 0.31, 0, 0.27, 0.01); box(body, '#33384a', 0.1, 0.1, 0.02, -0.14, 0.38, 0.16); }
    if (wear.outfit === 'wetsuit') box(body, '#3fa9f5', 0.06, 0.52, 0.31, 0, 0.27, 0);
    // 팔
    this.arms = [-1, 1].map((sx) => {
      const a = new THREE.Group(); a.position.set(sx * 0.33, 0.48, 0); body.add(a);
      box(a, o.top, 0.16, 0.42, 0.18, 0, -0.18, 0);
      box(a, SKIN, 0.15, 0.1, 0.16, 0, -0.42, 0);
      return a;
    });
    // 머리
    const head = new THREE.Group(); head.position.y = 0.78; body.add(head); this.head = head;
    box(head, SKIN, 0.5, 0.46, 0.44, 0, 0.18, 0);
    for (const sx of [-1, 1]) {
      box(head, '#24242e', 0.08, 0.1, 0.02, sx * 0.11, 0.2, 0.225);
      box(head, '#ffffff', 0.03, 0.03, 0.01, sx * 0.11 - 0.015, 0.23, 0.236);
      box(head, '#ffa8a8', 0.08, 0.04, 0.01, sx * 0.17, 0.11, 0.225);
    }
    box(head, '#c4574a', 0.12, 0.03, 0.01, 0, 0.07, 0.225);
    this.buildHair(head, wear.hair);
    // 아이템
    const items = new Set(wear.item || []);
    if (items.has('hat')) {
      box(head, '#c9a46a', 0.72, 0.05, 0.66, 0, 0.42, 0);
      box(head, '#c9a46a', 0.5, 0.18, 0.46, 0, 0.52, 0);
      box(head, '#7a5a32', 0.52, 0.05, 0.48, 0, 0.46, 0);
    }
    if (items.has('headlamp')) {
      box(head, '#2b2b33', 0.52, 0.05, 0.46, 0, 0.33, 0);
      box(head, '#fff6b0', 0.12, 0.1, 0.06, 0, 0.33, 0.24, 1.2);
    }
    if (items.has('compass')) {
      box(body, '#8a6a3a', 0.3, 0.02, 0.02, 0, 0.5, 0.16);
      box(body, '#e8c35a', 0.12, 0.12, 0.03, 0, 0.36, 0.17);
      box(body, '#c43c3c', 0.02, 0.06, 0.01, 0, 0.37, 0.19);
    }
    if (items.has('bag')) {
      box(body, '#5a4a3a', 0.06, 0.6, 0.02, 0, 0.3, 0.16).rotation.z = 0.7;
      box(body, '#4a3c2e', 0.24, 0.2, 0.14, -0.28, 0.08, 0.08);
      box(body, '#2b2b33', 0.1, 0.1, 0.02, -0.28, 0.1, 0.16);
    }
    if (items.has('binocular')) {
      box(body, '#2b2b33', 0.08, 0.1, 0.08, -0.06, 0.24, 0.2);
      box(body, '#2b2b33', 0.08, 0.1, 0.08, 0.06, 0.24, 0.2);
    }
    // 손에 든 카메라 (카메라 색)
    const cam = new THREE.Group(); cam.position.set(0, -0.44, 0.12); this.arms[1].add(cam);
    box(cam, camColor, 0.22, 0.14, 0.1, 0, 0, 0);
    box(cam, '#2b2b33', 0.09, 0.09, 0.08, 0, 0, 0.08);
    box(cam, '#9fd8ff', 0.05, 0.05, 0.02, 0, 0, 0.125);
    this.cam = cam;
    // 동작 소품
    this.icecream = new THREE.Group(); this.icecream.position.set(0, -0.48, 0.08); this.arms[0].add(this.icecream);
    box(this.icecream, '#d9a05b', 0.08, 0.16, 0.08, 0, -0.04, 0);
    box(this.icecream, '#ffc6d9', 0.14, 0.12, 0.14, 0, 0.08, 0);
    box(this.icecream, '#fff2f6', 0.08, 0.06, 0.08, 0, 0.16, 0);
    this.icecream.visible = false;
    this.kite = new THREE.Group(); R.add(this.kite); this.kite.visible = false;
    const k = new THREE.Group(); this.kite.add(k); this.kiteBody = k;
    box(k, '#ff6b8a', 0.6, 0.6, 0.03).rotation.z = Math.PI / 4;
    box(k, '#ffd23c', 0.3, 0.3, 0.04).rotation.z = Math.PI / 4;
    for (let i = 0; i < 4; i++) box(k, i % 2 ? '#4fb3ff' : '#ffd23c', 0.1, 0.06, 0.02, 0, -0.45 - i * 0.14, 0);
    const line = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]), new THREE.LineBasicMaterial({ color: '#ffffff' }));
    this.kite.add(line); this.kiteLine = line;
    // 발밑 그림자
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.18, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; this.shadow = sh;
  }

  buildHair(head, hair) {
    box(head, HAIR, 0.54, 0.14, 0.48, 0, 0.44, -0.01);
    box(head, HAIR, 0.54, 0.3, 0.12, 0, 0.3, -0.19);
    if (hair === 'short') { box(head, HAIR, 0.5, 0.08, 0.1, 0, 0.38, 0.19); }
    if (hair === 'curly') {
      for (let i = 0; i < 9; i++) box(head, '#5a3a24', 0.16, 0.16, 0.16, -0.22 + (i % 3) * 0.22, 0.48 + Math.floor(i / 3) * 0.02, -0.18 + Math.floor(i / 3) * 0.18);
      for (const sx of [-1, 1]) box(head, '#5a3a24', 0.12, 0.26, 0.3, sx * 0.27, 0.3, -0.06);
    }
    if (hair === 'ponytail') {
      box(head, HAIR, 0.5, 0.1, 0.1, 0, 0.38, 0.19);
      box(head, '#ff6b8a', 0.12, 0.08, 0.08, 0, 0.36, -0.27);
      box(head, HAIR, 0.14, 0.34, 0.12, 0, 0.16, -0.32);
    }
    if (hair === 'braid') {
      box(head, HAIR, 0.5, 0.1, 0.1, 0, 0.38, 0.19);
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) box(head, HAIR, 0.1, 0.1, 0.1, sx * 0.28, 0.16 - i * 0.12, -0.08);
      for (const sx of [-1, 1]) box(head, '#ffd23c', 0.11, 0.05, 0.11, sx * 0.28, -0.22, -0.08);
    }
  }

  doAction(id) { this.action = { id, t: 0 }; this.sitting = false; }
  jump() { if (this.onGround && !this.sitting) { this.vy = 6.2; this.onGround = false; this.action = null; } }

  // dt 마다: 다리 · 팔 흔들기, 점프, 동작
  animate(dt, t) {
    const { legs, arms, hips, body, head } = this;
    this.walkT += dt * (this.moving > 0.05 ? 10 * Math.min(1.4, this.moving) : 0);
    const w = this.moving > 0.05 && this.onGround ? Math.sin(this.walkT) * 0.7 : 0;
    legs[0].rotation.set(w, 0, 0); legs[1].rotation.set(-w, 0, 0);
    arms[0].rotation.set(-w * 0.8, 0, 0); arms[1].rotation.set(w * 0.4 - 0.6, 0, 0);
    hips.position.y = 0.62 + (this.moving > 0.05 && this.onGround ? Math.abs(Math.sin(this.walkT)) * 0.05 : 0);
    body.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0);
    if (!this.onGround) { legs[0].rotation.x = -0.6; legs[1].rotation.x = 0.4; arms[0].rotation.set(0, 0, -2.4); }
    if (this.sitting) {
      hips.position.y = 0.48; legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.5;
      arms[0].rotation.set(-0.3, 0, 0); head.rotation.y = Math.sin(t * 0.5) * 0.3;
    }
    this.icecream.visible = false; this.kite.visible = false;
    const a = this.action;
    if (a) {
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
        const hand = new THREE.Vector3(-0.33, 1.4, 0.3);
        const pos = this.kiteLine.geometry.attributes.position;
        pos.setXYZ(0, hand.x, hand.y, hand.z); pos.setXYZ(1, kx, ky - 0.3, kz); pos.needsUpdate = true;
        arms[0].rotation.set(-2.2, 0, 0);
        if (a.t > 8) this.action = null;
      }
    }
  }
}
