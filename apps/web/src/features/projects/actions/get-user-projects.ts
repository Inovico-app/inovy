"use server";

import type { AuthContext } from "@/lib/auth-context";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ProjectService } from "@/server/services/project.service";

/**
 * Server action to get projects for the authenticated user's organization
 * Returns basic project info for filtering and dropdown purposes
 */
export const getUserProjectsAction = authorizedActionClient
  .metadata({
    name: "get-user-projects",
    permissions: policyToPermissions("projects:read"),
    audit: {
      resourceType: "project",
      action: "list",
      category: "read",
    },
  })
  .action(async ({ ctx }) => {
    const auth: AuthContext = {
      user: ctx.user!,
      organizationId: ctx.organizationId!,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    const result = await ProjectService.getProjectsByOrganization(auth);
    const projects = resultToActionResponse(result);

    // Map to simplified format for dropdown
    return projects.map((project) => ({
      id: project.id,
      name: project.name,
    }));
  });
