import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Comprehensive audit log schema
 * Tracks all system actions for compliance and security auditing
 * Supports SOC 2 compliance requirements
 */

export const auditCategoryEnum = pgEnum("audit_category", ["mutation", "read"]);

export const auditResourceTypeEnum = pgEnum("audit_resource_type", [
  "recording",
  "task",
  "user",
  "project",
  "organization",
  "permission",
  "role",
  "export",
  "integration",
  "settings",
  "consent",
  "knowledge_base",
  "chat",
  "meeting",
  "bot_session",
  "bot_settings",
  "bot_subscription",
  "notification",
  "team",
  "onboarding",
  "auto_action",
  "agenda",
  "agenda_template",
  "share_token",
  "drive_watch",
  "knowledge_base_document",
  "project_template",
  "redaction",
  "privacy_request",
  "data_export",
  "invitation",
  "calendar",
  "audit_log",
  "blob",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "read",
  "update",
  "delete",
  "export",
  "import",
  "archive",
  "restore",
  "grant",
  "revoke",
  "assign",
  "unassign",
  "connect",
  "disconnect",
  "sync",
  "start",
  "cancel",
  "retry",
  "subscribe",
  "unsubscribe",
  "complete",
  "uncomplete",
  "move",
  "reprocess",
  "upload",
  "download",
  "redact",
  "invite",
  "accept",
  "reject",
  "mark_read",
  "generate",
  "login",
  "logout",
  "verify",
  "reset",
  "list",
  "get",
  "search",
  "detect",
  "apply",
  "check",
]);

/**
 * Comprehensive audit log table
 * Tracks all system actions for compliance and security auditing
 * Includes tamper-proofing via hash chain
 */
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventType: text("event_type").notNull(),
  resourceType: auditResourceTypeEnum("resource_type").notNull(),
  resourceId: text("resource_id"), // Can be null for system-level events
  userId: text("user_id").notNull(), // Better Auth user ID
  organizationId: text("organization_id").notNull(),
  action: auditActionEnum("action").notNull(),
  category: auditCategoryEnum("category").notNull().default("mutation"),
  ipAddress: text("ip_address"), // IP address for audit trail
  userAgent: text("user_agent"), // User agent for audit trail
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(), // Additional context
  // Tamper-proofing: hash of previous log entry + current log entry
  // This creates an immutable chain that can detect tampering
  previousHash: text("previous_hash"), // Hash of the previous audit log entry
  hash: text("hash"), // Hash of this entry (computed from previousHash + current entry data)
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
