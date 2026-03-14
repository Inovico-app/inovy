import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Privacy request types:
 * - restriction: GDPR Art. 18 — Right to restriction of processing
 * - objection: GDPR Art. 21 — Right to object
 */
export const privacyRequestTypeEnum = ["restriction", "objection"] as const;
export type PrivacyRequestType = (typeof privacyRequestTypeEnum)[number];

/**
 * Processing scopes that can be restricted or objected to
 */
export const processingScopeEnum = [
  "ai_analysis",
  "usage_analytics",
  "marketing",
  "all_processing",
] as const;
export type ProcessingScope = (typeof processingScopeEnum)[number];

/**
 * Privacy request status
 */
export const privacyRequestStatusEnum = [
  "active",
  "resolved",
  "withdrawn",
] as const;
export type PrivacyRequestStatus = (typeof privacyRequestStatusEnum)[number];

/**
 * Privacy Requests Table
 * Tracks GDPR Right to Restriction (Art. 18) and Right to Object (Art. 21) requests.
 * Each request targets a specific processing scope and can be active, resolved, or withdrawn.
 */
export const privacyRequests = pgTable("privacy_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  organizationId: text("organization_id").notNull(),
  type: text("type", { enum: privacyRequestTypeEnum }).notNull(),
  scope: text("scope", { enum: processingScopeEnum }).notNull(),
  status: text("status", { enum: privacyRequestStatusEnum })
    .notNull()
    .default("active"),
  reason: text("reason"), // User-provided reason for the request
  resolvedReason: text("resolved_reason"), // DPO-provided resolution reason
  resolvedBy: text("resolved_by"), // User ID of who resolved the request
  ipAddress: text("ip_address"), // For audit trail
  userAgent: text("user_agent"), // For audit trail
  requestedAt: timestamp("requested_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PrivacyRequest = typeof privacyRequests.$inferSelect;
export type NewPrivacyRequest = typeof privacyRequests.$inferInsert;
