"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { CacheInvalidation } from "@/lib/cache-utils";
import { UserNotesService } from "@/server/services/user-notes.service";
import { getAuthSession } from "@/lib/auth";
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
  .action(async ({ parsedInput }) => {
    const authResult = await getAuthSession();
    
    if (authResult.isErr() || !authResult.value.user) {
      throw new Error("Authentication required");
    }
    
    const { user } = authResult.value;
    
    const result = await UserNotesService.updateUserNotes(
      parsedInput.recordingId,
      parsedInput.userNotes,
      user.id
    );
    
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    
    // Invalidate summary cache
    CacheInvalidation.invalidateSummary(parsedInput.recordingId);
    
    return { success: true };
  });

