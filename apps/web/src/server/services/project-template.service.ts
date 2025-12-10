import type { BetterAuthUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { err, ok } from "neverthrow";
import { getAuthSession } from "../../lib/auth/auth-helpers";
import { CacheInvalidation } from "../../lib/cache-utils";
import { logger } from "../../lib/logger";
import { ProjectTemplateQueries } from "../data-access/project-templates.queries";
import type {
  CreateProjectTemplateDto,
  ProjectTemplateDto,
  UpdateProjectTemplateDto,
} from "../dto/project-template.dto";

/**
 * Business logic layer for ProjectTemplate operations
 * Orchestrates data access and handles business rules
 */
export class ProjectTemplateService {
  /**
   * Get a project template by project ID
   */
  static async getProjectTemplateByProjectId(
    projectId: string
  ): Promise<ActionResult<ProjectTemplateDto | null>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();

      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "ProjectTemplateService.getProjectTemplateByProjectId"
          )
        );
      }

      const { organization } = authResult.value;

      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "ProjectTemplateService.getProjectTemplateByProjectId"
          )
        );
      }

      // Get template
      const template = await ProjectTemplateQueries.findByProjectId(
        projectId,
        organization.id
      );

      return ok(template);
    } catch (error) {
      logger.error(
        "Failed to get project template",
        { projectId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get project template",
          error as Error,
          "ProjectTemplateService.getProjectTemplateByProjectId"
        )
      );
    }
  }

  /**
   * Create a new project template
   */
  static async createProjectTemplate(
    input: { projectId: string; instructions: string },
    user: NonNullable<BetterAuthUser>,
    orgCode: string
  ): Promise<ActionResult<ProjectTemplateDto>> {
    try {
      // Check if template already exists for this project
      const existing = await ProjectTemplateQueries.findByProjectId(
        input.projectId,
        orgCode
      );

      if (existing) {
        return err(
          ActionErrors.conflict(
            "Template already exists for this project",
            "create-project-template"
          )
        );
      }

      const templateData: CreateProjectTemplateDto = {
        projectId: input.projectId,
        instructions: input.instructions,
        organizationId: orgCode,
        createdById: user.id,
      };

      const template = await ProjectTemplateQueries.create(templateData);

      // Invalidate cache
      CacheInvalidation.invalidateProjectTemplate(input.projectId);

      return ok(template);
    } catch (error) {
      logger.error(
        "Failed to create project template",
        { projectId: input.projectId, orgCode, user },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to create project template",
          error as Error,
          "ProjectTemplateService.createProjectTemplate"
        )
      );
    }
  }

  /**
   * Update a project template
   */
  static async updateProjectTemplate(
    templateId: string,
    input: { instructions: string },
    orgCode: string
  ): Promise<ActionResult<ProjectTemplateDto>> {
    try {
      // Get existing template
      const existing = await ProjectTemplateQueries.findById(
        templateId,
        orgCode
      );

      if (!existing) {
        return err(
          ActionErrors.notFound(
            "Template",
            "ProjectTemplateService.updateProjectTemplate"
          )
        );
      }

      const updateData: UpdateProjectTemplateDto = {
        instructions: input.instructions,
      };

      const template = await ProjectTemplateQueries.update(
        templateId,
        orgCode,
        updateData
      );

      if (!template) {
        return err(
          ActionErrors.notFound(
            "Template",
            "ProjectTemplateService.updateProjectTemplate"
          )
        );
      }

      // Invalidate cache
      CacheInvalidation.invalidateProjectTemplate(existing.projectId);

      return ok(template);
    } catch (error) {
      logger.error(
        "Failed to update project template",
        { templateId, orgCode },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to update project template",
          error as Error,
          "ProjectTemplateService.updateProjectTemplate"
        )
      );
    }
  }

  /**
   * Delete a project template
   */
  static async deleteProjectTemplate(
    templateId: string,
    orgCode: string
  ): Promise<ActionResult<boolean>> {
    try {
      // Get existing template to find project ID for cache invalidation
      const existing = await ProjectTemplateQueries.findById(
        templateId,
        orgCode
      );

      if (!existing) {
        return err(
          ActionErrors.notFound(
            "Template",
            "ProjectTemplateService.deleteProjectTemplate"
          )
        );
      }

      const result = await ProjectTemplateQueries.delete(templateId, orgCode);

      if (result) {
        // Invalidate cache
        CacheInvalidation.invalidateProjectTemplate(existing.projectId);
      }

      return ok(result);
    } catch (error) {
      logger.error(
        "Failed to delete project template",
        { templateId, orgCode },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to delete project template",
          error as Error,
          "ProjectTemplateService.deleteProjectTemplate"
        )
      );
    }
  }
}

