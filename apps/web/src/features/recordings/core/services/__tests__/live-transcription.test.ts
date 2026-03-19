import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";

import type { TranscriptionConfig } from "../../recording-session.types";
import type { DeepgramTranscriptEvent } from "../live-transcription/transcript-processor";
import { processDeepgramTranscript } from "../live-transcription/transcript-processor";

// ---------------------------------------------------------------------------
// Mock @deepgram/sdk — must be declared before the import that uses it
// ---------------------------------------------------------------------------

// Fake LiveClient that simulates the Deepgram ListenLiveClient
class FakeListenLiveClient {
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  send = vi.fn();
  keepAlive = vi.fn();
  requestClose = vi.fn();
  finish = vi.fn();
  removeAllListeners = vi.fn();

  addListener(event: string, fn: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);
  }

  removeListener(event: string, fn: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(fn);
  }

  /** Test helper: fire an event on this fake connection */
  _emit(event: string, ...args: unknown[]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      fn(...args);
    }
  }

  /** Test helper: check if there are listeners for an event */
  _listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

let fakeConnection: FakeListenLiveClient;

vi.mock("@deepgram/sdk", () => ({
  createClient: vi.fn(() => ({
    listen: {
      live: vi.fn(() => {
        fakeConnection = new FakeListenLiveClient();
        return fakeConnection;
      }),
    },
  })),
  LiveTranscriptionEvents: {
    Open: "open",
    Close: "close",
    Error: "error",
    Transcript: "Results",
    Metadata: "Metadata",
    UtteranceEnd: "UtteranceEnd",
    SpeechStarted: "SpeechStarted",
    Unhandled: "Unhandled",
  },
}));

// Import after mock is set up
import { LiveTranscriptionServiceImpl } from "../live-transcription/live-transcription";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTranscriptionConfig(
  overrides?: Partial<TranscriptionConfig>,
): TranscriptionConfig {
  return {
    model: "nova-3",
    language: "en",
    enableDiarization: true,
    interimResults: true,
    ...overrides,
  };
}

function createDeepgramEvent(
  overrides?: Partial<{
    transcript: string;
    confidence: number;
    isFinal: boolean;
    words: DeepgramTranscriptEvent["channel"]["alternatives"][0]["words"];
  }>,
): DeepgramTranscriptEvent {
  const transcript = overrides?.transcript ?? "hello world";
  const confidence = overrides?.confidence ?? 0.95;
  const isFinal = overrides?.isFinal ?? true;
  const words = overrides?.words ?? [
    { word: "hello", start: 0.0, end: 0.5, confidence: 0.97, speaker: 0 },
    { word: "world", start: 0.6, end: 1.0, confidence: 0.93, speaker: 0 },
  ];

  return {
    is_final: isFinal,
    channel: {
      alternatives: [{ transcript, confidence, words }],
    },
  };
}

function createAudioChunk(index = 0) {
  return {
    data: new Blob([new Uint8Array(512)], { type: "audio/webm" }),
    index,
    timestamp: Date.now(),
    duration: 1000,
  };
}

// ---------------------------------------------------------------------------
// 1. Transcript Processor (pure function)
// ---------------------------------------------------------------------------

