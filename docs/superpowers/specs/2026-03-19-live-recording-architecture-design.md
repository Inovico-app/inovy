# Live Recording Architecture Design

**Date:** 2026-03-19
**Status:** Approved
**Approach:** State Machine-Driven Services (Approach A)

## Context & Motivation

The existing live recording feature suffers from reliability issues (Deepgram connection drops, audio chunk loss, state desynchronization), architectural complexity (3 global React Context providers + 3+ hooks with `useEffect` chains), poor testability (browser APIs tightly coupled to React lifecycle), and missing capabilities (no crash recovery, no progressive upload, no graceful degradation).

This design replaces the entire recording stack with a clean, testable, state-machine-driven architecture built from scratch.

## Constraints

- **Vercel hosting** — no server-side WebSocket relay possible
- **Direct client → Deepgram** — live transcription via client-side WebSocket
- **Audio sources** — microphone + system audio (Chrome/Edge only for system audio)
- **Live transcription is UX-only** — batch transcription post-recording is the source of truth
- **Progressive chunk upload** — stream chunks to storage during recording
- **WebM format** — no client-side MP3 conversion; Deepgram accepts WebM natively
- **Azure Blob Storage** — all file uploads go to Azure Blob Storage. Uses SAS tokens for direct client-to-Azure uploads. Supports Block Blob API for chunked uploads.
- **Vercel serverless limits** — 4.5-6MB body, 60-300s timeout; server-side assembly of large files is not feasible

---

## Shared Type Definitions

```typescript
type AudioSource = "microphone" | "system" | "combined";

type RecordingStatus =
  | "idle"
  | "initializing"
  | "recording"
  | "paused"
  | "stopping"
  | "finalizing"
  | "complete"
  | "error";

type Unsubscribe = () => void;

interface Disposable {
  dispose(): void;
}
```

---

## Architecture Overview

```
                    ┌─────────────────┐
                    │   Components    │
                    │   (React UI)    │
                    └────────┬────────┘
                             │ uses
                    ┌────────▼────────┐
                    │     Hooks       │
                    │ (React bridge)  │
                    └────────┬────────┘
                             │ creates & subscribes
                    ┌────────▼────────┐
                    │ RecordingSession │
                    │     (FSM)       │
                    └────────┬────────┘
                             │ orchestrates
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │   Audio    │  │   Chunk    │  │   Live     │
     │  Capture   │  │ Persistence│  │Transcription│
     └──────┬─────┘  └──────┬─────┘  └──────┬─────┘
            │               │               │
            ▼               ▼               ▼
       Browser APIs    IndexedDB +      Deepgram SDK
       (MediaRecorder  Azure Blob       (WebSocket)
        getUserMedia   (Block Blob API
        getDisplayMedia) + SAS tokens)
```

The FSM is a plain TypeScript class with zero React dependencies. Services are injected via constructor. React subscribes to state changes through a single hook.

---

## Section 1: Recording Session State Machine

### States

```
idle
  → initializing    (user clicks "Start")
initializing
  → recording       (audio devices ready, MediaRecorder started)
  → error           (permission denied, device not found)
recording
  → paused          (user clicks "Pause")
  → stopping        (user clicks "Stop")
  → error           (device lost, fatal failure)
paused
  → recording       (user clicks "Resume")
  → stopping        (user clicks "Stop")
stopping
  → finalizing      (MediaRecorder stopped, last chunks flushed)
finalizing
  → complete        (upload finalized, DB record created)
  → error           (upload failed after retries)
error
  → idle            (user acknowledges / resets)
  → finalizing      (recoverable: attempt to save what we have)
```

### State Shape

