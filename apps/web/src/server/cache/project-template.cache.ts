import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { cache } from "react";
import type { ProjectTemplateDto } from "../dto/project-template.dto";
import { ProjectTemplateService } from "../services/project-template.service";

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
 */
export const getCachedProjectTemplate = cache(
  async (projectId: string): Promise<ProjectTemplateDto | null> => {
    "use cache";

    cacheTag(CacheTags.projectTemplate(projectId));
    // Fetch template for the project using service
    const result =
      await ProjectTemplateService.getProjectTemplateByProjectId(projectId);

    // Return null on error, or the template data if found
    if (result.isErr()) {
      return null;
    }

    return result.value ?? null;
  }
);

