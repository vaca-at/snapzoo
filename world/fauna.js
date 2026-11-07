// 섬 식구 늘리기 (2026-11-05): 구역마다 10종. 사람을 해치는 동물(곰 · 사자 · 하마 · 뱀 · 해파리 · 가오리 …)은 넣지 않아요.
// zoo3d.js 의 그림 도구를 그대로 써요: 네 발 동물은 quad(), 작은 동물 · 새 · 거북 · 바다 친구는 여기서 새 틀로 빚어요.
// 모든 동물은 +z 를 보고 발이 y=0. 돌려주는 st = { root, walk(0~1), update(t, dt) }.
import { THREE, COATS, quad, eye, plain, tube, ell, M, J, V, SPECIES } from './zoo3d.js?v=20261108f';
const { sin, cos, PI, abs, min, max, pow } = Math;

// ───────── 네 발 동물: 몸길이 L · 어깨 높이 H 만 주면 나머지 비율은 알맞게, 다른 곳만 o 로 ─────────
const BELLY = `vec3 c=C0; if((reg<0.5||(reg>1.5&&reg<2.5)) && T.z<-0.3) c=C1; if(reg>2.5&&reg<3.5 && T.z<-0.45) c=C1; if(reg>3.5&&reg<4.5 && T.x>0.75*T.x+0.0 && R.y<0.0) c=C2; return c;`;
function Q(kind, cols, L, H, o = {}, glsl = BELLY) {
  if (!COATS[kind]) COATS[kind] = { c: cols, glsl };
  const bodyH = o.bodyH ?? L * 0.42;
  return () => quad({ kind, len: L, bodyH, bodyW: L * 0.34, shoulder: H, rumpY: 0, chestY: 0, front: 0.1, legZ: 0.3, legR: L * 0.04, hoof: L * 0.05, hoofC: '#2a2422',
    neckIn: L * 0.08, neckA: 0.8, neckL: L * 0.28, neckR: [L * 0.12, L * 0.09], neckRest: 0, headA: 0.5, headL: L * 0.32, headR: L * 0.1, eyeR: L * 0.02,
    earW: L * 0.05, earL: L * 0.08, earOut: 0.8, earIn: '#e8c8b0', tailL: L * 0.3, tuft: 0, graze: 0.6, ...o });
}
const horns = (c, f) => (h, r, l) => { for (const s of [-1, 1]) M(h, tube(f(s, r, l), (t) => r * 0.18 * (1 - 0.75 * t), 12, 8), plain(c)); };

// ───────── 작은 동물 (토끼 · 다람쥐 · 미어캣 · 고슴도치 · 날쥐 · 레밍 …): 둥근 몸 + 머리, 깡충깡충 ─────────
function critter(o) {
  const L = o.L, root = new THREE.Group(), hop = J(root), body = J(hop), C = plain(o.c), B = plain(o.belly || o.c);
  const up = o.up ? 1 : 0;   // 1 이면 미어캣 · 다람쥐처럼 뒷발로 서요
  body.position.y = L * (0.42 + up * 0.35); body.rotation.x = -up * 1.15;
  M(body, ell(L * 0.34, L * 0.32, L * 0.5), C);
  M(body, ell(L * 0.28, L * 0.24, L * 0.4), B, undefined, 0, -L * 0.08, L * 0.05);
  if (o.spikes) { const sp = plain(o.spikes); for (let i = 0; i < 46; i++) { const a = i * 2.4, k = (i % 9) / 9; const m = M(body, new THREE.ConeGeometry(L * 0.035, L * 0.18, 5), sp, undefined, sin(a) * L * 0.3 * (0.5 + k * 0.5), L * (0.12 + 0.18 * (1 - k)), -L * 0.35 + k * L * 0.6); m.lookAt(m.position.clone().multiplyScalar(3).add(V(0, L, -L))); m.rotateX(PI / 2); } }
  if (o.bands) for (let i = 0; i < 7; i++) M(body, new THREE.TorusGeometry(L * 0.31, L * 0.022, 6, 24, PI), plain(o.bands), undefined, 0, -L * 0.02, -L * 0.3 + i * L * 0.1).rotation.z = 0;
  const head = J(body, 0, L * 0.2, L * 0.44); head.rotation.x = up * 1.15 * 0.85;
  M(head, ell(L * 0.24, L * 0.22, L * 0.26), C);
  M(head, ell(L * 0.13, L * 0.11, L * 0.13), B, undefined, 0, -L * 0.06, L * 0.18);
  if (o.snout) { M(head, new THREE.ConeGeometry(L * 0.1, L * 0.26, 14), plain(o.belly || o.c), undefined, 0, -L * 0.05, L * 0.3).rotation.x = PI / 2; M(head, ell(L * 0.04, L * 0.035, L * 0.03, 10), plain(o.nose || '#2a1a1a'), undefined, 0, -L * 0.05, L * 0.44); }
  else M(head, ell(L * 0.045, L * 0.035, L * 0.03, 10), plain(o.nose || '#3a2a2a'), undefined, 0, -L * 0.02, L * 0.3).userData.noLine = true;
  const eyes = [-1, 1].map((s) => eye(head, L * 0.045 * (o.bigEye || 1), s * L * 0.13, L * 0.06, L * 0.17, s * 0.5));
  const ears = [-1, 1].map((s) => { const e = J(head, s * L * 0.11, L * 0.16, -L * 0.04); const kind = o.ears || 'round';
    if (kind === 'long') { e.rotation.set(-0.25, 0, s * 0.18); M(e, ell(L * 0.07, L * 0.3, L * 0.03), C, undefined, 0, L * 0.28, 0); M(e, ell(L * 0.04, L * 0.24, L * 0.01), plain(o.earIn || '#f2c0c0'), undefined, 0, L * 0.28, L * 0.02); }
    else if (kind === 'pointy') { e.rotation.set(-0.2, 0, s * 0.35); M(e, new THREE.ConeGeometry(L * 0.08, L * 0.2, 4), C, undefined, 0, L * 0.09, 0); }
    else if (kind === 'none') { /* 귀 없음 */ }
    else M(e, ell(L * 0.07, L * 0.07, L * 0.03), C, undefined, s * L * 0.02, L * 0.03, 0);
    return e; });
  const feet = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => { const f = M(hop, ell(L * 0.075, L * 0.06, L * (sz < 0 && o.gait !== 'scurry' ? 0.14 : 0.08), 10), plain(o.feet || o.c), undefined, sx * L * 0.15, L * 0.05, sz * L * (0.24 - up * 0.1)); f.userData.z0 = f.position.z; return f; });
  if (up) for (const s of [-1, 1]) M(body, ell(L * 0.05, L * 0.12, L * 0.05, 10), B, undefined, s * L * 0.18, L * 0.05, L * 0.3);
  const tail = J(body, 0, L * 0.02, -L * 0.48);
  const tk = o.tail || 'puff';
  if (tk === 'puff') M(tail, ell(L * 0.1, L * 0.1, L * 0.1, 12), plain(o.tailC || o.belly || '#ffffff'));
  else if (tk === 'bushy') { tail.rotation.x = up ? 0.2 : -0.9; M(tail, tube([[0, 0, 0], [0, L * 0.3, -L * 0.12], [0, L * 0.62, -L * 0.04], [0, L * 0.78, L * 0.08]], (t) => L * 0.12 * (0.6 + sin(PI * t) * 0.6), 14, 12), plain(o.tailC || o.c)); }
  else if (tk === 'thin') { tail.rotation.x = 0.4; M(tail, tube([[0, 0, 0], [0, -L * 0.25, -L * 0.2], [0, -L * 0.3, -L * 0.5]], (t) => L * 0.04 * (1 - 0.7 * t), 10, 8), plain(o.tailC || o.c)); }
  const ph = Math.random() * 9, st = { root, walk: 0, step: 0 };
  st.update = (t, dt) => {
    t += ph; st.step += dt * st.walk * 9;
    const scurry = o.gait === 'scurry', h = scurry ? abs(sin(st.step * 1.6)) * L * 0.04 * st.walk : abs(sin(st.step)) * L * 0.35 * st.walk; hop.position.y = h; body.rotation.z = scurry ? sin(st.step * 1.6) * 0.05 * st.walk : 0;
    if (scurry) feet.forEach((f, i) => { f.position.z = f.userData.z0 + sin(st.step * 1.6 + (i % 3 ? PI : 0)) * L * 0.08 * st.walk; });
    if (!st.walk) { head.rotation.y = sin(t * 0.7) * 0.5 * (up ? 1 : 0.4); head.rotation.z = sin(t * 0.4) * 0.1; }
    body.scale.y = 1 + sin(t * 3) * 0.02;
    if (o.ears === 'long') ears.forEach((e, i) => { e.rotation.x = -0.25 + sin(t * 1.3 + i) * 0.1; });
    if (tk === 'bushy') tail.rotation.z = sin(t * 2) * 0.15;
    const bl = (t % 3.7) < 0.1; eyes.forEach((e) => (e.scale.y = bl ? 0.1 : 1));
  };
  return st;
}

