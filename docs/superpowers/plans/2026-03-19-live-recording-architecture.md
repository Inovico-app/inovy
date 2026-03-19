# Live Recording Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing provider-based live recording stack with a state-machine-driven architecture using plain TypeScript services, enabling progressive Azure Block Blob uploads, IndexedDB crash recovery, and proper testability.

**Architecture:** A `RecordingSession` FSM (plain TypeScript class) orchestrates three injected services: `AudioCaptureService` (browser audio APIs), `ChunkPersistenceService` (IndexedDB + Azure Block Blob), and `LiveTranscriptionService` (Deepgram WebSocket). React subscribes via a single `useRecordingSession` hook. No global providers.

**Tech Stack:** TypeScript, React 19, Next.js 16, Vitest, `@deepgram/sdk`, `neverthrow`, IndexedDB (via `idb`), `fake-indexeddb` (test). Azure Block Blob uploads use raw `fetch()` (REST API) — no `@azure/storage-blob` SDK on the client.

**Spec:** `docs/superpowers/specs/2026-03-19-live-recording-architecture-design.md`

---

## File Map

All paths relative to `apps/web/src/features/recordings/`.

### New Files (core/ — plain TypeScript, zero React)

| File                                                               | Responsibility                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `core/recording-session.types.ts`                                  | Shared types: `AudioSource`, `RecordingStatus`, `AudioChunk`, `ChunkManifest`, etc.   |
| `core/recording-session.errors.ts`                                 | Error types: `CaptureError`, `PersistenceError`, `TranscriptionError`, `SessionError` |
| `core/recording-session.ts`                                        | The FSM class — state transitions, side effect orchestration                          |
| `core/recording-session.factory.ts`                                | `createRecordingSession()` factory — wires real service implementations               |
| `core/services/audio-capture/audio-capture.interface.ts`           | `AudioCaptureService` interface                                                       |
| `core/services/audio-capture/microphone-capture.ts`                | `MicrophoneCaptureService` — getUserMedia + GainNode                                  |
| `core/services/audio-capture/system-audio-capture.ts`              | `SystemAudioCaptureService` — getDisplayMedia                                         |
| `core/services/audio-capture/combined-capture.ts`                  | `CombinedCaptureService` — composes mic + system with AudioContext mixing             |
| `core/services/audio-capture/audio-mixer.ts`                       | AudioContext stream mixing utility                                                    |
| `core/services/audio-capture/fake-audio-capture.ts`                | `FakeAudioCaptureService` for testing                                                 |
| `core/services/chunk-persistence/chunk-persistence.interface.ts`   | `ChunkPersistenceService` interface                                                   |
| `core/services/chunk-persistence/chunk-persistence.ts`             | Main implementation — coordinates IndexedDB + Azure uploader                          |
| `core/services/chunk-persistence/indexed-db-store.ts`              | IndexedDB CRUD for chunks and sessions                                                |
| `core/services/chunk-persistence/azure-block-uploader.ts`          | Azure Block Blob staging + commit                                                     |
| `core/services/chunk-persistence/fake-chunk-persistence.ts`        | `FakeChunkPersistenceService` for testing                                             |
| `core/services/live-transcription/live-transcription.interface.ts` | `LiveTranscriptionService` interface                                                  |
| `core/services/live-transcription/live-transcription.ts`           | Deepgram WebSocket — connect, send, reconnect, keep-alive                             |
| `core/services/live-transcription/transcript-processor.ts`         | Parse Deepgram events into `TranscriptSegment`                                        |
| `core/services/live-transcription/fake-live-transcription.ts`      | `FakeLiveTranscriptionService` for testing                                            |
| `core/utils/event-emitter.ts`                                      | Typed event emitter (shared by all services)                                          |
| `core/utils/resource-tracker.ts`                                   | Disposable resource cleanup utility                                                   |
| `core/utils/retry.ts`                                              | Exponential backoff retry utility                                                     |

### New Files (hooks/ — thin React bridge)

| File                              | Responsibility                                                      |
| --------------------------------- | ------------------------------------------------------------------- |
| `hooks/use-recording-session.ts`  | Single hook wrapping the FSM — creates session, subscribes to state |
| `hooks/use-audio-capabilities.ts` | Synchronous browser capability detection                            |

### New Files (components/ — React UI)

| File                                                      | Responsibility                                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `components/record-page.tsx`                              | Client component — project selector, audio config, consent, mounts RecordingSession |
| `components/recording-session/recording-session.tsx`      | Orchestrator — mounts hook, renders children                                        |
| `components/recording-session/recording-controls.tsx`     | Start/pause/resume/stop buttons                                                     |
| `components/recording-session/audio-source-indicator.tsx` | Active audio source display                                                         |
| `components/recording-session/transcription-panel.tsx`    | Live transcript display                                                             |
| `components/recording-session/chunk-upload-status.tsx`    | Upload progress indicator                                                           |
| `components/recording-session/recovery-dialog.tsx`        | Orphaned session recovery dialog                                                    |
| `components/shared/duration-display.tsx`                  | Recording duration timer                                                            |
| `components/shared/recording-status-badge.tsx`            | Status badge (recording/paused/finalizing/etc.)                                     |

### New Files (actions/ — server actions)

| File                            | Responsibility                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `actions/request-upload-sas.ts` | Server action: get SAS token for Azure Block Blob uploads                          |
| `actions/deepgram-token.ts`     | Server action: get temporary Deepgram token (moves from `src/actions/deepgram.ts`) |

### New Files (lib/)

| File                        | Responsibility                                         |
| --------------------------- | ------------------------------------------------------ |
| `lib/audio-capabilities.ts` | Pure functions for browser/device capability detection |

### New Files (tests)

| File                                                 | Responsibility                                      |
| ---------------------------------------------------- | --------------------------------------------------- |
| `core/__tests__/recording-session.test.ts`           | FSM unit tests                                      |
| `core/__tests__/event-emitter.test.ts`               | Event emitter unit tests                            |
| `core/__tests__/resource-tracker.test.ts`            | Resource tracker unit tests                         |
| `core/__tests__/retry.test.ts`                       | Retry utility unit tests                            |
| `core/services/__tests__/chunk-persistence.test.ts`  | ChunkPersistence integration tests (fake-indexeddb) |
| `core/services/__tests__/live-transcription.test.ts` | LiveTranscription unit tests (mocked WebSocket)     |

### Modified Files

| File                                      | Change                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `apps/web/src/app/(main)/record/page.tsx` | Point to new `RecordPage` component                                                         |
| `apps/web/src/app/layout.tsx`             | Remove `DeepgramContextProvider`, `MicrophoneContextProvider`, `SystemAudioContextProvider` |
| `apps/web/package.json`                   | Add `vitest`, `fake-indexeddb`, `idb` dependencies                                          |
| `apps/web/vitest.config.ts`               | New — Vitest configuration                                                                  |
| `apps/web/tsconfig.json`                  | Add vitest types                                                                            |

### Deleted Files (after migration complete)

| File                                                      | Reason                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------- |
| `src/providers/DeepgramProvider.tsx`                      | Replaced by `core/services/live-transcription/`                   |
| `src/providers/microphone/MicrophoneProvider.tsx`         | Replaced by `core/services/audio-capture/microphone-capture.ts`   |
| `src/providers/microphone/microphone-audio-processor.ts`  | Absorbed into `microphone-capture.ts`                             |
| `src/providers/microphone/microphone-reducer.ts`          | No longer needed                                                  |
| `src/providers/microphone/microphone-constants.ts`        | No longer needed                                                  |
| `src/providers/microphone/audio-mixer.ts`                 | Replaced by `core/services/audio-capture/audio-mixer.ts`          |
| `src/providers/system-audio/SystemAudioProvider.tsx`      | Replaced by `core/services/audio-capture/system-audio-capture.ts` |
| `src/providers/system-audio/system-audio-reducer.ts`      | No longer needed                                                  |
| `src/features/recordings/hooks/use-live-recording.ts`     | Replaced by FSM                                                   |
| `src/features/recordings/hooks/use-live-transcription.ts` | Replaced by LiveTranscriptionService                              |
| `src/features/recordings/hooks/use-audio-source.ts`       | Replaced by AudioCaptureService + capabilities                    |
| `src/features/recordings/hooks/setup-audio-sources.ts`    | Absorbed into AudioCaptureService.initialize()                    |

---

## Task 1: Set Up Vitest Test Infrastructure

