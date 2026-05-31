import crypto from "node:crypto";
import rateLimit, {
  MemoryStore,
  type IncrementResponse,
  type Options,
  type Store,
} from "express-rate-limit";
import { getRedis } from "./redis.js";

type RedisRateLimitStoreOptions = {
  prefix: string;
  windowMs: number;
};

class RedisRateLimitStore implements Store {
  localKeys = false;
  prefix: string;
  private windowMs: number;
  private memory = new MemoryStore();

  constructor(options: RedisRateLimitStoreOptions) {
    this.prefix = options.prefix.endsWith(":") ? options.prefix : `${options.prefix}:`;
    this.windowMs = options.windowMs;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
    this.memory.init(options);
  }

  private key(key: string): string {
    return `${this.prefix}${key}`;
  }

  private resetTimeFromTtl(ttlMs: number): Date {
    return new Date(Date.now() + Math.max(0, ttlMs));
  }

  async get(key: string): Promise<IncrementResponse | undefined> {
    try {
      const redis = getRedis();
      if (!redis) return this.memory.get(key);
      const redisKey = this.key(key);
      const [raw, ttlMs] = await Promise.all([redis.get(redisKey), redis.pttl(redisKey)]);
      if (!raw || ttlMs <= 0) return undefined;
      return {
        totalHits: Math.max(0, Number.parseInt(raw, 10) || 0),
        resetTime: this.resetTimeFromTtl(ttlMs),
      };
    } catch {
      return this.memory.get(key);
    }
  }

  async increment(key: string): Promise<IncrementResponse> {
    try {
      const redis = getRedis();
      if (!redis) return this.memory.increment(key);
      const redisKey = this.key(key);
      const totalHits = await redis.incr(redisKey);
      let ttlMs = await redis.pttl(redisKey);
      if (totalHits === 1 || ttlMs < 0) {
        await redis.pexpire(redisKey, this.windowMs);
        ttlMs = this.windowMs;
      }
      return { totalHits, resetTime: this.resetTimeFromTtl(ttlMs) };
    } catch {
      return this.memory.increment(key);
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      const redis = getRedis();
      if (!redis) return this.memory.decrement(key);
      const redisKey = this.key(key);
      const current = Number.parseInt((await redis.get(redisKey)) ?? "0", 10) || 0;
      if (current > 0) await redis.decr(redisKey);
      return;
    } catch {
      return this.memory.decrement(key);
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      const redis = getRedis();
      if (!redis) return this.memory.resetKey(key);
      await redis.del(this.key(key));
      return;
    } catch {
      return this.memory.resetKey(key);
    }
  }

  async resetAll(): Promise<void> {
    try {
      const redis = getRedis();
      if (!redis) return this.memory.resetAll();
      let cursor = "0";
      do {
        const [nextCursor, keys] = await redis.scan(cursor, "MATCH", `${this.prefix}*`, "COUNT", 100);
        cursor = nextCursor;
        if (keys.length > 0) await redis.del(...keys);
      } while (cursor !== "0");
      return;
    } catch {
      return this.memory.resetAll();
    }
  }

  shutdown(): void {
    this.memory.shutdown();
  }
}

function derivePrefix(options: Partial<Options>, explicitPrefix?: string): string {
  if (explicitPrefix) return explicitPrefix;
  const stack = new Error().stack || "";
  const signature = JSON.stringify({
    stack,
    windowMs: options.windowMs ?? 60_000,
    limit: options.limit ?? options.max ?? 5,
  });
  const hash = crypto.createHash("sha256").update(signature).digest("hex").slice(0, 16);
  return `rl:${hash}:`;
}

export function createRedisRateLimitStore(options: RedisRateLimitStoreOptions): Store {
  return new RedisRateLimitStore(options);
}

export function rateLimitWithRedis(
  options: Partial<Options> & { redisPrefix?: string } = {}
) {
  const { redisPrefix, ...rateLimitOptions } = options;
  const windowMs = rateLimitOptions.windowMs ?? 60_000;
  return rateLimit({
    ...rateLimitOptions,
    windowMs,
    store: createRedisRateLimitStore({
      prefix: derivePrefix(rateLimitOptions, redisPrefix),
      windowMs,
    }),
  });
}

