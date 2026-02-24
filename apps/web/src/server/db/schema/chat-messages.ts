import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { chatConversations } from "./chat-conversations";

export const messageRoleEnum = ["user", "assistant"] as const;
export type MessageRole = (typeof messageRoleEnum)[number];

export interface SourceReference {
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

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string | Record<string, unknown>;
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
    toolCalls: jsonb("tool_calls").$type<ToolCall[]>(), // Tool calls made by assistant
    tokenCount: integer("token_count"), // Cached token count for optimization (optional)
    // Encryption fields (SSD-4.2.02: CONFIDENTIAL data)
    isEncrypted: boolean("is_encrypted").notNull().default(false),
    encryptionMetadata: text("encryption_metadata"),
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

