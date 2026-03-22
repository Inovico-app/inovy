/**
 * MicrophoneCaptureService — captures microphone audio with gain control.
 *
 * Ported from the legacy `MicrophoneProvider` / `microphone-audio-processor`
 * into a class that implements the `AudioCaptureService` interface.
 *
 * Lifecycle:
 *   1. initialize()  — getUserMedia + AudioContext + GainNode pipeline
 *   2. start()       — create MediaRecorder, begin collecting chunks
 *   3. pause() / resume()
 *   4. stop()        — stop recorder, release all browser resources
 */

import { createAudioContext } from "@/lib/audio/create-audio-context";
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

const DEFAULT_GAIN = 1.0;
const MIN_GAIN = 0.0;
const MAX_GAIN = 3.0;

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

interface MicrophoneCaptureEvents {
  chunk: [AudioChunk];
  error: [CaptureError];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class MicrophoneCaptureService implements AudioCaptureService {
  private readonly emitter = new TypedEventEmitter<MicrophoneCaptureEvents>();
  private readonly resources = new ResourceTracker();

  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private processedStream: MediaStream | null = null;
  private rawStream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunkIndex = 0;
  private recordingStartTime = 0;
  private lastChunkTimestamp = 0;
  private active = false;
  private gain = DEFAULT_GAIN;
  private timeslice = 0;

  // -----------------------------------------------------------------------
  // AudioCaptureService — initialize
  // -----------------------------------------------------------------------

  initialize(config?: AudioCaptureInitConfig): ResultAsync<void, CaptureError> {
    return ResultAsync.fromPromise(
      this.doInitialize(config?.deviceId),
      (error) =>
        createCaptureError(
          this.classifyInitError(error),
          error instanceof Error ? error.message : String(error),
          { cause: error },
        ),
    );
  }

  private async doInitialize(deviceId?: string): Promise<void> {
    this.releaseResources();
    await this.buildPipeline(deviceId);
  }

  /**
   * Core pipeline: getUserMedia + AudioContext + GainNode.
   * Does NOT call releaseResources() — caller is responsible for cleanup.
   */
  private async buildPipeline(deviceId?: string): Promise<void> {
    // 1. Acquire raw microphone stream
    const audioConstraints: MediaTrackConstraints = {
      noiseSuppression: true,
      echoCancellation: true,
    };

    if (deviceId && deviceId !== "default") {
      audioConstraints.deviceId = { exact: deviceId };
    }

    const rawStream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
    });

    this.rawStream = rawStream;
    this.resources.track({
      dispose: () => rawStream.getTracks().forEach((t) => t.stop()),
    });

    // 2. Build gain pipeline: source -> gainNode -> destination
    const audioContext = createAudioContext();
    this.audioContext = audioContext;
    this.resources.track({
      dispose: () => {
        if (audioContext.state !== "closed") {
          void audioContext.close();
        }
      },
    });

    const gainNode = audioContext.createGain();
    gainNode.gain.value = this.gain;
    this.gainNode = gainNode;

    const source = audioContext.createMediaStreamSource(rawStream);
    const destination = audioContext.createMediaStreamDestination();

    source.connect(gainNode);
    gainNode.connect(destination);

    this.processedStream = destination.stream;
    this.resources.track({
      dispose: () => destination.stream.getTracks().forEach((t) => t.stop()),
    });

    this.active = true;
  }

  // -----------------------------------------------------------------------
  // AudioCaptureService — reinitialize
  // -----------------------------------------------------------------------

  reinitialize(
    config?: AudioCaptureInitConfig,
  ): ResultAsync<void, CaptureError> {
    return ResultAsync.fromPromise(
      this.doReinitialize(config?.deviceId),
      (error) =>
        createCaptureError(
          this.classifyInitError(error),
          error instanceof Error ? error.message : String(error),
          { cause: error },
        ),
    );
  }

  private async doReinitialize(deviceId?: string): Promise<void> {
    // 1. Save state that must survive the rebuild
    const savedChunkIndex = this.chunkIndex;
    const savedLastChunkTimestamp = this.lastChunkTimestamp;
    const savedGain = this.gain;
    const savedTimeslice = this.timeslice;

    // 2. Detach handlers from old recorder to prevent spurious events
    if (this.recorder) {
      this.recorder.ondataavailable = null;
      this.recorder.onerror = null;
    }

    // 3. Stop the old MediaRecorder (it's in paused state)
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

    // 4. Release browser resources (preserves event listeners and active flag)
    this.releaseMediaResources();

    // 5. Build new pipeline with new device (NOT doInitialize — that destroys listeners)
    await this.buildPipeline(deviceId);

    // 6. Restore gain
    this.gain = savedGain;
    if (this.gainNode) {
      this.gainNode.gain.value = this.gain;
    }

    // 7. Create new MediaRecorder on the new stream
    if (!this.processedStream) {
      throw new Error("Cannot reinitialize: stream not available after init");
    }

    const mimeType = this.selectMimeType();
    const recorder = new MediaRecorder(this.processedStream, {
      ...(mimeType ? { mimeType } : {}),
    });
    this.recorder = recorder;

    // 8. Restore chunk state BEFORE start (start may emit a micro-chunk)
    this.chunkIndex = savedChunkIndex;
    this.lastChunkTimestamp = savedLastChunkTimestamp;
    this.timeslice = savedTimeslice;

    // 9. Attach handlers
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

    // 10. Start then immediately pause — ready for resume()
    recorder.start(savedTimeslice);
    recorder.pause();
  }

  // -----------------------------------------------------------------------
  // AudioCaptureService — start / pause / resume
  // -----------------------------------------------------------------------

  start(timeslice: number): void {
    this.timeslice = timeslice;

    if (!this.processedStream) {
      this.emitter.emit(
        "error",
        createCaptureError(
          "MEDIA_RECORDER_ERROR",
          "Cannot start: microphone not initialized",
        ),
      );
      return;
    }

    const mimeType = this.selectMimeType();

    const recorder = new MediaRecorder(this.processedStream, {
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
    // Stop the MediaRecorder first — wait for any final dataavailable event
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
    return this.processedStream;
  }

  isActive(): boolean {
    return this.active;
  }

  // -----------------------------------------------------------------------
  // Gain control (microphone-specific)
  // -----------------------------------------------------------------------

  setGain(value: number): void {
    this.gain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, value));
    if (this.gainNode) {
      this.gainNode.gain.value = this.gain;
    }
  }

  getGain(): number {
    return this.gain;
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private releaseMediaResources(): void {
    this.resources.disposeAll();
    this.recorder = null;
    this.processedStream = null;
    this.rawStream = null;
    this.audioContext = null;
    this.gainNode = null;
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
    return undefined; // let the browser pick its default
  }

  private classifyInitError(error: unknown): CaptureError["code"] {
    if (error instanceof DOMException) {
      if (error.name === "NotAllowedError") return "PERMISSION_DENIED";
      if (error.name === "NotFoundError") return "DEVICE_NOT_FOUND";
      if (error.name === "NotReadableError") return "DEVICE_NOT_FOUND";
    }
    return "MEDIA_RECORDER_ERROR";
  }
}
