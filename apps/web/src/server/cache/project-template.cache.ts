import { getAuthSession } from "@/lib/auth";
import { cache } from "react";
import type { ProjectTemplateDto } from "../dto";
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

    // Fetch template for the project using service
    const result = await ProjectTemplateService.getProjectTemplateByProjectId(
      projectId
    );

    // Return null on error, or the template data if found
    if (result.isErr()) {
      return null;
    }

    return result.value ?? null;
  }
);

/**
 * Get project template by ID with caching (serializable)
 * @deprecated Use getCachedProjectTemplate with projectId instead
 * This function requires auth context and may be less efficient
 */
export const getCachedProjectTemplateById = cache(
  async (_templateId: string): Promise<ProjectTemplateDto | null> => {
    "use cache";

    // Get current organization context for verification
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      return null;
    }

    // Note: We don't have a direct "by ID" query method on the service
    // The service requires projectId for organization-scoped queries
    // Consider using getCachedProjectTemplate(projectId) instead
    return null;
  }
);

