"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { KnowledgeDocumentDto } from "@/server/dto/knowledge-base.dto";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteKnowledgeDocumentAction } from "../actions/delete-document";

interface DeleteKnowledgeDocumentDialogProps {
  document: KnowledgeDocumentDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteKnowledgeDocumentDialog({
  document,
  open,
  onOpenChange,
  onSuccess,
}: DeleteKnowledgeDocumentDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setConfirmationText("");
      setError(null);
    }
  }, [open]);

  const handleDelete = async () => {
    if (confirmationText !== "DELETE" && confirmationText !== document.title) {
      setError(
        'Please type "DELETE" or the exact document title to confirm deletion'
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await deleteKnowledgeDocumentAction({
        id: document.id,
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

      toast.success(`Document "${document.title}" deleted successfully`);
      onSuccess?.();
      onOpenChange(false);
      setConfirmationText("");
      router.refresh();
    } catch (error) {
      console.error("Error deleting document:", error);
      const errorMessage = "Failed to delete document";
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
          <DialogTitle>Delete Knowledge Document</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{document.title}"? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type "DELETE" or the document title "{document.title}" to confirm:
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
            disabled={
              isLoading ||
              (confirmationText !== "DELETE" &&
                confirmationText !== document.title)
            }
          >
            {isLoading ? "Deleting..." : "Delete Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