```typescript
interface RecordingSessionState {
  status: RecordingStatus;
  duration: number; // seconds elapsed (excludes paused time)
  audioSource: AudioSource;
  chunks: ChunkManifest;
  transcription: TranscriptionState;
  error: RecordingError | null;
  warnings: RecordingError[]; // non-fatal issues (e.g., transcription dropped)
  consent: ConsentState; // consent tracking
}

interface TranscriptionState {
  status: ConnectionStatus;
  segments: TranscriptSegment[];
  currentCaption: string | null; // latest interim result
}

interface ConsentState {
  consentGiven: boolean;
  consentGivenAt: string | null; // ISO timestamp
}
```

### RecordingSession Constructor

Services are injected via constructor for testability:

```typescript
interface RecordingSessionDeps {
  audioCapture: AudioCaptureService;
  chunkPersistence: ChunkPersistenceService;
  liveTranscription?: LiveTranscriptionService; // optional — recording works without it
}

interface RecordingSessionConfig {
  projectId: string;
  audioSource: AudioSource;
  language: string;
  liveTranscriptionEnabled: boolean;
  consent: ConsentState;
}

class RecordingSession {
  constructor(deps: RecordingSessionDeps, config: RecordingSessionConfig);
  // ...
}
```

When `liveTranscription` is not provided (or `liveTranscriptionEnabled` is false), the FSM skips all transcription-related side effects. The recording pipeline is fully functional without it.

### Transition Side Effects

| Transition                 | Side Effects                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `idle → initializing`      | Request device permissions, create AudioContext, detect capabilities                                         |
| `initializing → recording` | Start MediaRecorder (250ms timeslice), connect Deepgram (if enabled), acquire WakeLock, start duration timer |
| `recording → paused`       | Pause MediaRecorder, start Deepgram keep-alive, pause duration timer                                         |
| `paused → recording`       | Resume MediaRecorder, stop keep-alive, resume timer                                                          |
| `recording → stopping`     | Stop MediaRecorder, flush final chunks, disconnect Deepgram                                                  |
| `stopping → finalizing`    | Finalize chunk upload (server-side assembly), create DB recording, release WakeLock                          |
| `finalizing → complete`    | Trigger AI workflow, navigate to recording detail                                                            |
| `* → error`                | See error state detail below                                                                                 |

### Error State Detail

On entering `error`, behavior depends on the error's recoverability:

**Fatal, non-recoverable** (e.g., permission denied during init):

- Release all resources
- Show error message
- Only transition: `error → idle` (user acknowledges)

**Fatal, recoverable** (e.g., device lost mid-recording, finalization failed):

- Release audio capture resources (MediaRecorder, streams)
- Do NOT release ChunkPersistenceService — it still holds data
- Show error with "Save what we have" button
- User-initiated transition: `error → finalizing` (attempts to finalize with chunks already persisted)
- Or: `error → idle` (user discards)

**Warnings** (non-fatal) do not transition to `error` state. They are appended to `state.warnings` and shown as non-blocking toasts.

### Design Decision

The FSM is a plain TypeScript class, not a React hook or context. It emits state changes via a simple observer pattern. The React layer subscribes via a thin `useRecordingSession` hook. This means:

- The FSM can be unit tested without React
- State transitions are deterministic and inspectable
- No `useEffect` chains driving the recording lifecycle

---

## Section 2: AudioCaptureService

Abstracts all browser audio APIs behind a clean interface.

### Interface

```typescript
interface AudioCaptureService {
  initialize(): Promise<void>;
  start(timeslice: number): void;
  pause(): void;
  resume(): void;
  stop(): Promise<void>;

  onChunk(callback: (chunk: AudioChunk) => void): Unsubscribe;
  onError(callback: (error: CaptureError) => void): Unsubscribe;

  getStream(): MediaStream | null;
  isActive(): boolean;
}

interface AudioChunk {
  data: Blob;
  index: number;
  timestamp: number;
  duration: number;
}
```

### Three Implementations

