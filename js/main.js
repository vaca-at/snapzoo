// 동물 왕국 (snapzoo) 혼자 놀기 판: 걷기 · 점프 · 사진(화면 C) · 점수 · 도감 · 초당 포인트 · 상점 · 매표소 · 버스 · 배
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ANIMALS, RARITY, ZONES, CAMERAS, SCORE, STAR_RATE, BEST_RATE, FACES, starsOf } from './data.js';
import { S, save, perSec, secLeft, tickSecond, dexCount, camera as curCam, randomName, validName } from './state.js';
import { buildAnimal } from './animals.js';
import { getZone, collide, bakeJoints, WIND, animateWater } from './world.js';
import { Player } from './player.js';
import { addPhoto } from './album.js';
import * as UI from './ui.js';
import { Net } from './net.js';

const $ = (s) => document.querySelector(s);
const FAST = new URLSearchParams(location.search).has('fast');   // 시험용: 동물이 10배 자주 나와요
const TIME_X = FAST ? 0.1 : 1;

// ---------- 그리기 준비 (캠핑장 · 큰법당과 같은 화질: 그림자 · ACES 색감 · 주변 빛 반사) ----------
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;
const cam3 = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
const hemi = new THREE.HemisphereLight('#f4f8ff', '#9a8a68', 0.9);
const sun = new THREE.DirectionalLight('#fff1d6', 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(hemi, sun, sun.target);
const SUN_OFF = new THREE.Vector3(14, 26, 10);

// 하늘: 위는 진하고 지평선은 옅은 그라데이션 + 뭉게구름 (안개를 받지 않아요)
const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
sky.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sky.geometry.attributes.position.count * 3), 3));
const clouds = new THREE.Group();
{
  const cm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.35, fog: false });
  const cg = new THREE.SphereGeometry(1, 14, 10);
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Group(), a = (i / 14) * Math.PI * 2 + Math.random() * 0.3, r = 120 + Math.random() * 60;
    c.position.set(Math.cos(a) * r, 45 + Math.random() * 30, Math.sin(a) * r);
    for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(cg, cm); m.position.set((k - 2) * 5 + Math.random() * 2, Math.random() * 2, Math.random() * 3); m.scale.set(6 + Math.random() * 4, 3.5 + Math.random() * 2, 5); c.add(m); }
    c.lookAt(0, c.position.y, 0); clouds.add(c);
  }
}
// 해: 하늘에 둥근 빛 (그림자를 만드는 해와 같은 방향)
const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, 'rgba(255,253,235,1)'); gr.addColorStop(0.25, 'rgba(255,240,190,.95)'); gr.addColorStop(1, 'rgba(255,230,170,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})(), fog: false, depthWrite: false, transparent: true }));
sunDisc.scale.setScalar(70);
scene.add(sky, clouds, sunDisc);
function setSky(top, horizon, show = true) {
  const col = sky.geometry.attributes.color, p = sky.geometry.attributes.position, a = new THREE.Color(top), b = new THREE.Color(horizon), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const h = Math.max(0, p.getY(i) / 300); c.copy(b).lerp(a, Math.pow(h, 0.6)); col.setXYZ(i, c.r, c.g, c.b); }
  col.needsUpdate = true; sky.visible = show; clouds.visible = show && !S.lite; if (typeof sunDisc !== 'undefined') sunDisc.visible = show;
}

