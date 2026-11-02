/* Company suggestions while typing. Add data-suggest to any text box:
     data-suggest="go"      choosing a company opens its page
     data-suggest="ticker"  choosing a company fills in its ticker
   Uses /api/site/suggest (company names and tickers from SEC filings). */
(function () {
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function attach(input) {
    if (input.dataset.suggestOn) return; input.dataset.suggestOn = '1';
    input.setAttribute('autocomplete', 'off');
    var box = document.createElement('ul'); box.className = 'sg-list'; box.hidden = true; box.setAttribute('role', 'listbox');
    var holder = input.parentNode; if (getComputedStyle(holder).position === 'static') holder.style.position = 'relative';
    holder.appendChild(box);
    var timer = null, items = [], pick = -1;
    function choose(it) {
      if (!it) return;
      if (input.dataset.suggest === 'go') { location.href = '/stock/' + encodeURIComponent(it.ticker); return; }
      input.value = it.ticker; box.hidden = true;
      input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
      var note = input.closest('form, .pf-row, label, div'); if (note) { var n = note.querySelector('[data-suggest-name]'); if (n) n.textContent = it.name; }
    }
    function draw() {
      box.innerHTML = items.map(function (it, i) { return '<li role="option" data-i="' + i + '"' + (i === pick ? ' class="on"' : '') + '><b>' + esc(it.ticker) + '</b><span>' + esc(it.name) + '</span></li>'; }).join('');
      box.hidden = !items.length;
    }
    input.addEventListener('input', function () {
      clearTimeout(timer);
      var q = input.value.trim();
      if (q.length < 1) { items = []; draw(); return; }
      timer = setTimeout(function () {
        fetch('/api/site/suggest?q=' + encodeURIComponent(q)).then(function (r) { return r.ok ? r.json() : { items: [] }; }).then(function (d) { items = d.items || []; pick = -1; draw(); }).catch(function () {});
      }, 180);
    });
    input.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); pick = Math.min(items.length - 1, pick + 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); pick = Math.max(0, pick - 1); draw(); }
      else if (e.key === 'Enter' && pick >= 0) { e.preventDefault(); choose(items[pick]); }
      else if (e.key === 'Escape') { box.hidden = true; }
    });
    box.addEventListener('mousedown', function (e) { var li = e.target.closest('[data-i]'); if (li) { e.preventDefault(); choose(items[+li.dataset.i]); } });
    input.addEventListener('blur', function () { setTimeout(function () { box.hidden = true; }, 150); });
  }
  function scan() { document.querySelectorAll('input[data-suggest]').forEach(attach); }
  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
})();