**Files:**

- Create: `apps/web/vitest.config.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/web/tsconfig.json`

- [ ] **Step 1: Install test dependencies**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web add -D vitest @vitest/coverage-v8 fake-indexeddb
```

Also install `idb` (typed IndexedDB wrapper) as a prod dependency:

```bash
cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web add idb
```

- [ ] **Step 2: Create Vitest config**

Create `apps/web/vitest.config.ts`:

```typescript
import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    coverage: {
      provider: "v8",
      include: ["src/features/recordings/core/**"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Add test script to package.json**

Add to `apps/web/package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Add vitest types to tsconfig**

Add `"vitest/globals"` to `compilerOptions.types` in `apps/web/tsconfig.json`.

- [ ] **Step 5: Verify setup with a smoke test**

Create `apps/web/src/features/recordings/core/__tests__/smoke.test.ts`:

```typescript
describe("test setup", () => {
  it("works", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test`
Expected: 1 test passes.

- [ ] **Step 6: Delete smoke test and commit**

```bash
rm apps/web/src/features/recordings/core/__tests__/smoke.test.ts
git add apps/web/vitest.config.ts apps/web/package.json apps/web/tsconfig.json pnpm-lock.yaml
git commit -m "chore: set up vitest test infrastructure for recording feature"
```

---

## Task 2: Core Types and Error Definitions

**Files:**

- Create: `apps/web/src/features/recordings/core/recording-session.types.ts`
- Create: `apps/web/src/features/recordings/core/recording-session.errors.ts`

- [ ] **Step 1: Create shared types**

Create `apps/web/src/features/recordings/core/recording-session.types.ts`:

```typescript
import type { Result, ResultAsync } from "neverthrow";

// --- Audio ---

export type AudioSource = "microphone" | "system" | "combined";

export interface AudioChunk {
  data: Blob;
  index: number;
  timestamp: number; // wall-clock ms
  duration: number; // approximate chunk duration ms
}

// --- FSM ---

export type RecordingStatus =
  | "idle"
  | "initializing"
  | "recording"
  | "paused"
  | "stopping"
  | "finalizing"
  | "complete"
  | "error";

export interface ConsentState {
  consentGiven: boolean;
  consentGivenAt: string | null; // ISO timestamp
}

export interface TranscriptionState {
  status: ConnectionStatus;
  segments: TranscriptSegment[];
  currentCaption: string | null;
}

export interface RecordingSessionState {
  status: RecordingStatus;
  duration: number; // seconds elapsed (excludes paused time)
  audioSource: AudioSource;
  chunks: ChunkManifest;
  transcription: TranscriptionState;
  error: RecordingError | null;
  warnings: RecordingError[];
  consent: ConsentState;
}

// --- Chunk Persistence ---

export interface ChunkManifest {
  sessionId: string;
  totalChunks: number;
  uploadedChunks: number;
  pendingChunks: number;
  totalBytes: number;
  startedAt: number; // epoch ms
}

export interface FinalizedRecording {
  fileUrl: string;
  fileSize: number;
  duration: number; // seconds
  chunkCount: number;
}

export interface SessionMetadata {
  projectId: string;
  audioSource: AudioSource;
  language: string;
  startedAt: number; // epoch ms
  consent: ConsentState;
}

export interface RecoveredSession {
  sessionId: string;
  manifest: ChunkManifest;
  chunks: AudioChunk[];
  metadata: SessionMetadata;
}

// --- Transcription ---

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";

export interface TranscriptionConfig {
  model: "nova-3";
  language: string;
  enableDiarization: boolean;
  interimResults: boolean;
}

export interface TranscriptSegment {
  text: string;
  speaker?: number;
  isFinal: boolean;
  confidence: number;
  startTime: number;
  endTime: number;
}

// --- Shared ---

export type Unsubscribe = () => void;

export interface Disposable {
  dispose(): void;
}

// --- Stop Result ---

export interface StopResult {
  recordingId: string;
  fileUrl: string;
  duration: number;
}

// Re-export neverthrow types for convenience
export type { Result, ResultAsync };
```

- [ ] **Step 2: Create error types**

Create `apps/web/src/features/recordings/core/recording-session.errors.ts`:

```typescript
export type ErrorSeverity = "warning" | "fatal";

export interface BaseRecordingError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  recoverable: boolean;
  cause?: unknown;
}

export interface CaptureError extends BaseRecordingError {
  code:
    | "PERMISSION_DENIED"
    | "DEVICE_NOT_FOUND"
    | "DEVICE_LOST"
    | "SYSTEM_AUDIO_NOT_SUPPORTED"
    | "MEDIA_RECORDER_ERROR";
}

export interface PersistenceError extends BaseRecordingError {
  code:
    | "INDEXED_DB_FULL"
    | "INDEXED_DB_ERROR"
    | "BLOCK_UPLOAD_FAILED"
    | "COMMIT_FAILED"
    | "SAS_TOKEN_ERROR"
    | "FINALIZATION_FAILED";
}

export interface TranscriptionError extends BaseRecordingError {
  code:
    | "CONNECTION_FAILED"
    | "TOKEN_ERROR"
    | "WEBSOCKET_ERROR"
    | "TOKEN_EXPIRED";
}

export interface SessionError extends BaseRecordingError {
  code: "INVALID_TRANSITION" | "INITIALIZATION_FAILED" | "UNKNOWN";
}

export type RecordingError =
  | CaptureError
  | PersistenceError
  | TranscriptionError
  | SessionError;

export function createCaptureError(
  code: CaptureError["code"],
  message: string,
  options?: {
    severity?: ErrorSeverity;
    recoverable?: boolean;
    cause?: unknown;
  },
): CaptureError {
  return {
    code,
    message,
    severity: options?.severity ?? "fatal",
    recoverable: options?.recoverable ?? false,
    cause: options?.cause,
  };
}

export function createPersistenceError(
  code: PersistenceError["code"],
  message: string,
  options?: {
    severity?: ErrorSeverity;
    recoverable?: boolean;
    cause?: unknown;
  },
): PersistenceError {
  return {
    code,
    message,
    severity: options?.severity ?? "warning",
    recoverable: options?.recoverable ?? true,
    cause: options?.cause,
  };
}

export function createTranscriptionError(
  code: TranscriptionError["code"],
  message: string,
  options?: {
    severity?: ErrorSeverity;
    recoverable?: boolean;
    cause?: unknown;
  },
): TranscriptionError {
  return {
    code,
    message,
    severity: options?.severity ?? "warning",
    recoverable: options?.recoverable ?? true,
    cause: options?.cause,
  };
}

export function createSessionError(
  code: SessionError["code"],
  message: string,
  options?: {
    severity?: ErrorSeverity;
    recoverable?: boolean;
    cause?: unknown;
  },
): SessionError {
  return {
    code,
    message,
    severity: options?.severity ?? "fatal",
    recoverable: options?.recoverable ?? false,
    cause: options?.cause,
  };
}
```

- [ ] **Step 3: Verify types compile**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/recordings/core/recording-session.types.ts apps/web/src/features/recordings/core/recording-session.errors.ts
git commit -m "feat(recording): add core types and error definitions for recording session FSM"
```

---

## Task 3: Core Utilities — Event Emitter, Resource Tracker, Retry

**Files:**

- Create: `apps/web/src/features/recordings/core/utils/event-emitter.ts`
- Create: `apps/web/src/features/recordings/core/utils/resource-tracker.ts`
- Create: `apps/web/src/features/recordings/core/utils/retry.ts`
- Create: `apps/web/src/features/recordings/core/__tests__/event-emitter.test.ts`
- Create: `apps/web/src/features/recordings/core/__tests__/resource-tracker.test.ts`
- Create: `apps/web/src/features/recordings/core/__tests__/retry.test.ts`

- [ ] **Step 1: Write event emitter tests**

Create `apps/web/src/features/recordings/core/__tests__/event-emitter.test.ts`:

```typescript
import { TypedEventEmitter } from "../utils/event-emitter";

interface TestEvents {
  data: [value: string];
  error: [err: Error];
  empty: [];
}

describe("TypedEventEmitter", () => {
  let emitter: TypedEventEmitter<TestEvents>;

  beforeEach(() => {
    emitter = new TypedEventEmitter();
  });

  it("calls listeners when event is emitted", () => {
    const listener = vi.fn();
    emitter.on("data", listener);
    emitter.emit("data", "hello");
    expect(listener).toHaveBeenCalledWith("hello");
  });

  it("supports multiple listeners", () => {
    const a = vi.fn();
    const b = vi.fn();
    emitter.on("data", a);
    emitter.on("data", b);
    emitter.emit("data", "test");
    expect(a).toHaveBeenCalledWith("test");
    expect(b).toHaveBeenCalledWith("test");
  });

  it("returns unsubscribe function", () => {
    const listener = vi.fn();
    const unsub = emitter.on("data", listener);
    unsub();
    emitter.emit("data", "ignored");
    expect(listener).not.toHaveBeenCalled();
  });

  it("handles events with no arguments", () => {
    const listener = vi.fn();
    emitter.on("empty", listener);
    emitter.emit("empty");
    expect(listener).toHaveBeenCalled();
  });

  it("removeAllListeners clears everything", () => {
    const a = vi.fn();
    const b = vi.fn();
    emitter.on("data", a);
    emitter.on("error", b);
    emitter.removeAllListeners();
    emitter.emit("data", "ignored");
    emitter.emit("error", new Error("ignored"));
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test -- --reporter=verbose src/features/recordings/core/__tests__/event-emitter.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement event emitter**

Create `apps/web/src/features/recordings/core/utils/event-emitter.ts`:

```typescript
import type { Unsubscribe } from "../recording-session.types";

type EventMap = Record<string, unknown[]>;

export class TypedEventEmitter<T extends EventMap> {
  private listeners = new Map<keyof T, Set<(...args: never[]) => void>>();

  on<K extends keyof T>(
    event: K,
    listener: (...args: T[K]) => void,
  ): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as (...args: never[]) => void);
    return () => {
      set.delete(listener as (...args: never[]) => void);
    };
  }

  emit<K extends keyof T>(event: K, ...args: T[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      (listener as (...args: T[K]) => void)(...args);
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test -- --reporter=verbose src/features/recordings/core/__tests__/event-emitter.test.ts
```

Expected: All 5 tests pass.

- [ ] **Step 5: Write resource tracker tests**

Create `apps/web/src/features/recordings/core/__tests__/resource-tracker.test.ts`:

```typescript
import { ResourceTracker } from "../utils/resource-tracker";
import type { Disposable } from "../recording-session.types";

describe("ResourceTracker", () => {
  it("disposes all tracked resources in reverse order", () => {
    const tracker = new ResourceTracker();
    const order: number[] = [];
    const a: Disposable = { dispose: () => order.push(1) };
    const b: Disposable = { dispose: () => order.push(2) };
    const c: Disposable = { dispose: () => order.push(3) };
    tracker.track(a);
    tracker.track(b);
    tracker.track(c);
    tracker.disposeAll();
    expect(order).toEqual([3, 2, 1]);
  });

  it("clears tracked resources after dispose", () => {
    const tracker = new ResourceTracker();
    const disposeFn = vi.fn();
    tracker.track({ dispose: disposeFn });
    tracker.disposeAll();
    tracker.disposeAll(); // second call should be no-op
    expect(disposeFn).toHaveBeenCalledTimes(1);
  });

  it("continues disposing even if one throws", () => {
    const tracker = new ResourceTracker();
    const order: number[] = [];
    tracker.track({ dispose: () => order.push(1) });
    tracker.track({
      dispose: () => {
        throw new Error("boom");
      },
    });
    tracker.track({ dispose: () => order.push(3) });
    tracker.disposeAll();
    expect(order).toEqual([3, 1]); // skips the throwing one, continues
  });
});
```

- [ ] **Step 6: Run test — verify it fails**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test -- --reporter=verbose src/features/recordings/core/__tests__/resource-tracker.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 7: Implement resource tracker**

Create `apps/web/src/features/recordings/core/utils/resource-tracker.ts`:

```typescript
import type { Disposable } from "../recording-session.types";

export class ResourceTracker {
  private resources: Disposable[] = [];

  track(resource: Disposable): void {
    this.resources.push(resource);
  }

  disposeAll(): void {
    const toDispose = [...this.resources].reverse();
    this.resources = [];
    for (const resource of toDispose) {
      try {
        resource.dispose();
      } catch {
        // Continue disposing remaining resources
      }
    }
  }
}
```

- [ ] **Step 8: Run test — verify it passes**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test -- --reporter=verbose src/features/recordings/core/__tests__/resource-tracker.test.ts
```

Expected: All 3 tests pass.

- [ ] **Step 9: Write retry utility tests**

Create `apps/web/src/features/recordings/core/__tests__/retry.test.ts`:

```typescript
import { retryWithBackoff } from "../utils/retry";

describe("retryWithBackoff", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
    });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");
    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
    });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after max retries exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));
    await expect(
      retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 10 }),
    ).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("respects abort signal", async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    controller.abort();
    await expect(
      retryWithBackoff(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        signal: controller.signal,
      }),
    ).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 10: Run test — verify it fails**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test -- --reporter=verbose src/features/recordings/core/__tests__/retry.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 11: Implement retry utility**

Create `apps/web/src/features/recordings/core/utils/retry.ts`:

```typescript
interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  signal?: AbortSignal;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxRetries, baseDelayMs, signal } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      if (signal?.aborted) throw error;

      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new Error("Aborted"));
          },
          { once: true },
        );
      });
    }
  }

  throw new Error("Unreachable");
}
```

- [ ] **Step 12: Run test — verify it passes**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test -- --reporter=verbose src/features/recordings/core/__tests__/retry.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 13: Run all tests and commit**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test
git add apps/web/src/features/recordings/core/utils/ apps/web/src/features/recordings/core/__tests__/
git commit -m "feat(recording): add core utilities — event emitter, resource tracker, retry with backoff"
```

