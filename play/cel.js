// 스냅주 그림 도구 + 초원 식구들 (게임용 묶음)
// 원본: docs/시안/_cel_engine.js (그림 도구) · docs/시안/_herd_tpl.html (가젤 · 얼룩말 · 아기 기린 · 누)
// 원본을 고치면 여기에도 같이 옮겨 주세요 (빌드 없이 브라우저에서 바로 읽어요)

// =====================================================================
// 그림 그리는 도구: 부위(part) 목록을 그림체(mode)에 맞춰 SVG로 칠해요
//  part = { d: [경로...], c: 색, x: '움직임 이름들', line, shade, s: 선색(선만), w: 굵기, a: 투명도, pat: 무늬 }
// =====================================================================
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, k) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * k).toString(16).padStart(2, '0')).join('');
const E = (cx, cy, rx, ry) => `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
let UID = 0;

const MODES = {
  // 셀: 그늘색을 깔고, 빛 받는 면을 위 · 왼쪽으로 밀어 덮어 칠하면 오른쪽 아래가 딱 끊긴 그늘이 돼요
  cel: (o) => ({
    part(p, id, defs) {
      const paths = (attr) => p.d.map((d) => `<path d="${d}" ${attr}/>`).join('');
      const op = p.a ? ` opacity="${p.a}"` : '';
      const line = p.line === 0 ? '' : paths(`fill="none" stroke="${o.ink}" stroke-width="${o.lw * (p.line ?? 1)}" stroke-linejoin="round"`);
      if (p.shade === false) return `<g${op}>${paths(`fill="${p.c}"`)}${line}</g>`;
      defs.push(`<clipPath id="${id}">${paths('')}</clipPath>`);
      const sh = mix(p.c, o.shadeTo, o.shadeK), [dx, dy] = o.shift;
      const hi = o.hi ? `<g clip-path="url(#${id})">${p.d.map((d) => `<path d="${d}" transform="translate(${-dx * 2.6} ${-dy * 2.6})" fill="none" stroke="${mix(p.c, '#ffffff', 0.35)}" stroke-width="${o.hi}"/>`).join('')}</g>` : '';
      return `<g${op}>${paths(`fill="${sh}"`)}<g clip-path="url(#${id})">${p.d.map((d) => `<path d="${d}" transform="translate(${-dx} ${-dy})" fill="${p.c}"/>`).join('')}</g>${hi}${line}</g>`;
    },
    stroke: (p) => p.d.map((d) => `<path d="${d}" fill="none" stroke="${p.s === 'ink' ? o.ink : p.s}" stroke-width="${p.w * o.sw}" stroke-linecap="round" stroke-linejoin="round"/>`).join(''),
  }),
  // 평면 그래픽: 선 없음, 색면 + 무늬
  flat: () => ({
    part(p, id, defs, sid) { return `<g${p.a ? ` opacity="${p.a}"` : ''}>${p.d.map((d) => `<path d="${d}" fill="${p.c}"/>` + (p.pat ? `<path d="${d}" fill="url(#${sid}_${p.pat})"/>` : '')).join('')}</g>`; },
    stroke: (p) => p.d.map((d) => `<path d="${d}" fill="none" stroke="${p.s}" stroke-width="${p.w}" stroke-linecap="round"/>`).join(''),
  }),
  // 연필 스케치: 색은 번지듯 살짝 어긋나게, 선은 흔들리는 연필로 두 번
  sketch: (o) => ({
    part(p, id, defs, sid) {
      const op = p.a ?? 1;
      defs.push(`<clipPath id="${id}">${p.d.map((d) => `<path d="${d}"/>`).join('')}</clipPath>`);
      const wash = p.d.map((d) => `<path d="${d}" fill="${mix(p.c, '#fbf6ea', 0.12)}" filter="url(#${sid}wash)" opacity="${op * 0.95}"/>`).join('');
      const shade = p.shade === false ? '' : `<g clip-path="url(#${id})" filter="url(#${sid}soft)">${p.d.map((d) => `<path d="${d}" transform="translate(9 10)" fill="none" stroke="${mix(p.c, '#4a4060', 0.28)}" stroke-width="14" opacity="0.55"/>`).join('')}</g>`;
      const line = p.line === 0 ? '' : p.d.map((d) => `<path d="${d}" fill="none" stroke="#4a3a30" stroke-width="1.15" opacity="0.8" filter="url(#${sid}pen)"/><path d="${d}" fill="none" stroke="#4a3a30" stroke-width="0.7" opacity="0.45" transform="translate(0.9 -0.7)" filter="url(#${sid}pen2)"/>`).join('');
      return `<g>${wash}${shade}${line}</g>`;
    },
    stroke: (p, sid) => p.d.map((d) => `<path d="${d}" fill="none" stroke="${p.s === 'ink' ? '#3a2c24' : p.s}" stroke-width="${p.w * 0.85}" stroke-linecap="round" filter="url(#${sid}pen)"/>`).join(''),
  }),
};
// 1 + 5 섞기: ①의 또렷한 두 단계 그늘 + ⑤의 연필선 · 종이결, 색은 둘의 가운데 (k 로 진하기 조절)
MODES.blend = (o) => ({
  part(p, id, defs, sid) {
    const paths = (attr) => p.d.map((d) => `<path d="${d}" ${attr}/>`).join('');
    const base = mix(p.c, '#fbf6ea', o.k), op = p.a ? ` opacity="${p.a}"` : '';
    const line = p.line === 0 ? '' : paths(`fill="none" stroke="#5a463a" stroke-width="${1.35 * (p.line ?? 1)}" opacity="0.85" stroke-linejoin="round" filter="url(#${sid}penL)"`);
    if (p.shade === false) return `<g${op}>${paths(`fill="${base}"`)}${line}</g>`;
    defs.push(`<clipPath id="${id}">${paths('')}</clipPath>`);
    if (p.over) {   // 줄무늬 · 얼룩: 몸 안에만 그리고, 그 위에 그늘을 반투명으로 덮어요
      defs.push(`<mask id="${id}m" maskUnits="userSpaceOnUse" x="-60" y="-60" width="420" height="480"><rect x="-60" y="-60" width="420" height="480" fill="#fff"/><g filter="url(#${sid}edge)">${p.d.map((d) => `<path d="${d}" transform="translate(-7 -8)" fill="#000"/>`).join('')}</g></mask>`);
      const ov = p.over.map((v) => v.d.map((d) => v.fill ? `<path d="${d}" fill="${mix(v.c, '#fbf6ea', o.k)}"/>` : `<path d="${d}" fill="none" stroke="${mix(v.c, '#fbf6ea', o.k)}" stroke-width="${v.w}" stroke-linecap="round" filter="url(#${sid}penL)"/>`).join('')).join('');
      return `<g${op}>${paths(`fill="${base}"`)}<g clip-path="url(#${id})">${ov}<g mask="url(#${id}m)">${paths(`fill="#3a3458" opacity="${o.shadeK * 1.15}"`)}</g></g>${line}</g>`;
    }
    const sh = mix(base, '#4a4468', o.shadeK);
    return `<g${op}>${paths(`fill="${sh}"`)}<g clip-path="url(#${id})"><g filter="url(#${sid}edge)">${p.d.map((d) => `<path d="${d}" transform="translate(-7 -8)" fill="${base}"/>`).join('')}</g></g>${line}</g>`;
  },
  stroke: (p, sid) => p.d.map((d) => `<path d="${d}" fill="none" stroke="${p.s === 'ink' ? '#4a3a30' : mix(p.s, '#fbf6ea', o.k * 0.5)}" stroke-width="${p.w}" stroke-linecap="round" filter="url(#${sid}penL)"/>`).join(''),
});
const MODE_DEFS = {
  blend: (s) => MODE_DEFS.sketch(s) + `<filter id="${s}penL" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="1.3"/></filter><filter id="${s}edge"><feGaussianBlur stdDeviation="0.9"/></filter>`,
  sketch: (s) => `<filter id="${s}pen" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter>
    <filter id="${s}pen2"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="8"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter>
    <filter id="${s}wash" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="5"/><feDisplacementMap in="SourceGraphic" scale="5"/><feGaussianBlur stdDeviation="0.6"/></filter>
    <filter id="${s}soft"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="${s}grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="2"/><feColorMatrix values="0 0 0 0 0.45 0 0 0 0 0.38 0 0 0 0 0.3 0 0 0 0.16 0"/></filter>`,
};

