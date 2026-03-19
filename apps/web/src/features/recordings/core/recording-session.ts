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
      warnings: [],
      consent: config.consent,
    };
  }

  // --- Public API ---

  getState(): RecordingSessionState {
    return { ...this.state };
  }

  onStateChange(callback: (state: RecordingSessionState) => void): Unsubscribe {
    this.stateListeners.add(callback);
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  async start(): Promise<void> {
    if (!this.transition("initializing")) return;

    // Initialize audio capture
    const initResult = await this.deps.audioCapture.initialize();

    if (initResult.isErr()) {
      this.transitionToError(initResult.error);
      return;
    }

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
      this.transitionToError(persistInitResult.error);
      return;
    }

    // Connect live transcription (if enabled and service provided)
    if (this.config.liveTranscriptionEnabled && this.deps.liveTranscription) {
      const transcriptionResult = await this.deps.liveTranscription.connect({
        model: "nova-3",
        language: this.config.language,
        enableDiarization: true,
        interimResults: true,
      });

      if (transcriptionResult.isErr()) {
        // Transcription failure is non-fatal: add warning, continue recording
        this.addWarning(transcriptionResult.error);
      } else {
        this.setupTranscriptionListeners();
      }
    }

    // Set up chunk routing
    this.setupChunkRouting();

    // Set up audio capture error handling
    this.setupAudioCaptureErrorHandling();

    // Start audio capture
    this.deps.audioCapture.start(CHUNK_TIMESLICE_MS);

    // Start duration timer
    this.startDurationTimer();

    // TODO: Acquire WakeLock to prevent screen from sleeping during recording.
    // WakeLock API (navigator.wakeLock) is not available in Node test environment.
    // Implementation should call navigator.wakeLock.request('screen') here and
    // release it on stop/destroy.

    // Transition to recording
    this.transition("recording");
  }

  pause(): void {
    if (!this.transition("paused")) return;

    this.deps.audioCapture.pause();
    this.stopDurationTimer();
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

    // Transition to finalizing
    this.transition("finalizing");

    // Finalize persistence
    const finalizeResult = await this.deps.chunkPersistence.finalize();

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
    return this.deps.chunkPersistence.hasOrphanedSession();
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
    this.setState({ status: "error", error });
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
