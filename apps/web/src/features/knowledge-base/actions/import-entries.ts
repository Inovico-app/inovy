"use server";

import type { AuthContext } from "@/lib/auth-context";
import { Permissions } from "@/lib/rbac/permissions";
import {
  authorizedActionClient,
  createErrorForNextSafeAction,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { KnowledgeModule } from "@/server/services/knowledge";
import { vocabularyCategoryEnum } from "@/server/db/schema/knowledge-base-entries";
import { knowledgeBaseScopeSchema } from "@/server/validation/knowledge-base.schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const importEntrySchema = z.object({
  term: z.string().trim().min(1).max(100),
  definition: z.string().trim().min(1).max(5000),
  boost: z.number().min(0).max(2).nullable().optional(),
  category: z.enum(vocabularyCategoryEnum).optional().default("custom"),
  context: z.string().max(1000).nullable().optional(),
});

const importKnowledgeEntriesSchema = z.object({
  scope: knowledgeBaseScopeSchema,
  scopeId: z.string().nullable(),
  entries: z
    .array(importEntrySchema)
    .min(1, "At least one entry is required")
    .max(500, "Maximum 500 entries per import"),
});

export const importKnowledgeEntriesAction = authorizedActionClient
  .metadata({
    name: "import-knowledge-entries",
    permissions: Permissions.orgInstruction.write,
    audit: {
      resourceType: "knowledge_base",
      action: "import",
      category: "mutation",
    },
  })
  .inputSchema(importKnowledgeEntriesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { scope, scopeId, entries } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user || !organizationId) {
      throw ActionErrors.unauthenticated(
        "User or organization not found",
        "import-knowledge-entries",
      );
    }

    const auth: AuthContext = {
      user,
      organizationId,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    const result = await KnowledgeModule.bulkCreateEntries(
      { scope, scopeId },
      entries.map((e) => ({
        term: e.term,
        definition: e.definition,
        boost: e.boost,
        category: e.category,
        context: e.context,
      })),
      auth,
    );

    if (result.isErr()) {
      throw createErrorForNextSafeAction(result.error);
    }

    if (scope === "project" && scopeId) {
      revalidatePath(`/projects/${scopeId}/settings`);
    } else if (scope === "team" && scopeId) {
      revalidatePath(`/teams/${scopeId}/settings`);
    } else if (scope === "organization" && organizationId) {
      revalidatePath(`/settings/organization`);
    }

    return {
      imported: result.value.imported.length,
      skipped: result.value.skipped,
    };
  });
