/**
 * Browser compatibility detection for system audio capture
 */
import { UAParser } from "ua-parser-js";

export type AudioSourceType = "microphone" | "system" | "both";

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

  const parser = new UAParser(navigator.userAgent);
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
