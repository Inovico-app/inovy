import { pgTable, text, timestamp, uuid, jsonb, vector, index } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const contentTypeEnum = [
  "recording",
  "transcription",
  "summary",
  "task",
  "project_template",
] as const;
export type ContentType = (typeof contentTypeEnum)[number];

export const chatEmbeddings = pgTable(
  "chat_embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").notNull(), // Kinde organization code
    contentType: text("content_type", { enum: contentTypeEnum }).notNull(),
    contentId: uuid("content_id").notNull(), // References original content (recording, task, etc.)
    contentText: text("content_text").notNull(), // The actual text content
    embedding: vector("embedding", { dimensions: 1536 }), // OpenAI text-embedding-3-small dimensions
    metadata: jsonb("metadata").$type<{
      title?: string;
      recordingTitle?: string;
      recordingDate?: string;
      speaker?: string;
      timestamp?: number;
      [key: string]: unknown;
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    projectIdIdx: index("chat_embeddings_project_id_idx").on(table.projectId),
    organizationIdIdx: index("chat_embeddings_organization_id_idx").on(
      table.organizationId
    ),
    contentTypeIdx: index("chat_embeddings_content_type_idx").on(
      table.contentType
    ),
    contentIdIdx: index("chat_embeddings_content_id_idx").on(table.contentId),
    // Vector similarity search index will be created in migration SQL
  })
);

export type ChatEmbedding = typeof chatEmbeddings.$inferSelect;
export type NewChatEmbedding = typeof chatEmbeddings.$inferInsert;

