"use server";

import type { AuthContext } from "@/lib/auth-context";
import { Permissions } from "@/lib/rbac/permissions";
import {
  authorizedActionClient,
  createErrorForNextSafeAction,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { KnowledgeModule } from "@/server/services/knowledge";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const importEntrySchema = z.object({
  term: z
    .string()
    .trim()
    .min(1, "Term is required")
    .max(100, "Term must be less than 100 characters"),
  definition: z
    .string()
    .trim()
    .min(1, "Definition is required")
    .max(5000, "Definition must be less than 5000 characters"),
  boost: z
    .number()
    .min(0, "Boost must be at least 0")
    .max(2, "Boost must be at most 2")
    .nullable()
    .optional(),
  category: z
    .enum(["medical", "legal", "technical", "custom"])
    .optional()
    .default("custom"),
  context: z
    .string()
    .max(1000, "Context must be less than 1000 characters")
    .nullable()
    .optional(),
});

const importKnowledgeEntriesSchema = z.object({
  scope: z.enum(["project", "organization", "global", "team"]),
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

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "import-knowledge-entries",
      );
    }

    const auth: AuthContext = {
      user: ctx.user!,
      organizationId: ctx.organizationId!,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    const result = await KnowledgeModule.bulkCreateEntries(
      { scope, scopeId },
      entries.map((e) => ({
        term: e.term,
        definition: e.definition,
        boost: e.boost ?? null,
        category: e.category ?? "custom",
        context: e.context ?? null,
      })),
      auth,
    );

    if (result.isErr()) {
      throw createErrorForNextSafeAction(result.error);
    }

    // Revalidate relevant pages
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
