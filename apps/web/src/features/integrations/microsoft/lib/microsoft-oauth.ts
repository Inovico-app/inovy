import "server-only";

import { getMicrosoftClientAssertionToken } from "@/server/services/microsoft-federated-assertion";
import { OAuthBaseService } from "@/server/services/oauth/oauth-base.service";
import { MS_SCOPE_TIERS, type MsScopeTier } from "./scope-constants";
import { mergeWithExistingScopes, normalizeMsScopes } from "./scope-utils";

/**
 * Microsoft OAuth Configuration
 * Manages OAuth 2.0 token exchange for Microsoft 365 / Entra ID integrations.
 */

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID ?? "common";

const MICROSOFT_AUTH_BASE = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0`;
const MS_GRAPH_ME_URL = "https://graph.microsoft.com/v1.0/me";

const CLIENT_ASSERTION_TYPE_JWT_BEARER =
  "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";

/**
 * Azure Container Apps: use Entra federated identity (UAMI) + client_assertion for Graph
 * token/refresh. Better Auth sign-in may still use MICROSOFT_CLIENT_SECRET (hybrid).
 */
function isFederatedGraphClientAssertionEnabled(): boolean {
  return (
    process.env.MICROSOFT_USE_FEDERATED_CREDENTIAL === "true" &&
    Boolean(process.env.MICROSOFT_ASSERTION_IDENTITY_CLIENT_ID?.trim())
  );
}

function validateMicrosoftClientId(): void {
  if (!MICROSOFT_CLIENT_ID) {
    throw new Error(
      "Missing required Microsoft OAuth environment variable: MICROSOFT_CLIENT_ID",
    );
  }
}

function validateTokenEndpointClientAuth(): void {
  validateMicrosoftClientId();
  if (isFederatedGraphClientAssertionEnabled()) {
    return;
  }
  if (!MICROSOFT_CLIENT_SECRET) {
    throw new Error(
      "Missing required Microsoft OAuth environment variables: MICROSOFT_CLIENT_SECRET (or enable federated credential + MICROSOFT_ASSERTION_IDENTITY_CLIENT_ID on Azure)",
    );
  }
}

async function applyClientAuthentication(body: URLSearchParams): Promise<void> {
  if (isFederatedGraphClientAssertionEnabled()) {
    const assertion = await getMicrosoftClientAssertionToken();
    body.set("client_assertion", assertion);
    body.set("client_assertion_type", CLIENT_ASSERTION_TYPE_JWT_BEARER);
    return;
  }
  body.set("client_secret", MICROSOFT_CLIENT_SECRET!);
}

/**
 * Get the redirect URI for the Microsoft OAuth flow.
 * Uses MICROSOFT_REDIRECT_URI when set (production with custom domain),
 * otherwise derives from request URL or falls back to APP_URL.
 */
export function getMicrosoftRedirectUri(requestUrl?: string): string {
  if (process.env.MICROSOFT_REDIRECT_URI) {
    return process.env.MICROSOFT_REDIRECT_URI;
  }
  if (requestUrl) {
    return new URL(
      "/api/integrations/microsoft/callback",
      requestUrl,
    ).toString();
  }
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/integrations/microsoft/callback`;
}

export { MS_SCOPE_TIERS, type MsScopeTier } from "./scope-constants";

/**
 * Build the Microsoft OAuth 2.0 authorization URL.
 * @param scopes - Scopes to request
 * @param state - Optional CSRF state parameter
 * @param redirectUri - Redirect URI (must match app registration)
 */
export function getAuthorizationUrl({
  scopes,
  state,
  redirectUri,
}: {
  scopes: readonly string[];
  state?: string;
  redirectUri?: string;
}): string {
  validateMicrosoftClientId();

  const resolvedRedirectUri = redirectUri ?? getMicrosoftRedirectUri();

  // Always include offline_access to ensure we receive a refresh token.
  // Microsoft does not return it in the token response `scope` field, so
  // it is excluded from MS_SCOPE_TIERS and added here instead.
  const allScopes = new Set([...scopes, "offline_access"]);

  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri: resolvedRedirectUri,
    scope: Array.from(allScopes).join(" "),
    response_mode: "query",
    prompt: "consent",
  });

  if (state) {
    params.set("state", state);
  }

  return `${MICROSOFT_AUTH_BASE}/authorize?${params.toString()}`;
}

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * Exchange an authorization code for tokens via Microsoft's token endpoint.
 * @param code - Authorization code from the OAuth callback
 * @param redirectUri - Redirect URI used during authorization (must match exactly)
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri?: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
}> {
  validateTokenEndpointClientAuth();

  const resolvedRedirectUri = redirectUri ?? getMicrosoftRedirectUri();

  const body = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID!,
    grant_type: "authorization_code",
    code,
    redirect_uri: resolvedRedirectUri,
  });

  await applyClientAuthentication(body);

  const response = await fetch(`${MICROSOFT_AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Microsoft token exchange failed (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as MicrosoftTokenResponse;

  if (!data.access_token) {
    throw new Error("No access token received from Microsoft");
  }

  if (!data.refresh_token) {
    throw new Error(
      "No refresh token received from Microsoft. User may need to revoke access and reconnect.",
    );
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    scopes: data.scope
      ? normalizeMsScopes(data.scope.split(" "))
      : [...MS_SCOPE_TIERS.base],
  };
}

/**
 * Refresh an access token using a refresh token.
 * Microsoft may rotate the refresh token — callers should persist the new one if present.
 * @param refreshToken - The stored refresh token
 * @param existingScopes - The scopes already granted (sent as scope param to preserve them)
 */
export async function refreshAccessToken(
  refreshToken: string,
  existingScopes: string[],
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}> {
  validateTokenEndpointClientAuth();

  const body = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID!,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: existingScopes.join(" "),
  });

  await applyClientAuthentication(body);

  const response = await fetch(`${MICROSOFT_AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Microsoft token refresh failed (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as MicrosoftTokenResponse;

  if (!data.access_token) {
    throw new Error("Failed to refresh Microsoft access token");
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    // Microsoft may or may not rotate the refresh token
    ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
    expiresAt,
  };
}

interface MsGraphMeResponse {
  mail?: string;
  userPrincipalName?: string;
}

/**
 * Get the authenticated user's email address from Microsoft Graph.
 */
export async function getUserEmail(accessToken: string): Promise<string> {
  const response = await fetch(MS_GRAPH_ME_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Microsoft user profile (${response.status})`,
    );
  }

  const data = (await response.json()) as MsGraphMeResponse;
  const email = data.mail ?? data.userPrincipalName;

  if (!email) {
    throw new Error("Failed to get user email from Microsoft Graph");
  }

  return email;
}

/**
 * Resolve a scope tier parameter to a merged scope list,
 * combining with any existing scopes the user has already granted.
 *
 * @param tierParam - A MsScopeTier key (e.g. "calendarWrite") or undefined for base
 * @param existingScopes - Scopes already stored for this user
 */
export function resolveScopeTiers(
  tierParam: MsScopeTier | undefined,
  existingScopes: string[],
): string[] {
  const tier = tierParam ?? "base";
  const tierScopes = MS_SCOPE_TIERS[tier];
  return mergeWithExistingScopes(existingScopes, tierScopes);
}

/**
 * Encryption utilities for storing OAuth tokens.
 * Re-exported from the shared OAuthBaseService (single source of truth).
 */
export { OAuthBaseService };
export const encryptToken = OAuthBaseService.encryptToken;
export const decryptToken = OAuthBaseService.decryptToken;
