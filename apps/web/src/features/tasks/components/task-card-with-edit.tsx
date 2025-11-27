"use client";

import { Badge } from "@/components/ui/badge";
import type { TaskDto } from "@/server/dto/task.dto";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import { EditTaskDialog } from "./edit-task-dialog";
import { TaskVersionHistoryDialog } from "./task-version-history-dialog";

interface TaskCardProps {
  task: TaskDto;
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {task.status === "completed" ? (
            <CheckCircle2Icon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
          ) : (
            <CircleIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm">{task.title}</h4>
              {task.isManuallyEdited && (
                <Badge variant="outline" className="text-xs">
                  Edited
                </Badge>
              )}
            </div>
            {task.description && (
              <div
                className="text-sm text-muted-foreground mb-2 prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: task.description }}
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
              {/* Priority Badge */}
              <Badge
                variant={
                  task.priority === "urgent"
                    ? "destructive"
                    : task.priority === "high"
                    ? "default"
                    : "secondary"
                }
              >
                {task.priority}
              </Badge>

              {/* Status Badge */}
              <Badge
                variant={task.status === "completed" ? "default" : "outline"}
              >
                {task.status.replace("_", " ")}
              </Badge>

              {/* Assignee */}
              {task.assigneeName && (
                <span className="text-xs text-muted-foreground">
                  Assigned to: {task.assigneeName}
                </span>
              )}

              {/* Due Date */}
              {task.dueDate && (
                <span className="text-xs text-muted-foreground">
                  Due:{" "}
                  {new Date(task.dueDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}

              {/* Meeting Timestamp */}
              {task.meetingTimestamp !== null &&
                task.meetingTimestamp !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    at {Math.floor(task.meetingTimestamp / 60)}:
                    {String(task.meetingTimestamp % 60).padStart(2, "0")}
                  </span>
                )}

              {/* Confidence Score */}
              {task.confidenceScore && (
                <Badge variant="outline" className="text-xs">
                  {(task.confidenceScore * 100).toFixed(0)}% confidence
                </Badge>
              )}
            </div>
          </div>
        </div>
        {/* Edit Actions */}
        <div className="flex items-center gap-1">
          <EditTaskDialog task={task} />
          <TaskVersionHistoryDialog taskId={task.id} />
        </div>
      </div>
    </div>
  );
}

