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
import { History } from "lucide-react";
import { useState } from "react";

interface TaskVersionHistoryDialogProps {
  taskId: string;
}

export function TaskVersionHistoryDialog({
  taskId: _taskId,
}: TaskVersionHistoryDialogProps) {
  const [open, setOpen] = useState(false);

  // TODO: Implement actual version history fetching
  // This is a placeholder implementation for MVP
  // Future enhancement: fetch and display version history using TasksQueries.getTaskVersionHistory

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="View version history">
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Task Version History</DialogTitle>
          <DialogDescription>
            Track all changes made to this task over time.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            {/* Placeholder for version history */}
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                Version history tracking is enabled for this task.
              </p>
              <p className="text-xs mt-2">
                Future edits will be recorded here.
              </p>
              <Badge variant="outline" className="mt-4">
                Coming Soon
              </Badge>
            </div>

            {/* Future implementation will show versions like:
            <div className="space-y-4">
              {versions.map((version) => (
                <div key={version.id} className="border-l-2 border-primary pl-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">Version {version.versionNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {version.editedByName}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(version.editedAt)}
                    </p>
                  </div>
                  <div className="text-sm space-y-1">
                    {version.changes.map((change, idx) => (
                      <p key={idx} className="text-muted-foreground">
                        • {change}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

