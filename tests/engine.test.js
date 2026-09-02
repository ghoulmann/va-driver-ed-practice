// Dependency-free assertions for the adaptive engine.
// Runs in the browser via engine.html, and in node via `node tests/run.mjs`.

import * as bkt from '../js/bkt.js';
import * as elo from '../js/elo.js';
import * as select from '../js/select.js';
import * as sessionLib from '../js/session.js';

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

  // ---- BKT

  test('BKT converges to mastery on a correct streak', () => {
    let p = bkt.DEFAULTS.pL0;
    for (let i = 0; i < 8; i++) p = bkt.update(p, true, { pGuess: 0.25 });
    assert(bkt.isMastered(p), `expected mastery, got ${p}`);
  });

  test('BKT decays on misses', () => {
    const p = 0.9;
    const after = bkt.update(p, false, { pGuess: 0.25 });
    assert(after < p, `expected decay from ${p}, got ${after}`);
  });

  test('BKT is monotone in the observation', () => {
    const p = 0.5;
    assert(bkt.update(p, true, { pGuess: 0.25 }) > bkt.update(p, false, { pGuess: 0.25 }),
      'a correct answer must not lower mastery relative to a wrong one');
  });

  test('BKT stays inside (0,1) under extreme streaks', () => {
    let p = bkt.DEFAULTS.pL0;
    for (let i = 0; i < 200; i++) p = bkt.update(p, false, { pGuess: 0.25 });
    assert(p > 0 && p < 1, `escaped the unit interval: ${p}`);
    for (let i = 0; i < 200; i++) p = bkt.update(p, true, { pGuess: 0.25 });
    assert(p > 0 && p < 1, `escaped the unit interval: ${p}`);
  });

  test('guess rate follows option count', () => {
    close(bkt.guessRate({ options: [1, 2, 3, 4] }), 0.25);
    close(bkt.guessRate({ options: [1, 2] }), 0.5);
    assert(bkt.guessRate({ form: 'ordering', steps: [1, 2, 3, 4] }) < 0.1,
      'an ordering item should be near-unguessable');
  });

  // ---- Elo

  test('Elo expected score is symmetric', () => {
    close(elo.expected(1200, 1200), 0.5);
    close(elo.expected(1400, 1200) + elo.expected(1200, 1400), 1);
  });

  test('Elo moves the learner up on a win and down on a loss', () => {
    const win = elo.update({ learnerRating: 1200, itemRating: 1200, correct: true });
    const loss = elo.update({ learnerRating: 1200, itemRating: 1200, correct: false });
    assert(win.learner > 1200 && win.item < 1200, 'a win should raise the learner and lower the item');
    assert(loss.learner < 1200 && loss.item > 1200, 'a loss should lower the learner and raise the item');
  });

  test('Elo is zero-sum in K-normalised terms', () => {
    const r = elo.update({ learnerRating: 1300, itemRating: 1100, correct: false });
    const learnerDelta = (r.learner - 1300) / elo.learnerK(0);
    const itemDelta = (r.item - 1100) / elo.itemK(0);
    close(learnerDelta, -itemDelta, 1e-9);
  });

  test('Elo K decays with experience', () => {
    assert(elo.learnerK(0) > elo.learnerK(100), 'learner K should decay');
    assert(elo.itemK(0) > elo.itemK(100), 'item K should decay');
  });

  // ---- selection

  const bank = makeBank();

  test('selection never returns an item inside its spacing window', () => {
    const state = blankState();
    state.responses = 5;
    state.items['i-DE.1-0'] = { rating: 1200, exposures: 1, lastSeenAt: 4, lastCorrect: true };
    for (let i = 0; i < 50; i++) {
      const picked = select.nextItem(state, bank, { rng: seeded(i) });
      assert(picked.id !== 'i-DE.1-0', 'returned an item answered one response ago');
    }
  });

  test('selection prefers the weaker topic', () => {
    const state = blankState();
    state.topics['DE.1'] = { pL: 0.99 };
    state.topics['DE.2'] = { pL: 0.05 };
    state.topics['DE.3'] = { pL: 0.99 };
    let weak = 0;
    for (let i = 0; i < 200; i++) {
      const picked = select.nextItem(state, bank, { rng: seeded(i) });
      if (select.topicsOf(picked).includes('DE.2')) weak++;
    }
    assert(weak > 150, `expected the weak topic to dominate, drew it ${weak}/200 times`);
  });

  test('an untouched topic competes with a measured-weak one', () => {
    // pL0 is 0.15, so a topic never drawn from is only slightly stronger than one
    // measured at 0.05. It should share the draw, not be crowded out -- otherwise a
    // learner never reaches the material they have not seen at all.
    const state = blankState();
    state.topics['DE.1'] = { pL: 0.99 };
    state.topics['DE.2'] = { pL: 0.05 };
    let untouched = 0;
    for (let i = 0; i < 200; i++) {
      const picked = select.nextItem(state, bank, { rng: seeded(i) });
      if (select.topicsOf(picked).includes('DE.3')) untouched++;
    }
    assert(untouched > 60 && untouched < 140,
      `unseen topic should share the draw, got ${untouched}/200`);
  });

  test('mastered topics stay in rotation', () => {
    const state = blankState();
    for (const t of ['DE.1', 'DE.2', 'DE.3']) state.topics[t] = { pL: 0.99 };
    let drawn = 0;
    for (let i = 0; i < 100; i++) if (select.nextItem(state, bank, { rng: seeded(i) })) drawn++;
    assert(drawn === 100, 'a fully mastered learner should still be given retention checks');
  });

  test('topicsOf collapses concept ids to topics', () => {
    const topics = select.topicsOf({ sol: ['DE.10a', 'DE.10b', 'DE.6a'] });
    assert(topics.length === 2 && topics.includes('DE.10') && topics.includes('DE.6'),
      `got ${JSON.stringify(topics)}`);
  });

  // ---- session

  test('a simulated learner ends with sane ratings and no topic starvation', () => {
    const state = blankState();
    const session = sessionLib.start(state, bank, { length: 200 });
    let n = 0;
    while (session.current && n < 200) {
      const correct = seeded(n)() < 0.75;
      const item = session.current;
      sessionLib.answer(state, session, correct ? item.answer : wrongOption(item));
      sessionLib.advance(state, session, bank);
      n++;
    }
    assert(n > 0, 'the session never ran');
    assert(state.rating > 800 && state.rating < 2200, `learner rating drifted: ${state.rating}`);
    const touched = Object.keys(state.topics).length;
    assert(touched >= 3, `only ${touched} topic(s) were ever drawn from`);
    for (const rec of Object.values(state.items)) {
      assert(rec.rating > 600 && rec.rating < 1800, `item rating drifted: ${rec.rating}`);
    }
  });

  test('pass probability rises with mastery and respects the 7-of-10 rule', () => {
    const low = blankState();
    const high = blankState();
    for (const t of ['DE.1', 'DE.2', 'DE.3']) high.topics[t] = { pL: 0.98 };
    const pLow = sessionLib.passProbability(low, bank);
    const pHigh = sessionLib.passProbability(high, bank);
    assert(pHigh > pLow, `mastery should raise the estimate: ${pHigh} vs ${pLow}`);
    assert(pLow >= 0 && pHigh <= 1, 'probability outside [0,1]');
    close(sessionLib.binomialAtLeast(10, 7, 1), 1, 1e-9);
    close(sessionLib.binomialAtLeast(10, 7, 0), 0, 1e-9);
  });

  test('ordering items are scored on the whole sequence', () => {
    const item = { form: 'ordering', steps: ['a', 'b', 'c'], answerOrder: [0, 1, 2] };
    assert(sessionLib.isCorrect(item, [0, 1, 2]), 'exact order should be correct');
    assert(!sessionLib.isCorrect(item, [0, 2, 1]), 'a transposition should be wrong');
    assert(!sessionLib.isCorrect(item, [0, 1]), 'a short answer should be wrong');
  });

  return results;
}

// ---- fixtures

function makeBank() {
  const bank = [];
  for (const topic of ['DE.1', 'DE.2', 'DE.3']) {
    for (let i = 0; i < 6; i++) {
      bank.push({
        id: `i-${topic}-${i}`,
        sol: [`${topic}a`],
        form: 'multiple_choice',
        stem: `${topic} question ${i}`,
        options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: id })),
        answer: 'a',
        difficulty0: 1100 + i * 40,
      });
    }
  }
  return bank;
}

function blankState() {
  return { rating: 1200, responses: 0, topics: {}, items: {}, recentTopics: [] };
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
