"use client";

import { Badge } from "@/components/ui/badge";
import { Edit2 } from "lucide-react";
import { useState } from "react";
import { EditSpeakerNameDialog } from "./edit-speaker-name-dialog";

interface SpeakerLabelProps {
  speakerNumber: number;
  customName?: string;
  textColor?: string;
  recordingId: string;
}

export function SpeakerLabel({
  speakerNumber,
  customName,
  textColor,
  recordingId,
}: SpeakerLabelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const displayName = customName || `Spreker ${speakerNumber + 1}`;

  return (
    <>
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className={`text-xs ${textColor}`}
          title="Klik om naam te wijzigen"
        >
          {displayName}
        </Badge>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted transition-colors"
          title="Naam wijzigen"
          aria-label={`Wijzig naam voor ${displayName}`}
        >
          <Edit2 className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
        </button>
      </div>
      <EditSpeakerNameDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        speakerNumber={speakerNumber}
        currentName={customName}
        recordingId={recordingId}
      />
    </>
  );
}

