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
 * Schema for creating an organization
 */
const createOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
  logo: z.string().url().optional(),
});

/**
 * Create a new organization
 * Only superadmins can create organizations
 */
export const createOrganization = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("organizations:create"),
  })
  .inputSchema(createOrganizationSchema)
  .action(async ({ parsedInput }) => {
    const { name, slug, logo } = parsedInput;

    try {
      // Use Better Auth API to create organization
      const result = await auth.api.createOrganization({
        headers: await headers(),
        body: {
          name,
          slug,
          logo,
        },
      });

      if (!result) {
        return resultToActionResponse(
          err(
            ActionErrors.internal(
              "Failed to create organization",
              undefined,
              "createOrganization"
            )
          )
        );
      }

      // Invalidate cache
      CacheInvalidation.invalidateOrganizations();

      // Revalidate Next.js route cache
      revalidatePath("/admin/organizations");

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
              "createOrganization"
            )
          )
        );
      }

      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to create organization",
            error as Error,
            "createOrganization"
          )
        )
      );
    }
  });

/**
 * Check if an organization slug is available
 */
export const checkOrganizationSlug = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("organizations:create"),
  })
  .inputSchema(z.object({ slug: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const { slug } = parsedInput;

    try {
      // Use Better Auth API to check slug
      const result = await auth.api.checkOrganizationSlug({
        headers: await headers(),
        body: { slug },
      });

      return resultToActionResponse(
        ok({
          available: !result?.exists,
        })
      );
    } catch (error) {
      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to check slug availability",
            error as Error,
            "checkOrganizationSlug"
          )
        )
      );
    }
  });

