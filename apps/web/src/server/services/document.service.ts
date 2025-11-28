import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { createHash, randomUUID } from "crypto";
import mammoth from "mammoth";
import { err, ok } from "neverthrow";
import OpenAI from "openai";
import pdfParse from "pdf-parse";
import { QdrantClientService } from "./rag/qdrant.service";
import type { QdrantPayload, QdrantPoint } from "./rag/types";
import { RedisService } from "./redis.service";
import type {
  ChunkingOptions,
  DocumentChunk,
  DocumentMetadata,
  ProcessedDocument,
} from "./types/document-processing.types";

/**
 * Document Service
 *
 * Unified service for all document processing operations.
 * Organized into sub-modules for better structure and maintainability.
 */
export class DocumentService {
  /**
   * Semantic Chunker Module
   * Handles recursive character-based chunking with semantic awareness
   */
  static readonly SemanticChunker = class {
    /**
     * Chunk text using recursive character splitting with semantic awareness
     */
    static async chunk(
      text: string,
      options: ChunkingOptions
    ): Promise<string[]> {
      const separators = this.getSeparators(options);
      return this.recursiveSplit(text, separators, options);
    }

    /**
     * Get separators based on chunking options
     */
    private static getSeparators(options: ChunkingOptions): string[] {
      const separators = ["\n\n", "\n", ". ", " ", ""];

      if (options.respectParagraphBoundaries) {
        return ["\n\n\n", "\n\n", ...separators];
      }

      return separators;
    }

    /**
     * Recursively split text using separators
     */
    private static recursiveSplit(
      text: string,
      separators: string[],
      options: ChunkingOptions
    ): string[] {
      const chunks: string[] = [];
      const separator = separators[0];

      if (!separator) {
        return this.splitByCharacter(
          text,
          options.chunkSize,
          options.chunkOverlap
        );
      }

      const splits = text.split(separator);
      let currentChunk = "";

      for (const split of splits) {
        const potentialChunk = currentChunk
          ? currentChunk + separator + split
          : split;

        if (potentialChunk.length <= options.chunkSize) {
          currentChunk = potentialChunk;
        } else {
          if (currentChunk) {
            chunks.push(currentChunk);
          }

          if (split.length > options.chunkSize) {
            const subChunks = this.recursiveSplit(
              split,
              separators.slice(1),
              options
            );
            chunks.push(...subChunks);
            currentChunk = "";
          } else {
            currentChunk = split;
          }
        }
      }

      if (currentChunk) {
        chunks.push(currentChunk);
      }

      return this.applyOverlap(chunks, options.chunkOverlap, options.chunkSize);
    }

    /**
     * Apply overlap between chunks
     * Overlap is prepended from the previous chunk, but the final chunk length
     * is clamped to chunkSize to ensure no chunk exceeds the configured limit.
     */
    private static applyOverlap(
      chunks: string[],
      overlap: number,
      chunkSize: number
    ): string[] {
      if (overlap === 0 || chunks.length === 0) {
        return chunks;
      }

      const overlappedChunks: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        let chunk = chunks[i] ?? "";

        if (i > 0) {
          const prevChunk = chunks[i - 1] ?? "";
          const overlapText = prevChunk.slice(-overlap);
          chunk = overlapText + chunk;
          // Clamp to chunkSize after applying overlap to prevent exceeding the limit
          chunk = chunk.slice(0, chunkSize);
        }

        overlappedChunks.push(chunk);
      }

      return overlappedChunks;
    }

