"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { CacheTags } from "../../../lib/cache-utils";
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
    policy: "teams:create",
  })
  .inputSchema(createTeamSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { name, description, departmentId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "createTeam"
      );
    }

    const result = await TeamService.createTeam({
      organizationId,
      name,
      description: description ?? null,
      departmentId: departmentId ?? null,
    });

    // Invalidate cache
    revalidateTag(CacheTags.teamsByOrg(organizationId));
    if (departmentId) {
      revalidateTag(CacheTags.teamsByDepartment(departmentId));
    }
    revalidatePath("/settings/organization");

    return resultToActionResponse(result);
  });

/**
 * Update a team
 */
export const updateTeam = authorizedActionClient
  .metadata({
    policy: "teams:update",
  })
  .inputSchema(updateTeamSchema.extend({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { id, name, description, departmentId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "updateTeam"
      );
    }

    const result = await TeamService.updateTeam(id, {
      name,
      description: description ?? null,
      departmentId: departmentId ?? null,
    });

    // Invalidate cache
    revalidateTag(CacheTags.teamsByOrg(organizationId));
    if (result.isOk() && result.value) {
      revalidateTag(CacheTags.team(id));
      if (result.value.departmentId) {
        revalidateTag(CacheTags.teamsByDepartment(result.value.departmentId));
      }
    }
    revalidatePath("/settings/organization");

    return resultToActionResponse(result);
  });

/**
 * Delete a team
 */
export const deleteTeam = authorizedActionClient
  .metadata({
    policy: "teams:delete",
  })
  .inputSchema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "deleteTeam"
      );
    }

    const result = await TeamService.deleteTeam(id);

    // Invalidate cache
    revalidateTag(CacheTags.teamsByOrg(organizationId));
    revalidateTag(CacheTags.team(id));
    revalidatePath("/settings/organization");

    return resultToActionResponse(result);
  });

/**
 * Assign a user to a team
 */
export const assignUserToTeam = authorizedActionClient
  .metadata({
    policy: "teams:update",
  })
  .inputSchema(assignUserToTeamSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId, teamId, role } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "assignUserToTeam"
      );
    }

    const result = await TeamService.assignUserToTeam(userId, teamId, role);

    // Invalidate cache
    revalidateTag(CacheTags.teamsByOrg(organizationId));
    revalidateTag(CacheTags.team(teamId));
    revalidateTag(CacheTags.userTeams(userId, organizationId));
    revalidatePath("/settings/organization");
    revalidatePath("/settings/profile");

    return resultToActionResponse(result);
  });

/**
 * Remove a user from a team
 */
export const removeUserFromTeam = authorizedActionClient
  .metadata({
    policy: "teams:update",
  })
  .inputSchema(
    z.object({
      userId: z.string().min(1),
      teamId: z.string().uuid(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const { userId, teamId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "removeUserFromTeam"
      );
    }

    const result = await TeamService.removeUserFromTeam(userId, teamId);

    // Invalidate cache
    revalidateTag(CacheTags.teamsByOrg(organizationId));
    revalidateTag(CacheTags.team(teamId));
    revalidateTag(CacheTags.userTeams(userId, organizationId));
    revalidatePath("/settings/organization");
    revalidatePath("/settings/profile");

    return resultToActionResponse(result);
  });

/**
 * Update user's role in a team
 */
export const updateUserTeamRole = authorizedActionClient
  .metadata({
    policy: "teams:update",
  })
  .inputSchema(updateUserTeamRoleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId, teamId, role } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "updateUserTeamRole"
      );
    }

    const result = await TeamService.updateUserTeamRole(userId, teamId, role);

    // Invalidate cache
    revalidateTag(CacheTags.teamsByOrg(organizationId));
    revalidateTag(CacheTags.team(teamId));
    revalidateTag(CacheTags.userTeams(userId, organizationId));
    revalidatePath("/settings/organization");
    revalidatePath("/settings/profile");

    return resultToActionResponse(result);
  });

