// 소리: 파일 없이 코드로 만들어요 (저작권 걱정 없음)
// 배경음(bgm) = 장소마다 바람 · 새 · 풀벌레 · 파도 · 분수 · 잔잔한 음악, 효과음(sfx) = 찰칵 · 동전 · 동물 소리
// 설정에서 따로 켜고 꺼요 (S.bgmOff · S.sfxOff)
import { S } from './state.js';

let ac = null, master = null, bgmBus = null, sfxBus = null, noiseBuf = null;
let amb = null;   // 지금 흐르는 배경음 { nodes, timer, zone, night }

function ctx() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
    bgmBus = ac.createGain(); bgmBus.gain.value = S.bgmOff ? 0 : 0.55; bgmBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = S.sfxOff ? 0 : 1; sfxBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
// 브라우저는 첫 터치 뒤에만 소리를 허락해요
export function unlock() { try { ctx(); if (want) setAmbience(want.zone, want.night); } catch { /* 소리 없음 */ } }
document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else ac.resume(); });

export function setBgm(on) { S.bgmOff = !on; if (bgmBus) bgmBus.gain.setTargetAtTime(on ? 0.55 : 0, ac.currentTime, 0.2); }
export function setSfx(on) { S.sfxOff = !on; if (sfxBus) sfxBus.gain.value = on ? 1 : 0; }

// ---------- 작은 소리 도구 ----------
function tone(bus, f, at, dur, type = 'sine', vol = 0.1, f2 = null) {
  const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
function noise(bus, type, freq, q, vol) {
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(bus); s.start();
  return { s, f, g };
}
function burst(bus, type, freq, dur, vol) {
  const t = ac.currentTime, s = ac.createBufferSource(); s.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(bus); s.start(t); s.stop(t + dur + 0.05);
}
const R = (a, b) => a + Math.random() * (b - a);

// ---------- 배경음 조각 ----------
const birdChirp = (v = 0.035) => { const f = R(2200, 3800); const n = 2 + Math.floor(R(0, 3)); for (let i = 0; i < n; i++) tone(bgmBus, f, i * 0.09, 0.07, 'sine', v, f * R(1.15, 1.4)); };
const tropicBird = () => { const f = R(900, 1400); tone(bgmBus, f, 0, 0.25, 'sine', 0.035, f * 1.6); tone(bgmBus, f * 1.5, 0.3, 0.3, 'sine', 0.03, f); };
const cricket = () => { const f = R(4200, 4800); for (let i = 0; i < 4; i++) tone(bgmBus, f, i * 0.045, 0.03, 'square', 0.006); };
const frogCroak = () => { tone(bgmBus, R(110, 160), 0, 0.18, 'square', 0.02, 90); tone(bgmBus, R(110, 160), 0.25, 0.16, 'square', 0.016, 90); };
const bubble = () => tone(bgmBus, R(300, 600), 0, 0.12, 'sine', 0.03, R(900, 1400));
const owl = () => { tone(bgmBus, 380, 0, 0.35, 'sine', 0.03, 340); tone(bgmBus, 380, 0.5, 0.5, 'sine', 0.03, 330); };
// 광장의 잔잔한 음악 (오음계 실로폰)
const SCALE = [523, 587, 659, 784, 880, 1047];
let step = 0;
const MELODY = [0, 2, 4, 2, 3, 1, 0, -1, 2, 4, 5, 4, 3, 2, 1, -1];
function musicNote() {
  const n = MELODY[step++ % MELODY.length];
  if (n >= 0) { tone(bgmBus, SCALE[n], 0, 0.6, 'triangle', 0.035); tone(bgmBus, SCALE[n] * 2, 0, 0.25, 'sine', 0.01); }
  if (step % 4 === 1) tone(bgmBus, SCALE[[0, 3, 4, 2][Math.floor(step / 4) % 4]] / 2, 0, 1.4, 'sine', 0.03);
}

const SCENES = {
  station: { loops: [['highpass', 2600, 0.6, 0.05]], every: [[0.38, musicNote], [R(3, 6), birdChirp]], night: [[R(1.5, 3), cricket]] },
  savanna: { loops: [['bandpass', 500, 0.6, 0.09]], swell: 0.06, every: [[R(4, 8), birdChirp]], night: [[R(0.8, 2), cricket], [R(8, 14), owl]] },
  desert: { loops: [['bandpass', 700, 0.4, 0.12]], swell: 0.08, every: [[R(9, 15), birdChirp]], night: [[R(1.5, 3), cricket]] },
  jungle: { loops: [['bandpass', 5200, 6, 0.012], ['lowpass', 400, 0.7, 0.04]], every: [[R(3, 6), tropicBird], [R(5, 9), frogCroak], [R(2, 4), birdChirp]], night: [[R(0.6, 1.5), cricket], [R(3, 6), frogCroak]] },
  beach: { loops: [['lowpass', 700, 0.5, 0.16]], waves: true, every: [[R(6, 10), birdChirp]], night: [[R(1.5, 3), cricket]] },
  deep: { loops: [['lowpass', 180, 0.8, 0.18]], drone: true, every: [[R(1.5, 4), bubble]] },
};

let want = null;
export function setAmbience(zone, night) {
  want = { zone, night };
  if (!ac || (amb && amb.zone === zone && amb.night === night)) return;
  stopAmbience();
  const sc = SCENES[zone] || SCENES.station;
  const nodes = sc.loops.map(([t, f, q, v]) => noise(bgmBus, t, f, q, v));
  if (sc.drone) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 55; g.gain.value = 0.05; o.connect(g).connect(bgmBus); o.start(); nodes.push({ s: o, g }); }
  const plan = [...(night && sc.night ? sc.night : sc.every)];
  if (night && zone === 'station') plan.unshift([0.6, musicNote]);   // 밤 광장은 음악을 느리게
  const next = plan.map(([gap]) => ac.currentTime + Math.random() * gap);
  let t0 = ac.currentTime;
  const timer = setInterval(() => {
    if (!ac || document.hidden) return;
    const now = ac.currentTime;
    plan.forEach(([gap, fn], i) => { if (now >= next[i]) { try { fn(); } catch { /* 무시 */ } next[i] = now + (fn === musicNote ? gap : gap * R(0.6, 1.4)); } });
    // 바람 · 파도 너울
    const k = now - t0;
    if (sc.swell) nodes[0].g.gain.value = sc.loops[0][3] * (0.6 + 0.4 * Math.sin(k * 0.4) + sc.swell * Math.sin(k * 1.7));
    if (sc.waves) nodes[0].g.gain.value = sc.loops[0][3] * (0.25 + 0.75 * Math.pow(Math.max(0, Math.sin(k * 0.9)), 2));
  }, 90);
  amb = { nodes, timer, zone, night };
}
function stopAmbience() {
  if (!amb) return;
  clearInterval(amb.timer);
  amb.nodes.forEach((n) => { try { n.g.gain.setTargetAtTime(0, ac.currentTime, 0.2); n.s.stop(ac.currentTime + 1); } catch { /* 이미 멈춤 */ } });
  amb = null;
}

