"use server";

import { logger } from "@/lib/logger";
import { ProjectService } from "@/server/services";

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
    const result = await ProjectService.getProjectsByOrganization();

    if (result.isErr()) {
      logger.error("Failed to get user projects", {
        component: "getUserProjects",
        error: result.error,
      });

      return {
        success: false,
        error: result.error,
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

