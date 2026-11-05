/* ════════════════════════════════════════════════════════════════════════
   PDF → PNG, sharp at any size (used for Gamma infographics)
   ───────────────────────────────────────────────────────────────────────
   Gamma's PNG export is small, so text blurs when enlarged. Its PDF export
   keeps text and shapes as sharp outlines, so we draw the PDF's first page
   at exactly the size we need. pdf.js (Mozilla, Apache 2.0 licence) reads
   the PDF; @napi-rs/canvas (MIT licence) draws it.
   ════════════════════════════════════════════════════════════════════════ */

import { createRequire as makeRequire } from 'node:module';

/* pdf.js needs process.getBuiltinModule, which only exists in Node 20.16+
   and 22.3+. On an older Node (Railway's default can be older), add it. */
if (typeof process.getBuiltinModule !== 'function') {
  const req = makeRequire(import.meta.url);
  process.getBuiltinModule = (name) => req(String(name).replace(/^node:/u, ''));
}

export async function renderFirstPage(pdfBuffer, targetWidth = 2000) {
  const canvasLib = await import('@napi-rs/canvas');
  const { createCanvas } = canvasLib;
  // pdf.js draws shapes with Path2D; give it the same canvas library's
  // Path2D, DOMMatrix and ImageData, or fills fail ("not a valid CanvasFillRule")
  for (const k of ['Path2D', 'DOMMatrix', 'ImageData']) if (canvasLib[k]) globalThis[k] = canvasLib[k];
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { createRequire } = await import('node:module');
  const path = await import('node:path');
  const fonts = `${path.dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'))}/standard_fonts/`;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer), isEvalSupported: false, useSystemFonts: false, disableFontFace: true, standardFontDataUrl: fonts }).promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(6, targetWidth / base.width);
    const vp = page.getViewport({ scale });
    const canvas = createCanvas(Math.round(vp.width), Math.round(vp.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return { buffer: canvas.toBuffer('image/png'), width: canvas.width, height: canvas.height };
  } finally {
    await doc.destroy().catch(() => {});
  }
}

/** The first `count` pages as PNGs (theme samples). */
export async function renderPages(pdfBuffer, targetWidth = 800, count = 2) {
  const canvasLib = await import('@napi-rs/canvas');
  const { createCanvas } = canvasLib;
  // pdf.js draws shapes with Path2D; give it the same canvas library's
  // Path2D, DOMMatrix and ImageData, or fills fail ("not a valid CanvasFillRule")
  for (const k of ['Path2D', 'DOMMatrix', 'ImageData']) if (canvasLib[k]) globalThis[k] = canvasLib[k];
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer), isEvalSupported: false, disableFontFace: true }).promise;
  const out = [];
  try {
    for (let n = 1; n <= Math.min(count, doc.numPages); n += 1) {
      const page = await doc.getPage(n);
      const vp = page.getViewport({ scale: targetWidth / page.getViewport({ scale: 1 }).width });
      const canvas = createCanvas(Math.round(vp.width), Math.round(vp.height));
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      out.push({ buffer: canvas.toBuffer('image/png') });
    }
  } finally { await doc.destroy().catch(() => {}); }
  return out;
}

/* ── Drawing runs in a separate helper process ────────────────────────
   pdf.js can fail in ways that would otherwise stop the whole website
   (and visitors would see "502"). In its own process, a failure only
   loses that one picture, and memory is handed back when it finishes. */
async function inHelper(pdfBuffer, mode, width, count) {
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const { spawn } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dmw-pdf-'));
  try {
    await fs.writeFile(path.join(dir, 'in.pdf'), pdfBuffer);
    const worker = fileURLToPath(new URL('../workers/pdf2png.mjs', import.meta.url));
    const err = await new Promise((resolve) => {
      const child = spawn(process.execPath, ['--max-old-space-size=384', worker, dir, mode, String(width), String(count)], { stdio: ['ignore', 'ignore', 'pipe'] });
      let msg = '';
      const timer = setTimeout(() => { msg = 'took too long'; child.kill('SIGKILL'); }, 90000);
      child.stderr.on('data', (d) => { msg += d.toString(); });
      child.on('close', (code) => { clearTimeout(timer); resolve(code === 0 ? '' : (msg.trim().split('\n').pop() || `stopped (code ${code})`)); });
      child.on('error', (e) => { clearTimeout(timer); resolve(e.message); });
    });
    if (err) throw new Error(`Couldn’t turn Gamma’s PDF into a picture: ${err.slice(0, 200)}`);
    const meta = JSON.parse(await fs.readFile(path.join(dir, 'out.json'), 'utf8'));
    const out = [];
    for (const m of meta) out.push({ buffer: await fs.readFile(path.join(dir, m.file)), width: m.width, height: m.height });
    return out;
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function pdfFirstPageToPng(pdfBuffer, targetWidth = 2000) {
  return (await inHelper(pdfBuffer, 'first', targetWidth, 1))[0];
}

/** The first `count` pages as PNGs (theme samples). */
export async function pdfPagesToPng(pdfBuffer, targetWidth = 800, count = 2) {
  return inHelper(pdfBuffer, 'pages', targetWidth, count);
}
