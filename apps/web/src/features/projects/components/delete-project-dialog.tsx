"use client";

import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Checkbox } from "../../../components/ui/checkbox";
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
import { deleteProjectAction } from "../actions/delete-project";

interface DeleteProjectDialogProps {
  projectId: string;
  projectName: string;
  recordingCount?: number;
  variant?: "default" | "outline" | "ghost" | "destructive";
  triggerContent?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Render a confirmation dialog that requires explicit confirmation to permanently delete a project.
 *
 * The dialog validates user input (must type `DELETE` or the exact project name and check the confirmation checkbox),
 * shows inline and toast feedback for errors and success, calls the delete action, and navigates back to the projects list on success.
 *
 * @param projectId - ID of the project to delete
 * @param projectName - Exact project name used as an alternative confirmation token
 * @param recordingCount - Number of recordings in the project (defaults to 0); used for messaging and warnings
 * @param variant - Visual button variant for the trigger when `triggerContent` is not provided; defaults to `"destructive"`
 * @param triggerContent - Optional custom trigger element to open the dialog; if omitted a small "Delete Project" button is rendered
 * @param open - Controlled open state for the dialog; when provided the component becomes controlled
 * @param onOpenChange - Optional controlled state change handler invoked with the new open state
 * @returns The JSX element for the delete project confirmation dialog
 */
export function DeleteProjectDialog({
  projectId,
  projectName,
  recordingCount = 0,
  variant = "destructive",
  triggerContent,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: DeleteProjectDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setConfirmationText("");
      setConfirmCheckbox(false);
      setError(null);
    }
  }, [open]);

  const handleDelete = async () => {
    if (confirmationText !== "DELETE" && confirmationText !== projectName) {
      setError(
        'Please type "DELETE" or the exact project name to confirm deletion'
      );
      return;
    }

    if (!confirmCheckbox) {
      setError("You must confirm that you understand the consequences");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await deleteProjectAction({
        projectId,
        confirmationText,
        confirmCheckbox,
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

      toast.success(`Project "${projectName}" deleted successfully`);
      setOpen(false);
      router.push("/projects");
      router.refresh();
    } catch (error) {
      console.error("Error deleting project:", error);
      const errorMessage = "Failed to delete project";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isDeleteDisabled =
    isLoading ||
    !confirmCheckbox ||
    (confirmationText !== "DELETE" && confirmationText !== projectName);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerContent ?? (
          <Button variant={variant} size="sm">
            <Trash2Icon className="h-4 w-4 mr-2" />
            Delete Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-destructive text-xl">
            Delete Project Permanently?
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p className="text-base font-medium text-foreground">
              This action <strong className="text-destructive">CANNOT</strong> be
              undone. This will permanently delete:
            </p>
            <ul className="list-disc list-inside pl-2 space-y-2 text-sm">
              <li>
                The project <strong>"{projectName}"</strong>
              </li>
              <li>
                <strong>{recordingCount}</strong> recording
                {recordingCount !== 1 ? "s" : ""} and all associated files
              </li>
              <li>All transcriptions and transcription data</li>
              <li>All AI-generated summaries and insights</li>
              <li>All extracted action items and tasks</li>
            </ul>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-sm font-medium">
              Type <strong>DELETE</strong> or the exact project name to confirm:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => {
                setConfirmationText(e.target.value);
                setError(null);
              }}
              placeholder={`Type "DELETE" or "${projectName}"`}
              disabled={isLoading}
              className={error ? "border-destructive" : ""}
            />
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start space-x-3 space-y-0">
            <Checkbox
              id="confirm-checkbox"
              checked={confirmCheckbox}
              onCheckedChange={(checked) => {
                setConfirmCheckbox(checked === true);
                setError(null);
              }}
              disabled={isLoading}
            />
            <div className="space-y-1 leading-none">
              <Label
                htmlFor="confirm-checkbox"
                className="text-sm font-medium cursor-pointer"
              >
                I understand that {recordingCount} recording
                {recordingCount !== 1 ? "s" : ""} and all associated data will
                be permanently deleted
              </Label>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          {/* Warning Box */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-4">
            <p className="text-sm text-destructive font-semibold mb-2">
              ⚠️ Warning: Permanent Deletion
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Project to be deleted:
            </p>
            <p className="text-sm font-mono break-all bg-background/50 p-2 rounded border border-destructive/20">
              {projectName}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {recordingCount} recording{recordingCount !== 1 ? "s" : ""} will
              be removed from storage
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleteDisabled}
            variant="destructive"
            className="min-w-[160px]"
          >
            {isLoading && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
            Delete Permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
