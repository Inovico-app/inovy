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
  isManuallyEdited: "true" | "false";
  lastEditedAt: Date | null;
  lastEditedById: string | null;
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

/**
 * Task History Entry DTO
 * Represents a single change to a task field
 */
export interface TaskHistoryDto {
  id: string;
  taskId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changedById: string;
  changedAt: Date;
}

/**
 * Task Tag DTO
 * Represents a reusable tag that can be assigned to tasks
 */
export interface TaskTagDto {
  id: string;
  name: string;
  color: string;
  organizationId: string;
  createdAt: Date;
}

/**
 * Task Tag Assignment DTO
 * Represents the assignment of a tag to a task
 */
export interface TaskTagAssignmentDto {
  id: string;
  taskId: string;
  tagId: string;
  assignedAt: Date;
}

/**
 * Task with Tags DTO
 * Extends TaskDto with assigned tags
 */
export interface TaskWithTagsDto extends TaskDto {
  tags: TaskTagDto[];
}

/**
 * Update Task Metadata Input DTO
 * Input for updating task metadata fields
 */
export interface UpdateTaskMetadataDto {
  taskId: string;
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  assigneeId?: string | null;
  assigneeName?: string | null;
  dueDate?: Date | null;
  tagIds?: string[];
}

