"use server";

import { auth } from "@/lib/auth";
import {
  authorizedActionClient,
  createErrorForNextSafeAction,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { OrganizationQueries } from "@/server/data-access/organization.queries";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { z } from "zod";

const inviteColleaguesSchema = z.object({
  emails: z.string().min(1, "At least one email is required"),
});

/**
 * Invite colleagues to the organization during onboarding
 */
export const inviteColleaguesAction = authorizedActionClient
  .inputSchema(inviteColleaguesSchema)
  .metadata({ permissions: {}, name: "invite-colleagues" })
  .action(async ({ parsedInput, ctx }) => {
    const { emails } = parsedInput;
    const userId = ctx.user?.id;

    if (!userId) {
      throw createErrorForNextSafeAction(
        ActionErrors.unauthenticated("User not found")
      );
    }

    // Get user's organization
    const organizationId =
      await OrganizationQueries.getFirstOrganizationForUser(userId);

    if (!organizationId) {
      throw createErrorForNextSafeAction(
        ActionErrors.internal(
          "User organization not found. Please contact support.",
          undefined,
          "inviteColleaguesAction"
        )
      );
    }

    // Parse emails (support both comma and newline separated)
    const emailList = emails
      .split(/[,\n]/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (emailList.length === 0) {
      throw createErrorForNextSafeAction(
        ActionErrors.validation("No valid email addresses found", {
          context: "inviteColleaguesAction",
        })
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailList.filter((email) => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      throw createErrorForNextSafeAction(
        ActionErrors.validation(
          `Invalid email addresses: ${invalidEmails.join(", ")}`,
          { context: "inviteColleaguesAction" }
        )
      );
    }

    const requestHeaders = await headers();
    const results: Array<{ email: string; success: boolean; error?: string }> =
      [];

    // Send invitations for each email
    for (const email of emailList) {
      try {
        const result = await auth.api.createInvitation({
          body: {
            email,
            role: "user", // Default role for onboarding invites
            organizationId,
          },
          headers: requestHeaders,
        });

        if (result) {
          results.push({ email, success: true });
        } else {
          results.push({
            email,
            success: false,
            error: "Failed to create invitation",
          });
        }
      } catch (error) {
        if (
          error instanceof APIError &&
          error.body?.code === "USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION"
        ) {
          results.push({
            email,
            success: false,
            error: "User is already a member",
          });
        } else {
          results.push({
            email,
            success: false,
            error: error instanceof Error ? error.message : "Failed to invite",
          });
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      success: successCount > 0,
      results,
      successCount,
      failureCount,
    };
  });