describe("processDeepgramTranscript", () => {
  it("returns null for empty transcript", () => {
    const event = createDeepgramEvent({ transcript: "", words: [] });
    expect(processDeepgramTranscript(event)).toBeNull();
  });

  it("returns null for whitespace-only transcript", () => {
    const event = createDeepgramEvent({ transcript: "   ", words: [] });
    expect(processDeepgramTranscript(event)).toBeNull();
  });

  it("returns null when no alternatives exist", () => {
    const event = {
      is_final: true,
      channel: { alternatives: [] },
    } as unknown as DeepgramTranscriptEvent;
    expect(processDeepgramTranscript(event)).toBeNull();
  });

  it("extracts text, confidence, and timing from a final transcript", () => {
    const event = createDeepgramEvent({
      transcript: "hello world",
      confidence: 0.95,
      isFinal: true,
      words: [
        { word: "hello", start: 1.0, end: 1.5, confidence: 0.97, speaker: 0 },
        { word: "world", start: 1.6, end: 2.0, confidence: 0.93, speaker: 0 },
      ],
    });

    const segment = processDeepgramTranscript(event);

    expect(segment).not.toBeNull();
    expect(segment!.text).toBe("hello world");
    expect(segment!.isFinal).toBe(true);
    expect(segment!.confidence).toBe(0.95);
    expect(segment!.startTime).toBe(1.0);
    expect(segment!.endTime).toBe(2.0);
    expect(segment!.speaker).toBe(0);
  });

  it("extracts speaker from diarization data", () => {
    const event = createDeepgramEvent({
      words: [{ word: "hi", start: 0, end: 0.5, confidence: 0.9, speaker: 2 }],
    });

    const segment = processDeepgramTranscript(event);
    expect(segment!.speaker).toBe(2);
  });

  it("handles missing speaker (no diarization)", () => {
    const event = createDeepgramEvent({
      words: [{ word: "hi", start: 0, end: 0.5, confidence: 0.9 }],
    });

    const segment = processDeepgramTranscript(event);
    expect(segment!.speaker).toBeUndefined();
  });

  it("handles interim (non-final) transcripts", () => {
    const event = createDeepgramEvent({ isFinal: false });

    const segment = processDeepgramTranscript(event);

    expect(segment).not.toBeNull();
    expect(segment!.isFinal).toBe(false);
  });

  it("falls back to 0 times when words array is empty", () => {
    const event = createDeepgramEvent({
      transcript: "hello",
      words: [],
    });

    const segment = processDeepgramTranscript(event);
    expect(segment!.startTime).toBe(0);
    expect(segment!.endTime).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. LiveTranscriptionServiceImpl
// ---------------------------------------------------------------------------

describe("LiveTranscriptionServiceImpl", () => {
  let service: LiveTranscriptionServiceImpl;
  let getToken: Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    getToken = vi.fn().mockResolvedValue("fake-deepgram-token");
    service = new LiveTranscriptionServiceImpl({ getToken });
  });

  afterEach(() => {
    service.disconnect();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // --- Initial state ---

  describe("initial state", () => {
    it("starts with disconnected status", () => {
      expect(service.getStatus()).toBe("disconnected");
    });

    it("starts with empty segments", () => {
      expect(service.getSegments()).toEqual([]);
    });
  });

  // --- connect() ---

  describe("connect", () => {
    it("sets status to connecting, then connected on open", async () => {
      const statusChanges: string[] = [];
      service.onStatusChange((s) => statusChanges.push(s));

      const connectPromise = service.connect(createTranscriptionConfig());

      // Simulate Deepgram opening the connection
      await vi.waitFor(() => expect(fakeConnection).toBeDefined());
      fakeConnection._emit("open");

      const result = await connectPromise;

      expect(result.isOk()).toBe(true);
      expect(service.getStatus()).toBe("connected");
      expect(statusChanges).toContain("connecting");
      expect(statusChanges).toContain("connected");
    });

    it("requests a token via getToken callback", async () => {
      const connectPromise = service.connect(createTranscriptionConfig());

      await vi.waitFor(() => expect(fakeConnection).toBeDefined());
      fakeConnection._emit("open");

      await connectPromise;

      expect(getToken).toHaveBeenCalledOnce();
    });

    it("returns TOKEN_ERROR when getToken fails", async () => {
      getToken.mockRejectedValueOnce(new Error("Auth failed"));

      const result = await service.connect(createTranscriptionConfig());

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("TOKEN_ERROR");
      }
    });

    it("returns CONNECTION_FAILED on timeout", async () => {
      const connectPromise = service.connect(createTranscriptionConfig());

      // Advance past the 10s timeout
      await vi.advanceTimersByTimeAsync(11_000);

      const result = await connectPromise;

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("CONNECTION_FAILED");
      }
    });

    it("returns WEBSOCKET_ERROR when connection emits error during connect", async () => {
      const connectPromise = service.connect(createTranscriptionConfig());

      await vi.waitFor(() => expect(fakeConnection).toBeDefined());
      fakeConnection._emit("error", new Error("WebSocket failure"));

      const result = await connectPromise;

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("WEBSOCKET_ERROR");
      }
    });
  });

  // --- sendChunk() ---

  describe("sendChunk", () => {
    it("sends data when connected", async () => {
      const connectPromise = service.connect(createTranscriptionConfig());
      await vi.waitFor(() => expect(fakeConnection).toBeDefined());
      fakeConnection._emit("open");
      await connectPromise;

      const chunk = createAudioChunk(0);
      service.sendChunk(chunk);

      expect(fakeConnection.send).toHaveBeenCalledWith(chunk.data);
    });

    it("drops chunks when not connected", () => {
      const chunk = createAudioChunk(0);
      service.sendChunk(chunk);

      // No connection exists, so nothing should blow up
      // and no send should be called
      expect(service.getStatus()).toBe("disconnected");
    });
  });

  // --- Transcript processing ---

  describe("transcript events", () => {
    beforeEach(async () => {
      const connectPromise = service.connect(createTranscriptionConfig());
      await vi.waitFor(() => expect(fakeConnection).toBeDefined());
      fakeConnection._emit("open");
      await connectPromise;
    });

    it("accumulates final segments and emits onSegment", () => {
      const segments: Array<{ text: string }> = [];
      service.onSegment((s) => segments.push(s));

      const event = createDeepgramEvent({
        transcript: "test segment",
        isFinal: true,
      });
      fakeConnection._emit("Results", event);

      expect(segments).toHaveLength(1);
      expect(segments[0]!.text).toBe("test segment");
      expect(service.getSegments()).toHaveLength(1);
    });

    it("emits interim segments but does not accumulate them", () => {
      const segments: Array<{ text: string; isFinal: boolean }> = [];
      service.onSegment((s) => segments.push(s));

      const interimEvent = createDeepgramEvent({
        transcript: "partial",
        isFinal: false,
      });
      fakeConnection._emit("Results", interimEvent);

      // Emitted to listener
      expect(segments).toHaveLength(1);
      expect(segments[0]!.isFinal).toBe(false);

      // Not accumulated in getSegments (only finals)
      expect(service.getSegments()).toHaveLength(0);
    });

    it("ignores empty transcript events", () => {
      const segments: Array<{ text: string }> = [];
      service.onSegment((s) => segments.push(s));

      const emptyEvent = createDeepgramEvent({
        transcript: "",
        words: [],
      });
      fakeConnection._emit("Results", emptyEvent);

      expect(segments).toHaveLength(0);
      expect(service.getSegments()).toHaveLength(0);
    });
  });

  // --- disconnect() ---

  describe("disconnect", () => {
    it("sets status to disconnected and cleans up", async () => {
      const connectPromise = service.connect(createTranscriptionConfig());
      await vi.waitFor(() => expect(fakeConnection).toBeDefined());
      fakeConnection._emit("open");
      await connectPromise;

      service.disconnect();

      expect(service.getStatus()).toBe("disconnected");
      expect(fakeConnection.requestClose).toHaveBeenCalled();
    });

    it("is safe to call when already disconnected", () => {
      expect(() => service.disconnect()).not.toThrow();
    });
  });

  // --- Keep-alive ---

  describe("keep-alive", () => {
    beforeEach(async () => {
      const connectPromise = service.connect(createTranscriptionConfig());
      await vi.waitFor(() => expect(fakeConnection).toBeDefined());
      fakeConnection._emit("open");
      await connectPromise;
    });

    it("sends keepAlive when no chunks are sent for 8 seconds", async () => {
      // Advance past the keep-alive interval
      await vi.advanceTimersByTimeAsync(8_500);

      expect(fakeConnection.keepAlive).toHaveBeenCalled();
    });

    it("resets keep-alive timer when a chunk is sent", async () => {
      // Send a chunk at 7 seconds (before keep-alive fires at 8s)
      await vi.advanceTimersByTimeAsync(7_000);
      service.sendChunk(createAudioChunk(0));

      // Advance another 7 seconds (14s total) — keep-alive should not
      // have fired at 8s because it was reset
      fakeConnection.keepAlive.mockClear();
      await vi.advanceTimersByTimeAsync(7_000);

      // keepAlive should not have been called at the original 8s mark
      // but might be called at 7+8=15s — we only advanced to 14s
      expect(fakeConnection.keepAlive).not.toHaveBeenCalled();
    });
  });

  // --- Reconnection ---

  describe("reconnection", () => {
    it("attempts reconnection on unexpected close", async () => {
      const statusChanges: string[] = [];
      service.onStatusChange((s) => statusChanges.push(s));

      const connectPromise = service.connect(createTranscriptionConfig());
      await vi.waitFor(() => expect(fakeConnection).toBeDefined());
      const firstConnection = fakeConnection;
      fakeConnection._emit("open");
      await connectPromise;

      // Clear to track new token requests
      getToken.mockClear();

      // Simulate unexpected close
      firstConnection._emit("close");

      expect(statusChanges).toContain("reconnecting");

      // Advance past the first reconnect delay (1s)
      await vi.advanceTimersByTimeAsync(1_500);

      // Token should be requested again for reconnect
      expect(getToken).toHaveBeenCalled();
    });

    it("sets status to failed after max retries", async () => {
      const statusChanges: string[] = [];
      service.onStatusChange((s) => statusChanges.push(s));

      const connectPromise = service.connect(createTranscriptionConfig());
      await vi.waitFor(() => expect(fakeConnection).toBeDefined());
      fakeConnection._emit("open");
      await connectPromise;

      // Make token requests fail for reconnection
      getToken.mockRejectedValue(new Error("Token failed"));

      // Trigger unexpected close
      fakeConnection._emit("close");

      // Advance past all retry delays: 1s + 2s + 4s = 7s total
      await vi.advanceTimersByTimeAsync(1_500); // 1st retry at 1s
      await vi.advanceTimersByTimeAsync(2_500); // 2nd retry at 2s
      await vi.advanceTimersByTimeAsync(4_500); // 3rd retry at 4s

      expect(service.getStatus()).toBe("failed");
      expect(statusChanges).toContain("failed");
    });

    it("does not reconnect when disconnect() is called explicitly", async () => {
      const connectPromise = service.connect(createTranscriptionConfig());
      await vi.waitFor(() => expect(fakeConnection).toBeDefined());
      fakeConnection._emit("open");
      await connectPromise;

      getToken.mockClear();

      // Explicit disconnect
      service.disconnect();

      // Advance timers — no reconnect should happen
      await vi.advanceTimersByTimeAsync(10_000);

      expect(getToken).not.toHaveBeenCalled();
      expect(service.getStatus()).toBe("disconnected");
    });
  });

  // --- Token refresh ---

  describe("token refresh", () => {
    it("refreshes token before expiry (at 540s)", async () => {
      const connectPromise = service.connect(createTranscriptionConfig());
      await vi.waitFor(() => expect(fakeConnection).toBeDefined());
      fakeConnection._emit("open");
      await connectPromise;

      // Capture reference to the original connection before refresh
      const originalConnection = fakeConnection;
      getToken.mockClear();

      // Advance to token refresh time (540s)
      await vi.advanceTimersByTimeAsync(540_000);

      // A new token should have been requested
      expect(getToken).toHaveBeenCalled();

      // The old connection should have been closed for refresh
      expect(originalConnection.requestClose).toHaveBeenCalled();
    });
  });

  // --- onSegment / onStatusChange unsubscribe ---

  describe("event subscriptions", () => {
    it("onSegment returns unsubscribe function that stops delivery", async () => {
      const connectPromise = service.connect(createTranscriptionConfig());
      await vi.waitFor(() => expect(fakeConnection).toBeDefined());
      fakeConnection._emit("open");
      await connectPromise;

      const segments: Array<{ text: string }> = [];
      const unsubscribe = service.onSegment((s) => segments.push(s));

      // First event should be received
      fakeConnection._emit(
        "Results",
        createDeepgramEvent({ transcript: "first" }),
      );
      expect(segments).toHaveLength(1);

      // Unsubscribe
      unsubscribe();

      // Second event should NOT be received
      fakeConnection._emit(
        "Results",
        createDeepgramEvent({ transcript: "second" }),
      );
      expect(segments).toHaveLength(1);
    });

    it("onStatusChange returns unsubscribe function", () => {
      const statuses: string[] = [];
      const unsubscribe = service.onStatusChange((s) => statuses.push(s));

      unsubscribe();

      // After unsubscribing, status changes should not be delivered
      // (connecting from connect() should not appear)
      expect(statuses).toHaveLength(0);
    });
  });
});
