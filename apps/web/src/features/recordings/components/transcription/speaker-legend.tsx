"use client";

import { useSpeakerList } from "@/features/recordings/hooks/use-speaker-list";
import { SpeakerLabel } from "./speaker-label";

interface SpeakerLegendProps {
  speakersDetected?: number;
  utterances?: Array<{ speaker?: number }>;
  speakerNames?: Record<string, string> | null;
  speakerUserIds?: Record<string, string> | null;
  recordingId: string;
}

/**
 * SpeakerLegend component displays all detected speakers in a legend format.
 * Shows each speaker with their label, allowing users to see and manage all speakers at once.
 * Always displays to allow manual assignment of speakers even when none are detected.
 */
export function SpeakerLegend({
  speakersDetected = 0,
  utterances,
  speakerNames,
  speakerUserIds,
  recordingId,
}: SpeakerLegendProps) {
  const speakers = useSpeakerList({
    speakersDetected,
    utterances,
    speakerNames,
    speakerUserIds,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">Sprekers</span>
        <span className="text-xs text-muted-foreground">
          ({speakers.length} {speakers.length === 1 ? "spreker" : "sprekers"})
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
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
