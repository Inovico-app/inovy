import { logger } from "@/lib";
import { getAuthSession } from "@/lib/auth";
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
    const sessionResult = await getAuthSession();

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
      } catch (stateError) {
        logger.error("Invalid state parameter", {}, stateError as Error);
        return NextResponse.redirect(
          new URL("/settings?google_error=invalid_state", request.url)
        );
      }
    }

    // Store OAuth connection
    const result = await GoogleOAuthService.storeConnection(user.id, code);

    if (result.isErr()) {
      logger.error(
        "Failed to store Google OAuth connection",
        { userId: user.id },
        new Error(result.error.message)
      );
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

    // Redirect to settings with success message
    return NextResponse.redirect(
      new URL("/settings?google_success=true", request.url)
    );
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

