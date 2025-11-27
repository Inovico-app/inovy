"use server";

import { publicActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { betterAuthInstance } from "@/lib/better-auth-server";
import { headers } from "next/headers";
import {
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "../validation/auth.schema";

/**
 * Request password reset email
 */
export const requestPasswordResetAction = publicActionClient
  .inputSchema(requestPasswordResetSchema)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    try {
      await betterAuthInstance.api.requestPasswordReset({
        body: {
          email,
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000"}/reset-password`,
        },
        headers: await headers(),
      });

      return { success: true, message: "Password reset email sent" };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to send password reset email";
      throw ActionErrors.validation(message, { email });
    }
  });

/**
 * Reset password with token
 */
export const resetPasswordAction = publicActionClient
  .inputSchema(resetPasswordSchema)
  .action(async ({ parsedInput }) => {
    const { token, password } = parsedInput;

    try {
      await betterAuthInstance.api.resetPassword({
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

