import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { projects, users } from "../db/schema";
import type {
  CreateProjectDto,
  ProjectDto,
  ProjectWithCreatorDto,
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
      .where(and(...whereConditions));

    return result.map((project) => ({
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
}

