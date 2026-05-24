let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;

let musicTimer: number | null = null;
let musicNextTime = 0;
let musicBar = 0;

const BPM = 88;
const SEC_PER_BEAT = 60 / BPM;
const BEATS_PER_BAR = 4;
const SEC_PER_BAR = SEC_PER_BEAT * BEATS_PER_BAR;
// Bass roots for the loop: A1, F1, D1, E1 (i - VI - iv - V in A minor)
const BASS_ROOTS = [55.0, 43.65, 36.71, 41.2];
const CHORD_TYPES: ('minor' | 'major')[] = ['minor', 'major', 'minor', 'major'];

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return;
  }
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);

  const len = ctx.sampleRate * 1.0;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
}

export function setMuted(m: boolean) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.55;
}

export function setMusicVolume(v: number) {
  if (musicGain && ctx) {
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.4);
  }
}

export function isMuted(): boolean {
  return muted;
}

function now(): number {
  return ctx!.currentTime;
}

function noise(): AudioBufferSourceNode {
  const src = ctx!.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = false;
  return src;
}

function env(
  target: AudioNode,
  peak: number,
  attack: number,
  release: number,
  t: number,
): GainNode {
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  g.connect(target);
  return g;
}

function volumeFor(distance: number, max = 20): number {
  if (distance <= 1) return 1;
  if (distance >= max) return 0;
  return 1 - distance / max;
}

export function playPistol() {
  if (!ctx || muted) return;
  const t = now();

  // Crack transient (high-passed noise burst)
  const n1 = noise();
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  const g1 = env(master!, 0.75, 0.0005, 0.04, t);
  n1.connect(hp).connect(g1);
  n1.start(t);
  n1.stop(t + 0.06);

  // Body — pitched downward triangle
  const body = ctx.createOscillator();
  body.type = 'triangle';
  body.frequency.setValueAtTime(420, t);
  body.frequency.exponentialRampToValueAtTime(85, t + 0.07);
  const gb = env(master!, 0.6, 0.001, 0.09, t);
  body.connect(gb);
  body.start(t);
  body.stop(t + 0.12);

  // Sub punch
  const sub = ctx.createOscillator();
  sub.type = 'square';
  sub.frequency.setValueAtTime(140, t);
  sub.frequency.exponentialRampToValueAtTime(60, t + 0.04);
  const gs = env(master!, 0.45, 0.0005, 0.04, t);
  sub.connect(gs);
  sub.start(t);
  sub.stop(t + 0.06);
}

export function playShotgun() {
  if (!ctx || muted) return;
  const t = now();

  // Sharp opening crack
  const crack = noise();
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2400;
  const gc = env(master!, 0.65, 0.0005, 0.05, t);
  crack.connect(hp).connect(gc);
  crack.start(t);
  crack.stop(t + 0.07);

  // Main blast — wide noise sweeping into low-mids
  const blast = noise();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(3800, t);
  lp.frequency.exponentialRampToValueAtTime(220, t + 0.28);
  const gB = env(master!, 0.95, 0.001, 0.3, t);
  blast.connect(lp).connect(gB);
  blast.start(t);
  blast.stop(t + 0.34);

  // Sub boom
  const boom = ctx.createOscillator();
  boom.type = 'sine';
  boom.frequency.setValueAtTime(160, t);
  boom.frequency.exponentialRampToValueAtTime(32, t + 0.24);
  const go = env(master!, 0.9, 0.001, 0.24, t);
  boom.connect(go);
  boom.start(t);
  boom.stop(t + 0.28);

  // Tail rumble
  const tail = noise();
  const lp2 = ctx.createBiquadFilter();
  lp2.type = 'lowpass';
  lp2.frequency.value = 200;
  const gt = env(master!, 0.35, 0.04, 0.32, t + 0.08);
  tail.connect(lp2).connect(gt);
  tail.start(t + 0.08);
  tail.stop(t + 0.5);
}

export function playEmpty() {
  if (!ctx || muted) return;
  const t = now();
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 240;
  const g = env(master!, 0.12, 0.001, 0.04, t);
  osc.connect(g);
  osc.start(t);
  osc.stop(t + 0.06);
}

export function playSwitch() {
  if (!ctx || muted) return;
  const t = now();
  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 1100 - i * 280;
    const g = env(master!, 0.09, 0.001, 0.04, t + i * 0.05);
    osc.connect(g);
    osc.start(t + i * 0.05);
    osc.stop(t + i * 0.05 + 0.06);
  }
}

