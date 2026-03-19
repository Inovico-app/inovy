/**
 * Pure utility functions for detecting browser audio capabilities.
 *
 * These functions are safe to call from both client and server contexts
 * (they guard against missing browser APIs).
 */

// ---------------------------------------------------------------------------
// Supported MIME types for MediaRecorder
// ---------------------------------------------------------------------------

const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

// ---------------------------------------------------------------------------
// Browsers known to support getDisplayMedia with audio
// ---------------------------------------------------------------------------

const SYSTEM_AUDIO_BROWSERS = /Chrome|Chromium|Edge|Edg|Opera|OPR/i;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if the browser supports system audio capture via `getDisplayMedia`
 * with audio. Only Chromium-based browsers (Chrome, Edge, Opera) support this.
 */
export function isSystemAudioSupported(): boolean {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) {
    return false;
  }

  if (typeof navigator.mediaDevices.getDisplayMedia !== "function") {
    return false;
  }

  // Only Chromium-based browsers reliably support audio in getDisplayMedia
  const ua = navigator.userAgent;
  return SYSTEM_AUDIO_BROWSERS.test(ua);
}

/**
 * Return the list of audio MIME types supported by the current browser's
 * MediaRecorder implementation.
 */
export function getSupportedMimeTypes(): string[] {
  if (typeof MediaRecorder === "undefined") {
    return [];
  }

  return CANDIDATE_MIME_TYPES.filter((mime) =>
    MediaRecorder.isTypeSupported(mime),
  );
}
