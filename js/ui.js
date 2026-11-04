// 화면: 위 알림판 · 아래 탭 다섯 칸 · 패널(도감 · 상점 · 표정 · 지도 · 매표소 · 버스/배) · 사진 결과 카드 · 소리
import * as THREE from 'three';
import { ANIMALS, RARITY, ZONES, ZONE_ORDER, CAMERAS, LOOKS, LOOK_TABS, TICKETS, FACES, ACTIONS, DAILY_SECONDS, SERVER_COUNT, SERVER_CAP } from './data.js';
import { S, save, perSec, secLeft, dexCount, camera as curCam, randomName } from './state.js';
import { buildAnimal } from './animals.js';
import { getPhoto, listPhotos } from './album.js';

const $ = (s) => document.querySelector(s);
const fmt = (n) => Math.floor(n).toLocaleString('ko-KR');
let G = null;   // main.js 에서 넘겨준 게임 동작들

export function init(game) {
  G = game;
  $('#tabDex').onclick = () => openDex();
  $('#tabShop').onclick = () => openShop();
  $('#tabPhoto').onclick = () => G.enterPhoto();
  $('#tabFace').onclick = () => openFace();
  $('#tabMap').onclick = () => openMap();
  $('#shutter').onclick = () => G.shoot();
  $('#photoClose').onclick = () => G.exitPhoto();
  $('#zoomIn').onclick = () => G.zoomBy(1);
  $('#zoomOut').onclick = () => G.zoomBy(-1);
  $('#lastPhoto').onclick = () => openAlbum();
  $('#veil').addEventListener('click', (e) => { if (e.target.id === 'veil') closeAll(); });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeAll(); });
  updateHud();
}

// ---------- 위 알림판 ----------
export function setZone(z) { $('#zoneName').textContent = `${z.icon} ${z.name}`; }
// 친구 수 (정거장에서만)
export function setFriends(net, n) {
  const el = $('#friends');
  if (!el) return;
  const inStation = !G || G.zone() === 'station';
  el.hidden = !inStation || !document.body.classList.contains('playing');
  el.textContent = net.online ? `👫 ${net.server}번 서버 · 친구 ${n}명` : '👤 혼자 놀기';
  el.classList.toggle('on', net.online);
}
let goalCache = null;
export function setGoal(t) {
  if (t === goalCache) return;
  goalCache = t;
  const g = $('#goal'); g.textContent = t; g.hidden = !t;
  if (t) bump(g);
}
export function setName(n) { $('#nameTag .nm').textContent = n; }
let lastCoins = -1;
export function updateHud() {
  if (S.coins !== lastCoins) {
    if (S.coins > lastCoins && lastCoins >= 0 && S.coins - lastCoins > perSec()) bump($('#coinChip'));
    lastCoins = S.coins;
    $('#coinTxt').textContent = fmt(S.coins);
  }
  const left = secLeft();
  $('#perSec').textContent = left > 0 ? `+${perSec()}/초` : '오늘 끝';
  $('#dexTxt').textContent = `${dexCount()}/${ANIMALS.length}`;
  const mins = Math.ceil(left / 60);
  $('#timeLeft').textContent = left > 0 ? `오늘 ${mins}분 남음` : '내일 다시 55분';
  $('#timeBar').style.width = `${(left / DAILY_SECONDS) * 100}%`;
}
function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
export let capShown = false;
export function capToast() { capShown = true; toast('⏱️ 오늘 초당 포인트는 끝! 사진 상금은 계속 받아요'); }

// ---------- 알림 ----------
let toastTimer = 0;
export function toast(msg, kind = '') {
  if (!msg) return;
  const el = $('#toast');
  el.textContent = msg; el.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
}

// ---------- 걷기 화면: 상황 단추 ----------
let spotLabel = null;
export function setSpot(label) {
  if (label === spotLabel) return;
  spotLabel = label;
  const b = $('#spotBtn');
  b.hidden = !label; b.textContent = label;
}

// ---------- 머리 위 이름표 · 표정 ----------
export function setFace(f) { $('#nameTag .face').textContent = f; }
export function placeTag(x, y, show, faceOn) {
  const t = $('#nameTag');
  t.style.display = show ? '' : 'none';
  if (show) t.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  t.classList.toggle('withFace', faceOn);
}

