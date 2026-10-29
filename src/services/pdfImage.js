/* ════════════════════════════════════════════════════════════════════════
   PDF → PNG, sharp at any size (used for Gamma infographics)
   ───────────────────────────────────────────────────────────────────────
   Gamma's PNG export is small, so text blurs when enlarged. Its PDF export
   keeps text and shapes as sharp outlines, so we draw the PDF's first page
   at exactly the size we need. pdf.js (Mozilla, Apache 2.0 licence) reads
   the PDF; @napi-rs/canvas (MIT licence) draws it.
   ════════════════════════════════════════════════════════════════════════ */

export async function pdfFirstPageToPng(pdfBuffer, targetWidth = 2000) {
  const { createCanvas } = await import('@napi-rs/canvas');
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
export async function pdfPagesToPng(pdfBuffer, targetWidth = 800, count = 2) {
  const { createCanvas } = await import('@napi-rs/canvas');
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
