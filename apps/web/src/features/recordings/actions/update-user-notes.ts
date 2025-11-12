"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { CacheInvalidation } from "@/lib/cache-utils";
import { UserNotesService } from "@/server/services/user-notes.service";
import { z } from "zod";

const updateUserNotesSchema = z.object({
  recordingId: z.string().uuid("Invalid recording ID"),
  userNotes: z.string().max(5000, "Notes cannot exceed 5000 characters"),
});

export type UpdateUserNotesInput = z.infer<typeof updateUserNotesSchema>;

/**
 * Server action to update user notes for a recording summary
 */
export const updateUserNotes = authorizedActionClient
  .metadata({ policy: "recordings:update" })
  .schema(updateUserNotesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;

    if (!user || !organizationId) {
      throw ActionErrors.unauthenticated("User and organization context required");
    }

    const result = await UserNotesService.updateUserNotes(
      parsedInput.recordingId,
      parsedInput.userNotes,
      user.id,
      organizationId
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "update-user-notes"
      );
    }

    // Invalidate summary cache
    CacheInvalidation.invalidateSummary(parsedInput.recordingId);

    return { success: true };
  });