// ---------- 사진 화면 C ----------
export function photoMode(on, cam, zoom) {
  document.body.classList.toggle('photo', on);
  if (on) {
    $('#camName').textContent = cam.name;
    $('#camDot').style.background = cam.color;
    $('#frame').style.borderColor = cam.color === '#ffffff' ? 'rgba(255,255,255,.9)' : cam.color;
    setZoom(zoom, cam.zoom);
  } else photoHint(null, true);
}
export function setZoom(z, max) {
  $('#zoomTxt').textContent = `${Number(z.toFixed(2))}배`;
  $('#zoomIn').disabled = z >= max - 0.01;
  $('#zoomOut').disabled = z <= 1.01;
}
let hintCache = '';
export function photoHint(ev, clear) {
  let txt = '', go = false;
  if (clear) txt = '';
  else if (!ev) txt = '동물을 네모 안에 넣어 보세요';
  else if (ev.center < 24) txt = '동물을 가운데로 조금만 더';
  else if (ev.ratio < 0.22) txt = '너무 작아요. + 로 줌을 당겨요';
  else if (ev.ratio > 0.72) txt = '너무 커요. − 로 줌을 빼요';
  else if (ev.moment) { txt = `지금이야! ${ev.a.sp.act}!`; go = true; }
  else txt = '좋아요! 반짝이는 순간을 기다려요';
  const key = txt + go;
  if (key === hintCache) return;
  hintCache = key;
  const h = $('#photoHint');
  h.textContent = txt; h.hidden = !txt; h.classList.toggle('go', go);
  $('#frame').classList.toggle('go', go);
}
export function flash() { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
export function setLastPhoto(img) { const b = $('#lastPhoto'); b.style.backgroundImage = img ? `url(${img})` : ''; b.classList.toggle('has', !!img); }

// ---------- 패널 공통 ----------
let openId = null;
export const isOpen = () => !!openId;
function panel(id, title, html, opts = {}) {
  openId = id;
  const v = $('#veil');
  v.hidden = false;
  v.innerHTML = `<section class="sheet ${opts.cls || ''}" role="dialog" aria-label="${title}">
    ${opts.noHead ? '' : `<header><h2>${title}</h2><button class="btn ghost" type="button" data-close aria-label="닫기">✕</button></header>`}
    <div class="body">${html}</div></section>`;
  return v.querySelector('.sheet');
}
export function closeAll() {
  const was = openId;
  openId = null;
  $('#veil').hidden = true; $('#veil').innerHTML = '';
  if (was === 'result' && afterResult) { const f = afterResult; afterResult = null; f(); }
}

// ---------- 도감 ----------
const portraits = {};
let pr = null;
function portrait(model) {
  if (portraits[model]) return portraits[model];
  if (!pr) {
    const c = document.createElement('canvas'); c.width = 160; c.height = 160;
    const r = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true });
    r.setSize(160, 160, false); r.outputColorSpace = THREE.SRGBColorSpace;
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight('#ffffff', '#8a9a7a', 2.2));
    const d = new THREE.DirectionalLight('#ffffff', 1.4); d.position.set(3, 5, 4); sc.add(d);
    pr = { r, sc, cam: new THREE.PerspectiveCamera(30, 1, 0.05, 50), c };
  }
  const m = buildAnimal(model);
  m.update(1.2, false, -1);
  const g = new THREE.Group(); g.add(m.root); m.root.rotation.y = 1.0;
  pr.sc.add(g);
  const b = new THREE.Box3().setFromObject(g), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const R = Math.max(s.x, s.y, s.z) * 0.62;
  pr.cam.position.set(c.x + R * 1.1, c.y + R * 0.9, c.z + R * 3.1);
  pr.cam.lookAt(c);
  pr.r.render(pr.sc, pr.cam);
  portraits[model] = pr.c.toDataURL('image/png');
  pr.sc.remove(g);
  return portraits[model];
}
const rBadge = (r) => `<span class="rb" style="--rc:${RARITY[r].color};--ri:${RARITY[r].ink}">${RARITY[r].name}</span>`;
const starStr = (n) => '★'.repeat(n) + '<span class="off">' + '★'.repeat(3 - n) + '</span>';

