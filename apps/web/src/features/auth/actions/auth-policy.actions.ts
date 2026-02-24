"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { OrganizationAuthPolicyQueries } from "@/server/data-access/organization-auth-policy.queries";
import { err, ok } from "neverthrow";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const authPolicySchema = z.object({
  organizationId: z.string(),
  requireEmailVerification: z.boolean().optional(),
  requireMfa: z.boolean().optional(),
  mfaGracePeriodDays: z.number().int().min(0).max(365).optional(),
  passwordMinLength: z.number().int().min(8).max(128).optional(),
  passwordRequireUppercase: z.boolean().optional(),
  passwordRequireLowercase: z.boolean().optional(),
  passwordRequireNumbers: z.boolean().optional(),
  passwordRequireSpecialChars: z.boolean().optional(),
  passwordHistoryCount: z.number().int().min(0).max(24).optional(),
  passwordExpirationDays: z.number().int().min(0).max(365).optional(),
  sessionTimeoutMinutes: z.number().int().min(5).max(43200).optional(),
  sessionInactivityTimeoutMinutes: z.number().int().min(5).max(43200).optional(),
  allowedAuthMethods: z.array(z.string()).optional(),
  ipWhitelist: z.array(z.string().ip()).optional(),
  allowPasswordReset: z.boolean().optional(),
  maxFailedLoginAttempts: z.number().int().min(1).max(100).optional(),
  lockoutDurationMinutes: z.number().int().min(1).max(1440).optional(),
});

export const updateAuthPolicy = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("setting:update"),
  })
  .inputSchema(authPolicySchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      if (ctx.organization?.id !== parsedInput.organizationId) {
        return resultToActionResponse(
          err(ActionErrors.FORBIDDEN("Cannot update another organization's auth policy"))
        );
      }

      const policy = await OrganizationAuthPolicyQueries.upsert(parsedInput);

      revalidatePath("/settings/security");
      revalidatePath("/settings/authentication");

      return resultToActionResponse(
        ok({
          policy,
          message: "Authentication policy updated successfully",
        })
      );
    } catch (error) {
      return resultToActionResponse(
        err(
          ActionErrors.INTERNAL_ERROR(
            error instanceof Error
              ? error.message
              : "Failed to update authentication policy"
          )
        )
      );
    }
  });

const getAuthPolicySchema = z.object({
  organizationId: z.string(),
});

export const getAuthPolicy = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("setting:read"),
  })
  .inputSchema(getAuthPolicySchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      if (ctx.organization?.id !== parsedInput.organizationId) {
        return resultToActionResponse(
          err(ActionErrors.FORBIDDEN("Cannot read another organization's auth policy"))
        );
      }

      const policy = await OrganizationAuthPolicyQueries.getByOrganizationId(
        parsedInput.organizationId
      );

      return resultToActionResponse(
        ok({
          policy,
        })
      );
    } catch (error) {
      return resultToActionResponse(
        err(
          ActionErrors.INTERNAL_ERROR(
            error instanceof Error
              ? error.message
              : "Failed to get authentication policy"
          )
        )
      );
    }
  });

const deleteAuthPolicySchema = z.object({
  organizationId: z.string(),
});

export const deleteAuthPolicy = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("setting:update"),
  })
  .inputSchema(deleteAuthPolicySchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      if (ctx.organization?.id !== parsedInput.organizationId) {
        return resultToActionResponse(
          err(ActionErrors.FORBIDDEN("Cannot delete another organization's auth policy"))
        );
      }

      await OrganizationAuthPolicyQueries.delete(parsedInput.organizationId);

      revalidatePath("/settings/security");
      revalidatePath("/settings/authentication");

      return resultToActionResponse(
        ok({
          message: "Authentication policy deleted successfully",
        })
      );
    } catch (error) {
      return resultToActionResponse(
        err(
          ActionErrors.INTERNAL_ERROR(
            error instanceof Error
              ? error.message
              : "Failed to delete authentication policy"
          )
        )
      );
    }
  });