// ───────── 새 (닭 · 오리 · 타조 · 홍학 · 앵무새 · 공작 · 갈매기 · 펠리컨 · 퍼핀 · 올빼미 …) ─────────
function bird(o) {
  const s = o.size, root = new THREE.Group(), body = J(root, 0, o.legL + s * 0.42, 0), C = plain(o.c), W = plain(o.wing || o.c);
  M(body, ell(s * 0.36 * (o.bw || 1), s * 0.4 * (o.bh || 1), s * 0.55 * (o.bl || 1)), C);
  if (o.belly) M(body, ell(s * 0.3, s * 0.32, s * 0.42), plain(o.belly), undefined, 0, -s * 0.07, s * 0.1);
  const wings = [-1, 1].map((k) => { const w = J(body, k * s * 0.33, s * 0.08, -s * 0.05); M(w, ell(s * 0.07, s * 0.26, s * 0.42), W, undefined, 0, -s * 0.05, -s * 0.06); w.rotation.z = -k * 0.05; return w; });
  // 꼬리
  const tail = J(body, 0, s * 0.1, -s * 0.5);
  if (o.tail === 'fan') { const cols = ['#2f8a6a', '#3a6ab0', '#2e9a8a']; for (let i = 0; i < 13; i++) { const a = (i / 12 - 0.5) * 2.4, f = J(tail); f.rotation.set(-0.35, 0, a); M(f, ell(s * 0.09, s * 0.75, s * 0.02), plain(cols[i % 3]), undefined, 0, s * 0.72, 0); M(f, ell(s * 0.05, s * 0.06, s * 0.025, 10), plain('#e8b84a'), undefined, 0, s * 1.3, 0.005); } }
  else if (o.tail === 'long') M(tail, ell(s * 0.08, s * 0.05, s * 0.6), plain(o.tailC || o.c), undefined, 0, -s * 0.05, -s * 0.45);
  else if (o.tail === 'up') { for (let i = 0; i < 5; i++) { const f = J(tail); f.rotation.set(-0.9 - i * 0.12, 0, (i - 2) * 0.16); M(f, ell(s * 0.07, s * 0.34, s * 0.03), plain(i % 2 ? (o.tailC || o.c) : (o.tailC2 || o.tailC || o.c)), undefined, 0, s * 0.3, 0); } }   // 닭: 위로 솟은 꼬리깃
  else M(tail, ell(s * 0.14, s * 0.06, s * 0.2), plain(o.tailC || o.c), undefined, 0, s * 0.04, -s * 0.12).rotation.x = -0.4;
  // 목 · 머리
  const neck = J(body, 0, s * 0.2, s * 0.38), nl = o.neckL || s * 0.15;
  M(neck, tube(o.sNeck ? [[0, 0, 0], [0, nl * 0.4, nl * 0.25], [0, nl * 0.7, -nl * 0.05], [0, nl, nl * 0.12]] : [[0, 0, 0], [0, nl * 0.5, nl * 0.08], [0, nl, nl * 0.12]], (t) => s * (o.neckR || 0.16) * (1 - 0.3 * t), 12, 12), plain(o.neckC || o.c));
  const head = J(neck, 0, nl, nl * 0.12), hr = s * (o.headR || 0.24);
  M(head, ell(hr, hr * 1.02, hr * 1.05), plain(o.headC || o.neckC || o.c));
  if (o.face) M(head, ell(hr * 0.8, hr * 0.7, hr * 0.5), plain(o.face), undefined, 0, -hr * 0.05, hr * 0.62);
  const eyes = [-1, 1].map((k) => eye(head, hr * 0.17, k * hr * 0.66, hr * 0.15, hr * 0.5, k * 0.9));
  const bk = J(head, 0, -hr * 0.1, hr * 0.85), BK = plain(o.beakC || '#e8a03a'), bt = o.beak || 'cone';
  if (bt === 'duck') M(bk, ell(hr * 0.5, hr * 0.14, hr * 0.62), BK, undefined, 0, -hr * 0.05, hr * 0.4);
  else if (bt === 'hook') { M(bk, tube([[0, hr * 0.12, 0], [0, hr * 0.1, hr * 0.4], [0, -hr * 0.25, hr * 0.5]], (t) => hr * 0.28 * (1 - 0.8 * t), 10, 10), BK); }
  else if (bt === 'big') { M(bk, tube([[0, 0, 0], [0, -hr * 0.1, hr * 1.2], [0, -hr * 0.4, hr * 1.9]], (t) => [hr * 0.36 * (1 - 0.75 * t), hr * 0.62 * (1 - 0.7 * t)], 14, 12), BK); }
  else if (bt === 'pouch') { M(bk, ell(hr * 0.3, hr * 0.12, hr * 1.8), BK, undefined, 0, 0, hr * 1.5); M(bk, ell(hr * 0.28, hr * 0.42, hr * 1.4), plain(o.pouchC || '#f2c88a'), undefined, 0, -hr * 0.38, hr * 1.3); }
  else if (bt === 'bend') { M(bk, tube([[0, 0, 0], [0, -hr * 0.2, hr * 0.7], [0, -hr * 0.9, hr * 0.85]], (t) => hr * 0.25 * (1 - 0.5 * t), 12, 10), BK); }
  else if (bt === 'parrot') { M(bk, ell(hr * 0.42, hr * 0.5, hr * 0.5), plain(o.beakC || '#f2e6d0'), undefined, 0, -hr * 0.15, hr * 0.12); }
  else if (bt === 'puffin') { M(bk, ell(hr * 0.3, hr * 0.55, hr * 0.55), BK, undefined, 0, -hr * 0.1, hr * 0.2); }
  else M(bk, new THREE.ConeGeometry(hr * 0.26, hr * 0.6, 10), BK, undefined, 0, 0, hr * 0.25).rotation.x = PI / 2;
  if (o.wattle) for (const k of [-1, 1]) M(head, ell(hr * 0.12, hr * 0.22, hr * 0.08, 10), plain(o.wattle), undefined, k * hr * 0.1, -hr * 0.55, hr * 0.7);
  if (o.comb) for (let i = 0; i < 3; i++) M(head, ell(hr * 0.12, hr * 0.22, hr * 0.12, 10), plain(o.comb), undefined, 0, hr * 1.05, hr * (0.35 - i * 0.28));
  if (o.crest) for (let i = 0; i < 5; i++) { const c = J(head, 0, hr * 0.9, -hr * 0.1); c.rotation.set(-0.6 + i * 0.1, 0, (i - 2) * 0.22); M(c, ell(hr * 0.04, hr * 0.32, hr * 0.04, 8), plain(o.crest), undefined, 0, hr * 0.3, 0); }
  if (o.tufts) for (const k of [-1, 1]) M(head, new THREE.ConeGeometry(hr * 0.18, hr * 0.42, 6), plain(o.c), undefined, k * hr * 0.55, hr * 0.95, 0).rotation.z = -k * 0.3;
  // 다리
  const LC = plain(o.legC || '#e8a03a'), legs = [-1, 1].map((k) => { const l = J(root, k * s * 0.14, o.legL + s * 0.12, 0); M(l, tube([[0, 0, 0], [0, -(o.legL + s * 0.1) * 0.5, s * 0.02], [0, -(o.legL + s * 0.1), 0]], () => s * (o.legR || 0.035), 8, 8), LC); M(l, ell(s * 0.09, s * 0.025, s * 0.14, 8), LC, undefined, 0, -(o.legL + s * 0.1), s * 0.06); return l; });
  const ph = Math.random() * 9, st = { root, walk: 0, step: 0 };
  st.update = (t, dt) => {
    t += ph; st.step += dt * st.walk * (o.legL > s ? 6 : 11);
    legs.forEach((l, i) => { l.rotation.x = sin(st.step + i * PI) * 0.5 * st.walk; });
    body.position.y = o.legL + s * 0.42 + abs(sin(st.step)) * s * 0.04 * st.walk; body.rotation.z = sin(st.step) * 0.08 * st.walk * (o.waddle ? 1.6 : 0.5);
    const peck = o.peck && !st.walk ? max(0, sin(t * 1.1)) : 0;
    neck.rotation.x = peck * 1.1 + sin(t * 0.8) * 0.05; head.rotation.y = !st.walk ? sin(t * 0.9) * 0.6 * (1 - peck) : 0;
    const flap = (t % 6) < 0.6 ? sin(t * 30) * 0.6 : 0; wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.05 + abs(flap)); });
    if (o.tail === 'fan') tail.rotation.x = -0.2 + sin(t * 0.5) * 0.05;
    const bl = (t % 4) < 0.1; eyes.forEach((e) => (e.scale.y = bl ? 0.1 : 1));
  };
  return st;
}

