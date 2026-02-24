import { db } from "@/server/db";
import {
  accountLockouts,
  loginAttempts,
  organizationAuthPolicies,
  passwordHistory,
  userMfaSettings,
} from "@/server/db/schema";
import { and, desc, eq, gte } from "drizzle-orm";
import { nanoid } from "nanoid";

interface CreateAuthPolicyParams {
  organizationId: string;
  requireEmailVerification?: boolean;
  requireMfa?: boolean;
  mfaGracePeriodDays?: number;
  passwordMinLength?: number;
  passwordRequireUppercase?: boolean;
  passwordRequireLowercase?: boolean;
  passwordRequireNumbers?: boolean;
  passwordRequireSpecialChars?: boolean;
  passwordHistoryCount?: number;
  passwordExpirationDays?: number;
  sessionTimeoutMinutes?: number;
  sessionInactivityTimeoutMinutes?: number;
  allowedAuthMethods?: string[];
  ipWhitelist?: string[];
  allowPasswordReset?: boolean;
  maxFailedLoginAttempts?: number;
  lockoutDurationMinutes?: number;
  additionalSettings?: Record<string, unknown>;
}

interface UpdateAuthPolicyParams extends Partial<CreateAuthPolicyParams> {
  organizationId: string;
}

export class OrganizationAuthPolicyQueries {
  static async getByOrganizationId(organizationId: string) {
    const [policy] = await db
      .select()
      .from(organizationAuthPolicies)
      .where(eq(organizationAuthPolicies.organizationId, organizationId))
      .limit(1);

    return policy ?? null;
  }

  static async create(params: CreateAuthPolicyParams) {
    const id = nanoid();

    const [policy] = await db
      .insert(organizationAuthPolicies)
      .values({
        id,
        organizationId: params.organizationId,
        requireEmailVerification: params.requireEmailVerification,
        requireMfa: params.requireMfa,
        mfaGracePeriodDays: params.mfaGracePeriodDays,
        passwordMinLength: params.passwordMinLength,
        passwordRequireUppercase: params.passwordRequireUppercase,
        passwordRequireLowercase: params.passwordRequireLowercase,
        passwordRequireNumbers: params.passwordRequireNumbers,
        passwordRequireSpecialChars: params.passwordRequireSpecialChars,
        passwordHistoryCount: params.passwordHistoryCount,
        passwordExpirationDays: params.passwordExpirationDays,
        sessionTimeoutMinutes: params.sessionTimeoutMinutes,
        sessionInactivityTimeoutMinutes: params.sessionInactivityTimeoutMinutes,
        allowedAuthMethods: params.allowedAuthMethods,
        ipWhitelist: params.ipWhitelist,
        allowPasswordReset: params.allowPasswordReset,
        maxFailedLoginAttempts: params.maxFailedLoginAttempts,
        lockoutDurationMinutes: params.lockoutDurationMinutes,
        additionalSettings: params.additionalSettings,
      })
      .returning();

    return policy;
  }

  static async update(params: UpdateAuthPolicyParams) {
    const policy = await this.getByOrganizationId(params.organizationId);
    if (!policy) {
      throw new Error("Organization auth policy not found");
    }

    const updateData: Partial<typeof organizationAuthPolicies.$inferInsert> = {
      ...(params.requireEmailVerification !== undefined && {
        requireEmailVerification: params.requireEmailVerification,
      }),
      ...(params.requireMfa !== undefined && {
        requireMfa: params.requireMfa,
      }),
      ...(params.mfaGracePeriodDays !== undefined && {
        mfaGracePeriodDays: params.mfaGracePeriodDays,
      }),
      ...(params.passwordMinLength !== undefined && {
        passwordMinLength: params.passwordMinLength,
      }),
      ...(params.passwordRequireUppercase !== undefined && {
        passwordRequireUppercase: params.passwordRequireUppercase,
      }),
      ...(params.passwordRequireLowercase !== undefined && {
        passwordRequireLowercase: params.passwordRequireLowercase,
      }),
      ...(params.passwordRequireNumbers !== undefined && {
        passwordRequireNumbers: params.passwordRequireNumbers,
      }),
      ...(params.passwordRequireSpecialChars !== undefined && {
        passwordRequireSpecialChars: params.passwordRequireSpecialChars,
      }),
      ...(params.passwordHistoryCount !== undefined && {
        passwordHistoryCount: params.passwordHistoryCount,
      }),
      ...(params.passwordExpirationDays !== undefined && {
        passwordExpirationDays: params.passwordExpirationDays,
      }),
      ...(params.sessionTimeoutMinutes !== undefined && {
        sessionTimeoutMinutes: params.sessionTimeoutMinutes,
      }),
      ...(params.sessionInactivityTimeoutMinutes !== undefined && {
        sessionInactivityTimeoutMinutes:
          params.sessionInactivityTimeoutMinutes,
      }),
      ...(params.allowedAuthMethods !== undefined && {
        allowedAuthMethods: params.allowedAuthMethods,
      }),
      ...(params.ipWhitelist !== undefined && {
        ipWhitelist: params.ipWhitelist,
      }),
      ...(params.allowPasswordReset !== undefined && {
        allowPasswordReset: params.allowPasswordReset,
      }),
      ...(params.maxFailedLoginAttempts !== undefined && {
        maxFailedLoginAttempts: params.maxFailedLoginAttempts,
      }),
      ...(params.lockoutDurationMinutes !== undefined && {
        lockoutDurationMinutes: params.lockoutDurationMinutes,
      }),
      ...(params.additionalSettings !== undefined && {
        additionalSettings: params.additionalSettings,
      }),
    };

    const [updatedPolicy] = await db
      .update(organizationAuthPolicies)
      .set(updateData)
      .where(eq(organizationAuthPolicies.organizationId, params.organizationId))
      .returning();

    return updatedPolicy;
  }