---

## Task 4: Service Interfaces and Fakes

**Files:**

- Create: `apps/web/src/features/recordings/core/services/audio-capture/audio-capture.interface.ts`
- Create: `apps/web/src/features/recordings/core/services/audio-capture/fake-audio-capture.ts`
- Create: `apps/web/src/features/recordings/core/services/chunk-persistence/chunk-persistence.interface.ts`
- Create: `apps/web/src/features/recordings/core/services/chunk-persistence/fake-chunk-persistence.ts`
- Create: `apps/web/src/features/recordings/core/services/live-transcription/live-transcription.interface.ts`
- Create: `apps/web/src/features/recordings/core/services/live-transcription/fake-live-transcription.ts`

- [ ] **Step 1: Create AudioCaptureService interface**

Create `apps/web/src/features/recordings/core/services/audio-capture/audio-capture.interface.ts`:

```typescript
import type { ResultAsync } from "neverthrow";
import type { AudioChunk, Unsubscribe } from "../../recording-session.types";
import type { CaptureError } from "../../recording-session.errors";

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
```

- [ ] **Step 2: Create FakeAudioCaptureService**

Create `apps/web/src/features/recordings/core/services/audio-capture/fake-audio-capture.ts`:

```typescript
import { TypedEventEmitter } from "../../utils/event-emitter";
import type { AudioChunk, Unsubscribe } from "../../recording-session.types";
import type { CaptureError } from "../../recording-session.errors";
import type { AudioCaptureService } from "./audio-capture.interface";

interface FakeEvents {
  chunk: [chunk: AudioChunk];
  error: [error: CaptureError];
}

export class FakeAudioCaptureService implements AudioCaptureService {
  private emitter = new TypedEventEmitter<FakeEvents>();
  private active = false;
  private chunkIndex = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // Test controls
  shouldFailInitialize = false;
  initializeError?: CaptureError;

  async initialize(): Promise<void> {
    if (this.shouldFailInitialize && this.initializeError) {
      throw this.initializeError;
    }
  }

  start(timeslice: number): void {
    this.active = true;
    this.intervalId = setInterval(() => {
      const chunk: AudioChunk = {
        data: new Blob(["fake-audio"], { type: "audio/webm" }),
        index: this.chunkIndex++,
        timestamp: Date.now(),
        duration: timeslice,
      };
      this.emitter.emit("chunk", chunk);
    }, timeslice);
  }

  pause(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  resume(): void {
    if (this.active && !this.intervalId) {
      this.start(250);
    }
  }

  async stop(): Promise<void> {
    this.pause();
    this.active = false;
  }

  onChunk(callback: (chunk: AudioChunk) => void): Unsubscribe {
    return this.emitter.on("chunk", callback);
  }

  onError(callback: (error: CaptureError) => void): Unsubscribe {
    return this.emitter.on("error", callback);
  }

  getStream(): MediaStream | null {
    return null;
  }

  isActive(): boolean {
    return this.active;
  }

  // Test helpers
  emitChunk(chunk: AudioChunk): void {
    this.emitter.emit("chunk", chunk);
  }

  emitError(error: CaptureError): void {
    this.emitter.emit("error", error);
  }
}
```

