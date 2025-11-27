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

export const auditEventTypeEnum = pgEnum("audit_event_type", [
  // Recording events
  "recording_viewed",
  "recording_downloaded",
  "recording_streamed",
  "recording_uploaded",
  "recording_deleted",
  "recording_archived",
  "recording_restored",
  // Task events
  "task_created",
  "task_updated",
  "task_deleted",
  "task_assigned",
  "task_completed",
  "task_uncompleted",
  // User events
  "user_login",
  "user_logout",
  "user_created",
  "user_updated",
  "user_deleted",
  "user_deactivated",
  "user_activated",
  // Permission events
  "permission_granted",
  "permission_revoked",
  "permission_updated",
  "role_assigned",
  "role_removed",
  // Export events
  "export_created",
  "export_downloaded",
  "audit_log_exported",
  // Integration events
  "integration_connected",
  "integration_disconnected",
  "integration_synced",
  // Project events
  "project_created",
  "project_updated",
  "project_deleted",
  "project_archived",
  // Other events
  "settings_updated",
  "organization_updated",
]);

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
]);

/**
 * Comprehensive audit log table
 * Tracks all system actions for compliance and security auditing
 * Includes tamper-proofing via hash chain
 */
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventType: auditEventTypeEnum("event_type").notNull(),
  resourceType: auditResourceTypeEnum("resource_type").notNull(),
  resourceId: uuid("resource_id"), // Can be null for system-level events
  userId: text("user_id").notNull(), // Better Auth user ID
  organizationId: text("organization_id").notNull(),
  action: auditActionEnum("action").notNull(),
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

