import type { AudioCaptureService } from "./services/audio-capture/audio-capture.interface";
import type { ChunkPersistenceService } from "./services/chunk-persistence/chunk-persistence.interface";
import type { LiveTranscriptionService } from "./services/live-transcription/live-transcription.interface";
import type {
  AudioChunk,
  AudioSource,
  ConsentState,
  FinalizedRecording,
  RecordingSessionState,
  RecordingStatus,
  RecoveredSession,
  Unsubscribe,
} from "./recording-session.types";
import type { RecordingError } from "./recording-session.errors";
import { createSessionError } from "./recording-session.errors";

// --- Dependency and config interfaces ---

export interface RecordingSessionDeps {
  audioCapture: AudioCaptureService;
  chunkPersistence: ChunkPersistenceService;
  liveTranscription?: LiveTranscriptionService;
}

export interface RecordingSessionConfig {
  projectId: string;
  audioSource: AudioSource;
  language: string;
  liveTranscriptionEnabled: boolean;
  consent: ConsentState;
}

// --- Valid transitions map ---

const VALID_TRANSITIONS: Record<
  RecordingStatus,
  ReadonlySet<RecordingStatus>
> = {
  idle: new Set(["initializing"]),
  initializing: new Set(["recording", "error"]),
  recording: new Set(["paused", "stopping", "error"]),
  paused: new Set(["recording", "stopping"]),
  stopping: new Set(["finalizing"]),
  finalizing: new Set(["complete", "error"]),
  complete: new Set([]),
  error: new Set(["idle", "finalizing"]),
};

// --- Default chunk timeslice in ms ---

const CHUNK_TIMESLICE_MS = 250;

// --- RecordingSession FSM ---

export class RecordingSession {
  private readonly deps: RecordingSessionDeps;
  private readonly config: RecordingSessionConfig;

  private state: RecordingSessionState;
  private stateListeners = new Set<(state: RecordingSessionState) => void>();

  private sessionId: string;
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribes: Unsubscribe[] = [];
  private destroyed = false;
  private finalizedRecording: FinalizedRecording | null = null;

  constructor(deps: RecordingSessionDeps, config: RecordingSessionConfig) {
    this.deps = deps;
    this.config = config;
    this.sessionId = crypto.randomUUID();

    this.state = {
      status: "idle",
      duration: 0,
      audioSource: config.audioSource,
      chunks: {
        sessionId: this.sessionId,
        totalChunks: 0,
        uploadedChunks: 0,
        pendingChunks: 0,
        totalBytes: 0,
        startedAt: 0,
      },
      transcription: {
        status: "disconnected",
        segments: [],
        currentCaption: null,
      },
      error: null,
      errorIsRecoverable: false,
      warnings: [],
      consent: config.consent,
      orphanedSession: null,
    };
  }

  // --- Public API ---

  getState(): RecordingSessionState {
    return { ...this.state };
  }

  /** Returns the active MediaStream from the audio capture service (if any). */
  getMediaStream(): MediaStream | null {
    return this.deps.audioCapture.getStream();
  }

