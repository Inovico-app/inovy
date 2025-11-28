"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { SummaryEditService } from "@/server/services/summary-edit.service";
import { z } from "zod";

const updateSummarySchema = z.object({
  recordingId: z.string().uuid("Invalid recording ID"),
  content: z.record(z.string(), z.unknown()),
  changeDescription: z.string().optional(),
});

export type UpdateSummaryInput = z.infer<typeof updateSummarySchema>;

/**
 * Server action to update summary content
 */
export const updateSummary = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:update") })
  .schema(updateSummarySchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.unauthenticated("Organization context required");
    }

    const result = await SummaryEditService.updateSummary(
      parsedInput,
      user.id,
      organizationId
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "update-summary"
      );
    }

    // Invalidate summary cache
    CacheInvalidation.invalidateSummary(parsedInput.recordingId);

    return result.value;
  });

