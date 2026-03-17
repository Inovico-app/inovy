import { getMicrosoftRedirectUri } from "@/features/integrations/microsoft/lib/microsoft-oauth";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { CacheInvalidation } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { MicrosoftOAuthService } from "@/server/services/microsoft-oauth.service";
import { type NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";

const SAFE_REDIRECT_FALLBACK = "/settings?microsoft_success=true";

function validateRedirectUrl(redirectUrl: string, requestUrl: string): string {
  try {
    const resolved = new URL(redirectUrl, requestUrl);
    const origin = new URL(requestUrl).origin;

    if (resolved.origin !== origin) {
      logger.warn(
        "Rejected off-origin redirect URL in Microsoft OAuth callback",
        {
          redirectUrl,
          resolvedOrigin: resolved.origin,
          expectedOrigin: origin,
        },
      );
      return SAFE_REDIRECT_FALLBACK;
    }

    return redirectUrl;
  } catch {
    return SAFE_REDIRECT_FALLBACK;
  }
}

/**
 * GET /api/integrations/microsoft/callback
 * Handles OAuth callback from Microsoft
 */
export async function GET(request: NextRequest) {
  await connection();
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Check for OAuth errors
    if (error) {
      logger.error("Microsoft OAuth error", { error });
      return NextResponse.redirect(
        new URL(
          `/settings?microsoft_error=${encodeURIComponent(error)}`,
          request.url,
        ),
      );
    }

    if (!code) {
      logger.error("No authorization code received from Microsoft");
      return NextResponse.redirect(
        new URL("/settings?microsoft_error=no_code", request.url),
      );
    }

    // Verify user is authenticated
    const sessionResult = await getBetterAuthSession();

    if (sessionResult.isErr()) {
      logger.error(
        "Failed to get user session in Microsoft OAuth callback",
        {},
        new Error(sessionResult.error),
      );
      return NextResponse.redirect(
        new URL("/settings?microsoft_error=auth_required", request.url),
      );
    }

    const { user } = sessionResult.value;

    if (!user) {
      return NextResponse.redirect(
        new URL("/settings?microsoft_error=auth_required", request.url),
      );
    }

    let redirectUrl = SAFE_REDIRECT_FALLBACK;

    // Verify state parameter (CSRF protection)
    if (state) {
      try {
        const stateData = JSON.parse(
          Buffer.from(state, "base64").toString("utf-8"),
        );

        if (stateData.userId !== user.id) {
          logger.error("State parameter user ID mismatch", {
            expected: user.id,
            received: stateData.userId,
          });
          return NextResponse.redirect(
            new URL("/settings?microsoft_error=invalid_state", request.url),
          );
        }

        // Check timestamp (valid for 10 minutes)
        const stateAge = Date.now() - stateData.timestamp;
        if (stateAge > 10 * 60 * 1000) {
          logger.error("State parameter expired", { stateAge });
          return NextResponse.redirect(
            new URL("/settings?microsoft_error=state_expired", request.url),
          );
        }

        if (stateData.redirectUrl) {
          redirectUrl = validateRedirectUrl(stateData.redirectUrl, request.url);
        }
      } catch (stateError) {
        logger.error("Invalid state parameter", {}, stateError as Error);
        return NextResponse.redirect(
          new URL("/settings?microsoft_error=invalid_state", request.url),
        );
      }
    }

    // Use MICROSOFT_REDIRECT_URI when set (production), else derive from request (local dev)
    const callbackUrl = getMicrosoftRedirectUri(request.url);

    // Store OAuth connection (must use same redirect URI as authorization)
    const result = await MicrosoftOAuthService.storeConnection(
      user.id,
      code,
      callbackUrl,
    );

    if (result.isErr()) {
      logger.error("Failed to store Microsoft OAuth connection", {
        userId: user.id,
        error: result.error.message,
      });
      return NextResponse.redirect(
        new URL(
          `/settings?microsoft_error=${encodeURIComponent(result.error.message)}`,
          request.url,
        ),
      );
    }

    logger.info("Successfully connected Microsoft account", {
      userId: user.id,
      email: result.value.email,
    });

    CacheInvalidation.invalidateMicrosoftConnection(user.id);

    // If redirecting to onboarding, mark Microsoft Calendar as connected during onboarding
    if (redirectUrl.includes("/onboarding")) {
      const { OnboardingService } =
        await import("@/server/services/onboarding.service");
      const onboardingResult = await OnboardingService.getOnboardingByUserId(
        user.id,
      );
      if (onboardingResult.isOk() && onboardingResult.value) {
        const { OnboardingQueries } =
          await import("@/server/data-access/onboarding.queries");
        await OnboardingQueries.updateOnboardingData(
          onboardingResult.value.id,
          {
            microsoftCalendarConnectedDuringOnboarding: true,
          },
        );
      }
    }

    // Redirect to the specified URL or settings
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    logger.error("Error in Microsoft OAuth callback", {}, error as Error);
    return NextResponse.redirect(
      new URL(
        "/settings?microsoft_error=callback_failed",
        new URL(request.url).origin,
      ),
    );
  }
}