// 가벼운 화질: 해상도 · 그림자 · 풀 · 구름 · 물결을 줄여 휴대폰이 덜 뜨겁게
export function setLite(on) {
  S.lite = !!on; save();
  renderer.setPixelRatio(on ? 1 : Math.min(window.devicePixelRatio || 1, 1.75));
  sun.castShadow = !on;
  clouds.visible = !on && sky.visible;
  if (Z?.grassMesh) Z.grassMesh.count = on ? Math.floor(Z.grassN / 4) : Z.grassN;
  resize();
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  cam3.aspect = w / h;
  cam3.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- 카메라: 손가락으로 돌리기 · 두 손가락으로 확대 (캠핑장처럼 OrbitControls, 부드럽게 멈춰요) ----------
const controls = new OrbitControls(cam3, canvas);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minPolarAngle = 0.3;
controls.maxPolarAngle = 1.45;
controls.minDistance = 3;
controls.maxDistance = 16;
controls.rotateSpeed = 0.7;

// ---------- 나 ----------
const me = new Player();
scene.add(me.root);
const pos = new THREE.Vector3();
let yaw = Math.PI;              // 내가 바라보는 방향
// 카메라를 내 뒤에 두기
function camBehind(dist = 7, h = 3.4) {
  controls.target.set(pos.x, pos.y + 1.1, pos.z);
  cam3.position.set(pos.x - Math.sin(yaw) * dist, pos.y + h, pos.z - Math.cos(yaw) * dist);
  camTurn = null;
  controls.update();
}
// 앉거나 제자리 동작을 하면 카메라가 옆으로 천천히 돌아 얼굴을 비춰요 (끌면 바로 멈춰요)
let camTurn = null;
function turnCameraToFace(dist = 5) {
  const off = cam3.position.clone().sub(controls.target);
  camTurn = { t: 0, from: { yaw: Math.atan2(off.x, off.z), r: Math.hypot(off.x, off.z), y: off.y, at: controls.target.clone() },
    to: { yaw: yaw + 0.5, r: dist * 1.15, y: dist * 0.42, at: pos.clone().add(new THREE.Vector3(0, me.wear.body === 'bean' ? 0.7 : 1.0, 0)) } };
}
function stepCameraTurn(dt) {
  if (!camTurn) return;
  camTurn.t = Math.min(1, camTurn.t + dt / 1.4);
  const e = camTurn.t * camTurn.t * (3 - 2 * camTurn.t), { from, to } = camTurn;
  const y = from.yaw + Math.atan2(Math.sin(to.yaw - from.yaw), Math.cos(to.yaw - from.yaw)) * e, r = from.r + (to.r - from.r) * e;
  controls.target.lerpVectors(from.at, to.at, e);
  cam3.position.set(controls.target.x + Math.sin(y) * r, controls.target.y + from.y + (to.y - from.y) * e, controls.target.z + Math.cos(y) * r);
  if (camTurn.t >= 1) camTurn = null;
}
controls.addEventListener('start', () => { camTurn = null; camHold = 4; });
const tmpCam = new THREE.Vector3(), tmpTgt = new THREE.Vector3();
export function dressUp() { me.build(S.wear, curCam().color); }

// ---------- 친구 (정거장 대기실에서만, 채팅 없음) ----------
const friends = new Map();       // id -> { g, p, tag, face, st, cur, key, lastA, lastF }
const SHOWN = 30;                // 가까운 친구 30명까지만 그려요 (휴대폰 부담)
function labelTex(text, w, h, font, bg) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (bg) { x.fillStyle = 'rgba(255,253,246,.92)'; x.strokeStyle = '#24342b'; x.lineWidth = 4; x.beginPath(); x.roundRect(3, 3, w - 6, h - 6, h / 2 - 3); x.fill(); x.stroke(); }
  x.fillStyle = '#24342b'; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const faceTex = {};
function addFriend(id, st) {
  const p = new Player();
  const g = new THREE.Group(); g.add(p.root, p.shadow);
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(st.n, 320, 72, '34px Jua, sans-serif', true), depthWrite: false }));
  tag.scale.set(1.9, 0.43, 1); tag.position.y = 2.45; g.add(tag);
  const face = new THREE.Sprite(new THREE.SpriteMaterial({ depthWrite: false })); face.scale.setScalar(0.8); face.position.y = 3.15; face.visible = false; g.add(face);
  const f = { g, p, tag, face, st, cur: { x: st.x, z: st.z, y: st.y, r: st.r }, key: '', lastA: '', lastF: -1 };
  friends.set(id, f);
  if (zoneId === 'station') scene.add(g);
  return f;
}
function removeFriend(id) { const f = friends.get(id); if (f) { scene.remove(f.g); friends.delete(id); } }
const net = new Net({
  onState(id, st) {
    const f = friends.get(id) || addFriend(id, st);
    f.st = st;
    const key = JSON.stringify([st.w, st.c]);
    if (key !== f.key) { f.key = key; f.p.build({ body: st.w.b, gender: st.w.g, hair: st.w.h, outfit: st.w.o, item: st.w.i }, (CAMERAS.find((c) => c.id === st.c) || CAMERAS[0]).color); }
    UI.setFriends(net, friends.size);
  },
  onLeave(id) { removeFriend(id); UI.setFriends(net, friends.size); },
  onReset() { [...friends.keys()].forEach(removeFriend); UI.setFriends(net, 0); },
  onStatus() { if (net.server) { S.server = net.server; save(); } UI.setFriends(net, friends.size); },
  onFull(n) { UI.toast(`서버 ${n}이 가득 차서 다른 서버로 옮겨요`); },
});
export function pickServer(n) { if (zoneId !== 'station') return; S.server = n; save(); net.open(n); UI.toast(`👫 ${n}번 서버로 옮겼어요`); }
export const serverCounts = () => net.fetchCounts();
function updateFriends(dt) {
  if (zoneId !== 'station') return;
  const k = Math.min(1, dt * 10);
  const near = [...friends.values()].sort((a, b) => Math.hypot(a.cur.x - pos.x, a.cur.z - pos.z) - Math.hypot(b.cur.x - pos.x, b.cur.z - pos.z));
  near.forEach((f, i) => {
    f.g.visible = i < SHOWN;
    if (!f.g.visible) return;
    const st = f.st, c = f.cur;
    c.x += (st.x - c.x) * k; c.z += (st.z - c.z) * k; c.y += (st.y - c.y) * Math.min(1, dt * 16);
    c.r += angDiff(c.r, st.r) * k;
    f.g.position.set(c.x, 0, c.z);
    f.p.root.position.y = c.y; f.p.root.rotation.y = c.r;
    f.p.moving = st.m ? 1 : 0; f.p.onGround = c.y < 0.05;
    if (st.a !== f.lastA) { f.lastA = st.a; if (st.a) f.p.doAction(st.a); else f.p.action = null; }
    f.p.sitting = !!st.s;
    f.p.animate(dt, clock);
    if (st.f !== f.lastF) {
      f.lastF = st.f;
      f.face.visible = st.f >= 0;
      if (st.f >= 0) { const e = FACES[st.f]; f.face.material.map = faceTex[e] ||= labelTex(e, 128, 128, '96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif', false); f.face.material.needsUpdate = true; }
    }
  });
}
let faceIdx = -1;
function sendMe() {
  if (zoneId !== 'station' || !started) return;
  const r2 = (v) => Math.round(v * 100) / 100;
  net.send({ n: S.name, x: r2(pos.x), z: r2(pos.z), y: r2(pos.y), r: r2(((yaw % 6.2832) + 6.2832) % 6.2832), m: me.moving > 0.05 ? 1 : 0, s: me.sitting ? 1 : 0,
    a: me.action?.id || '', f: clock < faceUntil ? faceIdx : -1, w: { b: S.wear.body, g: S.wear.gender, h: S.wear.hair, o: S.wear.outfit, i: S.wear.item }, c: S.camera }, performance.now());
}

// ---------- 장소 ----------
let Z = null, zoneId = 'station';
const live = [];                // 지금 장소의 동물들
const timers = {};              // 가끔 나오는 동물: 이번 장소에서 '곧!' 알림을 했는지
// 다음 등장 시각은 실제 시간으로 기록에 남겨요 (장소를 오가도 · 새로고침해도 '10분에 한 번쯤' 그대로)
if (!S.next || typeof S.next !== 'object') S.next = {};
const nowMs = () => Date.now();
let clock = 0;                  // 게임 시간(초)

function enterZone(id) {
  if (Z) scene.remove(Z.group);
  live.forEach((a) => scene.remove(a.g));
  live.length = 0;
  zoneId = id; Z = getZone(id);
  scene.add(Z.group);
  scene.background = new THREE.Color(Z.sky);
  scene.fog = new THREE.Fog(Z.fog[0], Z.fog[1], Z.fog[2]);
  hemi.intensity = Z.dark ? 0.6 : 0.9; sun.intensity = Z.dark ? 0.6 : 2.6;
  hemi.color.set(Z.dark ? '#7fb0ff' : '#f4f8ff');
  scene.environmentIntensity = Z.dark ? 0.15 : 0.3;
  if (Z.grassMesh) Z.grassMesh.count = S.lite ? Math.floor(Z.grassN / 4) : Z.grassN;
  setSky(Z.dark ? '#061428' : new THREE.Color(Z.sky).offsetHSL(0.02, 0.1, -0.18), Z.fog[0], !Z.dark);
  pos.set(Z.spawn.x, 0, Z.spawn.z);
  yaw = Z.spawn.yaw; me.sitting = false; me.action = null;
  camBehind();
  S.zone = id; save();
  if (typeof closeSpot === 'function' && menu) closeSpot();
  if (typeof clearWalkTo === 'function' && walkTo) clearWalkTo();
  UI.setZone(ZONES[id]);
  if (typeof updateGoal === 'function' && started) updateGoal();
  // 동물: 늘 있는 동물은 바로, 가끔 나오는 동물은 시간표대로
  for (const k in timers) delete timers[k];
  for (const sp of ANIMALS.filter((a) => a.zone === id)) {
    const R = RARITY[sp.rarity];
    // 늘 있는 동물은 한 마리씩 입구 가까이 (처음에 금방 만나게)
    if (R.appear === 'always') { for (let i = 0; i < R.count; i++) spawn(sp, false, i === 0); continue; }
    const t = nowMs();
    if (!S.next[sp.id]) S.next[sp.id] = t + R.first * 1000 * TIME_X * (0.6 + Math.random() * 0.8) * boost(sp.rarity);
    // 없는 동안 때가 지났으면 들어오고 조금 뒤에
    else if (S.next[sp.id] < t + 6000) S.next[sp.id] = t + (6000 + Math.random() * 12000) * (FAST ? 0.3 : 1);
    timers[sp.id] = { alerted: false };
  }
  if (id === 'station' && started) net.join(S.server); else net.close();
}
const boost = (r) => curCam().boost?.[r] || 1;

