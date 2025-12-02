"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { sendEmailFromTemplate } from "@/emails/client";
import { AgentConfigService } from "@/server/services/agent-config.service";
import { OrganizationQueries } from "@/server/data-access/organization.queries";
import { err, ok } from "neverthrow";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import AgentDisabledEmail from "@/emails/templates/agent-disabled-email";

/**
 * Schema for updating agent configuration
 */
const updateAgentConfigSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  enabled: z.boolean(),
});

/**
 * Update agent configuration for an organization
 * Only superadmins can update agent configuration
 * Sends email notification to organization admins/owners when disabling
 */
export const updateAgentConfig = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("organizations:update"),
  })
  .inputSchema(updateAgentConfigSchema)
  .action(async ({ parsedInput }) => {
    const { organizationId, enabled } = parsedInput;

    // Update agent configuration
    const updateResult = await AgentConfigService.updateAgentConfig(
      organizationId,
      enabled
    );

    if (updateResult.isErr()) {
      return resultToActionResponse(updateResult);
    }

    // If disabling, send email notification to organization admins/owners
    if (!enabled) {
      try {
        // Get organization details
        const org = await OrganizationQueries.findByIdDirect(organizationId);
        if (!org) {
          return resultToActionResponse(
            err(ActionErrors.notFound("Organization", "updateAgentConfig"))
          );
        }

        // Get organization members with admin/owner roles
        const members = await OrganizationQueries.getMembersDirect(
          organizationId
        );
        const adminMembers = members.filter(
          (member) => member.role === "admin" || member.role === "owner"
        );

        // Send email to each admin/owner
        const emailPromises = adminMembers.map((member) => {
          if (!member.email) return Promise.resolve();

          return sendEmailFromTemplate({
            to: member.email,
            subject: `Agent Disabled for ${org.name}`,
            react: AgentDisabledEmail({
              organizationName: org.name,
              recipientName: member.name || member.email,
            }),
          });
        });

        await Promise.allSettled(emailPromises);
      } catch (error) {
        // Log error but don't fail the action if email sending fails
        console.error("Failed to send agent disabled notification emails", {
          error: error instanceof Error ? error.message : String(error),
          organizationId,
        });
      }
    }

    // Invalidate cache
    CacheInvalidation.invalidateOrganizations();
    CacheInvalidation.invalidateOrganization(organizationId);

    // Revalidate Next.js route cache
    revalidatePath("/admin/agent-config");
    revalidatePath(`/admin/organizations/${organizationId}`);

    return resultToActionResponse(ok({ success: true }));
  });

