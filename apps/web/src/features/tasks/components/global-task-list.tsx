"use client";

import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserTasks } from "../actions/get-user-tasks";
import { getUserProjects } from "@/features/projects/actions/get-user-projects";
import { TaskCard } from "./task-card";
import { TaskFilters } from "./task-filters";
import { TaskSort, type SortField, type SortOrder } from "./task-sort";
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
  // Default: show pending and in_progress tasks (hide completed), sort by priority desc
  const [filters, setFilters] = useQueryStates({
    priorities: parseAsArrayOf(parseAsString).withDefault([]),
    statuses: parseAsArrayOf(parseAsString).withDefault(["pending", "in_progress"]),
    projectIds: parseAsArrayOf(parseAsString).withDefault([]),
    sortBy: parseAsString.withDefault("priority"),
    sortOrder: parseAsString.withDefault("desc"),
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

  // Parse sort parameters
  const sortBy = (["priority", "dueDate", "createdAt", "project"].includes(
    filters.sortBy
  )
    ? filters.sortBy
    : "priority") as SortField;
  const sortOrder = (["asc", "desc"].includes(filters.sortOrder)
    ? filters.sortOrder
    : "desc") as SortOrder;

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

  // Filter and sort tasks when filters change
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

    // Sort tasks
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "priority": {
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          comparison =
            priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        }
        case "dueDate": {
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = aDate - bDate;
          break;
        }
        case "createdAt": {
          const aDate = new Date(a.createdAt).getTime();
          const bDate = new Date(b.createdAt).getTime();
          comparison = aDate - bDate;
          break;
        }
        case "project": {
          comparison = a.project.name.localeCompare(b.project.name);
          break;
        }
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    setTasks(sorted);
  }, [
    selectedPriorities,
    selectedStatuses,
    selectedProjectIds,
    sortBy,
    sortOrder,
    allTasks,
  ]);

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

  const handleSortChange = (newSortBy: SortField, newSortOrder: SortOrder) => {
    setFilters({ sortBy: newSortBy, sortOrder: newSortOrder });
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
              <TaskSort
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
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
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} showContext />
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
