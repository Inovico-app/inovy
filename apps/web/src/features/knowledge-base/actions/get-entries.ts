"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { getCachedKnowledgeEntries } from "../../../server/cache/knowledge-base.cache";
import { ok } from "neverthrow";
import { z } from "zod";
import { knowledgeBaseScopeEnum } from "../../../server/db/schema/knowledge-base-entries";

const getEntriesInputSchema = z.object({
  scope: z.enum(knowledgeBaseScopeEnum),
  scopeId: z.string().nullable(),
});

/**
 * Get knowledge base entries by scope
 */
export const getKnowledgeEntriesAction = authorizedActionClient
  .metadata({
    policy: "projects:read", // Read access required
  })
  .inputSchema(getEntriesInputSchema)
  .action(async ({ parsedInput }) => {
    const { scope, scopeId } = parsedInput;

    try {
      const entries = await getCachedKnowledgeEntries(
        scope as "project" | "organization" | "global",
        scopeId
      );
      return resultToActionResponse(ok(entries));
    } catch (error) {
      throw ActionErrors.internal(
        "Failed to fetch knowledge entries",
        error as Error,
        "get-knowledge-entries"
      );
    }
  });

