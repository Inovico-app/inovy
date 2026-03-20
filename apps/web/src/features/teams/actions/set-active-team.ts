"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { sessions } from "@/server/db/schema/auth";
import { ok, err } from "neverthrow";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { isOrganizationAdmin } from "@/lib/rbac/rbac";

const setActiveTeamSchema = z.object({
  teamId: z.string().nullable(),
});

export const setActiveTeamAction = authorizedActionClient
  .metadata({ permissions: {} })
  .inputSchema(setActiveTeamSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { teamId } = parsedInput;
    const { user, userTeamIds } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User not found", "set-active-team");
    }

    // Validate team membership (if setting to a specific team)
    if (teamId && !userTeamIds?.includes(teamId)) {
      if (!isOrganizationAdmin(user)) {
        throw ActionErrors.forbidden(
          "Not a member of this team",
          undefined,
          "set-active-team",
        );
      }
    }

    // Get current session ID from Better Auth
    try {
      const requestHeaders = await headers();
      const currentSession = await auth.api.getSession({
        headers: requestHeaders,
      });

      if (!currentSession?.session?.id) {
        return resultToActionResponse(
          err(
            ActionErrors.internal(
              "No active session",
              undefined,
              "set-active-team",
            ),
          ),
        );
      }

      // Update activeTeamId directly on the session record via Drizzle
      await db
        .update(sessions)
        .set({ activeTeamId: teamId })
        .where(eq(sessions.id, currentSession.session.id));
    } catch (error) {
      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to update active team",
            error as Error,
            "set-active-team",
          ),
        ),
      );
    }

    revalidatePath("/");
    return resultToActionResponse(ok({ teamId }));
  });
