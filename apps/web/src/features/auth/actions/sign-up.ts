"use server";

import { auth } from "@/lib/auth";
import {
  createErrorForNextSafeAction,
  publicActionClient,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { headers } from "next/headers";
import { signUpEmailSchema } from "../validation/auth.schema";

/**
 * Sign up with email and password
 */
export const signUpEmailAction = publicActionClient
  .inputSchema(signUpEmailSchema)
  .action(async ({ parsedInput }) => {
    const { email, password, name } = parsedInput;

    try {
      await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
        },
        headers: await headers(),
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
          ActionErrors.conflict("An account with this email already exists")
        );
      }

      if (message.includes("password")) {
        throw createErrorForNextSafeAction(
          ActionErrors.validation(message, { email, password })
        );
      }

      // Default to validation error
      throw createErrorForNextSafeAction(
        ActionErrors.validation(message, { email })
      );
    }

    // Return success - the hook will handle navigation
    return { success: true };
  });

