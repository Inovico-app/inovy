interface HelpTextProps {
  isRecording: boolean;
  isSaving: boolean;
  liveTranscriptionEnabled: boolean;
}

export function HelpText({
  isRecording,
  isSaving,
  liveTranscriptionEnabled,
}: HelpTextProps) {
  if (isRecording || isSaving) {
    return null;
  }

  return (
    <div className="text-center text-sm text-muted-foreground">
      <p>Klik op de microfoon knop om te beginnen met opnemen</p>
      {liveTranscriptionEnabled && (
        <p className="text-xs mt-1">
          Live transcriptie wordt automatisch gestart
        </p>
      )}
    </div>
  );
}

