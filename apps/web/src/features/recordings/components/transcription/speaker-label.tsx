"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useOrganizationUsersQuery } from "@/features/tasks/hooks/use-organization-users-query";
import { Edit2 } from "lucide-react";
import { useState } from "react";
import { EditSpeakerNameDialog } from "./edit-speaker-name-dialog";
import { getSpeakerInfo, getUserInitials } from "./speaker-helpers";
import {
  getSpeakerTextColor,
  isValidSpeakerTextColor,
} from "@/features/recordings/lib/speaker-colors";

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
  const { data: users = [] } = useOrganizationUsersQuery();

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

  // Validate textColor against whitelist or use default speaker color
  const safeTextColor =
    textColor && isValidSpeakerTextColor(textColor)
      ? textColor
      : getSpeakerTextColor(speakerNumber);

  // Use currentUserId from props if provided, otherwise use speakerInfo.userId
  // This allows overriding the userId for specific use cases
  const effectiveUserId = currentUserId ?? speakerInfo.userId;
  
  // Use customName prop if provided, otherwise use speakerNames from the recording
  // This ensures the dialog shows the correct current name
  const effectiveCustomName = customName ?? speakerNames?.[speakerNumber.toString()];

  return (
    <>
      <div className="flex items-center gap-2">
        {effectiveUserId && (
          <Avatar className="flex-shrink-0 w-6 h-6">
            <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
          </Avatar>
        )}
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
        currentName={effectiveCustomName}
        currentUserId={effectiveUserId}
        recordingId={recordingId}
      />
    </>
  );
}

