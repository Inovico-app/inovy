import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { recordings } from "./recordings";

export const consentAuditActionEnum = [
  "granted",
  "revoked",
  "expired",
  "viewed",
  "exported",
] as const;
export type ConsentAuditAction = (typeof consentAuditActionEnum)[number];

/**
 * Consent audit log table
 * Tracks all consent-related actions for compliance and audit purposes
 */
export const consentAuditLog = pgTable("consent_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  recordingId: uuid("recording_id")
    .notNull()
    .references(() => recordings.id, { onDelete: "cascade" }),
  participantEmail: text("participant_email").notNull(),
  action: text("action", { enum: consentAuditActionEnum }).notNull(),
  performedBy: text("performed_by").notNull(), // Better Auth user ID
  performedByEmail: text("performed_by_email"), // Email for audit purposes
  ipAddress: text("ip_address"), // IP address for audit
  userAgent: text("user_agent"), // User agent for audit
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(), // JSON metadata for additional context
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ConsentAuditLog = typeof consentAuditLog.$inferSelect;
export type NewConsentAuditLog = typeof consentAuditLog.$inferInsert;

