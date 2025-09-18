import { and, eq } from "drizzle-orm";
import { CacheService } from "../cache";
import { db } from "../db";
import { projects, users } from "../db/schema";
import type {
  CreateProjectDto,
  ProjectDto,
  ProjectWithCreatorDto,
} from "../dto/project.dto";

/**
 * Database queries for Project operations
 * Pure data access layer - no business logic
 */

export class ProjectQueries {
  /**
   * Create a new project in the database
   */
  static async create(data: CreateProjectDto): Promise<ProjectDto> {
    const [project] = await db
      .insert(projects)
      .values({
        name: data.name,
        description: data.description || null,
        status: "active",
        organizationId: data.organizationId,
        createdById: data.createdById,
      })
      .returning();

    const result = {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      organizationId: project.organizationId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    // Invalidate related cache after creation
    await CacheService.INVALIDATION.invalidateProjectCache(data.organizationId);

    return result;
  }

  /**
   * Find a project by ID with creator information
   */
  static async findByIdWithCreator(
    projectId: string,
    organizationId: string
  ): Promise<ProjectWithCreatorDto | null> {
    const cacheKey = CacheService.KEYS.PROJECT_BY_ID(projectId);

    return CacheService.withCache(
      cacheKey,
      async () => {
        const result = await db
          .select({
            id: projects.id,
            name: projects.name,
            description: projects.description,
            status: projects.status,
            organizationId: projects.organizationId,
            createdAt: projects.createdAt,
            updatedAt: projects.updatedAt,
            createdBy: {
              id: users.id,
              givenName: users.givenName,
              familyName: users.familyName,
              email: users.email,
            },
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
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          createdBy: project.createdBy || {
            id: "",
            givenName: null,
            familyName: null,
            email: "Unknown",
          },
        };
      },
      { ttl: CacheService.TTL.PROJECT }
    );
  }

  /**
   * Find a basic project by ID
   */
  static async findById(
    projectId: string,
    organizationId: string
  ): Promise<ProjectDto | null> {
    const cacheKey = `${CacheService.KEYS.PROJECT_BY_ID(projectId)}:basic`;

    return CacheService.withCache(
      cacheKey,
      async () => {
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
      },
      { ttl: CacheService.TTL.PROJECT }
    );
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
   * Delete a project (soft delete by changing status)
   */
  static async softDelete(
    projectId: string,
    organizationId: string
  ): Promise<boolean> {
    const result = await db
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

    const success = result.length > 0;

    if (success) {
      // Invalidate cache after soft delete
      await CacheService.INVALIDATION.invalidateProject(
        projectId,
        organizationId
      );
    }

    return success;
  }
}

