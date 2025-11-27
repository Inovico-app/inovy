import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const oauthProviderEnum = ["google", "microsoft"] as const;
export type OAuthProvider = (typeof oauthProviderEnum)[number];

/**
 * OAuth Connections Table
 * Stores encrypted OAuth tokens for third-party integrations (Google, Microsoft)
 * Tokens are encrypted using AES-256-GCM with OAUTH_ENCRYPTION_KEY
 */
export const oauthConnections = pgTable("oauth_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(), // Better Auth user ID
  provider: text("provider", { enum: oauthProviderEnum }).notNull(),
  accessToken: text("access_token").notNull(), // Encrypted
  refreshToken: text("refresh_token").notNull(), // Encrypted
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  scopes: text("scopes").array().notNull(), // Array of granted OAuth scopes
  email: text("email").notNull(), // Connected account email
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type OAuthConnection = typeof oauthConnections.$inferSelect;
export type NewOAuthConnection = typeof oauthConnections.$inferInsert;

