// 섬 친구들: 중계 서버의 섬 방(island-1 ~ 12)에 붙어 서로의 자리 · 걸음 · 모습을 나눠요.
// 아이용 kids/js/net.js 와 같은 방식 (서버도 같은 snapzoo-rooms). 채팅은 없어요: 서버가 이름(낱말 조합) · 숫자만 넘겨요.
// 서버가 없거나 닿지 않으면 조용히 혼자 산책. 끊기면 2초, 4초 … 뒤 다시 붙고, 30초 안이면 친구 화면에서는 나간 적 없는 것처럼 보여요.
import { RELAY_URL, NAME_A, NAME_B } from '../kids/js/data.js';

export const ISLANDS = 12, CAP = 100;
const RELAY = (() => {
  const q = new URLSearchParams(location.search).get('relay');   // 시험용: ?relay=http://localhost:8787
  return (q && /^https?:\/\/[\w.:-]+$/.test(q) ? q : RELAY_URL).replace(/\/$/, '');
})();
const store = (k, make) => { try { let v = localStorage.getItem(k); if (v === null) { v = make(); localStorage.setItem(k, v); } return v; } catch { return make(); } };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
// 내 이름 · 모습: 이 기기에 기억 (처음 한 번 무작위)
export const myName = store('snapzoo-island-name', () => `${pick(NAME_A)} ${pick(NAME_B)}`);
export const myLook = +store('snapzoo-island-look', () => String(Math.floor(Math.random() * 8))) % 8;
// 이 탭의 열쇠: 새로 고침했을 때만 이어 받아요. 탭을 복제하거나 새 탭으로 열면 sessionStorage 가 복사돼 같은 열쇠가 되는데,
// 그러면 서버가 두 탭을 한 사람으로 보고 먼저 탭을 밀어내요(먼저 들어온 쪽이 나중 사람을 못 봄). 그래서 그 밖엔 늘 새 열쇠.
const TAB_KEY = (() => {
  const fresh = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random())).replace(/-/g, '').slice(0, 12);
  try {
    const reload = performance.getEntriesByType('navigation')[0]?.type === 'reload';
    let k = reload ? sessionStorage.getItem('snapzoo:island-tab') : null;
    if (!k) k = fresh();
    sessionStorage.setItem('snapzoo:island-tab', k); return k;
  } catch { return fresh(); }
})();

export class IslandNet {
  constructor(h) { this.h = h; this.ws = null; this.room = 0; this.online = false; this.last = null; this.lastSent = 0; this.lastJson = ''; }
  // 사람이 있는(친구가 모인) 방 중 덜 찬 곳 → 아니면 1번
  async join() {
    if (!RELAY) return false;
    let n = 1;
    try {
      const j = await fetch(`${RELAY}/counts?kind=island`, { signal: AbortSignal.timeout(15000) }).then((r) => r.json());
      let bc = -1; (j.counts || []).forEach((c, i) => { if (c < CAP && c > bc) { bc = c; n = i + 1; } });
    } catch { this.h.onStatus?.(); clearTimeout(this.retry); this.retry = setTimeout(() => this.join(), 20000); return false; }   // 섬이 무거워 처음엔 늦을 수 있어요: 20초 뒤 다시
    this.open(n); return true;
  }
  open(n, attempt = 0) {
    this.close(true); this.room = n;
    let ws; try { ws = new WebSocket(`${RELAY.replace(/^http/, 'ws')}/ws?room=island-${n}&k=${TAB_KEY}`); } catch { return; }
    this.ws = ws;
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'hello') { this.online = true; this.h.onReset?.(); m.peers.forEach((p) => p.st && this.h.onState?.(p.id, p.st)); this.h.onStatus?.(); }
      else if (m.t === 'st') this.h.onState?.(m.id, m.d);
      else if (m.t === 'leave') this.h.onLeave?.(m.id);
      else if (m.t === 'full') { ws.onclose = null; ws.close(); this.open(n % ISLANDS + 1); }
    };
    ws.onopen = () => { if (this.last) ws.send(JSON.stringify({ t: 'st', d: this.last })); };
    ws.onclose = (ev) => {
      if (ev && ev.code === 4000) { if (this.ws === ws) { this.ws = null; this.online = false; this.h.onReset?.(); this.h.onStatus?.(); } return; }   // 다른 탭이 같은 열쇠로 들어와 나를 대신함: 다시 붙지 않아요
      if (this.ws !== ws) return;
      this.online = false; this.h.onStatus?.();
      const again = () => { if (this.ws === ws) this.open(n, attempt + 1); };
      if (document.hidden) { const back = () => { if (document.hidden) return; removeEventListener('visibilitychange', back); again(); }; addEventListener('visibilitychange', back); }
      else setTimeout(again, Math.min(15000, 2000 * 2 ** attempt));
    };
    clearInterval(this.pinger); this.pinger = setInterval(() => { if (ws.readyState === 1) ws.send('ping'); }, 25000);
  }
  // 내 모습 보내기: 바뀌었을 때 1초에 8번까지, 그대로면 3초에 한 번
  send(st, now) {
    this.last = st;
    if (!this.ws || this.ws.readyState !== 1) return;
    const j = JSON.stringify(st);
    if (j === this.lastJson ? now - this.lastSent < 3000 : now - this.lastSent < 125) return;
    this.lastJson = j; this.lastSent = now; this.ws.send(JSON.stringify({ t: 'st', d: st }));
  }
  close(keep) {
    if (this.ws) { const ws = this.ws; this.ws = null; ws.onclose = null; try { if (ws.readyState === 1) ws.send(JSON.stringify({ t: 'bye' })); } catch {} try { ws.close(1000, 'bye'); } catch {} }
    clearInterval(this.pinger); this.online = false; if (!keep) this.room = 0; this.h.onReset?.(); this.h.onStatus?.();
  }
}