  static async delete(organizationId: string) {
    await db
      .delete(organizationAuthPolicies)
      .where(eq(organizationAuthPolicies.organizationId, organizationId));
  }

  static async upsert(params: CreateAuthPolicyParams) {
    const existing = await this.getByOrganizationId(params.organizationId);

    if (existing) {
      return this.update(params);
    }

    return this.create(params);
  }
}

export class UserMfaQueries {
  static async getByUserId(userId: string) {
    const [mfaSettings] = await db
      .select()
      .from(userMfaSettings)
      .where(eq(userMfaSettings.userId, userId))
      .limit(1);

    return mfaSettings ?? null;
  }

  static async create(userId: string, totpSecret: string) {
    const id = nanoid();

    const [mfaSettings] = await db
      .insert(userMfaSettings)
      .values({
        id,
        userId,
        totpSecret,
        totpEnabled: false,
        mfaEnrolledAt: null,
      })
      .returning();

    return mfaSettings;
  }

  static async enableTotp(userId: string, backupCodes: string[]) {
    const [mfaSettings] = await db
      .update(userMfaSettings)
      .set({
        totpEnabled: true,
        mfaEnrolledAt: new Date(),
        backupCodes,
      })
      .where(eq(userMfaSettings.userId, userId))
      .returning();

    return mfaSettings;
  }

  static async disableTotp(userId: string) {
    const [mfaSettings] = await db
      .update(userMfaSettings)
      .set({
        totpEnabled: false,
        totpSecret: null,
        backupCodes: null,
        mfaEnrolledAt: null,
      })
      .where(eq(userMfaSettings.userId, userId))
      .returning();

    return mfaSettings;
  }

  static async updateLastVerification(userId: string) {
    await db
      .update(userMfaSettings)
      .set({ lastMfaVerificationAt: new Date() })
      .where(eq(userMfaSettings.userId, userId));
  }

  static async removeBackupCode(userId: string, usedCode: string) {
    const mfaSettings = await this.getByUserId(userId);
    if (!mfaSettings?.backupCodes) return null;

    const updatedCodes = mfaSettings.backupCodes.filter(
      (code) => code !== usedCode
    );

    const [updated] = await db
      .update(userMfaSettings)
      .set({ backupCodes: updatedCodes })
      .where(eq(userMfaSettings.userId, userId))
      .returning();

    return updated;
  }
}

export class PasswordHistoryQueries {
  static async addPasswordHash(userId: string, passwordHash: string) {
    const id = nanoid();

    await db.insert(passwordHistory).values({
      id,
      userId,
      passwordHash,
    });
  }

  static async getRecentPasswords(userId: string, count: number) {
    const passwords = await db
      .select()
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt))
      .limit(count);

    return passwords;
  }

  static async cleanupOldPasswords(userId: string, keepCount: number) {
    const allPasswords = await db
      .select()
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt));

    if (allPasswords.length <= keepCount) return;

    const passwordsToDelete = allPasswords.slice(keepCount);
    const idsToDelete = passwordsToDelete.map((p) => p.id);

    if (idsToDelete.length > 0) {
      await db
        .delete(passwordHistory)
        .where(eq(passwordHistory.userId, userId));

      for (const password of allPasswords.slice(0, keepCount)) {
        await db.insert(passwordHistory).values(password);
      }
    }
  }
}

export class LoginAttemptQueries {
  static async recordAttempt(params: {
    userId?: string;
    email: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    failureReason?: string;
  }) {
    const id = nanoid();

    await db.insert(loginAttempts).values({
      id,
      userId: params.userId,
      email: params.email,
      success: params.success,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      failureReason: params.failureReason,
    });
  }

  static async getRecentFailedAttempts(email: string, withinMinutes: number) {
    const since = new Date(Date.now() - withinMinutes * 60 * 1000);

    const attempts = await db
      .select()
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.email, email),
          eq(loginAttempts.success, false),
          gte(loginAttempts.createdAt, since)
        )
      )
      .orderBy(desc(loginAttempts.createdAt));

    return attempts;
  }

  static async cleanupOldAttempts(daysToKeep: number = 90) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    await db
      .delete(loginAttempts)
      .where(gte(loginAttempts.createdAt, cutoffDate));
  }
}

export class AccountLockoutQueries {
  static async lockAccount(
    userId: string,
    durationMinutes: number,
    reason: string
  ) {
    const id = nanoid();
    const lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

    const [lockout] = await db
      .insert(accountLockouts)
      .values({
        id,
        userId,
        lockedUntil,
        reason,
      })
      .returning();

    return lockout;
  }

  static async isAccountLocked(userId: string) {
    const [lockout] = await db
      .select()
      .from(accountLockouts)
      .where(
        and(
          eq(accountLockouts.userId, userId),
          eq(accountLockouts.unlocked, false),
          gte(accountLockouts.lockedUntil, new Date())
        )
      )
      .orderBy(desc(accountLockouts.lockedAt))
      .limit(1);

    return lockout ?? null;
  }

  static async unlockAccount(userId: string) {
    await db
      .update(accountLockouts)
      .set({
        unlocked: true,
        unlockedAt: new Date(),
      })
      .where(
        and(
          eq(accountLockouts.userId, userId),
          eq(accountLockouts.unlocked, false)
        )
      );
  }

  static async cleanupExpiredLockouts() {
    const now = new Date();
    await db
      .update(accountLockouts)
      .set({
        unlocked: true,
        unlockedAt: now,
      })
      .where(
        and(
          eq(accountLockouts.unlocked, false),
          gte(accountLockouts.lockedUntil, now)
        )
      );
  }
}
