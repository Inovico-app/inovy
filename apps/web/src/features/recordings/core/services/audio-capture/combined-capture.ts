/**
 * CombinedCaptureService — captures both microphone and system audio, mixed
 * into a single stream.
 *
 * Uses composition: delegates to MicrophoneCaptureService and
 * SystemAudioCaptureService, then mixes their outputs via `mixStreams()`.
 *
 * Graceful degradation: if system audio fails (e.g. user declines sharing
 * or browser doesn't support it), the service falls back to mic-only
 * capture and emits a warning-level CaptureError.
 */

import { ResultAsync } from "neverthrow";

import {
  createCaptureError,
  type CaptureError,
} from "../../recording-session.errors";
import type { AudioChunk, Unsubscribe } from "../../recording-session.types";
import { TypedEventEmitter } from "../../utils/event-emitter";
import { ResourceTracker } from "../../utils/resource-tracker";
import type {
  AudioCaptureService,
  AudioCaptureInitConfig,
} from "./audio-capture.interface";
import { type MixStreamsResult, mixStreams } from "./audio-mixer";
import { MicrophoneCaptureService } from "./microphone-capture";
import { SystemAudioCaptureService } from "./system-audio-capture";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

interface CombinedCaptureEvents {
  chunk: [AudioChunk];
  error: [CaptureError];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CombinedCaptureService implements AudioCaptureService {
  private readonly emitter = new TypedEventEmitter<CombinedCaptureEvents>();
  private readonly resources = new ResourceTracker();

  private readonly micService = new MicrophoneCaptureService();
  private readonly systemService = new SystemAudioCaptureService();

  private mixResult: MixStreamsResult | null = null;
  private recorder: MediaRecorder | null = null;
  private chunkIndex = 0;
  private recordingStartTime = 0;
  private lastChunkTimestamp = 0;
  private active = false;
  private micOnly = false;
  private timeslice = 0;

  // -----------------------------------------------------------------------
  // AudioCaptureService — initialize
  // -----------------------------------------------------------------------

  initialize(config?: AudioCaptureInitConfig): ResultAsync<void, CaptureError> {
    return ResultAsync.fromPromise(this.doInitialize(config), (error) =>
      createCaptureError(
        "MEDIA_RECORDER_ERROR",
        error instanceof Error ? error.message : String(error),
        { cause: error },
      ),
    );
  }

  private async doInitialize(config?: AudioCaptureInitConfig): Promise<void> {
    this.releaseResources();

    // 1. Initialize microphone first (required)
    const micResult = await this.micService.initialize(config);
    if (micResult.isErr()) {
      throw micResult.error;
    }

    // Forward mic sub-service errors
    this.micService.onError((err) => this.emitter.emit("error", err));

    // 2. Attempt system audio (optional — graceful degradation)
    const systemResult = await this.systemService.initialize(config);

    if (systemResult.isErr()) {
      // Fall back to mic-only
      this.micOnly = true;

      this.emitter.emit(
        "error",
        createCaptureError(
          "SYSTEM_AUDIO_NOT_SUPPORTED",
          "System audio not available — falling back to microphone only",
          { severity: "warning", recoverable: true, cause: systemResult.error },
        ),
      );

      this.active = true;
      return;
    }

    // Forward system sub-service errors
    this.systemService.onError((err) => this.emitter.emit("error", err));

    // 3. Mix both streams
    const micStream = this.micService.getStream();
    const systemStream = this.systemService.getStream();

    if (!micStream) {
      throw new Error("Microphone stream not available after initialization");
    }

    const streams = systemStream ? [micStream, systemStream] : [micStream];

    this.mixResult = mixStreams(streams);

    // Track the mixer's AudioContext for cleanup
    this.resources.track({
      dispose: () => {
        if (this.mixResult) {
          this.mixResult.mixedStream.getTracks().forEach((t) => t.stop());
          if (this.mixResult.audioContext.state !== "closed") {
            void this.mixResult.audioContext.close();
          }
        }
      },
    });

    this.active = true;
  }

  // -----------------------------------------------------------------------
  // AudioCaptureService — reinitialize
  // -----------------------------------------------------------------------

  reinitialize(
    config?: AudioCaptureInitConfig,
  ): ResultAsync<void, CaptureError> {
    return ResultAsync.fromPromise(this.doReinitialize(config), (error) =>
      createCaptureError(
        "MEDIA_RECORDER_ERROR",
        error instanceof Error ? error.message : String(error),
        { cause: error },
      ),
    );
  }

  private async doReinitialize(config?: AudioCaptureInitConfig): Promise<void> {
    // 1. Save state
    const savedChunkIndex = this.chunkIndex;
    const savedLastChunkTimestamp = this.lastChunkTimestamp;
    const savedTimeslice = this.timeslice;

    // 2. Detach handlers from old recorder
    if (this.recorder) {
      this.recorder.ondataavailable = null;
      this.recorder.onerror = null;
    }

    // 3. Stop old MediaRecorder
    if (this.recorder && this.recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        const onStop = () => {
          this.recorder?.removeEventListener("stop", onStop);
          resolve();
        };
        this.recorder!.addEventListener("stop", onStop);
        this.recorder!.stop();
      });
    }

