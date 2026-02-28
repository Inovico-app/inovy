"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { isOrganizationAdmin } from "@/lib/rbac/rbac";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { GuardrailsQueries } from "@/server/data-access/guardrails.queries";
import { GuardrailsService } from "@/server/services/guardrails.service";
import {
  getGuardrailsViolationsSchema,
  updateGuardrailsPolicySchema,
} from "@/server/validation/guardrails.validation";
import { z } from "zod";

export const getGuardrailsPolicy = authorizedActionClient
  .metadata({ permissions: policyToPermissions("guardrails:read") })
  .schema(
    z.object({
      scope: z.enum(["default", "organization", "project"]),
      scopeId: z.string().nullable(),
    })
  )
  .action(async ({ parsedInput }) => {
    const policy = await GuardrailsQueries.getPolicyByScope(
      parsedInput.scope,
      parsedInput.scopeId
    );
    return policy ?? null;
  });

export const getEffectiveGuardrailsPolicy = authorizedActionClient
  .metadata({ permissions: policyToPermissions("guardrails:read") })
  .schema(
    z.object({
      organizationId: z.string(),
      projectId: z.string().optional(),
    })
  )
  .action(async ({ parsedInput }) => {
    return GuardrailsService.getEffectivePolicy(
      parsedInput.organizationId,
      parsedInput.projectId
    );
  });

export const updateGuardrailsPolicy = authorizedActionClient
  .metadata({ permissions: policyToPermissions("guardrails:update") })
  .schema(updateGuardrailsPolicySchema)
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId, user } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (parsedInput.scope === "organization" && !isOrganizationAdmin(user)) {
      throw ActionErrors.forbidden(
        "Only organization administrators can update organization-level guardrails"
      );
    }

    if (parsedInput.scope === "default") {
      throw ActionErrors.forbidden(
        "Default guardrails policy cannot be modified"
      );
    }

    const result = await GuardrailsQueries.upsertPolicy({
      ...parsedInput,
      createdBy: user.id,
    });

    return result;
  });

export const getGuardrailsViolations = authorizedActionClient
  .metadata({ permissions: policyToPermissions("guardrails:read") })
  .schema(getGuardrailsViolationsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    if (parsedInput.organizationId !== organizationId) {
      throw ActionErrors.forbidden("Organization ID mismatch");
    }

    return GuardrailsQueries.getViolations(parsedInput);
  });
