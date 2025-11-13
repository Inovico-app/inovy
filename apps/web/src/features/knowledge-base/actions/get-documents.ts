"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { getCachedKnowledgeDocuments } from "../../../server/cache/knowledge-base.cache";
import { ok } from "neverthrow";
import { z } from "zod";
import { knowledgeBaseScopeEnum } from "../../../server/db/schema/knowledge-base-entries";

const getDocumentsInputSchema = z.object({
  scope: knowledgeBaseScopeEnum,
  scopeId: z.string().nullable(),
});

/**
 * Get knowledge base documents by scope
 */
export const getKnowledgeDocumentsAction = authorizedActionClient
  .metadata({
    policy: "projects:read", // Read access required
  })
  .inputSchema(getDocumentsInputSchema)
  .action(async ({ parsedInput }) => {
    const { scope, scopeId } = parsedInput;

    try {
      const documents = await getCachedKnowledgeDocuments(
        scope as "project" | "organization" | "global",
        scopeId
      );
      return resultToActionResponse(ok(documents));
    } catch (error) {
      throw ActionErrors.internal(
        "Failed to fetch knowledge documents",
        error as Error,
        "get-knowledge-documents"
      );
    }
  });

