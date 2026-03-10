import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { ProjectQueries } from "../data-access/projects.queries";

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
 * Get projects for an organization (cached)
 * Returns basic project info for dropdowns
 * @param orgCode - Organization code/ID
 */
export async function getCachedUserProjects(orgCode: string) {
  "use cache";
  cacheTag(CacheTags.projectsByOrg(orgCode));

  const projects = await ProjectQueries.findByOrganizationWithCreator({
    organizationId: orgCode,
    status: "active",
  });

  // Map to simplified format for dropdown
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
  }));
}
