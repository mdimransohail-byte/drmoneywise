/* ════════════════════════════════════════════════════════════════════════
   VIDEO MAKER — Shorts and longer videos from the site's own content
   (Admin → Social studio → Video maker)
   ───────────────────────────────────────────────────────────────────────
   1. Script: built from the page's own words and figures (explainer,
      company, results, Shariah list, report). Every scene can be edited.
   2. Voice, chosen per video:
        computer  OpenAI's text-to-speech (needs the OpenAI key). OpenAI's
                  rules ask us to tell listeners the voice is computer-
                  generated; that line is added to the video description.
        own       your voice: record each scene in Admin, or upload one
                  recording of the whole script.
   3. Pictures: each scene is drawn like the social pictures, over free
      Pexels photos (free for commercial use; credited in the description).
   4. Brand: the same 3-second opening and closing in every video, with
      our own music (brandMusic.js), and a quiet music bed under the voice.
   5. ffmpeg (from the @ffmpeg-installer npm package) joins it all into an
      MP4: Shorts 1080×1920 (vertical), long videos 1920×1080.
   Projects live in data/video/projects/<id>/ and are kept for 60 days.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import os from 'node:os';

import { contentFor, loadFonts, fit, wrap, textLines, width, BRAND as C, TILE_COLOURS, fetchImage, svgToPng, siteDetails } from './socialCardService.js';
import { ensureBrandAudio } from './brandMusic.js';
import { readStore } from './storeService.js';

const ROOT = path.join(process.cwd(), 'data', 'video');
const PROJECTS = path.join(ROOT, 'projects');
const FORMATS = {
  short: { w: 1080, h: 1920, fps: 30, label: 'Short (vertical, 30–60 seconds)' },
  long: { w: 1920, h: 1080, fps: 25, label: 'Video (landscape, a few minutes)' },
};
export const VOICES = ['coral', 'sage', 'nova', 'alloy', 'ash', 'onyx'];
const WORDS_PER_SECOND = 2.5;

let ffmpegPath = null;
async function ffmpeg() {
  if (ffmpegPath) return ffmpegPath;
  try { ffmpegPath = (await import('@ffmpeg-installer/ffmpeg')).default.path; } catch { ffmpegPath = 'ffmpeg'; }
  return ffmpegPath;
}
function run(args, { timeout = 30 * 60 * 1000 } = {}) {
  return new Promise(async (resolve, reject) => {
    const p = spawn(await ffmpeg(), ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
    let err = '';
    p.stderr.on('data', (d) => { err += d; if (err.length > 20000) err = err.slice(-10000); });
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('ffmpeg took too long')); }, timeout);
    p.on('close', (code) => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`ffmpeg failed: ${err.trim().split('\n').slice(-3).join(' ')}`)); });
    p.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}
/** Length of an audio file in seconds (read from ffmpeg's own report). */
function duration(file) {
  return new Promise(async (resolve) => {
    const p = spawn(await ffmpeg(), ['-hide_banner', '-i', file]);
    let out = '';
    p.stderr.on('data', (d) => { out += d; });
    p.on('close', () => { const m = out.match(/Duration:\s*(\d+):(\d+):([\d.]+)/u); resolve(m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0); });
    p.on('error', () => resolve(0));
  });
}

/* ── Projects ─────────────────────────────────────────────────────── */
const dirOf = (id) => path.join(PROJECTS, id);
const validId = (id) => /^[a-f0-9]{10}$/u.test(String(id || ''));
async function saveProject(p) {
  await fs.mkdir(dirOf(p.id), { recursive: true });
  await fs.writeFile(path.join(dirOf(p.id), 'project.json'), JSON.stringify(p, null, 1), 'utf8');
  return p;
}
export async function getProject(id) {
  if (!validId(id)) return null;
  try { return JSON.parse(await fs.readFile(path.join(dirOf(id), 'project.json'), 'utf8')); } catch { return null; }
}
export async function listProjects() {
  try {
    const ids = (await fs.readdir(PROJECTS)).filter(validId);
    const out = [];
    for (const id of ids) { const p = await getProject(id); if (p) out.push({ id, title: p.title, format: p.format, status: p.status, createdAt: p.createdAt, seconds: p.seconds || null }); }
    return out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 30);
  } catch { return []; }
}
export async function projectFile(id, name) {
  if (!validId(id) || !/^[\w.-]+\.(mp4|jpg|wav|webm|ogg|m4a|mp3)$/u.test(name)) return null;
  try { return await fs.readFile(path.join(dirOf(id), name)); } catch { return null; }
}

