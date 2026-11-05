/* Helper process for src/services/pdfImage.js: draws a PDF's page(s) as PNG.
   Usage: node pdf2png.mjs <folder> <first|pages> <width> <count>
   Reads <folder>/in.pdf, writes page PNGs and out.json to the same folder. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { renderFirstPage, renderPages } from '../services/pdfImage.js';

const [dir, mode, width, count] = process.argv.slice(2);
try {
  const pdf = await fs.readFile(path.join(dir, 'in.pdf'));
  const pages = mode === 'first' ? [await renderFirstPage(pdf, Number(width))] : await renderPages(pdf, Number(width), Number(count));
  const meta = [];
  for (let i = 0; i < pages.length; i += 1) {
    const file = `page-${i + 1}.png`;
    await fs.writeFile(path.join(dir, file), pages[i].buffer);
    meta.push({ file, width: pages[i].width || 0, height: pages[i].height || 0 });
  }
  await fs.writeFile(path.join(dir, 'out.json'), JSON.stringify(meta));
  process.exit(0);
} catch (e) {
  process.stderr.write(`${e && e.message ? e.message : e}\n`);
  process.exit(1);
}
