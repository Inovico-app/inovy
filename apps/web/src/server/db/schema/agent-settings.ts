import {
  integer,
  pgTable,
  real,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Agent Settings Table
 * Stores global agent configuration settings (max tokens, temperature, model, etc.)
 * Only one record should exist (enforced via unique constraint)
 */
export const agentSettings = pgTable(
  "agent_settings",
  {
    id: text("id").primaryKey().default("default"), // Single record with id "default"
    model: text("model").notNull().default("gpt-5-nano"), // LLM model to use
    maxTokens: integer("max_tokens").notNull().default(4000), // Maximum tokens for response
    maxContextTokens: integer("max_context_tokens").notNull().default(4000), // Maximum tokens for context
    temperature: real("temperature").notNull().default(0.7), // Temperature (0-2)
    topP: real("top_p").notNull().default(1.0), // Top-p sampling (0-1)
    frequencyPenalty: real("frequency_penalty").notNull().default(0.0), // Frequency penalty (-2 to 2)
    presencePenalty: real("presence_penalty").notNull().default(0.0), // Presence penalty (-2 to 2)
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Ensure only one settings record exists
    uniqueId: unique().on(table.id),
  })
);

export type AgentSettings = typeof agentSettings.$inferSelect;
export type NewAgentSettings = typeof agentSettings.$inferInsert;

