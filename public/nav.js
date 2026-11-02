/* Back and Top buttons on every page.
   Back: returns to the previous page on our site, or to the section the
   page belongs to (for example /learn for a lesson) when there is none.
   Top: appears on long pages once you scroll down. */
(function () {
  if (window.__dmwNav) return; window.__dmwNav = true;
  var path = location.pathname.replace(/\/+$/, '') || '/';
  function parent() {
    var parts = path.split('/').filter(Boolean);
    if (parts.length <= 1) return '/';
    var map = { stock: '/stocks', results: '/results', technical: '/technical', compare: '/compare', etfs: '/etfs', tools: '/tools', learn: '/learn', reports: '/reports', 'top-10': '/top-10', property: '/property', commodities: '/commodities', bonds: '/bonds', forum: '/forum', newsletter: '/newsletter', embed: '/' };
    return map[parts[0]] || '/' + parts.slice(0, -1).join('/');
  }
  function sameSiteReferrer() { try { return document.referrer && new URL(document.referrer).host === location.host; } catch (e) { return false; } }
  var main = document.querySelector('main');
  if (path !== '/' && main && !document.querySelector('.nav-back')) {
    var b = document.createElement('a');
    b.className = 'nav-back'; b.href = parent(); b.innerHTML = '<span aria-hidden="true">←</span> Back';
    b.addEventListener('click', function (e) { if (sameSiteReferrer() && history.length > 1) { e.preventDefault(); history.back(); } });
    var wrap = document.createElement('div'); wrap.className = 'nav-back-row'; wrap.appendChild(b);
    main.insertBefore(wrap, main.firstChild);
  }
  var top = document.createElement('button');
  top.type = 'button'; top.className = 'nav-top'; top.setAttribute('aria-label', 'Back to the top'); top.innerHTML = '↑<span>Top</span>';
  top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.body.appendChild(top);
  function check() { top.classList.toggle('on', window.scrollY > 700 && document.body.scrollHeight > window.innerHeight * 2); }
  window.addEventListener('scroll', check, { passive: true }); check();
})();

/* Drop-down menus under the main menu items (hover or tap on a computer;
   on phones the sub-items are listed under each heading in the Menu). */
