import { err, ok } from "neverthrow";
import type { MsScopeTier } from "../../features/integrations/microsoft/lib/microsoft-oauth";
import {
  exchangeCodeForTokens,
  getUserEmail,
  refreshAccessToken as msRefreshAccessToken,
} from "../../features/integrations/microsoft/lib/microsoft-oauth";
import { hasRequiredMsScopes } from "../../features/integrations/microsoft/lib/scope-utils";
import { logger } from "../../lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { OAuthConnectionsQueries } from "../data-access/oauth-connections.queries";
import type { OAuthConnection } from "../db/schema/oauth-connections";
import { OAuthBaseService } from "./oauth/oauth-base.service";

/**
 * Microsoft OAuth Service
 * Manages OAuth connections for Microsoft 365 integration
 * Handles token storage, refresh, and revocation
 *
 * Extends OAuthBaseService for shared token CRUD and encryption.
 * Maintains backward-compatible static API via a private singleton.
 */
class MicrosoftOAuthServiceImpl extends OAuthBaseService {
  protected readonly provider = "microsoft" as const;
  protected readonly providerDisplayName = "Microsoft";
  protected readonly serviceName = "MicrosoftOAuthService";

  /**
   * Refresh access token using Microsoft's OAuth2 API.
   * Microsoft may return a new refresh token — persists it when present.
   */
  protected async refreshAccessToken(
    connection: OAuthConnection,
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    const decryptedRefreshToken = OAuthBaseService.decryptToken(
      connection.refreshToken,
    );

    const refreshed = await msRefreshAccessToken(
      decryptedRefreshToken,
      connection.scopes,
    );

    // Microsoft may rotate the refresh token — persist the new one if returned
    if (refreshed.refreshToken) {
      await OAuthConnectionsQueries.updateOAuthConnection(
        connection.userId,
        "microsoft",
        {
          refreshToken: OAuthBaseService.encryptToken(refreshed.refreshToken),
        },
      );

      logger.info("Persisted rotated Microsoft refresh token", {
        userId: connection.userId,
      });
    }

    return {
      accessToken: refreshed.accessToken,
      expiresAt: refreshed.expiresAt,
    };
  }

  /**
   * Microsoft does not support programmatic token revocation.
   * This is a no-op; the token will expire naturally.
   */
  protected async revokeToken(_token: string): Promise<void> {
    logger.info("Microsoft OAuth token revocation is not supported — skipping");
  }
}

/** Singleton instance for delegation from static methods */
const instance = new MicrosoftOAuthServiceImpl();

/**
 * MicrosoftOAuthService — public API (all static, backward-compatible).
 *
 * Static methods delegate to the singleton `MicrosoftOAuthServiceImpl` instance
 * for shared CRUD, while Microsoft-specific operations (storeConnection, hasScopes)
 * are implemented directly.
 */
export class MicrosoftOAuthService {
  /**
   * Store OAuth connection after successful authorization.
   * Exchanges the authorization code for tokens, retrieves the user email,
   * and upserts the connection — merging scopes with any previously stored ones.
   *
   * @param userId - User ID
   * @param code - Authorization code from Microsoft
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

      // Get user email from Microsoft Graph
      const email = await getUserEmail(tokens.accessToken);

      // Check if connection already exists so we can merge scopes
      const existing = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        "microsoft",
      );

      if (existing) {
        // Merge new scopes with previously granted scopes
        const mergedScopes = Array.from(
          new Set([...existing.scopes, ...tokens.scopes]),
        );

        const updated = await OAuthConnectionsQueries.updateOAuthConnection(
          userId,
          "microsoft",
          {
            accessToken: OAuthBaseService.encryptToken(tokens.accessToken),
            refreshToken: OAuthBaseService.encryptToken(tokens.refreshToken),
            expiresAt: tokens.expiresAt,
            scopes: mergedScopes,
            email,
          },
        );

        if (!updated) {
          return err(
            ActionErrors.internal(
              "Failed to update Microsoft OAuth connection",
              undefined,
              "MicrosoftOAuthService.storeConnection",
            ),
          );
        }

        logger.info("Updated Microsoft OAuth connection", { userId, email });
        return ok(updated);
      }

      // Create new connection
      const connection = await OAuthConnectionsQueries.createOAuthConnection({
        userId,
        provider: "microsoft",
        accessToken: OAuthBaseService.encryptToken(tokens.accessToken),
        refreshToken: OAuthBaseService.encryptToken(tokens.refreshToken),
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        email,
      });

      logger.info("Created Microsoft OAuth connection", { userId, email });
      return ok(connection);
    } catch (error) {
      logger.error(
        "Failed to store Microsoft OAuth connection",
        { userId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to store Microsoft OAuth connection",
          error as Error,
          "MicrosoftOAuthService.storeConnection",
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
   * Disconnect Microsoft account (revoke and delete)
   */
  static async disconnect(userId: string): Promise<ActionResult<boolean>> {
    return instance.disconnect(userId);
  }

  /**
   * Check if user has active Microsoft connection
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
   * Check whether the user's stored scopes satisfy a given Microsoft tier.
   * Returns `false` when there is no connection at all.
   */
  static async hasScopes(
    userId: string,
    tier: MsScopeTier,
  ): Promise<ActionResult<boolean>> {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        "microsoft",
      );

      if (!connection) {
        return ok(false);
      }

      return ok(hasRequiredMsScopes(connection.scopes, tier));
    } catch (error) {
      logger.error(
        "Failed to check Microsoft scopes",
        { userId, tier },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to check Microsoft scopes",
          error as Error,
          "MicrosoftOAuthService.hasScopes",
        ),
      );
    }
  }
}
