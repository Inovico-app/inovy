import type { ActionResult } from "@/lib/server-action-client/action-errors";
import { EmbeddingService } from "@/server/services/embedding.service";
import { DocumentService } from "@/server/services/document.service";

/**
 * EmbeddingGateway — consolidates two embedding implementations behind one interface.
 *
 * Query-time: delegates to EmbeddingService (DB-cached, connection pool retry)
 * Ingestion-time: delegates to DocumentService.Embedding (Redis-cached, batch optimized)
 *
 * Phase 1: thin delegation. Phase 3: absorb both into single implementation.
 */
export class EmbeddingGateway {
  private static embeddingService: EmbeddingService | null = null;

  private static getEmbeddingService(): EmbeddingService {
    if (!this.embeddingService) {
      this.embeddingService = new EmbeddingService();
    }
    return this.embeddingService;
  }

  /** Generate a single embedding (query-time, DB-cached) */
  static async generateEmbedding(
    text: string,
  ): Promise<ActionResult<number[]>> {
    return this.getEmbeddingService().generateEmbedding(text);
  }

  /** Generate batch embeddings (ingestion-time, Redis-cached) */
  static async generateBatchEmbeddings(
    texts: string[],
  ): Promise<ActionResult<number[][]>> {
    return DocumentService.Embedding.generateBatchEmbeddings(texts);
  }

  /** Get embedding model info */
  static getModelInfo(): { model: string; dimensions: number } {
    return DocumentService.Embedding.getModelInfo();
  }
}
