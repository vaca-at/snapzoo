// 주인공 · 친구 사람 (2026-11-05 결정): 사람 시안 A(극장판 자연형) · B(꼬마 2.5등신) 를 섞어 체형 셋.
//  체형 1 = 키 큰(극장판) · 2 = 보통 · 3 = 꼬마(가장 작음, 처음 시작). 번호는 꾸미기 화면 순서예요. 성별 · 옷(LOOKS) · 모자(HATS) 는 꾸미기에서.
// 돌려주는 st 는 예전 walker 와 같아요: { root, walk, rate, waveT, aim, aimK, snapT, update(t, dt), look, g, hat, body }
import { THREE, LOOKS, J } from './zoo3d.js';
const { sin, cos, PI, abs, max, min } = Math;

// 비율 (미터). 2 는 1 과 3 의 가운데
const P1 = { leg: 0.36, legR: 0.068, hipW: 0.08, foot: 0.13, torso: 0.3, waist: 0.15, chest: 0.17, armR: 0.044, arm: 0.36, hand: 0.05, neck: 0.012, neckR: 0.05, head: 0.26, headY: 0.96, skirtLen: 0.27, skirtFlare: 0.12, stride: 1.3, bounce: 0.05 };
const P3 = { leg: 0.78, legR: 0.056, hipW: 0.075, foot: 0.12, torso: 0.41, waist: 0.12, chest: 0.15, armR: 0.037, arm: 0.58, hand: 0.042, neck: 0.05, neckR: 0.042, head: 0.13, headY: 1.06, skirtLen: 0.5, skirtFlare: 0.17, stride: 1, bounce: 0.025 };
const mixP = (k) => Object.fromEntries(Object.keys(P1).map((n) => [n, P1[n] + (P3[n] - P1[n]) * k]));
export const BODIES = [{ name: '키 큰', P: P3, face: 'film' }, { name: '보통', P: mixP(0.5), face: 'film' }, { name: '꼬마', P: P1, face: 'chibi' }];
export const START_BODY = 2;   // 처음엔 꼬마

