// 스냅주 아이콘: 이모지 대신 직접 그린 그림 (금화와 같은 만화체, 진한 외곽선 + 납작한 색). 48×48 칸
const O = 'stroke="#4a3424" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"';
const svg = (s) => `<svg class="ic" viewBox="0 0 48 48" aria-hidden="true">${s}</svg>`;
const cam = (b, t) => svg(`<path d="M6 16h9l3-5h12l3 5h9v22H6z" fill="${b}" ${O}/><path d="M6 16h36v6H6z" fill="${t}" ${O}/><circle cx="24" cy="29" r="8" fill="#cfe6f2" ${O}/><circle cx="24" cy="29" r="3.500" fill="#4a3424"/>`);
const hat = (brim, top, band) => svg(`<ellipse cx="24" cy="32" rx="20" ry="6" fill="${brim}" ${O}/><path d="M12 31c0-11 5-17 12-17s12 6 12 17z" fill="${top}" ${O}/><path d="M12 28c7 3 17 3 24 0v3c-7 3-17 3-24 0z" fill="${band}" ${O}/>`);
// 옷 그림: 윗옷 + 치마/바지 위에 모양마다 조금씩 덧그려요
export function lookIcon(L, skirt = true) {
  const k = L.kind || '', top = L.shirt, low = L.skirt, sk = L.low ? L.low === 'skirt' : skirt, band = L.band;
  const sleeve = L.long ? 'M16 12L6 24l5 5 5-5z M32 12l10 12-5 5-5-5z' : 'M16 12L7 19l4 6 5-3z M32 12l9 7-4 6-5-3z';
  let over = '';
  if (k === 'stripe') over = `<path d="M16 19h16v4H16zM16 27h16v4H16z" fill="${L.pat}"/>`;
  if (k === 'dots') over = [[20, 20], [28, 24], [21, 29]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="2" fill="${L.pat}"/>`).join('');
  if (k === 'hood') over = `<path d="M18 13c2-5 10-5 12 0-3 3-9 3-12 0z" fill="${band}" ${O}/><path d="M19 27h10v6H19z" fill="${band}" ${O}/>`;
  if (k === 'overall') over = `<path d="M19 21h10v13H19z" fill="${low}" ${O}/><path d="M20 21l-1-8M28 21l1-8" stroke="${low}" stroke-width="3"/>`;
  if (k === 'dress') over = `<path d="M19 13c3 3 7 3 10 0" fill="none" stroke="${band}" stroke-width="3"/>`;
  if (k === 'vest') over = `<path d="M16 13h6v21h-6zM26 13h6v21h-6z" fill="${band}" ${O}/><path d="M17 26h4v4h-4zM27 26h4v4h-4z" fill="${L.bag}"/>`;
  if (k === 'rain') over = `<path d="M18 13c2-5 10-5 12 0-3 3-9 3-12 0z" fill="${band}" ${O}/><circle cx="24" cy="22" r="1.6" fill="#fff"/><circle cx="24" cy="29" r="1.6" fill="#fff"/>`;
  if (k === 'sailor') over = `<path d="M16 12h16l-8 12z" fill="${band}" ${O}/><path d="M21 24l3 3 3-3-3-1z" fill="#c84a3e"/>`;
  if (k === 'suit') over = `<path d="M19 12h10l-5 13z" fill="#fff" ${O}/><path d="M23 15h2l1 8-2 3-2-3z" fill="${band}"/>`;
  if (k === 'hanbok') over = `<path d="M18 12l9 11M30 12l-9 11" stroke="${band}" stroke-width="3" fill="none"/><path d="M24 22l-3 9M24 22l4 8" stroke="${band}" stroke-width="2.4"/>`;
  const coat = k === 'rain' ? top : low, lower = sk || k === 'rain' ? `<path d="M16 33h16l5 ${k === 'dress' || k === 'hanbok' ? 12 : 9}H11z" fill="${coat}" ${O}/>` : `<path d="M16 33h16l1 12h-7l-2-7-2 7h-7z" fill="${low}" ${O}/>`;
  return svg(`${lower}<path d="${sleeve}" fill="${top}" ${O}/><path d="M16 12c3 3 13 3 16 0v22H16z" fill="${top}" ${O}/>${over}`);
}
// 머리색 그림: 얼굴에 머리카락을 씌워요
export const hairIcon = (c) => svg(`<path d="M9 42c-3-14-2-32 15-33 17 1 18 19 15 33z" fill="${c}" ${O}/><circle cx="24" cy="26" r="11" fill="#f6dcc4" ${O}/><path d="M12 24c2-9 8-12 12-12s10 3 12 12c-5-1-8-3-11-7-2 4-7 6-13 7z" fill="${c}" ${O}/><circle cx="20" cy="28" r="1.5" fill="#3a2a20"/><circle cx="28" cy="28" r="1.5" fill="#3a2a20"/>`);
const band = (c, x) => svg(`<path d="M8 36C8 18 15 12 24 12s16 6 16 24" fill="none" stroke="#4a3424" stroke-width="7" stroke-linecap="round"/><path d="M8 36C8 18 15 12 24 12s16 6 16 24" fill="none" stroke="${c}" stroke-width="3.6" stroke-linecap="round"/>${x}`);
export const ICON = {
  // 모자 (HATS 순서)
  hat0: hat('#e8cf8e', '#f2dfa8', '#3f7a5a'), hat1: svg(`<path d="M10 30c0-11 6-17 14-17s14 6 14 17z" fill="#4f7ac8" ${O}/><path d="M30 28c6 0 12 2 14 6-6 1-14 0-20-2z" fill="#3a5fa8" ${O}/>`),
  hat2: svg(`<path d="M10 33c0-13 6-20 14-20s14 7 14 20z" fill="#c8704a" ${O}/><path d="M8 32h32v7H8z" fill="#e8a070" ${O}/><circle cx="24" cy="11" r="4" fill="#f2c8a0" ${O}/>`),
  hat3: hat('#a8784a', '#c8965a', '#5a3a20'), hat4: svg(`<path d="M6 30c6-8 30-8 36 0" fill="none" ${O}/>${[[10, 26, '#f2a0b8'], [18, 21, '#f2d24a'], [28, 21, '#f28a6a'], [37, 26, '#c8a0e8']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="5.500" fill="${c}" ${O}/>`).join('')}`),
  hat5: svg(`<circle cx="24" cy="24" r="16" fill="#f6efe2" ${O}/><path d="M13 35l22-22" ${O}/>`),
  hat6: svg(`<path d="M6 28c0-11 12-16 22-14 9 2 15 8 13 14-2 5-33 6-35 0z" fill="#8a3a4a" ${O}/><path d="M24 14l1-6" ${O}/><path d="M9 32h30" ${O}/>`),
  hat7: svg(`<path d="M7 36L5 14l11 9 8-13 8 13 11-9-2 22z" fill="#f2c84a" ${O}/><circle cx="24" cy="29" r="3.4" fill="#d83a4a" ${O}/><circle cx="13" cy="30" r="2" fill="#3a7ad8"/><circle cx="35" cy="30" r="2" fill="#3a7ad8"/>`),
  hat8: svg(`<ellipse cx="24" cy="38" rx="21" ry="6" fill="#3f3a78" ${O}/><path d="M12 37L27 5l9 32z" fill="#4f4a98" ${O}/><path d="M13 32l21-1 1 6-23 1z" fill="#f2c84a" ${O}/><circle cx="26" cy="20" r="2" fill="#f2d860"/>`),
  hat9: band('#f2a8c0', `<path d="M16 16C10 6 12 2 15 2s7 5 7 11z" fill="#fbf6ee" ${O}/><path d="M32 16c6-10 4-14 1-14s-7 5-7 11z" fill="#fbf6ee" ${O}/>`),
  hat10: band('#6a5a60', `<path d="M9 22L8 5l13 7z" fill="#4a4048" ${O}/><path d="M39 22l1-17-13 7z" fill="#4a4048" ${O}/><path d="M12 15l0-6 5 3zM36 15l0-6-5 3z" fill="#f2a8c0"/>`),
  hat11: band('#e85a7a', `<path d="M24 12L10 5v14zM24 12l14-7v14z" fill="#e85a7a" ${O}/><circle cx="24" cy="12" r="4" fill="#c83a5a" ${O}/>`),
  hat12: svg(`<path d="M9 34C11 16 22 7 33 9c5 1 8 6 8 11-4-3-8-3-11-2 3 5 4 11 4 16z" fill="#d04040" ${O}/><path d="M6 33h31v8H6z" fill="#fbf8f0" ${O}/><circle cx="41" cy="23" r="4.4" fill="#fbf8f0" ${O}/>`),
  hat13: svg(`<path d="M9 28C9 4 39 4 39 28" fill="none" stroke="#4a3424" stroke-width="6"/><path d="M5 26h10v15H5zM33 26h10v15H33z" fill="#e85a5a" ${O}/>`),
  hat14: svg(`<path d="M13 28C5 26 6 14 14 15c1-8 19-8 20 0 8-1 9 11 1 13v12H13z" fill="#fbf8f0" ${O}/><path d="M13 33h22" ${O}/>`),
  hat15: svg(`<path d="M4 32C5 16 14 8 24 8s19 8 20 24z" fill="#d0403a" ${O}/><path d="M16 32h16v9H16z" fill="#f6efe2" ${O}/><circle cx="15" cy="22" r="3.4" fill="#fff"/><circle cx="29" cy="17" r="4" fill="#fff"/><circle cx="36" cy="26" r="2.4" fill="#fff"/>`),
  hat16: svg(`<path d="M3 30C8 28 13 16 24 16s16 12 21 14c-6 8-36 8-42 0z" fill="#3a3640" ${O}/><path d="M9 32c8 4 22 4 30 0" fill="none" stroke="#f2c84a" stroke-width="2.4"/><circle cx="24" cy="25" r="3.4" fill="#fbf8f0" ${O}/>`),
  hat17: svg(`<path d="M9 30c0-11 7-17 15-17s15 6 15 17z" fill="#d04a40" ${O}/><path d="M26 30c7-1 14 1 18 6-8 2-18 1-24-3z" fill="#fbf8f0" ${O}/><path d="M18 18h9v8h-9z" fill="#fbf8f0" ${O}/>`),
  // 액세서리 (ACCS 순서)
  acc0: svg(`<circle cx="24" cy="24" r="16" fill="#f6efe2" ${O}/><path d="M13 35l22-22" ${O}/>`),
  acc1: svg(`<circle cx="14" cy="25" r="9" fill="#e8f4fa" ${O}/><circle cx="34" cy="25" r="9" fill="#e8f4fa" ${O}/><path d="M23 24c1-2 1-2 2 0" ${O}/>`),
  acc2: svg(`<path d="M4 18h18l-2 12c-1 4-12 4-13 0zM26 18h18l-3 12c-1 4-12 4-13 0zM22 20h4" fill="#2a2a32" ${O}/>`),
  acc3: svg(`<path d="M9 14c9 7 21 7 30 0l3 9c-11 7-25 7-36 0z" fill="#d05a50" ${O}/><path d="M28 23h10v20H28z" fill="#d05a50" ${O}/><path d="M29 38h8M29 33h8" stroke="#fbe8d0" stroke-width="2"/>`),
  acc4: svg(`<path d="M24 24L6 13v22zM24 24l18-11v22z" fill="#d04a50" ${O}/><circle cx="24" cy="24" r="5" fill="#a02a38" ${O}/>`),
  acc5: svg(`<path d="M24 24C14 8 4 12 5 24s11 15 19 0zM24 24c10-16 20-12 19 0s-11 15-19 0z" fill="#ee7a9a" ${O}/><circle cx="24" cy="24" r="5" fill="#c84a70" ${O}/>`),
  acc6: svg(`<path d="M8 12c2 34 30 34 32 0" fill="none" stroke="#4a3424" stroke-width="2"/>${[[9, 18, '#f2a0b8'], [12, 29, '#f2d24a'], [20, 37, '#fbf8f0'], [29, 37, '#c8a8f0'], [36, 29, '#f6b07a'], [39, 18, '#f2a0b8']].map(([a, b, c]) => `<circle cx="${a}" cy="${b}" r="5.4" fill="${c}" ${O}/>`).join('')}`),
  acc7: svg(`<path d="M12 18c0-14 24-14 24 0v24H12z" fill="#d0705a" ${O}/><path d="M16 28h16v10H16z" fill="#b8584a" ${O}/><path d="M18 8c1-5 11-5 12 0" fill="none" ${O}/>`),
  acc8: svg(`<path d="M10 5l26 24" fill="none" stroke="#4a3424" stroke-width="5"/><path d="M14 24h24v14c0 5-24 5-24 0z" fill="#b07a4a" ${O}/><path d="M14 24h24v7H14z" fill="#8a5a3a" ${O}/>`),
  acc9: svg(`<path d="M16 7h16l10 35c-11 4-25 4-36 0z" fill="#c84a5a" ${O}/><path d="M16 7c3 4 13 4 16 0" fill="none" stroke="#f2c84a" stroke-width="3.4"/>`),
  acc10: svg(`<path d="M24 22C16 4 4 4 4 14s10 12 20 8zM24 22C32 4 44 4 44 14s-10 12-20 8z" fill="#b8a0f0" ${O}/><path d="M24 22C14 24 10 32 13 37s10 2 11-15zM24 22c10 2 14 10 11 15s-10 2-11-15z" fill="#f2a8d0" ${O}/>`),
  acc11: svg(`<path d="M10 30c0-11 8-16 16-14 2-5 10-5 12 1 1 3 0 6-2 8-2 8-9 12-16 11l-9 6z" fill="#f2c82a" ${O}/><path d="M38 16l7 2-7 3z" fill="#e8803a" ${O}/><circle cx="32" cy="17" r="1.8" fill="#2a2020"/><path d="M15 28c5-2 10-1 13 3-5 3-11 2-13-3z" fill="#e0a818" ${O}/>`),
  // 사진기
  cam_basic: cam('#4a4442', '#c8b490'), cam_instant: cam('#f2ece0', '#e8765a'), cam_vintage: cam('#8a5e3e', '#e0c890'), cam_mono: cam('#2e2e32', '#a8a8a8'), cam_pastel: cam('#f2b8c8', '#bfe0d8'),
  cam_tele: svg(`<path d="M4 18h18v18H4z" fill="#4a4e54" ${O}/><path d="M22 20h20v14H22z" fill="#e8e2d4" ${O}/><path d="M38 18h6v18h-6z" fill="#4a4e54" ${O}/>`),
  // 가구
  plant: svg(`<path d="M15 30h18l-2 13H17z" fill="#c8704a" ${O}/><path d="M24 30C14 26 12 16 16 8c8 3 11 12 8 22zM24 30c0-9 5-15 13-16 1 8-4 15-13 16z" fill="#5fa04f" ${O}/>`),
  lamp: svg(`<path d="M15 8h18l5 16H10z" fill="#f2d24a" ${O}/><path d="M24 24v16" ${O}/><path d="M15 42h18" ${O}/>`),
  teddy: svg(`<circle cx="13" cy="12" r="5" fill="#b07a4a" ${O}/><circle cx="35" cy="12" r="5" fill="#b07a4a" ${O}/><circle cx="24" cy="19" r="12" fill="#c8905a" ${O}/><ellipse cx="24" cy="36" rx="11" ry="9" fill="#c8905a" ${O}/><ellipse cx="24" cy="23" rx="5" ry="4" fill="#f0d8b8"/><circle cx="19" cy="17" r="1.800" fill="#4a3424"/><circle cx="29" cy="17" r="1.800" fill="#4a3424"/>`),
  round: svg(`<ellipse cx="24" cy="26" rx="20" ry="13" fill="#d88a9a" ${O}/><ellipse cx="24" cy="26" rx="12" ry="7" fill="#f2c8d0" ${O}/>`),
  desk: svg(`<path d="M5 22h38v5H5z" fill="#b8844e" ${O}/><path d="M9 27v15M39 27v15" ${O}/><path d="M16 8h16v12H16z" fill="#3a3e48" ${O}/>`),
  fish: svg(`<path d="M6 14h36v26H6z" fill="#9fd8ee" ${O}/><path d="M16 27c5-6 12-6 15 0-3 6-10 6-15 0z" fill="#f2a23a" ${O}/><path d="M31 27l6-4v8z" fill="#f2a23a" ${O}/>`),
  piano: svg(`<path d="M6 10h36v16H6z" fill="#3a3436" ${O}/><path d="M6 26h36v9H6z" fill="#fbf6ea" ${O}/><path d="M14 26v9M22 26v9M30 26v9" ${O}/><path d="M10 35v8M38 35v8" ${O}/>`),
  fire: svg(`<path d="M6 12h36v30H6z" fill="#b8604a" ${O}/><path d="M14 42V24c0-6 20-6 20 0v18z" fill="#3a2a26" ${O}/><path d="M24 40c-6 0-7-6-3-10 0 3 2 3 3-2 4 4 7 12 0 12z" fill="#f2a23a" ${O}/>`),
  // 동작
  sit: svg(`<path d="M12 8v18h24v16M12 26v16" fill="none" ${O}/><path d="M10 24h28v6H10z" fill="#c8965a" ${O}/>`),
  pet: svg(`<path d="M10 30c-3-8 2-13 6-9V10a3 3 0 0 1 6 0v9-11a3 3 0 0 1 6 0v11-8a3 3 0 0 1 6 0v12-5a3 3 0 0 1 6 0v12c0 10-7 14-15 14-8 0-12-3-15-14z" fill="#f2c8a0" ${O}/>`),
  feed: svg(`<path d="M20 14c6-2 12 2 11 9L16 42c-2 2-5-1-4-3z" fill="#f28a3a" ${O}/><path d="M25 13c0-5 3-8 8-9 1 4 0 7-3 9 3-1 7 0 9 3-4 2-8 1-11-1z" fill="#5fa04f" ${O}/>`),
  kite: svg(`<path d="M24 4l14 18-14 14L10 22z" fill="#e8553d" ${O}/><path d="M24 4v32M10 22h28" ${O}/><path d="M24 36c-3 3 3 4 0 7" fill="none" ${O}/>`),
  bug: svg(`<path d="M24 24C18 10 4 10 6 20c1 6 10 8 18 4zM24 24c6-14 20-14 18-4-1 6-10 8-18 4z" fill="#f2a23a" ${O}/><path d="M24 24c-6 2-10 12-6 14 3 1 5-5 6-10 1 5 3 11 6 10 4-2 0-12-6-14z" fill="#f2c84a" ${O}/><path d="M24 15v18" ${O}/>`),
  dance: svg(`<circle cx="24" cy="10" r="5" fill="#f2c8a0" ${O}/><path d="M24 16v14l-8 12M24 30l9 11M24 20L12 13M24 20l13-3" fill="none" ${O}/>`),
  jump: svg(`<circle cx="24" cy="9" r="5" fill="#f2c8a0" ${O}/><path d="M24 15v13l-9 6M24 28l9 6M24 19L13 10M24 19l11-9" fill="none" ${O}/><path d="M10 43h28" ${O}/>`),
  bed: svg(`<path d="M6 16v26M42 26v16" ${O}/><path d="M6 32h36v6H6z" fill="#8a5e3a" ${O}/><path d="M6 22h36v10H6z" fill="#e88a7a" ${O}/><path d="M9 18h12v6H9z" fill="#fff6e6" ${O}/>`),
  sofa: svg(`<path d="M10 16h28v14H10z" fill="#5a8a7a" ${O}/><path d="M4 22h8v18H4zM36 22h8v18h-8z" fill="#4f7a6a" ${O}/><path d="M12 28h24v12H12z" fill="#6fa08f" ${O}/>`),
  book: svg(`<path d="M24 12c-5-4-12-4-18-2v28c6-2 13-2 18 2 5-4 12-4 18-2V10c-6-2-13-2-18 2z" fill="#fbf6ea" ${O}/><path d="M24 12v28" ${O}/>`),
  tea: svg(`<path d="M10 20h24v12c0 7-5 10-12 10s-12-3-12-10z" fill="#fbf6ea" ${O}/><path d="M34 23c8-2 8 10-1 9" fill="none" ${O}/><path d="M17 15c-2-3 2-4 0-8M26 15c-2-3 2-4 0-8" fill="none" ${O}/>`),
  deco: svg(`<path d="M36 6l6 6-20 20-8 2 2-8z" fill="#f2c84a" ${O}/><path d="M6 42c4-8 8-3 12-6" fill="none" ${O}/>`),
  leave: svg(`<path d="M12 42V6h20v36" fill="#b8784a" ${O}/><path d="M6 42h36" ${O}/><circle cx="26" cy="25" r="2" fill="#f2c84a" ${O}/>`),
  // 뱃지 · 장소
  camera: cam('#4a4442', '#f2c84a'), film: svg(`<path d="M8 8h32v32H8z" fill="#4a4442" ${O}/><path d="M14 16h20v16H14z" fill="#cfe6f2" ${O}/>`),
  gallery: svg(`<path d="M6 10h36v28H6z" fill="#cfe6f2" ${O}/><path d="M6 34l12-12 8 8 6-6 10 10v4H6z" fill="#7aa85a" ${O}/><circle cx="33" cy="17" r="3.500" fill="#f2c84a" ${O}/>`),
  star: svg(`<path d="M24 5l6 13 14 2-10 10 2 14-12-7-12 7 2-14L4 20l14-2z" fill="#f2c84a" ${O}/>`),
  stars: svg(`<path d="M16 11l4 9 9 1-7 7 2 9-8-5-8 5 2-9-7-7 9-1z" fill="#f2c84a" ${O}/><path d="M35 6l2 5 5 1-4 4 1 5-4-3-5 3 1-5-3-4 5-1z" fill="#ffe08a" ${O}/>`),
  dex: svg(`<path d="M10 6h28v36H14a4 4 0 0 1-4-4z" fill="#c8704a" ${O}/><path d="M10 38a4 4 0 0 1 4-4h24" fill="none" ${O}/><path d="M18 14h12M18 21h12" ${O}/>`),
  books: svg(`<path d="M8 10h9v30H8z" fill="#c8553d" ${O}/><path d="M17 14h9v26h-9z" fill="#4f7aa8" ${O}/><path d="M28 12l8-2 6 28-8 2z" fill="#6b8f4a" ${O}/>`),
  moon: svg(`<path d="M32 6a18 18 0 1 0 10 28A16 16 0 0 1 32 6z" fill="#f2d24a" ${O}/>`),
  basket: svg(`<path d="M8 22h32l-4 20H12z" fill="#c8965a" ${O}/><path d="M14 22c0-16 20-16 20 0" fill="none" ${O}/>`),
  wave: svg(`<path d="M15 26V12a3 3 0 0 1 6 0v10V9a3 3 0 0 1 6 0v13V12a3 3 0 0 1 6 0v18c0 8-5 12-12 12-6 0-9-3-12-8l-4-6c-2-3 2-6 5-3z" fill="#f2c8a0" ${O}/>`),
  village: svg(`<path d="M6 24L24 8l18 16" fill="none" ${O}/><path d="M11 22h26v20H11z" fill="#fbf0dc" ${O}/><path d="M20 42V30h8v12z" fill="#b8784a" ${O}/><path d="M6 24L24 8l18 16z" fill="#c8553d" ${O}/>`),
  savanna: svg(`<circle cx="33" cy="15" r="7" fill="#f2c84a" ${O}/><path d="M4 42c8-8 32-8 40 0z" fill="#d8b85a" ${O}/><path d="M16 36V22M8 22c4-5 12-5 16 0z" fill="#6b8f4a" ${O}/>`),
  desert: svg(`<path d="M24 42V10a4 4 0 0 1 8 0v32zM24 30H16a4 4 0 0 1-4-4v-6h5v5h7M32 24h5v-6h5v6a4 4 0 0 1-4 4h-6" fill="#5fa04f" ${O}/><path d="M4 42h40" ${O}/>`),
  jungle: svg(`<path d="M22 42c3-10 3-18 2-24h4c1 8 1 16-1 24z" fill="#8a5e3a" ${O}/><path d="M26 18C18 8 10 10 6 16c8-2 14 0 20 2zM26 18c8-10 16-8 20-2-8-2-14 0-20 2zM26 18c-4-9-2-13 2-15 2 4 2 9-2 15z" fill="#5fa04f" ${O}/>`),
  peak: svg(`<path d="M3 42L19 12l9 14 5-7 12 23z" fill="#8a94a0" ${O}/><path d="M19 12l-6 12 5-2 3 3 4-2z" fill="#fbfdff" ${O}/>`),
  sail: svg(`<path d="M24 6v28M24 8l14 24H24z" fill="#fbf6ea" ${O}/><path d="M6 34h36l-6 9H12z" fill="#c8553d" ${O}/>`),
  island: svg(`<path d="M3 40c6-3 36-3 42 0z" fill="#7ab8de" ${O}/><path d="M9 38c3-7 27-7 30 0z" fill="#e8d08a" ${O}/><path d="M24 34c1-6 1-12 0-16M24 18c-6-5-12-4-14 0 6-1 10 0 14 0zM24 18c6-5 12-4 14 0-6-1-10 0-14 0z" fill="#5fa04f" ${O}/>`),
  home: svg(`<path d="M9 22h30v20H9z" fill="#fbf0dc" ${O}/><path d="M4 24L24 6l20 18z" fill="#e8765a" ${O}/><circle cx="24" cy="31" r="4" fill="#e8553d" ${O}/>`),
  cable: svg(`<path d="M3 12l42-6" ${O}/><path d="M24 10v8" ${O}/><path d="M11 18h26v20H11z" fill="#c8553d" ${O}/><path d="M16 23h7v7h-7zM26 23h6v7h-6z" fill="#cfe6f2" ${O}/>`),
  ship: svg(`<path d="M14 18h20v12H14z" fill="#fbf6ea" ${O}/><path d="M20 10h8v8h-8z" fill="#e8765a" ${O}/><path d="M5 30h38l-6 11H11z" fill="#4f7aa8" ${O}/>`),
  pin: svg(`<path d="M24 44S9 28 9 19a15 15 0 0 1 30 0c0 9-15 25-15 25z" fill="#f2a23a" ${O}/><circle cx="24" cy="19" r="5.500" fill="#fff6e6" ${O}/>`),
  map: svg(`<path d="M6 12l12-4 12 4 12-4v28l-12 4-12-4-12 4z" fill="#f2e2b8" ${O}/><path d="M18 8v28M30 12v28" ${O}/>`),
  compass: svg(`<circle cx="24" cy="24" r="19" fill="#fbf6ea" ${O}/><path d="M32 16l-5 12-11 4 5-12z" fill="#e8553d" ${O}/>`),
  bag: svg(`<path d="M10 16h28l3 26H7z" fill="#e8a23a" ${O}/><path d="M17 20v-7a7 7 0 0 1 14 0v7" fill="none" ${O}/>`),
  coin: svg(`<circle cx="24" cy="24" r="20" fill="#ffc92e" ${O}/><path d="M24 12l3.500 7.300 8 1.100-5.800 5.700 1.400 8-7.100-3.800-7.100 3.800 1.400-8-5.800-5.700 8-1.100z" fill="#e09a10"/>`),
  medal: svg(`<path d="M15 4h8l5 14h-8zM33 4h-8l-5 14h8z" fill="#4f7aa8" ${O}/><circle cx="24" cy="30" r="13" fill="#f2c84a" ${O}/>`),
};
// 뱃지 그림: 뱃지 번호 → 아이콘
export const BADGE_ICON = { shot1: 'camera', shot10: 'film', shot100: 'gallery', star3: 'star', star10: 'stars', dex3: 'dex', dex10: 'books', night: 'moon', feed: 'feed', feed20: 'basket', pet: 'pet', wave: 'wave', sit: 'sit', dance: 'dance', jump: 'jump', exV: 'village', exB: 'sail', exS: 'savanna', exD: 'desert', exJ: 'jungle', exA: 'peak', exI: 'island', exH: 'home', exC: 'cable', exF: 'ship', exP1: 'pin', exP8: 'map', exAll: 'compass', rest: 'bed', kite: 'kite', bug: 'bug', bugAll: 'bug', buy: 'bag', rich: 'coin', 'tt-village': 'village', 'tt-sea': 'sail', 'tt-savanna': 'savanna', 'tt-desert': 'desert', 'tt-jungle': 'jungle', 'tt-arctic': 'peak', 'tt-isle': 'island', 'tt-islesea': 'ship', 'tt-all': 'medal' };
