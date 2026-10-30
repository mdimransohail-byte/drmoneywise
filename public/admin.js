// ════════════════════════════════════════════════════════════════════════════
//  DR MONEYWISE — ADMIN PANEL
//  admin.js  ·  served from /public/admin.js
//
//  HOW TO MAKE CHANGES WITHOUT BREAKING ANYTHING
//  ─────────────────────────────────────────────
//  Every page lives in its own clearly-labelled section below.
//  To change a page, find its section header (e.g. "PAGE B: NEWS FEED")
//  and edit only the render_XXX() and bind_XXX() functions inside it.
//  Do NOT edit any other section — everything else will keep working.
//
//  SECTION MAP
//  1. CONSTANTS        — nav colours, session key
//  2. STATE            — global variables
//  3. API MODULE       — all server calls (add new ones here)
//  4. UTILS            — toast, escape, format helpers
//  5. LAYOUT           — sidebar, login, shell show/hide
//  PAGE A: ANALYTICS   — metrics, charts
//  PAGE B: NEWS FEED   — fetch, select, tier, approve
//  PAGE C: AI WRITER   — topic, generate, approve/schedule
//  PAGE D: INVENTORY   — article list, YouTube, scheduler
//  PAGE E: SETTINGS    — API keys, coupons, site settings
//  PAGE F: HEALTH      — autopilot checks + daily email
//  6. ROUTER           — switches pages, calls render+bind
//  7. AUTH             — login, logout, session
//  8. INIT             — entry point
// ════════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════════
// SECTION 1: CONSTANTS
// To add a new nav page: add entry here AND add a section below
// ════════════════════════════════════════════════════════════════════════════

const SESSION_KEY = 'drmoneywise-admin-session';

const NAV_PAGES = [
  { id: 'analytics', label: 'Analytics',   icon: '▲', nb: 'rgba(255,203,107,.10)', nbr: 'rgba(255,203,107,.22)', nc: '#ffcb6b' },
  { id: 'news',      label: 'News Feed',   icon: '◈', nb: 'rgba(60,181,196,.10)',  nbr: 'rgba(60,181,196,.22)',  nc: '#3cb5c4' },
  { id: 'writer',    label: 'AI Writer',   icon: '✦', nb: 'rgba(167,139,250,.10)', nbr: 'rgba(167,139,250,.22)', nc: '#a78bfa' },
  { id: 'inventory', label: 'Inventory',   icon: '▣', nb: 'rgba(43,196,138,.10)',  nbr: 'rgba(43,196,138,.22)',  nc: '#2bc48a' },
  { id: 'settings',  label: 'APIs & More', icon: '◎', nb: 'rgba(242,106,106,.10)', nbr: 'rgba(242,106,106,.22)', nc: '#f26a6a' },
];


// ════════════════════════════════════════════════════════════════════════════
// SECTION 2: STATE
// To add new global state: add a property here
// ════════════════════════════════════════════════════════════════════════════

const STATE = {
  token:          '',
  user:           null,
  bootstrap:      null,
  currentPage:    'analytics',

  // Analytics
  dashboard:      null,

  // News feed
  newsItems:      [],
  newsFilter:     'All',

  // AI writer
  writerModel:    'openai',
  writerTopic:    '',
  writerTier:     'free',
  writerRegion:   'Global',
  writerInterest: 'equities',
  writerText:     '',
  generatedArticle: null,
  visualBusy: false,
  visualStatus: '',
  writerDone:     false,
  writerGenerating: false,
  writerStatus:   '',
  writerInterval: null,
  trendingBusy:   false,
  trendingStatus: '',

  // Inventory
  articles:       [],
  invFilter:      'all',

  // Settings
  businessSettings: null,
  coupons:        [],
};


// ════════════════════════════════════════════════════════════════════════════
// SECTION 3: API MODULE
// To add a new server call: add a shortcut at the bottom of this section
// ════════════════════════════════════════════════════════════════════════════

const API = {

  async _request(url, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (STATE.token) headers['x-session-token'] = STATE.token;
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const raw = await res.text();
    let payload = {};
    if (raw.trim()) {
      try { payload = JSON.parse(raw); }
      catch { throw new Error('Server returned unreadable data. Try refreshing.'); }
    }
    if (!res.ok) throw new Error(payload.error || `Request failed (${res.status}).`);
    return payload;
  },

  get:    (url)       => API._request(url, { method: 'GET' }),
  post:   (url, body) => API._request(url, { method: 'POST',   body }),
  delete: (url)       => API._request(url, { method: 'DELETE' }),

  // ── Shortcuts — add new endpoints here ──────────────────────────
  login:               (b)  => API.post('/api/auth/login', b),
  logout:              ()   => API.post('/api/auth/logout', {}),
  bootstrap:           ()   => API.get('/api/site/bootstrap'),
  dashboard:           ()   => API.get('/api/admin/dashboard'),
  listArticles:        ()   => API.get('/api/admin/articles'),
  saveArticle:         (b)  => API.post('/api/admin/articles', b),
  discoverCandidates:  (b)  => API.post('/api/admin/articles/discover', b),
  deleteArticle:       (id) => API.delete(`/api/admin/articles?id=${encodeURIComponent(id)}`),
  generateArticle:     (b)  => API.post('/api/admin/learning/generate', b),
  generateTrending:    (b)  => API.post('/api/admin/learning/generate-trending', b),
  attachPexels:        (b)  => API.post('/api/admin/articles/visual/pexels', b),
  attachGamma:         (b)  => API.post('/api/admin/articles/visual/gamma', b),
  listUsers:           ()   => API.get('/api/admin/users'),
  updateUserPlan:      (b)  => API.post('/api/admin/users/plan', b),
  listCoupons:         ()   => API.get('/api/admin/coupons'),
  createCoupon:        (b)  => API.post('/api/admin/coupons', b),
  toggleCoupon:        (id) => API.post('/api/admin/coupons/toggle', { id }),
  saveSettings:        (b)  => API.post('/api/admin/settings', b),
  backup:              ()   => API.get('/api/admin/backup'),
  dataStatus:          ()   => API.get('/api/admin/data-status'),
  dataRun:             (job) => API.post('/api/admin/data-run', { job }),
  health:              ()   => API.get('/api/admin/health'),
  healthEmail:         ()   => API.post('/api/admin/health/email', {}),
  forumQueue:          ()   => API.get('/api/admin/forum/queue'),
  forumAction:         (b)  => API.post('/api/admin/forum/action', b),
  forumStarters:       ()   => API.post('/api/admin/forum/starters', {}),
  propertyStatus:      ()   => API.get('/api/admin/property'),
  propertyManual:      (b)  => API.post('/api/admin/property/manual', b),
  askGet:              ()   => API.get('/api/admin/ask'),
  askDraft:            (id) => API.post('/api/admin/ask/draft', { id }),
  askAnswer:           (b)  => API.post('/api/admin/ask/answer', b),
  nlGet:               ()   => API.get('/api/admin/newsletter'),
  nlPost:              (sub, b) => API.post('/api/admin/newsletter/' + sub, b || {}),
  adsGet:              ()   => API.get('/api/admin/ads'),
  adsSave:             (b)  => API.post('/api/admin/ads', b),
  getBusinessSettings: ()   => API.get('/api/admin/business-settings'),
  saveBusinessSettings:(b)  => API.post('/api/admin/business-settings', b),
};


// ════════════════════════════════════════════════════════════════════════════
// SECTION 4: UTILS
// To add a new helper: add it here — do not scatter helpers elsewhere
// ════════════════════════════════════════════════════════════════════════════

function h(v) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(v) {
  if (!v) return '—';
  try { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(v)); }
  catch { return v; }
}

function fmtNum(v) { return new Intl.NumberFormat().format(Number(v) || 0); }

let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toastEl');
  if (!el) return;
  el.textContent = '✓ ' + msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

function setMain(html) {
  const el = document.getElementById('mainArea');
  if (el) el.innerHTML = html;
}

function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function qsa(sel, ctx){ return [...(ctx || document).querySelectorAll(sel)]; }

function tagClass(tier) {
  return { free: 'tag-free', regular: 'tag-regular', premium: 'tag-premium' }[tier] || 'tag-free';
}
function statusClass(st) {
  return { published: 'tag-published', scheduled: 'tag-scheduled', draft: 'tag-draft', candidate: 'tag-candidate', archived: 'tag-draft' }[st] || 'tag-draft';
}

// Simple SVG sparkline — used by analytics charts
function makeLine(values, w, h, color, fill) {
  if (!values.length) return '';
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * (h - 4)}`).join(' ');
  const fillPts = `${pts} ${w},${h} 0,${h}`;
  return `<svg viewBox="0 0 ${w} ${h}" class="svg-chart" preserveAspectRatio="none" style="height:${h}px">
    <defs><linearGradient id="g${color.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stop-color="${color}" stop-opacity=".25"/>
      <stop offset="95%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    ${fill ? `<polygon points="${fillPts}" fill="url(#g${color.replace('#','')})"/>` : ''}
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}


// ════════════════════════════════════════════════════════════════════════════
// SECTION 5: LAYOUT & NAVIGATION
// To change sidebar behaviour or shell transitions: edit this section
// ════════════════════════════════════════════════════════════════════════════

function showShell() {
  qs('#loginPanel').classList.add('hidden');
  qs('#adminShell').classList.remove('hidden');
  if (STATE.user) {
    const n = qs('#sideUserName');
    const p = qs('#sideUserPlan');
    if (n) n.textContent = STATE.user.name || 'Admin';
    if (p) p.textContent = STATE.user.plan ? STATE.user.plan.charAt(0).toUpperCase() + STATE.user.plan.slice(1) : 'Premium';
  }
}

function showLogin(msg) {
  qs('#loginPanel').classList.remove('hidden');
  qs('#adminShell').classList.add('hidden');
  if (msg) qs('#loginMsg').textContent = msg;
}

function setActivePage(pageId) {
  qsa('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === pageId));
}

function bindNav() {
  qsa('.nav-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => ROUTER.go(btn.dataset.page));
  });
  qs('#signOutBtn')?.addEventListener('click', AUTH.logout);
}


// ════════════════════════════════════════════════════════════════════════════
// PAGE A: ANALYTICS
// ─────────────────
// To change this page ONLY: edit render_analytics() and bind_analytics()
// Do not touch any other section.
// ════════════════════════════════════════════════════════════════════════════

function render_analytics() {
  const d = STATE.dashboard;

  const metrics = [
    { l: 'Readers',    v: fmtNum(d?.metrics?.totalReaders    || 0), ac: '#ffcb6b', up: true  },
    { l: 'Page Views', v: fmtNum(d?.metrics?.pageViews       || 0), ac: '#3cb5c4', up: true  },
    { l: 'Signups',    v: fmtNum(d?.metrics?.signups         || 0), ac: '#a78bfa', up: true  },
    { l: 'Upgrades',   v: fmtNum(d?.metrics?.upgrades        || 0), ac: '#2bc48a', up: true  },
    { l: 'Revenue',    v: '$' + fmtNum(d?.metrics?.revenue   || 0), ac: '#ffcb6b', up: true  },
    { l: 'Conversion', v: (d?.metrics?.conversionRate        || 0) + '%', ac: '#f26a6a', up: false },
    { l: 'Published',  v: d?.metrics?.publishedArticles      || 0,  ac: '#2bc48a', up: true  },
    { l: 'Scheduled',  v: d?.metrics?.scheduledArticles      || 0,  ac: '#3cb5c4', up: true  },
  ];

  const timeline   = d?.timeline    || [];
  const tierMix    = d?.tierMix     || [];
  const statuses   = d?.articleStatuses || [];
  const viewVals   = timeline.map(t => t.pageViews || 0);
  const signupVals = timeline.map(t => t.signups   || 0);

  const maxSt = Math.max(...statuses.map(s => s.count), 1);
  const barColors = { Published: '#2bc48a', Scheduled: '#ffcb6b', Drafts: '#9eb3cc' };

  return `
    <div class="pg-head">
      <div class="eyebrow" style="--ac:#ffcb6b">Overview</div>
      <h1>Analytics</h1>
      <p>Live platform data — pulls from your Railway database on every visit.</p>
    </div>

    <div class="met-grid">
      ${metrics.map(m => `
        <div class="met-card" style="--ac:${m.ac}">
          <div class="met-val">${h(m.v)}</div>
          <div class="met-lbl">${h(m.l)}</div>
          <span class="met-trend ${m.up ? 'trend-up' : 'trend-dn'}">${m.up ? '▲' : '▼'} live</span>
        </div>`).join('')}
    </div>

    <div class="card-grid chart-col" style="margin-bottom:14px">
      <div class="card">
        <div class="card-title">Traffic — page views over time</div>
        ${viewVals.length ? makeLine(viewVals, 460, 100, '#3cb5c4', true) : '<p style="color:#9eb3cc;font-size:.78rem">No traffic data yet.</p>'}
        ${timeline.length ? `<div style="display:flex;gap:14px;margin-top:8px;flex-wrap:wrap">
          ${timeline.slice(-5).map(t => `<span style="font-size:.62rem;color:#9eb3cc">${h(t.date?.slice(5)||t.date)} <strong style="color:#ecf3ff">${fmtNum(t.pageViews)}</strong></span>`).join('')}
        </div>` : ''}
      </div>
      <div class="card">
        <div class="card-title">Member tier mix</div>
        ${tierMix.map(t => {
          const pct = tierMix.reduce((a,b)=>a+(b.count||0),0) > 0
            ? Math.round((t.count / tierMix.reduce((a,b)=>a+(b.count||0),0)) * 100) : 0;
          const c = t.plan === 'free' ? '#9eb3cc' : t.plan === 'regular' ? '#3cb5c4' : '#ffcb6b';
          return `<div style="display:grid;grid-template-columns:80px 1fr 40px;gap:8px;align-items:center;margin-bottom:8px">
            <span style="font-size:.72rem;color:${c}">${h(t.label || t.plan)}</span>
            <div style="height:8px;border-radius:99px;background:rgba(255,255,255,.06)">
              <div style="height:8px;border-radius:99px;background:${c};width:${pct}%"></div>
            </div>
            <span style="font-size:.7rem;color:#9eb3cc;text-align:right">${fmtNum(t.count)}</span>
          </div>`;
        }).join('') || '<p style="color:#9eb3cc;font-size:.78rem">No member data yet.</p>'}
      </div>
    </div>

    <div class="card-grid two-col">
      <div class="card">
        <div class="card-title">Signups — daily</div>
        ${signupVals.length ? makeLine(signupVals, 460, 80, '#a78bfa', true) : '<p style="color:#9eb3cc;font-size:.78rem">No signup data yet.</p>'}
      </div>
      <div class="card">
        <div class="card-title">Article status</div>
        <div style="display:flex;align-items:flex-end;gap:10px;height:80px;padding:0 8px">
          ${statuses.map(s => `
            <div style="display:flex;flex-direction:column;align-items:center;flex:1">
              <div style="height:${Math.round((s.count/maxSt)*70)+4}px;width:100%;border-radius:6px 6px 0 0;background:${barColors[s.label]||'#9eb3cc'};opacity:.85"></div>
              <div style="font-size:.62rem;color:#9eb3cc;margin-top:5px;text-align:center">${h(s.label)}<br/><strong style="color:#ecf3ff">${s.count}</strong></div>
            </div>`).join('') || '<p style="color:#9eb3cc;font-size:.78rem">No articles yet.</p>'}
        </div>
      </div>
    </div>
    ${renderAudience(STATE.audience)}
  `;
}

/* "Your readers": an infographic of Membership → Your profile answers,
   plus a writing-level suggestion worked out from knowledge + experience */