// 배경 무대 (그림체마다)
const STAGE = {
  none: () => '',
  nature: (s) => `<defs><linearGradient id="${s}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fc3ec"/><stop offset="0.62" stop-color="#d9eef5"/><stop offset="1" stop-color="#eef4dc"/></linearGradient></defs>
    <rect width="300" height="360" fill="url(#${s}sky)"/>
    <path d="M-10 92 C20 70 50 74 64 86 C80 66 120 66 132 86 C150 80 168 88 170 98 L-10 98 Z" fill="#ffffff" opacity="0.9"/><path d="M-10 98 L170 98 C160 104 20 106 -10 102 Z" fill="#c8d8ea"/>
    <path d="M0 262 C60 246 120 256 170 248 C220 240 262 250 300 244 L300 360 L0 360 Z" fill="#9cc66a"/><path d="M0 300 C80 288 200 296 300 286 L300 360 L0 360 Z" fill="#86b458"/>
    <path d="M0 262 C60 246 120 256 170 248 C220 240 262 250 300 244" fill="none" stroke="#6c9a44" stroke-width="1.4"/>`,
  soft: (s) => `<defs><linearGradient id="${s}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b4d6ee"/><stop offset="0.62" stop-color="#e6f1f2"/><stop offset="1" stop-color="#f3f3e0"/></linearGradient></defs>
    <rect width="300" height="360" fill="url(#${s}sky)"/>
    <g filter="url(#${s}wash)"><path d="M-10 92 C20 70 50 74 64 86 C80 66 120 66 132 86 C150 80 168 88 170 98 L-10 98 Z" fill="#ffffff" opacity="0.95"/></g>
    <path d="M0 262 C60 246 120 256 170 248 C220 240 262 250 300 244 L300 360 L0 360 Z" fill="#b6d48c"/><path d="M0 300 C80 288 200 296 300 286 L300 360 L0 360 Z" fill="#a4c87a"/>
    <path d="M0 262 C60 246 120 256 170 248 C220 240 262 250 300 244" fill="none" stroke="#7a9a58" stroke-width="1" opacity="0.7" filter="url(#${s}penL)"/>`,
  pop: (s) => `<rect width="300" height="360" fill="#fff3d8"/><circle cx="150" cy="150" r="120" fill="#ffe2a8"/><circle cx="150" cy="150" r="88" fill="#ffd690"/>
    <path d="M0 300 C70 288 230 288 300 300 L300 360 L0 360 Z" fill="#a8d878"/>`,
  graphic: (s) => `<defs><pattern id="${s}_dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1.6" fill="#ffffff" opacity="0.28"/></pattern>
      <pattern id="${s}_lines" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="3" height="8" fill="#ffffff" opacity="0.22"/></pattern>
      <pattern id="${s}_waves" width="24" height="12" patternUnits="userSpaceOnUse"><path d="M0 9 Q6 3 12 9 T24 9" fill="none" stroke="#e0a53a" stroke-width="2.2"/></pattern></defs>
    <rect width="300" height="360" fill="#f1e6cf"/><circle cx="222" cy="92" r="46" fill="#e0a53a"/><circle cx="222" cy="92" r="30" fill="#ecc070"/>
    <path d="M0 250 L60 196 L118 250 Z" fill="#2f5d50" opacity="0.18"/><path d="M80 250 L170 170 L260 250 Z" fill="#2f5d50" opacity="0.12"/>
    <rect y="300" width="300" height="60" fill="#2f5d50"/><rect y="300" width="300" height="60" fill="url(#${s}_lines)"/>`,
  sketch: (s) => `<rect width="300" height="360" fill="#f7f0e0"/>
    <g filter="url(#${s}wash)"><ellipse cx="90" cy="70" rx="90" ry="38" fill="#cfe3ef" opacity="0.7"/><ellipse cx="230" cy="110" rx="80" ry="30" fill="#dbe9f0" opacity="0.6"/><ellipse cx="150" cy="330" rx="190" ry="42" fill="#c9dda4" opacity="0.75"/></g>
    <path d="M14 312 C80 302 200 306 288 300" fill="none" stroke="#6a5a48" stroke-width="0.9" opacity="0.6" filter="url(#${s}pen2)"/>`,
};
const GRAIN = (s) => `<rect width="300" height="360" filter="url(#${s}grain)" style="mix-blend-mode:multiply"/>`;

function draw(model, modeName, opts, stage, attrs = '') {
  const sid = 's' + (UID++), defs = [MODE_DEFS[modeName] ? MODE_DEFS[modeName](sid) : ''];
  const M = MODES[modeName](opts || {});
  let body = '';
  model.parts.forEach((p, i) => {
    let inner = p.s ? M.stroke(p, sid) : M.part(p, sid + 'c' + i, defs, sid);
    for (const k of (p.x || '').split(' ').filter(Boolean).reverse()) { const o = model.o[k] || [150, 180]; inner = `<g class="${k}" style="transform-origin:${o[0]}px ${o[1]}px">${inner}</g>`; }
    body += inner;
  });
  const ground = model.ground ? model.ground(modeName, sid) : '';
  return `<svg viewBox="0 0 300 360" ${attrs} role="img" aria-label="${model.label}"><defs>${defs.join('')}</defs>${STAGE[stage](sid)}${ground}${body}${stage !== 'none' && (modeName === 'sketch' || modeName === 'blend') ? GRAIN(sid) : ''}</svg>`;
}
const shadowEl = (cx, cy, rx, col = '#3a5a2a', op = 0.22) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.12}" fill="${col}" opacity="${op}"/>`;