// ───────── 등딱지 동물 (육지거북 · 사막거북 · 바다거북) ─────────
function turtle(o) {
  const s = o.size, root = new THREE.Group(), body = J(root, 0, o.sea ? 0 : s * 0.22, 0), SK = plain(o.skin || '#8a8a5a');
  const shellG = new THREE.SphereGeometry(1, 28, 16, 0, PI * 2, 0, PI * 0.5); shellG.scale(s * 0.62, s * (o.sea ? 0.32 : 0.48), s * 0.78);
  M(body, shellG, plain(o.shell || '#7a6a3a'));
  for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2; M(body, new THREE.CircleGeometry(s * 0.14, 6), plain(o.plate || '#9a8a4a'), undefined, sin(a) * s * 0.36, s * (o.sea ? 0.25 : 0.36), cos(a) * s * 0.45).lookAt(sin(a) * s * 2, s * 2.4, cos(a) * s * 2.4); }
  M(body, ell(s * 0.6, s * 0.06, s * 0.74), plain(o.belly || '#c8b88a'), undefined, 0, 0.01, 0);
  const head = J(body, 0, s * 0.1, s * 0.78); M(head, ell(s * 0.15, s * 0.13, s * 0.22), SK, undefined, 0, 0, s * 0.1);
  const eyes = [-1, 1].map((k) => eye(head, s * 0.03, k * s * 0.1, s * 0.05, s * 0.2, k * 0.7));
  const legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([x, z]) => { const l = J(body, x * s * 0.48, 0, z * s * 0.5); if (o.sea) { M(l, ell(s * (z > 0 ? 0.42 : 0.2), s * 0.04, s * 0.14), SK, undefined, x * s * (z > 0 ? 0.3 : 0.1), 0, 0).rotation.y = -x * z * 0.4; } else M(l, tube([[0, 0.02, 0], [0, -s * 0.22, 0]], () => s * 0.09, 6, 10), SK); return { l, x, z }; });
  M(body, new THREE.ConeGeometry(s * 0.06, s * 0.18, 8), SK, undefined, 0, s * 0.02, -s * 0.8).rotation.x = -PI / 2;
  const ph = Math.random() * 9, st = { root, walk: 0, step: 0 };
  st.update = (t, dt) => {
    t += ph; st.step += dt * st.walk * (o.sea ? 3 : 4);
    legs.forEach(({ l, x, z }) => { if (o.sea) l.rotation.y = sin(st.step + (z > 0 ? 0 : PI)) * 0.5 * x; else l.rotation.x = sin(st.step + (x * z > 0 ? 0 : PI)) * 0.4 * st.walk; });
    if (o.sea) l0();
    head.position.z = s * 0.78 + sin(t * 0.5) * s * 0.06; head.rotation.y = sin(t * 0.3) * 0.4;
    const bl = (t % 5) < 0.12; eyes.forEach((e) => (e.scale.y = bl ? 0.1 : 1));
  };
  const l0 = () => { body.rotation.z = sin(st.step) * 0.05; };
  return st;
}

// ───────── 도마뱀 · 개구리 ─────────
function lizard(o) {
  const s = o.size, root = new THREE.Group(), C = plain(o.c), body = J(root, 0, s * 0.12, 0);
  const spine = M(body, tube([[0, 0, s * 0.55], [0, 0.01, s * 0.15], [0, 0, -s * 0.25], [0.02, -0.02, -s * 0.7], [-0.04, -0.04, -s * 1.2]], (t) => [s * 0.15 * pow(sin(PI * min(1, t * 1.4 + 0.12)), 0.6) * (t > 0.5 ? 1.6 - t * 1.2 : 1), s * 0.1 * pow(sin(PI * min(1, t * 1.4 + 0.12)), 0.6) * (t > 0.5 ? 1.6 - t * 1.2 : 1)], 28, 12), C);
  if (o.spikes) for (let i = 0; i < 8; i++) M(body, new THREE.ConeGeometry(s * 0.025, s * 0.08, 4), plain(o.spikes), undefined, 0, s * 0.1, s * 0.3 - i * s * 0.08);
  const head = J(body, 0, s * 0.02, s * 0.5); M(head, ell(s * 0.13, s * 0.08, s * 0.18), C, undefined, 0, 0, s * 0.08);
  if (o.beard) M(head, ell(s * 0.15, s * 0.07, s * 0.08), plain(o.beard), undefined, 0, -s * 0.05, s * 0.02);
  const eyes = [-1, 1].map((k) => eye(head, s * 0.03, k * s * 0.09, s * 0.04, s * 0.1, k * 1.0));
  const legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([x, z]) => { const l = J(body, x * s * 0.12, 0, z * s * 0.25); M(l, tube([[0, 0, 0], [x * s * 0.14, -s * 0.03, 0], [x * s * 0.18, -s * 0.12, s * 0.04]], () => s * 0.035, 6, 6), C); return { l, x, z }; });
  const ph = Math.random() * 9, st = { root, walk: 0, step: 0 };
  st.update = (t, dt) => { t += ph; st.step += dt * st.walk * 12; body.rotation.y = sin(st.step) * 0.18 * st.walk; legs.forEach(({ l, x, z }) => { l.rotation.y = sin(st.step + (x * z > 0 ? 0 : PI)) * 0.6 * st.walk; }); head.rotation.x = !st.walk && (t % 4) < 0.5 ? -0.3 : 0; const bl = (t % 3) < 0.1; eyes.forEach((e) => (e.scale.y = bl ? 0.1 : 1)); };
  return st;
}
function frog(o) {
  const s = o.size, root = new THREE.Group(), C = plain(o.c), hop = J(root), body = J(hop, 0, s * 0.35, 0);
  M(body, ell(s * 0.42, s * 0.3, s * 0.5), C); M(body, ell(s * 0.34, s * 0.2, s * 0.4), plain(o.belly || '#f2f0c8'), undefined, 0, -s * 0.12, s * 0.06); body.rotation.x = -0.35;
  const eyes = [-1, 1].map((k) => { M(body, ell(s * 0.13, s * 0.13, s * 0.13), C, undefined, k * s * 0.22, s * 0.26, s * 0.25); return eye(body, s * 0.1, k * s * 0.24, s * 0.3, s * 0.33, k * 0.4); });
  if (o.eyeC) eyes.forEach((e) => { e.children[0].material = plain(o.eyeC, { gloss: true }); });
  const legs = [-1, 1].map((k) => { const l = J(hop, k * s * 0.3, s * 0.15, -s * 0.2); M(l, ell(s * 0.12, s * 0.12, s * 0.3), C, undefined, 0, 0, 0); M(l, ell(s * 0.14, s * 0.03, s * 0.2), plain(o.foot || o.c), undefined, k * s * 0.05, -s * 0.12, s * 0.2); return l; });
  for (const k of [-1, 1]) M(hop, tube([[k * s * 0.25, s * 0.3, s * 0.3], [k * s * 0.3, s * 0.05, s * 0.4]], () => s * 0.06, 6, 6), C);
  const ph = Math.random() * 9, st = { root, walk: 0, step: 0 };
  st.update = (t, dt) => { t += ph; st.step += dt * st.walk * 6; const j = max(0, sin(st.step)) * st.walk; hop.position.y = j * s * 1.4; legs.forEach((l) => (l.rotation.x = j * 0.9)); body.scale.y = 1 + max(0, sin(t * 5)) * 0.06 * (1 - st.walk); const bl = (t % 3.3) < 0.1; eyes.forEach((e) => (e.scale.y = bl ? 0.1 : 1)); };
  return st;
}