- **MicrophoneCaptureService** — `getUserMedia()`, gain node pipeline (raw stream → GainNode → processed stream), MediaRecorder wrapping
- **SystemAudioCaptureService** — `getDisplayMedia({ audio: true, video: true })`, extract audio tracks, keep video tracks alive but disabled (`track.enabled = false`, not stopped — stopping video tracks ends the display media session in most browsers). Monitor `track.onended` on both audio and video tracks to detect when the user stops screen sharing. MediaRecorder wrapping on audio only.
- **CombinedCaptureService** — Composes (not inherits) the other two. Mixes via `AudioContext` + `MediaStreamDestination`. If system audio capture fails, falls back to mic-only with a warning.

### Resource Cleanup

Each implementation uses a shared `ResourceTracker` utility:

```typescript
class ResourceTracker {
  track(resource: Disposable): void;
  disposeAll(): void; // Teardown everything in reverse order
}
```

`stop()` calls `disposeAll()` which stops MediaRecorder, stops all MediaStream tracks (including disabled video tracks), closes AudioContext, removes all event listeners, and nulls all references.

### Gain Control

`MicrophoneCaptureService` exposes gain control for microphone volume adjustment:

```typescript
interface MicrophoneCaptureService extends AudioCaptureService {
  setGain(value: number): void; // 0.0 to 1.0
  getGain(): number;
}
```

Implemented via the `GainNode` in the audio processing pipeline. Other capture service implementations do not expose gain control.

### Testing

```typescript
class FakeAudioCaptureService implements AudioCaptureService {
  // Emits fake chunks on a timer
  // Allows tests to simulate errors, pauses, device loss
}
```

---

## Section 3: ChunkPersistenceService

Receives audio chunks in real-time and ensures they survive — even if the tab crashes.

### Interface

```typescript
interface ChunkPersistenceService {
  initialize(sessionId: string): Promise<void>;
  finalize(): Promise<FinalizedRecording>;
  abort(): Promise<void>;

  persistChunk(chunk: AudioChunk): Promise<void>;

  hasOrphanedSession(): Promise<boolean>;
  recoverSession(): Promise<RecoveredSession | null>;
  discardOrphanedSession(): Promise<void>;

  getManifest(): ChunkManifest;
}

interface ChunkManifest {
  sessionId: string;
  totalChunks: number;
  uploadedChunks: number;
  pendingChunks: number;
  totalBytes: number;
  startedAt: number;
}

interface FinalizedRecording {
  fileUrl: string;
  fileSize: number;
  duration: number;
  chunkCount: number;
}

interface RecoveredSession {
  sessionId: string;
  manifest: ChunkManifest;
  chunks: AudioChunk[];
  metadata: SessionMetadata;
}
```

### Two-Tier Persistence Strategy

Every chunk goes through two paths simultaneously:

1. **IndexedDB (immediate)** — local backup, survives tab crash. Chunks stored with `sessionId:chunkIndex` as key.
2. **Azure Blob upload (async, batched)** — progressive remote persistence. Batches ~20 chunks (~5 seconds) into a single upload to reduce request count.

### IndexedDB Schema

```typescript
interface ChunkStore {
  key: `${sessionId}:${chunkIndex}`;
  data: Blob;
  timestamp: number;
  uploaded: boolean;
}

interface SessionStore {
  sessionId: string;
  metadata: SessionMetadata;
  manifest: ChunkManifest;
  status: "active" | "orphaned" | "finalized";
}
```

### Remote Upload Strategy: Azure Block Blob with Progressive Uploads

Azure Blob Storage supports **Block Blob** uploads: upload individual blocks (no minimum size), then commit them into a single blob. This enables true progressive uploads during recording.

The existing codebase uses SAS tokens for direct client-to-Azure uploads (`AzureStorageProvider.generateClientUploadToken()`). We extend this pattern with the Block Blob API.

