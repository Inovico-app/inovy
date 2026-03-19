import { RecordingSession } from "../recording-session";
import { FakeAudioCaptureService } from "../services/audio-capture/fake-audio-capture";
import { FakeChunkPersistenceService } from "../services/chunk-persistence/fake-chunk-persistence";
import { FakeLiveTranscriptionService } from "../services/live-transcription/fake-live-transcription";
import type { AudioChunk } from "../recording-session.types";
import { createCaptureError } from "../recording-session.errors";

function makeChunk(index: number): AudioChunk {
  return {
    data: new Blob(["audio"], { type: "audio/webm" }),
    index,
    timestamp: Date.now(),
    duration: 250,
  };
}

function createSession(overrides?: {
  liveTranscription?: FakeLiveTranscriptionService | undefined;
  liveTranscriptionEnabled?: boolean;
}) {
  const audioCapture = new FakeAudioCaptureService();
  const chunkPersistence = new FakeChunkPersistenceService();
  const liveTranscription =
    overrides?.liveTranscription ?? new FakeLiveTranscriptionService();

  const session = new RecordingSession(
    {
      audioCapture,
      chunkPersistence,
      liveTranscription:
        overrides?.liveTranscription === undefined
          ? liveTranscription
          : overrides.liveTranscription,
    },
    {
      projectId: "test-project",
      audioSource: "microphone",
      language: "nl",
      liveTranscriptionEnabled: overrides?.liveTranscriptionEnabled ?? true,
      consent: {
        consentGiven: true,
        consentGivenAt: new Date().toISOString(),
      },
    },
  );

  return { session, audioCapture, chunkPersistence, liveTranscription };
}