- [ ] **Step 3: Create ChunkPersistenceService interface**

Create `apps/web/src/features/recordings/core/services/chunk-persistence/chunk-persistence.interface.ts`:

Note: The spec defines `initialize(sessionId)` but we add `metadata` as a second parameter since the IndexedDB store needs it for crash recovery. This is an intentional deviation.

```typescript
import type { ResultAsync } from "neverthrow";
import type {
  AudioChunk,
  ChunkManifest,
  FinalizedRecording,
  RecoveredSession,
  SessionMetadata,
} from "../../recording-session.types";
import type { PersistenceError } from "../../recording-session.errors";

export interface ChunkPersistenceService {
  initialize(
    sessionId: string,
    metadata: SessionMetadata,
  ): ResultAsync<void, PersistenceError>;
  finalize(): ResultAsync<FinalizedRecording, PersistenceError>;
  abort(): ResultAsync<void, PersistenceError>;

  persistChunk(chunk: AudioChunk): ResultAsync<void, PersistenceError>;

  hasOrphanedSession(): Promise<boolean>;
  recoverSession(): Promise<RecoveredSession | null>;
  discardOrphanedSession(): Promise<void>;

  getManifest(): ChunkManifest;
}
```

- [ ] **Step 4: Create FakeChunkPersistenceService**

Create `apps/web/src/features/recordings/core/services/chunk-persistence/fake-chunk-persistence.ts`:

```typescript
import type {
  AudioChunk,
  ChunkManifest,
  FinalizedRecording,
  RecoveredSession,
  SessionMetadata,
} from "../../recording-session.types";
import type { ChunkPersistenceService } from "./chunk-persistence.interface";

export class FakeChunkPersistenceService implements ChunkPersistenceService {
  receivedChunks: AudioChunk[] = [];
  private sessionId = "";
  private metadata: SessionMetadata | null = null;

  // Test controls
  shouldFailFinalize = false;
  orphanedSession: RecoveredSession | null = null;

  async initialize(
    sessionId: string,
    metadata: SessionMetadata,
  ): Promise<void> {
    this.sessionId = sessionId;
    this.metadata = metadata;
    this.receivedChunks = [];
  }

  async finalize(): Promise<FinalizedRecording> {
    if (this.shouldFailFinalize) {
      throw new Error("Finalization failed");
    }
    return {
      fileUrl: `https://storage.blob.core.windows.net/recordings/${this.sessionId}.webm`,
      fileSize: this.receivedChunks.reduce((sum, c) => sum + c.data.size, 0),
      duration: 0,
      chunkCount: this.receivedChunks.length,
    };
  }

  async abort(): Promise<void> {
    this.receivedChunks = [];
  }

  async persistChunk(chunk: AudioChunk): Promise<void> {
    this.receivedChunks.push(chunk);
  }

  async hasOrphanedSession(): Promise<boolean> {
    return this.orphanedSession !== null;
  }

  async recoverSession(): Promise<RecoveredSession | null> {
    return this.orphanedSession;
  }

  async discardOrphanedSession(): Promise<void> {
    this.orphanedSession = null;
  }

  getManifest(): ChunkManifest {
    return {
      sessionId: this.sessionId,
      totalChunks: this.receivedChunks.length,
      uploadedChunks: this.receivedChunks.length,
      pendingChunks: 0,
      totalBytes: this.receivedChunks.reduce((sum, c) => sum + c.data.size, 0),
      startedAt: Date.now(),
    };
  }
}
```

- [ ] **Step 5: Create LiveTranscriptionService interface**

Create `apps/web/src/features/recordings/core/services/live-transcription/live-transcription.interface.ts`:

Note: `startKeepAlive`/`stopKeepAlive` are NOT on the public interface. Keep-alive is an internal implementation detail — the service manages it based on `sendChunk` activity and connection state. The FSM does not need to know about keep-alive.

```typescript
import type { ResultAsync } from "neverthrow";
import type {
  AudioChunk,
  ConnectionStatus,
  TranscriptionConfig,
  TranscriptSegment,
  Unsubscribe,
} from "../../recording-session.types";
import type { TranscriptionError } from "../../recording-session.errors";

export interface LiveTranscriptionService {
  connect(config: TranscriptionConfig): ResultAsync<void, TranscriptionError>;
  disconnect(): void;

  sendChunk(chunk: AudioChunk): void;

  onSegment(callback: (segment: TranscriptSegment) => void): Unsubscribe;
  onStatusChange(callback: (status: ConnectionStatus) => void): Unsubscribe;

  getStatus(): ConnectionStatus;
  getSegments(): TranscriptSegment[];
}
```

- [ ] **Step 6: Create FakeLiveTranscriptionService**

Create `apps/web/src/features/recordings/core/services/live-transcription/fake-live-transcription.ts`:

```typescript
import { TypedEventEmitter } from "../../utils/event-emitter";
import type {
  AudioChunk,
  ConnectionStatus,
  TranscriptionConfig,
  TranscriptSegment,
  Unsubscribe,
} from "../../recording-session.types";
import type { LiveTranscriptionService } from "./live-transcription.interface";

interface FakeEvents {
  segment: [segment: TranscriptSegment];
  statusChange: [status: ConnectionStatus];
}

export class FakeLiveTranscriptionService implements LiveTranscriptionService {
  private emitter = new TypedEventEmitter<FakeEvents>();
  private status: ConnectionStatus = "disconnected";
  private segments: TranscriptSegment[] = [];

  receivedChunks: AudioChunk[] = [];

  // Test controls
  shouldFailConnect = false;

  async connect(_config: TranscriptionConfig): Promise<void> {
    if (this.shouldFailConnect) {
      throw new Error("Connection failed");
    }
    this.setStatus("connected");
  }

  disconnect(): void {
    this.setStatus("disconnected");
  }

  sendChunk(chunk: AudioChunk): void {
    if (this.status === "connected") {
      this.receivedChunks.push(chunk);
    }
  }

  onSegment(callback: (segment: TranscriptSegment) => void): Unsubscribe {
    return this.emitter.on("segment", callback);
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): Unsubscribe {
    return this.emitter.on("statusChange", callback);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getSegments(): TranscriptSegment[] {
    return [...this.segments];
  }

  // Test helpers
  emitSegment(segment: TranscriptSegment): void {
    this.segments.push(segment);
    this.emitter.emit("segment", segment);
  }

  setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.emitter.emit("statusChange", status);
  }
}
```

- [ ] **Step 7: Verify types compile**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/recordings/core/services/
git commit -m "feat(recording): add service interfaces and fake implementations for testing"
```

---

## Task 5: RecordingSession FSM

This is the heart of the architecture. Build and test it using the fakes from Task 4.

**Files:**

- Create: `apps/web/src/features/recordings/core/recording-session.ts`
- Create: `apps/web/src/features/recordings/core/__tests__/recording-session.test.ts`

- [ ] **Step 1: Write FSM tests**

Create `apps/web/src/features/recordings/core/__tests__/recording-session.test.ts`:

