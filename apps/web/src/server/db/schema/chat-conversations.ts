import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const chatConversations = pgTable(
  "chat_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }), // Made nullable for organization-level conversations
    userId: text("user_id").notNull(), // Better Auth user ID
    organizationId: text("organization_id").notNull(), // Better Auth organization ID
    context: text("context", { enum: ["project", "organization"] }).notNull(), // Conversation context
    title: text("title"), // Optional title, auto-generated from first message
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete timestamp
    archivedAt: timestamp("archived_at", { withTimezone: true }), // Archive timestamp
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    projectIdIdx: index("chat_conversations_project_id_idx").on(
      table.projectId
    ),
    userIdIdx: index("chat_conversations_user_id_idx").on(table.userId),
    organizationIdIdx: index("chat_conversations_organization_id_idx").on(
      table.organizationId
    ),
    contextIdx: index("chat_conversations_context_idx").on(table.context),
    deletedAtIdx: index("chat_conversations_deleted_at_idx").on(
      table.deletedAt
    ),
    archivedAtIdx: index("chat_conversations_archived_at_idx").on(
      table.archivedAt
    ),
    userDeletedUpdatedIdx: index(
      "chat_conversations_user_deleted_updated_idx"
    ).on(table.userId, table.deletedAt, table.updatedAt),
  })
);

export type ChatConversation = typeof chatConversations.$inferSelect;
export type NewChatConversation = typeof chatConversations.$inferInsert;

