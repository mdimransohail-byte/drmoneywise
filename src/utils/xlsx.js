/* ════════════════════════════════════════════════════════════════════════
   Tiny Excel (.xlsx) reader — enough to read official data files
   (World Bank commodity prices). Uses adm-zip, already installed.
   readSheet(buffer, /Monthly Prices/i) → rows: [[cell, cell, …], …]
   Cells come back as strings (text) or numbers.
   ════════════════════════════════════════════════════════════════════════ */

import AdmZip from 'adm-zip';

const decode = (s) => String(s)
  .replace(/&lt;/gu, '<').replace(/&gt;/gu, '>').replace(/&quot;/gu, '"').replace(/&apos;/gu, "'")
  .replace(/&#(\d+);/gu, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/gu, '&');

function colIndex(ref) {
  const letters = ref.replace(/\d+/gu, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function listSheets(buffer) {
  const zip = new AdmZip(buffer);
  const wb = zip.getEntry('xl/workbook.xml')?.getData().toString('utf8') || '';
  return [...wb.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/gu)].map((m) => ({ name: decode(m[1]), rid: m[2] }));
}

export function readSheet(buffer, nameMatch) {
  const zip = new AdmZip(buffer);
  const text = (p) => zip.getEntry(p)?.getData().toString('utf8') || '';
  const sheets = listSheets(buffer);
  const sheet = nameMatch ? sheets.find((s) => nameMatch.test(s.name)) : sheets[0];
  if (!sheet) throw new Error(`sheet not found (have: ${sheets.map((s) => s.name).join(', ')})`);
  const rels = text('xl/_rels/workbook.xml.rels');
  const target = [...rels.matchAll(/<Relationship\b[^>]*>/gu)].map((m) => m[0])
    .find((r) => r.includes(`Id="${sheet.rid}"`))?.match(/Target="([^"]+)"/u)?.[1];
  if (!target) throw new Error(`sheet file for "${sheet.name}" not found`);
  const sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//u, '')}`;
  const shared = text('xl/sharedStrings.xml').split(/<si>/u).slice(1)
    .map((si) => decode((si.match(/<t[^>]*>([^<]*)<\/t>/gu) || []).map((t) => t.replace(/<[^>]+>/gu, '')).join('')));
  const xml = text(sheetPath);
  if (!xml) throw new Error(`sheet file ${sheetPath} is empty`);
  const rows = [];
  for (const rowXml of xml.split(/<row\b/u).slice(1)) {
    const row = [];
    for (const c of rowXml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/gu)) {
      const attrs = c[1];
      const inner = c[2] || '';
      const ref = attrs.match(/r="([A-Z]+\d+)"/u)?.[1];
      if (!ref) continue;
      const type = attrs.match(/t="([^"]+)"/u)?.[1] || '';
      let value = null;
      if (type === 'inlineStr') value = decode((inner.match(/<t[^>]*>([^<]*)<\/t>/u) || [])[1] || '');
      else {
        const v = inner.match(/<v>([^<]*)<\/v>/u)?.[1];
        if (v === undefined) continue;
        if (type === 's') value = shared[Number(v)] ?? '';
        else if (type === 'str' || type === 'e') value = decode(v);
        else value = Number.isFinite(Number(v)) ? Number(v) : decode(v);
      }
      row[colIndex(ref)] = value;
    }
    rows.push(row);
  }
  return rows;
}
