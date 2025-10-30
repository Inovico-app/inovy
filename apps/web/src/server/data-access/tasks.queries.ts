import { db } from "@/server/db";
import { tasks, type NewTask, type Task } from "@/server/db/schema";
import { eq, and, desc, inArray, or, ilike } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";
import { logger } from "@/lib/logger";

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
}

