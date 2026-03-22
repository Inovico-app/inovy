# Microphone Device Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a microphone device selector to the recording session UI so users can see and choose which microphone is used before recording starts.

**Architecture:** The `deviceId` is passed at `start()` time (not config-time) to avoid conflicting with the immutable-config pattern in `use-recording-session.ts`. A shared `DeviceSettingsPopover` component is rendered on both desktop and mobile. The existing `useAudioDevices` hook provides device enumeration; selection state lives in the `RecordingSession` component.

**Tech Stack:** React 19, Next.js 16, Shadcn UI (Popover, Select, Tooltip, Skeleton), Tailwind CSS 4, neverthrow, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-22-microphone-device-selector-design.md`

---

## File Structure

| File                                                                               | Action | Responsibility                                                      |
| ---------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| `src/features/recordings/core/services/audio-capture/audio-capture.interface.ts`   | Modify | Add `AudioCaptureInitConfig` type, update `initialize()` signature  |
| `src/features/recordings/core/services/audio-capture/microphone-capture.ts`        | Modify | Accept `deviceId` in `initialize()`, pass to `getUserMedia`         |
| `src/features/recordings/core/services/audio-capture/system-audio-capture.ts`      | Modify | Accept new `initialize()` signature, ignore `deviceId`              |
| `src/features/recordings/core/services/audio-capture/combined-capture.ts`          | Modify | Thread `deviceId` to internal `MicrophoneCaptureService`            |
| `src/features/recordings/core/recording-session.ts`                                | Modify | Accept `deviceId` in `start()`, pass to `audioCapture.initialize()` |
| `src/features/recordings/hooks/use-recording-session.ts`                           | Modify | Update `start()` wrapper to accept and forward `deviceId`           |
| `src/features/recordings/components/recording-session/device-settings-popover.tsx` | Create | Gear icon + popover with device dropdown                            |
| `src/features/recordings/components/recording-session/recording-session.tsx`       | Modify | Add device state, wire `DeviceSettingsPopover` to desktop views     |
| `src/features/recordings/components/recording-session/mobile-recording-view.tsx`   | Modify | Add device props, render `DeviceSettingsPopover` in bottom bar      |

---

### Task 1: Update `AudioCaptureService` interface

**Files:**

- Modify: `src/features/recordings/core/services/audio-capture/audio-capture.interface.ts`

- [ ] **Step 1: Add `AudioCaptureInitConfig` and update `initialize()` signature**

```typescript
// Add above the interface:
export interface AudioCaptureInitConfig {
  deviceId?: string;
}

// Change initialize() from:
//   initialize(): ResultAsync<void, CaptureError>;
// To:
//   initialize(config?: AudioCaptureInitConfig): ResultAsync<void, CaptureError>;
```

The full file should read:

```typescript
import type { ResultAsync } from "neverthrow";

import type { CaptureError } from "../../recording-session.errors";
import type { AudioChunk, Unsubscribe } from "../../recording-session.types";

export interface AudioCaptureInitConfig {
  deviceId?: string;
}

