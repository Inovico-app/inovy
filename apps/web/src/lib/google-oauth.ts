import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

/**
 * Google OAuth Configuration
 * Manages OAuth 2.0 client for Google Workspace integrations
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const OAUTH_ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY;

function validateEnvironment() {
  if (
    !GOOGLE_CLIENT_ID ||
    !GOOGLE_CLIENT_SECRET ||
    !GOOGLE_REDIRECT_URI ||
    !OAUTH_ENCRYPTION_KEY
  ) {
    throw new Error(
      "Missing required Google OAuth environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, OAUTH_ENCRYPTION_KEY"
    );
  }
}

// Scopes for Google Workspace integration
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.compose", // Create drafts
  "https://www.googleapis.com/auth/calendar.events", // Create calendar events
];

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
 * Generate authorization URL for OAuth flow
 */
export function getAuthorizationUrl(state?: string): string {
  const oauth2Client = createGoogleOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline", // Request refresh token
    scope: GOOGLE_SCOPES,
    prompt: "consent", // Force consent screen to ensure refresh token
    state: state || "", // Optional state for CSRF protection
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
}> {
  const oauth2Client = createGoogleOAuthClient();

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
    scopes: tokens.scope?.split(" ") || GOOGLE_SCOPES,
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

