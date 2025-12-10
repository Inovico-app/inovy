import type { BetterAuthUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { del } from "@vercel/blob";
import { err, ok } from "neverthrow";
import { getAuthSession } from "../../lib/auth/auth-helpers";
import { CacheInvalidation } from "../../lib/cache-utils";
import { logger } from "../../lib/logger";
import { getCachedProjectByIdWithCreator } from "../cache/project.cache";
import type { AllowedStatus } from "../data-access/projects.queries";
import { ProjectQueries } from "../data-access/projects.queries";
import { RecordingsQueries } from "../data-access/recordings.queries";
import type { Recording } from "../db/schema/recordings";
import type {
  CreateProjectDto,
  ProjectDto,
  ProjectFiltersDto,
  ProjectWithCreatorDetailsDto,
  ProjectWithCreatorDto,
  ProjectWithRecordingCountDto,
} from "../dto/project.dto";
import type { CreateProjectInput } from "../validation/create-project";

/**
 * Business logic layer for Project operations
 * Orchestrates data access and handles business rules
 */
export class ProjectService {
  /**
   * Get a project by ID for the authenticated user's organization with creator details
   */
  static async getProjectById(
    projectId: string
  ): Promise<ActionResult<ProjectWithCreatorDetailsDto>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();

      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "ProjectService.getProjectById"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "ProjectService.getProjectById"
          )
        );
      }

      // Get project with creator details using Next.js cache (includes JOIN with user table)
      const project = await getCachedProjectByIdWithCreator(
        projectId,
        organization.id
      );

      if (!project) {
        return err(
          ActionErrors.notFound("Project", "ProjectService.getProjectById")
        );
      }

      // Split creator name into givenName and familyName (matching UserService logic)
      const nameParts = project.creatorName?.split(" ") ?? [];
      const givenName = nameParts[0] ?? null;
      const familyName = nameParts.slice(1).join(" ") || null;

      const projectWithDetails: ProjectWithCreatorDetailsDto = {
        ...project,
        createdBy: {
          id: project.createdById,
          givenName,
          familyName,
          email: project.creatorEmail ?? null,
        },
      };

      return ok(projectWithDetails);
    } catch (error) {
      logger.error("Failed to get project", { projectId }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get project",
          error as Error,
          "ProjectService.getProjectById"
        )
      );
    }
  }

  /**
   * Get all projects for the authenticated user's organization
   */
  static async getProjectsByOrganization(
    filters?: ProjectFiltersDto
  ): Promise<ActionResult<ProjectWithCreatorDto[]>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "ProjectService.getProjectsByOrganization"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "ProjectService.getProjectsByOrganization"
          )
        );
      }

      // Get all active projects in the organization using data access layer
      const projectFilters: ProjectFiltersDto = filters ?? {
        organizationId: organization.id,
        status: "active",
      };

      const projects =
        await ProjectQueries.findByOrganizationWithCreator(projectFilters);

      return ok(projects);
    } catch (error) {
      const errorMessage = "Failed to get projects";
      logger.error(errorMessage, { filters }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get projects",
          error as Error,
          "ProjectService.getProjectsByOrganization"
        )
      );
    }
  }

  /**
   * Get all projects with recording counts for the authenticated user's organization
   */
  static async getProjectsByOrganizationWithRecordingCount(
    status?: AllowedStatus
  ): Promise<ActionResult<ProjectWithRecordingCountDto[]>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "ProjectService.getProjectsByOrganizationWithRecordingCount"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "ProjectService.getProjectsByOrganizationWithRecordingCount"
          )
        );
      }

      // Get projects with recording counts
      const filters: ProjectFiltersDto = {
        organizationId: organization.id,
        status: status ?? "active",
      };

      const projects =
        await ProjectQueries.findByOrganizationWithRecordingCount(filters);

      return ok(projects);
    } catch (error) {
      const errorMessage = "Failed to get projects with recording counts";
      logger.error(errorMessage, {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get projects with recording counts",
          error as Error,
          "ProjectService.getProjectsByOrganizationWithRecordingCount"
        )
      );
    }
  }

  /**
   * Get project count for the authenticated user's organization
   */
  static async getProjectCount(
    status?: AllowedStatus
  ): Promise<ActionResult<number>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "ProjectService.getProjectCount"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "ProjectService.getProjectCount"
          )
        );
      }

      // Get count using data access layer
      const count = await ProjectQueries.countByOrganization(
        organization.id,
        status
      );

      return ok(count);
    } catch (error) {
      const errorMessage = "Failed to get project count";
      logger.error(errorMessage, { status }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get project count",
          error as Error,
          "ProjectService.getProjectCount"
        )
      );
    }
  }

  /**
   * Create a project
   */
  static async createProject(
    input: CreateProjectInput,
    user: NonNullable<BetterAuthUser>,
    orgCode: string
  ): Promise<ActionResult<ProjectDto>> {
    // Validate project name uniqueness
    const existing = await ProjectQueries.findByName(input.name);
    if (existing) {
      return err(
        ActionErrors.conflict("Project name is already taken", "create-project")
      );
    }
    const projectData: CreateProjectDto = {
      name: input.name,
      description: input.description,
      organizationId: orgCode,
      createdById: user.id,
    };
    try {
      const project = await ProjectQueries.create(projectData);
      CacheInvalidation.invalidateProjectCache(orgCode);
      return ok(project);
    } catch (error) {
      logger.error(
        "Failed to create project",
        { input, orgCode, user },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to create project",
          error as Error,
          "ProjectService.createProject"
        )
      );
    }
  }

  /**
   * Update a project
   */
  static async updateProject(
    projectId: string,
    input: { name?: string; description?: string },
    orgCode: string
  ): Promise<ActionResult<ProjectDto>> {
    if (input.name) {
      const existing = await ProjectQueries.findByName(input.name);
      if (existing && existing.id !== projectId) {
        return err(
          ActionErrors.conflict(
            "Project name is already taken",
            "update-project"
          )
        );
      }
    }
    try {
      const project = await ProjectQueries.update(projectId, orgCode, {
        name: input.name,
        description: input.description,
      });
      if (!project) {
        return err(
          ActionErrors.notFound("Project", "ProjectService.updateProject")
        );
      }
      CacheInvalidation.invalidateProjectCache(orgCode);
      return ok(project);
    } catch (error) {
      logger.error(
        "Failed to update project",
        { projectId, input, orgCode },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to update project",
          error as Error,
          "ProjectService.updateProject"
        )
      );
    }
  }

  /**
   * Archive a project
   */
  static async archiveProject(
    projectId: string,
    orgCode: string
  ): Promise<ActionResult<boolean>> {
    try {
      const result = await ProjectQueries.softDelete(projectId, orgCode);

      if (result) {
        CacheInvalidation.invalidateProjectCache(orgCode);
      }

      return ok(result);
    } catch (error) {
      const errorMessage = "Failed to archive project";
      logger.error(errorMessage, { projectId }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to archive project",
          error as Error,
          "ProjectService.archiveProject"
        )
      );
    }
  }

  /**
   * Unarchive a project
   */
  static async unarchiveProject(
    projectId: string,
    orgCode: string
  ): Promise<ActionResult<boolean>> {
    try {
      const result = await ProjectQueries.unarchive(projectId, orgCode);

      if (result) {
        CacheInvalidation.invalidateProjectCache(orgCode);
      }

      return ok(result);
    } catch (error) {
      const errorMessage = "Failed to unarchive project";
      logger.error(errorMessage, { projectId }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to unarchive project",
          error as Error,
          "ProjectService.unarchiveProject"
        )
      );
    }
  }

  /**
   * Get project statistics (recording counts, etc.)
   */
  static async getProjectStatistics(
    projectId: string,
    orgCode: string
  ): Promise<ActionResult<{ recordingCount: number }>> {
    try {
      const stats = await ProjectQueries.getProjectStatistics(
        projectId,
        orgCode
      );

      if (!stats) {
        return err(
          ActionErrors.notFound(
            "Project",
            "ProjectService.getProjectStatistics"
          )
        );
      }

      return ok(stats);
    } catch (error) {
      const errorMessage = "Failed to get project statistics";
      logger.error(errorMessage, { projectId }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get project statistics",
          error as Error,
          "ProjectService.getProjectStatistics"
        )
      );
    }
  }

  /**
   * Delete a project permanently (hard delete with blob cleanup)
   * WARNING: This is destructive and cannot be undone
   */
  static async deleteProject(
    projectId: string,
    orgCode: string,
    userId: string
  ): Promise<ActionResult<boolean>> {
    logger.info("Deleting project", {
      component: "ProjectService.deleteProject",
      projectId,
    });
    try {
      // First, get the project to verify ownership
      const project = await ProjectQueries.findByIdWithCreator(
        projectId,
        orgCode
      );
      if (!project) {
        return err(
          ActionErrors.notFound("Project", "ProjectService.deleteProject")
        );
      }
      // Verify ownership - only creator can delete
      if (project.createdById !== userId) {
        return err(
          ActionErrors.forbidden(
            "Only the project creator can delete this project",
            { projectId },
            "ProjectService.deleteProject"
          )
        );
      }
      // Get all recordings for this project to delete their files from blob storage
      const recordings: Recording[] =
        await RecordingsQueries.selectRecordingsByProjectId(
          projectId,
          orgCode,
          {
            includeArchived: true,
          }
        );
      logger.info("Deleting recordings from blob storage", {
        component: "ProjectService.deleteProject",
        projectId,
        recordingCount: recordings.length,
      });
      // Delete all recording files from Vercel Blob storage
      const blobDeletionPromises = recordings.map(async (recording) => {
        try {
          await del(recording.fileUrl);
          logger.info("Deleted recording file from blob storage", {
            component: "ProjectService.deleteProject",
            recordingId: recording.id,
            fileUrl: recording.fileUrl,
          });
        } catch (error) {
          logger.warn("Failed to delete recording file from blob storage", {
            component: "ProjectService.deleteProject",
            recordingId: recording.id,
            fileUrl: recording.fileUrl,
            error,
          });
        }
      });
      await Promise.allSettled(blobDeletionPromises);
      // Delete the project from database (cascade will handle related records)
      const deleteResult = await ProjectQueries.hardDelete(projectId, orgCode);
      if (!deleteResult) {
        return err(
          ActionErrors.internal(
            "Failed to delete project from database",
            undefined,
            "ProjectService.deleteProject"
          )
        );
      }
      // Invalidate all project caches
      CacheInvalidation.invalidateProjectCache(orgCode);
      logger.info("Successfully deleted project", {
        component: "ProjectService.deleteProject",
        projectId,
        recordingsDeleted: recordings.length,
      });
      return ok(true);
    } catch (error) {
      logger.error("Failed to delete project", {
        component: "ProjectService.deleteProject",
        error,
        projectId,
      });
      return err(
        ActionErrors.internal(
          "Failed to delete project",
          error as Error,
          "ProjectService.deleteProject"
        )
      );
    }
  }
}

