import { safeAsync, type ActionResult } from "@/lib";
import { err, ok, type Result } from "neverthrow";
import { ActionErrors } from "../../lib/action-errors";
import { getAuthSession, type AuthUser } from "../../lib/auth";
import { CacheInvalidation } from "../../lib/cache-utils";
import { logger } from "../../lib/logger";
import { getCachedProjectByIdWithCreator } from "../cache";
import { ProjectQueries } from "../data-access";
import type { AllowedStatus } from "../data-access/projects.queries";
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
}

