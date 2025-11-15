"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { CacheInvalidation, CacheTags } from "../../../lib/cache-utils";
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
    policy: "departments:create",
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

    // Invalidate cache
    CacheInvalidation.invalidateDepartmentCache(organizationId);
    revalidatePath("/settings/organization");

    return resultToActionResponse(result);
  });

/**
 * Update a department
 */
export const updateDepartment = authorizedActionClient
  .metadata({
    policy: "departments:update",
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

    const result = await DepartmentService.updateDepartment(id, {
      name,
      description: description ?? null,
      parentDepartmentId: parentDepartmentId ?? null,
    });

    // Invalidate cache
    CacheInvalidation.invalidateDepartmentCache(organizationId, id);
    revalidatePath("/settings/organization");

    return resultToActionResponse(result);
  });

/**
 * Delete a department
 */
export const deleteDepartment = authorizedActionClient
  .metadata({
    policy: "departments:delete",
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

    // Invalidate cache
    CacheInvalidation.invalidateDepartmentCache(organizationId, id);
    revalidatePath("/settings/organization");

    return resultToActionResponse(result);
  });

