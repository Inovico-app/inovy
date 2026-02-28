"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useOrganizationMembers } from "@/features/tasks/hooks/use-organization-members";
import { Edit2 } from "lucide-react";
import { useState } from "react";
import { EditSpeakerNameDialog } from "./edit-speaker-name-dialog";
import { getSpeakerInfo, getUserInitials } from "./speaker-helpers";
import {
  getSpeakerColors,
  isValidSpeakerTextColor,
} from "@/features/recordings/lib/speaker-colors";
import { cn } from "@/lib/utils";

interface SpeakerLabelProps {
  speakerNumber: number;
  customName?: string;
  currentUserId?: string | null;
  textColor?: string;
  recordingId: string;
  speakerNames?: Record<string, string> | null;
  speakerUserIds?: Record<string, string> | null;
}

export function SpeakerLabel({
  speakerNumber,
  customName,
  currentUserId,
  textColor,
  recordingId,
  speakerNames,
  speakerUserIds,
}: SpeakerLabelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { members: users = [] } = useOrganizationMembers();

  // Get speaker display info using centralized helper
  const speakerInfo = getSpeakerInfo(
    speakerNumber,
    speakerNames,
    speakerUserIds,
    users
  );

  // Use customName prop if provided (for backward compatibility), otherwise use speakerInfo.name
  // speakerInfo.name already handles speakerNames, speakerUserIds, and default names
  const displayName = customName ?? speakerInfo.name;

  // Get user initials using centralized helper
  const userInitials = getUserInitials(speakerInfo, speakerNumber);

  // Get speaker colors for consistent styling
  const speakerColors = getSpeakerColors(speakerNumber);
  
  // Use currentUserId from props if provided, otherwise use speakerInfo.userId
  // This allows overriding the userId for specific use cases
  const effectiveUserId = currentUserId ?? speakerInfo.userId;
  
  // Use customName prop if provided, otherwise use speakerNames from the recording
  // This ensures the dialog shows the correct current name
  const effectiveCustomName = customName ?? speakerNames?.[speakerNumber.toString()];

  return (
    <>
      <button
        onClick={() => setIsDialogOpen(true)}
        className={cn(
          "group relative flex items-center gap-2.5 px-3.5 py-2 rounded-lg",
          "border transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // Background with subtle color tint
          speakerColors.badgeBg,
          "border-border/40 hover:border-border/60",
          "hover:shadow-md hover:scale-[1.02]",
          "active:scale-[0.98]"
        )}
        title="Klik om spreker te bewerken"
        aria-label={`Bewerk spreker ${displayName}`}
      >
        {effectiveUserId && (
          <Avatar className="flex-shrink-0 w-7 h-7 ring-2 ring-background/50">
            <AvatarFallback
              className={cn(
                "text-xs font-semibold",
                speakerColors.avatar
              )}
            >
              {userInitials}
            </AvatarFallback>
          </Avatar>
        )}
        {!effectiveUserId && (
          <div
            className={cn(
              "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
              "text-xs font-semibold ring-2 ring-background/50",
              speakerColors.avatar
            )}
          >
            {speakerNumber + 1}
          </div>
        )}
        <span
          className={cn(
            "text-sm font-semibold",
            speakerColors.text,
            "group-hover:opacity-90 transition-opacity"
          )}
        >
          {displayName}
        </span>
        <Edit2 className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground/70 transition-colors opacity-0 group-hover:opacity-100 ml-0.5" />
      </button>
      <EditSpeakerNameDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        speakerNumber={speakerNumber}
        currentName={effectiveCustomName}
        currentUserId={effectiveUserId}
        recordingId={recordingId}
      />
    </>
  );
}

