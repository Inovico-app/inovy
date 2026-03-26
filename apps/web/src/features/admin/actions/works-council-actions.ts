"use server";

import { z } from "zod";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { WorksCouncilService } from "@/server/services/works-council.service";

const registerApprovalSchema = z.object({
  documentUrl: z.string().url(),
  approvalDate: z.string().datetime(),
  scopeDescription: z.string().optional(),
});

export const registerWorksCouncilApproval = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("setting:update"),
    name: "register-works-council-approval",
    audit: {
      resourceType: "consent",
      action: "create",
      category: "mutation",
    },
  })
  .schema(registerApprovalSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const result = await WorksCouncilService.registerApproval({
      organizationId,
      documentUrl: parsedInput.documentUrl,
      approvalDate: new Date(parsedInput.approvalDate),
      scopeDescription: parsedInput.scopeDescription,
      uploadedBy: user.id,
    });

    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    return result.value;
  });

const revokeApprovalSchema = z.object({
  approvalId: z.string().uuid(),
});

export const revokeWorksCouncilApproval = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("setting:update"),
    name: "revoke-works-council-approval",
    audit: {
      resourceType: "consent",
      action: "delete",
      category: "mutation",
    },
  })
  .schema(revokeApprovalSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;
    if (!user) throw ActionErrors.unauthenticated();

    const result = await WorksCouncilService.revokeApproval(
      parsedInput.approvalId,
      user.id,
    );

    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    return result.value;
  });
