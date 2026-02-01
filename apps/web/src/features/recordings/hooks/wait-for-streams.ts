/**
 * Wait for MediaStream audio tracks to become ready (readyState === 'live')
 * Uses getter functions to ensure we check the latest stream values during polling
 */

export interface WaitForStreamsOptions {
  /** Maximum time to wait in milliseconds (default: 5000ms) */
  timeout?: number;
  /** Polling interval in milliseconds (default: 50ms) */
  interval?: number;
}

export interface StreamReadinessCheck {
  microphoneStream: MediaStream | null;
  systemAudioStream: MediaStream | null;
}

/**
 * Checks if streams are ready by verifying they exist and all audio tracks are 'live'
 */
function checkStreamsReady(
  microphoneStream: MediaStream | null,
  systemAudioStream: MediaStream | null
): boolean {
  // Check microphone stream
  if (microphoneStream) {
    const micAudioTracks = microphoneStream.getAudioTracks();
    if (micAudioTracks.length === 0) {
      return false; // No audio tracks yet
    }
    // All microphone audio tracks must be 'live'
    if (!micAudioTracks.every((track) => track.readyState === "live")) {
      return false;
    }
  } else {
    // If microphone stream is expected but not available, not ready
    return false;
  }

  // Check system audio stream
  if (systemAudioStream) {
    const sysAudioTracks = systemAudioStream.getAudioTracks();
    if (sysAudioTracks.length === 0) {
      return false; // No audio tracks yet
    }
    // All system audio tracks must be 'live'
    if (!sysAudioTracks.every((track) => track.readyState === "live")) {
      return false;
    }
  } else {
    // If system audio stream is expected but not available, not ready
    return false;
  }

  return true;
}

/**
 * Builds a detailed error message about which streams are missing or not ready
 */
function buildStreamError(
  microphoneStream: MediaStream | null,
  systemAudioStream: MediaStream | null
): string {
  const missingStreams: string[] = [];

  if (!microphoneStream) {
    missingStreams.push("microphone (stream not available)");
  } else {
    const micTracks = microphoneStream.getAudioTracks();
    if (micTracks.length === 0) {
      missingStreams.push("microphone (no audio tracks)");
    } else if (!micTracks.every((track) => track.readyState === "live")) {
      const notLiveTracks = micTracks.filter(
        (track) => track.readyState !== "live"
      );
      missingStreams.push(
        `microphone (${notLiveTracks.length} track(s) not live: ${notLiveTracks.map((t) => t.readyState).join(", ")})`
      );
    }
  }

  if (!systemAudioStream) {
    missingStreams.push("system audio (stream not available)");
  } else {
    const sysTracks = systemAudioStream.getAudioTracks();
    if (sysTracks.length === 0) {
      missingStreams.push("system audio (no audio tracks)");
    } else if (!sysTracks.every((track) => track.readyState === "live")) {
      const notLiveTracks = sysTracks.filter(
        (track) => track.readyState !== "live"
      );
      missingStreams.push(
        `system audio (${notLiveTracks.length} track(s) not live: ${notLiveTracks.map((t) => t.readyState).join(", ")})`
      );
    }
  }

  return `Timeout waiting for audio streams to become ready: ${missingStreams.join(", ")}`;
}

/**
 * Waits for MediaStream audio tracks to become ready
 * @param getMicrophoneStream - Function that returns microphone MediaStream
 * @param getSystemAudioStream - Function that returns system audio MediaStream
 * @param options - Configuration options
 * @throws Error if timeout is reached before streams are ready
 */
export async function waitForStreams(
  getMicrophoneStream: () => MediaStream | null,
  getSystemAudioStream: () => MediaStream | null,
  options: WaitForStreamsOptions = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();

  // Check if streams are already ready
  const initialMicStream = getMicrophoneStream();
  const initialSysStream = getSystemAudioStream();
  if (checkStreamsReady(initialMicStream, initialSysStream)) {
    return;
  }

  // Poll until streams are ready or timeout
  return new Promise<void>((resolve, reject) => {
    const pollInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const microphoneStream = getMicrophoneStream();
      const systemAudioStream = getSystemAudioStream();

      if (checkStreamsReady(microphoneStream, systemAudioStream)) {
        clearInterval(pollInterval);
        resolve();
        return;
      }

      if (elapsed >= timeout) {
        clearInterval(pollInterval);
        const errorMessage = buildStreamError(
          microphoneStream,
          systemAudioStream
        );
        reject(new Error(errorMessage));
      }
    }, interval);
  });
}
