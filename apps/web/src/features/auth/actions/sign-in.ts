"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { publicActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { betterAuthInstance } from "@/lib/better-auth";
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
      await betterAuthInstance.api.signInEmail({
        body: {
          email,
          password,
        },
        headers: await headers(),
      });

      // Redirect to home page after successful sign-in
      // Cookies are set automatically by nextCookies plugin
      redirect("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sign in";
      
      // Check if it's an email verification error
      if (message.includes("email") && message.includes("verify")) {
        throw ActionErrors.forbidden(
          "Please verify your email address before signing in",
          { email }
        );
      }

      throw ActionErrors.validation(message, { email });
    }
  });

/**
 * Get social sign-in URL (returns redirect URL for OAuth flow)
 */
export const getSocialSignInUrlAction = publicActionClient
  .inputSchema(socialSignInSchema)
  .action(async ({ parsedInput }) => {
    const { provider } = parsedInput;

    try {
      const result = await betterAuthInstance.api.signInSocial({
        body: {
          provider,
          callbackURL: "/",
        },
        headers: await headers(),
      });

      // Return the redirect URL for the client to navigate to
      return { url: result.url || result.redirect || "/" };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to initiate ${provider} sign-in`;
      throw ActionErrors.internal(message, error);
    }
  });