// ───────── 바닷가 · 바다 친구 ─────────
function crab(o) {
  const s = o.size, root = new THREE.Group(), C = plain(o.c), body = J(root, 0, s * 0.3, 0);
  M(body, ell(s * 0.55, s * 0.22, s * 0.4), C);
  const eyes = [-1, 1].map((k) => { M(body, tube([[k * s * 0.15, s * 0.1, s * 0.3], [k * s * 0.17, s * 0.32, s * 0.33]], () => s * 0.025, 4, 6), C); return eye(body, s * 0.06, k * s * 0.17, s * 0.36, s * 0.34, k * 0.3); });
  const claws = [-1, 1].map((k) => { const c = J(body, k * s * 0.5, 0, s * 0.3); M(c, tube([[0, 0, 0], [k * s * 0.18, s * 0.05, s * 0.2]], () => s * 0.06, 6, 8), C); const p = J(c, k * s * 0.2, s * 0.06, s * 0.24); M(p, ell(s * 0.13, s * 0.1, s * 0.18), C); return p; });
  const legs = []; for (const k of [-1, 1]) for (let i = 0; i < 3; i++) { const l = J(body, k * s * 0.45, -s * 0.02, s * (0.12 - i * 0.18)); M(l, tube([[0, 0, 0], [k * s * 0.25, s * 0.08, 0], [k * s * 0.4, -s * 0.28, 0]], () => s * 0.03, 6, 6), C); legs.push(l); }
  const ph = Math.random() * 9, st = { root, walk: 0, step: 0, sideways: true };
  st.update = (t, dt) => { t += ph; st.step += dt * st.walk * 14; legs.forEach((l, i) => (l.rotation.z = sin(st.step + i) * 0.3 * st.walk)); claws.forEach((c, i) => (c.rotation.x = sin(t * 2 + i) * 0.2)); const bl = (t % 3) < 0.1; eyes.forEach((e) => (e.scale.y = bl ? 0.1 : 1)); };
  return st;
}
function starfish(o) {
  const s = o.size, root = new THREE.Group(), sh = new THREE.Shape();
  for (let i = 0; i <= 10; i++) { const a = i / 10 * PI * 2 + PI / 2, r = i % 2 ? s * 0.18 : s * 0.5; i ? sh.lineTo(cos(a) * r, sin(a) * r) : sh.moveTo(cos(a) * r, sin(a) * r); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: s * 0.06, bevelEnabled: true, bevelSize: s * 0.04, bevelThickness: s * 0.04, bevelSegments: 3 }); g.rotateX(-PI / 2);
  const m = M(root, g, plain(o.c), undefined, 0, s * 0.04, 0);
  for (let i = 0; i < 20; i++) { const a = i * 1.26, r = (i % 5) / 5 * s * 0.35 + s * 0.05; M(m, ell(s * 0.025, s * 0.025, s * 0.025, 6), plain(o.dot || '#fff0d8'), undefined, cos(a) * r, s * 0.11, -sin(a) * r); }
  const st = { root, walk: 0 }; st.update = (t) => { m.rotation.y = sin(t * 0.1) * 0.2; }; return st;
}
function octopus(o) {
  const s = o.size, root = new THREE.Group(), C = plain(o.c), body = J(root, 0, s * 0.5, 0);
  M(body, ell(s * 0.4, s * 0.48, s * 0.4), C, undefined, 0, s * 0.25, -s * 0.05);
  const eyes = [-1, 1].map((k) => eye(body, s * 0.08, k * s * 0.18, s * 0.08, s * 0.3, k * 0.5));
  const arms = []; for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2, arm = J(body, sin(a) * s * 0.2, -s * 0.1, cos(a) * s * 0.2); arm.rotation.y = a; M(arm, tube([[0, 0, 0], [0, -s * 0.25, s * 0.25], [0, -s * 0.42, s * 0.55], [0, -s * 0.38, s * 0.8]], (t) => s * 0.08 * (1 - 0.85 * t), 14, 8), C); arms.push(arm); }
  const ph = Math.random() * 9, st = { root, walk: 0 };
  st.update = (t) => { t += ph; arms.forEach((a, i) => (a.rotation.x = sin(t * 1.5 + i * 0.8) * 0.2)); body.position.y = s * 0.5 + sin(t * 1.2) * s * 0.06; const bl = (t % 3.5) < 0.1; eyes.forEach((e) => (e.scale.y = bl ? 0.1 : 1)); };
  return st;
}
// 물에 사는 몸 (혹등고래 · 바다표범 · 바다코끼리 · 해달): 길쭉한 몸 + 지느러미
function swimBody(o) {
  const s = o.size, root = new THREE.Group(), C = plain(o.c), body = J(root, 0, o.lie ? s * 0.18 : 0, 0);
  M(body, tube([[0, 0, -s * 0.9], [0, s * 0.04, -s * 0.4], [0, s * 0.06, s * 0.15], [0, s * 0.04, s * 0.55], [0, 0, s * 0.8]], (t) => { const k = pow(max(0.02, sin(PI * min(1, t * 0.85 + 0.12))), 0.7); return [s * 0.24 * k, s * 0.22 * k]; }, 26, 16), C);
  if (o.belly) M(body, ell(s * 0.2, s * 0.12, s * 0.6), plain(o.belly), undefined, 0, -s * 0.12, s * 0.1);
  const eyes = [-1, 1].map((k) => eye(body, s * 0.035, k * s * 0.16, s * 0.08, s * 0.62, k * 1.0));
  M(body, ell(s * 0.06, s * 0.05, s * 0.04, 10), plain('#2a2220'), undefined, 0, s * 0.03, s * 0.8);
  if (o.tusks) for (const k of [-1, 1]) M(body, tube([[k * s * 0.06, -s * 0.06, s * 0.74], [k * s * 0.07, -s * 0.3, s * 0.78]], (t) => s * 0.03 * (1 - 0.6 * t), 8, 6), plain('#f2ead8'));
  if (o.whiskers) M(body, ell(s * 0.14, s * 0.09, s * 0.08), plain(o.whiskers), undefined, 0, -s * 0.03, s * 0.74);
  const fins = [-1, 1].map((k) => { const f = J(body, k * s * 0.2, -s * 0.08, s * 0.35); M(f, ell(s * (o.bigFin ? 0.55 : 0.2), s * 0.03, s * 0.1), C, undefined, k * s * (o.bigFin ? 0.45 : 0.16), 0, 0); return f; });
  const fluke = J(body, 0, 0, -s * 0.88); M(fluke, ell(s * 0.32, s * 0.03, s * 0.12), C, undefined, 0, 0, -s * 0.06);
  if (o.otter) { body.rotation.x = 0; M(body, ell(s * 0.1, s * 0.1, s * 0.1), plain('#c8a07a'), undefined, 0, s * 0.18, s * 0.2); }
  const ph = Math.random() * 9, st = { root, walk: 0, step: 0 };
  st.update = (t, dt) => { t += ph; st.step += dt * (0.6 + st.walk * 3); fluke.rotation.x = sin(st.step * 2) * (o.lie ? 0.15 : 0.4); fins.forEach((f, i) => (f.rotation.z = (i ? 1 : -1) * sin(st.step * 2) * 0.25)); if (o.lie) body.rotation.x = -0.15 + sin(t * 0.8) * 0.05; const bl = (t % 4.2) < 0.1; eyes.forEach((e) => (e.scale.y = bl ? 0.1 : 1)); };
  return st;
}
function fishSchool(o) {
  const root = new THREE.Group(), fish = [];
  for (let i = 0; i < (o.n || 9); i++) {
    const f = J(root, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 1.6), c = o.cols[i % o.cols.length];
    M(f, ell(0.05, 0.11, 0.16), plain(c)); M(f, ell(0.01, 0.07, 0.06), plain(o.fin || '#fff2c8'), undefined, 0, 0, -0.17); M(f, ell(0.055, 0.03, 0.03), plain(o.stripe || '#ffffff'), undefined, 0, 0.0, 0.02);
    fish.push({ f, ph: Math.random() * 6, r: 0.4 + Math.random() * 0.6 });
  }
  const st = { root, walk: 0 };
  st.update = (t) => { fish.forEach(({ f, ph, r }) => { const a = t * 0.8 + ph; f.position.set(sin(a) * r, sin(t * 1.3 + ph) * 0.15, cos(a) * r); f.rotation.y = a + PI / 2; }); };
  return st;
}
// 나무늘보: 느릿느릿 기어요, 긴 팔 · 갈고리 발톱 · 눈 둘레 검은 띠
function sloth() {
  const root = new THREE.Group(), C = plain('#8a7a64'), body = J(root, 0, 0.32, 0);
  M(body, ell(0.24, 0.2, 0.36), C);
  const head = J(body, 0, 0.08, 0.36); M(head, ell(0.15, 0.14, 0.14), C); M(head, ell(0.12, 0.1, 0.06), plain('#e8dcc4'), undefined, 0, -0.01, 0.1);
  for (const k of [-1, 1]) M(head, ell(0.045, 0.025, 0.02, 10), plain('#3a2e28'), undefined, k * 0.05, 0.02, 0.15).rotation.z = k * 0.4;
  const eyes = [-1, 1].map((k) => eye(head, 0.016, k * 0.05, 0.02, 0.16, k * 0.3));
  M(head, ell(0.025, 0.02, 0.015, 8), plain('#2a2220'), undefined, 0, -0.02, 0.165);
  const limbs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([x, z]) => { const l = J(body, x * 0.18, -0.02, z * 0.22); M(l, tube([[0, 0, 0], [x * 0.12, -0.12, z * 0.05], [x * 0.16, -0.3, z * 0.08]], () => 0.045, 8, 8), C); for (let i = 0; i < 3; i++) M(l, new THREE.ConeGeometry(0.008, 0.06, 5), plain('#e8dcc4'), undefined, x * 0.16 + (i - 1) * 0.015, -0.33, z * 0.08 + 0.02).rotation.x = 0.8; return { l, x, z }; });
  const ph = Math.random() * 9, st = { root, walk: 0, step: 0 };
  st.update = (t, dt) => { t += ph; st.step += dt * st.walk * 2.2; limbs.forEach(({ l, x, z }) => (l.rotation.x = sin(st.step + (x * z > 0 ? 0 : PI)) * 0.35 * st.walk)); head.rotation.y = sin(t * 0.25) * 0.5; head.rotation.z = sin(t * 0.18) * 0.15; const bl = (t % 6) < 0.6; eyes.forEach((e) => (e.scale.y = bl ? 0.1 : 1)); };
  return st;
}
// 작은 원숭이 (다람쥐원숭이): 쪼그려 앉아 두리번, 긴 꼬리
function monkey() {
  const root = new THREE.Group(), C = plain('#c8a05a'), F = plain('#f2e6c8'), body = J(root, 0, 0.22, 0);
  M(body, ell(0.12, 0.16, 0.12), C); M(body, ell(0.09, 0.11, 0.06), F, undefined, 0, -0.02, 0.07);
  const head = J(body, 0, 0.2, 0.03); M(head, ell(0.1, 0.1, 0.1), plain('#5a4a3a')); M(head, ell(0.08, 0.08, 0.06), F, undefined, 0, -0.01, 0.06); M(head, ell(0.05, 0.035, 0.03), plain('#3a2e28'), undefined, 0, -0.04, 0.1);
  const eyes = [-1, 1].map((k) => eye(head, 0.017, k * 0.035, 0.015, 0.1, k * 0.3));
  for (const k of [-1, 1]) M(head, ell(0.03, 0.035, 0.015, 10), F, undefined, k * 0.1, 0, 0);
  const arms = [-1, 1].map((k) => { const a = J(body, k * 0.11, 0.08, 0.03); M(a, tube([[0, 0, 0], [k * 0.03, -0.1, 0.06], [k * 0.02, -0.18, 0.08]], () => 0.025, 8, 6), plain('#e8b84a')); return a; });
  for (const k of [-1, 1]) M(body, ell(0.05, 0.06, 0.09), C, undefined, k * 0.08, -0.14, 0.04);
  const tail = J(body, 0, -0.1, -0.1); M(tail, tube([[0, 0, 0], [0, -0.05, -0.2], [0, 0.1, -0.38], [0, 0.3, -0.36]], (t) => 0.022 * (1 - 0.5 * t), 16, 6), plain('#5a4a3a'));
  const ph = Math.random() * 9, hop = root, st = { root, walk: 0, step: 0 };
  st.update = (t, dt) => { t += ph; st.step += dt * st.walk * 10; body.position.y = 0.22 + abs(sin(st.step)) * 0.12 * st.walk; head.rotation.y = sin(t * 1.7) * 0.7; head.rotation.z = sin(t * 1.1) * 0.15; arms.forEach((a, i) => (a.rotation.x = -0.4 + sin(t * 2 + i * 2) * 0.4)); tail.rotation.z = sin(t * 1.2) * 0.3; const bl = (t % 3) < 0.1; eyes.forEach((e) => (e.scale.y = bl ? 0.1 : 1)); };
  return st;
}

