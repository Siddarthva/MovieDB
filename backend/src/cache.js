/** Small bounded TTL cache. Mutations call clear(): the catalog is small, so correctness beats granularity. */
export function createCache({ maxEntries = 500, now = () => Date.now() } = {}) {
  const store = new Map();

  return {
    get(key) {
      const item = store.get(key);
      if (!item) return undefined;
      if (now() > item.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return item.value;
    },
    set(key, value, ttlMs) {
      if (store.size >= maxEntries) store.delete(store.keys().next().value);
      store.set(key, { value, expiresAt: now() + ttlMs });
    },
    clear() {
      store.clear();
    },
    get size() {
      return store.size;
    },
    /** Return the cached value or compute, store and return it. Concurrent misses share one load. */
    async wrap(key, ttlMs, load) {
      const hit = this.get(key);
      if (hit !== undefined) return hit;
      const pending = store.get(`pending:${key}`);
      if (pending) return pending.value;
      const promise = load().then(
        (value) => {
          store.delete(`pending:${key}`);
          this.set(key, value, ttlMs);
          return value;
        },
        (error) => {
          store.delete(`pending:${key}`);
          throw error;
        },
      );
      store.set(`pending:${key}`, { value: promise, expiresAt: Infinity });
      return promise;
    },
  };
}
