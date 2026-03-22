"use server";

import { resolveAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import { ProjectService } from "@/server/services/project.service";

/**
 * Server action to get projects for the authenticated user's organization
 * Returns basic project info for filtering purposes
 */
export async function getUserProjects(): Promise<{
  success: boolean;
  data?: Array<{ id: string; name: string }>;
  error?: string;
}> {
  try {
    const authResult = await resolveAuthContext("getUserProjects");
    if (authResult.isErr()) {
      return { success: false, error: authResult.error.message };
    }

    const result = await ProjectService.getProjectsByOrganization(
      authResult.value,
    );

    if (result.isErr()) {
      logger.error("Failed to get user projects", {
        component: "getUserProjects",
        error: result.error.message,
      });

      return {
        success: false,
        error: result.error.message,
      };
    }

    // Map to simplified format for dropdown
    const projects = result.value.map((project) => ({
      id: project.id,
      name: project.name,
    }));

    return {
      success: true,
      data: projects,
    };
  } catch (error) {
    logger.error("Unexpected error getting user projects", {
      component: "getUserProjects",
      error,
    });

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
