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
  writerModel:    'deepseek',
  writerTopic:    '',
  writerTier:     'free',
  writerRegion:   'Global',
  writerInterest: 'equities',
  writerText:     '',
  writerDone:     false,
  writerGenerating: false,
  writerStatus:   '',
  writerInterval: null,

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
  getWriterStatus:     ()   => API.get('/api/admin/writer-status'),
  listUsers:           ()   => API.get('/api/admin/users'),
  updateUserPlan:      (b)  => API.post('/api/admin/users/plan', b),
  listCoupons:         ()   => API.get('/api/admin/coupons'),
  createCoupon:        (b)  => API.post('/api/admin/coupons', b),
  toggleCoupon:        (id) => API.post('/api/admin/coupons/toggle', { id }),
  saveSettings:        (b)  => API.post('/api/admin/settings', b),
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
  return { published: 'tag-published', scheduled: 'tag-scheduled', draft: 'tag-draft', candidate: 'tag-candidate' }[st] || 'tag-draft';
}

// Shared between the AI Writer page and the Inventory page's Discover button —
// both spend DeepSeek tokens, so both should show the same warning.
async function refreshSurgeBanner() {
  const el = qs('#surgeBanner');
  if (!el) return;
  try {
    const res = await API.getWriterStatus();
    STATE.deepseekSurge = res.deepseekSurge;
    el.innerHTML = res.deepseekSurge?.active
      ? `<div style="background:rgba(124,92,255,.12);border:1px solid rgba(124,92,255,.3);color:#7c5cff;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:.78rem">
          ⚡ DeepSeek surge pricing is on till ${h(res.deepseekSurge.untilLabel)} — API calls cost 2x right now. Consider waiting, or switch writers for now.
        </div>`
      : '';
  } catch {
    el.innerHTML = '';
  }
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
  `;
}

async function load_analytics() {
  try {
    STATE.dashboard = await API.dashboard();
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
  const srcs = ['All', 'Marketaux', 'Tiingo', 'Finnhub', 'Dr MoneyWise'];
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
        <p style="margin-top:8px;font-size:.72rem">When you configure Marketaux, Tiingo, or Finnhub keys in Settings, live headlines will appear here automatically.</p>
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
      <p>Give a topic — the server drafts it using DeepSeek, GPT, or Claude via your API keys. Approve, schedule, or regenerate.</p>
    </div>

    <div id="surgeBanner"></div>

    <div class="writer-grid">

      <!-- LEFT: Controls -->
      <div class="card form-gap">
        <div>
          <div class="field">AI model</div>
          <div class="model-row">
            <button class="model-btn ${STATE.writerModel==='deepseek'?'deepseek':''}" id="mDeepSeek">⚡ DeepSeek (cheapest)</button>
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
  qs('#mDeepSeek')?.addEventListener('click', () => { STATE.writerModel = 'deepseek'; setMain(render_writer()); bind_writer(); });
  qs('#mClaude')?.addEventListener('click', () => { STATE.writerModel = 'claude'; setMain(render_writer()); bind_writer(); });
  qs('#mOpenAI')?.addEventListener('click', () => { STATE.writerModel = 'openai'; setMain(render_writer()); bind_writer(); });
  qs('#mPerplexity')?.addEventListener('click', () => { STATE.writerModel = 'perplexity'; setMain(render_writer()); bind_writer(); });
  qs('#mGemini')?.addEventListener('click', () => { STATE.writerModel = 'gemini'; setMain(render_writer()); bind_writer(); });
  refreshSurgeBanner();
  qs('#topicTA')?.addEventListener('input', e => STATE.writerTopic    = e.target.value);
  qs('#wrTier')?.addEventListener('change', e => STATE.writerTier      = e.target.value);
  qs('#wrRegion')?.addEventListener('change', e => STATE.writerRegion  = e.target.value);
  qs('#wrInterest')?.addEventListener('change', e => STATE.writerInterest = e.target.value);

  qs('#genBtn')?.addEventListener('click', generateArticle);

  qs('#approveArt')?.addEventListener('click', async () => {
    const lines    = STATE.writerText.split('\n');
    const hlLine   = lines.find(l => l.startsWith('HEADLINE:'));
    const headline = hlLine ? hlLine.replace('HEADLINE:', '').trim() : (STATE.writerTopic || 'New Article');
    try {
      await API.saveArticle({
        headline,
        contentType: 'learning',
        accessTier:  STATE.writerTier,
        region:      STATE.writerRegion,
        interest:    STATE.writerInterest,
        status:      'draft',
        publishAt:   new Date().toISOString(),
        summary:     lines.find(l => l.startsWith('SUMMARY:'))?.replace('SUMMARY:','').trim() || '',
        bodySections:[{ heading: 'Article', body: STATE.writerText }],
        tags:        [],
      });
      STATE.writerText = ''; STATE.writerDone = false; STATE.writerTopic = '';
      showToast('Article saved to Inventory as draft');
      setMain(render_writer()); bind_writer();
    } catch (e) { showToast('Save failed: ' + e.message); }
  });

  qs('#schedArt')?.addEventListener('click', async () => {
    const lines    = STATE.writerText.split('\n');
    const headline = lines.find(l => l.startsWith('HEADLINE:'))?.replace('HEADLINE:','').trim() || STATE.writerTopic || 'New Article';
    try {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      await API.saveArticle({
        headline, contentType:'learning', accessTier:STATE.writerTier,
        region:STATE.writerRegion, interest:STATE.writerInterest,
        status:'scheduled', publishAt:tomorrow,
        summary:'', bodySections:[{heading:'Article',body:STATE.writerText}], tags:[],
      });
      STATE.writerText = ''; STATE.writerDone = false; STATE.writerTopic = '';
      showToast('Article scheduled for tomorrow');
      setMain(render_writer()); bind_writer();
    } catch (e) { showToast('Save failed: ' + e.message); }
  });

  qs('#regenArt')?.addEventListener('click', () => {
    STATE.writerText = ''; STATE.writerDone = false;
    setMain(render_writer()); bind_writer();
    generateArticle();
  });
}

async function generateArticle() {
  const topic = (qs('#topicTA')?.value || STATE.writerTopic || '').trim();
  if (!topic) { showToast('Enter a topic first'); return; }

  if (STATE.writerModel === 'deepseek' && STATE.deepseekSurge?.active) {
    const proceed = confirm(`DeepSeek surge pricing is on till ${STATE.deepseekSurge.untilLabel} — this generation will cost 2x. Continue anyway?`);
    if (!proceed) return;
  }

  STATE.writerTopic = topic;
  STATE.writerGenerating = true;
  STATE.writerDone = false;
  STATE.writerText = '';
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

    const raw = payload.article?.headline
      ? `HEADLINE: ${payload.article.headline}\n\nSUMMARY: ${payload.article.summary || ''}\n\nBODY:\n${(payload.article.bodySections || []).map(s => s.body).join('\n\n')}\n\nTAKEAWAYS:\n${(payload.article.takeaways || []).map(t => '- ' + t).join('\n')}`
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
  const filters = ['all', 'candidate', 'published', 'scheduled', 'draft'];
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
      </p>
    </div>

    <div id="surgeBanner"></div>

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

function bind_inventory() {
  refreshSurgeBanner();

  // Filter tabs
  qsa('[data-invf]').forEach(b => b.addEventListener('click', () => {
    STATE.invFilter = b.dataset.invf;
    setMain(render_inventory()); bind_inventory();
  }));

  // Refresh
  qs('#refreshInvBtn')?.addEventListener('click', load_inventory);

  // Discover candidates from news APIs
  qs('#discoverBtn')?.addEventListener('click', async (e) => {
    if (STATE.deepseekSurge?.active) {
      const proceed = confirm(`DeepSeek surge pricing is on till ${STATE.deepseekSurge.untilLabel} — discovery may use DeepSeek at 2x cost. Continue anyway?`);
      if (!proceed) return;
    }

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
    { l: 'DeepSeek',               k: 'deepseekKey',  c: '#7c5cff', hint: 'platform.deepseek.com — cheapest writer, used first in rotation' },
    { l: 'Perplexity',             k: 'perplexityKey', c: '#4f9eff', hint: 'perplexity.ai — Sonar API, includes live web search, manual pick only' },
    { l: 'Gemini',                 k: 'geminiKey',     c: '#4285f4', hint: 'aistudio.google.com — Flash-Lite, cheapest reliable option, manual pick only' },
    { l: 'Anthropic (Claude)',    k: 'claudeKey',    c: '#a78bfa', hint: 'console.anthropic.com' },
    { l: 'OpenAI (GPT-4)',        k: 'openAiKey',    c: '#2bc48a', hint: 'platform.openai.com'   },
    { l: 'Marketaux',             k: 'marketauxKey', c: '#3cb5c4', hint: 'marketaux.com — free 100 req/day' },
    { l: 'Tiingo (testing only)', k: 'tiingoKey',    c: '#ffcb6b', hint: 'tiingo.com — individual-use license, remove before launch' },
    { l: 'Finnhub',               k: 'finnhubKey',   c: '#3cb5c4', hint: 'finnhub.io — free tier' },
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
      <p>API keys, Stripe links, coupons, and site settings. Changes save to your Railway environment.</p>
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

        <!-- STRIPE -->
        <div class="card">
          <div class="card-title">Stripe payment links</div>
          ${stripeRows.map(r => `
            <div class="api-row">
              <div class="api-dot" style="background:#2bc48a"></div>
              <div class="api-label">${h(r.l)}</div>
              <div class="api-val">
                <input type="url" placeholder="https://buy.stripe.com/…" id="key_${r.k}" value="${h(s[r.k]||'')}"/>
              </div>
            </div>`).join('')}
          <button class="btn btn-green btn-sm" id="saveStripeBtn" style="margin-top:10px">Save Stripe links</button>
          <div id="stripeMsg" style="font-size:.72rem;color:#2bc48a;margin-top:7px;min-height:16px"></div>
        </div>

      </div>

      <!-- RIGHT COL -->
      <div style="display:flex;flex-direction:column;gap:14px">

        <!-- SITE SETTINGS -->
        <div class="card">
          <div class="card-title">Site settings</div>
          <div class="form-gap">
            ${[['Site name','siteName','Dr MoneyWise'],['Domain','siteDomain','drmoneywise.com'],['Support email','supportEmail','hello@drmoneywise.com'],['DeepSeek model','deepseekModel','deepseek-v4-flash'],['OpenAI model','openAiModel','gpt-4o'],['Claude model','claudeModel','claude-sonnet-4-5'],['Perplexity model','perplexityModel','sonar'],['Gemini model','geminiModel','gemini-2.5-flash-lite']].map(([l,k,ph]) => `
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

async function load_settings() {
  setMain('<div class="loading">Loading settings…</div>');
  try {
    const [dashRes, coupRes] = await Promise.all([ API.dashboard(), API.listCoupons() ]);
    STATE.dashboard = dashRes;
    STATE.coupons   = coupRes.coupons || coupRes || [];
    setMain(render_settings());
    bind_settings();
  } catch (e) {
    setMain(`<div class="loading">Could not load settings: ${h(e.message)}</div>`);
  }
}

function bind_settings() {
  // Save API keys
  qs('#saveApiKeysBtn')?.addEventListener('click', async () => {
    const msg = qs('#apiKeysMsg');
    try {
      const keys = ['deepseekKey','perplexityKey','geminiKey','claudeKey','openAiKey','marketauxKey','tiingoKey','finnhubKey','marketstackKey'];
      const body = Object.fromEntries(keys.map(k => [k, qs(`#key_${k}`)?.value?.trim() || '']));
      await API.saveSettings(body);
      if (msg) msg.textContent = '✓ API keys saved';
      showToast('API keys saved');
    } catch (e) { if (msg) msg.textContent = 'Failed: ' + e.message; }
  });

  // Save Stripe links
  qs('#saveStripeBtn')?.addEventListener('click', async () => {
    const msg = qs('#stripeMsg');
    try {
      const keys = ['stripeRegularMonthly','stripeRegularAnnual','stripePremiumMonthly','stripePremiumAnnual'];
      const body = Object.fromEntries(keys.map(k => [k, qs(`#key_${k}`)?.value?.trim() || '']));
      await API.saveSettings(body);
      if (msg) msg.textContent = '✓ Stripe links saved';
      showToast('Stripe links saved');
    } catch (e) { if (msg) msg.textContent = 'Failed: ' + e.message; }
  });

  // Save site settings
  qs('#saveSiteBtn')?.addEventListener('click', async () => {
    const msg = qs('#siteMsg');
    try {
      const keys = ['siteName','siteDomain','supportEmail','deepseekModel','openAiModel','claudeModel','perplexityModel','geminiModel'];
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
// SECTION 6: ROUTER
// To add a new page: add an entry to the PAGES map
// ════════════════════════════════════════════════════════════════════════════

const PAGES = {
  analytics: { load: load_analytics,  render: render_analytics, bind: bind_analytics  },
  news:      { load: load_news,        render: render_news,      bind: bind_news       },
  writer:    { load: null,             render: render_writer,    bind: bind_writer     },
  inventory: { load: load_inventory,   render: render_inventory, bind: bind_inventory  },
  settings:  { load: load_settings,   render: render_settings,  bind: bind_settings   },
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