describe("RecordingSession FSM", () => {
  describe("state transitions", () => {
    it("starts in idle state", () => {
      const { session } = createSession();
      expect(session.getState().status).toBe("idle");
    });

    it("transitions idle -> initializing -> recording on start", async () => {
      const { session } = createSession();
      const states: string[] = [];
      session.onStateChange((s) => states.push(s.status));

      await session.start();

      expect(states).toContain("initializing");
      expect(session.getState().status).toBe("recording");
    });

    it("transitions recording -> paused on pause", async () => {
      const { session } = createSession();
      await session.start();
      session.pause();
      expect(session.getState().status).toBe("paused");
    });

    it("transitions paused -> recording on resume", async () => {
      const { session } = createSession();
      await session.start();
      session.pause();
      session.resume();
      expect(session.getState().status).toBe("recording");
    });

    it("transitions recording -> stopping -> finalizing -> complete on stop", async () => {
      const { session } = createSession();
      const states: string[] = [];
      session.onStateChange((s) => states.push(s.status));

      await session.start();
      states.length = 0;

      await session.stop();

      expect(states).toContain("stopping");
      expect(states).toContain("finalizing");
      expect(session.getState().status).toBe("complete");
    });

    it("transitions to error on initialization failure", async () => {
      const { session, audioCapture } = createSession();
      audioCapture.shouldFailInitialize = true;
      audioCapture.initializeError = createCaptureError(
        "PERMISSION_DENIED",
        "Microphone access denied",
      );

      await session.start();

      expect(session.getState().status).toBe("error");
      expect(session.getState().error?.code).toBe("PERMISSION_DENIED");
    });
  });

  describe("chunk routing", () => {
    it("routes chunks to persistence and transcription", async () => {
      const { session, audioCapture, chunkPersistence, liveTranscription } =
        createSession();
      await session.start();

      const chunk = makeChunk(0);
      audioCapture.emitChunk(chunk);

      await new Promise((r) => setTimeout(r, 10));

      expect(chunkPersistence.getPersistedChunks()).toHaveLength(1);
      expect(liveTranscription.getReceivedChunks()).toHaveLength(1);
    });

    it("routes chunks to persistence even without transcription", async () => {
      const { session, audioCapture, chunkPersistence } = createSession({
        liveTranscription: undefined,
        liveTranscriptionEnabled: false,
      });
      await session.start();

      audioCapture.emitChunk(makeChunk(0));
      await new Promise((r) => setTimeout(r, 10));

      expect(chunkPersistence.getPersistedChunks()).toHaveLength(1);
    });
  });

  describe("error handling", () => {
    it("adds warning for non-fatal errors, keeps recording", async () => {
      const { session, liveTranscription } = createSession();
      await session.start();

      liveTranscription.setStatus("failed");

      const state = session.getState();
      expect(state.status).toBe("recording");
      expect(state.warnings.length).toBeGreaterThan(0);
    });

    it("transitions to error on fatal audio capture error", async () => {
      const { session, audioCapture } = createSession();
      await session.start();

      audioCapture.emitError(
        createCaptureError("DEVICE_LOST", "Microphone disconnected"),
      );

      expect(session.getState().status).toBe("error");
      expect(session.getState().error?.code).toBe("DEVICE_LOST");
    });

    it("allows save partial on recoverable error", async () => {
      const { session, audioCapture } = createSession();
      await session.start();

      // Emit a recoverable error (device lost is fatal but data exists in persistence)
      audioCapture.emitError(
        createCaptureError("DEVICE_LOST", "Microphone disconnected", {
          recoverable: true,
        }),
      );

      expect(session.getState().status).toBe("error");
      expect(session.getState().errorIsRecoverable).toBe(true);

      // Save what we have
      await session.savePartial();

      expect(session.getState().status).toBe("complete");
    });

    it("does not allow save partial on non-recoverable error", async () => {
      const { session, audioCapture } = createSession();
      await session.start();

      audioCapture.emitError(
        createCaptureError("DEVICE_LOST", "Microphone disconnected", {
          recoverable: false,
        }),
      );

      expect(session.getState().status).toBe("error");
      expect(session.getState().errorIsRecoverable).toBe(false);

      const result = await session.savePartial();

      expect(result).toBeNull();
      expect(session.getState().status).toBe("error");
    });

    it("resets to idle from error", async () => {
      const { session, audioCapture } = createSession();
      await session.start();

      audioCapture.emitError(
        createCaptureError("DEVICE_LOST", "Microphone disconnected"),
      );

      expect(session.getState().status).toBe("error");

      session.reset();

      expect(session.getState().status).toBe("idle");
      expect(session.getState().error).toBeNull();
      expect(session.getState().errorIsRecoverable).toBe(false);
    });
  });

  describe("orphaned session recovery", () => {
    it("surfaces orphaned session data in state", async () => {
      const { session, chunkPersistence } = createSession();

      const orphaned = {
        sessionId: "orphaned-session-id",
        manifest: {
          sessionId: "orphaned-session-id",
          totalChunks: 5,
          uploadedChunks: 3,
          pendingChunks: 2,
          totalBytes: 2048,
          startedAt: Date.now() - 60000,
        },
        chunks: [],
        metadata: {
          projectId: "test-project",
          audioSource: "microphone" as const,
          language: "nl",
          startedAt: Date.now() - 60000,
          consent: {
            consentGiven: true,
            consentGivenAt: new Date().toISOString(),
          },
        },
      };

      chunkPersistence.setOrphanedSession(orphaned);

      const hasOrphaned = await session.checkForOrphanedSession();

      expect(hasOrphaned).toBe(true);
      expect(session.getState().orphanedSession).toEqual(orphaned);
    });

    it("returns false when no orphaned session exists", async () => {
      const { session } = createSession();

      const hasOrphaned = await session.checkForOrphanedSession();

      expect(hasOrphaned).toBe(false);
      expect(session.getState().orphanedSession).toBeNull();
    });

    it("discards orphaned session", async () => {
      const { session, chunkPersistence } = createSession();

      chunkPersistence.setOrphanedSession({
        sessionId: "orphaned-session-id",
        manifest: {
          sessionId: "orphaned-session-id",
          totalChunks: 5,
          uploadedChunks: 3,
          pendingChunks: 2,
          totalBytes: 2048,
          startedAt: Date.now() - 60000,
        },
        chunks: [],
        metadata: {
          projectId: "test-project",
          audioSource: "microphone" as const,
          language: "nl",
          startedAt: Date.now() - 60000,
          consent: {
            consentGiven: true,
            consentGivenAt: new Date().toISOString(),
          },
        },
      });

      await session.checkForOrphanedSession();
      expect(session.getState().orphanedSession).not.toBeNull();

      await session.discardOrphanedSession();
      expect(session.getState().orphanedSession).toBeNull();
    });
  });

  describe("cleanup", () => {
    it("releases all resources on destroy", async () => {
      const { session, audioCapture } = createSession();
      await session.start();

      session.destroy();

      expect(audioCapture.isActive()).toBe(false);
    });
  });
});
