"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useOrganizationUsersQuery } from "@/features/tasks/hooks/use-organization-users-query";
import { Edit2 } from "lucide-react";
import { useMemo, useState } from "react";
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
  currentUserId?: string | null;
  textColor?: string;
  recordingId: string;
}

export function SpeakerLabel({
  speakerNumber,
  customName,
  currentUserId,
  textColor,
  recordingId,
}: SpeakerLabelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: users = [] } = useOrganizationUsersQuery();

  // Get speaker display info
  const speakerInfo = useMemo(() => {
    const defaultName = `Spreker ${speakerNumber + 1}`;

    if (currentUserId) {
      const user = users.find((u) => u.id === currentUserId);
      if (user) {
        const fullName = [user.given_name, user.family_name]
          .filter(Boolean)
          .join(" ");
        return {
          name: fullName || user.email || customName || defaultName,
          userId: user.id,
          email: user.email,
        };
      }
    }

    return {
      name: customName || defaultName,
      userId: null,
      email: null,
    };
  }, [speakerNumber, customName, currentUserId, users]);

  const displayName = speakerInfo.name;

  // Validate textColor against whitelist
  const safeTextColor =
    textColor && (ALLOWED_TEXT_COLORS as readonly string[]).includes(textColor)
      ? textColor
      : "";

  // Get user initials for avatar fallback
  const userInitials = useMemo(() => {
    if (speakerInfo.userId && speakerInfo.name) {
      return speakerInfo.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .filter((char) => char !== undefined)
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return (speakerNumber + 1).toString();
  }, [speakerInfo.userId, speakerInfo.name, speakerNumber]);

  return (
    <>
      <div className="flex items-center gap-2">
        {speakerInfo.userId && (
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
        currentName={customName}
        currentUserId={currentUserId}
        recordingId={recordingId}
      />
    </>
  );
}

