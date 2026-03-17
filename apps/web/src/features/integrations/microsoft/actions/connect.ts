"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { getIncrementalAuthUrl } from "@/features/integrations/microsoft/lib/scope-utils";
import type { MsScopeTier } from "@/features/integrations/microsoft/lib/scope-constants";
import { z } from "zod";

const getMicrosoftAuthUrlSchema = z.object({
  tier: z
    .enum(["base", "calendarWrite", "mail", "onedrive"] satisfies [
      MsScopeTier,
      ...MsScopeTier[],
    ])
    .default("base"),
  redirectUrl: z.string().default("/settings"),
});

/**
 * Get the Microsoft OAuth authorization URL for a given scope tier.
 * Returns a redirect URL that initiates the OAuth flow.
 */
export const getMicrosoftAuthUrl = authorizedActionClient
  .metadata({ permissions: policyToPermissions("settings:update") })
  .schema(getMicrosoftAuthUrlSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    const { tier, redirectUrl } = parsedInput;

    const authUrl = getIncrementalAuthUrl(tier, redirectUrl);

    return { authUrl };
  });
