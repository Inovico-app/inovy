import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { chatConversations } from "./chat-conversations";

export const messageRoleEnum = ["user", "assistant"] as const;
export type MessageRole = (typeof messageRoleEnum)[number];

interface SourceReference {
  contentId: string;
  contentType:
    | "recording"
    | "transcription"
    | "summary"
    | "task"
    | "knowledge_document";
  title: string;
  excerpt: string;
  similarityScore: number;
  recordingId?: string;
  timestamp?: number;
  recordingDate?: string;
  projectName?: string;
  projectId?: string;
  documentTitle?: string;
}

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => chatConversations.id, { onDelete: "cascade" }),
    role: text("role", { enum: messageRoleEnum }).notNull(),
    content: text("content").notNull(),
    sources: jsonb("sources").$type<SourceReference[]>(), // Source citations for assistant messages
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    conversationIdIdx: index("chat_messages_conversation_id_idx").on(
      table.conversationId
    ),
    roleIdx: index("chat_messages_role_idx").on(table.role),
  })
);

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type { SourceReference };

