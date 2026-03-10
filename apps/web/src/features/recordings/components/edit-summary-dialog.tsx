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
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Summary</DialogTitle>
            <DialogDescription>
              Edit the AI-generated summary. Each line will become a separate
              item. Changes will be tracked in version history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Overview */}
            <div className="space-y-2">
              <Label htmlFor="overview">Overview</Label>
              <Textarea
                id="overview"
                value={formState.overview}
                onChange={(e) => setField("overview", e.target.value)}
                placeholder="A brief paragraph summarizing the meeting..."
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {formState.overview.length} characters
              </p>
            </div>

            {/* Topics */}
            <div className="space-y-2">
              <Label htmlFor="topics">Key Topics</Label>
              <Textarea
                id="topics"
                value={formState.topics}
                onChange={(e) => setField("topics", e.target.value)}
                placeholder="One topic per line..."
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {formState.topics.split("\n").filter(Boolean).length} topics
              </p>
            </div>

            {/* Decisions */}
            <div className="space-y-2">
              <Label htmlFor="decisions">Decisions</Label>
              <Textarea
                id="decisions"
                value={formState.decisions}
                onChange={(e) => setField("decisions", e.target.value)}
                placeholder="One decision per line..."
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {formState.decisions.split("\n").filter(Boolean).length} decisions
              </p>
            </div>

            {/* Change Description */}
            <div className="space-y-2">
              <Label htmlFor="changeDescription">
                Change Description (Optional)
              </Label>
              <Textarea
                id="changeDescription"
                value={formState.changeDescription}
                onChange={(e) => setField("changeDescription", e.target.value)}
                placeholder="Describe what you changed..."
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

