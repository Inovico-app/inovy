import { errAsync, okAsync } from "neverthrow";

import type { ResultAsync } from "neverthrow";

import type { CaptureError } from "../../recording-session.errors";
import type { AudioChunk, Unsubscribe } from "../../recording-session.types";
import { TypedEventEmitter } from "../../utils/event-emitter";
import type {
  AudioCaptureService,
  AudioCaptureInitConfig,
} from "./audio-capture.interface";

interface FakeAudioCaptureEvents {
  chunk: [AudioChunk];
  error: [CaptureError];
}

export class FakeAudioCaptureService implements AudioCaptureService {
  private emitter = new TypedEventEmitter<FakeAudioCaptureEvents>();
  private active = false;
  private stream: MediaStream | null = null;
  private lastInitConfig: AudioCaptureInitConfig | undefined = undefined;

  // --- Test controls ---
  shouldFailInitialize = false;
  initializeError: CaptureError | null = null;
  shouldFailStop = false;
  stopError: CaptureError | null = null;

  initialize(config?: AudioCaptureInitConfig): ResultAsync<void, CaptureError> {
    this.lastInitConfig = config;
    if (this.shouldFailInitialize && this.initializeError) {
      return errAsync(this.initializeError);
    }
    this.active = true;
    return okAsync(undefined);
  }

  reinitialize(
    config?: AudioCaptureInitConfig,
  ): ResultAsync<void, CaptureError> {
    this.lastInitConfig = config;
    if (this.shouldFailInitialize && this.initializeError) {
      return errAsync(this.initializeError);
    }
    return okAsync(undefined);
  }

  getLastInitConfig(): AudioCaptureInitConfig | undefined {
    return this.lastInitConfig;
  }

  start(_timeslice: number): void {
    this.active = true;
  }

  pause(): void {
    // no-op for fake
  }

  resume(): void {
    // no-op for fake
  }

  stop(): ResultAsync<void, CaptureError> {
    if (this.shouldFailStop && this.stopError) {
      return errAsync(this.stopError);
    }
    this.active = false;
    this.stream = null;
    this.emitter.removeAllListeners();
    return okAsync(undefined);
  }

  onChunk(callback: (chunk: AudioChunk) => void): Unsubscribe {
    return this.emitter.on("chunk", callback);
  }

  onError(callback: (error: CaptureError) => void): Unsubscribe {
    return this.emitter.on("error", callback);
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  isActive(): boolean {
    return this.active;
  }

  // --- Test helpers ---

  emitChunk(chunk: AudioChunk): void {
    this.emitter.emit("chunk", chunk);
  }

  emitError(error: CaptureError): void {
    this.emitter.emit("error", error);
  }

  setStream(stream: MediaStream): void {
    this.stream = stream;
  }
}
