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
