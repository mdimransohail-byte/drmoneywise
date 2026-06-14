import crypto from 'node:crypto';

// ── In-memory sessions — simple and reliable ──────────────────────────────
const sessions = new Map();

// ── Admin credentials come directly from Railway environment variables ─────
function getAdminEmail() {
  return (process.env.ADMIN_EMAIL || 'hello@drmoneywise.com').toLowerCase().trim();
}
function getAdminPassword() {
  return (process.env.ADMIN_PASSWORD || 'ChangeMe123!').trim();
}

// ── Sign in ───────────────────────────────────────────────────────────────
export async function signInMember(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '').trim();

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  // Admin login — checks env vars directly, no database involved
  if (email === getAdminEmail() && password === getAdminPassword()) {
    const adminUser = {
      id: 'admin',
      email: getAdminEmail(),
      name: 'Dr MoneyWise Admin',
      role: 'admin',
      plan: 'premium',
      billingCycle: 'annual',
      region: 'global',
      interests: ['equities', 'etfs', 'fixed-income'],
      watchlist: ['SPY', 'QQQ', 'GLD'],
      portfolio: [],
      savedArticleSlugs: [],
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    return createSession(adminUser);
  }

  // Member login — uses store
  try {
    const { readStore, updateStore } = await import('./storeService.js');
    const store = await readStore();
    const user = store.users.find((u) => u.email === email);

    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      throw new Error('Invalid email or password.');
    }

    await updateStore((draft) => {
      const target = draft.users.find((u) => u.id === user.id);
      if (target) target.lastLoginAt = new Date().toISOString();
      return draft;
    });

    return createSession(sanitizeUser(user));
  } catch (err) {
    if (err.message === 'Invalid email or password.') throw err;
    throw new Error('Invalid email or password.');
  }
}

// ── Sign up ───────────────────────────────────────────────────────────────
export async function signUpMember(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '').trim();
  const name = String(payload.name || '').trim();

  if (!email || !password || !name) {
    throw new Error('Name, email, and password are required.');
  }

  const { updateStore } = await import('./storeService.js');

  const created = await updateStore((store) => {
    const existing = store.users.find((u) => u.email === email);
    if (existing) throw new Error('An account with that email already exists.');

    const passwordBundle = createPasswordBundle(password);
    const user = {
      id: crypto.randomUUID(),
      email,
      name,
      role: 'member',
      plan: 'free',
      billingCycle: 'monthly',
      passwordHash: passwordBundle.passwordHash,
      passwordSalt: passwordBundle.passwordSalt,
      region: payload.region || 'global',
      interests: Array.isArray(payload.interests) && payload.interests.length
        ? payload.interests
        : ['equities', 'etfs', 'fixed-income'],
      watchlist: [],
      portfolio: [],
      savedArticleSlugs: [],
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };

    store.users.push(user);
    store.events.push({
      id: crypto.randomUUID(),
      type: 'signup',
      path: '/signup',
      userId: user.id,
      value: 1,
      at: new Date().toISOString(),
    });

    return store;
  });

  const user = created.users.find((u) => u.email === email);
  return createSession(sanitizeUser(user));
}

// ── Session management ────────────────────────────────────────────────────
function createSession(user) {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  sessions.set(token, { user, expiresAt });
  // Clean up old sessions periodically
  if (sessions.size > 1000) {
    for (const [key, val] of sessions) {
      if (new Date(val.expiresAt).getTime() < Date.now()) sessions.delete(key);
    }
  }
  return { token, expiresAt, user };
}

export async function getSessionUser(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session.user;
}

export async function requireSessionUser(token) {
  const user = await getSessionUser(token);
  if (!user) throw new Error('Please sign in first.');
  return user;
}

export async function requireAdminUser(token) {
  const user = await requireSessionUser(token);
  if (user.role !== 'admin') throw new Error('Admin access is required.');
  return user;
}

export async function signOutSession(token) {
  if (token) sessions.delete(token);
}

// ── These are kept for compatibility but do nothing now ───────────────────
export async function ensureAdminUser() { return; }
export async function createSession2(userId) { return; }

// ── Helpers ───────────────────────────────────────────────────────────────
export function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    plan: user.plan,
    billingCycle: user.billingCycle || 'monthly',
    region: user.region || 'global',
    interests: user.interests || ['equities', 'etfs', 'fixed-income'],
    watchlist: user.watchlist || [],
    portfolio: user.portfolio || [],
    savedArticleSlugs: user.savedArticleSlugs || [],
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

function createPasswordBundle(password) {
  const passwordSalt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(password, passwordSalt, 64).toString('hex');
  return { passwordSalt, passwordHash };
}

function verifyPassword(password, salt, expectedHash) {
  try {
    const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(
      Buffer.from(candidate, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  } catch {
    return false;
  }
}
