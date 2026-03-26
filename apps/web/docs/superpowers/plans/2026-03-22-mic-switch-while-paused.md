# Mic Switch While Paused Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to switch microphones while the recording is paused, tearing down and rebuilding the capture pipeline with the new device.

**Architecture:** A new `reinitialize(config?)` method on `AudioCaptureService` tears down browser resources (stream, AudioContext, MediaRecorder) while preserving event listeners and chunk indexing. `RecordingSession.switchDevice()` orchestrates this, and the UI unlocks the device selector when paused.

**Tech Stack:** React 19, TypeScript, neverthrow, Web Audio API (getUserMedia, MediaRecorder, AudioContext)

**Spec:** `docs/superpowers/specs/2026-03-22-mic-switch-while-paused-design.md`

---

## File Structure

| File                                                                               | Action | Responsibility                                                               |
| ---------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| `src/features/recordings/core/services/audio-capture/audio-capture.interface.ts`   | Modify | Add `reinitialize()` to interface                                            |
| `src/features/recordings/core/services/audio-capture/microphone-capture.ts`        | Modify | Add `timeslice` field, `releaseMediaResources()`, implement `reinitialize()` |
| `src/features/recordings/core/services/audio-capture/system-audio-capture.ts`      | Modify | No-op `reinitialize()`                                                       |
| `src/features/recordings/core/services/audio-capture/combined-capture.ts`          | Modify | Add `timeslice` field, implement `reinitialize()` with mixer rebuild         |
| `src/features/recordings/core/services/audio-capture/fake-audio-capture.ts`        | Modify | Implement `reinitialize()` for tests                                         |
| `src/features/recordings/core/recording-session.ts`                                | Modify | Add `switchDevice()` method                                                  |
| `src/features/recordings/core/__tests__/recording-session.test.ts`                 | Modify | Add tests for `switchDevice()`                                               |
| `src/features/recordings/hooks/use-recording-session.ts`                           | Modify | Expose `switchDevice` and `isSwitchingDevice`                                |
| `src/features/recordings/components/recording-session/device-settings-popover.tsx` | Modify | Update hint text, add `switchError` prop                                     |
| `src/features/recordings/components/recording-session/recording-session.tsx`       | Modify | Unlock selector when paused, call `switchDevice`                             |
| `src/features/recordings/components/recording-session/mobile-recording-view.tsx`   | Modify | Update `isDeviceSelectionDisabled`                                           |

---

### Task 1: Add `reinitialize()` to `AudioCaptureService` interface

**Files:**

- Modify: `src/features/recordings/core/services/audio-capture/audio-capture.interface.ts`

- [ ] **Step 1: Add `reinitialize` to the interface**

Add after the `initialize` line:

```typescript
  reinitialize(config?: AudioCaptureInitConfig): ResultAsync<void, CaptureError>;
```

The full interface becomes:

```typescript
export interface AudioCaptureService {
  initialize(config?: AudioCaptureInitConfig): ResultAsync<void, CaptureError>;
  reinitialize(
    config?: AudioCaptureInitConfig,
  ): ResultAsync<void, CaptureError>;
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

- [ ] **Step 2: Commit**

```bash
git add src/features/recordings/core/services/audio-capture/audio-capture.interface.ts
git commit -m "feat(recording): add reinitialize() to AudioCaptureService interface"
```

---

### Task 2: Implement `reinitialize()` in `MicrophoneCaptureService`

**Files:**

- Modify: `src/features/recordings/core/services/audio-capture/microphone-capture.ts`

- [ ] **Step 1: Add `timeslice` instance field**

Add after the existing `private gain = DEFAULT_GAIN;` (line 69):

```typescript
  private timeslice = 0;
```

- [ ] **Step 2: Store `timeslice` in `start()`**

At the top of the `start(timeslice: number)` method (line 145), add:

```typescript
this.timeslice = timeslice;
```

- [ ] **Step 3: Extract `buildPipeline(deviceId)` from `doInitialize()`**

**CRITICAL:** `doInitialize()` calls `this.releaseResources()` as its first line, which destroys emitter listeners. We must NOT call `doInitialize` from `reinitialize`. Instead, extract the pipeline-building logic into a new private method.

Refactor `doInitialize` so the core pipeline logic (getUserMedia + AudioContext + GainNode) is in a separate method:

```typescript
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
```

Then update `doInitialize` to use it:

```typescript
  private async doInitialize(deviceId?: string): Promise<void> {
    this.releaseResources();
    await this.buildPipeline(deviceId);
  }
