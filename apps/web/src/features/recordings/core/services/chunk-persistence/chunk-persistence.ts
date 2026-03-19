import { ResultAsync, okAsync } from "neverthrow";

import { createPersistenceError } from "../../recording-session.errors";
import type { PersistenceError } from "../../recording-session.errors";
import type {
  AudioChunk,
  ChunkManifest,
  FinalizedRecording,
  RecoveredSession,
  SessionMetadata,
} from "../../recording-session.types";
import { AzureBlockUploader } from "./azure-block-uploader";
import type { ChunkPersistenceService } from "./chunk-persistence.interface";
import type { IndexedDBChunkStore } from "./indexed-db-store";

// --- Configuration ---

export interface ChunkPersistenceConfig {
  requestSasToken: () => Promise<{
    uploadUrl: string;
    blobUrl: string;
    pathname: string;
  }>;
  onUploadComplete: (params: {
    blobUrl: string;
    pathname: string;
    fileSize: number;
    duration: number;
    metadata: SessionMetadata;
  }) => Promise<{ recordingId: string }>;
}

// --- Constants ---

const FLUSH_THRESHOLD = 20;

// --- Implementation ---

export class ChunkPersistenceServiceImpl implements ChunkPersistenceService {
  private readonly store: IndexedDBChunkStore;
  private readonly config: ChunkPersistenceConfig;
  private readonly uploader: AzureBlockUploader;

  private sessionId: string | null = null;
  private metadata: SessionMetadata | null = null;
  private blobUrl: string | null = null;
  private pathname: string | null = null;

  private buffer: AudioChunk[] = [];
  private blockCounter = 0;
  private committedBlockIds: string[] = [];
  private flushPromise: Promise<void> = Promise.resolve();
  private sasTokenPromise: Promise<void> = Promise.resolve();

  private manifest: ChunkManifest = {
    sessionId: "",
    totalChunks: 0,
    uploadedChunks: 0,
    pendingChunks: 0,
    totalBytes: 0,
    startedAt: 0,
  };

  constructor(store: IndexedDBChunkStore, config: ChunkPersistenceConfig) {
    this.store = store;
    this.config = config;
    this.uploader = new AzureBlockUploader();
  }

  // --- Public API ---

  initialize(
    sessionId: string,
    metadata: SessionMetadata,
  ): ResultAsync<void, PersistenceError> {
    // Phase 1: Create IndexedDB session (fast — milliseconds).
    // Phase 2: Request SAS token (slow — network call). Runs in the background
    // so recording can start immediately. The token is only needed when flushing
    // chunks to Azure, which doesn't happen until FLUSH_THRESHOLD chunks accumulate.
    return ResultAsync.fromPromise(
      this.store.createSession(sessionId, metadata),
      (error) =>
        createPersistenceError(
          "INDEXED_DB_ERROR",
          "Failed to create session in IndexedDB",
          {
            cause: error,
          },
        ),
    ).map(() => {
      this.sessionId = sessionId;
      this.metadata = metadata;
      this.manifest = {
        sessionId,
        totalChunks: 0,
        uploadedChunks: 0,
        pendingChunks: 0,
        totalBytes: 0,
        startedAt: metadata.startedAt,
      };

      // Request SAS token in the background — don't block recording start
      this.sasTokenPromise = this.config
        .requestSasToken()
        .then((sasResult) => {
          this.blobUrl = sasResult.blobUrl;
          this.pathname = sasResult.pathname;
          this.uploader.initialize(sasResult.uploadUrl);
        })
        .catch((error) => {
          console.error("[ChunkPersistence] SAS token request failed:", error);
          // Token will be retried on first flush or finalize
        });
    });
  }

