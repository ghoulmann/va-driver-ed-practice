// Dependency-free assertions for the adaptive engine.
// Runs in the browser via engine.html, and in node via `node tests/run.mjs`.

import * as fsrs from '../js/fsrs.js';
import * as select from '../js/select.js';
import * as sessionLib from '../js/session.js';
import { migrate, STATE_VERSION } from '../js/store.js';

const T0 = '2026-09-01T12:00:00.000Z';
const days = (n, from = T0) => new Date(new Date(from).getTime() + n * 86400000).toISOString();

export function suite() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, ok: true });
    } catch (err) {
      results.push({ name, ok: false, message: err.message });
    }
  };
  const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion failed'); };
  const close = (a, b, eps = 1e-9) => assert(Math.abs(a - b) < eps, `${a} != ${b}`);

  // ---- FSRS

  test('recall is certain at review time and falls with the days since', () => {
    const rec = fsrs.review(null, fsrs.GOOD, T0);
    close(fsrs.retrievability(rec, T0), 1);
    let last = 1;
    for (const d of [1, 3, 10, 30, 120]) {
      const r = fsrs.retrievability(rec, days(d));
      assert(r < last && r > 0, `recall should fall: day ${d} gave ${r} after ${last}`);
      last = r;
    }
  });

  test('the interval at target retention is the stability itself', () => {
    close(fsrs.interval(7, 0.9), 7, 1e-9);
    const rec = fsrs.review(null, fsrs.GOOD, T0);
    close(fsrs.retrievability(rec, rec.due), 0.9, 1e-9);
  });

  test('a right answer lengthens the interval; a wrong one shortens it', () => {
    let rec = fsrs.review(null, fsrs.GOOD, T0);
    const first = rec.stability;
    rec = fsrs.review(rec, fsrs.GOOD, rec.due);
    assert(rec.stability > first, `stability should grow on Good: ${first} -> ${rec.stability}`);
    const grown = rec.stability;
    const lapsed = fsrs.review(rec, fsrs.AGAIN, rec.due);
    assert(lapsed.stability < grown, `stability should shrink on Again: ${grown} -> ${lapsed.stability}`);
    assert(lapsed.lapses === 1 && lapsed.wrong === 1 && lapsed.correct === 2, 'counters should follow the grades');
  });

  test('difficulty stays inside [1, 10] and stability stays positive under any streak', () => {
    for (const grade of [fsrs.AGAIN, fsrs.EASY]) {
      let rec = null;
      for (let i = 0; i < 60; i++) {
        rec = fsrs.review(rec, grade, rec ? rec.due : T0);
        assert(rec.difficulty >= 1 && rec.difficulty <= 10, `difficulty ${rec.difficulty} out of range`);
        assert(rec.stability > 0 && Number.isFinite(rec.stability), `stability ${rec.stability}`);
      }
    }
  });

  test('an item is due once its due date passes, and never before it is seen', () => {
    assert(!fsrs.isDue(null, T0), 'unseen is not due');
    const rec = fsrs.review(null, fsrs.GOOD, T0);
    assert(!fsrs.isDue(rec, T0), 'just reviewed is not due');
    assert(fsrs.isDue(rec, rec.due), 'due at its due date');
    assert(fsrs.isDue(rec, days(400)), 'still due long after');
  });

  test('guess rate follows option count', () => {
    close(sessionLib.guessRate({ options: [1, 2, 3, 4] }), 0.25);
    close(sessionLib.guessRate({ options: [1, 2] }), 0.5);
    close(sessionLib.guessRate({ form: 'ordering', steps: [1, 2, 3] }), 1 / 6);
  });

  // ---- selection

  test('a session never asks the same item or the same concept twice', () => {
    const bank = makeBank();
    for (let seed = 0; seed < 20; seed++) {
      const state = blankState();
      const rng = seeded(seed);
      const s = sessionLib.start(state, bank, { now: T0, rng });
      const concepts = new Set();
      while (s.current) {
        assert(!concepts.has(s.current.concept), `concept ${s.current.concept} asked twice (seed ${seed})`);
        concepts.add(s.current.concept);
        sessionLib.answer(state, s, s.current.answer, { now: T0 });
        sessionLib.advance(state, s, bank, { now: T0, rng });
      }
      assert(new Set(s.asked).size === s.asked.length, `item repeated (seed ${seed})`);
      assert(s.asked.length === 10, `session should fill to 10, got ${s.asked.length}`);
    }
  });

  test('a due review is asked before anything new', () => {
    const bank = makeBank();
    const state = blankState();
    state.items['i-DE.2-3'] = { ...fsrs.review(null, fsrs.GOOD, T0), due: T0 };
    const item = select.nextItem(state, bank, { rng: seeded(1), now: T0 });
    assert(item.id === 'i-DE.2-3', `expected the due item, got ${item.id}`);
  });

  test('an item answered wrong is not asked again in the very next session', () => {
    const bank = makeBank();
    const state = blankState();
    const rng = seeded(3);
    const s = sessionLib.start(state, bank, { now: T0, rng });
    const missed = s.current.id;
    sessionLib.answer(state, s, wrongOption(s.current), { now: T0 });
    const later = days(0.01);
    const next = sessionLib.start(state, bank, { now: later, rng });
    const asked = [];
    while (next.current && asked.length < 10) {
      asked.push(next.current.id);
      sessionLib.answer(state, next, next.current.answer, { now: later });
      sessionLib.advance(state, next, bank, { now: later, rng });
    }
    assert(!asked.includes(missed), 'the missed item came back before it was due');
    assert(fsrs.isDue(state.items[missed], days(2)), 'but it is due within a couple of days');
  });

  test('new items come from the topic with the most room to learn', () => {
    const bank = makeBank();
    const state = blankState();
    // Every DE.1 and DE.2 item known well; DE.3 untouched.
    for (const it of bank) {
      if (it.sol[0].startsWith('DE.3')) continue;
      let rec = null;
      for (let i = 0; i < 4; i++) rec = fsrs.review(rec, fsrs.GOOD, rec ? rec.due : days(-60));
      state.items[it.id] = rec;
    }
    const counts = { 'DE.1': 0, 'DE.2': 0, 'DE.3': 0 };
    for (let seed = 0; seed < 40; seed++) {
      const item = select.nextItem(state, bank, { rng: seeded(seed), now: days(-30) });
      counts[select.topicsOf(item)[0]] += 1;
    }
    assert(counts['DE.3'] === 40, `an untouched topic should win every time: ${JSON.stringify(counts)}`);
  });

  test('an untouched topic competes with a half-learned one', () => {
    const bank = makeBank();
    const state = blankState();
    for (const it of bank) {
      if (it.sol[0].startsWith('DE.1')) state.items[it.id] = fsrs.review(null, fsrs.GOOD, T0);
      if (it.sol[0].startsWith('DE.2')) state.items[it.id] = fsrs.review(null, fsrs.AGAIN, T0);
    }
    const w1 = select.topicWeight(select.topicMastery(state, bank, days(0.5))['DE.1'].mastery, -1);
    const w2 = select.topicWeight(select.topicMastery(state, bank, days(0.5))['DE.2'].mastery, -1);
    const w3 = select.topicWeight(0, -1);
    assert(w3 > w2 && w2 > w1, `weights should order untouched > shaky > known: ${w3}, ${w2}, ${w1}`);
    assert(select.topicWeight(0.5, 0) < select.topicWeight(0.5, -1), 'a just-drawn topic is damped');
  });

  test('when nothing is due and nothing is new, the weakest item comes back', () => {
    const bank = makeBank().slice(0, 6);
    const state = blankState();
    for (const [i, it] of bank.entries()) {
      let rec = null;
      for (let k = 0; k <= i; k++) rec = fsrs.review(rec, fsrs.GOOD, rec ? rec.due : days(-90));
      state.items[it.id] = { ...rec, due: days(365) };
    }
    const item = select.nextItem(state, bank, { rng: seeded(0), now: T0 });
    const r = (it) => fsrs.retrievability(state.items[it.id], T0);
    const min = Math.min(...bank.map(r));
    assert(r(item) - min < 0.02, `expected a weakest item (R=${min}), got ${item.id} at ${r(item)}`);
  });

  test('a topic filter narrows the draw to that topic', () => {
    const bank = makeBank();
    for (let seed = 0; seed < 10; seed++) {
      const item = select.nextItem(blankState(), bank, { rng: seeded(seed), now: T0, topicFilter: ['DE.2'] });
      assert(select.topicsOf(item)[0] === 'DE.2', `got ${item.id}`);
    }
    assert(select.nextItem(blankState(), bank, { now: T0, topicFilter: ['DE.9'] }) === null,
      'a topic with no items yields nothing');
  });

  test('topic mastery counts unseen items as unknown and reports coverage', () => {
    const bank = makeBank();
    const state = blankState();
    state.items['i-DE.1-0'] = fsrs.review(null, fsrs.GOOD, T0);
    const m = select.topicMastery(state, bank, T0);
    assert(m['DE.1'].n === 6 && m['DE.1'].seen === 1, JSON.stringify(m['DE.1']));
    close(m['DE.1'].mastery, 1 / 6, 1e-9);
    assert(m['DE.2'].mastery === 0 && m['DE.2'].seen === 0, 'untouched topic reads zero');
  });

  test('topicsOf collapses concept ids to topics', () => {
    const t = select.topicsOf({ sol: ['DE.10a', 'DE.10c', 'DE.11b'] });
    assert(t.length === 2 && t.includes('DE.10') && t.includes('DE.11'), JSON.stringify(t));
  });

  // ---- end to end

  test('a simulated learner covers every topic and ends with sane memory state', () => {
    const bank = makeBank();
    const state = blankState();
    const rng = seeded(42);
    let now = T0;
    const seenTopics = new Set();
    for (let day = 0; day < 20; day++) {
      now = days(day);
      const s = sessionLib.start(state, bank, { now, rng });
      while (s.current) {
        seenTopics.add(select.topicsOf(s.current)[0]);
        // Knows DE.1 well, DE.2 half the time, DE.3 poorly.
        const p = { 'DE.1': 0.9, 'DE.2': 0.5, 'DE.3': 0.2 }[select.topicsOf(s.current)[0]];
        const right = rng() < p;
        sessionLib.answer(state, s, right ? s.current.answer : wrongOption(s.current), { now });
        sessionLib.advance(state, s, bank, { now, rng });
      }
      assert(s.asked.length === 10, `day ${day}: session ran short at ${s.asked.length}`);
    }
    assert(seenTopics.size === 3, `topics starved: ${[...seenTopics]}`);
    assert(state.responses === 200, `expected 200 responses, got ${state.responses}`);
    for (const rec of Object.values(state.items)) {
      assert(rec.stability > 0 && rec.difficulty >= 1 && rec.difficulty <= 10, JSON.stringify(rec));
    }
    const m = select.topicMastery(state, bank, now);
    assert(m['DE.1'].mastery > m['DE.3'].mastery,
      `the well-known topic should read stronger: ${m['DE.1'].mastery} vs ${m['DE.3'].mastery}`);
    assert(Object.keys(state.items).length === bank.length, 'every item should have been met by day 20');
  });

  test('pass probability rises with mastery and respects the 7-of-10 rule', () => {
    const bank = makeBank();
    const cold = sessionLib.passProbability(blankState(), bank, T0);
    const warm = blankState();
    for (const it of bank) {
      let rec = null;
      for (let i = 0; i < 4; i++) rec = fsrs.review(rec, fsrs.GOOD, rec ? rec.due : days(-30));
      warm.items[it.id] = rec;
    }
    const hot = sessionLib.passProbability(warm, bank, T0);
    assert(cold < hot, `expected ${cold} < ${hot}`);
    assert(cold >= 0 && hot <= 1, 'probabilities out of range');
    close(sessionLib.binomialAtLeast(10, 7, 1), 1);
    close(sessionLib.binomialAtLeast(10, 7, 0), 0);
    close(sessionLib.binomialAtLeast(10, 7, 0.25), cold, 1e-9);
  });

  test('ordering items are scored on the whole sequence', () => {
    const item = { form: 'ordering', steps: ['a', 'b', 'c'], answerOrder: [0, 1, 2] };
    assert(sessionLib.isCorrect(item, [0, 1, 2]), 'exact order should be correct');
    assert(!sessionLib.isCorrect(item, [0, 2, 1]), 'a transposition should be wrong');
    assert(!sessionLib.isCorrect(item, [0, 1]), 'a short answer should be wrong');
  });

  // ---- store

  test('a v1 profile migrates to per-item memory state without losing its answers', () => {
    const v1 = {
      name: 'Me', created: '2026-08-01T00:00:00.000Z', responses: 3, rating: 1240,
      topics: { 'DE.1': { pL: 0.7 } }, recentTopics: ['DE.1'],
      items: {
        a: { rating: 1100, exposures: 2, lastSeenAt: 1, lastCorrect: true, correct: 1, wrong: 1 },
        b: { rating: 1300, exposures: 1, lastSeenAt: 2, lastCorrect: false, correct: 0, wrong: 1 },
        c: { rating: 1200, exposures: 0, lastSeenAt: null, lastCorrect: null },
      },
      history: [{ at: '2026-08-02' }],
    };
    const v2 = migrate(v1, T0);
    assert(v2.version === STATE_VERSION, `version ${v2.version}`);
    assert(v2.rating === undefined && v2.topics === undefined && v2.recentTopics === undefined,
      'rating-model fields should be dropped');
    assert(v2.responses === 3 && v2.history.length === 1 && v2.name === 'Me', 'counters and history survive');
    assert(v2.settings?.experiment === true, 'settings get their defaults');
    assert(Object.keys(v2.items).length === 2 && !v2.items.c, 'unseen items are not invented');
    assert(fsrs.isDue(v2.items.a, T0) && fsrs.isDue(v2.items.b, T0), 'migrated items are due now');
    assert(v2.items.a.correct === 1 && v2.items.a.wrong === 1, 'answer counts survive');
    assert(v2.items.a.stability > v2.items.b.stability, 'a last-right item is steadier than a last-wrong one');
    assert(migrate(v2, T0) === v2, 'a current profile passes through untouched');
  });

  return results;
}

// ---- fixtures

/** Three topics, six items each; items 4 and 5 of every topic are variants of 0 and 1. */
function makeBank() {
  const bank = [];
  for (const topic of ['DE.1', 'DE.2', 'DE.3']) {
    for (let i = 0; i < 6; i++) {
      bank.push({
        id: `i-${topic}-${i}`,
        concept: `${topic}-c${i < 4 ? i : i - 4}`,
        sol: [`${topic}a`],
        form: 'multiple_choice',
        stem: `${topic} question ${i}`,
        options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: id })),
        answer: 'a',
      });
    }
  }
  return bank;
}

function blankState() {
  return { version: STATE_VERSION, responses: 0, items: {}, history: [], settings: { experiment: true } };
}

function wrongOption(item) {
  return item.options.find((o) => o.id !== item.answer).id;
}

/** Deterministic pseudo-random, so a failure is reproducible. */
function seeded(n) {
  let x = ((n + 1) * 2654435761) % 2147483647;
  return () => {
    x = (x * 48271) % 2147483647;
    return x / 2147483647;
  };
}
