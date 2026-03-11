# Codebase Cleanup & Recording Stack Improvements

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix security issues, bugs, and dead code (Phase A), then improve the recording stack by replacing manual implementations with packages and deduplicating utilities (Phase B).

**Architecture:** Single branch with phased commits. Phase A fixes bugs/security without changing behavior. Phase B replaces manual implementations (MP3 conversion, browser detection, AudioContext creation) with cleaner alternatives and removes dead code.

**Tech Stack:** Next.js 16, React 19, TypeScript, Web Audio API, Deepgram SDK, ua-parser-js (new)

---

## Phase A: Security & Bug Fixes

### Task 1: Fix audio playing at full volume during MP3 conversion

**Files:**
- Modify: `src/features/recordings/lib/audio-utils.ts:72`

The `convertBlobToMp3` function creates an `<audio>` element and calls `audio.play()` to re-record it as MP3. The audio plays audibly to the user. Must be muted.

- [ ] **Step 1: Mute the audio element before playback**

In `src/features/recordings/lib/audio-utils.ts`, after line 31 (`const audio = new Audio(audioUrl);`), add:

```typescript
audio.muted = true;
```

However, `muted = true` prevents `createMediaElementSource` from capturing audio. The correct fix is to NOT connect to `audioContext.destination` (speakers) — only connect to the `MediaStreamDestination`. The current code already does this correctly (source connects only to `destination`, not speakers), so the audio should NOT be audible.

Actually, re-reading the code: `source.connect(destination)` connects to a `MediaStreamDestination`, not `audioContext.destination`. The audio element's `play()` still routes through the default output. The fix is to disconnect the audio element's default output by capturing it through the AudioContext:

```typescript
// After creating the source, the audio element output is captured by the AudioContext
// But the audio element itself still plays through speakers.
// Fix: set volume to 0 on the audio element (NOT muted, as muted stops capture in some browsers)
audio.volume = 0;
```

- [ ] **Step 2: Verify the fix**

In `src/features/recordings/lib/audio-utils.ts`, the line after `const audio = new Audio(audioUrl);` (line 31) should read:

```typescript
const audio = new Audio(audioUrl);
audio.volume = 0;
```

- [ ] **Step 3: Commit**

```bash
git add src/features/recordings/lib/audio-utils.ts
git commit -m "fix: mute audio during MP3 conversion to prevent audible playback"
```

---

### Task 2: Delete dead code — legacy hooks with security issues

**Files:**
- Delete: `src/hooks/use-live-transcription.ts` (200 lines, exposes `NEXT_PUBLIC_DEEPGRAM_API_KEY` client-side, imported nowhere)
- Delete: `src/hooks/use-audio-recorder.ts` (175 lines, imported nowhere)

Both hooks are legacy code. The app uses `src/features/recordings/hooks/use-live-transcription.ts` via `DeepgramProvider` and `src/features/recordings/hooks/use-live-recording.ts` respectively.

- [ ] **Step 1: Verify no imports exist**

Run:
```bash
grep -r "from.*@/hooks/use-live-transcription" src/ --include="*.ts" --include="*.tsx"
grep -r "from.*@/hooks/use-audio-recorder" src/ --include="*.ts" --include="*.tsx"
```
Expected: No output for both commands.

- [ ] **Step 2: Delete the files**

```bash
rm src/hooks/use-live-transcription.ts
rm src/hooks/use-audio-recorder.ts
```

- [ ] **Step 3: Run typecheck to confirm nothing breaks**

```bash
pnpm run typecheck
```
Expected: Clean pass.

- [ ] **Step 4: Commit**

```bash
git add -u src/hooks/use-live-transcription.ts src/hooks/use-audio-recorder.ts
git commit -m "fix: remove dead legacy hooks (security: exposed API key in use-live-transcription)"
```

---

### Task 3: Remove unused `@tanstack/react-form` dependency

**Files:**
- Modify: `package.json`

