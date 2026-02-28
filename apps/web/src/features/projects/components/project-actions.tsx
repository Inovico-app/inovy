"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChatButton } from "@/features/chat/components/chat-button";
import { RecordingActionsDropdown } from "@/features/recordings/components/recording-actions-dropdown";
import {
  ArchiveIcon,
  MoreVerticalIcon,
  PencilIcon,
  SettingsIcon,
  TrashIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { ArchiveProjectDialog } from "./archive-project-dialog";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { EditProjectModal } from "./edit-project-modal";

interface ProjectActionsProps {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  isArchived: boolean;
  recordingCount: number;
}

/**
 * Renders a compact action bar for a project with action buttons, a "More" menu, and modal/dialog portals.
 *
 * The bar includes: Ask AI chat, recording actions, and a More Actions dropdown (Edit, Archive/Unarchive, Settings, Delete).
 * Edit, Archive/Unarchive, and Delete open their corresponding modal/dialog portals which are rendered conditionally.
 *
 * @param projectId - The project's unique identifier used for actions and navigation
 * @param projectName - The project's display name shown in dialogs and passed to modals
 * @param projectDescription - The project's current description value
 * @param isArchived - Whether the project is currently archived; controls archive menu label and dialog behavior
 * @param recordingCount - Number of recordings in the project; passed to the delete confirmation dialog
 * @returns The React element containing the project action controls and any conditionally rendered modals/dialogs
 */
export function ProjectActions({
  projectId,
  projectName,
  projectDescription,
  isArchived,
  recordingCount,
}: ProjectActionsProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        {/* Ask AI Button */}
        <ChatButton projectId={projectId} projectName={projectName} />

        {/* Recording Actions Dropdown - hidden for archived projects */}
        {!isArchived && <RecordingActionsDropdown projectId={projectId} />}

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVerticalIcon className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Edit */}
            <DropdownMenuItem onClick={() => setShowEditModal(true)}>
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>

            {/* Archive/Unarchive */}
            <DropdownMenuItem onClick={() => setShowArchiveDialog(true)}>
              <ArchiveIcon className="h-4 w-4 mr-2" />
              {isArchived ? "Unarchive" : "Archive"}
            </DropdownMenuItem>

            {/* Settings */}
            <DropdownMenuItem asChild>
              <Link href={`/projects/${projectId}/settings` as Route}>
                <SettingsIcon className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </DropdownMenuItem>

            {/* Delete */}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialog/Modal Portals */}
      {showEditModal && (
        <EditProjectModal
          projectId={projectId}
          initialData={{
            name: projectName,
            description: projectDescription,
          }}
          variant="ghost"
          open={showEditModal}
          onOpenChange={setShowEditModal}
        />
      )}

      {showArchiveDialog && (
        <ArchiveProjectDialog
          projectId={projectId}
          projectName={projectName}
          isArchived={isArchived}
          variant="ghost"
          open={showArchiveDialog}
          onOpenChange={setShowArchiveDialog}
        />
      )}

      {showDeleteDialog && (
        <DeleteProjectDialog
          projectId={projectId}
          projectName={projectName}
          recordingCount={recordingCount}
          variant="ghost"
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
        />
      )}
    </>
  );
}

