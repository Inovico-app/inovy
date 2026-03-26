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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("recordings");
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

      toast.success(t("actions.archiveSuccess", { title: recordingTitle }));
      router.refresh();
    } catch (error) {
      console.error("Error archiving recording:", error);
      toast.error(t("actions.archiveFailed"));
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

      toast.success(t("actions.restoreSuccess", { title: recordingTitle }));
      router.refresh();
    } catch (error) {
      console.error("Error unarchiving recording:", error);
      toast.error(t("actions.restoreFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open>
      <DialogTrigger render={<Button variant={variant} size="sm" />}>
        {isArchived ? (
          <>
            <ArchiveRestoreIcon className="h-4 w-4 mr-2" />
            {t("actions.restore")}
          </>
        ) : (
          <>
            <ArchiveIcon className="h-4 w-4 mr-2" />
            {t("actions.archive")}
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isArchived
              ? t("actions.restoreRecording")
              : t("actions.archiveRecording")}
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
            {isArchived ? t("actions.restore") : t("actions.archive")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