export function openDex() {
  const groups = ZONE_ORDER.map((z) => {
    const zd = ZONES[z];
    const cards = ANIMALS.filter((a) => a.zone === z).map((a) => {
      const d = S.dex[a.id];
      return `<button class="card ${d ? 'got' : ''}" type="button" data-animal="${a.id}" style="--rc:${RARITY[a.rarity].color}">
        <span class="pic">${d ? `<img src="${portrait(a.model)}" alt="">` : `<img class="sil" src="${portrait(a.model)}" alt=""><b class="q">?</b>`}</span>
        <span class="nm">${d ? a.name : '???'}</span>
        <span class="meta">${rBadge(a.rarity)}${d ? `<span class="st">${starStr(d.stars)}</span>` : ''}</span></button>`;
    }).join('');
    const n = ANIMALS.filter((a) => a.zone === z && S.dex[a.id]).length, all = ANIMALS.filter((a) => a.zone === z).length;
    return `<div class="zgroup"><p class="zonehead">${zd.icon} ${zd.name} <small>${n}/${all}</small><i></i></p><div class="grid">${cards}</div></div>`;
  }).join('');
  const sheet = panel('dex', '📖 도감', `
    <p class="lead">모은 동물 <b>${dexCount()}/${ANIMALS.length}</b> · 한 마리 늘 때마다 초당 +1</p>
    ${groups}
    <div class="row"><button class="btn" type="button" id="albumBtn">🖼️ 내 사진 앨범</button></div>
    <p class="fine">사진은 이 기기 안에만 저장돼요. 도감의 진짜 동물 사진은 저작권 문제 없는 사진으로 준비 중이에요.</p>`);
  sheet.querySelectorAll('[data-animal]').forEach((b) => { b.onclick = () => openAnimal(b.dataset.animal); });
  $('#albumBtn').onclick = () => openAlbum();
}
async function openAnimal(id) {
  const a = ANIMALS.find((x) => x.id === id), d = S.dex[id], zd = ZONES[a.zone];
  if (!d) {
    panel('animal', '???', `<div class="mystery"><img class="sil big" src="${portrait(a.model)}" alt=""><p>${rBadge(a.rarity)} ${zd.icon} ${zd.name}에 살아요</p>
      <p class="lead">아직 못 만났어요. 사진을 찍으면 도감이 열려요!</p></div>
      <div class="row"><button class="btn" type="button" id="backDex">← 도감</button></div>`);
    $('#backDex').onclick = () => openDex();
    return;
  }
  const best = await getPhoto(`best-${id}`);
  const cam = CAMERAS.find((c) => c.id === d.cam) || CAMERAS[0];
  panel('animal', a.name, `
    <div class="animal">
      <figure class="real">${a.photo ? `<img src="${a.photo.src}" alt="${a.name} 진짜 사진"><figcaption>${a.photo.by} · ${a.photo.license}</figcaption>` : `<img src="${portrait(a.model)}" alt=""><figcaption>진짜 사진 준비 중</figcaption>`}</figure>
      <p class="desc">${rBadge(a.rarity)} ${zd.icon} ${zd.name}<br>${a.desc}</p>
      <figure class="polaroid" style="--fc:${cam.color}">${best?.img ? `<img src="${best.img}" alt="내가 찍은 ${a.name}">` : ''}<figcaption>내 최고 사진 · ${d.score}점 <span class="st">${starStr(d.stars)}</span></figcaption></figure>
      <p class="fine">특별한 순간: <b>${a.act}</b> · 찍은 횟수 ${d.shots || 1}번</p>
    </div>
    <div class="row"><button class="btn" type="button" id="backDex">← 도감</button></div>`);
  $('#backDex').onclick = () => openDex();
}
async function openAlbum() {
  if (G.inPhoto()) G.exitPhoto();
  const all = (await listPhotos()).filter((p) => !p.id.startsWith('best-'));
  const html = all.length ? `<div class="album">${all.map((p) => {
    const a = ANIMALS.find((x) => x.id === p.animal), cam = CAMERAS.find((c) => c.id === p.cam) || CAMERAS[0];
    return `<figure class="polaroid sm" style="--fc:${cam.color}"><img src="${p.img}" alt=""><figcaption>${a ? (S.dex[a.id] ? a.name : '???') : '찰칵'} · ${p.score}점</figcaption></figure>`;
  }).join('')}</div>` : '<p class="lead">아직 찍은 사진이 없어요. 📷 을 눌러 찍어 봐요!</p>';
  panel('album', '🖼️ 내 사진 앨범', html + '<p class="fine">최근 80장까지 이 기기 안에만 보관해요.</p>');
}