function renderAudience(a) {
  if (!a) return '';
  const GOLD = '#ffcb6b';
  const MUTED = '#9eb3cc';
  const INK = '#ecf3ff';
  const total = a.withProfile || 0;
  const share = a.members ? Math.round((total / a.members) * 100) : 0;
  const rows = (f) => a.fields?.[f] || [];
  const top = (f) => rows(f).find((r) => r.n > 0);
  const noData = `<p style="color:${MUTED};font-size:.75rem;margin:0">No answers yet.</p>`;

  // Stat tile with a big number
  const tile = (label, big, sub, accent = GOLD, size = '1.9rem') => `
    <div class="card" style="padding:16px 18px;border-top:3px solid ${accent}">
      <div class="card-title" style="margin-bottom:6px">${h(label)}</div>
      <div style="font-size:${size};font-weight:800;color:${INK};line-height:1.15">${big}</div>
      <div style="font-size:.72rem;color:${MUTED};margin-top:4px">${sub}</div>
    </div>`;

  // Ring showing what share of readers filled in the profile
  const ring = (pct) => {
    const r = 30; const c = 2 * Math.PI * r;
    return `<svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label="${pct}% filled in">
      <circle cx="38" cy="38" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="8"/>
      <circle cx="38" cy="38" r="${r}" fill="none" stroke="${GOLD}" stroke-width="8" stroke-linecap="round"
        stroke-dasharray="${(c * pct) / 100} ${c}" transform="rotate(-90 38 38)"/>
      <text x="38" y="43" text-anchor="middle" font-size="15" font-weight="800" fill="${INK}">${pct}%</text></svg>`;
  };

  // Horizontal bars with the count and percentage written beside each bar
  const bars = (field, title, limit = 8) => {
    const list = rows(field).slice(0, limit);
    const max = Math.max(1, ...list.map((r) => r.n));
    return `<div class="card"><div class="card-title">${h(title)}</div>${list.some((r) => r.n) ? list.map((r) => `
      <div title="${h(r.label)}: ${r.n} reader${r.n === 1 ? '' : 's'} (${r.pct}%)" style="display:grid;grid-template-columns:minmax(90px,38%) 1fr 62px;gap:10px;align-items:center;margin-bottom:8px">
        <span style="font-size:.74rem;color:#dbe6f3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(r.label)}</span>
        <div style="height:10px;border-radius:0 4px 4px 0;background:rgba(255,255,255,.05)"><div style="height:10px;border-radius:0 4px 4px 0;background:${GOLD};width:${r.n ? Math.max(3, (r.n / max) * 100) : 0}%"></div></div>
        <span style="font-size:.74rem;color:${INK};text-align:right"><strong>${r.n}</strong> <span style="color:${MUTED}">${r.pct}%</span></span>
      </div>`).join('') : noData}</div>`;
  };

  // Columns for ordered answers (age, experience), number on top of each
  const columns = (field, title) => {
    const list = rows(field);
    const max = Math.max(1, ...list.map((r) => r.n));
    return `<div class="card"><div class="card-title">${h(title)}</div>${list.some((r) => r.n) ? `
      <div style="display:flex;align-items:flex-end;gap:6px;height:150px;padding-top:6px">${list.map((r) => `
        <div title="${h(r.label)}: ${r.n} (${r.pct}%)" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0">
          <div style="font-size:.74rem;font-weight:800;color:${INK}">${r.n}</div>
          <div style="font-size:.62rem;color:${MUTED};margin-bottom:4px">${r.pct}%</div>
          <div style="width:70%;max-width:38px;height:${r.n ? Math.max(4, Math.round((r.n / max) * 92)) : 2}px;background:${r.n ? GOLD : 'rgba(255,255,255,.12)'};border-radius:4px 4px 0 0"></div>
        </div>`).join('')}</div>
      <div style="display:flex;gap:6px;border-top:1px solid rgba(255,255,255,.12);padding-top:6px">${list.map((r) => `<div style="flex:1;min-width:0;text-align:center;font-size:.62rem;color:${MUTED};line-height:1.25">${h(r.label)}</div>`).join('')}</div>` : noData}</div>`;
  };

  // Knowledge as a 100% strip (ordered, beginner → expert), with numbers below
  const knowledge = () => {
    const list = rows('knowledge');
    const shades = ['#fff0c7', '#ffdc8a', '#ffcb6b', '#e0a63a'];
    if (!list.some((r) => r.n)) return `<div class="card"><div class="card-title">How much they know</div>${noData}</div>`;
    return `<div class="card"><div class="card-title">How much they know</div>
      <div style="display:flex;gap:2px;height:22px;border-radius:4px;overflow:hidden;margin-bottom:12px">${list.filter((r) => r.n).map((r) => `<div title="${h(r.label)}: ${r.n} (${r.pct}%)" style="flex:${r.n};background:${shades[list.indexOf(r)] || GOLD}"></div>`).join('')}</div>
      <div style="display:grid;grid-template-columns:repeat(${list.length},1fr);gap:8px">${list.map((r, i) => `
        <div><div style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:2px;background:${shades[i]}"></span><span style="font-size:.7rem;color:#dbe6f3">${h(r.label)}</span></div>
        <div style="font-size:1.15rem;font-weight:800;color:${INK};margin-top:2px">${r.n} <span style="font-size:.7rem;font-weight:400;color:${MUTED}">${r.pct}%</span></div></div>`).join('')}</div></div>`;
  };

  // Writing-level meter: Simple … Mixed … Deeper, marker at the reader mix
  const meter = () => {
    const newer = a.newerPct;
    const pos = newer === null || newer === undefined ? null : 100 - newer; // more newer readers → further left
    const label = { simple: 'Keep it simple', mixed: 'Mix of levels', deeper: 'Can go deeper', wait: 'Waiting for 5+ profiles' }[a.tone || 'wait'];
    return `<div class="card" style="grid-column:1/-1">
      <div class="card-title">Suggested writing level · <span style="color:${GOLD}">${h(label)}</span></div>
      <div style="position:relative;height:14px;border-radius:99px;background:linear-gradient(90deg,#2bc48a 0%,#ffcb6b 50%,#a78bfa 100%);margin:18px 6px 6px">
        ${pos === null ? '' : `<div title="${newer}% of readers are newer to investing" style="position:absolute;top:-7px;left:calc(${pos}% - 9px);width:18px;height:28px;border-radius:6px;background:${INK};box-shadow:0 0 0 3px #0d1530"></div>`}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.68rem;color:${MUTED};margin:0 6px 10px"><span>Simple words</span><span>Mixed</span><span>More detail</span></div>
      <p style="font-size:.8rem;color:#dbe6f3;margin:0">${h(a.suggestion)}</p>
    </div>`;
  };

  // What readers typed under "other"
  const typed = () => {
    const groups = [['country', 'Other countries'], ['profession', 'Other jobs'], ['goals', 'Other goals']]
      .map(([f, t]) => [t, a.typed?.[f] || []]).filter(([, l]) => l.length);
    if (!groups.length) return '';
    return `<div class="card" style="grid-column:1/-1"><div class="card-title">Typed in by readers ("other")</div>${groups.map(([t, l]) => `
      <div style="margin-bottom:8px"><span style="font-size:.72rem;color:${MUTED};margin-right:8px">${h(t)}:</span>${l.map((x) => `<span style="display:inline-block;margin:2px 4px 2px 0;padding:3px 10px;border-radius:99px;background:rgba(255,203,107,.12);color:${INK};font-size:.72rem">${h(x.text)} <strong>${x.n}</strong></span>`).join('')}</div>`).join('')}</div>`;
  };

  const topCountry = top('country');
  return `
    <h2 style="font-size:1rem;color:${INK};margin:22px 0 10px">Your readers</h2>
    <div class="card-grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px">
      ${tile('Readers', a.members, 'free + paid accounts')}
      <div class="card" style="padding:16px 18px;border-top:3px solid ${GOLD};display:flex;align-items:center;gap:14px">${ring(share)}<div><div class="card-title" style="margin-bottom:4px">Profiles filled in</div><div style="font-size:1.3rem;font-weight:800;color:${INK}">${total} of ${a.members}</div></div></div>
      ${tile('Newer to investing', a.newerPct === null || a.newerPct === undefined ? '—' : `${a.newerPct}%`, 'beginner / under 3 years', '#2bc48a')}
      ${tile('Top country', topCountry ? h(topCountry.label) : '—', topCountry ? `${topCountry.n} reader${topCountry.n === 1 ? '' : 's'} · ${topCountry.pct}%` : 'no answers yet', '#3cb5c4', '1.25rem')}
    </div>
    <div class="card-grid two-col" style="margin-top:12px">
      ${meter()}
      ${knowledge()}
      ${columns('experience', 'How long they have invested')}
      ${bars('country', 'Countries (top 8)')}
      ${columns('ageRange', 'Age')}
      ${bars('goals', 'Goals')}
      ${bars('interests', 'Topics they care about')}
      ${bars('regions', 'Markets they follow')}
      ${columns('investAmount', 'Amount invested')}
      ${bars('profession', 'What they do')}
      ${typed()}
    </div>
    <p style="font-size:.7rem;color:${MUTED};margin:8px 2px 0">Numbers show readers; % is of the ${total} who filled in a profile. Multi-choice answers can add up to more than 100%.</p>`;
}

async function load_analytics() {
  try {
    const [dash, audience] = await Promise.all([API.dashboard(), API.get('/api/admin/audience').catch(() => null)]);
    STATE.dashboard = dash;
    STATE.audience = audience;
    setMain(render_analytics());
    bind_analytics();
  } catch (e) {
    setMain(`<div class="loading">Could not load analytics: ${h(e.message)}</div>`);
  }
}

function bind_analytics() {
  // Analytics has no interactive elements — nothing to bind
}


// ════════════════════════════════════════════════════════════════════════════
// PAGE B: NEWS FEED
// ─────────────────
// To change this page ONLY: edit render_news() and bind_news()
// Do not touch any other section.
// ════════════════════════════════════════════════════════════════════════════

function render_news() {
  const srcs = ['All', 'Marketaux', 'NewsData.io', 'Dr MoneyWise'];
  const vis   = STATE.newsFilter === 'All'
    ? STATE.newsItems
    : STATE.newsItems.filter(n => n.src === STATE.newsFilter);
  const selCnt = STATE.newsItems.filter(n => n.sel).length;

  return `
    <div class="pg-head">
      <div class="eyebrow" style="--ac:#3cb5c4">Live headlines</div>
      <h1>News Feed</h1>
      <p>Select headlines, assign tier, set a schedule date, then approve into Inventory.</p>
    </div>

    <div class="news-bar">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-teal" id="fetchNewsBtn">◈ Load draft articles</button>
        <div class="news-row">
          ${srcs.map(s => `<button class="btn btn-sm ${STATE.newsFilter===s?'btn-teal':'btn-ghost'}" data-nsrc="${h(s)}">${h(s)}</button>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="font-size:.7rem;color:#9eb3cc">${vis.length} items · ${selCnt} selected</span>
        <button class="btn btn-sm btn-ghost" id="selAllBtn">Select all</button>
        <button class="btn btn-sm btn-ghost" id="clrAllBtn">Clear</button>
        ${selCnt > 0 ? `<button class="btn btn-sm btn-gold" id="approveNewsBtn">▲ Approve ${selCnt}</button>` : ''}
      </div>
    </div>

    ${vis.length === 0 ? `
      <div class="card" style="text-align:center;padding:40px;color:#9eb3cc">
        <div style="font-size:1.4rem;margin-bottom:10px">◈</div>
        <p>No headlines yet. Click <strong style="color:#3cb5c4">Load draft articles</strong> to pull in your pending content.</p>
        <p style="margin-top:8px;font-size:.72rem">When you configure Marketaux or NewsData.io keys in Settings, live headlines will appear here automatically.</p>
      </div>
    ` : vis.map(n => `
      <div class="news-item ${n.sel?'selected':''}" data-nid="${n.id}">
        <div class="news-check ${n.sel?'on':''}" data-ntog="${n.id}">${n.sel?'✓':''}</div>
        <div>
          <h4 data-ntog="${n.id}">${h(n.hl)}</h4>
          <div class="news-meta">
            <span class="news-src">${h(n.src)}</span>
            <span class="news-time">${h(n.time)}</span>
            <span class="tag tag-free" style="font-size:.6rem">${h(n.cat)}</span>
            <div class="tier-pills">
              ${['free','regular','premium'].map(t => `
                <span class="tier-pill ${n.tier===t?(t==='free'?'f':t==='regular'?'r':'p'):''}" data-ntier="${n.id}" data-tv="${t}">${t}</span>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="news-actions">
          <input type="datetime-local" class="input" style="font-size:.65rem;padding:4px 7px;width:150px" value="${h(n.date||'')}" data-ndate="${n.id}"/>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm btn-green" data-napprove="${n.id}" title="Approve this one">✓</button>
            <button class="btn btn-sm btn-rose"  data-ndel="${n.id}"     title="Remove">✕</button>
          </div>
        </div>
      </div>
    `).join('')}
  `;
}

async function load_news() {
  setMain('<div class="loading">Loading articles…</div>');
  try {
    const res = await API.listArticles();
    const drafts = (res.articles || []).filter(a => a.status === 'draft');
    STATE.newsItems = drafts.map(a => ({
      id:  a.id,
      hl:  a.headline,
      src: a.source || 'Dr MoneyWise',
      time: fmtDate(a.publishAt),
      cat:  a.interest || 'General',
      sel:  false,
      tier: a.accessTier || 'free',
      date: '',
      slug: a.slug,
      _full: a,
    }));
    setMain(render_news());
    bind_news();
  } catch (e) {
    setMain(`<div class="loading">Could not load news: ${h(e.message)}</div>`);
  }
}

function bind_news() {
  // Toggle selection
  qsa('[data-ntog]').forEach(el => el.addEventListener('click', () => {
    const n = STATE.newsItems.find(x => x.id === el.dataset.ntog);
    if (n) { n.sel = !n.sel; setMain(render_news()); bind_news(); }
  }));

  // Set tier
  qsa('[data-ntier]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    const n = STATE.newsItems.find(x => x.id === el.dataset.ntier);
    if (n) { n.tier = el.dataset.tv; setMain(render_news()); bind_news(); }
  }));

  // Set schedule date
  qsa('[data-ndate]').forEach(inp => inp.addEventListener('change', () => {
    const n = STATE.newsItems.find(x => x.id === inp.dataset.ndate);
    if (n) n.date = inp.value;
  }));

  // Delete single item
  qsa('[data-ndel]').forEach(b => b.addEventListener('click', () => {
    STATE.newsItems = STATE.newsItems.filter(n => n.id !== b.dataset.ndel);
    setMain(render_news()); bind_news();
    showToast('Headline removed');
  }));

  // Approve single item
  qsa('[data-napprove]').forEach(b => b.addEventListener('click', () => {
    const n = STATE.newsItems.find(x => x.id === b.dataset.napprove);
    if (n) { n.sel = true; setMain(render_news()); bind_news(); }
  }));

  // Source filter
  qsa('[data-nsrc]').forEach(b => b.addEventListener('click', () => {
    STATE.newsFilter = b.dataset.nsrc;
    setMain(render_news()); bind_news();
  }));

  // Select all / clear
  qs('#selAllBtn')?.addEventListener('click', () => {
    STATE.newsItems.forEach(n => n.sel = true);
    setMain(render_news()); bind_news();
  });
  qs('#clrAllBtn')?.addEventListener('click', () => {
    STATE.newsItems.forEach(n => n.sel = false);
    setMain(render_news()); bind_news();
  });

  // Fetch (load drafts)
  qs('#fetchNewsBtn')?.addEventListener('click', load_news);

  // Approve selected — publish them on the server
  qs('#approveNewsBtn')?.addEventListener('click', async () => {
    const sel = STATE.newsItems.filter(n => n.sel);
    if (!sel.length) { showToast('Select at least one item first'); return; }
    let done = 0;
    for (const n of sel) {
      try {
        await API.saveArticle({
          ...n._full,
          accessTier: n.tier,
          status: n.date ? 'scheduled' : 'published',
          publishAt: n.date ? new Date(n.date).toISOString() : new Date().toISOString(),
        });
        done++;
      } catch { /* skip failed */ }
    }
    STATE.newsItems = STATE.newsItems.filter(n => !n.sel);
    showToast(`${done} article${done !== 1 ? 's' : ''} approved`);
    setMain(render_news()); bind_news();
  });
}


// ════════════════════════════════════════════════════════════════════════════
// PAGE C: AI WRITER
// ─────────────────
// To change this page ONLY: edit render_writer() and bind_writer()
// Do not touch any other section.
// ════════════════════════════════════════════════════════════════════════════

function render_writer() {
  const regions   = (STATE.bootstrap?.regions   || []).map(r => `<option value="${h(r.id)}">${h(r.label)}</option>`).join('');
  const interests = (STATE.bootstrap?.interests || []).map(i => `<option value="${h(i.id)}">${h(i.label)}</option>`).join('');

  return `
    <div class="pg-head">
      <div class="eyebrow" style="--ac:#a78bfa">Content creation</div>
      <h1>AI Writer</h1>
      <p>Give a topic — the server drafts it using GPT, Claude, Perplexity, or Gemini via your API keys. Approve, schedule, or regenerate.</p>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="card-title">🔥 Trending auto-pick</div>
      <p style="font-size:.75rem;color:#9eb3cc;margin-bottom:10px">
        Finds whatever's trending across your news sources right now (a topic showing up in
        several separate headlines) and writes a Learning Point about it in simple, jargon-free
        language — then attaches a Pexels photo automatically. Saved to Inventory as
        <strong>scheduled</strong> for your review, using the tier and region selected below.
      </p>
      <button class="btn btn-teal" id="genTrendingBtn" ${STATE.trendingBusy?'disabled':''}>
        ${STATE.trendingBusy ? '<span class="cursor">Finding what\'s trending</span>' : '🔥 Auto-generate from trending'}
      </button>
      ${STATE.trendingStatus ? `<div class="writer-status">${h(STATE.trendingStatus)}</div>` : ''}
    </div>

    <div class="writer-grid">

      <!-- LEFT: Controls -->
      <div class="card form-gap">
        <div>
          <div class="field">AI model</div>
          <div class="model-row">
            <button class="model-btn ${STATE.writerModel==='claude'?'claude':''}" id="mClaude">✦ Claude (Anthropic)</button>
            <button class="model-btn ${STATE.writerModel==='openai'?'openai':''}" id="mOpenAI">⊕ GPT-4 (OpenAI)</button>
            <button class="model-btn ${STATE.writerModel==='perplexity'?'perplexity':''}" id="mPerplexity">◎ Perplexity (live search)</button>
            <button class="model-btn ${STATE.writerModel==='gemini'?'gemini':''}" id="mGemini">◆ Gemini (Google, cheap)</button>
          </div>
        </div>

        <div>
          <label class="field" for="topicTA">Topic or headline idea</label>
          <textarea id="topicTA" rows="3" placeholder="e.g. How rising interest rates affect Gulf property investors">${h(STATE.writerTopic)}</textarea>
        </div>

        <div class="form-row">
          <div>
            <label class="field" for="wrTier">Access tier</label>
            <select id="wrTier">
              <option value="free"    ${STATE.writerTier==='free'    ?'selected':''}>Free</option>
              <option value="regular" ${STATE.writerTier==='regular' ?'selected':''}>Regular</option>
              <option value="premium" ${STATE.writerTier==='premium' ?'selected':''}>Premium</option>
            </select>
          </div>
          <div>
            <label class="field" for="wrRegion">Region</label>
            <select id="wrRegion">${regions || '<option value="global">Global</option>'}</select>
          </div>
        </div>

        <div>
          <label class="field" for="wrInterest">Interest area</label>
          <select id="wrInterest">${interests || '<option value="equities">Stocks</option>'}</select>
        </div>

        <button class="btn btn-purple" id="genBtn" ${STATE.writerGenerating?'disabled':''}>
          ${STATE.writerGenerating ? '<span class="cursor">Generating</span>' : '✦ Generate article'}
        </button>
        <div class="writer-status">${h(STATE.writerStatus)}</div>

        ${STATE.writerDone ? `
          <div class="writer-actions">
            <button class="btn btn-gold btn-sm"   id="approveArt">✓ Approve → Inventory</button>
            <button class="btn btn-teal btn-sm"   id="schedArt"  >◷ Schedule</button>
            <button class="btn btn-ghost btn-sm"  id="regenArt"  >↺ Regenerate</button>
          </div>
          <div class="writer-actions" style="margin-top:8px">
            <button class="btn btn-ghost btn-sm" id="addPexelsBtn" ${STATE.visualBusy?'disabled':''}>📷 Add Pexels photo</button>
            <button class="btn btn-ghost btn-sm" id="addGammaBtn" ${STATE.visualBusy?'disabled':''}>🎨 Generate Gamma infographic</button>
          </div>
          ${STATE.visualStatus ? `<div class="writer-status">${h(STATE.visualStatus)}</div>` : ''}
        ` : ''}
      </div>

      <!-- RIGHT: Preview -->
      <div>
        <div class="field" style="margin-bottom:8px">Article preview</div>
        <div class="preview-box" id="previewBox">
          ${STATE.writerText
            ? h(STATE.writerText) + (STATE.writerGenerating ? '<span class="cursor"></span>' : '')
            : '<span class="preview-empty">Your generated article will appear here. Enter a topic and click Generate.</span>'}
        </div>
      </div>

    </div>
  `;
}

function bind_writer() {
  qs('#mClaude')?.addEventListener('click', () => { STATE.writerModel = 'claude'; setMain(render_writer()); bind_writer(); });
  qs('#mOpenAI')?.addEventListener('click', () => { STATE.writerModel = 'openai'; setMain(render_writer()); bind_writer(); });
  qs('#mPerplexity')?.addEventListener('click', () => { STATE.writerModel = 'perplexity'; setMain(render_writer()); bind_writer(); });
  qs('#mGemini')?.addEventListener('click', () => { STATE.writerModel = 'gemini'; setMain(render_writer()); bind_writer(); });
  qs('#topicTA')?.addEventListener('input', e => STATE.writerTopic    = e.target.value);
  qs('#wrTier')?.addEventListener('change', e => STATE.writerTier      = e.target.value);
  qs('#wrRegion')?.addEventListener('change', e => STATE.writerRegion  = e.target.value);
  qs('#wrInterest')?.addEventListener('change', e => STATE.writerInterest = e.target.value);

  qs('#genBtn')?.addEventListener('click', generateArticle);

  qs('#genTrendingBtn')?.addEventListener('click', async () => {
    STATE.trendingBusy = true;
    STATE.trendingStatus = 'Scanning your news sources for what\u2019s trending…';
    setMain(render_writer()); bind_writer();
    try {
      const res = await API.generateTrending({ accessTier: STATE.writerTier, region: STATE.writerRegion });
      if (res.ok && res.article) {
        STATE.trendingStatus = '';
        showToast(`Scheduled: "${res.article.headline}"`);
      } else {
        STATE.trendingStatus = res.message || 'Nothing trending enough right now — try again later.';
      }
    } catch (e) {
      STATE.trendingStatus = '';
      showToast('Trending auto-generate failed: ' + e.message);
    }
    STATE.trendingBusy = false;
    setMain(render_writer()); bind_writer();
  });

  qs('#approveArt')?.addEventListener('click', async () => {
    if (!STATE.generatedArticle) {
      showToast('Nothing to save — generate an article first');
      return;
    }
    try {
      await API.saveArticle({
        ...STATE.generatedArticle,
        status: 'draft',
        publishAt: new Date().toISOString(),
      });
      STATE.writerText = ''; STATE.writerDone = false; STATE.writerTopic = ''; STATE.generatedArticle = null; STATE.visualStatus = '';
      showToast('Article saved to Inventory as draft');
      setMain(render_writer()); bind_writer();
    } catch (e) { showToast('Save failed: ' + e.message); }
  });

  qs('#schedArt')?.addEventListener('click', async () => {
    if (!STATE.generatedArticle) {
      showToast('Nothing to schedule — generate an article first');
      return;
    }
    try {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      await API.saveArticle({
        ...STATE.generatedArticle,
        status: 'scheduled',
        publishAt: tomorrow,
      });
      STATE.writerText = ''; STATE.writerDone = false; STATE.writerTopic = ''; STATE.generatedArticle = null; STATE.visualStatus = '';
      showToast('Article scheduled for tomorrow');
      setMain(render_writer()); bind_writer();
    } catch (e) { showToast('Save failed: ' + e.message); }
  });

  qs('#regenArt')?.addEventListener('click', () => {
    STATE.writerText = ''; STATE.writerDone = false; STATE.generatedArticle = null;
    setMain(render_writer()); bind_writer();
    generateArticle();
  });

  qs('#addPexelsBtn')?.addEventListener('click', async () => {
    if (!STATE.generatedArticle) return;
    STATE.visualBusy = true;
    STATE.visualStatus = 'Searching Pexels…';
    setMain(render_writer()); bind_writer();
    try {
      const res = await API.attachPexels({ articleId: STATE.generatedArticle.id, query: STATE.generatedArticle.headline });
      if (res.article) {
        STATE.generatedArticle = res.article;
        STATE.visualStatus = 'Photo attached ✓';
        showToast('Pexels photo attached to article');
      } else {
        STATE.visualStatus = 'No matching photo found on Pexels';
      }
    } catch (e) {
      STATE.visualStatus = '';
      showToast('Pexels search failed: ' + e.message);
    }
    STATE.visualBusy = false;
    setMain(render_writer()); bind_writer();
  });

  qs('#addGammaBtn')?.addEventListener('click', async () => {
    if (!STATE.generatedArticle) return;
    const proceed = confirm('Generating a Gamma infographic can take 1-2 minutes and uses your Gamma Pro plan credits. Continue?');
    if (!proceed) return;
    STATE.visualBusy = true;
    STATE.visualStatus = 'Generating infographic with Gamma — this can take up to 2 minutes…';
    setMain(render_writer()); bind_writer();
    try {
      const res = await API.attachGamma({ articleId: STATE.generatedArticle.id });
      if (res.article) {
        STATE.generatedArticle = res.article;
        STATE.visualStatus = 'Infographic attached ✓';
        showToast('Gamma infographic attached to article');
      } else {
        STATE.visualStatus = 'Gamma did not return an infographic';
      }
    } catch (e) {
      STATE.visualStatus = '';
      showToast('Gamma generation failed: ' + e.message);
    }
    STATE.visualBusy = false;
    setMain(render_writer()); bind_writer();
  });
}

