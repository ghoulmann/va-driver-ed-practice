// Views and event wiring. Everything above this file is pure logic; this is the
// only module that touches the DOM or localStorage directly.

import * as store from './store.js';
import * as sessionLib from './session.js';
import { topicsOf } from './select.js';
import { creditsHTML } from './credits.js';

const app = document.getElementById('app');
const state = {
  items: [], taxonomy: null, resources: null, ipHtml: '',
  profileId: null, profile: null, session: null, view: 'home',
};

// The single-file bundle inlines its data; the static site fetches it. One code
// path, two delivery shapes.
const embedded = globalThis.__APP_DATA;

async function loadJSON(name) {
  if (embedded?.[name]) return embedded[name];
  return fetch(`data/${name}.json`).then((r) => r.json());
}

async function loadText(path, key) {
  if (embedded?.[key] != null) return embedded[key];
  return fetch(path).then((r) => r.text());
}

init();

async function init() {
  try {
    const [items, taxonomy, resources, ipHtml] = await Promise.all([
      loadJSON('items'),
      loadJSON('taxonomy'),
      loadJSON('resources').catch(() => null),
      loadText('credits.ip.html', 'ipHtml').catch(() => ''),
    ]);
    state.items = items.filter(shippable);
    state.taxonomy = taxonomy;
    state.resources = resources;
    state.ipHtml = ipHtml;
  } catch (err) {
    app.innerHTML = `<div class="card"><h2>Could not load the item bank</h2>
      <p class="muted">Open this page over HTTP rather than from the filesystem —
      <code>python -m http.server 8000</code> — or use the published site.</p>
      <p class="small muted">${escape(String(err))}</p></div>`;
    return;
  }

  state.profileId = store.activeProfile() || store.createProfile('Me');
  state.profile = store.load(state.profileId) || store.emptyState('Me');

  document.querySelectorAll('nav [data-view]').forEach((btn) => {
    btn.addEventListener('click', () => go(btn.dataset.view));
  });
  go('home');
}

/** Only reviewed + verified questions reach a learner. See CONTRIBUTING.md. */
function shippable(item) {
  return item.status === 'reviewed' && item.accuracy?.status === 'verified';
}

function go(view) {
  state.view = view;
  document.querySelectorAll('nav [data-view]').forEach((b) => {
    b.setAttribute('aria-current', String(b.dataset.view === view));
  });
  render();
}

function persist() {
  store.save(state.profileId, state.profile);
}

function render() {
  if (state.session && state.view === 'home') return renderSession();
  ({
    home: renderHome,
    mastery: renderMastery,
    settings: renderSettings,
    credits: renderCredits,
  }[state.view] || renderHome)();
}

// ---------------------------------------------------------------- home

function renderHome() {
  const pass = sessionLib.passProbability(state.profile, state.items);
  const answered = state.profile.responses || 0;
  const storageWarning = store.available() ? '' : `<div class="warn-banner">
    <strong>Storage is unavailable in this browser.</strong> Your progress will not be saved
    between visits — private browsing and blocked site data both cause this.</div>`;

  app.innerHTML = `
    ${storageWarning}
    <section class="card">
      <h2>Estimated chance of passing</h2>
      <p class="headline">${(pass * 100).toFixed(0)}%</p>
      <p class="muted small">Ten questions drawn, three misses tolerated. Based on
        ${answered} answer${answered === 1 ? '' : 's'} so far across
        ${Object.keys(state.profile.topics || {}).length} topic(s). Treat it as a readiness
        indicator, not a forecast.</p>
      <div class="actions">
        <button class="primary" id="start">Start a 10-question session</button>
        <button class="secondary" id="start-weak">Drill my weakest topic</button>
      </div>
    </section>
    <section class="card">
      <h2>What this bank covers</h2>
      <p class="muted small">${state.items.length} verified item(s) tagged against the 2022 Virginia
        Standards of Learning for Driver Education. Every answer is checked against the Code of
        Virginia, DMV, or VDOT, with the citation shown after you answer.</p>
      ${divergenceNote()}
    </section>`;

  document.getElementById('start').onclick = () => beginSession(null);
  document.getElementById('start-weak').onclick = () => {
    const weakest = sessionLib.masteryReport(state.profile, state.taxonomy)
      .filter((t) => state.items.some((i) => topicsOf(i).includes(t.id)))[0];
    beginSession(weakest ? [weakest.id] : null);
  };
}

