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
 * Schema for updating an organization
 */
const updateOrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Organization name is required").max(100).optional(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    )
    .optional(),
  logo: z.string().url().optional().or(z.literal("")),
});

/**
 * Update an organization
 * Only superadmins can update organizations
 */
export const updateOrganization = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("organizations:update"),
  })
  .inputSchema(updateOrganizationSchema)
  .action(async ({ parsedInput }) => {
    const { id, name, slug, logo } = parsedInput;

    try {
      // Use Better Auth API to update organization
      const result = await auth.api.updateOrganization({
        headers: await headers(),
        body: {
          organizationId: id,
          data: {
            name,
            slug,
            logo: logo || undefined,
          },
        },
      });

      if (!result) {
        return resultToActionResponse(
          err(
            ActionErrors.internal(
              "Failed to update organization",
              undefined,
              "updateOrganization"
            )
          )
        );
      }

      // Invalidate cache
      CacheInvalidation.invalidateOrganizations();
      CacheInvalidation.invalidateOrganization(id);

      // Revalidate Next.js route cache
      revalidatePath("/admin/organizations");
      revalidatePath(`/admin/organizations/${id}`);

      return resultToActionResponse(
        ok({
          id: result.id,
          name: result.name,
          slug: result.slug,
          logo: result.logo,
        })
      );
    } catch (error) {
      // Check if it's a slug uniqueness error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("slug") ||
        errorMessage.includes("unique") ||
        errorMessage.includes("duplicate")
      ) {
        return resultToActionResponse(
          err(
            ActionErrors.validation(
              "This slug is already taken. Please choose a different one.",
              { context: "updateOrganization" }
            )
          )
        );
      }

      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to update organization",
            error as Error,
            "updateOrganization"
          )
        )
      );
    }
  });