async function generateArticle() {
  const topic = (qs('#topicTA')?.value || STATE.writerTopic || '').trim();
  if (!topic) { showToast('Enter a topic first'); return; }

  STATE.writerTopic = topic;
  STATE.writerGenerating = true;
  STATE.writerDone = false;
  STATE.writerText = '';
  STATE.generatedArticle = null;
  STATE.visualStatus = '';
  STATE.visualBusy = false;
  STATE.writerStatus = 'Sending to AI writer…';
  setMain(render_writer()); bind_writer();

  try {
    const payload = await API.generateArticle({
      topic,
      accessTier: STATE.writerTier,
      region:     STATE.writerRegion,
      interest:   STATE.writerInterest,
      model:      STATE.writerModel,
      publishAt:  new Date().toISOString(),
      status:     'draft',
    });

    // /api/admin/learning/generate returns the saved article directly —
    // NOT wrapped in { article: ... }. Store the real object so Approve/
    // Schedule can reuse it as-is instead of reconstructing (lossily) from
    // display text.
    STATE.generatedArticle = payload;

    const raw = payload?.headline
      ? `HEADLINE: ${payload.headline}\n\nSUMMARY: ${payload.summary || ''}\n\nBODY:\n${(payload.bodySections || []).map(s => s.body).join('\n\n')}\n\nTAKEAWAYS:\n${(payload.takeaways || []).map(t => '- ' + t).join('\n')}`
      : JSON.stringify(payload, null, 2);

    STATE.writerStatus = 'Streaming…';
    let i = 0;
    if (STATE.writerInterval) clearInterval(STATE.writerInterval);
    STATE.writerInterval = setInterval(() => {
      i += 6;
      STATE.writerText = raw.slice(0, i);
      const box = qs('#previewBox');
      if (box) box.innerHTML = h(STATE.writerText) + (i < raw.length ? '<span class="cursor"></span>' : '');
      if (i >= raw.length) {
        clearInterval(STATE.writerInterval);
        STATE.writerText       = raw;
        STATE.writerGenerating = false;
        STATE.writerDone       = true;
        STATE.writerStatus     = '';
        setMain(render_writer()); bind_writer();
      }
    }, 14);
  } catch (e) {
    STATE.writerText       = 'Generation failed: ' + e.message + '\n\nMake sure your API keys are saved in Settings → APIs & More.';
    STATE.writerGenerating = false;
    STATE.writerDone       = false;
    STATE.writerStatus     = '';
    setMain(render_writer()); bind_writer();
  }
}


// ════════════════════════════════════════════════════════════════════════════
// PAGE D: INVENTORY
// ─────────────────
// To change this page ONLY: edit render_inventory() and bind_inventory()
// Do not touch any other section.
// ════════════════════════════════════════════════════════════════════════════

function render_inventory() {
  const filters = ['all', 'candidate', 'published', 'scheduled', 'draft', 'archived'];
  const counts  = Object.fromEntries(
    filters.map(f => [f, f === 'all' ? STATE.articles.length : STATE.articles.filter(a => a.status === f).length])
  );
  const vis = STATE.invFilter === 'all'
    ? STATE.articles
    : STATE.articles.filter(a => a.status === STATE.invFilter);

  const PRE_LAUNCH_TARGET = 25;
  const liveInventory = counts.published + counts.scheduled;

  return `
    <div class="pg-head">
      <div class="eyebrow" style="--ac:#2bc48a">Content library</div>
      <h1>Article Inventory</h1>
      <p>${STATE.articles.length} articles — edit tiers, add YouTube links, schedule, publish, or delete.</p>
      <p style="font-size:.72rem;color:#9eb3cc;margin-top:4px">
        ${liveInventory} / ${PRE_LAUNCH_TARGET} toward launch inventory (published + scheduled)
        ${counts.candidate ? ` · ${counts.candidate} candidate${counts.candidate === 1 ? '' : 's'} awaiting review` : ''}
        ${counts.archived ? ` · ${counts.archived} archived (rotated off the homepage — reschedule any time)` : ''}
      </p>
    </div>

    <div class="inv-bar">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${filters.map(f => `<button class="btn btn-sm ${STATE.invFilter===f?'btn-green':'btn-ghost'}" data-invf="${f}">
          ${f.charAt(0).toUpperCase()+f.slice(1)} (${counts[f]})
        </button>`).join('')}
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span style="font-size:.7rem;color:#9eb3cc">${vis.length} showing</span>
        <button class="btn btn-sm btn-teal" id="discoverBtn" title="Pull fresh headlines from your news APIs and AI-rewrite them into candidate articles for review">✨ Discover candidates</button>
        <button class="btn btn-sm btn-teal" id="refreshInvBtn">↻ Refresh</button>
      </div>
    </div>

    <div class="inv-grid">
      ${vis.map(a => `
        <div class="inv-card">
          <div class="inv-top">
            <span class="tag ${tagClass(a.accessTier)}">${h(a.accessTier)}</span>
            <span class="tag ${statusClass(a.status)}">${h(a.status)}</span>
            <span class="tag tag-free" style="font-size:.6rem">${h(a.interest || a.contentType || '')}</span>
            ${a.engineSlot === 'local-fallback'
              ? `<span class="tag" style="font-size:.6rem;background:rgba(255,107,107,.14);color:#ff6b6b" title="AI writer failed for this article — content is the generic template, not real AI writing. Check Railway logs, then regenerate.">⚠ fallback</span>`
              : a.engineSlot
                ? `<span class="tag" style="font-size:.6rem;background:rgba(158,179,204,.10);color:#9eb3cc">${h(a.engineSlot)}</span>`
                : ''}
            <span style="font-size:.65rem;color:#9eb3cc;margin-left:auto">${fmtDate(a.publishAt)}</span>
          </div>
          <h4>${h(a.headline)}</h4>
          ${(a.qualityIssues || []).length ? `<p style="font-size:.7rem;color:#e8a33d;margin:2px 0 6px">⚠ Held: ${h(a.qualityIssues.join('; '))}</p>` : ''}

          <div class="yt-row">
            <span style="font-size:1rem">▶</span>
            <input class="input" placeholder="YouTube link (optional)" value="${h(a._yt||'')}" data-ytid="${h(a.id)}" title="Paste a YouTube video URL to embed with this article"/>
          </div>

          <div class="sched-row">
            <span style="font-size:.7rem;color:#9eb3cc">◷</span>
            <input type="datetime-local" class="input" data-dtid="${h(a.id)}" title="Schedule publish date"/>
          </div>

          <div class="inv-actions">
            <div class="tier-pills" style="margin-right:4px">
              ${['free','regular','premium'].map(t => `
                <span class="tier-pill ${a.accessTier===t?(t==='free'?'f':t==='regular'?'r':'p'):''}" data-itier="${h(a.id)}" data-tv="${t}">${t}</span>
              `).join('')}
            </div>
            <button class="btn btn-sm btn-ghost" data-iread="${h(a.id)}">Read</button>
            ${a.status !== 'published' ? `<button class="btn btn-sm btn-green"  data-ipub="${h(a.id)}">Publish</button>` : ''}
            ${a.status !== 'scheduled' ? `<button class="btn btn-sm btn-teal"   data-isch="${h(a.id)}">Schedule</button>` : ''}
            <button class="btn btn-sm btn-rose" data-idel="${h(a.id)}">Delete</button>
          </div>
        </div>
      `).join('') || '<div class="card" style="text-align:center;color:#9eb3cc;padding:40px">No articles in this filter.</div>'}
    </div>
  `;
}

async function load_inventory() {
  setMain('<div class="loading">Loading articles…</div>');
  try {
    const res = await API.listArticles();
    STATE.articles = (res.articles || []).map(a => ({ ...a, _yt: '' }));
    setMain(render_inventory());
    bind_inventory();
  } catch (e) {
    setMain(`<div class="loading">Could not load articles: ${h(e.message)}</div>`);
  }
}

/* Full-text reader for one article (Inventory → Read). Shows exactly what
   readers would see, with any held-for-review reasons highlighted. */
function renderReader(a) {
  const para = (t) => String(t || '').split(/\n{2,}/).filter(Boolean).map((x) => `<p>${h(x)}</p>`).join('');
  const sections = (a.bodySections || []).length
    ? a.bodySections.map((sec) => `<h3>${h(sec.heading)}</h3>${para(sec.body)}`).join('')
    : `${para(a.plainEnglish)}${para(a.whyItMatters)}${para(a.everydayExample)}`;
  const takeaways = (a.takeaways || []).length ? `<h3>Key takeaways</h3><ul>${a.takeaways.map((t) => `<li>${h(t)}</li>`).join('')}</ul>` : '';
  const jargon = (a.jargonBuster || []).length ? `<h3>Jargon buster</h3><ul>${a.jargonBuster.map((j) => typeof j === 'string' ? `<li>${h(j)}</li>` : `<li><strong>${h(j.term)}</strong>: ${h(j.meaning || j.definition || '')}</li>`).join('')}</ul>` : '';
  const issues = (a.qualityIssues || []).length ? `<div class="reader-warn">Held for review: ${h(a.qualityIssues.join('; '))}</div>` : '';
  return `<div class="reader-overlay" id="readerOverlay" role="dialog" aria-modal="true" aria-label="Read article">
    <div class="reader-box">
      <button class="btn btn-sm btn-ghost reader-close" id="readerClose">✕ Close</button>
      <div class="reader-meta">${h(a.status)} · ${h(a.accessTier)} · ${h(a.interest || '')}${a.engineSlot ? ' · ' + h(a.engineSlot) : ''}</div>
      ${issues}
      <h2>${h(a.headline)}</h2>
      ${a.summary ? `<p class="reader-summary">${h(a.summary)}</p>` : ''}
      ${sections}${takeaways}${jargon}
      <div class="reader-actions">
        ${a.status !== 'published' ? `<button class="btn btn-sm btn-green" data-ipub="${h(a.id)}">Publish</button>` : ''}
        <button class="btn btn-sm btn-rose" data-idel="${h(a.id)}">Delete</button>
      </div>
    </div>
  </div>`;
}

function bind_inventory() {
  // Read the full article before publishing
  qsa('[data-iread]').forEach(b => b.addEventListener('click', () => {
    const a = STATE.articles.find(x => x.id === b.dataset.iread);
    if (!a) return;
    qs('#readerOverlay')?.remove();
    document.body.insertAdjacentHTML('beforeend', renderReader(a));
    const overlay = qs('#readerOverlay');
    const close = () => overlay?.remove();
    qs('#readerClose')?.addEventListener('click', close);
    overlay?.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    // Publish / Delete inside the reader reuse the card's buttons
    overlay?.querySelectorAll('[data-ipub],[data-idel]').forEach(btn => btn.addEventListener('click', () => {
      const sel = btn.dataset.ipub ? `.inv-card [data-ipub="${btn.dataset.ipub}"]` : `.inv-card [data-idel="${btn.dataset.idel}"]`;
      close();
      document.querySelector(sel)?.click();
    }));
  }));

  // Filter tabs
  qsa('[data-invf]').forEach(b => b.addEventListener('click', () => {
    STATE.invFilter = b.dataset.invf;
    setMain(render_inventory()); bind_inventory();
  }));

  // Refresh
  qs('#refreshInvBtn')?.addEventListener('click', load_inventory);

  // Discover candidates from news APIs
  qs('#discoverBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Searching…';
    try {
      const res = await API.discoverCandidates({});
      showToast(res.discovered ? `Found ${res.discovered} new candidate${res.discovered === 1 ? '' : 's'}` : 'No new headlines found right now — try again later');
      STATE.invFilter = 'candidate';
      await load_inventory();
    } catch (err) {
      showToast('Discovery failed: ' + err.message);
      btn.disabled = false;
      btn.textContent = '✨ Discover candidates';
    }
  });

  // YouTube link
  qsa('[data-ytid]').forEach(inp => inp.addEventListener('input', () => {
    const a = STATE.articles.find(x => x.id === inp.dataset.ytid);
    if (a) a._yt = inp.value;
  }));

  // Schedule date
  qsa('[data-dtid]').forEach(inp => inp.addEventListener('change', () => {
    const a = STATE.articles.find(x => x.id === inp.dataset.dtid);
    if (a) a._schedDate = inp.value;
  }));

  // Change tier
  qsa('[data-itier]').forEach(el => el.addEventListener('click', async e => {
    e.stopPropagation();
    const a = STATE.articles.find(x => x.id === el.dataset.itier);
    if (!a) return;
    a.accessTier = el.dataset.tv;
    try { await API.saveArticle({ ...a, accessTier: el.dataset.tv }); showToast('Tier updated'); }
    catch { showToast('Could not update tier'); }
    setMain(render_inventory()); bind_inventory();
  }));

  // Publish
  qsa('[data-ipub]').forEach(b => b.addEventListener('click', async () => {
    const a = STATE.articles.find(x => x.id === b.dataset.ipub);
    if (!a) return;
    try {
      await API.saveArticle({ ...a, status: 'published', publishAt: new Date().toISOString() });
      a.status = 'published';
      showToast('Article published');
      setMain(render_inventory()); bind_inventory();
    } catch (e) { showToast('Publish failed: ' + e.message); }
  }));

  // Schedule
  qsa('[data-isch]').forEach(b => b.addEventListener('click', async () => {
    const a = STATE.articles.find(x => x.id === b.dataset.isch);
    if (!a) return;
    const dt = a._schedDate ? new Date(a._schedDate).toISOString() : new Date(Date.now() + 86400000).toISOString();

    if (a.contentType === 'learning' && a.source !== 'trending-auto') {
      const otherAdminScheduled = STATE.articles.filter(x =>
        x.id !== a.id && x.contentType === 'learning' && x.status === 'scheduled' && x.source !== 'trending-auto'
      ).length;
      if (otherAdminScheduled >= 10) {
        const proceed = confirm(
          `You already have ${otherAdminScheduled} Learning Points scheduled. Only 10 show on the homepage at a time (rotating every 2 days), and your scheduled topics always take priority over trending auto-picks — so this one will still get a slot, it'll just push a trending pick out sooner. Schedule it anyway?`
        );
        if (!proceed) return;
      }
    }

    try {
      await API.saveArticle({ ...a, status: 'scheduled', publishAt: dt });
      a.status = 'scheduled'; a.publishAt = dt;
      showToast('Article scheduled');
      setMain(render_inventory()); bind_inventory();
    } catch (e) { showToast('Schedule failed: ' + e.message); }
  }));

  // Delete
  qsa('[data-idel]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this article? This cannot be undone.')) return;
    try {
      await API.deleteArticle(b.dataset.idel);
      STATE.articles = STATE.articles.filter(a => a.id !== b.dataset.idel);
      showToast('Article deleted');
      setMain(render_inventory()); bind_inventory();
    } catch (e) { showToast('Delete failed: ' + e.message); }
  }));
}


// ════════════════════════════════════════════════════════════════════════════
// PAGE E: SETTINGS  (APIs & More)
// ────────────────────────────────
// To change this page ONLY: edit render_settings() and bind_settings()
// Do not touch any other section.
// ════════════════════════════════════════════════════════════════════════════

