"use client";

import { useSpeakerList } from "@/features/recordings/hooks/use-speaker-list";
import { SpeakerLabel } from "./speaker-label";

interface SpeakerLegendProps {
  speakersDetected?: number;
  speakerNames?: Record<string, string> | null;
  speakerUserIds?: Record<string, string> | null;
  recordingId: string;
}

/**
 * SpeakerLegend component displays all detected speakers in a legend format.
 * Shows each speaker with their label, allowing users to see and manage all speakers at once.
 * Only displays when speakers are detected.
 */
export function SpeakerLegend({
  speakersDetected = 0,
  speakerNames,
  speakerUserIds,
  recordingId,
}: SpeakerLegendProps) {
  const speakers = useSpeakerList({
    speakersDetected,
    speakerNames,
    speakerUserIds,
  });

  // Don't render if no speakers detected
  if (speakersDetected <= 0 || speakers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Sprekers:</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {speakers.map((speaker) => (
          <SpeakerLabel
            key={speaker.number}
            speakerNumber={speaker.number}
            recordingId={recordingId}
            speakerNames={speakerNames}
            speakerUserIds={speakerUserIds}
          />
        ))}
      </div>
    </div>
  );
}