export interface AudioCaptureService {
  initialize(config?: AudioCaptureInitConfig): ResultAsync<void, CaptureError>;
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

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck 2>&1 | head -30`

Expected: Type errors in `microphone-capture.ts`, `system-audio-capture.ts`, `combined-capture.ts` because their `initialize()` signatures don't match yet. This is expected — we fix them in Tasks 2-4.

- [ ] **Step 3: Commit**

```bash
git add src/features/recordings/core/services/audio-capture/audio-capture.interface.ts
git commit -m "feat(recording): add AudioCaptureInitConfig to AudioCaptureService interface"
```

---

### Task 2: Update `MicrophoneCaptureService` to accept `deviceId`

**Files:**

- Modify: `src/features/recordings/core/services/audio-capture/microphone-capture.ts`

- [ ] **Step 1: Update `initialize()` signature and `doInitialize()` to use `deviceId`**

In `microphone-capture.ts`, make these changes:

1. Add import for the config type at the top (with the other imports from the interface file):

```typescript
import type {
  AudioCaptureService,
  AudioCaptureInitConfig,
} from "./audio-capture.interface";
```

2. Change `initialize()` method (around line 72):

```typescript
// From:
initialize(): ResultAsync<void, CaptureError> {
  return ResultAsync.fromPromise(this.doInitialize(), (error) =>
// To:
initialize(config?: AudioCaptureInitConfig): ResultAsync<void, CaptureError> {
  return ResultAsync.fromPromise(this.doInitialize(config?.deviceId), (error) =>
```

3. Change `doInitialize()` method (around line 82):

```typescript
// From:
private async doInitialize(): Promise<void> {
// To:
private async doInitialize(deviceId?: string): Promise<void> {
```

4. Update the `getUserMedia` call (around line 87). Replace:

```typescript
const rawStream = await navigator.mediaDevices.getUserMedia({
  audio: {
    noiseSuppression: true,
    echoCancellation: true,
  },
});
```

With:

```typescript
const audioConstraints: MediaTrackConstraints = {
  noiseSuppression: true,
  echoCancellation: true,
};

// Only set deviceId constraint if a specific device was selected
// Empty string or "default" means use system default
if (deviceId && deviceId !== "default") {
  audioConstraints.deviceId = { exact: deviceId };
}

const rawStream = await navigator.mediaDevices.getUserMedia({
  audio: audioConstraints,
});
```

- [ ] **Step 2: Verify no type errors in this file**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck 2>&1 | grep -i "microphone-capture" | head -10`

Expected: No errors for `microphone-capture.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/features/recordings/core/services/audio-capture/microphone-capture.ts
git commit -m "feat(recording): accept deviceId in MicrophoneCaptureService.initialize()"
```

---

### Task 3: Update `SystemAudioCaptureService` to accept new signature

**Files:**

- Modify: `src/features/recordings/core/services/audio-capture/system-audio-capture.ts`

- [ ] **Step 1: Update `initialize()` to accept (and ignore) the config parameter**

1. Add import for the config type:

```typescript
import type {
  AudioCaptureService,
  AudioCaptureInitConfig,
} from "./audio-capture.interface";
```

2. Update the `initialize()` method signature. Find:

```typescript
  initialize(): ResultAsync<void, CaptureError> {
```

Replace with:

```typescript
  // deviceId is ignored — system audio uses getDisplayMedia, not getUserMedia
  initialize(_config?: AudioCaptureInitConfig): ResultAsync<void, CaptureError> {
```

No other changes needed — the internal `doInitialize()` is unchanged.

- [ ] **Step 2: Verify no type errors in this file**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck 2>&1 | grep -i "system-audio-capture" | head -10`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/recordings/core/services/audio-capture/system-audio-capture.ts
git commit -m "feat(recording): update SystemAudioCaptureService to accept AudioCaptureInitConfig"
```

---

### Task 4: Update `CombinedCaptureService` to thread `deviceId`

**Files:**

- Modify: `src/features/recordings/core/services/audio-capture/combined-capture.ts`

- [ ] **Step 1: Update `initialize()` to accept and forward `deviceId` to mic sub-service**

1. Add import for the config type:

```typescript
import type {
  AudioCaptureService,
  AudioCaptureInitConfig,
} from "./audio-capture.interface";
```

2. Update `initialize()` method signature (around line 69). From:

```typescript
  initialize(): ResultAsync<void, CaptureError> {
    return ResultAsync.fromPromise(this.doInitialize(), (error) =>
```

To:

```typescript
  initialize(config?: AudioCaptureInitConfig): ResultAsync<void, CaptureError> {
    return ResultAsync.fromPromise(this.doInitialize(config), (error) =>
```

3. Update `doInitialize()` (around line 79). From:

```typescript
  private async doInitialize(): Promise<void> {
    this.releaseResources();

    // 1. Initialize microphone first (required)
    const micResult = await this.micService.initialize();
```

To:

```typescript
  private async doInitialize(config?: AudioCaptureInitConfig): Promise<void> {
    this.releaseResources();

    // 1. Initialize microphone first (required) — thread deviceId through
    const micResult = await this.micService.initialize(config);
```

Also update the `systemService.initialize()` call (around line 92) for consistency:

```typescript
// From:
const systemResult = await this.systemService.initialize();
// To:
const systemResult = await this.systemService.initialize(config);
```

The system service ignores `deviceId` internally, but passing the config through keeps the call site consistent with the interface contract.

- [ ] **Step 2: Verify all three capture services have no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck 2>&1 | grep -E "(microphone|system-audio|combined)-capture" | head -10`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/recordings/core/services/audio-capture/combined-capture.ts
git commit -m "feat(recording): thread deviceId through CombinedCaptureService to mic sub-service"
```

---

### Task 5: Update `RecordingSession.start()` to accept `deviceId`

**Files:**

- Modify: `src/features/recordings/core/recording-session.ts`

- [ ] **Step 1: Update `start()` to accept and forward `deviceId`**

In `recording-session.ts`, find the `start()` method (around line 111):

```typescript
  async start(): Promise<void> {
```

Replace with:

```typescript
  async start(deviceId?: string): Promise<void> {
```

Then find the `initialize()` call inside `start()` (around line 127):

```typescript
const initResult = await this.deps.audioCapture.initialize();
```

Replace with:

```typescript
const initResult = await this.deps.audioCapture.initialize({ deviceId });
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck 2>&1 | grep -i "recording-session" | head -10`

Expected: No errors in `recording-session.ts`. There may be a type mismatch in `use-recording-session.ts` because `start` wrapper doesn't pass the arg yet — that's Task 6.

- [ ] **Step 3: Commit**

```bash
git add src/features/recordings/core/recording-session.ts
git commit -m "feat(recording): accept deviceId in RecordingSession.start()"
```

---

### Task 6: Update `useRecordingSession` hook to forward `deviceId`

**Files:**

- Modify: `src/features/recordings/hooks/use-recording-session.ts`

- [ ] **Step 1: Update `UseRecordingSessionReturn.start` type and `start` callback**

1. Update the `start` type in `UseRecordingSessionReturn` (around line 38). From:

```typescript
start: () => Promise<void>;
```

To:

```typescript
start: (deviceId?: string) => Promise<void>;
```

2. Update the `start` callback (around line 146). From:

```typescript
const start = useCallback(async () => {
  const session = sessionRef.current;
  if (!session) return;

  await session.start();
}, []);
```

To:

```typescript
const start = useCallback(async (deviceId?: string) => {
  const session = sessionRef.current;
  if (!session) return;

  await session.start(deviceId);
}, []);
```

- [ ] **Step 2: Verify full typecheck passes**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck 2>&1 | tail -5`

Expected: Clean pass — all capture services, recording session, and hook now align.

- [ ] **Step 3: Commit**

```bash
git add src/features/recordings/hooks/use-recording-session.ts
git commit -m "feat(recording): forward deviceId through useRecordingSession.start()"
```

---

### Task 7: Create `DeviceSettingsPopover` component

**Files:**

- Create: `src/features/recordings/components/recording-session/device-settings-popover.tsx`

- [ ] **Step 1: Create the component file**

```typescript
"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import type { AudioInputDevice } from "@/features/recordings/hooks/use-audio-devices";
import { Lock, Mic, RotateCcw, Settings2 } from "lucide-react";
import { useState } from "react";

interface DeviceSettingsPopoverProps {
  devices: AudioInputDevice[];
  selectedDeviceId: string | null;
  onDeviceChange: (deviceId: string) => void;
  isDisabled: boolean;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function DeviceSettingsPopover({
  devices,
  selectedDeviceId,
  onDeviceChange,
  isDisabled,
  isLoading,
  error,
  onRetry,
}: DeviceSettingsPopoverProps) {
  const [open, setOpen] = useState(false);

  // Don't render if browser doesn't support enumerateDevices
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.enumerateDevices
  ) {
    return null;
  }

  const selectedDevice = devices.find(
    (d) => d.deviceId === selectedDeviceId,
  );
  const displayLabel =
    selectedDevice?.label ?? "Standaard microfoon";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full"
              aria-label="Microfooninstellingen"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Microfooninstellingen</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        className="w-72"
        role="dialog"
        aria-labelledby="device-popover-heading"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-muted-foreground" />
            <h4
              id="device-popover-heading"
              className="text-sm font-semibold leading-none"
            >
              Microfoon
            </h4>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          ) : error ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">
                Geen microfoons gevonden
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                Opnieuw proberen
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label
                  htmlFor="mic-device-select"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Selecteer microfoon
                </label>
                <Select
                  value={selectedDeviceId ?? undefined}
                  onValueChange={onDeviceChange}
                  disabled={isDisabled}
                >
                  <SelectTrigger
                    id="mic-device-select"
                    className={`w-full ${isDisabled ? "pointer-events-none" : ""}`}
                    aria-disabled={isDisabled || undefined}
                    aria-describedby={
                      isDisabled ? "device-disabled-hint" : undefined
                    }
                  >
                  <SelectValue placeholder="Standaard microfoon">
                    <span className="truncate">{displayLabel}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem
                      key={device.deviceId}
                      value={device.deviceId}
                    >
                      <span className="truncate">{device.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>

              {isDisabled && (
                <p
                  id="device-disabled-hint"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Lock className="h-3 w-3 shrink-0" />
                  <span>
                    Wissel van microfoon door de opname te stoppen
                  </span>
                </p>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck 2>&1 | grep -i "device-settings" | head -10`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/recordings/components/recording-session/device-settings-popover.tsx
git commit -m "feat(recording): create DeviceSettingsPopover component"
```

---

### Task 8: Wire `DeviceSettingsPopover` into desktop `RecordingSession`

**Files:**

- Modify: `src/features/recordings/components/recording-session/recording-session.tsx`

- [ ] **Step 1: Add device state and imports**

1. Update the React import (line 16) to include `useState`:

```typescript
// From:
import { useEffect, useRef } from "react";
// To:
import { useEffect, useRef, useState } from "react";
```

2. Add new imports at the top of the file:

```typescript
import { useAudioDevices } from "@/features/recordings/hooks/use-audio-devices";
import { DeviceSettingsPopover } from "./device-settings-popover";
```

3. Inside the `RecordingSession` component (after `const session = useRecordingSession(config);` on line 44), add:

```typescript
const {
  devices: audioDevices,
  isLoading: isLoadingDevices,
  error: devicesError,
  refreshDevices,
} = useAudioDevices();
const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
```

- [ ] **Step 2: Update the autoStart `session.start()` call to pass `selectedDeviceId`**

Find the autoStart effect (around line 62):

```typescript
      session.start().catch((err) => {
```

Replace with:

```typescript
      // selectedDeviceId is intentionally captured at mount time (will be null).
      // autoStart fires immediately — the user hasn't had time to pick a device,
      // so we fall back to the system default mic. This is the desired behavior.
      session.start(selectedDeviceId ?? undefined).catch((err) => {
```

- [ ] **Step 3: Fix the idle/initializing early-return to only apply to `initializing`**

The current early-return block (around line 123) gates on `session.status === "idle" || session.status === "initializing"`, which prevents the main panel (with `RecordingControls` and start button) from rendering in idle state. Change the condition so only `initializing` early-returns with a spinner:

```typescript
  // From:
  if (session.status === "idle" || session.status === "initializing") {
  // To:
  if (session.status === "initializing") {
```

This allows the main desktop panel to render in `idle` state, so users see `RecordingControls` with the start button AND the `DeviceSettingsPopover`. The initializing state still shows the spinner + navigation guard.

- [ ] **Step 4: Ensure the desktop panel is visible on mobile in idle state**

The desktop panel is wrapped in `<div className="hidden md:block">` (around line 180). In idle state, the `MobileRecordingView` overlay has no idle controls, so mobile users would see nothing. Add a mobile-visible idle state section BEFORE the `MobileRecordingView`:

```typescript
      {/* Idle state: visible on all viewports (mobile overlay has no idle state) */}
      {session.status === "idle" && (
        <div className="flex flex-col items-center gap-6 justify-center min-h-[calc(100vh-12rem)] md:hidden">
          <RecordingControls
            status={session.status}
            duration={session.duration}
            errorIsRecoverable={session.error?.recoverable ?? false}
            autoStarting={false}
            onStart={() => void session.start(selectedDeviceId ?? undefined)}
            onPause={session.pause}
            onResume={session.resume}
            onStop={() => void session.stop()}
            onSavePartial={() => void session.savePartial()}
            onReset={() => {
              session.reset();
              onDiscard?.();
            }}
          />
          <DeviceSettingsPopover
            devices={audioDevices}
            selectedDeviceId={selectedDeviceId}
            onDeviceChange={setSelectedDeviceId}
            isDisabled={false}
            isLoading={isLoadingDevices}
            error={devicesError}
            onRetry={refreshDevices}
          />
        </div>
      )}

      {/* Mobile: Google Meet-style immersive overlay */}
      <MobileRecordingView
```

This replaces the existing `{/* Mobile: Google Meet-style immersive overlay */}` comment line — the `MobileRecordingView` render follows immediately after.

- [ ] **Step 5: Add `DeviceSettingsPopover` to the desktop status bar (active recording)**

Find the status bar section in the main desktop layout (the `isActiveRecording && (` block). Add the popover inside the status bar flex container, alongside `AudioSourceIndicator` and `ChunkUploadStatus`:

```typescript
                {isActiveRecording && (
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
                    <AudioSourceIndicator
                      audioSource={config.audioSource}
                      status={session.status}
                    />
                    <DeviceSettingsPopover
                      devices={audioDevices}
                      selectedDeviceId={selectedDeviceId}
                      onDeviceChange={setSelectedDeviceId}
                      isDisabled={true}
                      isLoading={isLoadingDevices}
                      error={devicesError}
                      onRetry={refreshDevices}
                    />
                    <ChunkUploadStatus manifest={session.chunkManifest} />
                  </div>
                )}
```

- [ ] **Step 6: Add the popover to the desktop `RecordingControls` area when idle**

Find the `RecordingControls` rendering (around line 232). Add the popover near the controls div when status is idle (before recording starts). Wrap the controls and popover together:

```typescript
                <div className="flex flex-col items-center gap-6 flex-1 justify-center">
                  <RecordingControls
                    status={session.status}
                    duration={session.duration}
                    errorIsRecoverable={session.error?.recoverable ?? false}
                    autoStarting={false}
                    onStart={() => void session.start(selectedDeviceId ?? undefined)}
                    onPause={session.pause}
                    onResume={session.resume}
                    onStop={() => void session.stop()}
                    onSavePartial={() => void session.savePartial()}
                    onReset={() => {
                      session.reset();
                      onDiscard?.();
                    }}
                  />
                  {session.status === "idle" && (
                    <DeviceSettingsPopover
                      devices={audioDevices}
                      selectedDeviceId={selectedDeviceId}
                      onDeviceChange={setSelectedDeviceId}
                      isDisabled={false}
                      isLoading={isLoadingDevices}
                      error={devicesError}
                      onRetry={refreshDevices}
                    />
                  )}
                </div>
```

Note: The `onStart` prop is changed from `session.start` to `() => void session.start(selectedDeviceId ?? undefined)` to pass the selected device ID.

- [ ] **Step 7: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck 2>&1 | tail -10`

Expected: Clean pass.

- [ ] **Step 8: Commit**

```bash
git add src/features/recordings/components/recording-session/recording-session.tsx
git commit -m "feat(recording): wire DeviceSettingsPopover into desktop recording session"
```

---

### Task 9: Wire `DeviceSettingsPopover` into `MobileRecordingView`

**Files:**

- Modify: `src/features/recordings/components/recording-session/mobile-recording-view.tsx`
- Modify: `src/features/recordings/components/recording-session/recording-session.tsx` (pass new props)

- [ ] **Step 1: Add device props to `MobileRecordingViewProps`**

In `mobile-recording-view.tsx`, add the import:

```typescript
import type { AudioInputDevice } from "@/features/recordings/hooks/use-audio-devices";
import { DeviceSettingsPopover } from "./device-settings-popover";
```

Update the `MobileRecordingViewProps` interface (around line 28). Add these props:

```typescript
  devices: AudioInputDevice[];
  selectedDeviceId: string | null;
  onDeviceChange: (deviceId: string) => void;
  isDeviceSelectionDisabled: boolean;
  isLoadingDevices: boolean;
  devicesError: Error | null;
  onRetryDevices: () => void;
```

Destructure them in the component function params.

- [ ] **Step 2: Render `DeviceSettingsPopover` in the mobile bottom control bar**

Find the bottom control bar (around line 207, `{/* ── Bottom control bar ── */}`). Inside the `isActive` controls block (around line 209), add the popover button to the left of the existing buttons:

```typescript
        {isActive && (
          <div className="flex items-center justify-center gap-5">
            <DeviceSettingsPopover
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onDeviceChange={onDeviceChange}
              isDisabled={isDeviceSelectionDisabled}
              isLoading={isLoadingDevices}
              error={devicesError}
              onRetry={onRetryDevices}
            />
            {isRecording ? (
```

- [ ] **Step 3: Pass device props from `RecordingSession` to `MobileRecordingView`**

In `recording-session.tsx`, find the `<MobileRecordingView` render (around line 161). Add the new props:

```typescript
      <MobileRecordingView
        status={session.status}
        duration={session.duration}
        transcription={session.transcription}
        liveTranscriptionEnabled={config.liveTranscriptionEnabled}
        audioSource={config.audioSource}
        chunkManifest={session.chunkManifest}
        error={session.error}
        onPause={session.pause}
        onResume={session.resume}
        onStop={() => void session.stop()}
        onSavePartial={() => void session.savePartial()}
        onReset={() => {
          session.reset();
          onDiscard?.();
        }}
        devices={audioDevices}
        selectedDeviceId={selectedDeviceId}
        onDeviceChange={setSelectedDeviceId}
        isDeviceSelectionDisabled={session.status === "recording" || session.status === "paused"}
        isLoadingDevices={isLoadingDevices}
        devicesError={devicesError}
        onRetryDevices={refreshDevices}
      />
```

- [ ] **Step 4: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck 2>&1 | tail -10`

Expected: Clean pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/recordings/components/recording-session/mobile-recording-view.tsx src/features/recordings/components/recording-session/recording-session.tsx
git commit -m "feat(recording): wire DeviceSettingsPopover into mobile recording view"
```

---

### Task 10: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run full typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

Expected: Clean pass.

- [ ] **Step 2: Run linter**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm lint 2>&1 | tail -20`

Expected: No new warnings or errors introduced by our changes. Fix any lint issues if found.

- [ ] **Step 3: Run build**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run build 2>&1 | tail -20`

Expected: Successful build.

- [ ] **Step 4: Manual smoke test checklist**

Test these scenarios in the browser at `http://localhost:3000`:

1. Navigate to a project and start a new recording
2. Verify the gear icon appears near the start button (idle state)
3. Click the gear icon — popover opens with microphone dropdown
4. If multiple mics available, select a different one
5. Start recording — verify the dropdown becomes disabled with lock icon + message
6. Stop recording — verify normal flow
7. Test on mobile viewport (Chrome DevTools responsive mode) — verify gear icon in bottom bar
8. Test keyboard navigation: Tab to gear button, Enter to open, Tab through options, Escape to close

- [ ] **Step 5: Fix any issues found and commit**

```bash
git add -A
git commit -m "feat(recording): microphone device selector polish and fixes"
```
