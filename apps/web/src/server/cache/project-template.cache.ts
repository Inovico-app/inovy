import { cache } from "react";
import { getAuthSession } from "@/lib/auth";
import { ProjectTemplateQueries } from "../data-access/project-templates.queries";

/**
 * Cached functions for ProjectTemplate data fetching
 * Using React cache() for deduplication within render lifecycle
 * Using 'use cache' directive for automatic Next.js 16 caching
 */

/**
 * Get project template with caching
 * Uses React cache() for request deduplication and Next.js 16 'use cache'
 */
export const getCachedProjectTemplate = cache(
  async (projectId: string) => {
    "use cache";

    // Get current organization context
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      return null;
    }

    const organizationId = authResult.value.organization.orgCode;

    // Fetch template for the project
    const template = await ProjectTemplateQueries.findByProjectId(
      projectId,
      organizationId
    );

    return template || null;
  }
);

/**
 * Get project template by ID with caching
 */
export const getCachedProjectTemplateById = cache(async (templateId: string) => {
  "use cache";

  // Get current organization context
  const authResult = await getAuthSession();
  if (authResult.isErr() || !authResult.value.organization) {
    return null;
  }

  const organizationId = authResult.value.organization.orgCode;

  // Fetch template by ID
  const template = await ProjectTemplateQueries.findById(
    templateId,
    organizationId
  );

  return template || null;
});

