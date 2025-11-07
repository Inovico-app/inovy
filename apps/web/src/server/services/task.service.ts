import { ActionErrors, type ActionResult } from "@/lib";
import { err, ok } from "neverthrow";
import { getAuthSession } from "../../lib/auth";
import { CacheInvalidation } from "../../lib/cache-utils";
import { logger } from "../../lib/logger";
import { getCachedTasksByUser, getCachedTaskStats } from "../cache";
import { TaskTagsQueries } from "../data-access/task-tags.queries";
import {
  TasksQueries,
  type TaskWithContext,
} from "../data-access/tasks.queries";
import type { Task, TaskHistory } from "../db/schema";
import type {
  TaskDto,
  TaskFiltersDto,
  TaskHistoryDto,
  TaskStatsDto,
  TaskWithContextDto,
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
  ): Promise<ActionResult<TaskDto[]>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TaskService.getTasksByAssignee"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TaskService.getTasksByAssignee"
          )
        );
      }

      const tasks = await getCachedTasksByUser(
        authUser.id,
        organization.orgCode,
        filters
      );

      return ok(tasks.map((task: Task) => this.toDto(task)));
    } catch (error) {
      logger.error("Failed to get tasks", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get tasks",
          error as Error,
          "TaskService.getTasksByAssignee"
        )
      );
    }
  }

  static async getTasksByRecordingId(
    recordingId: string
  ): Promise<ActionResult<TaskDto[]>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TaskService.getTasksByRecordingId"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TaskService.getTasksByRecordingId"
          )
        );
      }

      const tasks = await TasksQueries.getTasksByRecordingId(recordingId);

      if (!tasks) {
        return err(
          ActionErrors.notFound("Tasks", "TaskService.getTasksByRecordingId")
        );
      }

      return ok(tasks.map((task: Task) => this.toDto(task)));
    } catch (error) {
      logger.error("Failed to get tasks by recording ID", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get tasks by recording ID",
          error as Error,
          "TaskService.getTasksByRecordingId"
        )
      );
    }
  }

  /**
   * Get tasks with context (project and recording info) for the authenticated user
   * Includes joined data for display purposes
   */
  static async getTasksWithContext(
    filters?: Omit<TaskFiltersDto, "assigneeId" | "organizationId">
  ): Promise<ActionResult<TaskWithContextDto[]>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TaskService.getTasksWithContext"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TaskService.getTasksWithContext"
          )
        );
      }

      const tasks = await TasksQueries.getTasksWithContext(
        organization.orgCode,
        {
          ...filters,
          assigneeId: authUser.id,
        }
      );

      return ok(tasks.map((task) => this.toContextDto(task)));
    } catch (error) {
      logger.error("Failed to get tasks with context", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get tasks with context",
          error as Error,
          "TaskService.getTasksWithContext"
        )
      );
    }
  }

  /**
   * Get task statistics for the authenticated user
   */
  static async getTaskStats(): Promise<ActionResult<TaskStatsDto>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TaskService.getTaskStats"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TaskService.getTaskStats"
          )
        );
      }

      const stats = await getCachedTaskStats(authUser.id, organization.orgCode);

      return ok(stats);
    } catch (error) {
      logger.error("Failed to get task statistics", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get task statistics",
          error as Error,
          "TaskService.getTaskStats"
        )
      );
    }
  }

  /**
   * Update task status with authorization check
   * Only allows the assignee or admins to update task status
   */
  static async updateTaskStatus(
    taskId: string,
    status: Task["status"]
  ): Promise<ActionResult<TaskDto>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TaskService.updateTaskStatus"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TaskService.updateTaskStatus"
          )
        );
      }

      const task = await TasksQueries.getTaskById(taskId);
      if (!task) {
        return err(
          ActionErrors.notFound("Task", "TaskService.updateTaskStatus")
        );
      }

      if (task.assigneeId !== authUser.id) {
        return err(
          ActionErrors.forbidden(
            "You are not authorized to update this task",
            { taskId },
            "TaskService.updateTaskStatus"
          )
        );
      }

      if (task.organizationId !== organization.orgCode) {
        return err(
          ActionErrors.notFound(
            "Task not found in your organization",
            "TaskService.updateTaskStatus"
          )
        );
      }

      const updated = await TasksQueries.updateTaskStatus(taskId, status);
      if (!updated) {
        return err(
          ActionErrors.internal(
            "Failed to update task status",
            undefined,
            "TaskService.updateTaskStatus"
          )
        );
      }

      await this.invalidateCache(authUser.id, organization.orgCode);

      return ok(this.toDto(updated));
    } catch (error) {
      logger.error("Failed to update task status", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to update task status",
          error as Error,
          "TaskService.updateTaskStatus"
        )
      );
    }
  }

  /**
   * Update task metadata with authorization and history tracking
   * Allows updating task fields like title, description, priority, status, etc.
   */
  static async updateTaskMetadata(
    input: UpdateTaskMetadataDto
  ): Promise<ActionResult<TaskDto>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TaskService.updateTaskMetadata"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TaskService.updateTaskMetadata"
          )
        );
      }

      const task = await TasksQueries.getTaskById(input.taskId);
      if (!task) {
        return err(
          ActionErrors.notFound("Task", "TaskService.updateTaskMetadata")
        );
      }

      if (task.organizationId !== organization.orgCode) {
        return err(
          ActionErrors.notFound(
            "Task not found in your organization",
            "TaskService.updateTaskMetadata"
          )
        );
      }

      if (task.assigneeId !== authUser.id) {
        return err(
          ActionErrors.forbidden(
            "You are not authorized to update this task",
            { taskId: input.taskId },
            "TaskService.updateTaskMetadata"
          )
        );
      }

      const { taskId, tagIds, ...taskUpdates } = input;

      const updated = await TasksQueries.updateTaskMetadata(
        taskId,
        taskUpdates,
        authUser.id
      );

      if (!updated) {
        return err(
          ActionErrors.internal(
            "Failed to update task metadata",
            undefined,
            "TaskService.updateTaskMetadata"
          )
        );
      }

      if (tagIds !== undefined) {
        try {
          await TaskTagsQueries.assignTagsToTask(taskId, tagIds);
        } catch (tagError) {
          logger.error("Failed to assign tags to task", {
            taskId,
            error: tagError,
          });
        }
      }

      await this.invalidateCache(authUser.id, organization.orgCode);

      return ok(this.toDto(updated));
    } catch (error) {
      logger.error("Failed to update task metadata", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to update task metadata",
          error as Error,
          "TaskService.updateTaskMetadata"
        )
      );
    }
  }

  /**
   * Get task history (audit trail)
   * Returns all changes made to a task with authorization check
   */
  static async getTaskHistory(
    taskId: string
  ): Promise<ActionResult<TaskHistoryDto[]>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TaskService.getTaskHistory"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TaskService.getTaskHistory"
          )
        );
      }

      const task = await TasksQueries.getTaskById(taskId);
      if (!task) {
        return err(ActionErrors.notFound("Task", "TaskService.getTaskHistory"));
      }

      if (task.organizationId !== organization.orgCode) {
        return err(
          ActionErrors.notFound(
            "Task not found in your organization",
            "TaskService.getTaskHistory"
          )
        );
      }

      const history = await TasksQueries.getTaskHistory(taskId);

      return ok(history.map((entry) => this.toHistoryDto(entry)));
    } catch (error) {
      logger.error("Failed to get task history", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get task history",
          error as Error,
          "TaskService.getTaskHistory"
        )
      );
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