// 반짝이 별 그림
const starTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); x.translate(32, 32); x.fillStyle = '#fff';
  x.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 9 : 30, a = i * Math.PI / 4; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const ANIMAL_SPEED = { sloth: 0.35, turtle: 0.7, capybara: 0.8, flounder: 0.6, clione: 0.5, dumbo: 0.6, oarfish: 0.7, angler: 0.6, cheetah: 2.4, kangaroorat: 1.8, shark: 1.6, sardine: 1.8, frog: 1.2 };

function spawn(sp, timed = false, near = false) {
  const m = buildAnimal(sp.model);
  bakeJoints(m.root);
  const g = new THREE.Group();
  g.add(m.root);
  const kind = sp.swim ? 'water' : 'land';
  let p = Z.place(kind);
  // 새로 나타나는 동물 · 입구 쪽 동물은 내 근처(7~16m)에
  if (timed || near) {
    const from = near && !timed ? Z.spawn : pos;
    for (let i = 0; i < 40; i++) { const q = Z.place(kind); const d = Math.hypot(q.x - from.x, q.z - from.z); if (d > 7 && d < 16) { p = q; break; } }
  }
  m.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  // 반짝이: 특별한 순간에 · 전설 · 신화는 늘 은은하게
  const sparks = new THREE.Group(); g.add(sparks);
  const rc = RARITY[sp.rarity].color;
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: i % 2 ? '#ffd23c' : '#ffffff', transparent: true, depthWrite: false }));
    s.scale.setScalar(0.25 + m.size * 0.08); sparks.add(s);
  }
  sparks.visible = false;
  let aura = null;
  if (sp.rarity === 'legend' || sp.rarity === 'mythic') {
    aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: rc, transparent: true, opacity: 0.55, depthWrite: false }));
    aura.scale.setScalar(m.size * 2.2); aura.position.y = m.center; g.add(aura);
  }
  const a = {
    sp, m, g, sparks, aura, kind,
    x: p.x, z: p.z, y: sp.swim || 0, yaw: Math.random() * 6.28,
    tx: p.x, tz: p.z, wait: Math.random() * 2, moving: false,
    act: -1, nextAct: 3 + Math.random() * 8, flee: false,
    until: timed ? clock + RARITY[sp.rarity].stay : Infinity, leaving: 0, grow: timed ? 0 : 1,
    speed: (ANIMAL_SPEED[sp.model] || 1.2) * (sp.swim ? 0.8 : 1),
  };
  g.position.set(a.x, a.y, a.z);
  scene.add(g);
  live.push(a);
  if (timed) {
    const R = RARITY[sp.rarity];
    UI.toast(`✨ ${R.name} 동물이 나타났어요! ${S.dex[sp.id] ? sp.name : '???'}`, sp.rarity === 'rare' ? '' : 'gold');
    UI.sfx('sparkle');
  }
  return a;
}

function updateAnimals(dt) {
  // 가끔 나오는 동물 시간표
  const t = nowMs();
  for (const id in timers) {
    const tm = timers[id], at = S.next[id];
    if (!at) continue;   // 지금 나와 있어요
    const sp = ANIMALS.find((a) => a.id === id);
    if (curCam().alert && !tm.alerted && (sp.rarity === 'legend' || sp.rarity === 'mythic') && at - t < 10000) {
      tm.alerted = true; UI.toast('📸 곧! 반짝이는 동물이 나타나요', 'gold');
    }
    if (t >= at) { spawn(sp, true); S.next[id] = 0; tm.alerted = false; save(); }
  }
  for (let i = live.length - 1; i >= 0; i--) {
    const a = live[i], sp = a.sp;
    // 나타나고 · 떠나기
    if (a.grow < 1) a.grow = Math.min(1, a.grow + dt * 1.5);
    if (clock > a.until && !a.leaving) a.leaving = 0.001;
    if (a.leaving) {
      a.leaving += dt;
      if (a.leaving > 1) {
        scene.remove(a.g); live.splice(i, 1);
        const R = RARITY[sp.rarity];
        S.next[sp.id] = nowMs() + R.every * 1000 * TIME_X * (0.7 + Math.random() * 0.6) * boost(sp.rarity);
        continue;
      }
    }
    const sc = a.leaving ? 1 - a.leaving : a.grow;
    a.g.scale.setScalar(Math.max(0.01, sc));
    // 특별한 순간
    if (a.act >= 0) { a.act += dt; if (a.act > 2.4) { a.act = -1; a.nextAct = 4 + Math.random() * 8; } }
    else {
      a.nextAct -= dt;
      if (a.nextAct <= 0 && !a.flee) { a.act = 0; a.moving = false; }
    }
    // 겁 많은 동물은 가까이 가면 도망가요
    const d = Math.hypot(a.x - pos.x, a.z - pos.z);
    if (sp.shy && d < 3.2 && a.act < 0) {
      const ux = (a.x - pos.x) / (d || 1), uz = (a.z - pos.z) / (d || 1);
      a.tx = a.x + ux * 5; a.tz = a.z + uz * 5; a.flee = true; a.wait = 0;
    }
    if (a.act < 0) {
      if (a.wait > 0) { a.wait -= dt; a.moving = false; }
      else {
        const dx = a.tx - a.x, dz = a.tz - a.z, dist = Math.hypot(dx, dz);
        if (dist < 0.3) { a.flee = false; a.wait = 1 + Math.random() * 3; const p = Z.place(a.kind); a.tx = p.x; a.tz = p.z; a.moving = false; }
        else {
          const v = a.speed * (a.flee ? 2.2 : 1) * dt;
          const nx = a.x + dx / dist * Math.min(v, dist), nz = a.z + dz / dist * Math.min(v, dist);
          const q = { x: nx, z: nz }; collide(Z, q, 0.4);
          if (Z.okFor && !Z.okFor(a.kind, q.x, q.z)) { const p = Z.place(a.kind); a.tx = p.x; a.tz = p.z; }
          else { a.x = q.x; a.z = q.z; }
          const want = Math.atan2(dx, dz);
          a.yaw += angDiff(a.yaw, want) * Math.min(1, dt * 5);
          a.moving = true;
        }
      }
    } else {
      // 특별한 순간에는 나를 보며 포즈
      const want = Math.atan2(pos.x - a.x, pos.z - a.z);
      a.yaw += angDiff(a.yaw, want) * Math.min(1, dt * 3);
    }
    a.y = sp.swim ? sp.swim + Math.sin(clock * 1.3 + a.tx) * 0.12 : 0;
    a.g.position.set(a.x, a.y, a.z);
    a.m.root.rotation.y = a.yaw;
    a.m.update(clock, a.moving, a.act);
    // 반짝이
    const shine = a.act >= 0;
    a.sparks.visible = shine;
    if (shine) a.sparks.children.forEach((s, k) => {
      const an = clock * 2.6 + k * 1.05, r = a.m.size * 0.7 + 0.2;
      s.position.set(Math.cos(an) * r, a.m.center + Math.sin(an * 1.3) * a.m.size * 0.4, Math.sin(an) * r);
    });
    if (a.aura) { a.aura.material.opacity = 0.35 + Math.sin(clock * 3) * 0.15 + (shine ? 0.3 : 0); }
  }
}
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

