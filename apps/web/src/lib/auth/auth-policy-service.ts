import { logger } from "@/lib/logger";
import {
  AccountLockoutQueries,
  LoginAttemptQueries,
  OrganizationAuthPolicyQueries,
  PasswordHistoryQueries,
  UserMfaQueries,
} from "@/server/data-access/organization-auth-policy.queries";
import { OrganizationQueries } from "@/server/data-access/organization.queries";
import { err, ok, type Result } from "neverthrow";
import { validatePasswordAgainstPolicy } from "../../features/auth/validation/password-policy";

interface ValidatePasswordParams {
  password: string;
  userId?: string;
  organizationId: string;
}

interface CheckLoginAllowedParams {
  email: string;
  organizationId: string;
  ipAddress?: string;
}

interface RecordLoginAttemptParams {
  userId?: string;
  email: string;
  organizationId: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  failureReason?: string;
}

interface CheckMfaRequirementParams {
  userId: string;
  organizationId: string;
}

export class AuthPolicyService {
  static async validatePassword(
    params: ValidatePasswordParams
  ): Promise<Result<true, string>> {
    const { password, userId, organizationId } = params;

    const policy =
      await OrganizationAuthPolicyQueries.getByOrganizationId(organizationId);

    const validation = validatePasswordAgainstPolicy(password, policy);

    if (!validation.valid) {
      return err(validation.errors.join(", "));
    }

    if (userId && policy?.passwordHistoryCount && policy.passwordHistoryCount > 0) {
      const recentPasswords = await PasswordHistoryQueries.getRecentPasswords(
        userId,
        policy.passwordHistoryCount
      );

      const bcrypt = await import("bcryptjs");

      for (const historyEntry of recentPasswords) {
        const isSamePassword = await bcrypt.compare(
          password,
          historyEntry.passwordHash
        );

        if (isSamePassword) {
          return err(
            `Password cannot be one of your last ${policy.passwordHistoryCount} passwords`
          );
        }
      }
    }

    return ok(true);
  }

  static async checkLoginAllowed(
    params: CheckLoginAllowedParams
  ): Promise<Result<true, string>> {
    const { email, organizationId, ipAddress } = params;

    const policy =
      await OrganizationAuthPolicyQueries.getByOrganizationId(organizationId);

    if (policy?.ipWhitelist && policy.ipWhitelist.length > 0 && ipAddress) {
      if (!policy.ipWhitelist.includes(ipAddress)) {
        logger.warn("Login blocked - IP not whitelisted", {
          email,
          ipAddress,
          organizationId,
        });

        return err("Login not allowed from this IP address");
      }
    }

    const maxAttempts = policy?.maxFailedLoginAttempts ?? 5;
    const lockoutDuration = policy?.lockoutDurationMinutes ?? 30;

    const recentFailedAttempts =
      await LoginAttemptQueries.getRecentFailedAttempts(email, lockoutDuration);

    if (recentFailedAttempts.length >= maxAttempts) {
      logger.warn("Login blocked - too many failed attempts", {
        email,
        attemptCount: recentFailedAttempts.length,
        maxAttempts,
      });

      return err(
        `Account temporarily locked due to too many failed login attempts. Please try again later.`
      );
    }

    return ok(true);
  }

  static async recordLoginAttempt(
    params: RecordLoginAttemptParams
  ): Promise<void> {
    await LoginAttemptQueries.recordAttempt({
      userId: params.userId,
      email: params.email,
      success: params.success,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      failureReason: params.failureReason,
    });

    if (!params.success && params.userId) {
      const policy =
        await OrganizationAuthPolicyQueries.getByOrganizationId(
          params.organizationId
        );

      const maxAttempts = policy?.maxFailedLoginAttempts ?? 5;
      const lockoutDuration = policy?.lockoutDurationMinutes ?? 30;

      const recentFailedAttempts =
        await LoginAttemptQueries.getRecentFailedAttempts(
          params.email,
          lockoutDuration
        );

      if (recentFailedAttempts.length >= maxAttempts) {
        await AccountLockoutQueries.lockAccount(
          params.userId,
          lockoutDuration,
          "Too many failed login attempts"
        );

        logger.warn("Account locked due to failed login attempts", {
          userId: params.userId,
          email: params.email,
          attemptCount: recentFailedAttempts.length,
        });
      }
    }
  }

  static async checkMfaRequirement(
    params: CheckMfaRequirementParams
  ): Promise<Result<{ required: boolean; gracePeriodExpired: boolean }, string>> {
    const { userId, organizationId } = params;

    const policy =
      await OrganizationAuthPolicyQueries.getByOrganizationId(organizationId);

    if (!policy?.requireMfa) {
      return ok({ required: false, gracePeriodExpired: false });
    }

    const mfaSettings = await UserMfaQueries.getByUserId(userId);

    if (mfaSettings?.totpEnabled) {
      return ok({ required: true, gracePeriodExpired: false });
    }

    const gracePeriodDays = policy.mfaGracePeriodDays ?? 30;
    const member = await this.getUserOrganizationMember(userId, organizationId);

    if (!member) {
      return err("User is not a member of this organization");
    }

    const memberSince = new Date(member.createdAt);
    const gracePeriodEnd = new Date(
      memberSince.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000
    );
    const gracePeriodExpired = new Date() > gracePeriodEnd;

    return ok({
      required: true,
      gracePeriodExpired,
    });
  }

  private static async getUserOrganizationMember(
    userId: string,
    organizationId: string
  ) {
    const { db } = await import("@/server/db");
    const { members } = await import("@/server/db/schema");
    const { and, eq } = await import("drizzle-orm");

    const [member] = await db
      .select()
      .from(members)
      .where(
        and(eq(members.userId, userId), eq(members.organizationId, organizationId))
      )
      .limit(1);

    return member ?? null;
  }

  static async isAuthMethodAllowed(
    organizationId: string,
    authMethod: string
  ): Promise<boolean> {
    const policy =
      await OrganizationAuthPolicyQueries.getByOrganizationId(organizationId);

    if (!policy?.allowedAuthMethods || policy.allowedAuthMethods.length === 0) {
      return true;
    }

    return policy.allowedAuthMethods.includes(authMethod);
  }

  static async getDefaultAuthPolicy() {
    return {
      requireEmailVerification: true,
      requireMfa: false,
      mfaGracePeriodDays: 30,
      passwordMinLength: 8,
      passwordRequireUppercase: false,
      passwordRequireLowercase: false,
      passwordRequireNumbers: false,
      passwordRequireSpecialChars: false,
      passwordHistoryCount: 0,
      passwordExpirationDays: null,
      sessionTimeoutMinutes: 60 * 24 * 7,
      sessionInactivityTimeoutMinutes: 60 * 24,
      allowedAuthMethods: [
        "email-password",
        "google",
        "microsoft",
        "magic-link",
        "passkey",
      ],
      ipWhitelist: null,
      allowPasswordReset: true,
      maxFailedLoginAttempts: 5,
      lockoutDurationMinutes: 30,
    };
  }
}
