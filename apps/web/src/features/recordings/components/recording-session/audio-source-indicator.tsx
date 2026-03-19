"use client";

import type {
  AudioSource,
  RecordingStatus,
} from "@/features/recordings/core/recording-session.types";
import { Mic, Monitor } from "lucide-react";

interface AudioSourceIndicatorProps {
  audioSource: AudioSource;
  status: RecordingStatus;
  className?: string;
}

const SOURCE_CONFIG: Record<
  AudioSource,
  { label: string; icons: Array<typeof Mic> }
> = {
  microphone: { label: "Microfoon", icons: [Mic] },
  system: { label: "Systeemaudio", icons: [Monitor] },
  combined: { label: "Microfoon + Systeem", icons: [Mic, Monitor] },
};

export function AudioSourceIndicator({
  audioSource,
  status,
  className,
}: AudioSourceIndicatorProps) {
  const config = SOURCE_CONFIG[audioSource];
  const isActive = status === "recording";

  return (
    <div
      className={`flex items-center gap-2 text-xs text-muted-foreground ${className ?? ""}`}
      aria-label={`Audiobron: ${config.label}`}
    >
      <div className="flex items-center gap-1">
        {config.icons.map((Icon, index) => (
          <span
            key={`icon-${index}`}
            className={`relative inline-flex ${isActive ? "text-primary" : ""}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {isActive && (
              <span className="absolute inset-0 animate-ping opacity-30">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </span>
            )}
          </span>
        ))}
      </div>
      <span className="font-medium">{config.label}</span>
    </div>
  );
}
