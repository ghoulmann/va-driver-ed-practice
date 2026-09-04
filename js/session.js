// A practice session: draw items, record responses, report readiness.
//
// The default length is 10 to mirror the real quiz, which draws 10 and tolerates
// three misses (70% pass mark) -- the fourth wrong answer ends the attempt.

import * as fsrs from './fsrs.js';
import { nextItem, topicsOf, topicMastery } from './select.js';

export const QUIZ_LENGTH = 10;
export const QUIZ_ALLOWED_MISSES = 3;

export function start(state, items, { length = QUIZ_LENGTH, topicFilter = null, now, rng } = {}) {
  const session = {
    started: now || new Date().toISOString(),
    length,
    topicFilter,
    asked: [],
    responses: [],
    current: null,
  };
  session.current = nextItem(state, items, { topicFilter, now, rng });
  return session;
}

/** Is the given response correct for this item? */
export function isCorrect(item, response) {
  if (item.form === 'ordering') {
    const key = item.answerOrder || (item.steps || []).map((_, i) => i);
    return Array.isArray(response) && response.length === key.length
      && response.every((v, i) => v === key[i]);
  }
  return response === item.answer;
}

/**
 * Record an answer, mutating the profile state and the session in place.
 *
 * The app has no self-rating step, so the four FSRS grades collapse to two:
 * wrong is Again, right is Good. Hard and Easy would need the learner to say
 * how it felt, and a sixteen-year-old with a quiz to pass will not.
 * @returns {{correct: boolean, item: object}}
 */
export function answer(state, session, response, { now } = {}) {
  const item = session.current;
  const correct = isCorrect(item, response);
  const at = now || new Date().toISOString();

  state.items[item.id] = fsrs.review(state.items[item.id], correct ? fsrs.GOOD : fsrs.AGAIN, at);
  state.responses += 1;

  session.asked.push(item.id);
  session.responses.push({ id: item.id, correct, response });
  return { correct, item };
}

export function advance(state, session, items, { now, rng } = {}) {
  if (session.responses.length >= session.length) {
    session.current = null;
    session.finished = now || new Date().toISOString();
    return null;
  }
  session.current = nextItem(state, items, {
    topicFilter: session.topicFilter,
    exclude: session.asked,
    now,
    rng,
  });
  if (!session.current) session.finished = now || new Date().toISOString();
  return session.current;
}

export function score(session) {
  const correct = session.responses.filter((r) => r.correct).length;
  return { correct, total: session.responses.length };
}

/** Chance of a right answer with no knowledge at all. */
export function guessRate(item) {
  if (item.form === 'ordering') {
    const n = (item.steps || []).length;
    return Math.max(1 / factorial(n), 0.01);
  }
  const n = (item.options || []).length;
  return n ? 1 / n : 0.25;
}

/**
 * Estimated probability of passing the real quiz: 10 drawn, 7 or more correct.
 *
 * Per item, P(correct) is predicted recall for an item the learner has seen and
 * the guess rate for one they have not, counted once per topic the item is
 * tagged with -- so the bank's own topic distribution weights the estimate, the
 * best available proxy for the real draw's. Treats the ten draws as independent,
 * which they are not quite, so read it as a readiness indicator, not a forecast.
 */
export function passProbability(state, items, now = new Date().toISOString()) {
  let total = 0;
  let weighted = 0;
  for (const item of items) {
    const rec = state.items?.[item.id];
    const guess = guessRate(item);
    const p = rec?.reps
      ? guess + (1 - guess) * fsrs.retrievability(rec, now)
      : guess;
    const k = topicsOf(item).length;
    weighted += p * k;
    total += k;
  }
  if (!total) return 0;
  return binomialAtLeast(QUIZ_LENGTH, QUIZ_LENGTH - QUIZ_ALLOWED_MISSES, weighted / total);
}

/** P(X >= k) for X ~ Binomial(n, p). */
export function binomialAtLeast(n, k, p) {
  let sum = 0;
  for (let i = k; i <= n; i++) {
    sum += choose(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i);
  }
  return sum;
}

function choose(n, k) {
  let out = 1;
  for (let i = 1; i <= k; i++) out = (out * (n - k + i)) / i;
  return out;
}

function factorial(n) {
  let out = 1;
  for (let i = 2; i <= n; i++) out *= i;
  return out;
}

/**
 * Topics sorted weakest first, for the dashboard and the "what to study" list.
 * `n` and `seen` travel with the number so a one-item topic reads as thin
 * coverage, not as a verdict on the learner.
 */
export function masteryReport(state, items, taxonomy, now = new Date().toISOString()) {
  const mastery = topicMastery(state, items, now);
  return taxonomy.sol.map((topic) => ({
    id: topic.id,
    statement: topic.statement,
    mastery: mastery[topic.id]?.mastery ?? 0,
    n: mastery[topic.id]?.n ?? 0,
    seen: mastery[topic.id]?.seen ?? 0,
  })).sort((a, b) => a.mastery - b.mastery);
}
