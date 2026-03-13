"use server";

import { auth } from "@/lib/auth";
import {
  createErrorForNextSafeAction,
  publicActionClient,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { checkBreachedPassword } from "@/server/services/password-breach-check.service";
import { headers as nextHeaders } from "next/headers";
import { signUpEmailSchema } from "../validation/auth.schema";

/**
 * Sign up with email and password
 */
export const signUpEmailAction = publicActionClient
  .metadata({
    permissions: {},
    name: "sign-up-email",
  })
  .inputSchema(signUpEmailSchema)
  .action(async ({ parsedInput }) => {
    const { email, password, name, callbackUrl } = parsedInput;

    // Check password against known breach databases (HIBP k-anonymity API)
    const breachCount = await checkBreachedPassword(password);
    if (breachCount > 0) {
      throw createErrorForNextSafeAction(
        ActionErrors.validation(
          "This password has been found in a data breach. Please choose a different password.",
          { email },
        ),
      );
    }

    const headers = await nextHeaders();

    try {
      await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
          callbackURL: callbackUrl || "/sign-in",
        },
        headers,
      });
    } catch (error) {
      // Better Auth throws APIError for validation/authentication errors
      const message =
        error instanceof Error ? error.message : "Failed to create account";

      // Check for specific error types
      if (
        message.includes("email") &&
        (message.includes("already") || message.includes("exists"))
      ) {
        throw createErrorForNextSafeAction(
          ActionErrors.conflict("An account with this email already exists"),
        );
      }

      if (message.includes("password")) {
        throw createErrorForNextSafeAction(
          ActionErrors.validation(message, { email }),
        );
      }

      // Default to validation error
      throw createErrorForNextSafeAction(
        ActionErrors.validation(message, { email }),
      );
    }

    // Return success - the hook will handle navigation
    return { success: true };
  });
