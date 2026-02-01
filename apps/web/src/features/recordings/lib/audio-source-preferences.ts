import type { AudioSourceType } from "./system-audio-detection";

/**
 * LocalStorage key for storing audio source preference
 */
const AUDIO_SOURCE_STORAGE_KEY = "audio_source_preference";

/**
 * Default audio source preference
 */
export const DEFAULT_AUDIO_SOURCE: AudioSourceType = "microphone";

/**
 * Module-level cache for localStorage reads
 * Prevents repeated parsing of the same value
 */
let audioSourcePreferenceCache: {
  value: AudioSourceType;
  timestamp: number;
} | null = null;

const CACHE_DURATION_MS = 1000; // 1 second cache

/**
 * Get the audio source preference from localStorage (client-side)
 * Returns default "microphone" if not set or on error
 */
export function getAudioSourcePreferenceClient(): AudioSourceType {
  if (typeof window === "undefined") {
    return DEFAULT_AUDIO_SOURCE;
  }

  // Check cache first
  if (
    audioSourcePreferenceCache &&
    Date.now() - audioSourcePreferenceCache.timestamp < CACHE_DURATION_MS
  ) {
    return audioSourcePreferenceCache.value;
  }

  try {
    const stored = localStorage.getItem(AUDIO_SOURCE_STORAGE_KEY);
    if (!stored) {
      audioSourcePreferenceCache = {
        value: DEFAULT_AUDIO_SOURCE,
        timestamp: Date.now(),
      };
      return DEFAULT_AUDIO_SOURCE;
    }

    // Validate that stored value is a valid audio source type
    if (
      stored === "microphone" ||
      stored === "system" ||
      stored === "both"
    ) {
      audioSourcePreferenceCache = {
        value: stored as AudioSourceType,
        timestamp: Date.now(),
      };
      return stored as AudioSourceType;
    }

    // Invalid value, return default
    audioSourcePreferenceCache = {
      value: DEFAULT_AUDIO_SOURCE,
      timestamp: Date.now(),
    };
    return DEFAULT_AUDIO_SOURCE;
  } catch (error) {
    console.error("Failed to read audio source preference:", error);
    return DEFAULT_AUDIO_SOURCE;
  }
}

/**
 * Set the audio source preference in localStorage (client-side)
 * @param audioSource - The audio source type to store
 */
export function setAudioSourcePreferenceClient(
  audioSource: AudioSourceType
): void {
  if (typeof window === "undefined") {
    return;
  }

  // Validate audio source type
  if (
    audioSource !== "microphone" &&
    audioSource !== "system" &&
    audioSource !== "both"
  ) {
    console.warn(
      `Invalid audio source value: ${audioSource}. Using default: ${DEFAULT_AUDIO_SOURCE}`
    );
    audioSource = DEFAULT_AUDIO_SOURCE;
  }

  // Invalidate cache
  audioSourcePreferenceCache = null;

  try {
    localStorage.setItem(AUDIO_SOURCE_STORAGE_KEY, audioSource);
  } catch (error) {
    console.error("Failed to set audio source preference:", error);
    // Don't throw - localStorage might be disabled or quota exceeded
  }
}

// Re-export AudioSourceType for convenience
export type { AudioSourceType } from "./system-audio-detection";
