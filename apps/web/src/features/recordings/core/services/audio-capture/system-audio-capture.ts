/**
 * SystemAudioCaptureService — captures system/tab audio via getDisplayMedia.
 *
 * Ported from the legacy `SystemAudioProvider`.
 *
 * Key browser constraint: `getDisplayMedia` requires a video track. We keep
 * that track alive but *disabled* (`track.enabled = false`) — stopping it
 * would tear down the entire capture session. All tracks (including the
 * disabled video track) are cleaned up on `stop()`.
 */

import { ResultAsync, okAsync } from "neverthrow";

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

interface SystemAudioCaptureEvents {
  chunk: [AudioChunk];
  error: [CaptureError];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SystemAudioCaptureService implements AudioCaptureService {
  private readonly emitter = new TypedEventEmitter<SystemAudioCaptureEvents>();
  private readonly resources = new ResourceTracker();

  private displayStream: MediaStream | null = null;
  private audioStream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunkIndex = 0;
  private recordingStartTime = 0;
  private lastChunkTimestamp = 0;
  private active = false;

  // -----------------------------------------------------------------------
  // AudioCaptureService — initialize
  // -----------------------------------------------------------------------

  // deviceId is ignored — system audio uses getDisplayMedia, not getUserMedia
  initialize(
    _config?: AudioCaptureInitConfig,
  ): ResultAsync<void, CaptureError> {
    return ResultAsync.fromPromise(this.doInitialize(), (error) =>
      createCaptureError(
        this.classifyInitError(error),
        error instanceof Error ? error.message : String(error),
        { cause: error },
      ),
    );
  }

  private async doInitialize(): Promise<void> {
    // Clean up previous resources
    this.releaseResources();

    // Ensure getDisplayMedia is available
    if (
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getDisplayMedia !== "function"
    ) {
      throw new Error(
        "getDisplayMedia is not supported in this browser. Please use Chrome, Edge, or Opera.",
      );
    }

    // Request screen capture with audio
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        sampleRate: 44100,
      },
    });

    this.displayStream = displayStream;

    // Track the raw display stream for cleanup (stops ALL tracks)
    this.resources.track({
      dispose: () => displayStream.getTracks().forEach((t) => t.stop()),
    });

    // Validate audio tracks exist
    const audioTracks = displayStream.getAudioTracks();
    if (audioTracks.length === 0) {
      // Cleanup happens via ResourceTracker
      this.releaseResources();
      throw new Error(
        "No audio track available. Please ensure 'Share system audio' is selected when sharing your screen.",
      );
    }

    // Keep video tracks alive but disabled (required by the API)
    const videoTracks = displayStream.getVideoTracks();
    for (const track of videoTracks) {
      track.enabled = false;
    }

    // Create an audio-only stream for recording
    this.audioStream = new MediaStream(audioTracks);

    // Monitor track-ended events — user may revoke sharing at any time
    for (const track of displayStream.getTracks()) {
      track.onended = () => {
        this.emitter.emit(
          "error",
          createCaptureError(
            "DEVICE_LOST",
            `${track.kind} track ended — user stopped sharing`,
            { severity: "fatal", recoverable: false },
          ),
        );
        this.releaseResources();
      };
    }

    this.active = true;
  }

  // deviceId is ignored — system audio uses getDisplayMedia, not getUserMedia
  reinitialize(
    _config?: AudioCaptureInitConfig,
  ): ResultAsync<void, CaptureError> {
    return okAsync(undefined);
  }

  // -----------------------------------------------------------------------
  // AudioCaptureService — start / pause / resume
  // -----------------------------------------------------------------------

  start(timeslice: number): void {
    if (!this.audioStream) {
      this.emitter.emit(
        "error",
        createCaptureError(
          "MEDIA_RECORDER_ERROR",
          "Cannot start: system audio not initialized",
        ),
      );
      return;
    }

    const mimeType = this.selectMimeType();

    const recorder = new MediaRecorder(this.audioStream, {
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
    return this.audioStream;
  }

  isActive(): boolean {
    return this.active;
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private releaseResources(): void {
    this.active = false;
    this.resources.disposeAll();
    this.recorder = null;
    this.displayStream = null;
    this.audioStream = null;
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

  private classifyInitError(error: unknown): CaptureError["code"] {
    if (error instanceof DOMException) {
      if (error.name === "NotAllowedError") return "PERMISSION_DENIED";
      if (error.name === "NotFoundError") return "DEVICE_NOT_FOUND";
    }
    if (error instanceof Error && error.message.includes("not supported")) {
      return "SYSTEM_AUDIO_NOT_SUPPORTED";
    }
    return "MEDIA_RECORDER_ERROR";
  }
}
