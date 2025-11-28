import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "../../../../../features/integrations/google/lib/google-oauth";
import { getAuthSession } from "../../../../../lib/auth/auth-helpers";
import { logger } from "../../../../../lib/logger";

/**
 * GET /api/integrations/google/authorize
 * Initiates Google OAuth flow
 */
export async function GET() {
  try {
    // Verify user is authenticated
    const sessionResult = await getAuthSession();

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

    // Generate state parameter for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        timestamp: Date.now(),
      })
    ).toString("base64");

    // Get authorization URL
    const authUrl = getAuthorizationUrl(state);

    logger.info("Initiating Google OAuth flow", { userId: user.id });

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

