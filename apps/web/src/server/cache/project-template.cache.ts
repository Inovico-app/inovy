import { tagsFor } from "@/lib/cache";
import { cacheTag } from "next/cache";
import { cache } from "react";
import { ProjectTemplateQueries } from "../data-access/project-templates.queries";
import type { ProjectTemplateDto } from "../dto/project-template.dto";

/**
 * Cached functions for ProjectTemplate data fetching
 * Using React cache() for deduplication within render lifecycle
 * Using 'use cache' directive for automatic Next.js 16 caching
 * Results are serializable (no methods, only data)
 */

/**
 * Get project template with caching
 * Uses React cache() for request deduplication and Next.js 16 'use cache'
 * Returns serializable data (null or ProjectTemplateDto)
 *
 * Auth checks must be performed by the caller before invoking this function.
 * organizationId is required to scope the query.
 */
export const getCachedProjectTemplate = cache(
  async (
    projectId: string,
    organizationId: string,
  ): Promise<ProjectTemplateDto | null> => {
    "use cache";

    cacheTag(...tagsFor("projectTemplate", { projectId }));
    // Fetch template for the project directly from the data-access layer
    const result = await ProjectTemplateQueries.findByProjectId(
      projectId,
      organizationId,
    );

    return result ?? null;
  },
);
