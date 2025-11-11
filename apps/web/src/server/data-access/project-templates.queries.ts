import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { projectTemplates } from "../db/schema";
import type {
  CreateProjectTemplateDto,
  ProjectTemplateDto,
  UpdateProjectTemplateDto,
} from "../dto";

/**
 * Database queries for ProjectTemplate operations
 * Pure data access layer - no business logic
 */

export class ProjectTemplateQueries {
  /**
   * Create a new project template in the database
   */
  static async create(
    data: CreateProjectTemplateDto
  ): Promise<ProjectTemplateDto> {
    return await db.transaction(async (tx) => {
      const [template] = await tx
        .insert(projectTemplates)
        .values({
          projectId: data.projectId,
          instructions: data.instructions,
          organizationId: data.organizationId,
          createdById: data.createdById,
        })
        .returning();

      return {
        id: template.id,
        projectId: template.projectId,
        instructions: template.instructions,
        organizationId: template.organizationId,
        createdById: template.createdById,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };
    });
  }

  /**
   * Find a template by project ID
   */
  static async findByProjectId(
    projectId: string,
    organizationId: string
  ): Promise<ProjectTemplateDto | null> {
    const result = await db
      .select()
      .from(projectTemplates)
      .where(
        and(
          eq(projectTemplates.projectId, projectId),
          eq(projectTemplates.organizationId, organizationId)
        )
      )
      .limit(1);

    if (result.length === 0) return null;

    const template = result[0];
    return {
      id: template.id,
      projectId: template.projectId,
      instructions: template.instructions,
      organizationId: template.organizationId,
      createdById: template.createdById,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /**
   * Find a template by ID with organization verification
   */
  static async findById(
    id: string,
    organizationId: string
  ): Promise<ProjectTemplateDto | null> {
    const result = await db
      .select()
      .from(projectTemplates)
      .where(
        and(
          eq(projectTemplates.id, id),
          eq(projectTemplates.organizationId, organizationId)
        )
      )
      .limit(1);

    if (result.length === 0) return null;

    const template = result[0];
    return {
      id: template.id,
      projectId: template.projectId,
      instructions: template.instructions,
      organizationId: template.organizationId,
      createdById: template.createdById,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /**
   * Update a project template
   */
  static async update(
    id: string,
    organizationId: string,
    data: UpdateProjectTemplateDto
  ): Promise<ProjectTemplateDto | null> {
    return await db.transaction(async (tx) => {
      const [template] = await tx
        .update(projectTemplates)
        .set({
          instructions: data.instructions,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projectTemplates.id, id),
            eq(projectTemplates.organizationId, organizationId)
          )
        )
        .returning();

      if (!template) return null;

      return {
        id: template.id,
        projectId: template.projectId,
        instructions: template.instructions,
        organizationId: template.organizationId,
        createdById: template.createdById,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };
    });
  }

  /**
   * Delete a project template
   */
  static async delete(id: string, organizationId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const deletedRows = await tx
        .delete(projectTemplates)
        .where(
          and(
            eq(projectTemplates.id, id),
            eq(projectTemplates.organizationId, organizationId)
          )
        )
        .returning();

      return deletedRows.length > 0;
    });
  }
}

