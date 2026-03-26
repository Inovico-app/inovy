"use client";

import type {
  ConnectionStatus,
  TranscriptSegment,
} from "@/features/recordings/core/recording-session.types";
import { Sparkles, WifiOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

interface TranscriptionPanelProps {
  transcription: {
    status: ConnectionStatus;
    segments: TranscriptSegment[];
    currentCaption: string | null;
  };
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

export function TranscriptionPanel({ transcription }: TranscriptionPanelProps) {
  const t = useTranslations("recordings");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new segments or caption updates
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [transcription.segments.length, transcription.currentCaption]);

  const connectionConfig = CONNECTION_STATUS_CONFIG[transcription.status];

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
                {t("transcriptionPanel.title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("transcriptionPanel.subtitle")}
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
        aria-label={t("transcriptionPanel.liveTranscriptionAriaLabel")}
      >
        {transcription.segments.length === 0 &&
        !transcription.currentCaption ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {transcription.status === "connected"
                  ? t("transcriptionPanel.speakToSeeTranscription")
                  : t("transcriptionPanel.startRecordingToSee")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("transcriptionPanel.textAppearsHere")}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {transcription.segments.map((segment, index) => (
              <div
                key={`seg-${segment.startTime}-${segment.speaker ?? "x"}-${index}`}
                className="group relative p-4 bg-background rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20"
                style={{
                  animation: `fadeIn 0.3s ease-out ${Math.min(index * 0.05, 0.5)}s both`,
                }}
              >
                {segment.speaker !== undefined && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-primary/10 text-primary">
                      {t("transcriptionPanel.speaker", {
                        number: segment.speaker,
                      })}
                    </span>
                  </div>
                )}
                <p className="text-base leading-relaxed text-foreground">
                  {segment.text}
                </p>
              </div>
            ))}

            {/* Interim caption */}
            {transcription.currentCaption && (
              <div className="p-4 bg-background/50 rounded-xl border border-dashed border-border/40">
                <p className="text-base leading-relaxed text-muted-foreground italic">
                  {transcription.currentCaption}
                </p>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        )}
      </div>
    </div>
  );
}
