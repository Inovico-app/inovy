"use client";

import { useTranslations } from "next-intl";

interface DurationDisplayProps {
  seconds: number;
  className?: string;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function DurationDisplay({ seconds, className }: DurationDisplayProps) {
  const t = useTranslations("recordings");
  return (
    <time
      className={`font-mono tabular-nums tracking-tight ${className ?? ""}`}
      dateTime={`PT${Math.floor(seconds)}S`}
      role="timer"
      aria-live="polite"
      aria-label={t("transcription.durationAriaLabel", {
        duration: formatDuration(seconds),
      })}
    >
      {formatDuration(seconds)}
    </time>
  );
}
