/**
 * マリオ風の効果音（Web Audio API で合成。音声ファイルは使わない）。
 * ブラウザの制約上、ユーザー操作（クリック等）の後でないと鳴らない。
 */

const MUTE_KEY = "task-app:muted";

let ctx: AudioContext | null = null;
let muted = false;
let mutedLoaded = false;

function loadMuted() {
  if (mutedLoaded || typeof window === "undefined") return;
  mutedLoaded = true;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    // 読めない環境ではオンのまま
  }
}

export function isMuted(): boolean {
  loadMuted();
  return muted;
}

export function setMuted(value: boolean) {
  loadMuted();
  muted = value;
  try {
    window.localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // 保存できない環境ではメモリ上のみ
  }
}

function getContext(): AudioContext | null {
  loadMuted();
  if (muted || typeof window === "undefined") return null;
  const AudioCtor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  ctx ??= new AudioCtor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOptions {
  from: number;
  to?: number;
  start?: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
}

function tone(c: AudioContext, { from, to = from, start = 0, duration, type = "square", volume = 0.06 }: ToneOptions) {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t0 + duration);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** ジャンプ：音程が一気に上がる矩形波 */
export function playJump() {
  const c = getContext();
  if (!c) return;
  tone(c, { from: 330, to: 900, duration: 0.22 });
}

/** ブロック破壊：ノイズのバーストと低い衝撃音 */
export function playBreak() {
  const c = getContext();
  if (!c) return;

  const length = Math.floor(c.sampleRate * 0.3);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2400, c.currentTime);
  filter.frequency.exponentialRampToValueAtTime(300, c.currentTime + 0.3);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.16, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.3);
  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start();

  tone(c, { from: 140, to: 50, duration: 0.14, volume: 0.12 });
}

/** コイン：高い2音（シ→ミ）。2音目を長く伸ばす */
export function playCoin() {
  const c = getContext();
  if (!c) return;
  tone(c, { from: 988, duration: 0.09 });
  tone(c, { from: 1319, start: 0.09, duration: 0.4 });
}
