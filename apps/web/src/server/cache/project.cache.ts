import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { ProjectQueries } from "../data-access/projects.queries";
import { ProjectService } from "../services/project.service";

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

/**
 * Get projects for the authenticated user's organization (cached)
 * Returns basic project info for dropdowns
 */
export async function getCachedUserProjects() {
  "use cache";

  const result = await ProjectService.getProjectsByOrganization();

  if (result.isErr()) {
    return [];
  }

  // Map to simplified format for dropdown
  return result.value.map((project) => ({
    id: project.id,
    name: project.name,
  }));
}

