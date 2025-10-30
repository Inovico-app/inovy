"use server";

import { db } from "@/server/db";
import { tasks, recordings, projects } from "@/server/db/schema";
import { eq, and, desc, inArray, or, ilike } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";
import { logger } from "@/lib/logger";
import { CacheService } from "@/server/services/cache.service";
import { getAuthSession } from "@/lib/auth";
import crypto from "crypto";

interface TaskFilter {
  priorities?: ("low" | "medium" | "high" | "urgent")[];
  statuses?: ("pending" | "in_progress" | "completed" | "cancelled")[];
  projectIds?: string[];
  search?: string;
}

interface TaskWithContext {
  id: string;
  recordingId: string;
  projectId: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: Date | null;
  confidenceScore: number | null;
  meetingTimestamp: number | null;
  organizationId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  projectName: string;
  recordingTitle: string;
}

/**
 * Generate cache key based on filters
 */
function generateFilterHash(filters: TaskFilter): string {
  const filterStr = JSON.stringify({
    priorities: filters.priorities?.sort(),
    statuses: filters.statuses?.sort(),
    projectIds: filters.projectIds?.sort(),
    search: filters.search,
  });
  return crypto.createHash("md5").update(filterStr).digest("hex");
}

/**
 * Get all tasks for the current user with Redis caching
 */
export async function getUserTasks(
  filters?: TaskFilter
): Promise<Result<TaskWithContext[], Error>> {
  try {
    // Get auth session
    const authResult = await getAuthSession();
    if (authResult.isErr()) {
      return err(new Error("Unauthorized"));
    }

    const { user, organizationId } = authResult.value;
    if (!user || !organizationId) {
      return err(new Error("User or organization not found"));
    }

    // Generate cache key
    const filterHash = generateFilterHash(filters || {});
    const cacheKey = `${CacheService.KEYS.TASKS_BY_USER(
      user.id,
      organizationId
    )}:${filterHash}`;

    // Try to get from cache first
    const cachedResult = await CacheService.get<TaskWithContext[]>(cacheKey);
    if (cachedResult.isOk() && cachedResult.value !== null) {
      logger.debug("Returning cached tasks", {
        component: "getUserTasks",
        userId: user.id,
        cacheKey,
      });
      return ok(cachedResult.value);
    }

    // Build query conditions
    const conditions = [
      eq(tasks.organizationId, organizationId),
      eq(tasks.assigneeId, user.id),
    ];

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

    if (filters?.search) {
      conditions.push(
        or(
          ilike(tasks.title, `%${filters.search}%`),
          ilike(tasks.description, `%${filters.search}%`)
        )!
      );
    }

    // Fetch tasks with context (project and recording names)
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
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        projectName: projects.name,
        recordingTitle: recordings.title,
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .innerJoin(recordings, eq(tasks.recordingId, recordings.id))
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt));

    logger.info("Tasks fetched", {
      component: "getUserTasks",
      userId: user.id,
      organizationId,
      count: taskList.length,
      filters,
    });

    // Cache the result
    await CacheService.set(cacheKey, taskList, {
      ttl: CacheService.TTL.TASK_LIST,
    }).catch((error) => {
      logger.warn("Failed to cache task list", { cacheKey, error });
    });

    return ok(taskList);
  } catch (error) {
    logger.error("Failed to fetch user tasks", {
      component: "getUserTasks",
      error,
    });
    return err(
      error instanceof Error ? error : new Error("Failed to fetch tasks")
    );
  }
}
