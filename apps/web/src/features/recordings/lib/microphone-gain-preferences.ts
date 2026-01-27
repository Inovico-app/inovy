/**
 * LocalStorage key for storing microphone gain preference
 */
const MICROPHONE_GAIN_STORAGE_KEY = "microphone_gain_preference";

/**
 * Default gain value (1.0 = no amplification)
 */
const DEFAULT_GAIN = 1.0;

/**
 * Minimum gain value
 */
const MIN_GAIN = 0.0;

/**
 * Maximum gain value
 */
const MAX_GAIN = 3.0;

/**
 * Get the microphone gain preference from localStorage (client-side)
 * Returns default 1.0 if not set or on error
 */
export function getMicrophoneGainPreferenceClient(): number {
  if (typeof window === "undefined") {
    return DEFAULT_GAIN;
  }

  try {
    const stored = localStorage.getItem(MICROPHONE_GAIN_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_GAIN;
    }

    const gain = parseFloat(stored);
    // Validate gain is within range
    if (isNaN(gain) || gain < MIN_GAIN || gain > MAX_GAIN) {
      return DEFAULT_GAIN;
    }

    return gain;
  } catch (error) {
    console.error("Failed to read microphone gain preference:", error);
    return DEFAULT_GAIN;
  }
}

/**
 * Set the microphone gain preference in localStorage (client-side)
 * @param gain - The gain value to store (0.0 to 3.0)
 */
export function setMicrophoneGainPreferenceClient(gain: number): void {
  if (typeof window === "undefined") {
    return;
  }

  // Validate gain is a finite number
  if (!Number.isFinite(gain)) {
    console.warn(
      `Invalid gain value ${gain}. Using default gain ${MIN_GAIN}.`
    );
    gain = MIN_GAIN;
  }

  // Clamp gain to valid range
  let clampedGain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, gain));
  if (clampedGain !== gain) {
    console.warn(
      `Gain value ${gain} is out of range. Clamping to [${MIN_GAIN}, ${MAX_GAIN}]`
    );
  }

  try {
    localStorage.setItem(MICROPHONE_GAIN_STORAGE_KEY, clampedGain.toString());
  } catch (error) {
    console.error("Failed to set microphone gain preference:", error);
    // Don't throw - localStorage might be disabled or quota exceeded
  }
}