// ───────── 종 목록에 더해요 (zoo3d.js 의 SPECIES 에 이름으로) ─────────
const BANDS = (c0, c1) => `vec3 c=C0; if(reg<0.5 && fract(T.x*9.0)<0.18) c=C1; if((reg<0.5||(reg>1.5&&reg<2.5)) && T.z<-0.4) c=C2; return c;`;
Object.assign(SPECIES, {
  // 🏘 마을
  cat: Q('cat', ['#e0a060', '#f6efe2', '#c87a3a'], 0.46, 0.26, { neckA: 1.05, neckL: 0.06, headA: 0.15, headL: 0.12, headR: 0.06, earW: 0.035, earL: 0.05, earOut: 0.25, earIn: '#f2b8b0', tailL: 0.34, tailA: 1.5, legR: 0.018, hoof: 0.02, hoofC: '#f6efe2', graze: 0 }, `vec3 c=C0; if(reg<0.5 && fract(T.x*7.0)<0.3 && T.z>-0.2) c=C2; if(reg>3.5&&reg<4.5&&fract(T.x*8.0)<0.35) c=C2; if((reg<0.5||(reg>1.5&&reg<2.5))&&T.z<-0.35) c=C1; return c;`),
  dog: Q('dog', ['#c89a5a', '#f2e6cc', '#8a6438'], 0.7, 0.46, { neckA: 0.75, neckL: 0.14, headA: 0.4, headL: 0.22, headR: 0.08, earW: 0.05, earL: 0.09, earOut: 2.4, earIn: '#8a6438', tailL: 0.26, tailA: 1.3, legR: 0.026, hoof: 0.03, hoofC: '#f2e6cc', graze: 0.4 }),
  rabbit: () => critter({ L: 0.3, c: '#d8ccbc', belly: '#f6f0e6', ears: 'long', tail: 'puff' }),
  hen: () => bird({ size: 0.32, legL: 0.1, c: '#b8683a', belly: '#d8925a', wing: '#8a4a2a', beak: 'cone', beakC: '#e8b84a', comb: '#d84a3a', wattle: '#d84a3a', neckL: 0.08, neckC: '#d88a4a', headC: '#d88a4a', peck: true, tail: 'up', tailC: '#2a3a2a', tailC2: '#5a2a1a', bh: 1.1, legC: '#e8b84a' }),
  duck: () => bird({ size: 0.3, legL: 0.05, c: '#f6f4ee', wing: '#ece8dc', beak: 'duck', beakC: '#f0a03a', neckL: 0.12, neckR: 0.13, waddle: true, tail: 'short', legR: 0.04, bl: 1.35, bh: 0.8, bw: 1.05 }),
  squirrel: () => critter({ L: 0.22, c: '#b8683a', belly: '#f2e2c8', ears: 'pointy', tail: 'bushy', feet: '#9a5430' }),
  hedgehog: () => critter({ L: 0.24, c: '#c8a888', belly: '#e8d8c0', ears: 'round', tail: 'none', spikes: '#6a5440', bigEye: 0.8, gait: 'scurry', feet: '#a88a70', snout: true }),
  sheep: Q('sheep', ['#f2eee4', '#e8e2d4', '#3a3230'], 1.0, 0.72, { bodyH: 0.52, neckA: 0.95, neckL: 0.16, headA: 0.55, headL: 0.24, headR: 0.09, earW: 0.05, earL: 0.08, earOut: 1.7, earIn: '#5a4a44', tailL: 0.12, legR: 0.03, hoof: 0.05, graze: 1.0 }, `vec3 c=C0; if(reg>0.5&&reg<1.5&&R.y<0.38) c=C2; if(reg>2.5&&reg<3.5&&T.x>0.06) c=C2; return c;`),
  goat: Q('goat', ['#f2ece0', '#e0d8c8', '#5a4a3a'], 0.9, 0.68, { neckA: 0.6, neckL: 0.24, headA: 0.6, headL: 0.24, headR: 0.07, earOut: 1.4, legR: 0.026, hoof: 0.05, graze: 1.1,
    horn: horns('#8a7a64', (s, r) => [[s * r * 0.35, r * 0.75, -r * 0.2], [s * r * 0.6, r * 1.8, -r * 1.0], [s * r * 0.7, r * 2.0, -r * 2.0]]) }),
  sparrow: () => bird({ size: 0.12, legL: 0.03, c: '#8a6a4a', belly: '#e8dcc4', wing: '#6a4e34', beak: 'cone', beakC: '#4a3a2e', neckL: 0.02, peck: true, legC: '#c8a07a', legR: 0.05 }),
  // 🦁 초원 (더하기)
  meerkat: () => critter({ L: 0.22, c: '#d8b888', belly: '#f2e2c4', ears: 'round', tail: 'thin', up: true, tailC: '#3a2e28' }),
  ostrich: () => bird({ size: 0.9, legL: 1.0, c: '#2e2a2a', wing: '#f2ece0', tail: 'short', tailC: '#f6f0e6', neckL: 0.8, neckR: 0.06, neckC: '#e8c8b8', headC: '#e8c8b8', headR: 0.14, beak: 'cone', beakC: '#c8a07a', legC: '#e8b8a8', legR: 0.06, peck: true }),
  warthog: Q('warthog', ['#8a7464', '#9a8474', '#3a3230'], 1.0, 0.62, { neckA: 1.2, neckL: 0.1, headA: 0.75, headL: 0.36, headR: 0.12, earOut: 1.2, mane: 0.08, tailL: 0.34, tailA: 1.6, tuft: 0.05, graze: 0.7,
    horn: horns('#f2ead8', (s, r, l) => [[s * r * 0.55, -r * 0.3, l * 0.7], [s * r * 1.0, r * 0.2, l * 0.8], [s * r * 0.8, r * 0.8, l * 0.75]]) }),
  tortoise: () => turtle({ size: 0.5, shell: '#8a6a3a', plate: '#a8884a', skin: '#a89a7a' }),
  flamingo: () => bird({ size: 0.42, legL: 0.75, c: '#f6a8a8', wing: '#ee8890', tail: 'short', neckL: 0.55, neckR: 0.07, sNeck: true, headR: 0.2, beak: 'bend', beakC: '#2a2222', legC: '#e88a8a', legR: 0.035 }),
  // 🌴 정글 (고릴라는 빼고)
  sloth: sloth,
  parrot: () => bird({ size: 0.24, legL: 0.05, c: '#d83a2e', wing: '#2e6ad8', tail: 'long', tailC: '#e8b83a', neckL: 0.04, beak: 'parrot', face: '#f6f0e6', legC: '#5a5a5a' }),
  toucan: () => bird({ size: 0.28, legL: 0.05, c: '#1e1c1e', belly: '#f6e6a0', beak: 'big', beakC: '#f29a2a', neckL: 0.04, headR: 0.22, tail: 'long', tailC: '#1e1c1e', legC: '#4a6ab0' }),
  monkey: monkey,
  capybara: Q('capybara', ['#a8784a', '#b88a5a', '#6a4a30'], 1.0, 0.5, { bodyH: 0.48, neckA: 1.1, neckL: 0.1, headA: 0.45, headL: 0.34, headR: 0.12, earW: 0.035, earL: 0.04, earOut: 0.9, tailL: 0.02, legR: 0.04, hoof: 0.04, graze: 0.6 }),
  treefrog: () => frog({ size: 0.12, c: '#4ac84a', belly: '#f2f0c8', eyeC: '#d83a2e', foot: '#f29a3a' }),
  redpanda: Q('redpanda', ['#c8582a', '#2a1e1a', '#f2e6d8'], 0.55, 0.3, { neckA: 1.0, neckL: 0.08, headA: 0.2, headL: 0.14, headR: 0.09, earW: 0.04, earL: 0.05, earOut: 0.6, earIn: '#f2e6d8', tailL: 0.45, tailR: 0.07, tailA: 2.6, legR: 0.025, hoofC: '#2a1e1a', graze: 0 }, `vec3 c=C0; if(reg>0.5&&reg<1.5) c=C1; if((reg<0.5)&&T.z<-0.3) c=C1; if(reg>3.5&&reg<4.5&&fract(T.x*7.0)<0.4) c=vec3(0.86,0.6,0.4); if(reg>2.5&&reg<3.5&&T.z<-0.2) c=C2; return c;`),
  peacock: () => bird({ size: 0.4, legL: 0.3, c: '#2a5ab0', wing: '#8a7a54', neckL: 0.3, neckR: 0.08, neckC: '#2a6ad0', headR: 0.15, crest: '#2a6ad0', tail: 'fan', beak: 'cone', beakC: '#8a7a64', legC: '#8a7a64' }),
  okapi: Q('okapi', ['#4a2e28', '#f2ece0', '#2a1c18'], 1.5, 1.45, { neckA: 0.55, neckL: 0.55, neckR: [0.17, 0.1], headA: 0.65, headL: 0.4, headR: 0.1, earW: 0.07, earL: 0.15, earOut: 0.8, tailL: 0.5, tuft: 0.06, legR: 0.045, graze: 0.5 }, `vec3 c=C0; if(reg>0.5&&reg<1.5&&R.y<1.0&&fract(R.y*9.0)<0.5) c=C1; if(reg<0.5&&R.z<-0.35&&fract(R.y*12.0)<0.45) c=C1; if(reg>2.5&&reg<3.5&&T.x>0.22) c=vec3(0.86,0.8,0.72); return c;`),
  // 🏜️ 사막 (더하기)
  dorcas: () => SPECIES.gazelle(),
  lizard: () => lizard({ size: 0.34, c: '#c8a46a', beard: '#a8844a', spikes: '#a8844a' }),
  gerbil: () => critter({ L: 0.14, c: '#d8b07a', belly: '#f6efe2', ears: 'round', tail: 'thin', bigEye: 1.4 }),
  armadillo: () => critter({ L: 0.4, c: '#a8987a', belly: '#d8c8a8', ears: 'pointy', tail: 'thin', bands: '#8a7a5a', bigEye: 0.6, gait: 'scurry', snout: true }),
  oryx: Q('oryx', ['#e8dcc8', '#f6f2ea', '#2a2422'], 1.5, 1.15, { neckA: 0.6, neckL: 0.42, headA: 0.6, headL: 0.36, headR: 0.09, earOut: 0.9, legR: 0.04, tailL: 0.5, tuft: 0.08, graze: 1.0,
    horn: horns('#3a3230', (s, r) => [[s * r * 0.3, r * 0.8, -r * 0.2], [s * r * 0.45, r * 3.5, -r * 3.2], [s * r * 0.55, r * 6.0, -r * 6.0]]) }, `vec3 c=C0; if(reg>2.5&&reg<3.5&&abs(T.y)>0.5&&T.z>-0.2) c=C2; if(reg<0.5&&abs(T.z+0.1)<0.12) c=C2; if(reg>0.5&&reg<1.5&&R.y>0.45&&R.y<0.6) c=C2; return c;`),
  deserttortoise: () => turtle({ size: 0.42, shell: '#a8844a', plate: '#c8a46a', skin: '#b89a6a' }),
  roadrunner: () => bird({ size: 0.26, legL: 0.2, c: '#6a5a44', belly: '#e8dcc4', wing: '#4a3e30', tail: 'long', tailC: '#3a3028', neckL: 0.1, crest: '#3a3028', beak: 'cone', beakC: '#3a3028', legC: '#6a8aa8' }),
  ibex: Q('ibex', ['#a88a64', '#e8dcc4', '#4a3a2e'], 1.2, 0.85, { neckA: 0.6, neckL: 0.3, headA: 0.6, headL: 0.28, headR: 0.08, earOut: 1.2, legR: 0.04, tailL: 0.12, graze: 0.9,
    horn: horns('#6a5a44', (s, r) => [[s * r * 0.35, r * 0.8, -r * 0.2], [s * r * 0.55, r * 3.0, -r * 2.5], [s * r * 0.65, r * 3.4, -r * 5.0], [s * r * 0.6, r * 1.6, -r * 6.4]]) }),
  // 🐧 북극 (북극곰은 빼고)
  arcticfox: Q('arcticfox', ['#f6f4f0', '#ffffff', '#2a2422'], 0.55, 0.3, { neckA: 0.95, neckL: 0.08, headA: 0.3, headL: 0.15, headR: 0.07, earW: 0.035, earL: 0.05, earOut: 0.35, earIn: '#e8dcd8', tailL: 0.38, tailR: 0.07, tailA: 2.4, legR: 0.022, hoofC: '#f6f4f0', graze: 0.2 }),
  seal: () => swimBody({ size: 1.0, c: '#8a8a8a', belly: '#b8b8b0', lie: true, whiskers: '#a8a8a0' }),
  arctichare: () => critter({ L: 0.34, c: '#f6f6f2', belly: '#ffffff', ears: 'long', tail: 'puff', earIn: '#e8d8d8' }),
  reindeer: Q('reindeer', ['#8a7a64', '#e8e0d0', '#f2ece0'], 1.5, 1.05, { neckA: 0.7, neckL: 0.36, mane: 0.07, headA: 0.6, headL: 0.36, headR: 0.1, earOut: 1.0, legR: 0.045, tailL: 0.12, graze: 0.9,
    horn: (h, r) => { const A = plain('#c8b494'); for (const s of [-1, 1]) { M(h, tube([[s * r * 0.3, r * 0.8, -r * 0.2], [s * r * 1.2, r * 3.0, -r * 1.5], [s * r * 1.4, r * 5.2, -r * 0.8], [s * r * 1.0, r * 6.6, r * 0.6]], (t) => r * 0.11 * (1 - 0.5 * t), 16, 6), A); for (const k of [0.35, 0.6, 0.85]) M(h, tube([[s * r * (1.2 + k * 0.2), r * (2.6 + k * 3.4), -r * (1.5 - k * 1.6)], [s * r * (1.7 + k * 0.3), r * (3.6 + k * 3.4), -r * (0.5 - k * 1.6)]], () => r * 0.06, 6, 5), A); } } }),
  snowyowl: () => bird({ size: 0.36, legL: 0.03, c: '#f6f6f2', wing: '#eceae2', neckL: 0.02, headR: 0.3, beak: 'hook', beakC: '#3a3232', tufts: false, legC: '#f6f6f2', legR: 0.06 }),
  walrus: () => swimBody({ size: 1.4, c: '#a8846a', lie: true, tusks: true, whiskers: '#c8a88a' }),
  muskox: Q('muskox', ['#4a3a30', '#3a2e26', '#e8dcc4'], 1.6, 1.15, { bodyH: 0.8, neckA: 1.2, neckL: 0.18, mane: 0.16, headA: 0.9, headL: 0.36, headR: 0.15, earW: 0.03, earL: 0.04, legR: 0.07, hoof: 0.06, tailL: 0.06, graze: 0.7,
    horn: horns('#d8ccb4', (s, r) => [[s * r * 0.2, r * 1.0, 0], [s * r * 1.3, r * 0.9, 0], [s * r * 1.6, -r * 0.4, r * 0.2], [s * r * 1.4, -r * 0.6, r * 1.0]]) }, `vec3 c=C0; if(reg>0.5&&reg<1.5&&R.y<0.22) c=C2; if(reg<0.5&&T.z<-0.3) c=C1; return c;`),
  lemming: () => critter({ L: 0.13, c: '#c89a6a', belly: '#f2e6d0', ears: 'none', tail: 'none', gait: 'scurry' }),
  puffin: () => bird({ size: 0.22, legL: 0.05, c: '#1e1c20', belly: '#ffffff', face: '#f6f6f2', beak: 'puffin', beakC: '#f0702a', neckL: 0.03, waddle: true, legC: '#f0702a', legR: 0.05 }),
  // 🌊 바다 · 바닷가
  seaturtle: () => turtle({ size: 0.8, shell: '#6a7a4a', plate: '#8a9a5a', skin: '#8a9a7a', sea: true }),
  whale: () => swimBody({ size: 6.0, c: '#3a4a5a', belly: '#d8dcdc', bigFin: true }),
  seaotter: () => swimBody({ size: 0.6, c: '#6a4a34', lie: false, otter: true, whiskers: '#c8a07a' }),
  seagull: () => bird({ size: 0.26, legL: 0.08, c: '#f6f6f2', wing: '#a8b0b8', tail: 'short', tailC: '#2a2a2a', neckL: 0.04, beak: 'cone', beakC: '#f2c83a', legC: '#f2b84a', peck: true }),
  pelican: () => bird({ size: 0.55, legL: 0.25, c: '#f2f0ea', wing: '#a8a8a0', neckL: 0.3, neckR: 0.08, sNeck: true, headR: 0.16, beak: 'pouch', beakC: '#f2b84a', pouchC: '#f2c88a', legC: '#e8a03a', waddle: true }),
  crab: () => crab({ size: 0.2, c: '#d8582e' }),
  starfish: () => starfish({ size: 0.24, c: '#f28a3a' }),
  fish: () => fishSchool({ cols: ['#f2a23a', '#3a9ae8', '#f2e24a', '#e85a8a'], n: 10 }),
  octopus: () => octopus({ size: 0.4, c: '#d86a5a' }),
});

