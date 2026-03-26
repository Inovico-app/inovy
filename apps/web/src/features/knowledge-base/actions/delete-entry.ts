"use server";

import type { AuthContext } from "@/lib/auth-context";
import { Permissions } from "@/lib/rbac/permissions";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { KnowledgeBaseEntriesQueries } from "@/server/data-access/knowledge-base-entries.queries";
import { KnowledgeModule } from "@/server/services/knowledge";
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

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "delete-knowledge-entry",
      );
    }

    const entry = await KnowledgeBaseEntriesQueries.getEntryById(id);

    const auth: AuthContext = {
      user,
      organizationId,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    // Delete entry
    const result = await KnowledgeModule.deleteEntry(id, auth);

    if (result.isErr()) {
      throw result.error;
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
