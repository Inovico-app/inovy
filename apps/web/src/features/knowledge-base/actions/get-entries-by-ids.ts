"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { ok } from "neverthrow";
import { z } from "zod";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/server-action-client/action-client";
import { ActionErrors } from "../../../lib/server-action-client/action-errors";
import { KnowledgeBaseEntriesQueries } from "../../../server/data-access/knowledge-base-entries.queries";

const getEntriesByIdsInputSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

/**
 * Get knowledge base entries by their IDs
 */
export const getKnowledgeEntriesByIdsAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("projects:read"), // Read access required
  })
  .inputSchema(getEntriesByIdsInputSchema)
  .action(async ({ parsedInput }) => {
    const { ids } = parsedInput;

    try {
      const entries = await Promise.all(
        ids.map((id) => KnowledgeBaseEntriesQueries.getEntryById(id))
      );

      const validEntries = entries.filter(
        (entry): entry is NonNullable<typeof entry> => entry !== null
      );

      return resultToActionResponse(ok(validEntries));
    } catch (error) {
      throw ActionErrors.internal(
        "Failed to fetch knowledge entries",
        error as Error,
        "get-knowledge-entries-by-ids"
      );
    }
  });