`@tanstack/react-form` is listed as a dependency but has zero imports across the codebase. The project uses `react-hook-form` exclusively.

- [ ] **Step 1: Remove the package**

```bash
pnpm remove @tanstack/react-form
```

- [ ] **Step 2: Verify typecheck still passes**

```bash
pnpm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: remove unused @tanstack/react-form dependency"
```

---

### Task 4: Replace `console.log/error/warn` with `logger` in recording-related files

**Files:**
- Modify: `src/providers/microphone/audio-mixer.ts:57,126`
- Modify: `src/providers/microphone/microphone-audio-processor.ts:86`
- Modify: `src/providers/microphone/MicrophoneProvider.tsx` (7 instances)
- Modify: `src/providers/system-audio/SystemAudioProvider.tsx` (10 instances)

These files use raw `console.warn/error` instead of the project's `logger` from `@/lib/logger`. The logger provides structured logging with Pino on server and formatted console output on client.

- [ ] **Step 1: Update `audio-mixer.ts`**

Add import: `import { logger } from "@/lib/logger";`

Replace line 57: `console.warn("Failed to create audio source from stream:", error);`
With: `logger.warn("Failed to create audio source from stream", { component: "audio-mixer", error: error instanceof Error ? error : new Error(String(error)) });`

Replace line 126: `refs.audioContext.close().catch(console.error);`
With: `refs.audioContext.close().catch((err) => logger.error("Failed to close audio context", { component: "audio-mixer", error: err instanceof Error ? err : new Error(String(err)) }));`

- [ ] **Step 2: Update `microphone-audio-processor.ts`**

Add import: `import { logger } from "@/lib/logger";`

Replace line 86: `refs.audioContext.close().catch(console.error);`
With: `refs.audioContext.close().catch((err) => logger.error("Failed to close audio context", { component: "microphone-audio-processor", error: err instanceof Error ? err : new Error(String(err)) }));`

- [ ] **Step 3: Update `MicrophoneProvider.tsx` and `SystemAudioProvider.tsx`**

For each file, replace all `console.log`, `console.error`, `console.warn` calls with equivalent `logger.info`, `logger.error`, `logger.warn` calls respectively. Ensure each call includes `{ component: "MicrophoneProvider" }` or `{ component: "SystemAudioProvider" }` context.

- [ ] **Step 4: Run typecheck**

```bash
pnpm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/providers/microphone/ src/providers/system-audio/
git commit -m "fix: replace console.log/error/warn with structured logger in audio providers"
```

---

## Phase B: Recording Stack Improvements

### Task 5: Extract shared `createAudioContext` utility

**Files:**
- Create: `src/lib/audio/create-audio-context.ts`
- Modify: `src/providers/microphone/microphone-audio-processor.ts:16-29`
- Modify: `src/providers/microphone/audio-mixer.ts:16-29`
- Modify: `src/components/ui/live-waveform.tsx:223-227`

The `getAudioContextConstructor()` function is duplicated in 3 files (identical 14-line function). Extract to shared utility.

- [ ] **Step 1: Create the shared utility**

Create `src/lib/audio/create-audio-context.ts`:

```typescript
/**
 * Get AudioContext constructor with browser compatibility
 * Handles webkitAudioContext fallback for older browsers
 * @throws Error if Web Audio API is not supported
 */
export function createAudioContext(): AudioContext {
  const AudioContextConstructor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error(
      "Web Audio API is not supported in this environment. Please use a modern browser."
    );
  }

  return new AudioContextConstructor();
}
```

- [ ] **Step 2: Update `microphone-audio-processor.ts`**

Remove the local `getAudioContextConstructor` function (lines 16-29).
Add import: `import { createAudioContext } from "@/lib/audio/create-audio-context";`
Replace line 42: `const audioContext = new AudioContextConstructor();`
With: `const audioContext = createAudioContext();`
Remove line 41: `const AudioContextConstructor = getAudioContextConstructor();`

