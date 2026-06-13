import crypto from 'node:crypto';

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  DEFAULT_MEMBER_INTERESTS,
  SITE_DOMAIN,
  SUPPORT_EMAIL,
} from '../config.js';
import { updateStore, readStore } from './storeService.js';

export async function ensureAdminUser() {
  await updateStore((store) => {
    const existing = store.users.find((user) => user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

    const passwordBundle = createPasswordBundle(ADMIN_PASSWORD);

    if (existing) {
      existing.passwordHash = passwordBundle.passwordHash;
      existing.passwordSalt = passwordBundle.passwordSalt;
      existing.email = ADMIN_EMAIL.toLowerCase();
      return store;
    }

    store.users.push({
      id: crypto.randomUUID(),
      email: ADMIN_EMAIL.toLowerCase(),
      name: 'Dr MoneyWise Admin',
      role: 'admin',
      plan: 'premium',
      billingCycle: 'annual',
      passwordHash: passwordBundle.passwordHash,
      passwordSalt: passwordBundle.passwordSalt,
      region: 'global',
      interests: DEFAULT_MEMBER_INTERESTS,
      watchlist: ['SPY', 'QQQ', 'GLD'],
      portfolio: [
        { ticker: 'SPY', name: 'S&P 500 ETF', weight: '40%', cost: '540', note: 'Core market exposure' },
        { ticker: 'QQQ', name: 'Nasdaq 100 ETF', weight: '30%', cost: '470', note: 'Growth sleeve' },
        { ticker: 'GLD', name: 'Gold ETF', weight: '10%', cost: '235', note: 'Protection sleeve' },
      ],
      savedArticleSlugs: [],
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      preferencesSavedAt: new Date().toISOString(),
      contactEmail: SUPPORT_EMAIL,
      domainHint: SITE_DOMAIN,
    });

    return store;
  });
}

export async function signUpMember(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '').trim();
  const name = String(payload.name || '').trim();

  if (!email || !password || !name) {
    throw new Error('Name, email, and password are required.');
  }

  await ensureAdminUser();

  const created = await updateStore((store) => {
    const existing = store.users.find((user) => user.email === email);
    if (existing) {
      throw new Error('An account with that email already exists.');
    }

    const passwordBundle = createPasswordBundle(password);
    const user = {
      id: crypto.randomUUID(),
      email,
      name,
      role: 'member',
      plan: payload.plan || 'free',
      billingCycle: payload.billingCycle || 'monthly',
      passwordHash: passwordBundle.passwordHash,
      passwordSalt: passwordBundle.passwordSalt,
      region: payload.region || 'global',
      interests: Array.isArray(payload.interests) && payload.interests.length ? payload.interests : DEFAULT_MEMBER_INTERESTS,
      watchlist: [],
      portfolio: [],
      savedArticleSlugs: [],
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      preferencesSavedAt: new Date().toISOString(),
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

  const user = created.users.find((entry) => entry.email === email);
  return createSession(user.id);
}

export async function signInMember(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '').trim();

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  await ensureAdminUser();
  const store = await readStore();
  const user = store.users.find((entry) => entry.email === email);

  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    throw new Error('Invalid email or password.');
  }

  await updateStore((draft) => {
    const target = draft.users.find((entry) => entry.id === user.id);
    if (target) {
      target.lastLoginAt = new Date().toISOString();
    }
    draft.events.push({
      id: crypto.randomUUID(),
      type: 'login',
      path: '/login',
      userId: user.id,
      value: 1,
      at: new Date().toISOString(),
    });
    return draft;
  });

  return createSession(user.id);
}

export async function createSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const store = await updateStore((draft) => {
    draft.sessions = draft.sessions.filter((session) => new Date(session.expiresAt).getTime() > Date.now());
    draft.sessions.push({
      token,
      userId,
      expiresAt,
    });
    return draft;
  });

  const user = store.users.find((entry) => entry.id === userId);
  return {
    token,
    expiresAt,
    user: sanitizeUser(user),
  };
}

export async function getSessionUser(token) {
  if (!token) {
    return null;
  }

  await ensureAdminUser();
  const store = await readStore();
  const session = store.sessions.find(
    (entry) => entry.token === token && new Date(entry.expiresAt).getTime() > Date.now(),
  );

  if (!session) {
    return null;
  }

  const user = store.users.find((entry) => entry.id === session.userId);
  return user ? sanitizeUser(user) : null;
}

export async function requireSessionUser(token) {
  const user = await getSessionUser(token);
  if (!user) {
    throw new Error('Please sign in first.');
  }
  return user;
}

export async function requireAdminUser(token) {
  const user = await requireSessionUser(token);
  if (user.role !== 'admin') {
    throw new Error('Admin access is required.');
  }
  return user;
}

export async function signOutSession(token) {
  if (!token) {
    return;
  }

  await updateStore((store) => {
    store.sessions = store.sessions.filter((session) => session.token !== token);
    return store;
  });
}

export function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    plan: user.plan,
    billingCycle: user.billingCycle || 'monthly',
    region: user.region || 'global',
    interests: user.interests || DEFAULT_MEMBER_INTERESTS,
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
  return {
    passwordSalt,
    passwordHash,
  };
}

function verifyPassword(password, salt, expectedHash) {
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(expectedHash, 'hex'));
}