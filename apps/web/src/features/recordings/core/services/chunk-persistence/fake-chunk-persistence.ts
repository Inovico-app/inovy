import { errAsync, okAsync } from "neverthrow";

import type { ResultAsync } from "neverthrow";

import type { PersistenceError } from "../../recording-session.errors";
import type {
  AudioChunk,
  ChunkManifest,
  FinalizedRecording,
  RecoveredSession,
  SessionMetadata,
} from "../../recording-session.types";
import type { ChunkPersistenceService } from "./chunk-persistence.interface";

export class FakeChunkPersistenceService implements ChunkPersistenceService {
  private manifest: ChunkManifest = {
    sessionId: "",
    totalChunks: 0,
    uploadedChunks: 0,
    pendingChunks: 0,
    totalBytes: 0,
    startedAt: 0,
  };

  private chunks: AudioChunk[] = [];

  // --- Test controls ---
  shouldFailInitialize = false;
  initializeError: PersistenceError | null = null;
  shouldFailFinalize = false;
  finalizeError: PersistenceError | null = null;
  shouldFailAbort = false;
  abortError: PersistenceError | null = null;
  shouldFailPersistChunk = false;
  persistChunkError: PersistenceError | null = null;
  orphanedSession: RecoveredSession | null = null;
  finalizedRecording: FinalizedRecording = {
    fileUrl: "https://example.com/recording.webm",
    fileSize: 1024,
    duration: 60,
    chunkCount: 10,
  };

  initialize(
    sessionId: string,
    _metadata: SessionMetadata,
  ): ResultAsync<void, PersistenceError> {
    if (this.shouldFailInitialize && this.initializeError) {
      return errAsync(this.initializeError);
    }
    this.manifest = {
      ...this.manifest,
      sessionId,
      startedAt: Date.now(),
    };
    return okAsync(undefined);
  }

  finalize(): ResultAsync<FinalizedRecording, PersistenceError> {
    if (this.shouldFailFinalize && this.finalizeError) {
      return errAsync(this.finalizeError);
    }
    return okAsync(this.finalizedRecording);
  }

  abort(): ResultAsync<void, PersistenceError> {
    if (this.shouldFailAbort && this.abortError) {
      return errAsync(this.abortError);
    }
    this.chunks = [];
    this.manifest = {
      ...this.manifest,
      totalChunks: 0,
      uploadedChunks: 0,
      pendingChunks: 0,
      totalBytes: 0,
    };
    return okAsync(undefined);
  }

  persistChunk(chunk: AudioChunk): ResultAsync<void, PersistenceError> {
    if (this.shouldFailPersistChunk && this.persistChunkError) {
      return errAsync(this.persistChunkError);
    }
    this.chunks.push(chunk);
    this.manifest = {
      ...this.manifest,
      totalChunks: this.manifest.totalChunks + 1,
      uploadedChunks: this.manifest.uploadedChunks + 1,
      totalBytes: this.manifest.totalBytes + chunk.data.size,
    };
    return okAsync(undefined);
  }

  async hasOrphanedSession(): Promise<boolean> {
    return this.orphanedSession !== null;
  }

  async recoverSession(): Promise<RecoveredSession | null> {
    return this.orphanedSession;
  }

  async discardOrphanedSession(): Promise<void> {
    this.orphanedSession = null;
  }

  getManifest(): ChunkManifest {
    return { ...this.manifest };
  }

  // --- Test helpers ---

  getPersistedChunks(): AudioChunk[] {
    return [...this.chunks];
  }

  setOrphanedSession(session: RecoveredSession): void {
    this.orphanedSession = session;
  }
}