/* ── Script ───────────────────────────────────────────────────────── */
const sentences = (t) => String(t || '').replace(/\s+/gu, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z0-9“"‘'(])/u).filter(Boolean);
const words = (t) => String(t || '').split(/\s+/u).filter(Boolean).length;
const clip = (t, n) => (String(t || '').length > n ? `${String(t).slice(0, n).replace(/\s+\S*$/u, '')}…` : String(t || ''));
/** Groups sentences into chunks of about maxWords. */
function chunk(text, maxWords) {
  const out = []; let cur = [];
  for (const s of sentences(text)) {
    if (cur.length && words([...cur, s].join(' ')) > maxWords) { out.push(cur.join(' ')); cur = []; }
    cur.push(s);
  }
  if (cur.length) out.push(cur.join(' '));
  return out;
}
const scene = (kind, heading, text, extra = {}) => ({ id: crypto.randomBytes(3).toString('hex'), kind, heading: clip(heading, 70), text: String(text || '').trim(), ...extra });

async function buildScenes(c, format, url) {
  const short = format === 'short';
  const s = c.site;
  const scenes = [];
  const close = scene('cta', 'Learn more, free', `For more plain-English money guides, visit ${s.domain.replace(/\./gu, ' dot ')}. ${short ? 'Follow for more.' : 'And sign up for our free weekly newsletter.'}`, { screen: `${s.domain}${c.kind === 'explainer' || c.kind === 'company' ? `/${c.link.split('/').slice(1).join('/')}` : ''}` });
  if (c.kind === 'explainer') {
    const store = await readStore();
    const slug = c.link.split('/').pop();
    const a = (store.articles || []).find((y) => y.slug === slug) || {};
    scenes.push(scene('title', c.badge, `${c.title}. ${c.sub || ''}`.trim(), { screen: c.title }));
    if (short) {
      const pts = (c.points || []).slice(0, 3);
      for (const p of pts) scenes.push(scene('point', '', p));
      if (a.everydayExample && words(scenes.map((x) => x.text).join(' ')) < 90) scenes.push(scene('point', 'Everyday example', clip(sentences(a.everydayExample).slice(0, 2).join(' '), 220)));
    } else {
      if (a.plainEnglish) chunk(a.plainEnglish, 45).forEach((t) => scenes.push(scene('point', 'In plain English', t)));
      for (const b of a.bodySections || []) chunk(b.body, 45).forEach((t, i) => scenes.push(scene('point', i ? '' : b.heading, t)));
      if (a.whyItMatters) chunk(a.whyItMatters, 45).forEach((t, i) => scenes.push(scene('point', i ? '' : 'Why it matters', t)));
      if (a.everydayExample) chunk(a.everydayExample, 45).forEach((t, i) => scenes.push(scene('point', i ? '' : 'An everyday example', t)));
      for (const j of (a.jargonBuster || []).slice(0, 4)) if (j.term && (j.meaning || j.definition)) scenes.push(scene('point', 'Jargon buster', `${j.term}: ${j.meaning || j.definition}`));
      const take = (a.takeaways || []).map((t) => (typeof t === 'string' ? t : t.text || '')).filter(Boolean);
      if (take.length) scenes.push(scene('list', 'To remember', `To remember: ${take.slice(0, 4).join(' ')}`, { list: take.slice(0, 4) }));
    }
  } else if (c.kind === 'company') {
    scenes.push(scene('title', c.badge, `Let's look at ${c.title.replace(/\s*\([A-Z0-9.-]+\)$/u, '')}, in plain English, using its own yearly report.`, { screen: c.title }));
    if (c.stats?.length) scenes.push(scene('stats', 'The numbers', c.stats.map((x) => `${x.label}: ${x.value}.`).join(' '), { stats: c.stats }));
    for (const p of (c.points || []).slice(0, short ? 3 : 6)) scenes.push(scene('point', '', p));
  } else if (c.kind === 'results') {
    scenes.push(scene('title', c.badge, c.title, { screen: c.title }));
    for (const t of chunk(c.sub, short ? 30 : 45).slice(0, short ? 2 : 6)) scenes.push(scene('point', 'In simple words', t.replace(/…$/u, '.')));
    if (c.stats?.length) scenes.push(scene('stats', 'Key numbers', c.stats.map((x) => `${x.label}: ${x.value}${x.note ? `, ${x.note}` : ''}.`).join(' '), { stats: c.stats }));
  } else {
    scenes.push(scene('title', c.badge, `${c.title}. ${c.sub || ''}`.trim(), { screen: c.title }));
    if (c.stats?.length) scenes.push(scene('stats', '', c.stats.map((x) => `${x.label}: ${x.value}${x.note ? ` ${x.note}` : ''}.`).join(' '), { stats: c.stats }));
    for (const p of (c.points || []).slice(0, short ? 3 : 8)) scenes.push(scene('point', '', p));
  }
  scenes.push(close);
  // Shorts: keep under about 60 seconds including the 6 seconds of brand opening and closing
  if (short) {
    let total = 0;
    const kept = [];
    for (const sc of scenes) {
      const t = words(sc.text) / WORDS_PER_SECOND + 0.6;
      if (sc.kind !== 'cta' && total + t > 48 && kept.length >= 2) continue;
      kept.push(sc); total += t;
    }
    return kept;
  }
  return scenes;
}

/** Step 1: a new project with a script to check. */
export async function createProject({ url, format = 'short', origin = '' }) {
  if (!FORMATS[format]) throw Object.assign(new Error('Choose Short or Video.'), { status: 400 });
  const c = await contentFor(url, { origin });
  if (c.kind === 'picture') throw Object.assign(new Error('Videos are made from pages on our site, not picture links.'), { status: 400 });
  const scenes = await buildScenes(c, format, url);
  const id = crypto.randomBytes(5).toString('hex');
  const p = {
    id, url, format, kind: c.kind, title: c.title, badge: c.badge, link: c.link, tags: c.tags || [], heroPhoto: c.photo || null, ticker: c.ticker || null,
    voice: 'computer', voiceName: 'coral', scenes, status: 'draft', createdAt: new Date().toISOString(),
  };
  return saveProject(p);
}

export async function updateProject(id, body) {
  const p = await getProject(id);
  if (!p) throw Object.assign(new Error('Project not found.'), { status: 404 });
  if (p.status === 'rendering') throw Object.assign(new Error('This video is being made; wait until it finishes.'), { status: 400 });
  if (Array.isArray(body.scenes)) {
    const old = new Map(p.scenes.map((s) => [s.id, s]));
    p.scenes = body.scenes.slice(0, 80).map((s) => ({ ...(old.get(s.id) || scene('point', '', '')), id: old.has(s.id) ? s.id : crypto.randomBytes(3).toString('hex'), heading: clip(s.heading, 70), text: String(s.text || '').slice(0, 1200), screen: s.screen !== undefined ? String(s.screen).slice(0, 200) : old.get(s.id)?.screen })).filter((s) => s.text || s.kind === 'cta');
  }
  if (body.voice === 'computer' || body.voice === 'own') p.voice = body.voice;
  if (VOICES.includes(body.voiceName)) p.voiceName = body.voiceName;
  if (typeof body.title === 'string' && body.title.trim()) p.title = body.title.trim().slice(0, 200);
  if (p.status !== 'draft') p.status = 'draft';
  return saveProject(p);
}

/** Your own voice: one scene (sceneId) or the whole script (sceneId 'all'). */
export async function saveRecording(id, sceneId, buf, type) {
  const p = await getProject(id);
  if (!p) throw Object.assign(new Error('Project not found.'), { status: 404 });
  const ext = /webm/u.test(type) ? 'webm' : /ogg/u.test(type) ? 'ogg' : /mp4|m4a|aac/u.test(type) ? 'm4a' : /mpeg|mp3/u.test(type) ? 'mp3' : /wav/u.test(type) ? 'wav' : null;
  if (!ext) throw Object.assign(new Error('Please use an MP3, M4A, WAV, OGG or WebM audio file.'), { status: 400 });
  if (buf.length < 2000) throw Object.assign(new Error('That recording is empty.'), { status: 400 });
  const name = sceneId === 'all' ? `voice-all.${ext}` : `voice-${sceneId}.${ext}`;
  if (sceneId !== 'all' && !p.scenes.some((s) => s.id === sceneId)) throw Object.assign(new Error('Scene not found.'), { status: 404 });
  await fs.writeFile(path.join(dirOf(id), name), buf);
  const secs = await duration(path.join(dirOf(id), name));
  if (sceneId === 'all') p.voiceAll = { file: name, seconds: secs };
  else p.scenes = p.scenes.map((s) => (s.id === sceneId ? { ...s, voiceFile: name, voiceSeconds: secs } : s));
  p.voice = 'own';
  await saveProject(p);
  return { ok: true, seconds: Math.round(secs * 10) / 10 };
}

/* ── Computer voice (OpenAI) ──────────────────────────────────────── */
async function speak(text, voice, file) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('No OpenAI key saved (Admin → APIs & More), so the computer voice isn’t available. Record your own voice instead.');
  const body = (model) => JSON.stringify({ model, voice, input: text.replace(/…/gu, '.'), response_format: 'wav', ...(model === 'gpt-4o-mini-tts' ? { instructions: 'Warm, clear and friendly, like a good teacher explaining money to a friend. Calm, steady pace. Neutral international English.' } : {}) });
  let r = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: body('gpt-4o-mini-tts'), signal: AbortSignal.timeout(90000) });
  if (!r.ok && r.status !== 401 && r.status !== 429) r = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: body('tts-1'), signal: AbortSignal.timeout(90000) });
  if (!r.ok) throw new Error(`OpenAI voice said ${r.status}: ${(await r.text().catch(() => '')).slice(0, 160)}`);
  await fs.writeFile(file, Buffer.from(await r.arrayBuffer()));
}

