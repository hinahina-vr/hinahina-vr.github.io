export class LRUCache {
  constructor(limit = 10) {
    this.limit = limit;
    this.store = new Map();
  }

  get(key) {
    if (!this.store.has(key)) {
      return undefined;
    }
    const value = this.store.get(key);
    this.store.delete(key);
    this.store.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.store.has(key)) {
      this.store.delete(key);
    }
    this.store.set(key, value);
    if (this.store.size > this.limit) {
      const oldestKey = this.store.keys().next().value;
      const oldestValue = this.store.get(oldestKey);
      this.store.delete(oldestKey);
      return { evictedKey: oldestKey, evictedValue: oldestValue };
    }
    return null;
  }

  has(key) {
    return this.store.has(key);
  }

  delete(key) {
    return this.store.delete(key);
  }

  keys() {
    return [...this.store.keys()];
  }
}
