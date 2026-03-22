"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AuthContext } from "../../../lib/auth-context";
import { policyToPermissions } from "../../../lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/server-action-client/action-client";
import { ActionErrors } from "../../../lib/server-action-client/action-errors";
import type { UpdateTeamDto } from "../../../server/dto/team.dto";
import { TeamService } from "../../../server/services/team.service";
import {
  assignUserToTeamSchema,
  createTeamSchema,
  updateTeamSchema,
  updateUserTeamRoleSchema,
} from "../../../server/validation/team.validation";

/**
 * Create a new team
 */
export const createTeam = authorizedActionClient
  .metadata({
    name: "create-team",
    permissions: policyToPermissions("teams:create"),
    audit: {
      resourceType: "team",
      action: "create",
      category: "mutation",
    },
  })
  .inputSchema(createTeamSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { name, description, departmentId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "createTeam",
      );
    }

    const auth: AuthContext = {
      user: ctx.user!,
      organizationId: ctx.organizationId!,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    const result = await TeamService.createTeam(
      {
        organizationId,
        name,
        description: description ?? null,
        departmentId: departmentId ?? null,
      },
      auth,
    );

    // Revalidate Next.js route cache (service handles data cache invalidation)
    if (result.isOk()) {
      revalidatePath("/settings/organization");
    }

    return resultToActionResponse(result);
  });

/**
 * Update a team
 */
export const updateTeam = authorizedActionClient
  .metadata({
    name: "update-team",
    permissions: policyToPermissions("teams:update"),
    audit: {
      resourceType: "team",
      action: "update",
      category: "mutation",
    },
  })
  .inputSchema(updateTeamSchema.extend({ id: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const { id, name, description, departmentId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "updateTeam",
      );
    }

    // Build update DTO only with fields that are actually present
    const updateData: UpdateTeamDto = {};

    if (typeof name !== "undefined") {
      updateData.name = name;
    }
    if ("description" in parsedInput) {
      updateData.description = description ?? null;
    }
    if ("departmentId" in parsedInput) {
      updateData.departmentId = departmentId ?? null;
    }

    const auth: AuthContext = {
      user: ctx.user!,
      organizationId: ctx.organizationId!,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    const result = await TeamService.updateTeam(id, updateData, auth);

    // Revalidate Next.js route cache (service handles data cache invalidation)
    if (result.isOk()) {
      revalidatePath("/settings/organization");
    }

    return resultToActionResponse(result);
  });

/**
 * Delete a team
 */
export const deleteTeam = authorizedActionClient
  .metadata({
    name: "delete-team",
    permissions: policyToPermissions("teams:delete"),
    audit: {
      resourceType: "team",
      action: "delete",
      category: "mutation",
    },
  })
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "deleteTeam",
      );
    }

    const auth: AuthContext = {
      user: ctx.user!,
      organizationId: ctx.organizationId!,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    const result = await TeamService.deleteTeam(id, auth);

    // Revalidate Next.js route cache (service handles data cache invalidation)
    if (result.isOk()) {
      revalidatePath("/settings/organization");
    }

    return resultToActionResponse(result);
  });

/**
 * Assign a user to a team
 */
export const assignUserToTeam = authorizedActionClient
  .metadata({
    name: "assign-user-to-team",
    permissions: policyToPermissions("teams:update"),
    audit: {
      resourceType: "team",
      action: "assign",
      category: "mutation",
    },
  })
  .inputSchema(assignUserToTeamSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId, teamId, role } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "assignUserToTeam",
      );
    }

    const auth: AuthContext = {
      user: ctx.user!,
      organizationId: ctx.organizationId!,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    const result = await TeamService.assignUserToTeam(
      userId,
      teamId,
      role,
      auth,
    );

    // Revalidate Next.js route cache (service handles data cache invalidation)
    if (result.isOk()) {
      revalidatePath("/settings/organization");
      revalidatePath("/settings/profile");
    }

    return resultToActionResponse(result);
  });

/**
 * Remove a user from a team
 */
export const removeUserFromTeam = authorizedActionClient
  .metadata({
    name: "remove-user-from-team",
    permissions: policyToPermissions("teams:update"),
    audit: {
      resourceType: "team",
      action: "unassign",
      category: "mutation",
    },
  })
  .inputSchema(
    z.object({
      userId: z.string().min(1),
      teamId: z.string().min(1),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const { userId, teamId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "removeUserFromTeam",
      );
    }

    const auth: AuthContext = {
      user: ctx.user!,
      organizationId: ctx.organizationId!,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    const result = await TeamService.removeUserFromTeam(userId, teamId, auth);

    // Revalidate Next.js route cache (service handles data cache invalidation)
    if (result.isOk()) {
      revalidatePath("/settings/organization");
      revalidatePath("/settings/profile");
    }

    return resultToActionResponse(result);
  });

/**
 * Update user's role in a team
 */
export const updateUserTeamRole = authorizedActionClient
  .metadata({
    name: "update-user-team-role",
    permissions: policyToPermissions("teams:update"),
    audit: {
      resourceType: "role",
      action: "update",
      category: "mutation",
    },
  })
  .inputSchema(updateUserTeamRoleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId, teamId, role } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "updateUserTeamRole",
      );
    }

    const auth: AuthContext = {
      user: ctx.user!,
      organizationId: ctx.organizationId!,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    const result = await TeamService.updateUserTeamRole(
      userId,
      teamId,
      role,
      auth,
    );

    // Revalidate Next.js route cache (service handles data cache invalidation)
    if (result.isOk()) {
      revalidatePath("/settings/organization");
      revalidatePath("/settings/profile");
    }

    return resultToActionResponse(result);
  });
