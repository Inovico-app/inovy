import { Button } from "@/components/ui/button";
import { Mic, Pause, Play, Square } from "lucide-react";

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  isSaving: boolean;
  permissionDenied: boolean;
  formattedDuration: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function RecordingControls({
  isRecording,
  isPaused,
  isSaving,
  permissionDenied,
  formattedDuration,
  onStart,
  onPause,
  onResume,
  onStop,
}: RecordingControlsProps) {
  return (
    <>
      {/* Recording Control Buttons */}
      <div className="flex items-center justify-center gap-4">
        {!isRecording ? (
          <Button
            onClick={onStart}
            size="lg"
            className="rounded-full w-16 h-16"
            disabled={isSaving || permissionDenied}
            aria-label="Start opname"
          >
            <Mic className="w-6 h-6" />
          </Button>
        ) : (
          <>
            {!isPaused ? (
              <Button
                onClick={onPause}
                size="lg"
                variant="outline"
                className="rounded-full w-16 h-16"
                aria-label="Pauzeer opname"
              >
                <Pause className="w-6 h-6" />
              </Button>
            ) : (
              <Button
                onClick={onResume}
                size="lg"
                variant="outline"
                className="rounded-full w-16 h-16"
                aria-label="Hervat opname"
              >
                <Play className="w-6 h-6" />
              </Button>
            )}

            <Button
              onClick={onStop}
              size="lg"
              variant="destructive"
              className="rounded-full w-16 h-16"
              disabled={isSaving}
              aria-label="Stop opname"
            >
              <Square className="w-6 h-6" />
            </Button>
          </>
        )}
      </div>

      {/* Duration Display */}
      {isRecording && (
        <div className="text-center space-y-1">
          <p
            className="text-3xl font-mono font-bold tabular-nums"
            role="timer"
            aria-live="polite"
          >
            {formattedDuration}
          </p>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            {isPaused ? (
              <>
                <Pause className="w-3 h-3" />
                <span>Gepauzeerd</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
                <span>Opnemen...</span>
              </>
            )}
          </p>
        </div>
      )}
    </>
  );
}

