/* ════════════════════════════════════════════════════════════════════════
   Ad and partner spaces (runs in the browser). Switched on/off in
   Admin → Ads & partners. This file:
   • fills the spaces on the homepage and explainer pages
   • removes the bottom strip if the reader closed it this visit
   • hides ads from Premium members (if that option is on)
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  function runScripts(box) {
    // Ad-network code: scripts added with innerHTML do not run, so re-add them
    box.querySelectorAll('script').forEach(function (old) {
      var s = document.createElement('script');
      for (var i = 0; i < old.attributes.length; i++) s.setAttribute(old.attributes[i].name, old.attributes[i].value);
      s.text = old.text;
      old.parentNode.replaceChild(s, old);
    });
  }
  function closedStrip() {
    try { return sessionStorage.getItem('dmw-strip-closed') === '1'; } catch (e) { return false; }
  }
  function tidy() {
    if (closedStrip()) document.querySelectorAll('[data-ad-slot="bottom-strip"]').forEach(function (n) { n.remove(); });
    if (document.querySelector('[data-ad-slot="bottom-strip"]')) document.body.classList.add('has-ad-strip');
    var hide = document.querySelector('[data-ad-slot][data-hide-members="1"]');
    if (!hide) return;
    var token = '';
    try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
    if (!token) return;
    fetch('/api/auth/me', { headers: { 'x-session-token': token } })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (d) {
        var u = d && d.user;
        if (u && (u.plan === 'premium' || u.role === 'admin')) {
          document.querySelectorAll('[data-ad-slot]').forEach(function (n) { n.remove(); });
          document.body.classList.remove('has-ad-strip');
        }
      })
      .catch(function () {});
  }
  var empty = document.querySelectorAll('[data-ad-fill]');
  if (!empty.length) { tidy(); return; }
  fetch('/api/site/ads')
    .then(function (r) { return r.ok ? r.json() : { slots: {} }; })
    .then(function (d) {
      empty.forEach(function (box) {
        var html = d.slots && d.slots[box.getAttribute('data-ad-fill')];
        if (!html) { box.remove(); return; }
        box.outerHTML = html;
      });
      document.querySelectorAll('.ad-code').forEach(runScripts);
      tidy();
    })
    .catch(function () { empty.forEach(function (b) { b.remove(); }); });
}());
