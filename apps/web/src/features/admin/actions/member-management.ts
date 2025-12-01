"use server";

import { auth } from "@/lib/auth";
import { CacheInvalidation } from "@/lib/cache-utils";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { APIError } from "better-auth/api";
import { err, ok } from "neverthrow";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

/**
 * Invite a user to join the organization
 * Uses Better Auth organization plugin API
 */
export const inviteMember = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("users:update"),
  })
  .inputSchema(
    z.object({
      email: z.email("Invalid email address"),
      role: z
        .enum(["owner", "admin", "user", "viewer", "manager"])
        .default("user"),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const { email, role } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "inviteMember"
      );
    }

    try {
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
              "inviteMember"
            )
          )
        );
      }

      // Invalidate cache
      CacheInvalidation.invalidateOrganization(organizationId);

      // Revalidate routes
      revalidatePath("/admin/users");
      revalidatePath("/settings/organization");

      return resultToActionResponse(ok({ success: true, data: result }));
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
              { context: "inviteMember" }
            )
          )
        );
      }

      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to invite member",
            error as Error,
            "inviteMember"
          )
        )
      );
    }
  });

/**
 * Remove a member from the organization
 * Uses Better Auth organization plugin API
 */
export const removeMember = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("users:delete"),
  })
  .inputSchema(
    z.object({
      memberIdOrEmail: z.string().min(1, "Member ID or email is required"),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const { memberIdOrEmail } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "removeMember"
      );
    }

    try {
      const result = await auth.api.removeMember({
        body: {
          memberIdOrEmail,
          organizationId,
        },
        headers: await headers(),
      });

      if (!result) {
        return resultToActionResponse(
          err(
            ActionErrors.internal(
              "Failed to remove member",
              undefined,
              "removeMember"
            )
          )
        );
      }

      // Invalidate cache
      CacheInvalidation.invalidateOrganization(organizationId);

      // Revalidate routes
      revalidatePath("/admin/users");
      revalidatePath("/settings/organization");

      return resultToActionResponse(ok({ success: true }));
    } catch (error) {
      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to remove member",
            error as Error,
            "removeMember"
          )
        )
      );
    }
  });

/**
 * Update a member's role in the organization
 * Uses Better Auth organization plugin API
 */
export const updateMemberRole = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("users:update"),
  })
  .inputSchema(
    z.object({
      memberId: z.string().min(1, "Member ID is required"),
      role: z.enum(["owner", "admin", "member"]),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const { memberId, role } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "updateMemberRole"
      );
    }

    try {
      const result = await auth.api.updateMemberRole({
        body: {
          memberId,
          role,
          organizationId,
        },
        headers: await headers(),
      });

      if (!result) {
        return resultToActionResponse(
          err(
            ActionErrors.internal(
              "Failed to update member role",
              undefined,
              "updateMemberRole"
            )
          )
        );
      }

      // Invalidate cache
      CacheInvalidation.invalidateOrganization(organizationId);

      // Revalidate routes
      revalidatePath("/admin/users");
      revalidatePath("/settings/organization");

      return resultToActionResponse(ok({ success: true }));
    } catch (error) {
      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to update member role",
            error as Error,
            "updateMemberRole"
          )
        )
      );
    }
  });

