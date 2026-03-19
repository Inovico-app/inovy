"use client";

import { useMemo } from "react";

import {
  getSupportedMimeTypes,
  isSystemAudioSupported,
} from "../lib/audio-capabilities";

export interface AudioCapabilities {
  hasMicrophone: boolean;
  hasSystemAudio: boolean;
  supportedMimeTypes: string[];
}

export function useAudioCapabilities(): AudioCapabilities {
  return useMemo(
    () => ({
      hasMicrophone:
        typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia,
      hasSystemAudio: isSystemAudioSupported(),
      supportedMimeTypes: getSupportedMimeTypes(),
    }),
    [],
  );
}
