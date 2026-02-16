import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryCacheProvider, buildCacheKey, CacheKeys } from '../services/cache.service.js';

describe('MemoryCacheProvider', () => {
  let cache: MemoryCacheProvider;

  beforeEach(() => {
    cache = new MemoryCacheProvider(300);
  });

  describe('get / set', () => {
    it('returns null for a missing key', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('stores and retrieves a string value', async () => {
      await cache.set('key1', 'hello', 60);
      const result = await cache.get<string>('key1');
      expect(result).toBe('hello');
    });

    it('stores and retrieves an object value', async () => {
      const data = { id: '1', name: 'Test Location' };
      await cache.set('loc', data, 60);
      const result = await cache.get<typeof data>('loc');
      expect(result).toEqual(data);
    });

    it('stores and retrieves an array value', async () => {
      const items = [1, 2, 3];
      await cache.set('arr', items, 60);
      const result = await cache.get<number[]>('arr');
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('has', () => {
    it('returns false for a missing key', async () => {
      expect(await cache.has('nope')).toBe(false);
    });

    it('returns true for an existing key', async () => {
      await cache.set('exists', true, 60);
      expect(await cache.has('exists')).toBe(true);
    });
  });

  describe('delete', () => {
    it('returns false when deleting a missing key', async () => {
      expect(await cache.delete('nope')).toBe(false);
    });

    it('removes an existing key and returns true', async () => {
      await cache.set('del-me', 'value', 60);
      expect(await cache.delete('del-me')).toBe(true);
      expect(await cache.get('del-me')).toBeNull();
    });
  });

  describe('clear', () => {
    it('removes all keys when called without a prefix', async () => {
      await cache.set('a', 1, 60);
      await cache.set('b', 2, 60);
      await cache.clear();
      expect(await cache.get('a')).toBeNull();
      expect(await cache.get('b')).toBeNull();
    });

    it('removes only keys matching a prefix', async () => {
      await cache.set('catalog:loc1', 'data1', 60);
      await cache.set('catalog:loc2', 'data2', 60);
      await cache.set('locations', 'data3', 60);

      await cache.clear('catalog:');

      expect(await cache.get('catalog:loc1')).toBeNull();
      expect(await cache.get('catalog:loc2')).toBeNull();
      expect(await cache.get<string>('locations')).toBe('data3');
    });
  });

  describe('TTL expiration', () => {
    it('expires a key after TTL elapses', async () => {
      const shortTtlCache = new MemoryCacheProvider(1);
      await shortTtlCache.set('temp', 'value', 1);

      // Immediately available
      expect(await shortTtlCache.get('temp')).toBe('value');

      // Wait for expiration (node-cache checks in seconds, so 1.1s is sufficient)
      await new Promise((resolve) => setTimeout(resolve, 1_100));
      expect(await shortTtlCache.get('temp')).toBeNull();
    });
  });
});

describe('buildCacheKey', () => {
  it('joins parts with colons', () => {
    expect(buildCacheKey('catalog', 'LOC123')).toBe('catalog:LOC123');
  });

  it('handles single part', () => {
    expect(buildCacheKey('locations')).toBe('locations');
  });
});

describe('CacheKeys helpers', () => {
  it('builds locations key', () => {
    expect(CacheKeys.locations()).toBe('locations');
  });

  it('builds catalog key for a location', () => {
    expect(CacheKeys.catalog('LOC1')).toBe('catalog:LOC1');
  });

  it('builds categories key for a location', () => {
    expect(CacheKeys.categories('LOC1')).toBe('categories:LOC1');
  });
});
