"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  useRecordingSession,
  type UseRecordingSessionConfig,
} from "@/features/recordings/hooks/use-recording-session";
import { RecordingStatusBadge } from "@/features/recordings/components/shared/recording-status-badge";
import { AudioSourceIndicator } from "./audio-source-indicator";
import { ChunkUploadStatus } from "./chunk-upload-status";
import { RecordingControls } from "./recording-controls";
import { RecoveryDialog } from "./recovery-dialog";
import { TranscriptionPanel } from "./transcription-panel";

interface RecordingSessionProps {
  config: UseRecordingSessionConfig;
}

export function RecordingSession({ config }: RecordingSessionProps) {
  const router = useRouter();
  const session = useRecordingSession(config);

  // Track which warnings we've already shown
  const shownWarningsRef = useRef(new Set<string>());

  // Navigate on completion
  useEffect(() => {
    if (session.status !== "complete") return;

    toast.success("Opname voltooid!");
    router.push(`/projects/${config.projectId}`);
    router.refresh();
  }, [session.status, config.projectId, router]);

  // Show error toast (skip warnings — they are handled by the warnings useEffect)
  useEffect(() => {
    if (!session.error) return;
    if (session.error.severity === "warning") return;
    toast.error(session.error.message);
  }, [session.error]);

  // Show warnings via toasts (deduplicated)
  useEffect(() => {
    // Access warnings through the session error if severity is warning
    if (
      session.error &&
      session.error.severity === "warning" &&
      !shownWarningsRef.current.has(session.error.code)
    ) {
      shownWarningsRef.current.add(session.error.code);
      toast.warning(session.error.message);
    }
  }, [session.error]);

  const isActiveRecording =
    session.status === "recording" || session.status === "paused";
  const showTranscription =
    config.liveTranscriptionEnabled &&
    (isActiveRecording || session.transcription.segments.length > 0);

  return (
    <>
      <div
        className={showTranscription ? "flex flex-col xl:flex-row gap-6" : ""}
      >
        {/* Main recording panel */}
        <div
          className={showTranscription ? "flex-1 min-w-0" : "w-full"}
          style={{
            height: "calc(100dvh - 12rem)",
            minHeight: "600px",
            maxHeight: "800px",
          }}
        >
          <div
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-card/50 transition-all duration-500 h-full flex flex-col ${
              session.status === "recording"
                ? "shadow-lg shadow-primary/10 ring-2 ring-primary/20"
                : "shadow-md"
            }`}
          >
            {/* Animated background pulse when recording */}
            {session.status === "recording" && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 animate-pulse pointer-events-none" />
            )}

            <div className="relative p-8 flex flex-col space-y-8 flex-1">
              {/* Header with status badge */}
              <div className="flex items-start justify-between flex-shrink-0">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-1">
                    Live Opname
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {config.liveTranscriptionEnabled
                      ? "Audio-opname met live transcriptie"
                      : "Directe audio-opname vanuit uw browser"}
                  </p>
                </div>
                {session.status !== "idle" && (
                  <RecordingStatusBadge status={session.status} />
                )}
              </div>

              {/* Error display */}
              {session.error && session.error.severity === "fatal" && (
                <div className="flex-shrink-0 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm text-destructive font-medium">
                    {session.error.message}
                  </p>
                </div>
              )}

              {/* Controls */}
              <div className="flex flex-col items-center gap-6 flex-1 justify-center">
                <RecordingControls
                  status={session.status}
                  duration={session.duration}
                  errorIsRecoverable={session.error?.recoverable ?? false}
                  onStart={session.start}
                  onPause={session.pause}
                  onResume={session.resume}
                  onStop={() => void session.stop()}
                  onSavePartial={() => void session.savePartial()}
                  onReset={session.reset}
                />
              </div>

              {/* Status bar */}
              {isActiveRecording && (
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
                  <AudioSourceIndicator
                    audioSource={config.audioSource}
                    status={session.status}
                  />
                  <ChunkUploadStatus manifest={session.chunkManifest} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Transcription panel */}
        {showTranscription && (
          <div
            className="flex-1 min-w-0"
            style={{
              height: "calc(100dvh - 12rem)",
              minHeight: "600px",
              maxHeight: "800px",
            }}
          >
            <TranscriptionPanel transcription={session.transcription} />
          </div>
        )}
      </div>

      {/* Recovery dialog for orphaned sessions */}
      <RecoveryDialog
        orphanedSession={session.orphanedSession}
        onRecover={() => void session.recoverOrphanedSession()}
        onDiscard={() => void session.discardOrphanedSession()}
      />
    </>
  );
}
