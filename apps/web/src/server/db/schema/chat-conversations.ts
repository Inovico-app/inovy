import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const chatConversations = pgTable(
  "chat_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(), // Kinde user ID
    organizationId: text("organization_id").notNull(), // Kinde organization code
    title: text("title"), // Optional title, auto-generated from first message
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
  })
);

export type ChatConversation = typeof chatConversations.$inferSelect;
export type NewChatConversation = typeof chatConversations.$inferInsert;