  persistChunk(chunk: AudioChunk): ResultAsync<void, PersistenceError> {
    if (!this.sessionId) {
      return ResultAsync.fromPromise(
        Promise.reject(new Error("Service not initialized")),
        () =>
          createPersistenceError(
            "INDEXED_DB_ERROR",
            "Service not initialized. Call initialize() first.",
          ),
      );
    }

    const sessionId = this.sessionId;

    return ResultAsync.fromPromise(
      this.store.putChunk(sessionId, chunk),
      (error) =>
        createPersistenceError(
          "INDEXED_DB_ERROR",
          "Failed to store chunk in IndexedDB",
          {
            cause: error,
          },
        ),
    ).map(() => {
      this.buffer.push(chunk);
      this.manifest = {
        ...this.manifest,
        totalChunks: this.manifest.totalChunks + 1,
        pendingChunks: this.manifest.pendingChunks + 1,
        totalBytes: this.manifest.totalBytes + chunk.data.size,
      };

      if (this.buffer.length >= FLUSH_THRESHOLD) {
        // Fire-and-forget flush; track the promise for finalize to await
        this.flushPromise = this.flushPromise
          .then(() => this.flushBuffer())
          .catch((error) => {
            console.error("[ChunkPersistence] Flush error:", error);
          });
      }
    });
  }

  finalize(
    actualDuration?: number,
  ): ResultAsync<FinalizedRecording, PersistenceError> {
    if (!this.sessionId || !this.metadata) {
      return ResultAsync.fromPromise(
        Promise.reject(new Error("Service not initialized")),
        () =>
          createPersistenceError(
            "FINALIZATION_FAILED",
            "Service not initialized. Call initialize() first.",
          ),
      );
    }

    const sessionId = this.sessionId;
    const metadata = this.metadata;

    // Wait for SAS token, then any in-flight flushes, then flush remaining buffer
    return ResultAsync.fromPromise(
      this.sasTokenPromise
        .then(() => this.flushPromise)
        .then(() => this.flushBuffer()),
      (error) =>
        createPersistenceError(
          "BLOCK_UPLOAD_FAILED",
          "Failed to flush remaining chunks",
          {
            cause: error,
          },
        ),
    )
      .andThen(() =>
        // Upload any pending chunks from IndexedDB (crash recovery case)
        ResultAsync.fromPromise(this.uploadPendingChunks(sessionId), (error) =>
          createPersistenceError(
            "BLOCK_UPLOAD_FAILED",
            "Failed to upload pending chunks during finalization",
            { cause: error },
          ),
        ),
      )
      .andThen(() =>
        // Commit block list
        ResultAsync.fromPromise(
          this.uploader.commitBlockList(this.committedBlockIds),
          (error) =>
            createPersistenceError(
              "COMMIT_FAILED",
              "Failed to commit block list",
              {
                cause: error,
              },
            ),
        ),
      )
      .andThen(() => {
        // Compute duration once before notifying server — reuse across the finalize flow
        const wallClockDuration = (Date.now() - this.manifest.startedAt) / 1000;
        const computedDuration = actualDuration ?? wallClockDuration;

        // Notify server (blobUrl/pathname are set after SAS token resolves)
        return ResultAsync.fromPromise(
          this.config.onUploadComplete({
            blobUrl: this.blobUrl ?? "",
            pathname: this.pathname ?? "",
            fileSize: this.manifest.totalBytes,
            duration: computedDuration,
            metadata,
          }),
          (error) =>
            createPersistenceError(
              "FINALIZATION_FAILED",
              "Failed to notify server of upload completion",
              { cause: error },
            ),
        ).map((uploadResult) => ({ uploadResult, computedDuration }));
      })
      .andThen(({ uploadResult, computedDuration }) =>
        // Clean up IndexedDB
        ResultAsync.fromPromise(
          this.store.finalizeSession(sessionId),
          (error) =>
            createPersistenceError(
              "INDEXED_DB_ERROR",
              "Failed to clean up IndexedDB after finalization",
              { cause: error },
            ),
        ).map(() => ({ uploadResult, computedDuration })),
      )
      .map(({ uploadResult, computedDuration }) => {
        const finalized: FinalizedRecording = {
          recordingId: uploadResult.recordingId,
          fileUrl: this.blobUrl ?? "",
          fileSize: this.manifest.totalBytes,
          duration: computedDuration,
          chunkCount: this.manifest.totalChunks,
        };

        this.reset();
        return finalized;
      });
  }

