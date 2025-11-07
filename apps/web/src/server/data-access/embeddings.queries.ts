import { db } from "@/server/db";
import { chatEmbeddings, type NewChatEmbedding } from "@/server/db/schema";
import { and, eq, sql } from "drizzle-orm";

export class EmbeddingsQueries {
  static async createEmbedding(
    embedding: NewChatEmbedding
  ): Promise<{ id: string }> {
    const [result] = await db
      .insert(chatEmbeddings)
      .values(embedding)
      .returning({ id: chatEmbeddings.id });
    return result;
  }

  static async createEmbeddingsBatch(
    embeddings: NewChatEmbedding[]
  ): Promise<void> {
    await db.insert(chatEmbeddings).values(embeddings);
  }

  static async searchSimilar(
    queryEmbedding: number[],
    projectId: string,
    options: { matchThreshold?: number; matchCount?: number } = {}
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
    return results.rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      projectId: row.project_id as string,
      contentType: row.content_type as string,
      contentId: row.content_id as string,
      contentText: row.content_text as string,
      metadata: row.metadata as Record<string, unknown> | null,
      similarity: parseFloat(row.similarity as string),
    }));
  }

  static async searchSimilarOrganizationWide(
    queryEmbedding: number[],
    organizationId: string,
    options: { matchThreshold?: number; matchCount?: number } = {}
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
    const { matchThreshold = 0.5, matchCount = 15 } = options;
    const vectorString = `[${queryEmbedding.join(",")}]`;
    const projectsResult = await db.execute(
      sql`
        SELECT id FROM projects 
        WHERE organization_id = ${organizationId} 
        AND archived_at IS NULL
      `
    );
    const projectIds = projectsResult.rows.map(
      (row: Record<string, unknown>) => row.id as string
    );
    if (projectIds.length === 0) return [];
    const results = await db.execute(
      sql`
        SELECT 
          ce.id,
          ce.project_id,
          ce.content_type,
          ce.content_id,
          ce.content_text,
          ce.metadata,
          1 - (ce.embedding <=> ${vectorString}::vector(1536)) as similarity
        FROM chat_embeddings ce
        WHERE ce.project_id = ANY(${projectIds}::uuid[])
        AND 1 - (ce.embedding <=> ${vectorString}::vector(1536)) > ${matchThreshold}
        ORDER BY ce.embedding <=> ${vectorString}::vector(1536)
        LIMIT ${matchCount}
      `
    );
    return results.rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      projectId: row.project_id as string,
      contentType: row.content_type as string,
      contentId: row.content_id as string,
      contentText: row.content_text as string,
      metadata: row.metadata as Record<string, unknown> | null,
      similarity: parseFloat(row.similarity as string),
    }));
  }

  static async deleteByContentId(
    contentId: string,
    contentType: "recording" | "transcription" | "summary" | "task"
  ): Promise<void> {
    await db
      .delete(chatEmbeddings)
      .where(
        and(
          eq(chatEmbeddings.contentId, contentId),
          eq(chatEmbeddings.contentType, contentType)
        )
      );
  }

  static async getByProjectId(projectId: string) {
    return await db
      .select()
      .from(chatEmbeddings)
      .where(eq(chatEmbeddings.projectId, projectId));
  }

  static async hasEmbeddings(
    contentId: string,
    contentType: "recording" | "transcription" | "summary" | "task"
  ): Promise<boolean> {
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
  }
}

