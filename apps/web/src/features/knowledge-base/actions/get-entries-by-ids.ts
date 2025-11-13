"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { KnowledgeBaseEntriesQueries } from "../../../server/data-access";
import { z } from "zod";

const getEntriesByIdsInputSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

/**
 * Get knowledge base entries by their IDs
 */
export const getKnowledgeEntriesByIdsAction = authorizedActionClient
  .metadata({
    policy: "projects:read", // Read access required
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

      return resultToActionResponse({ ok: true, data: validEntries });
    } catch (error) {
      throw ActionErrors.internal(
        "Failed to fetch knowledge entries",
        error as Error,
        "get-knowledge-entries-by-ids"
      );
    }
  });

