import { db } from "@/server/db";
import { projects } from "@/server/db/schema/projects";
import { recordings } from "@/server/db/schema/recordings";
import {
  taskHistory,
  type NewTaskHistory,
  type TaskHistory,
} from "@/server/db/schema/task-history";
import { tasks, type NewTask, type Task } from "@/server/db/schema/tasks";
import { and, count, desc, eq, ilike, inArray, lte, or } from "drizzle-orm";
import type { TaskStatsDto } from "../dto/task.dto";
import { TeamQueries } from "./teams.queries";

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
      teamIds?: string[];
      departmentId?: string;
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

    // Filter by team: get user IDs in the specified teams
    if (filters?.teamIds && filters.teamIds.length > 0) {
      const teamMembers = await TeamQueries.selectTeamMembers(
        filters.teamIds[0]
      );
      if (teamMembers.length) {
        const userIds = Array.from(new Set(teamMembers.map((u) => u.userId)));
        if (userIds.length) {
          conditions.push(inArray(tasks.assigneeId, userIds));
        }
      }
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
      teamIds?: string[];
      departmentId?: string;
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

    // Filter by team: get user IDs in the specified teams
    if (filters?.teamIds && filters.teamIds.length > 0) {
      const teamMembers = await TeamQueries.selectTeamMembers(
        filters.teamIds[0]
      );
      if (teamMembers.length) {
        const userIds = Array.from(new Set(teamMembers.map((u) => u.userId)));
        if (userIds.length > 0) {
          conditions.push(inArray(tasks.assigneeId, userIds));
        }
      }
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

  static async countByOrganization(organizationId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(tasks)
      .where(eq(tasks.organizationId, organizationId));
    return Number(row?.value ?? 0);
  }

  /**
   * Delete tasks by IDs
   */
  static async deleteByIds(
    taskIds: string[],
    organizationId: string
  ): Promise<void> {
    if (taskIds.length === 0) return;

    await db
      .delete(tasks)
      .where(
        and(
          inArray(tasks.id, taskIds),
          eq(tasks.organizationId, organizationId)
        )
      );
  }

  /**
   * Anonymize assignee for tasks assigned to a user
   */
  static async anonymizeAssigneeByUserId(
    userId: string,
    organizationId: string
  ): Promise<void> {
    await db
      .update(tasks)
      .set({
        assigneeId: null,
        assigneeName: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tasks.assigneeId, userId),
          eq(tasks.organizationId, organizationId)
        )
      );
  }

  /**
   * Delete task history older than the specified number of days
   */
  static async deleteOldTaskHistory(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await db
      .delete(taskHistory)
      .where(lte(taskHistory.changedAt, cutoffDate));

    return result.rowCount ?? 0;
  }
}

