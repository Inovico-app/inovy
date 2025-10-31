import { safeAsync, type ActionResult, ActionErrors } from "@/lib";
import { del } from "@vercel/blob";
import { err, ok, type Result } from "neverthrow";
import { getAuthSession, type AuthUser } from "../../lib/auth";
import { CacheInvalidation } from "../../lib/cache-utils";
import { logger } from "../../lib/logger";
import { getCachedProjectByIdWithCreator } from "../cache";
import { ProjectQueries } from "../data-access";
import type { AllowedStatus } from "../data-access/projects.queries";
import { selectRecordingsByProjectId } from "../data-access/recordings.queries";
import type {
  CreateProjectDto,
  ProjectDto,
  ProjectFiltersDto,
  ProjectWithCreatorDetailsDto,
  ProjectWithCreatorDto,
  ProjectWithRecordingCountDto,
} from "../dto";
import { checkProjectNameUnique } from "../helpers/project";
import type { CreateProjectInput } from "../validation/create-project";
import { KindeUserService } from "./kinde-user.service";

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
  ): Promise<Result<ProjectWithCreatorDetailsDto, string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();

      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // Get project with creator ID using Next.js cache
      const project = await getCachedProjectByIdWithCreator(
        projectId,
        organization.orgCode
      );

      if (!project) {
        return err("Project not found");
      }

      // Fetch creator details from Kinde API
      const creatorResult = await KindeUserService.getUserById(
        project.createdById
      );

      if (creatorResult.isErr()) {
        logger.warn("Failed to fetch creator details from Kinde", {
          projectId,
          createdById: project.createdById,
        });
      }

      const creator = creatorResult.isOk() ? creatorResult.value : null;

      const projectWithDetails: ProjectWithCreatorDetailsDto = {
        ...project,
        createdBy: {
          id: project.createdById,
          givenName: creator?.given_name || null,
          familyName: creator?.family_name || null,
          email: creator?.email || null,
        },
      };

      return ok(projectWithDetails);
    } catch (error) {
      const errorMessage = "Failed to get project";
      logger.error(errorMessage, { projectId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get all projects for the authenticated user's organization
   */
  static async getProjectsByOrganization(): Promise<
    Result<ProjectWithCreatorDto[], string>
  > {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // Get all active projects in the organization using data access layer
      const filters: ProjectFiltersDto = {
        organizationId: organization.orgCode,
        status: "active",
      };

      const projects = await ProjectQueries.findByOrganizationWithCreator(
        filters
      );

      return ok(projects);
    } catch (error) {
      const errorMessage = "Failed to get projects";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get all projects with recording counts for the authenticated user's organization
   */
  static async getProjectsByOrganizationWithRecordingCount(
    status?: AllowedStatus
  ): Promise<Result<ProjectWithRecordingCountDto[], string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // Get projects with recording counts
      const filters: ProjectFiltersDto = {
        organizationId: organization.orgCode,
        status: status || "active",
      };

      const projects =
        await ProjectQueries.findByOrganizationWithRecordingCount(filters);

      return ok(projects);
    } catch (error) {
      const errorMessage = "Failed to get projects with recording counts";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get project count for the authenticated user's organization
   */
  static async getProjectCount(
    status?: AllowedStatus
  ): Promise<Result<number, string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // Get count using data access layer
      const count = await ProjectQueries.countByOrganization(
        organization.orgCode,
        status
      );

      return ok(count);
    } catch (error) {
      const errorMessage = "Failed to get project count";
      logger.error(errorMessage, { status }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Create a project
   */
  static async createProject(
    input: CreateProjectInput,
    user: NonNullable<AuthUser>,
    orgCode: string
  ): Promise<ActionResult<ProjectDto>> {
    // Ensure project name is unique
    const projectNameUniqueResult = await checkProjectNameUnique(input.name);
    if (projectNameUniqueResult.isErr()) {
      return err(
        ActionErrors.conflict("Project name is already taken", "create-project")
      );
    }

    const projectData: CreateProjectDto = {
      name: input.name,
      description: input.description,
      organizationId: orgCode, // Kinde organization code
      createdById: user.id, // Kinde user ID
    };

    console.log("DO WEG ET HERE, PROJECT DATA:", projectData);

    const createResult = await safeAsync(
      () => ProjectQueries.create(projectData),
      "project-creation"
    );

    CacheInvalidation.invalidateProjectCache(orgCode);

    return createResult;
  }

  /**
   * Update a project
   */
  static async updateProject(
    projectId: string,
    input: { name?: string; description?: string },
    orgCode: string
  ): Promise<ActionResult<ProjectDto>> {
    // If name is being updated, check uniqueness
    if (input.name) {
      const projectNameUniqueResult = await checkProjectNameUnique(input.name);
      if (projectNameUniqueResult.isErr()) {
        return err(
          ActionErrors.conflict(
            "Project name is already taken",
            "update-project"
          )
        );
      }
    }

    const updateResult = await safeAsync(
      async () => {
        const project = await ProjectQueries.update(projectId, orgCode, {
          name: input.name,
          description: input.description,
        });
        if (!project) {
          throw new Error("Project not found");
        }
        return project;
      },
      "project-update"
    );

    if (updateResult.isOk()) {
      CacheInvalidation.invalidateProjectCache(orgCode);
    }

    return updateResult;
  }

  /**
   * Archive a project
   */
  static async archiveProject(
    projectId: string,
    orgCode: string
  ): Promise<Result<boolean, string>> {
    try {
      const result = await ProjectQueries.softDelete(projectId, orgCode);

      if (result) {
        CacheInvalidation.invalidateProjectCache(orgCode);
      }

      return ok(result);
    } catch (error) {
      const errorMessage = "Failed to archive project";
      logger.error(errorMessage, { projectId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Unarchive a project
   */
  static async unarchiveProject(
    projectId: string,
    orgCode: string
  ): Promise<Result<boolean, string>> {
    try {
      const result = await ProjectQueries.unarchive(projectId, orgCode);

      if (result) {
        CacheInvalidation.invalidateProjectCache(orgCode);
      }

      return ok(result);
    } catch (error) {
      const errorMessage = "Failed to unarchive project";
      logger.error(errorMessage, { projectId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get project statistics (recording counts, etc.)
   */
  static async getProjectStatistics(
    projectId: string,
    orgCode: string
  ): Promise<Result<{ recordingCount: number }, string>> {
    try {
      const stats = await ProjectQueries.getProjectStatistics(
        projectId,
        orgCode
      );

      if (!stats) {
        return err("Project not found");
      }

      return ok(stats);
    } catch (error) {
      const errorMessage = "Failed to get project statistics";
      logger.error(errorMessage, { projectId }, error as Error);
      return err(errorMessage);
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
      const projectResult = await ProjectQueries.findByIdWithCreator(
        projectId,
        orgCode
      );

      if (!projectResult) {
        return err(
          ActionErrors.notFound("Project", "ProjectService.deleteProject")
        );
      }

      // Verify ownership - only creator can delete
      if (projectResult.createdById !== userId) {
        return err(
          ActionErrors.forbidden(
            "Only the project creator can delete this project",
            { projectId },
            "ProjectService.deleteProject"
          )
        );
      }

      // Get all recordings for this project to delete their files from blob storage
      const recordingsResult = await selectRecordingsByProjectId(projectId, {
        includeArchived: true, // Include all recordings
      });

      if (recordingsResult.isErr()) {
        logger.error("Failed to fetch recordings for project deletion", {
          component: "ProjectService.deleteProject",
          error: recordingsResult.error,
          projectId,
        });
        return err(
          ActionErrors.internal(
            "Failed to fetch project recordings",
            new Error(recordingsResult.error),
            "ProjectService.deleteProject"
          )
        );
      }

      const recordings = recordingsResult.value;

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
          // Log error but don't fail the entire operation
          // Files might already be deleted or blob URL might be invalid
          logger.warn("Failed to delete recording file from blob storage", {
            component: "ProjectService.deleteProject",
            recordingId: recording.id,
            fileUrl: recording.fileUrl,
            error,
          });
        }
      });

      // Wait for all blob deletions to complete (or fail individually)
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

