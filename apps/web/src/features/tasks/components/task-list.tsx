"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import type { Task } from "@/server/db/schema/tasks";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useExtractTasksMutation } from "../hooks/use-extract-tasks-mutation";
import { TaskCard } from "./task-card";

interface TaskListProps {
  recordingId: string;
  tasks?: Task[];
  onRegenerate?: () => void;
}

export function TaskList({ recordingId, tasks, onRegenerate }: TaskListProps) {
  const [localTasks, setLocalTasks] = useState(tasks ?? []);

  const { extractTasks, isExtracting } = useExtractTasksMutation({
    recordingId,
    onSuccess: onRegenerate,
  });

  const handleGenerate = () => {
    extractTasks();
  };

  const handleStatusChange = async (
    taskId: string,
    newStatus: Task["status"]
  ) => {
    try {
      // Optimistically update UI
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );

      // TODO: Create API endpoint for updating task status
      // For now, just show success message
      toast.success("Taak status bijgewerkt!");
    } catch (error) {
      logger.error("Error updating task status", {
        component: "task-list",
        error: error instanceof Error ? error : new Error(String(error)),
        taskId,
      });
      toast.error("Fout bij bijwerken van taak");
      // Revert optimistic update
      setLocalTasks(tasks ?? []);
    }
  };

  if (!localTasks || localTasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            Geen actiepunten beschikbaar
          </p>
          <Button onClick={handleGenerate} disabled={isExtracting}>
            {isExtracting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Actiepunten extraheren
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Group tasks by priority
  const tasksByPriority = {
    urgent: localTasks.filter((t) => t.priority === "urgent"),
    high: localTasks.filter((t) => t.priority === "high"),
    medium: localTasks.filter((t) => t.priority === "medium"),
    low: localTasks.filter((t) => t.priority === "low"),
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Actiepunten</CardTitle>
            <Badge variant="outline">{localTasks.length}</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isExtracting}
          >
            {isExtracting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Opnieuw extraheren"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Urgent tasks */}
        {tasksByPriority.urgent.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-red-700">Urgent</h3>
            <div className="space-y-2">
              {tasksByPriority.urgent.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </div>
        )}

        {/* High priority tasks */}
        {tasksByPriority.high.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-orange-700">Hoog</h3>
            <div className="space-y-2">
              {tasksByPriority.high.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </div>
        )}

        {/* Medium priority tasks */}
        {tasksByPriority.medium.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-blue-700">Normaal</h3>
            <div className="space-y-2">
              {tasksByPriority.medium.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </div>
        )}

        {/* Low priority tasks */}
        {tasksByPriority.low.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Laag</h3>
            <div className="space-y-2">
              {tasksByPriority.low.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

