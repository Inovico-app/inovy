"use server";

import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { DriveWatchesQueries } from "@/server/data-access/drive-watches.queries";
import { ProjectQueries } from "@/server/data-access/projects.queries";
import { DriveWatchesService } from "@/server/services/drive-watches.service";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import {
  deleteDriveWatchSchema,
  startDriveWatchSchema,
  stopDriveWatchSchema,
  updateDriveWatchSchema,
} from "@/server/validation/drive-watch";

/**
 * Start watching a Google Drive folder
 * Creates a watch subscription for monitoring file uploads
 */
export const startDriveWatchAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("integrations:manage"),
  })
  .inputSchema(startDriveWatchSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { folderId, projectId } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.forbidden(
        "Authentication required",
        undefined,
        "startDriveWatchAction"
      );
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "startDriveWatchAction"
      );
    }

    // Check for drive scope
    const hasScopeResult = await GoogleOAuthService.hasScopes(user.id, "drive");

    if (hasScopeResult.isErr() || !hasScopeResult.value) {
      throw ActionErrors.badRequest(
        "Missing permission: Google Drive (read files). Please grant this permission in Settings > Integrations."
      );
    }

    // Verify user has access to project (organization isolation)
    const project = await ProjectQueries.findById(projectId, organizationId);
    if (!project) {
      throw ActionErrors.notFound("Project", "startDriveWatchAction");
    }

    // Get webhook URL from environment
    const webhookUrl =
      process.env.NEXT_PUBLIC_WEBHOOK_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/google-drive`;

    // Start watch
    const result = await DriveWatchesService.startWatch(
      user.id,
      folderId,
      projectId,
      organizationId,
      webhookUrl
    );

    return resultToActionResponse(result);
  });

/**
 * Stop watching a Google Drive folder
 * Stops the watch subscription and deactivates it
 */
export const stopDriveWatchAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("integrations:manage"),
  })
  .inputSchema(stopDriveWatchSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { folderId } = parsedInput;
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.forbidden(
        "Authentication required",
        undefined,
        "stopDriveWatchAction"
      );
    }

    // Stop watch
    const result = await DriveWatchesService.stopWatch(user.id, folderId);

    return resultToActionResponse(result);
  });

/**
 * List all active Drive watches for the authenticated user
 * Returns watches with expiration status and project information
 */
export const listDriveWatchesAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("integrations:manage"),
  })
  .action(async ({ ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.forbidden(
        "Authentication required",
        undefined,
        "listDriveWatchesAction"
      );
    }

    // List watches
    const result = await DriveWatchesService.listWatches(user.id);

    return resultToActionResponse(result);
  });

/**
 * Update a Drive watch (change project)
 * Updates the project associated with a watch
 */
export const updateDriveWatchAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("integrations:manage"),
  })
  .inputSchema(updateDriveWatchSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { watchId, projectId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "updateDriveWatchAction"
      );
    }

    // Get watch by ID
    const watch = await DriveWatchesQueries.getWatchById(watchId);
    if (!watch) {
      throw ActionErrors.notFound("Drive watch", "updateDriveWatchAction");
    }

    // Verify organization access
    try {
      assertOrganizationAccess(
        watch.organizationId,
        organizationId,
        "updateDriveWatchAction"
      );
    } catch (error) {
      throw ActionErrors.notFound("Drive watch", "updateDriveWatchAction");
    }

    // Verify project access
    const project = await ProjectQueries.findById(projectId, organizationId);
    if (!project) {
      throw ActionErrors.notFound("Project", "updateDriveWatchAction");
    }

    // Update watch project
    // Note: DriveWatchesQueries doesn't have an update method yet
    // For now, we'll need to deactivate the old watch and create a new one
    // This is a simplified implementation - in production, you'd want a proper update method
    const webhookUrl =
      process.env.NEXT_PUBLIC_WEBHOOK_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/google-drive`;

    // Stop old watch
    const stopResult = await DriveWatchesService.stopWatch(
      watch.userId,
      watch.folderId
    );

    if (stopResult.isErr()) {
      return resultToActionResponse(stopResult);
    }

    // Start new watch with updated project
    const startResult = await DriveWatchesService.startWatch(
      watch.userId,
      watch.folderId,
      projectId,
      organizationId,
      webhookUrl
    );

    return resultToActionResponse(startResult);
  });

/**
 * Delete a Drive watch
 * Stops the watch and deletes the record
 */
export const deleteDriveWatchAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("integrations:manage"),
  })
  .inputSchema(deleteDriveWatchSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { watchId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "deleteDriveWatchAction"
      );
    }

    // Get watch by ID
    const watch = await DriveWatchesQueries.getWatchById(watchId);

    if (!watch) {
      throw ActionErrors.notFound("Drive watch", "deleteDriveWatchAction");
    }

    // Verify organization access
    try {
      assertOrganizationAccess(
        watch.organizationId,
        organizationId,
        "deleteDriveWatchAction"
      );
    } catch (error) {
      throw ActionErrors.notFound("Drive watch", "deleteDriveWatchAction");
    }

    // Stop watch via Drive API
    const stopResult = await DriveWatchesService.stopWatch(
      watch.userId,
      watch.folderId
    );

    if (stopResult.isErr()) {
      return resultToActionResponse(stopResult);
    }

    // Delete watch record
    const deleted = await DriveWatchesQueries.deleteWatch(watch.channelId);

    if (!deleted) {
      throw ActionErrors.internal(
        "Failed to delete watch record",
        undefined,
        "deleteDriveWatchAction"
      );
    }

    return { success: true };
  });