function divergenceNote() {
  const n = state.items.filter((i) => i.course_answer).length;
  if (!n) return '';
  return `<p class="small muted">${n} item(s) are ones where current Virginia law and the course
    disagree. Those are flagged when you meet them — you need both answers: one to drive by, one
    to pass by.</p>`;
}

function beginSession(topicFilter) {
  state.session = sessionLib.start(state.profile, state.items, { topicFilter });
  if (!state.session.current) {
    state.session = null;
    app.innerHTML = `<div class="card"><h2>Nothing due</h2>
      <p class="muted">Every item in that topic was answered recently. Come back after a break,
      or run a full session.</p></div>`;
    return;
  }
  go('home');
}

// ------------------------------------------------------------- session

function renderSession() {
  const s = state.session;
  if (!s.current) return renderResults();

  const item = s.current;
  const n = s.responses.length + 1;
  const head = `<p class="progress">Question ${n} of ${s.length} · ${topicsOf(item).join(', ')}</p>
                <p class="stem">${escape(item.stem)}</p>`;

  if (item.form === 'ordering') return renderOrdering(item, head);

  app.innerHTML = `<section class="card">${head}
    <ul class="options">${item.options.map((o) => `
      <li><button data-opt="${o.id}"><span class="key">${o.id.toUpperCase()}</span>${escape(o.text)}</button></li>`).join('')}
    </ul>
    ${quitButton()}</section>`;

  app.querySelectorAll('[data-opt]').forEach((btn) => {
    btn.onclick = () => submit(btn.dataset.opt);
  });
  wireQuit();
}

/** A session must be abandonable -- answers already given are kept. */
function quitButton() {
  return `<div class="actions"><button class="secondary" id="quit-session">End session</button></div>`;
}

function wireQuit() {
  const btn = document.getElementById('quit-session');
  if (!btn) return;
  btn.onclick = () => {
    state.session = null;
    persist();
    go('home');
  };
}

