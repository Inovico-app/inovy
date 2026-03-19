import { errAsync, okAsync } from "neverthrow";

import type { ResultAsync } from "neverthrow";

import type { TranscriptionError } from "../../recording-session.errors";
import type {
  AudioChunk,
  ConnectionStatus,
  TranscriptionConfig,
  TranscriptSegment,
  Unsubscribe,
} from "../../recording-session.types";
import { TypedEventEmitter } from "../../utils/event-emitter";
import type { LiveTranscriptionService } from "./live-transcription.interface";

interface FakeTranscriptionEvents {
  segment: [TranscriptSegment];
  statusChange: [ConnectionStatus];
}

export class FakeLiveTranscriptionService implements LiveTranscriptionService {
  private emitter = new TypedEventEmitter<FakeTranscriptionEvents>();
  private status: ConnectionStatus = "disconnected";
  private segments: TranscriptSegment[] = [];
  private receivedChunks: AudioChunk[] = [];

  // --- Test controls ---
  shouldFailConnect = false;
  connectError: TranscriptionError | null = null;

  connect(_config: TranscriptionConfig): ResultAsync<void, TranscriptionError> {
    if (this.shouldFailConnect && this.connectError) {
      return errAsync(this.connectError);
    }
    this.setStatus("connected");
    return okAsync(undefined);
  }

  disconnect(): void {
    this.setStatus("disconnected");
    this.emitter.removeAllListeners();
  }

  sendChunk(chunk: AudioChunk): void {
    this.receivedChunks.push(chunk);
  }

  onSegment(callback: (segment: TranscriptSegment) => void): Unsubscribe {
    return this.emitter.on("segment", callback);
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): Unsubscribe {
    return this.emitter.on("statusChange", callback);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getSegments(): TranscriptSegment[] {
    return [...this.segments];
  }

  // --- Test helpers ---

  emitSegment(segment: TranscriptSegment): void {
    this.segments.push(segment);
    this.emitter.emit("segment", segment);
  }

  setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.emitter.emit("statusChange", status);
  }

  getReceivedChunks(): AudioChunk[] {
    return [...this.receivedChunks];
  }
}