/* ── Photos (Pexels) ──────────────────────────────────────────────── */
async function pexelsPhotos(query, orientation) {
  if (!process.env.PEXELS_API_KEY) return [];
  const u = new URL('https://api.pexels.com/v1/search');
  u.searchParams.set('query', query); u.searchParams.set('per_page', '15'); u.searchParams.set('orientation', orientation);
  const r = await fetch(u, { headers: { Authorization: process.env.PEXELS_API_KEY }, signal: AbortSignal.timeout(10000) }).catch(() => null);
  if (!r?.ok) return [];
  const d = await r.json().catch(() => ({}));
  return (d.photos || []).map((p) => ({ url: orientation === 'portrait' ? p.src?.portrait || p.src?.large2x : p.src?.landscape || p.src?.large2x, photographer: p.photographer, page: p.url })).filter((p) => p.url);
}
function photoQuery(p) {
  const stop = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are', 'what', 'why', 'how', 'your', 'you', 'it', 'its', 'with', 'this', 'that', 'using', 'explained', 'simply', 'which', 'inc', 'corp', 'co', 'plc', 'ltd']);
  const w = String(p.title || '').toLowerCase().replace(/\([^)]*\)/gu, '').replace(/[^a-z\s]/gu, ' ').split(/\s+/u).filter((x) => x.length > 2 && !stop.has(x));
  if (p.kind === 'shariah') return 'mosque architecture city';
  if (p.kind === 'results' || p.kind === 'company') return `${w.slice(0, 2).join(' ')} business`.trim();
  return w.slice(0, 3).join(' ') || 'money finance';
}

