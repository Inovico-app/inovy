import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import type { OrganizationSettingsDto } from "../dto/organization-settings.dto";
import { OrganizationSettingsQueries } from "../data-access/organization-settings.queries";

/**
 * Cached organization settings with Next.js 16 cache
 * Uses 'use cache' directive for automatic caching with tag-based invalidation
 */

/**
 * Get cached organization settings by organization code
 * Returns null if no settings exist or on error
 */
export async function getCachedOrganizationSettings(
  orgCode: string
): Promise<OrganizationSettingsDto | null> {
  "use cache";
  cacheTag(CacheTags.organizationSettings(orgCode));

  try {
    const settings = await OrganizationSettingsQueries.findByOrganizationId(
      orgCode
    );

    if (!settings) {
      return null;
    }

    return {
      id: settings.id,
      organizationId: settings.organizationId,
      instructions: settings.instructions,
      createdById: settings.createdById,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  } catch (error) {
    console.error("Failed to fetch cached organization settings", {
      orgCode,
      error,
    });
    return null;
  }
}

