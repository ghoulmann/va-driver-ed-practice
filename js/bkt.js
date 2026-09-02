// Bayesian Knowledge Tracing -- one mastery probability per SOL topic.
//
// Four parameters, the standard formulation:
//   pL0   prior probability the learner already knows the topic
//   pT    probability of learning it on any given opportunity
//   pSlip probability of answering wrong despite knowing it
//   pGuess probability of answering right without knowing it
//
// pGuess is derived per item from its option count (1/n), not hardcoded: a
// true/false item is guessable half the time, a four-option item a quarter.

export const DEFAULTS = Object.freeze({
  pL0: 0.15,
  pT: 0.12,
  pSlip: 0.10,
  mastery: 0.95,
});

/** Posterior P(knows | observation), before applying the learning transition. */
function posterior(pL, correct, pSlip, pGuess) {
  const num = correct
    ? pL * (1 - pSlip)
    : pL * pSlip;
  const den = correct
    ? pL * (1 - pSlip) + (1 - pL) * pGuess
    : pL * pSlip + (1 - pL) * (1 - pGuess);
  // den is zero only for degenerate parameters (pSlip=0 on a wrong answer with
  // pGuess=1). Fall back to the prior rather than returning NaN.
  return den > 0 ? num / den : pL;
}

/**
 * One BKT update.
 * @param {number} pL      current mastery probability
 * @param {boolean} correct
 * @param {{pT?: number, pSlip?: number, pGuess?: number}} params
 * @returns {number} updated mastery probability
 */
export function update(pL, correct, params = {}) {
  const pT = params.pT ?? DEFAULTS.pT;
  const pSlip = params.pSlip ?? DEFAULTS.pSlip;
  const pGuess = params.pGuess ?? 0.25;
  const post = posterior(clamp(pL), correct, pSlip, pGuess);
  return clamp(post + (1 - post) * pT);
}

/** pGuess for an item, from its option count. Ordering items are not guessable. */
export function guessRate(item) {
  if (item.form === 'ordering') {
    const n = (item.steps || []).length;
    // 1/n! collapses to ~0 fast; floor it so BKT never treats a miss as proof.
    return n > 1 ? Math.max(1 / factorial(n), 0.01) : 0.5;
  }
  const n = (item.options || []).length;
  return n > 0 ? 1 / n : 0.25;
}

export function isMastered(pL, threshold = DEFAULTS.mastery) {
  return pL >= threshold;
}

function factorial(n) {
  let out = 1;
  for (let i = 2; i <= n; i++) out *= i;
  return out;
}

function clamp(p) {
  if (!Number.isFinite(p)) return DEFAULTS.pL0;
  return Math.min(0.999, Math.max(0.001, p));
}
