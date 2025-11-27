"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Clock,
  User,
  FolderIcon,
  MicIcon,
  PlayCircle,
  Edit,
} from "lucide-react";
import type { Task } from "@/server/db/schema/tasks";
import type { TaskWithContextDto } from "@/server/dto/task.dto";
import Link from "next/link";
import { TaskEditDialog } from "./task-edit-dialog";

interface TaskCardProps {
  task: Task | TaskWithContextDto;
  onStatusChange?: (taskId: string, status: Task["status"]) => void;
  showContext?: boolean;
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

// Helper function to format timestamp in MM:SS format
function formatTimestamp(seconds: number | null): string {
  if (seconds === null) return "";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function TaskCard({ task, onStatusChange, showContext = false }: TaskCardProps) {
  const handleStatusToggle = () => {
    if (!onStatusChange) return;

    const newStatus = task.status === "completed" ? "pending" : "completed";
    onStatusChange(task.id, newStatus);
  };

  const taskWithContext = showContext && "project" in task ? task : null;

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
            {/* Title, priority, and edit button */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 flex items-start gap-2">
                <h3
                  className={`text-sm font-medium leading-tight ${
                    task.status === "completed" ? "line-through" : ""
                  }`}
                >
                  {task.title}
                </h3>
                {task.isManuallyEdited === "true" && (
                  <Badge variant="secondary" className="text-xs">
                    Bewerkt
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge
                  variant="outline"
                  className={priorityColors[task.priority]}
                >
                  {priorityLabels[task.priority]}
                </Badge>
                <TaskEditDialog task={task} trigger={
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                } />
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-muted-foreground">{task.description}</p>
            )}

            {/* Context info (project and recording) */}
            {taskWithContext && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Link
                  href={`/projects/${taskWithContext.projectId}`}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <FolderIcon className="h-3 w-3" />
                  <span>{taskWithContext.project.name}</span>
                </Link>
                <span className="text-muted-foreground">•</span>
                <Link
                  href={`/projects/${taskWithContext.projectId}/recordings/${taskWithContext.recordingId}${
                    task.meetingTimestamp !== null
                      ? `?t=${Math.floor(task.meetingTimestamp)}`
                      : ""
                  }`}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  title={
                    task.meetingTimestamp !== null
                      ? `Jump to ${formatTimestamp(task.meetingTimestamp)} in recording`
                      : "View recording"
                  }
                >
                  <MicIcon className="h-3 w-3" />
                  <span>{taskWithContext.recording.title}</span>
                  {task.meetingTimestamp !== null && (
                    <>
                      <PlayCircle className="h-3 w-3 ml-0.5" />
                      <span className="font-mono">
                        {formatTimestamp(task.meetingTimestamp)}
                      </span>
                    </>
                  )}
                </Link>
              </div>
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

