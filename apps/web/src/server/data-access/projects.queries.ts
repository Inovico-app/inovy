import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema/auth";
import { projects } from "../db/schema/projects";
import { recordings } from "../db/schema/recordings";
import type {
  CreateProjectDto,
  ProjectDto,
  ProjectWithCreatorDto,
  ProjectWithRecordingCountDto,
} from "../dto/project.dto";

const allowedStatus = ["active", "archived", "completed"] as const;
export type AllowedStatus = (typeof allowedStatus)[number];

/**
 * Database queries for Project operations
 * Pure data access layer - no business logic
 */

export class ProjectQueries {
  /**
   * Create a new project in the database
   */
  static async create(data: CreateProjectDto): Promise<ProjectDto> {
    return await db.transaction(async (tx) => {
      const [project] = await tx
        .insert(projects)
        .values({
          name: data.name,
          description: data.description || null,
          status: "active",
          organizationId: data.organizationId,
          createdById: data.createdById,
        })
        .returning();

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        organizationId: project.organizationId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
    });
  }

  /**
   * Find a project by ID with creator information
   * Fetches creator details using a JOIN with the user table
   */
  static async findByIdWithCreator(
    projectId: string,
    organizationId: string
  ): Promise<ProjectWithCreatorDto | null> {
    const result = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        organizationId: projects.organizationId,
        createdById: projects.createdById,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        creatorName: users.name,
        creatorEmail: users.email,
        creatorImage: users.image,
      })
      .from(projects)
      .leftJoin(users, eq(projects.createdById, users.id))
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId)
        )
      )
      .limit(1);

    if (result.length === 0) return null;

    const project = result[0];
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      organizationId: project.organizationId,
      createdById: project.createdById,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      creatorName: project.creatorName,
      creatorEmail: project.creatorEmail,
      creatorImage: project.creatorImage,
    };
  }

  /**
   * Get organization ID for a project by project ID
   * Used for resolving organization context when only project ID is known
   */
  static async getOrganizationIdByProjectId(
    projectId: string
  ): Promise<string | null> {
    const result = await db
      .select({ organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    return result.length > 0 ? result[0]?.organizationId ?? null : null;
  }

  /**
   * Find a basic project by ID
   */
  static async findById(
    projectId: string,
    organizationId: string
  ): Promise<ProjectDto | null> {
    const result = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        organizationId: projects.organizationId,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId)
        )
      )
      .limit(1);

    if (result.length === 0) return null;

    return result[0];
  }

  /**
   * Find a project by name
   */
  static async findByName(name: string): Promise<ProjectDto | null> {
    const result = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        organizationId: projects.organizationId,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(eq(projects.name, name))
      .limit(1);

    if (result.length === 0) return null;

    return result[0];
  }

  /**
   * Find projects by organization with creator information
   * Fetches creator details using a JOIN with the user table
   */
  static async findByOrganizationWithCreator(filters: {
    organizationId: string;
    status?: AllowedStatus;
  }): Promise<ProjectWithCreatorDto[]> {
    const whereConditions = [
      eq(projects.organizationId, filters.organizationId),
    ];

    if (filters.status) {
      whereConditions.push(eq(projects.status, filters.status));
    }

    const result = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        organizationId: projects.organizationId,
        createdById: projects.createdById,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        creatorName: users.name,
        creatorEmail: users.email,
        creatorImage: users.image,
      })
      .from(projects)
      .leftJoin(users, eq(projects.createdById, users.id))
      .where(and(...whereConditions));

    return result.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      organizationId: project.organizationId,
      createdById: project.createdById,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      creatorName: project.creatorName,
      creatorEmail: project.creatorEmail,
      creatorImage: project.creatorImage,
    }));
  }

  /**
   * Count projects by organization
   */
  static async countByOrganization(
    organizationId: string,
    status?: AllowedStatus
  ): Promise<number> {
    const whereConditions = [eq(projects.organizationId, organizationId)];

    if (status) {
      whereConditions.push(eq(projects.status, status));
    }

    const result = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(...whereConditions));

    return result.length;
  }

  /**
   * Update a project
   */
  static async update(
    projectId: string,
    organizationId: string,
    data: { name?: string; description?: string | null }
  ): Promise<ProjectDto | null> {
    return await db.transaction(async (tx) => {
      const [project] = await tx
        .update(projects)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )
        .returning();

      if (!project) return null;

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        organizationId: project.organizationId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
    });
  }

  /**
   * Delete a project (soft delete by changing status)
   */
  static async softDelete(
    projectId: string,
    organizationId: string
  ): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const result = await tx
        .update(projects)
        .set({
          status: "archived",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )
        .returning();

      return result.length > 0;
    });
  }

  /**
   * Unarchive a project (restore from archived status)
   */
  static async unarchive(
    projectId: string,
    organizationId: string
  ): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const result = await tx
        .update(projects)
        .set({
          status: "active",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )
        .returning();

      return result.length > 0;
    });
  }

  /**
   * Find projects by organization with recording counts
   * Fetches creator details using a JOIN with the user table
   */
  static async findByOrganizationWithRecordingCount(filters: {
    organizationId: string;
    status?: AllowedStatus;
  }): Promise<ProjectWithRecordingCountDto[]> {
    const whereConditions = [
      eq(projects.organizationId, filters.organizationId),
    ];

    if (filters.status) {
      whereConditions.push(eq(projects.status, filters.status));
    }

    const result = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        organizationId: projects.organizationId,
        createdById: projects.createdById,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        recordingCount: sql<number>`cast(count(${recordings.id}) as int)`,
        creatorName: users.name,
        creatorEmail: users.email,
        creatorImage: users.image,
      })
      .from(projects)
      .leftJoin(recordings, eq(projects.id, recordings.projectId))
      .leftJoin(users, eq(projects.createdById, users.id))
      .where(and(...whereConditions))
      .groupBy(projects.id, users.id, users.name, users.email, users.image);

    return result.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      organizationId: project.organizationId,
      createdById: project.createdById,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      recordingCount: project.recordingCount,
      creatorName: project.creatorName,
      creatorEmail: project.creatorEmail,
      creatorImage: project.creatorImage,
    }));
  }

  /**
   * Get statistics about a project (recording counts, etc.)
   */
  static async getProjectStatistics(
    projectId: string,
    organizationId: string
  ): Promise<{ recordingCount: number } | null> {
    const result = await db
      .select({
        recordingCount: sql<number>`cast(count(${recordings.id}) as int)`,
      })
      .from(projects)
      .leftJoin(recordings, eq(projects.id, recordings.projectId))
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId)
        )
      )
      .groupBy(projects.id)
      .limit(1);

    if (result.length === 0) return null;

    return result[0];
  }

  /**
   * Hard delete a project (permanently removes project and cascades to related data)
   * WARNING: This is destructive and cannot be undone
   */
  static async hardDelete(
    projectId: string,
    organizationId: string
  ): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const result = await tx
        .delete(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        );

      return result.rowCount !== null && result.rowCount > 0;
    });
  }
}

