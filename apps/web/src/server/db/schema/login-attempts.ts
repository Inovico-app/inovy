import { index, pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { users } from "./auth";

/**
 * Login attempts tracking table
 * Used for brute-force protection and account lockout
 */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(), // email or user ID
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    success: text("success").notNull(), // 'true' or 'false' as text
    attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
  },
  (table) => [
    index("login_attempts_identifier_idx").on(table.identifier),
    index("login_attempts_userId_idx").on(table.userId),
    index("login_attempts_attemptedAt_idx").on(table.attemptedAt),
  ]
);

/**
 * Account lockouts table
 * Tracks when accounts are locked due to excessive failed attempts
 */
export const accountLockouts = pgTable(
  "account_lockouts",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull().unique(), // email or user ID
    lockedAt: timestamp("locked_at").defaultNow().notNull(),
    lockedUntil: timestamp("locked_until").notNull(),
    failedAttempts: integer("failed_attempts").notNull(),
    ipAddress: text("ip_address"),
  },
  (table) => [
    index("account_lockouts_identifier_idx").on(table.identifier),
    index("account_lockouts_lockedUntil_idx").on(table.lockedUntil),
  ]
);
