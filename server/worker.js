// 동물 왕국 정거장 대기실 중계 서버.
// 방(station-1 ~ station-12) 하나가 Durable Object 하나. 최대 100명이 웹소켓으로 붙어 서로의 위치 · 동작 · 표정을 나눠요.
// 채팅은 없어요: 서버가 정해진 값(낱말 조합 이름, 목록에 있는 옷 · 동작 · 표정, 숫자)만 골라 넘기고 나머지는 버려요.
// 저장하는 것은 숫자뿐이에요: 날짜별 방문 수 · 시간대 · 동시접속 최고 (누가 왔는지는 남기지 않아요). 관리자 대시보드(/admin)가 읽어요.
import { DurableObject } from 'cloudflare:workers';
import { NAME_A, NAME_B, LOOKS, BODIES, ANIMALS, CAMERAS, ACTIONS, FACES, SERVER_COUNT, SERVER_CAP } from '../kids/js/data.js';

const GRACE = 30e3;   // 끊긴 분 자리를 남겨 두는 시간 (다른 앱에 잠깐 다녀오기, 화면 끄기)
const ROOM_RE = new RegExp(`^station-([1-9]|1[0-9]|20)$`);
const ORIGINS = ['https://snapzoo.site', 'https://www.snapzoo.site', 'https://vaca-at.github.io', 'https://jsun.site', 'http://localhost:8765', 'http://127.0.0.1:8765'];

function cors(req) {
  const o = req.headers.get('Origin');
  return { 'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0], 'Vary': 'Origin' };
}
const json = (req, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(req) } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      const origin = req.headers.get('Origin');
      if (origin && !ORIGINS.includes(origin)) return new Response('forbidden', { status: 403 });
      const room = url.searchParams.get('room') || '';
      if (!ROOM_RE.test(room)) return new Response('bad room', { status: 400 });
      return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(req);
    }
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...cors(req), 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400' } });
    const stats = () => env.STATS.get(env.STATS.idFromName('stats'));
    // 방문: 기기마다 하루 한 번 숫자만 +1 (게임이 보내요)
    if (url.pathname === '/visit' && req.method === 'POST') {
      const origin = req.headers.get('Origin');
      if (origin && !ORIGINS.includes(origin)) return json(req, { error: 'forbidden' }, 403);
      await stats().fetch('https://stats/visit', { method: 'POST' });
      return json(req, { ok: true });
    }
    // 관리자: 비밀번호(ADMIN_PASSWORD)가 맞을 때만 숫자를 보여 줘요
    if (url.pathname === '/admin/stats') {
      const auth = (req.headers.get('Authorization') || '').replace(/^Bearer /, '').trim();
      if (!env.ADMIN_PASSWORD || !(await same(auth, env.ADMIN_PASSWORD.trim()))) return json(req, { error: 'unauthorized' }, 401);
      const s = await stats().fetch('https://stats/read').then((r) => r.json());
      const rooms = await Promise.all(Array.from({ length: SERVER_COUNT }, (_, i) =>
        env.ROOMS.get(env.ROOMS.idFromName(`station-${i + 1}`)).fetch('https://room/count').then((r) => r.json()).then((j) => j.n).catch(() => 0)));
      return json(req, { ...s, rooms, online: rooms.reduce((a, b) => a + b, 0), now: Date.now() });
    }
    // 서버별 인원 (숫자만)
    if (url.pathname === '/counts') {
      const counts = await Promise.all(Array.from({ length: SERVER_COUNT }, (_, i) =>
        env.ROOMS.get(env.ROOMS.idFromName(`station-${i + 1}`)).fetch('https://room/count').then((r) => r.json()).then((j) => j.n).catch(() => 0)));
      return json(req, { counts });
    }
    return json(req, { ok: true, name: 'snapzoo-rooms' });
  },
};

// 비밀번호 비교: 해시끼리 (글자 수나 앞부분으로 알아낼 수 없게)
async function same(a, b) {
  const h = async (x) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x)));
  const [x, y] = await Promise.all([h(a), h(b)]);
  let d = 0; for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}
