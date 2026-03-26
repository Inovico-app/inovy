"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { Loader2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { LiveWaveform } from "@/components/ui/live-waveform";
import {
  useRecordingSession,
  type UseRecordingSessionConfig,
} from "@/features/recordings/hooks/use-recording-session";
import { RecordingStatusBadge } from "@/features/recordings/components/shared/recording-status-badge";
import { AudioSourceIndicator } from "./audio-source-indicator";
import { ChunkUploadStatus } from "./chunk-upload-status";
import { MobileRecordingView } from "./mobile-recording-view";
import { RecordingControls } from "./recording-controls";
import { RecoveryDialog } from "./recovery-dialog";
import { TranscriptionPanel } from "./transcription-panel";
import { useTranslations } from "next-intl";

interface RecordingSessionProps {
  config: UseRecordingSessionConfig;
  autoStart?: boolean;
  /** Microphone device ID selected on the pre-recording settings screen */
  deviceId?: string;
  /** Called when the session is discarded/reset — parent should unmount this component */
  onDiscard?: () => void;
}

export function RecordingSession({
  config,
  autoStart = false,
  deviceId,
  onDiscard,
}: RecordingSessionProps) {
  const t = useTranslations("recordings");
  const router = useRouter();
  const session = useRecordingSession(config);

  // Track which warnings we've already shown
  const shownWarningsRef = useRef(new Set<string>());

  // Auto-start recording on mount — fires once per mount cycle.
  // We track whether THIS effect invocation successfully started, so the
  // cleanup can mark the ref as "not yet started" for Strict Mode remounts.
  const autoStartFired = useRef(false);
  useEffect(() => {
    if (!autoStart) return;

    // Reset on each effect run (handles Strict Mode: unmount resets, remount retries)
    autoStartFired.current = false;

    // Use microtask to ensure the hook's session-creation effect has set sessionRef
    const id = requestAnimationFrame(() => {
      if (autoStartFired.current) return; // guard against double-fire
      autoStartFired.current = true;
      session.start(deviceId).catch((err) => {
        console.error("[RecordingSession] Auto-start failed:", err);
      });
    });

    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Navigate on completion
  useEffect(() => {
    if (session.status !== "complete") return;

    toast.success(t("session.recordingComplete"));
    router.push(`/projects/${config.projectId}` as Route);
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

  // Navigation guard — prevent accidental loss of recording
  const isRecordingActive =
    session.status === "recording" ||
    session.status === "paused" ||
    session.status === "initializing" ||
    session.status === "stopping" ||
    session.status === "finalizing";

  const navigationGuard = useNavigationGuard({
    enabled: isRecordingActive,
    onConfirmNavigation: () => {
      // Stop and destroy the session when user confirms leaving
      session.reset();
    },
  });

  const isActiveRecording =
    session.status === "recording" || session.status === "paused";
  const showTranscription =
    config.liveTranscriptionEnabled &&
    (isActiveRecording || session.transcription.segments.length > 0);

  // --- Loading: show only a spinner until the FSM reaches recording/paused/error ---
  if (session.status === "initializing") {
    return (
      <>
        <div className="flex flex-col items-center justify-center gap-3 min-h-[calc(100vh-12rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {t("session.preparing")}
          </p>
        </div>

        {/* Navigation guard + consent still active */}
        <AlertDialog open={navigationGuard.showDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("session.navigationGuardTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("session.navigationGuardDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={navigationGuard.cancelNavigation}>
                {t("session.stayOnPage")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={navigationGuard.confirmNavigation}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("session.leavePage")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      {/* Idle state: visible on mobile only (desktop has its own idle view below) */}
      {session.status === "idle" && (
        <div className="flex flex-col items-center gap-6 justify-center min-h-[calc(100vh-12rem)] md:hidden">
          <RecordingControls
            status={session.status}
            duration={session.duration}
            errorIsRecoverable={session.error?.recoverable ?? false}
            autoStarting={false}
            onStart={() => void session.start(deviceId)}
            onPause={session.pause}
            onResume={session.resume}
            onStop={() => void session.stop()}
            onSavePartial={() => void session.savePartial()}
            onReset={() => {
              session.reset();

              onDiscard?.();
            }}
          />
        </div>
      )}

      {/* Mobile: Google Meet-style immersive overlay (not mounted in idle — idle has its own panel above) */}
      {session.status !== "idle" && (
        <MobileRecordingView
          status={session.status}
          duration={session.duration}
          mediaStream={session.mediaStream}
          transcription={session.transcription}
          liveTranscriptionEnabled={config.liveTranscriptionEnabled}
          audioSource={config.audioSource}
          chunkManifest={session.chunkManifest}
          error={session.error}
          onPause={session.pause}
          onResume={session.resume}
          onStop={() => void session.stop()}
          onSavePartial={() => void session.savePartial()}
          onReset={() => {
            session.reset();
            onDiscard?.();
          }}
        />
      )}

      {/* Desktop: panel layout */}
      <div className="hidden md:block">
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
                      {t("session.liveRecording")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {config.liveTranscriptionEnabled
                        ? t("session.withLiveTranscription")
                        : t("session.directBrowserRecording")}
                    </p>
                  </div>
                  <RecordingStatusBadge status={session.status} />
                </div>

                {/* Error display */}
                {session.error && session.error.severity === "fatal" && (
                  <div className="flex-shrink-0 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-sm text-destructive font-medium">
                      {session.error.message}
                    </p>
                  </div>
                )}

                {/* Live waveform visualization */}
                {session.mediaStream &&
                  (isActiveRecording ||
                    session.status === "stopping" ||
                    session.status === "finalizing") && (
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/10 p-6 flex-shrink-0">
                      <div className="flex h-32 items-center justify-center">
                        <LiveWaveform
                          active={session.status === "recording"}
                          processing={
                            session.status === "stopping" ||
                            session.status === "finalizing"
                          }
                          stream={session.mediaStream}
                          barWidth={5}
                          barGap={2}
                          barRadius={8}
                          fadeEdges
                          fadeWidth={48}
                          sensitivity={0.8}
                          smoothingTimeConstant={0.85}
                          className="w-full text-muted-foreground"
                        />
                      </div>
                      {/* Subtle glow effect when recording */}
                      {session.status === "recording" && (
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent pointer-events-none" />
                      )}
                    </div>
                  )}

                {/* Controls */}
                <div className="flex flex-col items-center gap-6 flex-1 justify-center">
                  <RecordingControls
                    status={session.status}
                    duration={session.duration}
                    errorIsRecoverable={session.error?.recoverable ?? false}
                    autoStarting={false}
                    onStart={() => void session.start(deviceId)}
                    onPause={session.pause}
                    onResume={session.resume}
                    onStop={() => void session.stop()}
                    onSavePartial={() => void session.savePartial()}
                    onReset={() => {
                      session.reset();

                      onDiscard?.();
                    }}
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
      </div>

      {/* Recovery dialog for orphaned sessions */}
      <RecoveryDialog
        orphanedSession={session.orphanedSession}
        onRecover={() => void session.recoverOrphanedSession()}
        onDiscard={() => void session.discardOrphanedSession()}
      />

      {/* Navigation guard dialog */}
      <AlertDialog open={navigationGuard.showDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("session.navigationGuardTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("session.navigationGuardDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={navigationGuard.cancelNavigation}>
              Blijven
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={navigationGuard.confirmNavigation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Pagina verlaten
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
