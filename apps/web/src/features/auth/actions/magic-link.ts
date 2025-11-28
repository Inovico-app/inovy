"use server";

import { auth } from "@/lib/auth";
import {
  createErrorForNextSafeAction,
  publicActionClient,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { headers } from "next/headers";
import { magicLinkSchema } from "../validation/auth.schema";

/**
 * Send magic link for passwordless authentication
 */
export const sendMagicLinkAction = publicActionClient
  .inputSchema(magicLinkSchema)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    try {
      await auth.api.signInMagicLink({
        body: {
          email,
          callbackURL: "/",
        },
        headers: await headers(),
      });

      return { success: true, message: "Magic link sent successfully" };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send magic link";
      throw createErrorForNextSafeAction(
        ActionErrors.validation(message, { email })
      );
    }
  });

