// Per-profile progress in localStorage.
//
// Every key is prefixed: a project Pages site shares the <user>.github.io
// origin with every other project Pages site that user hosts, so an unprefixed
// key would collide with a neighbour app.
//
// Every read and write is wrapped -- private windows, cleared site data, and
// browsers set to block storage all make these throw rather than return null.

import * as fsrs from './fsrs.js';

const PREFIX = 'nova-study:v1:';
const INDEX = `${PREFIX}profiles`;
const ACTIVE = `${PREFIX}active`;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// Bumped when the shape of a profile changes; `migrate` brings older ones up.
export const STATE_VERSION = 2;

export function emptyState(name) {
  return {
    version: STATE_VERSION,
    name,
    created: new Date().toISOString(),
    responses: 0,
    items: {},         // itemId -> fsrs record (see js/fsrs.js newRecord)
    history: [],       // one entry per completed session
    settings: { experiment: true },  // include items sourced beyond the course
  };
}

/**
 * Bring a stored profile up to the current shape. Returns the same object when
 * nothing needed doing, so callers can save only on change.
 *
 * v1 -> v2: the rating model kept `{rating, exposures, lastSeenAt, lastCorrect}`
 * per item and a mastery probability per topic. The schedule keeps a memory
 * state per item instead. Each answered item is replayed as one review -- Good
 * if the last answer was right, Again if not -- and made due now, so the first
 * session after the upgrade re-checks what the learner had seen rather than
 * pretending to know how well they remember it. Topic state is derived, not
 * stored, so it is simply dropped.
 */
export function migrate(state, now = new Date().toISOString()) {
  if (!state || typeof state !== 'object') return state;
  if ((state.version || 1) >= STATE_VERSION) return state;

  const items = {};
  for (const [id, rec] of Object.entries(state.items || {})) {
    if (!rec || !rec.exposures) continue;
    const grade = rec.lastCorrect ? fsrs.GOOD : fsrs.AGAIN;
    items[id] = {
      ...fsrs.review(null, grade, now),
      due: now,
      correct: rec.correct ?? (rec.lastCorrect ? 1 : 0),
      wrong: rec.wrong ?? (rec.lastCorrect ? 0 : 1),
    };
  }
  const { rating, topics, recentTopics, ...rest } = state;
  return { ...emptyState(state.name), ...rest, version: STATE_VERSION, items };
}

export function listProfiles() {
  return read(INDEX, []);
}

export function activeProfile() {
  const id = read(ACTIVE, null);
  const profiles = listProfiles();
  if (id && profiles.some((p) => p.id === id)) return id;
  return profiles[0]?.id ?? null;
}

export function setActive(id) {
  write(ACTIVE, id);
}

export function createProfile(name) {
  const id = `p${Date.now().toString(36)}`;
  const profiles = listProfiles();
  profiles.push({ id, name });
  write(INDEX, profiles);
  write(PREFIX + id, emptyState(name));
  setActive(id);
  return id;
}

export function load(id) {
  const stored = read(PREFIX + id, null);
  const state = migrate(stored);
  if (state && state !== stored) save(id, state);
  return state;
}

export function save(id, state) {
  return write(PREFIX + id, state);
}

export function remove(id) {
  try {
    localStorage.removeItem(PREFIX + id);
  } catch { /* nothing to clean up if storage is unavailable */ }
  write(INDEX, listProfiles().filter((p) => p.id !== id));
  if (read(ACTIVE, null) === id) write(ACTIVE, listProfiles()[0]?.id ?? null);
}

export function rename(id, name) {
  const profiles = listProfiles().map((p) => (p.id === id ? { ...p, name } : p));
  write(INDEX, profiles);
  const state = load(id);
  if (state) save(id, { ...state, name });
}

/** Whether storage works at all -- the UI warns rather than silently losing progress. */
export function available() {
  try {
    const probe = `${PREFIX}probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function exportProfile(id) {
  const state = load(id);
  if (!state) return null;
  return JSON.stringify({ format: 'nova-study-profile', version: STATE_VERSION, state }, null, 2);
}

export function importProfile(json) {
  const parsed = JSON.parse(json);
  const state = parsed.format === 'nova-study-profile' ? parsed.state : parsed;
  if (!state || typeof state !== 'object' || !state.items) {
    throw new Error('Not a nova-study profile export.');
  }
  const id = createProfile(state.name || 'Imported');
  save(id, migrate({ ...emptyState(state.name || 'Imported'), ...state, version: state.version || 1 }));
  return id;
}