const kstNow = () => new Date(Date.now() + 9 * 3600e3);
const kstDay = () => kstNow().toISOString().slice(0, 10);

// ---------- 숫자 세기 저장소 (하나뿐) ----------
export class Stats extends DurableObject {
  async fetch(req) {
    const url = new URL(req.url);
    const day = kstDay(), hour = kstNow().getUTCHours();
    if (url.pathname === '/visit') {
      const d = (await this.ctx.storage.get(`d:${day}`)) || { visits: 0, peak: 0, hours: Array(24).fill(0) };
      d.visits++; d.hours[hour]++;
      await this.ctx.storage.put(`d:${day}`, d);
      await this.ctx.storage.put('total', ((await this.ctx.storage.get('total')) || 0) + 1);
      return Response.json({ ok: true });
    }
    if (url.pathname === '/peak') {
      const { n } = await req.json();
      const d = (await this.ctx.storage.get(`d:${day}`)) || { visits: 0, peak: 0, hours: Array(24).fill(0) };
      if (n > d.peak) { d.peak = n; await this.ctx.storage.put(`d:${day}`, d); }
      const best = (await this.ctx.storage.get('best')) || { n: 0 };
      if (n > best.n) await this.ctx.storage.put('best', { n, at: Date.now() });
      return Response.json({ ok: true });
    }
    if (url.pathname === '/read') {
      const all = await this.ctx.storage.list({ prefix: 'd:', reverse: true, limit: 60 });
      const days = {}; for (const [k, v] of all) days[k.slice(2)] = v;
      return Response.json({ days, today: day, total: (await this.ctx.storage.get('total')) || 0, best: (await this.ctx.storage.get('best')) || { n: 0 } });
    }
    return new Response('?', { status: 404 });
  }
}

