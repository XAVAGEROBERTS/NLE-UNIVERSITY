// src/utils/dataCache.js - Using localStorage for persistence
class DataCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
    this.loadFromLocalStorage();
  }

  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('appDataCache');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.keys(parsed).forEach(key => {
          this.cache.set(key, parsed[key]);
        });
      }
    } catch (error) {
      console.warn('Could not load cache from localStorage:', error);
    }
  }

  saveToLocalStorage() {
    try {
      const obj = {};
      this.cache.forEach((value, key) => {
        obj[key] = value;
      });
      localStorage.setItem('appDataCache', JSON.stringify(obj));
    } catch (error) {
      console.warn('Could not save cache to localStorage:', error);
    }
  }

  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    this.saveToLocalStorage();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    const isExpired = Date.now() - item.timestamp > item.ttl;
    if (isExpired) {
      this.cache.delete(key);
      this.saveToLocalStorage();
      return null;
    }

    return item.data;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.cache.delete(key);
    this.saveToLocalStorage();
  }

  clear() {
    this.cache.clear();
    this.saveToLocalStorage();
  }

  clearByPrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
    this.saveToLocalStorage();
  }
}

export const dataCache = new DataCache();