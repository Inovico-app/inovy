"use server";

import { auth } from "@/lib/auth";
import {
  createErrorForNextSafeAction,
  publicActionClient,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { checkBreachedPassword } from "@/server/services/password-breach-check.service";
import { headers } from "next/headers";
import {
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "../validation/auth.schema";

/**
 * Request password reset email
 */
export const requestPasswordResetAction = publicActionClient
  .metadata({
    permissions: {},
    name: "request-password-reset",
  })
  .inputSchema(requestPasswordResetSchema)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    // SSD-5.2.03: Always return the same response regardless of whether
    // the email exists, to prevent username enumeration during password reset.
    try {
      await auth.api.requestPasswordReset({
        body: {
          email,
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000"}/reset-password`,
        },
        headers: await headers(),
      });
    } catch {
      // Silently swallow errors — do not reveal whether the email exists
    }

    return {
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    };
  });

/**
 * Reset password with token
 */
export const resetPasswordAction = publicActionClient
  .metadata({
    permissions: {},
    name: "reset-password",
  })
  .inputSchema(resetPasswordSchema)
  .action(async ({ parsedInput }) => {
    const { token, password } = parsedInput;

    // Check password against known breach databases (HIBP k-anonymity API)
    const breachCount = await checkBreachedPassword(password);
    if (breachCount > 0) {
      throw createErrorForNextSafeAction(
        ActionErrors.validation(
          "This password has been found in a data breach. Please choose a different password.",
          { token },
        ),
      );
    }

    try {
      await auth.api.resetPassword({
        body: {
          token,
          newPassword: password,
        },
        headers: await headers(),
      });

      return { success: true, message: "Password reset successfully" };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reset password";
      throw ActionErrors.validation(message, { token });
    }
  });