```
Recording starts:
  → Client requests a SAS token from server (write permissions, 30-min TTL)
  → SAS URL targets the final blob path (e.g., recordings/{orgId}/{sessionId}.webm)

Chunks arrive every 250ms:
  → Each chunk written to IndexedDB immediately (crash-safe)
  → Chunks also held in memory buffer
  → Every ~5 seconds (or ~20 chunks), flush buffer:
      1. Concatenate chunks into single Blob (~80-160KB)
      2. Upload as a block via PUT with block ID (Azure Stage Block API)
      3. Mark those chunks as uploaded in IndexedDB
      4. Update manifest

Recording ends:
  → Flush remaining chunks as final block
  → Call PUT Block List (Azure Commit Block List API) to assemble all blocks
  → Azure assembles the final blob server-side
  → Notify server of completion (existing upload-complete flow)
```

Azure Block Blob has **no minimum block size** (unlike Azure Blob's 5MB minimum per part), so uploading ~80-160KB blocks every 5 seconds works perfectly.

**SAS Token Refresh:** The initial SAS token has a 30-minute TTL. For recordings longer than 25 minutes, request a new SAS token before expiry. Azure allows staging blocks with different SAS tokens as long as they target the same blob — only the final Commit Block List needs a valid token.

### IndexedDB as Crash Safety Net

Every chunk is written to IndexedDB immediately, regardless of upload success. IndexedDB is the crash recovery source of truth. Remote upload is best-effort during recording.

If a block upload fails: retry with exponential backoff (3 attempts). If still failing, chunks stay in IndexedDB. On finalization, any un-uploaded blocks are uploaded from IndexedDB before committing.

**Memory management for long recordings:** For recordings exceeding ~30 minutes (~28MB at 128kbps), the in-memory buffer may grow large. If memory pressure is detected (via `performance.memory` API where available), flush the in-memory buffer and rely on IndexedDB for finalization. The finalization step reads chunks back from IndexedDB in sequence, uploads any missing blocks, and commits.

### Finalization

1. Flush remaining chunks as final block upload
2. Upload any blocks that failed during recording (from IndexedDB)
3. Call Azure Commit Block List API with all block IDs → assembles the final blob
4. Call `POST /api/recordings/upload` with `action: "upload-complete"` (existing pattern)
   - Sends: blobUrl, pathname, tokenPayload, tokenSignature, metadata
   - Server verifies HMAC signature, calls `getBlobProperties()` with retry logic
   - Creates recording in database (including consent fields)
   - Triggers AI workflow (`convertRecordingIntoAiInsights`)
   - Returns `{ recordingId }`
5. Clean up IndexedDB

This reuses the existing upload completion flow at `/api/recordings/upload` — the same route and HMAC verification pattern used by the file upload feature today. The only new part is the Block Blob staging during recording.

### Crash Recovery

```
Page mount
  → hasOrphanedSession()?
    → YES: Check age
      → Older than 7 days: auto-discard, clean IndexedDB
      → Within 7 days: Show recovery dialog
        → "Recover" → re-upload un-uploaded chunks from IndexedDB → finalize
        → "Discard" → clean IndexedDB
    → NO: Normal flow
```

Recovery re-uploads from IndexedDB (local data). Previously staged Azure blocks from the crashed session may still exist (uncommitted blocks have a 7-day TTL in Azure), but we do not rely on them. Instead, recovery requests a fresh SAS token, stages all blocks from IndexedDB to a new blob path, and commits. This makes recovery self-contained — IndexedDB is the single source of truth for crash recovery.

### No Client-Side MP3 Conversion

The current architecture converts WebM→MP3 client-side. This is slow, unreliable across browsers, and unnecessary since Deepgram accepts WebM natively. Upload WebM directly. If MP3 is needed for user downloads, convert server-side in the AI workflow.

### Failure Modes

| Scenario                        | Behavior                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Single block upload fails       | Retry with exponential backoff (3 attempts). Chunks stay in IndexedDB. Re-uploaded before commit.       |
| Network down entirely           | Chunks accumulate in IndexedDB. Warning shown. Resume block uploads when network returns.               |
| Tab crashes                     | Orphaned session detected on next visit. Recovery dialog offered.                                       |
| IndexedDB full                  | Fall back to memory-only accumulation. Log warning.                                                     |
| SAS token expires mid-recording | Request new SAS token (same blob path). Continue staging blocks. Only commit needs valid token.         |
| Azure storage quota exceeded    | Stop uploading, keep accumulating in IndexedDB. Show error. On finalize, attempt upload from IndexedDB. |
| Commit Block List fails         | Retry commit. All blocks are already staged — commit is idempotent with the same block list.            |

---

## Section 4: LiveTranscriptionService

Side-car that observes audio chunks and produces live transcript segments. Never blocks or affects the recording pipeline.

### Interface

```typescript
interface LiveTranscriptionService {
  connect(config: TranscriptionConfig): Promise<void>;
  disconnect(): void;

  sendChunk(chunk: AudioChunk): void;

  onSegment(callback: (segment: TranscriptSegment) => void): Unsubscribe;
  onStatusChange(callback: (status: ConnectionStatus) => void): Unsubscribe;

  getStatus(): ConnectionStatus;
  getSegments(): TranscriptSegment[];
}

interface TranscriptionConfig {
  model: "nova-3";
  language: string;
  enableDiarization: boolean;
  interimResults: boolean;
}

type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";

interface TranscriptSegment {
  text: string;
  speaker?: number;
  isFinal: boolean;
  confidence: number;
  startTime: number;
  endTime: number;
}
```

### Connection Lifecycle

```
disconnected → connecting → connected → disconnected
                    ↓              ↓
               reconnecting ← (close/error)
                    ↓
                  failed (after 3 retries)
```

### Token Management

Deepgram temporary tokens have a configurable TTL. Request tokens with `ttl_seconds: 600` (10 minutes, max allowed is 3600).

**Proactive refresh strategy:**

1. On `connect()`, request a token and record its expiry time
2. Set a refresh timer for 60 seconds before expiry
3. When the timer fires: request a new token via `getDeepgramClientTokenAction`
4. Disconnect the current WebSocket and reconnect with the new token (uses the reconnection flow)
5. If token refresh fails: log warning, continue with current connection until it drops, then reconnect will request a fresh token

This handles long recordings (hours) without token expiry causing silent transcription failures.

On auth error during reconnect, the cached token is invalidated and a fresh one is requested.

### Reconnection Strategy

On WebSocket drop while recording is active:

1. Wait 1 second
2. Reconnect
3. If fails: wait 2s, retry
4. If fails: wait 4s, retry
5. After 3 failed attempts: transition to `"failed"`, recording continues unaffected

No audio buffering during gaps. Chunks sent during `reconnecting` state are silently dropped. Acceptable since batch transcription is the source of truth.

### Keep-Alive

Send `keepAlive()` every 8 seconds while recording is paused. Prevents Deepgram's ~10-second idle timeout.

### Chunk Forwarding (orchestrated by FSM)

```
AudioChunk arrives
  → ChunkPersistenceService.persistChunk(chunk)     // always
  → LiveTranscriptionService.sendChunk(chunk)        // only if connected
```

`sendChunk` is fire-and-forget:

```typescript
sendChunk(chunk: AudioChunk): void {
  if (this.status !== "connected") return;
  this.connection.send(chunk.data);
}
```

### Relationship to Recording

The recording pipeline has zero dependencies on this service. If LiveTranscriptionService throws, crashes, or disconnects — the FSM catches, logs, and continues.

---

## Section 5: React Integration Layer

Thin bridge between plain TypeScript services and React UI.

### Single Hook

```typescript
interface UseRecordingSessionConfig {
  projectId: string;
  audioSource: AudioSource;
  liveTranscriptionEnabled: boolean;
  language: string;
}

interface UseRecordingSessionReturn {
  status: RecordingStatus;
  duration: number;
  error: RecordingError | null;
  chunkManifest: ChunkManifest;
  transcription: {
    status: ConnectionStatus;
    segments: TranscriptSegment[];
    currentCaption: string | null;
  };

  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<StopResult>;

  orphanedSession: RecoveredSession | null;
  recoverOrphanedSession: () => Promise<void>;
  discardOrphanedSession: () => Promise<void>;
}
```

### Hook Internals

One `useEffect`, one subscription, zero `useEffect` chains. Creates `RecordingSession` on mount, subscribes to state changes, delegates controls directly to the session.

**Config is immutable after mount.** The `RecordingSession` component should be unmounted and remounted (via a `key` prop tied to config) to change config. This is enforced by the empty dependency array — config changes don't recreate the session.

```typescript
// Parent component controls remounting via key:
<RecordingSession key={`${projectId}-${audioSource}`} config={config} />
```

```typescript
function useRecordingSession(config) {
  const sessionRef = useRef<RecordingSession | null>(null);
  const [state, setState] = useState(initialState);

  useEffect(() => {
    const session = createRecordingSession(config); // factory creates FSM + injects services
    sessionRef.current = session;
    const unsubscribe = session.onStateChange(setState);
    return () => { unsubscribe(); session.destroy(); };
  }, []); // intentionally stable — remount component to change config

  useEffect(() => { sessionRef.current?.checkForOrphanedSession(); }, []);

  const start = useCallback(() => sessionRef.current!.start(), []);
  // ... pause, resume, stop

  return { ...derivePublicState(state), start, pause, resume, stop, ... };
}
```

`createRecordingSession` is a factory function that instantiates the FSM with real service implementations. Test code can use the `RecordingSession` constructor directly with fakes.

### Component Architecture

```
app/(main)/record/page.tsx              ← Server Component (fetches projects)
  └── RecordPage                        ← Client Component (project selector, config)
        └── RecordingSession            ← Client Component (the recording UI)
              ├── useRecordingSession(config)
              ├── RecordingControls
              ├── AudioSourceIndicator
              ├── TranscriptionPanel
              ├── ChunkUploadStatus
              └── RecoveryDialog
```

### What's Removed

- No global providers (`MicrophoneProvider`, `SystemAudioProvider`, `DeepgramProvider` removed from root layout)
- No `useAudioSource` hook (audio source is config input)
- No `useRecordingPreferences` hook (plain localStorage reads in parent component)
- No `useEffect` orchestration (FSM drives all side effects)

### Consent Handling

Consent is collected in the `RecordPage` component before the `RecordingSession` component mounts. The existing `consent-manager.tsx` component is reused for the consent UI. Consent state is passed as config to `useRecordingSession` and flows through the FSM to finalization:

1. `RecordPage` renders consent UI (reuses existing `ConsentManager` component)
2. User grants consent → `consentGiven: true, consentGivenAt: ISO string`
3. `RecordingSession` receives consent as config
4. On finalization, consent data is included in the `finalizeRecording` server action payload
5. Server action stores `consentGiven`, `consentGivenBy` (authenticated user ID), `consentGivenAt` in the recordings table
6. Per-participant consent records are created via `ConsentService` as they are today

The "Start Recording" button is disabled until consent is granted.

### Capability Detection

```typescript
function useAudioCapabilities(): AudioCapabilities {
  return {
    hasMicrophone: !!navigator.mediaDevices?.getUserMedia,
    hasSystemAudio: isSystemAudioSupported(),
    supportedMimeTypes: getSupportedMimeTypes(),
  };
}
```

Synchronous checks, no side effects, no device access. Used by `RecordPage` to show/hide audio source options.

---

## Section 6: File Structure & Module Boundaries

### Directory Layout

```
src/features/recordings/
├── core/                              ← Plain TypeScript, zero React
│   ├── recording-session.ts
│   ├── recording-session.types.ts
│   ├── recording-session.errors.ts
│   ├── services/
│   │   ├── audio-capture/
│   │   │   ├── audio-capture.interface.ts
│   │   │   ├── microphone-capture.ts
│   │   │   ├── system-audio-capture.ts
│   │   │   ├── combined-capture.ts
│   │   │   └── audio-mixer.ts
│   │   ├── chunk-persistence/
│   │   │   ├── chunk-persistence.interface.ts
│   │   │   ├── chunk-persistence.ts
│   │   │   ├── indexed-db-store.ts
│   │   │   └── azure-block-uploader.ts    ← Azure Block Blob staging + commit
│   │   └── live-transcription/
│   │       ├── live-transcription.interface.ts
│   │       ├── live-transcription.ts
│   │       └── transcript-processor.ts
│   └── utils/
│       ├── resource-tracker.ts
│       ├── event-emitter.ts
│       └── retry.ts
├── hooks/
│   ├── use-recording-session.ts
│   └── use-audio-capabilities.ts
├── components/
│   ├── record-page.tsx
│   ├── recording-session/
│   │   ├── recording-session.tsx
│   │   ├── recording-controls.tsx
│   │   ├── audio-source-indicator.tsx
│   │   ├── transcription-panel.tsx
│   │   ├── chunk-upload-status.tsx
│   │   └── recovery-dialog.tsx
│   └── shared/
│       ├── duration-display.tsx
│       └── recording-status-badge.tsx
├── actions/
│   ├── request-upload-sas.ts          ← Get SAS token for Azure Block Blob uploads (reuses existing generate-token flow)
│   └── deepgram-token.ts             ← Get temporary Deepgram token
│   # Note: finalization uses existing POST /api/recordings/upload (action: "upload-complete")
└── lib/
    └── audio-capabilities.ts
```

### Dependency Rules

1. `core/` has zero React imports
2. Services depend only on their own interface and `utils/`
3. `RecordingSession` depends on service interfaces, not implementations (constructor injection)
4. `hooks/` depends on `core/` (thin bridge only)
5. `components/` depends on `hooks/` and `actions/` (never imports `core/` directly)
6. `actions/` are independent (depend on server-side code only)

### Files Replaced

| Current File                                         | Replaced By                                                    |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `providers/MicrophoneProvider.tsx`                   | `core/services/audio-capture/microphone-capture.ts`            |
| `providers/SystemAudioProvider.tsx`                  | `core/services/audio-capture/system-audio-capture.ts`          |
| `providers/DeepgramProvider.tsx`                     | `core/services/live-transcription/live-transcription.ts`       |
| `providers/microphone/audio-mixer.ts`                | `core/services/audio-capture/audio-mixer.ts`                   |
| `providers/microphone/microphone-audio-processor.ts` | Absorbed into `microphone-capture.ts`                          |
| `hooks/use-live-recording.ts`                        | `core/recording-session.ts` + `hooks/use-recording-session.ts` |
| `hooks/use-live-transcription.ts`                    | `core/services/live-transcription/live-transcription.ts`       |
| `hooks/use-audio-source.ts`                          | `core/services/audio-capture/*` + `lib/audio-capabilities.ts`  |
| `hooks/setup-audio-sources.ts`                       | Absorbed into `AudioCaptureService.initialize()`               |

---

## Section 7: Error Handling & Testing Strategy

### Error Taxonomy

```typescript
type RecordingError =
  | CaptureError
  | PersistenceError
  | TranscriptionError
  | SessionError;

interface BaseError {
  code: string;
  message: string;
  severity: "warning" | "fatal";
  recoverable: boolean;
  cause?: unknown;
}
```

### Error Classification

| Error                                             | Severity | Recoverable | FSM Behavior                                         |
| ------------------------------------------------- | -------- | ----------- | ---------------------------------------------------- |
| Permission denied (mic)                           | fatal    | no          | `initializing → error`                               |
| Permission denied (system audio) in combined mode | warning  | yes         | Fall back to mic-only                                |
| Device lost mid-recording                         | fatal    | no          | `recording → error → finalizing` (save what we have) |
| Single chunk upload fails                         | warning  | yes         | Retry, keep in IndexedDB                             |
| Network down entirely                             | warning  | yes         | Chunks accumulate in IndexedDB                       |
| Finalization upload fails                         | fatal    | yes         | `finalizing → error`, offer retry                    |
| IndexedDB full                                    | warning  | yes         | Fall back to memory-only                             |
| Deepgram connection fails                         | warning  | yes         | Live transcription disabled                          |
| Deepgram token expired                            | warning  | yes         | Request new token, reconnect                         |

### Error Handling Pattern: `never-throw`

Per project guidelines, service methods that can fail use `Result<T, E>` from `never-throw`:

```typescript
// Service methods return Result types
persistChunk(chunk: AudioChunk): ResultAsync<void, PersistenceError>;
finalize(): ResultAsync<FinalizedRecording, PersistenceError>;
connect(config: TranscriptionConfig): ResultAsync<void, TranscriptionError>;
```

The FSM unwraps Results and handles errors via state transitions. This keeps error handling explicit and type-safe throughout the pipeline.

### Browser Support Matrix

| Feature                 | Chrome    | Edge      | Firefox                | Safari                 |
| ----------------------- | --------- | --------- | ---------------------- | ---------------------- |
| Microphone capture      | Yes       | Yes       | Yes                    | Yes                    |
| System audio capture    | Yes (72+) | Yes (79+) | No                     | No                     |
| Combined capture        | Yes       | Yes       | No (mic only fallback) | No (mic only fallback) |
| MediaRecorder WebM/Opus | Yes       | Yes       | Yes                    | No (uses mp4/aac)      |
| IndexedDB Blob storage  | Yes       | Yes       | Yes                    | Yes (with caveats)     |
| WakeLock API            | Yes       | Yes       | Yes                    | Yes (16.4+)            |

For Safari: MediaRecorder uses `audio/mp4` instead of `audio/webm;codecs=opus`. The `AudioCaptureService` detects the best supported MIME type via `MediaRecorder.isTypeSupported()` and uses it. Deepgram accepts both formats.

### Degradation Hierarchy

1. Audio chunks saved locally (IndexedDB) — highest priority, always works
2. Audio chunks uploaded remotely — second priority, best-effort during recording
3. Live transcription — completely expendable

### Testing Strategy

**Layer 1: Unit Tests** — FSM and services in isolation using fakes. No browser, no React. Test all state transitions, chunk routing, error handling, pause/resume, resource cleanup.

**Layer 2: Service Integration Tests** — Individual services with mocked externals. ChunkPersistenceService with `fake-indexeddb`, LiveTranscriptionService with mocked WebSocket, AudioCaptureService with mocked MediaRecorder.

**Layer 3: E2E Tests (Playwright)** — Full recording flow with mocked media devices. Happy path, audio source selection UI, recovery dialog, error states.

**Not tested (manual QA):** Actual browser audio capture, actual Deepgram WebSocket responses, WebM encoding internals.

---

## Section 8: Migration Strategy

### Approach: Parallel Implementation with Feature Flag

The new recording stack is built alongside the old one, behind a feature flag. This avoids big-bang risk and allows gradual rollout.

1. **Build the new `core/` layer** — FSM + services, fully tested in isolation. No UI changes yet.
2. **Build the new `hooks/` and `components/`** — New recording page at `/record` (or gated by feature flag on the existing route).
3. **Remove old providers from root layout** — Only after the new implementation is verified. The old `MicrophoneProvider`, `SystemAudioProvider`, and `DeepgramProvider` are removed from the root layout. No other pages depend on them.
4. **Delete old files** — Remove the replaced hooks, providers, and components listed in the "Files Replaced" table.

### Existing Recordings

Existing recordings (created with the old architecture) are unaffected. They have the same `recordingMode: "live"` in the database and the same file format in Azure Blob. The post-recording workflow (`convertRecordingIntoAiInsights`) does not change.

### Database Schema

No schema changes required. The new architecture writes to the same `recordings` table with the same fields. The `recordingMode: "live"` value is preserved.