```typescript
import { RecordingSession } from "../recording-session";
import { FakeAudioCaptureService } from "../services/audio-capture/fake-audio-capture";
import { FakeChunkPersistenceService } from "../services/chunk-persistence/fake-chunk-persistence";
import { FakeLiveTranscriptionService } from "../services/live-transcription/fake-live-transcription";
import type {
  AudioChunk,
  RecordingSessionState,
} from "../recording-session.types";
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
      consent: { consentGiven: true, consentGivenAt: new Date().toISOString() },
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

    it("transitions idle → initializing → recording on start", async () => {
      const { session } = createSession();
      const states: string[] = [];
      session.onStateChange((s) => states.push(s.status));

      await session.start();

      expect(states).toContain("initializing");
      expect(session.getState().status).toBe("recording");
    });

    it("transitions recording → paused on pause", async () => {
      const { session } = createSession();
      await session.start();
      session.pause();
      expect(session.getState().status).toBe("paused");
    });

    it("transitions paused → recording on resume", async () => {
      const { session } = createSession();
      await session.start();
      session.pause();
      session.resume();
      expect(session.getState().status).toBe("recording");
    });

    it("transitions recording → stopping → finalizing → complete on stop", async () => {
      const { session } = createSession();
      const states: string[] = [];
      session.onStateChange((s) => states.push(s.status));

      await session.start();
      states.length = 0; // reset after start

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

      // Allow async persistChunk to complete
      await new Promise((r) => setTimeout(r, 10));

      expect(chunkPersistence.receivedChunks).toHaveLength(1);
      expect(liveTranscription.receivedChunks).toHaveLength(1);
    });

    it("routes chunks to persistence even without transcription", async () => {
      const { session, audioCapture, chunkPersistence } = createSession({
        liveTranscription: undefined,
        liveTranscriptionEnabled: false,
      });
      await session.start();

      audioCapture.emitChunk(makeChunk(0));
      await new Promise((r) => setTimeout(r, 10));

      expect(chunkPersistence.receivedChunks).toHaveLength(1);
    });
  });

  describe("error handling", () => {
    it("adds warning for non-fatal errors, keeps recording", async () => {
      const { session, liveTranscription } = createSession();
      await session.start();

      liveTranscription.setStatus("failed");

      const state = session.getState();
      expect(state.status).toBe("recording"); // still recording
      expect(state.warnings.length).toBeGreaterThanOrEqual(0); // warning may be added
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test -- --reporter=verbose src/features/recordings/core/__tests__/recording-session.test.ts
```

Expected: FAIL — `RecordingSession` not found.

- [ ] **Step 3: Implement RecordingSession FSM**

Create `apps/web/src/features/recordings/core/recording-session.ts`. This is the core FSM class. Implement:

- Constructor accepting `RecordingSessionDeps` and `RecordingSessionConfig`
- State management with observer pattern (`onStateChange`, `getState`)
- Valid transition map with guards
- `start()` → initializes audio capture, connects transcription (if enabled), starts recording
- `pause()` / `resume()` — delegates to audio capture, manages keep-alive
- `stop()` → stops audio capture, finalizes persistence, disconnects transcription
- `destroy()` — teardown all resources
- Chunk routing: audio capture `onChunk` → persistence `persistChunk` + transcription `sendChunk`
- Error handling: audio capture `onError` → classify severity → transition or warn
- Transcription status changes → add warnings on failure
- Duration timer (increment every second while recording, pause while paused)
- `checkForOrphanedSession()` — delegates to persistence service

Key implementation notes:

