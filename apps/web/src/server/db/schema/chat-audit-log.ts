import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Chat audit log schema
 * Tracks all chat access attempts and queries for security and compliance
 */

export const chatContextEnum = pgEnum("chat_context", ["project", "organization"]);

export const chatAuditActionEnum = pgEnum("chat_audit_action", [
  "access_granted",
  "access_denied",
  "query_executed",
]);

export const chatAuditLog = pgTable("chat_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  organizationId: text("organization_id").notNull(),
  chatContext: chatContextEnum("chat_context").notNull(),
  projectId: text("project_id"),
  action: chatAuditActionEnum("action").notNull(),
  query: text("query"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ChatAuditLog = typeof chatAuditLog.$inferSelect;
export type NewChatAuditLog = typeof chatAuditLog.$inferInsert;

