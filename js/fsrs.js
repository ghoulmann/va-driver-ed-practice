// Per-item spaced-repetition scheduling: a port of FSRS-4.5.
//
// Each item the learner has answered carries a memory state -- stability (the
// number of days until recall probability falls to 90%) and difficulty (1-10) --
// and a due date derived from them. The scheduler asks for what is due, and the
// dashboard reads mastery off predicted recall, so neither needs a population
// of learners to calibrate against: one learner's own review history is the
// only input. That is the reason this replaced a rating model, which cannot
// learn item difficulty from a single person.
//
// Formulas and default weights follow the FSRS-4.5 algorithm as published by
// the open-spaced-repetition project (MIT licence):
// https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
// The weights are the project's defaults, fitted across many learners; the
// per-learner optimiser is deliberately out of scope here (it needs review
// logs this app does not collect).

export const AGAIN = 1;
export const HARD = 2;
export const GOOD = 3;
export const EASY = 4;

export const DEFAULTS = Object.freeze({
  // Recall probability the schedule aims for at the moment an item comes due.
  retention: 0.9,
  // Days. A long run of easy reviews grows stability geometrically, and a due
  // date has to stay a representable date.
  maxInterval: 36500,
  weights: Object.freeze([
    0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.0310, 1.6474,
    0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.5870, 0.2272, 2.8755,
  ]),
});

const DECAY = -0.5;
// Chosen so that R(S, S) = 0.9: the interval for 90% retention is S itself.
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;
const DAY_MS = 86400000;

/** A record for an item never answered. */
export function newRecord() {
  return {
    stability: null, difficulty: null, due: null, lastReview: null,
    reps: 0, lapses: 0, correct: 0, wrong: 0,
  };
}

/** Days between two ISO timestamps, never negative. */
export function daysBetween(fromISO, toISO) {
  const ms = new Date(toISO).getTime() - new Date(fromISO).getTime();
  return Math.max(0, ms / DAY_MS);
}

/** Probability the learner still recalls this item at `now` (1 if never seen). */
export function retrievability(rec, now = new Date().toISOString()) {
  if (!rec || !rec.lastReview || !rec.stability) return rec?.reps ? 1 : 0;
  const t = daysBetween(rec.lastReview, now);
  return Math.pow(1 + (FACTOR * t) / rec.stability, DECAY);
}

/** Days until recall falls to the target retention. */
export function interval(stability, retention = DEFAULTS.retention) {
  return (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
}

/**
 * Apply one review and return the new record. Pure: the caller stores it.
 * @param {object} rec    an item record (or null for a first review)
 * @param {number} grade  AGAIN | HARD | GOOD | EASY
 */
export function review(rec, grade, now = new Date().toISOString(), params = DEFAULTS) {
  const w = params.weights;
  const prev = rec && rec.reps ? rec : newRecord();
  let stability;
  let difficulty;

  if (!prev.reps) {
    stability = initStability(w, grade);
    difficulty = initDifficulty(w, grade);
  } else {
    const r = retrievability(prev, now);
    difficulty = nextDifficulty(w, prev.difficulty, grade);
    stability = grade === AGAIN
      ? forgetStability(w, prev.difficulty, prev.stability, r)
      : recallStability(w, prev.difficulty, prev.stability, r, grade);
  }
  stability = Math.max(0.1, stability);

  const days = Math.min(params.maxInterval ?? Infinity, interval(stability, params.retention));
  return {
    ...prev,
    stability,
    difficulty,
    lastReview: now,
    due: new Date(new Date(now).getTime() + days * DAY_MS).toISOString(),
    reps: prev.reps + 1,
    lapses: prev.lapses + (grade === AGAIN && prev.reps ? 1 : 0),
    correct: prev.correct + (grade === AGAIN ? 0 : 1),
    wrong: prev.wrong + (grade === AGAIN ? 1 : 0),
  };
}

/** Whether the record is due for review at `now`. Unseen items are never "due". */
export function isDue(rec, now = new Date().toISOString()) {
  return Boolean(rec?.due) && rec.due <= now;
}

function initStability(w, grade) {
  return Math.max(0.1, w[grade - 1]);
}

function initDifficulty(w, grade) {
  return clampD(w[4] - Math.exp(w[5] * (grade - 1)) + 1);
}

function nextDifficulty(w, d, grade) {
  const stepped = d - w[6] * (grade - 3);
  // Mean reversion toward the difficulty a first "easy" would have set, so a
  // run of hard reviews cannot pin an item at 10 forever.
  return clampD(w[7] * initDifficulty(w, EASY) + (1 - w[7]) * stepped);
}

function recallStability(w, d, s, r, grade) {
  const hardPenalty = grade === HARD ? w[15] : 1;
  const easyBonus = grade === EASY ? w[16] : 1;
  return s * (
    Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9])
    * (Math.exp(w[10] * (1 - r)) - 1) * hardPenalty * easyBonus + 1
  );
}

function forgetStability(w, d, s, r) {
  return w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp(w[14] * (1 - r));
}

function clampD(d) {
  return Math.min(10, Math.max(1, d));
}