// ---------- 상점 (카메라 · 꾸미기 · 표) ----------
let shopTab = 'camera', lookTab = 'hair';
export function openShop(tab) {
  if (tab) shopTab = tab;
  const tabs = [['camera', '📷 카메라'], ['look', '👕 꾸미기'], ['ticket', '🎫 표']]
    .map(([id, n]) => `<button class="tab ${shopTab === id ? 'on' : ''}" type="button" data-tab="${id}">${n}</button>`).join('');
  let body = '';
  if (shopTab === 'camera') {
    body = CAMERAS.map((c) => {
      const has = S.cameras[c.id], using = S.camera === c.id;
      return `<div class="item" style="--cc:${c.color}"><span class="camic"><i></i></span>
        <span class="tx"><b>${c.name}</b><small>${c.effect}</small></span>
        ${using ? '<button class="btn" disabled>쓰는 중</button>' : has ? `<button class="btn" data-use="${c.id}">쓰기</button>` : buyBtn(`cam:${c.id}`, c.price)}</div>`;
    }).join('');
  } else if (shopTab === 'look') {
    const sub = LOOK_TABS.map((t) => `<button class="chipbtn ${lookTab === t.id ? 'on' : ''}" type="button" data-look="${t.id}">${t.icon} ${t.name}</button>`).join('');
    body = `<div class="subtabs">${sub}</div>` + LOOKS[lookTab].map((it) => {
      const has = it.price === 0 || S.looks[lookTab][it.id];
      const on = lookTab === 'item' ? S.wear.item.includes(it.id) : S.wear[lookTab] === it.id;
      return `<div class="item"><span class="tx"><b>${it.name}</b><small>${it.price ? `${fmt(it.price)} 포인트` : '무료'}</small></span>
        ${!has ? buyBtn(`look:${lookTab}:${it.id}`, it.price) : on ? (lookTab === 'item' ? `<button class="btn on" data-wear="${it.id}">벗기</button>` : '<button class="btn" disabled>입는 중</button>') : `<button class="btn" data-wear="${it.id}">${lookTab === 'item' ? '하기' : '입기'}</button>`}</div>`;
    }).join('') + '<p class="fine">꾸미기는 모양만 바뀌어요. 점수 · 코인에는 영향 없어요.</p>';
  } else {
    body = ticketList();
  }
  const sheet = panel('shop', '🛒 상점', `<div class="tabs">${tabs}</div><p class="wallet">🪙 <b>${fmt(S.coins)}</b></p><div class="list">${body}</div>`);
  sheet.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => openShop(b.dataset.tab); });
  sheet.querySelectorAll('[data-look]').forEach((b) => { b.onclick = () => { lookTab = b.dataset.look; openShop(); }; });
  sheet.querySelectorAll('[data-use]').forEach((b) => { b.onclick = () => { S.camera = b.dataset.use; save(); G.dressUp(); openShop(); toast(`📷 ${curCam().name}를 들었어요`); }; });
  sheet.querySelectorAll('[data-wear]').forEach((b) => { b.onclick = () => { wear(b.dataset.wear); openShop(); }; });
  bindBuy(sheet, () => openShop());
}
function buyBtn(key, price) {
  const can = S.coins >= price;
  return `<button class="btn buy" type="button" data-buy="${key}" ${can ? '' : 'disabled'}>🪙 ${fmt(price)}</button>`;
}
function ticketList(highlight) {
  return TICKETS.map((t) => `<div class="item ${highlight === t.id ? 'hl' : ''}"><span class="bigic">${t.icon}</span>
    <span class="tx"><b>${t.name}</b><small>${t.desc}</small></span>
    ${S.tickets[t.id] ? '<button class="btn" disabled>있어요 ✓</button>' : buyBtn(`ticket:${t.id}`, t.price)}</div>`).join('')
    + '<p class="fine">표는 한 번 사면 계속 탈 수 있어요. 🌴 정글은 버스 무료!</p>';
}
function bindBuy(root, refresh) {
  root.querySelectorAll('[data-buy]').forEach((b) => { b.onclick = () => { if (buy(b.dataset.buy)) refresh(); }; });
}
function buy(key) {
  const [kind, a, b] = key.split(':');
  let price = 0, name = '';
  if (kind === 'cam') { const c = CAMERAS.find((x) => x.id === a); price = c.price; name = c.name; }
  if (kind === 'look') { const it = LOOKS[a].find((x) => x.id === b); price = it.price; name = it.name; }
  if (kind === 'ticket') { const t = TICKETS.find((x) => x.id === a); price = t.price; name = t.name; }
  if (S.coins < price) { toast('포인트가 조금 모자라요'); return false; }
  S.coins -= price;
  if (kind === 'cam') { S.cameras[a] = true; S.camera = a; G.dressUp(); }
  if (kind === 'look') { S.looks[a][b] = true; wear(b, a); }
  if (kind === 'ticket') S.tickets[a] = true;
  save(); updateHud(); sfx('coin');
  toast(`🎉 ${name}${kind === 'ticket' ? '를 샀어요!' : '을(를) 샀어요!'}`);
  return true;
}
function wear(id, tab = lookTab) {
  if (tab === 'item') {
    const i = S.wear.item.indexOf(id);
    if (i >= 0) S.wear.item.splice(i, 1); else S.wear.item.push(id);
  } else S.wear[tab] = id;
  save(); G.dressUp();
}

