"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { policyToPermissions } from "../../../lib/permission-helpers";
import type { UpdateDepartmentDto } from "../../../server/dto/department.dto";
import { DepartmentService } from "../../../server/services/department.service";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from "../../../server/validation/department.validation";

/**
 * Create a new department
 */
export const createDepartment = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("departments:create"),
  })
  .inputSchema(createDepartmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { name, description, parentDepartmentId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "createDepartment"
      );
    }

    const result = await DepartmentService.createDepartment({
      organizationId,
      name,
      description: description ?? null,
      parentDepartmentId: parentDepartmentId ?? null,
    });

    // Revalidate Next.js route cache (service handles data cache invalidation)
    if (result.isOk()) {
      revalidatePath("/settings/organization");
    }

    return resultToActionResponse(result);
  });

/**
 * Update a department
 */
export const updateDepartment = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("departments:update"),
  })
  .inputSchema(updateDepartmentSchema.extend({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { id, name, description, parentDepartmentId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "updateDepartment"
      );
    }

    // Build update DTO only with fields that are actually present
    const updateData: UpdateDepartmentDto = {};

    if (typeof name !== "undefined") {
      updateData.name = name;
    }
    if ("description" in parsedInput) {
      updateData.description = description ?? null;
    }
    if ("parentDepartmentId" in parsedInput) {
      updateData.parentDepartmentId = parentDepartmentId ?? null;
    }

    const result = await DepartmentService.updateDepartment(id, updateData);

    // Revalidate Next.js route cache (service handles data cache invalidation)
    if (result.isOk()) {
      revalidatePath("/settings/organization");
    }

    return resultToActionResponse(result);
  });

/**
 * Delete a department
 */
export const deleteDepartment = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("departments:delete"),
  })
  .inputSchema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "deleteDepartment"
      );
    }

    const result = await DepartmentService.deleteDepartment(id);

    // Revalidate Next.js route cache (service handles data cache invalidation)
    if (result.isOk()) {
      revalidatePath("/settings/organization");
    }

    return resultToActionResponse(result);
  });

