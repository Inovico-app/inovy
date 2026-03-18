import { LiveConnectionState } from "@/providers/DeepgramProvider";
import { AlertCircle, Loader2 } from "lucide-react";

interface TranscriptionStatusProps {
  isRecording: boolean;
  liveTranscriptionEnabled: boolean;
  isTranscribing: boolean;
  connectionState: LiveConnectionState;
}

export function TranscriptionStatus({
  isRecording,
  liveTranscriptionEnabled,
  isTranscribing,
  connectionState,
}: TranscriptionStatusProps) {
  if (!isRecording || !liveTranscriptionEnabled) {
    return null;
  }

  if (isTranscribing) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-green-600 dark:text-green-400">Transcribing</span>
      </div>
    );
  }

  if (connectionState === LiveConnectionState.connecting) {
    return (
      <div className="flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        <span>Connecting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <AlertCircle className="w-3 h-3 text-amber-500" />
      <span className="text-amber-600 dark:text-amber-400">Not connected</span>
    </div>
  );
}
