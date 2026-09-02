// Per-profile progress in localStorage.
//
// Every key is prefixed: a project Pages site shares the <user>.github.io
// origin with every other project Pages site that user hosts, so an unprefixed
// key would collide with a neighbour app.
//
// Every read and write is wrapped -- private windows, cleared site data, and
// browsers set to block storage all make these throw rather than return null.

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

export function emptyState(name) {
  return {
    name,
    created: new Date().toISOString(),
    rating: 1200,
    responses: 0,
    topics: {},        // topicId -> {pL}
    items: {},         // itemId  -> {rating, exposures, lastSeenAt, lastCorrect, correct, wrong}
    recentTopics: [],
    history: [],       // one entry per completed session
  };
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
  return read(PREFIX + id, null);
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
  return JSON.stringify({ format: 'nova-study-profile', version: 1, state }, null, 2);
}

export function importProfile(json) {
  const parsed = JSON.parse(json);
  const state = parsed.format === 'nova-study-profile' ? parsed.state : parsed;
  if (!state || typeof state !== 'object' || !state.topics || !state.items) {
    throw new Error('Not a nova-study profile export.');
  }
  const id = createProfile(state.name || 'Imported');
  save(id, { ...emptyState(state.name || 'Imported'), ...state });
  return id;
}