/* ── Drawing the frames ───────────────────────────────────────────── */
async function drawScene(p, sc, i, n, W, H, photoData) {
  const f = await loadFonts();
  const portrait = H > W;
  const pad = portrait ? 80 : 110;
  const site = await siteDetails();
  let svg = `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.navy}"/><stop offset="1" stop-color="${C.navy2}"/></linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1128" stop-opacity="0.5"/><stop offset="0.5" stop-color="#0a1128" stop-opacity="0.78"/><stop offset="1" stop-color="#0a1128" stop-opacity="0.9"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>`;
  if (photoData) svg += `<image href="${photoData}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/><rect width="${W}" height="${H}" fill="url(#shade)"/>`;
  else svg += `<circle cx="${W - 80}" cy="120" r="${Math.round(Math.min(W, H) * 0.35)}" fill="${C.gold}" opacity="0.07"/><circle cx="80" cy="${H - 120}" r="${Math.round(Math.min(W, H) * 0.28)}" fill="#2a78d6" opacity="0.09"/>`;
  // Small brand mark and scene progress
  svg += textLines([site.name], { x0: pad, y0: portrait ? 150 : 60, size: portrait ? 40 : 36, kind: 'serif', fill: C.gold });
  const dotW = Math.min(46, (W - pad * 2) / n - 6);
  for (let k = 0; k < n; k += 1) svg += `<rect x="${pad + k * (dotW + 6)}" y="${portrait ? 216 : 118}" width="${dotW}" height="6" rx="3" fill="${k <= i ? C.gold : '#ffffff'}" opacity="${k <= i ? 1 : 0.25}"/>`;

  const maxW = W - pad * 2;
  const blocks = [];
  if (sc.heading) blocks.push({ h: 70, draw: (y) => textLines([sc.heading.toUpperCase()], { x0: pad, y0: y, size: portrait ? 34 : 32, kind: 'black', fill: C.gold2 }) });
  if (sc.kind === 'title') {
    const t = fit(f.serif, sc.screen || p.title, portrait ? 104 : 90, 44, maxW, portrait ? 6 : 3);
    const h = Math.round(t.lines.length * t.size * 1.18);
    blocks.push({ h: h + 50, draw: (y) => textLines(t.lines, { x0: pad, y0: y, size: t.size, kind: 'serif', lh: 1.18 }) + `<rect x="${pad}" y="${y + h + 22}" width="150" height="10" rx="5" fill="${C.gold}"/>` });
  } else if (sc.kind === 'stats' && sc.stats?.length) {
    const st = sc.stats.slice(0, 4); const per = portrait ? (st.length > 2 ? 2 : st.length) : st.length;
    const gap = 24; const tw = (maxW - gap * (per - 1)) / per; const th = portrait ? 230 : 210; const rows = Math.ceil(st.length / per);
    blocks.push({ h: rows * (th + gap), draw: (y) => st.map((s, k) => {
      const x0 = pad + (k % per) * (tw + gap); const y0 = y + Math.floor(k / per) * (th + gap); const col = TILE_COLOURS[k % TILE_COLOURS.length];
      const v = fit(f.black, s.value, portrait ? 72 : 64, 30, tw - 50, 1);
      return `<rect x="${x0}" y="${y0}" width="${tw}" height="${th}" rx="26" fill="#fff" fill-opacity="0.97"/><rect x="${x0}" y="${y0}" width="${tw}" height="12" rx="6" fill="${col}"/>`
        + textLines(v.lines, { x0: x0 + 28, y0: y0 + 34, size: v.size, kind: 'black', fill: col })
        + textLines(wrap(f.bold, s.label + (s.note ? ` · ${s.note}` : ''), 30, tw - 56, 2).lines, { x0: x0 + 28, y0: y0 + 50 + v.size, size: 30, kind: 'bold', fill: '#4a5170', lh: 1.2 });
    }).join('') });
  } else if (sc.kind === 'list' && sc.list?.length) {
    const ps = portrait ? 46 : 44; const items = sc.list.map((t) => wrap(f.regular, t, ps, maxW - 70, 3).lines);
    blocks.push({ h: items.reduce((a, l) => a + l.length * ps * 1.3 + 28, 0), draw: (y) => { let yy = y; return items.map((l, k) => { const o = `<circle cx="${pad + 18}" cy="${yy + ps * 0.72}" r="16" fill="${TILE_COLOURS[k % TILE_COLOURS.length]}"/>` + textLines(l, { x0: pad + 60, y0: yy, size: ps, lh: 1.3 }); yy += l.length * ps * 1.3 + 28; return o; }).join(''); } });
  } else if (sc.kind === 'cta') {
    const t = fit(f.serif, 'Learn more, free', portrait ? 88 : 80, 40, maxW, 2);
    const link = fit(f.black, sc.screen || site.domain, portrait ? 60 : 64, 30, maxW, 2);
    blocks.push({ h: t.lines.length * t.size * 1.2 + 40, draw: (y) => textLines(t.lines, { x0: pad, y0: y, size: t.size, kind: 'serif', lh: 1.2 }) });
    blocks.push({ h: link.lines.length * link.size * 1.25 + 40, draw: (y) => textLines(link.lines, { x0: pad, y0: y, size: link.size, kind: 'black', fill: C.gold2, lh: 1.25 }) });
    blocks.push({ h: 120, draw: (y) => textLines(['Free weekly newsletter · ' + site.email], { x0: pad, y0: y, size: portrait ? 34 : 34, fill: '#e8ecf8' }) });
  } else {
    // A point: the narration itself, big, so it can be read without sound
    const col = TILE_COLOURS[i % TILE_COLOURS.length];
    const t = fit(f.bold, sc.screen || sc.text, portrait ? 84 : 66, 36, maxW - 40, portrait ? 10 : 6);
    const h = Math.round(t.lines.length * t.size * 1.3);
    blocks.push({ h: h + 10, draw: (y) => `<rect x="${pad}" y="${y + 8}" width="12" height="${h}" rx="6" fill="${col}"/>` + textLines(t.lines, { x0: pad + 40, y0: y, size: t.size, kind: 'bold', lh: 1.3 }) });
  }
  // Centre vertically (Shorts: keep clear of the app's buttons at the bottom)
  const top = portrait ? 300 : 170; const bottom = portrait ? H - 420 : H - 120;
  const total = blocks.reduce((a, b) => a + b.h, 0);
  let y = top + Math.max(0, (bottom - top - total) / 2);
  for (const b of blocks) { svg += b.draw(y); y += b.h; }
  svg += textLines([`${site.domain}  ·  For education only`], { x0: pad, y0: H - (portrait ? 360 : 80), size: 28, fill: '#c9d0e6' });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svg}</svg>`;
}

/** The 3-second opening and closing: identical in every video. */
async function brandFrame(kind, W, H) {
  const f = await loadFonts();
  const site = await siteDetails();
  const portrait = H > W;
  const cx = W / 2; const cy = H / 2;
  const name = fit(f.serif, site.name, portrait ? 120 : 130, 60, W - 160, 1);
  let svg = `<defs><radialGradient id="g" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#1f2b66"/><stop offset="1" stop-color="${C.navy}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>`;
  svg += `<circle cx="${cx}" cy="${cy - (portrait ? 260 : 210)}" r="${portrait ? 90 : 80}" fill="${C.gold}"/>`;
  svg += textLines(['$'], { x0: cx, y0: cy - (portrait ? 260 : 210) - (portrait ? 70 : 62), size: portrait ? 120 : 108, kind: 'black', fill: C.navy, anchor: 'middle' });
  svg += textLines(name.lines, { x0: cx, y0: cy - name.size * 0.7, size: name.size, kind: 'serif', fill: C.gold, anchor: 'middle' });
  const line = cy + name.size * 0.8;
  svg += `<rect x="${cx - 120}" y="${line}" width="240" height="8" rx="4" fill="${C.gold}"/>`;
  if (kind === 'open') {
    svg += textLines(['Money, explained simply'], { x0: cx, y0: line + 36, size: portrait ? 50 : 48, fill: '#e8ecf8', anchor: 'middle' });
  } else {
    svg += textLines([site.domain], { x0: cx, y0: line + 36, size: portrait ? 60 : 56, kind: 'black', fill: C.gold2, anchor: 'middle' });
    svg += textLines([`${site.email}  ·  Free weekly newsletter`], { x0: cx, y0: line + 126, size: portrait ? 34 : 32, fill: '#c9d0e6', anchor: 'middle' });
    svg += textLines(['For education only, not financial advice'], { x0: cx, y0: line + 186, size: portrait ? 30 : 28, fill: '#8f9bc2', anchor: 'middle' });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svg}</svg>`;
}

/** A still picture → a moving clip (slow zoom, fades in and out). */
async function stillToClip(png, out, secs, W, H, fps, { zoomIn = true, fade = 0.3 } = {}) {
  const frames = Math.max(1, Math.round(secs * fps));
  const z = zoomIn ? `'min(1+0.06*on/${frames},1.06)'` : `'max(1.06-0.06*on/${frames},1)'`;
  const vf = `scale=${Math.round(W * 1.5)}:-2,zoompan=z=${z}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${fps},fade=t=in:st=0:d=${fade},fade=t=out:st=${Math.max(0, secs - fade).toFixed(2)}:d=${fade},format=yuv420p`;
  await run(['-loop', '1', '-i', png, '-vf', vf, '-t', secs.toFixed(2), '-r', String(fps), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-an', out]);
}
async function brandClip(kind, W, H, fps) {
  const dir = path.join(ROOT, 'brand');
  await fs.mkdir(dir, { recursive: true });
  const out = path.join(dir, `${kind}-${W}x${H}-${fps}-v2.mp4`);
  try { await fs.access(out); return out; } catch { /* make it */ }
  const png = path.join(dir, `${kind}-${W}x${H}.png`);
  await fs.writeFile(png, svgToPng(await brandFrame(kind, W, H)));
  await stillToClip(png, out, 3, W, H, fps, { zoomIn: kind === 'open', fade: kind === 'open' ? 0.5 : 0.6 });
  return out;
}

/* ── Rendering ────────────────────────────────────────────────────── */
let busy = false;
export async function startRender(id) {
  const p = await getProject(id);
  if (!p) throw Object.assign(new Error('Project not found.'), { status: 404 });
  if (busy) throw Object.assign(new Error('Another video is being made. Please wait for it to finish.'), { status: 409 });
  if (p.voice === 'computer' && !process.env.OPENAI_API_KEY) throw Object.assign(new Error('The computer voice needs the OpenAI key (Admin → APIs & More). Or choose your own voice.'), { status: 400 });
  if (p.voice === 'own' && !p.voiceAll && !p.scenes.some((s) => s.voiceFile)) throw Object.assign(new Error('Record at least one scene, or upload a recording of the whole script, first.'), { status: 400 });
  const st = await storageReport().catch(() => null);
  if (st?.freeMb !== null && st?.freeMb !== undefined && st.freeMb < 150) throw Object.assign(new Error(`The saved-data space is nearly full (${st.freeMb} MB free). Click “Free up space” on this page first.`), { status: 507 });
  busy = true;
  p.status = 'rendering'; p.progress = { step: 'Starting', pct: 2 }; p.error = null;
  await saveProject(p);
  render(p).catch(async (error) => {
    console.error(`[video] ${p.id} failed: ${error.message}`);
    await fs.rm(path.join(os.tmpdir(), `dmw-video-${p.id}`), { recursive: true, force: true }).catch(() => {});
    const q = (await getProject(p.id)) || p;
    q.status = 'failed'; q.error = error.message; await saveProject(q);
  }).finally(() => { busy = false; });
  return { ok: true };
}

async function render(p) {
  const { w: W, h: H, fps } = FORMATS[p.format];
  const dir = dirOf(p.id);
  // Working files go in the server's own temporary space, NOT the saved-data
  // volume (which is small); only the finished MP4 and thumbnail are kept.
  const work = path.join(os.tmpdir(), `dmw-video-${p.id}`);
  await fs.rm(path.join(dir, 'work'), { recursive: true, force: true });
  await fs.rm(work, { recursive: true, force: true });
  await fs.mkdir(work, { recursive: true });
  const step = async (text, pct) => { p.progress = { step: text, pct }; await saveProject(p); };
  const music = await ensureBrandAudio();

  // 1. Voice for each scene
  await step(p.voice === 'computer' ? 'Recording the voice' : 'Preparing your recording', 6);
  const sc = p.scenes;
  const secs = [];
  if (p.voice === 'computer') {
    for (const [i, s] of sc.entries()) {
      const file = path.join(work, `v${i}.wav`);
      await speak(s.text, p.voiceName, file);
      secs.push(await duration(file));
      await step(`Recording the voice (${i + 1} of ${sc.length})`, 6 + Math.round((i + 1) / sc.length * 24));
    }
  } else if (p.voiceAll && !sc.some((s) => s.voiceFile)) {
    // One recording of the whole script: share its length out by the words in each scene
    const total = p.voiceAll.seconds || await duration(path.join(dir, p.voiceAll.file));
    const w = sc.map((s) => Math.max(1, words(s.text)));
    const sum = w.reduce((a, b) => a + b, 0);
    w.forEach((n) => secs.push((total * n) / sum));
  } else {
    for (const s of sc) secs.push(s.voiceFile ? (s.voiceSeconds || await duration(path.join(dir, s.voiceFile))) : Math.max(2.5, words(s.text) / WORDS_PER_SECOND));
  }
  const gap = p.voiceAll && p.voice === 'own' && !sc.some((s) => s.voiceFile) ? 0 : 0.5;
  const lens = secs.map((x) => Math.max(2.5, x + gap));

  // 2. Photos
  await step('Finding photos', 32);
  const orientation = H > W ? 'portrait' : 'landscape';
  let photos = await pexelsPhotos(photoQuery(p), orientation);
  if (photos.length < 3) photos = photos.concat(await pexelsPhotos('money finance', orientation));
  const used = [];
  const photoFor = async (i) => {
    if (sc[i].kind === 'cta' || sc[i].kind === 'stats') return null; // plain brand background keeps figures easy to read
    const ph = photos.length ? photos[i % photos.length] : null;
    if (!ph) return null;
    const img = await fetchImage(ph.url);
    if (img && !used.some((u) => u.page === ph.page)) used.push(ph);
    return img?.data || null;
  };

  // 3. Clips
  const clips = [await brandClip('open', W, H, fps)];
  for (const [i, s] of sc.entries()) {
    await step(`Drawing scene ${i + 1} of ${sc.length}`, 35 + Math.round((i / sc.length) * 45));
    const png = path.join(work, `s${i}.png`);
    await fs.writeFile(png, svgToPng(await drawScene(p, s, i, sc.length, W, H, await photoFor(i))));
    const clipFile = path.join(work, `c${i}.mp4`);
    await stillToClip(png, clipFile, lens[i], W, H, fps, { zoomIn: i % 2 === 0, fade: 0.25 });
    clips.push(clipFile);
  }
  clips.push(await brandClip('close', W, H, fps));
  await step('Joining the scenes', 82);
  const list = path.join(work, 'list.txt');
  await fs.writeFile(list, clips.map((c) => `file '${c.replace(/'/gu, "'\\''")}'`).join('\n'));
  const silent = path.join(work, 'video.mp4');
  await run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);

  // 4. Sound: opening chime, voice, closing chime, with the music bed quietly under the voice
  await step('Mixing voice and music', 88);
  const body = lens.reduce((a, b) => a + b, 0);
  const voice = path.join(work, 'voice.wav');
  if (p.voice === 'computer' || sc.some((s) => s.voiceFile)) {
    const args = []; let k = 0; const fparts = [];
    sc.forEach((s, i) => {
      const file = p.voice === 'computer' ? path.join(work, `v${i}.wav`) : s.voiceFile ? path.join(dir, s.voiceFile) : null;
      if (file) { args.push('-i', file); fparts.push(`[${k}:a]aresample=44100,aformat=channel_layouts=stereo,apad,atrim=0:${lens[i].toFixed(3)},asetpts=N/SR/TB[a${i}]`); }
      else { args.push('-f', 'lavfi', '-t', lens[i].toFixed(3), '-i', 'anullsrc=r=44100:cl=stereo'); fparts.push(`[${k}:a]anull[a${i}]`); }
      k += 1;
    });
    fparts.push(`${sc.map((_, i) => `[a${i}]`).join('')}concat=n=${sc.length}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]`);
    await run([...args, '-filter_complex', fparts.join(';'), '-map', '[out]', '-ar', '44100', voice]);
  } else {
    await run(['-i', path.join(dir, p.voiceAll.file), '-af', `aresample=44100,aformat=channel_layouts=stereo,apad,atrim=0:${body.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=11`, '-ar', '44100', voice]);
  }
  const total = 3 + body + 3;
  const mixed = path.join(work, 'sound.m4a');
  const fc = [
    `[0:a]aresample=44100[o]`, `[1:a]aresample=44100[v]`, `[2:a]aresample=44100[c]`,
    `[o][v][c]concat=n=3:v=0:a=1[voice]`,
    `[3:a]aresample=44100,atrim=0:${body.toFixed(3)},afade=t=in:st=0:d=1.5,afade=t=out:st=${Math.max(0, body - 2).toFixed(3)}:d=2,volume=0.16,adelay=3000|3000,apad,atrim=0:${total.toFixed(3)}[bed]`,
    `[voice][bed]amix=inputs=2:duration=first:dropout_transition=0,volume=2[out]`,
  ].join(';');
  await run(['-i', music.open, '-i', voice, '-i', music.close, '-stream_loop', '-1', '-i', music.bed, '-filter_complex', fc, '-map', '[out]', '-c:a', 'aac', '-b:a', '160k', '-t', total.toFixed(3), mixed]);

  // 5. Final file + thumbnail
  await step('Finishing', 95);
  const outName = `${p.format === 'short' ? 'short' : 'video'}-${p.id}.mp4`;
  await run(['-i', silent, '-i', mixed, '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', path.join(dir, outName)]);
  const { makeCards } = await import('./socialCardService.js');
  let thumb = null;
  try {
    const t = await makeCards({ url: p.url, sizes: [p.format === 'short' ? 'story' : 'landscape'], title: p.title });
    thumb = 'thumbnail.jpg';
    await fs.copyFile(path.join(process.cwd(), 'data', 'social', t.items[0].file), path.join(dir, thumb));
  } catch { thumb = null; }
  await fs.rm(work, { recursive: true, force: true });

  const q = (await getProject(p.id)) || p;
  Object.assign(q, { status: 'done', progress: { step: 'Done', pct: 100 }, output: outName, thumbnail: thumb, seconds: Math.round(total), photosUsed: used, madeAt: new Date().toISOString(), meta: await metaFor(q, used) });
  await saveProject(q);
  console.log(`[video] ${q.id}: ${outName} (${Math.round(total)} s)`);
  await keepNewestVideos(10).catch(() => {});
}

