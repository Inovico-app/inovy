/**
 * Task sorting utilities
 * Extracted from components for separation of concerns
 */

import type { TaskWithContextDto } from "@/server/dto/task.dto";

export type TaskSortBy = "createdAt" | "dueDate" | "priority" | "status" | "title";
export type TaskSortOrder = "asc" | "desc";

/**
 * Sort tasks by various criteria
 * @param tasks - Array of tasks to sort
 * @param sortBy - Field to sort by
 * @param sortOrder - Sort order (ascending or descending)
 * @returns Sorted array of tasks
 */
export function sortTasks(
  tasks: TaskWithContextDto[],
  sortBy: TaskSortBy,
  sortOrder: TaskSortOrder = "desc"
): TaskWithContextDto[] {
  const sorted = [...tasks];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "createdAt":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "dueDate":
        if (!a.dueDate && !b.dueDate) {
          comparison = 0;
        } else if (!a.dueDate) {
          comparison = 1; // Tasks without due dates go to end
        } else if (!b.dueDate) {
          comparison = -1;
        } else {
          comparison =
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        break;
      case "priority": {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        comparison =
          priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      }
      case "status": {
        const statusOrder = {
          pending: 0,
          in_progress: 1,
          completed: 2,
          cancelled: 3,
        };
        comparison = statusOrder[a.status] - statusOrder[b.status];
        break;
      }
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      default:
        comparison = 0;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return sorted;
}

