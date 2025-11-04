import { type Result, err, ok } from "neverthrow";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { oauthConnections, type OAuthConnection } from "../db/schema";
import {
  encryptToken,
  decryptToken,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  getUserEmail,
} from "../../lib/google-oauth";
import { logger } from "../../lib/logger";

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
  ): Promise<Result<OAuthConnection, string>> {
    try {
      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(code);

      // Get user email
      const email = await getUserEmail(tokens.accessToken);

      // Check if connection already exists
      const existing = await this.getConnection(userId);

      if (existing.isOk() && existing.value) {
        // Update existing connection
        const [updated] = await db
          .update(oauthConnections)
          .set({
            accessToken: encryptToken(tokens.accessToken),
            refreshToken: encryptToken(tokens.refreshToken),
            expiresAt: tokens.expiresAt,
            scopes: tokens.scopes,
            email,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(oauthConnections.userId, userId),
              eq(oauthConnections.provider, "google")
            )
          )
          .returning();

        if (!updated) {
          return err("Failed to update OAuth connection");
        }

        logger.info("Updated Google OAuth connection", { userId, email });
        return ok(updated);
      }

      // Create new connection
      const [connection] = await db
        .insert(oauthConnections)
        .values({
          userId,
          provider: "google",
          accessToken: encryptToken(tokens.accessToken),
          refreshToken: encryptToken(tokens.refreshToken),
          expiresAt: tokens.expiresAt,
          scopes: tokens.scopes,
          email,
        })
        .returning();

      if (!connection) {
        return err("Failed to create OAuth connection");
      }

      logger.info("Created Google OAuth connection", { userId, email });
      return ok(connection);
    } catch (error) {
      const errorMessage = `Failed to store Google OAuth connection: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      logger.error(errorMessage, { userId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get OAuth connection for user
   */
  static async getConnection(
    userId: string
  ): Promise<Result<OAuthConnection | null, string>> {
    try {
      const [connection] = await db
        .select()
        .from(oauthConnections)
        .where(
          and(
            eq(oauthConnections.userId, userId),
            eq(oauthConnections.provider, "google")
          )
        )
        .limit(1);

      return ok(connection || null);
    } catch (error) {
      const errorMessage = `Failed to get Google OAuth connection: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      logger.error(errorMessage, { userId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  static async getValidAccessToken(
    userId: string
  ): Promise<Result<string, string>> {
    try {
      const connectionResult = await this.getConnection(userId);

      if (connectionResult.isErr()) {
        return err(connectionResult.error);
      }

      const connection = connectionResult.value;

      if (!connection) {
        return err("No Google OAuth connection found");
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
      await db
        .update(oauthConnections)
        .set({
          accessToken: encryptToken(refreshed.accessToken),
          expiresAt: refreshed.expiresAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(oauthConnections.userId, userId),
            eq(oauthConnections.provider, "google")
          )
        );

      logger.info("Refreshed Google access token", { userId });
      return ok(refreshed.accessToken);
    } catch (error) {
      const errorMessage = `Failed to get valid Google access token: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      logger.error(errorMessage, { userId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Disconnect Google account (revoke and delete)
   */
  static async disconnect(userId: string): Promise<Result<boolean, string>> {
    try {
      const connectionResult = await this.getConnection(userId);

      if (connectionResult.isErr()) {
        return err(connectionResult.error);
      }

      const connection = connectionResult.value;

      if (!connection) {
        return err("No Google OAuth connection found");
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
      await db
        .delete(oauthConnections)
        .where(
          and(
            eq(oauthConnections.userId, userId),
            eq(oauthConnections.provider, "google")
          )
        );

      logger.info("Disconnected Google OAuth connection", { userId });
      return ok(true);
    } catch (error) {
      const errorMessage = `Failed to disconnect Google OAuth: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      logger.error(errorMessage, { userId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Check if user has active Google connection
   */
  static async hasConnection(userId: string): Promise<Result<boolean, string>> {
    const result = await this.getConnection(userId);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value !== null);
  }

  /**
   * Get connection status details
   */
  static async getConnectionStatus(userId: string): Promise<
    Result<
      {
        connected: boolean;
        email?: string;
        scopes?: string[];
        expiresAt?: Date;
      },
      string
    >
  > {
    const result = await this.getConnection(userId);

    if (result.isErr()) {
      return err(result.error);
    }

    if (!result.value) {
      return ok({ connected: false });
    }

    return ok({
      connected: true,
      email: result.value.email,
      scopes: result.value.scopes,
      expiresAt: result.value.expiresAt,
    });
  }
}

