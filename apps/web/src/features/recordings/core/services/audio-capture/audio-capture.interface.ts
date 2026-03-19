import type { ResultAsync } from "neverthrow";

import type { CaptureError } from "../../recording-session.errors";
import type { AudioChunk, Unsubscribe } from "../../recording-session.types";

export interface AudioCaptureService {
  initialize(): ResultAsync<void, CaptureError>;
  start(timeslice: number): void;
  pause(): void;
  resume(): void;
  stop(): ResultAsync<void, CaptureError>;

  onChunk(callback: (chunk: AudioChunk) => void): Unsubscribe;
  onError(callback: (error: CaptureError) => void): Unsubscribe;

  getStream(): MediaStream | null;
  isActive(): boolean;
}
