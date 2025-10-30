"use client";

import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserTasks } from "../actions/get-user-tasks";
import { getUserProjects } from "@/features/projects/actions/get-user-projects";
import { TaskCard } from "./task-card";
import { TaskFilters } from "./task-filters";
import { Loader } from "@/components/loader";
import { toast } from "sonner";
import { useQueryStates, parseAsArrayOf, parseAsString } from "nuqs";
import type { TaskWithContextDto } from "@/server/dto";
import type { TaskPriority, TaskStatus } from "@/server/db/schema/tasks";

export function GlobalTaskList() {
  const [tasks, setTasks] = useState<TaskWithContextDto[]>([]);
  const [allTasks, setAllTasks] = useState<TaskWithContextDto[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use nuqs for URL state management
  // Default: show pending and in_progress tasks (hide completed)
  const [filters, setFilters] = useQueryStates({
    priorities: parseAsArrayOf(parseAsString).withDefault([]),
    statuses: parseAsArrayOf(parseAsString).withDefault(["pending", "in_progress"]),
    projectIds: parseAsArrayOf(parseAsString).withDefault([]),
  });

  // Parse priorities as TaskPriority[]
  const selectedPriorities = filters.priorities.filter(
    (p): p is TaskPriority => ["low", "medium", "high", "urgent"].includes(p)
  );

  // Parse statuses as TaskStatus[]
  const selectedStatuses = filters.statuses.filter(
    (s): s is TaskStatus =>
      ["pending", "in_progress", "completed", "cancelled"].includes(s)
  );

  // Parse project IDs
  const selectedProjectIds = filters.projectIds;

  // Load all tasks and projects on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tasksResult, projectsResult] = await Promise.all([
          getUserTasks(),
          getUserProjects(),
        ]);

        if (!tasksResult.success || !tasksResult.data) {
          toast.error(tasksResult.error || "Failed to load tasks");
          return;
        }

        setAllTasks(tasksResult.data);
        setTasks(tasksResult.data);

        if (projectsResult.success && projectsResult.data) {
          setProjects(projectsResult.data);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter tasks when filters change
  useEffect(() => {
    let filtered = allTasks;

    // Filter by priorities
    if (selectedPriorities.length > 0) {
      filtered = filtered.filter((task) =>
        selectedPriorities.includes(task.priority)
      );
    }

    // Filter by statuses
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((task) =>
        selectedStatuses.includes(task.status)
      );
    }

    // Filter by projects
    if (selectedProjectIds.length > 0) {
      filtered = filtered.filter((task) =>
        selectedProjectIds.includes(task.projectId)
      );
    }

    setTasks(filtered);
  }, [selectedPriorities, selectedStatuses, selectedProjectIds, allTasks]);

  // Calculate task counts by priority from all tasks
  const taskCounts = useMemo(() => {
    return {
      low: allTasks.filter((t) => t.priority === "low").length,
      medium: allTasks.filter((t) => t.priority === "medium").length,
      high: allTasks.filter((t) => t.priority === "high").length,
      urgent: allTasks.filter((t) => t.priority === "urgent").length,
    };
  }, [allTasks]);

  // Calculate task counts by status from all tasks
  const statusCounts = useMemo(() => {
    return {
      pending: allTasks.filter((t) => t.status === "pending").length,
      in_progress: allTasks.filter((t) => t.status === "in_progress").length,
      completed: allTasks.filter((t) => t.status === "completed").length,
      cancelled: allTasks.filter((t) => t.status === "cancelled").length,
    };
  }, [allTasks]);

  // Calculate task counts per project
  const projectsWithCounts = useMemo(() => {
    return projects.map((project) => ({
      ...project,
      taskCount: allTasks.filter((t) => t.projectId === project.id).length,
    }));
  }, [projects, allTasks]);

  const handlePrioritiesChange = (priorities: TaskPriority[]) => {
    setFilters({ priorities });
  };

  const handleStatusesChange = (statuses: TaskStatus[]) => {
    setFilters({ statuses });
  };

  const handleProjectIdsChange = (projectIds: string[]) => {
    setFilters({ projectIds });
  };

  const handleClearFilters = () => {
    setFilters({ priorities: [], statuses: ["pending", "in_progress"], projectIds: [] });
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
          selectedStatuses={selectedStatuses}
          onStatusesChange={handleStatusesChange}
          selectedProjectIds={selectedProjectIds}
          onProjectIdsChange={handleProjectIdsChange}
          taskCounts={taskCounts}
          statusCounts={statusCounts}
          projects={projectsWithCounts}
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
