"use client";

import type {
  ConnectionStatus,
  TranscriptSegment,
} from "@/features/recordings/core/recording-session.types";
import { Sparkles, WifiOff } from "lucide-react";
import { useEffect, useRef } from "react";

interface TranscriptionPanelProps {
  transcription: {
    status: ConnectionStatus;
    segments: TranscriptSegment[];
    currentCaption: string | null;
  };
  /** "mobile" removes the card chrome for a full-bleed scrollable experience */
  variant?: "default" | "mobile";
}

const CONNECTION_STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; className: string; dotClassName: string }
> = {
  disconnected: {
    label: "Niet verbonden",
    className: "text-muted-foreground",
    dotClassName: "bg-muted-foreground",
  },
  connecting: {
    label: "Verbinden...",
    className: "text-blue-600 dark:text-blue-400",
    dotClassName: "bg-blue-500 animate-pulse",
  },
  connected: {
    label: "Verbonden",
    className: "text-green-600 dark:text-green-400",
    dotClassName: "bg-green-500",
  },
  reconnecting: {
    label: "Opnieuw verbinden...",
    className: "text-amber-600 dark:text-amber-400",
    dotClassName: "bg-amber-500 animate-pulse",
  },
  failed: {
    label: "Verbinding mislukt",
    className: "text-destructive",
    dotClassName: "bg-destructive",
  },
};

export function TranscriptionPanel({
  transcription,
  variant = "default",
}: TranscriptionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new segments or caption updates
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [transcription.segments.length, transcription.currentCaption]);

  const connectionConfig = CONNECTION_STATUS_CONFIG[transcription.status];
  const isMobile = variant === "mobile";

  // Shared segment list content
  const segmentContent =
    transcription.segments.length === 0 && !transcription.currentCaption ? (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {transcription.status === "connected"
              ? "Begin te spreken om transcriptie te zien..."
              : "Start een opname om live transcriptie te zien"}
          </p>
          <p className="text-xs text-muted-foreground">
            Tekst verschijnt hier zodra u spreekt
          </p>
        </div>
      </div>
    ) : (
      <div
        className={`space-y-3 ${isMobile ? "" : "space-y-4 max-w-4xl mx-auto"}`}
      >
        {transcription.segments.map((segment, index) => (
          <div
            key={`seg-${segment.startTime}-${segment.speaker ?? "x"}-${index}`}
            className={`group relative ${
              isMobile
                ? "px-1 py-2 border-b border-border/30 last:border-b-0"
                : "p-4 bg-background rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20"
            }`}
            style={{
              animation: `fadeIn 0.3s ease-out ${Math.min(index * 0.05, 0.5)}s both`,
            }}
          >
            {segment.speaker !== undefined && (
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-semibold ${
                    isMobile
                      ? "text-primary"
                      : "px-2 py-0.5 rounded-md bg-primary/10 text-primary"
                  }`}
                >
                  Spreker {segment.speaker}
                </span>
              </div>
            )}
            <p
              className={`leading-relaxed text-foreground ${
                isMobile ? "text-sm" : "text-base"
              }`}
            >
              {segment.text}
            </p>
          </div>
        ))}

        {/* Interim caption */}
        {transcription.currentCaption && (
          <div
            className={
              isMobile
                ? "px-1 py-2"
                : "p-4 bg-background/50 rounded-xl border border-dashed border-border/40"
            }
          >
            <p
              className={`leading-relaxed text-muted-foreground italic ${
                isMobile ? "text-sm" : "text-base"
              }`}
            >
              {transcription.currentCaption}
            </p>
          </div>
        )}

        <div ref={scrollRef} />
      </div>
    );

  // Mobile variant — minimal chrome, full-bleed
  if (isMobile) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Compact inline header */}
        <div className="flex items-center justify-between px-1 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold tracking-tight">
              Live Transcriptie
            </span>
          </div>
          <div
            className={`flex items-center gap-1.5 text-[11px] font-medium ${connectionConfig.className}`}
          >
            {transcription.status === "failed" ? (
              <WifiOff className="w-3 h-3" />
            ) : (
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${connectionConfig.dotClassName}`}
              />
            )}
            <span>{connectionConfig.label}</span>
          </div>
        </div>

        {/* Scrollable segment list */}
        <div
          className="flex-1 overflow-y-auto px-1"
          role="log"
          aria-live="polite"
          aria-label="Live transcriptie"
        >
          {segmentContent}
        </div>
      </div>
    );
  }

  // Desktop variant — card with header
  return (
    <div className="relative flex flex-col rounded-2xl border bg-gradient-to-br from-card via-card to-card/50 shadow-md overflow-hidden h-full">
      {/* Header */}
      <div className="relative p-6 border-b bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Live Transcriptie
              </h2>
              <p className="text-sm text-muted-foreground">
                Spraak-naar-tekst in real-time
              </p>
            </div>
          </div>

          {/* Connection indicator */}
          <div
            className={`flex items-center gap-2 text-xs font-medium ${connectionConfig.className}`}
          >
            {transcription.status === "failed" ? (
              <WifiOff className="w-3.5 h-3.5" />
            ) : (
              <span
                className={`inline-block w-2 h-2 rounded-full ${connectionConfig.dotClassName}`}
              />
            )}
            <span>{connectionConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Segment list */}
      <div
        className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-muted/20 via-background to-background"
        role="log"
        aria-live="polite"
        aria-label="Live transcriptie"
      >
        {segmentContent}
      </div>
    </div>
  );
}
