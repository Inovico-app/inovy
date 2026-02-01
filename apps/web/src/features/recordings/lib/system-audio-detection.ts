/**
 * Browser compatibility detection for system audio capture
 */

export type AudioSourceType = "microphone" | "system" | "both";

export interface SystemAudioCompatibility {
  isSupported: boolean;
  isAudioSupported: boolean;
  message: string;
  browserName: string;
}

/**
 * Detect browser and check system audio capture support
 * System audio capture requires getDisplayMedia with audio support
 * Supported browsers: Chrome 74+, Edge 79+, Opera 62+
 * Unsupported: Firefox, Safari
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

  // Check if getDisplayMedia is available
  const hasGetDisplayMedia =
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === "function";

  if (!hasGetDisplayMedia) {
    return {
      isSupported: false,
      isAudioSupported: false,
      message:
        "Screen capture API is not supported in this browser. Please use Chrome, Edge, or Opera.",
      browserName: detectBrowserName(),
    };
  }

  // Detect browser name for better messaging
  const browserName = detectBrowserName();

  // Check browser-specific support
  // Chrome 74+, Edge 79+, Opera 62+ support audio capture
  // Firefox and Safari do not support audio capture in getDisplayMedia
  const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
  const isEdge = /Edg/.test(navigator.userAgent);
  const isOpera = /OPR/.test(navigator.userAgent) || /Opera/.test(navigator.userAgent);
  const isFirefox = /Firefox/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  // Audio capture is supported in Chrome, Edge, and Opera
  const isAudioSupported = isChrome || isEdge || isOpera;

  if (isFirefox) {
    return {
      isSupported: true,
      isAudioSupported: false,
      message:
        "Firefox does not support system audio capture. Please use Chrome, Edge, or Opera for this feature.",
      browserName: "Firefox",
    };
  }

  if (isSafari) {
    return {
      isSupported: true,
      isAudioSupported: false,
      message:
        "Safari does not support system audio capture. Please use Chrome, Edge, or Opera for this feature.",
      browserName: "Safari",
    };
  }

  if (isAudioSupported) {
    return {
      isSupported: true,
      isAudioSupported: true,
      message: "System audio capture is supported in this browser.",
      browserName,
    };
  }

  // Unknown browser or older version
  return {
    isSupported: true,
    isAudioSupported: false,
    message:
      "System audio capture may not be supported. Please use Chrome 74+, Edge 79+, or Opera 62+.",
    browserName,
  };
}

/**
 * Detect browser name from user agent
 */
function detectBrowserName(): string {
  if (typeof navigator === "undefined") {
    return "Unknown";
  }

  const ua = navigator.userAgent;

  if (/Edg/.test(ua)) return "Edge";
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) return "Chrome";
  if (/Firefox/.test(ua)) return "Firefox";
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return "Safari";
  if (/OPR/.test(ua) || /Opera/.test(ua)) return "Opera";

  return "Unknown";
}

/**
 * Check if system audio capture is currently available
 * This performs a runtime check, not just browser detection
 */
export async function checkSystemAudioAvailability(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) {
    return false;
  }

  if (typeof navigator.mediaDevices.getDisplayMedia !== "function") {
    return false;
  }

  // We can't actually test getDisplayMedia without user interaction,
  // so we rely on browser detection
  const compatibility = detectSystemAudioSupport();
  return compatibility.isAudioSupported;
}
