"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { GdprExportService } from "@/server/services/gdpr-export.service";
import { exportUserDataSchema } from "@/server/validation/settings/export-user-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Server action to request a GDPR data export
 */
export const requestDataExport = authorizedActionClient
  .metadata({ policy: "settings:update" })
  .schema(exportUserDataSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        { userId: user.id },
        "requestDataExport"
      );
    }

    logger.info("Requesting data export", {
      userId: user.id,
      organizationId,
      filters: parsedInput,
    });

    try {
      const filters =
        parsedInput.dateRange || parsedInput.projectId
          ? {
              ...(parsedInput.dateRange && {
                dateRange: parsedInput.dateRange,
              }),
              ...(parsedInput.projectId && {
                projectId: parsedInput.projectId,
              }),
            }
          : undefined;

      const result = await GdprExportService.createExportRequest(
        user.id,
        organizationId,
        filters
      );

      if (result.isErr()) {
        throw ActionErrors.internal(
          result.error.message,
          result.error.cause as Error,
          "requestDataExport"
        );
      }

      revalidatePath("/settings/profile");

      return {
        success: true,
        exportId: result.value.id,
        status: result.value.status,
      };
    } catch (error) {
      logger.error("Failed to request data export", {
        userId: user.id,
        error,
      });

      throw ActionErrors.internal(
        "Failed to request data export. Please try again.",
        error as Error,
        "requestDataExport"
      );
    }
  });

/**
 * Server action to get user's export history
 */
export const getExportHistory = authorizedActionClient
  .metadata({ policy: "settings:read" })
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => {
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        { userId: user.id },
        "getExportHistory"
      );
    }

    try {
      const result = await GdprExportService.getExportsByUserId(
        user.id,
        organizationId
      );

      if (result.isErr()) {
        throw ActionErrors.internal(
          result.error.message,
          result.error.cause as Error,
          "getExportHistory"
        );
      }

      return {
        success: true,
        exports: result.value,
      };
    } catch (error) {
      logger.error("Failed to get export history", {
        userId: user.id,
        error,
      });

      throw ActionErrors.internal(
        "Failed to get export history",
        error as Error,
        "getExportHistory"
      );
    }
  });

