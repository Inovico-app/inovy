import type { TaskWithContextDto } from "@/server/dto/task.dto";

interface TaskCounts {
  low: number;
  medium: number;
  high: number;
  urgent: number;
}

interface StatusCounts {
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

interface ProjectWithCount {
  id: string;
  name: string;
  taskCount: number;
}

interface UseTaskCountsReturn {
  taskCounts: TaskCounts;
  statusCounts: StatusCounts;
  projectsWithCounts: ProjectWithCount[];
  totalPending: number;
}

export function useTaskCounts(
  allTasks: TaskWithContextDto[],
  filteredTasks: TaskWithContextDto[],
  projects: Array<{ id: string; name: string }>
): UseTaskCountsReturn {
  // Calculate task counts by priority from all tasks
  // React Compiler automatically memoizes these calculations
  const taskCounts = {
    low: allTasks.filter((t) => t.priority === "low").length,
    medium: allTasks.filter((t) => t.priority === "medium").length,
    high: allTasks.filter((t) => t.priority === "high").length,
    urgent: allTasks.filter((t) => t.priority === "urgent").length,
  };

  // Calculate task counts by status from all tasks
  const statusCounts = {
    pending: allTasks.filter((t) => t.status === "pending").length,
    in_progress: allTasks.filter((t) => t.status === "in_progress").length,
    completed: allTasks.filter((t) => t.status === "completed").length,
    cancelled: allTasks.filter((t) => t.status === "cancelled").length,
  };

  // Calculate task counts per project
  const projectsWithCounts = projects.map((project) => ({
    ...project,
    taskCount: allTasks.filter((t) => t.projectId === project.id).length,
  }));

  // Calculate total pending tasks from filtered tasks
  const totalPending = filteredTasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress"
  ).length;

  return { taskCounts, statusCounts, projectsWithCounts, totalPending };
}

