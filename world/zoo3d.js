// 스냅주 3D 그림 도구 — 시안 docs/시안/_meta_tpl.html 의 ③ '극장판 부드러운 3D' 를 그대로 옮긴 것.
// 동물(곡선 관으로 빚은 몸 · 몸에 바로 칠한 무늬) · 산책자 · 재질 · 하늘. 시안을 고치면 여기도 같이 고쳐요.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const { sin, cos, PI, abs, min, max, sqrt, pow } = Math;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const J = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const smooth = (a, b, x) => { const t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const NOISE = `vec2 hash2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.0+2.0*fract(sin(p)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);return mix(mix(dot(hash2(i),f),dot(hash2(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(hash2(i+vec2(0,1)),f-vec2(0,1)),dot(hash2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 hash3(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return fract(sin(p)*43758.5453);}
`;
function noise2(x, y) { return sin(x * 1.7 + sin(y * 1.3)) * 0.5 + sin(y * 2.1 + sin(x * 0.7) * 1.5) * 0.5; }
// =====================================================================
// 방식(style)
// =====================================================================
const STYLE = {
  low: { name: '① 캠핑장 결 로우폴리', q: 0.4, desc: '캠핑장 · 큰법당과 같은 집안 느낌이에요. 면이 각지게 보이는 로우폴리에 부드러운 안개와 따뜻한 햇빛. 가볍고 단정해서 휴대폰에서도 넓은 섬을 빠르게 그릴 수 있어요.', tags: ['캠핑장 · 큰법당 결', '각진 면', '가벼움 · 넓은 섬에 유리'] },
  toon: { name: '② 그림체 ‘나’ 툰', q: 1, desc: '고르신 ‘나’ 그림체를 3D로 옮겼어요. 또렷한 두 단계 그늘, 연필색 외곽선, 화면 전체에 은은한 종이결. 바람에 물결치는 풀밭은 A 셀 애니메이션 배경 그대로예요.', tags: ['그림체 ‘나’', '외곽선 · 두 단계 그늘', '종이결 · 바람 풀밭'] },
  soft: { name: '③ 극장판 부드러운 3D', q: 1, desc: '매끈한 면과 부드러운 그림자, 해 질 녘 금빛 역광. 3D 애니메이션 영화처럼 입체감이 살아요. 화면이 가장 화려하지만 그만큼 무거워요.', tags: ['3D 애니메이션 영화', '매끈한 면 · 노을빛', '가장 화려 · 무거움'] },
};
const GRAD3 = (() => { const d = new Uint8Array([150, 150, 150, 255, 214, 214, 214, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
let S = 'soft';   // 스냅주는 ③ 극장판 부드러운 3D 로 정함 (2026-11-05)
const MATS = new Map();
function plain(c, o = {}) {
  const k = S + c + JSON.stringify(o); if (MATS.has(k)) return MATS.get(k);
  const { gloss, ...rest } = o; let m;
  if (S === 'toon') m = new THREE.MeshToonMaterial({ color: c, gradientMap: GRAD3, ...rest });
  else if (S === 'low') m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, flatShading: true, ...rest });
  else m = new THREE.MeshStandardMaterial({ color: c, roughness: gloss ? 0.15 : 0.72, ...rest });
  MATS.set(k, m); return m;
}
// 툰: 뒤집은 껍질로 연필색 외곽선 (화면에서 늘 비슷한 굵기)
const OUTLINE = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { uW: { value: 0.0042 }, uC: { value: new THREE.Color('#5a463a') } },
  vertexShader: `uniform float uW; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vec3 n=normalize(normalMatrix*normal); float d=-mv.z; mv.xyz+=n*uW*clamp(d,0.6,14.0); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uC; void main(){ gl_FragColor=vec4(uC,1.0);
    #include <colorspace_fragment>
  }` });
function outlines(root) {
  if (S !== 'toon') return;
  const list = []; root.traverse((o) => { if (o.isMesh && !o.userData.noLine) list.push(o); });
  for (const o of list) { const h = new THREE.Mesh(o.geometry, OUTLINE); h.userData.noLine = true; h.raycast = () => {}; o.add(h); }
}

// =====================================================================
// 곡선 관(tube): 지나는 점들과 굵기(가로 · 세로)로 몸통 · 목 · 다리 · 꼬리 · 코를 빚어요
//  각 점에 '관을 따라 간 거리 · 둘레 방향'을 기억해 두면 줄무늬 · 얼룩을 몸에 바로 칠할 수 있어요
// =====================================================================
function tube(pts, rFn, segL = 24, segR = 18, ref) {
  const q = STYLE[S].q; segL = max(4, Math.round(segL * (q < 1 ? 0.45 : 1))); segR = max(6, Math.round(segR * (q < 1 ? 0.45 : 1)));
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => V(...p)), false, 'centripetal');
  const L = curve.getLength(), pos = [], tub = [], idx = [];
  const T0 = curve.getTangentAt(0.5); const up = ref || (abs(T0.y) > 0.8 ? V(0, 0, 1) : V(0, 1, 0));
  for (let i = 0; i <= segL; i++) {
    const t = i / segL, P = curve.getPointAt(t), T = curve.getTangentAt(t);
    const side = new THREE.Vector3().crossVectors(T, up).normalize(), nrm = new THREE.Vector3().crossVectors(side, T).normalize();
    let [rx, ry] = [].concat(rFn(t)); if (ry === undefined) ry = rx;
    for (let j = 0; j < segR; j++) { const a = j / segR * PI * 2, c = cos(a), s = sin(a); pos.push(P.x + side.x * c * rx + nrm.x * s * ry, P.y + side.y * c * rx + nrm.y * s * ry, P.z + side.z * c * rx + nrm.z * s * ry); tub.push(t * L, c, s); }
  }
  for (let i = 0; i < segL; i++) for (let j = 0; j < segR; j++) { const a = i * segR + j, b = i * segR + (j + 1) % segR, c = a + segR, d = b + segR; idx.push(a, c, b, b, c, d); }
  // 양 끝 막기
  const P0 = curve.getPointAt(0), P1 = curve.getPointAt(1), n0 = pos.length / 3; pos.push(P0.x, P0.y, P0.z, P1.x, P1.y, P1.z); tub.push(0, 0, 0, L, 0, 0);
  for (let j = 0; j < segR; j++) { idx.push(n0, j, (j + 1) % segR); const e = segL * segR; idx.push(n0 + 1, e + (j + 1) % segR, e + j); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('tub', new THREE.Float32BufferAttribute(tub, 3)); g.setIndex(idx); g.computeVertexNormals(); g.userData.L = L;
  return g;
}
const prof = (t, a = 0.42) => pow(max(0.0001, sin(PI * min(1, max(0, t)))), a);   // 끝이 둥근 굵기
function ell(sx, sy, sz, seg = 22) { const q = STYLE[S].q; const g = new THREE.SphereGeometry(1, max(7, Math.round(seg * (q < 1 ? 0.4 : 1))), max(5, Math.round(seg * 0.7 * (q < 1 ? 0.4 : 1)))); g.scale(sx, sy, sz); const n = g.attributes.position.count; g.setAttribute('tub', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); return g; }

// =====================================================================
// 털 무늬: 동물마다 GLSL 한 토막. rpos = 동물 기준 자리, tub = 관을 따라 간 거리 · 둘레, reg = 부위
//  reg: 0 몸 1 다리 2 목 3 머리 4 꼬리 5 갈기 · 수염 6 코(코끼리)
// =====================================================================
const COATS = {
  gazelle: { c: ['#d2a064', '#f6efe2', '#2e2420', '#c08a54'], glsl: `
    vec3 c=C0; float y=R.y;
    if(reg<0.5){ if(y<0.425+0.015*sin(R.z*6.0)) c=C1; if(abs(y-0.465)<0.022 && R.z>-0.34 && R.z<0.34) c=C2; if(R.z<-0.4 && y>0.44) c=C1; }
    else if(reg<1.5){ c=mix(C0,C1,smoothstep(0.32,0.22,y)); }
    else if(reg<2.5){ if(T.z<-0.35 && R.z>0.3) c=C1; }
    else if(reg<3.5){ if(abs(T.y)>0.55 && abs(T.z+0.05)<0.12 && T.x>0.05) c=C2; if(T.z<-0.6) c=C1; }
    else if(reg<4.5){ c=C2; }
    return c;` },
  zebra: { c: ['#f4f0e8', '#262224', '#3a3436'], glsl: `
    vec3 c=C0; float v;
    if(reg<0.5){ v=T.x*8.5+sin(R.y*5.0+R.z)*0.35; float w=R.y<0.78?0.3:0.46; if(fract(v)<w) c=C1; }
    else if(reg<1.5){ v=R.y*15.0; if(fract(v)<0.42) c=C1; }
    else if(reg<2.5){ v=T.x*10.0; if(fract(v)<0.45) c=C1; }
    else if(reg<3.5){ v=T.x*15.0+T.y*0.3; if(fract(v)<0.38) c=C1; if(T.x>0.36) c=C2; }
    else if(reg<4.5){ c=T.x>0.38?C1:C0; }
    else { v=T.x*14.0; c=fract(v)<0.5?C1:C0; }
    return c;` },
  giraffe: { c: ['#f2d49a', '#b4682e', '#3a2a22'], glsl: `
    vec3 c=C0;
    if(reg<3.5 && !(reg>0.5 && reg<1.5 && R.y<0.95)){
      vec3 p=R*(reg>2.5?13.0:6.0); vec3 i=floor(p), f=fract(p); float d1=8.0, d2=8.0;
      for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) for(int z=-1;z<=1;z++){ vec3 o=vec3(x,y,z); vec3 h=hash3(i+o); float d=length(o+h*0.8+0.1-f); if(d<d1){d2=d1;d1=d;} else if(d<d2) d2=d; }
      if(d2-d1>0.13) c=C1; }
    if(reg>3.5 && reg<4.5) c=T.x>0.5?C2:C0;
    if(reg>4.5) c=C2;
    return c;` },
  elephant: { c: ['#a49e98', '#8a847e', '#e8b8b0'], glsl: `
    vec3 c=C0; float n=noise(R.xz*30.0+R.y*20.0)*0.5+0.5;
    c=mix(C0,C1,smoothstep(0.62,0.9,n)*0.6);
    if(reg>5.5){ if(fract(T.x*28.0)<0.18) c=C1; }
    if(reg>4.5 && reg<5.5) c=C2;
    return c;` },
  gnu: { c: ['#a49a90', '#847a72', '#3a3432'], glsl: `
    vec3 c=C0;
    if(reg<0.5){ if(R.z>-0.1 && fract(T.x*14.0)<0.22) c=mix(c,C1,0.7); }
    else if(reg<1.5){ c=mix(C0,C1,0.6); }
    else if(reg<2.5){ if(fract(T.x*14.0)<0.22) c=mix(c,C1,0.7); }
    else if(reg<3.5){ if(T.x>0.16) c=C2; }
    else { c=C2; }
    return c;` },
};
function coatMat(kind) {
  const k = S + 'coat' + kind; if (MATS.has(k)) return MATS.get(k);
  const def = COATS[kind];
  const m = S === 'toon' ? new THREE.MeshToonMaterial({ gradientMap: GRAD3 }) : new THREE.MeshStandardMaterial({ roughness: S === 'soft' ? 0.8 : 0.92, flatShading: S === 'low' });
  m.onBeforeCompile = (sh) => {
    def.c.forEach((c, i) => { sh.uniforms['C' + i] = { value: new THREE.Color(c) }; });
    sh.vertexShader = 'attribute vec3 tub; attribute vec3 rpos; attribute float reg; varying vec3 vT; varying vec3 vR; varying float vReg;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vT=tub; vR=rpos; vReg=reg;');
    sh.fragmentShader = def.c.map((_, i) => `uniform vec3 C${i};`).join('') + '\nvarying vec3 vT; varying vec3 vR; varying float vReg;\n' + NOISE + `vec3 coat(vec3 R, vec3 T, float reg){ ${def.glsl} }\n` + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( coat(vR, vT, vReg), opacity );');
  };
  m.customProgramCacheKey = () => k;
  MATS.set(k, m); return m;
}
// 다 빚은 뒤 각 조각의 '동물 기준 자리'를 새겨 둬요 (움직여도 무늬가 따라가게)
function bakeCoat(root) {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), m = new THREE.Matrix4(), v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || o.userData.reg === undefined) return;
    m.multiplyMatrices(inv, o.matrixWorld); const p = o.geometry.attributes.position, n = p.count, r = new Float32Array(n * 3), rg = new Float32Array(n).fill(o.userData.reg);
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m); r[i * 3] = v.x; r[i * 3 + 1] = v.y; r[i * 3 + 2] = v.z; }
    o.geometry.setAttribute('rpos', new THREE.BufferAttribute(r, 3)); o.geometry.setAttribute('reg', new THREE.BufferAttribute(rg, 1));
  });
}
function M(p, geo, mat, reg, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = S !== 'toon'; if (reg !== undefined) m.userData.reg = reg; p.add(m); return m; }
function eye(p, r, x, y, z, ry = 0) {
  const g = J(p, x, y, z); g.rotation.y = ry;
  M(g, ell(r, r * 1.08, r * 0.7), plain('#1e1614', { gloss: true }));
  const h = M(g, ell(r * 0.3, r * 0.32, r * 0.2, 10), plain('#ffffff')); h.position.set(-r * 0.25 * Math.sign(x || 1), r * 0.35, r * 0.6); h.userData.noLine = true;
  return g;
}

// =====================================================================
// 네 발 동물 빚기: spec 숫자로 몸통 · 다리(무릎) · 목 · 머리 · 귀 · 뿔 · 꼬리
// =====================================================================
function quad(sp) {
  const coat = coatMat(sp.kind), root = new THREE.Group(), body = J(root);
  const L = sp.len, H = sp.bodyH, W = sp.bodyW, cy = sp.shoulder - H / 2;
  // 몸통: 엉덩이(-z) → 가슴(+z)
  const torso = tube([[0, cy + sp.rumpY, -L / 2], [0, cy + sp.rumpY * 0.5 - 0.01, -L / 6], [0, cy - 0.01, L / 6], [0, cy + sp.chestY, L / 2]], (t) => { const k = prof(t, 0.4) * (1 + sp.front * (t - 0.5)); return [W / 2 * k, H / 2 * k * (1 - 0.06 * sin(PI * t))]; }, 30, 22);
  M(body, torso, coat, 0);
  // 다리: 엉덩이 관절(hip) → 무릎(knee) → 발굽
  const legs = [];
  for (const [sx, front] of [[-1, 1], [1, 1], [-1, 0], [1, 0]]) {
    const z = (front ? 1 : -1) * L * sp.legZ, top = cy - H * 0.05, len = top;
    const hip = J(root, sx * W * 0.3, top, z), a = len * 0.5;
    const r0 = sp.legR * (front ? 1.15 : 1.4);
    M(hip, tube([[0, H * 0.18, 0], [0, -a * 0.5, front ? 0 : -0.02 * len], [0, -a, front ? 0.01 : -0.07 * len]], (t) => r0 * (1 - 0.45 * t) + sp.legR * 0.1, 10, 12), coat, 1);
    const knee = J(hip, 0, -a, front ? 0.01 : -0.07 * len);
    M(knee, tube([[0, 0.02, 0], [0, -a * 0.5, 0.0], [0, -a + sp.hoof, front ? 0 : 0.07 * len]], (t) => sp.legR * (0.62 - 0.12 * t), 8, 10), coat, 1);
    const hf = M(knee, new THREE.CylinderGeometry(sp.legR * 0.5, sp.legR * 0.72, sp.hoof, 10), plain(sp.hoofC || '#2a2422'), undefined, 0, -a + sp.hoof / 2, front ? 0 : 0.07 * len);
    legs.push({ hip, knee, front, sx });
  }
  // 목
  const nb = V(0, cy + H * 0.22, L / 2 - sp.neckIn), nd = V(0, cos(sp.neckA), sin(sp.neckA)).multiplyScalar(sp.neckL);
  const neck = J(body, nb.x, nb.y, nb.z);
  M(neck, tube([[0, -H * 0.18, -0.02], [0, 0, 0], [0, nd.y * 0.55, nd.z * 0.5], [0, nd.y, nd.z]], (t) => [sp.neckR[0] * (1 - t) + sp.neckR[1] * t, (sp.neckR[0] * (1 - t) + sp.neckR[1] * t) * 1.18], 16, 14), coat, 2);
  if (sp.mane) { const mn = M(neck, tube([[0, -0.02, -0.02 - sp.neckR[0] * 0.95], [0, nd.y * 0.5, nd.z * 0.5 - sp.neckR[0] * 1.0], [0, nd.y + 0.05, nd.z - sp.neckR[1] * 1.05]], () => [0.018, sp.mane], 14, 8, V(1, 0, 0)), coat, 5); mn.rotation.x = 0; }
  // 머리: 목 끝에서 앞 · 아래로
  const head = J(neck, 0, nd.y, nd.z); head.rotation.x = sp.headA;
  const hl = sp.headL, hr = sp.headR;
  M(head, tube([[0, 0.02, -hr * 0.6], [0, 0, hl * 0.25], [0, -0.01, hl * 0.6], [0, -0.02, hl]], (t) => { const k = (1 - 0.5 * smooth(0.15, 1, t)) * pow(max(0.001, sin(PI * min(1, t * 0.5 + 0.5 * smooth(0.0, 0.08, t) + 0.001))), 0.3); return [hr * k * 0.9, hr * k]; }, 18, 16), coat, 3);
  const eyes = [-1, 1].map((s) => eye(head, sp.eyeR, s * hr * 0.78, hr * 0.32, hl * 0.18, s * 0.55));
  M(head, ell(hr * 0.22, hr * 0.15, hr * 0.12, 10), plain('#2a2220'), undefined, 0, -0.0, hl + 0.005).userData.noLine = true;
  const ears = [-1, 1].map((s) => { const e = J(head, s * hr * 0.55, hr * 0.65, -hr * 0.2); e.rotation.set(-0.3, 0, s * (sp.earOut || 0.9)); M(e, ell(sp.earW, sp.earL, sp.earW * 0.38), coat, 3, 0, sp.earL * 0.85, 0); M(e, ell(sp.earW * 0.66, sp.earL * 0.78, sp.earW * 0.2), plain(sp.earIn || '#e8c8b0'), undefined, 0, sp.earL * 0.85, sp.earW * 0.2).userData.noLine = true; return e; });
  if (sp.horn) sp.horn(head, hr, hl);
  // 꼬리
  const tail = J(body, 0, cy + sp.rumpY + H * 0.28, -L / 2 + 0.02);
  M(tail, tube([[0, 0, 0], [0, -sp.tailL * 0.4, -0.05], [0, -sp.tailL, -0.04]], (t) => sp.legR * 0.32 * (1 - 0.5 * t), 10, 8), coat, 4);
  if (sp.tuft) M(tail, ell(sp.legR * 0.42, sp.tuft, sp.legR * 0.42), plain('#2a2420'), undefined, 0, -sp.tailL - sp.tuft * 0.6, -0.04);
  bakeCoat(root); outlines(root);
  const ph = Math.random() * 9;
  const st = { root, body, neck, head, tail, legs, eyes, ears, graze: sp.graze, walk: 0, step: 0 };
  st.update = (t, dt) => {
    t += ph;
    body.scale.y = 1 + sin(t * 1.4) * 0.008;
    tail.rotation.x = 0.3 + sin(t * 1.2) * 0.05; tail.rotation.z = sin(t * 2.6) * 0.35;
    ears.forEach((e, i) => { e.rotation.x = -0.3 + (t % 5 < 0.25 && i ? sin(t * 40) * 0.25 : 0); });
    const bl = (t % 4.6) < 0.12; eyes.forEach((e) => (e.scale.y = bl ? 0.1 : 1));
    // 풀 뜯기: 가끔 고개를 땅까지
    const g = sp.graze ? smooth(0, 1, sin(t * 0.32) * 1.6 - 0.4) : 0;
    neck.rotation.x = sp.neckRest + g * sp.graze + sin(t * 0.7) * 0.03; neck.rotation.y = sin(t * 0.23) * 0.25 * (1 - g);
    head.rotation.x = sp.headA + g * 0.35;
    // 걷기: 대각선 다리가 같이
    st.step += dt * st.walk * 7.5;
    legs.forEach((l) => { const p = st.step + (l.front ? 0 : PI) + (l.sx > 0 ? PI : 0); l.hip.rotation.x = sin(p) * 0.38 * st.walk; l.knee.rotation.x = l.front ? max(0, -sin(p + 0.6)) * 0.7 * st.walk : -max(0, sin(p + 0.6)) * 0.5 * st.walk; });
    body.position.y = abs(sin(st.step)) * 0.02 * st.walk;
  };
  return st;
}
const SPECIES = {
  gazelle: () => quad({ kind: 'gazelle', len: 0.86, bodyH: 0.34, bodyW: 0.26, shoulder: 0.68, rumpY: 0.02, chestY: 0.0, front: 0.12, legZ: 0.3, legR: 0.026, hoof: 0.05, neckIn: 0.08, neckA: 0.62, neckL: 0.36, neckR: [0.08, 0.05], neckRest: 0, headA: 0.62, headL: 0.24, headR: 0.065, eyeR: 0.016, earW: 0.035, earL: 0.08, earOut: 0.7, earIn: '#f0dcc8', tailL: 0.14, tuft: 0, graze: 1.25,
    horn: (h, r, l) => { for (const s of [-1, 1]) { const g = J(h, s * r * 0.35, r * 0.75, -r * 0.1); M(g, tube([[0, 0, 0], [s * 0.02, 0.1, -0.04], [s * 0.035, 0.2, -0.05], [s * 0.025, 0.27, -0.01]], (t) => 0.014 * (1 - 0.7 * t), 12, 8), plain('#3a3028'), undefined).userData.noLine = false; g.rotation.x = -0.5; } } }),
  zebra: () => quad({ kind: 'zebra', len: 1.42, bodyH: 0.62, bodyW: 0.48, shoulder: 1.28, rumpY: 0.01, chestY: 0.0, front: 0.1, legZ: 0.31, legR: 0.055, hoof: 0.08, neckIn: 0.12, neckA: 0.68, neckL: 0.5, neckR: [0.17, 0.1], neckRest: 0, headA: 0.78, headL: 0.5, headR: 0.11, eyeR: 0.022, earW: 0.05, earL: 0.12, earOut: 0.45, earIn: '#e8e0d8', tailL: 0.45, tuft: 0.08, mane: 0.075, graze: 1.0 }),
  giraffe: () => quad({ kind: 'giraffe', len: 1.0, bodyH: 0.56, bodyW: 0.4, shoulder: 1.9, rumpY: -0.14, chestY: 0.06, front: 0.2, legZ: 0.3, legR: 0.045, hoof: 0.07, hoofC: '#3a2a22', neckIn: 0.1, neckA: 0.32, neckL: 1.25, neckR: [0.14, 0.065], neckRest: 0, headA: 0.55, headL: 0.36, headR: 0.085, eyeR: 0.022, earW: 0.04, earL: 0.09, earOut: 1.25, earIn: '#f0dcb8', tailL: 0.6, tuft: 0.07, mane: 0.03, graze: 0,
    horn: (h, r) => { for (const s of [-1, 1]) { const g = J(h, s * r * 0.4, r * 0.8, -r * 0.35); M(g, tube([[0, 0, 0], [0, 0.07, 0], [0, 0.13, -0.01]], () => 0.017, 6, 8), coatMat('giraffe'), 0); M(g, ell(0.026, 0.026, 0.026, 12), plain('#3a2a22'), undefined, 0, 0.14, -0.01); } } }),
  gnu: () => quad({ kind: 'gnu', len: 1.4, bodyH: 0.66, bodyW: 0.44, shoulder: 1.32, rumpY: -0.08, chestY: 0.08, front: 0.4, legZ: 0.3, legR: 0.045, hoof: 0.07, neckIn: 0.12, neckA: 1.0, neckL: 0.36, neckR: [0.18, 0.13], neckRest: 0, headA: 1.05, headL: 0.48, headR: 0.11, eyeR: 0.02, earW: 0.045, earL: 0.09, earOut: 1.5, earIn: '#8a807a', tailL: 0.62, tuft: 0.14, mane: 0.09, graze: 0.8,
    horn: (h, r) => { for (const s of [-1, 1]) M(h, tube([[s * r * 0.4, r * 0.7, -r * 0.2], [s * r * 1.5, r * 0.75, -r * 0.3], [s * r * 2.0, r * 1.5, -r * 0.2], [s * r * 1.6, r * 2.1, 0]], (t) => 0.032 * (1 - 0.75 * t), 14, 8), plain('#3a3532'), undefined);
      const beard = M(h, tube([[0, -r * 0.6, r * 0.6], [0, -r * 1.4, r * 0.9], [0, -r * 2.0, r * 0.8]], (t) => [0.03, 0.05 * (1 - 0.5 * t)], 10, 8), coatMat('gnu'), 5); } }),
};
// 아기 코끼리는 따로: 큰 머리 · 코 · 부채 귀 · 굵은 다리
SPECIES.elephant = () => {
  const coat = coatMat('elephant'), root = new THREE.Group(), body = J(root);
  const cy = 0.82;
  M(body, tube([[0, cy, -0.52], [0, cy + 0.03, -0.15], [0, cy + 0.04, 0.2], [0, cy + 0.02, 0.5]], (t) => { const k = prof(t, 0.32); return [0.36 * k, 0.4 * k]; }, 28, 22), coat, 0);
  const legs = [];
  for (const [sx, f] of [[-1, 1], [1, 1], [-1, 0], [1, 0]]) { const hip = J(root, sx * 0.2, 0.66, f ? 0.3 : -0.3); M(hip, tube([[0, 0.15, 0], [0, -0.3, 0], [0, -0.6, 0.0]], (t) => 0.13 - 0.02 * t, 10, 14), coat, 1); M(hip, ell(0.105, 0.035, 0.08, 12), plain('#e8e0d4'), undefined, 0, -0.62, 0.06); legs.push({ hip, front: f, sx }); }
  const head = J(body, 0, cy + 0.16, 0.5);
  M(head, ell(0.3, 0.29, 0.27), coat, 3, 0, 0, 0.06);
  M(head, ell(0.12, 0.1, 0.1, 14), coat, 3, 0, 0.24, 0.02);
  const trunk = J(head, 0, -0.08, 0.26);
  M(trunk, tube([[0, 0.02, -0.04], [0, -0.14, 0.08], [0, -0.38, 0.12], [0, -0.58, 0.1], [0, -0.66, 0.16]], (t) => 0.1 * (1 - 0.55 * t), 24, 14), coat, 6);
  const eyes = [-1, 1].map((s) => eye(head, 0.026, s * 0.19, 0.07, 0.25, s * 0.6));
  const ears = [-1, 1].map((s) => { const e = J(head, s * 0.24, 0.04, -0.02); M(e, ell(0.05, 0.27, 0.24), coat, 3, s * 0.04, -0.02, -0.12); M(e, ell(0.02, 0.21, 0.18), coat, 5, s * 0.075, -0.02, -0.1).userData.noLine = true; e.rotation.y = s * 0.45; return e; });
  const tail = J(body, 0, cy + 0.22, -0.52); M(tail, tube([[0, 0, 0], [0, -0.2, -0.04], [0, -0.38, -0.02]], (t) => 0.025 * (1 - 0.4 * t), 8, 8), coat, 1); M(tail, ell(0.03, 0.06, 0.03), plain('#3a3432'), undefined, 0, -0.42, -0.02);
  bakeCoat(root); outlines(root);
  const ph = Math.random() * 9, st = { root, walk: 0, step: 0, legs };
  st.update = (t, dt) => { t += ph; body.scale.y = 1 + sin(t * 1.3) * 0.01; ears.forEach((e, i) => { e.rotation.y = (i ? 1 : -1) * (0.45 + sin(t * 2.2) * 0.35); }); trunk.rotation.x = sin(t * 0.9) * 0.18 + (st.drink ? 0.25 + max(0, sin(t * 0.6)) * 0.4 : 0); trunk.rotation.z = sin(t * 0.7) * 0.1; head.rotation.x = st.drink ? 0.25 : sin(t * 0.5) * 0.05; tail.rotation.z = sin(t * 2.4) * 0.4; const bl = (t % 4.2) < 0.12; eyes.forEach((e) => (e.scale.y = bl ? 0.1 : 1));
    st.step += dt * st.walk * 5; legs.forEach((l) => { const p = st.step + (l.front ? 0 : PI) + (l.sx > 0 ? PI : 0); l.hip.rotation.x = sin(p) * 0.3 * st.walk; }); };
  return st;
};

// =====================================================================
// 주인공 산책자: 6.5등신, 얼굴은 '나' 그림체로 그린 그림을 붙여요
// =====================================================================
function faceTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#f6dcc4'; x.fillRect(0, 0, 1024, 512);
  const cx = 256, ey = 268;
  x.fillStyle = 'rgba(240,150,140,0.45)'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(cx + s * 50, ey + 38, 20, 9, 0, 0, 7); x.fill(); }
  for (const s of [-1, 1]) {
    x.fillStyle = '#2a1d18'; x.beginPath(); x.ellipse(cx + s * 33, ey, 14, 20, 0, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(cx + s * 33 - 4, ey - 8, 4.8, 5.6, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(cx + s * 33 + 5, ey + 9, 2, 2.2, 0, 0, 7); x.fill();
    x.strokeStyle = '#4a3328'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx + s * 17, ey - 32); x.quadraticCurveTo(cx + s * 31, ey - 39, cx + s * 45, ey - 32); x.stroke();
  }
  x.strokeStyle = '#b07a64'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx + 2, ey + 18); x.lineTo(cx - 2, ey + 30); x.lineTo(cx + 3, ey + 30); x.stroke();
  x.strokeStyle = '#a0504a'; x.lineWidth = 3.4; x.beginPath(); x.moveTo(cx - 10, ey + 50); x.quadraticCurveTo(cx, ey + 56, cx + 10, ey + 50); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function walker() {
  const root = new THREE.Group(), SK = '#f6dcc4', HAIR = '#3b2a22', SH = '#f7f3ea', SKIRT = '#6f7d4c';
  const hips = J(root, 0, 0.86, 0);
  const legs = [-1, 1].map((s) => { const l = J(hips, s * 0.07, 0, 0); M(l, tube([[0, 0.04, 0], [0, -0.42, 0.0]], (t) => 0.062 - 0.012 * t, 8, 12), plain(SK)); const k = J(l, 0, -0.42, 0); M(k, tube([[0, 0.02, 0], [0, -0.38, -0.01]], (t) => 0.048 - 0.014 * t, 8, 12), plain(SK)); M(k, ell(0.05, 0.035, 0.1, 14), plain('#6a4430'), undefined, 0, -0.4, 0.035); return { l, k }; });
  const body = J(hips);
  const skirtG = new THREE.LatheGeometry(Array.from({ length: 14 }, (_, i) => { const t = i / 13; return new THREE.Vector2(0.13 + 0.2 * pow(t, 1.15) + (i === 13 ? -0.01 : 0), 0.1 - t * 0.6); }), S === 'low' ? 9 : 36);
  { const sp = skirtG.attributes.position, v = V(); for (let i = 0; i < sp.count; i++) { v.fromBufferAttribute(sp, i); const t = (0.1 - v.y) / 0.6, a = Math.atan2(v.x, v.z), k = 1 + sin(a * 9) * 0.045 * t; sp.setXYZ(i, v.x * k, v.y + sin(a * 9 + 1) * 0.012 * t, v.z * k); } skirtG.computeVertexNormals(); }
  const skirt = M(body, skirtG, plain(SKIRT, { side: THREE.DoubleSide }));
  M(body, tube([[0, 0.06, 0], [0, 0.2, 0.005], [0, 0.4, 0]], (t) => [0.135 + 0.025 * sin(PI * t * 0.9), 0.095 + 0.015 * t], 12, 18), plain(SH));
  M(body, ell(0.16, 0.06, 0.1, 18), plain(SH), undefined, 0, 0.4, 0);
  M(body, tube([[0, 0.38, 0], [0, 0.5, 0]], () => 0.038, 4, 10), plain(SK));
  const arms = [-1, 1].map((s) => { const a = J(body, s * 0.17, 0.39, 0); M(a, ell(0.06, 0.065, 0.06, 16), plain(SH), undefined, s * 0.01, -0.02, 0); M(a, tube([[0, -0.02, 0], [s * 0.01, -0.25, 0]], (t) => 0.034 - 0.006 * t, 8, 10), plain(SK)); const f = J(a, s * 0.01, -0.25, 0); M(f, tube([[0, 0, 0], [0, -0.21, 0.02]], (t) => 0.029 - 0.006 * t, 8, 10), plain(SK)); M(f, ell(0.03, 0.042, 0.022, 12), plain(SK), undefined, 0, -0.24, 0.02); a.rotation.z = s * 0.08; return { a, f }; });
  // 가방 · 끈
  const bag = J(body, 0.2, 0.0, 0.02); M(bag, new THREE.BoxGeometry(0.16, 0.13, 0.05, 2, 2, 1), plain('#a0683e')); M(bag, new THREE.BoxGeometry(0.165, 0.05, 0.055), plain('#8a5632'), undefined, 0, 0.045, 0.002);
  M(body, tube([[-0.13, 0.4, 0.07], [0, 0.26, 0.11], [0.15, 0.1, 0.08], [0.2, 0.05, 0.03]], () => [0.008, 0.012], 16, 6), plain('#7a4a2e'));
  // 머리
  const head = J(body, 0, 0.61, 0); head.scale.setScalar(1.12);
  const face = M(head, ell(0.104, 0.118, 0.1, 40), S === 'low' ? plain(SK) : (S === 'toon' ? new THREE.MeshToonMaterial({ map: faceTex(), gradientMap: GRAD3 }) : new THREE.MeshStandardMaterial({ map: faceTex(), roughness: 0.7 })), undefined, 0, 0.0, 0);
  face.rotation.y = 0;
  if (S === 'low') { for (const s of [-1, 1]) M(head, ell(0.012, 0.017, 0.008, 8), plain('#2a1d18'), undefined, s * 0.03, -0.005, 0.098).userData.noLine = true; }
  for (const s of [-1, 1]) M(head, ell(0.018, 0.026, 0.014, 10), plain(SK), undefined, s * 0.102, -0.005, 0.0);
  // 머리카락: 뒤로 길게 + 위를 덮는 모자 + 앞머리 몇 갈래
  const hairM = plain(HAIR, { side: THREE.DoubleSide });
  const back = J(head, 0, 0.02, -0.01);
  M(back, new THREE.LatheGeometry(Array.from({ length: 12 }, (_, i) => { const t = i / 11; return new THREE.Vector2(0.112 + 0.02 * t, 0.06 - t * 0.36); }), S === 'low' ? 8 : 28, PI * 0.62, PI * 0.76), hairM);
  M(head, new THREE.SphereGeometry(0.114, S === 'low' ? 10 : 32, S === 'low' ? 6 : 16, 0, PI * 2, 0, PI * 0.5), hairM, undefined, 0, 0.012, -0.01).rotation.x = -0.32;
  const bangs = []; for (let i = 0; i < 7; i++) { const a = -0.62 + i * 0.205; const b = J(head, sin(a) * 0.098, 0.1, cos(a) * 0.085); b.rotation.set(0.5, a, -a * 0.25); M(b, ell(0.026, 0.036, 0.016, 10), hairM, undefined, 0, -0.018, 0); bangs.push(b); }
  // 밀짚모자
  const hat = J(head, 0, 0.1, -0.005); hat.rotation.x = -0.12;
  M(hat, new THREE.CylinderGeometry(0.255, 0.262, 0.012, S === 'low' ? 10 : 44), plain('#e6c98a'));
  M(hat, new THREE.SphereGeometry(0.118, S === 'low' ? 10 : 30, S === 'low' ? 5 : 12, 0, PI * 2, 0, PI * 0.5), plain('#ecd296'), undefined, 0, 0.0, 0).scale.set(1, 0.72, 1);
  M(hat, new THREE.CylinderGeometry(0.119, 0.12, 0.028, S === 'low' ? 10 : 36, 1, true), plain('#c84a3e', { side: THREE.DoubleSide }), undefined, 0, 0.018, 0);
  const rib = J(hat, 0.05, 0.015, -0.11); const rb = M(rib, new THREE.BoxGeometry(0.03, 0.17, 0.006), plain('#c84a3e', { side: THREE.DoubleSide }), undefined, 0, -0.08, 0);
  outlines(root);
  const st = { root, walk: 0, step: 0 };
  st.update = (t, dt) => {
    st.step += dt * st.walk * 8.4; const p = st.step, w = st.walk;
    legs.forEach(({ l, k }, i) => { const q = p + i * PI; l.rotation.x = sin(q) * 0.42 * w; k.rotation.x = max(0, -sin(q - 0.9)) * 0.65 * w; });
    arms.forEach(({ a, f }, i) => { a.rotation.x = -sin(p + i * PI) * 0.35 * w + sin(t * 0.8 + i) * 0.03; f.rotation.x = -0.15 - 0.12 * w; });
    hips.position.y = 0.86 + abs(sin(p)) * 0.025 * w + sin(t * 1.5) * 0.003 * (1 - w);
    body.rotation.y = sin(p) * 0.06 * w;
    skirt.rotation.x = sin(p * 2) * 0.04 * w + sin(t * 1.9) * 0.02; skirt.rotation.z = sin(p) * 0.04 * w;
    head.rotation.set(sin(t * 0.5) * 0.03, sin(t * 0.33) * 0.18 * (1 - w), sin(t * 0.7) * 0.02);
    rib.rotation.x = 0.3 + sin(t * 3.4) * 0.25 + w * 0.4; bangs.forEach((b, i) => { b.rotation.z = sin(t * 2.1 + i) * 0.05; });
    back.rotation.x = 0.06 + w * 0.08 + sin(t * 1.6) * 0.03;
  };
  return st;
}

function skyDome(top, mid, hor, sunDir, glow) {
  return new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(top) }, uMid: { value: new THREE.Color(mid) }, uHor: { value: new THREE.Color(hor) }, uSun: { value: sunDir.clone().normalize() }, uGlow: { value: new THREE.Color(glow) } },
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uTop,uMid,uHor,uGlow,uSun; varying vec3 vD; void main(){ float h=clamp(vD.y,0.0,1.0); vec3 c=mix(uHor,uMid,smoothstep(0.0,0.16,h)); c=mix(c,uTop,smoothstep(0.16,0.7,h)); float s=max(dot(normalize(vD),uSun),0.0); c+=uGlow*(pow(s,6.0)*0.35+pow(s,200.0)*1.2); gl_FragColor=vec4(c,1.0);
      #include <colorspace_fragment>
    }` }));
}
function cloudTex(pal, seed, blur) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'), r = rng(seed), puffs = [];
  for (let i = 0; i < 60; i++) { const px = 60 + r() * 392, py = 160 - Math.sin((px - 60) / 392 * PI) * (55 + r() * 50) + r() * 22, rr = 16 + r() * 30; puffs.push([px, py, rr]); }
  x.filter = `blur(${blur}px)`;
  for (const [px, py, rr] of puffs) { const g = x.createRadialGradient(px, py + rr * 0.35, rr * 0.2, px, py + rr * 0.2, rr); g.addColorStop(0, pal[1]); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py + rr * 0.2, rr, 0, 7); x.fill(); }
  for (const [px, py, rr] of puffs) { const g = x.createRadialGradient(px - rr * 0.25, py - rr * 0.35, rr * 0.1, px, py, rr); g.addColorStop(0, pal[0]); g.addColorStop(0.7, pal[2]); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py - rr * 0.1, rr * 0.92, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const LOOK = {
  low: { top: '#5f9ed8', mid: '#a9cfe8', hor: '#eadfc4', glow: '#fff2d0', fog: '#e4dcc4', fogN: 60, fogF: 520, sun: V(-0.5, 0.75, 0.4), sunC: '#fff0d8', sunI: 2.3, hemi: ['#dceaf6', '#6b5a3c', 1.1], grassA: '#a8b85a', grassB: '#c8b86a', lush: '#7aa84a', far: '#b8b49a', exp: 1.0 },
  toon: { top: '#3f86d6', mid: '#86bdea', hor: '#e2eef0', glow: '#ffffff', fog: '#d8e6e8', fogN: 70, fogF: 560, sun: V(-0.4, 0.85, 0.35), sunC: '#ffffff', sunI: 1.9, hemi: ['#e4f0ff', '#7a8a50', 1.25], grassA: '#9cc45c', grassB: '#c4cc6a', lush: '#7ab84c', far: '#9eb4b8', exp: 1.0 },
  soft: { top: '#5a78b0', mid: '#d4aa8a', hor: '#ffd9a0', glow: '#ffe8b8', fog: '#ecd2a6', fogN: 40, fogF: 430, sun: V(0.75, 0.2, -0.65), sunC: '#ffd29a', sunI: 3.2, hemi: ['#ffe2c0', '#4a4a30', 0.85], grassA: '#a4a648', grassB: '#c8aa5a', lush: '#7e9a3a', far: '#b49a8a', exp: 1.05 },
};

// 아카시아 한 그루를 줄기 · 잎 두 덩이 도형으로 (여러 그루는 InstancedMesh 로)
function acaciaGeos(seed = 1) {
  const r = rng(seed), bark = [], leaf = [];
  bark.push(tube([[0, 0, 0], [0.1, 1.6, 0], [-0.1, 3.0, 0.1]], (t) => 0.22 - 0.1 * t, 8, 8));
  for (const [a, l] of [[0.6, 2.4], [-0.7, 2.2], [2.4, 1.9]]) bark.push(tube([[-0.1, 2.8, 0.1], [cos(a) * l * 0.5, 3.6, sin(a) * l * 0.5], [cos(a) * l, 4.1, sin(a) * l]], (t) => 0.13 - 0.07 * t, 6, 7));
  for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2 + r(), d = i ? 1.4 + r() * 1.0 : 0; const g = new THREE.SphereGeometry(1, 16, 10); g.scale(1.5 + r() * 0.6, 0.38 + r() * 0.12, 1.3 + r() * 0.5); g.translate(cos(a) * d, 4.25 + r() * 0.35, sin(a) * d); leaf.push(g); }
  const strip = (gs) => mergeGeometries(gs.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); return n; }));
  return { bark: strip(bark), leaf: strip(leaf) };
}
export { THREE, S, plain, tube, ell, M, J, V, rng, smooth, NOISE, coatMat, bakeCoat, SPECIES, walker, skyDome, cloudTex, LOOK, acaciaGeos };
