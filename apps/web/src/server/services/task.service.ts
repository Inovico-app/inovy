import { err, ok, type Result } from "neverthrow";
import { getAuthSession } from "../../lib/auth";
import { logger } from "../../lib/logger";
import {
  TasksQueries,
  type TaskWithContext,
} from "../data-access/tasks.queries";
import type { Task } from "../db/schema";
import type {
  TaskDto,
  TaskFiltersDto,
  TaskStatsDto,
  TaskWithContextDto,
} from "../dto";
import { CacheService } from "./cache.service";

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

      // Build cache key (without filters for now - can be enhanced later)
      const cacheKey = CacheService.KEYS.TASKS_BY_USER(
        authUser.id,
        organization.orgCode
      );

      const tasks = await CacheService.withCache(
        cacheKey,
        async () => {
          const result = await TasksQueries.getTasksByOrganization(
            organization.orgCode,
            {
              ...filters,
              assigneeId: authUser.id, // Always filter by current user
            }
          );

          if (result.isErr()) {
            throw new Error(result.error.message);
          }

          return result.value;
        },
        { ttl: CacheService.TTL.TASK }
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

      const cacheKey = CacheService.KEYS.TASK_STATS(
        authUser.id,
        organization.orgCode
      );

      const stats = await CacheService.withCache(
        cacheKey,
        async () => {
          const result = await TasksQueries.getTasksByOrganization(
            organization.orgCode,
            {
              assigneeId: authUser.id,
            }
          );

          if (result.isErr()) {
            throw new Error(result.error.message);
          }

          const tasks = result.value;

          // Calculate statistics
          const stats: TaskStatsDto = {
            total: tasks.length,
            byStatus: {
              pending: tasks.filter((t) => t.status === "pending").length,
              in_progress: tasks.filter((t) => t.status === "in_progress")
                .length,
              completed: tasks.filter((t) => t.status === "completed").length,
              cancelled: tasks.filter((t) => t.status === "cancelled").length,
            },
            byPriority: {
              low: tasks.filter((t) => t.priority === "low").length,
              medium: tasks.filter((t) => t.priority === "medium").length,
              high: tasks.filter((t) => t.priority === "high").length,
              urgent: tasks.filter((t) => t.priority === "urgent").length,
            },
          };

          return stats;
        },
        { ttl: CacheService.TTL.TASK }
      );

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
   * Invalidate task cache for a user
   * Called after task mutations (create, update, delete)
   */
  static async invalidateCache(userId: string, orgCode: string): Promise<void> {
    await CacheService.INVALIDATION.invalidateTaskCache(userId, orgCode);
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
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      project: task.project,
      recording: task.recording,
    };
  }
}

