"use client";

import { cn } from "@/lib/utils";

interface CitationMarkerProps {
  citationNumber: number;
  onClick?: () => void;
  className?: string;
}

export function CitationMarker({
  citationNumber,
  onClick,
  className,
}: CitationMarkerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center",
        "h-4 w-4 text-[10px] font-medium",
        "bg-primary/10 text-primary",
        "border border-primary/20 rounded",
        "hover:bg-primary/20 hover:border-primary/30",
        "transition-colors duration-200",
        "cursor-pointer",
        "align-super",
        "mx-0.5",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1",
        className
      )}
      aria-label={`View source ${citationNumber}`}
    >
      {citationNumber}
    </button>
  );
}

