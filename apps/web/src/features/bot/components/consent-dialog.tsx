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

interface ConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

/**
 * Consent dialog component for bot enablement
 * Explains bot behavior and requires user acceptance
 */
export function ConsentDialog({
  open,
  onOpenChange,
  onAccept,
}: ConsentDialogProps) {
  const handleAccept = () => {
    onAccept();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Enable Meeting Bot</DialogTitle>
          <DialogDescription>
            Before enabling the bot, please review the following information:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">What the bot does:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
              <li>Automatically joins your Google Meet meetings</li>
              <li>Records the meeting audio and video</li>
              <li>Processes recordings for AI insights and summaries</li>
            </ul>
          </div>
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Important:</p>
            <p className="text-sm text-muted-foreground">
              By enabling the bot, you consent to automatic recording of your
              meetings. Recordings will be processed using AI to generate
              transcripts, summaries, and action items.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAccept}>I Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
