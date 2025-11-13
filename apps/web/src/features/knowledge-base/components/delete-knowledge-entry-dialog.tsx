"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteKnowledgeEntryAction } from "../actions/delete-entry";
import type { KnowledgeEntryDto } from "@/server/dto/knowledge-base.dto";

interface DeleteKnowledgeEntryDialogProps {
  entry: KnowledgeEntryDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteKnowledgeEntryDialog({
  entry,
  open,
  onOpenChange,
  onSuccess,
}: DeleteKnowledgeEntryDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmationText !== "DELETE" && confirmationText !== entry.term) {
      setError('Please type "DELETE" or the exact term to confirm deletion');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await deleteKnowledgeEntryAction({
        id: entry.id,
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

      toast.success(`Knowledge entry "${entry.term}" deleted successfully`);
      onSuccess?.();
      onOpenChange(false);
      setConfirmationText("");
      router.refresh();
    } catch (error) {
      console.error("Error deleting knowledge entry:", error);
      const errorMessage = "Failed to delete knowledge entry";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Knowledge Entry</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{entry.term}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type "DELETE" or the term "{entry.term}" to confirm:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => {
                setConfirmationText(e.target.value);
                setError(null);
              }}
              placeholder="DELETE"
              disabled={isLoading}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setConfirmationText("");
              setError(null);
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || (confirmationText !== "DELETE" && confirmationText !== entry.term)}
          >
            {isLoading ? "Deleting..." : "Delete Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