- [ ] **Step 3: Update `audio-mixer.ts`**

Remove the local `getAudioContextConstructor` function (lines 16-29).
Add import: `import { createAudioContext } from "@/lib/audio/create-audio-context";`
Replace lines 39-40:
```typescript
const AudioContextConstructor = getAudioContextConstructor();
const audioContext = new AudioContextConstructor();
```
With: `const audioContext = createAudioContext();`

- [ ] **Step 4: Update `live-waveform.tsx`**

Add import: `import { createAudioContext } from "@/lib/audio/create-audio-context";`
Replace lines 223-227:
```typescript
const AudioContextConstructor =
  window.AudioContext ||
  (window as unknown as { webkitAudioContext: typeof AudioContext })
    .webkitAudioContext;
const audioContext = new AudioContextConstructor();
```
With: `const audioContext = createAudioContext();`

- [ ] **Step 5: Run typecheck**

```bash
pnpm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/audio/ src/providers/microphone/ src/components/ui/live-waveform.tsx
git commit -m "refactor: extract shared createAudioContext utility (DRY)"
```

---

### Task 6: Replace manual browser detection with `ua-parser-js`

**Files:**
- Modify: `src/features/recordings/lib/system-audio-detection.ts`

The current implementation has 136 lines of manual UA string parsing with regex. `ua-parser-js` (~2KB gzipped) handles edge cases and stays updated with new browser releases.

- [ ] **Step 1: Install ua-parser-js**

```bash
pnpm add ua-parser-js
pnpm add -D @types/ua-parser-js
```

- [ ] **Step 2: Rewrite system-audio-detection.ts**

Replace the entire file with:

```typescript
/**
 * Browser compatibility detection for system audio capture
 */
import UAParser from "ua-parser-js";

export interface SystemAudioCompatibility {
  isSupported: boolean;
  isAudioSupported: boolean;
  message: string;
  browserName: string;
}

const SUPPORTED_BROWSERS = new Set(["Chrome", "Edge", "Opera"]);
const UNSUPPORTED_MESSAGES: Record<string, string> = {
  Firefox:
    "Firefox does not support system audio capture. Please use Chrome, Edge, or Opera for this feature.",
  Safari:
    "Safari does not support system audio capture. Please use Chrome, Edge, or Opera for this feature.",
};

/**
 * Detect browser and check system audio capture support
 * System audio capture requires getDisplayMedia with audio support
 * Supported browsers: Chrome 74+, Edge 79+, Opera 62+
 */
export function detectSystemAudioSupport(): SystemAudioCompatibility {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      isSupported: false,
      isAudioSupported: false,
      message: "Browser environment not available",
      browserName: "Unknown",
    };
  }

  const parser = new UAParser();
  const browser = parser.getBrowser();
  const browserName = browser.name || "Unknown";

  const hasGetDisplayMedia =
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === "function";

  if (!hasGetDisplayMedia) {
    return {
      isSupported: false,
      isAudioSupported: false,
      message:
        "Screen capture API is not supported in this browser. Please use Chrome, Edge, or Opera.",
      browserName,
    };
  }

  const unsupportedMessage = UNSUPPORTED_MESSAGES[browserName];
  if (unsupportedMessage) {
    return {
      isSupported: true,
      isAudioSupported: false,
      message: unsupportedMessage,
      browserName,
    };
  }

  if (SUPPORTED_BROWSERS.has(browserName)) {
    return {
      isSupported: true,
      isAudioSupported: true,
      message: "System audio capture is supported in this browser.",
      browserName,
    };
  }

  return {
    isSupported: true,
    isAudioSupported: false,
    message:
      "System audio capture may not be supported. Please use Chrome 74+, Edge 79+, or Opera 62+.",
    browserName,
  };
}

/**
 * Check if system audio capture is currently available
 */
export async function checkSystemAudioAvailability(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) {
    return false;
  }

  if (typeof navigator.mediaDevices.getDisplayMedia !== "function") {
    return false;
  }

  const compatibility = detectSystemAudioSupport();
  return compatibility.isAudioSupported;
}
```

