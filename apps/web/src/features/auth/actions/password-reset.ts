"use server";

import { auth } from "@/lib/auth";
import {
  addTimingDelay,
  checkAuthRateLimit,
  getGenericResetMessage,
  getIpAddress,
} from "@/lib/auth-security";
import { logger } from "@/lib/logger";
import { publicActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { headers } from "next/headers";
import {
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "../validation/auth.schema";

/**
 * Request password reset email
 * 
 * Security measures:
 * - Rate limiting to prevent abuse
 * - Generic success message regardless of whether email exists
 * - Timing attack mitigation with consistent response times
 * - Better Auth sends emails only to valid accounts without revealing existence
 */
export const requestPasswordResetAction = publicActionClient
  .metadata({
    permissions: {},
    name: "request-password-reset",
  })
  .inputSchema(requestPasswordResetSchema)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;
    const requestHeaders = await headers();
    const ipAddress = getIpAddress(requestHeaders);

    // Check rate limit to prevent abuse
    const rateLimitResult = await checkAuthRateLimit(email, ipAddress);
    if (!rateLimitResult.allowed) {
      // Add timing delay even for rate-limited requests
      await addTimingDelay();
      
      throw ActionErrors.rateLimited(
        "Too many password reset attempts. Please try again later."
      );
    }

    try {
      // Better Auth handles this securely - only sends email if account exists
      // but doesn't reveal whether the account exists in the API response
      await auth.api.requestPasswordReset({
        body: {
          email,
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000"}/reset-password`,
        },
        headers: requestHeaders,
      });
    } catch (error) {
      // Log error but don't reveal it to the user
      logger.error("Password reset request failed", {
        component: "password-reset",
        email: "[REDACTED]",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Add consistent timing delay to mitigate timing attacks
    await addTimingDelay();

    // Always return the same message regardless of whether the email exists
    // This prevents username enumeration attacks
    return { 
      success: true, 
      message: getGenericResetMessage()
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

