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
import { History, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTaskHistory } from "../hooks/use-task-history";
import { format } from "date-fns";

interface TaskVersionHistoryDialogProps {
  taskId: string;
}

function formatFieldName(field: string): string {
  const fieldNames: Record<string, string> = {
    title: "Title",
    description: "Description",
    priority: "Priority",
    status: "Status",
    assigneeId: "Assignee",
    assigneeName: "Assignee Name",
    dueDate: "Due Date",
  };
  return fieldNames[field] ?? field;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "None";
  }
  
  if (typeof value === "string") {
    // Try to parse as date
    const date = new Date(value);
    if (!isNaN(date.getTime()) && value.includes("T")) {
      return format(date, "MMM d, yyyy h:mm a");
    }
    return value;
  }
  
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  
  return String(value);
}

export function TaskVersionHistoryDialog({
  taskId,
}: TaskVersionHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: history, isLoading, error } = useTaskHistory(taskId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="View version history">
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task Version History</DialogTitle>
          <DialogDescription>
            Track all changes made to this task over time.
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
              <p className="text-sm">No changes recorded yet</p>
              <p className="text-xs mt-2">
                Future edits will be recorded here.
              </p>
            </div>
          )}

          {!isLoading && !error && history && history.length > 0 && (
            <div className="space-y-4">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="border-l-2 border-primary pl-4 pb-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">
                        {formatFieldName(entry.field)} changed
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.changedAt), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-xs">
                        From
                      </Badge>
                      <span className="text-muted-foreground flex-1">
                        {formatValue(entry.oldValue)}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="default" className="text-xs">
                        To
                      </Badge>
                      <span className="flex-1">{formatValue(entry.newValue)}</span>
                    </div>
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