// ---------- 매표소 ----------
export function openTickets(highlight) {
  const sheet = panel('tickets', '🎫 매표소', `<p class="wallet">🪙 <b>${fmt(S.coins)}</b></p>
    ${highlight ? `<p class="lead">${highlight === 'bus' ? '🚌 초원 · 사막은 버스표가 필요해요' : '⛵ 바다는 배표가 필요해요'}</p>` : ''}
    <div class="list">${ticketList(highlight)}</div>`);
  bindBuy(sheet, () => openTickets(highlight));
}

// ---------- 버스 · 배 타기 (어디로 갈까?) ----------
export function openRide(kind) {
  const dests = ZONE_ORDER.filter((z) => ZONES[z].ride === kind);
  const html = dests.map((z) => {
    const zd = ZONES[z], ok = !zd.ticket || S.tickets[zd.ticket];
    const n = ANIMALS.filter((a) => a.zone === z && S.dex[a.id]).length, all = ANIMALS.filter((a) => a.zone === z).length;
    return `<button class="dest ${ok ? '' : 'locked'}" type="button" data-go="${z}">
      <span class="bigic">${zd.icon}</span><span class="tx"><b>${zd.name}</b><small>${ok ? `도감 ${n}/${all}` : `${zd.ticket === 'bus' ? '🚌 버스표' : '⛵ 배표'}가 필요해요`}</small></span>
      <span class="go">${ok ? '출발 ▶' : '🔒'}</span></button>`;
  }).join('');
  const sheet = panel('ride', kind === 'bus' ? '🚌 버스 · 어디로 갈까요?' : '⛵ 배 · 어디로 갈까요?', `<div class="list">${html}</div>`);
  sheet.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => G.travel(b.dataset.go); });
}

// 창밖이 짧게 지나가는 장면
export function ride(kind, zd, done) {
  const r = $('#ride');
  const things = kind === 'bus' ? ['🌳', '🏡', '🌲', '🌻', '⛰️', '🌳', '🌴', '🌵'] : ['🌊', '🐟', '🏝️', '🌊', '🐬', '⛅', '🌊', '🐠'];
  r.className = `ride ${kind}`;
  r.innerHTML = `<div class="window"><div class="scroll">${things.concat(things).map((t) => `<span>${t}</span>`).join('')}</div></div>
    <div class="vehicle">${kind === 'bus' ? '🚌' : '⛵'}</div><p>${zd.icon} ${zd.name}(으)로 가는 중…</p>`;
  r.hidden = false;
  sfx(kind === 'bus' ? 'bus' : 'boat');
  setTimeout(() => { done(); }, 1700);
  setTimeout(() => { r.classList.add('out'); }, 2100);
  setTimeout(() => { r.hidden = true; r.className = 'ride'; }, 2500);
}

