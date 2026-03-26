"use client";

import { Button } from "@/components/ui/button";
import type { RecordingStatus } from "@/features/recordings/core/recording-session.types";
import { DurationDisplay } from "@/features/recordings/components/shared/duration-display";
import {
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Save,
  Square,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface RecordingControlsProps {
  status: RecordingStatus;
  duration: number;
  errorIsRecoverable?: boolean;
  autoStarting?: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSavePartial: () => void;
  onReset: () => void;
}

export function RecordingControls({
  status,
  duration,
  errorIsRecoverable = false,
  autoStarting = false,
  onStart,
  onPause,
  onResume,
  onStop,
  onSavePartial,
  onReset,
}: RecordingControlsProps) {
  const t = useTranslations("recordings");
  // --- Idle + autoStarting: show initializing spinner (autoStart hasn't fired yet) ---
  if (status === "idle" && autoStarting) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">{t("session.preparing")}</span>
        </div>
      </div>
    );
  }

  // --- Idle: show start button ---
  if (status === "idle") {
    return (
      <div className="flex flex-col items-center gap-6">
        <Button
          onClick={onStart}
          size="lg"
          className="rounded-full w-20 h-20 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105"
          aria-label={t("session.startRecordingAriaLabel")}
        >
          <Mic className="w-8 h-8" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          {t("session.startRecording")}
        </span>
      </div>
    );
  }

  // --- Initializing: show spinner ---
  if (status === "initializing") {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">{t("session.preparing")}</span>
        </div>
      </div>
    );
  }

  // --- Recording / Paused: show controls ---
  if (status === "recording" || status === "paused") {
    return (
      <div className="flex flex-col items-center gap-6">
        {/* Duration timer */}
        <div className="text-center space-y-2">
          <DurationDisplay
            seconds={duration}
            className="text-5xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent"
          />
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            {status === "paused" ? (
              <>
                <Pause className="w-3 h-3" />
                <span>{t("session.recordingPaused")}</span>
              </>
            ) : (
              <>
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
                <span>{t("session.recordingActive")}</span>
              </>
            )}
          </p>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-center gap-4">
          {status === "recording" ? (
            <Button
              onClick={onPause}
              size="lg"
              variant="outline"
              className="rounded-full w-16 h-16 border-2 hover:bg-muted transition-all duration-200"
              aria-label={t("session.pause")}
            >
              <Pause className="w-6 h-6" />
            </Button>
          ) : (
            <Button
              onClick={onResume}
              size="lg"
              variant="outline"
              className="rounded-full w-16 h-16 border-2 hover:bg-muted transition-all duration-200"
              aria-label={t("session.resume")}
            >
              <Play className="w-6 h-6" />
            </Button>
          )}

          <Button
            onClick={onStop}
            size="lg"
            variant="destructive"
            className="rounded-full w-16 h-16 shadow-lg shadow-destructive/30 hover:shadow-xl hover:shadow-destructive/40 transition-all duration-200 hover:scale-105"
            aria-label={t("session.stop")}
          >
            <Square className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  // --- Stopping / Finalizing: show processing ---
  if (status === "stopping" || status === "finalizing") {
    return (
      <div className="flex flex-col items-center gap-4">
        <DurationDisplay
          seconds={duration}
          className="text-3xl font-bold text-muted-foreground"
        />
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">
            {t("session.processingRecording")}
          </span>
        </div>
      </div>
    );
  }

  // --- Error: show recovery options ---
  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-4">
        {errorIsRecoverable ? (
          <div className="flex items-center gap-3">
            <Button onClick={onSavePartial} variant="outline" className="gap-2">
              <Save className="w-4 h-4" />
              {t("session.savePartial")}
            </Button>
            <Button onClick={onReset} variant="destructive" className="gap-2">
              <Trash2 className="w-4 h-4" />
              {t("session.discard")}
            </Button>
          </div>
        ) : (
          <Button onClick={onReset} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            {t("session.tryAgain")}
          </Button>
        )}
      </div>
    );
  }

  // --- Complete: nothing to show (parent handles navigation) ---
  return null;
}
