"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { createGmailDraft } from "../actions/create-gmail-draft";

interface CreateGmailDraftButtonProps {
  recordingId: string;
  recordingTitle: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function CreateGmailDraftButton({
  recordingId,
  recordingTitle,
  variant = "outline",
  size = "sm",
  showLabel = true,
}: CreateGmailDraftButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState(`Meeting Summary: ${recordingTitle}`);
  const [additionalContent, setAdditionalContent] = useState("");
  const [draftUrl, setDraftUrl] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);

    const result = await createGmailDraft({
      recordingId,
      subject: subject || undefined,
      additionalContent: additionalContent || undefined,
    });

    if (result.data) {
      toast.success("Gmail draft created successfully!");
      setDraftUrl(result.data.draftUrl);
    } else {
      toast.error(result.serverError || "Failed to create Gmail draft");
    }

    setLoading(false);
  }

  function handleClose() {
    setOpen(false);
    setDraftUrl(null);
    setSubject(`Meeting Summary: ${recordingTitle}`);
    setAdditionalContent("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Mail className="h-4 w-4" />
          {showLabel && <span className="ml-2">Create Email Draft</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Gmail Draft</DialogTitle>
          <DialogDescription>
            Create a Gmail draft with the meeting summary
          </DialogDescription>
        </DialogHeader>

        {!draftUrl ? (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Recording</Label>
                <div className="text-sm text-muted-foreground font-medium">
                  {recordingTitle}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={loading}
                  placeholder="Meeting Summary: ..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional">
                  Additional Content (Optional)
                </Label>
                <Textarea
                  id="additional"
                  rows={4}
                  value={additionalContent}
                  onChange={(e) => setAdditionalContent(e.target.value)}
                  disabled={loading}
                  placeholder="Add any additional notes or context..."
                />
                <p className="text-xs text-muted-foreground">
                  This will be added before the meeting summary
                </p>
              </div>

              <div className="rounded-lg border bg-blue-50 dark:bg-blue-950 p-3">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Note:</strong> The draft will include the recording
                  title, date, duration, and full summary. Recipients (To/CC)
                  are left blank for you to fill in.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Draft
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="py-4">
              <div className="rounded-lg border bg-green-50 dark:bg-green-950 p-4 text-center space-y-3">
                <div className="flex items-center justify-center">
                  <Mail className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Draft Created Successfully!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    The email draft has been saved to your Gmail drafts folder
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <a href={draftUrl} target="_blank" rel="noopener noreferrer">
                    Open in Gmail
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

