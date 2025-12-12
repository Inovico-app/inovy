import { auth } from "@/lib/auth";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  decodeJwtUnsafe,
  looksLikeJwt,
  scopesFromJwtPayload,
  verifyJwtRs256,
} from "./jwt";

function getStringField(obj: unknown, key: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const record = obj as Record<string, unknown>;
  const value = record[key];
  if (typeof value !== "string") return undefined;
  return value;
}

function getBetterAuthSessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Secure-better-auth.session_token"
    : "better-auth.session_token";
}

async function verifyBetterAuthSessionToken(
  req: Request,
  bearerToken: string
): Promise<AuthInfo | undefined> {
  const cookieName = getBetterAuthSessionCookieName();
  const headers = new Headers(req.headers);
  headers.set("cookie", `${cookieName}=${bearerToken}`);

  const session = await auth.api.getSession({ headers }).catch(() => null);
  if (!session || !("user" in session) || !session.user) return undefined;

  const activeMember = await auth.api
    .getActiveMember({ headers })
    .catch(() => null);

  return {
    token: bearerToken,
    // MCP-side scopes (these are your app/resource scopes, not Google/MS scopes)
    scopes: ["read:inovy-rag"],
    clientId: session.user.id,
    extra: {
      provider: "better-auth",
      userId: session.user.id,
      email: session.user.email,
      role: getStringField(session.user, "role"),
      organizationId: activeMember
        ? getStringField(activeMember, "organizationId")
        : undefined,
      memberRole: activeMember
        ? getStringField(activeMember, "role")
        : undefined,
    },
  };
}

function isGoogleIssuer(iss: string): boolean {
  return iss === "https://accounts.google.com" || iss === "accounts.google.com";
}

function isMicrosoftIssuer(iss: string): boolean {
  // Common patterns:
  // - https://login.microsoftonline.com/<tenant>/v2.0
  // - https://sts.windows.net/<tenant>/ (v1)
  if (
    iss.startsWith("https://login.microsoftonline.com/") &&
    iss.endsWith("/v2.0")
  ) {
    return true;
  }
  if (iss.startsWith("https://sts.windows.net/")) return true;
  return false;
}

async function verifyGoogleOrMicrosoftJwt(
  bearerToken: string
): Promise<AuthInfo | undefined> {
  if (!looksLikeJwt(bearerToken)) return undefined;

  const decoded = decodeJwtUnsafe(bearerToken);
  const issuer = decoded?.payload?.iss;
  if (typeof issuer !== "string" || !issuer) return undefined;

  const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const microsoftClientId = process.env.MICROSOFT_CLIENT_ID ?? "";
  const microsoftTenantId = process.env.MICROSOFT_TENANT_ID ?? "common";

  // Google: typically ID tokens (JWT). Access tokens are often opaque.
  if (isGoogleIssuer(issuer) && googleClientId) {
    const payload = await verifyJwtRs256(bearerToken, {
      jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
      expectedIssuer: (iss) => isGoogleIssuer(iss),
      expectedAudience: googleClientId,
    });
    if (!payload || typeof payload.sub !== "string") return undefined;

    return {
      token: bearerToken,
      scopes: ["read:inovy-rag", ...scopesFromJwtPayload(payload)],
      clientId: payload.sub,
      extra: {
        provider: "google",
        issuer,
        subject: payload.sub,
        email: typeof payload.email === "string" ? payload.email : undefined,
      },
    };
  }

  // Microsoft: access tokens and ID tokens are typically JWTs.
  if (isMicrosoftIssuer(issuer) && microsoftClientId) {
    const payload = await verifyJwtRs256(bearerToken, {
      jwksUrl: `https://login.microsoftonline.com/${microsoftTenantId}/discovery/v2.0/keys`,
      expectedIssuer: (iss) => isMicrosoftIssuer(iss),
      expectedAudience: microsoftClientId,
    });
    if (!payload || typeof payload.sub !== "string") return undefined;

    return {
      token: bearerToken,
      scopes: ["read:inovy-rag", ...scopesFromJwtPayload(payload)],
      clientId: payload.sub,
      extra: {
        provider: "microsoft",
        issuer,
        subject: payload.sub,
        tenant: typeof payload.tid === "string" ? payload.tid : undefined,
        upn: typeof payload.upn === "string" ? payload.upn : undefined,
      },
    };
  }

  return undefined;
}

/**
 * MCP bearer token verification.
 *
 * Supported token sources:
 * - Better Auth session token (opaque): bearer token is treated as `better-auth.session_token`
 * - Google/Microsoft JWTs: verified via issuer + JWKS (RS256)
 */
export async function verifyMcpToken(
  req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  // 1) Prefer Better Auth session tokens (fast, local DB/session verification)
  const betterAuth = await verifyBetterAuthSessionToken(req, bearerToken);
  if (betterAuth) return betterAuth;

  // 2) Optional fallback: accept provider JWTs when correctly minted for this app
  const providerJwt = await verifyGoogleOrMicrosoftJwt(bearerToken);
  if (providerJwt) return providerJwt;

  return undefined;
}