// ---------- 입력: 조이스틱 · 키보드 · 화면 끌기 ----------
const joy = { x: 0, y: 0, id: null };
const joyEl = $('#joystick'), knob = joyEl.querySelector('.knob');
joyEl.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); moveJoy(e); });
joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) moveJoy(e); });
const endJoy = () => { joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
joyEl.addEventListener('pointerup', endJoy);
joyEl.addEventListener('pointercancel', endJoy);
function moveJoy(e) {
  const r = joyEl.getBoundingClientRect(), R = r.width / 2;
  let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R;
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  joy.x = x; joy.y = y;
  knob.style.transform = `translate(${x * R * 0.55}px, ${y * R * 0.55}px)`;
}
const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input')) return;
  keys.add(e.code);
  if (UI.isOpen()) { if (e.code === 'Escape') UI.closeAll(); return; }
  if (e.code === 'Space') { e.preventDefault(); mode === 'photo' ? shoot() : me.jump(); }
  if (e.code === 'KeyC') mode === 'photo' ? exitPhoto() : enterPhoto();
  if (e.code === 'Escape' && mode === 'photo') exitPhoto();
  if (e.code === 'KeyE' && nearSpot) openSpot(nearSpot, 'near');
  if (mode === 'photo' && (e.code === 'Equal' || e.code === 'NumpadAdd')) zoomBy(1);
  if (mode === 'photo' && (e.code === 'Minus' || e.code === 'NumpadSubtract')) zoomBy(-1);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); endJoy(); });

// 화면을 끌면 둘러보기 (걷기) · 조준 옮기기 (사진)
let drag = null, manualAim = 0;
canvas.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, t: performance.now() }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  drag.moved += Math.abs(dx) + Math.abs(dy);
  if (mode === 'photo') { aim.yaw -= dx * 0.004 / zoom; aim.pitch = clampN(aim.pitch - dy * 0.004 / zoom, -0.6, 0.8); manualAim = 1.8; }
});
const endDrag = () => { drag = null; };
// 짧게 '톡' 누르면: 매표소 · 버스 · 배 · 의자를 눌렀는지 봐요
canvas.addEventListener('pointerup', (e) => {
  const d = drag; endDrag();
  if (d && d.moved < 12 && performance.now() - d.t < 450) tapAt(e.clientX, e.clientY);
});
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (e) => { if (mode === 'photo') zoomBy(e.deltaY < 0 ? 1 : -1); }, { passive: true });
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

$('#jumpBtn').addEventListener('click', () => me.jump());

// ---------- 걷기 ----------
let mode = 'walk';    // walk | photo
let nearSpot = null;
const SPEED = 2.7, RUN_SPEED = 5.4, SEAT_SPEED = 1.8;
const ROAM = { kite: 1.5, bike: 4.2 };   // 저절로 돌 때 빠르기
let roamPause = 0, roaming = false, camHold = 0;   // camHold: 화면을 끌면 잠깐 내가 고른 카메라 그대로   // 캠핑장과 같은 걷기 · 뛰기 · 자리로 가기 속도
const tmpV = new THREE.Vector3();
function updateWalk(dt) {
  let jx = joy.x, jy = joy.y;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) jx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) jx += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) jy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) jy += 1;
  let dx = 0, dz = 0, speed = 0;
  const before = pos.clone();
  roamPause -= dt; roaming = false;
  if (Math.hypot(jx, jy) > 0.15) {
    clearWalkTo();
    if (me.sitting) standUp();
    // 조이스틱 방향은 카메라가 보는 쪽 기준
    const cy = Math.atan2(cam3.position.x - controls.target.x, cam3.position.z - controls.target.z), sn = Math.sin(cy), cs = Math.cos(cy);
    dx = jx * cs + jy * sn; dz = -jx * sn + jy * cs;
    const l = Math.hypot(dx, dz); if (l > 1) { dx /= l; dz /= l; }
    speed = Math.hypot(joy.x, joy.y) > 0.92 || keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN_SPEED : SPEED;
    roamPause = 2.5;   // 직접 움직이면 저절로 돌기는 잠깐 쉬어요
  } else if (!walkTo && roamPause <= 0 && zoneId === 'station' && ROAM[me.action?.id]) {
    // 연날리기 · 자전거타기: 분수 둘레(반지름 7m)를 저절로 돌아요
    const cx = pos.x, cz = pos.z + 1, r = Math.hypot(cx, cz), a = Math.atan2(cz, cx);
    const off = r < 4.5 || r > 9.5;   // 둘레에서 멀면 먼저 둘레로
    const ta = off ? a : a + 0.5;
    tmpV.set(Math.cos(ta) * 7 - pos.x, 0, Math.sin(ta) * 7 - 1 - pos.z);
    const d = tmpV.length();
    if (d > 0.05) { dx = tmpV.x / d; dz = tmpV.z / d; speed = ROAM[me.action.id]; roaming = true; }
  } else if (walkTo && !me.sitting) {
    tmpV.set(walkTo.x - pos.x, 0, walkTo.z - pos.z);
    const d = tmpV.length();
    if (d < (walkTo.arrive || 0.2)) { const w = walkTo; clearWalkTo(); w.onArrive?.(); }
    else { dx = tmpV.x / d; dz = tmpV.z / d; speed = Math.min(walkTo.speed && d < 4 ? walkTo.speed : SPEED, d / dt); }   // 의자 4m 앞부터 천천히
  }
  if (speed > 0) {
    // 누른 곳 · 의자로 갈 때 분수 · 가게에 막히면 옆으로 돌아서 가요
    if (walkTo) {
      const step = speed * dt, tryDir = (ang) => {
        const c = Math.cos(ang), sn = Math.sin(ang), x = dx * c + dz * sn, z = -dx * sn + dz * c;
        const q = { x: pos.x + x * step, z: pos.z + z * step }; collide(Z, q, 0.35);
        return { x, z, moved: Math.hypot(q.x - pos.x, q.z - pos.z) };
      };
      let best = tryDir(0);
      if (best.moved < step * 0.6) {
        const sides = walkTo.side ? [walkTo.side] : [1, -1];
        for (const sd of sides) for (const ang of [0.6, 1.0, 1.4]) { const r = tryDir(ang * sd); if (r.moved > best.moved + 1e-4) { best = r; walkTo.side = sd; } }
      } else if (walkTo.side && best.moved >= step * 0.95) walkTo.side = 0;
      dx = best.x; dz = best.z;
    }
    pos.x += dx * speed * dt; pos.z += dz * speed * dt;
    yaw += angDiff(yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 10);
    if (me.action && !['kite', 'bugs', 'bike'].includes(me.action.id)) { me.action = null; UI.syncActs(null); }
  }
  // 점프 · 땅
  me.vy -= 15 * dt; pos.y += me.vy * dt;
  if (pos.y <= 0) { pos.y = 0; me.vy = 0; me.onGround = true; }
  const q = { x: pos.x, z: pos.z }; collide(Z, q, 0.35); pos.x = q.x; pos.z = q.z;
  const moved = Math.hypot(pos.x - before.x, pos.z - before.z);
  me.speed = moved / Math.max(dt, 1e-4);
  me.moving = me.speed > 0.05 ? 1 : 0;
  // 분수 · 건물에 막히면 멈춰요 (의자 가까이면 그냥 앉아요)
  if (walkTo && speed > 0 && moved < speed * dt * 0.25) {
    walkTo.stuck = (walkTo.stuck || 0) + dt;
    if (walkTo.stuck > 0.35) { const w = walkTo; clearWalkTo(); if (w.onArrive && Math.hypot(w.x - pos.x, w.z - pos.z) < 1.6) w.onArrive(); }
  }
  // 카메라는 내가 움직인 만큼 같이 (높이는 빼고: 점프할 때 출렁이지 않게)
  cam3.position.x += pos.x - before.x; cam3.position.z += pos.z - before.z;
  controls.target.x += pos.x - before.x; controls.target.z += pos.z - before.z;
  // 가까운 곳 (버스 · 매표소 · 배 · 가게): 다가가면 그 위에 말풍선 메뉴, 멀어지면 닫혀요
  nearSpot = null;
  for (const s of Z.spots) if (Math.hypot(s.x - pos.x, s.z - pos.z) < s.r) { nearSpot = s; break; }
  if (me.sitting) return;
  if (dismissed && nearSpot !== dismissed) dismissed = null;   // 떠났다 다시 오면 또 떠요
  if (nearSpot && nearSpot !== dismissed && (!menu || menu.spot !== nearSpot)) openSpot(nearSpot, 'near');
  else if (menu && menu.how === 'near' && !nearSpot) closeSpot();
  else if (menu && menu.how === 'tap' && nearSpot === menu.spot) menu.how = 'near';   // 누르고 걸어가서 도착한 뒤 떠나면 닫혀요
}

