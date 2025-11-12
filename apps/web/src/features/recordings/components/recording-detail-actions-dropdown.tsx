"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserRole } from "@/hooks/use-user-role";
import type { RecordingDto } from "@/server/dto";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowRightIcon,
  EditIcon,
  MoreVerticalIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { ArchiveRecordingDialog } from "./archive-recording-dialog";
import { DeleteRecordingDialog } from "./delete-recording-dialog";
import { EditRecordingModal } from "./edit-recording-modal";
import { MoveRecordingDialog } from "./move-recording-dialog";

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: userRole } = useUserRole();

  // Check if user has permission to move recordings
  // Manager, Admin, and SuperAdmin roles have recordings:update permission
  const canMoveRecording =
    userRole?.roles?.some((role) =>
      ["manager", "admin", "superadmin"].includes(role.toLowerCase())
    ) ?? false;

  const isArchived = recording.status === "archived";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreVerticalIcon className="h-4 w-4" />
            <span className="sr-only">Open actions menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Edit Recording */}
          <DropdownMenuItem onClick={() => setShowEditModal(true)}>
            <EditIcon className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>

          {/* Move to Project - Only for Manager+ roles */}
          {canMoveRecording && (
            <DropdownMenuItem onClick={() => setShowMoveDialog(true)}>
              <ArrowRightIcon className="h-4 w-4 mr-2" />
              Move to Project
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Archive/Unarchive Recording */}
          <DropdownMenuItem onClick={() => setShowArchiveDialog(true)}>
            {isArchived ? (
              <>
                <ArchiveRestoreIcon className="h-4 w-4 mr-2" />
                Unarchive
              </>
            ) : (
              <>
                <ArchiveIcon className="h-4 w-4 mr-2" />
                Archive
              </>
            )}
          </DropdownMenuItem>

          {/* Delete Recording */}
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2Icon className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals/Dialogs */}
      {showEditModal && (
        <EditRecordingModal
          recording={recording}
          open={showEditModal}
          onOpenChange={setShowEditModal}
        />
      )}

      {showMoveDialog && (
        <MoveRecordingDialog
          recording={recording}
          currentProjectId={projectId}
          open={showMoveDialog}
          onOpenChange={setShowMoveDialog}
        />
      )}

      {showArchiveDialog && (
        <ArchiveRecordingDialog
          recordingId={recording.id}
          recordingTitle={recording.title}
          isArchived={isArchived}
          open={showArchiveDialog}
          onOpenChange={setShowArchiveDialog}
        />
      )}

      {showDeleteDialog && (
        <DeleteRecordingDialog
          recordingId={recording.id}
          recordingTitle={recording.title}
          projectId={projectId}
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
        />
      )}
    </>
  );
}

