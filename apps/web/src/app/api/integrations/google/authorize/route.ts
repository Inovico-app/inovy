import {
  getAuthorizationUrl,
  getGoogleRedirectUri,
} from "@/features/integrations/google/lib/google-oauth";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/integrations/google/authorize
 * Initiates Google OAuth flow
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const redirectUrl =
    searchParams.get("redirect") || "/settings?google_success=true";
  try {
    // Verify user is authenticated
    const sessionResult = await getBetterAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.user) {
      logger.error(
        "Failed to get user session for Google OAuth",
        {},
        new Error(sessionResult.isErr() ? sessionResult.error : "No user found")
      );
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = sessionResult.value.user;

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Generate state parameter for CSRF protection and redirect URL
    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        timestamp: Date.now(),
        redirectUrl,
      })
    ).toString("base64");

    // Use GOOGLE_REDIRECT_URI when set (production), else derive from request (local dev)
    const callbackUrl = getGoogleRedirectUri(request.url);

    // Get authorization URL with dynamic redirect URI
    const authUrl = getAuthorizationUrl(state, callbackUrl);

    logger.info("Initiating Google OAuth flow", {
      userId: user.id,
      redirectUri: callbackUrl,
    });

    // Redirect to Google OAuth consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error("Error initiating Google OAuth flow", {}, error as Error);
    return NextResponse.json(
      { error: "Failed to initiate authorization" },
      { status: 500 }
    );
  }
}

