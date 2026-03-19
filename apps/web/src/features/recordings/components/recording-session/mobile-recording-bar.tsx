"use client";

import { Button } from "@/components/ui/button";
import type {
  AudioSource,
  ChunkManifest,
  RecordingStatus,
} from "@/features/recordings/core/recording-session.types";
import { DurationDisplay } from "@/features/recordings/components/shared/duration-display";
import {
  CloudUpload,
  Loader2,
  Mic,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Save,
  Square,
  Trash2,
} from "lucide-react";

interface MobileRecordingBarProps {
  status: RecordingStatus;
  duration: number;
  audioSource: AudioSource;
  chunkManifest: ChunkManifest;
  errorIsRecoverable?: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSavePartial: () => void;
  onReset: () => void;
}

const AUDIO_SOURCE_ICON: Record<AudioSource, typeof Mic> = {
  microphone: Mic,
  system: Monitor,
  combined: Mic,
};

const AUDIO_SOURCE_LABEL: Record<AudioSource, string> = {
  microphone: "Microfoon",
  system: "Systeem",
  combined: "Mic + Systeem",
};

export function MobileRecordingBar({
  status,
  duration,
  audioSource,
  chunkManifest,
  errorIsRecoverable = false,
  onPause,
  onResume,
  onStop,
  onSavePartial,
  onReset,
}: MobileRecordingBarProps) {
  const SourceIcon = AUDIO_SOURCE_ICON[audioSource];
  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isProcessing = status === "stopping" || status === "finalizing";
  const isError = status === "error";

  // Processing state
  if (isProcessing) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 safe-area-bottom md:hidden">
        <div className="bg-card/95 backdrop-blur-xl border-t border-border/50 px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              Opname wordt verwerkt...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 safe-area-bottom md:hidden">
        <div className="bg-card/95 backdrop-blur-xl border-t border-destructive/30 px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            {errorIsRecoverable ? (
              <>
                <Button
                  onClick={onSavePartial}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Opslaan
                </Button>
                <Button
                  onClick={onReset}
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Verwijderen
                </Button>
              </>
            ) : (
              <Button
                onClick={onReset}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Opnieuw
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!isRecording && !isPaused) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="bg-card/95 backdrop-blur-xl border-t border-border/50">
        {/* Main controls row */}
        <div className="flex items-center justify-between px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Left: status + timer */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Recording indicator dot */}
            <div className="flex items-center gap-2">
              {isRecording ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
              ) : (
                <Pause className="w-3 h-3 text-amber-500" />
              )}
            </div>

            {/* Duration */}
            <DurationDisplay
              seconds={duration}
              className="text-lg font-semibold text-foreground"
            />

            {/* Source + chunks info */}
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <SourceIcon className="w-3 h-3" />
                <span className="hidden min-[400px]:inline">
                  {AUDIO_SOURCE_LABEL[audioSource]}
                </span>
              </div>
              {chunkManifest.totalChunks > 0 && (
                <div className="flex items-center gap-1">
                  <CloudUpload
                    className={`w-3 h-3 ${
                      chunkManifest.uploadedChunks === chunkManifest.totalChunks
                        ? "text-green-500"
                        : "animate-pulse"
                    }`}
                  />
                  <span className="font-mono tabular-nums">
                    {chunkManifest.uploadedChunks}/{chunkManifest.totalChunks}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: control buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {isRecording ? (
              <Button
                onClick={onPause}
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-full"
                aria-label="Pauzeren"
              >
                <Pause className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                onClick={onResume}
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-full"
                aria-label="Hervatten"
              >
                <Play className="w-5 h-5" />
              </Button>
            )}

            <Button
              onClick={onStop}
              size="icon"
              variant="destructive"
              className="h-10 w-10 rounded-full"
              aria-label="Stoppen"
            >
              <Square className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
