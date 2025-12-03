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
    <div className="flex items-center gap-1.5">
      {isTranscribing ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-600 dark:text-green-400">Transcribing</span>
        </>
      ) : (
        <>
          <AlertCircle className="w-3 h-3 text-muted-foreground" />
          <span>Connecting...</span>
        </>
      )}
    </div>
  );
}

