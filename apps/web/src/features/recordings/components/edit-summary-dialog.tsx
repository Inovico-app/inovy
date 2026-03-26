"use client";

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
import { Textarea } from "@/components/ui/textarea";
import type { SummaryContent } from "@/server/cache/summary.cache";
import { Edit, Loader2 } from "lucide-react";
import { useState } from "react";
import { useEditSummaryForm } from "../hooks/use-edit-summary-form";
import { useUpdateSummaryMutation } from "../hooks/use-update-summary-mutation";
import { useTranslations } from "next-intl";

interface EditSummaryDialogProps {
  recordingId: string;
  summary: Partial<SummaryContent>;
  onSuccess?: () => void;
}

export function EditSummaryDialog({
  recordingId,
  summary,
  onSuccess,
}: EditSummaryDialogProps) {
  const t = useTranslations("recordings");
  const [open, setOpen] = useState(false);
  const { formState, setField, resetForm } = useEditSummaryForm(summary);

  const mutation = useUpdateSummaryMutation({
    onSuccess: () => {
      setOpen(false);
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert text fields back to arrays (split by newlines, filter empty)
    const content: SummaryContent = {
      overview: formState.overview.trim(),
      topics: formState.topics
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean),
      decisions: formState.decisions
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean),
      speakerContributions: summary.speakerContributions ?? [],
      importantQuotes: summary.importantQuotes ?? [],
    };

    mutation.mutate({
      recordingId,
      content: content as unknown as Record<string, unknown>,
      changeDescription: formState.changeDescription || undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          resetForm(summary);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Edit className="h-4 w-4 mr-2" />
        {t("summary.editSummary")}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("summary.editSummary")}</DialogTitle>
            <DialogDescription>
              {t("summary.editSummaryDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Overview */}
            <div className="space-y-2">
              <Label htmlFor="overview">{t("summary.overview")}</Label>
              <Textarea
                id="overview"
                value={formState.overview}
                onChange={(e) => setField("overview", e.target.value)}
                placeholder={t("summary.overviewPlaceholder")}
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t("summary.characters", { count: formState.overview.length })}
              </p>
            </div>

            {/* Topics */}
            <div className="space-y-2">
              <Label htmlFor="topics">{t("summary.keyTopicsLabel")}</Label>
              <Textarea
                id="topics"
                value={formState.topics}
                onChange={(e) => setField("topics", e.target.value)}
                placeholder={t("summary.topicsPlaceholder")}
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t("summary.topicsCount", {
                  count: formState.topics.split("\n").filter(Boolean).length,
                })}
              </p>
            </div>

            {/* Decisions */}
            <div className="space-y-2">
              <Label htmlFor="decisions">{t("summary.decisionsLabel")}</Label>
              <Textarea
                id="decisions"
                value={formState.decisions}
                onChange={(e) => setField("decisions", e.target.value)}
                placeholder={t("summary.decisionsPlaceholder")}
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t("summary.decisionsCount", {
                  count: formState.decisions.split("\n").filter(Boolean).length,
                })}
              </p>
            </div>

            {/* Change Description */}
            <div className="space-y-2">
              <Label htmlFor="changeDescription">
                {t("summary.changeDescription")}
              </Label>
              <Textarea
                id="changeDescription"
                value={formState.changeDescription}
                onChange={(e) => setField("changeDescription", e.target.value)}
                placeholder={t("summary.changeDescriptionPlaceholder")}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
