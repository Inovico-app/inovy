import { getGoogleRedirectUri } from "@/features/integrations/google/lib/google-oauth";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/integrations/google/callback
 * Handles OAuth callback from Google
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Check for OAuth errors
    if (error) {
      logger.error("Google OAuth error", { error });
      return NextResponse.redirect(
        new URL(
          `/settings?google_error=${encodeURIComponent(error)}`,
          request.url
        )
      );
    }

    if (!code) {
      logger.error("No authorization code received from Google");
      return NextResponse.redirect(
        new URL("/settings?google_error=no_code", request.url)
      );
    }

    // Verify user is authenticated
    const sessionResult = await getBetterAuthSession();

    if (sessionResult.isErr()) {
      logger.error(
        "Failed to get user session in OAuth callback",
        {},
        new Error(sessionResult.error)
      );
      return NextResponse.redirect(
        new URL("/settings?google_error=auth_required", request.url)
      );
    }

    const { user } = sessionResult.value;

    if (!user) {
      return NextResponse.redirect(
        new URL("/settings?google_error=auth_required", request.url)
      );
    }

    let redirectUrl = "/settings?google_success=true";

    // Verify state parameter (CSRF protection)
    if (state) {
      try {
        const stateData = JSON.parse(
          Buffer.from(state, "base64").toString("utf-8")
        );

        if (stateData.userId !== user.id) {
          logger.error("State parameter user ID mismatch", {
            expected: user.id,
            received: stateData.userId,
          });
          return NextResponse.redirect(
            new URL("/settings?google_error=invalid_state", request.url)
          );
        }

        // Check timestamp (valid for 10 minutes)
        const stateAge = Date.now() - stateData.timestamp;
        if (stateAge > 10 * 60 * 1000) {
          logger.error("State parameter expired", { stateAge });
          return NextResponse.redirect(
            new URL("/settings?google_error=state_expired", request.url)
          );
        }

        // Use redirect URL from state if provided
        if (stateData.redirectUrl) {
          redirectUrl = stateData.redirectUrl;
        }
      } catch (stateError) {
        logger.error("Invalid state parameter", {}, stateError as Error);
        return NextResponse.redirect(
          new URL("/settings?google_error=invalid_state", request.url)
        );
      }
    }

    // Use GOOGLE_REDIRECT_URI when set (production), else derive from request (local dev)
    const callbackUrl = getGoogleRedirectUri(request.url);

    // Store OAuth connection (must use same redirect URI as authorization)
    const result = await GoogleOAuthService.storeConnection(
      user.id,
      code,
      callbackUrl
    );

    if (result.isErr()) {
      logger.error("Failed to store Google OAuth connection", {
        userId: user.id,
        error: result.error.message,
      });
      return NextResponse.redirect(
        new URL(
          `/settings?google_error=${encodeURIComponent(result.error.message)}`,
          request.url
        )
      );
    }

    logger.info("Successfully connected Google account", {
      userId: user.id,
      email: result.value.email,
    });

    // If redirecting to onboarding, mark Google Calendar as connected during onboarding
    if (redirectUrl.includes("/onboarding")) {
      const { OnboardingService } =
        await import("@/server/services/onboarding.service");
      const onboardingResult = await OnboardingService.getOnboardingByUserId(
        user.id
      );
      if (onboardingResult.isOk() && onboardingResult.value) {
        const { OnboardingQueries } =
          await import("@/server/data-access/onboarding.queries");
        await OnboardingQueries.updateOnboardingData(
          onboardingResult.value.id,
          {
            googleCalendarConnectedDuringOnboarding: true,
          }
        );
      }
    }

    // Redirect to the specified URL or settings
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    logger.error("Error in Google OAuth callback", {}, error as Error);
    return NextResponse.redirect(
      new URL(
        "/settings?google_error=callback_failed",
        new URL(request.url).origin
      )
    );
  }
}

