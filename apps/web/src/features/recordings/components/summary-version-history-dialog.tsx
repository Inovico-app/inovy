"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { History, Loader2 } from "lucide-react";
import { useState } from "react";
import { useSummaryHistory } from "../hooks/use-summary-history";

interface SummaryVersionHistoryDialogProps {
  recordingId: string;
}

export function SummaryVersionHistoryDialog({
  recordingId,
}: SummaryVersionHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: history, isLoading, error } = useSummaryHistory(recordingId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="View version history">
          <History className="h-4 w-4 mr-2" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Summary Version History</DialogTitle>
          <DialogDescription>
            Track all changes made to this summary over time.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading version history...
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Failed to load version history</p>
              <p className="text-xs mt-2">
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
            </div>
          )}

          {!isLoading && !error && history && history.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No edits recorded yet</p>
              <p className="text-xs mt-2">
                Future edits will be recorded here.
              </p>
            </div>
          )}

          {!isLoading && !error && history && history.length > 0 && (
            <div className="space-y-6">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="border-l-2 border-primary pl-4 pb-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          Version {entry.versionNumber}
                        </Badge>
                        {entry.changeDescription && (
                          <span className="text-sm text-muted-foreground">
                            {entry.changeDescription}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(entry.editedAt), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>

                  {/* Display summary content */}
                  <div className="space-y-3 text-sm">
                    {entry.content.overview &&
                    typeof entry.content.overview === "string" ? (
                      <div>
                        <p className="font-semibold text-xs uppercase text-muted-foreground mb-1">
                          Overview
                        </p>
                        <p className="text-muted-foreground">
                          {entry.content.overview}
                        </p>
                      </div>
                    ) : null}

                    {entry.content.topics &&
                    Array.isArray(entry.content.topics) &&
                    entry.content.topics.length > 0 ? (
                      <div>
                        <p className="font-semibold text-xs uppercase text-muted-foreground mb-1">
                          Key Topics ({entry.content.topics.length})
                        </p>
                        <ul className="space-y-1 pl-4">
                          {entry.content.topics.map((topic, idx) => (
                            <li
                              key={idx}
                              className="text-muted-foreground list-disc"
                            >
                              {String(topic)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {entry.content.decisions &&
                    Array.isArray(entry.content.decisions) &&
                    entry.content.decisions.length > 0 ? (
                      <div>
                        <p className="font-semibold text-xs uppercase text-muted-foreground mb-1">
                          Decisions ({entry.content.decisions.length})
                        </p>
                        <ul className="space-y-1 pl-4">
                          {entry.content.decisions.map((decision, idx) => (
                            <li
                              key={idx}
                              className="text-muted-foreground list-disc"
                            >
                              {String(decision)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

