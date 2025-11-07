import { db } from "@/server/db";
import {
  projects,
  recordings,
  taskHistory,
  tasks,
  type NewTask,
  type NewTaskHistory,
  type Task,
  type TaskHistory,
} from "@/server/db/schema";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import type { TaskStatsDto } from "../dto";

export interface TaskWithContext extends Task {
  project: { id: string; name: string };
  recording: { id: string; title: string };
}

export class TasksQueries {
  static async createTask(data: NewTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({ ...data, updatedAt: new Date() })
      .returning();
    return task;
  }

  static async getTaskById(taskId: string): Promise<Task | null> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    return task ?? null;
  }

  static async getTasksByRecordingId(recordingId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.recordingId, recordingId))
      .orderBy(desc(tasks.createdAt));
  }

  static async getTasksByProjectId(projectId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(desc(tasks.createdAt));
  }

  static async getTasksByOrganization(
    organizationId: string,
    filters?: {
      priorities?: ("low" | "medium" | "high" | "urgent")[];
      statuses?: ("pending" | "in_progress" | "completed" | "cancelled")[];
      projectIds?: string[];
      assigneeId?: string;
      search?: string;
    }
  ): Promise<Task[]> {
    const conditions = [eq(tasks.organizationId, organizationId)];
    if (filters?.priorities?.length)
      conditions.push(inArray(tasks.priority, filters.priorities));
    if (filters?.statuses?.length)
      conditions.push(inArray(tasks.status, filters.statuses));
    if (filters?.projectIds?.length)
      conditions.push(inArray(tasks.projectId, filters.projectIds));
    if (filters?.assigneeId)
      conditions.push(eq(tasks.assigneeId, filters.assigneeId));
    if (filters?.search) {
      conditions.push(
        or(
          ilike(tasks.title, `%${filters.search}%`),
          ilike(tasks.description, `%${filters.search}%`)
        )!
      );
    }
    return await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt));
  }

  static async getTasksWithContext(
    organizationId: string,
    filters?: {
      priorities?: ("low" | "medium" | "high" | "urgent")[];
      statuses?: ("pending" | "in_progress" | "completed" | "cancelled")[];
      projectIds?: string[];
      assigneeId?: string;
      search?: string;
    }
  ): Promise<TaskWithContext[]> {
    const conditions = [eq(tasks.organizationId, organizationId)];
    if (filters?.priorities?.length)
      conditions.push(inArray(tasks.priority, filters.priorities));
    if (filters?.statuses?.length)
      conditions.push(inArray(tasks.status, filters.statuses));
    if (filters?.projectIds?.length)
      conditions.push(inArray(tasks.projectId, filters.projectIds));
    if (filters?.assigneeId)
      conditions.push(eq(tasks.assigneeId, filters.assigneeId));
    if (filters?.search) {
      conditions.push(
        or(
          ilike(tasks.title, `%${filters.search}%`),
          ilike(tasks.description, `%${filters.search}%`)
        )!
      );
    }
    return await db
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
        lastEditedByName: tasks.lastEditedByName,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        project: { id: projects.id, name: projects.name },
        recording: { id: recordings.id, title: recordings.title },
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .innerJoin(recordings, eq(tasks.recordingId, recordings.id))
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt));
  }

  static async updateTaskStatus(
    taskId: string,
    status: "pending" | "in_progress" | "completed" | "cancelled"
  ): Promise<Task | undefined> {
    const [updated] = await db
      .update(tasks)
      .set({ status, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();
    return updated;
  }

  static async updateTask(
    taskId: string,
    data: Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>
  ): Promise<Task | undefined> {
    const [updated] = await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();
    return updated;
  }

  static async deleteTask(taskId: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, taskId));
  }

  static async updateTaskMetadata(
    taskId: string,
    updates: Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>,
    userId: string
  ): Promise<Task | undefined> {
    // Get current task for history—service layer will now handle this
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
    return updated;
  }

  static async getTaskHistory(taskId: string): Promise<TaskHistory[]> {
    return await db
      .select()
      .from(taskHistory)
      .where(eq(taskHistory.taskId, taskId))
      .orderBy(desc(taskHistory.changedAt));
  }

  static async createTaskHistoryEntry(
    data: NewTaskHistory
  ): Promise<TaskHistory> {
    const [entry] = await db.insert(taskHistory).values(data).returning();
    return entry;
  }

  static async getTaskStats(
    organizationId: string,
    userId: string
  ): Promise<TaskStatsDto> {
    const userTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.organizationId, organizationId),
          eq(tasks.assigneeId, userId)
        )
      );

    const stats: TaskStatsDto = {
      total: userTasks.length,
      byStatus: {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      },
    };

    for (const task of userTasks) {
      stats.byStatus[task.status]++;
      stats.byPriority[task.priority]++;
    }

    return stats;
  }
}

