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
import { Loader2 } from "lucide-react";

interface RemoveBotConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  meetingTitle?: string;
  isRemoving?: boolean;
}

/**
 * Confirmation dialog for removing a bot from a meeting
 * Used in meetings UI and US-011 meeting details modal
 *
 * The parent owns isRemoving and onOpenChange. When the user confirms,
 * onConfirm is called to trigger the async removal. The parent should
 * close the dialog (via onOpenChange(false)) in the removal's success
 * callback so that isRemoving can display before the dialog closes.
 */
export function RemoveBotConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  meetingTitle,
  isRemoving = false,
}: RemoveBotConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Remove Bot from Meeting</DialogTitle>
          <DialogDescription>
            {meetingTitle
              ? `Remove the recording bot from "${meetingTitle}"?`
              : "Remove the recording bot from this meeting?"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">What happens when you remove the bot</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
              <li>The bot will not join the meeting</li>
              <li>If the bot is already in the meeting, it will leave</li>
              <li>No new recording will be created for this meeting</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRemoving}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <>
                <Loader2
                  className="h-4 w-4 mr-2 animate-spin"
                  aria-hidden={true}
                />
                Removing...
              </>
            ) : (
              "Remove Bot"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
