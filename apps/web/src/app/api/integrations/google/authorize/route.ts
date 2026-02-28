import {
  SCOPE_TIERS,
  type ScopeTier,
  getAuthorizationUrl,
  getGoogleRedirectUri,
} from "@/features/integrations/google/lib/google-oauth";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { type NextRequest, NextResponse } from "next/server";

const VALID_TIERS = new Set<string>(Object.keys(SCOPE_TIERS));

function resolveScopeTiers(tierParam: string | null): readonly string[] {
  if (!tierParam) {
    return SCOPE_TIERS.base;
  }

  const tiers = tierParam.split(",").filter((t) => VALID_TIERS.has(t));
  if (tiers.length === 0) {
    return SCOPE_TIERS.base;
  }

  return tiers.flatMap((t) => [...SCOPE_TIERS[t as ScopeTier]]);
}

const SAFE_REDIRECT_FALLBACK = "/settings?google_success=true";

/**
 * Validate that a redirect URL is same-origin (relative path or matches app origin).
 * Returns the safe URL or falls back to a default.
 */
function validateRedirectUrl(
  redirectUrl: string,
  requestUrl: string
): string {
  try {
    const resolved = new URL(redirectUrl, requestUrl);
    const origin = new URL(requestUrl).origin;

    if (resolved.origin !== origin) {
      logger.warn("Rejected off-origin redirect URL", {
        redirectUrl,
        resolvedOrigin: resolved.origin,
        expectedOrigin: origin,
      });
      return SAFE_REDIRECT_FALLBACK;
    }

    return redirectUrl;
  } catch {
    return SAFE_REDIRECT_FALLBACK;
  }
}

/**
 * GET /api/integrations/google/authorize
 * Initiates Google OAuth flow.
 * Accepts `tier` query param with comma-separated tier names (e.g. "base", "calendarWrite").
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawRedirect =
    searchParams.get("redirect") || SAFE_REDIRECT_FALLBACK;
  const redirectUrl = validateRedirectUrl(rawRedirect, request.url);
  const tierParam = searchParams.get("tier") ?? searchParams.get("scopes");
  const requestedScopes = resolveScopeTiers(tierParam);
  const isIncremental = tierParam !== null && tierParam !== "base";

  try {
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

    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        timestamp: Date.now(),
        redirectUrl,
      })
    ).toString("base64");

    const callbackUrl = getGoogleRedirectUri(request.url);
    const authUrl = getAuthorizationUrl(
      state,
      callbackUrl,
      requestedScopes,
      !isIncremental
    );

    logger.info("Initiating Google OAuth flow", {
      userId: user.id,
      redirectUri: callbackUrl,
      scopes: requestedScopes,
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error("Error initiating Google OAuth flow", {}, error as Error);
    return NextResponse.json(
      { error: "Failed to initiate authorization" },
      { status: 500 }
    );
  }
}
