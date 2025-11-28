"use server";

import { auth } from "@/lib/auth";
import {
  createErrorForNextSafeAction,
  publicActionClient,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  signInEmailSchema,
  socialSignInSchema,
} from "../validation/auth.schema";

/**
 * Sign in with email and password
 * Cookies are automatically handled by Better Auth's nextCookies plugin
 */
export const signInEmailAction = publicActionClient
  .inputSchema(signInEmailSchema)
  .action(async ({ parsedInput }) => {
    const { email, password } = parsedInput;

    try {
      await auth.api.signInEmail({
        body: {
          email,
          password,
        },
        headers: await headers(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sign in";

      // Check if it's an email verification error
      if (message.includes("email") && message.includes("verify")) {
        throw createErrorForNextSafeAction(
          ActionErrors.forbidden(
            "Please verify your email address before signing in",
            { email }
          )
        );
      }

      throw createErrorForNextSafeAction(
        ActionErrors.validation(message, { email })
      );
    }

    // Always redirect to home page after successful sign-in
    redirect("/");
  });

/**
 * Get social sign-in URL (returns redirect URL for OAuth flow)
 */
export const getSocialSignInUrlAction = publicActionClient
  .inputSchema(socialSignInSchema)
  .action(async ({ parsedInput }) => {
    const { provider } = parsedInput;

    try {
      const result = await auth.api.signInSocial({
        body: {
          provider,
          callbackURL: "/",
        },
        headers: await headers(),
      });

      // Return the redirect URL for the client to navigate to
      return { url: result.url ?? result.redirect ?? "/" };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to initiate ${provider} sign-in`;
      throw createErrorForNextSafeAction(ActionErrors.internal(message, error));
    }
  });