  abort(): ResultAsync<void, PersistenceError> {
    if (!this.sessionId) {
      return okAsync(undefined);
    }

    const sessionId = this.sessionId;

    return ResultAsync.fromPromise(
      this.store.finalizeSession(sessionId),
      (error) =>
        createPersistenceError(
          "INDEXED_DB_ERROR",
          "Failed to clean up IndexedDB during abort",
          {
            cause: error,
          },
        ),
    ).map(() => {
      this.reset();
    });
  }

  async hasOrphanedSession(): Promise<boolean> {
    // Clean up expired sessions before checking for orphans
    await this.store.cleanupExpiredSessions();
    const orphaned = await this.store.getOrphanedSessions();
    return orphaned.length > 0;
  }

  async recoverSession(): Promise<RecoveredSession | null> {
    const orphaned = await this.store.getOrphanedSessions();
    if (orphaned.length === 0) {
      return null;
    }

    const session = orphaned[0]!;
    const chunks = await this.store.getChunks(session.sessionId);

    const manifest: ChunkManifest = {
      sessionId: session.sessionId,
      totalChunks: chunks.length,
      uploadedChunks: 0,
      pendingChunks: chunks.length,
      totalBytes: chunks.reduce((sum, c) => sum + c.data.size, 0),
      startedAt: session.metadata.startedAt,
    };

    return {
      sessionId: session.sessionId,
      manifest,
      chunks,
      metadata: session.metadata,
    };
  }

  async discardOrphanedSession(): Promise<void> {
    const orphaned = await this.store.getOrphanedSessions();
    for (const session of orphaned) {
      await this.store.finalizeSession(session.sessionId);
    }
  }

  getManifest(): ChunkManifest {
    return { ...this.manifest };
  }

  // --- Private Helpers ---

  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0 || !this.sessionId) {
      return;
    }

    // Wait for SAS token if it hasn't resolved yet
    await this.sasTokenPromise;

    const chunksToFlush = [...this.buffer];
    this.buffer = [];

    // Concatenate all chunk data into a single Blob, deriving MIME type from the first chunk
    const concatenated = new Blob(
      chunksToFlush.map((c) => c.data),
      { type: chunksToFlush[0]?.data.type || "audio/webm" },
    );

    // Generate sequential block ID
    this.blockCounter++;
    const blockId = `block-${String(this.blockCounter).padStart(6, "0")}`;

    // Stage the block in Azure
    await this.uploader.stageBlock(blockId, concatenated);

    // Track block ID for commit
    this.committedBlockIds.push(blockId);

    // Mark chunks as uploaded in IndexedDB
    const sessionId = this.sessionId;
    for (const chunk of chunksToFlush) {
      await this.store.markUploaded(sessionId, chunk.index);
    }

    // Update manifest
    this.manifest = {
      ...this.manifest,
      uploadedChunks: this.manifest.uploadedChunks + chunksToFlush.length,
      pendingChunks: this.manifest.pendingChunks - chunksToFlush.length,
    };
  }

  private async uploadPendingChunks(sessionId: string): Promise<void> {
    const pending = await this.store.getPendingChunks(sessionId);
    if (pending.length === 0) {
      return;
    }

    // Upload any remaining pending chunks that weren't part of the buffer flush
    const concatenated = new Blob(
      pending.map((c) => c.data),
      { type: pending[0]?.data.type || "audio/webm" },
    );

    this.blockCounter++;
    const blockId = `block-${String(this.blockCounter).padStart(6, "0")}`;

    await this.uploader.stageBlock(blockId, concatenated);
    this.committedBlockIds.push(blockId);

    for (const chunk of pending) {
      await this.store.markUploaded(sessionId, chunk.index);
    }

    this.manifest = {
      ...this.manifest,
      uploadedChunks: this.manifest.uploadedChunks + pending.length,
      pendingChunks: 0,
    };
  }

  private reset(): void {
    this.sessionId = null;
    this.metadata = null;
    this.blobUrl = null;
    this.pathname = null;
    this.buffer = [];
    this.blockCounter = 0;
    this.committedBlockIds = [];
    this.flushPromise = Promise.resolve();
    this.manifest = {
      sessionId: "",
      totalChunks: 0,
      uploadedChunks: 0,
      pendingChunks: 0,
      totalBytes: 0,
      startedAt: 0,
    };
  }
}
