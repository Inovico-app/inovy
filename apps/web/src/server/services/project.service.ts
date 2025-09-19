import { safeAsync, type ActionResult } from "@/lib";
import { Result, err, ok } from "neverthrow";
import { ActionErrors } from "../../lib/action-errors";
import { getAuthSession, type AuthUser } from "../../lib/auth";
import { logger } from "../../lib/logger";
import { ProjectQueries } from "../data-access";
import type { AllowedStatus } from "../data-access/projects.queries";
import type {
  CreateProjectDto,
  ProjectDto,
  ProjectFiltersDto,
  ProjectWithCreatorDto,
} from "../dto";
import { checkProjectNameUnique } from "../helpers/project";
import { findExistingUserByKindeId } from "../helpers/user";
import type { CreateProjectInput } from "../validation/create-project";
import { CacheService } from "./cache.service";

/**
 * Business logic layer for Project operations
 * Orchestrates data access and handles business rules
 */

export class ProjectService {
  /**
   * Get a project by ID for the authenticated user's organization
   */
  static async getProjectById(
    projectId: string
  ): Promise<Result<ProjectWithCreatorDto, string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();

      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser) {
        return err("Authentication required");
      }

      // Ensure user exists in database
      const syncResult = await findExistingUserByKindeId(authUser);
      if (syncResult.isErr()) {
        return err("Failed to sync user data");
      }

      const dbUser = syncResult.value;

      if (!dbUser?.organizationId) {
        return err("User organization not found");
      }

      // Get project with creator details using caching
      const cacheKey = CacheService.KEYS.PROJECT_BY_ID(projectId);

      const project = await CacheService.withCache(
        cacheKey,
        async () => {
          return await ProjectQueries.findByIdWithCreator(
            projectId,
            dbUser.organizationId
          );
        },
        { ttl: CacheService.TTL.PROJECT }
      );

      if (!project) {
        return err("Project not found");
      }

      return ok(project);
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

      if (!authUser) {
        return err("Authentication required");
      }

      // Ensure user exists in database
      const syncResult = await findExistingUserByKindeId(authUser);
      if (syncResult.isErr()) {
        return err("Failed to sync user data");
      }

      const dbUser = syncResult.value;

      if (!dbUser?.organizationId) {
        return err("User organization not found");
      }

      // Get all active projects in the organization using data access layer
      const filters: ProjectFiltersDto = {
        organizationId: dbUser.organizationId,
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

      if (!authUser) {
        return err("Authentication required");
      }

      // Ensure user exists in database
      const syncResult = await findExistingUserByKindeId(authUser);
      if (syncResult.isErr()) {
        return err("Failed to find existing user by Kinde ID");
      }

      const dbUser = syncResult.value;

      if (!dbUser?.organizationId) {
        return err("Organization not found");
      }

      // Get count using data access layer
      const count = await ProjectQueries.countByOrganization(
        dbUser.organizationId,
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
    user: NonNullable<AuthUser>
  ): Promise<ActionResult<ProjectDto>> {
    // Ensure user exists
    const userResult = await findExistingUserByKindeId(user);
    if (userResult.isErr()) {
      return err(ActionErrors.notFound("User", "create-project"));
    }

    const dbUser = userResult.value;
    if (!dbUser) {
      return err(
        ActionErrors.internal(
          "Unable to parse user from db response",
          undefined,
          "create-project"
        )
      );
    }

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
      organizationId: dbUser.organizationId,
      createdById: dbUser.id,
    };

    const createResult = await safeAsync(
      () => ProjectQueries.create(projectData),
      "project-creation"
    );

    CacheService.INVALIDATION.invalidateProjectCache(dbUser.organizationId);

    return createResult;
  }
}

