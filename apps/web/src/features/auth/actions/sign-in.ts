"use server";

import { auth } from "@/lib/auth";
import {
  addTimingDelay,
  checkAuthRateLimit,
  getGenericAuthError,
  getIpAddress,
} from "@/lib/auth-security";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import {
  createErrorForNextSafeAction,
  publicActionClient,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { OnboardingService } from "@/server/services/onboarding.service";
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
 * 
 * Security measures:
 * - Rate limiting to prevent brute force attacks
 * - Generic error messages to prevent username enumeration
 * - Timing attack mitigation with consistent response times
 */
export const signInEmailAction = publicActionClient
  .metadata({
    permissions: {},
    name: "sign-in-email",
  })
  .inputSchema(signInEmailSchema)
  .action(async ({ parsedInput }) => {
    const { email, password } = parsedInput;
    const requestHeaders = await headers();
    const ipAddress = getIpAddress(requestHeaders);

    // Check rate limit to prevent brute force attacks
    const rateLimitResult = await checkAuthRateLimit(email, ipAddress);
    if (!rateLimitResult.allowed) {
      // Add timing delay even for rate-limited requests
      await addTimingDelay();
      
      throw createErrorForNextSafeAction(
        ActionErrors.rateLimited(
          "Too many login attempts. Please try again later."
        )
      );
    }

    let signInSuccess = false;
    let isEmailVerificationError = false;

    try {
      await auth.api.signInEmail({
        body: {
          email,
          password,
        },
        headers: requestHeaders,
      });
      signInSuccess = true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sign in";

      // Check if it's an email verification error
      // This is a legitimate different error case that should be handled separately
      if (message.includes("email") && message.includes("verify")) {
        isEmailVerificationError = true;
      }

      // Log failed authentication attempt (without password)
      logger.security.authenticationFailure("Sign-in failed", {
        component: "sign-in",
        email: "[REDACTED]",
        ipAddress: ipAddress ? "[REDACTED]" : undefined,
        isVerificationError: isEmailVerificationError,
      });
    }

    // Add consistent timing delay to mitigate timing attacks
    await addTimingDelay();

    // Handle email verification error separately
    if (isEmailVerificationError) {
      throw createErrorForNextSafeAction(
        ActionErrors.forbidden(
          "Please verify your email address before signing in"
        )
      );
    }

    // If sign-in failed for any other reason, return generic error
    if (!signInSuccess) {
      // Use generic error message to prevent username enumeration
      throw createErrorForNextSafeAction(
        ActionErrors.validation(getGenericAuthError())
      );
    }

    // Ensure onboarding record exists
    try {
      const sessionResult = await getBetterAuthSession();
      if (sessionResult.isOk() && sessionResult.value.user) {
        const user = sessionResult.value.user;
        await OnboardingService.ensureOnboardingRecordExists(
          user.id,
          requestHeaders
        );
      }
    } catch (error) {
      // Log but don't fail sign-in if onboarding creation fails
      logger.error("Failed to ensure onboarding record exists", {
        component: "sign-in",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Always redirect to home page after successful sign-in
    redirect("/");
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
    const { provider } = parsedInput;

    try {
      const result = await auth.api.signInSocial({
        body: {
          provider,
          callbackURL: "/", // Will be handled by home page to check onboarding
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
          ActionErrors.unauthenticated("Passkey authentication failed")
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

