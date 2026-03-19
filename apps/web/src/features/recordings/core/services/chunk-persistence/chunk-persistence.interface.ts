import type { ResultAsync } from "neverthrow";

import type { PersistenceError } from "../../recording-session.errors";
import type {
  AudioChunk,
  ChunkManifest,
  FinalizedRecording,
  RecoveredSession,
  SessionMetadata,
} from "../../recording-session.types";

export interface ChunkPersistenceService {
  initialize(
    sessionId: string,
    metadata: SessionMetadata,
  ): ResultAsync<void, PersistenceError>;
  finalize(
    actualDuration?: number,
  ): ResultAsync<FinalizedRecording, PersistenceError>;
  abort(): ResultAsync<void, PersistenceError>;
  persistChunk(chunk: AudioChunk): ResultAsync<void, PersistenceError>;

  hasOrphanedSession(): Promise<boolean>;
  recoverSession(): Promise<RecoveredSession | null>;
  discardOrphanedSession(): Promise<void>;

  getManifest(): ChunkManifest;
}
