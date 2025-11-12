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
import { archiveRecordingAction } from "../actions/archive-recording";
import { unarchiveRecordingAction } from "../actions/unarchive-recording";

interface ArchiveRecordingDialogProps {
  recordingId: string;
  recordingTitle: string;
  isArchived: boolean;
  variant?: "default" | "outline" | "ghost" | "destructive";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ArchiveRecordingDialog({
  recordingId,
  recordingTitle,
  isArchived,
  variant = "outline",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ArchiveRecordingDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled or uncontrolled state
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [isLoading, setIsLoading] = useState(false);

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      const result = await archiveRecordingAction({ recordingId });

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      toast.success(`Recording "${recordingTitle}" archived successfully`);
      router.refresh();
    } catch (error) {
      console.error("Error archiving recording:", error);
      toast.error("Failed to archive recording");
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  const handleUnarchive = async () => {
    setIsLoading(true);
    try {
      const result = await unarchiveRecordingAction({ recordingId });

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      toast.success(`Recording "${recordingTitle}" restored successfully`);
      router.refresh();
    } catch (error) {
      console.error("Error unarchiving recording:", error);
      toast.error("Failed to restore recording");
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          {isArchived ? (
            <>
              <ArchiveRestoreIcon className="h-4 w-4 mr-2" />
              Restore
            </>
          ) : (
            <>
              <ArchiveIcon className="h-4 w-4 mr-2" />
              Archive
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isArchived ? "Restore Recording?" : "Archive Recording?"}
          </DialogTitle>
          <DialogDescription>
            {isArchived ? (
              <>
                This will restore <strong>{recordingTitle}</strong> and make it
                active again.
              </>
            ) : (
              <>
                This will archive <strong>{recordingTitle}</strong>. Archived
                recordings won't appear in your main recording list, but will
                remain accessible via the Archived Recordings view.
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