(function () {
  if (window.__dmwMenus) return; window.__dmwMenus = true;
  var MENUS = {
    '/learn': [['Beginners', '/learn/beginners'], ['Intermediate', '/learn/intermediate'], ['Advanced', '/learn/advanced'], ['Chart reading', '/learn/technical'], ['The learning path', '/learn/path'], ['Money words', '/glossary']],
    '/guides': [['Personal finance', '/personal-finance'], ['Retirement', '/retirement'], ['Child’s education', '/child-education'], ['Insurance', '/insurance'], ['Currencies', '/currencies'], ['Commodities', '/commodities'], ['Shariah investing', '/shariah'], ['All guides', '/guides']],
    '/top-10': [['Dividend stocks', '/top-10/dividend-stocks'], ['ETFs', '/top-10/etfs'], ['Crypto', '/top-10/crypto'], ['All Top 10 lists', '/top-10']],
    '/markets': [['Markets explained', '/markets'], ['The economy today', '/today'], ['Company results', '/results'], ['Largest companies by sector', '/stocks'], ['Stocks around the world', '/stocks/world'], ['ETFs', '/etfs'], ['Bonds', '/bonds'], ['Financial Health Check', '/health-check'], ['Stock screener', '/screener'], ['Chart check', '/technical'], ['Compare companies', '/compare'], ['Company bosses’ trades', '/insiders'], ['Monthly research', '/reports']],
    '/property': [['Property prices', '/property'], ['City rents and yields', '/property/cities']],
    '/tools': [['Grow my savings', '/tools/savings-growth'], ['Monthly investing', '/tools/monthly-investing'], ['Retirement calculator', '/tools/retirement'], ['Dividend calculator', '/tools/dividend-income'], ['Emergency fund', '/tools/emergency-fund'], ['Debt payoff', '/tools/debt-payoff'], ['Education fund', '/tools/education-fund'], ['Life cover', '/tools/life-cover'], ['Currency converter', '/tools/currency-converter'], ['Trading risk', '/tools/trade-risk'], ['Portfolio health check', '/portfolio-health'], ['All tools', '/tools']],
    '/membership': [['Plans and prices', '/membership#plans'], ['My account', '/membership'], ['Saturday newsletter', '/newsletter'], ['Ask Dr MoneyWise', '/ask']],
  };
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function list(items) { return items.map(function (x) { return '<a href="' + x[1] + '">' + esc(x[0]) + '</a>'; }).join(''); }
  function build() {
    var desk = document.querySelector('.main-nav');
    if (desk && !desk.dataset.menus) {
      desk.dataset.menus = '1';
      Array.prototype.slice.call(desk.children).forEach(function (a, i) {
        if (a.tagName !== 'A') return;
        var items = MENUS[a.getAttribute('href')];
        if (!items) return;
        var box = document.createElement('div'); box.className = 'nd';
        a.parentNode.insertBefore(box, a); box.appendChild(a);
        a.setAttribute('aria-haspopup', 'true'); a.setAttribute('aria-expanded', 'false');
        var panel = document.createElement('div'); panel.className = 'nd-panel'; panel.id = 'nd' + i;
        panel.innerHTML = list(items); box.appendChild(panel);
        if (i >= desk.children.length - 2) box.classList.add('nd-right');
        // Touch screens: first tap opens the list, second tap follows the link
        a.addEventListener('click', function (e) {
          if (window.matchMedia('(hover: hover)').matches) return;
          if (!box.classList.contains('open')) { e.preventDefault(); closeAll(); box.classList.add('open'); a.setAttribute('aria-expanded', 'true'); }
        });
        box.addEventListener('mouseenter', function () { a.setAttribute('aria-expanded', 'true'); });
        box.addEventListener('mouseleave', function () { a.setAttribute('aria-expanded', 'false'); box.classList.remove('open'); });
        box.addEventListener('keydown', function (e) { if (e.key === 'Escape') { box.classList.remove('open'); a.focus(); } });
      });
    }
    var mob = document.getElementById('mobileNav');
    if (mob && !mob.dataset.menus) {
      mob.dataset.menus = '1';
      Array.prototype.slice.call(mob.children).forEach(function (a) {
        if (a.tagName !== 'A') return;
        var items = MENUS[a.getAttribute('href')];
        if (!items) return;
        var sub = document.createElement('div'); sub.className = 'mn-sub';
        sub.innerHTML = list(items.filter(function (x) { return x[1] !== a.getAttribute('href'); }));
        a.insertAdjacentElement('afterend', sub);
      });
    }
  }
  function closeAll() { document.querySelectorAll('.nd.open').forEach(function (b) { b.classList.remove('open'); }); }
  document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.nd')) closeAll(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();

/* Locked content: a visitor or member without the right plan sees one clear
   line above each upgrade button: join Pro, with the free trial if they
   can still have one. Works on every page's lock boxes, including those
   drawn later by page scripts. */
(function () {
  if (window.__dmwTrialNote) return; window.__dmwTrialNote = true;
  if (/^\/membership/.test(location.pathname)) return;
  var info = { plan: 'free', trialUsed: false, trialDays: 7 };
  var CTA = /see plans|see pro|see plus|upgrade|become a member|join (plus|pro)|unlock|^\s*(plus|pro)\s*$/i;
  function note() {
    var p = document.createElement('div'); p.className = 'trial-note';
    var trial = info.trialDays > 0 && !info.trialUsed;
    p.innerHTML = '<span>🔓 You can view this content by joining <strong>Pro</strong>.' + (trial ? ' Would you like a <strong>' + info.trialDays + '-day free trial</strong>?' : '') + '</span>' +
      '<a href="/membership#plans">' + (trial ? 'Yes, start my free trial' : 'See membership plans') + ' →</a>';
    return p;
  }
  function scan() {
    if (info.plan === 'premium' || info.role === 'admin') return;
    var main = document.querySelector('main'); if (!main) return;
    main.querySelectorAll('a[href^="/membership"]').forEach(function (a) {
      if (a.dataset.tn || a.closest('.trial-note, .nav-back-row, .promo-box, footer')) return;
      a.dataset.tn = '1';
      if (!CTA.test(a.textContent || '')) return;
      var box = a.closest('.pf-upsell, .members-cta, .pf-panel, .article-block, .block, section') || a.parentNode;
      if (!box || box.querySelector('.trial-note')) return;
      var at = a.closest('.pf-upsell, .members-cta, p') || a;
      if (!box.contains(at)) at = a;
      at.parentNode.insertBefore(note(), at);
    });
  }
  var t = null; function soon() { clearTimeout(t); t = setTimeout(scan, 60); }
  function start() {
    var token = '';
    try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
    fetch('/api/auth/me', { headers: token ? { 'x-session-token': token } : {} })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (d) {
        var u = (d && d.user) || {};
        info = { plan: u.plan || 'free', role: u.role, trialUsed: !!u.trialUsed, trialDays: Number(d && d.trialDays != null ? d.trialDays : 7) };
      })
      .catch(function () {})
      .then(function () {
        scan();
        var main = document.querySelector('main');
        if (main && window.MutationObserver) new MutationObserver(soon).observe(main, { childList: true, subtree: true });
      });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
