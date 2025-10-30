import type { TaskPriority, TaskStatus } from "../db/schema/tasks";

/**
 * Base Task DTO
 * Data transfer object for task entities
 */
export interface TaskDto {
  id: string;
  recordingId: string;
  projectId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: Date | null;
  confidenceScore: number | null;
  meetingTimestamp: number | null;
  organizationId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Task with context information
 * Includes project and recording details for display
 */
export interface TaskWithContextDto extends TaskDto {
  project: {
    id: string;
    name: string;
  };
  recording: {
    id: string;
    title: string;
  };
}

/**
 * Task filters for querying
 */
export interface TaskFiltersDto {
  assigneeId?: string;
  organizationId?: string;
  priorities?: TaskPriority[];
  statuses?: TaskStatus[];
  projectIds?: string[];
  search?: string;
}

/**
 * Task statistics for dashboard
 */
export interface TaskStatsDto {
  total: number;
  byStatus: {
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

