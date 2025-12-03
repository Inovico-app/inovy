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
    <div className="flex flex-col items-center gap-6">
      {/* Duration Display - Prominent when recording */}
      {isRecording && (
        <div className="text-center space-y-2">
          <p
            className="text-5xl font-mono font-bold tabular-nums tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent"
            role="timer"
            aria-live="polite"
          >
            {formattedDuration}
          </p>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            {isPaused ? (
              <>
                <Pause className="w-3 h-3" />
                <span>Paused</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse inline-block shadow-lg shadow-red-500/50" />
                <span>Recording...</span>
              </>
            )}
          </p>
        </div>
      )}

      {/* Recording Control Buttons */}
      <div className="flex items-center justify-center gap-4">
        {!isRecording ? (
          <Button
            onClick={onStart}
            size="lg"
            className="rounded-full w-20 h-20 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105"
            disabled={isSaving || permissionDenied}
            aria-label="Start recording"
          >
            <Mic className="w-8 h-8" />
          </Button>
        ) : (
          <>
            {!isPaused ? (
              <Button
                onClick={onPause}
                size="lg"
                variant="outline"
                className="rounded-full w-16 h-16 border-2 hover:bg-muted transition-all duration-200"
                aria-label="Pause recording"
              >
                <Pause className="w-6 h-6" />
              </Button>
            ) : (
              <Button
                onClick={onResume}
                size="lg"
                variant="outline"
                className="rounded-full w-16 h-16 border-2 hover:bg-muted transition-all duration-200"
                aria-label="Resume recording"
              >
                <Play className="w-6 h-6" />
              </Button>
            )}

            <Button
              onClick={onStop}
              size="lg"
              variant="destructive"
              className="rounded-full w-16 h-16 shadow-lg shadow-destructive/30 hover:shadow-xl hover:shadow-destructive/40 transition-all duration-200 hover:scale-105"
              disabled={isSaving}
              aria-label="Stop recording"
            >
              <Square className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