    // 4. Release mixer and recorder (preserves event listeners)
    this.releaseMediaResources();

    // 5. Reinitialize mic sub-service with new device
    const micResult = await this.micService.reinitialize(config);
    if (micResult.isErr()) {
      throw micResult.error;
    }

    // 6. Rebuild stream: mixed or mic-only
    const newMicStream = this.micService.getStream();
    if (!newMicStream) {
      throw new Error("Microphone stream not available after reinitialize");
    }

    let recordingStream: MediaStream;

    if (this.micOnly) {
      // mic-only mode: use mic stream directly
      recordingStream = newMicStream;
    } else {
      // mixed mode: combine new mic + existing system stream
      const systemStream = this.systemService.getStream();
      const streams = systemStream
        ? [newMicStream, systemStream]
        : [newMicStream];
      this.mixResult = mixStreams(streams);
      recordingStream = this.mixResult.mixedStream;

      // Register new mixer for cleanup (so stop() disposes it properly)
      this.resources.track({
        dispose: () => {
          if (this.mixResult) {
            this.mixResult.mixedStream.getTracks().forEach((t) => t.stop());
            if (this.mixResult.audioContext.state !== "closed") {
              void this.mixResult.audioContext.close();
            }
          }
        },
      });
    }

    // 7. Re-register mic error forwarding (mic's reinitialize preserves
    // its own emitter, but combined's doInitialize registered the
    // forwarding which was lost when we disposed resources)
    this.micService.onError((err) => this.emitter.emit("error", err));

    // 8. Create new MediaRecorder
    const mimeType = this.selectMimeType();
    const recorder = new MediaRecorder(recordingStream, {
      ...(mimeType ? { mimeType } : {}),
    });
    this.recorder = recorder;

    // 9. Restore chunk state BEFORE start (start may emit a micro-chunk)
    this.chunkIndex = savedChunkIndex;
    this.lastChunkTimestamp = savedLastChunkTimestamp;
    this.timeslice = savedTimeslice;

