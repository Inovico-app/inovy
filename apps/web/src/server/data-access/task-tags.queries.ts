import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import {
  taskTags,
  taskTagAssignments,
  type NewTaskTag,
  type TaskTag,
  type NewTaskTagAssignment,
  type TaskTagAssignment,
} from "@/server/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";

/**
 * Task Tags Data Access Layer
 * Pure database operations for task tags and tag assignments
 */
export class TaskTagsQueries {
  /**
   * Get all tags for an organization
   */
  static async getTagsByOrganization(
    organizationId: string
  ): Promise<Result<TaskTag[], Error>> {
    try {
      const tags = await db
        .select()
        .from(taskTags)
        .where(eq(taskTags.organizationId, organizationId))
        .orderBy(taskTags.name);

      return ok(tags);
    } catch (error) {
      logger.error("Failed to fetch tags by organization", {
        component: "TaskTagsQueries.getTagsByOrganization",
        organizationId,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to fetch tags")
      );
    }
  }

  /**
   * Get a single tag by ID
   */
  static async getTagById(tagId: string): Promise<Result<TaskTag, Error>> {
    try {
      const [tag] = await db
        .select()
        .from(taskTags)
        .where(eq(taskTags.id, tagId))
        .limit(1);

      if (!tag) {
        return err(new Error("Tag not found"));
      }

      return ok(tag);
    } catch (error) {
      logger.error("Failed to fetch tag by ID", {
        component: "TaskTagsQueries.getTagById",
        tagId,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to fetch tag")
      );
    }
  }

  /**
   * Create a new tag
   */
  static async createTag(data: NewTaskTag): Promise<Result<TaskTag, Error>> {
    try {
      const [tag] = await db.insert(taskTags).values(data).returning();

      logger.info("Tag created", {
        component: "TaskTagsQueries.createTag",
        tagId: tag.id,
        name: data.name,
      });

      return ok(tag);
    } catch (error) {
      logger.error("Failed to create tag", {
        component: "TaskTagsQueries.createTag",
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to create tag")
      );
    }
  }

  /**
   * Get all tags assigned to a task
   */
  static async getTaskTags(taskId: string): Promise<Result<TaskTag[], Error>> {
    try {
      const tags = await db
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

      return ok(tags);
    } catch (error) {
      logger.error("Failed to fetch task tags", {
        component: "TaskTagsQueries.getTaskTags",
        taskId,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to fetch task tags")
      );
    }
  }

  /**
   * Assign tags to a task
   * This replaces all existing tag assignments for the task
   */
  static async assignTagsToTask(
    taskId: string,
    tagIds: string[]
  ): Promise<Result<void, Error>> {
    try {
      // Use a transaction to ensure consistency
      await db.transaction(async (tx) => {
        // Remove existing tag assignments
        await tx
          .delete(taskTagAssignments)
          .where(eq(taskTagAssignments.taskId, taskId));

        // Add new tag assignments if any
        if (tagIds.length > 0) {
          const assignments: NewTaskTagAssignment[] = tagIds.map((tagId) => ({
            taskId,
            tagId,
          }));

          await tx.insert(taskTagAssignments).values(assignments);
        }
      });

      logger.info("Task tags assigned", {
        component: "TaskTagsQueries.assignTagsToTask",
        taskId,
        tagCount: tagIds.length,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to assign tags to task", {
        component: "TaskTagsQueries.assignTagsToTask",
        taskId,
        error,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to assign tags to task")
      );
    }
  }

  /**
   * Remove a tag assignment from a task
   */
  static async removeTagFromTask(
    taskId: string,
    tagId: string
  ): Promise<Result<void, Error>> {
    try {
      await db
        .delete(taskTagAssignments)
        .where(
          and(
            eq(taskTagAssignments.taskId, taskId),
            eq(taskTagAssignments.tagId, tagId)
          )
        );

      logger.info("Tag removed from task", {
        component: "TaskTagsQueries.removeTagFromTask",
        taskId,
        tagId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to remove tag from task", {
        component: "TaskTagsQueries.removeTagFromTask",
        taskId,
        tagId,
        error,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to remove tag from task")
      );
    }
  }

  /**
   * Delete a tag (and all its assignments)
   */
  static async deleteTag(tagId: string): Promise<Result<void, Error>> {
    try {
      // The cascade delete on the foreign key will remove all assignments
      await db.delete(taskTags).where(eq(taskTags.id, tagId));

      logger.info("Tag deleted", {
        component: "TaskTagsQueries.deleteTag",
        tagId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to delete tag", {
        component: "TaskTagsQueries.deleteTag",
        tagId,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to delete tag")
      );
    }
  }

  /**
   * Get tag assignments for multiple tasks
   * Useful for batch loading tags
   */
  static async getTagsForTasks(
    taskIds: string[]
  ): Promise<Result<Map<string, TaskTag[]>, Error>> {
    try {
      if (taskIds.length === 0) {
        return ok(new Map());
      }

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

      // Group tags by task ID
      const tagsByTask = new Map<string, TaskTag[]>();
      for (const assignment of assignments) {
        const existing = tagsByTask.get(assignment.taskId) ?? [];
        existing.push(assignment.tag);
        tagsByTask.set(assignment.taskId, existing);
      }

      return ok(tagsByTask);
    } catch (error) {
      logger.error("Failed to fetch tags for tasks", {
        component: "TaskTagsQueries.getTagsForTasks",
        taskCount: taskIds.length,
        error,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to fetch tags for tasks")
      );
    }
  }
}