// 도감 · 배치 목록: [구역, id, 이름, 무리 수, 무리당 마리, 크기, 움직임(walk · swim · still · shore), 빠르기]
export const ROSTER = [
  ['village', 'cat', '고양이', 2, 2, 1, 'walk', 0.9], ['village', 'dog', '강아지', 2, 2, 1, 'walk', 1.6], ['village', 'rabbit', '토끼', 2, 3, 1, 'walk', 1.4],
  ['village', 'hen', '닭', 1, 4, 1, 'walk', 0.8], ['village', 'duck', '오리', 1, 4, 1, 'walk', 0.7], ['village', 'squirrel', '다람쥐', 2, 2, 1, 'walk', 1.5],
  ['village', 'hedgehog', '고슴도치', 2, 1, 1, 'walk', 0.5], ['village', 'sheep', '양', 1, 4, 1, 'walk', 0.8], ['village', 'goat', '염소', 1, 3, 1, 'walk', 0.9], ['village', 'sparrow', '참새', 2, 4, 1, 'walk', 1.2],
  ['savanna', 'elephant', '아기 코끼리', 3, 3, 1.15, 'walk', 1.0], ['savanna', 'giraffe', '아기 기린', 3, 2, 1.25, 'walk', 1.3], ['savanna', 'zebra', '얼룩말', 3, 4, 1, 'walk', 1.5],
  ['savanna', 'gazelle', '톰슨가젤', 3, 4, 1, 'walk', 1.7], ['savanna', 'gnu', '누', 3, 3, 1, 'walk', 1.4], ['savanna', 'meerkat', '미어캣', 3, 4, 1, 'walk', 1.3],
  ['savanna', 'ostrich', '타조', 2, 2, 1, 'walk', 1.8], ['savanna', 'warthog', '혹멧돼지', 2, 3, 1, 'walk', 1.2], ['savanna', 'tortoise', '육지거북', 2, 2, 1, 'walk', 0.25], ['savanna', 'flamingo', '홍학', 2, 4, 1, 'walk', 0.8],
  ['jungle', 'tapir', '맥', 3, 2, 1, 'walk', 1.1], ['jungle', 'sloth', '나무늘보', 2, 1, 1, 'walk', 0.15], ['jungle', 'parrot', '앵무새', 2, 3, 1, 'walk', 0.9],
  ['jungle', 'toucan', '큰부리새', 2, 2, 1, 'walk', 0.9], ['jungle', 'monkey', '다람쥐원숭이', 2, 3, 1, 'walk', 1.6], ['jungle', 'capybara', '카피바라', 2, 3, 1, 'walk', 0.8],
  ['jungle', 'treefrog', '청개구리', 2, 3, 1, 'walk', 0.8], ['jungle', 'redpanda', '레서판다', 2, 2, 1, 'walk', 1.0], ['jungle', 'peacock', '공작', 2, 2, 1, 'walk', 0.8], ['jungle', 'okapi', '오카피', 2, 2, 1, 'walk', 1.2],
  ['desert', 'camel', '낙타', 3, 3, 1, 'walk', 1.3], ['desert', 'fennec', '사막여우', 3, 2, 1.3, 'walk', 1.6], ['desert', 'lizard', '턱수염도마뱀', 2, 2, 1, 'walk', 1.0],
  ['desert', 'gerbil', '날쥐', 2, 3, 1, 'walk', 1.4], ['desert', 'armadillo', '아르마딜로', 2, 2, 1, 'walk', 0.8], ['desert', 'oryx', '오릭스', 2, 3, 1, 'walk', 1.5],
  ['desert', 'deserttortoise', '사막거북', 2, 2, 1, 'walk', 0.2], ['desert', 'roadrunner', '로드러너', 2, 2, 1, 'walk', 2.4], ['desert', 'ibex', '아이벡스', 2, 3, 1, 'walk', 1.2], ['desert', 'dorcas', '도르카스가젤', 2, 3, 0.9, 'walk', 1.7],
  ['arctic', 'penguin', '펭귄', 3, 5, 1.2, 'walk', 0.5], ['arctic', 'arcticfox', '북극여우', 2, 2, 1, 'walk', 1.5], ['arctic', 'seal', '바다표범', 2, 2, 1, 'still', 0.3],
  ['arctic', 'arctichare', '북극토끼', 2, 2, 1, 'walk', 1.5], ['arctic', 'reindeer', '순록', 2, 3, 1, 'walk', 1.2], ['arctic', 'snowyowl', '흰올빼미', 2, 1, 1, 'still', 0],
  ['arctic', 'walrus', '바다코끼리', 1, 2, 1, 'still', 0.2], ['arctic', 'muskox', '사향소', 2, 2, 1, 'walk', 0.9], ['arctic', 'lemming', '레밍', 2, 3, 1, 'walk', 1.2], ['arctic', 'puffin', '퍼핀', 2, 3, 1, 'walk', 0.6],
  ['sea', 'dolphin', '돌고래', 2, 3, 1.15, 'jump', 0], ['sea', 'seaturtle', '바다거북', 2, 2, 1, 'swim', 0.8], ['sea', 'whale', '혹등고래', 1, 1, 1, 'swim', 1.2],
  ['sea', 'seaotter', '해달', 2, 2, 1, 'swim', 0.4], ['sea', 'seagull', '갈매기', 2, 3, 1, 'shore', 1.0], ['sea', 'pelican', '펠리컨', 2, 2, 1, 'shore', 0.7],
  ['sea', 'crab', '꽃게', 2, 3, 1, 'shore', 0.8], ['sea', 'starfish', '불가사리', 2, 3, 1, 'shore', 0], ['sea', 'fish', '열대어 떼', 3, 1, 1, 'swim', 0.9], ['sea', 'octopus', '문어', 2, 1, 1, 'swim', 0.3],
].filter((r) => r[3] > 0);

