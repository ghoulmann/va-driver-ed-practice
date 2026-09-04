// Item selection: what is due, then what is new, then what is weakest.
//
// The schedule (fsrs.js) decides when an item should come back; this module
// only decides what to show next given that schedule. Three tiers, in order:
//
//   1. Reviews that are due, least likely to be recalled first.
//   2. Items never seen, from the topic with the most room to learn -- so an
//      untouched topic beats a half-learned one, and a session does not drill
//      one topic to exhaustion.
//   3. Reviews not yet due, least likely to be recalled first. A session always
//      fills to its length, so this tier is what keeps it going once the bank is
//      caught up; the repeats it produces are the weakest items, spaced by the
//      schedule rather than by luck.
//
// Within one session an item is never asked twice, and neither are two items
// that share a `concept` -- variants exist so a concept can be re-tested
// without re-asking a question, not so it can be asked twice in a row.

import { retrievability, isDue } from './fsrs.js';

// A topic just drawn from is damped, so one weak topic does not monopolise.
const RECENT = 4;

/**
 * @param {object} state  profile state: {items: {id: fsrs record}}
 * @param {Array}  items  the item bank
 * @param {object} opts   {rng, now, topicFilter, exclude: [ids asked this session]}
 * @returns {object|null} the chosen item, or null when nothing remains
 */
export function nextItem(state, items, opts = {}) {
  const rng = opts.rng || Math.random;
  const now = opts.now || new Date().toISOString();
  const askedIds = new Set(opts.exclude || []);
  const asked = items.filter((it) => askedIds.has(it.id));
  const askedConcepts = new Set(asked.map((it) => it.concept).filter(Boolean));

  const pool = items.filter((it) =>
    !askedIds.has(it.id)
    && !(it.concept && askedConcepts.has(it.concept))
    && (!opts.topicFilter || topicsOf(it).some((t) => opts.topicFilter.includes(t))));
  if (!pool.length) return null;

  const rec = (it) => state.items?.[it.id];
  const due = pool.filter((it) => isDue(rec(it), now));
  if (due.length) return weakest(due, rec, now, rng);

  const fresh = pool.filter((it) => !rec(it)?.reps);
  if (fresh.length) return pickNew(state, items, fresh, asked, rng, now);

  return weakest(pool, rec, now, rng);
}

/** Lowest retrievability first; near-ties broken randomly so sessions differ. */
function weakest(candidates, rec, now, rng) {
  const scored = candidates.map((it) => ({ it, r: retrievability(rec(it), now) }));
  const min = Math.min(...scored.map((s) => s.r));
  const ties = scored.filter((s) => s.r - min < 0.02);
  return ties[Math.floor(rng() * ties.length)].it;
}

function pickNew(state, items, fresh, asked, rng, now) {
  const mastery = topicMastery(state, items, now);
  const recent = asked.slice(-RECENT).flatMap(topicsOf);
  const byTopic = {};
  for (const it of fresh) {
    for (const topic of topicsOf(it)) (byTopic[topic] ||= []).push(it);
  }
  const weighted = Object.keys(byTopic).map((topic) => ({
    topic,
    weight: topicWeight(mastery[topic]?.mastery ?? 0, recent.indexOf(topic)),
  }));
  const chosen = weightedPick(weighted, rng);
  const candidates = byTopic[chosen.topic];
  // A concept the learner has never met beats a variant of one they have.
  const byId = new Map(items.map((it) => [it.id, it]));
  const known = new Set(Object.keys(state.items || {})
    .map((id) => byId.get(id)?.concept).filter(Boolean));
  const unknown = candidates.filter((it) => !it.concept || !known.has(it.concept));
  const from = unknown.length ? unknown : candidates;
  return from[Math.floor(rng() * from.length)];
}

/** Room left to learn, damped when the topic was just drawn from. */
export function topicWeight(mastery, recentIdx) {
  const damp = recentIdx === -1 ? 1 : 0.35 + 0.65 * (recentIdx / RECENT);
  return Math.max(0.01, (1 - mastery) * damp);
}

/**
 * Predicted recall per topic, averaged over the bank's items for that topic.
 * An unseen item counts as zero, so a topic the bank barely covers reads thin
 * rather than mastered after one lucky answer.
 * @returns {Object<string, {mastery: number, n: number, seen: number}>}
 */
export function topicMastery(state, items, now = new Date().toISOString()) {
  const out = {};
  for (const it of items) {
    const rec = state.items?.[it.id];
    const r = rec?.reps ? retrievability(rec, now) : 0;
    for (const topic of topicsOf(it)) {
      const t = (out[topic] ||= { sum: 0, n: 0, seen: 0 });
      t.sum += r;
      t.n += 1;
      t.seen += rec?.reps ? 1 : 0;
    }
  }
  for (const t of Object.values(out)) {
    t.mastery = t.n ? t.sum / t.n : 0;
    delete t.sum;
  }
  return out;
}

/** An item's SOL topics, collapsed from concept ids ("DE.10a" -> "DE.10"). */
export function topicsOf(item) {
  return [...new Set((item.sol || []).map((s) => s.replace(/[a-z]$/, '')))];
}

function weightedPick(weighted, rng) {
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let r = rng() * total;
  for (const w of weighted) {
    r -= w.weight;
    if (r <= 0) return w;
  }
  return weighted[weighted.length - 1];
}

export const _internals = { RECENT };