const TEX = new Map();
function faceTex(kind, skin) {
  const key = kind + skin; if (TEX.has(key)) return TEX.get(key);
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = skin; x.fillRect(0, 0, 1024, 512);
  const cx = 256, ey = 268;
  const blush = (dx, dy, r, a) => { for (const s of [-1, 1]) { const g = x.createRadialGradient(cx + s * dx, ey + dy, 1, cx + s * dx, ey + dy, r); g.addColorStop(0, `rgba(238,128,118,${a})`); g.addColorStop(1, 'rgba(238,128,118,0)'); x.fillStyle = g; x.fillRect(cx + s * dx - r, ey + dy - r, r * 2, r * 2); } };
  if (kind === 'chibi') {
    blush(54, 40, 38, 0.5);
    for (const s of [-1, 1]) { const X = cx + s * 50; x.fillStyle = '#24160f'; x.beginPath(); x.ellipse(X, ey + 4, 16, 22, 0, 0, 7); x.fill(); x.fillStyle = '#5a3a24'; x.beginPath(); x.ellipse(X, ey + 12, 11, 10, 0, 0, PI); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(X - 5, ey - 5, 6, 7, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(X + 6, ey + 14, 2.6, 2.6, 0, 0, 7); x.fill();
      x.strokeStyle = '#5a3a28'; x.lineWidth = 3.5; x.lineCap = 'round'; x.beginPath(); x.moveTo(X - 12, ey - 34); x.quadraticCurveTo(X, ey - 39, X + 12, ey - 34); x.stroke(); }
    x.strokeStyle = '#a4483e'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx - 9, ey + 44); x.quadraticCurveTo(cx, ey + 52, cx + 9, ey + 44); x.stroke();
  } else {   // 극장판: 눈은 조금 작고 아래로 · 윗눈꺼풀 선 · 작은 코 그림자 · 작은 미소
    blush(56, 40, 30, 0.38);
    for (const s of [-1, 1]) {
      const X = cx + s * 42, Y = ey + 6;
      x.fillStyle = '#fbf7f2'; x.beginPath(); x.ellipse(X, Y, 15, 17, 0, 0, 7); x.fill();
      const g = x.createLinearGradient(0, Y - 14, 0, Y + 14); g.addColorStop(0, '#2e1c12'); g.addColorStop(1, '#7a4e2c'); x.fillStyle = g; x.beginPath(); x.ellipse(X, Y + 2, 11, 13.5, 0, 0, 7); x.fill();
      x.fillStyle = '#140c08'; x.beginPath(); x.ellipse(X, Y + 2, 5.5, 6.5, 0, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.ellipse(X - 4.5, Y - 5, 4, 4.6, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(X + 4.5, Y + 7, 1.8, 1.8, 0, 0, 7); x.fill();
      x.strokeStyle = '#2a1a12'; x.lineWidth = 4.2; x.lineCap = 'round'; x.beginPath(); x.moveTo(X - 16, Y - 5); x.quadraticCurveTo(X - 2, Y - 21, X + 16, Y - 9); x.stroke();   // 윗눈꺼풀
      x.lineWidth = 2; x.beginPath(); x.moveTo(X + 15, Y - 9); x.lineTo(X + 20, Y - 13); x.stroke();
      x.strokeStyle = 'rgba(90,58,40,.9)'; x.lineWidth = 3.2; x.beginPath(); x.moveTo(X - 14, Y - 34); x.quadraticCurveTo(X, Y - 40, X + 14, Y - 35); x.stroke();   // 눈썹: 가늘고 부드럽게
    }
    const ng = x.createRadialGradient(cx + 3, ey + 34, 1, cx + 3, ey + 34, 9); ng.addColorStop(0, 'rgba(190,120,100,.55)'); ng.addColorStop(1, 'rgba(190,120,100,0)'); x.fillStyle = ng; x.fillRect(cx - 8, ey + 24, 22, 20);   // 코: 그림자만
    x.strokeStyle = '#a4483e'; x.lineWidth = 3.4; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx - 8, ey + 56); x.quadraticCurveTo(cx, ey + 61, cx + 8, ey + 56); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEX.set(key, t); return t;
}
const MATS = new Map();
const mat = (c, o) => { const k = c + (o ? JSON.stringify(o) : ''); if (!MATS.has(k)) MATS.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.62, ...(o || {}) })); return MATS.get(k); };
const SPH = (r, sy = 1, sz = 1, seg = 28) => { const g = new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)); g.scale(1, sy, sz); return g; };
const CAP = (r0, r1, len, seg = 18) => { const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1); g.translate(0, -len / 2, 0); return g; };
const DOME = (r, sy, back) => { const g = new THREE.SphereGeometry(r, 32, 16, 0, PI * 2, 0, PI * 0.5); g.scale(1, sy, 1); g.rotateX(-back); return g; };
const SKIN = '#f4d6bc';
// 📷 사진기 종류 (🛍 상점): 확대 배율 · 사진 색감 · 모양
export const CAMERAS = [
  { id: 'basic', name: '기본 필름 사진기', price: 0, zoom: 4, filter: '', frame: '#fbf8f0', body: '#2e2a28', top: '#c8b490', lens: 0.045, icon: '📷', desc: '확대 4배 · 있는 그대로' },
  { id: 'instant', name: '즉석 사진기', price: 1200, zoom: 3, filter: 'saturate(1.15) contrast(0.95) brightness(1.05)', frame: '#ffffff', body: '#f2ece0', top: '#e86a5a', lens: 0.035, icon: '🖼', desc: '확대 3배 · 맑고 화사하게' },
  { id: 'vintage', name: '빈티지 사진기', price: 1800, zoom: 4, filter: 'sepia(0.55) contrast(1.05) saturate(0.9)', frame: '#f2e6c8', body: '#6a4a32', top: '#d8b878', lens: 0.05, icon: '🎞', desc: '확대 4배 · 옛날 사진 빛깔' },
  { id: 'mono', name: '흑백 사진기', price: 2000, zoom: 5, filter: 'grayscale(1) contrast(1.15)', frame: '#f6f6f2', body: '#1e1e20', top: '#a8a8a8', lens: 0.05, icon: '⚫', desc: '확대 5배 · 흑백' },
  { id: 'pastel', name: '파스텔 사진기', price: 2400, zoom: 4, filter: 'saturate(0.8) brightness(1.1) hue-rotate(-8deg)', frame: '#fde8ee', body: '#f2b8c8', top: '#a8d8e8', lens: 0.04, icon: '🌸', desc: '확대 4배 · 부드러운 파스텔' },
  { id: 'tele', name: '망원 사진기', price: 3600, zoom: 8, filter: 'contrast(1.05)', frame: '#fbf8f0', body: '#3a3e42', top: '#e8e2d4', lens: 0.11, icon: '🔭', desc: '확대 8배 · 먼 동물도 크게' },
];

