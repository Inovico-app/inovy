"use client";

import { AudioPlaybackProvider } from "@/features/recordings/context/audio-playback-context";
import type { ReactNode } from "react";

interface AudioTranscriptSyncWrapperProps {
  children: ReactNode;
}

export function AudioTranscriptSyncWrapper({
  children,
}: AudioTranscriptSyncWrapperProps) {
  return (
    <AudioPlaybackProvider>
      <div className="space-y-6">{children}</div>
    </AudioPlaybackProvider>
  );
}

