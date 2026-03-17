import {
  MS_SCOPE_TIERS,
  type MsScopeTier,
  getAuthorizationUrl,
  getMicrosoftRedirectUri,
  resolveScopeTiers,
} from "@/features/integrations/microsoft/lib/microsoft-oauth";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { OAuthConnectionsQueries } from "@/server/data-access/oauth-connections.queries";
import { type NextRequest, NextResponse } from "next/server";

const VALID_TIERS = new Set<string>(Object.keys(MS_SCOPE_TIERS));

const SAFE_REDIRECT_FALLBACK = "/settings?microsoft_success=true";

/**
 * Validate that a redirect URL is same-origin (relative path or matches app origin).
 * Returns the safe URL or falls back to a default.
 */
function validateRedirectUrl(redirectUrl: string, requestUrl: string): string {
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
 * GET /api/integrations/microsoft/authorize
 * Initiates Microsoft OAuth flow.
 * Accepts `tier` query param with a tier name (e.g. "base", "calendarWrite").
 * Merges requested scopes with any existing scopes the user has already granted
 * for incremental consent.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawRedirect = searchParams.get("redirect") || SAFE_REDIRECT_FALLBACK;
  const redirectUrl = validateRedirectUrl(rawRedirect, request.url);
  const tierParam = searchParams.get("tier") ?? searchParams.get("scopes");
  const tier =
    tierParam && VALID_TIERS.has(tierParam)
      ? (tierParam as MsScopeTier)
      : undefined;

  try {
    const sessionResult = await getBetterAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.user) {
      logger.error(
        "Failed to get user session for Microsoft OAuth",
        {},
        new Error(
          sessionResult.isErr() ? sessionResult.error : "No user found",
        ),
      );
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const user = sessionResult.value.user;

    // Read existing scopes for incremental consent merging
    const existingConnection = await OAuthConnectionsQueries.getOAuthConnection(
      user.id,
      "microsoft",
    );
    const existingScopes = existingConnection?.scopes ?? [];

    const requestedScopes = resolveScopeTiers(tier, existingScopes);

    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        timestamp: Date.now(),
        redirectUrl,
      }),
    ).toString("base64");

    const callbackUrl = getMicrosoftRedirectUri(request.url);
    const authUrl = getAuthorizationUrl({
      scopes: requestedScopes,
      state,
      redirectUri: callbackUrl,
    });

    logger.info("Initiating Microsoft OAuth flow", {
      userId: user.id,
      redirectUri: callbackUrl,
      scopes: requestedScopes,
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error("Error initiating Microsoft OAuth flow", {}, error as Error);
    return NextResponse.json(
      { error: "Failed to initiate authorization" },
      { status: 500 },
    );
  }
}
