"use server";

import {
  publicActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { InvitationService } from "@/server/services/invitation.service";
import { z } from "zod";

/**
 * Server action to accept an organization invitation
 * Uses Better Auth API to accept the invitation
 * Better Auth's afterAcceptInvitation hook will automatically apply pending team assignments
 */
export const acceptInvitationAction = publicActionClient
  .metadata({
    permissions: {},
    name: "accept-invitation",
  })
  .inputSchema(
    z.object({
      invitationId: z.string().min(1, "Invitation ID is required"),
    })
  )
  .action(async ({ parsedInput }) => {
    const { invitationId } = parsedInput;

    const result = await InvitationService.acceptInvitation(invitationId);

    return resultToActionResponse(result);
  });

