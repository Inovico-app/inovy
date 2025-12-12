"use server";

import { auth } from "@/lib/auth";
import { logger, serializeError } from "@/lib/logger";
import { anonymizeEmail, anonymizeUserId } from "@/lib/pii-utils";
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
      logger.warn("Onboarding invite colleagues: unauthenticated", {
        component: "onboarding",
        action: "inviteColleaguesAction",
      });
      throw createErrorForNextSafeAction(
        ActionErrors.unauthenticated("User not found")
      );
    }

    const requestHeaders = await headers();
    const requestId =
      requestHeaders.get("x-request-id") ??
      requestHeaders.get("x-vercel-id") ??
      undefined;

    // Get user's organization
    const organizationId =
      await OrganizationQueries.getFirstOrganizationForUser(userId);

    if (!organizationId) {
      logger.error(
        "Onboarding invite colleagues: organization not found for user",
        {
          component: "onboarding",
          action: "inviteColleaguesAction",
          requestId,
          userIdHash: anonymizeUserId(userId),
        }
      );
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
      logger.warn("Onboarding invite colleagues: no valid emails provided", {
        component: "onboarding",
        action: "inviteColleaguesAction",
        requestId,
        userIdHash: anonymizeUserId(userId),
        organizationId,
      });
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
      logger.warn("Onboarding invite colleagues: invalid email(s) provided", {
        component: "onboarding",
        action: "inviteColleaguesAction",
        requestId,
        userIdHash: anonymizeUserId(userId),
        organizationId,
        invalidCount: invalidEmails.length,
        invalidEmailHashes: invalidEmails.map((email) => anonymizeEmail(email)),
      });
      throw createErrorForNextSafeAction(
        ActionErrors.validation(
          `Invalid email addresses: ${invalidEmails.join(", ")}`,
          { context: "inviteColleaguesAction" }
        )
      );
    }

    const log = logger.child({
      component: "onboarding",
      action: "inviteColleaguesAction",
      requestId,
      userIdHash: anonymizeUserId(userId),
      organizationId,
    });

    log.info("Onboarding invite colleagues: started", {
      emailCount: emailList.length,
    });

    const results: Array<{ email: string; success: boolean; error?: string }> =
      [];

    // Send invitations for each email
    for (const email of emailList) {
      const emailHash = anonymizeEmail(email);
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
          log.debug("Onboarding invite colleagues: invitation created", {
            emailHash,
            invitationId: result.id,
          });
          results.push({ email, success: true });
        } else {
          log.warn(
            "Onboarding invite colleagues: invitation creation returned empty result",
            {
              emailHash,
            }
          );
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
          log.error("Onboarding invite colleagues: user already a member", {
            emailHash,
            errorCode: error.body?.code,
          });
          results.push({
            email,
            success: false,
            error: "User is already a member",
          });
        } else {
          const errorCode =
            error instanceof APIError ? error.body?.code : undefined;
          log.error(
            "Onboarding invite colleagues: failed to create invitation",
            {
              emailHash,
              errorCode,
              errorDetails: serializeError(error),
            },
            error instanceof Error ? error : undefined
          );
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

    log.info("Onboarding invite colleagues: completed", {
      emailCount: emailList.length,
      successCount,
      failureCount,
    });

    return {
      success: successCount > 0,
      results,
      successCount,
      failureCount,
    };
  });

