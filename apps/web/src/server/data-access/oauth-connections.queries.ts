import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  oauthConnections,
  type NewOAuthConnection,
  type OAuthConnection,
} from "../db/schema/oauth-connections";

/**
 * OAuth Connections Queries
 * Manages OAuth connections for third-party integrations (Google, Microsoft)
 */
export class OAuthConnectionsQueries {
  /**
   * Get OAuth connection for a user and provider
   */
  static async getOAuthConnection(
    userId: string,
    provider: "google" | "microsoft"
  ): Promise<OAuthConnection | null> {
    const [connection] = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.userId, userId),
          eq(oauthConnections.provider, provider)
        )
      )
      .limit(1);

    return connection || null;
  }

  /**
   * Create a new OAuth connection
   */
  static async createOAuthConnection(
    data: NewOAuthConnection
  ): Promise<OAuthConnection> {
    const [connection] = await db
      .insert(oauthConnections)
      .values(data)
      .returning();
    return connection;
  }

  /**
   * Update an existing OAuth connection
   */
  static async updateOAuthConnection(
    userId: string,
    provider: "google" | "microsoft",
    data: Partial<OAuthConnection>
  ): Promise<OAuthConnection | null> {
    const [updated] = await db
      .update(oauthConnections)
      .set(data)
      .where(
        and(
          eq(oauthConnections.userId, userId),
          eq(oauthConnections.provider, provider)
        )
      )
      .returning();
    return updated || null;
  }

  /**
   * Delete an OAuth connection
   */
  static async deleteOAuthConnection(
    userId: string,
    provider: "google" | "microsoft"
  ): Promise<boolean> {
    const result = await db
      .delete(oauthConnections)
      .where(
        and(
          eq(oauthConnections.userId, userId),
          eq(oauthConnections.provider, provider)
        )
      );
    return (result?.rowCount ?? 0) > 0;
  }

  /**
   * Delete all OAuth connections for a user
   */
  static async deleteByUserId(userId: string): Promise<void> {
    await db
      .delete(oauthConnections)
      .where(eq(oauthConnections.userId, userId));
  }
}

