"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, User } from "lucide-react";
import type { Task } from "@/server/db/schema";

interface TaskCardProps {
  task: Task;
  onStatusChange?: (taskId: string, status: Task["status"]) => void;
}

const priorityColors = {
  low: "bg-slate-100 text-slate-700 border-slate-300",
  medium: "bg-blue-100 text-blue-700 border-blue-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  urgent: "bg-red-100 text-red-700 border-red-300",
};

const priorityLabels = {
  low: "Laag",
  medium: "Normaal",
  high: "Hoog",
  urgent: "Urgent",
};

const statusLabels = {
  pending: "Te doen",
  in_progress: "Bezig",
  completed: "Voltooid",
  cancelled: "Geannuleerd",
};

export function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const handleStatusToggle = () => {
    if (!onStatusChange) return;

    const newStatus = task.status === "completed" ? "pending" : "completed";
    onStatusChange(task.id, newStatus);
  };

  return (
    <Card className={task.status === "completed" ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Status checkbox */}
          <Button
            variant="ghost"
            size="sm"
            className="mt-0.5 h-6 w-6 p-0"
            onClick={handleStatusToggle}
            disabled={!onStatusChange}
          >
            {task.status === "completed" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>

          {/* Task content */}
          <div className="flex-1 space-y-2">
            {/* Title and priority */}
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`text-sm font-medium leading-tight ${
                  task.status === "completed" ? "line-through" : ""
                }`}
              >
                {task.title}
              </h3>
              <Badge
                variant="outline"
                className={`shrink-0 ${priorityColors[task.priority]}`}
              >
                {priorityLabels[task.priority]}
              </Badge>
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-muted-foreground">{task.description}</p>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {/* Status */}
              <div className="flex items-center gap-1">
                <Circle className="h-3 w-3" />
                <span>{statusLabels[task.status]}</span>
              </div>

              {/* Assignee */}
              {task.assigneeName && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{task.assigneeName}</span>
                </div>
              )}

              {/* Due date */}
              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {new Date(task.dueDate).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              )}

              {/* Confidence */}
              {task.confidenceScore !== null && (
                <div className="flex items-center gap-1">
                  <span>
                    {Math.round(task.confidenceScore * 100)}% vertrouwen
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

