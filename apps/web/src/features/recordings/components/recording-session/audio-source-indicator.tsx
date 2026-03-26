"use client";

import type {
  AudioSource,
  RecordingStatus,
} from "@/features/recordings/core/recording-session.types";
import { Mic, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("recordings");
  const SOURCE_LABELS: Record<AudioSource, string> = {
    microphone: t("audioSourceIndicator.microphone"),
    system: t("audioSourceIndicator.systemAudio"),
    combined: t("audioSourceIndicator.microphoneAndSystem"),
  };
  const config = SOURCE_CONFIG[audioSource];
  const label = SOURCE_LABELS[audioSource];
  const isActive = status === "recording";

  return (
    <div
      className={`flex items-center gap-2 text-xs text-muted-foreground ${className ?? ""}`}
      aria-label={t("audioSourceIndicator.audioSource", { label })}
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
      <span className="font-medium">{label}</span>
    </div>
  );
}