  onStateChange(callback: (state: RecordingSessionState) => void): Unsubscribe {
    this.stateListeners.add(callback);
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  async start(deviceId?: string): Promise<void> {
    console.log(
      "[RecordingSession] start() called, current status:",
      this.state.status,
    );
    if (!this.transition("initializing")) {
      console.warn(
        "[RecordingSession] start: transition to initializing BLOCKED from status:",
        this.state.status,
      );
      return;
    }

    console.log("[RecordingSession] start: initializing audio capture...");

    // Initialize audio capture
    const initResult = await this.deps.audioCapture.initialize({ deviceId });

    if (initResult.isErr()) {
      console.error(
        "[RecordingSession] start: audio capture init failed",
        initResult.error,
      );
      this.transitionToError(initResult.error);
      return;
    }

    console.log(
      "[RecordingSession] start: audio capture ready, initializing persistence...",
    );

    // Initialize chunk persistence
    const persistInitResult = await this.deps.chunkPersistence.initialize(
      this.sessionId,
      {
        projectId: this.config.projectId,
        audioSource: this.config.audioSource,
        language: this.config.language,
        startedAt: Date.now(),
        consent: this.config.consent,
      },
    );

    if (persistInitResult.isErr()) {
      console.error(
        "[RecordingSession] start: persistence init failed",
        persistInitResult.error,
      );
      this.transitionToError(persistInitResult.error);
      return;
    }

    console.log(
      "[RecordingSession] start: persistence ready, transitioning to recording...",
    );

    // Connect live transcription (if enabled). Awaited so the WebSocket is
    // established before audio starts flowing — prevents the race condition
    // where Deepgram closes an idle connection.
    if (this.config.liveTranscriptionEnabled && this.deps.liveTranscription) {
      console.log("[RecordingSession] start: connecting to Deepgram...");
      const transcriptionResult = await this.deps.liveTranscription.connect({
        model: "nova-3",
        language: this.config.language,
        enableDiarization: true,
        interimResults: true,
      });

      if (transcriptionResult.isErr()) {
        // Non-fatal: add warning, continue without transcription
        console.warn(
          "[RecordingSession] start: Deepgram connect failed",
          transcriptionResult.error,
        );
        this.addWarning(transcriptionResult.error);
      } else {
        console.log("[RecordingSession] start: Deepgram connected");
        this.setupTranscriptionListeners();
        this.setState({
          transcription: {
            ...this.state.transcription,
            status: this.deps.liveTranscription!.getStatus(),
          },
        });
      }
    }

    // Set up chunk routing and error handling BEFORE starting capture
    this.setupChunkRouting();
    this.setupAudioCaptureErrorHandling();

    // Start audio capture
    this.deps.audioCapture.start(CHUNK_TIMESLICE_MS);
    this.startDurationTimer();

    // TODO: Acquire WakeLock (navigator.wakeLock not available in Node tests)

    // Transition to recording
    this.transition("recording");
    console.log("[RecordingSession] start: now RECORDING");
  }

  pause(): void {
    if (!this.transition("paused")) return;

    this.deps.audioCapture.pause();
    this.stopDurationTimer();

    // Note: Deepgram keep-alive during pause is managed internally by the
    // LiveTranscriptionService based on chunk activity. The FSM does not
    // need to send explicit keep-alive signals.
  }

  resume(): void {
    if (!this.transition("recording")) return;

    this.deps.audioCapture.resume();
    this.startDurationTimer();
  }

  async stop(): Promise<FinalizedRecording | null> {
    if (!this.transition("stopping")) return null;

    // Stop duration timer
    this.stopDurationTimer();

    // Stop audio capture
    await this.deps.audioCapture.stop();

    // Disconnect transcription
    if (this.deps.liveTranscription) {
      this.deps.liveTranscription.disconnect();
    }

    // TODO: Release WakeLock here. The WakeLock acquired in start() should be
    // released at this point to allow the screen to sleep again.

    // Transition to finalizing
    this.transition("finalizing");

    // Finalize persistence — pass actual recording duration (excludes paused time)
    const finalizeResult = await this.deps.chunkPersistence.finalize(
      this.state.duration,
    );

    if (finalizeResult.isErr()) {
      this.transitionToError(finalizeResult.error);
      return null;
    }

    this.finalizedRecording = finalizeResult.value;

    // Transition to complete
    this.transition("complete");

    // Clean up subscriptions
    this.cleanupSubscriptions();

    return this.finalizedRecording;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    // Stop duration timer
    this.stopDurationTimer();

    // Stop audio capture (fire and forget)
    this.deps.audioCapture.stop();

    // Disconnect transcription
    if (this.deps.liveTranscription) {
      this.deps.liveTranscription.disconnect();
    }

    // Clean up all subscriptions
    this.cleanupSubscriptions();

    // Clear all state listeners
    this.stateListeners.clear();
  }

  async checkForOrphanedSession(): Promise<boolean> {
    const hasOrphaned = await this.deps.chunkPersistence.hasOrphanedSession();

    if (hasOrphaned) {
      const recovered = await this.deps.chunkPersistence.recoverSession();
      this.setState({ orphanedSession: recovered });
    }

    return hasOrphaned;
  }

  async recoverOrphanedSession(): Promise<RecoveredSession | null> {
    const session = this.state.orphanedSession;
    this.setState({ orphanedSession: null });
    return session;
  }

  async discardOrphanedSession(): Promise<void> {
    await this.deps.chunkPersistence.discardOrphanedSession();
    this.setState({ orphanedSession: null });
  }

  async savePartial(): Promise<FinalizedRecording | null> {
    // Only allowed from error state when the error was recoverable
    if (this.state.status !== "error" || !this.state.errorIsRecoverable) {
      console.warn(
        "[RecordingSession] savePartial() is only available from a recoverable error state",
      );
      return null;
    }

    if (!this.transition("finalizing")) return null;

    const finalizeResult = await this.deps.chunkPersistence.finalize(
      this.state.duration,
    );

    if (finalizeResult.isErr()) {
      this.transitionToError(finalizeResult.error);
      return null;
    }

    this.finalizedRecording = finalizeResult.value;
    this.transition("complete");
    this.cleanupSubscriptions();

    return this.finalizedRecording;
  }

  reset(): void {
    if (this.state.status !== "error") {
      console.warn(
        "[RecordingSession] reset() is only available from error state",
      );
      return;
    }

    // Abort persistence to clean up orphaned IndexedDB/Azure state
    this.deps.chunkPersistence.abort();

    this.transition("idle");

    // Generate a new session ID for the next recording
    this.sessionId = crypto.randomUUID();

    this.setState({
      duration: 0,
      chunks: {
        sessionId: this.sessionId,
        totalChunks: 0,
        uploadedChunks: 0,
        pendingChunks: 0,
        totalBytes: 0,
        startedAt: 0,
      },
      transcription: {
        status: "disconnected",
        segments: [],
        currentCaption: null,
      },
      error: null,
      errorIsRecoverable: false,
      warnings: [],
      orphanedSession: null,
    });
  }

  // --- Private: State management ---

  private transition(to: RecordingStatus): boolean {
    const from = this.state.status;
    const allowed = VALID_TRANSITIONS[from];

    if (!allowed.has(to)) {
      console.warn(`[RecordingSession] Invalid transition: ${from} -> ${to}`);
      return false;
    }

    this.setState({ status: to });
    return true;
  }

  private transitionToError(error: RecordingError): void {
    const isRecoverable = error.recoverable;

    // For non-recoverable (fatal) errors, release all resources immediately.
    // For recoverable errors, keep ChunkPersistenceService alive so we can
    // attempt to save partial data via savePartial().
    if (!isRecoverable) {
      this.stopDurationTimer();
      this.deps.audioCapture.stop();
      if (this.deps.liveTranscription) {
        this.deps.liveTranscription.disconnect();
      }
      // Abort persistence to clean up orphaned IndexedDB/Azure state
      this.deps.chunkPersistence.abort();
      this.cleanupSubscriptions();
    } else {
      // Recoverable: stop capture and transcription but keep persistence alive
      this.stopDurationTimer();
      this.deps.audioCapture.stop();
      if (this.deps.liveTranscription) {
        this.deps.liveTranscription.disconnect();
      }
    }

    this.setState({
      status: "error",
      error,
      errorIsRecoverable: isRecoverable,
    });
  }

  private setState(patch: Partial<RecordingSessionState>): void {
    this.state = { ...this.state, ...patch };

    for (const listener of this.stateListeners) {
      try {
        listener(this.getState());
      } catch {
        // Listener errors should not break the FSM
      }
    }
  }

  private addWarning(error: RecordingError): void {
    this.setState({
      warnings: [...this.state.warnings, error],
    });
  }

  // --- Private: Chunk routing ---

  private setupChunkRouting(): void {
    const unsub = this.deps.audioCapture.onChunk((chunk: AudioChunk) => {
      this.handleChunk(chunk);
    });
    this.unsubscribes.push(unsub);
  }

  private handleChunk(chunk: AudioChunk): void {
    // Route to persistence (fire and forget, log errors)
    this.deps.chunkPersistence.persistChunk(chunk).match(
      () => {
        // Update manifest in state
        this.setState({
          chunks: this.deps.chunkPersistence.getManifest(),
        });
      },
      (error) => {
        console.warn(
          `[RecordingSession] Chunk persistence error: ${error.message}`,
        );
        this.addWarning(error);
      },
    );

    // Route to transcription (if enabled and connected)
    if (this.config.liveTranscriptionEnabled && this.deps.liveTranscription) {
      const status = this.deps.liveTranscription.getStatus();
      if (status === "connected") {
        this.deps.liveTranscription.sendChunk(chunk);
      }
    }
  }

  // --- Private: Audio capture error handling ---

  private setupAudioCaptureErrorHandling(): void {
    const unsub = this.deps.audioCapture.onError((error) => {
      // Audio capture errors are fatal
      this.stopDurationTimer();
      this.transitionToError(error);
    });
    this.unsubscribes.push(unsub);
  }

  // --- Private: Transcription listeners ---

  private setupTranscriptionListeners(): void {
    if (!this.deps.liveTranscription) return;

    const unsubSegment = this.deps.liveTranscription.onSegment((segment) => {
      const segments = segment.isFinal
        ? [...this.state.transcription.segments, segment]
        : this.state.transcription.segments;

      this.setState({
        transcription: {
          ...this.state.transcription,
          segments,
          currentCaption: segment.isFinal ? null : segment.text,
        },
      });
    });
    this.unsubscribes.push(unsubSegment);

    const unsubStatus = this.deps.liveTranscription.onStatusChange((status) => {
      this.setState({
        transcription: {
          ...this.state.transcription,
          status,
        },
      });

      if (status === "failed") {
        this.addWarning(
          createSessionError(
            "UNKNOWN",
            "Live transcription connection failed",
            { severity: "warning", recoverable: true },
          ),
        );
      }
    });
    this.unsubscribes.push(unsubStatus);
  }

  // --- Private: Duration timer ---

  private startDurationTimer(): void {
    this.stopDurationTimer();
    this.durationTimer = setInterval(() => {
      this.setState({ duration: this.state.duration + 1 });
    }, 1000);
  }

  private stopDurationTimer(): void {
    if (this.durationTimer !== null) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  // --- Private: Cleanup ---

  private cleanupSubscriptions(): void {
    for (const unsub of this.unsubscribes) {
      try {
        unsub();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.unsubscribes = [];
  }
}
