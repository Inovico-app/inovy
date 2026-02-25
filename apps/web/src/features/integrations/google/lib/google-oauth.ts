import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { google } from "googleapis";
import { SCOPE_TIERS } from "./scope-constants";

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

/**
 * Google OAuth Configuration
 * Manages OAuth 2.0 client for Google Workspace integrations
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/google/callback`;
const OAUTH_ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY;

/**
 * Get the redirect URI for the OAuth flow.
 * Uses GOOGLE_REDIRECT_URI when set (production with custom domain),
 * otherwise derives from request URL (local development).
 */
export function getGoogleRedirectUri(requestUrl?: string): string {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  if (requestUrl) {
    return new URL("/api/integrations/google/callback", requestUrl).toString();
  }
  return `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/google/callback`;
}

function validateEnvironment() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error(
      "Missing required Google OAuth environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, OAUTH_ENCRYPTION_KEY"
    );
  }
}

export { SCOPE_TIERS, type ScopeTier } from "./scope-constants";

/** @deprecated Use SCOPE_TIERS instead. Kept for backward-compat references. */
export const GOOGLE_SCOPES = Object.values(SCOPE_TIERS).flat();

/**
 * Create OAuth2 client for Google
 */
export function createGoogleOAuthClient(): OAuth2Client {
  validateEnvironment();
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate authorization URL for OAuth flow.
 * Supports incremental authorization via `include_granted_scopes`.
 * @param state - Optional state parameter for CSRF protection
 * @param redirectUri - Optional redirect URI (defaults to GOOGLE_REDIRECT_URI)
 * @param scopes - Specific scopes to request (defaults to base tier)
 * @param forceConsent - Force the consent screen (needed for initial connection to get a refresh token, skipped for incremental grants)
 */
export function getAuthorizationUrl(
  state?: string,
  redirectUri?: string,
  scopes?: readonly string[],
  forceConsent = true
): string {
  const oauth2Client = redirectUri
    ? new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        redirectUri
      )
    : createGoogleOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes ? [...scopes] : [...SCOPE_TIERS.base],
    ...(forceConsent ? { prompt: "consent" } : {}),
    include_granted_scopes: true,
    state: state || "",
  });
}

/**
 * Exchange authorization code for tokens
 * @param code - Authorization code from Google
 * @param redirectUri - Redirect URI used during authorization (must match exactly)
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri?: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
}> {
  const oauth2Client = redirectUri
    ? new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        redirectUri
      )
    : createGoogleOAuthClient();

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("No access token received from Google");
  }

  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh token received from Google. User may need to revoke access and reconnect."
    );
  }

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000); // Default 1 hour

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    scopes: tokens.scope?.split(" ") || [...SCOPE_TIERS.base],
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const oauth2Client = createGoogleOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }

  const expiresAt = credentials.expiry_date
    ? new Date(credentials.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  return {
    accessToken: credentials.access_token,
    expiresAt,
  };
}

/**
 * Revoke Google OAuth token
 */
export async function revokeToken(token: string): Promise<void> {
  const oauth2Client = createGoogleOAuthClient();
  await oauth2Client.revokeToken(token);
}

/**
 * Get user email from Google
 */
export async function getUserEmail(accessToken: string): Promise<string> {
  const oauth2Client = createGoogleOAuthClient();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  if (!data.email) {
    throw new Error("Failed to get user email from Google");
  }

  return data.email;
}

/**
 * Encryption utilities for storing OAuth tokens
 * Uses AES-256-GCM encryption with authentication
 */

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Encrypt a string value (access token, refresh token)
 * Returns base64 encoded string: iv:authTag:encryptedData
 */
export function encryptToken(token: string): string {
  validateEnvironment();
  if (!OAUTH_ENCRYPTION_KEY) {
    throw new Error("OAUTH_ENCRYPTION_KEY not configured");
  }

  // Ensure key is exactly 32 bytes
  const key = Buffer.from(OAUTH_ENCRYPTION_KEY, "hex");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `OAUTH_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (64 hex characters)`
    );
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Combine iv, authTag, and encrypted data
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt an encrypted token
 * Expects format: iv:authTag:encryptedData
 */
export function decryptToken(encryptedToken: string): string {
  validateEnvironment();
  if (!OAUTH_ENCRYPTION_KEY) {
    throw new Error("OAUTH_ENCRYPTION_KEY not configured");
  }

  const key = Buffer.from(OAUTH_ENCRYPTION_KEY, "hex");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `OAUTH_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (64 hex characters)`
    );
  }

  const parts = encryptedToken.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

