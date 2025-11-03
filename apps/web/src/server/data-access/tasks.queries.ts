import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import {
  tasks,
  type NewTask,
  type Task,
  projects,
  recordings,
  taskHistory,
  type NewTaskHistory,
  type TaskHistory,
} from "@/server/db/schema";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";

/**
 * Task with context information
 */
export interface TaskWithContext extends Task {
  project: {
    id: string;
    name: string;
  };
  recording: {
    id: string;
    title: string;
  };
}

export class TasksQueries {
  /**
   * Create a new task
   */
  static async createTask(data: NewTask): Promise<Result<Task, Error>> {
    try {
      const [task] = await db
        .insert(tasks)
        .values({
          ...data,
          updatedAt: new Date(),
        })
        .returning();

      logger.info("Task created", {
        component: "TasksQueries.createTask",
        taskId: task.id,
        recordingId: data.recordingId,
        priority: data.priority,
      });

      return ok(task);
    } catch (error) {
      logger.error("Failed to create task", {
        component: "TasksQueries.createTask",
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to create task")
      );
    }
  }

  /**
   * Get a single task by ID
   */
  static async getTaskById(taskId: string): Promise<Result<Task, Error>> {
    try {
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (!task) {
        return err(new Error("Task not found"));
      }

      return ok(task);
    } catch (error) {
      logger.error("Failed to fetch task by ID", {
        component: "TasksQueries.getTaskById",
        taskId,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to fetch task")
      );
    }
  }

  /**
   * Get all tasks for a recording
   */
  static async getTasksByRecordingId(
    recordingId: string
  ): Promise<Result<Task[], Error>> {
    try {
      const taskList = await db
        .select()
        .from(tasks)
        .where(eq(tasks.recordingId, recordingId))
        .orderBy(desc(tasks.createdAt));

      return ok(taskList);
    } catch (error) {
      logger.error("Failed to fetch tasks by recording", {
        component: "TasksQueries.getTasksByRecordingId",
        recordingId,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to fetch tasks")
      );
    }
  }

  /**
   * Get all tasks for a project
   */
  static async getTasksByProjectId(
    projectId: string
  ): Promise<Result<Task[], Error>> {
    try {
      const taskList = await db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, projectId))
        .orderBy(desc(tasks.createdAt));

      return ok(taskList);
    } catch (error) {
      logger.error("Failed to fetch tasks by project", {
        component: "TasksQueries.getTasksByProjectId",
        projectId,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to fetch tasks")
      );
    }
  }

  /**
   * Get all tasks for an organization with optional filters
   */
  static async getTasksByOrganization(
    organizationId: string,
    filters?: {
      priorities?: ("low" | "medium" | "high" | "urgent")[];
      statuses?: ("pending" | "in_progress" | "completed" | "cancelled")[];
      projectIds?: string[];
      assigneeId?: string;
      search?: string;
    }
  ): Promise<Result<Task[], Error>> {
    try {
      const conditions = [eq(tasks.organizationId, organizationId)];

      // Apply filters
      if (filters?.priorities && filters.priorities.length > 0) {
        conditions.push(inArray(tasks.priority, filters.priorities));
      }

      if (filters?.statuses && filters.statuses.length > 0) {
        conditions.push(inArray(tasks.status, filters.statuses));
      }

      if (filters?.projectIds && filters.projectIds.length > 0) {
        conditions.push(inArray(tasks.projectId, filters.projectIds));
      }

      if (filters?.assigneeId) {
        conditions.push(eq(tasks.assigneeId, filters.assigneeId));
      }

      if (filters?.search) {
        conditions.push(
          or(
            ilike(tasks.title, `%${filters.search}%`),
            ilike(tasks.description, `%${filters.search}%`)
          )!
        );
      }

      const taskList = await db
        .select()
        .from(tasks)
        .where(and(...conditions))
        .orderBy(desc(tasks.createdAt));

      return ok(taskList);
    } catch (error) {
      logger.error("Failed to fetch tasks by organization", {
        component: "TasksQueries.getTasksByOrganization",
        organizationId,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to fetch tasks")
      );
    }
  }

  /**
   * Get all tasks for an organization with context (project and recording info)
   * This includes joined data from projects and recordings tables
   */
  static async getTasksWithContext(
    organizationId: string,
    filters?: {
      priorities?: ("low" | "medium" | "high" | "urgent")[];
      statuses?: ("pending" | "in_progress" | "completed" | "cancelled")[];
      projectIds?: string[];
      assigneeId?: string;
      search?: string;
    }
  ): Promise<Result<TaskWithContext[], Error>> {
    try {
      const conditions = [eq(tasks.organizationId, organizationId)];

      // Apply filters
      if (filters?.priorities && filters.priorities.length > 0) {
        conditions.push(inArray(tasks.priority, filters.priorities));
      }

      if (filters?.statuses && filters.statuses.length > 0) {
        conditions.push(inArray(tasks.status, filters.statuses));
      }

      if (filters?.projectIds && filters.projectIds.length > 0) {
        conditions.push(inArray(tasks.projectId, filters.projectIds));
      }

      if (filters?.assigneeId) {
        conditions.push(eq(tasks.assigneeId, filters.assigneeId));
      }

      if (filters?.search) {
        conditions.push(
          or(
            ilike(tasks.title, `%${filters.search}%`),
            ilike(tasks.description, `%${filters.search}%`)
          )!
        );
      }

      const taskList = await db
        .select({
          id: tasks.id,
          recordingId: tasks.recordingId,
          projectId: tasks.projectId,
          title: tasks.title,
          description: tasks.description,
          priority: tasks.priority,
          status: tasks.status,
          assigneeId: tasks.assigneeId,
          assigneeName: tasks.assigneeName,
          dueDate: tasks.dueDate,
          confidenceScore: tasks.confidenceScore,
          meetingTimestamp: tasks.meetingTimestamp,
          organizationId: tasks.organizationId,
          createdById: tasks.createdById,
          isManuallyEdited: tasks.isManuallyEdited,
          lastEditedAt: tasks.lastEditedAt,
          lastEditedById: tasks.lastEditedById,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
          project: {
            id: projects.id,
            name: projects.name,
          },
          recording: {
            id: recordings.id,
            title: recordings.title,
          },
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.id))
        .innerJoin(recordings, eq(tasks.recordingId, recordings.id))
        .where(and(...conditions))
        .orderBy(desc(tasks.createdAt));

      return ok(taskList);
    } catch (error) {
      logger.error("Failed to fetch tasks with context", {
        component: "TasksQueries.getTasksWithContext",
        organizationId,
        error,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to fetch tasks with context")
      );
    }
  }

  /**
   * Update task status
   */
  static async updateTaskStatus(
    taskId: string,
    status: "pending" | "in_progress" | "completed" | "cancelled"
  ): Promise<Result<Task, Error>> {
    try {
      const [updated] = await db
        .update(tasks)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      if (!updated) {
        return err(new Error("Task not found"));
      }

      logger.info("Task status updated", {
        component: "TasksQueries.updateTaskStatus",
        taskId,
        status,
      });

      return ok(updated);
    } catch (error) {
      logger.error("Failed to update task status", {
        component: "TasksQueries.updateTaskStatus",
        taskId,
        error,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to update task status")
      );
    }
  }

  /**
   * Update task details
   */
  static async updateTask(
    taskId: string,
    data: Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>
  ): Promise<Result<Task, Error>> {
    try {
      const [updated] = await db
        .update(tasks)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      if (!updated) {
        return err(new Error("Task not found"));
      }

      logger.info("Task updated", {
        component: "TasksQueries.updateTask",
        taskId,
      });

      return ok(updated);
    } catch (error) {
      logger.error("Failed to update task", {
        component: "TasksQueries.updateTask",
        taskId,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to update task")
      );
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(taskId: string): Promise<Result<void, Error>> {
    try {
      await db.delete(tasks).where(eq(tasks.id, taskId));

      logger.info("Task deleted", {
        component: "TasksQueries.deleteTask",
        taskId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to delete task", {
        component: "TasksQueries.deleteTask",
        taskId,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to delete task")
      );
    }
  }

  /**
   * Update task metadata with history tracking
   * This method updates specified fields and marks the task as manually edited
   */
  static async updateTaskMetadata(
    taskId: string,
    updates: Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>,
    userId: string
  ): Promise<Result<Task, Error>> {
    try {
      // First, get the current task to track changes
      const taskResult = await this.getTaskById(taskId);
      if (taskResult.isErr()) {
        return err(taskResult.error);
      }

      const currentTask = taskResult.value;

      // Update the task with manual edit tracking
      const [updated] = await db
        .update(tasks)
        .set({
          ...updates,
          isManuallyEdited: "true",
          lastEditedAt: new Date(),
          lastEditedById: userId,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      if (!updated) {
        return err(new Error("Task not found"));
      }

      // Create history entries for each changed field
      const historyEntries: NewTaskHistory[] = [];
      
      for (const [field, newValue] of Object.entries(updates)) {
        const oldValue = currentTask[field as keyof Task];
        
        // Only create history if value actually changed
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          historyEntries.push({
            taskId,
            field,
            oldValue: oldValue as unknown,
            newValue: newValue as unknown,
            changedById: userId,
          });
        }
      }

      // Insert history entries if any
      if (historyEntries.length > 0) {
        await db.insert(taskHistory).values(historyEntries);
      }

      logger.info("Task metadata updated", {
        component: "TasksQueries.updateTaskMetadata",
        taskId,
        changedFields: historyEntries.map(e => e.field),
      });

      return ok(updated);
    } catch (error) {
      logger.error("Failed to update task metadata", {
        component: "TasksQueries.updateTaskMetadata",
        taskId,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to update task metadata")
      );
    }
  }

  /**
   * Get task history (audit trail)
   * Returns all changes made to a task
   */
  static async getTaskHistory(
    taskId: string
  ): Promise<Result<TaskHistory[], Error>> {
    try {
      const history = await db
        .select()
        .from(taskHistory)
        .where(eq(taskHistory.taskId, taskId))
        .orderBy(desc(taskHistory.changedAt));

      return ok(history);
    } catch (error) {
      logger.error("Failed to fetch task history", {
        component: "TasksQueries.getTaskHistory",
        taskId,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to fetch task history")
      );
    }
  }

  /**
   * Create a task history entry manually
   * Useful for recording changes made outside the normal update flow
   */
  static async createTaskHistoryEntry(
    data: NewTaskHistory
  ): Promise<Result<TaskHistory, Error>> {
    try {
      const [entry] = await db.insert(taskHistory).values(data).returning();

      logger.info("Task history entry created", {
        component: "TasksQueries.createTaskHistoryEntry",
        taskId: data.taskId,
        field: data.field,
      });

      return ok(entry);
    } catch (error) {
      logger.error("Failed to create task history entry", {
        component: "TasksQueries.createTaskHistoryEntry",
        error,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to create task history entry")
      );
    }
  }
}

