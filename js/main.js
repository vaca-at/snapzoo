// 동물 왕국 (snapzoo) 혼자 놀기 판: 걷기 · 점프 · 사진(화면 C) · 점수 · 도감 · 초당 포인트 · 상점 · 매표소 · 버스 · 배
import * as THREE from 'three';
import { ANIMALS, RARITY, ZONES, CAMERAS, SCORE, STAR_RATE, BEST_RATE, FACES, starsOf } from './data.js';
import { S, save, perSec, secLeft, tickSecond, dexCount, camera as curCam, randomName } from './state.js';
import { buildAnimal } from './animals.js';
import { getZone, collide, bakeJoints } from './world.js';
import { Player } from './player.js';
import { addPhoto } from './album.js';
import * as UI from './ui.js';
import { Net } from './net.js';

const $ = (s) => document.querySelector(s);
const FAST = new URLSearchParams(location.search).has('fast');   // 시험용: 동물이 10배 자주 나와요
const TIME_X = FAST ? 0.1 : 1;

// ---------- 그리기 준비 (낮은 화질: 배터리 · 발열) ----------
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const cam3 = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
const hemi = new THREE.HemisphereLight('#ffffff', '#8a9a7a', 1.6);
const sun = new THREE.DirectionalLight('#fff4e0', 1.6);
sun.position.set(8, 14, 6);
scene.add(hemi, sun);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  cam3.aspect = w / h;
  cam3.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- 나 ----------
const me = new Player();
scene.add(me.root, me.shadow);
const pos = new THREE.Vector3();
let yaw = Math.PI;              // 내가 바라보는 방향
let camYaw = 0, camPitch = 0.36, camDist = 7.5;
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
    if (key !== f.key) { f.key = key; f.p.build({ hair: st.w.h, outfit: st.w.o, item: st.w.i }, (CAMERAS.find((c) => c.id === st.c) || CAMERAS[0]).color); }
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
    a: me.action?.id || '', f: clock < faceUntil ? faceIdx : -1, w: { h: S.wear.hair, o: S.wear.outfit, i: S.wear.item }, c: S.camera }, performance.now());
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
  hemi.intensity = Z.dark ? 0.7 : 1.6; sun.intensity = Z.dark ? 0.5 : 1.6;
  hemi.color.set(Z.dark ? '#7fb0ff' : '#ffffff');
  pos.set(Z.spawn.x, 0, Z.spawn.z);
  yaw = Z.spawn.yaw; camYaw = yaw + Math.PI; me.sitting = false; me.action = null;
  S.zone = id; save();
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
const SPEED = { sloth: 0.35, turtle: 0.7, capybara: 0.8, flounder: 0.6, clione: 0.5, dumbo: 0.6, oarfish: 0.7, angler: 0.6, cheetah: 2.4, kangaroorat: 1.8, shark: 1.6, sardine: 1.8, frog: 1.2 };
const BLOB = new THREE.CircleGeometry(1, 14);
const BLOB_MAT = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.16, depthWrite: false });

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
  if (!sp.swim) { const sh = new THREE.Mesh(BLOB, BLOB_MAT); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; sh.scale.setScalar(m.size * 0.45); g.add(sh); }
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
    speed: (SPEED[sp.model] || 1.2) * (sp.swim ? 0.8 : 1),
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
  if (e.code === 'KeyE') doSpot();
  if (mode === 'photo' && (e.code === 'Equal' || e.code === 'NumpadAdd')) zoomBy(1);
  if (mode === 'photo' && (e.code === 'Minus' || e.code === 'NumpadSubtract')) zoomBy(-1);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); endJoy(); });

// 화면을 끌면 둘러보기 (걷기) · 조준 옮기기 (사진)
let drag = null, manualAim = 0;
canvas.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (mode === 'photo') { aim.yaw -= dx * 0.004 / zoom; aim.pitch = clampN(aim.pitch - dy * 0.004 / zoom, -0.6, 0.8); manualAim = 1.8; }
  else { camYaw -= dx * 0.008; camPitch = clampN(camPitch + dy * 0.005, 0.05, 1.1); }
});
const endDrag = () => { drag = null; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (e) => { if (mode === 'photo') zoomBy(e.deltaY < 0 ? 1 : -1); else camDist = clampN(camDist + Math.sign(e.deltaY) * 0.6, 4, 10); }, { passive: true });
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

$('#jumpBtn').addEventListener('click', () => me.jump());
$('#spotBtn').addEventListener('click', () => doSpot());

