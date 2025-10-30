"use client";

import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserTasks } from "../actions/get-user-tasks";
import { TaskCard } from "./task-card";
import { TaskFilters } from "./task-filters";
import { Loader } from "@/components/loader";
import { toast } from "sonner";
import { useQueryStates, parseAsArrayOf, parseAsString } from "nuqs";
import type { TaskWithContextDto } from "@/server/dto";
import type { TaskPriority } from "@/server/db/schema/tasks";

export function GlobalTaskList() {
  const [tasks, setTasks] = useState<TaskWithContextDto[]>([]);
  const [allTasks, setAllTasks] = useState<TaskWithContextDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use nuqs for URL state management
  const [filters, setFilters] = useQueryStates({
    priorities: parseAsArrayOf(parseAsString).withDefault([]),
  });

  // Parse priorities as TaskPriority[]
  const selectedPriorities = filters.priorities.filter(
    (p): p is TaskPriority => ["low", "medium", "high", "urgent"].includes(p)
  );

  // Load all tasks on mount
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const result = await getUserTasks();

        if (!result.success || !result.data) {
          toast.error(result.error || "Failed to load tasks");
          return;
        }

        setAllTasks(result.data);
        setTasks(result.data);
      } catch (error) {
        console.error("Error loading tasks:", error);
        toast.error("Failed to load tasks");
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, []);

  // Filter tasks when selectedPriorities changes
  useEffect(() => {
    if (selectedPriorities.length === 0) {
      setTasks(allTasks);
    } else {
      const filtered = allTasks.filter((task) =>
        selectedPriorities.includes(task.priority)
      );
      setTasks(filtered);
    }
  }, [selectedPriorities, allTasks]);

  // Calculate task counts by priority from all tasks
  const taskCounts = useMemo(() => {
    return {
      low: allTasks.filter((t) => t.priority === "low").length,
      medium: allTasks.filter((t) => t.priority === "medium").length,
      high: allTasks.filter((t) => t.priority === "high").length,
      urgent: allTasks.filter((t) => t.priority === "urgent").length,
    };
  }, [allTasks]);

  const handlePrioritiesChange = (priorities: TaskPriority[]) => {
    setFilters({ priorities });
  };

  const handleClearFilters = () => {
    setFilters({ priorities: [] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <Loader />
        </CardContent>
      </Card>
    );
  }

  if (allTasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No tasks assigned to you yet. Tasks will appear here once they are
            extracted from your recordings.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group tasks by priority for better organization
  const tasksByPriority = useMemo(
    () => ({
      urgent: tasks.filter((t) => t.priority === "urgent"),
      high: tasks.filter((t) => t.priority === "high"),
      medium: tasks.filter((t) => t.priority === "medium"),
      low: tasks.filter((t) => t.priority === "low"),
    }),
    [tasks]
  );

  const totalPending = useMemo(
    () =>
      tasks.filter((t) => t.status === "pending" || t.status === "in_progress")
        .length,
    [tasks]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Filters Sidebar */}
      <div className="lg:col-span-1">
        <TaskFilters
          selectedPriorities={selectedPriorities}
          onPrioritiesChange={handlePrioritiesChange}
          taskCounts={taskCounts}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* Tasks List */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>My Tasks</CardTitle>
                <Badge variant="outline">{tasks.length}</Badge>
                {totalPending > 0 && (
                  <Badge variant="secondary">{totalPending} pending</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {tasks.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No tasks match the selected filters.</p>
                <button
                  onClick={handleClearFilters}
                  className="text-primary hover:underline mt-2"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                {/* Urgent tasks */}
                {tasksByPriority.urgent.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
                      Urgent ({tasksByPriority.urgent.length})
                    </h3>
                    <div className="space-y-2">
                      {tasksByPriority.urgent.map((task) => (
                        <TaskCard key={task.id} task={task} showContext />
                      ))}
                    </div>
                  </div>
                )}

                {/* High priority tasks */}
                {tasksByPriority.high.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                      High Priority ({tasksByPriority.high.length})
                    </h3>
                    <div className="space-y-2">
                      {tasksByPriority.high.map((task) => (
                        <TaskCard key={task.id} task={task} showContext />
                      ))}
                    </div>
                  </div>
                )}

                {/* Medium priority tasks */}
                {tasksByPriority.medium.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                      Medium Priority ({tasksByPriority.medium.length})
                    </h3>
                    <div className="space-y-2">
                      {tasksByPriority.medium.map((task) => (
                        <TaskCard key={task.id} task={task} showContext />
                      ))}
                    </div>
                  </div>
                )}

                {/* Low priority tasks */}
                {tasksByPriority.low.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-400">
                      Low Priority ({tasksByPriority.low.length})
                    </h3>
                    <div className="space-y-2">
                      {tasksByPriority.low.map((task) => (
                        <TaskCard key={task.id} task={task} showContext />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
