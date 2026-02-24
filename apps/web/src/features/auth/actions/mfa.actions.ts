"use server";

import { MfaUtils } from "@/lib/auth/mfa-utils";
import { logger } from "@/lib/logger";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import {
  OrganizationAuthPolicyQueries,
  UserMfaQueries,
} from "@/server/data-access/organization-auth-policy.queries";
import { err, ok } from "neverthrow";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const enrollMfaSchema = z.object({});

export const enrollMfa = authorizedActionClient
  .inputSchema(enrollMfaSchema)
  .action(async ({ ctx }) => {
    try {
      const userId = ctx.user!.id;
      const userEmail = ctx.user!.email;

      const existingMfa = await UserMfaQueries.getByUserId(userId);

      if (existingMfa?.totpEnabled) {
        return resultToActionResponse(
          err(ActionErrors.validation("MFA is already enabled"))
        );
      }

      const { secret, qrCodeUrl, manualEntryKey } =
        MfaUtils.generateTotpSecret(userEmail);

      if (existingMfa) {
        await UserMfaQueries.disableTotp(userId);
      }

      await UserMfaQueries.create(userId, secret);

      logger.info("MFA enrollment initiated", {
        userId,
      });

      return resultToActionResponse(
        ok({
          secret,
          qrCodeUrl,
          manualEntryKey,
          message: "MFA enrollment initiated. Please verify with your authenticator app.",
        })
      );
    } catch (error) {
      logger.error("Failed to enroll MFA", {
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return resultToActionResponse(
        err(
          ActionErrors.internal(
            error instanceof Error ? error.message : "Failed to enroll MFA",
            error instanceof Error ? error : undefined
          )
        )
      );
    }
  });

const verifyMfaEnrollmentSchema = z.object({
  token: z.string().length(6, "Token must be 6 digits"),
});

export const verifyMfaEnrollment = authorizedActionClient
  .inputSchema(verifyMfaEnrollmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const userId = ctx.user!.id;
      const { token } = parsedInput;

      const mfaSettings = await UserMfaQueries.getByUserId(userId);

      if (!mfaSettings?.totpSecret) {
        return resultToActionResponse(
          err(ActionErrors.validation("MFA enrollment not initiated"))
        );
      }

      if (mfaSettings.totpEnabled) {
        return resultToActionResponse(
          err(ActionErrors.validation("MFA is already enabled"))
        );
      }

      const isValid = MfaUtils.verifyTotpToken(token, mfaSettings.totpSecret);

      if (!isValid) {
        logger.warn("MFA enrollment verification failed - invalid token", {
          userId,
        });

        return resultToActionResponse(
          err(ActionErrors.validation("Invalid verification code"))
        );
      }

      const backupCodes = MfaUtils.generateBackupCodes();
      const hashedBackupCodes = backupCodes.map((code) =>
        MfaUtils.hashBackupCode(code)
      );

      await UserMfaQueries.enableTotp(userId, hashedBackupCodes);

      logger.info("MFA enrollment completed", {
        userId,
      });

      revalidatePath("/settings/security");

      return resultToActionResponse(
        ok({
          backupCodes,
          message: "MFA enabled successfully. Save your backup codes in a safe place.",
        })
      );
    } catch (error) {
      logger.error("Failed to verify MFA enrollment", {
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return resultToActionResponse(
        err(
          ActionErrors.internal(
            error instanceof Error
              ? error.message
              : "Failed to verify MFA enrollment",
            error instanceof Error ? error : undefined
          )
        )
      );
    }
  });

const disableMfaSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const disableMfa = authorizedActionClient
  .inputSchema(disableMfaSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const userId = ctx.user!.id;
      const { password } = parsedInput;

      const mfaSettings = await UserMfaQueries.getByUserId(userId);

      if (!mfaSettings?.totpEnabled) {
        return resultToActionResponse(
          err(ActionErrors.validation("MFA is not enabled"))
        );
      }

      await UserMfaQueries.disableTotp(userId);

      logger.info("MFA disabled", {
        userId,
      });

      revalidatePath("/settings/security");

      return resultToActionResponse(
        ok({
          message: "MFA disabled successfully",
        })
      );
    } catch (error) {
      logger.error("Failed to disable MFA", {
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return resultToActionResponse(
        err(
          ActionErrors.internal(
            error instanceof Error ? error.message : "Failed to disable MFA",
            error instanceof Error ? error : undefined
          )
        )
      );
    }
  });

const verifyMfaTokenSchema = z.object({
  token: z.string().min(6, "Token must be at least 6 characters"),
});

export const verifyMfaToken = authorizedActionClient
  .inputSchema(verifyMfaTokenSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const userId = ctx.user!.id;
      const { token } = parsedInput;

      const mfaSettings = await UserMfaQueries.getByUserId(userId);

      if (!mfaSettings?.totpEnabled || !mfaSettings.totpSecret) {
        return resultToActionResponse(
          err(ActionErrors.validation("MFA is not enabled"))
        );
      }

      let isValid = false;

      if (token.length === 6) {
        isValid = MfaUtils.verifyTotpToken(token, mfaSettings.totpSecret);
      } else if (mfaSettings.backupCodes) {
        isValid = MfaUtils.verifyBackupCode(token, mfaSettings.backupCodes);

        if (isValid) {
          await UserMfaQueries.removeBackupCode(userId, token);
          logger.info("Backup code used for MFA verification", {
            userId,
          });
        }
      }

      if (!isValid) {
        logger.warn("MFA verification failed - invalid token", {
          userId,
        });

        return resultToActionResponse(
          err(ActionErrors.validation("Invalid verification code"))
        );
      }

      await UserMfaQueries.updateLastVerification(userId);

      logger.info("MFA verification successful", {
        userId,
      });

      return resultToActionResponse(
        ok({
          message: "Verification successful",
        })
      );
    } catch (error) {
      logger.error("Failed to verify MFA token", {
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return resultToActionResponse(
        err(
          ActionErrors.internal(
            error instanceof Error
              ? error.message
              : "Failed to verify MFA token",
            error instanceof Error ? error : undefined
          )
        )
      );
    }
  });

const regenerateBackupCodesSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const regenerateBackupCodes = authorizedActionClient
  .inputSchema(regenerateBackupCodesSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const userId = ctx.user!.id;

      const mfaSettings = await UserMfaQueries.getByUserId(userId);

      if (!mfaSettings?.totpEnabled) {
        return resultToActionResponse(
          err(ActionErrors.validation("MFA is not enabled"))
        );
      }

      const backupCodes = MfaUtils.generateBackupCodes();
      const hashedBackupCodes = backupCodes.map((code) =>
        MfaUtils.hashBackupCode(code)
      );

      await UserMfaQueries.enableTotp(userId, hashedBackupCodes);

      logger.info("Backup codes regenerated", {
        userId,
      });

      revalidatePath("/settings/security");

      return resultToActionResponse(
        ok({
          backupCodes,
          message: "Backup codes regenerated successfully. Save them in a safe place.",
        })
      );
    } catch (error) {
      logger.error("Failed to regenerate backup codes", {
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return resultToActionResponse(
        err(
          ActionErrors.internal(
            error instanceof Error
              ? error.message
              : "Failed to regenerate backup codes",
            error instanceof Error ? error : undefined
          )
        )
      );
    }
  });

const getMfaStatusSchema = z.object({});

export const getMfaStatus = authorizedActionClient
  .inputSchema(getMfaStatusSchema)
  .action(async ({ ctx }) => {
    try {
      const userId = ctx.user!.id;

      const mfaSettings = await UserMfaQueries.getByUserId(userId);

      const organizationPolicy =
        await OrganizationAuthPolicyQueries.getByOrganizationId(
          ctx.organizationId!
        );

      return resultToActionResponse(
        ok({
          enabled: mfaSettings?.totpEnabled ?? false,
          required: organizationPolicy?.requireMfa ?? false,
          gracePeriodDays: organizationPolicy?.mfaGracePeriodDays ?? 30,
          enrolledAt: mfaSettings?.mfaEnrolledAt ?? null,
          lastVerificationAt: mfaSettings?.lastMfaVerificationAt ?? null,
        })
      );
    } catch (error) {
      logger.error("Failed to get MFA status", {
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return resultToActionResponse(
        err(
          ActionErrors.internal(
            error instanceof Error
              ? error.message
              : "Failed to get MFA status",
            error instanceof Error ? error : undefined
          )
        )
      );
    }
  });