// =====================================================================
// 동물 ① 극장판 자연형: 실제 아기 코끼리 비율, 작은 눈, 주름, 가는 갈색 선
// =====================================================================
const ELE_NATURE = {
  label: '아기 코끼리',
  o: { breath: [150, 330], head: [222, 200], ear: [222, 150], tail: [60, 196], blink: [255, 140] },
  ground: () => shadowEl(160, 332, 110),
  parts: [
    { c: '#857e77', d: ['M98 236 C95 270 93 300 95 322 Q108 329 122 322 C122 298 122 268 125 240 Z', 'M196 240 C196 272 194 300 196 322 Q208 329 221 322 C222 298 223 270 223 244 Z'], x: 'breath' },
    { s: 'ink', w: 2.2, d: ['M61 196 C50 206 46 222 48 240'], x: 'breath tail' },
    { c: '#6a625c', d: ['M44 238 C44 250 52 252 54 240 Z'], x: 'breath tail', shade: false },
    { c: '#a39d95', d: ['M74 228 C70 262 70 298 72 326 Q88 334 104 326 C106 300 106 270 108 244 Z', 'M168 244 C166 278 166 302 168 328 Q184 336 200 328 C202 302 202 272 204 238 Z'], x: 'breath' },
    { c: '#a39d95', d: ['M58 206 C52 160 90 128 140 126 C188 124 222 146 228 186 C232 222 214 254 180 262 C150 268 104 268 80 252 C64 242 60 226 58 206 Z'], x: 'breath' },
    { c: '#e6dccd', d: ['M76 324 Q80 318 86 324 Z', 'M90 326 Q95 320 100 326 Z', 'M170 326 Q175 320 180 326 Z', 'M186 327 Q191 321 196 327 Z'], x: 'breath', shade: false, line: 0.6 },
    { s: '#7a7068', w: 1.1, d: ['M76 300 q14 4 28 0', 'M170 302 q14 4 28 0', 'M92 160 q10 -6 22 -4', 'M108 236 q4 10 2 18'], x: 'breath' },
    { c: '#a7a199', d: ['M196 128 C200 96 236 84 262 98 C284 110 292 140 288 168 C290 200 294 236 288 266 C286 284 288 300 296 306 C301 309 300 317 293 316 C281 315 273 300 276 280 C280 252 280 222 272 204 C262 212 246 214 232 210 C214 204 200 190 196 170 C192 156 192 142 196 128 Z'], x: 'breath head' },
    { s: '#7a7068', w: 1.1, d: ['M279 222 q7 2 12 -1', 'M279 234 q7 2 12 -1', 'M279 246 q7 2 11 -1', 'M278 258 q7 2 11 -1', 'M262 104 q8 4 12 12'], x: 'breath head' },
    { c: '#9a948c', d: ['M218 110 C190 98 164 116 160 146 C156 178 170 206 194 210 C210 212 222 198 222 176 C224 150 226 126 218 110 Z'], x: 'breath head ear' },
    { c: '#c9a49c', d: ['M212 122 C192 116 176 132 174 152 C172 176 182 194 198 196 C208 194 214 182 214 170 C216 150 218 132 212 122 Z'], x: 'breath head ear', line: 0, a: 0.75 },
    { s: 'ink', w: 1.4, d: ['M246 133 Q255 127 264 133'], x: 'breath head' },
    { c: '#2a201c', d: [E(255, 140, 3.8, 4.8)], x: 'breath head blink', shade: false, line: 0 },
    { c: '#ffffff', d: [E(254, 138.5, 1.2, 1.4)], x: 'breath head blink', shade: false, line: 0 },
    { s: 'ink', w: 1.3, d: ['M262 196 Q266 200 271 197'], x: 'breath head' },
    { s: 'ink', w: 1.2, d: ['M232 92 q-2 -8 3 -12', 'M240 90 q0 -9 6 -11', 'M248 91 q3 -7 9 -7'], x: 'breath head' },
  ],
};
// 동물 ② 클래식 표정형: 큰 머리 · 큰 홍채 눈 · 신나게 말아 올린 코
const ELE_CLASSIC = {
  label: '아기 코끼리',
  o: { breath: [150, 330], head: [196, 190], ear: [150, 140], flap2: [262, 140], trunk: [228, 182], tail: [70, 210], blink: [160, 128] },
  ground: () => shadowEl(150, 332, 96),
  parts: [
    { c: '#8f96a8', d: ['M100 250 C98 280 98 300 100 318 Q113 325 125 318 C125 300 127 278 127 256 Z', 'M172 252 C172 280 172 300 174 318 Q188 325 200 318 C200 298 200 276 198 252 Z'], x: 'breath' },
    { c: '#a8aec0', d: ['M74 214 C60 214 52 226 56 236 C60 244 68 240 66 232'], x: 'breath tail', shade: false, line: 1 },
    { c: '#a8aec0', d: ['M82 248 C78 278 80 304 84 324 Q99 332 113 324 C115 302 115 278 113 258 Z', 'M150 258 C148 286 150 306 152 326 Q167 334 181 326 C183 304 183 280 181 256 Z'], x: 'breath' },
    { c: '#a8aec0', d: ['M72 222 C66 182 98 158 140 158 C186 158 214 184 212 222 C210 256 182 274 142 274 C102 274 76 256 72 222 Z'], x: 'breath' },
    { c: '#f3ece4', d: ['M86 322 Q91 315 96 322 Z', 'M100 323 Q105 316 110 323 Z', 'M155 324 Q160 317 165 324 Z', 'M169 324 Q174 317 179 324 Z'], x: 'breath', shade: false, line: 0.7 },
    { c: '#a0a6b8', d: ['M152 106 C110 72 66 104 72 150 C78 194 120 210 150 186 Z'], x: 'breath head flap' },
    { c: '#f2b8c2', d: ['M144 116 C114 94 88 118 92 150 C96 180 124 190 144 174 Z'], x: 'breath head flap', line: 0 },
    { c: '#acb2c4', d: ['M138 128 C136 88 166 64 200 66 C238 68 262 98 258 136 C256 168 238 190 210 196 C182 202 152 190 142 166 C139 154 138 140 138 128 Z'], x: 'breath head' },
    { c: '#acb2c4', d: ['M210 178 C214 204 232 224 256 222 C278 220 290 200 282 186 C276 176 262 178 262 188 C262 196 270 198 268 204 C262 210 246 208 238 196 C232 186 232 176 232 166 Z'], x: 'breath head trunk' },
    { s: '#7c8296', w: 1.2, d: ['M240 206 q4 -4 2 -9', 'M252 210 q5 -3 4 -9', 'M264 206 q5 -1 6 -6'], x: 'breath head trunk' },
    { c: '#a0a6b8', d: ['M250 100 C290 76 316 118 304 156 C294 190 262 196 246 172 Z'], x: 'breath head flap2' },
    { c: '#f2b8c2', d: ['M256 112 C284 98 302 126 294 154 C286 178 266 182 254 166 Z'], x: 'breath head flap2', line: 0 },
    { c: '#ffffff', d: [E(178, 128, 15, 19), E(224, 128, 13, 18)], x: 'breath head blink', shade: false, line: 1 },
    { c: '#7a5232', d: [E(181, 131, 10, 13), E(226, 131, 9, 12.5)], x: 'breath head blink', shade: false, line: 0 },
    { c: '#1e1418', d: [E(182, 132, 5.5, 7.5), E(227, 132, 5, 7)], x: 'breath head blink', shade: false, line: 0 },
    { c: '#ffffff', d: [E(177, 125, 3.4, 4), E(186, 139, 1.6, 1.8), E(222, 125, 3, 3.6), E(230, 139, 1.4, 1.6)], x: 'breath head blink', shade: false, line: 0 },
    { s: 'ink', w: 3, d: ['M162 116 Q178 104 194 114', 'M211 114 Q224 105 238 114'], x: 'breath head blink' },
    { s: 'ink', w: 2.2, d: ['M164 100 Q176 94 188 98', 'M214 98 Q226 94 236 100'], x: 'breath head' },
    { c: '#ff9aa4', d: [E(164, 160, 11, 6), E(242, 160, 10, 5.5)], x: 'breath head', shade: false, line: 0, a: 0.55 },
    { c: '#c8605a', d: ['M196 172 Q206 186 216 174 Q206 178 196 172 Z'], x: 'breath head', shade: false, line: 0.8 },
    { s: 'ink', w: 2, d: ['M190 70 q-4 -12 4 -18', 'M200 68 q0 -13 9 -16', 'M210 70 q5 -10 13 -9'], x: 'breath head' },
  ],
};
// 동물 ③ 꼬마 마스코트형: 큰 머리 2등신, 굵은 선, 머리에 새싹
const ELE_CHIBI = {
  label: '아기 코끼리',
  o: { bounce: [150, 300], ear: [70, 140], flap2: [230, 140], trunk: [150, 172], blink: [150, 140], leaf: [150, 66] },
  ground: () => shadowEl(150, 302, 80, '#5a8a3a', 0.25),
  parts: [
    { c: '#b8b6cc', d: [E(112, 282, 15, 13), E(188, 282, 15, 13)], x: 'bounce' },
    { c: '#c6c4d8', d: ['M100 238 C96 208 120 194 150 194 C180 194 204 208 200 238 C198 266 180 282 150 282 C120 282 102 266 100 238 Z'], x: 'bounce' },
    { c: '#c6c4d8', d: [E(130, 286, 15, 13), E(170, 286, 15, 13)], x: 'bounce' },
    { c: '#c6c4d8', d: [E(68, 142, 42, 46)], x: 'bounce flap' },
    { c: '#ffb9c8', d: [E(72, 144, 26, 30)], x: 'bounce flap', line: 0, shade: false },
    { c: '#c6c4d8', d: [E(232, 142, 42, 46)], x: 'bounce flap2' },
    { c: '#ffb9c8', d: [E(228, 144, 26, 30)], x: 'bounce flap2', line: 0, shade: false },
    { c: '#6cc06a', d: ['M150 70 C148 56 156 46 172 46 C172 60 164 70 150 70 Z', 'M150 70 C150 60 142 54 132 56 C134 66 142 70 150 70 Z'], x: 'bounce leaf' },
    { c: '#cecce0', d: [E(150, 140, 80, 72)], x: 'bounce' },
    { c: '#cecce0', d: ['M138 168 C136 196 140 214 150 222 C160 230 178 226 176 212 C174 202 162 204 162 212 C156 206 158 192 162 168 Z'], x: 'bounce trunk' },
    { c: '#22181e', d: [E(118, 138, 11, 13), E(182, 138, 11, 13)], x: 'bounce blink', shade: false, line: 0 },
    { c: '#ffffff', d: [E(114, 132, 4.4, 5), E(178, 132, 4.4, 5), E(122, 144, 2, 2.2), E(186, 144, 2, 2.2)], x: 'bounce blink', shade: false, line: 0 },
    { c: '#ff8fa8', d: [E(100, 166, 13, 7), E(200, 166, 13, 7)], x: 'bounce', shade: false, line: 0, a: 0.6 },
    { s: 'ink', w: 3.4, d: ['M126 172 Q132 178 138 174', 'M162 174 Q168 178 174 172'], x: 'bounce' },
  ],
};
// 동물 ④ 그래픽 평면형: 선 없이 도형 · 색면 · 무늬
const ELE_GRAPHIC = {
  label: '아기 코끼리',
  o: { breath: [150, 300], head: [228, 180], ear: [214, 150], trunk: [262, 178], tail: [62, 238], blink: [246, 140] },
  parts: [
    { c: '#5e6c7c', d: ['M86 236 h26 v66 a4 4 0 0 1 -4 4 h-18 a4 4 0 0 1 -4 -4 Z', 'M196 236 h26 v66 a4 4 0 0 1 -4 4 h-18 a4 4 0 0 1 -4 -4 Z'], x: 'breath' },
    { s: '#7d8b9b', w: 5, d: ['M64 236 C50 246 48 262 54 274'], x: 'breath tail' },
    { c: '#7d8b9b', d: ['M58 252 C58 182 108 150 160 150 C212 150 244 190 244 252 Z'], pat: 'dots', x: 'breath' },
    { c: '#7d8b9b', d: ['M70 240 h28 v70 a4 4 0 0 1 -4 4 h-20 a4 4 0 0 1 -4 -4 Z', 'M176 240 h28 v70 a4 4 0 0 1 -4 4 h-20 a4 4 0 0 1 -4 -4 Z'], x: 'breath' },
    { c: '#f1e6cf', d: ['M70 302 h28 v8 a4 4 0 0 1 -4 4 h-20 a4 4 0 0 1 -4 -4 Z', 'M176 302 h28 v8 a4 4 0 0 1 -4 4 h-20 a4 4 0 0 1 -4 -4 Z'], x: 'breath' },
    { s: '#7d8b9b', w: 17, d: ['M262 172 C282 206 256 236 268 268 C274 286 292 290 296 274'], x: 'breath head trunk' },
    { s: '#9aa8b6', w: 2, d: ['M266 214 h10', 'M262 228 h10', 'M262 242 h10'], x: 'breath head trunk' },
    { c: '#8b99a8', d: [E(232, 146, 46, 44)], x: 'breath head' },
    { c: '#c8553d', d: ['M214 112 C172 112 160 170 200 196 C210 172 218 140 214 112 Z'], pat: 'lines', x: 'breath head ear' },
    { c: '#f8f0e0', d: ['M236 140 Q248 130 260 140 Q248 148 236 140 Z'], x: 'breath head blink' },
    { c: '#1e2a2e', d: [E(250, 140, 4, 4)], x: 'breath head blink' },
    { c: '#c8553d', d: [E(262, 162, 7, 4)], x: 'breath head', a: 0.6 },
  ],
};

