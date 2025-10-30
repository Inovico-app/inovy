import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { ProjectQueries } from "../data-access";

/**
 * Cached project queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get project by ID with creator information (cached)
 */
export async function getCachedProjectByIdWithCreator(
  projectId: string,
  orgCode: string
) {
  "use cache";
  cacheTag(CacheTags.project(projectId), CacheTags.projectsByOrg(orgCode));
  return await ProjectQueries.findByIdWithCreator(projectId, orgCode);
}

