"use client";

import { Button } from "@/components/ui/button";
import { DurationDisplay } from "@/features/recordings/components/shared/duration-display";
import { RecordingStatusBadge } from "@/features/recordings/components/shared/recording-status-badge";
import type { RecordingError } from "@/features/recordings/core/recording-session.errors";
import type {
  AudioSource,
  ChunkManifest,
  ConnectionStatus,
  RecordingStatus,
  TranscriptSegment,
} from "@/features/recordings/core/recording-session.types";
import {
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Save,
  Square,
  Trash2,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { AudioInputDevice } from "@/features/recordings/hooks/use-audio-devices";
import { AudioSourceIndicator } from "./audio-source-indicator";
import { ChunkUploadStatus } from "./chunk-upload-status";
import { DeviceSettingsPopover } from "./device-settings-popover";

interface MobileRecordingViewProps {
  status: RecordingStatus;
  duration: number;
  transcription: {
    status: ConnectionStatus;
    segments: TranscriptSegment[];
    currentCaption: string | null;
  };
  liveTranscriptionEnabled: boolean;
  audioSource: AudioSource;
  chunkManifest: ChunkManifest;
  error: RecordingError | null;
  devices: AudioInputDevice[];
  selectedDeviceId: string | null;
  onDeviceChange: (deviceId: string) => void;
  isDeviceSelectionDisabled: boolean;
  isLoadingDevices: boolean;
  devicesError: Error | null;
  onRetryDevices: () => void;
  isSwitchingDevice: boolean;
  switchError: Error | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSavePartial: () => void;
  onReset: () => void;
}

const CONNECTION_DOT_CLASS: Record<ConnectionStatus, string> = {
  disconnected: "bg-muted-foreground",
  connecting: "bg-blue-500 animate-pulse",
  connected: "bg-green-500",
  reconnecting: "bg-amber-500 animate-pulse",
  failed: "bg-destructive",
};

export function MobileRecordingView({
  status,
  duration,
  transcription,
  liveTranscriptionEnabled,
  audioSource,
  chunkManifest,
  error,
  devices,
  selectedDeviceId,
  onDeviceChange,
  isDeviceSelectionDisabled,
  isLoadingDevices,
  devicesError,
  onRetryDevices,
  isSwitchingDevice,
  switchError,
  onPause,
  onResume,
  onStop,
  onSavePartial,
  onReset,
}: MobileRecordingViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isActive = isRecording || isPaused;
  const isProcessing = status === "stopping" || status === "finalizing";
  const isError = status === "error";

  // Auto-scroll captions to latest
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [transcription.segments.length, transcription.currentCaption]);

  const hasCaption =
    transcription.segments.length > 0 || transcription.currentCaption !== null;
  const showCaptions = liveTranscriptionEnabled && isActive;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-background md:hidden"
      style={{ animation: "fadeIn 0.3s ease-out" }}
    >
      {/* Subtle animated background pulse when recording */}
      {isRecording && (
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-primary/[0.02] animate-pulse pointer-events-none" />
      )}

      {/* ── Top status bar ── */}
      <div className="relative flex items-center justify-between px-5 pt-5 pb-2">
        <RecordingStatusBadge status={status} />
        {isActive && (
          <div className="flex items-center gap-3">
            <AudioSourceIndicator audioSource={audioSource} status={status} />
            <ChunkUploadStatus manifest={chunkManifest} />
          </div>
        )}
      </div>

      {/* ── Center content ── */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6">
        {isActive && (
          <>
            <DurationDisplay
              seconds={duration}
              className="text-7xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent"
            />
            <p className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
              {isPaused ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Gepauzeerd</span>
                </>
              ) : (
                <>
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
                  <span>Opnemen...</span>
                </>
              )}
            </p>
          </>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center gap-5">
            <DurationDisplay
              seconds={duration}
              className="text-4xl font-bold text-muted-foreground"
            />
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">
                Opname wordt verwerkt...
              </span>
            </div>
          </div>
        )}

        {isError && error?.severity === "fatal" && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 max-w-sm">
            <p className="text-sm text-destructive font-medium text-center">
              {error.message}
            </p>
          </div>
        )}
      </div>

      {/* ── Transcription caption overlay ── */}
      {showCaptions && (
        <div className="relative px-4 pb-3">
          <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/30 overflow-hidden">
            {/* Connection indicator */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${CONNECTION_DOT_CLASS[transcription.status]}`}
              />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Transcriptie
              </span>
            </div>

            {/* Caption content — fixed height, scrollable to review past segments */}
            <div className="px-4 pb-3 h-[35vh] overflow-y-auto overscroll-contain">
              {hasCaption ? (
                <div className="space-y-2">
                  {transcription.segments.map((segment, index) => (
                    <div
                      key={`m-${segment.startTime}-${segment.speaker ?? "x"}-${index}`}
                    >
                      {segment.speaker !== undefined && (
                        <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                          Spreker {segment.speaker}
                        </span>
                      )}
                      <p className="text-sm leading-relaxed text-foreground">
                        {segment.text}
                      </p>
                    </div>
                  ))}
                  {transcription.currentCaption && (
                    <p className="text-sm leading-relaxed text-muted-foreground italic">
                      {transcription.currentCaption}
                    </p>
                  )}
                  <div ref={scrollRef} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-1">
                  {transcription.status === "connected"
                    ? "Luisteren..."
                    : "Verbinden..."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom control bar ── */}
      <div className="relative px-4 pt-4 pb-8 bg-card/60 backdrop-blur-2xl border-t border-border/20">
        {isActive && (
          <div className="flex items-center justify-center gap-5">
            <DeviceSettingsPopover
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onDeviceChange={onDeviceChange}
              isDisabled={isDeviceSelectionDisabled}
              isLoading={isLoadingDevices || isSwitchingDevice}
              error={devicesError}
              onRetry={onRetryDevices}
              switchError={switchError}
            />
            {isRecording ? (
              <Button
                onClick={onPause}
                size="lg"
                variant="outline"
                className="rounded-full w-14 h-14 border-2 border-border/50 bg-background/50 hover:bg-muted transition-all duration-200 active:scale-95"
                aria-label="Pauzeren"
              >
                <Pause className="w-6 h-6" />
              </Button>
            ) : (
              <Button
                onClick={onResume}
                size="lg"
                variant="outline"
                className="rounded-full w-14 h-14 border-2 border-border/50 bg-background/50 hover:bg-muted transition-all duration-200 active:scale-95"
                aria-label="Hervatten"
              >
                <Play className="w-6 h-6" />
              </Button>
            )}
            <Button
              onClick={onStop}
              size="lg"
              variant="destructive"
              className="rounded-full w-14 h-14 shadow-lg shadow-destructive/30 transition-all duration-200 active:scale-95"
              aria-label="Stoppen"
            >
              <Square className="w-5 h-5" />
            </Button>
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center gap-3">
            {error?.recoverable ? (
              <>
                <Button
                  onClick={onSavePartial}
                  variant="outline"
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  Opslaan
                </Button>
                <Button
                  onClick={onReset}
                  variant="destructive"
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Verwijderen
                </Button>
              </>
            ) : (
              <Button onClick={onReset} variant="outline" className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Opnieuw
              </Button>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center justify-center">
            <p className="text-xs text-muted-foreground">
              Even geduld alstublieft...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