// =====================================================================
// 인물 ① 극장판 자연형: 6.5등신, 단순한 눈, 가방 멘 산책자
// =====================================================================
const WALK_NATURE = {
  label: '밀짚모자 산책자',
  o: { breath: [150, 330], head: [151, 96], hair: [151, 40], ribbon: [174, 36], skirt: [151, 150], arm: [186, 130], blink: [151, 62] },
  ground: () => shadowEl(152, 338, 56),
  parts: [
    { c: '#c84a3e', d: ['M174 36 C184 46 190 60 196 72 L190 75 C184 63 176 51 170 41 Z'], x: 'breath head ribbon' },
    { c: '#3b2a22', d: ['M124 58 C120 30 136 18 152 18 C170 18 184 32 180 58 C182 84 186 104 182 120 C168 126 134 126 120 120 C116 102 122 80 124 58 Z'], x: 'breath head hair' },
    { c: '#f2d2b6', d: ['M141 236 L138 330 L149 330 L151 236 Z', 'M155 236 L156 330 L167 330 L165 236 Z'] },
    { c: '#6a4430', d: ['M131 336 C131 327 150 326 150 332 L150 339 L131 339 Z', 'M155 332 C155 326 175 327 175 336 L175 339 L155 339 Z'] },
    { c: '#6f7d4c', d: ['M126 150 C118 190 108 240 104 286 C126 297 176 297 198 286 C194 240 184 190 176 150 Z'], x: 'breath skirt' },
    { s: '#55613a', w: 1.1, d: ['M140 190 C136 226 132 258 130 290', 'M164 190 C168 226 172 258 174 290'], x: 'breath skirt' },
    { c: '#f2d2b6', d: ['M114 128 C109 150 107 176 109 196 L117 196 C118 176 121 152 125 132 Z', E(113, 200, 5, 7)], x: 'breath' },
    { c: '#f2d2b6', d: ['M188 128 C193 150 195 176 193 196 L185 196 C184 176 181 152 177 132 Z', E(189, 200, 5, 7)], x: 'breath arm' },
    { c: '#f7f3ea', d: ['M128 104 C138 98 164 98 174 104 C180 124 180 146 176 156 C160 162 142 162 126 156 C122 146 122 124 128 104 Z', 'M129 104 C115 104 109 118 113 131 C119 135 127 133 131 126 Z', 'M173 104 C187 104 193 118 189 131 C183 135 175 133 171 126 Z'], x: 'breath' },
    { s: '#8a5a34', w: 3, d: ['M134 104 L184 172'], x: 'breath' },
    { c: '#a0683e', d: ['M176 166 L204 166 L206 196 C196 200 186 200 178 196 Z'], x: 'breath arm' },
    { c: '#f2d2b6', d: ['M145 84 L145 101 L157 101 L157 84 Z'], x: 'breath' },
    { s: 'ink', w: 1.2, d: ['M141 101 L151 111 L161 101'], x: 'breath' },
    { c: '#f2d2b6', d: ['M128 60 C128 38 140 30 151 30 C164 30 174 40 174 60 C174 76 166 90 151 92 C138 92 128 78 128 60 Z', E(128, 65, 3.5, 6), E(174, 65, 3.5, 6)], x: 'breath head' },
    { c: '#3b2a22', d: ['M125 64 C121 34 140 22 152 24 C168 24 183 36 177 64 C173 54 167 46 159 44 C157 52 151 56 145 58 C147 50 145 46 141 44 C135 48 130 54 125 64 Z'], x: 'breath head' },
    { c: '#e6c98a', d: ['M96 40 C110 30 192 30 206 40 C196 49 106 49 96 40 Z'], x: 'breath head' },
    { c: '#ecd296', d: ['M126 38 C126 16 176 16 176 38 C160 41 142 41 126 38 Z'], x: 'breath head' },
    { c: '#c84a3e', d: ['M126 31 C142 34 160 34 176 31 L176 37 C160 40 142 40 126 37 Z'], x: 'breath head', shade: false },
    { c: '#2a1d18', d: [E(142, 63, 2.8, 4), E(160, 63, 2.8, 4)], x: 'breath head blink', shade: false, line: 0 },
    { c: '#ffffff', d: [E(141.2, 61.6, 0.9, 1.1), E(159.2, 61.6, 0.9, 1.1)], x: 'breath head blink', shade: false, line: 0 },
    { s: '#4a3328', w: 1.2, d: ['M137 55 Q142 53 147 55', 'M155 55 Q160 53 165 55', 'M151 68 L149.5 73 L152 73', 'M147.5 79 Q151 81 154.5 79'], x: 'breath head' },
    { c: '#f0a090', d: [E(137, 72, 4.5, 2.2), E(165, 72, 4.5, 2.2)], x: 'breath head', shade: false, line: 0, a: 0.55 },
  ],
};
// 인물 ② 클래식 표정형: 큰 눈 · 바람에 날리는 머리와 치마 · 모자를 누르는 손
const WALK_CLASSIC = {
  label: '밀짚모자 산책자',
  o: { breath: [150, 330], head: [152, 118], hair: [150, 60], ribbon: [178, 50], skirt: [150, 176], blink: [152, 86] },
  ground: () => shadowEl(156, 340, 58),
  parts: [
    { c: '#c84a3e', d: ['M176 48 C196 52 216 46 232 36 L235 44 C218 56 198 60 176 57 Z', 'M178 52 C196 60 210 70 222 70 L222 77 C206 78 192 68 177 59 Z'], x: 'breath head ribbon' },
    { c: '#4a2e22', d: ['M118 80 C110 40 134 28 156 30 C182 32 196 52 192 80 C204 100 226 116 248 118 C234 132 210 132 196 124 C200 140 196 156 186 164 C168 168 134 166 120 158 C112 136 116 104 118 80 Z'], x: 'breath head hair' },
    { c: '#f4d4bc', d: ['M141 290 L139 334 L150 334 L152 290 Z', 'M160 290 L162 334 L173 334 L170 290 Z'] },
    { c: '#7a4a32', d: ['M131 340 C131 331 150 330 150 336 L150 342 L131 342 Z', 'M162 336 C162 330 182 331 182 340 L182 342 L162 342 Z'] },
    { c: '#5f7a4e', d: ['M132 176 C122 212 110 252 100 292 C130 304 198 306 226 284 C208 254 190 214 172 176 Z'], x: 'breath skirt' },
    { s: '#4a6040', w: 1.4, d: ['M146 200 C140 236 132 266 124 298', 'M162 200 C172 236 186 262 200 294'], x: 'breath skirt' },
    { c: '#f4d4bc', d: ['M177 142 C187 162 190 186 190 206 L182 206 C180 188 176 166 170 150 Z', E(186, 210, 6, 8)], x: 'breath' },
    { c: '#f4d4bc', d: ['M130 140 C118 130 108 112 106 96 L114 92 C118 108 126 122 136 132 Z', 'M106 98 C106 86 108 76 112 66 L120 68 C116 78 114 88 114 96 Z'], x: 'breath' },
    { c: '#fbf6ec', d: ['M128 136 C138 128 166 128 176 136 C182 154 176 170 172 180 C160 186 144 186 132 180 C128 168 122 154 128 136 Z', E(129, 140, 12, 13), E(176, 141, 12, 14)], x: 'breath' },
    { c: '#c84a3e', d: ['M130 176 C144 182 160 182 174 176 L173 184 C160 189 144 189 131 184 Z'], x: 'breath', shade: false },
    { c: '#f4d4bc', d: ['M144 114 L144 132 L160 132 L160 114 Z'], x: 'breath' },
    { c: '#f4d4bc', d: ['M122 82 C122 56 136 44 152 44 C170 44 182 58 182 82 C182 104 170 118 152 120 C136 120 122 106 122 82 Z'], x: 'breath head' },
    { c: '#4a2e22', d: ['M119 88 C112 48 140 34 160 38 C184 42 192 64 185 90 C180 76 172 64 160 59 C152 70 138 78 125 84 Z'], x: 'breath head' },
    { c: '#e8cb8c', d: ['M96 58 C108 40 196 32 212 48 C202 62 110 70 96 58 Z'], x: 'breath head' },
    { c: '#efd398', d: ['M128 54 C126 26 178 22 180 48 C162 54 144 56 128 54 Z'], x: 'breath head' },
    { c: '#c84a3e', d: ['M128 46 C146 48 164 46 180 42 L180 48 C164 53 146 55 128 53 Z'], x: 'breath head', shade: false },
    { c: '#f4d4bc', d: [E(116, 64, 8, 7)], x: 'breath' },
    { c: '#ffffff', d: [E(140, 86, 8, 10), E(166, 86, 7.5, 10)], x: 'breath head blink', shade: false, line: 0.8 },
    { c: '#6b4a2e', d: [E(141, 88, 6, 7.6), E(167, 88, 5.6, 7.6)], x: 'breath head blink', shade: false, line: 0 },
    { c: '#1c1214', d: [E(141.5, 89, 3.2, 4.2), E(167.5, 89, 3, 4.2)], x: 'breath head blink', shade: false, line: 0 },
    { c: '#ffffff', d: [E(138.5, 84.5, 2, 2.4), E(164.5, 84.5, 1.9, 2.3), E(143.5, 92, 0.9, 1)], x: 'breath head blink', shade: false, line: 0 },
    { s: 'ink', w: 2.6, d: ['M131 81 Q140 74 149 80 L151 78', 'M158 80 Q166 74 175 80 L177 78'], x: 'breath head blink' },
    { s: '#4a2e22', w: 1.8, d: ['M132 72 Q140 68 148 71', 'M158 71 Q166 68 174 72'], x: 'breath head' },
    { s: 'ink', w: 1.2, d: ['M154 94 Q152 99 155 100'], x: 'breath head' },
    { c: '#c8605a', d: ['M145 106 Q154 114 162 106 Q154 109 145 106 Z'], x: 'breath head', shade: false, line: 0.6 },
    { c: '#f39a90', d: [E(134, 100, 6, 3), E(172, 100, 6, 3)], x: 'breath head', shade: false, line: 0, a: 0.55 },
  ],
};
// 인물 ③ 꼬마 마스코트형: 2.5등신
const WALK_CHIBI = {
  label: '밀짚모자 산책자',
  o: { bounce: [150, 296], hair: [150, 80], ribbon: [196, 70], blink: [150, 136], skirt: [150, 186] },
  ground: () => shadowEl(150, 300, 66, '#5a8a3a', 0.25),
  parts: [
    { c: '#d0503e', d: ['M194 70 C208 82 214 98 220 112 L212 116 C206 102 198 88 188 76 Z'], x: 'bounce ribbon' },
    { c: '#4a3026', d: ['M84 120 C80 60 120 40 150 40 C182 40 222 62 216 122 C220 160 214 190 204 202 C180 208 120 208 96 202 C86 186 80 160 84 120 Z'], x: 'bounce hair' },
    { c: '#f6d8c0', d: ['M136 262 L134 288 L146 288 L148 262 Z', 'M152 262 L154 288 L166 288 L164 262 Z'], x: 'bounce' },
    { c: '#7a4a32', d: [E(139, 292, 11, 6.5), E(161, 292, 11, 6.5)], x: 'bounce' },
    { c: '#728a4e', d: ['M122 192 C112 216 104 240 100 262 C120 272 180 272 200 262 C196 240 188 216 178 192 Z'], x: 'bounce skirt' },
    { c: '#f6d8c0', d: ['M118 196 C104 208 100 226 106 236 C112 240 118 234 120 224 Z', 'M182 196 C196 208 200 226 194 236 C188 240 182 234 180 224 Z'], x: 'bounce' },
    { c: '#fbf6ec', d: ['M122 184 C134 176 166 176 178 184 L182 212 C160 218 140 218 118 212 Z', E(118, 196, 12, 12), E(182, 196, 12, 12)], x: 'bounce' },
    { c: '#f6d8c0', d: ['M92 126 C92 80 118 64 150 64 C182 64 208 80 208 126 C208 162 184 182 150 182 C116 182 92 162 92 126 Z'], x: 'bounce' },
    { c: '#4a3026', d: ['M88 126 C80 72 120 54 150 54 C184 54 222 74 212 126 C204 108 192 96 178 92 C176 106 166 114 154 116 C156 106 154 98 148 94 C140 106 126 114 110 116 C114 106 114 100 112 94 C100 102 92 114 88 126 Z'], x: 'bounce' },
    { c: '#ecd296', d: ['M56 84 C78 60 222 60 244 84 C228 99 72 99 56 84 Z'], x: 'bounce' },
    { c: '#f2da9e', d: ['M100 78 C100 36 200 36 200 78 C168 84 132 84 100 78 Z'], x: 'bounce' },
    { c: '#d0503e', d: ['M100 66 C132 72 168 72 200 66 L200 76 C168 82 132 82 100 76 Z'], x: 'bounce', shade: false },
    { c: '#2a1c18', d: [E(124, 138, 9, 12), E(176, 138, 9, 12)], x: 'bounce blink', shade: false, line: 0 },
    { c: '#ffffff', d: [E(121, 133, 3.6, 4.2), E(173, 133, 3.6, 4.2), E(127, 144, 1.6, 1.8), E(179, 144, 1.6, 1.8)], x: 'bounce blink', shade: false, line: 0 },
    { c: '#ff9a94', d: [E(108, 160, 12, 6), E(192, 160, 12, 6)], x: 'bounce', shade: false, line: 0, a: 0.55 },
    { s: 'ink', w: 3, d: ['M143 160 Q150 166 157 160'], x: 'bounce' },
  ],
};
// 인물 ④ 그래픽 평면형: 8등신 길쭉한 도형, 무늬 치마
const WALK_GRAPHIC = {
  label: '밀짚모자 산책자',
  o: { breath: [150, 330], head: [150, 76], skirt: [150, 150], ribbon: [168, 30], blink: [150, 60], hair: [150, 40] },
  parts: [
    { c: '#c8553d', d: ['M166 30 L190 64 L184 68 L162 34 Z'], x: 'breath head ribbon' },
    { c: '#3a2a26', d: ['M124 60 C122 30 138 22 150 22 C164 22 180 30 178 60 L180 86 L160 80 L158 54 C152 58 142 60 132 58 L134 80 L120 86 Z'], x: 'breath head hair' },
    { c: '#f0c9a8', d: ['M139 296 L137 336 L143 336 L145 296 Z', 'M156 296 L158 336 L164 336 L162 296 Z'] },
    { c: '#2b2420', d: [E(140, 338, 7, 3.4), E(161, 338, 7, 3.4)] },
    { c: '#2f5d50', d: ['M128 148 L172 148 L206 300 L94 300 Z'], pat: 'waves', x: 'breath skirt' },
    { c: '#f0c9a8', d: ['M133 96 L116 176 L122 178 L139 100 Z', 'M167 96 L184 176 L178 178 L161 100 Z', E(119, 180, 4.4, 5.4), E(181, 180, 4.4, 5.4)], x: 'breath' },
    { c: '#f8f0dc', d: ['M134 92 L166 92 L174 150 L126 150 Z'], x: 'breath' },
    { c: '#f0c9a8', d: ['M146 74 L154 74 L154 94 L146 94 Z'], x: 'breath' },
    { c: '#f0c9a8', d: [E(150, 58, 20, 22)], x: 'breath head' },
    { c: '#3a2a26', d: ['M128 54 C128 36 140 32 150 32 C162 32 174 38 172 54 C164 46 152 44 140 48 Z'], x: 'breath head' },
    { c: '#e0a53a', d: [E(150, 36, 46, 8)], x: 'breath head' },
    { c: '#ecc070', d: ['M130 36 L132 16 Q150 10 168 16 L170 36 Z'], x: 'breath head' },
    { c: '#c8553d', d: ['M131 28 L169 28 L170 34 L130 34 Z'], x: 'breath head' },
    { c: '#1e2a2e', d: [E(143, 61, 2, 2.6), E(157, 61, 2, 2.6)], x: 'breath head blink' },
    { c: '#c8553d', d: [E(140, 69, 4, 2.6), E(160, 69, 4, 2.6)], x: 'breath head', a: 0.45 },
    { s: '#7a3a2a', w: 1.4, d: ['M147 72 Q150 74 153 72'], x: 'breath head' },
  ],
};


