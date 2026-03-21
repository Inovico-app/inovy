"use server";

import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { AuditLogService } from "@/server/services/audit-log.service";
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
    const result = await ProjectService.getProjectsByOrganization();

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

    const authResult = await getBetterAuthSession();
    if (authResult.isOk()) {
      const { user, organization } = authResult.value;
      if (user?.id && organization?.id) {
        void AuditLogService.createAuditLog({
          eventType: "project_list",
          resourceType: "project",
          resourceId: null,
          userId: user.id,
          organizationId: organization.id,
          action: "list",
          category: "read",
          metadata: { actionName: "getUserProjects" },
        });
      }
    }

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
