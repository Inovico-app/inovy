import { useEffect, useRef } from "react";

/**
 * Hook to manage stream refs that stay in sync with hook values
 * This avoids stale closure issues in async functions that need to access
 * the latest stream values after React state updates
 */
export function useStreamRefs(
  microphoneStream: MediaStream | null,
  systemAudioStream: MediaStream | null
) {
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const systemAudioStreamRef = useRef<MediaStream | null>(null);

  // Keep refs in sync with hook values
  useEffect(() => {
    microphoneStreamRef.current = microphoneStream;
  }, [microphoneStream]);

  useEffect(() => {
    systemAudioStreamRef.current = systemAudioStream;
  }, [systemAudioStream]);

  return {
    microphoneStreamRef,
    systemAudioStreamRef,
  };
}