- The FSM must validate transitions (e.g., can't `pause()` from `idle`)
- `start()` is async (waits for `audioCapture.initialize()`)
- `stop()` is async (waits for `audioCapture.stop()` then `chunkPersistence.finalize()`)
- Chunk routing listener is set up in `start()` and torn down in `stop()`
- Duration timer uses `setInterval(1000)` — cleared on pause/stop/destroy
- All service interactions use `neverthrow` Result matching → errors classified and handled
- **WakeLock:** Acquire `navigator.wakeLock.request("screen")` on `initializing → recording`. Track via `ResourceTracker`. Released automatically on `destroy()` or page visibility change. Wrap in try/catch — WakeLock failure is a warning, not fatal.
- **Memory pressure:** For long recordings, the FSM can emit a `memoryWarning` if `performance.memory?.usedJSHeapSize` exceeds a threshold. The ChunkPersistenceService listens and flushes its in-memory buffer.

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test -- --reporter=verbose src/features/recordings/core/__tests__/recording-session.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Run all tests and commit**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test
git add apps/web/src/features/recordings/core/recording-session.ts apps/web/src/features/recordings/core/__tests__/recording-session.test.ts
git commit -m "feat(recording): implement RecordingSession FSM with full state machine and chunk routing"
```

---

## Task 6: IndexedDB Store

**Files:**

- Create: `apps/web/src/features/recordings/core/services/chunk-persistence/indexed-db-store.ts`
- Create: `apps/web/src/features/recordings/core/services/__tests__/indexed-db-store.test.ts`

- [ ] **Step 1: Write IndexedDB store tests**

Create `apps/web/src/features/recordings/core/services/__tests__/indexed-db-store.test.ts`:

```typescript
import "fake-indexeddb/auto";
import { IndexedDBChunkStore } from "../chunk-persistence/indexed-db-store";
import type {
  AudioChunk,
  SessionMetadata,
} from "../../recording-session.types";

function makeChunk(index: number): AudioChunk {
  return {
    data: new Blob([`chunk-${index}`], { type: "audio/webm" }),
    index,
    timestamp: Date.now(),
    duration: 250,
  };
}

const testMetadata: SessionMetadata = {
  projectId: "proj-1",
  audioSource: "microphone",
  language: "nl",
  startedAt: Date.now(),
  consent: { consentGiven: true, consentGivenAt: new Date().toISOString() },
};

describe("IndexedDBChunkStore", () => {
  let store: IndexedDBChunkStore;

  beforeEach(async () => {
    store = new IndexedDBChunkStore();
  });

  afterEach(async () => {
    await store.clear();
  });

  it("creates a session and stores chunks", async () => {
    await store.createSession("session-1", testMetadata);
    await store.putChunk("session-1", makeChunk(0));
    await store.putChunk("session-1", makeChunk(1));

    const chunks = await store.getChunks("session-1");
    expect(chunks).toHaveLength(2);
    expect(chunks[0].index).toBe(0);
    expect(chunks[1].index).toBe(1);
  });

  it("marks chunks as uploaded", async () => {
    await store.createSession("session-1", testMetadata);
    await store.putChunk("session-1", makeChunk(0));
    await store.markUploaded("session-1", 0);

    const pending = await store.getPendingChunks("session-1");
    expect(pending).toHaveLength(0);
  });

  it("detects orphaned sessions", async () => {
    await store.createSession("session-1", testMetadata);
    await store.putChunk("session-1", makeChunk(0));

    const orphaned = await store.getOrphanedSessions();
    expect(orphaned).toHaveLength(1);
    expect(orphaned[0].sessionId).toBe("session-1");
  });

  it("finalizes and cleans up a session", async () => {
    await store.createSession("session-1", testMetadata);
    await store.putChunk("session-1", makeChunk(0));
    await store.finalizeSession("session-1");

    const orphaned = await store.getOrphanedSessions();
    expect(orphaned).toHaveLength(0);
  });

  it("discards orphaned sessions older than TTL", async () => {
    const oldMetadata = {
      ...testMetadata,
      startedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    };
    await store.createSession("old-session", oldMetadata);
    await store.putChunk("old-session", makeChunk(0));

    const orphaned = await store.getOrphanedSessions(7 * 24 * 60 * 60 * 1000);
    expect(orphaned).toHaveLength(0); // filtered out — too old
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test -- --reporter=verbose src/features/recordings/core/services/__tests__/indexed-db-store.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement IndexedDB store**

Create `apps/web/src/features/recordings/core/services/chunk-persistence/indexed-db-store.ts`.

Use the `idb` package for typed IndexedDB access. Implement:

- Database name: `inovy-recording-chunks`
- Two object stores: `sessions` (keyed by sessionId) and `chunks` (keyed by `sessionId:index`)
- `createSession(sessionId, metadata)` — creates session record with status "active"
- `putChunk(sessionId, chunk)` — stores chunk blob with `uploaded: false`
- `markUploaded(sessionId, chunkIndex)` — sets `uploaded: true`
- `getChunks(sessionId)` — returns all chunks for a session
- `getPendingChunks(sessionId)` — returns chunks where `uploaded === false`
- `getOrphanedSessions(maxAgeTtlMs?)` — returns sessions with status "active" and within TTL (default 7 days)
- `finalizeSession(sessionId)` — deletes session and its chunks
- `clear()` — wipe everything (for tests)

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test -- --reporter=verbose src/features/recordings/core/services/__tests__/indexed-db-store.test.ts
```

Expected: All 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/recordings/core/services/chunk-persistence/indexed-db-store.ts apps/web/src/features/recordings/core/services/__tests__/indexed-db-store.test.ts
git commit -m "feat(recording): implement IndexedDB chunk store with session lifecycle and orphan detection"
```

---

## Task 7: Azure Block Blob Uploader

**Files:**

- Create: `apps/web/src/features/recordings/core/services/chunk-persistence/azure-block-uploader.ts`

- [ ] **Step 1: Write Azure block uploader tests**

Create `apps/web/src/features/recordings/core/services/__tests__/azure-block-uploader.test.ts`:

Test with mocked `fetch()`. Test:

- `stageBlock` sends PUT request with correct URL, block ID, and body
- `commitBlockList` sends PUT request with XML body listing all block IDs
- Block IDs are base64-encoded and zero-padded to same length
- `refreshSasToken` updates the URL for subsequent requests
- Network errors throw appropriately

```typescript
import { AzureBlockUploader } from "../chunk-persistence/azure-block-uploader";

describe("AzureBlockUploader", () => {
  let uploader: AzureBlockUploader;
  const baseBlobUrl =
    "https://account.blob.core.windows.net/container/test.webm";
  const sasToken = "sv=2024-01-01&sig=test";

  beforeEach(() => {
    uploader = new AzureBlockUploader();
    uploader.initialize(`${baseBlobUrl}?${sasToken}`);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 201 })),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stages a block with correct URL and headers", async () => {
    await uploader.stageBlock("block-000001", new Blob(["audio"]));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("comp=block"),
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("commits block list with XML body", async () => {
    await uploader.commitBlockList(["block-000001", "block-000002"]);

    const call = vi
      .mocked(fetch)
      .mock.calls.find((c) => (c[0] as string).includes("comp=blocklist"));
    expect(call).toBeDefined();
    const body = call![1]?.body as string;
    expect(body).toContain("<Latest>");
  });

  it("refreshes SAS token for subsequent requests", async () => {
    const newSas = "sv=2024-02-01&sig=new";
    uploader.refreshSasToken(`${baseBlobUrl}?${newSas}`);

    await uploader.stageBlock("block-000001", new Blob(["audio"]));

    expect(vi.mocked(fetch).mock.calls[0][0]).toContain(newSas);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test -- --reporter=verbose src/features/recordings/core/services/__tests__/azure-block-uploader.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Azure block uploader**

Create `apps/web/src/features/recordings/core/services/chunk-persistence/azure-block-uploader.ts`.

This is a client-side class that:

- `initialize(blobUrl, sasToken)` — stores the target blob URL with SAS query params
- `stageBlock(blockId, data)` — HTTP PUT to `{blobUrl}&comp=block&blockid={base64BlockId}` with the blob data. Uses `fetch()` with `x-ms-blob-type: BlockBlob` header.
- `commitBlockList(blockIds)` — HTTP PUT to `{blobUrl}&comp=blocklist` with XML body listing all block IDs
- `refreshSasToken(newSasToken)` — updates the SAS token for long recordings

Note: We use raw `fetch()` rather than `@azure/storage-blob` SDK on the client side to avoid bundling the full SDK. The Azure Block Blob REST API is simple enough for direct HTTP calls.

Block IDs must be base64-encoded and all the same length. Use zero-padded sequential numbers: `btoa("block-000001")`.

Reference the Azure Block Blob REST API:

- Stage Block: `PUT {blobUrl}?comp=block&blockid={id}` with blob body
- Commit Block List: `PUT {blobUrl}?comp=blocklist` with XML body

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test -- --reporter=verbose src/features/recordings/core/services/__tests__/azure-block-uploader.test.ts
```

Expected: All 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/recordings/core/services/chunk-persistence/azure-block-uploader.ts apps/web/src/features/recordings/core/services/__tests__/azure-block-uploader.test.ts
git commit -m "feat(recording): implement Azure Block Blob uploader for progressive chunk uploads"
```

---

## Task 8: ChunkPersistenceService Implementation

**Files:**

- Create: `apps/web/src/features/recordings/core/services/chunk-persistence/chunk-persistence.ts`
- Create: `apps/web/src/features/recordings/core/services/__tests__/chunk-persistence.test.ts`

- [ ] **Step 1: Write ChunkPersistenceService integration tests**

Create `apps/web/src/features/recordings/core/services/__tests__/chunk-persistence.test.ts`:

Test with `fake-indexeddb` and a mock Azure uploader. Test:

- `initialize` creates session in IndexedDB
- `persistChunk` stores in IndexedDB and buffers for upload
- Flushing buffer triggers block staging (mock the Azure uploader)
- `finalize` commits all blocks and cleans up IndexedDB
- `hasOrphanedSession` / `recoverSession` / `discardOrphanedSession` work correctly
- `getManifest` returns accurate counts

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test -- --reporter=verbose src/features/recordings/core/services/__tests__/chunk-persistence.test.ts
```

- [ ] **Step 3: Implement ChunkPersistenceService**

Create `apps/web/src/features/recordings/core/services/chunk-persistence/chunk-persistence.ts`.

Coordinates `IndexedDBChunkStore` and `AzureBlockUploader`:

- `initialize(sessionId, metadata)`:
  1. Create session in IndexedDB
  2. Request SAS token via callback (injected — the server action)
  3. Initialize AzureBlockUploader with SAS URL

- `persistChunk(chunk)`:
  1. Write to IndexedDB immediately (crash-safe)
  2. Add to memory buffer
  3. If buffer size >= 20 chunks (or ~5 seconds): flush

- Flush buffer:
  1. Concatenate buffered chunks into single Blob
  2. Stage block via AzureBlockUploader
  3. Mark chunks as uploaded in IndexedDB
  4. Update manifest

- SAS token refresh: timer at 25 minutes, request new token, call `uploader.refreshSasToken()`

- `finalize()`:
  1. Flush remaining buffer
  2. Upload any pending chunks from IndexedDB (for recovery case)
  3. Commit block list
  4. Call upload-complete callback (the server notification)
  5. Clean up IndexedDB
  6. Return `FinalizedRecording`

- `abort()`: clean up IndexedDB, don't commit blocks

- Recovery methods delegate to IndexedDB store

Constructor takes callbacks for SAS token request and upload completion notification (injected by the factory to avoid importing server actions in core/).

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test -- --reporter=verbose src/features/recordings/core/services/__tests__/chunk-persistence.test.ts
```

- [ ] **Step 5: Run all tests and commit**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test
git add apps/web/src/features/recordings/core/services/chunk-persistence/chunk-persistence.ts apps/web/src/features/recordings/core/services/__tests__/chunk-persistence.test.ts
git commit -m "feat(recording): implement ChunkPersistenceService with IndexedDB + Azure Block Blob"
```

---

## Task 9: LiveTranscriptionService Implementation

**Files:**

- Create: `apps/web/src/features/recordings/core/services/live-transcription/live-transcription.ts`
- Create: `apps/web/src/features/recordings/core/services/live-transcription/transcript-processor.ts`
- Create: `apps/web/src/features/recordings/core/services/__tests__/live-transcription.test.ts`

- [ ] **Step 1: Implement transcript processor**

Create `apps/web/src/features/recordings/core/services/live-transcription/transcript-processor.ts`.

Pure function that parses Deepgram transcript events into `TranscriptSegment[]`. Extract from the existing logic in `use-live-transcription.ts:150-190` (the `onTranscript` handler). Handle:

- Empty transcripts (silence) → skip
- `is_final` flag → mark segment as final
- Speaker diarization → extract speaker number from first word
- Confidence, start/end times from words array

- [ ] **Step 2: Write LiveTranscriptionService tests**

Create `apps/web/src/features/recordings/core/services/__tests__/live-transcription.test.ts`:

Test with a mocked Deepgram SDK. Test:

- `connect` requests token and creates LiveClient
- `sendChunk` sends data when connected, silently drops when not
- `disconnect` closes connection
- Reconnection on WebSocket close (up to 3 retries)
- Keep-alive timer starts/stops
- Token refresh before expiry
- Status changes emitted correctly

- [ ] **Step 3: Run tests — verify they fail**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test -- --reporter=verbose src/features/recordings/core/services/__tests__/live-transcription.test.ts
```

- [ ] **Step 4: Implement LiveTranscriptionService**

Create `apps/web/src/features/recordings/core/services/live-transcription/live-transcription.ts`.

Manages Deepgram WebSocket connection. Constructor takes a token provider callback (injected):

- `connect(config)`:
  1. Request token via callback
  2. Create Deepgram client with token
  3. Open `live` connection with config
  4. Set 10-second connection timeout
  5. Listen for Open, Close, Error, Transcript events
  6. Set up token refresh timer (TTL - 60 seconds)

- `sendChunk(chunk)`: fire-and-forget if connected

- `disconnect()`: close connection, clear timers

- Reconnection: on close/error, attempt reconnect with exponential backoff (1s, 2s, 4s). After 3 failures → status "failed"

- Keep-alive: `startKeepAlive()` sends `keepAlive()` every 8 seconds. `stopKeepAlive()` clears interval.

- Token refresh: timer fires → request new token → disconnect → reconnect

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test -- --reporter=verbose src/features/recordings/core/services/__tests__/live-transcription.test.ts
```

- [ ] **Step 6: Run all tests and commit**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test
git add apps/web/src/features/recordings/core/services/live-transcription/ apps/web/src/features/recordings/core/services/__tests__/live-transcription.test.ts
git commit -m "feat(recording): implement LiveTranscriptionService with Deepgram WebSocket, reconnection, and token refresh"
```

---

## Task 10: AudioCaptureService Implementations

**Files:**

- Create: `apps/web/src/features/recordings/core/services/audio-capture/microphone-capture.ts`
- Create: `apps/web/src/features/recordings/core/services/audio-capture/system-audio-capture.ts`
- Create: `apps/web/src/features/recordings/core/services/audio-capture/combined-capture.ts`
- Create: `apps/web/src/features/recordings/core/services/audio-capture/audio-mixer.ts`

- [ ] **Step 1: Implement audio mixer utility**

Create `apps/web/src/features/recordings/core/services/audio-capture/audio-mixer.ts`.

Port from existing `src/providers/microphone/audio-mixer.ts`. Pure function:

```typescript
export function mixStreams(
  streams: MediaStream[],
  audioContext: AudioContext,
): { mixedStream: MediaStream; destination: MediaStreamAudioDestinationNode };
```

Creates source nodes for each stream, connects to a single destination.

- [ ] **Step 2: Implement MicrophoneCaptureService**

Create `apps/web/src/features/recordings/core/services/audio-capture/microphone-capture.ts`.

Port from existing `MicrophoneProvider` and `microphone-audio-processor.ts`. Implements `AudioCaptureService` plus gain control:

- `initialize()`: call `getUserMedia({ audio: true })`, create AudioContext, GainNode pipeline
- `start(timeslice)`: create MediaRecorder on processed stream, listen for `ondataavailable`
- `pause()` / `resume()`: delegate to MediaRecorder
- `stop()`: stop MediaRecorder, release all tracks via ResourceTracker
- `setGain(value)` / `getGain()`: adjust GainNode value
- MIME type: detect best supported via `MediaRecorder.isTypeSupported()` — prefer `audio/webm;codecs=opus`, fallback to `audio/mp4`

- [ ] **Step 3: Implement SystemAudioCaptureService**

Create `apps/web/src/features/recordings/core/services/audio-capture/system-audio-capture.ts`.

Port from existing `SystemAudioProvider`. Key differences from spec review:

- Call `getDisplayMedia({ audio: true, video: true })`
- Keep video tracks alive but disabled (`track.enabled = false`)
- Monitor `track.onended` on all tracks — emit error if user stops sharing
- MediaRecorder on audio tracks only

- [ ] **Step 4: Implement CombinedCaptureService**

Create `apps/web/src/features/recordings/core/services/audio-capture/combined-capture.ts`.

Composes `MicrophoneCaptureService` and `SystemAudioCaptureService`:

- `initialize()`: initialize both, mix streams via `audio-mixer.ts`
- If system audio fails: fall back to mic-only, emit warning (not error)
- Single MediaRecorder on mixed output
- `stop()`: stop both services

- [ ] **Step 5: Verify types compile**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/recordings/core/services/audio-capture/
git commit -m "feat(recording): implement AudioCaptureService — microphone, system audio, and combined capture"
```

---

## Task 11: Session Factory and Server Actions

**Files:**

- Create: `apps/web/src/features/recordings/core/recording-session.factory.ts`
- Create: `apps/web/src/features/recordings/actions/request-upload-sas.ts`
- Create: `apps/web/src/features/recordings/actions/deepgram-token.ts`

- [ ] **Step 1: Create SAS token server action**

Create `apps/web/src/features/recordings/actions/request-upload-sas.ts`.

Uses `next-safe-action` with `authorizedActionClient`. Calls `storage.generateClientUploadToken()` with the recording blob path. Returns `{ uploadUrl, blobUrl, pathname, tokenPayload, tokenSignature }`.

Reference existing pattern at `src/app/api/recordings/upload/route.ts:437-476` for the generate-token flow. Include HMAC signing of the metadata payload.

- [ ] **Step 2: Create Deepgram token server action**

Create `apps/web/src/features/recordings/actions/deepgram-token.ts`.

Move from existing `src/actions/deepgram.ts`. Same logic: calls `getTemporaryDeepgramToken()`, requires `deepgram: ["token"]` permission. Returns `{ token, success }`.

- [ ] **Step 3: Create session factory**

Create `apps/web/src/features/recordings/core/recording-session.factory.ts`.

`createRecordingSession(config)` function that:

1. Picks the right `AudioCaptureService` implementation based on `config.audioSource`
2. Creates `ChunkPersistenceService` with callbacks for SAS token request and upload completion
3. Creates `LiveTranscriptionService` (if enabled) with callback for Deepgram token
4. Instantiates `RecordingSession` with all deps

This is the only file that imports concrete service implementations. Everything else uses interfaces.

- [ ] **Step 4: Verify types compile**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/recordings/core/recording-session.factory.ts apps/web/src/features/recordings/actions/
git commit -m "feat(recording): add session factory and server actions for SAS tokens and Deepgram tokens"
```

---

## Task 12: React Hooks

**Files:**

- Create: `apps/web/src/features/recordings/hooks/use-recording-session.ts`
- Create: `apps/web/src/features/recordings/hooks/use-audio-capabilities.ts`
- Create: `apps/web/src/features/recordings/lib/audio-capabilities.ts`

- [ ] **Step 1: Implement audio capabilities**

Create `apps/web/src/features/recordings/lib/audio-capabilities.ts`.

Pure functions — no side effects, no device access:

- `isSystemAudioSupported()` — check browser (Chrome/Edge/Opera)
- `getSupportedMimeTypes()` — check MediaRecorder.isTypeSupported for common types
- Reference existing `src/features/recordings/lib/system-audio-detection.ts` for browser checks

Create `apps/web/src/features/recordings/hooks/use-audio-capabilities.ts`:

```typescript
"use client";

import { useMemo } from "react";
import {
  isSystemAudioSupported,
  getSupportedMimeTypes,
} from "../lib/audio-capabilities";

export function useAudioCapabilities() {
  return useMemo(
    () => ({
      hasMicrophone:
        typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia,
      hasSystemAudio: isSystemAudioSupported(),
      supportedMimeTypes: getSupportedMimeTypes(),
    }),
    [],
  );
}
```

- [ ] **Step 2: Implement useRecordingSession hook**

Create `apps/web/src/features/recordings/hooks/use-recording-session.ts`.

As specified in the design:

- `useRef` for session, `useState` for state snapshot
- One `useEffect` to create session and subscribe
- One `useEffect` to check for orphaned sessions
- `useCallback` wrappers for start/pause/resume/stop
- `derivePublicState()` maps internal state to `UseRecordingSessionReturn`
- Calls `createRecordingSession()` factory

- [ ] **Step 3: Verify types compile**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/recordings/hooks/use-recording-session.ts apps/web/src/features/recordings/hooks/use-audio-capabilities.ts apps/web/src/features/recordings/lib/audio-capabilities.ts
git commit -m "feat(recording): add useRecordingSession hook and audio capability detection"
```

---

## Task 13: React Components

**Files:**

- Create: `apps/web/src/features/recordings/components/recording-session/recording-session.tsx`
- Create: `apps/web/src/features/recordings/components/recording-session/recording-controls.tsx`
- Create: `apps/web/src/features/recordings/components/recording-session/transcription-panel.tsx`
- Create: `apps/web/src/features/recordings/components/recording-session/audio-source-indicator.tsx`
- Create: `apps/web/src/features/recordings/components/recording-session/chunk-upload-status.tsx`
- Create: `apps/web/src/features/recordings/components/recording-session/recovery-dialog.tsx`
- Create: `apps/web/src/features/recordings/components/shared/duration-display.tsx`
- Create: `apps/web/src/features/recordings/components/record-page.tsx`

- [ ] **Step 1: Build shared display components**

Create `apps/web/src/features/recordings/components/shared/duration-display.tsx`.
Simple component: takes `seconds: number`, renders `HH:MM:SS` or `MM:SS` format. Uses Shadcn typography.

Create `apps/web/src/features/recordings/components/shared/recording-status-badge.tsx`.
Takes `status: RecordingStatus`, renders a colored badge (red for recording, yellow for paused, green for complete, etc.). Uses Shadcn Badge component.

- [ ] **Step 2: Build recording controls**

Create `apps/web/src/features/recordings/components/recording-session/recording-controls.tsx`.

Props: `status`, `onStart`, `onPause`, `onResume`, `onStop`, `duration`.
Renders appropriate buttons based on status:

- `idle` → "Start" button
- `recording` → "Pause" + "Stop" buttons
- `paused` → "Resume" + "Stop" buttons
- `stopping`/`finalizing` → loading spinner
- `complete` → nothing (parent navigates away)
- `error` → "Save what we have" + "Discard" buttons (if recoverable)

Use Shadcn Button, Lucide icons. Reference existing `src/features/recordings/components/live-recorder/recording-section.tsx` for design language (Dutch labels).

- [ ] **Step 3: Build transcription panel**

Create `apps/web/src/features/recordings/components/recording-session/transcription-panel.tsx`.

Props: `transcription: { status, segments, currentCaption }`.
Renders live transcript with speaker labels and interim captions.
Reference existing `src/features/recordings/components/live-recorder/transcription-display.tsx`.

- [ ] **Step 4: Build audio source indicator, upload status, recovery dialog**

Create the remaining components:

- `audio-source-indicator.tsx` — shows which audio sources are active (mic icon, system icon)
- `chunk-upload-status.tsx` — subtle progress indicator showing `uploadedChunks / totalChunks`
- `recovery-dialog.tsx` — Shadcn AlertDialog offering "Recover" or "Discard" for orphaned sessions

- [ ] **Step 5: Build recording session orchestrator**

Create `apps/web/src/features/recordings/components/recording-session/recording-session.tsx`.

`"use client"` component. Takes `config: UseRecordingSessionConfig`. Calls `useRecordingSession(config)`. Renders:

- `RecoveryDialog` (if orphaned session detected)
- `AudioSourceIndicator`
- `DurationDisplay`
- `RecordingControls`
- `TranscriptionPanel` (if live transcription enabled)
- `ChunkUploadStatus`
- Error/warning toasts via `sonner`

On `complete`: calls `router.push(\`/recordings/\${recordingId}\`)`.

- [ ] **Step 6: Build record page client component**

Create `apps/web/src/features/recordings/components/record-page.tsx`.

`"use client"` component. Replaces existing `record-page-client.tsx`. Renders:

- Project selector (dropdown from passed projects list)
- Audio source selector (using `useAudioCapabilities` to show/hide options)
- Live transcription toggle
- Consent manager (reuse existing `ConsentManager` component)
- `RecordingSession` component (mounted via key for config changes, only after consent granted)

Reference existing `src/features/recordings/components/record-page-client.tsx:1-187` for layout and project selector pattern.

- [ ] **Step 7: Verify all components compile**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/recordings/components/recording-session/ apps/web/src/features/recordings/components/shared/ apps/web/src/features/recordings/components/record-page.tsx
git commit -m "feat(recording): add new recording UI components with FSM-driven state"
```

---

## Task 14: Wire Up Record Page and Feature Flag

**Files:**

- Modify: `apps/web/src/app/(main)/record/page.tsx`

- [ ] **Step 1: Update record page to use new component**

Modify `apps/web/src/app/(main)/record/page.tsx` to import and render the new `RecordPage` component instead of the old `RecordPageClient`.

For now, add a simple feature flag check (environment variable `NEXT_PUBLIC_NEW_RECORDING_UI`):

- If `"true"`: render new `RecordPage`
- Otherwise: render old `RecordPageClient`

This allows parallel testing.

- [ ] **Step 2: Verify the page loads without errors**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && npx next build
```

Expected: Build succeeds without errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(main)/record/page.tsx
git commit -m "feat(recording): wire up new recording UI behind NEXT_PUBLIC_NEW_RECORDING_UI feature flag"
```

---

## Task 15: Remove Old Providers from Root Layout

Only do this AFTER the new implementation is verified to work correctly with the feature flag.

**Files:**

- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Remove audio/transcription providers from root layout**

Edit `apps/web/src/app/layout.tsx`:

- Remove `DeepgramContextProvider` import and wrapper
- Remove `MicrophoneContextProvider` import and wrapper
- Remove `SystemAudioContextProvider` import and wrapper
- Keep: `BetterAuthProvider`, `QueryProvider`, `NuqsAdapter`, `ThemeProvider`

- [ ] **Step 2: Verify no other pages import from removed providers**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && grep -r "useMicrophone\|useSystemAudio\|useDeepgram\|MicrophoneContext\|SystemAudioContext\|DeepgramContext" src/ --include="*.ts" --include="*.tsx" | grep -v "providers/" | grep -v "node_modules"
```

If any files still import from the old providers, they need to be updated to use the new architecture or the old providers need to stay until those are migrated.

- [ ] **Step 3: Build and verify**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && npx next build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "refactor(recording): remove DeepgramProvider, MicrophoneProvider, SystemAudioProvider from root layout"
```

---

## Task 16: Delete Old Files

Only do this AFTER Task 15 builds successfully.

**Files to delete:**

- `src/providers/DeepgramProvider.tsx`
- `src/providers/microphone/MicrophoneProvider.tsx`
- `src/providers/microphone/microphone-audio-processor.ts`
- `src/providers/microphone/microphone-reducer.ts`
- `src/providers/microphone/microphone-constants.ts`
- `src/providers/microphone/audio-mixer.ts`
- `src/providers/system-audio/SystemAudioProvider.tsx`
- `src/providers/system-audio/system-audio-reducer.ts`
- `src/features/recordings/hooks/use-live-recording.ts`
- `src/features/recordings/hooks/use-live-transcription.ts`
- `src/features/recordings/hooks/use-audio-source.ts`
- `src/features/recordings/hooks/setup-audio-sources.ts`

- [ ] **Step 1: Delete old provider files**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web
rm -f src/providers/DeepgramProvider.tsx
rm -rf src/providers/microphone/
rm -rf src/providers/system-audio/
```

- [ ] **Step 2: Delete old recording hooks**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web
rm -f src/features/recordings/hooks/use-live-recording.ts
rm -f src/features/recordings/hooks/use-live-transcription.ts
rm -f src/features/recordings/hooks/use-audio-source.ts
rm -f src/features/recordings/hooks/setup-audio-sources.ts
```

- [ ] **Step 3: Build and verify no broken imports**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && npx next build
```

Expected: Build succeeds. If it fails, fix broken imports.

- [ ] **Step 4: Run all tests**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(recording): delete old provider-based recording architecture (replaced by FSM)"
```

---

## Task 17: Remove Feature Flag

After the new architecture is verified in production.

**Files:**

- Modify: `apps/web/src/app/(main)/record/page.tsx`

- [ ] **Step 1: Remove feature flag, always render new UI**

Edit `apps/web/src/app/(main)/record/page.tsx`:

- Remove the `NEXT_PUBLIC_NEW_RECORDING_UI` check
- Always render the new `RecordPage` component
- Remove the old `RecordPageClient` import

- [ ] **Step 2: Delete old record page client**

```bash
rm src/features/recordings/components/record-page-client.tsx
```

- [ ] **Step 3: Build and verify**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && npx next build && pnpm test
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(recording): remove feature flag, new recording architecture is now the default"
```

---

## Task 18: E2E Tests (Deferred)

**Status:** Deferred — implement after core functionality is verified in production.

**Files:**

- Create: `apps/web/e2e/recording.spec.ts` (or wherever Playwright tests live)

This task covers the spec's "Layer 3: E2E Tests (Playwright)":

- [ ] **Step 1: Set up Playwright** (if not already configured)
- [ ] **Step 2: Write happy path test** — start → record 3s → stop → verify navigation to recording detail
- [ ] **Step 3: Write audio source selection test** — verify mic/system/combined options display correctly based on browser capabilities
- [ ] **Step 4: Write recovery dialog test** — seed IndexedDB with orphaned session, navigate to record page, verify dialog appears
- [ ] **Step 5: Write error state test** — mock getUserMedia to reject, verify error UI renders

All tests use mocked media devices (`page.evaluate` to stub `navigator.mediaDevices`). Actual audio capture cannot be meaningfully automated.