// ---------- 넘겨도 되는 값만 고르기 ----------
const NAMES = new Set(NAME_A.flatMap((a) => NAME_B.map((b) => `${a} ${b}`)));
const HAIR = new Set(LOOKS.hair.map((x) => x.id)), OUTFIT = new Set(LOOKS.outfit.map((x) => x.id)), ITEM = new Set(LOOKS.item.map((x) => x.id));
const ANIMAL_IDS = new Set(ANIMALS.map((x) => x.id));
const CAMS = new Set(CAMERAS.map((x) => x.id)), ACTS = new Set(ACTIONS.map((x) => x.id)), BODY = new Set(BODIES.map((x) => x.id));
const num = (v, lim) => (Number.isFinite(+v) ? Math.max(-lim, Math.min(lim, Math.round(+v * 100) / 100)) : 0);
export function cleanState(d) {
  if (!d || typeof d !== 'object' || !NAMES.has(d.n)) return null;
  const w = d.w && typeof d.w === 'object' ? d.w : {};
  return {
    n: d.n,
    x: num(d.x, 40), z: num(d.z, 40), y: Math.max(0, num(d.y, 5)), r: num(d.r, 7),
    m: d.m ? 1 : 0, s: d.s ? 1 : 0,
    a: ACTS.has(d.a) ? d.a : '',
    f: Number.isInteger(d.f) && d.f >= 0 && d.f < FACES.length ? d.f : -1,
    w: { b: BODY.has(w.b) ? w.b : 'block', g: w.g === 'f' ? 'f' : 'm', h: HAIR.has(w.h) ? w.h : 'short', o: OUTFIT.has(w.o) ? w.o : 'explorer', i: Array.isArray(w.i) ? [...new Set(w.i.filter((i) => ITEM.has(i)))].slice(0, ITEM.size) : [] },
    c: CAMS.has(d.c) ? d.c : 'copper',
    v: d.a === 'show' && ANIMAL_IDS.has(d.v) ? d.v : '', vs: [1, 2, 3].includes(d.vs) ? d.vs : 1,
  };
}

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // 'ping' 에는 깨어나지 않고 바로 'pong' (잠든 방 비용 절약)
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  // 모습을 보낸 사람만 세요
  members() {
    return this.ctx.getWebSockets().map((ws) => ({ ws, a: ws.deserializeAttachment() })).filter((m) => m.a?.st && !m.a.quiet);
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/count') return Response.json({ n: this.members().length });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    if (this.members().length >= SERVER_CAP) {
      server.send(JSON.stringify({ t: 'full' }));
      server.close(4001, 'full');
      return new Response(null, { status: 101, webSocket: client });
    }
    // 같은 탭(k)이 30초 안에 다시 붙으면 예전 번호와 모습을 그대로 이어 받아요
    const k = String(url.searchParams.get('k') || '').slice(0, 24);
    let id = crypto.randomUUID().slice(0, 8), st = null;
    if (k) {
      const back = await this.ctx.storage.get(`gone:${k}`);
      if (back) { ({ id, st } = back); await this.ctx.storage.delete(`gone:${k}`); }
      for (const m of this.ctx.getWebSockets()) {
        const x = m.deserializeAttachment();
        if (m === server || x?.k !== k) continue;
        if (!back) ({ id, st } = x);
        m.serializeAttachment({ ...x, quiet: true });
        try { m.close(4000, 'replaced'); } catch {}
      }
    }
    server.serializeAttachment({ id, k, st, n: 0, w: Date.now() });
    const gone = await this.ctx.storage.list({ prefix: 'gone:' });
    const peers = [...this.members().filter((m) => m.ws !== server).map((m) => m.a), ...gone.values()].map((a) => ({ id: a.id, st: a.st }));
    server.send(JSON.stringify({ t: 'hello', id, peers }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > 1000) return;
    const a = ws.deserializeAttachment();
    if (!a) return;
    // 1초에 15개 넘게 보내면 버려요
    const now = Date.now();
    if (now - a.w > 1000) { a.w = now; a.n = 0; }
    if (++a.n > 15) { ws.serializeAttachment(a); return; }
    let m; try { m = JSON.parse(msg); } catch { return; }
    // 버스 · 배를 타고 떠나요: 자리를 남기지 않고 바로 '나갔어요'
    if (m.t === 'bye') {
      if (a.st) this.broadcast({ t: 'leave', id: a.id }, ws);
      a.quiet = true; a.st = null; ws.serializeAttachment(a);
      return;
    }
    if (m.t !== 'st') return;
    const st = cleanState(m.d);
    if (!st) return;
    const first = !a.st;
    a.st = st;
    ws.serializeAttachment(a);
    this.broadcast({ t: 'st', id: a.id, d: st }, ws);
    // 처음 들어온 분이면 동시접속 최고 기록을 알려요 (숫자만)
    if (first) { const n = this.members().length; this.ctx.waitUntil?.(this.env.STATS.get(this.env.STATS.idFromName('stats')).fetch('https://stats/peak', { method: 'POST', body: JSON.stringify({ n }) }).catch(() => {})); }
  }

  async webSocketClose(ws, code) {
    const a = ws.deserializeAttachment();
    try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch {}
    if (!a?.st || a.quiet) return;
    // 바로 '나갔어요' 하지 않고 30초 기다려요. 그 안에 같은 탭이 다시 붙으면 없던 일
    if (a.k) {
      await this.ctx.storage.put(`gone:${a.k}`, { id: a.id, st: a.st, at: Date.now() });
      if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + GRACE);
      return;
    }
    this.broadcast({ t: 'leave', id: a.id }, ws);
  }

  async alarm() {
    const gone = await this.ctx.storage.list({ prefix: 'gone:' });
    let next = Infinity;
    for (const [key, g] of gone) {
      if (Date.now() - g.at >= GRACE) { this.broadcast({ t: 'leave', id: g.id }); await this.ctx.storage.delete(key); }
      else next = Math.min(next, g.at + GRACE);
    }
    if (next !== Infinity) await this.ctx.storage.setAlarm(next);
  }

  webSocketError(ws) { this.webSocketClose(ws, 1011); }

  broadcast(obj, except) {
    const s = JSON.stringify(obj);
    for (const ws of this.ctx.getWebSockets()) if (ws !== except) { try { ws.send(s); } catch {} }
  }
}
