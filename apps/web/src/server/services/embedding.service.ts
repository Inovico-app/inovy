import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { EmbeddingsQueries } from "@/server/data-access/embeddings.queries";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { TasksQueries } from "@/server/data-access/tasks.queries";
import { type NewChatEmbedding } from "@/server/db/schema";
import { err, ok } from "neverthrow";
import OpenAI from "openai";

export class EmbeddingService {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? "",
  });

  private static readonly EMBEDDING_MODEL = "text-embedding-3-small";
  private static readonly CHUNK_SIZE = 500; // tokens per chunk
  private static readonly BATCH_SIZE = 100; // embeddings per batch

  /**
   * Generate embedding for a single text
   */
  static async generateEmbedding(
    text: string
  ): Promise<ActionResult<number[]>> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.EMBEDDING_MODEL,
        input: text,
      });

      const embedding = response.data[0]?.embedding;

      if (!embedding) {
        return err(
          ActionErrors.internal(
            "Failed to generate embedding",
            undefined,
            "EmbeddingService.generateEmbedding"
          )
        );
      }

      return ok(embedding);
    } catch (error) {
      logger.error("Error generating embedding", { error });
      return err(
        ActionErrors.internal(
          "Error generating embedding",
          error as Error,
          "EmbeddingService.generateEmbedding"
        )
      );
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  static async generateEmbeddingsBatch(
    texts: string[]
  ): Promise<ActionResult<number[][]>> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.EMBEDDING_MODEL,
        input: texts,
      });

      const embeddings = response.data.map((item) => item.embedding);

      if (embeddings.length !== texts.length) {
        return err(
          ActionErrors.internal(
            "Mismatch in embedding count",
            undefined,
            "EmbeddingService.generateEmbeddingsBatch"
          )
        );
      }

      return ok(embeddings);
    } catch (error) {
      logger.error("Error generating embeddings batch", { error });
      return err(
        ActionErrors.internal(
          "Error generating embeddings batch",
          error as Error,
          "EmbeddingService.generateEmbeddingsBatch"
        )
      );
    }
  }

  /**
   * Chunk long text into smaller pieces for embedding
   */
  private static chunkText(text: string, maxTokens: number): string[] {
    // Simple chunking by character count (approximation: ~4 chars per token)
    const maxChars = maxTokens * 4;
    const chunks: string[] = [];

    if (text.length <= maxChars) {
      return [text];
    }

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length <= maxChars) {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        // If single paragraph is too long, split by sentences
        if (paragraph.length > maxChars) {
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) ?? [paragraph];
          currentChunk = "";
          for (const sentence of sentences) {
            if ((currentChunk + sentence).length <= maxChars) {
              currentChunk += sentence;
            } else {
              if (currentChunk) {
                chunks.push(currentChunk);
              }
              currentChunk = sentence;
            }
          }
        } else {
          currentChunk = paragraph;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Index a recording's transcription
   */
  static async indexRecordingTranscription(
    recordingId: string,
    projectId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      logger.info("Indexing recording transcription", { recordingId });

      const recording = await RecordingsQueries.selectRecordingById(
        recordingId
      );

      if (!recording || !recording.transcriptionText) {
        return err(
          ActionErrors.notFound(
            "Recording or transcription",
            "EmbeddingService.indexRecordingTranscription"
          )
        );
      }

      // Check if already indexed
      const hasExisting = await EmbeddingsQueries.hasEmbeddings(
        recordingId,
        "transcription"
      );
      if (hasExisting) {
        logger.info("Transcription already indexed, skipping", { recordingId });
        return ok(undefined);
      }

      // Chunk the transcription
      const chunks = this.chunkText(
        recording.transcriptionText,
        this.CHUNK_SIZE
      );

      // Generate embeddings for all chunks
      const embeddingsResult = await this.generateEmbeddingsBatch(chunks);

      if (embeddingsResult.isErr()) {
        return err(embeddingsResult.error);
      }

      const embeddings = embeddingsResult.value;

      // Create embedding entries
      const embeddingEntries: NewChatEmbedding[] = embeddings.map(
        (embedding, index) => ({
          projectId,
          organizationId,
          contentType: "transcription" as const,
          contentId: recordingId,
          contentText: chunks[index] ?? "",
          embedding,
          metadata: {
            recordingTitle: recording.title,
            recordingDate: recording.recordingDate.toISOString(),
            chunkIndex: index,
            totalChunks: chunks.length,
          },
        })
      );

      // Save in batches
      for (let i = 0; i < embeddingEntries.length; i += this.BATCH_SIZE) {
        const batch = embeddingEntries.slice(i, i + this.BATCH_SIZE);
        await EmbeddingsQueries.createEmbeddingsBatch(batch);
      }

      logger.info("Successfully indexed transcription", {
        recordingId,
        chunksCreated: embeddingEntries.length,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error indexing recording transcription", {
        error,
        recordingId,
      });
      return err(
        ActionErrors.internal(
          "Error indexing recording transcription",
          error as Error,
          "EmbeddingService.indexRecordingTranscription"
        )
      );
    }
  }

  /**
   * Index a recording's summary
   */
  static async indexRecordingSummary(
    recordingId: string,
    projectId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      logger.info("Indexing recording summary", { recordingId });

      const summaries = await AIInsightsQueries.getInsightsByRecordingId(
        recordingId
      );
      const summary = summaries.find(
        (s: { insightType: string }) => s.insightType === "summary"
      );

      if (!summary || !summary.content) {
        return err(
          ActionErrors.notFound(
            "Summary",
            "EmbeddingService.indexRecordingSummary"
          )
        );
      }

      // Check if already indexed
      const hasExisting = await EmbeddingsQueries.hasEmbeddings(
        summary.id,
        "summary"
      );
      if (hasExisting) {
        logger.info("Summary already indexed, skipping", {
          summaryId: summary.id,
        });
        return ok(undefined);
      }

      // Convert summary content to text
      const summaryText = JSON.stringify(summary.content);

      // Generate embedding
      const embeddingResult = await this.generateEmbedding(summaryText);

      if (embeddingResult.isErr()) {
        return err(embeddingResult.error);
      }

      // Get recording details for metadata
      const recording = await RecordingsQueries.selectRecordingById(
        recordingId
      );

      // Create embedding entry
      await EmbeddingsQueries.createEmbedding({
        projectId,
        organizationId,
        contentType: "summary",
        contentId: summary.id,
        contentText: summaryText,
        embedding: embeddingResult.value,
        metadata: {
          recordingTitle: recording?.title,
          recordingDate: recording?.recordingDate?.toISOString(),
          recordingId,
        },
      });

      logger.info("Successfully indexed summary", { summaryId: summary.id });

      return ok(undefined);
    } catch (error) {
      logger.error("Error indexing recording summary", { error, recordingId });
      return err(
        ActionErrors.internal(
          "Error indexing recording summary",
          error as Error,
          "EmbeddingService.indexRecordingSummary"
        )
      );
    }
  }

  /**
   * Index all tasks for a recording
   */
  static async indexRecordingTasks(
    recordingId: string,
    projectId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      logger.info("Indexing recording tasks", { recordingId });

      const tasks = await TasksQueries.getTasksByRecordingId(recordingId);

      if (!tasks || tasks.length === 0) {
        logger.info("No tasks found for recording", { recordingId });
        return ok(undefined);
      }

      // Get recording details for metadata
      const recording = await RecordingsQueries.selectRecordingById(
        recordingId
      );

      const embeddingEntries: NewChatEmbedding[] = [];

      // Process tasks in batches
      for (let i = 0; i < tasks.length; i += this.BATCH_SIZE) {
        const batch = tasks.slice(i, i + this.BATCH_SIZE);

        // Check which tasks are not yet indexed
        const tasksToIndex = [];
        for (const task of batch) {
          const hasExisting = await EmbeddingsQueries.hasEmbeddings(
            task.id,
            "task"
          );
          if (!hasExisting) {
            tasksToIndex.push(task);
          }
        }

        if (tasksToIndex.length === 0) {
          continue;
        }

        // Create text representations of tasks
        const taskTexts = tasksToIndex.map(
          (task) =>
            `Task: ${task.title}\nDescription: ${
              task.description ?? "N/A"
            }\nPriority: ${task.priority}\nStatus: ${task.status}`
        );

        // Generate embeddings
        const embeddingsResult = await this.generateEmbeddingsBatch(taskTexts);

        if (embeddingsResult.isErr()) {
          return err(embeddingsResult.error);
        }

        const embeddings = embeddingsResult.value;

        // Create embedding entries
        const batchEntries: NewChatEmbedding[] = tasksToIndex.map(
          (task, index) => ({
            projectId,
            organizationId,
            contentType: "task" as const,
            contentId: task.id,
            contentText: taskTexts[index] ?? "",
            embedding: embeddings[index] ?? [],
            metadata: {
              title: task.title,
              priority: task.priority,
              status: task.status,
              recordingTitle: recording?.title,
              recordingDate: recording?.recordingDate?.toISOString(),
              recordingId,
            },
          })
        );

        embeddingEntries.push(...batchEntries);
      }

      // Save all embeddings
      if (embeddingEntries.length > 0) {
        for (let i = 0; i < embeddingEntries.length; i += this.BATCH_SIZE) {
          const batch = embeddingEntries.slice(i, i + this.BATCH_SIZE);
          await EmbeddingsQueries.createEmbeddingsBatch(batch);
        }
      }

      logger.info("Successfully indexed tasks", {
        recordingId,
        tasksIndexed: embeddingEntries.length,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error indexing recording tasks", { error, recordingId });
      return err(
        ActionErrors.internal(
          "Error indexing recording tasks",
          error as Error,
          "EmbeddingService.indexRecordingTasks"
        )
      );
    }
  }

  /**
   * Index all content for a recording
   */
  static async indexRecording(
    recordingId: string,
    projectId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      logger.info("Starting full recording indexing", { recordingId });

      // Index transcription
      const transcriptionResult = await this.indexRecordingTranscription(
        recordingId,
        projectId,
        organizationId
      );
      if (transcriptionResult.isErr()) {
        logger.warn("Failed to index transcription", {
          recordingId,
          error: transcriptionResult.error,
        });
      }

      // Index summary
      const summaryResult = await this.indexRecordingSummary(
        recordingId,
        projectId,
        organizationId
      );
      if (summaryResult.isErr()) {
        logger.warn("Failed to index summary", {
          recordingId,
          error: summaryResult.error,
        });
      }

      // Index tasks
      const tasksResult = await this.indexRecordingTasks(
        recordingId,
        projectId,
        organizationId
      );
      if (tasksResult.isErr()) {
        logger.warn("Failed to index tasks", {
          recordingId,
          error: tasksResult.error,
        });
      }

      logger.info("Completed full recording indexing", { recordingId });

      return ok(undefined);
    } catch (error) {
      logger.error("Error indexing recording", { error, recordingId });
      return err(
        ActionErrors.internal(
          "Error indexing recording",
          error as Error,
          "EmbeddingService.indexRecording"
        )
      );
    }
  }

  /**
   * Index all recordings in a project
   */
  static async indexProject(
    projectId: string,
    organizationId: string
  ): Promise<ActionResult<{ indexed: number; failed: number }>> {
    try {
      logger.info("Starting project indexing", { projectId });

      const recordings = await RecordingsQueries.selectRecordingsByProjectId(
        projectId
      );

      let indexed = 0;
      let failed = 0;

      for (const recording of recordings) {
        const result = await this.indexRecording(
          recording.id,
          projectId,
          organizationId
        );

        if (result.isOk()) {
          indexed++;
        } else {
          failed++;
        }
      }

      logger.info("Completed project indexing", { projectId, indexed, failed });

      return ok({ indexed, failed });
    } catch (error) {
      logger.error("Error indexing project", { error, projectId });
      return err(
        ActionErrors.internal(
          "Error indexing project",
          error as Error,
          "EmbeddingService.indexProject"
        )
      );
    }
  }
}

