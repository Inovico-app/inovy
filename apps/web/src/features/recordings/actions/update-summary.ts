"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { CacheInvalidation } from "@/lib/cache-utils";
import { SummaryEditService } from "@/server/services/summary-edit.service";
import { getAuthSession } from "@/lib/auth";
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
  .metadata({ policy: "recordings:update" })
  .schema(updateSummarySchema)
  .action(async ({ parsedInput }) => {
    const authResult = await getAuthSession();
    
    if (authResult.isErr() || !authResult.value.user) {
      throw new Error("Authentication required");
    }
    
    const { user } = authResult.value;
    
    const result = await SummaryEditService.updateSummary(
      parsedInput,
      user.id
    );
    
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    
    // Invalidate summary cache
    CacheInvalidation.invalidateSummary(parsedInput.recordingId);
    
    return result.value;
  });

