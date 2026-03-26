import { tagsFor } from "@/lib/cache";
import { cacheTag } from "next/cache";
import { ProjectQueries } from "../data-access/projects.queries";
import type { BetterAuthUser } from "@/lib/auth";

/**
 * Cached project queries
 * Uses Next.js 16 cache with tags for invalidation
 */

interface TeamContextOptions {
  userTeamIds?: string[];
  user?: BetterAuthUser;
}

/**
 * Get project by ID with creator information (cached)
 */
export async function getCachedProjectByIdWithCreator(
  projectId: string,
  orgCode: string,
) {
  "use cache";
  cacheTag(...tagsFor("project", { projectId, organizationId: orgCode }));
  return await ProjectQueries.findByIdWithCreator(projectId, orgCode);
}

/**
 * Get projects for an organization (cached)
 * Returns basic project info for dropdowns
 * @param orgCode - Organization code/ID
 * @param teamContext - Optional team context for filtering by team visibility (included in cache key)
 */
export async function getCachedUserProjects(
  orgCode: string,
  teamContext?: TeamContextOptions,
) {
  "use cache";
  cacheTag(...tagsFor("project", { organizationId: orgCode }));

  const projects = await ProjectQueries.findByOrganizationWithCreator(
    {
      organizationId: orgCode,
      status: "active",
    },
    teamContext,
  );

  // Map to simplified format for dropdown
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
  }));
}
