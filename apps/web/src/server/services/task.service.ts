import { err, ok, type Result } from "neverthrow";
import { getAuthSession } from "../../lib/auth";
import { CacheInvalidation } from "../../lib/cache-utils";
import { logger } from "../../lib/logger";
import {
  TasksQueries,
  type TaskWithContext,
} from "../data-access/tasks.queries";
import { TaskTagsQueries } from "../data-access/task-tags.queries";
import { getCachedTasksByUser, getCachedTaskStats } from "../cache";
import type { Task, TaskHistory } from "../db/schema";
import type {
  TaskDto,
  TaskFiltersDto,
  TaskStatsDto,
  TaskWithContextDto,
  TaskHistoryDto,
  UpdateTaskMetadataDto,
} from "../dto";

/**
 * Business logic layer for Task operations
 * Orchestrates data access and handles business rules
 */
export class TaskService {
  /**
   * Get tasks for the authenticated user with caching
   * Automatically filters by assigneeId to ensure users only see their tasks
   */
  static async getTasksByAssignee(
    filters?: Omit<TaskFiltersDto, "assigneeId" | "organizationId">
  ): Promise<Result<TaskDto[], string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // Get tasks using Next.js cache
      const tasks = await getCachedTasksByUser(
        authUser.id,
        organization.orgCode,
        filters
      );

