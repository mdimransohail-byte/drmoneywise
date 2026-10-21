/* Ask Dr MoneyWise — the question form and the member's own questions. */
(function () {
  var app = document.getElementById('akApp');
  if (!app) return;
  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  if (!token) return;
  var esc = function (v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var STATUS = { waiting: ['Waiting for an answer', 'wait'], answered: ['Answered', 'done'], declined: ['We couldn’t answer this one', 'no'] };

  function api(method, body) {
    return fetch('/api/member/ask', { method: method, headers: { 'Content-Type': 'application/json', 'x-session-token': token }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) { var e = new Error(d.error || 'error'); e.status = r.status; throw e; } return d; }); });
  }
  function draw(d, msg) {
    var form = !d.canAsk
      ? '<div class="pf-upsell"><strong>Asking questions is part of Regular and Premium.</strong><a class="pf-btn gold" href="/membership#plans">See plans</a></div>'
      : '<form class="pf-panel ak-form" id="akForm"><h2>Ask your question</h2>' +
        '<label><span>What is it about?</span><select name="topic">' + d.topics.map(function (t) { return '<option value="' + esc(t[0]) + '">' + esc(t[1]) + '</option>'; }).join('') + '</select></label>' +
        '<label><span>Your question</span><textarea name="question" rows="5" maxlength="1200" placeholder="For example: What is the difference between an ETF and a mutual fund, and which costs less?"' + (d.left ? '' : ' disabled') + '></textarea></label>' +
        '<label class="ak-check"><input type="checkbox" name="publishOk" checked> You may share my question and the answer on this page, without my name, to help other readers</label>' +
        '<p class="pf-sub">Please don’t include account numbers or other private details. We answer in general terms and can’t give personal advice.</p>' +
        '<div class="ak-row"><button class="pf-btn gold" type="submit"' + (d.left ? '' : ' disabled') + '>Send my question</button><span class="ak-left"><b>' + d.left + '</b> of ' + d.limit + ' questions left this month</span></div>' +
        (msg ? '<p class="ak-msg">' + esc(msg) + '</p>' : '') + '</form>';
    var mine = d.questions.length ? '<div class="pf-panel"><h2>Your questions</h2>' + d.questions.map(function (q) {
      var st = STATUS[q.status] || STATUS.waiting;
      return '<div class="ak-mine ' + st[1] + '"><div class="ak-mine-head"><span class="ak-status">' + esc(st[0]) + '</span><small>' + esc(new Date(q.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })) + '</small></div><p><strong>' + esc(q.question) + '</strong></p>' +
        (q.answer ? '<div class="ak-answer">' + q.answer.split(/\n{2,}/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + (q.published ? '<small>Shared on this page without your name.</small>' : '') + '</div>' : '') + '</div>';
    }).join('') + '</div>' : '';
    app.innerHTML = form + mine;
    var f = document.getElementById('akForm');
    if (f) f.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Sending…';
      api('POST', { topic: f.topic.value, question: f.question.value, publishOk: f.publishOk.checked })
        .then(function (r) { draw(r, 'Thank you. We’ve got your question and will email you when it’s answered.'); })
        .catch(function (err) { btn.disabled = false; btn.textContent = 'Send my question'; var m = f.querySelector('.ak-msg') || f.appendChild(document.createElement('p')); m.className = 'ak-msg bad'; m.textContent = err.message; });
    });
  }
  api('GET').then(function (d) { draw(d); }).catch(function () { /* keep the sign-in note */ });
}());
