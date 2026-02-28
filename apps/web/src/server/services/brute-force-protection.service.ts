import { logger } from "@/lib/logger";
import { anonymizeEmail } from "@/lib/pii-utils";
import { db } from "@/server/db";
import { accountLockouts, loginAttempts } from "@/server/db/schema/login-attempts";
import { and, eq, gt, gte, lt } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Brute-Force Protection Service
 *
 * Implements protection against brute-force and password attacks:
 * - Tracks failed login attempts
 * - Implements account lockout after excessive failed attempts
 * - Protects against credential stuffing
 *
 * Security Configuration:
 * - MAX_FAILED_ATTEMPTS: Number of failed attempts before lockout (default: 5)
 * - LOCKOUT_DURATION_MINUTES: How long account is locked (default: 15 minutes)
 * - ATTEMPT_WINDOW_MINUTES: Time window to count failed attempts (default: 15 minutes)
 * - CLEANUP_AFTER_DAYS: Days to keep old login attempt records (default: 30)
 */

export interface LoginAttemptInfo {
  identifier: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
}

export interface LockoutInfo {
  isLocked: boolean;
  lockedUntil?: Date;
  failedAttempts: number;
  remainingMinutes?: number;
}

export class BruteForceProtectionService {
  private static instance: BruteForceProtectionService | null = null;

  // Configuration
  private readonly MAX_FAILED_ATTEMPTS = parseInt(
    process.env.MAX_FAILED_LOGIN_ATTEMPTS || "5",
    10
  );
  private readonly LOCKOUT_DURATION_MINUTES = parseInt(
    process.env.LOCKOUT_DURATION_MINUTES || "15",
    10
  );
  private readonly ATTEMPT_WINDOW_MINUTES = parseInt(
    process.env.ATTEMPT_WINDOW_MINUTES || "15",
    10
  );
  private readonly CLEANUP_AFTER_DAYS = parseInt(
    process.env.LOGIN_ATTEMPTS_CLEANUP_DAYS || "30",
    10
  );

