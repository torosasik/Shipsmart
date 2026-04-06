/**
 * Cache service with Redis-ready interface.
 * Falls back to in-memory cache when Redis is not configured.
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';

/** Cache interface for rate quotes and other data */
export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

/** In-memory cache implementation */
class MemoryCache implements CacheProvider {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number = 5 * 60 * 1000): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }
}

/** Redis cache implementation */
class RedisCache implements CacheProvider {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number = 5 * 60 * 1000): Promise<void> {
    const serialized = JSON.stringify(value);
    const ttlSeconds = Math.ceil(ttlMs / 1000);
    await this.redis.setex(key, ttlSeconds, serialized);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async clear(): Promise<void> {
    await this.redis.flushdb();
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.redis.exists(key);
    return exists === 1;
  }
}

/** Cache events */
export interface CacheEvents {
  hit: (key: string) => void;
  miss: (key: string) => void;
  set: (key: string) => void;
  error: (error: Error) => void;
}

/** Cache service with event emitter */
export class CacheService extends EventEmitter implements CacheProvider {
  private provider: CacheProvider;

  constructor() {
    super();
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      try {
        this.provider = new RedisCache(redisUrl);
        console.log('[Cache] Using Redis cache');
      } catch (error) {
        console.warn('[Cache] Failed to initialize Redis, falling back to memory cache:', error);
        this.provider = new MemoryCache();
      }
    } else {
      console.log('[Cache] Using in-memory cache');
      this.provider = new MemoryCache();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.provider.get<T>(key);
      if (value) {
        this.emit('hit', key);
      } else {
        this.emit('miss', key);
      }
      return value;
    } catch (error) {
      this.emit('error', error as Error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      await this.provider.set(key, value, ttlMs);
      this.emit('set', key);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.provider.delete(key);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.provider.clear();
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      return this.provider.has(key);
    } catch (error) {
      this.emit('error', error as Error);
      return false;
    }
  }
}

/** Singleton instance */
export const cacheService = new CacheService();
