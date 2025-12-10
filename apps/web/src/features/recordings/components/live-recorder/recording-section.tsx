import { Badge } from "@/components/ui/badge";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { ConsentStatus } from "@/features/recordings/components/consent-status";
import { RecordingControls } from "./recording-controls";
import { RecordingErrors } from "./recording-errors";
import { TranscriptionStatus } from "./transcription-status";

interface RecordingSectionProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  isSaving: boolean;
  permissionDenied: boolean;
  recorderError: string | null;
  transcriptionError: string | null;
  stream: MediaStream | null;
  liveTranscriptionEnabled: boolean;
  isTranscribing: boolean;
  consentGranted: boolean;
  wakeLockActive: boolean;
  formattedDuration: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function RecordingSection({
  isRecording,
  isPaused,
  duration,
  isSaving,
  permissionDenied,
  recorderError,
  transcriptionError,
  stream,
  liveTranscriptionEnabled,
  isTranscribing,
  consentGranted,
  wakeLockActive,
  formattedDuration,
  onStart,
  onPause,
  onResume,
  onStop,
}: RecordingSectionProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-card/50 transition-all duration-500 h-full flex flex-col ${
        isRecording && !isPaused
          ? "shadow-lg shadow-primary/10 ring-2 ring-primary/20"
          : "shadow-md"
      }`}
    >
      {/* Animated background pulse when recording */}
      {isRecording && !isPaused && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 animate-pulse pointer-events-none" />
      )}

      <div className="relative p-8 flex flex-col space-y-8 flex-1">
        {/* Header with status */}
        <div className="flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-1">
              Live Recording
            </h2>
            <p className="text-sm text-muted-foreground">
              {liveTranscriptionEnabled
                ? "Real-time audio capture with live transcription"
                : "Direct audio capture from your microphone"}
            </p>
          </div>
          {isRecording && (
            <Badge
              variant={isPaused ? "outline" : "default"}
              className={`ml-2 ${
                isPaused
                  ? ""
                  : "animate-pulse bg-primary text-primary-foreground"
              }`}
            >
              {isPaused ? "Paused" : "Recording"}
            </Badge>
          )}
        </div>

        {/* Errors and Status - Compact */}
        <div className="flex-shrink-0">
          <RecordingErrors
            permissionDenied={permissionDenied}
            recorderError={recorderError}
            transcriptionError={transcriptionError}
            isSaving={isSaving}
          />
        </div>

        {/* Live Waveform - Large and prominent */}
        {(isRecording || isPaused) && stream && (
          <div className="relative overflow-hidden rounded-xl border-2 border-border/50 bg-gradient-to-b from-muted/30 to-muted/10 p-8 backdrop-blur-sm flex-shrink-0">
            <div className="flex h-40 items-center justify-center">
              <LiveWaveform
                active={isRecording}
                barWidth={5}
                barGap={2}
                barRadius={8}
                barColor="#71717a"
                fadeEdges
                fadeWidth={48}
                sensitivity={0.8}
                smoothingTimeConstant={0.85}
                className="w-full"
              />
            </div>
            {/* Subtle glow effect when recording */}
            {isRecording && !isPaused && (
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent pointer-events-none" />
            )}
          </div>
        )}

        {/* Recording Controls - Centered and prominent */}
        <div className="flex flex-col items-center gap-6 flex-1 justify-center">
          <RecordingControls
            isRecording={isRecording}
            isPaused={isPaused}
            duration={duration}
            isSaving={isSaving}
            permissionDenied={permissionDenied}
            formattedDuration={formattedDuration}
            onStart={onStart}
            onPause={onPause}
            onResume={onResume}
            onStop={onStop}
          />
        </div>

        {/* Status indicators - Compact row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
          {consentGranted && (
            <div className="flex items-center gap-1.5">
              <ConsentStatus status="granted" />
              <span>Consent granted</span>
            </div>
          )}
          {isRecording && wakeLockActive && (
            <div className="flex items-center gap-1.5 text-green-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Screen lock active</span>
            </div>
          )}
          <TranscriptionStatus
            isRecording={isRecording}
            liveTranscriptionEnabled={liveTranscriptionEnabled}
            isTranscribing={isTranscribing}
          />
        </div>
      </div>
    </div>
  );
}

