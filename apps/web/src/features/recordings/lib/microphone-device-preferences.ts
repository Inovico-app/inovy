/**
 * LocalStorage key for storing microphone device preference
 */
const MICROPHONE_DEVICE_STORAGE_KEY = "microphone_device_preference";

/**
 * Module-level cache for localStorage reads
 * Prevents repeated parsing of the same value
 */
let devicePreferenceCache: {
  value: string | null;
  timestamp: number;
} | null = null;

const CACHE_DURATION_MS = 1000; // 1 second cache

/**
 * Get the microphone device preference from localStorage (client-side)
 * Returns null if not set or on error (null means "use default device")
 */
export function getMicrophoneDevicePreferenceClient(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  // Check cache first
  if (
    devicePreferenceCache &&
    Date.now() - devicePreferenceCache.timestamp < CACHE_DURATION_MS
  ) {
    return devicePreferenceCache.value;
  }

  try {
    const stored = localStorage.getItem(MICROPHONE_DEVICE_STORAGE_KEY);
    if (!stored) {
      devicePreferenceCache = { value: null, timestamp: Date.now() };
      return null;
    }

    // Validate that stored value is a non-empty string
    if (stored.trim() === "") {
      devicePreferenceCache = { value: null, timestamp: Date.now() };
      return null;
    }

    devicePreferenceCache = { value: stored, timestamp: Date.now() };
    return stored;
  } catch (error) {
    console.error("Failed to read microphone device preference:", error);
    return null;
  }
}

/**
 * Set the microphone device preference in localStorage (client-side)
 * @param deviceId - The device ID to store, or null for "default device"
 */
export function setMicrophoneDevicePreferenceClient(
  deviceId: string | null
): void {
  if (typeof window === "undefined") {
    return;
  }

  // Invalidate cache
  devicePreferenceCache = null;

  try {
    if (deviceId === null || deviceId.trim() === "") {
      localStorage.removeItem(MICROPHONE_DEVICE_STORAGE_KEY);
    } else {
      localStorage.setItem(MICROPHONE_DEVICE_STORAGE_KEY, deviceId);
    }
  } catch (error) {
    console.error("Failed to set microphone device preference:", error);
    // Don't throw - localStorage might be disabled or quota exceeded
  }
}
