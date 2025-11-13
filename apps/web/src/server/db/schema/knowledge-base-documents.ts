import { bigint, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { knowledgeBaseScopeEnum } from "./knowledge-base-entries";

/**
 * Knowledge Base Documents Table
 * Stores reference documents uploaded to the knowledge base
 * Documents are processed to extract text and create embeddings for semantic search
 */
export const documentProcessingStatusEnum = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;
export type DocumentProcessingStatus =
  (typeof documentProcessingStatusEnum)[number];

export const knowledgeBaseDocuments = pgTable(
  "knowledge_base_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scope: text("scope", { enum: knowledgeBaseScopeEnum }).notNull(),
    scopeId: text("scope_id"), // Project UUID, organization code, or NULL for global
    title: text("title").notNull(), // Document title
    description: text("description"), // Optional description
    fileUrl: text("file_url").notNull(), // Vercel Blob URL
    fileName: text("file_name").notNull(), // Original filename
    fileSize: bigint("file_size", { mode: "number" }).notNull(), // File size in bytes
    fileType: text("file_type").notNull(), // MIME type (e.g., "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    extractedText: text("extracted_text"), // Extracted text content (for PDF/DOCX/TXT/MD)
    processingStatus: text("processing_status", {
      enum: documentProcessingStatusEnum,
    })
      .notNull()
      .default("pending"),
    processingError: text("processing_error"), // Error message if processing failed
    createdById: text("created_by_id").notNull(), // Kinde user ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    scopeScopeIdIdx: index("knowledge_base_documents_scope_scope_id_idx").on(
      table.scope,
      table.scopeId
    ),
    processingStatusIdx: index(
      "knowledge_base_documents_processing_status_idx"
    ).on(table.processingStatus),
  })
);

export type KnowledgeBaseDocument = typeof knowledgeBaseDocuments.$inferSelect;
export type NewKnowledgeBaseDocument =
  typeof knowledgeBaseDocuments.$inferInsert;

