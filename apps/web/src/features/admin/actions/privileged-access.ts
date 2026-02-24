"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { PrivilegedAccessService } from "@/server/services/privileged-access.service";
import { headers } from "next/headers";
import { z } from "zod";

export const detectPrivilegedAccessAnomalies = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("audit-log:read"),
  })
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => {
    const { organizationId, user } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "detectPrivilegedAccessAnomalies"
      );
    }

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found in context",
        "detectPrivilegedAccessAnomalies"
      );
    }

    const result =
      await PrivilegedAccessService.detectAnomalies(organizationId);

    return resultToActionResponse(result);
  });

export const generatePrivilegeReviewReport = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("audit-log:read"),
  })
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => {
    const { organizationId, user } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "generatePrivilegeReviewReport"
      );
    }

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found in context",
        "generatePrivilegeReviewReport"
      );
    }

    const result =
      await PrivilegedAccessService.generatePrivilegeReviewReport(
        organizationId
      );

    return resultToActionResponse(result);
  });

export const logAdminPageAccess = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("admin:all"),
  })
  .inputSchema(
    z.object({
      adminPage: z.string(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const { adminPage } = parsedInput;
    const { organizationId, user } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "logAdminPageAccess"
      );
    }

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found in context",
        "logAdminPageAccess"
      );
    }

    const headersList = await headers();
    const { ipAddress, userAgent } =
      PrivilegedAccessService.extractRequestInfo(headersList);

    const result = await PrivilegedAccessService.logAdminAccess({
      userId: user.id,
      organizationId,
      adminPage,
      ipAddress,
      userAgent,
    });

    return resultToActionResponse(result);
  });
