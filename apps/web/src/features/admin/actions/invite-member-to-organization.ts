"use server";

import { sendEmailFromTemplate } from "@/emails/client";
import OrganizationInvitationEmail from "@/emails/templates/organization-invitation-email";
import { auth } from "@/lib/auth";
import { CacheInvalidation } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { OrganizationQueries } from "@/server/data-access/organization.queries";
import { PendingTeamAssignmentsQueries } from "@/server/data-access/pending-team-assignments.queries";
import { type OrganizationMemberRole } from "@/server/db/schema/auth";
import { InvitationService } from "@/server/services/invitation.service";
import { TeamService } from "@/server/services/team.service";
import { APIError } from "better-auth/api";
import { nanoid } from "nanoid";
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
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId, email, role, teamIds } = parsedInput;
    const { user } = ctx;

    try {
      // First, check if the user is already a member of the organization
      // This is a more robust check before calling Better Auth
      const existingMembers =
        await OrganizationQueries.getMembersDirect(organizationId);
      const isAlreadyMember = existingMembers.some(
        (m) => m.email.toLowerCase() === email.toLowerCase()
      );

      if (isAlreadyMember) {
        return resultToActionResponse(
          err(
            ActionErrors.validation(
              "This user is already a member of the organization",
              { context: "inviteMemberToOrganization" }
            )
          )
        );
      }

      // Try creating invitation using Better Auth API first
      try {
        const result = await auth.api.createInvitation({
          body: {
            email,
            role,
            organizationId,
          },
          headers: await headers(),
        });

        if (result) {
          // Store pending team assignments if teams are specified
          if (teamIds && teamIds.length > 0) {
            await PendingTeamAssignmentsQueries.createPendingAssignments(
              result.id,
              teamIds
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
        }
      } catch (error) {
        // If Better Auth fails with "Member not found" and user is a superadmin,
        // we handle it manually because Better Auth requires the inviter to be a member.
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (
          errorMessage.includes("Member not found") &&
          user?.role === "superadmin"
        ) {
          logger.info(
            "Superadmin inviting member to organization they don't belong to. Using manual flow.",
            {
              organizationId,
              email,
              adminId: user.id,
            }
          );

          const org = await OrganizationQueries.findByIdDirect(organizationId);
          if (!org) {
            return resultToActionResponse(
              err(
                ActionErrors.notFound(
                  "Organization",
                  "inviteMemberToOrganization"
                )
              )
            );
          }

          const invitationId = nanoid();
          const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

          const invitationResult = await InvitationService.createInvitation({
            id: invitationId,
            organizationId,
            email: email.toLowerCase(),
            role: role as OrganizationMemberRole,
            inviterId: user.id,
            status: "pending",
            expiresAt,
          });

          if (invitationResult.isErr()) {
            return resultToActionResponse(err(invitationResult.error));
          }

          if (teamIds && teamIds.length > 0) {
            await PendingTeamAssignmentsQueries.createPendingAssignments(
              invitationId,
              teamIds
            );
          }

          const baseUrl =
            process.env.BETTER_AUTH_URL ??
            process.env.NEXT_PUBLIC_APP_URL ??
            "http://localhost:3000";
          const inviteLink = `${baseUrl}/accept-invitation/${invitationId}`;

          const teamNames =
            teamIds && teamIds.length > 0
              ? await PendingTeamAssignmentsQueries.getTeamNamesByInvitationId(
                  invitationId
                )
              : [];

          await sendEmailFromTemplate({
            to: email,
            subject: `You've been invited to join ${org.name}`,
            react: OrganizationInvitationEmail({
              invitationUrl: inviteLink,
              organizationName: org.name,
              inviterName: user.name,
              inviterEmail: user.email,
              teamNames: teamNames.length > 0 ? teamNames : undefined,
            }),
          });

          CacheInvalidation.invalidateOrganization(organizationId);
          if (teamIds && teamIds.length > 0) {
            teamIds.forEach((teamId) => {
              CacheInvalidation.invalidateTeamMembers(teamId);
            });
          }
          revalidatePath(`/admin/organizations/${organizationId}`);
          revalidatePath("/admin/organizations");
          revalidatePath("/admin/users");

          return resultToActionResponse(
            ok({
              success: true,
              data: {
                id: invitationId,
                role,
                organizationId,
                expiresAt,
              },
              pendingTeamAssignments: teamIds ?? [],
            })
          );
        }

        // Re-throw if not handled
        throw error;
      }

      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to invite member",
            undefined,
            "inviteMemberToOrganization"
          )
        )
      );
    } catch (error) {
      // Check for specific Better Auth APIError codes
      if (
        error instanceof APIError &&
        error.body?.code === "USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION"
      ) {
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