      return ok(tasks.map((task) => this.toDto(task)));
    } catch (error) {
      const errorMessage = "Failed to get tasks";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get tasks with context (project and recording info) for the authenticated user
   * Includes joined data for display purposes
   */
  static async getTasksWithContext(
    filters?: Omit<TaskFiltersDto, "assigneeId" | "organizationId">
  ): Promise<Result<TaskWithContextDto[], string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // For context data, we skip caching as it includes joined data
      // that might be stale across tables
      const result = await TasksQueries.getTasksWithContext(
        organization.orgCode,
        {
          ...filters,
          assigneeId: authUser.id, // Always filter by current user
        }
      );

      if (result.isErr()) {
        return err(result.error.message);
      }

      return ok(result.value.map((task) => this.toContextDto(task)));
    } catch (error) {
      const errorMessage = "Failed to get tasks with context";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get task statistics for the authenticated user
   */
  static async getTaskStats(): Promise<Result<TaskStatsDto, string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // Get stats using cached function
      const stats = await getCachedTaskStats(authUser.id, organization.orgCode);

      return ok(stats);
    } catch (error) {
      const errorMessage = "Failed to get task statistics";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Update task status with authorization check
   * Only allows the assignee or admins to update task status
   */
  static async updateTaskStatus(
    taskId: string,
    status: Task["status"]
  ): Promise<Result<TaskDto, string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // Get the task to verify ownership
      const taskResult = await TasksQueries.getTaskById(taskId);
      if (taskResult.isErr()) {
        return err("Task not found");
      }

      const task = taskResult.value;

      // Authorization check: only the assignee can update their own tasks
      if (task.assigneeId !== authUser.id) {
        return err("You are not authorized to update this task");
      }

      // Authorization check: verify task belongs to user's organization
      if (task.organizationId !== organization.orgCode) {
        return err("Task not found in your organization");
      }

      // Update the task status
      const updateResult = await TasksQueries.updateTaskStatus(taskId, status);
      if (updateResult.isErr()) {
        return err(updateResult.error.message);
      }

      // Invalidate cache
      await this.invalidateCache(authUser.id, organization.orgCode);

      return ok(this.toDto(updateResult.value));
    } catch (error) {
      const errorMessage = "Failed to update task status";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Update task metadata with authorization and history tracking
   * Allows updating task fields like title, description, priority, status, etc.
   */
  static async updateTaskMetadata(
    input: UpdateTaskMetadataDto
  ): Promise<Result<TaskDto, string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // Get the task to verify ownership and authorization
      const taskResult = await TasksQueries.getTaskById(input.taskId);
      if (taskResult.isErr()) {
        return err("Task not found");
      }

      const task = taskResult.value;

      // Authorization check: verify task belongs to user's organization
      if (task.organizationId !== organization.orgCode) {
        return err("Task not found in your organization");
      }

      // Authorization check: only the assignee or admins can update tasks
      // For now, we allow the assignee to update their own tasks
      if (task.assigneeId !== authUser.id) {
        return err("You are not authorized to update this task");
      }

      // Prepare updates (remove taskId and tagIds from the update object)
      const { taskId, tagIds, ...taskUpdates } = input;

      // Update task metadata with history tracking
      const updateResult = await TasksQueries.updateTaskMetadata(
        taskId,
        taskUpdates,
        authUser.id
      );

      if (updateResult.isErr()) {
        return err(updateResult.error.message);
      }

      // Handle tag assignments if provided
      if (tagIds !== undefined) {
        const tagResult = await TaskTagsQueries.assignTagsToTask(taskId, tagIds);
        if (tagResult.isErr()) {
          logger.error("Failed to assign tags to task", {
            taskId,
            error: tagResult.error.message,
          });
          // Don't fail the whole operation if tag assignment fails
        }
      }

      // Invalidate cache
      await this.invalidateCache(authUser.id, organization.orgCode);

      return ok(this.toDto(updateResult.value));
    } catch (error) {
      const errorMessage = "Failed to update task metadata";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get task history (audit trail)
   * Returns all changes made to a task with authorization check
   */
  static async getTaskHistory(
    taskId: string
  ): Promise<Result<TaskHistoryDto[], string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // Get the task to verify authorization
      const taskResult = await TasksQueries.getTaskById(taskId);
      if (taskResult.isErr()) {
        return err("Task not found");
      }

      const task = taskResult.value;

      // Authorization check: verify task belongs to user's organization
      if (task.organizationId !== organization.orgCode) {
        return err("Task not found in your organization");
      }

      // Get task history
      const historyResult = await TasksQueries.getTaskHistory(taskId);
      if (historyResult.isErr()) {
        return err(historyResult.error.message);
      }

      return ok(historyResult.value.map((entry) => this.toHistoryDto(entry)));
    } catch (error) {
      const errorMessage = "Failed to get task history";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Invalidate task cache for a user
   * Called after task mutations (create, update, delete)
   */
  static async invalidateCache(userId: string, orgCode: string): Promise<void> {
    CacheInvalidation.invalidateTaskCache(userId, orgCode);
  }

  /**
   * Convert database task to DTO
   */
  private static toDto(task: Task): TaskDto {
    return {
      id: task.id,
      recordingId: task.recordingId,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeName,
      dueDate: task.dueDate,
      confidenceScore: task.confidenceScore,
      meetingTimestamp: task.meetingTimestamp,
      organizationId: task.organizationId,
      createdById: task.createdById,
      isManuallyEdited: task.isManuallyEdited,
      lastEditedAt: task.lastEditedAt,
      lastEditedById: task.lastEditedById,
      lastEditedByName: task.lastEditedByName,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  /**
   * Convert database task with context to DTO
   */
  private static toContextDto(task: TaskWithContext): TaskWithContextDto {
    return {
      id: task.id,
      recordingId: task.recordingId,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeName,
      dueDate: task.dueDate,
      confidenceScore: task.confidenceScore,
      meetingTimestamp: task.meetingTimestamp,
      organizationId: task.organizationId,
      createdById: task.createdById,
      isManuallyEdited: task.isManuallyEdited,
      lastEditedAt: task.lastEditedAt,
      lastEditedById: task.lastEditedById,
      lastEditedByName: task.lastEditedByName,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      project: task.project,
      recording: task.recording,
    };
  }

  /**
   * Convert database task history to DTO
   */
  private static toHistoryDto(entry: TaskHistory): TaskHistoryDto {
    return {
      id: entry.id,
      taskId: entry.taskId,
      field: entry.field,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      changedById: entry.changedById,
      changedAt: entry.changedAt,
    };
  }
}

