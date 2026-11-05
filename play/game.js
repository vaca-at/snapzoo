// 스냅주 첫 장면: 초원 (어른용 힐링 게임)
// - 시작 화면 없이 바로 초원. 화면을 누른 곳(또는 방향키 · WASD)으로 산책자가 걸어가요
// - 동물에게 가까이 가면 고개를 들어 반기고 이름이 떠요 → 📷 찰칵 하면 앨범에 들어와요
// - 그림은 cel.js 의 draw() (그림체 '나' = NA), 좌표는 시안과 같은 1200×675 장면을 옆으로 넓힌 3200×675
(() => {
  const WORLD_W = 3200, WORLD_H = 675, SKY_W = 2200;
  const FIELD_TOP = 452, FIELD_BOT = 660;   // 걸을 수 있는 땅 (발 높이)
  const $ = (s) => document.querySelector(s);
  const depth = (y) => 0.55 + ((y - 440) / 220) * 0.45;   // 멀수록(위) 작게, 가까울수록(아래) 크게

  // ── 산책자: 시안의 '극장판 자연형' 산책자에 다리 관절(엉덩이)을 나눠 걸을 수 있게 ──
  const W = WALK_NATURE.parts;
  const legPath = W[2].d, shoePath = W[3].d;
  const WALKER = {
    ...WALK_NATURE,
    o: { ...WALK_NATURE.o, legL: [146, 238], legR: [160, 238] },
    parts: [W[0], W[1],
      { c: W[2].c, d: [legPath[0]], x: 'legL' }, { c: W[3].c, d: [shoePath[0]], x: 'legL' },
      { c: W[2].c, d: [legPath[1]], x: 'legR' }, { c: W[3].c, d: [shoePath[1]], x: 'legR' },
      ...W.slice(4)],
  };
  const ELE = { ...ELE_NATURE, ground: () => shadowEl(160, 332, 110, '#4a6a3a', 0.2) };

  // ── 초원 식구들: [이름 열쇠, 모델, 이름, 발 x, 발 y, 크기, 뒤집기, 반기는 말] ──
  const HERD = [
    ['gazelle', GAZELLE, '톰슨가젤', 760, 600, 0.72, false, '풀을 뜯다 고개를 들었어요'],
    ['zebra', ZEBRA, '얼룩말', 1180, 520, 0.8, true, '꼬리를 휙 흔들어요'],
    ['giraffe', GIRAFFE, '아기 기린', 1640, 486, 0.98, false, '오물오물, 키가 커요'],
    ['elephant', ELE, '아기 코끼리', 2200, 628, 0.86, true, '귀를 펄럭이며 반겨요'],
    ['gnu', GNU, '누', 2700, 512, 0.7, false, '음메에, 하고 울어요'],
  ];
  const IDS = HERD.map((h) => h[0]);

  // ── 하늘 (반만큼 느리게 움직여 멀리 있는 느낌) ──
  function skySVG() {
    const s = 'sk', r = rng(3);
    const cloud = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})"><g class="cloud" filter="url(#${s}wash)"><path d="M0 40 C10 14 40 10 54 26 C64 4 104 2 116 26 C134 14 164 22 164 42 C164 54 150 58 140 56 L20 56 C6 56 -2 50 0 40 Z" fill="#ffffff" opacity="0.95"/><path d="M8 52 C40 58 120 58 158 50 C150 58 120 62 80 62 C40 62 14 60 8 52 Z" fill="#c4d4e6"/></g></g>`;
    let clouds = ''; for (let x = 40; x < SKY_W; x += 300 + r() * 220) clouds += cloud(x, 30 + r() * 90, 0.8 + r() * 0.6);
    let hills = 'M0 384'; for (let x = 0; x <= SKY_W; x += 110) hills += ` C${x + 30} ${352 - r() * 40} ${x + 70} ${352 - r() * 30} ${x + 110} ${360 - r() * 30}`;
    return `<svg class="bg" viewBox="0 0 ${SKY_W} ${WORLD_H}" width="${SKY_W}" height="${WORLD_H}" aria-hidden="true"><defs>${MODE_DEFS.blend(s)}
      <linearGradient id="${s}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9cc8ea"/><stop offset="0.55" stop-color="#d6ebf2"/><stop offset="1" stop-color="#f2efda"/></linearGradient>
      <linearGradient id="${s}far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8bccc"/><stop offset="1" stop-color="#c8d6d6"/></linearGradient></defs>
      <rect width="${SKY_W}" height="${WORLD_H}" fill="url(#${s}g)"/>${clouds}
      <path d="${hills} L${SKY_W} 460 L0 460 Z" fill="url(#${s}far)"/></svg>`;
  }
  // ── 땅: 들판 · 흙길 · 아카시아 · 물웅덩이 · 풀 ──
  function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
  function worldSVG() {
    const s = 'wd', r = rng(7);
    const tuft = (x, y, k) => `<g class="grassw" style="transform-origin:${x}px ${y}px"><path d="M${x} ${y} q${-4 * k} ${-10 * k} ${-9 * k} ${-14 * k} M${x} ${y} q0 ${-12 * k} ${2 * k} ${-18 * k} M${x} ${y} q${4 * k} ${-9 * k} ${10 * k} ${-12 * k}" fill="none" stroke="#6f9a4a" stroke-width="${1.4 * k}" stroke-linecap="round" filter="url(#${s}penL)"/></g>`;
    const acacia = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})"><g class="tree" style="transform-origin:0px 80px"><path d="M-4 82 C-2 50 -6 22 -12 2 M-2 30 C14 16 30 10 48 6 M-8 18 C-22 6 -38 2 -56 2" fill="none" stroke="#6a5038" stroke-width="7" stroke-linecap="round"/>
      <path d="M-90 2 C-80 -20 -30 -32 10 -28 C60 -32 100 -20 110 0 C90 12 50 12 10 10 C-30 12 -72 14 -90 2 Z" fill="#7aa45a"/><path d="M-84 2 C-50 12 70 14 106 2 C90 14 50 18 10 16 C-30 18 -70 14 -84 2 Z" fill="#5f8a46"/>
      <path d="M-90 2 C-80 -20 -30 -32 10 -28 C60 -32 100 -20 110 0" fill="none" stroke="#4a5a38" stroke-width="1.3" filter="url(#${s}penL)"/></g></g>`;
    const bush = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M-40 0 C-40 -22 -14 -30 0 -22 C14 -34 44 -26 42 0 Z" fill="#7fa65c"/><path d="M-40 0 C-14 6 18 6 42 0" fill="none" stroke="#4a5a38" stroke-width="1.2" filter="url(#${s}penL)"/></g>`;
    const tufts = []; for (let i = 0; i < 260; i++) tufts.push([r() * WORLD_W, 420 + r() * 250]);
    // 흙길: 왼쪽에서 오른쪽으로 굽이굽이 (산책자가 걷는 느낌)
    let road = 'M0 610'; for (let x = 0; x < WORLD_W; x += 400) road += ` C${x + 130} ${610 - 50 * Math.sin(x / 500)} ${x + 270} ${590 + 40 * Math.cos(x / 380)} ${x + 400} ${600 + 30 * Math.sin((x + 400) / 450)}`;
    return `<svg class="bg" viewBox="0 0 ${WORLD_W} ${WORLD_H}" width="${WORLD_W}" height="${WORLD_H}" aria-hidden="true"><defs>${MODE_DEFS.blend(s)}
      <linearGradient id="${s}field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c2d898"/><stop offset="1" stop-color="#9cc472"/></linearGradient></defs>
      <path d="M0 410 C200 388 420 402 640 394 C900 384 1120 404 1400 392 C1700 380 1960 402 2240 392 C2520 382 2800 400 3200 390 L3200 675 L0 675 Z" fill="url(#${s}field)"/>
      <path d="M0 410 C200 388 420 402 640 394 C900 384 1120 404 1400 392 C1700 380 1960 402 2240 392 C2520 382 2800 400 3200 390" fill="none" stroke="#7a9a58" stroke-width="1.2" opacity="0.7" filter="url(#${s}penL)"/>
      ${acacia(380, 330, 0.9)}${acacia(1420, 322, 1.1)}${acacia(2480, 330, 0.85)}${acacia(3060, 326, 1)}
      ${bush(560, 430, 0.8)}${bush(1980, 428, 0.9)}${bush(2900, 436, 0.7)}
      <path d="${road}" fill="none" stroke="#e6d4a4" stroke-width="54" stroke-linecap="round" opacity="0.8" filter="url(#${s}wash)"/>
      <g filter="url(#${s}wash)"><ellipse cx="2390" cy="652" rx="150" ry="26" fill="#8fc0d8"/><ellipse cx="2380" cy="648" rx="110" ry="14" fill="#b8dcea" opacity="0.8"/></g>
      ${tufts.map(([x, y]) => tuft(x, y, 0.6 + (y - 420) / 120)).join('')}
      <rect width="${WORLD_W}" height="${WORLD_H}" filter="url(#${s}grain)" style="mix-blend-mode:multiply" opacity="0.55"/></svg>`;
  }

  // ── 그리기 ──
  const view = $('#view'), worldEl = $('#world'), skyEl = $('#sky');
  skyEl.innerHTML = skySVG();
  worldEl.innerHTML = worldSVG();
  // 캐릭터 한 명 = div 하나 (그림은 한 번만 그리고, 자리는 transform 으로만 옮겨요 → 휴대폰에서도 가벼워요)
  function makeCh(model, extra = '') {
    const el = document.createElement('div');
    el.className = 'ch';
    el.style.cssText = 'left:0;top:0;width:300px;height:360px;transform-origin:150px 332px';
    el.innerHTML = draw(model, 'blend', NA, 'none') + extra;
    worldEl.append(el);
    return el;
  }
  const place = (el, x, y, k, flip) => {
    el.style.transform = `translate(${x - 150}px, ${y - 332}px) scale(${flip ? -k : k}, ${k})`;
    el.style.zIndex = String(Math.round(y));
  };
  const animals = HERD.map(([id, model, name, x, y, k, flip, say]) => {
    const el = makeCh(model, `<span class="tag">${name}</span>`);
    const sz = k * depth(y);
    place(el, x, y, sz, flip);
    if (flip) el.querySelector('.tag').style.transform = 'translateX(-50%) scaleX(-1)';
    return { id, model, name, x, y, k: sz, flip, say, el, near: false };
  });
  const me = { x: 300, y: 600, tx: null, ty: null, face: 1, el: makeCh(WALKER) };

  // ── 화면 크기: 높이에 맞추되, 세로 화면에서는 가로로 420 은 보이게 (남는 위쪽은 하늘색) ──
  let S = 1, offY = 0, viewW = 1200, camX = 0;
  function resize() {
    S = Math.min(innerHeight / WORLD_H, innerWidth / 420);
    offY = innerHeight - WORLD_H * S;
    viewW = innerWidth / S;
  }
  addEventListener('resize', resize); resize();

  // ── 걷기: 누른 곳으로 · 방향키 ──
  const keys = new Set();
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(k)) { keys.add(k); me.tx = null; e.preventDefault(); hideHint(); }
    if ((k === ' ' || k === 'enter') && nearest) { e.preventDefault(); snap(); }
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  view.addEventListener('pointerdown', (e) => {
    const wx = camX + e.clientX / S, wy = (e.clientY - offY) / S;
    me.tx = Math.max(60, Math.min(WORLD_W - 60, wx));
    me.ty = Math.max(FIELD_TOP, Math.min(FIELD_BOT, wy));
    hideHint();
  });
  let hintT = setTimeout(hideHint, 9000);
  function hideHint() { clearTimeout(hintT); $('#hint').style.opacity = 0; }

  // ── 앨범 (이 기기에만 기억) ──
  let album = [];
  try { album = JSON.parse(localStorage.getItem('snapzoo-play-album') || '[]').filter((id) => IDS.includes(id)); } catch (e) { album = []; }
  const saveAlbum = () => { try { localStorage.setItem('snapzoo-play-album', JSON.stringify(album)); } catch (e) { /* 저장이 막혀도 놀이는 그대로 */ } };
  function paintAlbum() {
    $('#albumBtn').textContent = `📷 ${album.length} / ${IDS.length}`;
    $('#photos').innerHTML = HERD.map(([id, model, name], i) => album.includes(id)
      ? `<figure class="pol" style="--r:${[-3, 2, -1.5, 2.5, -2][i]}deg;margin:0">${draw(model, 'blend', NA, 'soft')}<figcaption>${name}</figcaption></figure>`
      : `<div class="pol empty" style="--r:0deg">아직 못 만났어요</div>`).join('');
  }
  paintAlbum();
  $('#albumBtn').onclick = () => $('#album').classList.toggle('on');
  $('#albumX').onclick = () => $('#album').classList.remove('on');

  let toastT;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2400); }

  // ── 찰칵 ──
  let nearest = null;
  function snap() {
    if (!nearest) return;
    const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
    if (!album.includes(nearest.id)) {
      album.push(nearest.id); saveAlbum(); paintAlbum();
      toast(album.length === IDS.length ? '🎉 초원 식구를 모두 만났어요!' : `📖 ${nearest.name}이(가) 앨범에 들어왔어요 (${album.length}/${IDS.length})`);
    } else toast(`📷 ${nearest.name}, 한 장 더!`);
  }
  $('#snap').addEventListener('click', (e) => { e.stopPropagation(); snap(); });
  $('#snap').addEventListener('pointerdown', (e) => e.stopPropagation());

  // ── 매 프레임 ──
  let last = performance.now();
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    let vx = 0, vy = 0;
    if (keys.has('arrowleft') || keys.has('a')) vx -= 1;
    if (keys.has('arrowright') || keys.has('d')) vx += 1;
    if (keys.has('arrowup') || keys.has('w')) vy -= 1;
    if (keys.has('arrowdown') || keys.has('s')) vy += 1;
    if (me.tx !== null) {
      const dx = me.tx - me.x, dy = me.ty - me.y, d = Math.hypot(dx, dy);
      if (d < 4) me.tx = null; else { vx = dx / d; vy = dy / d; }
    }
    const moving = vx || vy;
    if (moving) {
      const n = Math.hypot(vx, vy), sp = 210 * depth(me.y);   // 멀리 갈수록 천천히 (원근)
      me.x = Math.max(60, Math.min(WORLD_W - 60, me.x + (vx / n) * sp * dt));
      me.y = Math.max(FIELD_TOP, Math.min(FIELD_BOT, me.y + (vy / n) * sp * 0.6 * dt));
      if (Math.abs(vx) > 0.2) me.face = vx > 0 ? 1 : -1;
      // 동물과 겹쳐 서지 않게 살짝 밀어내요 (같은 깊이일 때만)
      for (const a of animals) {
        const dx = me.x - a.x, dy = (me.y - a.y) * 3, d = Math.hypot(dx, dy), min = 95 * a.k;
        if (d < min && d > 0.01) { me.x = a.x + (dx / d) * min; me.y = a.y + (dy / d) * min / 3; if (me.tx !== null && Math.hypot(me.tx - a.x, (me.ty - a.y) * 3) < min) me.tx = null; }
      }
    }
    me.el.classList.toggle('walking', !!moving);
    place(me.el, me.x, me.y, 0.8 * depth(me.y), me.face < 0);

    // 가까운 동물: 고개 들어 반기기 · 이름 · 찰칵 단추
    let best = null, bd = Infinity;
    for (const a of animals) {
      const d = Math.hypot(a.x - me.x, (a.y - me.y) * 1.8);
      const near = d < 170;
      if (near && !a.near) { a.el.classList.add('seen'); const h = document.createElement('span'); h.className = 'heart'; h.textContent = '♥'; a.el.append(h); setTimeout(() => h.remove(), 1700); toast(`${a.name} · ${a.say}`); }
      if (!near && a.near) a.el.classList.remove('seen');
      a.near = near;
      if (near && d < bd) { bd = d; best = a; }
    }
    if (best !== nearest) { nearest = best; const b = $('#snap'); b.classList.toggle('on', !!best); if (best) b.textContent = `📷 ${best.name} 찰칵`; }

    // 카메라: 산책자를 가운데에 (끝에서는 멈춰요)
    camX = Math.max(0, Math.min(Math.max(0, WORLD_W - viewW), me.x - viewW / 2));
    worldEl.style.transform = `translate(${-camX * S}px, ${offY}px) scale(${S})`;
    skyEl.style.transform = `translate(${-camX * 0.5 * S}px, ${offY}px) scale(${S})`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__play = { me, animals, get camX() { return camX; } };   // 화면 점검용
})();