    /**
     * Split text by character as fallback
     */
    private static splitByCharacter(
      text: string,
      chunkSize: number,
      overlap: number
    ): string[] {
      const chunks: string[] = [];

      for (let i = 0; i < text.length; i += chunkSize - overlap) {
        chunks.push(text.slice(i, i + chunkSize));
      }

      return chunks.length > 0 ? chunks : [text];
    }
  };

  /**
   * Document Processor Module
   * Handles text extraction, cleaning, and chunking
   */
  static readonly Processor = class {
    private static readonly defaultChunkingOptions: ChunkingOptions = {
      chunkSize: 1000,
      chunkOverlap: 200,
      respectSentenceBoundaries: true,
      respectParagraphBoundaries: true,
    };

    /**
     * Process a document: extract text, clean, chunk, and enrich
     */
    static async processDocument(
      file: File | { url: string; type: string; name: string },
      userId: string,
      metadata: DocumentMetadata = {}
    ): Promise<ActionResult<ProcessedDocument>> {
      try {
        // 1. Extract text and metadata
        const extractResult = await this.extractText(file);
        if (extractResult.isErr()) {
          return err(extractResult.error);
        }

        const rawText = extractResult.value;
        const enrichedMetadata = await this.extractMetadata(
          file,
          rawText,
          metadata
        );

        // 2. Clean and normalize text
        const cleanedText = this.cleanText(rawText);

        // 3. Chunk document using semantic boundaries
        const chunkingOptions: ChunkingOptions = {
          ...this.defaultChunkingOptions,
          ...(typeof metadata.chunkSize === "number"
            ? { chunkSize: metadata.chunkSize }
            : {}),
          ...(typeof metadata.chunkOverlap === "number"
            ? { chunkOverlap: metadata.chunkOverlap }
            : {}),
        };

        const chunks = await DocumentService.SemanticChunker.chunk(
          cleanedText,
          chunkingOptions
        );

        // 4. Enrich chunks with context
        const enrichedChunks = this.enrichChunks(chunks, enrichedMetadata);

        const documentId = metadata.documentId ?? randomUUID();

        return ok({
          documentId,
          userId,
          chunks: enrichedChunks,
          metadata: enrichedMetadata,
          processedAt: new Date(),
        });
      } catch (error) {
        logger.error("Failed to process document", {
          component: "DocumentService.Processor",
          error: error instanceof Error ? error.message : String(error),
        });
        return err(
          ActionErrors.internal(
            "Failed to process document",
            error as Error,
            "DocumentService.Processor.processDocument"
          )
        );
      }
    }

    /**
     * Extract text from file based on file type
     */
    private static async extractText(
      file: File | { url: string; type: string; name: string }
    ): Promise<ActionResult<string>> {
      try {
        const fileType = file.type.toLowerCase();

        if (fileType === "text/plain" || fileType === "text/markdown") {
          return await this.extractFromText(file);
        } else if (fileType === "application/pdf") {
          return await this.extractFromPDF(file);
        } else if (
          fileType ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          fileType === "application/msword"
        ) {
          return await this.extractFromDocx(file);
        } else {
          return err(
            ActionErrors.badRequest(
              `Unsupported file type: ${fileType}`,
              "DocumentService.Processor.extractText"
            )
          );
        }
      } catch (error) {
        logger.error("Failed to extract text from file", {
          component: "DocumentService.Processor",
          fileType: file.type,
          error: error instanceof Error ? error.message : String(error),
        });
        return err(
          ActionErrors.internal(
            "Failed to extract text from file",
            error as Error,
            "DocumentService.Processor.extractText"
          )
        );
      }
    }

    /**
     * Extract text from TXT/MD files
     */
    private static async extractFromText(
      file: File | { url: string; type: string; name: string }
    ): Promise<ActionResult<string>> {
      try {
        if (file instanceof File) {
          return ok(await file.text());
        } else {
          const response = await fetch(file.url);
          if (!response.ok) {
            return err(
              ActionErrors.internal(
                `Failed to fetch document: ${response.statusText}`,
                "DocumentService.Processor.extractFromText"
              )
            );
          }
          return ok(await response.text());
        }
      } catch (error) {
        return err(
          ActionErrors.internal(
            "Failed to extract text from file",
            error as Error,
            "DocumentService.Processor.extractFromText"
          )
        );
      }
    }

    /**
     * Extract text from PDF files
     */
    private static async extractFromPDF(
      file: File | { url: string; type: string; name: string }
    ): Promise<ActionResult<string>> {
      try {
        let buffer: Buffer;

        if (file instanceof File) {
          const arrayBuffer = await file.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        } else {
          const response = await fetch(file.url);
          if (!response.ok) {
            return err(
              ActionErrors.internal(
                `Failed to fetch PDF: ${response.statusText}`,
                "DocumentService.Processor.extractFromPDF"
              )
            );
          }
          const arrayBuffer = await response.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        }

        const data = await pdfParse(buffer);
        return ok(data.text);
      } catch (error) {
        logger.error("Failed to parse PDF", {
          component: "DocumentService.Processor",
          error: error instanceof Error ? error.message : String(error),
        });
        return err(
          ActionErrors.internal(
            "Failed to extract text from PDF",
            error as Error,
            "DocumentService.Processor.extractFromPDF"
          )
        );
      }
    }

    /**
     * Extract text from DOCX files
     */
    private static async extractFromDocx(
      file: File | { url: string; type: string; name: string }
    ): Promise<ActionResult<string>> {
      try {
        let buffer: Buffer;

        if (file instanceof File) {
          const arrayBuffer = await file.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        } else {
          const response = await fetch(file.url);
          if (!response.ok) {
            return err(
              ActionErrors.internal(
                `Failed to fetch DOCX: ${response.statusText}`,
                "DocumentService.Processor.extractFromDocx"
              )
            );
          }
          const arrayBuffer = await response.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        }

        const result = await mammoth.extractRawText({ buffer });
        return ok(result.value);
      } catch (error) {
        logger.error("Failed to parse DOCX", {
          component: "DocumentService.Processor",
          error: error instanceof Error ? error.message : String(error),
        });
        return err(
          ActionErrors.internal(
            "Failed to extract text from DOCX",
            error as Error,
            "DocumentService.Processor.extractFromDocx"
          )
        );
      }
    }

    /**
     * Extract metadata from file and text
     */
    private static async extractMetadata(
      file: File | { url: string; type: string; name: string },
      text: string,
      existingMetadata: DocumentMetadata
    ): Promise<DocumentMetadata> {
      return {
        filename: file.name,
        fileType: file.type,
        ...existingMetadata,
      };
    }

    /**
     * Clean and normalize text
     */
    private static cleanText(text: string): string {
      return text
        .replace(/\s+/g, " ") // Normalize whitespace
        .replace(/\n{3,}/g, "\n\n") // Normalize line breaks
        .trim();
    }

    /**
     * Enrich chunks with metadata
     */
    private static enrichChunks(
      chunks: string[],
      metadata: DocumentMetadata
    ): DocumentChunk[] {
      return chunks.map((content, index) => ({
        id: randomUUID(),
        content,
        index,
        metadata: {
          ...metadata,
          chunkIndex: index,
          totalChunks: chunks.length,
        },
      }));
    }
  };

  /**
   * Embedding Module
   * Handles embedding generation with Redis caching
   */
  static readonly Embedding = class {
    private static readonly openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "",
    });

    private static readonly EMBEDDING_MODEL = "text-embedding-3-large";
    private static readonly EMBEDDING_DIMENSIONS = 3072;
    private static readonly BATCH_SIZE = 100;
    private static readonly CACHE_TTL = 60 * 60 * 24 * 30; // 30 days

    private static redisService = RedisService.getInstance();

    /**
     * Generate embedding for a single text with caching
     */
    static async generateEmbedding(
      text: string
    ): Promise<ActionResult<number[]>> {
      try {
        const cacheKey = this.getCacheKey(text);
        const cached = await this.getCachedEmbedding(text);

        if (cached) {
          logger.debug("Embedding cache hit", {
            component: "DocumentService.Embedding",
            cacheKey,
          });
          return ok(cached);
        }

        const response = await this.openai.embeddings.create({
          model: this.EMBEDDING_MODEL,
          input: text,
          encoding_format: "float",
        });

        const embedding = response.data[0]?.embedding;

        if (!embedding) {
          return err(
            ActionErrors.internal(
              "Failed to generate embedding",
              undefined,
              "DocumentService.Embedding.generateEmbedding"
            )
          );
        }

        // Cache asynchronously
        this.cacheEmbedding(text, embedding).catch((error) => {
          logger.warn("Failed to cache embedding", {
            component: "DocumentService.Embedding",
            error: error instanceof Error ? error.message : String(error),
          });
        });

        return ok(embedding);
      } catch (error) {
        logger.error("Error generating embedding", {
          component: "DocumentService.Embedding",
          error: error instanceof Error ? error.message : String(error),
        });
        return err(
          ActionErrors.internal(
            "Error generating embedding",
            error as Error,
            "DocumentService.Embedding.generateEmbedding"
          )
        );
      }
    }

    /**
     * Batch generate embeddings for efficiency
     */
    static async generateBatchEmbeddings(
      texts: string[]
    ): Promise<ActionResult<number[][]>> {
      try {
        const allEmbeddings: number[][] = new Array(texts.length);

        for (
          let i = 0;
          i < texts.length;
          i += DocumentService.Embedding.BATCH_SIZE
        ) {
          const batch = texts.slice(
            i,
            i + DocumentService.Embedding.BATCH_SIZE
          );

          const cacheKeys = batch.map((text) => this.getCacheKey(text));
          const cacheResults = await this.redisService.mget(cacheKeys);

          const uncachedIndices: number[] = [];
          const uncachedTexts: string[] = [];

          cacheResults.forEach((cached, idx) => {
            const globalIdx = i + idx;
            if (cached) {
              try {
                const embedding = JSON.parse(cached) as number[];
                allEmbeddings[globalIdx] = embedding;
              } catch {
                uncachedIndices.push(globalIdx);
                uncachedTexts.push(batch[idx] ?? "");
              }
            } else {
              uncachedIndices.push(globalIdx);
              uncachedTexts.push(batch[idx] ?? "");
            }
          });

          if (uncachedTexts.length > 0) {
            const response = await this.openai.embeddings.create({
              model: this.EMBEDDING_MODEL,
              input: uncachedTexts,
              encoding_format: "float",
            });

            for (let j = 0; j < uncachedTexts.length; j++) {
              const embedding = response.data[j]?.embedding;
              if (!embedding) {
                return err(
                  ActionErrors.internal(
                    "Failed to generate embedding in batch",
                    undefined,
                    "DocumentService.Embedding.generateBatchEmbeddings"
                  )
                );
              }

              const globalIdx = uncachedIndices[j];
              if (globalIdx !== undefined) {
                allEmbeddings[globalIdx] = embedding;

                const text = uncachedTexts[j];
                if (text) {
                  this.cacheEmbedding(text, embedding).catch((error) => {
                    logger.warn("Failed to cache embedding in batch", {
                      component: "DocumentService.Embedding",
                      error:
                        error instanceof Error ? error.message : String(error),
                    });
                  });
                }
              }
            }
          }
        }

        const missingEmbeddings = allEmbeddings.filter((e) => !e).length;
        if (missingEmbeddings > 0) {
          return err(
            ActionErrors.internal(
              `Failed to generate ${missingEmbeddings} embeddings`,
              undefined,
              "DocumentService.Embedding.generateBatchEmbeddings"
            )
          );
        }

        return ok(allEmbeddings as number[][]);
      } catch (error) {
        logger.error("Error generating embeddings batch", {
          component: "DocumentService.Embedding",
          error: error instanceof Error ? error.message : String(error),
        });
        return err(
          ActionErrors.internal(
            "Error generating embeddings batch",
            error as Error,
            "DocumentService.Embedding.generateBatchEmbeddings"
          )
        );
      }
    }

    /**
     * Get cache key for text
     */
    private static getCacheKey(text: string): string {
      const hash = createHash("sha256").update(text).digest("hex");
      return `embedding:${this.EMBEDDING_MODEL}:${hash}`;
    }

    /**
     * Get cached embedding
     */
    private static async getCachedEmbedding(
      text: string
    ): Promise<number[] | null> {
      if (!this.redisService.isAvailable()) {
        return null;
      }

      const cacheKey = this.getCacheKey(text);
      const cached = await this.redisService.get(cacheKey);

      if (!cached) {
        return null;
      }

      try {
        return JSON.parse(cached) as number[];
      } catch (error) {
        logger.warn("Failed to parse cached embedding", {
          component: "DocumentService.Embedding",
          cacheKey,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    }

    /**
     * Cache embedding
     */
    private static async cacheEmbedding(
      text: string,
      embedding: number[]
    ): Promise<void> {
      if (!this.redisService.isAvailable()) {
        return;
      }

      const cacheKey = this.getCacheKey(text);
      const value = JSON.stringify(embedding);

      await this.redisService.set(cacheKey, value, this.CACHE_TTL);
    }

    /**
     * Get embedding model info
     */
    static getModelInfo(): { model: string; dimensions: number } {
      return {
        model: this.EMBEDDING_MODEL,
        dimensions: this.EMBEDDING_DIMENSIONS,
      };
    }
  };

  /**
   * Qdrant Module
   * Handles Qdrant vector database operations for documents
   */
  static readonly Qdrant = class {
    private static qdrantService = QdrantClientService.getInstance();

    /**
     * Process and index a document in Qdrant
     */
    static async processAndIndexDocument(
      file: File | { url: string; type: string; name: string },
      userId: string,
      metadata: DocumentMetadata
    ): Promise<ActionResult<ProcessedDocument>> {
      try {
        logger.info("Starting document processing pipeline", {
          component: "DocumentService.Qdrant",
          filename: metadata.filename,
          documentId: metadata.documentId,
        });

        // 1. Process document (extract, clean, chunk)
        const processResult = await DocumentService.Processor.processDocument(
          file,
          userId,
          metadata
        );

        if (processResult.isErr()) {
          return err(processResult.error);
        }

        const processedDocument = processResult.value;

        logger.info("Document processed, generating embeddings", {
          component: "DocumentService.Qdrant",
          documentId: processedDocument.documentId,
          chunkCount: processedDocument.chunks.length,
        });

        // 2. Generate embeddings for all chunks
        const chunkTexts = processedDocument.chunks.map(
          (chunk) => chunk.content
        );
        const embeddingsResult =
          await DocumentService.Embedding.generateBatchEmbeddings(chunkTexts);

        if (embeddingsResult.isErr()) {
          return err(embeddingsResult.error);
        }

        const embeddings = embeddingsResult.value;

        if (embeddings.length !== processedDocument.chunks.length) {
          return err(
            ActionErrors.internal(
              "Mismatch between chunks and embeddings",
              undefined,
              "DocumentService.Qdrant.processAndIndexDocument"
            )
          );
        }

        logger.info("Embeddings generated, storing in Qdrant", {
          component: "DocumentService.Qdrant",
          documentId: processedDocument.documentId,
          embeddingCount: embeddings.length,
        });

        // 3. Create Qdrant points with proper payload structure
        const expectedDimensions =
          DocumentService.Embedding.getModelInfo().dimensions;
        const points: QdrantPoint[] = processedDocument.chunks.map(
          (chunk, index) => {
            const embedding = embeddings[index];

            if (!embedding) {
              throw new Error(
                `Missing embedding for documentId=${processedDocument.documentId}, chunkIndex=${chunk.index}, expected dimension=${expectedDimensions}`
              );
            }

            if (embedding.length !== expectedDimensions) {
              throw new Error(
                `Invalid embedding dimension for documentId=${processedDocument.documentId}, chunkIndex=${chunk.index}: expected ${expectedDimensions}, got ${embedding.length}`
              );
            }

            const payload: QdrantPayload = {
              userId,
              organizationId: metadata.organizationId ?? "",
              projectId: metadata.projectId,
              departmentId: metadata.departmentId,
              teamId: metadata.teamId,
              content: chunk.content,
              filename: metadata.filename,
              documentId: processedDocument.documentId,
              chunkIndex: chunk.index,
              totalChunks: processedDocument.chunks.length,
              timestamp: processedDocument.processedAt.toISOString(),
              title: metadata.title,
              description: metadata.description,
            };

            return {
              id: chunk.id,
              vector: embedding,
              payload,
            };
          }
        );

        // 4. Upsert points to Qdrant
        const upsertResult = await this.qdrantService.upsert(points);

        if (upsertResult.isErr()) {
          logger.error("Failed to upsert points to Qdrant", {
            component: "DocumentService.Qdrant",
            documentId: processedDocument.documentId,
            error: upsertResult.error,
          });
          return err(upsertResult.error);
        }

        logger.info("Document successfully processed and indexed", {
          component: "DocumentService.Qdrant",
          documentId: processedDocument.documentId,
          chunkCount: processedDocument.chunks.length,
          pointCount: points.length,
        });

        return ok(processedDocument);
      } catch (error) {
        logger.error("Error in document processing pipeline", {
          component: "DocumentService.Qdrant",
          documentId: metadata.documentId,
          error: error instanceof Error ? error.message : String(error),
        });
        return err(
          ActionErrors.internal(
            "Failed to process and index document",
            error as Error,
            "DocumentService.Qdrant.processAndIndexDocument"
          )
        );
      }
    }

    /**
     * Delete document chunks from Qdrant by document ID
     */
    static async deleteDocumentChunks(
      documentId: string,
      organizationId: string
    ): Promise<ActionResult<void>> {
      try {
        logger.info("Deleting document chunks from Qdrant", {
          component: "DocumentService.Qdrant",
          documentId,
          organizationId,
        });

        const deleteResult = await this.qdrantService.deleteByFilter({
          must: [
            {
              key: "documentId",
              match: { value: documentId },
            },
            {
              key: "organizationId",
              match: { value: organizationId },
            },
          ],
        });

        if (deleteResult.isErr()) {
          return err(deleteResult.error);
        }

        logger.info("Document chunks deleted from Qdrant", {
          component: "DocumentService.Qdrant",
          documentId,
        });

        return ok(undefined);
      } catch (error) {
        logger.error("Error deleting document chunks", {
          component: "DocumentService.Qdrant",
          documentId,
          error: error instanceof Error ? error.message : String(error),
        });
        return err(
          ActionErrors.internal(
            "Failed to delete document chunks",
            error as Error,
            "DocumentService.Qdrant.deleteDocumentChunks"
          )
        );
      }
    }
  };

  /**
   * Processing Module
   * High-level orchestration for document processing pipeline
   */
  static readonly Processing = class {
    /**
     * Process and index a document (alias for Qdrant.processAndIndexDocument)
     */
    static async processAndIndexDocument(
      file: File | { url: string; type: string; name: string },
      userId: string,
      metadata: DocumentMetadata
    ): Promise<ActionResult<ProcessedDocument>> {
      return DocumentService.Qdrant.processAndIndexDocument(
        file,
        userId,
        metadata
      );
    }

    /**
     * Delete document chunks from Qdrant (alias for Qdrant.deleteDocumentChunks)
     */
    static async deleteDocumentChunks(
      documentId: string,
      organizationId: string
    ): Promise<ActionResult<void>> {
      return DocumentService.Qdrant.deleteDocumentChunks(
        documentId,
        organizationId
      );
    }
  };
}

