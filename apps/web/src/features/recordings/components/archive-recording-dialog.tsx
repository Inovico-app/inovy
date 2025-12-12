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
  onOpenChange?: (open: boolean) => void;
}

export function ArchiveRecordingDialog({
  recordingId,
  recordingTitle,
  isArchived,
  variant = "outline",
  onOpenChange,
}: ArchiveRecordingDialogProps) {
  const router = useRouter();
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
    }
  };

  return (
    <Dialog open>
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
            onClick={() => onOpenChange?.(false)}
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

