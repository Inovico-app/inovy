"use client";

import { Loader2Icon, Trash2Icon } from "lucide-react";
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
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { deleteRecordingAction } from "../actions/delete-recording";

interface DeleteRecordingDialogProps {
  recordingId: string;
  recordingTitle: string;
  projectId: string;
  variant?: "default" | "outline" | "ghost" | "destructive";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeleteRecordingDialog({
  recordingId,
  recordingTitle,
  projectId,
  variant = "destructive",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: DeleteRecordingDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled or uncontrolled state
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmationText !== "DELETE" && confirmationText !== recordingTitle) {
      setError(
        'Please type "DELETE" or the exact recording title to confirm deletion'
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await deleteRecordingAction({
        recordingId,
        confirmationText,
      });

      if (result?.serverError) {
        setError(result.serverError);
        toast.error(result.serverError);
        return;
      }

      if (result?.validationErrors) {
        const firstFieldErrors = Object.values(result.validationErrors)[0];
        const firstError = Array.isArray(firstFieldErrors)
          ? firstFieldErrors[0]
          : firstFieldErrors?._errors?.[0];
        setError(firstError ?? "Validation failed");
        toast.error(firstError ?? "Validation failed");
        return;
      }

      toast.success(`Recording "${recordingTitle}" deleted successfully`);
      setOpen(false);
      router.refresh();
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error deleting recording:", error);
      const errorMessage = "Failed to delete recording";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmationText("");
      setError(null);
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <Trash2Icon className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Delete Recording Permanently?
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p className="font-medium">
              This action <strong>CANNOT</strong> be undone. This will
              permanently delete:
            </p>
            <ul className="list-disc list-inside pl-2 space-y-1">
              <li>The recording file from storage</li>
              <li>All transcriptions</li>
              <li>All AI-generated summaries</li>
              <li>All extracted action items and tasks</li>
            </ul>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Please type <strong>DELETE</strong> or the exact recording title
              to confirm:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => {
                setConfirmationText(e.target.value);
                setError(null);
              }}
              placeholder={`Type "DELETE" or "${recordingTitle}"`}
              disabled={isLoading}
              className={error ? "border-destructive" : ""}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Recording to be deleted:
            </p>
            <p className="text-sm mt-1 font-mono break-all">{recordingTitle}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={
              isLoading ||
              (confirmationText !== "DELETE" &&
                confirmationText !== recordingTitle)
            }
            variant="destructive"
          >
            {isLoading && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
            Delete Permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

