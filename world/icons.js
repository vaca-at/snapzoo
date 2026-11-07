// 스냅주 아이콘: 이모지 대신 직접 그린 그림 (금화와 같은 만화체, 진한 외곽선 + 납작한 색). 48×48 칸
const O = 'stroke="#4a3424" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"';
const svg = (s) => `<svg class="ic" viewBox="0 0 48 48" aria-hidden="true">${s}</svg>`;
const cam = (b, t) => svg(`<path d="M6 16h9l3-5h12l3 5h9v22H6z" fill="${b}" ${O}/><path d="M6 16h36v6H6z" fill="${t}" ${O}/><circle cx="24" cy="29" r="8" fill="#cfe6f2" ${O}/><circle cx="24" cy="29" r="3.500" fill="#4a3424"/>`);
const hat = (brim, top, band) => svg(`<ellipse cx="24" cy="32" rx="20" ry="6" fill="${brim}" ${O}/><path d="M12 31c0-11 5-17 12-17s12 6 12 17z" fill="${top}" ${O}/><path d="M12 28c7 3 17 3 24 0v3c-7 3-17 3-24 0z" fill="${band}" ${O}/>`);
export const ICON = {
  // 모자 (HATS 순서)
  hat0: hat('#e8cf8e', '#f2dfa8', '#3f7a5a'), hat1: svg(`<path d="M10 30c0-11 6-17 14-17s14 6 14 17z" fill="#4f7ac8" ${O}/><path d="M30 28c6 0 12 2 14 6-6 1-14 0-20-2z" fill="#3a5fa8" ${O}/>`),
  hat2: svg(`<path d="M10 33c0-13 6-20 14-20s14 7 14 20z" fill="#c8704a" ${O}/><path d="M8 32h32v7H8z" fill="#e8a070" ${O}/><circle cx="24" cy="11" r="4" fill="#f2c8a0" ${O}/>`),
  hat3: hat('#a8784a', '#c8965a', '#5a3a20'), hat4: svg(`<path d="M6 30c6-8 30-8 36 0" fill="none" ${O}/>${[[10, 26, '#f2a0b8'], [18, 21, '#f2d24a'], [28, 21, '#f28a6a'], [37, 26, '#c8a0e8']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="5.500" fill="${c}" ${O}/>`).join('')}`),
  hat5: svg(`<circle cx="24" cy="24" r="16" fill="#f6efe2" ${O}/><path d="M13 35l22-22" ${O}/>`),
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
