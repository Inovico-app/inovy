import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const embeddingCache = pgTable(
  "embedding_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentHash: text("content_hash").notNull(),
    embedding: vector("embedding", { dimensions: 3072 }).notNull(), // Supports text-embedding-3-large (3072) and text-embedding-3-small (1536) - using max dimension
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Composite unique constraint: same text can have different embeddings for different models
    contentHashModelUnique: unique().on(table.contentHash, table.model),
    contentHashIdx: index("idx_embedding_cache_hash").on(table.contentHash),
    modelIdx: index("idx_embedding_cache_model").on(table.model),
    // Composite index for efficient hash+model lookups
    hashModelIdx: index("idx_embedding_cache_hash_model").on(
      table.contentHash,
      table.model
    ),
  })
);

export type EmbeddingCache = typeof embeddingCache.$inferSelect;
export type NewEmbeddingCache = typeof embeddingCache.$inferInsert;