async function metaFor(p, photos) {
  const site = await siteDetails();
  const short = p.format === 'short';
  const link = `https://${p.link}`;
  const lines = [
    p.scenes[0]?.text ? clip(p.scenes[0].text, 300) : p.title,
    '',
    `Read more, free: ${link}`,
    `Free weekly newsletter: https://${site.domain}/newsletter`,
    '',
    'For education only, not financial advice. Investing involves risk.',
    p.voice === 'computer' ? 'Narration voice is computer-generated.' : '',
    photos.length ? `Photos: ${[...new Set(photos.map((x) => x.photographer))].slice(0, 6).join(', ')} on Pexels.` : '',
    'Music: original, by Dr MoneyWise.',
    '',
    [...(p.tags || []), '#DrMoneyWise', short ? '#Shorts' : ''].filter(Boolean).join(' '),
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '');
  return {
    title: clip(`${p.title}${short ? ' #Shorts' : ' | Dr MoneyWise'}`, 100),
    description: lines.join('\n').trim(),
    tags: [...new Set([...(p.tags || []).map((t) => t.replace(/^#/u, '')), 'personal finance', 'investing', 'money explained', 'Dr MoneyWise'])].slice(0, 15),
  };
}

/** Keeps the finished files of the newest `n` videos; older ones keep only their script. */
async function keepNewestVideos(n) {
  const list = await listProjects();
  for (const x of list.filter((y) => y.status === 'done').slice(n)) {
    const p = await getProject(x.id);
    if (!p) continue;
    for (const f of await fs.readdir(dirOf(x.id))) if (/\.(mp4|jpg|png|wav|webm|ogg|m4a|mp3)$/u.test(f)) await fs.rm(path.join(dirOf(x.id), f), { force: true });
    p.status = 'draft'; p.output = null; p.thumbnail = null; p.note = 'Older video removed to save space; make it again any time.';
    for (const sc of p.scenes) { delete sc.voiceFile; delete sc.voiceSeconds; }
    delete p.voiceAll;
    await saveProject(p);
  }
}

async function folderSize(dir) {
  let total = 0;
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return 0; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) total += await folderSize(full);
    else { try { total += (await fs.stat(full)).size; } catch { /* gone */ } }
  }
  return total;
}

/** How full the saved-data space is, and what uses it. */
export async function storageReport() {
  const DATA = path.join(process.cwd(), 'data');
  let freeMb = null; let totalMb = null;
  try { const s = await fs.statfs(DATA); freeMb = Math.round((s.bavail * s.bsize) / 1048576); totalMb = Math.round((s.blocks * s.bsize) / 1048576); } catch { /* older Node */ }
  const parts = [];
  for (const e of await fs.readdir(DATA, { withFileTypes: true }).catch(() => [])) {
    const full = path.join(DATA, e.name);
    const size = e.isDirectory() ? await folderSize(full) : (await fs.stat(full).catch(() => ({ size: 0 }))).size;
    parts.push({ name: e.name, mb: Math.round((size / 1048576) * 10) / 10 });
  }
  const market = [];
  for (const e of await fs.readdir(path.join(DATA, 'market'), { withFileTypes: true }).catch(() => [])) {
    const full = path.join(DATA, 'market', e.name);
    const size = e.isDirectory() ? await folderSize(full) : (await fs.stat(full).catch(() => ({ size: 0 }))).size;
    market.push({ name: `market/${e.name}`, mb: Math.round((size / 1048576) * 10) / 10 });
  }
  return { freeMb, totalMb, parts: [...parts, ...market].filter((x) => x.mb >= 0.5).sort((a, b) => b.mb - a.mb).slice(0, 15) };
}

/** Frees space: leftover video work, older videos, old social pictures, old Gamma files. */
export async function freeUpSpace() {
  const DATA = path.join(process.cwd(), 'data');
  const before = await storageReport();
  for (const id of await fs.readdir(PROJECTS).catch(() => [])) await fs.rm(path.join(PROJECTS, id, 'work'), { recursive: true, force: true }).catch(() => {});
  await keepNewestVideos(3);
  const week = Date.now() - 7 * 86400000;
  for (const sub of ['social', 'generated-media']) {
    for (const f of await fs.readdir(path.join(DATA, sub)).catch(() => [])) {
      if (sub === 'generated-media' && (f.startsWith('theme-') || f === 'gamma-previews.json')) continue; // keep theme samples
      const full = path.join(DATA, sub, f);
      const st = await fs.stat(full).catch(() => null);
      if (st && st.isFile() && st.mtimeMs < week) await fs.rm(full, { force: true });
    }
  }
  for (const f of await fs.readdir(DATA).catch(() => [])) if (/\.tmp$/u.test(f)) await fs.rm(path.join(DATA, f), { force: true }).catch(() => {});
  const after = await storageReport();
  return { before: before.freeMb, after: after.freeMb, report: after };
}

export async function cleanOldProjects() {
  try {
    for (const id of await fs.readdir(PROJECTS)) {
      const p = await getProject(id);
      if (p && Date.now() - new Date(p.createdAt).getTime() > 60 * 86400000) await fs.rm(dirOf(id), { recursive: true, force: true });
    }
  } catch { /* nothing yet */ }
}
export { FORMATS, brandClip };
