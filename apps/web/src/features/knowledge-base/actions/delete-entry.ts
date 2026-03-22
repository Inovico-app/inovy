"use server";

import type { AuthContext } from "@/lib/auth-context";
import { CacheInvalidation } from "@/lib/cache-utils";
import { Permissions } from "@/lib/rbac/permissions";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { KnowledgeBaseEntriesQueries } from "@/server/data-access/knowledge-base-entries.queries";
import { KnowledgeBaseService } from "@/server/services/knowledge-base.service";
import { deleteKnowledgeEntrySchema } from "@/server/validation/knowledge-base.schema";
import { revalidatePath } from "next/cache";

/**
 * Delete knowledge base entry action (soft delete)
 */
export const deleteKnowledgeEntryAction = authorizedActionClient
  .metadata({
    name: "delete-knowledge-entry",
    permissions: Permissions.orgInstruction.write,
    audit: {
      resourceType: "knowledge_base",
      action: "delete",
      category: "mutation",
    },
  })
  .inputSchema(deleteKnowledgeEntrySchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "delete-knowledge-entry",
      );
    }

    const entry = await KnowledgeBaseEntriesQueries.getEntryById(id);

    const auth: AuthContext = {
      user: ctx.user!,
      organizationId: ctx.organizationId!,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    // Delete entry
    const result = await KnowledgeBaseService.deleteEntry(id, user.id, auth);

    if (result.isErr()) {
      throw result.error;
    }

    // Invalidate cache based on entry scope
    if (entry) {
      CacheInvalidation.invalidateKnowledge(entry.scope, entry.scopeId);
      if (entry.scope === "project" && entry.scopeId && organizationId) {
        CacheInvalidation.invalidateKnowledgeHierarchy(
          entry.scopeId,
          organizationId,
        );
      } else if (entry.scope === "team" && entry.scopeId) {
        CacheInvalidation.invalidateKnowledgeHierarchy(null, entry.scopeId);
      } else if (entry.scope === "organization" && entry.scopeId) {
        CacheInvalidation.invalidateKnowledgeHierarchy(null, entry.scopeId);
      } else if (entry.scope === "global") {
        CacheInvalidation.invalidateKnowledgeHierarchy(null, null);
      }
    } else {
      // Entry not found - cache invalidation handled by service error
    }
    // Revalidate relevant pages
    if (entry?.scope === "project" && entry?.scopeId) {
      revalidatePath(`/projects/${entry.scopeId}/settings`);
    } else if (entry?.scope === "team" && entry?.scopeId) {
      revalidatePath(`/teams/${entry.scopeId}/settings`);
    } else if (entry?.scope === "organization") {
      revalidatePath(`/settings/organization`);
    }

    // Revalidate relevant pages
    return resultToActionResponse(result);
  });