// ---------- 의자: 누르면 천천히 걸어가서 저절로 앉아요 (캠핑장처럼, 단추 없이) ----------
function walkToSeat(seat) {
  closeSpot();
  if (me.sitting && Math.hypot(seat.x - pos.x, seat.z - pos.z) < 0.3) return;
  if (me.sitting) standUp();
  me.action = null; UI.syncActs(null);
  setWalkTo(seat.x, seat.z, { speed: SEAT_SPEED, arrive: 1.15, onArrive: () => sitOn(seat) });
}
export function sitOn(s) {
  clearWalkTo();
  const bx = pos.x, bz = pos.z;
  pos.set(s.x, 0, s.z); yaw = s.yaw;
  cam3.position.x += pos.x - bx; cam3.position.z += pos.z - bz; controls.target.x += pos.x - bx; controls.target.z += pos.z - bz;
  me.sitting = true; me.action = null; UI.syncActs(null);
  turnCameraToFace(5);
}
// 일어나면 의자 앞으로 한 걸음
export function standUp() {
  if (!me.sitting) return;
  me.sitting = false; camTurn = null;
  pos.x += Math.sin(yaw) * 0.8; pos.z += Math.cos(yaw) * 0.8;
}

// ---------- 말풍선 메뉴 (매표소 · 버스 · 배 · 의자 바로 위) ----------
let menu = null;            // { spot, how: 'near' | 'tap' }
let dismissed = null;       // 직접 닫은 곳: 그 자리를 떠날 때까지 다시 안 띄워요
function openSpot(s, how) { menu = { spot: s, how }; UI.showSpotMenu(s); }
function closeSpot(byUser = false) { if (!menu) return; if (byUser) dismissed = menu.spot; menu = null; UI.hideSpotMenu(); }
const ray = new THREE.Raycaster(), tapV = new THREE.Vector2();
function tapAt(x, y) {
  if (mode !== 'walk' || UI.isOpen() || !Z) return;
  tapV.set(x / window.innerWidth * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  ray.setFromCamera(tapV, cam3);
  const h = Z.hits?.length ? ray.intersectObjects(Z.hits, false)[0] : null;
  if (h?.object.userData.seat) { walkToSeat(h.object.userData.seat); return; }
  if (h) {
    // 가게 · 매표소 · 버스 · 배: 그 위에 말풍선 + 그 앞까지 걸어가요
    const s = h.object.userData.spot;
    openSpot(s, 'tap'); UI.sfx('unlock');
    if (Math.hypot(s.x - pos.x, s.z - pos.z) > s.r) setWalkTo(s.x, s.z);
    return;
  }
  if (menu && menu.how === 'tap') closeSpot();
  // 바닥을 누르면 그곳까지 걸어가요
  if (ray.ray.intersectPlane(GROUND, hitP) && Math.hypot(hitP.x, hitP.z) < Z.radius - 0.4) {
    standUp();
    setWalkTo(hitP.x, hitP.z);
  }
}

// ---------- 누른 곳 표시: 동그라미 + 거기까지 점선 ----------
const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
let walkTo = null;
const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.48, 36), new THREE.MeshBasicMaterial({ color: '#ff6b4a', transparent: true, opacity: 0.95, depthWrite: false }));
ring.rotation.x = -Math.PI / 2; ring.visible = false; ring.renderOrder = 2;
const ringIn = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), ring.material); ringIn.position.z = 0.001; ring.add(ringIn);
scene.add(ring);
const DOT_MAX = 80, DOT_GAP = 0.42;
const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.095, 12), new THREE.MeshBasicMaterial({ color: '#ff6b4a', transparent: true, opacity: 0.9, depthWrite: false }), DOT_MAX);
dots.count = 0; dots.frustumCulled = false; dots.renderOrder = 2; scene.add(dots);
const dotM = new THREE.Matrix4(), dotQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), dotP = new THREE.Vector3(), dotS = new THREE.Vector3(1, 1, 1);
function setWalkTo(x, z, opt = {}) { walkTo = { x, z, ...opt }; ring.position.set(x, 0.05, z); ring.visible = true; }
function clearWalkTo() { walkTo = null; ring.visible = false; dots.count = 0; }
function updatePath(t) {
  if (!walkTo || mode !== 'walk') { ring.visible = false; dots.count = 0; return; }
  ring.visible = true;
  ring.scale.setScalar(1 + Math.sin(t * 7) * 0.1);
  const dx = walkTo.x - pos.x, dz = walkTo.z - pos.z, d = Math.hypot(dx, dz);
  const shift = (t * 1.6) % DOT_GAP;   // 점선이 목표 쪽으로 흘러가요
  let n = 0;
  for (let k = 0.55 + shift; k < d - 0.45 && n < DOT_MAX; k += DOT_GAP) {
    dotP.set(pos.x + dx / d * k, 0.045, pos.z + dz / d * k);
    dots.setMatrixAt(n++, dotM.compose(dotP, dotQ, dotS));
  }
  dots.count = n; dots.instanceMatrix.needsUpdate = true;
}
export function eatIce(f) { closeSpot(true); me.play('icecream', f.color); turnCameraToFace(5); UI.syncActs('icecream'); UI.toast(`${f.icon} ${f.name} 아이스크림, 냠냠!`); }