// ---------- 효과음 ----------
const ANIMAL_VOICE = {
  roar: () => { burst(sfxBus, 'lowpass', 300, 0.7, 0.35); tone(sfxBus, 140, 0, 0.6, 'sawtooth', 0.05, 80); },
  chirp: () => { const f = R(2000, 3200); for (let i = 0; i < 3; i++) tone(sfxBus, f, i * 0.08, 0.06, 'sine', 0.08, f * 1.3); },
  croak: () => { tone(sfxBus, 150, 0, 0.18, 'square', 0.06, 100); tone(sfxBus, 150, 0.22, 0.18, 'square', 0.05, 100); },
  squeak: () => tone(sfxBus, 1400, 0, 0.12, 'sine', 0.08, 2200),
  grunt: () => tone(sfxBus, 180, 0, 0.25, 'sawtooth', 0.05, 120),
  hiss: () => burst(sfxBus, 'highpass', 3500, 0.5, 0.12),
  splash: () => { burst(sfxBus, 'bandpass', 1200, 0.35, 0.25); tone(sfxBus, 400, 0, 0.2, 'sine', 0.05, 1200); },
  click: () => { for (let i = 0; i < 4; i++) tone(sfxBus, 2500, i * 0.05, 0.02, 'square', 0.04); },
};
const MODEL_VOICE = {
  lion: 'roar', leopard: 'roar', cheetah: 'grunt', hyena: 'chirp', capybara: 'grunt', camel: 'grunt', aardvark: 'grunt',
  toucan: 'chirp', frog: 'croak', snake: 'hiss', rattlesnake: 'hiss', thornydevil: 'hiss',
  orangutan: 'grunt', sloth: 'squeak', nightmonkey: 'squeak', meerkat: 'squeak', kangaroorat: 'squeak', fennec: 'squeak', hedgehog: 'squeak',
  crab: 'click', ghostcrab: 'click',
};
export function animalVoice(model) { if (!ac) return; (ANIMAL_VOICE[MODEL_VOICE[model] || 'splash'])(); }

export function sfx(name) {
  try {
    ctx();
    if (name === 'shutter') { burst(sfxBus, 'highpass', 1500, 0.08, 0.5); tone(sfxBus, 1800, 0.05, 0.05, 'square', 0.04); }
    if (name === 'coin') { tone(sfxBus, 988, 0, 0.1, 'square', 0.06); tone(sfxBus, 1319, 0.08, 0.25, 'square', 0.06); }
    if (name === 'fanfare') [523, 659, 784, 1047].forEach((f, i) => tone(sfxBus, f, i * 0.11, 0.3, 'triangle', 0.12));
    if (name === 'sparkle') [1568, 2093, 2637].forEach((f, i) => tone(sfxBus, f, i * 0.07, 0.2, 'sine', 0.06));
    if (name === 'bus') { tone(sfxBus, 330, 0, 0.25, 'square', 0.05); tone(sfxBus, 330, 0.3, 0.25, 'square', 0.05); }
    if (name === 'boat') tone(sfxBus, 220, 0, 0.7, 'sawtooth', 0.04);
    if (name === 'unlock') tone(sfxBus, 880, 0, 0.12, 'triangle', 0.08);
    if (name === 'pop') tone(sfxBus, 600, 0, 0.1, 'sine', 0.08, 1200);
    if (name === 'splash') ANIMAL_VOICE.splash();
  } catch { /* 소리를 못 내도 괜찮아요 */ }
}
