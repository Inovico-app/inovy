"use client";

import { formatTimestamp } from "@/lib/formatters/duration-formatters";
import { Clock } from "lucide-react";

interface TimestampButtonProps {
  startTime: number;
  onJump: (timestamp: number) => void;
}

export function TimestampButton({ startTime, onJump }: TimestampButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onJump(startTime)}
      aria-label={`Jump to ${formatTimestamp(startTime)}`}
      className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:text-primary/80 transition-colors cursor-pointer"
    >
      <Clock className="h-3 w-3" />
      {formatTimestamp(startTime)}
    </button>
  );
}
