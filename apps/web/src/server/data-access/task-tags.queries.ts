import { db } from "@/server/db";
import {
  taskTagAssignments,
  taskTags,
  type NewTaskTag,
  type NewTaskTagAssignment,
  type TaskTag,
} from "@/server/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export class TaskTagsQueries {
  static async getTagsByOrganization(
    organizationId: string
  ): Promise<TaskTag[]> {
    return await db
      .select()
      .from(taskTags)
      .where(eq(taskTags.organizationId, organizationId))
      .orderBy(taskTags.name);
  }

  static async getTagById(tagId: string): Promise<TaskTag | null> {
    const [tag] = await db
      .select()
      .from(taskTags)
      .where(eq(taskTags.id, tagId))
      .limit(1);
    return tag ?? null;
  }

  static async createTag(data: NewTaskTag): Promise<TaskTag> {
    const [tag] = await db.insert(taskTags).values(data).returning();
    return tag;
  }

  static async getTaskTags(taskId: string): Promise<TaskTag[]> {
    return await db
      .select({
        id: taskTags.id,
        name: taskTags.name,
        color: taskTags.color,
        organizationId: taskTags.organizationId,
        createdAt: taskTags.createdAt,
      })
      .from(taskTagAssignments)
      .innerJoin(taskTags, eq(taskTagAssignments.tagId, taskTags.id))
      .where(eq(taskTagAssignments.taskId, taskId));
  }

  static async assignTagsToTask(
    taskId: string,
    tagIds: string[]
  ): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .delete(taskTagAssignments)
        .where(eq(taskTagAssignments.taskId, taskId));
      if (tagIds.length > 0) {
        const assignments: NewTaskTagAssignment[] = tagIds.map((tagId) => ({
          taskId,
          tagId,
        }));
        await tx.insert(taskTagAssignments).values(assignments);
      }
    });
  }

  static async removeTagFromTask(taskId: string, tagId: string): Promise<void> {
    await db
      .delete(taskTagAssignments)
      .where(
        and(
          eq(taskTagAssignments.taskId, taskId),
          eq(taskTagAssignments.tagId, tagId)
        )
      );
  }

  static async deleteTag(tagId: string): Promise<void> {
    await db.delete(taskTags).where(eq(taskTags.id, tagId));
  }

  static async getTagsForTasks(
    taskIds: string[]
  ): Promise<Map<string, TaskTag[]>> {
    if (taskIds.length === 0) return new Map();
    const assignments = await db
      .select({
        taskId: taskTagAssignments.taskId,
        tag: {
          id: taskTags.id,
          name: taskTags.name,
          color: taskTags.color,
          organizationId: taskTags.organizationId,
          createdAt: taskTags.createdAt,
        },
      })
      .from(taskTagAssignments)
      .innerJoin(taskTags, eq(taskTagAssignments.tagId, taskTags.id))
      .where(inArray(taskTagAssignments.taskId, taskIds));
    const tagsByTask = new Map<string, TaskTag[]>();
    for (const assignment of assignments) {
      const existing = tagsByTask.get(assignment.taskId) ?? [];
      existing.push(assignment.tag);
      tagsByTask.set(assignment.taskId, existing);
    }
    return tagsByTask;
  }
}

