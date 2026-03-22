"use server";

import type { AuthContext } from "@/lib/auth-context";
import { CacheInvalidation } from "@/lib/cache-utils";
import { Permissions } from "@/lib/rbac/permissions";
import {
  authorizedActionClient,
  createErrorForNextSafeAction,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { KnowledgeBaseService } from "@/server/services/knowledge-base.service";
import { createKnowledgeEntrySchema } from "@/server/validation/knowledge-base.schema";
import { revalidatePath } from "next/cache";

/**
 * Create knowledge base entry action
 */
export const createKnowledgeEntryAction = authorizedActionClient
  .metadata({
    name: "create-knowledge-entry",
    permissions: Permissions.orgInstruction.write,
    audit: {
      resourceType: "knowledge_base",
      action: "create",
      category: "mutation",
    },
  })
  .inputSchema(createKnowledgeEntrySchema)
  .action(async ({ parsedInput, ctx }) => {
    const { scope, scopeId, term, definition, context, examples } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "create-knowledge-entry",
      );
    }

    const auth: AuthContext = {
      user: ctx.user!,
      organizationId: ctx.organizationId!,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    // Create entry
    const result = await KnowledgeBaseService.createEntry(
      scope,
      scopeId,
      { term, definition, context, examples },
      auth,
    );

    if (result.isErr()) {
      throw createErrorForNextSafeAction(result.error);
    }

    // Invalidate cache
    CacheInvalidation.invalidateKnowledge(scope, scopeId);
    if (scope === "project" && scopeId && organizationId) {
      CacheInvalidation.invalidateKnowledgeHierarchy(scopeId, organizationId);
    } else if (scope === "team" && scopeId) {
      // Invalidate team knowledge hierarchy
      CacheInvalidation.invalidateKnowledgeHierarchy(null, scopeId);
    } else if (scope === "organization" && scopeId) {
      // Invalidate all project hierarchies in this org
      CacheInvalidation.invalidateKnowledgeHierarchy(null, scopeId);
    } else if (scope === "global") {
      // Invalidate all hierarchies
      CacheInvalidation.invalidateKnowledgeHierarchy(null, null);
    }

    // Revalidate relevant pages
    if (scope === "project" && scopeId) {
      revalidatePath(`/projects/${scopeId}/settings`);
    } else if (scope === "team" && scopeId) {
      revalidatePath(`/teams/${scopeId}/settings`);
    } else if (scope === "organization" && organizationId) {
      revalidatePath(`/settings/organization`);
    }

    return resultToActionResponse(result);
  });
