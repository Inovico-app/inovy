import { describe, expect, it, vi, beforeEach } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";
import { Ratelimit } from "@upstash/ratelimit";

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    })),
  },
}));

describe("Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkRateLimit", () => {
    it("should allow requests within rate limit", async () => {
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: true,
          limit: 100,
          reset: Date.now() + 60000,
          remaining: 99,
        }),
      } as unknown as Ratelimit;

      const result = await checkRateLimit("test-user", mockLimiter);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it("should throw error when rate limit exceeded", async () => {
      const resetTime = Date.now() + 60000;
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: false,
          limit: 100,
          reset: resetTime,
          remaining: 0,
        }),
      } as unknown as Ratelimit;

      await expect(checkRateLimit("test-user", mockLimiter)).rejects.toThrow(
        /Rate limit exceeded/
      );
    });

    it("should include time until reset in error message", async () => {
      const resetTime = Date.now() + 10000;
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: false,
          limit: 100,
          reset: resetTime,
          remaining: 0,
        }),
      } as unknown as Ratelimit;

      try {
        await checkRateLimit("test-user", mockLimiter);
      } catch (error) {
        expect((error as Error).message).toContain("seconds");
        expect((error as Error).message).toContain("Remaining: 0/100");
      }
    });
  });
});
