import { AlertCircle } from "lucide-react";

interface TranscriptionStatusProps {
  isRecording: boolean;
  liveTranscriptionEnabled: boolean;
  isTranscribing: boolean;
}

export function TranscriptionStatus({
  isRecording,
  liveTranscriptionEnabled,
  isTranscribing,
}: TranscriptionStatusProps) {
  if (!isRecording || !liveTranscriptionEnabled) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      {isTranscribing ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-600 dark:text-green-400 font-medium">
            Live transcriptie actief
          </span>
        </>
      ) : (
        <>
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Transcriptie verbinding maken...
          </span>
        </>
      )}
    </div>
  );
}

