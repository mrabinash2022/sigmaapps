/**
 * Simple in-memory TTL cache. Safe for single-process API and mobile app sessions.
 */
export function createTtlCache() {
  const store = new Map();

  function get(key) {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  function set(key, value, ttlMs) {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  function deleteKey(key) {
    store.delete(key);
  }

  async function getOrSet(key, ttlMs, fetcher) {
    const cached = get(key);
    if (cached !== undefined) return cached;
    const value = await fetcher();
    set(key, value, ttlMs);
    return value;
  }

  function invalidatePrefix(prefix) {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  }

  function clear() {
    store.clear();
  }

  return { get, set, delete: deleteKey, getOrSet, invalidatePrefix, clear };
}
