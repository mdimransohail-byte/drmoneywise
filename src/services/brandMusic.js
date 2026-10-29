/* ════════════════════════════════════════════════════════════════════════
   BRAND MUSIC — composed here, in code, so we own it outright
   ───────────────────────────────────────────────────────────────────────
   No samples, loops or tracks from anyone else: every note is generated
   from simple sine-wave "instruments" below, so there is nothing to
   license and no copyright claim can be made against our videos.
     open.wav   3-second rising bell chime (start of every video)
     close.wav  3-second falling chime that settles on the home chord
     bed.wav    20-second calm background loop (C – Am – F – G), played
                quietly under the voice and repeated as long as needed
   Made once and saved in data/video/brand/.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

const RATE = 44100;
export const BRAND_DIR = path.join(process.cwd(), 'data', 'video', 'brand');
const VERSION = 2;

const freq = (note) => 440 * 2 ** ((note - 69) / 12); // MIDI note → Hz
const C4 = 60;

function buffer(seconds) { return [new Float32Array(Math.ceil(seconds * RATE)), new Float32Array(Math.ceil(seconds * RATE))]; }

/** Bell: a few harmonics with a quick attack and long fade. */
function bell(buf, start, note, len, vol = 0.3, pan = 0) {
  const f = freq(note);
  const s0 = Math.floor(start * RATE); const n = Math.floor(len * RATE);
  for (let i = 0; i < n && s0 + i < buf[0].length; i += 1) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.006) * Math.exp(-t * 3.2);
    const v = vol * env * (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 6) + 0.12 * Math.sin(2 * Math.PI * f * 3.01 * t) * Math.exp(-t * 9) + 0.06 * Math.sin(2 * Math.PI * f * 4.2 * t) * Math.exp(-t * 12));
    buf[0][s0 + i] += v * (1 - Math.max(0, pan)); buf[1][s0 + i] += v * (1 + Math.min(0, pan));
  }
}
/** Soft pad: slightly detuned sines with slow attack and release. */
function pad(buf, start, notes, len, vol = 0.08, attack = 0.6, release = 0.8) {
  const s0 = Math.floor(start * RATE); const n = Math.floor((len + release) * RATE);
  for (let i = 0; i < n; i += 1) {
    const idx = (s0 + i) % buf[0].length; // wraps round, so loops join smoothly
    const t = i / RATE;
    const env = Math.min(1, t / attack) * (t > len ? Math.max(0, 1 - (t - len) / release) : 1);
    let v = 0;
    for (const [k, note] of notes.entries()) {
      const f = freq(note);
      v += Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.003 * t + k) + 0.18 * Math.sin(2 * Math.PI * f * 2 * t);
    }
    v *= (vol * env) / notes.length;
    buf[0][idx] += v * (1 + 0.15 * Math.sin(t * 0.7)); buf[1][idx] += v * (1 - 0.15 * Math.sin(t * 0.7));
  }
}
/** Pluck: short, soft note. */
function pluck(buf, start, note, vol = 0.07, pan = 0) {
  const f = freq(note); const s0 = Math.floor(start * RATE); const n = Math.floor(0.6 * RATE);
  for (let i = 0; i < n; i += 1) {
    const idx = (s0 + i) % buf[0].length; const t = i / RATE;
    const v = vol * Math.min(1, t / 0.004) * Math.exp(-t * 7) * Math.min(1, (0.6 - t) / 0.1) * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * f * 2 * t));
    buf[0][idx] += v * (1 - Math.max(0, pan)); buf[1][idx] += v * (1 + Math.min(0, pan));
  }
}
function bass(buf, start, note, len, vol = 0.12) {
  const f = freq(note); const s0 = Math.floor(start * RATE); const n = Math.floor(len * RATE);
  for (let i = 0; i < n; i += 1) {
    const idx = (s0 + i) % buf[0].length; const t = i / RATE;
    const tail = Math.min(1, (len - t) / 0.12); // fades out at the end, so notes don't click
    const env = Math.min(1, t / 0.02) * Math.exp(-t * 1.6) * tail;
    const v = vol * env * Math.sin(2 * Math.PI * f * t);
    buf[0][idx] += v; buf[1][idx] += v;
  }
}

