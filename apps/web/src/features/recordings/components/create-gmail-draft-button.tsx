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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("recordings");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState(
    t("gmail.emailSubjectDefault", { title: recordingTitle }),
  );
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
      toast.success(t("gmail.draftCreated"));
      setDraftUrl(result.data.draftUrl);
    } else {
      toast.error(result.serverError || t("gmail.draftFailed"));
    }

    setLoading(false);
  }

  function handleClose() {
    setOpen(false);
    setDraftUrl(null);
    setSubject(t("gmail.emailSubjectDefault", { title: recordingTitle }));
    setAdditionalContent("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>
        <Mail className="h-4 w-4" />
        {showLabel && (
          <span className="ml-2">{t("gmail.createEmailDraft")}</span>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("gmail.createGmailDraft")}</DialogTitle>
          <DialogDescription>
            {t("gmail.gmailDraftDescription")}
          </DialogDescription>
        </DialogHeader>

        {!draftUrl ? (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("gmail.recordingLabel")}</Label>
                <div className="text-sm text-muted-foreground font-medium">
                  {recordingTitle}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">{t("gmail.emailSubject")}</Label>
                <Input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={loading}
                  placeholder={t("gmail.emailSubjectDefault", { title: "..." })}
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
                  placeholder={t("gmail.additionalContentPlaceholder")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("gmail.additionalContentHint")}
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
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
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
                    {t("gmail.draftCreatedTitle")}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    {t("gmail.draftSaved")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <a
                      href={draftUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                  nativeButton={false}
                  className="gap-2"
                >
                  {t("gmail.openInGmail")}
                  <ExternalLink className="h-3 w-3" />
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
