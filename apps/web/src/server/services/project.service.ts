import type { AuthContext } from "@/lib/auth-context";
import type { ActionResult } from "@/lib/server-action-client/action-client";
import {
  ActionErrors,
  isActionError,
} from "@/lib/server-action-client/action-errors";
import { assertTeamAccess } from "@/lib/rbac/team-isolation";
import { getStorageProvider } from "./storage";
import { err, ok } from "neverthrow";
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
import type { CreateProjectInput } from "../validation/projects/create-project";
import { QdrantClientService } from "./rag/qdrant.service";

/**
 * Business logic layer for Project operations
 * Orchestrates data access and handles business rules
 *
 * All methods require an AuthContext parameter — auth is resolved by the
 * caller (action middleware, API route, or resolveAuthContext()), never
 * fetched inside the service.
 */
export class ProjectService {
  /**
   * Get a project by ID for the authenticated user's organization with creator details
   */
  static async getProjectById(
    projectId: string,
    auth: AuthContext,
  ): Promise<ActionResult<ProjectWithCreatorDetailsDto>> {
    try {
      const project = await getCachedProjectByIdWithCreator(
        projectId,
        auth.organizationId,
      );

      if (!project) {
        return err(
          ActionErrors.notFound("Project", "ProjectService.getProjectById"),
        );
      }

      // Enforce team-level access isolation
      assertTeamAccess(
        project.teamId,
        auth.userTeamIds,
        auth.user,
        "ProjectService.getProjectById",
      );

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
      // Preserve ActionErrors (e.g., from assertTeamAccess)
      if (isActionError(error)) {
        throw error;
      }
      logger.error("Failed to get project", { projectId }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get project",
          error as Error,
          "ProjectService.getProjectById",
        ),
      );
    }
  }

  /**
   * Get all projects for the authenticated user's organization
   */
  static async getProjectsByOrganization(
    auth: AuthContext,
    filters?: ProjectFiltersDto,
  ): Promise<ActionResult<ProjectWithCreatorDto[]>> {
    try {
      const projectFilters: ProjectFiltersDto = filters ?? {
        organizationId: auth.organizationId,
        status: "active",
      };

      const projects = await ProjectQueries.findByOrganizationWithCreator(
        projectFilters,
        {
          userTeamIds: auth.userTeamIds,
          user: auth.user,
        },
      );

      return ok(projects);
    } catch (error) {
      const errorMessage = "Failed to get projects";
      logger.error(errorMessage, { filters }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get projects",
          error as Error,
          "ProjectService.getProjectsByOrganization",
        ),
      );
    }
  }

  /**
   * Get all projects with recording counts for the authenticated user's organization
   */
  static async getProjectsByOrganizationWithRecordingCount(
    auth: AuthContext,
    status?: AllowedStatus,
  ): Promise<ActionResult<ProjectWithRecordingCountDto[]>> {
    try {
      const filters: ProjectFiltersDto = {
        organizationId: auth.organizationId,
        status: status ?? "active",
      };

      const projects =
        await ProjectQueries.findByOrganizationWithRecordingCount(filters, {
          userTeamIds: auth.userTeamIds,
          user: auth.user,
        });

      return ok(projects);
    } catch (error) {
      const errorMessage = "Failed to get projects with recording counts";
      logger.error(errorMessage, {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get projects with recording counts",
          error as Error,
          "ProjectService.getProjectsByOrganizationWithRecordingCount",
        ),
      );
    }
  }

  /**
   * Get project count for the authenticated user's organization
   */
  static async getProjectCount(
    auth: AuthContext,
    status?: AllowedStatus,
  ): Promise<ActionResult<number>> {
    try {
      const count = await ProjectQueries.countByOrganization(
        auth.organizationId,
        status,
        {
          userTeamIds: auth.userTeamIds,
          user: auth.user,
        },
      );

      return ok(count);
    } catch (error) {
      const errorMessage = "Failed to get project count";
      logger.error(errorMessage, { status }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get project count",
          error as Error,
          "ProjectService.getProjectCount",
        ),
      );
    }
  }

  /**
   * Create a project
   */
  static async createProject(
    input: CreateProjectInput,
    auth: AuthContext,
  ): Promise<ActionResult<ProjectDto>> {
    // Validate project name uniqueness
    const existing = await ProjectQueries.findByName(input.name);
    if (existing) {
      return err(
        ActionErrors.conflict(
          "Project name is already taken",
          "create-project",
        ),
      );
    }
    const projectData: CreateProjectDto = {
      name: input.name,
      description: input.description,
      organizationId: auth.organizationId,
      teamId: input.teamId ?? null,
      createdById: auth.user.id,
    };
    try {
      const project = await ProjectQueries.create(projectData);
      return ok(project);
    } catch (error) {
      logger.error(
        "Failed to create project",
        { input, organizationId: auth.organizationId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to create project",
          error as Error,
          "ProjectService.createProject",
        ),
      );
    }
  }

  /**
   * Update a project
   */
  static async updateProject(
    projectId: string,
    input: { name?: string; description?: string; teamId?: string | null },
    auth: AuthContext,
  ): Promise<ActionResult<ProjectDto>> {
    if (input.name) {
      const existing = await ProjectQueries.findByName(input.name);
      if (existing && existing.id !== projectId) {
        return err(
          ActionErrors.conflict(
            "Project name is already taken",
            "update-project",
          ),
        );
      }
    }
    try {
      const project = await ProjectQueries.update(
        projectId,
        auth.organizationId,
        {
          name: input.name,
          description: input.description,
          ...(input.teamId !== undefined ? { teamId: input.teamId } : {}),
        },
      );
      if (!project) {
        return err(
          ActionErrors.notFound("Project", "ProjectService.updateProject"),
        );
      }
      if (input.teamId !== undefined) {
        const qdrant = QdrantClientService.getInstance();
        const newTeamPayload = input.teamId
          ? { teamId: [input.teamId] }
          : { teamId: [] };

        await qdrant
          .setPayload(newTeamPayload, {
            must: [{ key: "projectId", match: { value: projectId } }],
          })
          .catch((error) => {
            logger.error("Failed to update Qdrant teamId for project", {
              projectId,
              teamId: input.teamId,
              error,
            });
          });
      }

      return ok(project);
    } catch (error) {
      logger.error(
        "Failed to update project",
        { projectId, input, organizationId: auth.organizationId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to update project",
          error as Error,
          "ProjectService.updateProject",
        ),
      );
    }
  }

  /**
   * Archive a project
   */
  static async archiveProject(
    projectId: string,
    auth: AuthContext,
  ): Promise<ActionResult<boolean>> {
    try {
      const result = await ProjectQueries.softDelete(
        projectId,
        auth.organizationId,
      );

      return ok(result);
    } catch (error) {
      const errorMessage = "Failed to archive project";
      logger.error(errorMessage, { projectId }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to archive project",
          error as Error,
          "ProjectService.archiveProject",
        ),
      );
    }
  }

  /**
   * Unarchive a project
   */
  static async unarchiveProject(
    projectId: string,
    auth: AuthContext,
  ): Promise<ActionResult<boolean>> {
    try {
      const result = await ProjectQueries.unarchive(
        projectId,
        auth.organizationId,
      );

      return ok(result);
    } catch (error) {
      const errorMessage = "Failed to unarchive project";
      logger.error(errorMessage, { projectId }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to unarchive project",
          error as Error,
          "ProjectService.unarchiveProject",
        ),
      );
    }
  }

  /**
   * Get project statistics (recording counts, etc.)
   */
  static async getProjectStatistics(
    projectId: string,
    auth: AuthContext,
  ): Promise<ActionResult<{ recordingCount: number }>> {
    try {
      const stats = await ProjectQueries.getProjectStatistics(
        projectId,
        auth.organizationId,
      );

      if (!stats) {
        return err(
          ActionErrors.notFound(
            "Project",
            "ProjectService.getProjectStatistics",
          ),
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
          "ProjectService.getProjectStatistics",
        ),
      );
    }
  }

  /**
   * Delete a project permanently (hard delete with blob cleanup)
   * WARNING: This is destructive and cannot be undone
   */
  static async deleteProject(
    projectId: string,
    auth: AuthContext,
  ): Promise<ActionResult<boolean>> {
    logger.info("Deleting project", {
      component: "ProjectService.deleteProject",
      projectId,
    });
    try {
      // First, get the project to verify ownership
      const project = await ProjectQueries.findByIdWithCreator(
        projectId,
        auth.organizationId,
      );
      if (!project) {
        return err(
          ActionErrors.notFound("Project", "ProjectService.deleteProject"),
        );
      }
      // Verify ownership - only creator can delete
      if (project.createdById !== auth.user.id) {
        return err(
          ActionErrors.forbidden(
            "Only the project creator can delete this project",
            { projectId },
            "ProjectService.deleteProject",
          ),
        );
      }
      // Get all recordings for this project to delete their files from blob storage
      const recordings: Recording[] =
        await RecordingsQueries.selectRecordingsByProjectId(
          projectId,
          auth.organizationId,
          {
            includeArchived: true,
          },
        );
      logger.info("Deleting recordings from blob storage", {
        component: "ProjectService.deleteProject",
        projectId,
        recordingCount: recordings.length,
      });
      // Delete all recording files from blob storage
      const storage = await getStorageProvider();
      const blobDeletionPromises = recordings.map(async (recording) => {
        try {
          await storage.del(recording.fileUrl);
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
      const deleteResult = await ProjectQueries.hardDelete(
        projectId,
        auth.organizationId,
      );
      if (!deleteResult) {
        return err(
          ActionErrors.internal(
            "Failed to delete project from database",
            undefined,
            "ProjectService.deleteProject",
          ),
        );
      }
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
          "ProjectService.deleteProject",
        ),
      );
    }
  }
}
