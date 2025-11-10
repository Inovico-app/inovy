import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface TranscriptionSettingsProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isRecording: boolean;
}

export function TranscriptionSettings({
  enabled,
  onToggle,
  isRecording,
}: TranscriptionSettingsProps) {
  if (isRecording) {
    return null;
  }

  return (
    <div
      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border cursor-pointer hover:bg-muted/70 transition-colors"
      onClick={() => onToggle(!enabled)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(!enabled);
        }
      }}
      aria-label="Toggle live transcriptie"
    >
      <div className="space-y-0.5 pointer-events-none">
        <Label
          htmlFor="live-transcription-toggle"
          className="text-sm font-medium cursor-pointer"
        >
          Live transcriptie
        </Label>
        <p className="text-sm text-muted-foreground">
          Transcribeer gesproken tekst live tijdens opname
        </p>
      </div>
      <div className="pointer-events-none">
        <Switch id="live-transcription-toggle" checked={enabled} />
      </div>
    </div>
  );
}