    // 10. Attach handlers
    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size === 0) return;
      const now = Date.now();
      const chunk: AudioChunk = {
        data: event.data,
        index: this.chunkIndex++,
        timestamp: now,
        duration: now - this.lastChunkTimestamp,
      };
      this.lastChunkTimestamp = now;
      this.emitter.emit("chunk", chunk);
    };

    recorder.onerror = (event: Event) => {
      this.emitter.emit(
        "error",
        createCaptureError(
          "MEDIA_RECORDER_ERROR",
          event instanceof ErrorEvent ? event.message : "MediaRecorder error",
          { cause: event },
        ),
      );
    };

    // 11. Start then immediately pause
    recorder.start(savedTimeslice);
    recorder.pause();
  }

  // -----------------------------------------------------------------------
  // AudioCaptureService — start / pause / resume
  // -----------------------------------------------------------------------

  start(timeslice: number): void {
    this.timeslice = timeslice;

    const stream = this.getRecordingStream();

    if (!stream) {
      this.emitter.emit(
        "error",
        createCaptureError(
          "MEDIA_RECORDER_ERROR",
          "Cannot start: combined capture not initialized",
        ),
      );
      return;
    }

    const mimeType = this.selectMimeType();

    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
    });

    this.recorder = recorder;
    this.chunkIndex = 0;
    this.recordingStartTime = Date.now();
    this.lastChunkTimestamp = this.recordingStartTime;

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size === 0) return;

      const now = Date.now();
      const chunk: AudioChunk = {
        data: event.data,
        index: this.chunkIndex++,
        timestamp: now,
        duration: now - this.lastChunkTimestamp,
      };
      this.lastChunkTimestamp = now;

      this.emitter.emit("chunk", chunk);
    };

    recorder.onerror = (event: Event) => {
      this.emitter.emit(
        "error",
        createCaptureError(
          "MEDIA_RECORDER_ERROR",
          event instanceof ErrorEvent ? event.message : "MediaRecorder error",
          { cause: event },
        ),
      );
    };

    recorder.start(timeslice);
  }

  pause(): void {
    if (this.recorder?.state === "recording") {
      this.recorder.pause();
    }
  }

  resume(): void {
    if (this.recorder?.state === "paused") {
      this.recorder.resume();
    }
  }

  // -----------------------------------------------------------------------
  // AudioCaptureService — stop
  // -----------------------------------------------------------------------

  stop(): ResultAsync<void, CaptureError> {
    return ResultAsync.fromPromise(this.doStop(), (error) =>
      createCaptureError(
        "MEDIA_RECORDER_ERROR",
        error instanceof Error ? error.message : String(error),
        { cause: error },
      ),
    );
  }

  private async doStop(): Promise<void> {
    // 1. Stop the combined recorder
    if (this.recorder && this.recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        const onStop = () => {
          this.recorder?.removeEventListener("stop", onStop);
          resolve();
        };
        this.recorder!.addEventListener("stop", onStop);
        this.recorder!.stop();
      });
    }

    // 2. Stop both sub-services
    const micStop = this.micService.stop();
    const systemStop = this.micOnly
      ? ResultAsync.fromSafePromise(Promise.resolve(undefined))
      : this.systemService.stop();

    // Wait for both — ignore individual errors (resources will be cleaned up)
    await Promise.allSettled([micStop, systemStop]);

    // 3. Release our own resources (mixer AudioContext, etc.)
    this.releaseResources();
  }

  // -----------------------------------------------------------------------
  // AudioCaptureService — event subscriptions
  // -----------------------------------------------------------------------

  onChunk(callback: (chunk: AudioChunk) => void): Unsubscribe {
    return this.emitter.on("chunk", callback);
  }

  onError(callback: (error: CaptureError) => void): Unsubscribe {
    return this.emitter.on("error", callback);
  }

  // -----------------------------------------------------------------------
  // AudioCaptureService — queries
  // -----------------------------------------------------------------------

  getStream(): MediaStream | null {
    return this.getRecordingStream();
  }

  isActive(): boolean {
    return this.active;
  }

  // -----------------------------------------------------------------------
  // Gain control (delegates to mic sub-service)
  // -----------------------------------------------------------------------

  setGain(value: number): void {
    this.micService.setGain(value);
  }

  getGain(): number {
    return this.micService.getGain();
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  /**
   * Returns the stream that the MediaRecorder should record from:
   * - If mixed, use the mixResult's mixed stream
   * - If mic-only fallback, use the mic's processed stream directly
   */
  private getRecordingStream(): MediaStream | null {
    if (this.micOnly) {
      return this.micService.getStream();
    }
    return this.mixResult?.mixedStream ?? null;
  }

  /**
   * Release the combined service's own resources (mixer, recorder)
   * WITHOUT clearing event listeners or active flag.
   */
  private releaseMediaResources(): void {
    // Dispose mixer AudioContext
    if (this.mixResult) {
      this.mixResult.mixedStream.getTracks().forEach((t) => t.stop());
      if (this.mixResult.audioContext.state !== "closed") {
        void this.mixResult.audioContext.close();
      }
    }
    this.resources.disposeAll();
    this.recorder = null;
    this.mixResult = null;
  }

  private releaseResources(): void {
    this.active = false;
    this.releaseMediaResources();
    this.emitter.removeAllListeners();
  }

  private selectMimeType(): string | undefined {
    for (const mime of PREFERRED_MIME_TYPES) {
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(mime)
      ) {
        return mime;
      }
    }
    return undefined;
  }
}
