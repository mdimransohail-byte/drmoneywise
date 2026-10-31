/* Learn course progress on /learn and the level pages: ticks the lessons a
   signed-in reader has read, with progress bars per level and week.
   Saved to their account (/api/member/lessons), so it works on any device. */
(function () {
  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  if (!token) return;
  fetch('/api/member/lessons', { headers: { 'x-session-token': token } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d) return;
      var read = {};
      (d.read || []).forEach(function (x) { read[x.slug] = x; });
      document.querySelectorAll('[data-lesson]').forEach(function (li) {
        var x = read[li.dataset.lesson];
        if (!x) return;
        li.classList.add('is-read');
        var em = li.querySelector('em');
        if (em) em.textContent = 'Read ✓' + (x.quiz ? ' · quiz ' + x.quiz.score + '/' + x.quiz.of : '');
      });
      document.querySelectorAll('.wk').forEach(function (wk) {
        var all = wk.querySelectorAll('[data-lesson]').length;
        var done = wk.querySelectorAll('[data-lesson].is-read').length;
        var mine = wk.querySelector('.wk-mine');
        if (mine && all) { mine.hidden = false; mine.textContent = done === all ? 'Week done ✓' : 'You: ' + done + '/' + all; mine.classList.toggle('all', done === all); }
      });
      document.querySelectorAll('[data-level-progress]').forEach(function (box) {
        var lv = (d.levels || {})[box.dataset.levelProgress];
        if (!lv) return;
        var pct = lv.total ? Math.round(lv.read / lv.total * 100) : 0;
        box.classList.add('on');
        box.querySelector('i').style.width = pct + '%';
        box.querySelector('.lp-me-text').innerHTML = '<b>Your progress: ' + lv.read + ' of ' + lv.total + ' lessons read (' + pct + '%)</b>' + (lv.planned > lv.total ? ' · ' + (lv.planned - lv.total) + ' more lessons on the way' : '') + '. Lessons tick off when you finish the quick check or press “I’ve read this”.';
      });
      document.querySelectorAll('[data-level-mine]').forEach(function (el) {
        var lv = (d.levels || {})[el.dataset.levelMine];
        if (!lv || !lv.read) return;
        el.hidden = false; el.textContent = 'You’ve read ' + lv.read + ' of ' + lv.total;
      });
    })
    .catch(function () {});
})();
