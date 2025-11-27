"use server";

import { publicActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { betterAuthInstance } from "@/lib/better-auth-server";
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
      await betterAuthInstance.api.signInMagicLink({
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
      throw ActionErrors.validation(message, { email });
    }
  });

