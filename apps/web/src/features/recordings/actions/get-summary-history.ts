"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { SummaryEditService } from "@/server/services/summary-edit.service";
import { z } from "zod";

/**
 * Server action to get summary version history
 */
export const getSummaryHistory = authorizedActionClient
  .metadata({
    name: "get-summary-history",
    permissions: policyToPermissions("recordings:read"),
    audit: {
      resourceType: "recording",
      action: "read",
      category: "read",
    },
  })
  .schema(z.object({ recordingId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId } = ctx;

    if (!organizationId) {
      throw new Error("Organization context required");
    }

    const result = await SummaryEditService.getSummaryHistory(
      parsedInput.recordingId,
      organizationId,
    );

    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    return result.value;
  });
