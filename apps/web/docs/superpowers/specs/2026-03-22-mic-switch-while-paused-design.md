# Microphone Switch While Paused — Design Spec

**Linear issue:** [INO2-271](https://linear.app/inovico-tech/issue/INO2-271/feat-show-and-make-audio-output-device-selectable)
**Date:** 2026-03-22
**Status:** Approved
**Depends on:** `2026-03-22-microphone-device-selector-design.md` (already implemented)

## Problem

When recording, the microphone selector is locked. When the user stops, the recording uploads and navigates away immediately. There is no window to switch microphones and re-record if the wrong device was selected.

## Solution

Allow microphone switching while the recording is paused. The capture pipeline is torn down and rebuilt with the new device. Chunk indexing continues seamlessly. The user resumes when ready.

## Scope

- Mic switching only when `status === "paused"` (still locked during active recording)
- Instant switch on device selection (no confirmation dialog)
- On failure: stay paused with error in popover, user retries or picks another device
- No fallback to previous mic on error

## Architecture

### New Interface Method

Add `reinitialize(config?)` to `AudioCaptureService`:

```typescript
interface AudioCaptureService {
  // ...existing methods...
  reinitialize(
    config?: AudioCaptureInitConfig,
  ): ResultAsync<void, CaptureError>;
}
```

### `MicrophoneCaptureService` Changes

**New instance field:** `private timeslice = 0;` — stored when `start(timeslice)` is called, reused by `reinitialize()`.

**New private method: `releaseMediaResources()`** — releases browser resources (stream tracks, AudioContext, GainNode, MediaRecorder) WITHOUT destroying the `emitter` event listeners or resetting `active`. This preserves chunk/error subscriptions registered by `RecordingSession`. The existing `releaseResources()` (used by `stop()`) continues to do a full teardown including `emitter.removeAllListeners()`.

**`reinitialize(config?)` algorithm:**

1. Save current `chunkIndex`, `lastChunkTimestamp`, `gain`, and `timeslice`
2. Detach `ondataavailable`/`onerror` from the old MediaRecorder (prevent spurious events during teardown)
3. Stop the old MediaRecorder — call `recorder.stop()` and wait for the `stop` event. Note: stopping a paused MediaRecorder fires a final `dataavailable` with buffered data; since we detached the handler in step 2, this chunk is silently discarded (acceptable — the data is from the old mic and the recorder was paused)
4. Call `releaseMediaResources()` — releases old stream, AudioContext, GainNode, recorder. Does NOT clear emitter listeners.
5. Call `doInitialize(deviceId)` — new `getUserMedia` + new AudioContext/GainNode pipeline
6. Create a new MediaRecorder on the new `processedStream` (using the saved `timeslice` and the same mimeType selection logic)
7. Attach `ondataavailable`/`onerror` handlers to the new recorder (same logic as `start()`)
8. Call `recorder.start(timeslice)` then immediately `recorder.pause()` — the recorder is ready but paused, matching the session's paused state
9. Restore saved `chunkIndex` and `lastChunkTimestamp` (do NOT call the service's `start()` method — that would reset these values and `recordingStartTime`)

**Important:** The `active` flag should NOT be set to `false` during reinitialize. `releaseMediaResources()` skips `this.active = false` (unlike `releaseResources()`).

### `CombinedCaptureService.reinitialize()` — Full Algorithm

`CombinedCaptureService` has its own `recorder`, `chunkIndex`, `lastChunkTimestamp`, and `emitter` — separate from the mic sub-service. The mic sub-service's MediaRecorder is never started in combined mode; only the combined service's recorder runs against the mixed stream.

**Algorithm:**

1. Save current `chunkIndex`, `lastChunkTimestamp`, and `timeslice` (must also be stored as an instance field)
2. Detach `ondataavailable`/`onerror` from the combined service's own MediaRecorder
3. Stop the combined service's MediaRecorder (wait for `stop` event)
4. Dispose the current `mixResult` (AudioContext used for mixing) — but do NOT call `this.emitter.removeAllListeners()`
5. Call `this.micService.reinitialize(config)` — rebuilds mic pipeline with new device
6. Get the new mic stream via `this.micService.getStream()`
7. If NOT in `micOnly` mode: call `mixStreams(newMicStream, existingSystemStream)` to create a new mixed stream. If in `micOnly` mode: use the mic stream directly.
8. Create a new MediaRecorder on the new (mixed or mic-only) stream
9. Attach `ondataavailable`/`onerror` handlers
10. Call `recorder.start(timeslice)` then `recorder.pause()`
11. Restore `chunkIndex` and `lastChunkTimestamp`

**`micOnly` path:** When system audio failed during initial setup (`this.micOnly === true`), reinitialize only rebuilds the mic pipeline. No mixing needed — the combined service records directly from the mic stream.

### Other Implementations

| Service                     | Behavior                                                                |
| --------------------------- | ----------------------------------------------------------------------- |
| `SystemAudioCaptureService` | No-op, returns `okAsync` (system audio uses `getDisplayMedia`, not mic) |
| `FakeAudioCaptureService`   | Stores config in `lastInitConfig`, returns `okAsync`                    |

### Session Layer

**`RecordingSession.switchDevice(deviceId: string)`:**

- Guard: only when `status === "paused"`, return early otherwise
- Calls `this.deps.audioCapture.reinitialize({ deviceId })`
- Success: stays paused, no state transition
- Error: sets `state.error` with the `CaptureError` (severity: `"warning"`, recoverable: `true`). Session stays paused (no FSM transition to error state). The UI reads this error and surfaces it in the popover.

**`useRecordingSession` hook:**

- Exposes `switchDevice: (deviceId: string) => Promise<void>` in `UseRecordingSessionReturn`
- Also exposes `isSwitchingDevice: boolean` state
- `resume()` is guarded: if `isSwitchingDevice` is true, resume is a no-op (prevents resuming mid-switch)
- Callback wrapper following existing `start`/`pause`/`resume` pattern

### Concurrency Guard

`reinitialize()` is async (`getUserMedia` takes time). To prevent overlapping calls:

- The `isSwitchingDevice` flag in `useRecordingSession` disables the device selector in the UI during a switch
- This is sufficient — the UI is the only caller of `switchDevice`, and the flag prevents a second call before the first completes

### Files to Modify

| File                                                       | Change                                                                                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `core/services/audio-capture/audio-capture.interface.ts`   | Add `reinitialize()` to interface                                                                                             |
| `core/services/audio-capture/microphone-capture.ts`        | Add `timeslice` field, `releaseMediaResources()`, implement `reinitialize()`                                                  |
| `core/services/audio-capture/system-audio-capture.ts`      | No-op `reinitialize()`                                                                                                        |
| `core/services/audio-capture/combined-capture.ts`          | Add `timeslice` field, implement full `reinitialize()` with mixer rebuild                                                     |
| `core/services/audio-capture/fake-audio-capture.ts`        | Store config, return ok                                                                                                       |
| `core/recording-session.ts`                                | Add `switchDevice(deviceId)` method                                                                                           |
| `hooks/use-recording-session.ts`                           | Expose `switchDevice` and `isSwitchingDevice` in return type                                                                  |
| `components/recording-session/recording-session.tsx`       | Change `isDisabled` to `recording` only. Call `switchDevice` while paused. Pass `isSwitchingDevice` to popover's `isLoading`. |
| `components/recording-session/mobile-recording-view.tsx`   | Update `isDeviceSelectionDisabled` prop                                                                                       |
| `components/recording-session/device-settings-popover.tsx` | Update disabled hint text. Add optional `switchError` prop for switch-specific errors.                                        |

## UI Changes

- **Paused state:** device selector becomes interactive (was locked)
- **Recording state:** device selector stays locked
- **Disabled hint text:** "Pauzeer de opname om van microfoon te wisselen" (was "Wissel van microfoon door de opname te stoppen")
- **During switch:** popover shows loading state (`isLoading=true` via `isSwitchingDevice`) while `getUserMedia` + pipeline rebuild runs
- **Switch error:** `DeviceSettingsPopover` receives a new optional `switchError: Error | null` prop. When set, shows the error message below the select with a retry button. Distinct from the `error` prop (which is for enumeration errors).

## Edge Cases

| Case                                                | Handling                                                                                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Switch to same device                               | `reinitialize` runs anyway (idempotent, rebuilds pipeline). Could optimize later.                                                                    |
| Device unplugged between enum and selection         | `getUserMedia` fails with `NotFoundError` → error shown in popover, stays paused                                                                     |
| Permission denied for new device                    | `getUserMedia` fails with `NotAllowedError` → error shown in popover, stays paused                                                                   |
| User resumes before switch completes                | Guarded by `isSwitchingDevice` flag — `resume()` is a no-op during switch                                                                            |
| Multiple rapid device switches                      | Prevented by `isSwitchingDevice` flag disabling the selector during switch                                                                           |
| Combined mode: mic switch while system audio active | Full algorithm described above — mixer is rebuilt with new mic + existing system stream                                                              |
| Combined mode: `micOnly` fallback active            | Only mic pipeline rebuilt, no mixing needed                                                                                                          |
| Stopping a paused MediaRecorder                     | Fires final `dataavailable` — handler is detached first, so this chunk is silently discarded                                                         |
| Start-then-immediately-pause on new recorder        | `ondataavailable` is attached before `start()`, but any micro-chunk from the immediate pause is expected and acceptable (maintains chunk continuity) |

## Out of Scope

- Mic switching during active recording (only while paused)
- Confirmation dialog before switching
- Auto-fallback to previous mic on failure
