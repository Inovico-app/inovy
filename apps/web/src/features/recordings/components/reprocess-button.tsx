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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Determine if reprocessing is allowed
  const isDisabled = isArchived || workflowStatus === "running";
  const disabledReason = isArchived
    ? "Cannot reprocess archived recordings"
    : workflowStatus === "running"
      ? "Recording is currently being processed"
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
        toast.success("Reprocessing started successfully", {
          description:
            "AI insights are being regenerated. You'll receive a notification when complete.",
        });
        router.refresh();
      }
    } catch (error) {
      console.error("Error reprocessing recording:", error);
      toast.error("Failed to start reprocessing");
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          disabled={isDisabled}
          title={disabledReason ?? undefined}
        >
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Reprocess
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reprocess AI Insights?</DialogTitle>
          <DialogDescription>
            This will regenerate the transcription, summary, and tasks for "
            {recordingTitle}". Your existing insights will be backed up before
            reprocessing.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            <strong>What will happen:</strong>
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Current insights will be safely backed up</li>
            <li>AI will re-analyze the recording with latest models</li>
            <li>Summary and tasks will be regenerated</li>
            <li>You'll receive a notification when complete</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            <strong>Note:</strong> This process may take a few minutes depending
            on the recording length.
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
            {isLoading ? "Starting..." : "Reprocess"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

