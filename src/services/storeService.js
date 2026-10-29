import fs from 'node:fs/promises';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'data');
const storePath = path.join(dataDir, 'platform-store.json');

// ── Default empty store — used when file is missing or corrupted ──────────
function makeDefaultStore() {
  return {
    meta: {
      createdAt: new Date().toISOString(),
      nextArticleNumber: 1000,
    },
    users: [],
    sessions: [],
    articles: [],
    coupons: [
      { id: 'coupon-welcome', code: 'WELCOME20', discountPercent: 20, active: true, planScope: 'all', createdAt: new Date().toISOString() },
      { id: 'coupon-half', code: 'HALFOFF50', discountPercent: 50, active: true, planScope: 'regular', createdAt: new Date().toISOString() },
    ],
    events: [],
    settings: {
      siteName: process.env.SITE_NAME || 'Dr MoneyWise',
      siteDomain: process.env.SITE_DOMAIN || 'drmoneywise.com',
      supportEmail: process.env.SUPPORT_EMAIL || 'hello@drmoneywise.com',
      newsletterLabel: 'Money notes made easy',
      writerA: { label: 'Writer 1', provider: 'openai', model: process.env.WRITER_A_MODEL || '' },
      writerB: { label: 'Writer 2', provider: 'claude', model: process.env.WRITER_B_MODEL || '' },
      publishingWindows: ['06:30', '11:30', '17:30'],
      defaultRegion: 'global',
      defaultInterests: ['equities', 'etfs', 'fixed-income'],
    },
  };
}

// ── Ensure data folder and file exist ─────────────────────────────────────
export async function ensureStore() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    try {
      const raw = await fs.readFile(storePath, 'utf8');
      if (!raw.trim()) throw new Error('empty');
      JSON.parse(raw); // validate JSON is readable
    } catch (error) {
      // Only a MISSING file is created fresh. An unreadable one is left alone
      // (readStore falls back to the backup copy) so no data is ever wiped.
      if (error.code === 'ENOENT') {
        console.log('Creating fresh platform store...');
        await atomicWrite(storePath, JSON.stringify(makeDefaultStore(), null, 2));
      } else {
        console.error('[store] platform-store.json could not be read at start-up; it was not overwritten.');
      }
    }
  } catch (err) {
    console.error('ensureStore error:', err.message);
  }
}

// ── Read store — always returns a valid object ────────────────────────────
// SAFETY (Oct 2026): the store is never replaced with an empty one just
// because a read failed. Writes are atomic (temporary file, then rename),
// so a read can't catch a half-written file; if a read still fails, we
// retry, then use the last good copy (memory, then the hourly backup).
let lastGood = null;
const pause = (ms) => new Promise((r) => { setTimeout(r, ms); });
const backupPath = path.join(dataDir, 'platform-store.backup.json');

export async function readStore() {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const raw = await fs.readFile(storePath, 'utf8');
      if (!raw.trim()) throw new Error('empty');
      const data = JSON.parse(raw);
      lastGood = raw;
      return data;
    } catch (error) {
      if (error.code === 'ENOENT') break; // really missing: see below
      await pause(40 * (attempt + 1));
    }
  }
  // Never overwrite an existing store with an empty one
  if (lastGood) { console.error('[store] Could not read the store; using the last good copy.'); return JSON.parse(lastGood); }
  try {
    const raw = await fs.readFile(backupPath, 'utf8');
    const data = JSON.parse(raw);
    console.error('[store] Could not read the store; restored from the backup copy.');
    return data;
  } catch { /* no backup either */ }
  let exists = false;
  try { await fs.access(storePath); exists = true; } catch { exists = false; }
  const fresh = makeDefaultStore();
  if (!exists) {
    try {
      await fs.mkdir(dataDir, { recursive: true });
      await atomicWrite(storePath, JSON.stringify(fresh, null, 2));
    } catch (writeErr) {
      console.error('Could not write store:', writeErr.message);
    }
  } else {
    console.error('[store] The store file is unreadable and there is no backup; it was NOT overwritten. Check data/platform-store.json.');
  }
  return fresh;
}

async function atomicWrite(file, text) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, text, 'utf8');
  await fs.rename(tmp, file);
}

// ── Write store ───────────────────────────────────────────────────────────
let lastBackup = 0;
export async function writeStore(data) {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    const text = JSON.stringify(data, null, 2);
    // Refuse to replace a store that has members or explainers with one that has none
    if (lastGood && !(data?.users?.length) && !(data?.articles?.length)) {
      const prev = JSON.parse(lastGood);
      if ((prev.users || []).length || (prev.articles || []).length) {
        console.error('[store] Blocked a write that would have emptied the store.');
        return data;
      }
    }
    await atomicWrite(storePath, text);
    lastGood = text;
    // Hourly backup copy of the last good store
    if (Date.now() - lastBackup > 60 * 60 * 1000) {
      lastBackup = Date.now();
      await atomicWrite(backupPath, text).catch(() => {});
    }
  } catch (err) {
    console.error('writeStore error:', err.message);
  }
  return data;
}

// ── Update store with a mutator function ─────────────────────────────────
// One change at a time, so two changes made at the same moment can't
// overwrite each other.
let queue = Promise.resolve();
export function updateStore(mutator) {
  const run = queue.then(async () => {
    const current = await readStore();
    const next = await mutator(structuredClone(current));
    await writeStore(next);
    return next;
  });
  queue = run.catch(() => {});
  return run;
}

export function getStorePath() {
  return storePath;
}