function render_settings() {
  const s = STATE.dashboard?.settings || {};
  const coupons = STATE.coupons;

const apiRows = [
    { l: 'Perplexity',             k: 'perplexityKey', c: '#4f9eff', hint: 'perplexity.ai — Sonar API, includes live web search, manual pick only' },
    { l: 'Gemini',                 k: 'geminiKey',     c: '#4285f4', hint: 'aistudio.google.com — Flash-Lite, cheapest reliable option, manual pick only' },
    { l: 'Pexels',                 k: 'pexelsKey',     c: '#05a081', hint: 'pexels.com — free stock photos for article images' },
    { l: 'Gamma',                  k: 'gammaKey',      c: '#ff6b6b', hint: 'gamma.app — requires Pro+ plan, generates infographic images (slow: ~1-2 min per call)' },
    { l: 'Anthropic (Claude)',    k: 'claudeKey',    c: '#a78bfa', hint: 'console.anthropic.com' },
    { l: 'OpenAI (GPT-4)',        k: 'openAiKey',    c: '#2bc48a', hint: 'platform.openai.com'   },
    { l: 'Marketaux',             k: 'marketauxKey', c: '#3cb5c4', hint: 'marketaux.com — free 100 req/day' },
    { l: 'NewsData.io',           k: 'newsdataKey',  c: '#e8a33d', hint: 'newsdata.io — free 200 credits/day, commercial use allowed' },
    { l: 'Logo.dev',              k: 'logoDevKey',     c: '#7c5cff', hint: 'logo.dev — free company logos (publishable key, starts pk_). Credit link is shown on company pages' },
    { l: 'Marketstack',           k: 'marketstackKey', c: '#d4af37', hint: 'marketstack.com — free 100 req/month for testing, upgrade to Basic ($9.99/mo) before launch' },
  ];

  const stripeRows = [
    { l: 'Regular Monthly',  k: 'stripeRegularMonthly' },
    { l: 'Regular Annual',   k: 'stripeRegularAnnual'  },
    { l: 'Premium Monthly',  k: 'stripePremiumMonthly' },
    { l: 'Premium Annual',   k: 'stripePremiumAnnual'  },
  ];

  return `
    <div class="pg-head">
      <div class="eyebrow" style="--ac:#f26a6a">Configuration</div>
      <h1>APIs &amp; More</h1>
      <p>API keys, payments, coupons, and site settings. Changes save to your Railway environment.</p>
    </div>

    <div class="settings-grid">

      <!-- LEFT COL -->
      <div style="display:flex;flex-direction:column;gap:14px">

        <!-- API KEYS -->
        <div class="card">
          <div class="card-title">AI &amp; News API keys</div>
          ${apiRows.map(r => `
            <div class="api-row">
              <div class="api-dot" style="background:${r.c}"></div>
              <div class="api-label">${h(r.l)}<div class="api-hint">${h(r.hint)}</div></div>
              <div class="api-val">
                <input type="password" placeholder="Paste key…" id="key_${r.k}" value="${h(s[r.k]||'')}"/>
              </div>
            </div>`).join('')}
          <button class="btn btn-rose btn-sm" id="saveApiKeysBtn" style="margin-top:10px">Save API keys</button>
          <div id="apiKeysMsg" style="font-size:.72rem;color:#2bc48a;margin-top:7px;min-height:16px"></div>
        </div>

        <!-- LEARN LEVEL NAMES -->
        <div class="card">
          <div class="card-title">Learn level names</div>
          <p class="api-hint" style="margin:0 0 8px">The two free reading levels on /learn. Change the names any time; the web addresses (/learn/beginners and /learn/intermediate) stay the same.</p>
          <div class="api-row"><div class="api-dot" style="background:#1baf7a"></div><div class="api-label">Beginners<div class="api-hint">default: Young Turks</div></div><div class="api-val"><input id="lvlBeginner" maxlength="30" placeholder="Young Turks"/></div></div>
          <div class="api-row"><div class="api-dot" style="background:#2a78d6"></div><div class="api-label">Mid-level<div class="api-hint">default: Knights</div></div><div class="api-val"><input id="lvlIntermediate" maxlength="30" placeholder="Knights"/></div></div>
          <button class="btn btn-rose btn-sm" id="saveLvlBtn" style="margin-top:10px">Save names</button>
          <div id="lvlMsg" style="font-size:.72rem;color:#2bc48a;margin-top:7px;min-height:16px"></div>
        </div>

        <!-- PAYMENTS (STRIPE) -->
        <div class="card">
          <div class="card-title">Payments (Stripe)</div>
          <p style="font-size:.78rem;color:#9eb3cc;margin:0 0 10px">
            Status: <strong style="color:${s.stripeKeyMode === 'live' ? '#2bc48a' : s.stripeKeyMode === 'test' ? '#e8a33d' : '#f26a6a'}">${
              s.stripeKeyMode === 'live' ? 'LIVE — real payments' : s.stripeKeyMode === 'test' ? 'Test mode — no real money' : s.stripeKeyMode === 'unknown' ? 'Key saved but not recognised' : 'Not set up'
            }</strong> · Webhook: <strong style="color:${s.stripeWebhookConfigured ? '#2bc48a' : '#f26a6a'}">${s.stripeWebhookConfigured ? 'connected' : 'not set'}</strong>
          </p>
          <div class="api-row">
            <div class="api-dot" style="background:#2bc48a"></div>
            <div class="api-label">Secret key<div class="api-hint">Stripe → Developers → API keys. Starts with sk_test_ (testing) or sk_live_ (launch).</div></div>
            <div class="api-val"><input type="password" placeholder="${s.stripeKeyMode !== 'off' ? 'Saved — paste a new one to replace' : 'sk_test_…'}" id="stripeSecretKey"/></div>
          </div>
          <div class="api-row">
            <div class="api-dot" style="background:#2bc48a"></div>
            <div class="api-label">Webhook signing secret<div class="api-hint">Starts with whsec_. Webhook address to give Stripe:<br/><strong id="webhookUrl">${h(location.origin)}/api/stripe/webhook</strong></div></div>
            <div class="api-val"><input type="password" placeholder="${s.stripeWebhookConfigured ? 'Saved — paste a new one to replace' : 'whsec_…'}" id="stripeWebhookSecret"/></div>
          </div>
          <button class="btn btn-green btn-sm" id="saveStripeBtn" style="margin-top:10px">Save payment keys</button>
          <div id="stripeMsg" style="font-size:.72rem;color:#2bc48a;margin-top:7px;min-height:16px"></div>
        </div>

      </div>

      <!-- RIGHT COL -->
      <div style="display:flex;flex-direction:column;gap:14px">

        <!-- BACKUP -->
        <div class="card">
          <div class="card-title">Backup</div>
          <p style="font-size:.78rem;color:#9eb3cc;margin:0 0 10px">Downloads one file with all site data, settings and saved API keys. Keep it somewhere private.</p>
          <button class="btn btn-gold btn-sm" id="downloadBackupBtn">Download full backup</button>
          <div id="backupMsg" style="font-size:.72rem;color:#2bc48a;min-height:16px;margin-top:6px"></div>
        </div>

        <!-- DATA ENGINE -->
        <div class="card" id="dataEngineCard">
          <div class="card-title">Data engine</div>
          ${renderDataEngineRows(STATE.dataStatus)}
          <div id="dataMsg" style="font-size:.72rem;color:#2bc48a;min-height:16px;margin-top:6px"></div>
        </div>

        <!-- SEARCH ENGINES -->
        <div class="card">
          <div class="card-title">Search engines (Google, Bing)</div>
          <p style="font-size:.78rem;color:#9eb3cc;margin:0 0 10px">${s.searchVisible
            ? 'Visible: Google and Bing may list the site. Set your real domain in Site settings first.'
            : 'Hidden: the site is kept off Google and Bing until launch day.'}</p>
          <button class="btn btn-gold btn-sm" id="toggleSearchBtn">${s.searchVisible ? 'Hide from search engines' : 'Show to search engines (launch day)'}</button>
          <div id="searchMsg" style="font-size:.72rem;color:#2bc48a;min-height:16px;margin-top:6px"></div>
        </div>

        <!-- SITE SETTINGS -->
        <div class="card">
          <div class="card-title">Site settings</div>
          <div class="form-gap">
            ${[['Site name','siteName','Dr MoneyWise'],['Domain','siteDomain','drmoneywise.com'],['Support email','supportEmail','hello@drmoneywise.com'],['OpenAI model','openAiModel','gpt-4o'],['Claude model','claudeModel','claude-sonnet-4-5'],['Perplexity model','perplexityModel','sonar'],['Gemini model','geminiModel','gemini-3.5-flash-lite']].map(([l,k,ph]) => `
              <div>
                <label class="field" for="site_${k}">${h(l)}</label>
                <input class="input" type="text" id="site_${k}" placeholder="${h(ph)}" value="${h(s[k]||'')}"/>
              </div>`).join('')}
            <button class="btn btn-gold btn-sm" id="saveSiteBtn">Save settings</button>
            <div id="siteMsg" style="font-size:.72rem;color:#2bc48a;min-height:16px"></div>
          </div>
        </div>

        <!-- COUPONS -->
        <div class="card">
          <div class="card-title">Discount coupons</div>
          <div class="coupon-form">
            <div>
              <div class="field">Code</div>
              <input type="text" id="newCouponCode" placeholder="SAVE20"/>
            </div>
            <div>
              <div class="field">%</div>
              <input type="number" id="newCouponPct" placeholder="20" min="1" max="100"/>
            </div>
            <div>
              <div class="field">Applies to</div>
              <select id="newCouponScope">
                <option value="all">All plans</option>
                <option value="regular">Regular</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <button class="btn btn-gold btn-sm" id="addCouponBtn" style="align-self:end">+ Add</button>
          </div>
          <div id="couponMsg" style="font-size:.72rem;color:#f26a6a;min-height:16px;margin-bottom:8px"></div>
          <div id="couponList">
            ${coupons.map(c => `
              <div class="coupon-row">
                <span class="coupon-code">${h(c.code)}</span>
                <span style="font-size:.7rem;color:#9eb3cc">${c.discountPercent}% · ${h(c.planScope)}</span>
                <div style="display:flex;gap:5px;align-items:center">
                  <span class="tag ${c.active?'tag-published':'tag-draft'}">${c.active?'Active':'Off'}</span>
                  <button class="btn btn-sm btn-ghost" data-ctog="${h(c.id)}">${c.active?'Disable':'Enable'}</button>
                  <button class="btn btn-sm btn-rose"  data-cdel="${h(c.id)}">✕</button>
                </div>
              </div>`).join('') || '<p style="color:#9eb3cc;font-size:.78rem">No coupons yet.</p>'}
          </div>
        </div>

      </div>
    </div>
  `;
}

function renderDataEngineRows(status) {
  if (!status) return '<p style="font-size:.78rem;color:#9eb3cc">Status unavailable.</p>';
  const c = status.counts || {};
  const when = (iso) => (iso ? new Date(iso).toLocaleString() : 'never');
  const colour = (r) => (r === 'ok' ? '#2bc48a' : r === 'skipped' ? '#e8a33d' : r === 'failed' ? '#f26a6a' : '#9eb3cc');
  return `
    <p style="font-size:.78rem;color:#9eb3cc;margin:0 0 10px">Saved so far: ${c.companies || 0} of ${c.universe || 0} companies · ${c.economyFigures || 0} economy figures · ${c.prices || 0} prices. Runs automatically; use Run now to test.</p>
    ${(status.jobs || []).map((job) => `
      <div class="api-row" style="align-items:flex-start">
        <div class="api-dot" style="background:${colour(job.lastResult)};margin-top:5px"></div>
        <div class="api-label">${h(job.label)}
          <div class="api-hint">${job.running ? 'Running now…' : `Last run: ${h(when(job.lastRunAt))} — ${h(job.lastResult || 'not yet')}`}${job.lastMessage ? `<br/>${h(job.lastMessage)}` : ''}</div>
        </div>
        <div class="api-val" style="flex:0 0 auto"><button class="btn btn-ghost btn-sm" data-run-job="${h(job.name)}" ${job.running ? 'disabled' : ''}>Run now</button></div>
      </div>`).join('')}`;
}

async function load_settings() {
  setMain('<div class="loading">Loading settings…</div>');
  try {
    const [dashRes, coupRes, dataRes] = await Promise.all([ API.dashboard(), API.listCoupons(), API.dataStatus().catch(() => null) ]);
    STATE.dataStatus = dataRes;
    STATE.dashboard = dashRes;
    STATE.coupons   = coupRes.coupons || coupRes || [];
    setMain(render_settings());
    bind_settings();
  } catch (e) {
    setMain(`<div class="loading">Could not load settings: ${h(e.message)}</div>`);
  }
}

function bind_settings() {
  // Learn level names
  API.get('/api/admin/learn-levels').then((r) => {
    const b = qs('#lvlBeginner'); const m = qs('#lvlIntermediate');
    if (b) b.value = r.names?.beginner || ''; if (m) m.value = r.names?.intermediate || '';
  }).catch(() => {});
  qs('#saveLvlBtn')?.addEventListener('click', async () => {
    try {
      const r = await API.post('/api/admin/learn-levels', { beginner: qs('#lvlBeginner').value, intermediate: qs('#lvlIntermediate').value });
      qs('#lvlMsg').textContent = `Saved: ${r.names.beginner} and ${r.names.intermediate}`;
    } catch (e) { qs('#lvlMsg').textContent = e.message; }
  });

  // Data engine: Run now
  qs('#dataEngineCard')?.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-run-job]');
    if (!btn) return;
    const msg = qs('#dataMsg');
    btn.disabled = true;
    try {
      await API.dataRun(btn.dataset.runJob);
      if (msg) msg.textContent = 'Started. Company financials take 2–3 minutes; this box refreshes by itself.';
      const refresh = async (tries) => {
        STATE.dataStatus = await API.dataStatus().catch(() => STATE.dataStatus);
        const card = qs('#dataEngineCard');
        if (card) card.innerHTML = '<div class="card-title">Data engine</div>' + renderDataEngineRows(STATE.dataStatus) + '<div id="dataMsg" style="font-size:.72rem;color:#2bc48a;min-height:16px;margin-top:6px"></div>';
        if (tries > 0 && (STATE.dataStatus?.jobs || []).some((j) => j.running)) setTimeout(() => refresh(tries - 1), 5000);
      };
      setTimeout(() => refresh(60), 2000);
    } catch (e) { if (msg) msg.textContent = 'Failed: ' + e.message; btn.disabled = false; }
  });

  // Search engines on/off
  qs('#toggleSearchBtn')?.addEventListener('click', async () => {
    const msg = qs('#searchMsg');
    const next = !STATE.dashboard?.settings?.searchVisible;
    if (next && !confirm('Let Google and Bing list the site now? Only do this on launch day.')) return;
    try {
      await API.saveSettings({ searchVisible: next });
      showToast(next ? 'Search engines can now see the site' : 'Site hidden from search engines');
      await load_settings();
    } catch (e) { if (msg) msg.textContent = 'Failed: ' + e.message; }
  });

  // Download full backup
  qs('#downloadBackupBtn')?.addEventListener('click', async () => {
    const msg = qs('#backupMsg');
    try {
      if (msg) msg.textContent = 'Preparing backup…';
      const backup = await API.backup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      link.href = URL.createObjectURL(blob);
      link.download = `drmoneywise-backup-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 2000);
      if (msg) msg.textContent = '✓ Backup downloaded';
      showToast('Backup downloaded');
    } catch (e) { if (msg) msg.textContent = 'Failed: ' + e.message; }
  });

  // Save API keys
  qs('#saveApiKeysBtn')?.addEventListener('click', async () => {
    const msg = qs('#apiKeysMsg');
    try {
      const keys = ['perplexityKey','geminiKey','pexelsKey','gammaKey','claudeKey','openAiKey','marketauxKey','newsdataKey','marketstackKey','logoDevKey'];
      const body = Object.fromEntries(keys.map(k => [k, qs(`#key_${k}`)?.value?.trim() || '']));
      await API.saveSettings(body);
      if (msg) msg.textContent = '✓ API keys saved';
      showToast('API keys saved');
    } catch (e) { if (msg) msg.textContent = 'Failed: ' + e.message; }
  });

  // Save Stripe keys (blank fields are left unchanged)
  qs('#saveStripeBtn')?.addEventListener('click', async () => {
    const msg = qs('#stripeMsg');
    const stripeSecretKey = qs('#stripeSecretKey')?.value?.trim() || '';
    const stripeWebhookSecret = qs('#stripeWebhookSecret')?.value?.trim() || '';
    if (!stripeSecretKey && !stripeWebhookSecret) { if (msg) msg.textContent = 'Paste a key first.'; return; }
    if (stripeSecretKey && !/^sk_(test|live)_/.test(stripeSecretKey)) { if (msg) msg.textContent = 'The secret key should start with sk_test_ or sk_live_.'; return; }
    if (stripeWebhookSecret && !stripeWebhookSecret.startsWith('whsec_')) { if (msg) msg.textContent = 'The webhook secret should start with whsec_.'; return; }
    try {
      await API.saveSettings({ stripeSecretKey, stripeWebhookSecret });
      showToast('Payment keys saved');
      await load_settings();
    } catch (e) { if (msg) msg.textContent = 'Failed: ' + e.message; }
  });

  // Save site settings
  qs('#saveSiteBtn')?.addEventListener('click', async () => {
    const msg = qs('#siteMsg');
    try {
      const keys = ['siteName','siteDomain','supportEmail','openAiModel','claudeModel','perplexityModel','geminiModel'];
      const body = Object.fromEntries(keys.map(k => [k, qs(`#site_${k}`)?.value?.trim() || '']));
      await API.saveSettings(body);
      if (msg) msg.textContent = '✓ Settings saved';
      showToast('Site settings saved');
    } catch (e) { if (msg) msg.textContent = 'Failed: ' + e.message; }
  });

  // Add coupon
  qs('#addCouponBtn')?.addEventListener('click', async () => {
    const code  = qs('#newCouponCode')?.value?.trim().toUpperCase();
    const pct   = Number(qs('#newCouponPct')?.value);
    const scope = qs('#newCouponScope')?.value || 'all';
    const msg   = qs('#couponMsg');
    if (!code || !pct) { if (msg) msg.textContent = 'Enter a code and discount %'; return; }
    try {
      const created = await API.createCoupon({ code, discountPercent: pct, planScope: scope });
      STATE.coupons.push(created);
      showToast('Coupon created');
      setMain(render_settings()); bind_settings();
    } catch (e) { if (msg) msg.textContent = e.message; }
  });

  // Toggle coupon
  qsa('[data-ctog]').forEach(b => b.addEventListener('click', async () => {
    try {
      const updated = await API.toggleCoupon(b.dataset.ctog);
      const c = STATE.coupons.find(x => x.id === b.dataset.ctog);
      if (c && updated) c.active = updated.active;
      else if (c) c.active = !c.active;
      setMain(render_settings()); bind_settings();
    } catch (e) { showToast('Toggle failed: ' + e.message); }
  }));

  // Delete coupon
  qsa('[data-cdel]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this coupon?')) return;
    // Server has no delete endpoint for coupons — toggle off instead
    try {
      await API.toggleCoupon(b.dataset.cdel);
      STATE.coupons = STATE.coupons.filter(c => c.id !== b.dataset.cdel);
      showToast('Coupon removed');
      setMain(render_settings()); bind_settings();
    } catch (e) {
      STATE.coupons = STATE.coupons.filter(c => c.id !== b.dataset.cdel);
      setMain(render_settings()); bind_settings();
    }
  }));
}



// ════════════════════════════════════════════════════════════════════════════
// PAGE F: HEALTH
// ─────────────────
// To change this page ONLY: edit render_health() and bind_health()
// One list of checks (data, content, keys, site). Same list is emailed daily.
// ════════════════════════════════════════════════════════════════════════════

function render_health() {
  const r = STATE.health;
  if (!r) return '<div class="loading">Health report unavailable.</div>';
  const word = { ok: 'OK', warn: 'Check', fail: 'Problem' };
  const icon = { ok: '✓', warn: '!', fail: '✕' };
  const colour = { ok: '#2bc48a', warn: '#e8a33d', fail: '#f26a6a' };
  const areas = [...new Set(r.checks.map((c) => c.area))];
  return `
    <div class="pg-head">
      <div class="eyebrow" style="--ac:${colour[r.overall]}">Autopilot</div>
      <h1>Site health: <span style="color:${colour[r.overall]}">${icon[r.overall]} ${word[r.overall]}</span></h1>
      <p>${r.summary.ok} OK · ${r.summary.warn} to check · ${r.summary.fail} problems · checked ${h(new Date(r.checkedAt).toLocaleString())}. This page and the daily email show the same checks.</p>
    </div>
    <div class="settings-grid">
      <div style="display:flex;flex-direction:column;gap:14px">
        ${areas.map((area) => `
        <div class="card">
          <div class="card-title">${h(area)}</div>
          ${r.checks.filter((c) => c.area === area).map((c) => `
            <div class="api-row" style="align-items:flex-start">
              <div style="flex:0 0 74px;font-weight:700;color:${colour[c.status]};font-size:.8rem">${icon[c.status]} ${word[c.status]}</div>
              <div class="api-label">${h(c.label)}<div class="api-hint">${h(c.detail)}</div></div>
            </div>`).join('')}
        </div>`).join('')}
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="card">
          <div class="card-title">Daily health email</div>
          <p style="font-size:.78rem;color:#9eb3cc;margin:0 0 10px">Status: <strong style="color:${r.email.configured ? '#2bc48a' : '#e8a33d'}">${r.email.configured ? 'On — sent to ' + h(r.email.to) : 'Off'}</strong><br/>
            Uses Resend (resend.com, free). Sign up with the email you want the report at, create an API key (starts re_), paste it here.</p>
          <div class="form-gap">
            <div><label class="field" for="resendKey">Resend API key</label>
              <input class="input" type="password" id="resendKey" placeholder="${r.email.configured ? 'Saved — paste a new one to replace' : 're_…'}"/></div>
            <div><label class="field" for="healthEmailTo">Send the report to</label>
              <input class="input" type="email" id="healthEmailTo" value="${h(r.email.to)}" placeholder="you@example.com"/></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-gold btn-sm" id="saveHealthEmailBtn">Save</button>
              <button class="btn btn-ghost btn-sm" id="testHealthEmailBtn">Send a test email now</button>
            </div>
            <div id="healthMsg" style="font-size:.72rem;color:#2bc48a;min-height:16px"></div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Member emails (alerts and weekly email)</div>
          <p style="font-size:.78rem;color:#9eb3cc;margin:0 0 10px">Status: <strong style="color:${r.memberEmail?.ready ? '#2bc48a' : '#e8a33d'}">${r.memberEmail?.ready ? 'On' : 'Not ready'}</strong> — ${h(r.memberEmail?.note || '')}<br/>
            Uses the same Resend key. To email members, add your own domain in Resend (Domains → Add domain, then copy the DNS records it shows into your domain provider) and put an address on that domain below.</p>
          <div class="form-gap">
            <div><label class="field" for="alertsFrom">Send member emails from</label>
              <input class="input" id="alertsFrom" value="${h(r.memberEmail?.from || '')}" placeholder="Dr MoneyWise &lt;alerts@yourdomain.com&gt;"/></div>
            <div><label class="field" for="bizAddress">Business address (shown at the bottom of emails)</label>
              <input class="input" id="bizAddress" value="${h(r.memberEmail?.address || '')}" placeholder="Company name, street, city, country"/></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-gold btn-sm" id="saveAlertsBtn">Save</button>
              <button class="btn btn-ghost btn-sm" id="testWeeklyBtn">Send me a test weekly email</button>
            </div>
            <div id="alertsMsg" style="font-size:.72rem;color:#2bc48a;min-height:16px"></div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">What runs by itself</div>
          <p style="font-size:.78rem;color:#9eb3cc;margin:0">
            • Every 6 hours: homepage explainers are checked; every 2 days they change, and new ones are written from the day's news.<br/>
            • Every new explainer is checked for banned words (for example "AI", tool names, promises of returns) and missing parts. Anything that fails is kept as a draft in Inventory for you to read.<br/>
            • Daily: economy numbers, Top 10 lists, photos, and this health check (emailed).<br/>
            • Hourly: new company results and dividend announcements (SEC), then member alert emails.<br/>
            • Saturdays 07:00 Dubai time: the weekly members' email.<br/>
            • Weekly: company financials, property, commodities, bonds, ETF holdings.<br/>
            Run any job by hand in APIs &amp; More → Data engine.</p>
        </div>
        <button class="btn btn-ghost btn-sm" id="refreshHealthBtn">Refresh checks</button>
      </div>
    </div>`;
}

