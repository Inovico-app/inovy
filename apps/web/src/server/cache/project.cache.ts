import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { ProjectQueries } from "../data-access/projects.queries";
import type { ProjectWithCreatorDetailsDto } from "../dto/project.dto";
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
 * Get projects for an organization (cached)
 * Returns basic project info for dropdowns
 * @param orgCode - Organization code/ID
 */
export async function getCachedUserProjects(orgCode: string) {
  "use cache";
  cacheTag(CacheTags.projectsByOrg(orgCode));

  const result = await ProjectService.getProjectsByOrganization({
    organizationId: orgCode,
    status: "active",
  });

  if (result.isErr()) {
    return [];
  }

  // Map to simplified format for dropdown
  return result.value.map((project) => ({
    id: project.id,
    name: project.name,
  }));
}

/**
 * Get project by ID using ProjectService (cached)
 * Useful for page loaders that already operate on ActionResult semantics.
 */
export async function getCachedProjectById(
  projectId: string
): Promise<ProjectWithCreatorDetailsDto | null> {
  "use cache";
  cacheTag(CacheTags.project(projectId));
  const result = await ProjectService.getProjectById(projectId);

  return result.isOk() ? result.value : null;
}