// ---------- 걷기 ----------
let mode = 'walk';    // walk | photo
let nearSpot = null;
function updateWalk(dt) {
  let jx = joy.x, jy = joy.y;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) jx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) jx += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) jy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) jy += 1;
  const len = Math.min(1, Math.hypot(jx, jy));
  if (len > 0.08) {
    if (me.sitting) me.sitting = false;
    if (me.action && me.action.id !== 'kite') me.action = null;
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    let mx = rx * jx + fx * -jy, mz = rz * jx + fz * -jy;
    const ml = Math.hypot(mx, mz); mx /= ml; mz /= ml;
    const sp = 4.6 * len;
    pos.x += mx * sp * dt; pos.z += mz * sp * dt;
    const want = Math.atan2(mx, mz);
    yaw += angDiff(yaw, want) * Math.min(1, dt * 12);
    // 카메라가 천천히 내 뒤로 따라와요
    camYaw += angDiff(camYaw, yaw + Math.PI) * Math.min(1, dt * 0.9 * len);
    me.moving = len;
  } else me.moving = 0;
  // 점프 · 땅
  me.vy -= 16 * dt; pos.y += me.vy * dt;
  if (pos.y <= 0) { pos.y = 0; me.vy = 0; me.onGround = true; }
  const q = { x: pos.x, z: pos.z }; collide(Z, q, 0.35); pos.x = q.x; pos.z = q.z;
  // 가까운 곳 (버스 · 매표소 · 배 · 의자)
  nearSpot = null;
  if (!me.sitting) for (const s of Z.spots) if (Math.hypot(s.x - pos.x, s.z - pos.z) < s.r) { nearSpot = s; break; }
  UI.setSpot(me.sitting ? '🧍 일어나기' : nearSpot?.label || '');
}
function doSpot() {
  if (me.sitting) { me.sitting = false; return; }
  if (!nearSpot) return;
  const s = nearSpot;
  if (s.id === 'bench') { pos.set(s.x, 0, s.z); yaw = s.yaw; me.sitting = true; me.action = null; UI.toast('🪑 앉아서 쉬어요. 초당 포인트는 계속 쌓여요'); }
  if (s.id === 'booth') UI.openTickets();
  if (s.id === 'bus') UI.openRide('bus');
  if (s.id === 'boat') UI.openRide('boat');
}

function updateCamera(dt) {
  if (mode === 'photo') return;
  const head = pos.y * 0.5 + 1.3;
  const cx = pos.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist;
  const cz = pos.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist;
  const cy = head + Math.sin(camPitch) * camDist;
  cam3.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 10));
  cam3.lookAt(pos.x, head, pos.z);
  if (cam3.fov !== 55) { cam3.fov = 55; cam3.updateProjectionMatrix(); }
}

// ---------- 사진 (화면 C) ----------
const aim = { yaw: 0, pitch: 0 };
let zoom = 1, target = null;
const frameEl = $('#frame');
function enterPhoto() {
  if (mode === 'photo' || UI.isOpen()) return;
  mode = 'photo'; me.sitting = false; me.action = null;
  me.root.visible = false; me.shadow.visible = false;
  aim.yaw = yaw; aim.pitch = 0;
  zoom = Math.min(zoom, curCam().zoom);
  target = pickTarget();
  if (target) { const d = dirTo(target); aim.yaw = d.yaw; aim.pitch = d.pitch; }
  else UI.toast('근처에 동물이 없어요. 화면을 끌어 둘러보거나 동물 가까이 가요');
  UI.photoMode(true, curCam(), zoom);
}
function exitPhoto() {
  if (mode !== 'photo') return;
  mode = 'walk'; me.root.visible = true; me.shadow.visible = true;
  yaw = aim.yaw; camYaw = yaw + Math.PI;
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
  UI.closeAll();
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
    if (n === 0) return { t: '🚌 왼쪽 버스를 타고 정글로! (무료)', spot: 'bus' };
    if (!S.tickets.bus && c >= 350) return { t: '🎫 버스표를 살 수 있어요! 매표소로', spot: 'booth' };
    if (S.tickets.bus && !S.tickets.boat && c >= 1000) return { t: '🎫 배표를 살 수 있어요! 매표소로', spot: 'booth' };
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
    me.shadow.position.set(pos.x, 0.03, pos.z);
    me.animate(dt, clock);
    updateCamera(dt);
    if (Z.water && Z.foam) Z.foam.position.z = -2 + Math.sin(clock * 0.8) * 0.4;
    if (Z.snow) Z.snow.rotation.y = clock * 0.02;
    if (marker.visible) { marker.position.y = 4.2 + Math.abs(Math.sin(clock * 3)) * 0.6; marker.rotation.y = clock * 2; }
    pointToGoal();
    updateCoins(dt);
    sendMe();
    updateTags();
    renderer.render(scene, cam3);
  }
  requestAnimationFrame(loop);
}

// ---------- 시작 ----------
UI.init({
  enterPhoto, exitPhoto, shoot, zoomBy, travel, showFace, doAction, dressUp, pickServer, serverCounts,
  zone: () => zoneId, inPhoto: () => mode === 'photo',
});
dressUp();
// 처음 화면에는 대기실 모습을 뒤에 보여 줘요
enterZone('station');
requestAnimationFrame(loop);
UI.showStart(S.name || randomName(), !!S.name, (name) => {
  S.name = name; save();
  started = true;
  UI.setName(name);
  lockScreen();
  UI.sfx('unlock');
  const z = S.zone && ZONES[S.zone] && (!ZONES[S.zone].ticket || S.tickets[ZONES[S.zone].ticket]) ? S.zone : 'station';
  if (z !== 'station') enterZone(z); else net.join(S.server);
  // 저장된 자리로 (같은 장소일 때만)
  if (S.pos && S.pos.zone === z && Number.isFinite(S.pos.x)) {
    const q = { x: S.pos.x, z: S.pos.z }; collide(Z, q, 0.35);
    pos.set(q.x, 0, q.z); yaw = S.pos.yaw || 0; camYaw = yaw + Math.PI;
  }
  UI.updateHud(); updateGoal();
  UI.toast(z === 'station' ? '🚏 정거장에 왔어요! 🎫 매표소 · 🚌 버스 · ⛵ 배' : `${ZONES[z].icon} ${ZONES[z].name}에서 이어 해요`);
});
// 테스트에서 상태를 볼 수 있게 (게임에는 영향 없음)
window.__snapzoo = { S, live, info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles }), get zone() { return zoneId; }, get pos() { return pos.clone(); }, enterZone, spawn: (id) => spawn(ANIMALS.find((a) => a.id === id), true), dexCount };