Note: The original file also exported `AudioSourceType`. Check if this type is imported from this file elsewhere. If so, keep it or move it to the appropriate location (it's also defined in `audio-source-preferences.ts`).

- [ ] **Step 3: Verify imports of `AudioSourceType` from this file**

```bash
grep -r "from.*system-audio-detection" src/ --include="*.ts" --include="*.tsx"
```

If `AudioSourceType` is imported from this file, ensure it's available from `audio-source-preferences.ts` instead and update imports.

- [ ] **Step 4: Run typecheck**

```bash
pnpm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/features/recordings/lib/system-audio-detection.ts package.json pnpm-lock.yaml
git commit -m "refactor: replace manual UA parsing with ua-parser-js for browser detection"
```

---

### Task 7: Fix waveform RAF memory leak and performance

**Files:**
- Modify: `src/components/ui/live-waveform.tsx:147-179` (fadeToIdle cleanup)
- Modify: `src/components/ui/live-waveform.tsx:325-326` (idle RAF spinning)

Two issues:
1. `fadeToIdle` (line 155) uses `requestAnimationFrame` recursively but has no `cancelAnimationFrame` if the component unmounts mid-fade — memory leak.
2. When `!active && !processing`, the animation loop at line 325-326 still schedules RAF frames doing nothing.

- [ ] **Step 1: Fix fadeToIdle cleanup**

In the `useEffect` starting at line 106, add a ref to track the fade animation and cancel it on cleanup. Replace the `fadeToIdle` block (lines 147-179):

```typescript
} else if (!active && !processing) {
  const hasData =
    mode === "static"
      ? staticBarsRef.current.length > 0
      : historyRef.current.length > 0;

  if (hasData) {
    let fadeProgress = 0;
    let fadeRafId: number;
    const fadeToIdle = () => {
      fadeProgress += 0.03;
      if (fadeProgress < 1) {
        if (mode === "static") {
          staticBarsRef.current = staticBarsRef.current.map(
            (value) => value * (1 - fadeProgress)
          );
        } else {
          historyRef.current = historyRef.current.map(
            (value) => value * (1 - fadeProgress)
          );
        }
        needsRedrawRef.current = true;
        fadeRafId = requestAnimationFrame(fadeToIdle);
      } else {
        if (mode === "static") {
          staticBarsRef.current = [];
        } else {
          historyRef.current = [];
        }
      }
    };
    fadeRafId = requestAnimationFrame(fadeToIdle);

    return () => {
      cancelAnimationFrame(fadeRafId);
    };
  }
}
```

- [ ] **Step 2: Stop RAF loop when idle**

In the animation loop effect (starting line 276), change lines 325-328 from:

```typescript
if (!needsRedrawRef.current && !active) {
  rafId = requestAnimationFrame(animate);
  return;
}
```

To:

```typescript
if (!needsRedrawRef.current && !active && !processing) {
  // Don't schedule another frame when completely idle
  return;
}
```

This stops the loop when there's nothing to render. The loop restarts when `active` or `processing` changes because the effect re-runs (they're in the dependency array).

- [ ] **Step 3: Run typecheck**

```bash
pnpm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/live-waveform.tsx
git commit -m "fix: waveform memory leak (fadeToIdle cleanup) and idle RAF spinning"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full typecheck**

```bash
pnpm run typecheck
```

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Note: Existing warnings are pre-existing. Verify our changes don't add new warnings.

- [ ] **Step 3: Run build**

```bash
pnpm run build
```

- [ ] **Step 4: Manual smoke test**

Start dev server and verify:
1. Recording page loads without errors
2. Waveform renders when recording starts
3. Waveform stops animating when idle (check CPU usage in DevTools)
4. No audible playback during file upload (if MP3 conversion path is triggered)