async function load_health() {
  setMain('<div class="loading">Running checks…</div>');
  try {
    STATE.health = await API.health();
    setMain(render_health());
    bind_health();
  } catch (e) {
    setMain(`<div class="loading">Could not run checks: ${h(e.message)}</div>`);
  }
}

function bind_health() {
  qs('#refreshHealthBtn')?.addEventListener('click', () => load_health());
  qs('#saveAlertsBtn')?.addEventListener('click', async () => {
    const msg = qs('#alertsMsg');
    const alertsEmailFrom = qs('#alertsFrom')?.value?.trim() || '';
    if (alertsEmailFrom && !/@[^@\s>]+\.[^@\s>]+/.test(alertsEmailFrom)) { if (msg) msg.textContent = 'Check the sending address.'; return; }
    try {
      await API.saveSettings({ alertsEmailFrom, businessAddress: qs('#bizAddress')?.value?.trim() || '' });
      showToast('Member email settings saved');
      await load_health();
    } catch (e) { if (msg) msg.textContent = 'Failed: ' + e.message; }
  });
  qs('#testWeeklyBtn')?.addEventListener('click', async () => {
    const msg = qs('#alertsMsg');
    try {
      if (msg) msg.textContent = 'Sending…';
      const res = await API.post('/api/admin/alerts/test-weekly', {});
      if (msg) msg.textContent = (res.ok ? '✓ ' : '') + res.message;
    } catch (e) { if (msg) msg.textContent = 'Failed: ' + e.message; }
  });
  qs('#saveHealthEmailBtn')?.addEventListener('click', async () => {
    const msg = qs('#healthMsg');
    const resendKey = qs('#resendKey')?.value?.trim() || '';
    const healthEmailTo = qs('#healthEmailTo')?.value?.trim() || '';
    if (resendKey && !resendKey.startsWith('re_')) { if (msg) msg.textContent = 'The Resend key should start with re_.'; return; }
    if (healthEmailTo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(healthEmailTo)) { if (msg) msg.textContent = 'Check the email address.'; return; }
    try {
      await API.saveSettings({ resendKey, healthEmailTo });
      showToast('Health email settings saved');
      await load_health();
    } catch (e) { if (msg) msg.textContent = 'Failed: ' + e.message; }
  });
  qs('#testHealthEmailBtn')?.addEventListener('click', async () => {
    const msg = qs('#healthMsg');
    try {
      if (msg) msg.textContent = 'Sending…';
      const res = await API.healthEmail();
      if (msg) msg.textContent = '✓ ' + res.message;
    } catch (e) { if (msg) { msg.style.color = '#f26a6a'; msg.textContent = e.message; } }
  });
}


// ════════════════════════════════════════════════════════════════════════════
// PAGE G: FORUM
// ─────────────────
// To change this page ONLY: edit render_forum() and bind_forum()
// Posts held by the moderators, reported posts, banned readers.
// ════════════════════════════════════════════════════════════════════════════

function render_forum() {
  const q = STATE.forum || { items: [], banned: [], stats: {} };
  const st = q.stats || {};
  return `
    <div class="pg-head">
      <div class="eyebrow" style="--ac:#3cb5c4">Community</div>
      <h1>Forum moderation</h1>
      <p>${st.threads || 0} questions · ${st.replies || 0} replies · <strong>${q.items.length}</strong> waiting for you. Clean posts appear by themselves; only doubtful or reported ones wait here. <a href="/forum" target="_blank" style="color:#3cb5c4">Open the forum ↗</a></p>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Forum on the site</div>
      <p style="font-size:.78rem;color:#9eb3cc;margin:0 0 10px">Status: <strong style="color:${STATE.forumEnabled ? '#2bc48a' : '#e8a33d'}">${STATE.forumEnabled ? 'ON — visible to readers, in the menu and on company pages' : 'OFF — hidden from readers (pages show "not found"). You can still prepare it here.'}</strong></p>
      <button class="btn btn-gold btn-sm" id="forumToggleBtn">${STATE.forumEnabled ? 'Switch the forum off' : 'Switch the forum on'}</button>
    </div>
    <div class="settings-grid">
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="card">
          <div class="card-title">Waiting for review</div>
          ${q.items.map((it) => `
            <div class="api-row" style="align-items:flex-start;flex-wrap:wrap">
              <div class="api-label" style="flex:1 1 100%">
                ${h(it.kind === 'thread' ? 'Question' : 'Reply')} by <strong>${h(it.authorName)}</strong> · ${h(new Date(it.at).toLocaleString())}
                ${it.reports ? ` · <span style="color:#f26a6a">${it.reports} report${it.reports === 1 ? '' : 's'}</span>` : ''}
                <div class="api-hint">On: ${h(it.title)}</div>
                <div class="api-hint" style="color:#e8a33d">${h(it.reason || '')}</div>
                <div style="white-space:pre-wrap;background:rgba(255,255,255,.04);border-radius:8px;padding:8px 10px;margin-top:6px;font-size:.8rem;color:#dbe6f3">${h(it.body)}</div>
              </div>
              <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
                <button class="btn btn-sm btn-green" data-fa="approve" data-id="${h(it.id)}">Approve</button>
                <button class="btn btn-sm btn-rose" data-fa="remove" data-id="${h(it.id)}">Remove</button>
                <button class="btn btn-sm btn-ghost" data-fa="ban" data-user="${h(it.authorId)}">Ban author</button>
                <a class="btn btn-sm btn-ghost" href="${h(it.url)}" target="_blank">View ↗</a>
              </div>
            </div>`).join('') || '<p style="color:#9eb3cc;font-size:.8rem">Nothing waiting. 🎉</p>'}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="card">
          <div class="card-title">Starter threads</div>
          <p style="font-size:.78rem;color:#9eb3cc;margin:0 0 10px">Adds 24 common questions with answers, 3 per topic, posted openly as "Dr MoneyWise Team". Safe to press twice (nothing is duplicated).</p>
          <button class="btn btn-gold btn-sm" id="forumStartersBtn">Add starter threads</button>
          <div id="forumMsg" style="font-size:.72rem;color:#2bc48a;min-height:16px;margin-top:6px"></div>
        </div>
        <div class="card">
          <div class="card-title">Banned readers</div>
          ${q.banned.map((b) => `<div class="api-row"><div class="api-label">${h(b.name)}<div class="api-hint">since ${h(new Date(b.at).toLocaleDateString())}</div></div><button class="btn btn-sm btn-ghost" data-fa="unban" data-user="${h(b.id)}">Lift ban</button></div>`).join('') || '<p style="color:#9eb3cc;font-size:.8rem">No one is banned.</p>'}
        </div>
        <div class="card">
          <div class="card-title">How moderation works</div>
          <p style="font-size:.78rem;color:#9eb3cc;margin:0">Every post is checked: first by fixed rules (links, contact details, shouting, promises of returns, posting too fast), then by the writing service. Clean posts show in seconds; doubtful ones wait here; clearly bad ones are refused with a reason. Two reader reports hide a post until you decide. On the forum itself, you also see Edit, Remove, Pin, Close and Ban on every post while signed in as admin.</p>
        </div>
      </div>
    </div>`;
}

async function load_forum() {
  setMain('<div class="loading">Loading forum…</div>');
  try {
    const [queue, dash] = await Promise.all([API.forumQueue(), API.dashboard()]);
    STATE.forum = queue;
    STATE.forumEnabled = Boolean(dash?.settings?.forumEnabled);
    setMain(render_forum());
    bind_forum();
  } catch (e) {
    setMain(`<div class="loading">Could not load the forum: ${h(e.message)}</div>`);
  }
}

function bind_forum() {
  qs('#forumToggleBtn')?.addEventListener('click', async () => {
    const next = !STATE.forumEnabled;
    if (next && !confirm('Open the forum to readers now?')) return;
    try {
      await API.saveSettings({ forumEnabled: next });
      showToast(next ? 'Forum is now ON' : 'Forum is now OFF');
      await load_forum();
    } catch (e) { showToast('Failed: ' + e.message); }
  });
  qsa('[data-fa]').forEach((b) => b.addEventListener('click', async () => {
    const action = b.dataset.fa;
    if ((action === 'remove' && !confirm('Remove this post?')) || (action === 'ban' && !confirm('Stop this reader from posting?'))) return;
    try {
      await API.forumAction({ action, postId: b.dataset.id, userId: b.dataset.user });
      showToast('Done');
      await load_forum();
    } catch (e) { showToast('Failed: ' + e.message); }
  }));
  qs('#forumStartersBtn')?.addEventListener('click', async () => {
    const msg = qs('#forumMsg');
    try {
      const res = await API.forumStarters();
      if (msg) msg.textContent = '✓ ' + res.message;
      await load_forum();
    } catch (e) { if (msg) msg.textContent = 'Failed: ' + e.message; }
  });
}


// ════════════════════════════════════════════════════════════════════════════
// PAGE H: PROPERTY
// ─────────────────
// What each property page has, "Refresh now", and the Dubai figures, which
// are typed in by hand from the Dubai Land Department's announcements.
// ════════════════════════════════════════════════════════════════════════════

function render_property() {
  const st = STATE.property || { places: [], dubai: [], failures: [] };
  const word = (p) => (p ? qWords(p) : '<span style="color:#e8a33d">—</span>');
  const year = new Date().getFullYear();
  const years = [year, year - 1, year - 2, year - 3];
  return `
    <div class="pg-head">
      <div class="eyebrow" style="--ac:#2bc48a">Property</div>
      <h1>Property pages</h1>
      <p>Home prices and rents for each place, refreshed weekly from official sources. Last refresh: <strong>${st.updatedAt ? h(new Date(st.updatedAt).toLocaleString()) : 'not yet'}</strong>. <a href="/property" target="_blank" style="color:#2bc48a">Open the pages ↗</a></p>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">What each place has (latest period)</div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.76rem">
        <thead><tr style="color:#9eb3cc;text-align:left"><th style="padding:6px">Place</th><th>House prices</th><th>Rents</th><th>Vs incomes</th><th>Extra</th></tr></thead>
        <tbody>${st.places.map((p) => `<tr style="border-top:1px solid rgba(255,255,255,.06)"><td style="padding:7px 6px"><a href="/property/${h(p.slug)}" target="_blank" style="color:#ecf3ff">${h(p.name)}</a></td>${p.manualRows !== null
          ? `<td colspan="4" style="color:#9eb3cc">Typed in by hand: ${p.manualRows} quarter(s) — see below</td>`
          : `<td>${word(p.prices)}</td><td>${p.rents ? word(p.rents) : '<span style="color:#9eb3cc">no free source</span>'}</td><td>${p.ratios ? word(p.ratios) : '<span style="color:#9eb3cc">—</span>'}</td><td>${p.ukPrice ? `£ prices ${word(p.ukPrice)}` : ''}</td>`}</tr>`).join('')}</tbody>
      </table></div>
      ${st.failures.length ? `<p style="font-size:.74rem;color:#e8a33d;margin:10px 0 0">Last refresh problems: ${st.failures.map((f) => `${h(f.source)} — ${h(f.reason)}`).join('; ')}</p>` : ''}
      <div style="margin-top:12px;display:flex;gap:8px;align-items:center"><button class="btn btn-gold btn-sm" id="propRefreshBtn">Refresh now</button><span id="propMsg" style="font-size:.72rem;color:#2bc48a"></span></div>
    </div>
    <div class="settings-grid">
      <div class="card">
        <div class="card-title">Add Dubai figures for a quarter</div>
        <p style="font-size:.74rem;color:#9eb3cc;margin:0 0 10px">Copy the totals from the Dubai Land Department's quarterly announcement or report, and paste the link where you found them. Saving the same quarter again replaces it.</p>
        <form id="dubaiForm" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <label><span class="field">Year</span><select name="year">${years.map((y) => `<option>${y}</option>`).join('')}</select></label>
          <label><span class="field">Quarter</span><select name="q"><option value="Q1">Jan–Mar (Q1)</option><option value="Q2">Apr–Jun (Q2)</option><option value="Q3">Jul–Sep (Q3)</option><option value="Q4">Oct–Dec (Q4)</option></select></label>
          <label><span class="field">Number of sales</span><input class="input" name="salesCount" inputmode="numeric" placeholder="e.g. 45000"></label>
          <label><span class="field">Total value (AED billion)</span><input class="input" name="salesValueBn" inputmode="decimal" placeholder="e.g. 142.5"></label>
          <label><span class="field">Average AED per sq ft (optional)</span><input class="input" name="pricePerSqft" inputmode="numeric"></label>
          <label><span class="field">Rents vs a year ago, % (optional)</span><input class="input" name="rentChangePct" inputmode="decimal" placeholder="e.g. 8.5"></label>
          <label style="grid-column:1/-1"><span class="field">Source name</span><input class="input" name="sourceName" placeholder="e.g. Dubai Land Department, Q2 2026 report"></label>
          <label style="grid-column:1/-1"><span class="field">Source link (https)</span><input class="input" name="sourceUrl" placeholder="https://dubailand.gov.ae/…"></label>
          <div style="grid-column:1/-1;display:flex;gap:8px;align-items:center"><button class="btn btn-gold btn-sm" type="submit">Save quarter</button><span id="dubaiMsg" style="font-size:.72rem"></span></div>
        </form>
      </div>
      <div class="card">
        <div class="card-title">Dubai quarters saved</div>
        ${st.dubai.length ? st.dubai.slice().reverse().map((r) => `<div class="api-row"><div class="api-label" style="flex:1">${h(qWords(r.period))}<div class="api-hint">${r.salesCount !== null ? `${fmtNum(r.salesCount)} sales` : ''}${r.salesValueBn !== null ? ` · AED ${h(r.salesValueBn)}bn` : ''}${r.pricePerSqft !== null ? ` · AED ${fmtNum(r.pricePerSqft)}/sq ft` : ''} · <a href="${h(r.sourceUrl)}" target="_blank" style="color:#3cb5c4">source</a></div></div><button class="btn btn-sm btn-rose" data-del-period="${h(r.period)}">Delete</button></div>`).join('') : '<p style="color:#9eb3cc;font-size:.78rem">None yet. The Dubai page shows "coming soon" until you add one.</p>'}
      </div>
    </div>`;
}

