import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const externalApiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "ratelimit:external-api",
});

export const deepgramRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  analytics: true,
  prefix: "ratelimit:deepgram",
});

export const aiProviderRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "ratelimit:ai-provider",
});

export const webhookRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "ratelimit:webhook",
});

export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit = externalApiRateLimit
) {
  const { success, limit, reset, remaining } =
    await limiter.limit(identifier);

  if (!success) {
    throw new Error(
      `Rate limit exceeded. Try again in ${Math.ceil((reset - Date.now()) / 1000)} seconds. Remaining: ${remaining}/${limit}`
    );
  }

  return { success, limit, reset, remaining };
}