// ---------- 광장 동작 단추: 🪁 연날리기 · 🦋 곤충잡기 · 👋 손 흔들기 (다시 누르면 멈춰요) ----------
export function act(id) {
  if (mode !== 'walk') return;
  if (me.sitting && id !== 'wave') standUp();
  const on = me.play(id);
  UI.syncActs(on ? id : null);
  if (on && id === 'wave') {
    // 4m 안에 친구가 있으면 그쪽을 보고 인사해요
    const f = [...friends.values()].map((x) => [x, Math.hypot(x.cur.x - pos.x, x.cur.z - pos.z)]).filter(([, d]) => d < 4).sort((a, b) => a[1] - b[1])[0];
    if (f) { yaw = Math.atan2(f[0].cur.x - pos.x, f[0].cur.z - pos.z); UI.toast(`👋 ${f[0].st.n}에게 손을 흔들었어요`); }
    turnCameraToFace(5);
  }
  if (on && id === 'kite') UI.toast('🪁 연을 날리며 광장을 한 바퀴!');
  if (on && id === 'bike') UI.toast('🚲 자전거를 타고 광장을 돌아요');
  if (on && ROAM[id]) { clearWalkTo(); roamPause = 0; camTurn = null; }
  UI.sfx('unlock');
}
const mv = new THREE.Vector3();
function placeMenu() {
  if (!menu) return;
  const s = menu.spot;
  mv.set(s.ax ?? s.x, s.ay ?? 2, s.az ?? s.z).project(cam3);
  const show = mode === 'walk' && !UI.isOpen() && mv.z < 1;
  UI.placeSpotMenu((mv.x + 1) / 2 * window.innerWidth, (1 - mv.y) / 2 * window.innerHeight, show);
}

function updateCamera(dt) {
  // 해와 그림자가 나를 따라와요
  sun.position.copy(pos).add(SUN_OFF); sun.target.position.copy(pos);
  sunDisc.position.copy(SUN_OFF).normalize().multiplyScalar(260).add(pos); sky.position.set(pos.x, 0, pos.z); clouds.position.set(pos.x * 0.6, 0, pos.z * 0.6);
  if (mode === 'photo') return;
  stepCameraTurn(dt);
  camHold -= dt;
  if (roaming && camHold <= 0) {
    // 저절로 도는 동안: 카메라는 분수 쪽 위(안쪽)에서 나를 바라봐요 (바깥 가게 · 나무에 부딪히지 않게)
    const k = Math.min(1, dt * 1.2);
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    if (me.action?.id === 'kite') {
      // 연날리기: 내 뒤쪽 · 살짝 안쪽에서 앞 하늘의 연과 나를 같이 (바깥 가게 · 수레에 안 닿게 안쪽으로 2m)
      const cx = -pos.x, cz = -1 - pos.z, cl = Math.hypot(cx, cz) || 1;
      tmpCam.set(pos.x - fx * 6 + cx / cl * 2, 3.8, pos.z - fz * 6 + cz / cl * 2);
      tmpTgt.set(pos.x + fx * 1.5, pos.y + 1.9, pos.z + fz * 1.5);
    } else {
      tmpCam.set(pos.x * 0.08, 3.4, (pos.z + 1) * 0.08 - 1);   // 자전거: 분수 한가운데 위에서 옆모습 (벤치 너머로 광장이 보이게)
      tmpTgt.set(pos.x, pos.y + 1, pos.z);
    }
    cam3.position.lerp(tmpCam, k);
    controls.target.lerp(tmpTgt, Math.min(1, dt * 4));
  }
  controls.update();
  if (cam3.fov !== 50) { cam3.fov = 50; cam3.updateProjectionMatrix(); }
}

