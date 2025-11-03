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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Edit, Loader2 } from "lucide-react";
import { useUpdateSummaryMutation } from "../hooks/use-update-summary-mutation";

interface SummaryContent {
  hoofdonderwerpen?: string[];
  beslissingen?: string[];
  risicos?: string[];
  volgende_stappen?: string[];
}

interface EditSummaryDialogProps {
  recordingId: string;
  summary: SummaryContent;
  onSuccess?: () => void;
}

export function EditSummaryDialog({
  recordingId,
  summary,
  onSuccess,
}: EditSummaryDialogProps) {
  const [open, setOpen] = useState(false);
  
  // Convert summary object to editable fields
  const [mainTopics, setMainTopics] = useState(
    summary.hoofdonderwerpen?.join("\n") ?? ""
  );
  const [decisions, setDecisions] = useState(
    summary.beslissingen?.join("\n") ?? ""
  );
  const [risks, setRisks] = useState(summary.risicos?.join("\n") ?? "");
  const [nextSteps, setNextSteps] = useState(
    summary.volgende_stappen?.join("\n") ?? ""
  );
  const [changeDescription, setChangeDescription] = useState("");

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
      hoofdonderwerpen: mainTopics
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean),
      beslissingen: decisions
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean),
      risicos: risks
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean),
      volgende_stappen: nextSteps
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    mutation.mutate({
      recordingId,
      content: content as unknown as Record<string, unknown>,
      changeDescription: changeDescription || undefined,
    });
  };

  const resetForm = () => {
    setMainTopics(summary.hoofdonderwerpen?.join("\n") ?? "");
    setDecisions(summary.beslissingen?.join("\n") ?? "");
    setRisks(summary.risicos?.join("\n") ?? "");
    setNextSteps(summary.volgende_stappen?.join("\n") ?? "");
    setChangeDescription("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          resetForm();
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
              Edit the AI-generated summary. Each line will become a separate item.
              Changes will be tracked in version history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Main Topics */}
            <div className="space-y-2">
              <Label htmlFor="mainTopics">Main Topics</Label>
              <Textarea
                id="mainTopics"
                value={mainTopics}
                onChange={(e) => setMainTopics(e.target.value)}
                placeholder="One topic per line..."
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {mainTopics.split("\n").filter(Boolean).length} topics
              </p>
            </div>

            {/* Decisions */}
            <div className="space-y-2">
              <Label htmlFor="decisions">Decisions</Label>
              <Textarea
                id="decisions"
                value={decisions}
                onChange={(e) => setDecisions(e.target.value)}
                placeholder="One decision per line..."
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {decisions.split("\n").filter(Boolean).length} decisions
              </p>
            </div>

            {/* Risks */}
            <div className="space-y-2">
              <Label htmlFor="risks">Risks</Label>
              <Textarea
                id="risks"
                value={risks}
                onChange={(e) => setRisks(e.target.value)}
                placeholder="One risk per line..."
                rows={3}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {risks.split("\n").filter(Boolean).length} risks
              </p>
            </div>

            {/* Next Steps */}
            <div className="space-y-2">
              <Label htmlFor="nextSteps">Next Steps</Label>
              <Textarea
                id="nextSteps"
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                placeholder="One step per line..."
                rows={3}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {nextSteps.split("\n").filter(Boolean).length} steps
              </p>
            </div>

            {/* Change Description */}
            <div className="space-y-2">
              <Label htmlFor="changeDescription">
                Change Description (Optional)
              </Label>
              <Textarea
                id="changeDescription"
                value={changeDescription}
                onChange={(e) => setChangeDescription(e.target.value)}
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