// ---------- 지도 ----------
export function openMap() {
  const here = G.zone();
  const items = ['station', ...ZONE_ORDER].map((z) => {
    const zd = ZONES[z], ok = !zd.ticket || S.tickets[zd.ticket];
    const n = z === 'station' ? '' : `${ANIMALS.filter((a) => a.zone === z && S.dex[a.id]).length}/${ANIMALS.filter((a) => a.zone === z).length}`;
    return `<div class="mz mz-${z} ${here === z ? 'here' : ''} ${ok ? '' : 'locked'}"><b>${zd.icon} ${zd.name}</b><small>${here === z ? '📍 지금 여기' : ok ? n : '🔒 표 필요'}</small></div>`;
  }).join('');
  const sheet = panel('map', '🗺️ 지도', `<div class="map">${items}</div>
    ${here === 'station' ? '<p class="lead">🚌 버스 정류장(왼쪽) · 🎫 매표소(가운데) · ⛵ 배 선착장(오른쪽)으로 걸어가요</p><div id="servers"></div>'
      : '<div class="row"><button class="btn big" type="button" id="goStation">🚏 정거장으로 돌아가기</button></div>'}
    <div class="row"><button class="btn" type="button" id="muteBtn">${S.mute ? '🔇 소리 꺼짐' : '🔊 소리 켜짐'}</button></div>`);
  sheet.querySelector('#muteBtn').onclick = (e) => { S.mute = !S.mute; save(); e.currentTarget.textContent = S.mute ? '🔇 소리 꺼짐' : '🔊 소리 켜짐'; if (!S.mute) sfx('unlock'); };
  const b = sheet.querySelector('#goStation');
  if (b) b.onclick = () => G.travel('station');
  if (here === 'station') renderServers();
}
// 서버 고르기: 선생님이 "모두 3번 서버로!" 하면 같은 곳에서 만나요
async function renderServers() {
  const box = $('#servers');
  if (!box) return;
  box.innerHTML = '<p class="fine">서버 인원을 불러오는 중…</p>';
  const c = await G.serverCounts();
  if (!$('#servers')) return;
  if (!c) { box.innerHTML = '<p class="fine">👤 지금은 친구 서버에 닿지 않아 혼자 놀아요.</p>'; return; }
  const cur = S.server;
  box.innerHTML = `<p class="zonehead">👫 서버 고르기<i></i></p><div class="servers">${Array.from({ length: SERVER_COUNT }, (_, i) => {
    const n = i + 1, v = c[n] || 0, full = v >= SERVER_CAP;
    return `<button class="srv ${n === cur ? 'on' : ''}" type="button" data-srv="${n}" ${full ? 'disabled' : ''}><b>${n}</b><small>${full ? '가득' : `${v}명`}</small></button>`;
  }).join('')}</div><p class="fine">같은 번호 서버에 있는 친구끼리 보여요. 채팅은 없어요.</p>`;
  box.querySelectorAll('[data-srv]').forEach((b) => { b.onclick = () => { G.pickServer(+b.dataset.srv); closeAll(); }; });
}

// ---------- 표정 · 동작 ----------
export function openFace() {
  if (G.inPhoto()) G.exitPhoto();
  const sheet = panel('face', '😊 표정 · 동작', `
    <div class="faces">${FACES.map((f) => `<button class="fbtn" type="button" data-face="${f}">${f}</button>`).join('')}</div>
    <div class="acts">${ACTIONS.map((a) => `<button class="abtn" type="button" data-act="${a.id}"><span>${a.icon}</span>${a.name}</button>`).join('')}</div>
    <p class="fine">채팅은 없어요. 표정과 동작으로 인사해요!</p>`, { cls: 'small' });
  sheet.querySelectorAll('[data-face]').forEach((b) => { b.onclick = () => { closeAll(); G.showFace(b.dataset.face); }; });
  sheet.querySelectorAll('[data-act]').forEach((b) => { b.onclick = () => { closeAll(); G.doAction(b.dataset.act); }; });
}

