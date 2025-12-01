"use server";

import { auth } from "@/lib/auth";
import { CacheInvalidation } from "@/lib/cache-utils";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { TeamService } from "@/server/services/team.service";
import { err, ok } from "neverthrow";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

/**
 * Invite a user to join a specific organization (superadmin only)
 * Optionally assign them to teams during invitation
 */
export const inviteMemberToOrganization = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("users:create"),
  })
  .inputSchema(
    z.object({
      organizationId: z.string().min(1, "Organization ID is required"),
      email: z.email("Invalid email address"),
      role: z
        .enum(["owner", "admin", "user", "viewer", "manager"])
        .default("user"),
      teamIds: z.array(z.string()).optional(),
    })
  )
  .action(async ({ parsedInput }) => {
    const { organizationId, email, role, teamIds } = parsedInput;

    try {
      // Create invitation using Better Auth API
      const result = await auth.api.createInvitation({
        body: {
          email,
          role,
          organizationId,
        },
        headers: await headers(),
      });

      if (!result) {
        return resultToActionResponse(
          err(
            ActionErrors.internal(
              "Failed to invite member",
              undefined,
              "inviteMemberToOrganization"
            )
          )
        );
      }

      // If teams are specified, we'll need to assign them after the user accepts the invitation
      // For now, we'll store this intention in the invitation metadata if supported
      // Otherwise, the team assignment will need to be done manually after acceptance

      // Note: Better Auth invitations may not support team assignment directly
      // This would need to be handled after the user accepts the invitation
      // You might want to store the teamIds in a separate table for pending assignments

      if (teamIds && teamIds.length > 0) {
        // TODO: Store pending team assignments in a separate table
        // This can be picked up by a webhook or post-invitation handler
        console.log(
          `Team assignments pending for ${email}: ${teamIds.join(", ")}`
        );
      }

      // Invalidate cache
      CacheInvalidation.invalidateOrganization(organizationId);
      if (teamIds && teamIds.length > 0) {
        teamIds.forEach((teamId) => {
          CacheInvalidation.invalidateTeamMembers(teamId);
        });
      }

      // Revalidate routes
      revalidatePath(`/admin/organizations/${organizationId}`);
      revalidatePath("/admin/organizations");
      revalidatePath("/admin/users");

      return resultToActionResponse(
        ok({
          success: true,
          data: result,
          pendingTeamAssignments: teamIds ?? [],
        })
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check for specific error types
      if (errorMessage.toLowerCase().includes("already")) {
        return resultToActionResponse(
          err(
            ActionErrors.validation(
              "This user is already a member of the organization",
              { context: "inviteMemberToOrganization" }
            )
          )
        );
      }

      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to invite member",
            error as Error,
            "inviteMemberToOrganization"
          )
        )
      );
    }
  });

/**
 * Assign an existing organization member to teams
 * This is a helper action for post-invitation team assignments
 */
export const assignMemberToTeams = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("teams:update"),
  })
  .inputSchema(
    z.object({
      userId: z.string().min(1, "User ID is required"),
      teamIds: z.array(z.string()).min(1, "At least one team ID is required"),
      organizationId: z.string().min(1, "Organization ID is required"),
    })
  )
  .action(async ({ parsedInput }) => {
    const { userId, teamIds, organizationId } = parsedInput;

    try {
      // Assign user to each team
      const results = await Promise.all(
        teamIds.map((teamId) =>
          TeamService.assignUserToTeam(userId, teamId, "member")
        )
      );

      // Check if any assignments failed
      const failures = results.filter((r) => r.isErr());
      if (failures.length > 0) {
        return resultToActionResponse(
          err(
            ActionErrors.internal(
              `Failed to assign user to ${failures.length} team(s)`,
              undefined,
              "assignMemberToTeams"
            )
          )
        );
      }

      // Invalidate cache
      CacheInvalidation.invalidateOrganization(organizationId);
      teamIds.forEach((teamId) => {
        CacheInvalidation.invalidateTeamMembers(teamId);
      });

      // Revalidate routes
      revalidatePath(`/admin/organizations/${organizationId}`);
      revalidatePath("/settings/organization");

      return resultToActionResponse(ok({ success: true }));
    } catch (error) {
      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to assign member to teams",
            error as Error,
            "assignMemberToTeams"
          )
        )
      );
    }
  });

