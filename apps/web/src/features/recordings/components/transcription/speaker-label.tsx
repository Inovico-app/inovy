"use client";

import { Badge } from "@/components/ui/badge";
import { Edit2 } from "lucide-react";
import { useState } from "react";
import { EditSpeakerNameDialog } from "./edit-speaker-name-dialog";

// Whitelist of allowed color classes to prevent XSS
const ALLOWED_TEXT_COLORS = [
  "text-blue-600 dark:text-blue-400",
  "text-green-600 dark:text-green-400",
  "text-purple-600 dark:text-purple-400",
  "text-amber-600 dark:text-amber-400",
  "text-pink-600 dark:text-pink-400",
  "text-red-600 dark:text-red-400",
  "text-cyan-600 dark:text-cyan-400",
  "text-orange-600 dark:text-orange-400",
] as const;

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
  const displayName = customName ?? `Spreker ${speakerNumber + 1}`;

  // Validate textColor against whitelist
  const safeTextColor =
    textColor && (ALLOWED_TEXT_COLORS as readonly string[]).includes(textColor)
      ? textColor
      : "";

  return (
    <>
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className={`text-xs ${safeTextColor}`}
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

