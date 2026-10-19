/* ════════════════════════════════════════════════════════════════════════
   Forum buttons that depend on who is reading (runs in the browser).
   Reads the sign-in from localStorage ('drmoneywise-session'), asks the
   server who that is, then shows: ask form, reply box, Edit / Report,
   and for the admin: Remove, Restore, Pin, Close, Ban.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  let token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }

  const api = async (url, body, method = 'POST') => {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { 'x-session-token': token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Something went wrong (${res.status}).`);
    return data;
  };
  const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };

  async function whoAmI() {
    if (!token) return null;
    try { return (await api('/api/auth/me', null, 'GET')).user || null; } catch (e) { return null; }
  }

  whoAmI().then((me) => {
    const isAdmin = me && me.role === 'admin';
    const isPaid = me && (isAdmin || me.plan === 'regular' || me.plan === 'premium');

    /* ── Ask a question ── */
    const form = document.getElementById('newThreadForm');
    if (form) {
      if (!me) {
        form.hidden = true;
        const need = document.getElementById('signInNeeded');
        if (need) need.hidden = false;
      }
      const sectionSel = form.querySelector('[name=section]');
      const tickerField = form.querySelector('.fa-ticker-field');
      sectionSel.addEventListener('change', () => { tickerField.hidden = sectionSel.value !== 'stocks'; });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = form.querySelector('.fa-form-msg');
        const btn = form.querySelector('button[type=submit]');
        const data = Object.fromEntries(new FormData(form).entries());
        if (!data.section) { msg.textContent = 'Please choose a topic.'; return; }
        btn.disabled = true;
        msg.textContent = 'Checking and posting…';
        try {
          const res = await api('/api/forum/threads', data);
          msg.textContent = res.message;
          if (res.status === 'visible') setTimeout(() => { location.href = res.url; }, 600);
          else { form.reset(); btn.disabled = false; }
        } catch (err) { msg.textContent = err.message; btn.disabled = false; }
      });
    }

    /* ── Reply box ── */
    const box = document.getElementById('replyBox');
    if (box) {
      const threadId = box.dataset.threadId;
      if (box.dataset.locked && !isAdmin) {
        box.innerHTML = '<p class="fa-muted">This thread is closed to new replies.</p>';
      } else if (!me) {
        box.innerHTML = '<div class="fa-upsell"><strong>Join the conversation</strong><p>Members can reply to questions and share what they know. Anyone with a free account can ask new questions.</p><a class="fa-btn gold" href="/membership">Become a member</a> <a href="/#join">Sign in</a></div>';
      } else if (!isPaid) {
        box.innerHTML = '<div class="fa-upsell"><strong>Replying is for members</strong><p>Upgrade to reply, edit your posts and take part in every discussion. You can still <a href="/forum/new">ask your own question</a> for free.</p><a class="fa-btn gold" href="/membership">See membership</a></div>';
      } else {
        box.innerHTML = `<form class="fa-form" id="replyForm"><label>Your reply<textarea name="body" rows="5" required minlength="20" maxlength="5000" placeholder="Share what you know. Please be kind, and no tips to buy or sell."></textarea></label><p class="fa-form-msg" role="status" aria-live="polite"></p><div class="fa-form-actions"><button class="fa-btn gold" type="submit">Post reply</button></div></form>`;
        const rf = box.querySelector('#replyForm');
        rf.addEventListener('submit', async (e) => {
          e.preventDefault();
          const msg = rf.querySelector('.fa-form-msg');
          const btn = rf.querySelector('button');
          btn.disabled = true;
          msg.textContent = 'Checking and posting…';
          try {
            const res = await api(`/api/forum/threads/${encodeURIComponent(threadId)}/replies`, { body: rf.querySelector('[name=body]').value });
            msg.textContent = res.message;
            if (res.status === 'visible') setTimeout(() => { location.href = res.url; location.reload(); }, 600);
            else { rf.reset(); btn.disabled = false; }
          } catch (err) { msg.textContent = err.message; btn.disabled = false; }
        });
      }
    }

    /* ── Per-post buttons ── */
    document.querySelectorAll('.fa-post').forEach((post) => {
      const actions = post.querySelector('[data-actions]');
      if (!actions || !me) return;
      const id = post.dataset.postId;
      const own = post.dataset.authorId === me.id;
      const isThread = Boolean(post.dataset.isThread);
      const removed = post.dataset.status === 'removed';
      const buttons = [];
      if (!removed && (isAdmin || (own && isPaid))) buttons.push(['edit', 'Edit']);
      if (!removed && !own) buttons.push(['report', 'Report']);
      if (isAdmin) {
        buttons.push(removed ? ['restore', 'Restore'] : ['remove', 'Remove']);
        if (isThread) buttons.push(post.dataset.pinned ? ['unpin', 'Unpin'] : ['pin', 'Pin'], post.dataset.locked ? ['unlock', 'Reopen'] : ['lock', 'Close to replies']);
        if (!own) buttons.push(['ban', 'Ban author']);
      }
      actions.innerHTML = buttons.map(([a, label]) => `<button type="button" data-a="${a}">${label}</button>`).join('');
      actions.addEventListener('click', async (e) => {
        const a = e.target.closest('button')?.dataset.a;
        if (!a) return;
        try {
          if (a === 'report') {
            const why = prompt('What is wrong with this post? (optional)') ;
            if (why === null) return;
            alert((await api(`/api/forum/posts/${encodeURIComponent(id)}/report`, { reason: why })).message);
          } else if (a === 'edit') {
            openEditor(post, id, isThread);
          } else if (a === 'ban') {
            if (!confirm('Stop this reader from posting in the forum?')) return;
            alert((await api('/api/admin/forum/action', { action: 'ban', userId: post.dataset.authorId })).message);
          } else {
            if (a === 'remove' && !confirm('Remove this post?')) return;
            await api('/api/admin/forum/action', { action: a, postId: id });
            location.reload();
          }
        } catch (err) { alert(err.message); }
      });
    });

    function openEditor(post, id, isThread) {
      const bodyEl = post.querySelector('[data-body]');
      const current = [...bodyEl.querySelectorAll('p')].map((p) => p.innerText).join('\n\n');
      const titleEl = document.querySelector('.fa-thread-title');
      const editor = el(`<form class="fa-form fa-edit">${isThread ? `<label>Title<input name="title" maxlength="140"></label>` : ''}<label>Text<textarea name="body" rows="7" maxlength="5000"></textarea></label><p class="fa-form-msg" role="status"></p><div class="fa-form-actions"><button class="fa-btn gold" type="submit">Save</button> <button class="fa-btn plain" type="button" data-cancel>Cancel</button></div></form>`);
      const bodyInput = editor.querySelector('[name=body]');
      const titleInput = editor.querySelector('[name=title]');
      bodyInput.value = current;
      if (isThread && titleEl && titleInput) titleInput.value = titleEl.innerText;
      bodyEl.hidden = true;
      bodyEl.after(editor);
      editor.querySelector('[data-cancel]').addEventListener('click', () => { editor.remove(); bodyEl.hidden = false; });
      editor.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = editor.querySelector('.fa-form-msg');
        msg.textContent = 'Checking and saving…';
        try {
          const res = await api(`/api/forum/posts/${encodeURIComponent(id)}/edit`, { body: bodyInput.value, ...(isThread && titleInput ? { title: titleInput.value } : {}) });
          msg.textContent = res.message;
          if (res.status === 'visible') setTimeout(() => location.reload(), 500);
        } catch (err) { msg.textContent = err.message; }
      });
    }
  });
}());
