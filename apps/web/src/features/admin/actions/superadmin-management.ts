"use server";

import { db } from "@/server/db";
import { users } from "@/server/db/schema/auth";
import { AuditLogService } from "@/server/services/audit-log.service";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { err, ok } from "neverthrow";
import { isSuperAdmin } from "@/lib/rbac/rbac";

export const assignSuperadminRole = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("superadmin:all"),
  })
  .inputSchema(
    z.object({
      userId: z.string().min(1, "User ID is required"),
      userEmail: z.string().email("Valid email is required"),
      justification: z
        .string()
        .min(10, "Justification must be at least 10 characters"),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const { userId, userEmail, justification } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found in context",
        "assignSuperadminRole"
      );
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "assignSuperadminRole"
      );
    }

    if (!isSuperAdmin(user)) {
      throw ActionErrors.forbidden(
        "Only superadmins can assign superadmin role",
        undefined,
        "assignSuperadminRole"
      );
    }

    try {
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!targetUser) {
        return resultToActionResponse(
          err(
            ActionErrors.notFound(
              "User not found",
              "assignSuperadminRole"
            )
          )
        );
      }

      const previousRole = targetUser.role ?? "user";

      await db
        .update(users)
        .set({ role: "superadmin" })
        .where(eq(users.id, userId));

      const headersList = await headers();
      const { ipAddress, userAgent } =
        AuditLogService.extractRequestInfo(headersList);

      await AuditLogService.createAuditLog({
        eventType: "role_assigned",
        resourceType: "role",
        resourceId: userId,
        userId: user.id,
        organizationId,
        action: "assign",
        ipAddress,
        userAgent,
        metadata: {
          targetUserId: userId,
          targetUserEmail: userEmail,
          previousRole,
          newRole: "superadmin",
          assignedBy: user.email,
          justification,
          assignmentType: "superadmin_assignment",
        },
      });

      revalidatePath("/admin/privileged-access");
      revalidatePath("/admin/users");

      return resultToActionResponse(
        ok({ success: true, message: "Superadmin role assigned successfully" })
      );
    } catch (error) {
      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to assign superadmin role",
            error as Error,
            "assignSuperadminRole"
          )
        )
      );
    }
  });

export const revokeSuperadminRole = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("superadmin:all"),
  })
  .inputSchema(
    z.object({
      userId: z.string().min(1, "User ID is required"),
      userEmail: z.string().email("Valid email is required"),
      justification: z
        .string()
        .min(10, "Justification must be at least 10 characters"),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const { userId, userEmail, justification } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found in context",
        "revokeSuperadminRole"
      );
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "revokeSuperadminRole"
      );
    }

    if (!isSuperAdmin(user)) {
      throw ActionErrors.forbidden(
        "Only superadmins can revoke superadmin role",
        undefined,
        "revokeSuperadminRole"
      );
    }

    if (userId === user.id) {
      return resultToActionResponse(
        err(
          ActionErrors.validation(
            "Cannot revoke your own superadmin role",
            { context: "revokeSuperadminRole" }
          )
        )
      );
    }

    try {
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!targetUser) {
        return resultToActionResponse(
          err(
            ActionErrors.notFound("User not found", "revokeSuperadminRole")
          )
        );
      }

      if (targetUser.role !== "superadmin") {
        return resultToActionResponse(
          err(
            ActionErrors.validation(
              "User is not a superadmin",
              { context: "revokeSuperadminRole" }
            )
          )
        );
      }

      await db.update(users).set({ role: "user" }).where(eq(users.id, userId));

      const headersList = await headers();
      const { ipAddress, userAgent } =
        AuditLogService.extractRequestInfo(headersList);

      await AuditLogService.createAuditLog({
        eventType: "role_removed",
        resourceType: "role",
        resourceId: userId,
        userId: user.id,
        organizationId,
        action: "revoke",
        ipAddress,
        userAgent,
        metadata: {
          targetUserId: userId,
          targetUserEmail: userEmail,
          previousRole: "superadmin",
          newRole: "user",
          revokedBy: user.email,
          justification,
          revocationType: "superadmin_revocation",
        },
      });

      revalidatePath("/admin/privileged-access");
      revalidatePath("/admin/users");

      return resultToActionResponse(
        ok({
          success: true,
          message: "Superadmin role revoked successfully",
        })
      );
    } catch (error) {
      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to revoke superadmin role",
            error as Error,
            "revokeSuperadminRole"
          )
        )
      );
    }
  });
