import { err, ok } from "neverthrow";
import type { ScopeTier } from "../../features/integrations/google/lib/google-oauth";
import {
  exchangeCodeForTokens,
  getUserEmail,
  refreshAccessToken as googleRefreshAccessToken,
  revokeToken as googleRevokeToken,
} from "../../features/integrations/google/lib/google-oauth";
import { hasRequiredScopes } from "../../features/integrations/google/lib/scope-utils";
import { logger } from "../../lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { OAuthConnectionsQueries } from "../data-access/oauth-connections.queries";
import type { OAuthConnection } from "../db/schema/oauth-connections";
import { OAuthBaseService } from "./oauth/oauth-base.service";

/**
 * Google OAuth Service
 * Manages OAuth connections for Google Workspace integration
 * Handles token storage, refresh, and revocation
 *
 * Extends OAuthBaseService for shared token CRUD and encryption.
 * Maintains backward-compatible static API via a private singleton.
 */
class GoogleOAuthServiceImpl extends OAuthBaseService {
  protected readonly provider = "google" as const;
  protected readonly providerDisplayName = "Google";
  protected readonly serviceName = "GoogleOAuthService";

  /**
   * Refresh access token using Google's OAuth2 API.
   */
  protected async refreshAccessToken(
    connection: OAuthConnection,
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    const decryptedRefreshToken = OAuthBaseService.decryptToken(
      connection.refreshToken,
    );
    return googleRefreshAccessToken(decryptedRefreshToken);
  }

  /**
   * Revoke a token using Google's OAuth2 API.
   */
  protected async revokeToken(token: string): Promise<void> {
    await googleRevokeToken(token);
  }
}

/** Singleton instance for delegation from static methods */
const instance = new GoogleOAuthServiceImpl();

/**
 * GoogleOAuthService — public API (all static, backward-compatible).
 *
 * Static methods delegate to the singleton `GoogleOAuthServiceImpl` instance
 * for shared CRUD, while Google-specific operations (storeConnection, hasScopes)
 * are implemented directly.
 */
export class GoogleOAuthService {
  /**
   * Store OAuth connection after successful authorization
   * @param userId - User ID
   * @param code - Authorization code from Google
   * @param redirectUri - Redirect URI used during authorization (must match exactly)
   */
  static async storeConnection(
    userId: string,
    code: string,
    redirectUri?: string,
  ): Promise<ActionResult<OAuthConnection>> {
    try {
      // Exchange code for tokens (must use same redirect URI as authorization)
      const tokens = await exchangeCodeForTokens(code, redirectUri);

      // Get user email
      const email = await getUserEmail(tokens.accessToken);

      // Check if connection already exists
      const existing = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        "google",
      );

      if (existing) {
        // Update existing connection
        const updated = await OAuthConnectionsQueries.updateOAuthConnection(
          userId,
          "google",
          {
            accessToken: OAuthBaseService.encryptToken(tokens.accessToken),
            refreshToken: OAuthBaseService.encryptToken(tokens.refreshToken),
            expiresAt: tokens.expiresAt,
            scopes: tokens.scopes,
            email,
          },
        );

        if (!updated) {
          return err(
            ActionErrors.internal(
              "Failed to update OAuth connection",
              undefined,
              "GoogleOAuthService.storeConnection",
            ),
          );
        }

        logger.info("Updated Google OAuth connection", { userId, email });
        return ok(updated);
      }

      // Create new connection
      const connection = await OAuthConnectionsQueries.createOAuthConnection({
        userId,
        provider: "google",
        accessToken: OAuthBaseService.encryptToken(tokens.accessToken),
        refreshToken: OAuthBaseService.encryptToken(tokens.refreshToken),
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        email,
      });

      logger.info("Created Google OAuth connection", { userId, email });
      return ok(connection);
    } catch (error) {
      logger.error(
        "Failed to store Google OAuth connection",
        { userId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to store Google OAuth connection",
          error as Error,
          "GoogleOAuthService.storeConnection",
        ),
      );
    }
  }

  /**
   * Get OAuth connection for user
   */
  static async getConnection(
    userId: string,
  ): Promise<ActionResult<OAuthConnection | null>> {
    return instance.getConnection(userId);
  }

  /**
   * Get valid access token (refresh if needed)
   */
  static async getValidAccessToken(
    userId: string,
  ): Promise<ActionResult<string>> {
    return instance.getValidAccessToken(userId);
  }

  /**
   * Disconnect Google account (revoke and delete)
   */
  static async disconnect(userId: string): Promise<ActionResult<boolean>> {
    return instance.disconnect(userId);
  }

  /**
   * Check if user has active Google connection
   */
  static async hasConnection(userId: string): Promise<ActionResult<boolean>> {
    return instance.hasConnection(userId);
  }

  /**
   * Get connection status details
   */
  static async getConnectionStatus(userId: string): Promise<
    ActionResult<{
      connected: boolean;
      email?: string;
      scopes?: string[];
      expiresAt?: Date;
    }>
  > {
    return instance.getConnectionStatus(userId);
  }

  /**
   * Check whether the user's stored scopes satisfy a given tier.
   * Returns `false` when there is no connection at all.
   */
  static async hasScopes(
    userId: string,
    tier: ScopeTier,
  ): Promise<ActionResult<boolean>> {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        "google",
      );

      if (!connection) {
        return ok(false);
      }

      return ok(hasRequiredScopes(connection.scopes, tier));
    } catch (error) {
      logger.error(
        "Failed to check Google scopes",
        { userId, tier },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to check Google scopes",
          error as Error,
          "GoogleOAuthService.hasScopes",
        ),
      );
    }
  }
}
