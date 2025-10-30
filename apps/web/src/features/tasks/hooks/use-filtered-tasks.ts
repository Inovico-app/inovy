import type { TaskPriority, TaskStatus } from "@/server/db/schema/tasks";
import type { TaskWithContextDto } from "@/server/dto";
import { useMemo } from "react";
import type { SortField, SortOrder } from "../components/task-sort";

interface UseFilteredTasksParams {
  tasks: TaskWithContextDto[];
  selectedPriorities: TaskPriority[];
  selectedStatuses: TaskStatus[];
  selectedProjectIds: string[];
  searchQuery: string;
  sortBy: SortField;
  sortOrder: SortOrder;
}

export function useFilteredTasks({
  tasks,
  selectedPriorities,
  selectedStatuses,
  selectedProjectIds,
  searchQuery,
  sortBy,
  sortOrder,
}: UseFilteredTasksParams): TaskWithContextDto[] {
  return useMemo(() => {
    let filtered = tasks;

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

    // Filter by search query (case-insensitive, matches title, description, project, or recording)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          (task.description?.toLowerCase().includes(query) ?? false) ||
          task.project.name.toLowerCase().includes(query) ||
          task.recording.title.toLowerCase().includes(query)
      );
    }

    // Sort tasks
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "priority": {
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
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

    return sorted;
  }, [
    tasks,
    selectedPriorities,
    selectedStatuses,
    selectedProjectIds,
    searchQuery,
    sortBy,
    sortOrder,
  ]);
}

