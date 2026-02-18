import NodeCache from 'node-cache';
import Redis from 'ioredis';

// ─── Cache Provider Interface ────────────────────────────────

/** Abstract cache operations. Both memory and Redis providers implement this. */
export interface CacheProvider {
  /** Retrieve a cached value, or null if missing / expired. */
  get<T>(key: string): Promise<T | null>;

  /** Store a value with a TTL in seconds. */
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;

  /** Remove a single key. */
  delete(key: string): Promise<boolean>;

  /** Check whether a key exists and is not expired. */
  has(key: string): Promise<boolean>;

  /** Remove all keys matching an optional prefix, or everything if omitted. */
  clear(prefix?: string): Promise<void>;
}

// ─── Memory Provider ─────────────────────────────────────────

/** In-process cache backed by node-cache. Suitable for single-instance deploys. */
export class MemoryCacheProvider implements CacheProvider {
  private cache: NodeCache;

  constructor(defaultTtlSeconds = 300) {
    this.cache = new NodeCache({
      stdTTL: defaultTtlSeconds,
      checkperiod: 60,
      useClones: true,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = this.cache.get<T>(key);
    return value === undefined ? null : value;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.cache.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.del(key) > 0;
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async clear(prefix?: string): Promise<void> {
    if (!prefix) {
      this.cache.flushAll();
      return;
    }
    const keys = this.cache.keys().filter((k) => k.startsWith(prefix));
    if (keys.length > 0) {
      this.cache.del(keys);
    }
  }
}

// ─── Redis Provider ──────────────────────────────────────────

/** Redis-backed cache for multi-instance / production deployments. */
export class RedisCacheProvider implements CacheProvider {
  private client: Redis;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      tls: redisUrl.includes('upstash.io') ? {} : undefined, // Enable TLS for Upstash
    });

    this.client.on('error', (err) => {
      console.error('[cache:redis] Connection error:', err.message);
    });

    this.client.connect().catch((err) => {
      console.error('[cache:redis] Failed to connect:', err.message);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async delete(key: string): Promise<boolean> {
    const count = await this.client.del(key);
    return count > 0;
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  async clear(prefix?: string): Promise<void> {
    if (!prefix) {
      await this.client.flushdb();
      return;
    }
    // SCAN to find matching keys, then delete in batch
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } while (cursor !== '0');
  }
}

// ─── Cache Key Helpers ───────────────────────────────────────

/** Build consistent, namespaced cache keys. */
export function buildCacheKey(...parts: string[]): string {
  return parts.join(':');
}

// Predefined key builders
export const CacheKeys = {
  locations: () => buildCacheKey('locations'),
  catalog: (locationId: string) => buildCacheKey('catalog', locationId),
  categories: (locationId: string) => buildCacheKey('categories', locationId),
} as const;

// ─── Factory ─────────────────────────────────────────────────

/** Create the appropriate cache provider based on configuration. */
export function createCacheProvider(
  provider: 'memory' | 'redis',
  ttlSeconds: number,
  redisUrl?: string,
): CacheProvider {
  if (provider === 'redis') {
    if (!redisUrl) {
      throw new Error('REDIS_URL is required when CACHE_PROVIDER=redis');
    }
    return new RedisCacheProvider(redisUrl);
  }
  return new MemoryCacheProvider(ttlSeconds);
}
