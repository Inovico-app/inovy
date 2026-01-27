"use client";

import { useEffect, useState } from "react";

/**
 * Audio input device information
 */
export interface AudioInputDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

/**
 * Module-level cache for device enumeration results
 * Prevents repeated API calls within a short time window
 */
let deviceCache: {
  devices: AudioInputDevice[];
  timestamp: number;
} | null = null;

const CACHE_DURATION_MS = 5000; // 5 seconds cache

/**
 * Enumerate audio input devices
 * Uses module-level cache to avoid repeated API calls
 */
async function enumerateAudioDevices(): Promise<AudioInputDevice[]> {
  // Check cache first
  if (
    deviceCache &&
    Date.now() - deviceCache.timestamp < CACHE_DURATION_MS
  ) {
    return deviceCache.devices;
  }

  // Guard: Check if navigator.mediaDevices is available
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    !navigator.mediaDevices.enumerateDevices
  ) {
    console.warn(
      "navigator.mediaDevices.enumerateDevices is not available in this context"
    );
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputDevices: AudioInputDevice[] = devices
      .filter((device) => device.kind === "audioinput")
      .map((device) => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
        groupId: device.groupId,
      }));

    // Update cache
    deviceCache = {
      devices: audioInputDevices,
      timestamp: Date.now(),
    };

    return audioInputDevices;
  } catch (error) {
    console.error("Failed to enumerate audio devices:", error);
    return [];
  }
}

/**
 * Hook to enumerate and monitor audio input devices
 * Automatically refreshes when devices are added/removed
 *
 * @returns Object containing devices array, loading state, and error state
 */
export function useAudioDevices() {
  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshDevices = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const audioDevices = await enumerateAudioDevices();
      setDevices(audioDevices);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to enumerate devices");
      setError(error);
      console.error("Error refreshing audio devices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    void refreshDevices();

    // Guard: Check if navigator.mediaDevices is available before adding listener
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.addEventListener
    ) {
      return;
    }

    // Listen for device changes
    const handleDeviceChange = () => {
      // Invalidate cache when devices change
      deviceCache = null;
      void refreshDevices();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

    // Cleanup
    return () => {
      if (
        typeof navigator !== "undefined" &&
        navigator.mediaDevices &&
        navigator.mediaDevices.removeEventListener
      ) {
        navigator.mediaDevices.removeEventListener(
          "devicechange",
          handleDeviceChange
        );
      }
    };
  }, []);

  return {
    devices,
    isLoading,
    error,
    refreshDevices,
  };
}