// ───────── 🌙 밤 친구: 해가 지면 나와요 (박쥐 · 반딧불이는 하늘을 날아요) ─────────
function bat() {
  const root = new THREE.Group(), C = plain('#3a2e34'), body = J(root);
  M(body, ell(0.07, 0.07, 0.11), C); M(body, ell(0.055, 0.05, 0.05), C, undefined, 0, 0.03, 0.09);
  for (const k of [-1, 1]) M(body, new THREE.ConeGeometry(0.018, 0.05, 4), C, undefined, k * 0.025, 0.08, 0.09);
  const eyes = [-1, 1].map((k) => eye(body, 0.012, k * 0.022, 0.04, 0.13, k * 0.4));
  const wings = [-1, 1].map((k) => { const w = J(body, k * 0.05, 0.01, 0); const sh = new THREE.Shape(); sh.moveTo(0, 0.05); sh.quadraticCurveTo(0.12, 0.09, 0.26, 0.03); sh.lineTo(0.2, -0.02); sh.lineTo(0.15, 0.0); sh.lineTo(0.1, -0.04); sh.lineTo(0.05, -0.01); sh.lineTo(0, -0.06); const m = M(w, new THREE.ShapeGeometry(sh), plain('#4a3a42', { side: THREE.DoubleSide })); m.rotation.x = -PI / 2; m.scale.x = k; return w; });
  const st = { root, walk: 0 }; st.update = (t) => { const f = sin(t * 18) * 0.9; wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * f)); body.position.y = sin(t * 18) * 0.015; };
  return st;
}
function fireflies() {
  const root = new THREE.Group(), N = 16, pos = new Float32Array(N * 3), ph = [], c = document.createElement('canvas'); c.width = c.height = 64;
  { const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,200,1)'); g.addColorStop(0.3, 'rgba(220,255,120,.75)'); g.addColorStop(1, 'rgba(180,255,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
  const dots = []; for (let i = 0; i < N; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color: '#e8ff9a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.scale.setScalar(0.22); root.add(sp); dots.push({ sp, a: Math.random() * 6, r: 0.6 + Math.random() * 1.8, h: 0.4 + Math.random() * 1.4, s: 0.3 + Math.random() * 0.5 }); }
  const st = { root, walk: 0 };
  st.update = (t) => { dots.forEach((d) => { const a = d.a + t * d.s; d.sp.position.set(sin(a) * d.r, d.h + sin(t * 0.9 + d.a) * 0.25, cos(a * 1.3) * d.r); d.sp.material.opacity = 0.25 + 0.75 * max(0, sin(t * 2.3 + d.a * 3)); }); };
  return st;
}
Object.assign(SPECIES, {
  owl: () => bird({ size: 0.34, legL: 0.03, c: '#8a6a4a', belly: '#d8c4a4', wing: '#6a4e34', neckL: 0.02, headR: 0.3, beak: 'hook', beakC: '#3a3232', tufts: true, face: '#e8d8bc', legC: '#c8a87a', legR: 0.06 }),
  raccoon: Q('raccoon', ['#8a8a88', '#d8d4cc', '#2a2626'], 0.6, 0.32, { neckA: 1.0, neckL: 0.08, headA: 0.25, headL: 0.16, headR: 0.08, earW: 0.035, earL: 0.04, earOut: 0.5, earIn: '#f2ece4', tailL: 0.36, tailR: 0.06, tailA: 1.9, legR: 0.024, hoofC: '#2a2626', graze: 0.3 },
    `vec3 c=C0; if((reg<0.5||(reg>1.5&&reg<2.5))&&T.z<-0.35) c=C1; if(reg>2.5&&reg<3.5&&abs(T.y)>0.45&&T.z>-0.1&&T.x>0.05&&T.x<0.13) c=C2; if(reg>2.5&&reg<3.5&&T.x>0.15) c=C1; if(reg>3.5&&reg<4.5&&fract(T.x*7.0)<0.45) c=C2; if(reg>0.5&&reg<1.5&&R.y<0.08) c=C2; return c;`),
  bat, firefly: fireflies,
});
// 🏝 갈라파고스 섬 식구 (isle) · 섬 바닷가 식구 (islesea). 마을 바닷가(sea) 식구와 겹치지 않아요
Object.assign(SPECIES, {
  galtortoise: () => turtle({ size: 0.95, shell: '#4a4a3a', plate: '#6a6a4a', skin: '#7a7a62' }),
  landiguana: () => lizard({ size: 0.6, c: '#c8a03a', spikes: '#8a6a2a' }),
  lavalizard: () => lizard({ size: 0.2, c: '#5a5048' }),
  finch: () => bird({ size: 0.11, legL: 0.03, c: '#3a3430', belly: '#6a5a4a', wing: '#2a2622', beak: 'cone', beakC: '#2a2622', neckL: 0.02, peck: true, legC: '#3a3430', legR: 0.05 }),
  mockingbird: () => bird({ size: 0.16, legL: 0.05, c: '#8a7a68', belly: '#e8e0d0', wing: '#5a4e42', beak: 'cone', beakC: '#2a2622', neckL: 0.03, peck: true, legC: '#3a3430' }),
  galdove: () => bird({ size: 0.17, legL: 0.04, c: '#a87a5a', belly: '#c89a7a', wing: '#7a5a42', beak: 'cone', beakC: '#3a3a3a', neckL: 0.03, peck: true, legC: '#c85a4a' }),
  bluefoot: () => bird({ size: 0.3, legL: 0.1, c: '#f2ece0', wing: '#6a5444', neckL: 0.06, beak: 'cone', beakC: '#5a7a8a', legC: '#2a8ae8', peck: true }),
  frigate: () => bird({ size: 0.34, legL: 0.05, c: '#26262c', belly: '#d8342e', wing: '#1a1a20', neckL: 0.06, beak: 'hook', beakC: '#5a5a62', legC: '#2a2a30' }),
  marineiguana: () => lizard({ size: 0.5, c: '#2e2e32', spikes: '#6a6a60' }),
  sealion: () => swimBody({ size: 0.9, c: '#7a5e48', belly: '#a88a6a', lie: true, whiskers: '#c8b090' }),
  galpenguin: () => SPECIES.penguin(),
  redcrab: () => crab({ size: 0.18, c: '#e83a2a' }),
  cushionstar: () => starfish({ size: 0.26, c: '#e8a23a' }),
  greenturtle: () => turtle({ size: 0.85, shell: '#3a5a3a', plate: '#5a7a4a', skin: '#6a8a6a', sea: true }),
  parrotfish: () => fishSchool({ cols: ['#3ac8a8', '#3a8ae8', '#e85a9a'], n: 7, fin: '#f2e24a' }),
  butterflyfish: () => fishSchool({ cols: ['#f2d23a', '#f6f2e4'], n: 10, stripe: '#2a2a2a' }),
  pufferfish: () => swimBody({ size: 0.3, c: '#d8b84a', belly: '#f6f2e0' }),
  sunfish: () => swimBody({ size: 0.9, c: '#8a9aa8', belly: '#d8dce0', bigFin: true }),
});
ROSTER.push(
  ['isle', 'galtortoise', '갈라파고스땅거북', 3, 2, 1, 'walk', 0.2], ['isle', 'landiguana', '육지이구아나', 3, 2, 1, 'walk', 0.5], ['isle', 'lavalizard', '용암도마뱀', 3, 3, 1, 'walk', 0.9], ['isle', 'finch', '다윈핀치', 3, 3, 1, 'walk', 1.0],
  ['isle', 'mockingbird', '흉내지빠귀', 2, 2, 1, 'walk', 0.9], ['isle', 'galdove', '갈라파고스비둘기', 2, 2, 1, 'walk', 0.7], ['isle', 'bluefoot', '푸른발부비새', 3, 3, 1, 'walk', 0.5], ['isle', 'frigate', '군함조', 2, 2, 1, 'still', 0],
  ['islesea', 'marineiguana', '바다이구아나', 3, 3, 1, 'shore', 0.4], ['islesea', 'sealion', '바다사자', 3, 2, 1, 'shore', 0.3], ['islesea', 'galpenguin', '갈라파고스펭귄', 2, 3, 0.7, 'shore', 0.5], ['islesea', 'redcrab', '붉은바위게', 3, 3, 1, 'shore', 0.8],
  ['islesea', 'cushionstar', '쿠션불가사리', 2, 2, 1, 'shore', 0], ['islesea', 'greenturtle', '초록바다거북', 3, 1, 1, 'swim', 0.7], ['islesea', 'parrotfish', '앵무고기 떼', 3, 1, 1, 'swim', 0.8], ['islesea', 'butterflyfish', '나비고기 떼', 3, 1, 1, 'swim', 0.8],
  ['islesea', 'pufferfish', '복어', 2, 2, 1, 'swim', 0.5], ['islesea', 'sunfish', '개복치', 2, 1, 1, 'swim', 0.4],
);
// 🐟 강 · 민물 식구 (river): 강물 속(swim) · 강가(bank). 바다 물고기와 다른 민물 물고기예요
Object.assign(SPECIES, {
  medaka: () => fishSchool({ cols: ['#c8ccc0', '#b8beb2'], n: 12, fin: '#e8ecdc', stripe: '#8a9a8a' }),
  minnow: () => fishSchool({ cols: ['#b8c4c8', '#c8d0d0'], n: 9, fin: '#f2b8b0', stripe: '#e87a7a' }),
  crucian: () => swimBody({ size: 0.28, c: '#9a8a4a', belly: '#d8c88a' }),
  koi: () => swimBody({ size: 0.4, c: '#e8743a', belly: '#fbf2e4' }),
  catfish: () => swimBody({ size: 0.45, c: '#4a4a40', belly: '#8a8a78', whiskers: '#3a3a30' }),
  pondturtle: () => turtle({ size: 0.32, shell: '#4a4a32', plate: '#6a6a42', skin: '#5a6a4a', sea: true }),
  otter: () => swimBody({ size: 0.5, c: '#5a4030', lie: false, otter: true, whiskers: '#b8906a' }),
  egret: () => bird({ size: 0.3, legL: 0.3, c: '#fbfaf4', wing: '#ecebe2', neckL: 0.16, beak: 'cone', beakC: '#e8b83a', legC: '#2a2a2a', peck: true }),
  kingfisher: () => bird({ size: 0.13, legL: 0.03, c: '#2a8ac8', belly: '#e8843a', wing: '#1a6aa8', beak: 'cone', beakC: '#2a2622', neckL: 0.02, legC: '#e85a3a', legR: 0.05 }),
  crayfish: () => crab({ size: 0.16, c: '#8a4a32' }),
  lavagull: () => bird({ size: 0.22, legL: 0.07, c: '#5a5a60', belly: '#8a8a90', wing: '#3a3a40', beak: 'cone', beakC: '#2a2a2a', neckL: 0.04, peck: true, legC: '#2a2a2a' }),
  cormorant: () => bird({ size: 0.34, legL: 0.07, c: '#2e2a26', belly: '#4a4238', wing: '#1e1a18', neckL: 0.12, beak: 'hook', beakC: '#5a5048', legC: '#2a2622', peck: true }),
});
ROSTER.push(
  ['river', 'medaka', '송사리 떼', 2, 1, 1, 'swim', 0.7], ['river', 'minnow', '피라미 떼', 2, 1, 1, 'swim', 0.9], ['river', 'crucian', '붕어', 2, 2, 1, 'swim', 0.6], ['river', 'koi', '비단잉어', 2, 2, 1, 'swim', 0.5],
  ['river', 'catfish', '메기', 2, 1, 1, 'swim', 0.3], ['river', 'pondturtle', '남생이', 2, 2, 1, 'swim', 0.3], ['river', 'otter', '수달', 2, 2, 1, 'swim', 0.8],
  ['river', 'egret', '백로', 2, 2, 1, 'bank', 0.5], ['river', 'kingfisher', '물총새', 2, 2, 1, 'bank', 0], ['river', 'crayfish', '가재', 2, 3, 1, 'bank', 0.5],
  ['isle', 'lavagull', '용암갈매기', 2, 2, 1, 'walk', 0.8], ['isle', 'cormorant', '갈라파고스가마우지', 2, 2, 1, 'walk', 0.4],
);
// 밤에만 나오는 친구 (구역 · id · 이름 · 무리 · 마리 · 크기 · 움직임 · 빠르기 · 밤): fly = 하늘을 빙빙
ROSTER.push(
  ['village', 'owl', '부엉이', 2, 1, 1, 'still', 0, true], ['village', 'raccoon', '너구리', 2, 2, 1, 'walk', 1.0, true],
  ['jungle', 'bat', '박쥐', 2, 3, 1, 'fly', 2.5, true], ['savanna', 'firefly', '반딧불이', 4, 1, 1, 'fly', 0.4, true],
);

