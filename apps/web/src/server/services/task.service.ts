import type { AuthContext } from "@/lib/auth-context";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import { assertTeamAccess } from "@/lib/rbac/team-isolation";
import type { ActionResult } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { err, ok } from "neverthrow";
import { logger } from "../../lib/logger";
import { getCachedTaskStats } from "../cache/task.cache";
import { ProjectQueries } from "../data-access/projects.queries";
import { TaskTagsQueries } from "../data-access/task-tags.queries";
import {
  TasksQueries,
  type TaskWithContext,
} from "../data-access/tasks.queries";
import type { TaskHistory } from "../db/schema/task-history";
import type { TaskTag } from "../db/schema/task-tags";
import type { Task } from "../db/schema/tasks";
import type {
  TaskDto,
  TaskFiltersDto,
  TaskHistoryDto,
  TaskStatsDto,
  TaskWithContextDto,
  UpdateTaskMetadataDto,
} from "../dto/task.dto";

/**
 * Business logic layer for Task operations
 * Orchestrates data access and handles business rules
 *
 * All methods that require auth take an AuthContext parameter — auth is
 * resolved by the caller (action middleware, API route, or
 * resolveAuthContext()), never fetched inside the service.
 */
export class TaskService {
  /**
   * Get tasks for the authenticated user with caching
   * Automatically filters by assigneeId to ensure users only see their tasks
   */
  static async getTasksByAssignee(
    auth: AuthContext,
    filters?: Omit<TaskFiltersDto, "assigneeId" | "organizationId">,
  ): Promise<ActionResult<TaskDto[]>> {
    try {
      const tasks = await TasksQueries.getTasksByOrganization(
        auth.organizationId,
        {
          ...filters,
          assigneeId: auth.user.id,
          user: auth.user,
          userTeamIds: auth.userTeamIds,
        },
      );

      return ok(tasks.map((task: Task) => this.toDto(task)));
    } catch (error) {
      logger.error("Failed to get tasks", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get tasks",
          error as Error,
          "TaskService.getTasksByAssignee",
        ),
      );
    }
  }

  static async getTasksByRecordingId(
    recordingId: string,
    auth: AuthContext,
  ): Promise<ActionResult<TaskDto[]>> {
    try {
      const tasks = await TasksQueries.getTasksByRecordingId(recordingId);

      if (!tasks) {
        return err(
          ActionErrors.notFound("Tasks", "TaskService.getTasksByRecordingId"),
        );
      }

      // Verify all returned tasks belong to the user's organization
      for (const task of tasks) {
        try {
          assertOrganizationAccess(
            task.organizationId,
            auth.organizationId,
            "TaskService.getTasksByRecordingId",
          );
        } catch {
          return err(
            ActionErrors.notFound(
              "Tasks not found",
              "TaskService.getTasksByRecordingId",
            ),
          );
        }
      }

      return ok(tasks.map((task: Task) => this.toDto(task)));
    } catch (error) {
      logger.error("Failed to get tasks by recording ID", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get tasks by recording ID",
          error as Error,
          "TaskService.getTasksByRecordingId",
        ),
      );
    }
  }

  /**
   * Get tasks with context (project and recording info) for the authenticated user
   * Includes joined data for display purposes
   */
  static async getTasksWithContext(
    auth: AuthContext,
    filters?: Omit<TaskFiltersDto, "assigneeId" | "organizationId">,
  ): Promise<ActionResult<TaskWithContextDto[]>> {
    try {
      const tasks = await TasksQueries.getTasksWithContext(
        auth.organizationId,
        {
          ...filters,
          assigneeId: auth.user.id,
          user: auth.user,
          userTeamIds: auth.userTeamIds,
        },
      );

      return ok(tasks.map((task) => this.toContextDto(task)));
    } catch (error) {
      logger.error("Failed to get tasks with context", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get tasks with context",
          error as Error,
          "TaskService.getTasksWithContext",
        ),
      );
    }
  }

  /**
   * Get task statistics for the authenticated user
   */
  static async getTaskStats(
    auth: AuthContext,
  ): Promise<ActionResult<TaskStatsDto>> {
    try {
      const stats = await getCachedTaskStats(auth.user.id, auth.organizationId);

      return ok(stats);
    } catch (error) {
      logger.error("Failed to get task statistics", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get task statistics",
          error as Error,
          "TaskService.getTaskStats",
        ),
      );
    }
  }

  /**
   * Update task status with authorization check
   * Only allows the assignee or admins to update task status
   */
  static async updateTaskStatus(
    taskId: string,
    status: Task["status"],
    auth: AuthContext,
  ): Promise<ActionResult<TaskDto>> {
    try {
      const task = await TasksQueries.getTaskById(taskId);
      if (!task) {
        return err(
          ActionErrors.notFound("Task", "TaskService.updateTaskStatus"),
        );
      }

      // Use centralized organization isolation check
      try {
        assertOrganizationAccess(
          task.organizationId,
          auth.organizationId,
          "TaskService.updateTaskStatus",
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Task not found",
            "TaskService.updateTaskStatus",
          ),
        );
      }

      // Enforce team-level access isolation via the task's project
      if (task.projectId) {
        const project = await ProjectQueries.findById(
          task.projectId,
          auth.organizationId,
        );
        if (project) {
          assertTeamAccess(
            project.teamId,
            auth.userTeamIds,
            auth.user,
            "TaskService.updateTaskStatus",
          );
        }
      }

      const updated = await TasksQueries.updateTaskStatus(taskId, status);
      if (!updated) {
        return err(
          ActionErrors.internal(
            "Failed to update task status",
            undefined,
            "TaskService.updateTaskStatus",
          ),
        );
      }

      return ok(this.toDto(updated));
    } catch (error) {
      logger.error("Failed to update task status", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to update task status",
          error as Error,
          "TaskService.updateTaskStatus",
        ),
      );
    }
  }

  /**
   * Update task metadata with authorization and history tracking
   * Allows updating task fields like title, description, priority, status, etc.
   */
  static async updateTaskMetadata(
    input: UpdateTaskMetadataDto,
    auth: AuthContext,
  ): Promise<ActionResult<TaskDto>> {
    try {
      const task = await TasksQueries.getTaskById(input.taskId);
      if (!task) {
        return err(
          ActionErrors.notFound("Task", "TaskService.updateTaskMetadata"),
        );
      }

      // Use centralized organization isolation check
      try {
        assertOrganizationAccess(
          task.organizationId,
          auth.organizationId,
          "TaskService.updateTaskMetadata",
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Task not found",
            "TaskService.updateTaskMetadata",
          ),
        );
      }

      // Enforce team-level access isolation via the task's project
      if (task.projectId) {
        const project = await ProjectQueries.findById(
          task.projectId,
          auth.organizationId,
        );
        if (project) {
          assertTeamAccess(
            project.teamId,
            auth.userTeamIds,
            auth.user,
            "TaskService.updateTaskMetadata",
          );
        }
      }

      const { taskId, tagIds, ...taskUpdates } = input;

      const updated = await TasksQueries.updateTaskMetadata(
        taskId,
        taskUpdates,
        auth.user.id,
      );

      if (!updated) {
        return err(
          ActionErrors.internal(
            "Failed to update task metadata",
            undefined,
            "TaskService.updateTaskMetadata",
          ),
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

      return ok(this.toDto(updated));
    } catch (error) {
      logger.error("Failed to update task metadata", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to update task metadata",
          error as Error,
          "TaskService.updateTaskMetadata",
        ),
      );
    }
  }

  /**
   * Get task history (audit trail)
   * Returns all changes made to a task with authorization check
   */
  static async getTaskHistory(
    taskId: string,
    auth: AuthContext,
  ): Promise<ActionResult<TaskHistoryDto[]>> {
    try {
      const task = await TasksQueries.getTaskById(taskId);
      if (!task) {
        return err(ActionErrors.notFound("Task", "TaskService.getTaskHistory"));
      }

      // Use centralized organization isolation check
      try {
        assertOrganizationAccess(
          task.organizationId,
          auth.organizationId,
          "TaskService.getTaskHistory",
        );
      } catch {
        return err(
          ActionErrors.notFound("Task not found", "TaskService.getTaskHistory"),
        );
      }

      // Enforce team-level access isolation via the task's project
      if (task.projectId) {
        const project = await ProjectQueries.findById(
          task.projectId,
          auth.organizationId,
        );
        if (project) {
          assertTeamAccess(
            project.teamId,
            auth.userTeamIds,
            auth.user,
            "TaskService.getTaskHistory",
          );
        }
      }

      const history = await TasksQueries.getTaskHistory(taskId);

      return ok(history.map((entry) => this.toHistoryDto(entry)));
    } catch (error) {
      logger.error("Failed to get task history", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get task history",
          error as Error,
          "TaskService.getTaskHistory",
        ),
      );
    }
  }

  /**
   * Get all tags for an organization
   */
  static async getTagsByOrganization(
    organizationId: string,
  ): Promise<ActionResult<TaskTag[]>> {
    logger.info("Fetching tags for organization", {
      component: "TaskService.getTagsByOrganization",
      organizationId,
    });

    try {
      const tags = await TaskTagsQueries.getTagsByOrganization(organizationId);

      logger.info("Successfully fetched organization tags", {
        component: "TaskService.getTagsByOrganization",
        organizationId,
        count: tags.length,
      });

      return ok(tags);
    } catch (error) {
      logger.error("Failed to get tags by organization from database", {
        component: "TaskService.getTagsByOrganization",
        error,
        organizationId,
      });

      return err(
        ActionErrors.internal(
          "Failed to get tags",
          error as Error,
          "TaskService.getTagsByOrganization",
        ),
      );
    }
  }

  /**
   * Create a new tag for an organization
   */
  static async createTag(data: {
    name: string;
    color: string;
    organizationId: string;
  }): Promise<ActionResult<TaskTag>> {
    logger.info("Creating new tag", {
      component: "TaskService.createTag",
      name: data.name,
      organizationId: data.organizationId,
    });

    try {
      const tag = await TaskTagsQueries.createTag(data);

      logger.info("Successfully created tag", {
        component: "TaskService.createTag",
        tagId: tag.id,
        name: data.name,
      });

      return ok(tag);
    } catch (error) {
      logger.error("Failed to create tag in database", {
        component: "TaskService.createTag",
        error,
        data,
      });

      return err(
        ActionErrors.internal(
          "Failed to create tag",
          error as Error,
          "TaskService.createTag",
        ),
      );
    }
  }

  /**
   * Get tags assigned to a specific task
   */
  static async getTaskTags(taskId: string): Promise<ActionResult<TaskTag[]>> {
    logger.info("Fetching tags for task", {
      component: "TaskService.getTaskTags",
      taskId,
    });

    try {
      const tags = await TaskTagsQueries.getTaskTags(taskId);

      logger.info("Successfully fetched task tags", {
        component: "TaskService.getTaskTags",
        taskId,
        count: tags.length,
      });

      return ok(tags);
    } catch (error) {
      logger.error("Failed to get task tags from database", {
        component: "TaskService.getTaskTags",
        error,
        taskId,
      });

      return err(
        ActionErrors.internal(
          "Failed to get task tags",
          error as Error,
          "TaskService.getTaskTags",
        ),
      );
    }
  }

  /**
   * Convert database task to DTO
   */
  static toDto(task: Task): TaskDto {
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
  static toContextDto(task: TaskWithContext): TaskWithContextDto {
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
