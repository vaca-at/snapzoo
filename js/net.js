// 친구와 같이: 정거장 대기실에서만 방 중계 서버에 붙어요 (캠핑장 js/net.js 와 같은 방식).
// 서버가 없거나 닿지 않으면 조용히 혼자 놀기. 끊기면 2초, 4초 … 뒤 다시 붙고,
// 서버가 30초 동안 자리를 남겨 두니 그 안에 붙으면 친구 화면에서는 나간 적 없는 것처럼 보여요.
import { RELAY_URL, SERVER_COUNT, SERVER_CAP } from './data.js';

const RELAY = (() => {
  const q = new URLSearchParams(location.search).get('relay');
  return (q && /^https?:\/\/[\w.:-]+$/.test(q) ? q : RELAY_URL).replace(/\/$/, '');
})();

// 이 탭의 열쇠: 잠깐 끊겼다 다시 붙어도 서버가 같은 사람으로 알아봐요
const TAB_KEY = (() => {
  try {
    let k = sessionStorage.getItem('snapzoo:tab');
    if (!k) { k = crypto.randomUUID().slice(0, 12); sessionStorage.setItem('snapzoo:tab', k); }
    return k;
  } catch { return Math.random().toString(36).slice(2, 14); }
})();

// 방문 세기: 기기마다 하루 한 번 숫자만 보내요 (누군지는 보내지 않아요)
export function countVisit(S, save) {
  const day = new Date().toDateString();
  if (!RELAY || S.visitDay === day) return;
  fetch(`${RELAY}/visit`, { method: 'POST' }).then((r) => { if (r.ok) { S.visitDay = day; save(); } }).catch(() => {});
}

export class Net {
  constructor(h) {
    this.h = h;            // onState(id, st) · onLeave(id) · onReset() · onStatus()
    this.ws = null;
    this.server = 0;       // 지금 붙은 서버 번호 (0 = 혼자)
    this.online = false;
    this.counts = {};
    this.last = null; this.lastSent = 0; this.lastJson = '';
  }

  async fetchCounts() {
    if (!RELAY) return null;
    try {
      const r = await fetch(`${RELAY}/counts`, { signal: AbortSignal.timeout(5000) });
      const j = await r.json();
      this.counts = Object.fromEntries(j.counts.map((c, i) => [i + 1, c]));
      return this.counts;
    } catch { return null; }
  }

  // 들어갈 서버 고르기: 전에 있던 서버 → 아니면 사람이 있는(친구가 모인) 서버 중 덜 찬 곳 → 아니면 1번
  async join(prefer) {
    const c = await this.fetchCounts();
    if (!c) { this.online = false; this.server = 0; this.h.onStatus?.(); return false; }
    let n = prefer && (c[prefer] || 0) < SERVER_CAP ? prefer : 0;
    if (!n) {
      let best = 0, bc = -1;
      for (let i = 1; i <= SERVER_COUNT; i++) { const v = c[i] || 0; if (v < SERVER_CAP && v > bc) { best = i; bc = v; } }
      n = best || 1;
    }
    this.open(n);
    return true;
  }

  open(n, attempt = 0) {
    this.close(true);
    this.server = n;
    const ws = new WebSocket(`${RELAY.replace(/^http/, 'ws')}/ws?room=station-${n}&k=${TAB_KEY}`);
    this.ws = ws;
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'hello') {
        this.online = true; this.selfId = m.id;
        this.h.onReset?.();
        m.peers.forEach((p) => p.st && this.h.onState?.(p.id, p.st));
        this.h.onStatus?.();
      } else if (m.t === 'st') this.h.onState?.(m.id, m.d);
      else if (m.t === 'leave') this.h.onLeave?.(m.id);
      else if (m.t === 'full') { ws.onclose = null; ws.close(); this.open(n % SERVER_COUNT + 1); this.h.onFull?.(n); }
    };
    ws.onopen = () => { attempt = 0; if (this.last) ws.send(JSON.stringify({ t: 'st', d: this.last })); };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.online = false; this.h.onStatus?.();
      const again = () => { if (this.ws === ws) this.open(n, attempt + 1); };
      if (document.hidden) {
        const back = () => { if (document.hidden) return; removeEventListener('visibilitychange', back); again(); };
        addEventListener('visibilitychange', back);
      } else setTimeout(again, Math.min(15000, 2000 * 2 ** attempt));
    };
    clearInterval(this.pinger);
    this.pinger = setInterval(() => { if (ws.readyState === 1) ws.send('ping'); }, 25000);
  }

  // 내 모습 보내기: 바뀌었을 때 1초에 8번까지, 그대로면 3초에 한 번
  send(st, now) {
    this.last = st;
    if (!this.ws || this.ws.readyState !== 1) return;
    const j = JSON.stringify(st);
    if (j === this.lastJson ? now - this.lastSent < 3000 : now - this.lastSent < 125) return;
    this.lastJson = j; this.lastSent = now;
    this.ws.send(JSON.stringify({ t: 'st', d: st }));
  }

  close(keepServer) {
    if (this.ws) { const ws = this.ws; this.ws = null; ws.onclose = null; try { ws.close(); } catch {} }
    clearInterval(this.pinger);
    this.online = false;
    if (!keepServer) this.server = 0;
    this.h.onReset?.();
    this.h.onStatus?.();
  }
}
