"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { AgentSettingsQueries } from "@/server/data-access/agent-settings.queries";
import { err, ok } from "neverthrow";
import { z } from "zod";

const updateAgentSettingsSchema = z.object({
  model: z.string().min(1).optional(),
  maxTokens: z.number().int().min(1).max(100000).optional(),
  maxContextTokens: z.number().int().min(1).max(100000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
});

export const updateAgentSettings = authorizedActionClient
  .metadata({
    name: "update-agent-settings",
    permissions: policyToPermissions("organizations:update"),
    audit: {
      resourceType: "settings",
      action: "update",
      category: "mutation",
    },
  })
  .inputSchema(updateAgentSettingsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const updated =
        await AgentSettingsQueries.updateAgentSettings(parsedInput);

      return resultToActionResponse(ok({ success: true, data: updated }));
    } catch (error) {
      return resultToActionResponse(
        err(
          ActionErrors.internal(
            error instanceof Error ? error.message : "Unknown error occurred",
            error,
            "updateAgentSettings",
          ),
        ),
      );
    }
  });
