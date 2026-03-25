import type * as UpstashRedis from "@upstash/redis";

import { logger } from "@/lib/logger";
import { platform } from "@/lib/platform";

/**
 * Minimal Redis client interface matching the commands used by
 * RedisService and RateLimiterService.
 */
export interface RedisClient {
  get(key: string): Promise<string | number | null>;
  set(key: string, value: string): Promise<unknown>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
  exists(key: string): Promise<number>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  zadd(
    key: string,
    scoreOrOpts: { score: number; member: string },
  ): Promise<unknown>;
  zcard(key: string): Promise<number>;
  zrange(
    key: string,
    start: number,
    stop: number,
    opts?: { withScores: boolean },
  ): Promise<unknown[]>;
  zremrangebyscore(key: string, min: number, max: number): Promise<unknown>;
  expire(key: string, seconds: number): Promise<unknown>;
  incr(key: string): Promise<number>;
  incrbyfloat(key: string, increment: number): Promise<unknown>;
}

let _clientPromise: Promise<RedisClient | null> | null = null;

/**
 * Create a platform-aware Redis client.
 * Returns null if Redis is not configured.
 */
export function createRedisClient(): Promise<RedisClient | null> {
  if (!_clientPromise) {
    _clientPromise =
      platform === "azure"
        ? createIoRedisClient()
        : Promise.resolve(createUpstashClient());
  }
  return _clientPromise;
}

function createUpstashClient(): RedisClient | null {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    logger.warn("Upstash Redis not configured", {
      component: "redis-client.factory",
    });
    return null;
  }

  try {
    const { Redis } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("@upstash/redis") as typeof UpstashRedis;
    const client = new Redis({ url: redisUrl, token: redisToken });

    logger.info("Redis client initialized (Upstash)", {
      component: "redis-client.factory",
    });

    // Upstash Redis is already compatible with our interface
    return client as unknown as RedisClient;
  } catch (error) {
    logger.error("Failed to create Upstash Redis client", {
      component: "redis-client.factory",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function createIoRedisClient(): Promise<RedisClient | null> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn("Azure Redis not configured (REDIS_URL missing)", {
      component: "redis-client.factory",
    });
    return null;
  }

  try {
    const { default: IoRedis } = await import("ioredis");
    const ioredis = new IoRedis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    await ioredis.connect();

    logger.info("Redis client initialized (ioredis)", {
      component: "redis-client.factory",
    });

    // Wrap ioredis to match the Upstash calling conventions
    return {
      get: (key) => ioredis.get(key),
      set: (key, value) => ioredis.set(key, value),
      setex: (key, seconds, value) => ioredis.setex(key, seconds, value),
      del: (key) => ioredis.del(key),
      exists: (key) => ioredis.exists(key),
      mget: (...keys) => ioredis.mget(...keys),

      // Upstash: zadd(key, { score, member })
      // ioredis: zadd(key, score, member)
      zadd: (key, opts) => ioredis.zadd(key, opts.score, opts.member),

      zcard: (key) => ioredis.zcard(key),

      // Upstash: zrange(key, start, stop, { withScores: true })
      // ioredis: zrange(key, start, stop, "WITHSCORES")
      zrange: async (key, start, stop, opts) => {
        if (opts?.withScores) {
          return ioredis.zrange(key, start, stop, "WITHSCORES");
        }
        return ioredis.zrange(key, start, stop);
      },

      zremrangebyscore: (key, min, max) =>
        ioredis.zremrangebyscore(key, min, max),
      expire: (key, seconds) => ioredis.expire(key, seconds),
      incr: (key) => ioredis.incr(key),
      incrbyfloat: (key, increment) => ioredis.incrbyfloat(key, increment),
    };
  } catch (error) {
    logger.error("Failed to create ioredis client", {
      component: "redis-client.factory",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
