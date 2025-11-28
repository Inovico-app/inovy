"use server";

import { auth } from "@/lib/auth";
import { CacheInvalidation } from "@/lib/cache-utils";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { headers } from "next/headers";
import { err, ok } from "neverthrow";
import { revalidatePath } from "next/cache";
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
      email: z.string().email("Invalid email address"),
      role: z.enum(["owner", "admin", "member"]).default("member"),
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
      const result = await auth.api.inviteMember({
        headers: await headers(),
        body: {
          email,
          role,
          organizationId,
        },
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check for specific error types
      if (errorMessage.toLowerCase().includes("already")) {
        return resultToActionResponse(
          err(
            ActionErrors.validation(
              "This user is already a member of the organization",
              "inviteMember"
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
        headers: await headers(),
        body: {
          memberIdOrEmail,
          organizationId,
        },
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
        headers: await headers(),
        body: {
          memberId,
          role,
          organizationId,
        },
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

