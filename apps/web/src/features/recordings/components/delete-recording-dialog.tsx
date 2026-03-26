"use client";

import { Loader2Icon, Trash2Icon } from "lucide-react";
import type { Route } from "next";
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
import { useTranslations } from "next-intl";

interface DeleteRecordingDialogProps {
  recordingId: string;
  recordingTitle: string;
  projectId: string;
  variant?: "default" | "outline" | "ghost" | "destructive";
  onOpenChange?: (open: boolean) => void;
}

export function DeleteRecordingDialog({
  recordingId,
  recordingTitle,
  projectId,
  variant = "destructive",
  onOpenChange,
}: DeleteRecordingDialogProps) {
  const t = useTranslations("recordings");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmationText !== "DELETE" && confirmationText !== recordingTitle) {
      setError(t("actions.deleteConfirmError"));
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
        setError(firstError ?? t("actions.validationFailed"));
        toast.error(firstError ?? "Validation failed");
        return;
      }

      toast.success(t("actions.deleteSuccess", { title: recordingTitle }));
      router.refresh();
      router.push(`/projects/${projectId}` as Route);
    } catch (error) {
      console.error("Error deleting recording:", error);
      const errorMessage = t("actions.deleteFailed");
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
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant={variant} size="sm" />}>
        <Trash2Icon className="h-4 w-4 mr-2" />
        {t("actions.deleteRecording")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            {t("actions.deleteTitle")}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p className="font-medium">
              This action <strong>CANNOT</strong> be undone. This will
              permanently delete:
            </p>
            <ul className="list-disc list-inside pl-2 space-y-1">
              <li>{t("actions.deleteItem1")}</li>
              <li>{t("actions.deleteItem2")}</li>
              <li>{t("actions.deleteItem3")}</li>
              <li>{t("actions.deleteItem4")}</li>
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
              placeholder={t("actions.deleteConfirmPlaceholder", {
                title: recordingTitle,
              })}
              disabled={isLoading}
              className={error ? "border-destructive" : ""}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive font-medium">
              ⚠️ {t("actions.recordingToDelete")}
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
            {t("actions.deletePermanently")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
