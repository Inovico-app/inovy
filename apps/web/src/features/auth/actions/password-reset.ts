"use server";

import { auth } from "@/lib/auth";
import { publicActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
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

    try {
      await auth.api.requestPasswordReset({
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
  .metadata({
    permissions: {},
    name: "reset-password",
  })
  .inputSchema(resetPasswordSchema)
  .action(async ({ parsedInput }) => {
    const { token, password } = parsedInput;

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

