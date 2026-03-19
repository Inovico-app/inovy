import type { ResultAsync } from "neverthrow";

import type { TranscriptionError } from "../../recording-session.errors";
import type {
  AudioChunk,
  ConnectionStatus,
  TranscriptionConfig,
  TranscriptSegment,
  Unsubscribe,
} from "../../recording-session.types";

export interface LiveTranscriptionService {
  connect(config: TranscriptionConfig): ResultAsync<void, TranscriptionError>;
  disconnect(): void;
  sendChunk(chunk: AudioChunk): void;

  onSegment(callback: (segment: TranscriptSegment) => void): Unsubscribe;
  onStatusChange(callback: (status: ConnectionStatus) => void): Unsubscribe;

  getStatus(): ConnectionStatus;
  getSegments(): TranscriptSegment[];
}