function qWords(p) {
  const q = { 1: 'Jan–Mar', 2: 'Apr–Jun', 3: 'Jul–Sep', 4: 'Oct–Dec' };
  if (/^\d{4}-Q[1-4]$/.test(p)) return `${q[p.slice(-1)]} ${p.slice(0, 4)}`;
  if (/^\d{4}-\d{2}$/.test(p)) return new Date(`${p}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return h(p || '');
}

async function load_property() {
  try {
    STATE.property = await API.propertyStatus();
    setMain(render_property());
    bind_property();
  } catch (e) {
    setMain(`<div class="loading">Could not load property status: ${h(e.message)}</div>`);
  }
}

function bind_property() {
  qs('#propRefreshBtn')?.addEventListener('click', async () => {
    const msg = qs('#propMsg');
    try {
      await API.dataRun('property');
      if (msg) msg.textContent = 'Started. Figures arrive in about a minute; press Refresh on this page after that.';
    } catch (e) { if (msg) msg.textContent = 'Failed: ' + e.message; }
  });
  qs('#dubaiForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const msg = qs('#dubaiMsg');
    const row = Object.fromEntries(new FormData(f).entries());
    row.period = `${row.year}-${row.q}`;
    try {
      STATE.property = await API.propertyManual({ place: 'dubai', row });
      showToast('Dubai figures saved');
      setMain(render_property());
      bind_property();
    } catch (err) { if (msg) { msg.textContent = err.message; msg.style.color = '#f26a6a'; } }
  });
  qsa('[data-del-period]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Delete this quarter?')) return;
    try {
      STATE.property = await API.propertyManual({ place: 'dubai', period: b.dataset.delPeriod, delete: true });
      setMain(render_property());
      bind_property();
    } catch (err) { showToast('Failed: ' + err.message); }
  }));
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE I: ADS & PARTNERS
// ─────────────────
// Spaces for banners, affiliate cards and a scrolling strip. All off until
// switched on here. Every ad is labelled on the site.
// ════════════════════════════════════════════════════════════════════════════

function render_ads() {
  const a = STATE.ads || { slots: [], settings: { slots: {} } };
  const set = a.settings || { slots: {} };
  const kindName = { banner: 'Image banner', text: 'Text card (good for partner links)', scroll: 'Scrolling links', code: 'Ad network code (e.g. Google AdSense)' };
  const slotCard = (slot) => {
    const s = set.slots?.[slot.id] || {};
    const kind = s.kind || slot.kinds[0];
    const items = (s.items || []).concat([{}, {}, {}]).slice(0, Math.max(3, (s.items || []).length + 1));
    return `
      <div class="card" data-slot="${h(slot.id)}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <div class="card-title" style="margin:0">${h(slot.label)}</div>
          <label style="font-size:.74rem;color:${s.enabled ? '#2bc48a' : '#9eb3cc'};display:flex;gap:6px;align-items:center"><input type="checkbox" name="enabled" ${s.enabled ? 'checked' : ''} style="width:auto"> ${s.enabled ? 'ON' : 'Off'}</label>
        </div>
        <p style="font-size:.72rem;color:#9eb3cc;margin:6px 0 10px">${h(slot.where)}. ${h(slot.size)}.</p>
        <label><span class="field">Kind</span><select name="kind">${slot.kinds.map((k) => `<option value="${k}"${k === kind ? ' selected' : ''}>${h(kindName[k])}</option>`).join('')}</select></label>
        <label style="display:flex;gap:6px;align-items:center;font-size:.74rem;color:#dbe6f3;margin:8px 0"><input type="checkbox" name="affiliate" ${s.affiliate ? 'checked' : ''} style="width:auto"> This is an affiliate / partner link (shows "Partner offer" and a commission note)</label>
        <div data-for="banner" ${kind === 'banner' ? '' : 'hidden'} style="display:grid;gap:8px">
          <label><span class="field">Image link (https)</span><input class="input" name="imageUrl" value="${h(s.imageUrl || '')}"></label>
          <label><span class="field">Click-through link (https)</span><input class="input" name="linkUrl" value="${h(s.linkUrl || '')}"></label>
          <label><span class="field">Image description (for screen readers)</span><input class="input" name="alt" value="${h(s.alt || '')}"></label>
        </div>
        <div data-for="text" ${kind === 'text' ? '' : 'hidden'} style="display:grid;gap:8px">
          <label><span class="field">Title</span><input class="input" name="title" maxlength="80" value="${h(s.title || '')}"></label>
          <label><span class="field">One line of text</span><input class="input" name="body" maxlength="200" value="${h(s.body || '')}"></label>
          <label><span class="field">Button words</span><input class="input" name="button" maxlength="30" value="${h(s.button || '')}" placeholder="Find out more"></label>
          <label><span class="field">Link (https)</span><input class="input" name="linkUrl" value="${h(s.linkUrl || '')}"></label>
        </div>
        <div data-for="scroll" ${kind === 'scroll' ? '' : 'hidden'} style="display:grid;gap:6px">
          ${items.map((it, i) => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px"><input class="input" data-item-text="${i}" placeholder="Link words" value="${h(it.text || '')}"><input class="input" data-item-link="${i}" placeholder="https://…" value="${h(it.linkUrl || '')}"></div>`).join('')}
          <span class="api-hint">Up to 8 links. Save to get another empty row.</span>
        </div>
        <div data-for="code" ${kind === 'code' ? '' : 'hidden'}>
          <label><span class="field">Paste the code exactly as the ad network gives it</span><textarea name="code" rows="5">${h(s.code || '')}</textarea></label>
        </div>
      </div>`;
  };
  return `
    <div class="pg-head">
      <div class="eyebrow" style="--ac:#e8a33d">Earnings</div>
      <h1>Ads &amp; partners</h1>
      <p>Spaces for adverts and affiliate links. Everything is off until you switch it on. Every ad is labelled "Advertisement" or "Partner offer" on the site.</p>
    </div>
    <div class="card" style="margin-bottom:14px">
      <label style="display:flex;gap:8px;align-items:center;font-size:.8rem;color:#dbe6f3"><input type="checkbox" id="adsHideMembers" ${set.hideForMembers !== false ? 'checked' : ''} style="width:auto"> Hide all ads from Premium members (a Premium benefit)</label>
      <p style="font-size:.72rem;color:#e8a33d;margin:8px 0 0">Before switching on an ad network such as Google AdSense: those networks use cookies, so readers in the UK and Europe must be asked first (a cookie banner), which can be added when you are ready. Your own banners and partner links need no banner.</p>
    </div>
    <div class="card-grid two-col">${(a.slots || []).map(slotCard).join('')}</div>
    <div style="margin-top:14px;display:flex;gap:10px;align-items:center"><button class="btn btn-gold" id="adsSaveBtn">Save ads &amp; partners</button><span id="adsMsg" style="font-size:.74rem"></span></div>`;
}

async function load_ads() {
  try {
    STATE.ads = await API.adsGet();
    setMain(render_ads());
    bind_ads();
  } catch (e) {
    setMain(`<div class="loading">Could not load ads: ${h(e.message)}</div>`);
  }
}

function bind_ads() {
  qsa('[data-slot] select[name=kind]').forEach((sel) => sel.addEventListener('change', () => {
    const card = sel.closest('[data-slot]');
    card.querySelectorAll('[data-for]').forEach((box) => { box.hidden = box.dataset.for !== sel.value; });
  }));
  qs('#adsSaveBtn')?.addEventListener('click', async () => {
    const msg = qs('#adsMsg');
    const slots = {};
    qsa('[data-slot]').forEach((card) => {
      const kind = card.querySelector('select[name=kind]').value;
      const box = card.querySelector(`[data-for="${kind}"]`);
      const val = (name) => (box?.querySelector(`[name=${name}]`)?.value || '').trim();
      slots[card.dataset.slot] = {
        enabled: card.querySelector('input[name=enabled]').checked,
        affiliate: card.querySelector('input[name=affiliate]').checked,
        kind,
        imageUrl: val('imageUrl'), linkUrl: val('linkUrl'), alt: val('alt'),
        title: val('title'), body: val('body'), button: val('button'), code: box?.querySelector('[name=code]')?.value || '',
        items: [...card.querySelectorAll('[data-item-text]')].map((inp) => ({ text: inp.value.trim(), linkUrl: (card.querySelector(`[data-item-link="${inp.dataset.itemText}"]`)?.value || '').trim() })),
      };
    });
    try {
      STATE.ads = await API.adsSave({ hideForMembers: qs('#adsHideMembers').checked, slots });
      showToast('Ads & partners saved');
      setMain(render_ads());
      bind_ads();
    } catch (e) { if (msg) { msg.textContent = e.message; msg.style.color = '#f26a6a'; } }
  });
}


// ════════════════════════════════════════════════════════════════════════════
// PAGE J: ASK DR MONEYWISE
// ─────────────────
// Members' questions. "Write a first draft" fills the box with a draft to
// check and edit; "Send answer" saves it and emails the member. Answers are
// shown on /ask (without names) only if the member agreed and you tick
// "Show on the Ask page".
// ════════════════════════════════════════════════════════════════════════════

function render_ask() {
  const a = STATE.ask || { questions: [], waiting: 0, topics: [] };
  const topic = Object.fromEntries(a.topics || []);
  const badge = { waiting: ['Waiting', '#e8a33d'], answered: ['Answered', '#2bc48a'], declined: ['Declined', '#9eb3cc'] };
  const card = (q) => {
    const b = badge[q.status] || badge.waiting;
    return `
      <div class="card" data-q="${h(q.id)}">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
          <span style="font-size:.72rem;font-weight:700;color:${b[1]}">${b[0]} · ${h(topic[q.topic] || q.topic)}</span>
          <span style="font-size:.7rem;color:#9eb3cc">${h(q.name || 'Member')} (${h(q.plan)}) · ${h(new Date(q.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</span>
        </div>
        <p style="font-size:.9rem;color:#fff;margin:10px 0">${h(q.question)}</p>
        <label><span class="field">Answer (general information, not personal advice)</span><textarea name="answer" rows="8">${h(q.answer || q.draft || '')}</textarea></label>
        <label style="display:flex;gap:6px;align-items:center;font-size:.74rem;color:${q.publishOk ? '#dbe6f3' : '#9eb3cc'};margin:8px 0"><input type="checkbox" name="publish" ${q.published || (q.status === 'waiting' && q.publishOk) ? 'checked' : ''} ${q.publishOk ? '' : 'disabled'} style="width:auto"> Show on the Ask page without their name ${q.publishOk ? '' : '(the member said no)'}</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <button class="btn" data-act="draft">Write a first draft</button>
          <button class="btn btn-gold" data-act="send">${q.status === 'answered' ? 'Save changes' : 'Send answer'}</button>
          ${q.status === 'waiting' ? '<button class="btn" data-act="decline">Decline</button>' : ''}
          <span class="ask-msg" style="font-size:.74rem"></span>
        </div>
      </div>`;
  };
  return `
    <div class="pg-head">
      <div class="eyebrow" style="--ac:#3cb5c4">Members</div>
      <h1>Ask Dr MoneyWise</h1>
      <p>${a.waiting} question${a.waiting === 1 ? '' : 's'} waiting. "Write a first draft" gives you a starting point: always read and correct it before sending. The member is emailed when you send an answer.</p>
    </div>
    ${a.questions.length ? `<div class="card-grid two-col">${a.questions.map(card).join('')}</div>` : '<div class="card"><p style="color:#9eb3cc">No questions yet. Members ask them at /ask.</p></div>'}`;
}

async function load_ask() {
  try {
    STATE.ask = await API.askGet();
    setMain(render_ask());
    bind_ask();
  } catch (e) {
    setMain(`<div class="loading">Could not load questions: ${h(e.message)}</div>`);
  }
}

function bind_ask() {
  qsa('[data-q] [data-act]').forEach((btn) => btn.addEventListener('click', async () => {
    const card = btn.closest('[data-q]');
    const id = card.dataset.q;
    const msg = card.querySelector('.ask-msg');
    const say = (t, bad) => { msg.textContent = t; msg.style.color = bad ? '#f26a6a' : '#2bc48a'; };
    btn.disabled = true;
    try {
      if (btn.dataset.act === 'draft') {
        say('Writing a draft…');
        const r = await API.askDraft(id);
        card.querySelector('textarea[name=answer]').value = r.draft;
        say('Draft ready. Please read and correct it before sending.');
      } else {
        const r = await API.askAnswer({ id, answer: card.querySelector('textarea[name=answer]').value, publish: card.querySelector('input[name=publish]').checked, decline: btn.dataset.act === 'decline' });
        showToast(r.status === 'declined' ? 'Question declined' : r.emailed && !r.emailed.ok ? `Saved, but the email failed: ${r.emailed.message}` : 'Answer saved');
        await load_ask();
        return;
      }
    } catch (e) { say(e.message, true); }
    btn.disabled = false;
  }));
}


// ════════════════════════════════════════════════════════════════════════════
// PAGE K: NEWSLETTER
// ─────────────────
// Write a newsletter, preview it, send yourself a test, then send it to an
// audience. Big sends are spread over days by the daily limit and carry on
// by themselves every hour. Members can switch it off; subscribers confirm
// their address first (double opt-in).
// ════════════════════════════════════════════════════════════════════════════

const NL_BLANK = () => ({ id: '', premiumSection: true, subject: '', preheader: '', intro: '', closing: 'Have a good week,\nThe Dr MoneyWise team', audience: 'everyone', items: [{ heading: '', text: '', url: '', button: '' }] });

function render_newsletter() {
  const d = STATE.nl || { stats: { counts: {}, subscribers: {} }, issues: [], audiences: {} };
  const st = d.stats; const ed = STATE.nlEdit || NL_BLANK();
  const tile = (n, label, c) => `<div class="card" style="border-left:4px solid ${c};padding:12px 14px"><div style="font-size:1.5rem;font-weight:700;color:#fff">${fmtNum(n)}</div><div style="font-size:.72rem;color:#9eb3cc">${label}</div></div>`;
  const statusBadge = { draft: ['Draft', '#9eb3cc'], sending: ['Sending', '#e8a33d'], sent: ['Sent', '#2bc48a'], stopped: ['Stopped', '#f26a6a'] };
  const itemRow = (x, i) => `
      <div class="card nl-item" data-i="${i}" style="background:rgba(255,255,255,.03);margin:0 0 10px">
        <div style="display:flex;justify-content:space-between;align-items:center"><strong style="font-size:.78rem;color:#c9a227">Story ${i + 1}</strong><button class="btn" data-nl="remove" data-i="${i}" style="padding:4px 10px">Remove</button></div>
        <label style="display:block;margin:8px 0"><span class="field">Heading</span><input class="input" name="heading" value="${h(x.heading)}" maxlength="160"></label>
        <label style="display:block;margin:8px 0"><span class="field">Text (a blank line starts a new paragraph)</span><textarea name="text" rows="4" maxlength="2000">${h(x.text)}</textarea></label>
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px">
          <label style="display:block;margin:8px 0"><span class="field">Link (optional)</span><input class="input" name="url" value="${h(x.url)}" placeholder="https://drmoneywise.com/learn/..."></label>
          <label style="display:block;margin:8px 0"><span class="field">Button words</span><input class="input" name="button" value="${h(x.button)}" maxlength="40" placeholder="Read more"></label>
        </div>
      </div>`;
  const locked = ed.status && ed.status !== 'draft';
  return `
    <div class="pg-head">
      <div class="eyebrow" style="--ac:#c9a227">Members</div>
      <h1>Newsletter</h1>
      <p>Write it, preview it, send yourself a test, then send. Each email has its own one-click unsubscribe link. ${st.emailReady ? '' : '<strong style="color:#f26a6a">Sending is off until the Resend key and your own "from" address (ALERTS_EMAIL_FROM) are saved.</strong>'}</p>
    </div>
    <div class="card-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px">
      ${tile(st.counts.everyone || 0, 'Would get it (everyone)', '#c9a227')}
      ${tile(st.counts.members || 0, 'Members with it switched on', '#2a78d6')}
      ${tile(st.subscribers.active || 0, 'Confirmed subscribers', '#2bc48a')}
      ${tile(st.subscribers.pending || 0, 'Waiting to confirm', '#e8a33d')}
      ${tile((st.subscribers.unsubscribed || 0) + (st.membersOptedOut || 0), 'Unsubscribed', '#f26a6a')}
      ${tile(st.sentToday || 0, `Sent today (limit ${fmtNum(st.dailyLimit)})`, '#3cb5c4')}
    </div>
    <div class="card-grid two-col">
      <div class="card" id="nlEditor">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
          <h2 style="margin:0">${ed.id ? (locked ? 'Sent newsletter (read only)' : 'Edit draft') : 'New newsletter'}</h2>
          <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" data-nl="new">Start a blank one</button><button class="btn" data-nl="fill">Fill from this week on the site</button></div>
        </div>
        <label style="display:block;margin:8px 0"><span class="field">Subject line</span><input class="input" name="subject" value="${h(ed.subject)}" maxlength="140" placeholder="Your week in money: 7 November"></label>
        <label style="display:block;margin:8px 0"><span class="field">Preview text (shown after the subject in most inboxes)</span><input class="input" name="preheader" value="${h(ed.preheader)}" maxlength="160"></label>
        <label style="display:block;margin:8px 0"><span class="field">Opening words</span><textarea name="intro" rows="4" maxlength="4000">${h(ed.intro)}</textarea></label>
        <div id="nlItems">${(ed.items || []).map(itemRow).join('')}</div>
        <button class="btn" data-nl="add">+ Add a story</button>
        <label style="margin-top:10px"><span class="field">Closing words</span><textarea name="closing" rows="3" maxlength="2000">${h(ed.closing)}</textarea></label>
        <label style="display:flex;gap:8px;align-items:flex-start;margin:10px 0;font-size:.78rem;color:#dbe6f3"><input type="checkbox" name="premiumSection" ${ed.premiumSection !== false ? 'checked' : ''} style="width:auto;margin-top:2px"> <span>Add each Premium member's own section: their portfolio's week, their companies' news, results expected in the coming week and Premium extras</span></label>
        <label style="display:block;margin:8px 0"><span class="field">Send to</span><select name="audience">${Object.entries(d.audiences).map(([k, v]) => `<option value="${k}" ${ed.audience === k ? 'selected' : ''}>${h(v)} — ${fmtNum(st.counts[k] || 0)} people</option>`).join('')}</select></label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px">
          ${locked ? '' : `<button class="btn" data-nl="save">Save draft</button>
          <button class="btn" data-nl="preview">Preview</button>
          <button class="btn" data-nl="test">Send me a test</button>
          <button class="btn" data-nl="testp">Send me a test (Premium version)</button>
          <button class="btn btn-gold" data-nl="send">Send to everyone chosen</button>`}
          <span id="nlMsg" style="font-size:.76rem"></span>
        </div>
        <p style="font-size:.7rem;color:#9eb3cc;margin-top:10px">Tip: keep each story short with one link. The footer (education-only note, unsubscribe link and your business address) is added for you.</p>
      </div>
      <div>
        <div class="card"><h2 style="margin-top:0">Preview</h2><iframe id="nlPreview" title="Newsletter preview" style="width:100%;height:520px;border:0;border-radius:10px;background:#f1e8d6"></iframe></div>
        <div class="card"><h2 style="margin-top:0">Add people by hand</h2>
          <p style="font-size:.76rem;color:#9eb3cc">Type or paste email addresses (up to 50, separated by commas, spaces or new lines).</p>
          <textarea class="input" id="nlPeople" rows="4" placeholder="friend@example.com, colleague@example.com"></textarea>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
            <button class="btn btn-gold" data-nl="once">Send the newsletter on the left once</button>
            <button class="btn" data-nl="invite">Invite to subscribe (they confirm)</button>
            <button class="btn" data-nl="gift">Gift subscription (added now)</button>
          </div>
          <div id="nlPeopleMsg" style="font-size:.74rem;margin-top:8px"></div>
          <p style="font-size:.7rem;color:#9eb3cc;margin-top:8px"><b>Once:</b> they get this one email only and aren't added to the list. <b>Invite:</b> they get a "please confirm" email and join only if they click it. <b>Gift:</b> they're added straight away and get a short email saying someone gave them the newsletter, with an unsubscribe link. Only gift it to people you know would welcome it.</p>
        </div>
        <div class="card"><h2 style="margin-top:0">Sending speed</h2>
          <p style="font-size:.76rem;color:#9eb3cc">Resend's free plan allows about 100 emails a day in total, and member alerts use some of those. A bigger list carries on automatically the next day. If you move to a paid Resend plan, raise this number.</p>
          <div style="display:flex;gap:8px;align-items:end"><label style="flex:1"><span class="field">Newsletter emails per day</span><input class="input" type="number" name="nlLimit" min="1" value="${st.dailyLimit}"></label><button class="btn" data-nl="limit">Save</button></div>
        </div>
        <div class="card"><h2 style="margin-top:0">Past and current newsletters</h2>
          ${d.issues.length ? d.issues.map((x) => { const b = statusBadge[x.status] || statusBadge.draft; const pct = x.total ? Math.round(((x.sent || 0) / x.total) * 100) : 0; return `
          <div style="border-top:1px solid rgba(255,255,255,.08);padding:10px 0">
            <div style="display:flex;justify-content:space-between;gap:8px"><strong style="color:#fff;font-size:.84rem">${h(x.subject || '(no subject)')}</strong><span style="color:${b[1]};font-size:.72rem;font-weight:700">${b[0]}</span></div>
            <div style="font-size:.7rem;color:#9eb3cc">${h(d.audiences[x.audience] || '')} · ${fmtDate(x.sentAt || x.startedAt || x.updatedAt || x.createdAt)}</div>
            ${x.status !== 'draft' ? `<div style="height:8px;background:rgba(255,255,255,.08);border-radius:6px;margin:6px 0"><div style="height:8px;width:${pct}%;background:${b[1]};border-radius:6px"></div></div><div style="font-size:.7rem;color:#dbe6f3">${fmtNum(x.sent || 0)} of ${fmtNum(x.total || 0)} sent${x.failed ? `, ${fmtNum(x.failed)} failed` : ''}${x.lastError ? ` · <span style="color:#f26a6a">${h(x.lastError)}</span>` : ''}</div>` : ''}
            <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
              <button class="btn" data-nl="open" data-id="${h(x.id)}" style="padding:4px 10px">${x.status === 'draft' ? 'Edit' : 'View'}</button>
              ${x.status === 'draft' ? `<button class="btn" data-nl="delete" data-id="${h(x.id)}" style="padding:4px 10px">Delete</button>` : ''}
              ${x.status === 'sending' ? `<button class="btn" data-nl="continue" style="padding:4px 10px">Send next batch now</button><button class="btn" data-nl="stop" data-id="${h(x.id)}" style="padding:4px 10px">Stop</button>` : ''}
              ${x.status === 'sent' ? `<a class="btn" href="/newsletter/${h(x.id)}" target="_blank" rel="noopener" style="padding:4px 10px">Web page</a>` : ''}
            </div>
          </div>`; }).join('') : '<p style="color:#9eb3cc;font-size:.8rem">None yet.</p>'}
          <p style="margin-top:10px"><button class="btn" data-nl="csv">Download subscriber list (CSV)</button></p>
        </div>
      </div>
    </div>`;
}

async function load_newsletter() {
  try {
    STATE.nl = await API.nlGet();
    setMain(render_newsletter());
    bind_newsletter();
  } catch (e) {
    setMain(`<div class="loading">Could not load the newsletter page: ${h(e.message)}</div>`);
  }
}

function nlRead() {
  const ed = qs('#nlEditor');
  const v = (n) => (ed.querySelector(`[name=${n}]`) || {}).value || '';
  return {
    ...(STATE.nlEdit || {}),
    premiumSection: Boolean(ed.querySelector('[name=premiumSection]')?.checked),
    subject: v('subject'), preheader: v('preheader'), intro: v('intro'), closing: v('closing'), audience: v('audience') || 'everyone',
    items: qsa('#nlItems .nl-item').map((el) => ({ heading: el.querySelector('[name=heading]').value, text: el.querySelector('[name=text]').value, url: el.querySelector('[name=url]').value, button: el.querySelector('[name=button]').value })),
  };
}

async function nlPreview() {
  const frame = qs('#nlPreview');
  if (!frame) return;
  try { const r = await API.nlPost('preview', nlRead()); frame.srcdoc = r.html; } catch (e) { /* preview only */ }
}

function bind_newsletter() {
  const msg = qs('#nlMsg');
  const say = (t, bad) => { if (msg) { msg.textContent = t; msg.style.color = bad ? '#f26a6a' : '#2bc48a'; } };
  const redraw = async (keepEdit) => { if (keepEdit) STATE.nlEdit = keepEdit; STATE.nl = await API.nlGet(); setMain(render_newsletter()); bind_newsletter(); };
  const saveDraft = async () => { const r = await API.nlPost('save', nlRead()); STATE.nlEdit = r.issue; return r.issue; };
  qsa('#nlEditor input, #nlEditor textarea, #nlEditor select').forEach((el) => el.addEventListener('change', nlPreview));
  qsa('[data-nl]').forEach((btn) => btn.addEventListener('click', async () => {
    const act = btn.dataset.nl;
    btn.disabled = true;
    try {
      if (act === 'new') { STATE.nlEdit = NL_BLANK(); setMain(render_newsletter()); bind_newsletter(); return; }
      if (act === 'add' || act === 'remove') {
        const cur = nlRead();
        if (act === 'add') cur.items.push({ heading: '', text: '', url: '', button: '' }); else cur.items.splice(Number(btn.dataset.i), 1);
        STATE.nlEdit = cur; setMain(render_newsletter()); bind_newsletter(); return;
      }
      if (act === 'fill') {
        say('Gathering this week’s explainers and results…');
        const r = await API.nlPost('draft-from-site');
        STATE.nlEdit = { ...r.draft, id: (STATE.nlEdit || {}).status === 'draft' ? STATE.nlEdit.id : '' };
        setMain(render_newsletter()); bind_newsletter();
        qs('#nlMsg').textContent = 'Filled from the site. Please read it through and edit before sending.'; return;
      }
      if (act === 'save') { await saveDraft(); await redraw(); qs('#nlMsg').textContent = 'Draft saved.'; return; }
      if (act === 'preview') { await nlPreview(); say('Preview updated.'); }
      if (act === 'testp') { const issue = await saveDraft(); const r = await API.nlPost('test', { id: issue.id, premium: true }); say(r.ok ? 'Premium test sent to your admin email.' : `Test failed: ${r.message}`, !r.ok); }
      if (act === 'test') { const issue = await saveDraft(); const r = await API.nlPost('test', { id: issue.id }); say(r.ok ? 'Test sent to your admin email.' : `Test failed: ${r.message}`, !r.ok); }
      if (act === 'send') {
        const cur = nlRead();
        const count = (STATE.nl.stats.counts || {})[cur.audience] || 0;
        if (!cur.subject.trim()) { say('Add a subject line first.', true); btn.disabled = false; return; }
        if (!window.confirm(`Send "${cur.subject}" to ${count} people? This can’t be undone.`)) { btn.disabled = false; return; }
        const issue = await saveDraft();
        const r = await API.nlPost('send', { id: issue.id });
        showToast(r.done ? `Sent to ${r.sent} people` : r.message || 'Sending started');
        STATE.nlEdit = NL_BLANK(); await redraw(); return;
      }
      if (act === 'open') { const it = STATE.nl.issues.find((x) => x.id === btn.dataset.id); STATE.nlEdit = { ...it }; setMain(render_newsletter()); bind_newsletter(); nlPreview(); return; }
      if (act === 'delete') { if (!window.confirm('Delete this draft?')) { btn.disabled = false; return; } await API.nlPost('delete', { id: btn.dataset.id }); if ((STATE.nlEdit || {}).id === btn.dataset.id) STATE.nlEdit = NL_BLANK(); await redraw(); return; }
      if (act === 'continue') { const r = await API.nlPost('continue'); showToast(r.message); await redraw(); return; }
      if (act === 'stop') { if (!window.confirm('Stop sending? People who already got it keep it.')) { btn.disabled = false; return; } await API.nlPost('stop', { id: btn.dataset.id }); await redraw(); return; }
      if (act === 'once' || act === 'invite' || act === 'gift') {
        const pm = qs('#nlPeopleMsg'); const emails = qs('#nlPeople').value;
        const show = (t, bad) => { pm.textContent = t; pm.style.color = bad ? '#f26a6a' : '#2bc48a'; };
        if (!emails.trim()) { show('Add at least one email address.', true); btn.disabled = false; return; }
        show('Working…');
        let r; let text;
        if (act === 'once') {
          const cur = nlRead();
          const id = cur.status && cur.status !== 'draft' ? cur.id : (await saveDraft()).id;
          r = await API.nlPost('send-once', { id, emails });
          text = `Sent to ${r.sent}.`;
        } else {
          r = await API.nlPost('add-people', { emails, mode: act });
          text = act === 'gift' ? `${r.added} added and told about their gift.` : `${r.invited} invited to confirm.`;
          if (r.already) text += ` ${r.already} already on the list.`;
          if (r.members) text += ` ${r.members} already members (they get it through their membership).`;
        }
        if (r.failed?.length) text += ` Failed: ${r.failed.join('; ')}.`;
        if (r.skipped?.length) text += ` Not valid, skipped: ${r.skipped.join(', ')}.`;
        show(text, Boolean(r.failed?.length));
        if (!r.failed?.length) qs('#nlPeople').value = '';
        if (act !== 'once') { STATE.nl = await API.nlGet(); }
        btn.disabled = false; return;
      }
      if (act === 'limit') { const r = await API.nlPost('limit', { limit: qs('[name=nlLimit]').value }); showToast(`Daily limit set to ${r.dailyLimit}`); await redraw(nlRead()); return; }
      if (act === 'csv') {
        const res = await fetch('/api/admin/newsletter/subscribers.csv', { headers: { 'x-session-token': STATE.token } });
        const blob = await res.blob();
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'newsletter-subscribers.csv'; a.click();
      }
    } catch (e) { say(e.message, true); }
    btn.disabled = false;
  }));
  nlPreview();
}


// ════════════════════════════════════════════════════════════════════════════
// PAGE L: SOCIAL STUDIO
// ─────────────────
// Paste a link to a page on the site (explainer, company, results, Shariah
// list, report…) or to a picture, choose sizes, and get JPEG pictures with
// our name, the page address, website and email, plus a caption to copy.
// ════════════════════════════════════════════════════════════════════════════

const SOCIAL_SIZES = [['square', 'Square 1080×1080', 'Instagram, Facebook, LinkedIn'], ['portrait', 'Portrait 1080×1350', 'Instagram and Facebook feed'], ['story', 'Story 1080×1920', 'Stories, Reels, Shorts covers'], ['landscape', 'Landscape 1200×675', 'X, LinkedIn, YouTube community']];

function render_social() {
  const st = STATE.social || {};
  const res = st.result;
  return `
    <div class="pg-head">
      <div class="eyebrow" style="--ac:#e87ba4">Marketing</div>
      <h1>Social studio</h1>
      <p>Paste a link to any page on the site, or a direct link to a picture, and get ready-to-post JPEG pictures with our name, website and email.</p>
    </div>
    <div class="card-grid two-col">
      <div class="card" id="soForm">
        <label style="display:block;margin:0 0 10px"><span class="field">Link</span><input class="input" name="url" value="${h(st.url || '')}" placeholder="https://drmoneywise.com/learn/... or /stock/KO or /results or a picture link"></label>
        <span class="field">Sizes</span>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:4px 0 10px">${SOCIAL_SIZES.map(([k, l, d]) => `<label style="display:flex;gap:8px;align-items:flex-start;font-size:.76rem;color:#dbe6f3;background:rgba(255,255,255,.04);border-radius:10px;padding:8px"><input type="checkbox" name="size" value="${k}" ${(st.sizes || ['square', 'story']).includes(k) ? 'checked' : ''} style="width:auto;margin-top:2px"><span><b>${l}</b><br><span style="color:#9eb3cc">${d}</span></span></label>`).join('')}</div>
        <label style="display:block;margin:0 0 10px"><span class="field">Look</span><select name="style"><option value="auto" ${st.style !== 'brand' ? 'selected' : ''}>With a photo when the page has one (Pexels)</option><option value="brand" ${st.style === 'brand' ? 'selected' : ''}>Plain navy and gold</option></select></label>
        <label style="display:block;margin:0 0 10px"><span class="field">Headline (optional: replaces the page’s own)</span><input class="input" name="title" value="${h(st.title || '')}" maxlength="200"></label>
        <label style="display:block;margin:0 0 10px"><span class="field">Short text (optional)</span><textarea name="sub" rows="2" maxlength="400">${h(st.sub || '')}</textarea></label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-gold" data-so="make">Make pictures</button>
          <button class="btn" data-so="gamma" title="Explainers only; takes 1–3 minutes">Make a Gamma infographic</button>
          <span id="soMsg" style="font-size:.76rem"></span>
        </div>
        <p style="font-size:.7rem;color:#9eb3cc;margin-top:10px">Works with: explainers (/learn/…), companies (/stock/…), results (/results or a result’s link), Shariah pages, research reports and any other page (uses its title and description). For picture links, only use pictures you’re allowed to post: your own, or free ones such as Pexels.</p>
      </div>
      <div class="card">
        <h2 style="margin-top:0">Caption</h2>
        <textarea id="soCaption" rows="12" placeholder="The caption appears here">${h(res?.caption || '')}</textarea>
        <p style="margin-top:8px"><button class="btn" data-so="copy">Copy caption</button></p>
      </div>
    </div>
    <div class="card"><h2 style="margin-top:0">Pictures</h2><div id="soPics" style="display:flex;flex-wrap:wrap;gap:14px">${res ? '' : '<p style="color:#9eb3cc;font-size:.8rem">Your pictures will appear here.</p>'}</div></div>
    <div class="card"><h2 style="margin-top:0">Gamma themes</h2>
      <p style="font-size:.76rem;color:#9eb3cc">Choose the look Gamma uses for infographics. “Make 2 samples” creates two example pictures in that theme (it uses one Gamma generation, so a little of your Gamma credit), and they are kept here so you only make them once.</p>
      <div id="soThemes" style="display:flex;flex-wrap:wrap;gap:12px"><span style="color:#9eb3cc;font-size:.8rem">Loading themes…</span></div>
    </div>
    <div class="card"><h2 style="margin-top:0">Made in the last 30 days</h2><div id="soRecent" style="display:flex;flex-wrap:wrap;gap:8px"><span style="color:#9eb3cc;font-size:.8rem">Loading…</span></div></div>`;
}

async function soBlob(file) {
  const r = await fetch('/api/admin/social/file/' + encodeURIComponent(file), { headers: { 'x-session-token': STATE.token } });
  if (!r.ok) throw new Error('Picture not available');
  return URL.createObjectURL(await r.blob());
}
async function soShow(items) {
  const box = qs('#soPics');
  if (!box) return;
  box.innerHTML = '';
  for (const it of items) {
    const url = await soBlob(it.file).catch(() => '');
    const d = document.createElement('div');
    d.style.cssText = 'width:240px';
    d.innerHTML = `<img src="${url}" alt="" style="width:100%;border-radius:10px;display:block;background:#111">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:.72rem;color:#9eb3cc"><span>${h(it.size)} · ${it.w}×${it.h}</span><a class="btn" href="${url}" download="drmoneywise-${h(it.file)}" style="padding:4px 10px">Download</a></div>`;
    box.appendChild(d);
  }
}
async function soRecent() {
  const box = qs('#soRecent');
  if (!box) return;
  try {
    const r = await API.get('/api/admin/social/recent');
    box.innerHTML = r.files.length ? '' : '<span style="color:#9eb3cc;font-size:.8rem">None yet.</span>';
    for (const f of r.files) {
      const url = await soBlob(f).catch(() => '');
      const a = document.createElement('a');
      a.href = url; a.download = 'drmoneywise-' + f; a.title = f;
      a.innerHTML = `<img src="${url}" alt="" style="height:90px;border-radius:6px;display:block">`;
      box.appendChild(a);
    }
  } catch (e) { box.textContent = e.message; }
}

async function soThemes() {
  const box = qs('#soThemes'); if (!box) return;
  let r;
  try { r = await API.get('/api/admin/social/gamma-themes'); } catch (e) { box.innerHTML = `<span style="color:#f26a6a;font-size:.8rem">Themes not available: ${h(e.message)}</span>`; return; }
  if (!r.themes.length) { box.innerHTML = '<span style="color:#9eb3cc;font-size:.8rem">No themes found. Check the Gamma key in APIs & More.</span>'; return; }
  const list = [{ id: '', name: 'Gamma’s default', type: '' }, ...r.themes.sort((a, b) => (b.type === 'custom') - (a.type === 'custom') || a.name.localeCompare(b.name))];
  box.innerHTML = list.map((t) => {
    const pv = r.previews?.[t.id]?.urls || [];
    const on = (r.chosen || '') === t.id;
    return `<div class="card" style="width:250px;margin:0;padding:10px;border:2px solid ${on ? '#c9a227' : 'rgba(255,255,255,.08)'}">
      <div style="display:flex;gap:4px;margin-bottom:6px;min-height:118px">${pv.length ? pv.map((u) => `<a href="${h(u)}" target="_blank" rel="noopener"><img src="${h(u)}" alt="" style="width:113px;height:113px;object-fit:cover;border-radius:6px"></a>`).join('') : '<div style="flex:1;display:grid;place-items:center;background:rgba(255,255,255,.04);border-radius:6px;color:#9eb3cc;font-size:.7rem">No samples yet</div>'}</div>
      <strong style="color:#fff;font-size:.82rem">${h(t.name)}</strong>${t.type === 'custom' ? ' <span style="color:#c9a227;font-size:.68rem">yours</span>' : ''}
      ${(t.colors || []).length ? `<div style="font-size:.68rem;color:#9eb3cc">${h(t.colors.slice(0, 4).join(', '))}</div>` : ''}
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
        ${t.id ? `<button class="btn" data-th="sample" data-id="${h(t.id)}" style="padding:4px 10px">${pv.length ? 'Make new samples' : 'Make 2 samples'}</button>` : ''}
        <button class="btn ${on ? 'btn-gold' : ''}" data-th="use" data-id="${h(t.id)}" style="padding:4px 10px">${on ? 'In use' : 'Use this theme'}</button>
      </div><div class="th-msg" style="font-size:.68rem;margin-top:4px"></div></div>`;
  }).join('');
  qsa('[data-th]').forEach((btn) => btn.addEventListener('click', async () => {
    const msg = btn.closest('.card').querySelector('.th-msg');
    btn.disabled = true;
    try {
      if (btn.dataset.th === 'use') { await API.post('/api/admin/social/gamma-theme', { themeId: btn.dataset.id }); showToast('Gamma theme saved'); await soThemes(); return; }
      msg.style.color = '#2bc48a'; msg.textContent = 'Gamma is making 2 samples (1–3 minutes)…';
      const { job } = await API.post('/api/admin/social/theme-preview', { themeId: btn.dataset.id });
      for (let i = 0; i < 60; i += 1) {
        await new Promise((res) => setTimeout(res, 5000));
        const j = await API.get('/api/admin/social/gamma?job=' + job);
        if (j.status === 'done') { await soThemes(); return; }
        if (j.status !== 'working') { msg.style.color = '#f26a6a'; msg.textContent = j.error || 'Didn’t finish.'; break; }
      }
    } catch (e) { msg.style.color = '#f26a6a'; msg.textContent = e.message; }
    btn.disabled = false;
  }));
}
async function load_social() { setMain(render_social()); bind_social(); soRecent(); soThemes(); if (STATE.social?.result) soShow(STATE.social.result.items); }

function bind_social() {
  const msg = qs('#soMsg');
  const say = (t, bad) => { msg.textContent = t; msg.style.color = bad ? '#f26a6a' : '#2bc48a'; };
  const read = () => {
    const f = qs('#soForm');
    return { url: f.querySelector('[name=url]').value.trim(), sizes: qsa('#soForm [name=size]:checked').map((x) => x.value), style: f.querySelector('[name=style]').value, title: f.querySelector('[name=title]').value.trim(), sub: f.querySelector('[name=sub]').value.trim() };
  };
  qsa('[data-so]').forEach((btn) => btn.addEventListener('click', async () => {
    const act = btn.dataset.so;
    if (act === 'copy') { const t = qs('#soCaption'); t.select(); try { await navigator.clipboard.writeText(t.value); say('Caption copied.'); } catch { document.execCommand('copy'); say('Caption copied.'); } return; }
    const body = read();
    if (!body.url) { say('Paste a link first.', true); return; }
    if (!body.sizes.length) { say('Tick at least one size.', true); return; }
    STATE.social = { ...body };
    btn.disabled = true;
    try {
      if (act === 'make') {
        say('Making pictures…');
        const r = await API.post('/api/admin/social/cards', body);
        STATE.social.result = r;
        qs('#soCaption').value = r.caption;
        await soShow(r.items);
        say(`${r.items.length} picture${r.items.length === 1 ? '' : 's'} ready.`);
        soRecent();
      } else {
        say('Gamma is designing an infographic: this takes 1–3 minutes…');
        const { job } = await API.post('/api/admin/social/gamma', body);
        for (let i = 0; i < 60; i += 1) {
          await new Promise((r) => setTimeout(r, 5000));
          const j = await API.get('/api/admin/social/gamma?job=' + job);
          if (j.status === 'done') { STATE.social.result = j.result; qs('#soCaption').value = j.result.caption; await soShow(j.result.items); say('Infographic ready.'); soRecent(); break; }
          if (j.status === 'failed' || j.status === 'missing') { say(j.error || 'Gamma didn’t finish.', true); break; }
        }
      }
    } catch (e) { say(e.message, true); }
    btn.disabled = false;
  }));
}


// ════════════════════════════════════════════════════════════════════════════
// PAGE M: VIDEO MAKER
// ─────────────────
// 1. Paste a link and choose Short or Video → a script appears (edit freely).
// 2. Choose the voice: computer voice, or your own (record each scene here,
//    or upload one recording of the whole script).
// 3. Make the video → progress → watch, download, copy title/description.
// Every video gets the same 3-second opening and closing, with our own music.
// ════════════════════════════════════════════════════════════════════════════

const VM = { rec: null, chunks: [], recScene: null, poll: null };

function render_video() {
  const d = STATE.video || { projects: [], voices: [] };
  const p = STATE.vp;
  const busy = p && p.status === 'rendering';
  const sceneCard = (s, i) => `
      <div class="card" data-sc="${h(s.id)}" style="background:rgba(255,255,255,.03);margin:0 0 10px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
          <strong style="font-size:.78rem;color:#c9a227">Scene ${i + 1} · ${h({ title: 'Title', point: 'Point', stats: 'Numbers', list: 'Summary', cta: 'Closing' }[s.kind] || s.kind)}</strong>
          <span style="font-size:.7rem;color:#9eb3cc">about ${Math.max(2, Math.round(s.text.split(/\s+/).filter(Boolean).length / 2.5))} seconds</span>
        </div>
        <label style="display:block;margin:6px 0"><span class="field">Heading on screen (optional)</span><input class="input" name="heading" value="${h(s.heading || '')}" maxlength="70"></label>
        <label style="display:block;margin:6px 0"><span class="field">What is said</span><textarea name="text" rows="3" maxlength="1200">${h(s.text)}</textarea></label>
        ${s.kind === 'point' ? '' : ''}
        <div class="vm-own" style="display:${p.voice === 'own' ? 'flex' : 'none'};gap:8px;align-items:center;flex-wrap:wrap">
          <button class="btn" data-vm="rec" data-id="${h(s.id)}">● Record</button>
          ${s.voiceFile ? `<button class="btn" data-vm="play" data-file="${h(s.voiceFile)}">▶ Play (${(s.voiceSeconds || 0).toFixed(1)} s)</button>` : '<span style="font-size:.72rem;color:#9eb3cc">Not recorded yet</span>'}
          <label class="btn" style="cursor:pointer">Upload file<input type="file" accept="audio/*" data-vm="file" data-id="${h(s.id)}" style="display:none"></label>
        </div>
      </div>`;
  return `
    <div class="pg-head">
      <div class="eyebrow" style="--ac:#e87ba4">Marketing</div>
      <h1>Video maker</h1>
      <p>Turn a page into a YouTube Short (vertical, up to about a minute) or a longer landscape video. Every video gets the same 3-second Dr MoneyWise opening and closing, with our own music (composed for us, so no copyright worries) and free Pexels photos.</p>
    </div>
    <div class="card" id="vmNew">
      <div style="display:grid;grid-template-columns:2fr 1fr auto;gap:10px;align-items:end">
        <label><span class="field">Link to a page on the site</span><input class="input" name="url" placeholder="/learn/... or /stock/KO or /results or /shariah/uk" value="${h(p?.url || '')}"></label>
        <label><span class="field">Type</span><select name="format"><option value="short">Short: vertical, 30–60 s</option><option value="long">Video: landscape, a few minutes</option></select></label>
        <button class="btn btn-gold" data-vm="create">Write the script</button>
      </div>
      <p id="vmMsg" style="font-size:.76rem;margin:8px 0 0"></p>
    </div>
    ${p ? `
    <div class="card-grid two-col">
      <div class="card" id="vmScript">
        <h2 style="margin-top:0">${h(p.title)}</h2>
        <p style="font-size:.74rem;color:#9eb3cc">${h(d.formats?.[p.format]?.label || p.format)} · ${p.scenes.length} scenes · about ${Math.round(p.scenes.reduce((a, s) => a + Math.max(2.5, s.text.split(/\s+/).filter(Boolean).length / 2.5 + 0.5), 0) + 6)} seconds. Edit the words as you like; keep figures as they are.</p>
        ${p.scenes.map(sceneCard).join('')}
      </div>
      <div>
        <div class="card">
          <h2 style="margin-top:0">Voice</h2>
          <label style="display:flex;gap:8px;align-items:flex-start;margin:6px 0;font-size:.8rem;color:#dbe6f3"><input type="radio" name="voice" value="computer" ${p.voice === 'computer' ? 'checked' : ''} style="width:auto;margin-top:3px"><span><b>Computer voice</b>: quickest. Google’s voices sound the most natural and use your Gemini key (it has a free allowance).${d.computerVoice ? '' : ' <span style="color:#f26a6a">Needs the Gemini or OpenAI key (APIs & More).</span>'}<br><span style="color:#9eb3cc">The description will say “Narration voice is computer-generated”, as the voice providers’ rules ask.</span></span></label>
          <div style="display:flex;gap:8px;align-items:end;margin:4px 0 10px 26px"><label style="flex:1"><span class="field">Which voice</span><select name="voiceName">
            <optgroup label="Google (most natural)${d.voiceKeys?.gemini ? '' : ': needs the Gemini key'}">${(d.voices || []).filter((v) => v.provider === 'gemini').map((v) => `<option value="${h(v.id)}" ${p.voiceName === v.id ? 'selected' : ''}>${h(v.label)}</option>`).join('')}</optgroup>
            <optgroup label="OpenAI${d.voiceKeys?.openai ? '' : ': needs the OpenAI key'}">${(d.voices || []).filter((v) => v.provider === 'openai').map((v) => `<option value="${h(v.id)}" ${p.voiceName === v.id || p.voiceName === v.id.split(':')[1] ? 'selected' : ''}>${h(v.label)}</option>`).join('')}</optgroup>
          </select></label><button class="btn" data-vm="listen">▶ Listen</button></div>
          <label style="display:flex;gap:8px;align-items:flex-start;margin:6px 0;font-size:.8rem;color:#dbe6f3"><input type="radio" name="voice" value="own" ${p.voice === 'own' ? 'checked' : ''} style="width:auto;margin-top:3px"><span><b>My own voice</b>: record each scene with the ● Record buttons (allow the microphone), or upload one recording of the whole script below.</span></label>
          <div class="vm-own" style="display:${p.voice === 'own' ? 'block' : 'none'};margin:8px 0 0 26px">
            <label class="btn" style="cursor:pointer">Upload the whole script as one file<input type="file" accept="audio/*" data-vm="file" data-id="all" style="display:none"></label>
            ${p.voiceAll ? `<p style="font-size:.72rem;color:#2bc48a">Whole recording saved (${p.voiceAll.seconds.toFixed(1)} s). Scenes are timed by their number of words.</p>` : ''}
          </div>
          <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;align-items:center">
            <button class="btn" data-vm="save" ${busy ? 'disabled' : ''}>Save script</button>
            <button class="btn btn-gold" data-vm="render" ${busy ? 'disabled' : ''}>Make the video</button>
          </div>
          ${p.status === 'rendering' ? `<div style="margin-top:12px"><div style="height:10px;background:rgba(255,255,255,.08);border-radius:6px"><div style="height:10px;width:${p.progress?.pct || 2}%;background:#c9a227;border-radius:6px"></div></div><p style="font-size:.74rem;color:#dbe6f3">${h(p.progress?.step || 'Working')}… (a Short takes about a minute; a long video several minutes)</p></div>` : ''}
          ${p.status === 'failed' ? `<p style="font-size:.76rem;color:#f26a6a">Couldn’t make the video: ${h(p.error || '')}</p>` : ''}
        </div>
        ${p.status === 'done' ? `<div class="card" id="vmDone">
          <h2 style="margin-top:0">Your video (${p.seconds} s)</h2>
          <video id="vmPlayer" controls style="width:100%;max-height:520px;border-radius:10px;background:#000"></video>
          <div style="display:flex;gap:8px;margin:10px 0;flex-wrap:wrap"><button class="btn btn-gold" data-vm="dl" data-file="${h(p.output)}">Download MP4</button>${p.thumbnail ? `<button class="btn" data-vm="dl" data-file="${h(p.thumbnail)}">Download thumbnail</button>` : ''}</div>
          <label style="display:block;margin:6px 0"><span class="field">YouTube title</span><input class="input" id="vmTitle" value="${h(p.meta?.title || '')}"></label>
          <label style="display:block;margin:6px 0"><span class="field">Description</span><textarea id="vmDesc" rows="10">${h(p.meta?.description || '')}</textarea></label>
          <label style="display:block;margin:6px 0"><span class="field">Tags</span><input class="input" id="vmTags" value="${h((p.meta?.tags || []).join(', '))}"></label>
          <button class="btn" data-vm="copy">Copy title, description and tags</button>
        </div>` : ''}
      </div>
    </div>` : ''}
    ${d.storage ? `<div class="card"><h2 style="margin-top:0">Saved-data space</h2>
      ${d.storage.freeMb !== null ? `<p style="font-size:.8rem;color:${d.storage.freeMb < 300 ? '#f26a6a' : '#dbe6f3'}"><b>${d.storage.freeMb} MB free</b> of ${d.storage.totalMb} MB. Videos are made in temporary space; only the finished MP4s are kept (the newest 10).</p>
      <div style="height:10px;background:rgba(255,255,255,.08);border-radius:6px;margin:6px 0 10px"><div style="height:10px;width:${Math.min(100, Math.round(100 - (d.storage.freeMb / Math.max(1, d.storage.totalMb)) * 100))}%;background:${d.storage.freeMb < 300 ? '#f26a6a' : '#c9a227'};border-radius:6px"></div></div>` : ''}
      <details ${d.storage.freeMb !== null && d.storage.freeMb < 300 ? 'open' : ''}><summary style="cursor:pointer;font-size:.76rem;color:#9eb3cc">What uses the space</summary>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:6px"><div><b style="font-size:.72rem;color:#c9a227">Folders</b>${d.storage.parts.map((x) => `<div style="display:flex;justify-content:space-between;font-size:.72rem;color:#dbe6f3;padding:2px 0"><span>${h(x.name)}</span><span>${x.mb} MB</span></div>`).join('')}</div>
        <div><b style="font-size:.72rem;color:#c9a227">Biggest files</b>${(d.storage.biggest || []).map((x) => `<div style="display:flex;justify-content:space-between;gap:8px;font-size:.72rem;color:#dbe6f3;padding:2px 0"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(x.name)}</span><span>${x.mb} MB</span></div>`).join('')}</div></div></details>
      <p style="margin-top:10px"><button class="btn" data-vm="free">Free up space</button> <span style="font-size:.7rem;color:#9eb3cc">Removes leftover and half-made video files, all but the newest 3 videos, social and Gamma pictures older than a day, and half-written temporary files.</span></p></div>` : ''}
    <div class="card"><h2 style="margin-top:0">Your videos</h2>
      ${d.projects.length ? d.projects.map((x) => `<div style="display:flex;justify-content:space-between;gap:8px;border-top:1px solid rgba(255,255,255,.08);padding:8px 0;font-size:.8rem"><span style="color:#fff">${h(x.title)}<br><span style="color:#9eb3cc;font-size:.7rem">${x.format === 'short' ? 'Short' : 'Video'} · ${h(x.status)}${x.seconds ? ` · ${x.seconds} s` : ''} · ${fmtDate(x.createdAt)}</span></span><span style="display:flex;gap:6px;align-self:center"><button class="btn" data-vm="open" data-id="${h(x.id)}" style="padding:4px 10px">Open</button><button class="btn" data-vm="del" data-id="${h(x.id)}" style="padding:4px 10px;color:#f26a6a">Delete</button></span></div>`).join('') : '<p style="color:#9eb3cc;font-size:.8rem">None yet.</p>'}
    </div>`;
}

async function load_video() {
  try { STATE.video = await API.get('/api/admin/video'); } catch (e) { STATE.video = { projects: [], voices: [] }; }
  setMain(render_video()); bind_video();
}
function vmRead() {
  const p = STATE.vp;
  return {
    id: p.id,
    scenes: qsa('#vmScript [data-sc]').map((el) => ({ id: el.dataset.sc, heading: el.querySelector('[name=heading]').value, text: el.querySelector('[name=text]').value })),
    voice: (qs('[name=voice]:checked') || {}).value || p.voice,
    voiceName: (qs('[name=voiceName]') || {}).value || p.voiceName,
  };
}
async function vmRefresh() { STATE.video = await API.get('/api/admin/video'); setMain(render_video()); bind_video(); }
async function vmUpload(sceneId, blob) {
  const r = await fetch(`/api/admin/video/audio?id=${STATE.vp.id}&scene=${encodeURIComponent(sceneId)}`, { method: 'POST', headers: { 'x-session-token': STATE.token, 'Content-Type': blob.type || 'audio/webm' }, body: blob });
  const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Upload failed');
  return d;
}
function vmPoll() {
  clearInterval(VM.poll);
  VM.poll = setInterval(async () => {
    if (STATE.currentPage !== 'video' || !STATE.vp) { clearInterval(VM.poll); return; }
    const p = await API.get('/api/admin/video/project?id=' + STATE.vp.id).catch(() => null);
    if (!p) return;
    STATE.vp = p;
    if (p.status !== 'rendering') { clearInterval(VM.poll); await vmRefresh(); return; }
    setMain(render_video()); bind_video();
  }, 3000);
}

function bind_video() {
  const msg = qs('#vmMsg');
  const say = (t, bad) => { if (msg) { msg.textContent = t; msg.style.color = bad ? '#f26a6a' : '#2bc48a'; } };
  qsa('[name=voice]').forEach((r) => r.addEventListener('change', () => qsa('.vm-own').forEach((el) => { el.style.display = r.value === 'own' && r.checked ? (el.tagName === 'DIV' && el.closest('[data-sc]') ? 'flex' : 'block') : 'none'; })));
  if (STATE.vp?.status === 'done') {
    soVideo();
  }
  if (STATE.vp?.status === 'rendering') vmPoll();
  async function soVideo() {
    try { const r = await fetch(`/api/admin/video/file/${STATE.vp.id}/${STATE.vp.output}`, { headers: { 'x-session-token': STATE.token } }); const u = URL.createObjectURL(await r.blob()); const v = qs('#vmPlayer'); if (v) v.src = u; VM.videoUrl = u; } catch { /* player stays empty */ }
  }
  qsa('[data-vm=file]').forEach((inp) => inp.addEventListener('change', async () => {
    const file = inp.files[0]; if (!file) return;
    try { await API.post('/api/admin/video/save', vmRead()); const r = await vmUpload(inp.dataset.id, file); showToast(`Recording saved (${r.seconds} s)`); STATE.vp = await API.get('/api/admin/video/project?id=' + STATE.vp.id); await vmRefresh(); } catch (e) { showToast(e.message); }
  }));
  qsa('[data-vm]').forEach((btn) => { if (btn.tagName !== 'BUTTON') return; btn.addEventListener('click', async () => {
    const act = btn.dataset.vm;
    try {
      if (act === 'create') {
        const url = qs('#vmNew [name=url]').value.trim(); const format = qs('#vmNew [name=format]').value;
        if (!url) { say('Paste a link first.', true); return; }
        btn.disabled = true; say('Writing the script…');
        STATE.vp = await API.post('/api/admin/video/create', { url, format });
        await vmRefresh(); return;
      }
      if (act === 'listen') {
        const v = qs('[name=voiceName]').value; btn.disabled = true; btn.textContent = '…';
        try {
          const r = await fetch('/api/admin/video/voice-sample?voice=' + encodeURIComponent(v), { headers: { 'x-session-token': STATE.token } });
          if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Sample not available'); }
          new Audio(URL.createObjectURL(await r.blob())).play();
        } finally { btn.disabled = false; btn.textContent = '▶ Listen'; }
        return;
      }
      if (act === 'free') { btn.disabled = true; btn.textContent = 'Freeing space…'; const r = await API.post('/api/admin/video/free-space', {}); showToast(`Space freed: ${r.before ?? '?'} → ${r.after ?? '?'} MB free${r.errors?.length ? ` (problem: ${r.errors[0]})` : ''}`); await vmRefresh(); return; }
      if (act === 'del') {
        if (!window.confirm('Delete this video for good (script, recordings and MP4)?')) return;
        await API.post('/api/admin/video/delete', { id: btn.dataset.id });
        if (STATE.vp?.id === btn.dataset.id) STATE.vp = null;
        showToast('Video deleted'); await vmRefresh(); return;
      }
      if (act === 'open') { STATE.vp = await API.get('/api/admin/video/project?id=' + btn.dataset.id); await vmRefresh(); window.scrollTo(0, 0); return; }
      if (act === 'save') { STATE.vp = await API.post('/api/admin/video/save', vmRead()); showToast('Script saved'); await vmRefresh(); return; }
      if (act === 'render') {
        btn.disabled = true;
        await API.post('/api/admin/video/render', { id: STATE.vp.id, save: vmRead() });
        STATE.vp = await API.get('/api/admin/video/project?id=' + STATE.vp.id);
        await vmRefresh(); return;
      }
      if (act === 'play') {
        const r = await fetch(`/api/admin/video/file/${STATE.vp.id}/${btn.dataset.file}`, { headers: { 'x-session-token': STATE.token } });
        new Audio(URL.createObjectURL(await r.blob())).play(); return;
      }
      if (act === 'rec') {
        if (VM.rec && VM.rec.state === 'recording') { VM.rec.stop(); return; }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        VM.chunks = []; VM.recScene = btn.dataset.id;
        VM.rec = new MediaRecorder(stream);
        VM.rec.ondataavailable = (e) => { if (e.data.size) VM.chunks.push(e.data); };
        VM.rec.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(VM.chunks, { type: VM.rec.mimeType || 'audio/webm' });
          try { await API.post('/api/admin/video/save', vmRead()); const r = await vmUpload(VM.recScene, blob); showToast(`Scene recorded (${r.seconds} s)`); STATE.vp = await API.get('/api/admin/video/project?id=' + STATE.vp.id); await vmRefresh(); } catch (e) { showToast(e.message); }
        };
        VM.rec.start(); btn.textContent = '■ Stop'; btn.style.background = '#f26a6a'; btn.style.color = '#fff';
        return;
      }
      if (act === 'dl') {
        const r = await fetch(`/api/admin/video/file/${STATE.vp.id}/${btn.dataset.file}`, { headers: { 'x-session-token': STATE.token } });
        const a = document.createElement('a'); a.href = URL.createObjectURL(await r.blob()); a.download = 'drmoneywise-' + btn.dataset.file; a.click(); return;
      }
      if (act === 'copy') {
        const t = `${qs('#vmTitle').value}\n\n${qs('#vmDesc').value}\n\nTags: ${qs('#vmTags').value}`;
        try { await navigator.clipboard.writeText(t); } catch { /* ignore */ }
        showToast('Copied'); return;
      }
    } catch (e) { say(e.message, true); showToast(e.message); btn.disabled = false; }
  }); });
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 6: ROUTER
// To add a new page: add an entry to the PAGES map
// ════════════════════════════════════════════════════════════════════════════

const PAGES = {
  analytics: { load: load_analytics,  render: render_analytics, bind: bind_analytics  },
  news:      { load: load_news,        render: render_news,      bind: bind_news       },
  writer:    { load: null,             render: render_writer,    bind: bind_writer     },
  inventory: { load: load_inventory,   render: render_inventory, bind: bind_inventory  },
  settings:  { load: load_settings,   render: render_settings,  bind: bind_settings   },
  health:    { load: load_health,     render: render_health,    bind: bind_health     },
  forum:     { load: load_forum,      render: render_forum,     bind: bind_forum      },
  property:  { load: load_property,   render: render_property,  bind: bind_property   },
  ads:       { load: load_ads,        render: render_ads,       bind: bind_ads        },
  ask:       { load: load_ask,        render: render_ask,       bind: bind_ask        },
  newsletter:{ load: load_newsletter, render: render_newsletter, bind: bind_newsletter },
  social:    { load: load_social,     render: render_social,     bind: bind_social     },
  video:     { load: load_video,      render: render_video,      bind: bind_video      },
};

const ROUTER = {
  async go(pageId) {
    if (!PAGES[pageId]) return;
    STATE.currentPage = pageId;
    setActivePage(pageId);

    if (PAGES[pageId].load) {
      setMain('<div class="loading">Loading…</div>');
      await PAGES[pageId].load();
    } else {
      setMain(PAGES[pageId].render());
      PAGES[pageId].bind();
    }
  },
};


// ════════════════════════════════════════════════════════════════════════════
// SECTION 7: AUTH
// To change login/logout behaviour: edit this section
// ════════════════════════════════════════════════════════════════════════════

const AUTH = {
  save(token, user) {
    STATE.token = token;
    STATE.user  = user;
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({ token, userId: user?.id })); } catch {}
  },

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
      STATE.token = saved.token || '';
    } catch { STATE.token = ''; }
  },

  clear() {
    STATE.token = '';
    STATE.user  = null;
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  },

  async logout() {
    try { await API.logout(); } catch {}
    AUTH.clear();
    showLogin('You have been signed out.');
  },

  async tryAutoLogin() {
    AUTH.load();
    if (!STATE.token) return false;
    try {
      const res = await API.get('/api/auth/me');
      if (res.user?.role === 'admin') {
        STATE.user = res.user;
        return true;
      }
    } catch {}
    AUTH.clear();
    return false;
  },
};

function bindLoginForm() {
  qs('#loginForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const email    = qs('#loginEmail')?.value?.trim()    || '';
    const password = qs('#loginPassword')?.value?.trim() || '';
    const msgEl    = qs('#loginMsg');
    if (msgEl) msgEl.textContent = '';

    try {
      const res = await API.post('/api/auth/login', { email, password });
      if (res.user?.role !== 'admin') throw new Error('This account does not have admin access.');
      AUTH.save(res.token, res.user);
      showShell();
      bindNav();
      await ROUTER.go('analytics');
    } catch (err) {
      if (msgEl) msgEl.textContent = err.message || 'Sign in failed. Check your credentials.';
    }
  });
}


// ════════════════════════════════════════════════════════════════════════════
// SECTION 8: INIT
// This runs once on page load — do not put page logic here
// ════════════════════════════════════════════════════════════════════════════

async function init() {
  bindLoginForm();

  // Try to restore session
  const autoLogged = await AUTH.tryAutoLogin();

  if (autoLogged) {
    // Also load bootstrap for regions/interests in writer
    try { STATE.bootstrap = await API.bootstrap(); } catch {}
    showShell();
    bindNav();
    await ROUTER.go('analytics');
  } else {
    showLogin();
  }

  // Pre-fetch bootstrap in background if not done
  if (!STATE.bootstrap) {
    API.bootstrap().then(b => { STATE.bootstrap = b; }).catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);