// ---------- 사진 (화면 C) ----------
const aim = { yaw: 0, pitch: 0 };
let savedCam = null;
let zoom = 1, target = null;
const frameEl = $('#frame');
function enterPhoto() {
  if (mode === 'photo' || UI.isOpen()) return;
  standUp();
  mode = 'photo'; me.action = null; UI.syncActs(null); closeSpot(); clearWalkTo();
  controls.enabled = false; camTurn = null;
  savedCam = { p: cam3.position.clone(), t: controls.target.clone() };
  me.root.visible = false;
  aim.yaw = yaw; aim.pitch = 0;
  zoom = Math.min(zoom, curCam().zoom);
  target = pickTarget();
  if (target) { const d = dirTo(target); aim.yaw = d.yaw; aim.pitch = d.pitch; }
  else UI.toast('근처에 동물이 없어요. 화면을 끌어 둘러보거나 동물 가까이 가요');
  UI.photoMode(true, curCam(), zoom);
}
function exitPhoto() {
  if (mode !== 'photo') return;
  mode = 'walk'; me.root.visible = true;
  yaw = aim.yaw;
  controls.enabled = true;
  camBehind(); savedCam = null;
  UI.photoMode(false);
}
function zoomBy(dir) {
  zoom = clampN(Math.round((zoom + dir * 0.25) * 100) / 100, 1, curCam().zoom);
  UI.setZoom(zoom, curCam().zoom);
}
function eye() { return new THREE.Vector3(pos.x, pos.y + 1.55, pos.z); }
function centerOf(a) { return new THREE.Vector3(a.x, a.y + a.m.center * a.g.scale.y, a.z); }
function dirTo(a) {
  const e = eye(), c = centerOf(a), dx = c.x - e.x, dy = c.y - e.y, dz = c.z - e.z;
  return { yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}
// 자동 조준: 가까운 동물 (앞쪽에 있을수록 먼저)
function pickTarget() {
  let best = null, bs = Infinity;
  for (const a of live) {
    if (a.leaving) continue;
    const d = Math.hypot(a.x - pos.x, a.z - pos.z);
    if (d > 28) continue;
    const dy = Math.abs(angDiff(aim.yaw, Math.atan2(a.x - pos.x, a.z - pos.z)));
    const s = d * (1 + dy * 0.6);
    if (s < bs) { bs = s; best = a; }
  }
  return best;
}
function updatePhoto(dt) {
  if (manualAim > 0) manualAim -= dt;
  if (!target || !live.includes(target) || target.leaving) target = pickTarget();
  if (target && manualAim <= 0) {
    const d = dirTo(target);
    // 조금 늦게 따라가서, 움직이는 동물은 가운데에서 살짝 벗어나요 (타이밍 놀이)
    aim.yaw += angDiff(aim.yaw, d.yaw) * Math.min(1, dt * 3.2);
    aim.pitch += (d.pitch - aim.pitch) * Math.min(1, dt * 3.2);
  }
  const e = eye();
  cam3.position.copy(e);
  cam3.lookAt(e.x + Math.sin(aim.yaw) * Math.cos(aim.pitch), e.y + Math.sin(aim.pitch), e.z + Math.cos(aim.yaw) * Math.cos(aim.pitch));
  const fov = 55 / zoom;
  if (Math.abs(cam3.fov - fov) > 0.01) { cam3.fov += (fov - cam3.fov) * Math.min(1, dt * 10); cam3.updateProjectionMatrix(); }
  // 줌을 다 당겼는데도 멀면 조금씩 걸어가요 (조이스틱)
  if (Math.hypot(joy.x, joy.y) > 0.2) {
    const fx = Math.sin(aim.yaw), fz = Math.cos(aim.yaw), rx = Math.cos(aim.yaw), rz = -Math.sin(aim.yaw);
    pos.x += (fx * -joy.y - rx * joy.x) * 2.5 * dt; pos.z += (fz * -joy.y - rz * joy.x) * 2.5 * dt;
    const q = { x: pos.x, z: pos.z }; collide(Z, q, 0.35); pos.x = q.x; pos.z = q.z;
  }
  UI.photoHint(evaluate());
}
// 점수: 가운데 40 · 크기 30 · 특별한 순간 30
function evaluate() {
  const fr = frameEl.getBoundingClientRect();
  if (!fr.width) return null;
  const vw = window.innerWidth, vh = window.innerHeight;
  const fcx = fr.left + fr.width / 2, fcy = fr.top + fr.height / 2;
  const fwd = new THREE.Vector3(); cam3.getWorldDirection(fwd);
  const tanH = Math.tan(THREE.MathUtils.degToRad(cam3.fov) / 2);
  let best = null;
  for (const a of live) {
    if (a.leaving) continue;
    const c = centerOf(a);
    const rel = c.clone().sub(cam3.position), depth = rel.dot(fwd);
    if (depth < 0.3) continue;
    const ndc = c.clone().project(cam3);
    const px = (ndc.x + 1) / 2 * vw, py = (1 - ndc.y) / 2 * vh;
    const dx = px - fcx, dy = py - fcy;
    if (Math.abs(dx) > fr.width / 2 || Math.abs(dy) > fr.height / 2) continue;
    const nd = Math.hypot(dx / (fr.width / 2), dy / (fr.height / 2)) / Math.SQRT2;
    const center = Math.round(SCORE.center * Math.max(0, 1 - nd / 0.7));
    const hpx = a.m.size * a.g.scale.y / (2 * depth * tanH) * vh;
    const ratio = hpx / fr.height;
    const size = ratio > 0.95 ? 0 : Math.round(SCORE.size * Math.max(0, 1 - Math.abs(ratio - 0.4) / 0.32));
    const moment = a.act >= 0 ? SCORE.moment : 0;
    const total = center + size + moment;
    if (!best || total > best.total) best = { a, center, size, moment, total, ratio, depth };
  }
  return best;
}

let shooting = false;
async function shoot() {
  if (mode !== 'photo' || shooting || UI.isOpen()) return;
  shooting = true;
  const ev = evaluate();
  // 지금 화면을 그려서 네모 부분만 잘라요
  renderer.render(scene, cam3);
  const fr = frameEl.getBoundingClientRect(), k = renderer.getPixelRatio();
  const out = document.createElement('canvas'); out.width = 480; out.height = 360;
  out.getContext('2d').drawImage(canvas, fr.left * k, fr.top * k, fr.width * k, fr.height * k, 0, 0, 480, 360);
  let img = '';
  try { img = out.toDataURL('image/jpeg', 0.8); } catch { /* 그림을 못 만들면 빈 사진 */ }
  UI.flash(); UI.sfx('shutter');
  UI.setLastPhoto(img);
  if (!ev) {
    await addPhoto({ img, animal: null, score: 0, zone: zoneId, cam: S.camera });
    UI.toast('찰칵! 그런데 아무 동물도 찍히지 않았어요');
    shooting = false; return;
  }
  const sp = ev.a.sp, R = RARITY[sp.rarity], C = curCam(), stars = starsOf(ev.total);
  const old = S.dex[sp.id];
  let badge, prize = 0, newDex = false;
  if (!old) {
    badge = '새 동물 도감 등록!'; newDex = true;
    prize = Math.round(R.prize * STAR_RATE[stars] * (C.prizeX || 1));
    S.dex[sp.id] = { score: ev.total, stars, shots: 1, at: Date.now(), cam: C.id };
    await addPhoto({ id: `best-${sp.id}`, img, animal: sp.id, score: ev.total, zone: zoneId, cam: C.id });
  } else if (ev.total > old.score) {
    badge = '최고 사진 바꿈!';
    prize = Math.round(R.prize * BEST_RATE * (C.prizeX || 1));
    Object.assign(old, { score: ev.total, stars, shots: (old.shots || 1) + 1, cam: C.id });
    await addPhoto({ id: `best-${sp.id}`, img, animal: sp.id, score: ev.total, zone: zoneId, cam: C.id });
  } else {
    badge = old.score === ev.total ? '최고 사진과 같은 점수예요' : `최고 사진은 ${old.score}점이에요`;
    old.shots = (old.shots || 1) + 1;
  }
  await addPhoto({ img, animal: sp.id, score: ev.total, zone: zoneId, cam: C.id });
  S.coins += prize; save();
  UI.updateHud();
  UI.showResult({ sp, R, ev, stars, img, badge, prize, newDex, best: S.dex[sp.id].score, cam: C, perSec: perSec() });
  if (newDex) UI.sfx('fanfare'); else if (prize) UI.sfx('coin');
  shooting = false;
}

// ---------- 표정 · 동작 ----------
let faceUntil = 0;
export function showFace(f) { UI.setFace(f); faceUntil = clock + 2.6; faceIdx = FACES.indexOf(f); }
export function doAction(id) { if (mode === 'photo') exitPhoto(); me.doAction(id); UI.toast({ icecream: '🍦 냠냠', wave: '👋 안녕!', kite: '🪁 연이 하늘 높이!' }[id]); }

// ---------- 이동 (버스 · 배) ----------
export function travel(dest) {
  const zd = ZONES[dest];
  if (zd.ticket && !S.tickets[zd.ticket]) { UI.openTickets(zd.ticket); return; }
  UI.closeAll(); closeSpot();
  if (mode === 'photo') exitPhoto();
  UI.ride(dest === 'station' ? (ZONES[zoneId].ride || 'bus') : zd.ride, zd, () => enterZone(dest));
}

// ---------- 초당 포인트 ----------
let secAcc = 0;
function updateCoins(dt) {
  if (document.hidden || !started) return;
  secAcc += dt;
  while (secAcc >= 1) {
    secAcc -= 1;
    const n = tickSecond();
    if (n === 0 && !UI.capShown) UI.capToast();
    updateGoal();
  }
  UI.updateHud();
}
// 다른 앱에 다녀오거나 새로고침해도 그 자리에서 이어 해요
function keepPlace() { if (started && mode === 'walk') S.pos = { zone: zoneId, x: +pos.x.toFixed(2), z: +pos.z.toFixed(2), yaw: +yaw.toFixed(2) }; save(); }
setInterval(() => { if (started) keepPlace(); }, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) keepPlace(); else lockScreen(); });
window.addEventListener('pagehide', keepPlace);

