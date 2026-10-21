/* ════════════════════════════════════════════════════════════════════════
   /ask — Ask Dr MoneyWise. Published answers are written into the page
   (free to read, no names). public/ask.js adds the question form and the
   member's own questions.
   ════════════════════════════════════════════════════════════════════════ */

import { ASK_TOPICS, publishedAnswers } from './askService.js';
import { buildHeadTags, pageShell } from './seoService.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
const COLOURS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948', '#0e8a8a', '#8a5a2b', '#a7adc2'];

export async function renderAskPage(origin) {
  const answers = await publishedAnswers();
  const topicName = Object.fromEntries(ASK_TOPICS);
  const colour = Object.fromEntries(ASK_TOPICS.map(([id], i) => [id, COLOURS[i % COLOURS.length]]));
  const head = buildHeadTags({
    title: 'Ask Dr MoneyWise: your money questions, answered simply | Dr MoneyWise',
    description: 'Members send us their money questions and our team answers in plain English. Read the answers to questions other readers have asked.',
    canonical: `${origin}/ask`,
  });
  const body = `
      <section class="block ak-page">
        <div class="ak-hero"><div><span class="pf-badge">Regular &amp; Premium</span><h1>Ask Dr MoneyWise</h1><p>Send us a question about saving, investing or the economy and our team will answer it in plain English, usually within a few days. Regular members can ask 3 questions a month, Premium members 10.</p></div><div class="ak-mark" aria-hidden="true">?</div></div>
        <div id="akApp"><div class="pf-panel"><p>Members can send a question here. <a href="/#join" onclick="try{sessionStorage.setItem('dmw-back','/ask')}catch(e){}">Sign in</a> or <a href="/membership#plans">see the plans</a>.</p></div></div>
        <div class="ak-public">
          <h2>Questions other readers asked</h2>
          ${answers.length ? `<div class="ak-chips">${[...new Set(answers.map((a) => a.topic))].map((t) => `<span style="--c:${colour[t] || '#2a78d6'}">${esc(topicName[t] || 'Other')}</span>`).join('')}</div>
          ${answers.map((a) => `<details class="ak-qa" id="${esc(a.slug)}" style="--c:${colour[a.topic] || '#2a78d6'}"><summary><span class="ak-topic">${esc(topicName[a.topic] || 'Other')}</span><strong>${esc(a.question)}</strong></summary><div class="ak-answer">${String(a.answer).split(/\n{2,}/u).map((p) => `<p>${esc(p)}</p>`).join('')}<small>Answered ${esc(new Date(a.answeredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))}</small></div></details>`).join('')}`
          : '<div class="pf-panel"><p>The first answers will appear here soon. Members choose whether their question (without their name) can be shared to help others.</p></div>'}
        </div>
        <p class="note-box">Answers are general information to help you learn. They are not personal financial advice, because we don’t know your full situation. For decisions about your own money, speak to a qualified adviser. Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>
      <script src="/ask.js" defer></script>`;
  return pageShell({ head, body, active: 'learn' });
}
