"use client";

import { RefreshCwIcon, Loader2Icon } from "lucide-react";
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
import { reprocessRecordingAction } from "../actions/reprocess-recording";
import type { WorkflowStatus } from "@/server/db/schema/recordings";
import { useTranslations } from "next-intl";

interface ReprocessButtonProps {
  recordingId: string;
  recordingTitle: string;
  workflowStatus: WorkflowStatus;
  isArchived?: boolean;
  variant?: "default" | "outline" | "ghost" | "destructive";
}

export function ReprocessButton({
  recordingId,
  recordingTitle,
  workflowStatus,
  isArchived = false,
  variant = "outline",
}: ReprocessButtonProps) {
  const t = useTranslations("recordings");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Determine if reprocessing is allowed
  const isDisabled = isArchived || workflowStatus === "running";
  const disabledReason = isArchived
    ? t("actions.cannotReprocessArchived")
    : workflowStatus === "running"
      ? t("actions.currentlyProcessing")
      : null;

  const handleReprocess = async () => {
    setIsLoading(true);
    try {
      const result = await reprocessRecordingAction({ recordingId });

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      if (result?.data) {
        toast.success(t("actions.reprocessSuccess"), {
          description: t("actions.reprocessSuccessDescription"),
        });
        router.refresh();
      }
    } catch (error) {
      console.error("Error reprocessing recording:", error);
      toast.error(t("actions.reprocessFailed"));
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={variant}
            size="sm"
            disabled={isDisabled}
            title={disabledReason ?? undefined}
          />
        }
      >
        <RefreshCwIcon className="h-4 w-4 mr-2" />
        {t("actions.reprocess")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("actions.reprocessTitle")}</DialogTitle>
          <DialogDescription>
            {t("actions.reprocessDescription", { title: recordingTitle })}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            <strong>{t("actions.reprocessWhatHappens")}</strong>
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>{t("actions.reprocessItem1")}</li>
            <li>{t("actions.reprocessItem2")}</li>
            <li>{t("actions.reprocessItem3")}</li>
            <li>{t("actions.reprocessItem4")}</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            <strong>{t("actions.reprocessNote")}</strong>{" "}
            {t("actions.reprocessNoteText")}
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleReprocess} disabled={isLoading}>
            {isLoading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading
              ? t("actions.reprocessStarting")
              : t("actions.reprocess")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
