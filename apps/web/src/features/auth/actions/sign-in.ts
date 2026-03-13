"use server";

import { logger } from "@/lib/logger";
import { auth } from "@/lib/auth";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import {
  createErrorForNextSafeAction,
  publicActionClient,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { OnboardingService } from "@/server/services/onboarding.service";
import { AccountLockoutService } from "@/server/services/account-lockout.service";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  passkeySignInSchema,
  signInEmailSchema,
  socialSignInSchema,
} from "../validation/auth.schema";

/**
 * Sign in with email and password
 * Cookies are automatically handled by Better Auth's nextCookies plugin
 */
export const signInEmailAction = publicActionClient
  .metadata({
    permissions: {},
    name: "sign-in-email",
  })
  .inputSchema(signInEmailSchema)
  .action(async ({ parsedInput }) => {
    const { email, password, redirectTo } = parsedInput;
    const lockoutService = AccountLockoutService.getInstance();

    // Check lockout before attempting authentication (normalize email case)
    const locked = await lockoutService.isLocked(email.toLowerCase());
    if (locked) {
      throw createErrorForNextSafeAction(
        ActionErrors.forbidden(
          "Account temporarily locked due to too many failed attempts. Please try again later.",
          { email },
        ),
      );
    }

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

      // Check if it's an email verification error — do NOT count as failed attempt
      if (message.includes("email") && message.includes("verify")) {
        throw createErrorForNextSafeAction(
          ActionErrors.forbidden(
            "Please verify your email address before signing in",
            { email },
          ),
        );
      }

      // Only record failed attempt for credential-related errors (wrong password),
      // not for network errors or other internal failures
      const isCredentialError =
        message.includes("Invalid") ||
        message.includes("invalid") ||
        message.includes("credentials") ||
        message.includes("password") ||
        message.includes("not found") ||
        message.includes("Incorrect");

      if (isCredentialError) {
        const lockoutResult = await lockoutService.recordFailedAttempt(
          email.toLowerCase(),
        );
        if (lockoutResult.locked) {
          logger.warn("Account locked after too many failed login attempts", {
            component: "signInEmailAction",
            email,
          });
        }
      }

      // SSD-5.2.03: Return a generic error message that does not reveal
      // whether the email exists in the system or not, preventing username enumeration.
      // The original error is logged server-side for debugging.
      logger.auth.loginAttempt({
        email,
        success: false,
        errorType: isCredentialError ? "credential" : "other",
        originalMessage: message,
      });

      const genericMessage = isCredentialError
        ? "Invalid email or password"
        : message;

      throw createErrorForNextSafeAction(
        ActionErrors.validation(genericMessage, { email }),
      );
    }

    // Reset lockout state on successful authentication
    await lockoutService.resetAttempts(email.toLowerCase());

    // Ensure onboarding record exists
    try {
      const sessionResult = await getBetterAuthSession();
      if (sessionResult.isOk() && sessionResult.value.user) {
        const user = sessionResult.value.user;
        const requestHeaders = await headers();
        await OnboardingService.ensureOnboardingRecordExists(
          user.id,
          requestHeaders,
        );
      }
    } catch (error) {
      // Log but don't fail sign-in if onboarding creation fails
      console.error("Failed to ensure onboarding record exists:", error);
    }

    redirect((redirectTo || "/") as "/");
  });

/**
 * Get social sign-in URL (returns redirect URL for OAuth flow)
 */
export const getSocialSignInUrlAction = publicActionClient
  .metadata({
    permissions: {},
    name: "get-social-sign-in-url",
  })
  .inputSchema(socialSignInSchema)
  .action(async ({ parsedInput }) => {
    const { provider, callbackUrl } = parsedInput;

    try {
      const result = await auth.api.signInSocial({
        body: {
          provider,
          callbackURL: callbackUrl || "/",
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

/**
 * Passkey sign-in success handler
 * This action is called after successful client-side passkey authentication
 * to handle server-side redirect logic
 */
export const passkeySignInSuccessAction = publicActionClient
  .metadata({
    permissions: {},
    name: "passkey-sign-in-success",
  })
  .inputSchema(passkeySignInSchema)
  .action(async () => {
    // Verify the user is authenticated after passkey sign-in
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        throw createErrorForNextSafeAction(
          ActionErrors.unauthenticated("Passkey authentication failed"),
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to verify passkey authentication";
      throw createErrorForNextSafeAction(ActionErrors.internal(message, error));
    }

    // Redirect to home page after successful sign-in
    // This is outside the try/catch to avoid catching Next.js's NEXT_REDIRECT error
    redirect("/");
  });
