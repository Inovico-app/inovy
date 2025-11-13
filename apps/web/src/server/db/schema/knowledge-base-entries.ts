import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Knowledge Base Entries Table
 * Stores custom terminology, abbreviations, and definitions at different scopes
 * Scope hierarchy: project → organization → global (project overrides org, org overrides global)
 */
export const knowledgeBaseScopeEnum = [
  "project",
  "organization",
  "global",
] as const;
export type KnowledgeBaseScope = (typeof knowledgeBaseScopeEnum)[number];

export const knowledgeBaseEntries = pgTable(
  "knowledge_base_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scope: text("scope", { enum: knowledgeBaseScopeEnum }).notNull(),
    scopeId: text("scope_id"), // Project UUID, organization code, or NULL for global
    term: text("term").notNull(), // The term/abbreviation (e.g., "CRM", "KPI")
    definition: text("definition").notNull(), // Full definition/expansion
    context: text("context"), // Optional context about when/how to use this term
    examples: jsonb("examples").$type<string[]>(), // Array of example usage strings
    isActive: boolean("is_active").notNull().default(true), // Soft delete flag
    createdById: text("created_by_id").notNull(), // Kinde user ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    scopeScopeIdTermIdx: index(
      "knowledge_base_entries_scope_scope_id_term_idx"
    ).on(table.scope, table.scopeId, table.term),
    scopeScopeIdIsActiveIdx: index(
      "knowledge_base_entries_scope_scope_id_is_active_idx"
    ).on(table.scope, table.scopeId, table.isActive),
  })
);

export type KnowledgeBaseEntry = typeof knowledgeBaseEntries.$inferSelect;
export type NewKnowledgeBaseEntry = typeof knowledgeBaseEntries.$inferInsert;

