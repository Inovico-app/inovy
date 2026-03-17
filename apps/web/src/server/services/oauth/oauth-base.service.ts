import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { err, ok } from "neverthrow";
import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { OAuthConnectionsQueries } from "@/server/data-access/oauth-connections.queries";
import type { OAuthConnection } from "@/server/db/schema/oauth-connections";

/**
 * Encryption constants for AES-256-GCM
 */
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits

const OAUTH_ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY;

function validateEncryptionKey(): void {
  if (!OAUTH_ENCRYPTION_KEY) {
    throw new Error("OAUTH_ENCRYPTION_KEY not configured");
  }
}

/**
 * OAuthBaseService
 *
 * Abstract base class for OAuth provider services.
 * Contains shared encryption utilities, token CRUD operations,
 * and defines the contract for provider-specific behavior.
 */
export abstract class OAuthBaseService {
  /**
   * The OAuth provider identifier used for DB queries and logging.
   */
  protected abstract readonly provider: "google" | "microsoft";

  /**
   * Human-readable display name for log messages (e.g. "Google", "Microsoft").
   */
  protected abstract readonly providerDisplayName: string;

  /**
   * Service name used in error context strings (e.g. "GoogleOAuthService").
   */
  protected abstract readonly serviceName: string;

  /**
   * Refresh the access token using the provider-specific API.
   * Receives the full connection so providers can access scopes or other fields.
   */
  protected abstract refreshAccessToken(
    connection: OAuthConnection,
  ): Promise<{ accessToken: string; expiresAt: Date }>;

  /**
   * Revoke a token using the provider-specific API.
   */
  protected abstract revokeToken(token: string): Promise<void>;

  // ---------------------------------------------------------------------------
  // Static encryption utilities
  // ---------------------------------------------------------------------------

