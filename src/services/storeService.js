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
    } catch {
      // File missing, empty, or corrupted — create fresh
      console.log('Creating fresh platform store...');
      await fs.writeFile(
        storePath,
        JSON.stringify(makeDefaultStore(), null, 2),
        'utf8'
      );
    }
  } catch (err) {
    console.error('ensureStore error:', err.message);
  }
}

// ── Read store — always returns a valid object ────────────────────────────
export async function readStore() {
  try {
    const raw = await fs.readFile(storePath, 'utf8');
    if (!raw.trim()) throw new Error('empty');
    return JSON.parse(raw);
  } catch {
    // Auto-heal: recreate the store
    const fresh = makeDefaultStore();
    try {
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(storePath, JSON.stringify(fresh, null, 2), 'utf8');
    } catch (writeErr) {
      console.error('Could not write store:', writeErr.message);
    }
    return fresh;
  }
}

// ── Write store ───────────────────────────────────────────────────────────
export async function writeStore(data) {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(storePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('writeStore error:', err.message);
  }
  return data;
}

// ── Update store with a mutator function ─────────────────────────────────
export async function updateStore(mutator) {
  const current = await readStore();
  const next = await mutator(structuredClone(current));
  await writeStore(next);
  return next;
}

export function getStorePath() {
  return storePath;
}
