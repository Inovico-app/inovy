import { err, ok } from "neverthrow";
import { ActionErrors, type ActionResult } from "../../lib/action-errors";
import {
  decryptToken,
  encryptToken,
  exchangeCodeForTokens,
  getUserEmail,
  refreshAccessToken,
  revokeToken,
} from "../../lib/google-oauth";
import { logger } from "../../lib/logger";
import { OAuthConnectionsQueries } from "../data-access";
import type { OAuthConnection } from "../db/schema";

/**
 * Google OAuth Service
 * Manages OAuth connections for Google Workspace integration
 * Handles token storage, refresh, and revocation
 */
export class GoogleOAuthService {
  /**
   * Store OAuth connection after successful authorization
   */
  static async storeConnection(
    userId: string,
    code: string
  ): Promise<ActionResult<OAuthConnection>> {
    try {
      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(code);

      // Get user email
      const email = await getUserEmail(tokens.accessToken);

      // Check if connection already exists
      const existing = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        "google"
      );

      if (existing) {
        // Update existing connection
        const updated = await OAuthConnectionsQueries.updateOAuthConnection(
          userId,
          "google",
          {
            accessToken: encryptToken(tokens.accessToken),
            refreshToken: encryptToken(tokens.refreshToken),
            expiresAt: tokens.expiresAt,
            scopes: tokens.scopes,
            email,
          }
        );

        if (!updated) {
          return err(
            ActionErrors.internal(
              "Failed to update OAuth connection",
              undefined,
              "GoogleOAuthService.storeConnection"
            )
          );
        }

        logger.info("Updated Google OAuth connection", { userId, email });
        return ok(updated);
      }

      // Create new connection
      const connection = await OAuthConnectionsQueries.createOAuthConnection({
        userId,
        provider: "google",
        accessToken: encryptToken(tokens.accessToken),
        refreshToken: encryptToken(tokens.refreshToken),
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
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to store Google OAuth connection",
          error as Error,
          "GoogleOAuthService.storeConnection"
        )
      );
    }
  }

  /**
   * Get OAuth connection for user
   */
  static async getConnection(
    userId: string
  ): Promise<ActionResult<OAuthConnection | null>> {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        "google"
      );
      return ok(connection);
    } catch (error) {
      logger.error(
        "Failed to get Google OAuth connection",
        { userId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get Google OAuth connection",
          error as Error,
          "GoogleOAuthService.getConnection"
        )
      );
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  static async getValidAccessToken(
    userId: string
  ): Promise<ActionResult<string>> {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        "google"
      );

      if (!connection) {
        return err(
          ActionErrors.notFound(
            "Google OAuth connection",
            "GoogleOAuthService.getValidAccessToken"
          )
        );
      }

      // Check if token is still valid (with 5-minute buffer)
      const now = new Date();
      const expiresAt = new Date(connection.expiresAt);
      const bufferMs = 5 * 60 * 1000; // 5 minutes

      if (expiresAt.getTime() > now.getTime() + bufferMs) {
        // Token is still valid
        return ok(decryptToken(connection.accessToken));
      }

      // Token expired or expiring soon, refresh it
      const decryptedRefreshToken = decryptToken(connection.refreshToken);
      const refreshed = await refreshAccessToken(decryptedRefreshToken);

      // Update stored token
      await OAuthConnectionsQueries.updateOAuthConnection(userId, "google", {
        accessToken: encryptToken(refreshed.accessToken),
        expiresAt: refreshed.expiresAt,
      });

      logger.info("Refreshed Google access token", { userId });
      return ok(refreshed.accessToken);
    } catch (error) {
      logger.error(
        "Failed to get valid Google access token",
        { userId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get valid Google access token",
          error as Error,
          "GoogleOAuthService.getValidAccessToken"
        )
      );
    }
  }

  /**
   * Disconnect Google account (revoke and delete)
   */
  static async disconnect(userId: string): Promise<ActionResult<boolean>> {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        "google"
      );

      if (!connection) {
        return err(
          ActionErrors.notFound(
            "Google OAuth connection",
            "GoogleOAuthService.disconnect"
          )
        );
      }

      // Revoke token with Google
      try {
        const accessToken = decryptToken(connection.accessToken);
        await revokeToken(accessToken);
      } catch (revokeError) {
        // Log but continue with deletion
        logger.error(
          "Failed to revoke Google token, continuing with deletion",
          { userId },
          revokeError as Error
        );
      }

      // Delete connection from database
      await OAuthConnectionsQueries.deleteOAuthConnection(userId, "google");

      logger.info("Disconnected Google OAuth connection", { userId });
      return ok(true);
    } catch (error) {
      logger.error(
        "Failed to disconnect Google OAuth",
        { userId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to disconnect Google OAuth",
          error as Error,
          "GoogleOAuthService.disconnect"
        )
      );
    }
  }

  /**
   * Check if user has active Google connection
   */
  static async hasConnection(userId: string): Promise<ActionResult<boolean>> {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        "google"
      );
      return ok(connection !== null);
    } catch (error) {
      logger.error(
        "Failed to check Google connection",
        { userId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to check Google connection",
          error as Error,
          "GoogleOAuthService.hasConnection"
        )
      );
    }
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
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        "google"
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
        "Failed to get connection status",
        { userId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get connection status",
          error as Error,
          "GoogleOAuthService.getConnectionStatus"
        )
      );
    }
  }
}