// ===== 초원 식구들 (그림체 '나') =====
const NA = { k: 0.22, shadeK: 0.24 };   // 그림체 '나'
const groundShadow = (cx, rx) => () => shadowEl(cx, 332, rx, '#4a6a3a', 0.2);

// =====================================================================
// 톰슨가젤: 가는 다리, 옆구리 검은 줄, 흰 배, 고리 무늬 뿔. 가끔 고개 숙여 풀 뜯기
// =====================================================================
const GAZELLE = {
  label: '톰슨가젤',
  o: { breath: [150, 330], graze: [204, 178], ear: [222, 100], wag: [84, 182], blink: [240, 108] },
  ground: groundShadow(140, 80),
  parts: [
    { c: '#a8794a', d: ['M106 212 C110 238 106 262 109 288 L111 326 L117 326 L117 288 C119 262 123 238 121 212 Z', 'M180 212 L183 270 L183 326 L189 326 L189 270 L192 212 Z'], x: 'breath' },
    { c: '#3a2a22', d: ['M110 324 h8 v5 h-8 Z', 'M182 324 h8 v5 h-8 Z'], shade: false, line: 0 },
    { c: '#3a2a22', d: ['M86 180 C77 186 75 196 77 205 L82 204 C82 196 84 190 90 185 Z'], x: 'breath wag', shade: false },
    { c: '#d0a068', d: ['M84 194 C80 170 100 158 130 160 C160 162 186 156 204 166 C216 174 214 200 206 214 C196 228 160 230 128 228 C104 228 88 216 84 194 Z'], x: 'breath',
      over: [{ fill: true, c: '#f6f0e4', d: ['M80 214 C120 222 170 222 214 208 L214 240 L80 240 Z', 'M80 200 C80 180 86 168 96 164 C94 180 96 196 102 210 Z'] }, { fill: true, c: '#3a2a22', d: ['M96 205 C130 213 170 213 210 199 L210 206 C170 220 130 220 96 212 Z'] }] },
    { c: '#d0a068', d: ['M92 200 C90 230 100 246 102 268 L100 326 L108 326 L110 268 C112 244 114 226 116 208 Z', 'M166 212 L170 270 L168 326 L176 326 L178 270 L180 212 Z'], x: 'breath' },
    { c: '#3a2a22', d: ['M100 324 h8 v5 h-8 Z', 'M168 324 h8 v5 h-8 Z'], shade: false, line: 0 },
    { c: '#d0a068', d: ['M194 178 C202 152 212 128 220 110 L240 118 C232 140 222 164 210 188 Z'], x: 'breath graze', over: [{ fill: true, c: '#f6f0e4', d: ['M204 186 C214 164 226 140 236 118 L244 122 C234 146 222 170 212 192 Z'] }] },
    { c: '#c49660', d: ['M219 104 C212 88 210 76 214 66 C223 74 228 88 228 102 Z'], x: 'breath graze ear' },
    { s: '#3a3028', w: 3, d: ['M228 98 C225 82 227 66 234 56', 'M233 99 C233 84 237 72 244 64'], x: 'breath graze' },
    { s: '#f0e6d0', w: 1, d: ['M226 88 h4', 'M226 80 h4', 'M228 72 h4', 'M234 88 h4', 'M235 80 h4', 'M238 72 h4'], x: 'breath graze' },
    { c: '#d6a66c', d: ['M218 104 C228 94 244 96 250 104 C258 114 266 124 266 132 C266 138 258 141 252 139 C244 137 234 131 226 125 C218 119 214 110 218 104 Z'], x: 'breath graze',
      over: [{ c: '#4a3426', w: 2.6, d: ['M232 112 C242 118 252 126 262 134'] }, { fill: true, c: '#f6f0e4', d: [E(240, 108, 6, 5)] }] },
    { c: '#c49660', d: ['M226 104 C220 90 220 78 226 70 C232 80 234 92 232 104 Z'], x: 'breath graze ear' },
    { c: '#2a201c', d: [E(240, 108, 3, 3.6), E(265, 132, 2.4, 2)], x: 'breath graze blink', shade: false, line: 0 },
    { c: '#ffffff', d: [E(239.2, 106.8, 1, 1.1)], x: 'breath graze blink', shade: false, line: 0 },
  ],
};
// =====================================================================
// 얼룩말: 다부진 몸, 굽은 줄무늬, 짧게 선 갈기. 꼬리를 휙휙
// =====================================================================
const Z_STRIPE = '#2e2a2c';
const ZEBRA = {
  label: '얼룩말',
  o: { breath: [150, 330], head: [206, 176], ear: [226, 92], swish: [80, 166], blink: [238, 112] },
  ground: groundShadow(146, 84),
  parts: [
    { c: '#d8d4cc', d: ['M108 206 C112 236 108 262 110 286 L110 326 L120 326 L121 286 C123 262 126 236 126 206 Z', 'M186 208 L189 268 L188 326 L198 326 L200 268 L202 206 Z'], x: 'breath', over: [{ c: Z_STRIPE, w: 4, d: ['M106 244 h20', 'M106 262 h20', 'M106 280 h20', 'M106 298 h20', 'M184 244 h20', 'M184 262 h20', 'M184 280 h20', 'M184 298 h20'] }] },
    { c: '#2a2426', d: ['M109 322 h12 v7 h-12 Z', 'M187 322 h12 v7 h-12 Z'], shade: false, line: 0 },
    { s: '#e8e4dc', w: 4, d: ['M80 168 C70 180 68 198 70 212'], x: 'breath swish' },
    { c: '#2a2426', d: ['M64 208 C64 222 76 224 76 208 Z'], x: 'breath swish', shade: false },
    { c: '#f2efe8', d: ['M78 180 C76 150 104 138 140 140 C176 142 200 140 214 152 C226 164 222 196 212 210 C200 224 160 226 128 224 C98 222 80 206 78 180 Z'], x: 'breath',
      over: [{ c: Z_STRIPE, w: 6, d: ['M112 140 C106 170 108 200 116 226', 'M130 138 C124 170 126 200 132 228', 'M148 138 C142 170 144 200 150 228', 'M166 140 C160 170 162 200 168 228', 'M184 142 C178 170 180 196 186 224', 'M200 146 C196 168 196 192 202 216', 'M78 166 C92 168 100 160 104 148', 'M78 184 C94 186 104 176 108 162', 'M84 202 C98 204 108 194 112 180'] }] },
    { c: '#f2efe8', d: ['M90 196 C88 228 100 246 102 266 L100 326 L112 326 L114 266 C116 240 118 222 120 206 Z', 'M172 208 L174 268 L172 326 L184 326 L186 268 L188 206 Z'], x: 'breath', over: [{ c: Z_STRIPE, w: 4.5, d: ['M90 222 h30', 'M94 240 h26', 'M98 258 h20', 'M98 276 h20', 'M98 294 h20', 'M170 228 h20', 'M170 246 h20', 'M170 264 h20', 'M170 282 h20', 'M170 300 h20'] }] },
    { c: '#2a2426', d: ['M99 322 h14 v7 h-14 Z', 'M171 322 h14 v7 h-14 Z'], shade: false, line: 0 },
    { c: '#f2efe8', d: ['M196 158 C204 132 214 112 224 98 L250 110 C240 134 228 160 214 180 Z'], x: 'breath head', over: [{ c: Z_STRIPE, w: 5.5, d: ['M196 162 L224 174', 'M202 146 L232 158', 'M208 130 L238 142', 'M214 116 L244 128'] }] },
    { c: '#3a3234', d: ['M193 150 C199 126 209 106 219 92 L229 96 C219 110 209 130 203 154 Z'], x: 'breath head', shade: false },
    { s: '#f2efe8', w: 1.6, d: ['M199 138 l6 2', 'M203 124 l6 2', 'M208 112 l6 2', 'M213 101 l6 2'], x: 'breath head' },
    { c: '#f2efe8', d: ['M220 92 C232 84 246 88 252 98 C262 116 272 134 274 148 C276 158 266 164 256 160 C246 156 236 146 228 132 C220 118 214 102 220 92 Z'], x: 'breath head',
      over: [{ c: Z_STRIPE, w: 3.4, d: ['M226 108 L242 100', 'M230 120 L250 110', 'M236 132 L256 122'] }, { fill: true, c: '#3a3234', d: ['M258 136 C268 138 276 148 276 156 C272 166 258 164 252 156 Z'] }] },
    { c: '#e8e4dc', d: ['M222 92 C218 78 220 68 226 62 C231 72 231 84 229 94 Z'], x: 'breath head ear' },
    { c: '#2a201c', d: [E(238, 112, 3.2, 3.8)], x: 'breath head blink', shade: false, line: 0 },
    { c: '#ffffff', d: [E(237.2, 110.6, 1, 1.1)], x: 'breath head blink', shade: false, line: 0 },
  ],
};
// =====================================================================
// 아기 기린: 긴 목과 다리, 그물 얼룩, 뿔 두 개 끝은 털뭉치
// =====================================================================
const G_SPOT = '#b0703c';
const GIRAFFE = {
  label: '아기 기린',
  o: { breath: [150, 330], head: [196, 186], ear: [210, 50], wag: [102, 176], blink: [230, 56], chew: [252, 76] },
  ground: groundShadow(150, 70),
  parts: [
    { c: '#d8a858', d: ['M124 200 C126 226 124 246 125 264 L124 326 L131 326 L132 264 C133 246 136 226 136 204 Z', 'M196 204 L198 262 L197 326 L204 326 L205 262 L208 204 Z'], x: 'breath', over: [{ fill: true, c: G_SPOT, d: [E(130, 230, 4, 6), E(202, 228, 4, 6)] }] },
    { c: '#3a2a22', d: ['M123 323 h9 v6 h-9 Z', 'M196 323 h9 v6 h-9 Z'], shade: false, line: 0 },
    { s: '#d8a858', w: 2.4, d: ['M102 176 C96 190 94 206 96 220'], x: 'breath wag' },
    { c: '#3a2a22', d: ['M92 218 C92 230 100 232 100 218 Z'], x: 'breath wag', shade: false },
    { c: '#eec070', d: ['M100 176 C100 156 120 148 150 150 C180 152 200 156 206 172 C212 190 204 210 186 216 C160 222 128 220 112 212 C102 204 100 190 100 176 Z'], x: 'breath',
      over: [{ fill: true, c: G_SPOT, d: ['M110 164 L124 156 L134 166 L126 180 L112 178 Z', 'M138 160 L154 154 L162 166 L152 178 L140 174 Z', 'M166 160 L182 158 L188 172 L176 182 L166 174 Z', 'M118 188 L134 184 L140 198 L128 208 L116 202 Z', 'M146 184 L162 182 L168 196 L156 208 L144 200 Z', 'M174 188 L190 184 L198 198 L186 208 L174 202 Z', 'M104 170 L108 184 L102 192 Z'] }] },
    { c: '#eec070', d: ['M108 196 C106 222 112 240 112 260 L110 326 L118 326 L120 260 C122 240 124 220 124 206 Z', 'M182 206 L184 262 L182 326 L190 326 L192 262 L194 204 Z'], x: 'breath', over: [{ fill: true, c: G_SPOT, d: [E(116, 222, 4.5, 6), E(188, 222, 4.5, 6), E(115, 246, 3.5, 5), E(188, 246, 3.5, 5)] }] },
    { c: '#3a2a22', d: ['M109 323 h10 v6 h-10 Z', 'M181 323 h10 v6 h-10 Z'], shade: false, line: 0 },
    { c: '#eec070', d: ['M184 172 C192 132 202 94 210 62 L228 68 C220 100 210 138 202 180 Z'], x: 'breath head',
      over: [{ fill: true, c: G_SPOT, d: ['M194 160 L204 152 L208 166 L200 174 Z', 'M198 134 L208 126 L212 140 L204 148 Z', 'M204 108 L212 100 L216 114 L208 122 Z', 'M208 84 L216 78 L220 90 L212 96 Z', 'M186 172 L194 168 L196 180 Z'] }] },
    { s: '#a0602e', w: 3, d: ['M186 160 C192 126 200 96 208 64'], x: 'breath head' },
    { c: '#e4b468', d: ['M212 50 C202 46 196 40 195 35 C204 35 211 41 215 46 Z'], x: 'breath head ear' },
    { s: '#c08a48', w: 3.2, d: ['M217 45 L215 30', 'M226 43 L226 29'], x: 'breath head' },
    { c: '#3a2a22', d: [E(215, 28, 3.6, 3.6), E(226, 27, 3.6, 3.6)], x: 'breath head', shade: false },
    { c: '#f2c878', d: ['M206 52 C214 40 232 40 240 48 C248 56 258 64 260 72 C262 80 254 85 246 83 C236 81 226 75 218 69 C210 63 202 58 206 52 Z'], x: 'breath head',
      over: [{ fill: true, c: '#f8e4b8', d: ['M244 66 C254 66 262 74 260 80 C254 86 244 82 240 76 Z'] }, { fill: true, c: G_SPOT, d: [E(220, 52, 4, 3)] }] },
    { c: '#2a201c', d: [E(230, 56, 3.4, 4)], x: 'breath head blink', shade: false, line: 0 },
    { c: '#ffffff', d: [E(229.1, 54.5, 1.1, 1.2)], x: 'breath head blink', shade: false, line: 0 },
    { s: '#5a4030', w: 1.2, d: ['M254 78 q3 2 6 0'], x: 'breath head chew' },
  ],
};
// =====================================================================
// 누: 앞이 높은 어깨, 긴 얼굴, 수염과 갈기, 소처럼 휜 뿔
// =====================================================================
const GNU = {
  label: '누',
  o: { breath: [150, 330], head: [200, 160], ear: [222, 132], swish: [84, 176], blink: [240, 148] },
  ground: groundShadow(150, 86),
  parts: [
    { c: '#5a5450', d: ['M106 210 C110 236 106 260 108 284 L108 326 L116 326 L117 284 C119 260 122 236 122 210 Z', 'M188 210 L190 268 L190 326 L198 326 L199 268 L202 210 Z'], x: 'breath' },
    { c: '#2a2624', d: ['M107 322 h10 v7 h-10 Z', 'M189 322 h10 v7 h-10 Z'], shade: false, line: 0 },
    { s: '#6a6460', w: 3.2, d: ['M84 176 C74 188 72 208 76 224'], x: 'breath swish' },
    { c: '#2e2a28', d: ['M70 220 C68 238 82 240 82 222 Z'], x: 'breath swish', shade: false },
    { c: '#8a827c', d: ['M84 186 C82 166 96 156 122 158 C150 160 172 144 196 146 C214 148 222 170 218 196 C214 214 198 222 170 224 C140 226 108 224 94 214 C86 206 84 196 84 186 Z'], x: 'breath',
      over: [{ c: '#6a625c', w: 3, d: ['M160 154 C158 180 160 204 164 224', 'M172 150 C170 176 172 202 176 224', 'M184 148 C182 174 184 200 188 222', 'M196 148 C194 172 196 196 200 220'] }] },
    { c: '#7a726c', d: ['M90 196 C88 226 98 244 100 264 L98 326 L106 326 L108 264 C110 240 112 222 114 206 Z', 'M172 210 L174 268 L172 326 L180 326 L182 268 L186 208 Z'], x: 'breath' },
    { c: '#2a2624', d: ['M97 322 h10 v7 h-10 Z', 'M171 322 h10 v7 h-10 Z'], shade: false, line: 0 },
    { c: '#3a3432', d: ['M222 168 C226 186 230 198 236 208 C226 208 218 198 214 182 Z'], x: 'breath head' },
    { c: '#8a827c', d: ['M196 156 C206 140 220 130 232 128 C244 126 250 134 252 146 C256 166 262 186 262 200 C262 209 254 213 246 208 C236 202 226 186 218 174 C210 166 200 166 196 156 Z'], x: 'breath head',
      over: [{ fill: true, c: '#3e3836', d: ['M250 184 C256 190 262 198 263 206 L263 216 L242 216 C243 204 246 192 250 184 Z'] }, { c: '#5a524e', w: 4, d: ['M246 140 C250 156 254 170 256 184'] }] },
    { s: '#2e2a28', w: 5, d: ['M192 150 C202 136 214 126 228 122'], x: 'breath head' },
    { c: '#7a726c', d: ['M224 134 C216 134 210 130 207 125 C215 123 221 127 226 131 Z'], x: 'breath head ear' },
    { s: '#3a3532', w: 3.6, d: ['M232 128 C224 122 222 112 228 106 C234 102 240 106 238 112', 'M242 128 C248 118 256 114 264 116'], x: 'breath head' },
    { c: '#2a201c', d: [E(240, 148, 3, 3.6)], x: 'breath head blink', shade: false, line: 0 },
    { c: '#ffffff', d: [E(239.2, 146.6, 1, 1.1)], x: 'breath head blink', shade: false, line: 0 },
  ],
};

