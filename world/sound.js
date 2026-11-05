// 섬의 소리: 파일 없이 코드로 직접 연주해요 (저작권 걱정 없음 · 받을 것도 없음).
//  🎵 배경음악(music): 느린 노을 패드 화음 + 칼림바 같은 맑은 선율 + 낮은 베이스. D장조 5음계, 1분에 66박.
//  🌿 배경음(ambience): 바람 · 물소리 · 새 · 풀벌레. 지금 있는 구역과 물가에 따라 섞는 양이 달라져요.
//  두 소리는 크기를 따로 조절해요 (설정 ⚙). 처음 화면을 누르거나 키를 누를 때 켜져요 (브라우저 규칙).
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);   // MIDI 번호 → 주파수
// 화음 네 개를 8박씩 돌려요: Dmaj9 · Bm7 · Gmaj7 · A(sus2)
const CHORDS = [[50, 57, 61, 64, 66], [47, 54, 57, 62, 66], [43, 50, 54, 59, 62], [45, 52, 57, 59, 64]];
const PENTA = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83];   // D E F# A B (두 옥타브)

export class IslandSound {
  constructor() { this.ready = false; this.vol = { music: 0.5, amb: 0.7 }; this.zone = 'village'; this.water = 0; }
  start() {
    if (this.ready) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    let ctx; try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    this.ctx = ctx; this.ready = true;
    this.master = ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(ctx.destination);
    this.music = ctx.createGain(); this.music.gain.value = this.vol.music * 0.55;
    this.amb = ctx.createGain(); this.amb.gain.value = this.vol.amb;
    this.fx = ctx.createGain(); this.fx.gain.value = 0.9;
    this.music.connect(this.master); this.amb.connect(this.master); this.fx.connect(this.master);
    // 울림(리버브): 잡음이 서서히 잦아드는 소리를 직접 만들어 써요
    const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.rev = ctx.createConvolver(); this.rev.buffer = ir; const rg = ctx.createGain(); rg.gain.value = 0.55; this.rev.connect(rg).connect(this.music);
    this.dry = ctx.createGain(); this.dry.gain.value = 0.7; this.dry.connect(this.music);
    // 선율 메아리
    this.echo = ctx.createDelay(1); this.echo.delayTime.value = 60 / 66 * 0.75; const fb = ctx.createGain(); fb.gain.value = 0.28; const eg = ctx.createGain(); eg.gain.value = 0.35;
    this.echo.connect(fb).connect(this.echo); this.echo.connect(eg).connect(this.rev);
    // 잡음 한 덩어리 (바람 · 물)
    const nb = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), nd = nb.getChannelData(0); let b = 0;
    for (let i = 0; i < nd.length; i++) { b = 0.985 * b + 0.015 * (Math.random() * 2 - 1) * 4; nd[i] = b * 0.6 + (Math.random() * 2 - 1) * 0.08; }   // 부드러운(갈색) 잡음
    const loop = (f1, f2, type) => { const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; s.playbackRate.value = f2; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = f1; f.Q.value = 0.6; const g = ctx.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(this.amb); s.start(); return { g, f }; };
    this.wind = loop(500, 1, 'bandpass');
    this.waterN = loop(1400, 1.6, 'lowpass');
    this.crick = ctx.createGain(); this.crick.gain.value = 0; this.crick.connect(this.amb);
    // 풀벌레: 높은 소리를 빠르게 켰다 껐다
    const co = ctx.createOscillator(); co.type = 'sine'; co.frequency.value = 4700; const am = ctx.createGain(); am.gain.value = 0; const lfo = ctx.createOscillator(); lfo.frequency.value = 28; const lg = ctx.createGain(); lg.gain.value = 0.05; lfo.connect(lg).connect(am.gain); co.connect(am).connect(this.crick); co.start(); lfo.start();
    this.t0 = ctx.currentTime + 0.2; this.beat = 60 / 66; this.nextBeat = 0; this.nextBird = ctx.currentTime + 2;
    this.timer = setInterval(() => this.tick(), 100);
    document.addEventListener('visibilitychange', () => { if (document.hidden) ctx.suspend(); else ctx.resume(); });
    this.mix(true);
  }
  setVolume(kind, v) { this.vol[kind] = v; if (!this.ready) return; const t = this.ctx.currentTime; if (kind === 'music') this.music.gain.setTargetAtTime(v * 0.55, t, 0.3); else this.amb.gain.setTargetAtTime(v, t, 0.3); }
  // 구역 · 물가 가까움(0~1)에 따라 배경음 섞기
  setPlace(zone, water) { this.zone = zone; this.water = water; }
  mix(now) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, k = now ? 0.01 : 1.2, z = this.zone;
    const wind = { arctic: 0.55, desert: 0.42, jungle: 0.12, sea: 0.35 }[z] ?? 0.22;
    this.wind.g.gain.setTargetAtTime(wind * (0.8 + Math.random() * 0.4), t, k);
    this.wind.f.frequency.setTargetAtTime((z === 'arctic' ? 700 : z === 'desert' ? 900 : 500) * (0.8 + Math.random() * 0.5), t, 2);
    this.waterN.g.gain.setTargetAtTime(Math.min(1, this.water) * 0.5, t, k);
    const nk = this.night || 0;   // 밤엔 풀벌레가 크게, 새는 잠들어요
    this.crick.gain.setTargetAtTime((z === 'jungle' ? 0.7 : z === 'savanna' ? 0.35 : z === 'village' ? 0.2 : 0) * (1 - nk) + (z === 'arctic' || z === 'sea' ? 0 : 0.85) * nk, t, k);
  }
  // 100ms 마다: 앞으로 0.6초 안의 음을 미리 예약
  tick() {
    const ctx = this.ctx, ahead = ctx.currentTime + 0.6;
    while (this.t0 + this.nextBeat * this.beat < ahead) { this.playBeat(this.nextBeat, this.t0 + this.nextBeat * this.beat); this.nextBeat++; }
    if (ctx.currentTime > this.nextBird) { this.bird(); this.nextBird = ctx.currentTime + 1.5 + Math.random() * 4.5; }
    if (Math.random() < 0.05) this.mix();
  }
  playBeat(i, t) {
    const ci = Math.floor(i / 8) % CHORDS.length, ch = CHORDS[ci];
    if (i % 8 === 0) { ch.forEach((n, k) => this.pad(NOTE(n), t, this.beat * 8.4, k)); this.bass(NOTE(ch[0] - 12), t, this.beat * 7); }
    // 선율: 반박마다 가끔, 화음 음에 가까운 5음계로 천천히 걸어가요
    for (const half of [0, 0.5]) {
      if (Math.random() > (half ? 0.22 : 0.42)) continue;
      this.mi = Math.max(0, Math.min(PENTA.length - 1, (this.mi ?? 4) + Math.round((Math.random() - 0.5) * 3)));
      this.pluck(NOTE(PENTA[this.mi]), t + half * this.beat, 0.12 + Math.random() * 0.08);
    }
  }
  pad(f, t, dur, k) {
    const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.3;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + 2.2); g.gain.setValueAtTime(0.035, t + dur - 2.2); g.gain.linearRampToValueAtTime(0, t + dur);
    for (const d of [-6, 6]) { const o = c.createOscillator(); o.type = k % 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f; o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + dur + 0.1); }
    lp.connect(g); g.connect(this.rev); g.connect(this.dry);
  }
  bass(f, t, dur) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.4); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g).connect(this.dry); o.start(t); o.stop(t + dur); }
  pluck(f, t, v) {   // 칼림바: 기본음 + 맑은 배음, 금방 잦아들어요
    const c = this.ctx, g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + 1.6);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 4.02; const g2 = c.createGain(); g2.gain.value = 0.18;
    o.connect(g); o2.connect(g2).connect(g); g.connect(this.dry); g.connect(this.rev); g.connect(this.echo);
    o.start(t); o2.start(t); o.stop(t + 1.7); o2.stop(t + 1.7);
  }
  bird() {   // 새: 짧게 휘어 올라가는 소리 두세 번 (초원 · 정글 · 마을)
    const z = this.zone; if (!['savanna', 'jungle', 'village'].includes(z) || (this.night || 0) > 0.5) return;
    const c = this.ctx, t = c.currentTime + 0.05, n = 2 + Math.floor(Math.random() * 3), base = 2600 + Math.random() * 2200, pan = c.createStereoPanner ? c.createStereoPanner() : null;
    if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(this.amb); }
    for (let i = 0; i < n; i++) {
      const s = t + i * (0.11 + Math.random() * 0.06), o = c.createOscillator(), g = c.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(base * (0.8 + Math.random() * 0.2), s); o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.4), s + 0.07);
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.05 * (z === 'jungle' ? 1.3 : 1), s + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, s + 0.09);
      o.connect(g).connect(pan || this.amb); o.start(s); o.stop(s + 0.1);
    }
  }
  shutter() {   // 찰칵
    if (!this.ready) return; const c = this.ctx, n = c.sampleRate * 0.05, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    [0, 0.07].forEach((dt) => { const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = 0.4; s.connect(g).connect(this.fx); s.start(c.currentTime + dt); });
  }
  chime() {   // 새 도감 등록: 맑은 음 셋
    if (!this.ready) return; const t = this.ctx.currentTime + 0.05; [74, 78, 81].forEach((n, i) => this.pluck(NOTE(n + 12), t + i * 0.12, 0.25));
  }
}
