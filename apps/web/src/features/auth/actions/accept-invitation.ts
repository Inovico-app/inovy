"use server";

import {
  actionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { InvitationService } from "@/server/services/invitation.service";
import { z } from "zod";

/**
 * Server action to accept an organization invitation
 * Uses Better Auth API to accept the invitation
 * Better Auth's afterAcceptInvitation hook will automatically apply pending team assignments
 */
export const acceptInvitationAction = actionClient
  .inputSchema(
    z.object({
      invitationId: z.string().min(1, "Invitation ID is required"),
    })
  )
  .action(async ({ parsedInput }) => {
    const { invitationId } = parsedInput;

    // Get user session to get userId
    const { getBetterAuthSession } = await import("@/lib/better-auth-session");
    const sessionResult = await getBetterAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.user) {
      return resultToActionResponse(
        sessionResult.isErr()
          ? sessionResult
          : {
              isErr: true,
              error: {
                code: "UNAUTHENTICATED" as const,
                message: "User must be authenticated to accept invitation",
              },
            }
      );
    }

    const userId = sessionResult.value.user.id;

    // Accept invitation using service layer
    const result = await InvitationService.acceptInvitation(
      invitationId,
      userId
    );

    return resultToActionResponse(result);
  });