export function playEnemyHurt(distance: number) {
  if (!ctx || muted) return;
  const v = volumeFor(distance);
  if (v <= 0) return;
  const t = now();
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(280, t);
  osc.frequency.exponentialRampToValueAtTime(110, t + 0.16);
  const g = env(master!, 0.35 * v, 0.001, 0.18, t);
  osc.connect(g);
  osc.start(t);
  osc.stop(t + 0.2);
}

export function playEnemyDeath(distance: number) {
  if (!ctx || muted) return;
  const v = volumeFor(distance);
  if (v <= 0) return;
  const t = now();
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.55);
  const g = env(master!, 0.45 * v, 0.001, 0.55, t);
  osc.connect(g);
  osc.start(t);
  osc.stop(t + 0.6);

  const n = noise();
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 550;
  bp.Q.value = 1.8;
  const ng = env(master!, 0.25 * v, 0.001, 0.3, t);
  n.connect(bp).connect(ng);
  n.start(t);
  n.stop(t + 0.35);
}

export function playPlayerHurt() {
  if (!ctx || muted) return;
  const t = now();
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.14);
  const g = env(master!, 0.4, 0.001, 0.16, t);
  osc.connect(g);
  osc.start(t);
  osc.stop(t + 0.2);
}

export function playStep() {
  if (!ctx || muted) return;
  const t = now();
  const n = noise();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 380;
  const g = env(master!, 0.18, 0.001, 0.07, t);
  n.connect(lp).connect(g);
  n.start(t);
  n.stop(t + 0.1);
}

export function playGameOver() {
  if (!ctx || muted) return;
  const t = now();
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 1.2);
  const g = env(master!, 0.5, 0.01, 1.2, t);
  osc.connect(g);
  osc.start(t);
  osc.stop(t + 1.3);
}

function scheduleBassPulse(t: number, freq: number) {
  const osc = ctx!.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  const lp = ctx!.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 240;
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + SEC_PER_BEAT * 0.55);
  osc.connect(lp).connect(g).connect(musicGain!);
  osc.start(t);
  osc.stop(t + SEC_PER_BEAT * 0.6);
}

function schedulePad(t: number, rootFreq: number, type: 'minor' | 'major') {
  const third = rootFreq * Math.pow(2, (type === 'minor' ? 3 : 4) / 12);
  const fifth = rootFreq * Math.pow(2, 7 / 12);
  const oct = rootFreq * 2;
  const dur = SEC_PER_BAR * 0.95;
  for (const f of [rootFreq, third, fifth, oct]) {
    const osc = ctx!.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.045, t + 0.5);
    g.gain.setValueAtTime(0.045, t + dur - 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(musicGain!);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}

function scheduleClang(t: number) {
  const osc = ctx!.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 62;
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  osc.connect(g).connect(musicGain!);
  osc.start(t);
  osc.stop(t + 0.55);

  const n = noise();
  const bp = ctx!.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2400;
  bp.Q.value = 4;
  const ng = ctx!.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.08, t + 0.003);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  n.connect(bp).connect(ng).connect(musicGain!);
  n.start(t);
  n.stop(t + 0.35);
}

function tickMusic() {
  if (!ctx || !musicGain) return;
  const lookahead = 0.2;
  const horizon = ctx.currentTime + lookahead;
  while (musicNextTime < horizon) {
    const idx = musicBar % BASS_ROOTS.length;
    const root = BASS_ROOTS[idx];
    const fifth = root * Math.pow(2, 7 / 12);
    for (let beat = 0; beat < BEATS_PER_BAR; beat++) {
      const tNote = musicNextTime + beat * SEC_PER_BEAT;
      scheduleBassPulse(tNote, beat % 2 === 0 ? root : fifth);
    }
    schedulePad(musicNextTime, root * 2, CHORD_TYPES[idx]);
    if (musicBar % 4 === 0) scheduleClang(musicNextTime);
    musicNextTime += SEC_PER_BAR;
    musicBar++;
  }
}

export function startMusic() {
  if (!ctx || musicTimer !== null) return;
  if (!musicGain) {
    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(master!);
  }
  musicGain.gain.cancelScheduledValues(ctx.currentTime);
  musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
  musicGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2.0);
  musicNextTime = ctx.currentTime + 0.1;
  musicBar = 0;
  musicTimer = window.setInterval(tickMusic, 80);
}

export function stopMusic(fadeSec = 0.8) {
  if (musicTimer !== null) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  if (musicGain && ctx) {
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeSec);
  }
}

export function playVictory() {
  if (!ctx || muted) return;
  const t = now();
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const g = env(master!, 0.3, 0.005, 0.25, t + i * 0.12);
    osc.connect(g);
    osc.start(t + i * 0.12);
    osc.stop(t + i * 0.12 + 0.3);
  });
}
