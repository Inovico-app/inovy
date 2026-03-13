import { logger } from "@/lib/logger";

import { createRedisClient, type RedisClient } from "./redis-client.factory";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_SECONDS = 900; // 15 minutes

export interface LockoutResult {
  locked: boolean;
  attemptsRemaining: number;
}

/**
 * Account Lockout Service
 *
 * Implements account lockout after N consecutive failed login attempts.
 * Uses Redis to track failed attempts per email with a sliding TTL window.
 * Fails open (allows login) if Redis is unavailable, logging a warning.
 *
 * ISO 27001:2022 A.8.5 — Secure authentication
 */
export class AccountLockoutService {
  private static instance: AccountLockoutService | null = null;
  private client: RedisClient | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  private init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          this.client = await createRedisClient();
          if (this.client) {
            logger.info("AccountLockoutService initialized", {
              component: "AccountLockoutService",
            });
          }
        } catch (error) {
          this.initPromise = null;
          logger.error("Failed to initialize AccountLockoutService", {
            component: "AccountLockoutService",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })();
    }
    return this.initPromise;
  }

  static getInstance(): AccountLockoutService {
    AccountLockoutService.instance ??= new AccountLockoutService();
    return AccountLockoutService.instance;
  }

  private async getClient(): Promise<RedisClient | null> {
    await this.init();
    return this.client;
  }

  /**
   * Check whether the given email is currently locked out.
   * Returns false (fail open) if Redis is unavailable.
   */
  async isLocked(email: string): Promise<boolean> {
    const client = await this.getClient();

    if (!client) {
      logger.warn(
        "Redis unavailable — skipping lockout check, allowing login",
        { component: "AccountLockoutService", email },
      );
      return false;
    }

    try {
      const lockedKey = `lockout:${email}:locked`;
      const locked = await client.exists(lockedKey);
      return locked > 0;
    } catch (error) {
      logger.warn("Failed to check lockout status, allowing login", {
        component: "AccountLockoutService",
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Record a failed login attempt for the given email.
   * After MAX_FAILED_ATTEMPTS, the account is locked for LOCKOUT_WINDOW_SECONDS.
   * Returns the current lockout state and remaining attempts.
   */
  async recordFailedAttempt(email: string): Promise<LockoutResult> {
    const client = await this.getClient();

    if (!client) {
      logger.warn(
        "Redis unavailable — cannot record failed attempt for account lockout",
        { component: "AccountLockoutService", email },
      );
      return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS };
    }

    try {
      const attemptsKey = `lockout:${email}:attempts`;
      const lockedKey = `lockout:${email}:locked`;

      // Atomically increment attempt counter to prevent race conditions
      const newCount = await client.incr(attemptsKey);

      // Set TTL on first attempt (INCR creates the key if it doesn't exist)
      if (newCount === 1) {
        await client.expire(attemptsKey, LOCKOUT_WINDOW_SECONDS);
      }

      if (newCount >= MAX_FAILED_ATTEMPTS) {
        await client.setex(lockedKey, LOCKOUT_WINDOW_SECONDS, "1");

        logger.warn("Account locked due to too many failed login attempts", {
          component: "AccountLockoutService",
          email,
          attempts: newCount,
          lockoutSeconds: LOCKOUT_WINDOW_SECONDS,
        });

        return { locked: true, attemptsRemaining: 0 };
      }

      const attemptsRemaining = MAX_FAILED_ATTEMPTS - newCount;

      logger.info("Failed login attempt recorded", {
        component: "AccountLockoutService",
        email,
        attempts: newCount,
        attemptsRemaining,
      });

      return { locked: false, attemptsRemaining };
    } catch (error) {
      logger.warn("Failed to record failed attempt for account lockout", {
        component: "AccountLockoutService",
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS };
    }
  }

  /**
   * Reset failed attempt counter after a successful login.
   */
  async resetAttempts(email: string): Promise<void> {
    const client = await this.getClient();

    if (!client) {
      return;
    }

    try {
      const attemptsKey = `lockout:${email}:attempts`;
      const lockedKey = `lockout:${email}:locked`;

      await client.del(attemptsKey);
      await client.del(lockedKey);

      logger.info("Account lockout state reset after successful login", {
        component: "AccountLockoutService",
        email,
      });
    } catch (error) {
      logger.warn("Failed to reset account lockout state", {
        component: "AccountLockoutService",
        email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const accountLockoutService = AccountLockoutService.getInstance();
