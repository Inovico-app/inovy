import { db } from "@/server/db";
import { chatEmbeddings, type NewChatEmbedding } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

export class EmbeddingsQueries {
  /**
   * Create a new embedding entry
   */
  static async createEmbedding(
    embedding: NewChatEmbedding
  ): Promise<{ id: string }> {
    try {
      const [result] = await db
        .insert(chatEmbeddings)
        .values(embedding)
        .returning({ id: chatEmbeddings.id });

      return result;
    } catch (error) {
      logger.error("Error creating embedding", { error, embedding });
      throw error;
    }
  }

  /**
   * Create multiple embeddings in a batch
   */
  static async createEmbeddingsBatch(
    embeddings: NewChatEmbedding[]
  ): Promise<void> {
    try {
      await db.insert(chatEmbeddings).values(embeddings);
      logger.info(`Created ${embeddings.length} embeddings`);
    } catch (error) {
      logger.error("Error creating embeddings batch", {
        error,
        count: embeddings.length,
      });
      throw error;
    }
  }

  /**
   * Search for similar embeddings using vector similarity
   * Uses the search_embeddings_by_similarity PostgreSQL function
   */
  static async searchSimilar(
    queryEmbedding: number[],
    projectId: string,
    options: {
      matchThreshold?: number;
      matchCount?: number;
    } = {}
  ): Promise<
    Array<{
      id: string;
      projectId: string;
      contentType: string;
      contentId: string;
      contentText: string;
      metadata: Record<string, unknown> | null;
      similarity: number;
    }>
  > {
    const { matchThreshold = 0.5, matchCount = 10 } = options;

    try {
      // Convert JavaScript array to PostgreSQL vector format
      const vectorString = `[${queryEmbedding.join(",")}]`;

      const results = await db.execute(
        sql`
          SELECT * FROM search_embeddings_by_similarity(
            ${vectorString}::vector(1536),
            ${projectId}::uuid,
            ${matchThreshold}::float,
            ${matchCount}::int
          )
        `
      );

      return results.rows.map((row: any) => ({
        id: row.id,
        projectId: row.project_id,
        contentType: row.content_type,
        contentId: row.content_id,
        contentText: row.content_text,
        metadata: row.metadata,
        similarity: parseFloat(row.similarity),
      }));
    } catch (error) {
      logger.error("Error searching similar embeddings", {
        error,
        projectId,
        options,
      });
      throw error;
    }
  }

  /**
   * Delete embeddings by content ID
   */
  static async deleteByContentId(
    contentId: string,
    contentType: "recording" | "transcription" | "summary" | "task"
  ): Promise<void> {
    try {
      await db
        .delete(chatEmbeddings)
        .where(
          and(
            eq(chatEmbeddings.contentId, contentId),
            eq(chatEmbeddings.contentType, contentType)
          )
        );

      logger.info("Deleted embeddings", { contentId, contentType });
    } catch (error) {
      logger.error("Error deleting embeddings", {
        error,
        contentId,
        contentType,
      });
      throw error;
    }
  }

  /**
   * Get embeddings by project ID
   */
  static async getByProjectId(projectId: string) {
    try {
      return await db
        .select()
        .from(chatEmbeddings)
        .where(eq(chatEmbeddings.projectId, projectId));
    } catch (error) {
      logger.error("Error getting embeddings by project", { error, projectId });
      throw error;
    }
  }

  /**
   * Check if content already has embeddings
   */
  static async hasEmbeddings(
    contentId: string,
    contentType: "recording" | "transcription" | "summary" | "task"
  ): Promise<boolean> {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(chatEmbeddings)
        .where(
          and(
            eq(chatEmbeddings.contentId, contentId),
            eq(chatEmbeddings.contentType, contentType)
          )
        );

      return Number(result.count) > 0;
    } catch (error) {
      logger.error("Error checking embeddings existence", {
        error,
        contentId,
        contentType,
      });
      throw error;
    }
  }
}

