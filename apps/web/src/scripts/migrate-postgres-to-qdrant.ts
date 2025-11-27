/**
 * Migration script to move embeddings from PostgreSQL to Qdrant
 *
 * This script:
 * 1. Reads all embeddings from PostgreSQL chat_embeddings table
 * 2. Regenerates embeddings using text-embedding-3-large (3072 dimensions)
 * 3. Indexes them into Qdrant
 * 4. Optionally deletes from PostgreSQL after successful migration
 *
 * Usage:
 *   pnpm tsx apps/web/src/scripts/migrate-postgres-to-qdrant.ts [--dry-run] [--delete-after]
 */

import { db } from "@/server/db";
import { chatEmbeddings } from "@/server/db/schema/chat-embeddings";
import { logger } from "@/lib/logger";
import { RAGService } from "@/server/services/rag/rag.service";
import { eq } from "drizzle-orm";

const DRY_RUN = process.argv.includes("--dry-run");
const DELETE_AFTER = process.argv.includes("--delete-after");

interface PostgresEmbedding {
  id: string;
  projectId: string | null;
  organizationId: string;
  contentType: string;
  contentId: string;
  contentText: string;
  metadata: Record<string, unknown> | null;
}

async function migrateEmbeddings() {
  logger.info("Starting PostgreSQL to Qdrant migration", {
    dryRun: DRY_RUN,
    deleteAfter: DELETE_AFTER,
  });

  const ragService = new RAGService();

  // Initialize Qdrant collection
  const initResult = await ragService.initialize();
  if (initResult.isErr()) {
    logger.error("Failed to initialize Qdrant", {
      error: initResult.error,
    });
    process.exit(1);
  }

  // Fetch all embeddings from PostgreSQL
  logger.info("Fetching embeddings from PostgreSQL...");
  // Note: We fetch all embeddings, but will regenerate them with text-embedding-3-large (3072 dims)
  // since PostgreSQL has 1536 dimensions and Qdrant needs 3072
  const postgresEmbeddings = await db.select().from(chatEmbeddings);

  logger.info(`Found ${postgresEmbeddings.length} embeddings to migrate`);

  if (postgresEmbeddings.length === 0) {
    logger.info("No embeddings to migrate");
    return;
  }

  let migrated = 0;
  let failed = 0;
  const batchSize = 100;

  // Group by contentId and contentType to batch process
  const grouped = new Map<string, PostgresEmbedding[]>();
  for (const embedding of postgresEmbeddings) {
    const key = `${embedding.contentId}:${embedding.contentType}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)?.push(embedding as PostgresEmbedding);
  }

  logger.info(`Processing ${grouped.size} unique content items`);

  // Process in batches
  for (const [key, embeddings] of grouped.entries()) {
    try {
      const [contentId, contentType] = key.split(":");
      const firstEmbedding = embeddings[0];

      if (!firstEmbedding) continue;

      // Get userId from metadata or use empty string
      const userId = (firstEmbedding.metadata?.userId as string) ?? "";

      // Prepare documents for Qdrant
      const documents = embeddings.map((emb) => ({
        content: emb.contentText,
        metadata: {
          contentType: emb.contentType,
          documentId: emb.contentId,
          contentId: emb.contentId,
          projectId: emb.projectId ?? undefined,
          ...(emb.metadata || {}),
        },
      }));

      if (!DRY_RUN) {
        // Index to Qdrant
        const result = await ragService.addDocumentBatch(
          documents,
          userId,
          firstEmbedding.organizationId
        );

        if (result.isErr()) {
          logger.error("Failed to migrate embeddings", {
            contentId,
            contentType,
            error: result.error,
          });
          failed += embeddings.length;
          continue;
        }

        // Delete from PostgreSQL if requested
        if (DELETE_AFTER) {
          const ids = embeddings.map((e) => e.id);
          // Delete embeddings one by one (Drizzle limitation)
          for (const id of ids) {
            await db.delete(chatEmbeddings).where(eq(chatEmbeddings.id, id));
          }
        }
      }

      migrated += embeddings.length;
      logger.info(`Migrated ${embeddings.length} embeddings`, {
        contentId,
        contentType,
        totalMigrated: migrated,
      });
    } catch (error) {
      logger.error("Error migrating embeddings", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      failed += embeddings.length;
    }
  }

  logger.info("Migration completed", {
    total: postgresEmbeddings.length,
    migrated,
    failed,
    dryRun: DRY_RUN,
  });

  if (DRY_RUN) {
    logger.info("DRY RUN - No changes were made");
  }
}

// Run migration
migrateEmbeddings()
  .then(() => {
    logger.info("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Migration script failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  });

