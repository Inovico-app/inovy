"use client";

import type { TaskWithContextDto } from "@/server/dto/task.dto";
import { useFilteredTasks } from "../hooks/use-filtered-tasks";
import { useTaskCounts } from "../hooks/use-task-counts";
import { useTaskFilters } from "../hooks/use-task-filters";
import { useTaskOperations } from "../hooks/use-task-operations";
import { TaskFilters } from "./task-filters";
import { TaskListContent } from "./task-list-content";
import { TaskListEmpty } from "./task-list-empty";

interface GlobalTaskListClientProps {
  initialTasks: TaskWithContextDto[];
  initialProjects: Array<{ id: string; name: string }>;
  currentUserId: string;
}

export function GlobalTaskListClient({
  initialTasks,
  initialProjects,
  currentUserId,
}: GlobalTaskListClientProps) {
  const allTasks = initialTasks;
  const projects = initialProjects;

  // Manage URL-based filters
  const {
    selectedPriorities,
    selectedStatuses,
    selectedProjectIds,
    assignedToMe,
    sortBy,
    sortOrder,
    searchQuery,
    handlePrioritiesChange,
    handleStatusesChange,
    handleProjectIdsChange,
    handleAssignedToMeChange,
    handleSortChange,
    handleSearchChange,
    handleClearFilters,
  } = useTaskFilters();

  // Filter and sort tasks
  const filteredTasks = useFilteredTasks({
    tasks: allTasks,
    selectedPriorities,
    selectedStatuses,
    selectedProjectIds,
    assignedToMe,
    currentUserId,
    searchQuery,
    sortBy,
    sortOrder,
  });

  // Calculate task counts
  const { taskCounts, statusCounts, projectsWithCounts, totalPending } =
    useTaskCounts(allTasks, filteredTasks, projects);

  // Handle task operations
  const { handleStatusChange } = useTaskOperations();

  // Empty state - no tasks at all
  if (allTasks.length === 0) {
    return <TaskListEmpty variant="no-tasks" />;
  }

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
          assignedToMe={assignedToMe}
          onAssignedToMeChange={handleAssignedToMeChange}
          taskCounts={taskCounts}
          statusCounts={statusCounts}
          projects={projectsWithCounts}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* Tasks List */}
      <div className="lg:col-span-3">
        <TaskListContent
          tasks={filteredTasks}
          totalPending={totalPending}
          sortBy={sortBy}
          sortOrder={sortOrder}
          searchQuery={searchQuery}
          onSortChange={handleSortChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onStatusChange={handleStatusChange}
          title={assignedToMe ? "My Tasks" : "All Tasks"}
        />
      </div>
    </div>
  );
}
