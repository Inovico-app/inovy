import { logger } from "@/lib/logger";
import {
  AccountLockoutQueries,
  LoginAttemptQueries,
  OrganizationAuthPolicyQueries,
  PasswordHistoryQueries,
} from "@/server/data-access/organization-auth-policy.queries";
import { OrganizationQueries } from "@/server/data-access/organization.queries";
import { err, ok, type Result } from "neverthrow";
import { validatePasswordAgainstPolicy } from "../../features/auth/validation/password-policy";

interface EnforcePasswordPolicyParams {
  password: string;
  userId?: string;
  organizationId: string;
}

interface EnforceLoginPolicyParams {
  email: string;
  userId?: string;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
}

export class AuthPolicyEnforcement {
  static async enforcePasswordPolicy(
    params: EnforcePasswordPolicyParams
  ): Promise<Result<true, string>> {
    const { password, userId, organizationId } = params;

    const policy =
      await OrganizationAuthPolicyQueries.getByOrganizationId(organizationId);

    const validation = validatePasswordAgainstPolicy(password, policy);

    if (!validation.valid) {
      logger.warn("Password validation failed", {
        organizationId,
        userId,
        errors: validation.errors,
      });
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
          logger.warn("Password reused from history", {
            organizationId,
            userId,
            historyCount: policy.passwordHistoryCount,
          });

          return err(
            `Password cannot be one of your last ${policy.passwordHistoryCount} passwords`
          );
        }
      }
    }

    return ok(true);
  }

  static async recordPasswordChange(
    userId: string,
    passwordHash: string,
    organizationId: string
  ): Promise<void> {
    const policy =
      await OrganizationAuthPolicyQueries.getByOrganizationId(organizationId);

    if (policy?.passwordHistoryCount && policy.passwordHistoryCount > 0) {
      await PasswordHistoryQueries.addPasswordHash(userId, passwordHash);

      await PasswordHistoryQueries.cleanupOldPasswords(
        userId,
        policy.passwordHistoryCount
      );

      logger.debug("Password history updated", {
        userId,
        organizationId,
        historyCount: policy.passwordHistoryCount,
      });
    }
  }

  static async enforceLoginPolicy(
    params: EnforceLoginPolicyParams
  ): Promise<Result<true, string>> {
    const { email, userId, organizationId, ipAddress, success } = params;

    if (userId) {
      const lockout = await AccountLockoutQueries.isAccountLocked(userId);

      if (lockout) {
        logger.warn("Login blocked - account locked", {
          userId,
          email,
          lockedUntil: lockout.lockedUntil,
        });

        const minutesRemaining = Math.ceil(
          (lockout.lockedUntil.getTime() - Date.now()) / 60000
        );

        return err(
          `Account is locked. Please try again in ${minutesRemaining} minutes.`
        );
      }
    }

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

    await LoginAttemptQueries.recordAttempt({
      userId,
      email,
      success,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      failureReason: params.failureReason,
    });

    if (!success && userId) {
      const maxAttempts = policy?.maxFailedLoginAttempts ?? 5;
      const lockoutDuration = policy?.lockoutDurationMinutes ?? 30;

      const recentFailedAttempts =
        await LoginAttemptQueries.getRecentFailedAttempts(
          email,
          lockoutDuration
        );

      if (recentFailedAttempts.length >= maxAttempts) {
        await AccountLockoutQueries.lockAccount(
          userId,
          lockoutDuration,
          "Too many failed login attempts"
        );

        logger.warn("Account locked due to failed login attempts", {
          userId,
          email,
          attemptCount: recentFailedAttempts.length,
          maxAttempts,
        });

        return err(
          `Account locked due to too many failed login attempts. Please try again in ${lockoutDuration} minutes.`
        );
      }
    }

    return ok(true);
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

  static async getPasswordPolicyDescription(
    organizationId: string
  ): Promise<string> {
    const policy =
      await OrganizationAuthPolicyQueries.getByOrganizationId(organizationId);

    const requirements: string[] = [];

    const minLength = policy?.passwordMinLength ?? 8;
    requirements.push(`at least ${minLength} characters`);

    if (policy?.passwordRequireUppercase) {
      requirements.push("one uppercase letter");
    }

    if (policy?.passwordRequireLowercase) {
      requirements.push("one lowercase letter");
    }

    if (policy?.passwordRequireNumbers) {
      requirements.push("one number");
    }

    if (policy?.passwordRequireSpecialChars) {
      requirements.push("one special character");
    }

    return `Password must contain ${requirements.join(", ")}.`;
  }
}