function toWav(buf, peak = 0.7, fadeOut = 0) {
  const n = buf[0].length;
  if (fadeOut) for (let i = 0; i < fadeOut * RATE; i += 1) { const k = n - 1 - i; const g = i / (fadeOut * RATE); buf[0][k] *= g; buf[1][k] *= g; }
  let max = 0;
  for (const ch of buf) for (let i = 0; i < n; i += 1) max = Math.max(max, Math.abs(ch[i]));
  const g = max ? peak / max : 1;
  const data = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i += 1) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[0][i] * g)) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[1][i] * g)) * 32767), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

function openChime() {
  const b = buffer(3);
  pad(b, 0, [C4 - 12, C4 + 4, C4 + 7], 2.2, 0.10, 0.5, 0.7);
  [[0.05, C4 + 12], [0.22, C4 + 16], [0.39, C4 + 19], [0.58, C4 + 24]].forEach(([t, n], i) => bell(b, t, n, 3 - t, 0.30, (i - 1.5) * 0.2));
  bell(b, 0.58, C4 + 16, 2.4, 0.12); bell(b, 0.58, C4 + 19, 2.4, 0.12);
  return toWav(b, 0.75, 0.4);
}
function closeChime() {
  const b = buffer(3);
  pad(b, 0.2, [C4 - 12, C4 + 4, C4 + 7, C4 + 12], 2.0, 0.10, 0.4, 0.7);
  [[0.05, C4 + 19], [0.22, C4 + 16], [0.39, C4 + 14], [0.6, C4 + 12]].forEach(([t, n], i) => bell(b, t, n, 3 - t, 0.30, (1.5 - i) * 0.2));
  bell(b, 0.6, C4 + 7, 2.3, 0.14); bell(b, 0.6, C4 + 4, 2.3, 0.12);
  return toWav(b, 0.75, 0.5);
}
function backgroundBed() {
  const beat = 60 / 96; const bar = beat * 4;
  const chords = [[C4, C4 + 4, C4 + 7], [C4 - 3, C4, C4 + 4], [C4 - 7, C4 - 3, C4], [C4 - 5, C4 - 1, C4 + 2]]; // C, Am, F, G
  const roots = [C4 - 24, C4 - 27, C4 - 31, C4 - 29];
  const bars = 8; const b = buffer(bars * bar);
  for (let k = 0; k < bars; k += 1) {
    const c = chords[k % 4]; const t0 = k * bar;
    pad(b, t0, c, bar, 0.09, 0.8, 1.0);
    bass(b, t0, roots[k % 4], beat * 2); bass(b, t0 + beat * 2, roots[k % 4], beat * 2, 0.08);
    const arp = [c[0] + 12, c[1] + 12, c[2] + 12, c[1] + 12, c[0] + 24, c[2] + 12, c[1] + 12, c[2] + 12];
    arp.forEach((n, i) => pluck(b, t0 + i * beat / 2, n, i % 2 ? 0.045 : 0.06, i % 2 ? 0.3 : -0.3));
  }
  return toWav(b, 0.6, 0);
}

/** Writes the three brand sounds once (or after a VERSION change). */
export async function ensureBrandAudio() {
  await fs.mkdir(BRAND_DIR, { recursive: true });
  const stamp = path.join(BRAND_DIR, `music-v${VERSION}.ok`);
  const files = { open: path.join(BRAND_DIR, 'open.wav'), close: path.join(BRAND_DIR, 'close.wav'), bed: path.join(BRAND_DIR, 'bed.wav') };
  try { await fs.access(stamp); return files; } catch { /* make them */ }
  await fs.writeFile(files.open, openChime());
  await fs.writeFile(files.close, closeChime());
  await fs.writeFile(files.bed, backgroundBed());
  await fs.writeFile(stamp, new Date().toISOString());
  return files;
}