// ---------- 사진 결과 카드 ----------
let afterResult = null;
export function showResult(r) {
  const bar = (label, v, max) => `<div class="bar"><span>${label}</span><div class="tr"><div class="fi" style="width:${(v / max) * 100}%"></div></div><span class="v">${v}</span></div>`;
  const tip = r.ev.moment ? '특별한 순간을 잡았어요!' : r.ev.size < 15 ? '다음엔 줌으로 크기를 맞춰 봐요' : r.ev.center < 25 ? '다음엔 더 가운데에 두어 봐요' : '반짝이는 순간에 찍으면 별이 더 많아져요';
  panel('result', '사진', `
    <span class="badge">${r.badge}</span>
    <figure class="polaroid tilt" style="--fc:${r.cam.color}">${r.img ? `<img src="${r.img}" alt="${r.sp.name} 사진">` : ''}<figcaption>${r.sp.name} ${rBadge(r.sp.rarity)}</figcaption></figure>
    <div class="stars" aria-label="별 ${r.stars}개">${starStr(r.stars)}</div>
    <div class="total"><b>${r.ev.total}</b>점 <small>· 최고 ${r.best}점</small></div>
    <div class="bars">${bar('가운데', r.ev.center, 40)}${bar('알맞은 크기', r.ev.size, 30)}${bar('특별한 순간', r.ev.moment, 30)}</div>
    <p class="fine center">${tip}</p>
    <div class="reward">${r.prize ? `🪙 +${fmt(r.prize)}` : '상금은 처음 찍거나 최고 사진을 바꿀 때 받아요'}${r.newDex ? `<br><small>⏱️ 초당 포인트 +1 → 이제 1초에 <b>${r.perSec}</b></small>` : ''}</div>
    <div class="row"><button class="btn big" type="button" id="againBtn">📷 다시 찍기</button><button class="btn" type="button" id="doneBtn">그만</button></div>`, { cls: 'result', noHead: true });
  afterResult = null;
  $('#againBtn').onclick = () => closeAll();
  $('#doneBtn').onclick = () => { closeAll(); G.exitPhoto(); };
  if (r.newDex && dexCount() === ANIMALS.length) setTimeout(() => toast('🏆 도감 완성! 동물 왕국의 사진 박사!', 'gold'), 600);
}

// ---------- 시작 화면 ----------
export function showStart(name, returning, cb) {
  let nm = name;
  const sheet = panel('start', '동물 왕국', `
    <div class="hello">
      <h1>동물 왕국</h1>
      <p class="lead">카메라 하나로 동물 친구를 찾아 도감을 채워요</p>
      <div class="namebox"><span>내 이름</span><b id="nm">${nm}</b>${returning ? '' : '<button class="btn ghost" type="button" id="reroll" aria-label="다른 이름">🎲</button>'}</div>
      <ul class="how">
        <li>🕹️ 왼쪽 조이스틱으로 걷고, 오른쪽 ⤴ 로 점프</li>
        <li>📷 동물 가까이에서 사진! 가운데 · 알맞은 크기 · ✨반짝일 때</li>
        <li>🪙 1초마다 포인트가 쌓여요 (하루 55분까지)</li>
        <li>🎫 매표소에서 표를 사고 🚌 버스 · ⛵ 배를 타요</li>
      </ul>
      <button class="btn big" type="button" id="startBtn">${returning ? '이어 하기 ▶' : '탐험 시작 ▶'}</button>
    </div>`, { cls: 'start', noHead: true });
  const rr = sheet.querySelector('#reroll');
  if (rr) rr.onclick = () => { nm = randomName(); $('#nm').textContent = nm; };
  $('#startBtn').onclick = () => { openId = null; $('#veil').hidden = true; $('#veil').innerHTML = ''; document.body.classList.add('playing'); cb(nm); };
}

// ---------- 소리 (짧은 전자음, 파일 없음) ----------
let ac = null;
export function sfx(name) {
  if (S.mute) return;
  try {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime;
    const tone = (f, at, dur, type = 'sine', vol = 0.12) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t + at);
      g.gain.setValueAtTime(0, t + at); g.gain.linearRampToValueAtTime(vol, t + at + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + at + dur);
      o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + dur + 0.02);
    };
    if (name === 'shutter') {
      const b = ac.createBuffer(1, ac.sampleRate * 0.08, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = ac.createBufferSource(), g = ac.createGain(); g.gain.value = 0.25; s.buffer = b; s.connect(g).connect(ac.destination); s.start();
      tone(1800, 0.05, 0.05, 'square', 0.04);
    }
    if (name === 'coin') { tone(988, 0, 0.1, 'square', 0.06); tone(1319, 0.08, 0.25, 'square', 0.06); }
    if (name === 'fanfare') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.12));
    if (name === 'sparkle') [1568, 2093, 2637].forEach((f, i) => tone(f, i * 0.07, 0.2, 'sine', 0.06));
    if (name === 'bus') { tone(330, 0, 0.25, 'square', 0.05); tone(330, 0.3, 0.25, 'square', 0.05); }
    if (name === 'boat') tone(220, 0, 0.7, 'sawtooth', 0.04);
    if (name === 'unlock') tone(880, 0, 0.12, 'triangle', 0.08);
  } catch { /* 소리를 못 내도 괜찮아요 */ }
}