// ---------- 다음에 할 일 안내 (처음 온 아이도 길을 잃지 않게) ----------
const marker = new THREE.Group();
{
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 4), new THREE.MeshBasicMaterial({ color: '#ffc93c' }));
  m.rotation.x = Math.PI; marker.add(m);
}
marker.visible = false;
scene.add(marker);
function goal() {
  const n = dexCount(), c = S.coins;
  if (zoneId === 'station') {
    if (n === 0) return { t: '🚌 왼쪽 버스를 눌러 정글로! (무료)', spot: 'bus' };
    if (!S.tickets.bus && c >= 350) return { t: '🎫 매표소를 눌러 버스표를 사요!', spot: 'booth' };
    if (S.tickets.bus && !S.tickets.boat && c >= 1000) return { t: '🎫 매표소를 눌러 배표를 사요!', spot: 'booth' };
    return { t: '' };
  }
  if (n === 0) return { t: '📷 동물 가까이 가서 아래 📷 를 눌러요' };
  if ((!S.tickets.bus && c >= 350) || (!S.tickets.boat && c >= 1000)) return { t: '🎫 표 살 포인트가 모였어요! 🗺️ 지도 → 정거장' };
  const left = ANIMALS.filter((a) => a.zone === zoneId && !S.dex[a.id]).length;
  return { t: left ? `🔍 여기서 아직 못 만난 동물 ${left}마리` : '🏅 여기 동물을 다 찾았어요!' };
}
function updateGoal() {
  const g = goal();
  UI.setGoal(g.t);
  const s = g.spot && Z.spots.find((p) => p.id === g.spot);
  marker.visible = !!s;
  if (s) marker.position.set(s.x, 0, s.z);
}

// 화면 꺼짐 막기
let wake = null;
async function lockScreen() { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch { /* 지원 안 함 */ } }

// 목표가 화면 밖이면 가장자리에 방향 화살표
const goalArrow = document.querySelector('#goalArrow');
function pointToGoal() {
  if (!marker.visible || mode !== 'walk' || UI.isOpen()) { goalArrow.hidden = true; return; }
  const w = window.innerWidth, h = window.innerHeight;
  v3.set(marker.position.x, 2, marker.position.z).applyMatrix4(cam3.matrixWorldInverse);
  const behind = v3.z > 0;
  const p = v3.clone().applyMatrix4(cam3.projectionMatrix);
  let x = (p.x + 1) / 2 * w, y = (1 - p.y) / 2 * h;
  if (behind) { x = w - x; y = h * 0.8; }
  const m = 46, top = 150, bottom = h - 260;
  const inside = !behind && x > m && x < w - m && y > top && y < bottom;
  goalArrow.hidden = inside;
  if (inside) return;
  const cx = w / 2, cy = (top + bottom) / 2, dx = x - cx, dy = y - cy;
  const k = Math.min((w / 2 - m) / Math.abs(dx || 1e-3), ((bottom - top) / 2) / Math.abs(dy || 1e-3));
  goalArrow.style.transform = `translate(${cx + dx * k}px, ${cy + dy * k}px) translate(-50%, -50%) rotate(${Math.atan2(dy, dx)}rad)`;
}

// ---------- 머리 위 표정 · 이름표 위치 ----------
const v3 = new THREE.Vector3();
function updateTags() {
  v3.set(pos.x, pos.y + 2.3, pos.z).project(cam3);
  const show = mode === 'walk' && v3.z < 1 && (zoneId === 'station' || clock < faceUntil);
  UI.placeTag((v3.x + 1) / 2 * window.innerWidth, (1 - v3.y) / 2 * window.innerHeight, show, clock < faceUntil);
}

// ---------- 돌리기 ----------
let started = false, last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!document.hidden) clock += dt;
  if (Z) {
    if (mode === 'walk' && !UI.isOpen()) updateWalk(dt); else me.moving = 0;
    updateAnimals(dt);
    updateFriends(dt);
    if (mode === 'photo') updatePhoto(dt);
    me.root.position.copy(pos); me.root.rotation.y = yaw;
    me.animate(dt, clock);
    updateCamera(dt);
    if (Z.water && Z.foam) Z.foam.position.z = -2 + Math.sin(clock * 0.8) * 0.4;
    if (Z.snow) Z.snow.rotation.y = clock * 0.02;
    Z.update?.(clock, dt);
    WIND.value = clock;
    if (!S.lite) animateWater(Z, clock);
    updatePath(clock);
    if (marker.visible) { marker.position.y = 4.2 + Math.abs(Math.sin(clock * 3)) * 0.6; marker.rotation.y = clock * 2; }
    pointToGoal();
    placeMenu();
    updateCoins(dt);
    sendMe();
    updateTags();
    renderer.render(scene, cam3);
  }
  requestAnimationFrame(loop);
}

// ---------- 시작 ----------
UI.init({
  enterPhoto, exitPhoto, shoot, zoomBy, travel, showFace, doAction, dressUp, pickServer, serverCounts, sitOn, standUp,
  isSitting: () => me.sitting, closeSpot: () => closeSpot(true), eatIce, act, setLite,
  zone: () => zoneId, inPhoto: () => mode === 'photo',
});
dressUp();
if (S.lite) setLite(true);
// 처음 화면에는 대기실 모습을 뒤에 보여 줘요
enterZone('station');
requestAnimationFrame(loop);
// 시작 창 없이 바로 들어가요: 처음이면 '000 00' 이름을 자동으로 받아요
(() => {
  const first = !validName(S.name);
  if (first) S.name = randomName();
  save();
  started = true;
  document.body.classList.add('playing');
  UI.setName(S.name);
  // 화면 꺼짐 막기 · 소리는 브라우저가 첫 터치 뒤에만 허락해요
  addEventListener('pointerdown', () => { lockScreen(); UI.sfx('unlock'); }, { once: true });
  const z = S.zone && ZONES[S.zone] && (!ZONES[S.zone].ticket || S.tickets[ZONES[S.zone].ticket]) ? S.zone : 'station';
  if (z !== 'station') enterZone(z); else net.join(S.server);
  // 저장된 자리로 (같은 장소일 때만)
  if (S.pos && S.pos.zone === z && Number.isFinite(S.pos.x)) {
    const q = { x: S.pos.x, z: S.pos.z }; collide(Z, q, 0.35);
    pos.set(q.x, 0, q.z); yaw = S.pos.yaw || 0; camBehind();
  }
  UI.updateHud(); updateGoal();
  UI.toast(first ? `🎉 반가워요, ${S.name}! 바닥을 누르면 걸어가요` : z === 'station' ? `🚏 ${S.name}, 다시 왔네요!` : `${ZONES[z].icon} ${ZONES[z].name}에서 이어 해요`);
})();
// 테스트에서 상태를 볼 수 있게 (게임에는 영향 없음)
window.__snapzoo = { S, live, info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles }), get zone() { return zoneId; }, get pos() { return pos.clone(); }, get walk() { return walkTo && { ...walkTo }; }, get cam() { return [cam3.position.x, cam3.position.y, cam3.position.z].map((v) => +v.toFixed(2)); }, tp: (x, z) => pos.set(x, 0, z), enterZone, spawn: (id) => spawn(ANIMALS.find((a) => a.id === id), true), dexCount };
