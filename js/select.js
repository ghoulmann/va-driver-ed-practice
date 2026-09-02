// Item selection: BKT picks the topic, Elo picks the item within it.
//
// Topic first, because mastery is what the learner is actually trying to move
// and what the report is denominated in. Item second, because within a topic
// the useful question is the one at the edge of what they can do.

import * as elo from './elo.js';
import { isMastered } from './bkt.js';

// Aim slightly above the learner's rating: informative without being punishing.
const TARGET_OFFSET = 50;
// Keep mastered topics in rotation at low weight so retention is checked.
const MASTERED_WEIGHT = 0.05;
// How many other items must intervene before an item can repeat.
const SPACING = { correct: 12, wrong: 4 };

/**
 * @param {object} state    profile state: {topics: {id: {pL}}, items: {id: {rating, exposures, lastSeenAt, lastCorrect}}, rating, responses}
 * @param {Array}  items    the item bank
 * @param {object} opts     {rng, now, topicFilter}
 * @returns {object|null}   the chosen item, or null when nothing is due
 */
export function nextItem(state, items, opts = {}) {
  const rng = opts.rng || Math.random;
  const seen = state.responses || 0;

  const eligible = items.filter((it) => !isSpaced(state, it, seen));
  const pool = eligible.length ? eligible : items;
  if (!pool.length) return null;

  const byTopic = groupByTopic(pool, opts.topicFilter);
  const topics = Object.keys(byTopic);
  if (!topics.length) return null;

  const ordered = topics
    .map((t) => ({ topic: t, weight: topicWeight(state, t) }))
    .sort((a, b) => b.weight - a.weight);

  const chosen = weightedPick(ordered, rng) || ordered[0];
  return pickWithinTopic(state, byTopic[chosen.topic], rng);
}

/** Weight a topic by how much room it has left to learn. */
export function topicWeight(state, topicId) {
  const pL = state.topics?.[topicId]?.pL ?? 0.15;
  if (isMastered(pL)) return MASTERED_WEIGHT;
  // Recency penalty: a topic just drawn from is damped, so one weak topic does
  // not monopolise a session.
  const recent = state.recentTopics || [];
  const idx = recent.indexOf(topicId);
  const damp = idx === -1 ? 1 : 0.35 + 0.65 * (idx / recent.length);
  return Math.max(0.01, (1 - pL) * damp);
}

function pickWithinTopic(state, pool, rng) {
  const learner = state.rating ?? elo.START;
  const target = learner + TARGET_OFFSET;
  let best = null;
  let bestGap = Infinity;
  for (const item of pool) {
    const rating = state.items?.[item.id]?.rating ?? item.difficulty0 ?? elo.START;
    // Unseen items win ties -- new ground beats a re-ask at the same difficulty.
    const unseen = state.items?.[item.id] ? 0 : -1;
    const gap = Math.abs(rating - target) + unseen;
    if (gap < bestGap) {
      best = item;
      bestGap = gap;
    }
  }
  // Break a cluster of near-equal candidates randomly so sessions differ.
  const ties = pool.filter((item) => {
    const rating = state.items?.[item.id]?.rating ?? item.difficulty0 ?? elo.START;
    return Math.abs(Math.abs(rating - target) - bestGap) < 25;
  });
  return ties.length > 1 ? ties[Math.floor(rng() * ties.length)] : best;
}

function isSpaced(state, item, seen) {
  const rec = state.items?.[item.id];
  if (!rec || rec.lastSeenAt == null) return false;
  const window = rec.lastCorrect ? SPACING.correct : SPACING.wrong;
  return seen - rec.lastSeenAt < window;
}

function groupByTopic(items, topicFilter) {
  const out = {};
  for (const item of items) {
    for (const topic of topicsOf(item)) {
      if (topicFilter && !topicFilter.includes(topic)) continue;
      (out[topic] ||= []).push(item);
    }
  }
  return out;
}

/** An item's SOL topics, collapsed from concept ids ("DE.10a" -> "DE.10"). */
export function topicsOf(item) {
  return [...new Set((item.sol || []).map((s) => s.replace(/[a-z]$/, '')))];
}

function weightedPick(weighted, rng) {
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const w of weighted) {
    r -= w.weight;
    if (r <= 0) return w;
  }
  return weighted[weighted.length - 1];
}

export const _internals = { SPACING, TARGET_OFFSET, MASTERED_WEIGHT };
