"use client";

import { ArchiveIcon, ArchiveRestoreIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { archiveProjectAction } from "../actions/archive-project";
import { unarchiveProjectAction } from "../actions/unarchive-project";

interface ArchiveProjectDialogProps {
  projectId: string;
  projectName: string;
  isArchived: boolean;
  variant?: "default" | "outline" | "ghost" | "destructive";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Render a dialog that lets the user archive or restore a project, including the trigger button and confirmation UI.
 *
 * @param projectId - The unique identifier of the project to archive or restore.
 * @param projectName - The display name of the project shown in the dialog and toast messages.
 * @param isArchived - If `true`, the dialog shows restore actions; otherwise it shows archive actions.
 * @param variant - Button visual variant for the trigger (defaults to `"outline"`).
 * @param open - Optional controlled open state for the dialog.
 * @param onOpenChange - Optional controlled setter called when the dialog open state changes.
 * @returns The dialog React element containing the trigger button and confirmation content for archiving/restoring a project.
 */
export function ArchiveProjectDialog({
  projectId,
  projectName,
  isArchived,
  variant = "outline",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ArchiveProjectDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const [isLoading, setIsLoading] = useState(false);

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      const result = await archiveProjectAction({ projectId });

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      toast.success(`Project "${projectName}" archived successfully`);
      router.refresh();
      router.push("/projects");
    } catch (error) {
      console.error("Error archiving project:", error);
      toast.error("Failed to archive project");
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  const handleUnarchive = async () => {
    setIsLoading(true);
    try {
      const result = await unarchiveProjectAction({ projectId });

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      toast.success(`Project "${projectName}" restored successfully`);
      router.refresh();
    } catch (error) {
      console.error("Error unarchiving project:", error);
      toast.error("Failed to restore project");
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  const isControlled = controlledOpen !== undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button variant={variant} size="sm">
            {isArchived ? (
              <>
                <ArchiveRestoreIcon className="h-4 w-4 mr-2" />
                Restore Project
              </>
            ) : (
              <>
                <ArchiveIcon className="h-4 w-4 mr-2" />
                Archive Project
              </>
            )}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isArchived ? "Restore Project?" : "Archive Project?"}
          </DialogTitle>
          <DialogDescription>
            {isArchived ? (
              <>
                This will restore <strong>{projectName}</strong> and make it
                active again. All recordings will remain accessible.
              </>
            ) : (
              <>
                This will archive <strong>{projectName}</strong>. Archived
                projects won't appear in your main project list, but all
                recordings will remain accessible via the Archived Projects
                view.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (isArchived) {
                handleUnarchive();
              } else {
                handleArchive();
              }
            }}
            disabled={isLoading}
            variant={isArchived ? "default" : "destructive"}
          >
            {isLoading && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
            {isArchived ? "Restore" : "Archive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

