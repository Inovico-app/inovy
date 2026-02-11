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

interface AddBotConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  meetingTitle?: string;
}

/**
 * Consent dialog for adding a bot to a single meeting
 * Shorter copy than the global enable-bot dialog
 */
export function AddBotConsentDialog({
  open,
  onOpenChange,
  onAccept,
  meetingTitle,
}: AddBotConsentDialogProps) {
  const handleAccept = () => {
    onAccept();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Bot to Meeting</DialogTitle>
          <DialogDescription>
            {meetingTitle
              ? `Add a recording bot to "${meetingTitle}"?`
              : "Add a recording bot to this meeting?"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">The bot will:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
              <li>Join the Google Meet when it starts</li>
              <li>Record the meeting audio and video</li>
              <li>Process the recording for transcripts and AI insights</li>
            </ul>
          </div>
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Recording consent</p>
            <p className="text-sm text-muted-foreground">
              By adding the bot, you consent to recording this meeting.
              Recordings will be processed using AI to generate transcripts,
              summaries, and action items.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAccept}>Add Bot</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