export function person(look = 0, opts = {}) {
  const L = LOOKS[look % LOOKS.length], F = opts.g !== 'm', HAT = opts.hat ?? 0, BI = Math.min(2, Math.max(0, opts.body ?? START_BODY)), B = BODIES[BI], P = B.P;
  const root = new THREE.Group(), add = (p, g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };
  const C = F ? { top: L.shirt, low: L.skirt, shoe: '#7a4a32', hair: L.hair } : { top: L.shirt, low: L.skirt, shoe: '#5a3a28', hair: L.hair };
  const skin = mat(SKIN), hip = P.leg;
  const hips = J(root, 0, hip, 0), body = J(hips);
  // 다리: 여자는 맨다리 + 치마, 남자는 바지
  const legs = [-1, 1].map((s) => {
    const l = J(hips, s * P.hipW, 0, 0), th = P.leg * 0.5, sh = P.leg * 0.5, lm = mat(F ? SKIN : C.low);
    add(l, CAP(P.legR * 1.15, P.legR * 0.88, th), lm); add(l, SPH(P.legR * 0.9, 1, 1, 12), lm, 0, -th, 0);
    const k = J(l, 0, -th, 0); add(k, CAP(P.legR * 0.88, P.legR * 0.64, sh - P.foot * 0.5), lm);
    add(k, SPH(P.foot * 0.55, 0.55, 1.45, 18), mat(C.shoe), 0, -sh + P.foot * 0.26, P.foot * 0.32);
    return { l, k };
  });
  // 몸통 (둥근 어깨)
  const tl = P.torso;
  add(body, CAP(P.waist, P.chest, tl, 26), mat(C.top), 0, tl, 0).scale.z = 0.78;
  add(body, SPH(P.chest * 1.02, 0.5, 0.8, 26), mat(C.top), 0, tl, 0);
  let skirt = null;
  if (F) { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(P.waist * 1.03 + P.skirtFlare * Math.pow(t, 1.2) + (i === 12 ? -0.006 : 0), -t * P.skirtLen)); } skirt = add(body, new THREE.LatheGeometry(pts, 36), mat(C.low, { side: THREE.DoubleSide }), 0, P.waist * 0.45, 0); skirt.scale.z = 0.86; }
  else add(body, SPH(P.waist * 1.1, 0.62, 0.82, 22), mat(C.low), 0, 0.01, 0);
  add(body, new THREE.TorusGeometry(P.waist * 1.0, P.waist * 0.07, 8, 26), mat(L.bag), 0, P.waist * 0.45, 0).rotation.x = PI / 2;   // 허리띠
  // 팔: 어깨에서 몸 가까이 내려오고, 팔꿈치가 살짝 굽어 있어요. 이음매는 둥근 공으로 감춰요
  const arms = [-1, 1].map((s) => {
    const a = J(body, s * (P.chest * 0.9), tl - P.armR * 0.4, 0), up = P.arm * 0.48, lo = P.arm * 0.44;
    add(a, SPH(P.armR * 1.45, 1.05, 1, 16), mat(C.top));
    add(a, CAP(P.armR * 1.2, P.armR * 0.98, up), mat(C.top));
    add(a, SPH(P.armR * 0.98, 1, 1, 12), skin, 0, -up, 0);   // 팔꿈치
    const f = J(a, 0, -up, 0); add(f, CAP(P.armR * 0.95, P.armR * 0.72, lo), skin);
    const h = J(f, 0, -lo, 0); add(h, SPH(P.hand, 1.2, 0.62, 14), skin, 0, -P.hand * 0.75, 0); add(h, SPH(P.hand * 0.38, 0.9, 0.7, 10), skin, -s * P.hand * 0.55, -P.hand * 0.35, P.hand * 0.2);   // 손 · 엄지
    a.rotation.z = s * 0.06; return { a, f, s };
  });
  // 목 · 머리
  const nTop = tl + P.chest * 0.3;
  add(body, CAP(P.neckR, P.neckR * 1.05, P.neck + 0.04), skin, 0, nTop + P.neck, 0);
  const head = J(body, 0, nTop + P.neck + P.head * 0.88, 0);
  add(head, SPH(P.head, P.headY, 0.96, 36), new THREE.MeshStandardMaterial({ map: faceTex(B.face, SKIN), roughness: 0.72 }));
  if (BI < 2) { for (const s of [-1, 1]) add(head, SPH(P.head * 0.16, 1.3, 0.6, 10), skin, s * P.head * 0.98, -P.head * 0.05, 0); add(head, SPH(P.head * 0.08, 0.85, 0.75, 10), skin, 0, -P.head * 0.16, P.head * 0.95); }
  // 머리카락: 정수리 반구 + 뒤통수 + 앞머리 갈래 (+ 여자는 긴 머리)
  const H = mat(C.hair), hairG = J(head), tips = [];
  add(hairG, DOME(P.head * 1.08, 1.0, 0.32), H, 0, P.head * 0.05, -P.head * 0.02);
  add(hairG, SPH(P.head * 1.02, F ? 1.12 : 0.8, 0.85, 26), H, 0, F ? -P.head * 0.2 : 0, -P.head * 0.32);
  const nB = F ? 9 : 7; for (let i = 0; i < nB; i++) { const a = -0.9 + i * (1.8 / (nB - 1)), b = J(hairG, sin(a) * P.head * 0.86, P.head * 0.66, cos(a) * P.head * 0.66); b.rotation.set(1.05, a, -a * 0.3); add(b, SPH(P.head * 0.19, F ? 0.8 : 0.6, 0.4, 12), H, 0, -P.head * 0.1, 0); tips.push(b); }
  if (F) for (let i = 0; i < 7; i++) { const a = PI * 0.62 + i * (PI * 0.76 / 6), t = J(hairG, sin(a) * P.head * 0.88, -P.head * 0.1, cos(a) * P.head * 0.88); add(t, CAP(P.head * 0.22, P.head * 0.12, P.head * (BI < 2 ? 1.5 : 1.1), 10), H); t.rotation.x = -0.12; tips.push(t); }
  else for (const s of [-1, 1]) add(hairG, SPH(P.head * 0.32, 0.6, 0.6, 12), H, s * P.head * 0.9, P.head * 0.2, -P.head * 0.05);
  // 모자: 머리 크기에 맞춰 키워요
  const hat = J(head, 0, P.head * P.headY * 0.74, -P.head * 0.02), k = P.head / 0.116; hat.scale.setScalar(k); hat.rotation.x = -0.14;
  const half = (r, sy, c) => { const m = add(hat, new THREE.SphereGeometry(r, 30, 12, 0, PI * 2, 0, PI * 0.5), mat(c)); m.scale.y = sy; return m; };
  let rib = J(hat);
  if (HAT === 0) { add(hat, new THREE.CylinderGeometry(0.2, 0.205, 0.01, 44), mat('#e6c98a')); half(0.118, 0.72, '#ecd296'); add(hat, new THREE.CylinderGeometry(0.119, 0.12, 0.026, 32, 1, true), mat(L.band, { side: THREE.DoubleSide }), 0, 0.016, 0); rib = J(hat, 0.05, 0.015, -0.11); add(rib, new THREE.BoxGeometry(0.03, 0.15, 0.006), mat(L.band, { side: THREE.DoubleSide }), 0, -0.07, 0); }
  else if (HAT === 1) { hat.position.y -= P.head * 0.25; half(0.122, 0.78, L.band); const bl = add(hat, new THREE.CylinderGeometry(0.11, 0.11, 0.01, 24, 1, false, -PI / 2, PI), mat(L.band), 0, 0, 0.07); bl.scale.z = 1.2; }
  else if (HAT === 2) { hat.position.y -= P.head * 0.28; half(0.125, 1.05, L.skirt); add(hat, new THREE.TorusGeometry(0.118, 0.022, 10, 30), mat(L.shirt), 0, 0.01, 0).rotation.x = PI / 2; add(hat, SPH(0.035, 1, 1, 12), mat(L.shirt), 0, 0.135, 0); }
  else if (HAT === 3) { hat.position.y -= P.head * 0.25; add(hat, new THREE.CylinderGeometry(0.18, 0.185, 0.01, 36), mat('#c8b48a')); add(hat, new THREE.CylinderGeometry(0.1, 0.12, 0.1, 30), mat('#d4c098'), 0, 0.05, 0); add(hat, new THREE.CylinderGeometry(0.121, 0.121, 0.022, 30, 1, true), mat('#6a5038', { side: THREE.DoubleSide }), 0, 0.02, 0); }
  else if (HAT === 4) { hat.position.y -= P.head * 0.32; const fc = ['#f2a0b8', '#fff2a8', '#ffffff', '#c8a8f0', '#f6b07a']; for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; add(hat, SPH(0.026, 0.8, 1, 10), mat(fc[i % 5]), sin(a) * 0.112, 0.02, cos(a) * 0.105); } }
  // 📷 목에 건 사진기 · 끈
  const CM = CAMERAS.find((c) => c.id === opts.cam) || CAMERAS[0];
  const cs = P.head / 0.116, cz = P.chest * 0.84 + 0.04 * cs * 0.8, camG = J(body, 0, tl * 0.62, cz), cb = J(camG);
  add(cb, new THREE.BoxGeometry(0.13 * cs * 0.8, 0.085 * cs * 0.8, 0.06 * cs * 0.8), mat(CM.body)); add(cb, new THREE.BoxGeometry(0.13 * cs * 0.8, 0.026 * cs * 0.8, 0.062 * cs * 0.8), mat(CM.top), 0, 0.036 * cs, 0);
  add(cb, new THREE.CylinderGeometry(0.028 * cs, 0.031 * cs, CM.lens * cs, 18), mat('#1a1818'), 0, -0.004, (0.018 + CM.lens / 2) * cs).rotation.x = PI / 2;
  add(cb, new THREE.CylinderGeometry(0.02 * cs, 0.02 * cs, 0.004 * cs, 16), new THREE.MeshStandardMaterial({ color: '#5a7a98', roughness: 0.05, metalness: 0.6 }), 0, -0.004, (0.02 + CM.lens) * cs).rotation.x = PI / 2;
  // 목줄: 사진기 양옆 고리에서 어깨를 지나 목 뒤로 (사진기를 들면 같이 따라 올라가요)
  const strapM = mat('#6a4430'), strapPts = (lift) => { const yC = tl * 0.62 + lift, zC = cz, w = 0.06 * cs, nY = nTop + P.neck * 0.6; return [[-w, yC + 0.02 * cs, zC], [-P.chest * 0.55, (yC + nY) / 2 + 0.02, P.chest * 0.7], [-P.neckR * 1.25, nY, P.neckR * 0.2], [0, nY + 0.01, -P.neckR * 1.35], [P.neckR * 1.25, nY, P.neckR * 0.2], [P.chest * 0.55, (yC + nY) / 2 + 0.02, P.chest * 0.7], [w, yC + 0.02 * cs, zC]].map(([x, y, z]) => new THREE.Vector3(x, y, z)); };
  const strap = add(body, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strapPts(0)), 40, 0.007 * cs, 6), strapM); let strapLift = 0;
  const st = { root, walk: 0, step: 0, waveT: 0, aim: 0, aimK: 0, snapT: 0, rate: 1, look, g: F ? 'f' : 'm', hat: HAT, body: BI, cam: CM.id };
  st.update = (t, dt) => {
    st.step += dt * st.walk * 8.4 * P.stride * (st.rate || 1); const p = st.step, w = st.walk;
    legs.forEach(({ l, k: kn }, i) => { const q = p + i * PI; l.rotation.x = sin(q) * 0.44 * w; kn.rotation.x = max(0, -sin(q - 0.9)) * 0.7 * w; });
    // 팔: 걸을 땐 앞뒤로 · 서 있을 땐 숨 쉬듯 살짝. 팔꿈치는 늘 조금 굽혀요
    arms.forEach(({ a, f, s }, i) => { a.rotation.x = -sin(p + i * PI) * 0.36 * w + sin(t * 0.8 + i) * 0.025; a.rotation.z = s * (0.06 + 0.02 * sin(t * 1.3)); f.rotation.x = -0.22 - 0.18 * w - max(0, sin(p + i * PI)) * 0.25 * w; f.rotation.z = 0; });
    if (st.waveT > 0) st.waveT = max(0, st.waveT - dt);
    const wv = st.waveT > 0 ? min(1, st.waveT * 4, (2.4 - st.waveT) * 5) : 0;
    if (wv > 0) { const R = arms[1]; R.a.rotation.z = 0.06 + wv * 2.5; R.a.rotation.x *= 1 - wv; R.f.rotation.x = -0.3 * (1 - wv) - 0.25 * wv; R.f.rotation.z = wv * sin(t * 12) * 0.5; }
    st.aimK += ((st.aim ? 1 : 0) - st.aimK) * min(1, dt * 7); const ak = st.aimK * st.aimK * (3 - 2 * st.aimK);
    if (st.snapT > 0) st.snapT = max(0, st.snapT - dt);
    if (ak > 0.01) arms.forEach(({ a, f, s }) => { a.rotation.x = a.rotation.x * (1 - ak) - 1.0 * ak; a.rotation.z = a.rotation.z * (1 - ak) - s * 0.4 * ak; f.rotation.x = f.rotation.x * (1 - ak) - 1.65 * ak; f.rotation.z = -s * 0.7 * ak; });
    camG.position.set(0, tl * 0.62 + (P.neck + P.head * 0.9 + P.chest * 0.38) * ak, cz + P.head * 0.7 * ak);
    const lift = Math.round(ak * 6) / 6; if (lift !== strapLift) { strapLift = lift; strap.geometry.dispose(); const pts = strapPts((P.neck + P.head * 0.9 + P.chest * 0.38) * lift); pts[0].z += P.head * 0.7 * lift; pts[6].z += P.head * 0.7 * lift; strap.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.007 * cs, 6); } camG.rotation.x = sin(t * 2.2) * 0.1 * (1 - ak) - 0.1 * ak;
    cb.position.y = st.snapT > 0 ? -0.015 : 0;
    hips.position.y = hip + abs(sin(p)) * P.bounce * w + sin(t * 1.5) * 0.003 * (1 - w);
    body.rotation.y = sin(p) * 0.05 * w;
    if (skirt) { skirt.rotation.x = sin(p * 2) * 0.04 * w + sin(t * 1.9) * 0.02; skirt.rotation.z = sin(p) * 0.04 * w; }
    head.rotation.set(sin(t * 0.5) * 0.03 * (1 - ak) + 0.08 * ak, sin(t * 0.33) * 0.18 * (1 - w) * (1 - ak), sin(t * 0.7) * 0.02);
    rib.rotation.x = 0.3 + sin(t * 3.4) * 0.25 + w * 0.4;
    tips.forEach((b, i) => { b.rotation.z = (b.userData.z0 ??= b.rotation.z) + sin(t * 2.1 + i) * 0.04; });
  };
  return st;
}
