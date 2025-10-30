"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskCard } from "./task-card";
import { AlertCircle, Inbox } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import type { TaskWithContext } from "@/features/tasks/actions/get-user-tasks";

interface GlobalTaskListProps {
  tasks: TaskWithContext[];
  isLoading?: boolean;
  error?: Error | null;
}

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
const statusOrder = {
  pending: 0,
  in_progress: 1,
  completed: 2,
  cancelled: 3,
};

export function GlobalTaskList({
  tasks,
  isLoading,
  error,
}: GlobalTaskListProps) {
  const [localTasks, setLocalTasks] = useState(tasks);

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-900">
                Fout bij laden van taken
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {error.message || "Probeer het later opnieuw"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-gray-200 rounded-md animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!localTasks || localTasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Inbox className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-muted-foreground mb-4">
            Geen taken toegewezen aan u
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Nieuwe taken worden aangemaakt uit geëxtraheerde actiepunten van
            opnamen
          </p>
          <Link href="/projects">
            <Button variant="outline">Ga naar projecten</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Sort tasks by priority, then status
  const sortedTasks = [...localTasks].sort((a, b) => {
    const priorityDiff =
      priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return statusOrder[a.status] - statusOrder[b.status];
  });

  // Group tasks by priority
  const tasksByPriority = {
    urgent: sortedTasks.filter((t) => t.priority === "urgent"),
    high: sortedTasks.filter((t) => t.priority === "high"),
    medium: sortedTasks.filter((t) => t.priority === "medium"),
    low: sortedTasks.filter((t) => t.priority === "low"),
  };

  // Count stats
  const stats = {
    total: localTasks.length,
    pending: localTasks.filter((t) => t.status === "pending").length,
    inProgress: localTasks.filter((t) => t.status === "in_progress").length,
    completed: localTasks.filter((t) => t.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {stats.total}
            </div>
            <p className="text-xs text-gray-600">Totaal taken</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {stats.pending}
            </div>
            <p className="text-xs text-gray-600">Te doen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {stats.inProgress}
            </div>
            <p className="text-xs text-gray-600">Bezig</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {stats.completed}
            </div>
            <p className="text-xs text-gray-600">Voltooid</p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks by priority */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mijn taken</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Urgent tasks */}
          {tasksByPriority.urgent.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-700" />
                Urgent ({tasksByPriority.urgent.length})
              </h3>
              <div className="space-y-2">
                {tasksByPriority.urgent.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* High priority tasks */}
          {tasksByPriority.high.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-700" />
                Hoog ({tasksByPriority.high.length})
              </h3>
              <div className="space-y-2">
                {tasksByPriority.high.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Medium priority tasks */}
          {tasksByPriority.medium.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-700" />
                Normaal ({tasksByPriority.medium.length})
              </h3>
              <div className="space-y-2">
                {tasksByPriority.medium.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Low priority tasks */}
          {tasksByPriority.low.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-700" />
                Laag ({tasksByPriority.low.length})
              </h3>
              <div className="space-y-2">
                {tasksByPriority.low.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
