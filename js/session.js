// A practice session: draw items, record responses, report readiness.
//
// The default length is 10 to mirror the real quiz, which draws 10 and tolerates
// three misses (70% pass mark) -- the fourth wrong answer ends the attempt.

import * as bkt from './bkt.js';
import * as elo from './elo.js';
import { nextItem, topicsOf } from './select.js';

export const QUIZ_LENGTH = 10;
export const QUIZ_ALLOWED_MISSES = 3;

export function start(state, items, { length = QUIZ_LENGTH, topicFilter = null } = {}) {
  return {
    started: new Date().toISOString(),
    length,
    topicFilter,
    asked: [],
    responses: [],
    current: nextItem(state, items, { topicFilter }),
  };
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
 * @returns {{correct: boolean, item: object}}
 */
export function answer(state, session, response) {
  const item = session.current;
  const correct = isCorrect(item, response);

  const rec = state.items[item.id] || {
    rating: item.difficulty0 ?? elo.START,
    exposures: 0, correct: 0, wrong: 0,
  };
  const ratings = elo.update({
    learnerRating: state.rating,
    itemRating: rec.rating,
    correct,
    responses: state.responses,
    exposures: rec.exposures,
  });

  state.rating = ratings.learner;
  state.items[item.id] = {
    ...rec,
    rating: ratings.item,
    exposures: rec.exposures + 1,
    lastSeenAt: state.responses,
    lastCorrect: correct,
    correct: rec.correct + (correct ? 1 : 0),
    wrong: rec.wrong + (correct ? 0 : 1),
  };

  const guess = bkt.guessRate(item);
  for (const topic of topicsOf(item)) {
    const pL = state.topics[topic]?.pL ?? bkt.DEFAULTS.pL0;
    state.topics[topic] = { pL: bkt.update(pL, correct, { pGuess: guess }) };
  }

  state.recentTopics = [...topicsOf(item), ...(state.recentTopics || [])].slice(0, 6);
  state.responses += 1;

  session.asked.push(item.id);
  session.responses.push({ id: item.id, correct, response });
  return { correct, item };
}

export function advance(state, session, items) {
  if (session.responses.length >= session.length) {
    session.current = null;
    session.finished = new Date().toISOString();
    return null;
  }
  const exclude = new Set(session.asked);
  session.current = nextItem(state, items.filter((i) => !exclude.has(i.id)), {
    topicFilter: session.topicFilter,
  });
  if (!session.current) session.finished = new Date().toISOString();
  return session.current;
}

export function score(session) {
  const correct = session.responses.filter((r) => r.correct).length;
  return { correct, total: session.responses.length };
}

/**
 * Estimated probability of passing the real quiz: 10 drawn, 7 or more correct.
 *
 * Per-topic P(correct) = pL*(1-slip) + (1-pL)*guess, weighted by how many items
 * the bank holds for each topic -- the best available proxy for the real draw's
 * topic distribution. Treats the ten draws as independent, which they are not
 * quite (they come from one session's pool without replacement), so read it as
 * a readiness indicator rather than a forecast.
 */
export function passProbability(state, items) {
  const weights = new Map();
  for (const item of items) {
    for (const topic of topicsOf(item)) {
      weights.set(topic, (weights.get(topic) || 0) + 1);
    }
  }
  let total = 0;
  let weighted = 0;
  for (const [topic, weight] of weights) {
    const pL = state.topics?.[topic]?.pL ?? bkt.DEFAULTS.pL0;
    const guess = 0.25;
    const pCorrect = pL * (1 - bkt.DEFAULTS.pSlip) + (1 - pL) * guess;
    weighted += pCorrect * weight;
    total += weight;
  }
  if (!total) return 0;
  const p = weighted / total;
  return binomialAtLeast(QUIZ_LENGTH, QUIZ_LENGTH - QUIZ_ALLOWED_MISSES, p);
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

/** Topics sorted weakest first, for the dashboard and the "what to study" list. */
export function masteryReport(state, taxonomy) {
  return taxonomy.sol.map((topic) => ({
    id: topic.id,
    statement: topic.statement,
    pL: state.topics?.[topic.id]?.pL ?? bkt.DEFAULTS.pL0,
    seen: Object.entries(state.items || {}).length,
  })).sort((a, b) => a.pL - b.pL);
}