function renderOrdering(item, head) {
  const order = state.session.order ||= shuffle(item.steps.map((_, i) => i));
  app.innerHTML = `<section class="card">${head}
    <p class="muted small">Put the steps in order, then submit.</p>
    <ul class="steps">${order.map((stepIdx, pos) => `
      <li><span class="n">${pos + 1}</span><span>${escape(item.steps[stepIdx].text)}</span>
        <span class="move">
          <button data-up="${pos}" ${pos === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
          <button data-down="${pos}" ${pos === order.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
        </span></li>`).join('')}
    </ul>
    <div class="actions">
      <button class="primary" id="submit-order">Submit order</button>
      <button class="secondary" id="quit-session">End session</button>
    </div>
  </section>`;

  app.querySelectorAll('[data-up]').forEach((b) => {
    b.onclick = () => { swap(order, +b.dataset.up, +b.dataset.up - 1); renderSession(); };
  });
  app.querySelectorAll('[data-down]').forEach((b) => {
    b.onclick = () => { swap(order, +b.dataset.down, +b.dataset.down + 1); renderSession(); };
  });
  document.getElementById('submit-order').onclick = () => submit([...order]);
  wireQuit();
}

function submit(response) {
  const { correct, item } = sessionLib.answer(state.profile, state.session, response);
  persist();
  renderFeedback(item, response, correct);
}

/**
 * Feedback must address what the learner did, not what the author wanted to
 * say. For an ordering item that means showing the key with the learner's own
 * placement against it, and the reason for each step they misplaced.
 */
function orderingFeedback(item, response) {
  const key = item.answerOrder || item.steps.map((_, i) => i);
  const rows = key.map((stepIdx, pos) => {
    const had = response.indexOf(stepIdx);
    const inPlace = had === pos;
    const step = item.steps[stepIdx];
    return `<li class="${inPlace ? 'correct' : 'chosen-wrong'}">
      <span class="n">${pos + 1}</span>
      <span>${escape(step.text)}
        ${inPlace ? '' : `<span class="small muted placed">you had this ${ordinal(had + 1)}</span>`}
        ${inPlace ? '' : `<div class="small muted rationale">${escape(step.why)}</div>`}
      </span></li>`;
  });
  const inPlace = key.filter((stepIdx, pos) => response[pos] === stepIdx).length;
  return { body: `<ul class="steps">${rows.join('')}</ul>`, inPlace, total: key.length };
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function renderFeedback(item, response, correct) {
  let body;
  let verdict = correct ? 'Correct.' : 'Not quite.';
  if (item.form === 'ordering') {
    const fb = orderingFeedback(item, response);
    body = fb.body;
    if (!correct) verdict = `Not quite — ${fb.inPlace} of ${fb.total} in place.`;
  } else {
    body = `<ul class="options">${item.options.map((o) => {
      const cls = o.id === item.answer ? 'correct' : (o.id === response ? 'chosen-wrong' : '');
      return `<li><button class="${cls}" disabled><span class="key">${o.id.toUpperCase()}</span>${escape(o.text)}
        ${o.rationale ? `<div class="small muted rationale">${escape(o.rationale)}</div>` : ''}</button></li>`;
    }).join('')}</ul>`;
  }

  app.innerHTML = `<section class="card">
    <p class="progress">Question ${state.session.responses.length} of ${state.session.length}</p>
    <p class="stem">${escape(item.stem)}</p>
    ${body}
    <p class="verdict ${correct ? 'right' : 'wrong'}">${verdict}</p>
    <p>${escape(item.explanation)}</p>
    ${item.course_answer ? divergenceBlock(item) : ''}
    ${authorityBlock(item)}
    <div class="actions"><button class="primary" id="next">Next</button></div>
  </section>`;

  document.getElementById('next').onclick = () => {
    delete state.session.order;
    sessionLib.advance(state.profile, state.session, state.items);
    persist();
    renderSession();
  };
}

function divergenceBlock(item) {
  const courseText = item.options.find((o) => o.id === item.course_answer)?.text ?? item.course_answer;
  return `<div class="divergence">
    <p><strong>The course disagrees.</strong> This course grades
      <em>${escape(courseText)}</em> as correct.</p>
    <p class="small">${escape(item.divergence)}</p>
    <p class="small muted">Answer the course's way on the course's quiz. Drive the law's way.</p>
  </div>`;
}

function authorityBlock(item) {
  const auth = item.accuracy?.authority || [];
  if (!auth.length) return '';
  return `<p class="small muted">Verified ${item.accuracy.verified_on} · ${auth.map((a) =>
    `<a href="${escape(a.url)}" target="_blank" rel="noopener">${escape(a.cite)}</a>${
      a.effective ? ` (eff. ${a.effective})` : ''}`).join(' · ')}</p>`;
}

function renderResults() {
  const { correct, total } = sessionLib.score(state.session);
  const passed = correct >= total - sessionLib.QUIZ_ALLOWED_MISSES;
  const pass = sessionLib.passProbability(state.profile, state.items);

  state.profile.history = [...(state.profile.history || []), {
    finished: state.session.finished, correct, total,
  }].slice(-50);
  persist();

  app.innerHTML = `<section class="card">
    <h2>${correct} of ${total}</h2>
    <p>${passed
      ? 'That is a passing score under the real quiz rule — ten drawn, three misses tolerated.'
      : 'Short of the real quiz\'s pass mark, which tolerates three misses out of ten.'}</p>
    <p class="muted small">Estimated chance of passing now: <strong>${(pass * 100).toFixed(0)}%</strong></p>
    <div class="actions">
      <button class="primary" id="again">Another session</button>
      <button class="secondary" id="see-mastery">See mastery by topic</button>
    </div>
  </section>`;

  document.getElementById('again').onclick = () => { state.session = null; beginSession(null); };
  document.getElementById('see-mastery').onclick = () => { state.session = null; go('mastery'); };
}

// ------------------------------------------------------------- mastery

function renderMastery() {
  const covered = new Set(state.items.flatMap(topicsOf));
  const rows = sessionLib.masteryReport(state.profile, state.taxonomy)
    .filter((t) => covered.has(t.id));

  app.innerHTML = `<section class="card">
    <h2>Mastery by Standard of Learning</h2>
    <p class="muted small">Weakest first. Topics with no items in the bank yet are hidden —
      see <code>backlog.md</code> for what is still to be authored.</p>
    <ul class="bars">${rows.map((t) => `
      <li class="bar-row">
        <code>${t.id}</code>
        <span>
          <span class="topic-name">${escape(t.statement)}</span>
          <span class="bar"><span style="width:${(t.pL * 100).toFixed(0)}%"></span></span>
        </span>
        <span class="pct">${(t.pL * 100).toFixed(0)}%</span>
      </li>`).join('')}
    </ul>
  </section>`;
}

// ------------------------------------------------------------- credits

function renderCredits() {
  app.innerHTML = creditsHTML({ ipHtml: state.ipHtml, resources: state.resources });
}

// ------------------------------------------------------------ settings

function renderSettings() {
  const profiles = store.listProfiles();
  app.innerHTML = `
    <section class="card">
      <h2>Profile</h2>
      <label for="who">Active profile</label>
      <select id="who">${profiles.map((p) => `
        <option value="${p.id}" ${p.id === state.profileId ? 'selected' : ''}>${escape(p.name)}</option>`).join('')}
      </select>
      <div class="actions">
        <button class="secondary" id="new-profile">New profile</button>
        <button class="secondary" id="reset">Reset this profile's progress</button>
      </div>
    </section>
    <section class="card">
      <h2>Backup</h2>
      <p class="muted small">Progress lives only in this browser. Copy this out to keep it, or
        paste an export in to restore it on another device.</p>
      <textarea id="dump" readonly>${escape(store.exportProfile(state.profileId) || '')}</textarea>
      <div class="actions">
        <button class="secondary" id="import">Import from clipboard text…</button>
      </div>
    </section>`;

  document.getElementById('who').onchange = (e) => {
    store.setActive(e.target.value);
    state.profileId = e.target.value;
    state.profile = store.load(state.profileId);
    go('home');
  };
  document.getElementById('new-profile').onclick = () => {
    const name = prompt('Name for the new profile?');
    if (!name) return;
    state.profileId = store.createProfile(name);
    state.profile = store.load(state.profileId);
    go('home');
  };
  document.getElementById('reset').onclick = () => {
    if (!confirm('Erase all progress for this profile?')) return;
    state.profile = store.emptyState(state.profile.name);
    persist();
    go('home');
  };
  document.getElementById('import').onclick = () => {
    const json = prompt('Paste a profile export:');
    if (!json) return;
    try {
      state.profileId = store.importProfile(json);
      state.profile = store.load(state.profileId);
      go('home');
    } catch (err) {
      alert(`That did not import: ${err.message}`);
    }
  };
}

// --------------------------------------------------------------- utils

function escape(text) {
  return String(text).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function swap(arr, a, b) {
  [arr[a], arr[b]] = [arr[b], arr[a]];
}

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // A shuffle that lands on the answer teaches nothing.
  return out.every((v, i) => v === i) ? shuffle(arr) : out;
}
