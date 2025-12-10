/**
 * Task filtering utilities
 * Extracted from components for separation of concerns
 */

import type { TaskPriority, TaskStatus } from "@/server/db/schema/tasks";
import type { TaskWithContextDto } from "@/server/dto/task.dto";

export interface TaskFilterOptions {
  selectedPriorities?: TaskPriority[];
  selectedStatuses?: TaskStatus[];
  selectedProjectIds?: string[];
  searchQuery?: string;
}

/**
 * Filter tasks based on multiple criteria
 * @param tasks - Array of tasks to filter
 * @param options - Filter options
 * @returns Filtered array of tasks
 */
export function filterTasks(
  tasks: TaskWithContextDto[],
  options: TaskFilterOptions
): TaskWithContextDto[] {
  let filtered = tasks;

  // Filter by priorities
  if (options.selectedPriorities && options.selectedPriorities.length > 0) {
    filtered = filtered.filter((task) =>
      options.selectedPriorities!.includes(task.priority)
    );
  }

  // Filter by statuses
  if (options.selectedStatuses && options.selectedStatuses.length > 0) {
    filtered = filtered.filter((task) =>
      options.selectedStatuses!.includes(task.status)
    );
  }

  // Filter by project IDs
  if (options.selectedProjectIds && options.selectedProjectIds.length > 0) {
    filtered = filtered.filter((task) =>
      options.selectedProjectIds!.includes(task.projectId)
    );
  }

  // Filter by search query
  if (options.searchQuery) {
    const query = options.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        (task.description?.toLowerCase().includes(query) ?? false) ||
        task.project.name.toLowerCase().includes(query) ||
        task.recording.title.toLowerCase().includes(query)
    );
  }

  return filtered;
}

/**
 * Filter tasks by status
 * @param tasks - Array of tasks to filter
 * @param statuses - Array of statuses to include
 * @returns Filtered array of tasks
 */
export function filterTasksByStatus(
  tasks: TaskWithContextDto[],
  statuses: TaskStatus[]
): TaskWithContextDto[] {
  if (statuses.length === 0) {
    return tasks;
  }
  return tasks.filter((task) => statuses.includes(task.status));
}

