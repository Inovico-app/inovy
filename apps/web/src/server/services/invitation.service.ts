import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { APIError } from "better-auth/api";
import { err, ok } from "neverthrow";
import { headers } from "next/headers";
import {
  InvitationsQueries,
  type InvitationDetails,
} from "../data-access/invitations.queries";

/**
 * Service for managing invitation operations
 * Handles invitation details retrieval and acceptance using Better Auth APIs
 */
export class InvitationService {
  /**
   * Get invitation details with all related data
   * Includes organization, inviter, and pending team assignments
   */
  static async getInvitationDetails(
    invitationId: string
  ): Promise<ActionResult<InvitationDetails>> {
    try {
      const invitation =
        await InvitationsQueries.getInvitationById(invitationId);

      if (!invitation) {
        return err(
          ActionErrors.notFound(
            "Invitation",
            "InvitationService.getInvitationDetails"
          )
        );
      }

      return ok(invitation);
    } catch (error) {
      logger.error("Failed to get invitation details", {
        invitationId,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return err(
        ActionErrors.internal(
          "Failed to get invitation details",
          error as Error,
          "InvitationService.getInvitationDetails"
        )
      );
    }
  }

  /**
   * Accept an invitation using Better Auth API
   * Better Auth's afterAcceptInvitation hook will automatically apply pending team assignments
   *
   * @param invitationId - The invitation ID to accept
   * @param userId - The user ID accepting the invitation (must match invitation email)
   */
  static async acceptInvitation(
    invitationId: string
  ): Promise<ActionResult<void>> {
    try {
      // Get invitation details to validate
      const invitationResult = await this.getInvitationDetails(invitationId);

      if (invitationResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get invitation details",
            invitationResult.error,
            "InvitationService.acceptInvitation"
          )
        );
      }

      const invitation = invitationResult.value;

      // Validate invitation is not expired
      if (new Date() > invitation.expiresAt) {
        return err(
          ActionErrors.badRequest(
            "This invitation has expired",
            "InvitationService.acceptInvitation"
          )
        );
      }

      // Validate invitation is not already accepted
      if (invitation.status !== "pending") {
        return err(
          ActionErrors.badRequest(
            "This invitation has already been processed",
            "InvitationService.acceptInvitation"
          )
        );
      }

      // Accept invitation using Better Auth API
      const headersList = await headers();
      const result = await auth.api.acceptInvitation({
        body: {
          invitationId,
        },
        headers: headersList,
      });

      if (!result) {
        return err(
          ActionErrors.internal(
            "Failed to accept invitation",
            undefined,
            "InvitationService.acceptInvitation"
          )
        );
      }

      logger.info("Invitation accepted successfully", {
        invitationId,
        organizationId: invitation.organization.id,
      });

      return ok(undefined);
    } catch (error) {
      // Handle Better Auth API errors
      if (error instanceof APIError) {
        const errorCode = error.body?.code;
        const errorMessage =
          error.body?.message || "Failed to accept invitation";

        if (errorCode === "INVITATION_NOT_FOUND") {
          return err(
            ActionErrors.notFound(
              "Invitation",
              "InvitationService.acceptInvitation"
            )
          );
        }

        if (errorCode === "INVITATION_EXPIRED") {
          return err(
            ActionErrors.badRequest(
              "This invitation has expired",
              "InvitationService.acceptInvitation"
            )
          );
        }

        if (errorCode === "INVITATION_ALREADY_ACCEPTED") {
          return err(
            ActionErrors.badRequest(
              "This invitation has already been accepted",
              "InvitationService.acceptInvitation"
            )
          );
        }

        if (errorCode === "USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION") {
          return err(
            ActionErrors.conflict(
              "User is already a member of this organization",
              "InvitationService.acceptInvitation"
            )
          );
        }

        return err(
          ActionErrors.internal(
            errorMessage,
            error,
            "InvitationService.acceptInvitation"
          )
        );
      }

      logger.error("Failed to accept invitation", {
        invitationId,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return err(
        ActionErrors.internal(
          "Failed to accept invitation",
          error as Error,
          "InvitationService.acceptInvitation"
        )
      );
    }
  }
}