  private constructor() {
    logger.info("BruteForceProtectionService initialized", {
      component: "BruteForceProtectionService",
      maxFailedAttempts: this.MAX_FAILED_ATTEMPTS,
      lockoutDurationMinutes: this.LOCKOUT_DURATION_MINUTES,
      attemptWindowMinutes: this.ATTEMPT_WINDOW_MINUTES,
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BruteForceProtectionService {
    BruteForceProtectionService.instance ??= new BruteForceProtectionService();
    return BruteForceProtectionService.instance;
  }

  /**
   * Check if an account is currently locked
   */
  async checkLockout(identifier: string): Promise<LockoutInfo> {
    try {
      const now = new Date();

      // Check for active lockout
      const lockout = await db.query.accountLockouts.findFirst({
        where: and(
          eq(accountLockouts.identifier, identifier),
          gt(accountLockouts.lockedUntil, now)
        ),
      });

      if (lockout) {
        const remainingMs = lockout.lockedUntil.getTime() - now.getTime();
        const remainingMinutes = Math.ceil(remainingMs / 1000 / 60);

        logger.security.suspiciousActivity("Account access attempt while locked", {
          component: "BruteForceProtectionService",
          identifier: this.sanitizeIdentifier(identifier),
          lockedUntil: lockout.lockedUntil.toISOString(),
          remainingMinutes,
          action: "account_locked",
        });

        return {
          isLocked: true,
          lockedUntil: lockout.lockedUntil,
          failedAttempts: lockout.failedAttempts,
          remainingMinutes,
        };
      }

      // Check recent failed attempts even if not locked
      const recentFailedAttempts = await this.getRecentFailedAttempts(identifier);

      return {
        isLocked: false,
        failedAttempts: recentFailedAttempts,
      };
    } catch (error) {
      logger.error("Error checking account lockout", {
        component: "BruteForceProtectionService",
        identifier: this.sanitizeIdentifier(identifier),
        error: error instanceof Error ? error : new Error(String(error)),
      });

      // Fail-open: allow login attempt if check fails
      return {
        isLocked: false,
        failedAttempts: 0,
      };
    }
  }

  /**
   * Record a login attempt (success or failure)
   */
  async recordLoginAttempt(attemptInfo: LoginAttemptInfo): Promise<void> {
    try {
      const attemptId = nanoid();

      // Record the attempt
      await db.insert(loginAttempts).values({
        id: attemptId,
        identifier: attemptInfo.identifier,
        userId: attemptInfo.userId,
        ipAddress: attemptInfo.ipAddress,
        userAgent: attemptInfo.userAgent,
        success: attemptInfo.success ? "true" : "false",
        attemptedAt: new Date(),
      });

      if (attemptInfo.success) {
        // On successful login, clear any existing lockout
        await this.clearLockout(attemptInfo.identifier);

        logger.info("Successful login recorded", {
          component: "BruteForceProtectionService",
          identifier: this.sanitizeIdentifier(attemptInfo.identifier),
          userId: attemptInfo.userId,
          ipAddress: attemptInfo.ipAddress,
          action: "login_success",
        });
      } else {
        // On failed login, check if we need to lock the account
        await this.handleFailedAttempt(attemptInfo);
      }
    } catch (error) {
      logger.error("Error recording login attempt", {
        component: "BruteForceProtectionService",
        identifier: this.sanitizeIdentifier(attemptInfo.identifier),
        success: attemptInfo.success,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Handle a failed login attempt
   */
  private async handleFailedAttempt(attemptInfo: LoginAttemptInfo): Promise<void> {
    const recentFailedAttempts = await this.getRecentFailedAttempts(
      attemptInfo.identifier
    );

    logger.warn("Failed login attempt", {
      component: "BruteForceProtectionService",
      identifier: this.sanitizeIdentifier(attemptInfo.identifier),
      ipAddress: attemptInfo.ipAddress,
      failedAttempts: recentFailedAttempts,
      maxAttempts: this.MAX_FAILED_ATTEMPTS,
      action: "login_failure",
    });

    // Check if we should lock the account
    if (recentFailedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      await this.lockAccount(attemptInfo.identifier, attemptInfo.ipAddress);
    }
  }

  /**
   * Get count of recent failed attempts within the time window
   */
  private async getRecentFailedAttempts(identifier: string): Promise<number> {
    const windowStart = new Date(
      Date.now() - this.ATTEMPT_WINDOW_MINUTES * 60 * 1000
    );

    const attempts = await db.query.loginAttempts.findMany({
      where: and(
        eq(loginAttempts.identifier, identifier),
        eq(loginAttempts.success, "false"),
        gte(loginAttempts.attemptedAt, windowStart)
      ),
    });

    return attempts.length;
  }

  /**
   * Lock an account
   */
  private async lockAccount(identifier: string, ipAddress?: string): Promise<void> {
    const now = new Date();
    const lockedUntil = new Date(
      now.getTime() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000
    );
    const lockoutId = nanoid();

    const failedAttempts = await this.getRecentFailedAttempts(identifier);

    // Delete any existing lockout first
    await db
      .delete(accountLockouts)
      .where(eq(accountLockouts.identifier, identifier));

    // Create new lockout
    await db.insert(accountLockouts).values({
      id: lockoutId,
      identifier,
      lockedAt: now,
      lockedUntil,
      failedAttempts,
      ipAddress,
    });

    logger.security.suspiciousActivity("Account locked due to failed login attempts", {
      component: "BruteForceProtectionService",
      identifier: this.sanitizeIdentifier(identifier),
      failedAttempts,
      lockedUntil: lockedUntil.toISOString(),
      lockoutDurationMinutes: this.LOCKOUT_DURATION_MINUTES,
      ipAddress,
      action: "account_locked",
    });
  }

  /**
   * Clear lockout for an identifier (called after successful login)
   */
  private async clearLockout(identifier: string): Promise<void> {
    const deleted = await db
      .delete(accountLockouts)
      .where(eq(accountLockouts.identifier, identifier));

    if (deleted) {
      logger.info("Lockout cleared after successful login", {
        component: "BruteForceProtectionService",
        identifier: this.sanitizeIdentifier(identifier),
      });
    }
  }

  /**
   * Manually unlock an account (for admin use)
   */
  async unlockAccount(identifier: string): Promise<void> {
    try {
      await db
        .delete(accountLockouts)
        .where(eq(accountLockouts.identifier, identifier));

      logger.info("Account manually unlocked", {
        component: "BruteForceProtectionService",
        identifier: this.sanitizeIdentifier(identifier),
      });
    } catch (error) {
      logger.error("Error unlocking account", {
        component: "BruteForceProtectionService",
        identifier: this.sanitizeIdentifier(identifier),
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * Clean up old login attempt records
   * Should be called periodically (e.g., daily cron job)
   */
  async cleanupOldRecords(): Promise<void> {
    try {
      const cutoffDate = new Date(
        Date.now() - this.CLEANUP_AFTER_DAYS * 24 * 60 * 60 * 1000
      );

      // Delete old login attempts
      const deletedAttempts = await db
        .delete(loginAttempts)
        .where(lt(loginAttempts.attemptedAt, cutoffDate));

      // Delete expired lockouts
      const now = new Date();
      const deletedLockouts = await db
        .delete(accountLockouts)
        .where(lt(accountLockouts.lockedUntil, now));

      logger.info("Cleaned up old login records", {
        component: "BruteForceProtectionService",
        deletedAttempts: deletedAttempts,
        deletedLockouts: deletedLockouts,
        cutoffDate: cutoffDate.toISOString(),
      });
    } catch (error) {
      logger.error("Error cleaning up old login records", {
        component: "BruteForceProtectionService",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Get lockout statistics (for monitoring/admin dashboard)
   */
  async getLockoutStats(): Promise<{
    currentlyLocked: number;
    last24Hours: number;
    last7Days: number;
  }> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const currentlyLocked = await db.query.accountLockouts.findMany({
        where: gt(accountLockouts.lockedUntil, now),
      });

      const last24HoursLockouts = await db.query.accountLockouts.findMany({
        where: gte(accountLockouts.lockedAt, yesterday),
      });

      const last7DaysLockouts = await db.query.accountLockouts.findMany({
        where: gte(accountLockouts.lockedAt, lastWeek),
      });

      return {
        currentlyLocked: currentlyLocked.length,
        last24Hours: last24HoursLockouts.length,
        last7Days: last7DaysLockouts.length,
      };
    } catch (error) {
      logger.error("Error getting lockout stats", {
        component: "BruteForceProtectionService",
        error: error instanceof Error ? error : new Error(String(error)),
      });
      return {
        currentlyLocked: 0,
        last24Hours: 0,
        last7Days: 0,
      };
    }
  }

  /**
   * Sanitize identifier for logging (anonymize email addresses)
   */
  private sanitizeIdentifier(identifier: string): string {
    // Check if it looks like an email
    if (identifier.includes("@")) {
      return anonymizeEmail(identifier);
    }
    return identifier;
  }
}

export const bruteForceProtection = BruteForceProtectionService.getInstance();
