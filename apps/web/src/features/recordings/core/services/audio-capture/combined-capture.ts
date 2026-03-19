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
import type { AudioCaptureService } from "./audio-capture.interface";
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

  // -----------------------------------------------------------------------
  // AudioCaptureService — initialize
  // -----------------------------------------------------------------------

  initialize(): ResultAsync<void, CaptureError> {
    return ResultAsync.fromPromise(this.doInitialize(), (error) =>
      createCaptureError(
        "MEDIA_RECORDER_ERROR",
        error instanceof Error ? error.message : String(error),
        { cause: error },
      ),
    );
  }

  private async doInitialize(): Promise<void> {
    this.releaseResources();

    // 1. Initialize microphone first (required)
    const micResult = await this.micService.initialize();
    if (micResult.isErr()) {
      throw micResult.error;
    }

    // Forward mic sub-service errors
    this.micService.onError((err) => this.emitter.emit("error", err));

    // 2. Attempt system audio (optional — graceful degradation)
    const systemResult = await this.systemService.initialize();

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
  // AudioCaptureService — start / pause / resume
  // -----------------------------------------------------------------------

  start(timeslice: number): void {
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

  private releaseResources(): void {
    this.active = false;
    this.resources.disposeAll();
    this.recorder = null;
    this.mixResult = null;
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
