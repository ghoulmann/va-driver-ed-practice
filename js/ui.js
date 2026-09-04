// Views and event wiring. Everything above this file is pure logic; this is the
// only module that touches the DOM or localStorage directly.

import * as store from './store.js';
import * as sessionLib from './session.js';
import { topicsOf } from './select.js';
import { creditsHTML } from './credits.js';

const app = document.getElementById('app');
const state = {
  bank: [], items: [], taxonomy: null, resources: null, ipHtml: '',
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
    state.bank = items.filter(shippable);
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
  refilter();

  document.querySelectorAll('nav [data-view]').forEach((btn) => {
    btn.addEventListener('click', () => go(btn.dataset.view));
  });
  go('home');
}

/** Only reviewed + verified questions reach a learner. See CONTRIBUTING.md. */
function shippable(item) {
  return item.status === 'reviewed' && item.accuracy?.status === 'verified';
}

/** The learner's pool: the shipped bank, minus what their settings exclude. */
function refilter() {
  const include = state.profile?.settings?.experiment !== false;
  state.items = state.bank.filter((item) => include || item.source?.kind !== 'experiment');
}

// Items authored from the Commonwealth's own sources rather than from the
// course. They are inside the curriculum; the tag says where they came from.
const CHANNELS = {
  manual: 'Virginia Driver\'s Manual',
  code: 'Code of Virginia',
  sol: 'VDOE curriculum',
};

function sourceTag(item) {
  if (item.source?.kind !== 'experiment') return '';
  const label = CHANNELS[item.source.channel] || 'Beyond the course';
  return ` · <span class="tag">${escape(label)}</span>`;
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
  const touched = sessionLib.masteryReport(state.profile, state.items, state.taxonomy)
    .filter((t) => t.seen > 0).length;
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
        ${touched} topic(s). Treat it as a readiness
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
    const weakest = sessionLib.masteryReport(state.profile, state.items, state.taxonomy)
      .filter((t) => t.n > 0)[0];
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
    app.innerHTML = `<div class="card"><h2>Nothing to ask</h2>
      <p class="muted">The bank has no questions for that selection. Run a full session
      instead.</p></div>`;
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
  const head = `<p class="progress">Question ${n} of ${s.length} · ${topicsOf(item).join(', ')}${sourceTag(item)}</p>
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
    <p class="muted small">Drag the steps into order, or use the arrows, then submit.</p>
    <ul class="steps sortable">${order.map((stepIdx, pos) => `
      <li><span class="grip"><span class="n">${pos + 1}</span><span aria-hidden="true">⠿</span></span>
        <span>${escape(item.steps[stepIdx].text)}</span>
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
  wireDrag(app.querySelector('.sortable'), order);
  document.getElementById('submit-order').onclick = () => submit([...order]);
  wireQuit();
}

/**
 * Pointer-driven reordering. Pointer events rather than HTML drag-and-drop
 * because the latter does not fire on iOS Safari, and a sixteen-year-old is
 * likelier to be on a phone than a desktop. As the pointer crosses a
 * neighbour's midline the neighbours are moved around the dragged row, never
 * the dragged row itself: detaching an element, even for the instant an
 * insertBefore takes, releases its pointer capture and ends the gesture.
 * The arrows remain for keyboard users.
 */
function wireDrag(list, order) {
  if (!list) return;
  const rows = () => [...list.children];
  list.querySelectorAll('.grip').forEach((grip) => {
    grip.onpointerdown = (e) => {
      const li = grip.closest('li');
      e.preventDefault();
      grip.setPointerCapture(e.pointerId);
      li.classList.add('dragging');

      grip.onpointermove = (ev) => {
        const others = rows().filter((r) => r !== li);
        let to = others.findIndex((r) => {
          const b = r.getBoundingClientRect();
          return ev.clientY < b.top + b.height / 2;
        });
        if (to === -1) to = others.length;
        const from = rows().indexOf(li);
        if (to === from) return;
        if (to > from) {
          for (const r of others.slice(from, to)) list.insertBefore(r, li);
        } else {
          for (const r of others.slice(to, from).reverse()) list.insertBefore(r, li.nextSibling);
        }
        const [v] = order.splice(from, 1);
        order.splice(to, 0, v);
        rows().forEach((r, i) => { r.querySelector('.n').textContent = i + 1; });
      };

      const done = () => {
        grip.onpointermove = null;
        grip.onpointerup = null;
        grip.onpointercancel = null;
        li.classList.remove('dragging');
        renderSession();
      };
      grip.onpointerup = done;
      grip.onpointercancel = done;
    };
  });
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
  const rows = sessionLib.masteryReport(state.profile, state.items, state.taxonomy)
    .filter((t) => t.n > 0);

  app.innerHTML = `<section class="card">
    <h2>Mastery by Standard of Learning</h2>
    <p class="muted small">Weakest first: the chance you would recall each topic's questions
      right now, with questions you have not met counted as unknown. The fraction is how many
      of the bank's questions on that topic you have seen — a thin topic caps low however well
      you know it. Topics with no items in the bank yet are hidden.</p>
    <ul class="bars">${rows.map((t) => `
      <li class="bar-row">
        <code>${t.id}</code>
        <span>
          <span class="topic-name">${escape(t.statement)}</span>
          <span class="bar"><span style="width:${(t.mastery * 100).toFixed(0)}%"></span></span>
        </span>
        <span class="pct">${(t.mastery * 100).toFixed(0)}% <span class="seen">${t.seen}/${t.n}</span></span>
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
      <h2>Questions</h2>
      <label class="check"><input type="checkbox" id="experiment"
        ${state.profile.settings?.experiment !== false ? 'checked' : ''}>
        Include questions drawn from the Virginia Driver's Manual, the Code of Virginia and the
        VDOE curriculum, not only the course's topics</label>
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
    refilter();
    go('home');
  };
  document.getElementById('new-profile').onclick = () => {
    const name = prompt('Name for the new profile?');
    if (!name) return;
    state.profileId = store.createProfile(name);
    state.profile = store.load(state.profileId);
    refilter();
    go('home');
  };
  document.getElementById('experiment').onchange = (e) => {
    state.profile.settings = { ...(state.profile.settings || {}), experiment: e.target.checked };
    persist();
    refilter();
  };
  document.getElementById('reset').onclick = () => {
    if (!confirm('Erase all progress for this profile?')) return;
    state.profile = store.emptyState(state.profile.name);
    persist();
    refilter();
    go('home');
  };
  document.getElementById('import').onclick = () => {
    const json = prompt('Paste a profile export:');
    if (!json) return;
    try {
      state.profileId = store.importProfile(json);
      state.profile = store.load(state.profileId);
      refilter();
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
