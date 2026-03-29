"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveMemberRole } from "@/hooks/use-active-member-role";
import type { RecordingDto } from "@/server/dto/recording.dto";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowRightIcon,
  EditIcon,
  MoreVerticalIcon,
  Trash2Icon,
} from "lucide-react";
import { Activity, useState } from "react";
import { ArchiveRecordingDialog } from "./archive-recording-dialog";
import { DeleteRecordingDialog } from "./delete-recording-dialog";
import { EditRecordingModal } from "./edit-recording-modal";
import { MoveRecordingDialog } from "./move-recording-dialog";
import { useTranslations } from "next-intl";

interface RecordingDetailActionsDropdownProps {
  recording: RecordingDto;
  projectId: string;
}

/**
 * Dropdown menu for recording detail page actions
 * Includes Edit, Move, Archive, and Delete actions
 * Move action only visible to users with recordings:update permission (Manager+)
 */
export function RecordingDetailActionsDropdown({
  recording,
  projectId,
}: RecordingDetailActionsDropdownProps) {
  const t = useTranslations("recordings");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: memberRole } = useActiveMemberRole();

  // Check if user has permission to move recordings
  // Manager, Admin, and SuperAdmin roles have recordings:update permission
  const canMoveRecording =
    memberRole?.roles?.some((role) =>
      ["manager", "admin", "superadmin"].includes(role.toLowerCase()),
    ) ?? false;

  const isArchived = recording.status === "archived";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
          <MoreVerticalIcon className="h-4 w-4" />
          <span className="sr-only">{t("actions.openActionsMenu")}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Edit Recording */}
          <DropdownMenuItem onClick={() => setShowEditModal(true)}>
            <EditIcon className="h-4 w-4 mr-2" />
            {t("actions.edit")}
          </DropdownMenuItem>

          {/* Move to Project - Only for Manager+ roles */}
          {canMoveRecording && (
            <DropdownMenuItem onClick={() => setShowMoveDialog(true)}>
              <ArrowRightIcon className="h-4 w-4 mr-2" />
              {t("actions.moveToProject")}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Archive/Unarchive Recording */}
          <DropdownMenuItem onClick={() => setShowArchiveDialog(true)}>
            {isArchived ? (
              <>
                <ArchiveRestoreIcon className="h-4 w-4 mr-2" />
                {t("actions.unarchive")}
              </>
            ) : (
              <>
                <ArchiveIcon className="h-4 w-4 mr-2" />
                {t("actions.archive")}
              </>
            )}
          </DropdownMenuItem>

          {/* Delete Recording */}
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2Icon className="h-4 w-4 mr-2" />
            {t("actions.deleteRecording")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals/Dialogs */}
      <Activity
        name="edit-recording-modal"
        mode={showEditModal ? "visible" : "hidden"}
      >
        <EditRecordingModal
          recording={recording}
          onOpenChange={setShowEditModal}
        />
      </Activity>

      <Activity
        name="move-recording-dialog"
        mode={showMoveDialog ? "visible" : "hidden"}
      >
        <MoveRecordingDialog
          recording={recording}
          currentProjectId={projectId}
          onOpenChange={setShowMoveDialog}
        />
      </Activity>

      <Activity
        name="archive-recording-dialog"
        mode={showArchiveDialog ? "visible" : "hidden"}
      >
        <ArchiveRecordingDialog
          recordingId={recording.id}
          recordingTitle={recording.title}
          isArchived={isArchived}
          onOpenChange={setShowArchiveDialog}
        />
      </Activity>

      <Activity
        name="delete-recording-dialog"
        mode={showDeleteDialog ? "visible" : "hidden"}
      >
        <DeleteRecordingDialog
          recordingId={recording.id}
          recordingTitle={recording.title}
          projectId={projectId}
          onOpenChange={setShowDeleteDialog}
        />
      </Activity>
    </>
  );
}
