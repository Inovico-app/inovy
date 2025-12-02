import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Agent Metrics Table
 * Tracks agent request metrics for analytics and monitoring
 */

export const agentRequestTypeEnum = pgEnum("agent_request_type", [
  "chat",
  "knowledge_base",
  "other",
]);

export const agentMetrics = pgTable(
  "agent_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    userId: text("user_id").notNull(),
    conversationId: uuid("conversation_id"),
    requestType: agentRequestTypeEnum("request_type").notNull().default("chat"),
    latencyMs: integer("latency_ms"),
    error: boolean("error").notNull().default(false),
    errorMessage: text("error_message"),
    tokenCount: integer("token_count"),
    toolCalls: jsonb("tool_calls").$type<string[]>(),
    query: text("query"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    organizationIdIdx: index("agent_metrics_organization_id_idx").on(
      table.organizationId
    ),
    userIdIdx: index("agent_metrics_user_id_idx").on(table.userId),
    createdAtIdx: index("agent_metrics_created_at_idx").on(table.createdAt),
    requestTypeIdx: index("agent_metrics_request_type_idx").on(
      table.requestType
    ),
  })
);

export type AgentMetric = typeof agentMetrics.$inferSelect;
export type NewAgentMetric = typeof agentMetrics.$inferInsert;