  /**
   * Encrypt a string value (access token, refresh token)
   * Returns base64 encoded string: iv:authTag:encryptedData
   */
  static encryptToken(token: string): string {
    validateEncryptionKey();

    // Ensure key is exactly 32 bytes
    const key = Buffer.from(OAUTH_ENCRYPTION_KEY!, "hex");
    if (key.length !== KEY_LENGTH) {
      throw new Error(
        `OAUTH_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (64 hex characters)`,
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
  static decryptToken(encryptedToken: string): string {
    validateEncryptionKey();

    const key = Buffer.from(OAUTH_ENCRYPTION_KEY!, "hex");
    if (key.length !== KEY_LENGTH) {
      throw new Error(
        `OAUTH_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (64 hex characters)`,
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

  // ---------------------------------------------------------------------------
  // Shared instance methods — token CRUD
  // ---------------------------------------------------------------------------

  /**
   * Get OAuth connection for user
   */
  async getConnection(
    userId: string,
  ): Promise<ActionResult<OAuthConnection | null>> {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        this.provider,
      );
      return ok(connection);
    } catch (error) {
      logger.error(
        `Failed to get ${this.providerDisplayName} OAuth connection`,
        { userId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          `Failed to get ${this.providerDisplayName} OAuth connection`,
          error as Error,
          `${this.serviceName}.getConnection`,
        ),
      );
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(userId: string): Promise<ActionResult<string>> {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        this.provider,
      );

      if (!connection) {
        return err(
          ActionErrors.notFound(
            `${this.providerDisplayName} OAuth connection`,
            `${this.serviceName}.getValidAccessToken`,
          ),
        );
      }

      // Check if token is still valid (with 5-minute buffer)
      const now = new Date();
      const expiresAt = new Date(connection.expiresAt);
      const bufferMs = 5 * 60 * 1000; // 5 minutes

      if (expiresAt.getTime() > now.getTime() + bufferMs) {
        // Token is still valid
        return ok(OAuthBaseService.decryptToken(connection.accessToken));
      }

      // Token expired or expiring soon, refresh it
      const refreshed = await this.refreshAccessToken(connection);

      // Update stored token
      await OAuthConnectionsQueries.updateOAuthConnection(
        userId,
        this.provider,
        {
          accessToken: OAuthBaseService.encryptToken(refreshed.accessToken),
          expiresAt: refreshed.expiresAt,
        },
      );

      logger.info(`Refreshed ${this.providerDisplayName} access token`, {
        userId,
      });
      return ok(refreshed.accessToken);
    } catch (error) {
      logger.error(
        `Failed to get valid ${this.providerDisplayName} access token`,
        { userId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          `Failed to get valid ${this.providerDisplayName} access token`,
          error as Error,
          `${this.serviceName}.getValidAccessToken`,
        ),
      );
    }
  }

  /**
   * Disconnect account (revoke and delete)
   */
  async disconnect(userId: string): Promise<ActionResult<boolean>> {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        this.provider,
      );

      if (!connection) {
        return err(
          ActionErrors.notFound(
            `${this.providerDisplayName} OAuth connection`,
            `${this.serviceName}.disconnect`,
          ),
        );
      }

      // Revoke token with provider
      try {
        const accessToken = OAuthBaseService.decryptToken(
          connection.accessToken,
        );
        await this.revokeToken(accessToken);
      } catch (revokeError) {
        // Log but continue with deletion
        logger.error(
          `Failed to revoke ${this.providerDisplayName} token, continuing with deletion`,
          { userId },
          revokeError as Error,
        );
      }

      // Delete connection from database
      await OAuthConnectionsQueries.deleteOAuthConnection(
        userId,
        this.provider,
      );

      logger.info(`Disconnected ${this.providerDisplayName} OAuth connection`, {
        userId,
      });
      return ok(true);
    } catch (error) {
      logger.error(
        `Failed to disconnect ${this.providerDisplayName} OAuth`,
        { userId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          `Failed to disconnect ${this.providerDisplayName} OAuth`,
          error as Error,
          `${this.serviceName}.disconnect`,
        ),
      );
    }
  }

  /**
   * Check if user has active connection
   */
  async hasConnection(userId: string): Promise<ActionResult<boolean>> {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        this.provider,
      );
      return ok(connection !== null);
    } catch (error) {
      logger.error(
        `Failed to check ${this.providerDisplayName} connection`,
        { userId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          `Failed to check ${this.providerDisplayName} connection`,
          error as Error,
          `${this.serviceName}.hasConnection`,
        ),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Shared store-connection helper
  // ---------------------------------------------------------------------------

  /**
   * Encrypt tokens, check for an existing connection, merge scopes if one
   * exists, and upsert to the database.
   *
   * Provider-specific `storeConnection` methods should exchange the auth code
   * for tokens and resolve the user email, then delegate here for the common
   * encrypt-and-upsert pattern.
   */
  async storeConnectionTokens(
    userId: string,
    tokens: {
      accessToken: string;
      refreshToken?: string | null;
      expiresAt: Date;
      scopes: string[];
    },
    email: string,
  ): Promise<ActionResult<OAuthConnection>> {
    try {
      const encryptedAccessToken = OAuthBaseService.encryptToken(
        tokens.accessToken,
      );
      const encryptedRefreshToken = tokens.refreshToken
        ? OAuthBaseService.encryptToken(tokens.refreshToken)
        : undefined;

      // Check if connection already exists so we can merge scopes
      const existing = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        this.provider,
      );

      if (existing) {
        // Merge new scopes with previously granted scopes
        const mergedScopes = Array.from(
          new Set([...existing.scopes, ...tokens.scopes]),
        );

        const updated = await OAuthConnectionsQueries.updateOAuthConnection(
          userId,
          this.provider,
          {
            accessToken: encryptedAccessToken,
            ...(encryptedRefreshToken && {
              refreshToken: encryptedRefreshToken,
            }),
            expiresAt: tokens.expiresAt,
            scopes: mergedScopes,
            email,
          },
        );

        if (!updated) {
          return err(
            ActionErrors.internal(
              `Failed to update ${this.providerDisplayName} OAuth connection`,
              undefined,
              `${this.serviceName}.storeConnection`,
            ),
          );
        }

        logger.info(`Updated ${this.providerDisplayName} OAuth connection`, {
          userId,
          email,
        });
        return ok(updated);
      }

      // Create new connection
      const connection = await OAuthConnectionsQueries.createOAuthConnection({
        userId,
        provider: this.provider,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken ?? "",
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        email,
      });

      logger.info(`Created ${this.providerDisplayName} OAuth connection`, {
        userId,
        email,
      });
      return ok(connection);
    } catch (error) {
      logger.error(
        `Failed to store ${this.providerDisplayName} OAuth connection`,
        { userId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          `Failed to store ${this.providerDisplayName} OAuth connection`,
          error as Error,
          `${this.serviceName}.storeConnection`,
        ),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Connection status
  // ---------------------------------------------------------------------------

  /**
   * Get connection status details
   */
  async getConnectionStatus(userId: string): Promise<
    ActionResult<{
      connected: boolean;
      email?: string;
      scopes?: string[];
      expiresAt?: Date;
    }>
  > {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        this.provider,
      );

      if (!connection) {
        return ok({ connected: false });
      }

      return ok({
        connected: true,
        email: connection.email,
        scopes: connection.scopes,
        expiresAt: connection.expiresAt,
      });
    } catch (error) {
      logger.error(
        `Failed to get ${this.providerDisplayName} connection status`,
        { userId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          `Failed to get ${this.providerDisplayName} connection status`,
          error as Error,
          `${this.serviceName}.getConnectionStatus`,
        ),
      );
    }
  }
}