```

- [ ] **Step 4: Add `releaseMediaResources()` private method**

Add before `releaseResources()`. This releases browser resources WITHOUT destroying event listeners or resetting `active`:

```typescript
  private releaseMediaResources(): void {
    this.resources.disposeAll();
    this.recorder = null;
    this.processedStream = null;
    this.rawStream = null;
    this.audioContext = null;
    this.gainNode = null;
  }
```

- [ ] **Step 5: Implement `reinitialize()`**

Add after the `initialize()` method. Uses `buildPipeline()` (NOT `doInitialize`) to avoid destroying emitter listeners:

```typescript
  reinitialize(config?: AudioCaptureInitConfig): ResultAsync<void, CaptureError> {
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
```

- [ ] **Step 5: Verify typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck 2>&1 | tail -10`

Expected: Type errors in other implementations (they don't have `reinitialize` yet). `microphone-capture.ts` should be clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/recordings/core/services/audio-capture/microphone-capture.ts
git commit -m "feat(recording): implement reinitialize() in MicrophoneCaptureService"
```

---

### Task 3: Implement `reinitialize()` in `SystemAudioCaptureService` and `FakeAudioCaptureService`

**Files:**

- Modify: `src/features/recordings/core/services/audio-capture/system-audio-capture.ts`
- Modify: `src/features/recordings/core/services/audio-capture/fake-audio-capture.ts`

- [ ] **Step 1: Add no-op `reinitialize()` to `SystemAudioCaptureService`**

Add after the `initialize()` method:

```typescript
  // deviceId is ignored — system audio uses getDisplayMedia, not getUserMedia
  reinitialize(_config?: AudioCaptureInitConfig): ResultAsync<void, CaptureError> {
    return okAsync(undefined);
  }
```

Add `okAsync` to the neverthrow import if not already imported.

- [ ] **Step 2: Add `reinitialize()` to `FakeAudioCaptureService`**

Add after the `initialize()` method:

```typescript
  reinitialize(config?: AudioCaptureInitConfig): ResultAsync<void, CaptureError> {
    this.lastInitConfig = config;
    if (this.shouldFailInitialize && this.initializeError) {
      return errAsync(this.initializeError);
    }
    return okAsync(undefined);
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/features/recordings/core/services/audio-capture/system-audio-capture.ts src/features/recordings/core/services/audio-capture/fake-audio-capture.ts
git commit -m "feat(recording): add reinitialize() to SystemAudio and Fake capture services"
```

---

### Task 4: Implement `reinitialize()` in `CombinedCaptureService`

**Files:**

- Modify: `src/features/recordings/core/services/audio-capture/combined-capture.ts`

- [ ] **Step 1: Add `timeslice` instance field**

Add after `private micOnly = false;` (line 66):

```typescript
  private timeslice = 0;
```

- [ ] **Step 2: Store `timeslice` in `start()`**

At the top of the `start(timeslice: number)` method (line 148), add:

```typescript
this.timeslice = timeslice;
```

- [ ] **Step 3: Add `releaseMediaResources()` private method**

Add before `releaseResources()` (around line 306):

```typescript
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
```

- [ ] **Step 4: Implement `reinitialize()`**

Add after the `initialize()` method (around line 80):

```typescript
  reinitialize(config?: AudioCaptureInitConfig): ResultAsync<void, CaptureError> {
    return ResultAsync.fromPromise(
      this.doReinitialize(config),
      (error) =>
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
```

- [ ] **Step 5: Verify full typecheck passes**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck 2>&1 | tail -5`

Expected: Clean pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/recordings/core/services/audio-capture/combined-capture.ts
git commit -m "feat(recording): implement reinitialize() in CombinedCaptureService with mixer rebuild"
```

---

### Task 5: Add `switchDevice()` to `RecordingSession` with tests

**Files:**

- Modify: `src/features/recordings/core/recording-session.ts`
- Modify: `src/features/recordings/core/__tests__/recording-session.test.ts`

- [ ] **Step 1: Add test for `switchDevice` while paused**

In `recording-session.test.ts`, add inside the `describe("state transitions")` block:

```typescript
it("switches device while paused via switchDevice", async () => {
  const { session, audioCapture } = createSession();
  await session.start();
  session.pause();
  expect(session.getState().status).toBe("paused");

  await session.switchDevice("new-device-456");

  expect(audioCapture.getLastInitConfig()).toEqual({
    deviceId: "new-device-456",
  });
  expect(session.getState().status).toBe("paused");
});

it("ignores switchDevice when not paused", async () => {
  const { session, audioCapture } = createSession();
  await session.start();
  expect(session.getState().status).toBe("recording");

  await session.switchDevice("new-device-456");

  // Should still have the original config from start(), not the switch
  expect(audioCapture.getLastInitConfig()).toEqual({
    deviceId: undefined,
  });
});

it("sets warning error on switchDevice failure", async () => {
  const { session, audioCapture } = createSession();
  await session.start();
  session.pause();

  // Configure fake to fail
  audioCapture.shouldFailInitialize = true;
  audioCapture.initializeError = createCaptureError(
    "DEVICE_NOT_FOUND",
    "Device not found",
  );

  await session.switchDevice("bad-device");

  expect(session.getState().status).toBe("paused");
  expect(session.getState().error).not.toBeNull();
  expect(session.getState().error?.code).toBe("DEVICE_NOT_FOUND");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/recordings/core/__tests__/recording-session.test.ts 2>&1 | tail -10`

Expected: FAIL — `switchDevice` doesn't exist yet.

- [ ] **Step 3: Implement `switchDevice()` in `RecordingSession`**

In `recording-session.ts`, add after the `resume()` method (around line 233):

```typescript
  async switchDevice(deviceId: string): Promise<void> {
    if (this.state.status !== "paused") return;

    // Clear any previous switch error before attempting
    if (this.state.error?.severity === "warning") {
      this.setState({ error: null, errorIsRecoverable: false });
    }

    const result = await this.deps.audioCapture.reinitialize({ deviceId });

    if (result.isErr()) {
      // Non-fatal: set warning error but stay paused (no FSM transition to error state)
      this.setState({
        error: {
          ...result.error,
          severity: "warning",
          recoverable: true,
        },
        errorIsRecoverable: true,
      });
    }
  }
```

Also update `resume()` to clear any stale switch warning:

```typescript
  resume(): void {
    // Clear any switch-related warning before resuming
    if (this.state.error?.severity === "warning") {
      this.setState({ error: null, errorIsRecoverable: false });
    }

    if (!this.transition("recording")) return;

    this.deps.audioCapture.resume();
    this.startDurationTimer();
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/recordings/core/__tests__/recording-session.test.ts 2>&1 | tail -10`

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/recordings/core/recording-session.ts src/features/recordings/core/__tests__/recording-session.test.ts
git commit -m "feat(recording): add switchDevice() to RecordingSession with tests"
```

---

### Task 6: Expose `switchDevice` and `isSwitchingDevice` in `useRecordingSession`

**Files:**

- Modify: `src/features/recordings/hooks/use-recording-session.ts`

- [ ] **Step 1: Add to `UseRecordingSessionReturn` interface**

Add after `resume`:

```typescript
switchDevice: (deviceId: string) => Promise<void>;
isSwitchingDevice: boolean;
```

- [ ] **Step 2: Add state and callback**

After the existing `resume` callback (around line 165), add:

```typescript
const [isSwitchingDevice, setIsSwitchingDevice] = useState(false);

const switchDevice = useCallback(async (deviceId: string) => {
  const session = sessionRef.current;
  if (!session) return;

  setIsSwitchingDevice(true);
  try {
    await session.switchDevice(deviceId);
  } finally {
    setIsSwitchingDevice(false);
  }
}, []);
```

Add `useState` to the React import if not already there.

- [ ] **Step 3: Guard `resume` with `isSwitchingDevice`**

Update the `resume` callback to be a no-op when switching:

```typescript
const resume = useCallback(() => {
  if (isSwitchingDevice) return;
  const session = sessionRef.current;
  if (!session) return;

  session.resume();
}, [isSwitchingDevice]);
```

- [ ] **Step 4: Add to return object**

Add `switchDevice` and `isSwitchingDevice` to the return object:

```typescript
    switchDevice,
    isSwitchingDevice,
```

- [ ] **Step 5: Verify typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck 2>&1 | tail -5`

Expected: Clean pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/recordings/hooks/use-recording-session.ts
git commit -m "feat(recording): expose switchDevice and isSwitchingDevice in useRecordingSession"
```

---

### Task 7: Update `DeviceSettingsPopover` hint text and add `switchError` prop

**Files:**

- Modify: `src/features/recordings/components/recording-session/device-settings-popover.tsx`

- [ ] **Step 1: Add `switchError` prop**

Add to `DeviceSettingsPopoverProps`:

```typescript
  switchError?: Error | null;
```

Destructure in component params.

- [ ] **Step 2: Update disabled hint text**

Change the text from:

```
Wissel van microfoon door de opname te stoppen
```

To:

```
Pauzeer de opname om van microfoon te wisselen
```

- [ ] **Step 3: Add switch error display**

After the `{isDisabled && (` block (the disabled hint), add:

```typescript
              {switchError && !isDisabled && (
                <p className="text-xs text-destructive">
                  {switchError.message || "Kon niet wisselen van microfoon"}
                </p>
              )}
```

- [ ] **Step 4: Verify typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck 2>&1 | tail -5`

Expected: Clean pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/recordings/components/recording-session/device-settings-popover.tsx
git commit -m "feat(recording): update DeviceSettingsPopover for mic-switch-while-paused"
```

---

### Task 8: Wire mic switching into `RecordingSession` and `MobileRecordingView`

**Files:**

- Modify: `src/features/recordings/components/recording-session/recording-session.tsx`
- Modify: `src/features/recordings/components/recording-session/mobile-recording-view.tsx`

- [ ] **Step 1: Update `isDeviceSelectionDisabled` logic in `recording-session.tsx`**

Find all places where `isDeviceSelectionDisabled` or `isDisabled={true}` is computed for the device selector. Change the logic:

For the `MobileRecordingView` props (around line 217-218), change:

```typescript
        isDeviceSelectionDisabled={
          session.status === "recording" || session.status === "paused"
        }
```

To:

```typescript
        isDeviceSelectionDisabled={
          session.status === "recording" || session.isSwitchingDevice
        }
```

For the desktop active-recording status bar `DeviceSettingsPopover` (around line 324), change `isDisabled={true}` to:

```typescript
                      isDisabled={session.status === "recording" || session.isSwitchingDevice}
```

- [ ] **Step 2: Add `onDeviceChange` handler that calls `switchDevice` when paused**

Replace the simple `setSelectedDeviceId` calls with a handler that also triggers the device switch when paused. Add this function inside the `RecordingSession` component, after the state declarations:

```typescript
const handleDeviceChange = useCallback(
  (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (session.status === "paused") {
      void session.switchDevice(deviceId);
    }
  },
  [session],
);
```

Add `useCallback` to the React import if not already there.

Then replace all `onDeviceChange={setSelectedDeviceId}` with `onDeviceChange={handleDeviceChange}` in:

- The mobile idle panel `DeviceSettingsPopover`
- The `MobileRecordingView` props (`onDeviceChange`)
- The desktop idle `DeviceSettingsPopover`
- The desktop active-recording `DeviceSettingsPopover`

- [ ] **Step 3: Pass `switchError` and `isSwitchingDevice` loading state to popovers**

For each `DeviceSettingsPopover` instance, add:

```typescript
  switchError={session.status === "paused" ? session.error : null}
  isLoading={isLoadingDevices || session.isSwitchingDevice}
```

The `isLoading` change means the popover shows a loading skeleton during device switch. The `switchError` is only passed when paused (during recording, errors are shown differently).

- [ ] **Step 4: Pass additional props to `MobileRecordingView`**

Add two new props to `MobileRecordingViewProps` interface in `mobile-recording-view.tsx`:

```typescript
isSwitchingDevice: boolean;
switchError: Error | null;
```

Destructure them in the component function params.

Pass them from `recording-session.tsx` in the `<MobileRecordingView` render:

```typescript
  isSwitchingDevice={session.isSwitchingDevice}
  switchError={session.status === "paused" ? session.error : null}
```

In `mobile-recording-view.tsx`, update the `DeviceSettingsPopover` render in the bottom control bar to use these:

```typescript
  <DeviceSettingsPopover
    devices={devices}
    selectedDeviceId={selectedDeviceId}
    onDeviceChange={onDeviceChange}
    isDisabled={isDeviceSelectionDisabled}
    isLoading={isLoadingDevices || isSwitchingDevice}
    error={devicesError}
    onRetry={onRetryDevices}
    switchError={switchError}
  />
```

- [ ] **Step 5: Verify typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck 2>&1 | tail -10`

Expected: Clean pass.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run src/features/recordings/core/__tests__/recording-session.test.ts 2>&1 | tail -10`

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/recordings/components/recording-session/recording-session.tsx src/features/recordings/components/recording-session/mobile-recording-view.tsx
git commit -m "feat(recording): wire mic-switch-while-paused into desktop and mobile views"
```

---

### Task 9: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run full typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

Expected: Clean pass.

- [ ] **Step 2: Run all tests**

Run: `npx vitest run src/features/recordings/core/__tests__/recording-session.test.ts`

Expected: All tests pass (including the 3 new switchDevice tests).

- [ ] **Step 3: Run linter**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm lint 2>&1 | tail -20`

Expected: No new warnings.

- [ ] **Step 4: Manual smoke test checklist**

1. Start a recording, pause it
2. Open the device selector — verify it's interactive (not locked)
3. Select a different microphone — verify loading spinner appears briefly
4. Resume recording — verify audio continues from the new mic
5. While recording (not paused) — verify selector is locked with "Pauzeer de opname om van microfoon te wisselen"
6. Test on mobile: pause, switch mic, resume
7. Test error: pause, select a device that doesn't exist (simulate by unplugging) — verify error shows in popover
